#!/usr/bin/env python3
"""
Upgraded Provider Node Agent
- polls backend for jobs
- fetches renter script + requirements
- generates Dockerfile per-job
- builds and runs container
- streams logs + usage to backend
- computes model hash and posts job finish

Usage:
    pip install requests psutil
    export BACKEND_URL="http://127.0.0.1:8000"
    python agent.py
"""
import os
import uuid
import time
import json
import psutil
import platform
import secrets
import hashlib
import hmac
import subprocess
import threading
import requests
from pathlib import Path
from datetime import datetime

# ---------- CONFIG ----------
BACKEND_URL = os.environ.get("BACKEND_URL", "http://127.0.0.1:8000")
NODE_ID = str(uuid.uuid4())
HANDSHAKE_KEY = secrets.token_hex(16)
POLL_INTERVAL = 5            # seconds for job polling
HEARTBEAT_INTERVAL = 10      # seconds
JOB_WORKDIR = Path("./workspace/jobs")
JOB_WORKDIR.mkdir(parents=True, exist_ok=True)
TRAINER_IMAGE_PREFIX = "shelbycompute-trainer"
DATABASE_URL = os.environ.get("DATABASE_URL", "")
# ----------------------------
# ----------------- Utility functions ----------------- 
def now_ts():
    return int(time.time())

def get_system_specs():
    cpu = psutil.cpu_percent(interval=1)
    ram = psutil.virtual_memory().percent   
    total_ram = round(psutil.virtual_memory().total / (1024**3), 2)
    return {
        "cpuUsage": cpu,
        "ramUsage": ram,
        "totalRAM_GB": total_ram,
        "os": platform.system(),
        "platform": platform.platform(),
        "processor": platform.processor(),
    }

def check_docker_installed():
    try:
        subprocess.run(["docker", "--version"], capture_output=True, check=True)
        return True
    except Exception:
        return False

def sign_job_result(job_id, secret_key):
    message = f"{job_id}".encode()
    signature = hmac.new(secret_key.encode(), message, hashlib.sha256).hexdigest()
    return signature

# ----------------- Backend helpers -----------------
def backend_post(path, json_payload=None, params=None, timeout=10):
    url = f"{BACKEND_URL}{path}"
    try:
        r = requests.post(url, json=json_payload, params=params, timeout=timeout)
        r.raise_for_status()
        return r
    except Exception as e:
        print(f"[backend_post] ERROR {url}: {e}")
        return None

def backend_get(path, params=None, timeout=10):
    url = f"{BACKEND_URL}{path}"
    try:
        r = requests.get(url, params=params, timeout=timeout)
        r.raise_for_status()
        return r
    except Exception as e:
        print(f"[backend_get] ERROR {url}: {e}")
        return None

# ----------------- Node registration & heartbeat -----------------
def register_node(node_id, specs, secret_key):
    payload = {
        "nodeId": node_id,
        "specs": specs,
        "containerSupported": True,
        "handshakeKey": secret_key
    }
    res = backend_post("/api/nodes/register", json_payload=payload)
    if res and res.status_code == 200:
        print("Node Registered ✅")
        return True
    print("Registration Failed ❌")
    return False

def start_heartbeat(node_id):
    while True:
        try:
            backend_post("/api/nodes/heartbeat", json_payload={"nodeId": node_id})
            # debug output
            print("Heartbeat 💓 sent")
        except Exception as e:
            print("Heartbeat exception:", e)
        time.sleep(HEARTBEAT_INTERVAL)

# ----------------- Job handling -----------------
def fetch_script_for_job(job_id):
    """
    Try to fetch renter's script from backend. Expected response JSON:
    { "script": "<python source>", "requirements": "requirements text (optional)", "entrypoint": "train.py" }
    """
    res = backend_get("/api/jobs/fetch-script", params={"jobId": job_id})
    if not res:
        print("No fetch-script endpoint or failed to fetch script.")
        return None
    try:
        data = res.json()
        return data
    except Exception as e:
        print("Invalid JSON from fetch-script:", e)
        return None

def save_job_files(job_id, script_text=None, requirements_text=None):
    job_dir = JOB_WORKDIR / job_id
    (job_dir).mkdir(parents=True, exist_ok=True)
    if script_text:
        (job_dir / "train.py").write_text(script_text, encoding="utf-8")
    if requirements_text:
        (job_dir / "requirements.txt").write_text(requirements_text, encoding="utf-8")
    return job_dir

def generate_dockerfile(job_dir: Path):
    # simple Dockerfile that copies everything and runs train.py
    df = f"""FROM python:3.10-slim
WORKDIR /workspace
COPY . /workspace
# attempt to install requirements if present; ignore failures
RUN if [ -f requirements.txt ]; then pip install --no-cache-dir -r requirements.txt || true; fi
CMD ["python", "train.py"]
"""
    (job_dir / "Dockerfile").write_text(df, encoding="utf-8")

def build_image(job_id: str, job_dir: Path):
    tag = f"{TRAINER_IMAGE_PREFIX}-{job_id.lower()}"
    # build command
    cmd = ["docker", "build", "-t", tag, "."]
    print("Building docker image:", " ".join(cmd), "in", str(job_dir))
    p = subprocess.run(cmd, cwd=str(job_dir), capture_output=True, text=True)
    if p.returncode != 0:
        print("Docker build failed:", p.stderr)
        return None
    print("Docker image built:", tag)
    return tag

def stream_container_logs(container_proc, job_id):
    """
    container_proc is a Popen subprocess started with stdout=PIPE
    stream lines to backend
    """
    for raw in iter(container_proc.stdout.readline, ""):
        if raw is None:
            break
        line = raw.rstrip("\n")
        if not line:
            continue
        # print locally
        print(f"[container] {line}")
        # send to backend stream-log endpoint
        try:
            # POST /api/jobs/stream-log?job_id=<>&line=<>
            # using form or params: using JSON body
            backend_post("/api/jobs/stream-log", json_payload={"job_id": job_id, "line": line})
        except Exception:
            pass

def monitor_usage_while(container_pid, node_id, job_id, stop_event):
    """
    Periodically send CPU/RAM usage while container is running.
    We'll measure host usage snapshot as approximate.
    """
    try:
        while not stop_event.is_set():
            cpu = psutil.cpu_percent(interval=1)
            ram = psutil.virtual_memory().percent
            payload = {
                "nodeId": node_id,
                "jobId": job_id,
                "cpu_percent": cpu,
                "ram_percent": ram,
                "ts": now_ts()
            }
            backend_post("/api/usage-report", json_payload=payload)
            # sleep small interval (we already had 1 sec in cpu_percent)
            time.sleep(4)
    except Exception as e:
        print("usage monitor err:", e)

def compute_sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024*1024), b""):
            h.update(chunk)
    return h.hexdigest()

def run_job_container(image_tag: str, job_dir: Path, job_id: str, node_id: str, timeout_minutes: int = 20):
    output_dir = job_dir / "output"
    output_dir.mkdir(exist_ok=True)
    # run docker container and capture stdout
    cmd = [
        "docker", "run", "--rm",
        "-v", f"{str(output_dir.resolve())}:/workspace/output",
        image_tag
    ]
    print("Running container:", " ".join(cmd))
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1)
    stop_event = threading.Event()
    # start usage monitor thread
    usage_thread = threading.Thread(target=monitor_usage_while, args=(proc.pid, node_id, job_id, stop_event))
    usage_thread.daemon = True
    usage_thread.start()
    # stream logs line-by-line to backend
    try:
        for raw in iter(proc.stdout.readline, ""):
            if raw is None:
                break
            line = raw.rstrip("\n")
            if line:
                print("[container]", line)
                backend_post("/api/jobs/stream-log", json_payload={"job_id": job_id, "line": line})
    except Exception as e:
        print("Error streaming container logs:", e)
    finally:
        proc.wait()
        stop_event.set()
        usage_thread.join(timeout=2)
    rc = proc.returncode
    print("Container finished with rc:", rc)
    # look for model file in output directory (heuristic: largest file, or model.bin)
    model_file = None
    candidates = list(output_dir.glob("*"))
    if not candidates:
        print("No output files found in output/ - job may not have produced model.")
        return None, None, rc
    # prefer model.bin or *.pth/*.pt/*.bin
    preferred = None
    for p in candidates:
        if p.name.lower() in ("model.bin", "pytorch_model.bin", "model.pt", "model.pth"):
            preferred = p
            break
    model_file = preferred or max(candidates, key=lambda p: p.stat().st_size)
    model_hash = compute_sha256(model_file)
    model_size = model_file.stat().st_size
    return str(model_file.resolve()), model_hash, model_size

def finish_job_report(node_id, job_id, model_hash, model_size, duration_seconds, metadata=None):
    payload = {
        "nodeId": node_id,
        "jobId": job_id,
        "modelHash": model_hash,
        "modelSizeBytes": model_size,
        "metadata": metadata or {},
        "durationSeconds": duration_seconds
    }
    res = backend_post("/api/jobs/finish", json_payload=payload)
    if res and res.status_code == 200:
        print("Finish reported ✅", res.json())
    else:
        print("Finish report failed ❌")

# ----------------- High-level job handler -----------------
def handle_job(job: dict, node_id: str, secret_key: str):
    job_id = job.get("jobId")
    datasetName = job.get("datasetName") or job.get("dataset")
    datasetUrl = job.get("datasetUrl")
    print("\n🚀 Job Received!")
    print("Job ID:", job_id)
    print("Dataset:", datasetName)
    # Acknowledge
    signature = sign_job_result(job_id, secret_key)
    ack_res = backend_post("/api/jobs/ack", json_payload={"nodeId": node_id, "jobId": job_id, "signature": signature})
    if not ack_res:
        print("Failed to ack job")
        return

    # Fetch script from backend if available
    script_payload = fetch_script_for_job(job_id)
    job_dir = JOB_WORKDIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    if script_payload and script_payload.get("script"):
        print("Fetched renter script from backend")
        script_text = script_payload.get("script")
        reqs = script_payload.get("requirements", "")
        save_job_files(job_id, script_text=script_text, requirements_text=reqs)
        entrypoint = script_payload.get("entrypoint", "train.py")
        # ensure entrypoint file exists
        if not (job_dir / entrypoint).exists():
            print("Warning: expected entrypoint not found; check saved files.")
    else:
        # fallback: try datasetUrl to produce a tiny train.py (or expect train.py already present)
        print("No remote script payload; checking local job dir or datasetUrl fallback.")
        # if datasetUrl exists, generate a tiny train.py that downloads dataset and trains.
        if datasetUrl and not (job_dir / "train.py").exists():
            # generate minimal train.py that just writes a tiny model (if user didn't upload script)
            print("Generating fallback train.py (tiny demo training) — replace with real script for production")
            fallback = f'''\
import time, json, os
out = "output/model.bin"
os.makedirs("output", exist_ok=True)
with open(out, "wb") as f:
    f.write(b"demo-model-" + b"{job_id}".replace(b"-", b""))
print("Fallback training: wrote demo model to", out)
'''
            save_job_files(job_id, script_text=fallback, requirements_text="")
        elif (job_dir / "train.py").exists():
            print("Found existing train.py locally; using it.")
        else:
            print("No script available for job; aborting.")
            return

    # generate Dockerfile and build
    generate_dockerfile(job_dir)
    image_tag = build_image(job_id, job_dir)
    if not image_tag:
        print("Image build failed; aborting job.")
        return

    # run container and stream logs; measure duration
    start = time.time()
    model_path, model_hash, model_size = run_job_container(image_tag, job_dir, job_id, node_id)
    duration = int(time.time() - start)
    if model_hash:
        print(f"Model saved at {model_path} size={model_size} hash={model_hash}")
        # report finish
        metadata = {"datasetName": datasetName, "datasetUrl": datasetUrl}
        finish_job_report(node_id, job_id, model_hash, model_size, duration_seconds=duration, metadata=metadata)
    else:
        print("No model produced or hashing failed. Reporting finished with null model.")
        finish_job_report(node_id, job_id, model_hash or "", model_size or 0, duration_seconds=duration, metadata={"error":"no_model"})

# ----------------- Poll loop -----------------
def poll_for_job_loop(node_id, secret_key):
    while True:
        try:
            res = backend_get("/api/jobs/poll", params={"nodeId": node_id})
            if res and res.status_code == 200:
                data = res.json()
                job = data.get("job")
                if job:
                    # handle job synchronously (blocking) - this is fine for single node
                    handle_job(job, node_id, secret_key)
                else:
                    print("No jobs rn 😴")
            else:
                print("Polling error or backend down")
        except Exception as e:
            print("Job polling failed ❌:", e)
        time.sleep(POLL_INTERVAL)

# ----------------- Main -----------------
if __name__ == "__main__":
    print("\nAptos Compute Node Agent initializing...")
    print("Node ID generated:", NODE_ID)
    print("Handshake Key secured 🔑")
    specs = get_system_specs()
    print("System Specs:", specs)

    if not check_docker_installed():
        print("Docker not detected ❌ Install Docker!")
        raise SystemExit(1)
    print("Docker runtime check ✅")

    # register
    if not register_node(NODE_ID, specs, HANDSHAKE_KEY):
        print("Failed to register node; exiting.")
        raise SystemExit(1)

    # start heartbeat thread
    hb = threading.Thread(target=start_heartbeat, args=(NODE_ID,), daemon=True)
    hb.start()

    # start polling loop (blocks main thread)
    poll_for_job_loop(NODE_ID, HANDSHAKE_KEY)
