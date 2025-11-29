"""
FastAPI backend for ShelbyCompute (minimal, real-job capable)

Features implemented:
- Node registration
- Heartbeats
- Job creation (from renter/UI)
- Job polling (by provider node)
- Job acknowledgement (assignment)
- Job finish (results + provenance stored locally and optionally pushed to Shelby)
- Log streaming and usage reporting
- Simple SQLite persistence
- Aptos payment stub (clear instructions where to plug real Aptos SDK)

Run:
    pip install fastapi uvicorn requests
    python main.py

Then point your provider agent to BACKEND_URL (default http://localhost:8000)
"""
from fastapi import FastAPI, BackgroundTasks, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import sqlite3
import time
import uuid
import os
import hashlib
import json
import threading
import requests

# --- Configuration ---
DB_PATH = os.environ.get("SC_DB", "./shelbycompute.db")
BACKEND_HOST = os.environ.get("SC_HOST", "0.0.0.0")
BACKEND_PORT = int(os.environ.get("SC_PORT", "8000"))
SHELBY_API_URL = os.environ.get("SHELBY_API_URL")  # optional
SHELBY_API_KEY = os.environ.get("SHELBY_API_KEY")  # optional
APTOS_SENDER_ADDRESS = os.environ.get("APTOS_SENDER_ADDRESS")
APTOS_PRIVATE_KEY = os.environ.get("APTOS_PRIVATE_KEY")

app = FastAPI(title="ShelbyCompute Minimal Backend")

# --- DB helpers ---
def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS nodes (
            node_id TEXT PRIMARY KEY,
            info TEXT,
            last_seen INTEGER
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS jobs (
            job_id TEXT PRIMARY KEY,
            status TEXT,
            payload TEXT,
            created_at INTEGER,
            assigned_node TEXT,
            started_at INTEGER,
            finished_at INTEGER,
            result TEXT
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS provenance (
            id TEXT PRIMARY KEY,
            job_id TEXT,
            record TEXT,
            created_at INTEGER
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            job_id TEXT,
            line TEXT,
            ts INTEGER
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS job_scripts (
            job_id TEXT PRIMARY KEY,
            script TEXT,
            requirements TEXT,
            entrypoint TEXT,
            uploaded_at INTEGER
        )
    ''')
    conn.commit()
    conn.close()

init_db()

# --- Pydantic models ---
class NodeRegister(BaseModel):
    nodeId: str
    specs: Dict[str, Any]
    containerSupported: bool = True
    handshakeKey: Optional[str] = None

class HeartbeatIn(BaseModel):
    nodeId: str

class JobCreateIn(BaseModel):
    jobId: Optional[str] = None
    datasetName: str
    datasetUrl: Optional[str] = None
    datasetHash: Optional[str] = None
    runtimeMinutesEstimate: Optional[int] = 5
    meta: Optional[Dict[str, Any]] = {}

class JobPollOut(BaseModel):
    job: Optional[Dict[str, Any]] = None

class JobAckIn(BaseModel):
    nodeId: str
    jobId: str
    signature: Optional[str] = None

class UsageReport(BaseModel):
    nodeId: str
    jobId: str
    cpu_percent: float
    ram_percent: float
    ts: int

class FinishJobIn(BaseModel):
    nodeId: str
    jobId: str
    modelHash: str
    modelSizeBytes: int
    metadata: Dict[str, Any]
    durationSeconds: int

class JobScriptUpload(BaseModel):
    jobId: str
    script: str
    requirements: Optional[str] = ""
    entrypoint: Optional[str] = "train.py"

# --- Helper utilities ---
def db_connect():
    return sqlite3.connect(DB_PATH)

def now_ts():
    return int(time.time())

# --- Endpoints ---
@app.post("/api/nodes/register")
def register_node(payload: NodeRegister):
    conn = db_connect()
    c = conn.cursor()
    c.execute("INSERT OR REPLACE INTO nodes (node_id, info, last_seen) VALUES (?, ?, ?)",
              (payload.nodeId, json.dumps(payload.specs), now_ts()))
    conn.commit()
    conn.close()
    return {"status": "ok", "nodeId": payload.nodeId}

@app.post("/api/nodes/heartbeat")
def heartbeat(hb: HeartbeatIn):
    conn = db_connect()
    c = conn.cursor()
    c.execute("UPDATE nodes SET last_seen = ? WHERE node_id = ?", (now_ts(), hb.nodeId))
    conn.commit()
    conn.close()
    return {"status": "ok", "nodeId": hb.nodeId}

@app.post("/api/jobs/create")
def create_job(job: JobCreateIn):
    job_id = job.jobId or str(uuid.uuid4())
    payload = {
        "jobId": job_id,
        "datasetName": job.datasetName,
        "datasetUrl": job.datasetUrl,
        "datasetHash": job.datasetHash,
        "meta": job.meta,
        "createdAt": now_ts()
    }
    conn = db_connect()
    c = conn.cursor()
    c.execute("INSERT INTO jobs (job_id, status, payload, created_at) VALUES (?, ?, ?, ?)",
              (job_id, "pending", json.dumps(payload), now_ts()))
    conn.commit()
    conn.close()
    return {"status": "ok", "jobId": job_id}

@app.get("/api/jobs/poll", response_model=JobPollOut)
def poll_for_job(nodeId: str):
    # simple first-come-first-serve: return the oldest pending job
    conn = db_connect()
    c = conn.cursor()
    c.execute("SELECT job_id, payload FROM jobs WHERE status = 'pending' ORDER BY created_at LIMIT 1")
    row = c.fetchone()
    if not row:
        conn.close()
        return {"job": None}
    job_id, payload_json = row
    payload = json.loads(payload_json)
    # assign tentatively but keep status pending until ack
    conn.close()
    return { "job": {
        "jobId": payload.get("jobId"),
        "datasetName": payload.get("datasetName"),
        "dataset": payload.get("datasetName"),   # <-- alias for CLI compatibility
        "datasetUrl": payload.get("datasetUrl"),
        "meta": payload.get("meta"),
        "createdAt": payload.get("createdAt")
    }   }

@app.post("/api/jobs/ack")
def ack_job(payload: JobAckIn):
    conn = db_connect()
    c = conn.cursor()
    # mark job as assigned
    c.execute("UPDATE jobs SET status = ?, assigned_node = ?, started_at = ? WHERE job_id = ? AND status = 'pending'",
              ("assigned", payload.nodeId, now_ts(), payload.jobId))
    conn.commit()
    updated = c.rowcount
    conn.close()
    if updated == 0:
        raise HTTPException(status_code=400, detail="Job not available for assignment")
    return {"status": "ok", "jobId": payload.jobId}

@app.get("/api/jobs/fetch-script")
def fetch_script_for_job(jobId: str):
    """
    Fetch renter's script and requirements for a specific job.
    First checks for uploaded custom script, falls back to demo script.
    """
    conn = db_connect()
    c = conn.cursor()
    
    # Check if there's a custom script for this job
    c.execute("SELECT script, requirements, entrypoint FROM job_scripts WHERE job_id = ?", (jobId,))
    row = c.fetchone()
    conn.close()
    
    if row:
        # Return custom uploaded script
        return {
            "script": row[0],
            "requirements": row[1] or "",
            "entrypoint": row[2] or "train.py"
        }
    
    # Fallback to demo script
    demo_script = f'''
import os
import time
import json

print("Starting demo training job...")
print("Job ID: {jobId}")

# Simulate some training work
for i in range(5):
    print(f"Training epoch {{i+1}}/5...")
    time.sleep(1)  # Reduced for faster testing

# Create output directory and save a demo model
os.makedirs("output", exist_ok=True)
model_data = f"demo-model-{jobId}-{{int(time.time())}}"

with open("output/model.bin", "w") as f:
    f.write(model_data)

print("Training completed! Model saved to output/model.bin")
print(f"Model data: {{model_data}}")
'''
    
    demo_requirements = '''
# Demo requirements - no external dependencies needed for demo
'''
    
    return {
        "script": demo_script.strip(),
        "requirements": demo_requirements.strip(),
        "entrypoint": "train.py"
    }

@app.post("/api/jobs/upload-script")
def upload_job_script(script_upload: JobScriptUpload):
    """
    Upload a custom training script for a specific job.
    This allows renters to provide their own training code.
    """
    conn = db_connect()
    c = conn.cursor()
    
    # Store the script
    c.execute("""
        INSERT OR REPLACE INTO job_scripts 
        (job_id, script, requirements, entrypoint, uploaded_at) 
        VALUES (?, ?, ?, ?, ?)
    """, (
        script_upload.jobId,
        script_upload.script,
        script_upload.requirements,
        script_upload.entrypoint,
        now_ts()
    ))
    conn.commit()
    conn.close()
    
    return {
        "status": "ok",
        "jobId": script_upload.jobId,
        "message": "Script uploaded successfully"
    }

@app.post("/api/jobs/finish")
def finish_job(finish: FinishJobIn, background_tasks: BackgroundTasks):
    conn = db_connect()
    c = conn.cursor()
    c.execute("SELECT status FROM jobs WHERE job_id = ?", (finish.jobId,))
    row = c.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="job not found")
    c.execute("UPDATE jobs SET status = ?, finished_at = ?, result = ? WHERE job_id = ?",
              ("finished", now_ts(), json.dumps({"modelHash": finish.modelHash, "meta": finish.metadata}), finish.jobId))
    # write provenance record
    prov_id = str(uuid.uuid4())
    record = {
        "jobId": finish.jobId,
        "nodeId": finish.nodeId,
        "modelHash": finish.modelHash,
        "modelSizeBytes": finish.modelSizeBytes,
        "durationSeconds": finish.durationSeconds,
        "metadata": finish.metadata,
        "ts": now_ts()
    }
    c.execute("INSERT INTO provenance (id, job_id, record, created_at) VALUES (?, ?, ?, ?)",
              (prov_id, finish.jobId, json.dumps(record), now_ts()))
    conn.commit()
    conn.close()

    # background actions: push to shelby (if config), process payment, trigger photon
    background_tasks.add_task(process_post_job_actions, finish.jobId, finish.nodeId, record)

    return {"status": "ok", "jobId": finish.jobId, "provenanceId": prov_id}

@app.post("/api/jobs/stream-log")
def stream_log(job_id: str, line: str):
    conn = db_connect()
    c = conn.cursor()
    c.execute("INSERT INTO logs (job_id, line, ts) VALUES (?, ?, ?)", (job_id, line, now_ts()))
    conn.commit()
    conn.close()
    return {"status": "ok"}

@app.post("/api/usage-report")
def usage_report(rep: UsageReport):
    # store usage into logs table as simple metric lines
    conn = db_connect()
    c = conn.cursor()
    line = json.dumps({"cpu": rep.cpu_percent, "ram": rep.ram_percent, "ts": rep.ts})
    c.execute("INSERT INTO logs (job_id, line, ts) VALUES (?, ?, ?)", (rep.jobId, line, now_ts()))
    conn.commit()
    conn.close()
    return {"status": "ok"}

# --- Background processing ---
def process_post_job_actions(job_id: str, node_id: str, record: Dict[str, Any]):
    # 1) write to Shelby if configured
    try:
        if SHELBY_API_URL and SHELBY_API_KEY:
            write_to_shelby(record)
    except Exception as e:
        print("Shelby write failed:", e)

    # 2) calculate cost and (optional) execute Aptos payment
    try:
        cost = calculate_cost_for_job(job_id)
        tx = None
        if APTOS_SENDER_ADDRESS and APTOS_PRIVATE_KEY:
            tx = execute_aptos_payment(node_id, cost)
        else:
            print("Aptos credentials not configured; skipping on-chain payment. Implement execute_aptos_payment() to send real txs.")
    except Exception as e:
        print("Payment processing failed:", e)

    # 3) trigger Photon reward (placeholder HTTP call if Photon endpoint is known)
    try:
        trigger_photon_reward(node_id, job_id)
    except Exception as e:
        print("Photon trigger failed:", e)

    print(f"Post-job actions completed for {job_id}: cost={locals().get('cost')}, tx={locals().get('tx')}")

# --- Helpers for actions ---
def write_to_shelby(record: Dict[str, Any]):
    payload = {"record": record}
    headers = {"Authorization": f"Bearer {SHELBY_API_KEY}", "Content-Type": "application/json"}
    res = requests.post(SHELBY_API_URL, json=payload, headers=headers, timeout=10)
    res.raise_for_status()
    print("Wrote provenance to Shelby")

def calculate_cost_for_job(job_id: str) -> float:
    # very simple pricing: $0.05 per minute
    conn = db_connect()
    c = conn.cursor()
    c.execute("SELECT started_at, finished_at FROM jobs WHERE job_id = ?", (job_id,))
    r = c.fetchone()
    conn.close()
    if not r or not r[0] or not r[1]:
        return 0.0
    duration_minutes = max(1, int((r[1] - r[0]) / 60))
    price_per_min = 0.05
    usd_cost = duration_minutes * price_per_min
    # convert to Aptos units if desired later
    return usd_cost

def execute_aptos_payment(node_id: str, amount_usd: float) -> Optional[str]:
    # Placeholder: integrate real Aptos SDK here.
    # Suggestion: use aptos-python-client or REST API — sign tx with APTOS_PRIVATE_KEY and send funds
    # For now, return a deterministic dummy tx hash so frontend can display something
    dummy = hashlib.sha256(f"{node_id}:{amount_usd}:{time.time()}".encode()).hexdigest()
    print("(Placeholder) Aptos tx hash:", dummy)
    return dummy

def trigger_photon_reward(node_id: str, job_id: str):
    # Placeholder: Photon endpoint integration
    print(f"Triggering Photon reward for node={node_id}, job={job_id}")
    return True

# --- Utilities for debugging ---
@app.get("/api/debug/jobs")
def list_jobs():
    conn = db_connect()
    c = conn.cursor()
    c.execute("SELECT job_id, status, payload, assigned_node, started_at, finished_at FROM jobs ORDER BY created_at DESC")
    rows = c.fetchall()
    conn.close()
    out = []
    for r in rows:
        out.append({
            "jobId": r[0],
            "status": r[1],
            "payload": json.loads(r[2]) if r[2] else None,
            "assigned": r[3],
            "startedAt": r[4],
            "finishedAt": r[5]
        })
    return out

@app.get("/api/debug/logs")
def dump_logs(limit: int = 200):
    conn = db_connect()
    c = conn.cursor()
    c.execute("SELECT job_id, line, ts FROM logs ORDER BY id DESC LIMIT ?", (limit,))
    rows = c.fetchall()
    conn.close()
    return [{"jobId": r[0], "line": r[1], "ts": r[2]} for r in rows]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=BACKEND_HOST, port=BACKEND_PORT)