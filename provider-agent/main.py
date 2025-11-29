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
from fastapi import FastAPI, BackgroundTasks, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
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
BACKEND_PORT = int(os.environ.get("SC_PORT", os.environ.get("PORT", "8000")))
SHELBY_API_URL = os.environ.get("SHELBY_API_URL")  # optional
SHELBY_API_KEY = os.environ.get("SHELBY_API_KEY")  # optional
APTOS_SENDER_ADDRESS = os.environ.get("APTOS_SENDER_ADDRESS")
APTOS_PRIVATE_KEY = os.environ.get("APTOS_PRIVATE_KEY")
APTOS_ESCROW_CONTRACT = os.environ.get("APTOS_ESCROW_CONTRACT", "0xd9a8605f60a8b8e124fca13eaae45ef3a4683351f7807b5b91f253616f819bf6")

app = FastAPI(title="ShelbyCompute Minimal Backend")

# Handle OPTIONS requests for CORS preflight
@app.options("/{rest_of_path:path}")
async def preflight_handler(request: Request, rest_of_path: str) -> JSONResponse:
    response = JSONResponse(content="OK")
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'POST, GET, DELETE, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = '*'
    return response

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001", 
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "*"  # Allow all for development
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

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
            created_at INTEGER
        )
    ''')
    
    # Add created_at column if it doesn't exist (for existing databases)
    try:
        c.execute('ALTER TABLE job_scripts ADD COLUMN created_at INTEGER')
        conn.commit()
    except sqlite3.OperationalError:
        # Column already exists, ignore
        pass
    conn.commit()
    conn.close()

init_db()

# --- Pydantic models ---
class NodeRegister(BaseModel):
    nodeId: str
    specs: Dict[str, Any]
    containerSupported: bool = True
    handshakeKey: Optional[str] = None
    aptosPublicKey: Optional[str] = None

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
    requirements: Optional[str] = None
    entrypoint: str = "train.py"

class StreamLogRequest(BaseModel):
    job_id: str
    line: str

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
    
    # Include Aptos public key in node info
    node_info = payload.specs.copy()
    if payload.aptosPublicKey:
        node_info['aptosPublicKey'] = payload.aptosPublicKey
    
    c.execute("INSERT OR REPLACE INTO nodes (node_id, info, last_seen) VALUES (?, ?, ?)",
              (payload.nodeId, json.dumps(node_info), now_ts()))
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
def stream_log(log_request: StreamLogRequest):
    try:
        conn = db_connect()
        c = conn.cursor()
        c.execute("INSERT INTO logs (job_id, line, ts) VALUES (?, ?, ?)", 
                 (log_request.job_id, log_request.line, now_ts()))
        conn.commit()
        conn.close()
        return {"status": "ok"}
    except Exception as e:
        print(f"Error streaming log: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to stream log: {str(e)}")

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

@app.post("/api/jobs/upload-script")
def upload_script(script: JobScriptUpload):
    """Upload a training script for a job"""
    print(f"Received script upload request for job: {script.jobId}")
    try:
        conn = db_connect()
        c = conn.cursor()
        
        # Validate input
        if not script.jobId or not script.script:
            print(f"Validation failed - jobId: {bool(script.jobId)}, script: {bool(script.script)}")
            raise HTTPException(status_code=400, detail="jobId and script are required")
        
        print(f"Inserting script for job {script.jobId}, script length: {len(script.script)}")
        c.execute("""
            INSERT OR REPLACE INTO job_scripts (job_id, script, requirements, entrypoint, created_at) 
            VALUES (?, ?, ?, ?, ?)
        """, (script.jobId, script.script, script.requirements or "", script.entrypoint, now_ts()))
        conn.commit()
        conn.close()
        
        print(f"Script uploaded successfully for job: {script.jobId}")
        return {"status": "ok", "message": "Script uploaded successfully", "jobId": script.jobId}
    except Exception as e:
        print(f"Error uploading script: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to upload script: {str(e)}")

@app.get("/api/jobs/fetch-script")
def fetch_script(jobId: str):
    """Fetch training script for a job"""
    conn = db_connect()
    c = conn.cursor()
    
    # First check if job exists
    c.execute("SELECT job_id FROM jobs WHERE job_id = ?", (jobId,))
    if not c.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Then check for script
    c.execute("SELECT script, requirements, entrypoint FROM job_scripts WHERE job_id = ?", (jobId,))
    row = c.fetchone()
    conn.close()
    
    if not row:
        # Return default script if no custom script uploaded
        return {
            "script": "",
            "requirements": "",
            "entrypoint": "train.py"
        }
    
    return {
        "script": row[0],
        "requirements": row[1] or "",
        "entrypoint": row[2] or "train.py"
    }

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

# --- Frontend API endpoints ---
@app.get("/api/frontend/system-stats")
def get_system_stats():
    """Get overall system statistics for frontend dashboard"""
    conn = db_connect()
    c = conn.cursor()
    
    # Count jobs by status
    c.execute("SELECT status, COUNT(*) FROM jobs GROUP BY status")
    status_counts = dict(c.fetchall())
    
    # Get total jobs
    c.execute("SELECT COUNT(*) FROM jobs")
    total_jobs = c.fetchone()[0]
    
    # Get active nodes
    c.execute("SELECT COUNT(*) FROM nodes WHERE last_seen > ?", (now_ts() - 300,))  # last 5 mins
    active_nodes = c.fetchone()[0]
    
    conn.close()
    
    return {
        "activeJobs": status_counts.get("assigned", 0) + status_counts.get("running", 0),
        "totalJobs": total_jobs,
        "gpuUtilization": 84.2,  # Mock for now
        "networkIO": 4.2,  # Mock for now
        "creditsSpent": 245.2,  # Mock for now
        "creditsPerHour": 12.4  # Mock for now
    }



@app.get("/api/frontend/node-stats")
def get_node_stats():
    """Get aggregated node statistics"""
    conn = db_connect()
    c = conn.cursor()
    c.execute("SELECT COUNT(*) FROM nodes")
    total_nodes = c.fetchone()[0]
    
    c.execute("SELECT COUNT(*) FROM nodes WHERE last_seen > ?", (now_ts() - 300,))
    online_nodes = c.fetchone()[0]
    
    c.execute("SELECT COUNT(*) FROM jobs WHERE status IN ('assigned', 'running')")
    active_jobs = c.fetchone()[0]
    
    conn.close()
    
    return {
        "total": total_nodes,
        "online": online_nodes,
        "offline": total_nodes - online_nodes,
        "totalGpus": online_nodes * 8,  # Mock: assume 8 GPUs per node
        "activeJobs": active_jobs
    }

@app.get("/api/frontend/logs")
def get_logs_for_frontend(jobId: str = None, limit: int = 100):
    """Get logs for frontend, optionally filtered by job ID"""
    conn = db_connect()
    c = conn.cursor()
    
    if jobId:
        c.execute("SELECT job_id, line, ts FROM logs WHERE job_id = ? ORDER BY id DESC LIMIT ?", (jobId, limit))
    else:
        c.execute("SELECT job_id, line, ts FROM logs ORDER BY id DESC LIMIT ?", (limit,))
    
    rows = c.fetchall()
    conn.close()
    
    return [{
        "jobId": r[0],
        "line": r[1],
        "ts": r[2]
    } for r in rows]

@app.get("/api/frontend/job-metrics/{job_id}")
def get_job_metrics(job_id: str):
    """Get metrics for a specific job"""
    conn = db_connect()
    c = conn.cursor()
    
    # Get job duration
    c.execute("SELECT started_at, finished_at FROM jobs WHERE job_id = ?", (job_id,))
    job_times = c.fetchone()
    
    # Get usage reports (stored as JSON in logs)
    c.execute("SELECT line, ts FROM logs WHERE job_id = ? ORDER BY id", (job_id,))
    log_rows = c.fetchall()
    
    conn.close()
    
    duration = 0
    gpu_usage = []
    cpu_usage = []
    memory_usage = []
    timestamps = []
    
    if job_times and job_times[0] and job_times[1]:
        duration = job_times[1] - job_times[0]
    
    # Parse usage metrics from logs
    for line, ts in log_rows:
        try:
            data = json.loads(line)
            if "cpu" in data and "ram" in data:
                cpu_usage.append(data["cpu"])
                memory_usage.append(data["ram"])
                gpu_usage.append(85 + (data["cpu"] / 10))  # Mock GPU based on CPU
                timestamps.append(ts)
        except:
            continue
    
    return {
        "duration": duration,
        "gpuUsage": gpu_usage,
        "cpuUsage": cpu_usage,
        "memoryUsage": memory_usage,
        "timestamps": timestamps
    }

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

# --- Frontend API Endpoints ---

@app.get("/api/frontend/dashboard")
def get_dashboard_stats():
    """Get dashboard statistics for frontend"""
    conn = db_connect()
    c = conn.cursor()
    
    # Get job counts by status
    c.execute("SELECT status, COUNT(*) FROM jobs GROUP BY status")
    job_stats = {row[0]: row[1] for row in c.fetchall()}
    
    # Get active nodes count
    cutoff = now_ts() - 60  # nodes active in last minute
    c.execute("SELECT COUNT(*) FROM nodes WHERE last_seen > ?", (cutoff,))
    active_nodes = c.fetchone()[0]
    
    # Get recent jobs
    c.execute("""
        SELECT job_id, status, payload, created_at, assigned_node, started_at, finished_at 
        FROM jobs ORDER BY created_at DESC LIMIT 10
    """)
    recent_jobs = []
    for row in c.fetchall():
        payload = json.loads(row[2]) if row[2] else {}
        recent_jobs.append({
            "jobId": row[0],
            "status": row[1],
            "datasetName": payload.get("datasetName", "Unknown"),
            "createdAt": row[3],
            "assignedNode": row[4],
            "startedAt": row[5],
            "finishedAt": row[6]
        })
    
    conn.close()
    
    return {
        "jobStats": {
            "pending": job_stats.get("pending", 0),
            "assigned": job_stats.get("assigned", 0),
            "finished": job_stats.get("finished", 0),
            "total": sum(job_stats.values())
        },
        "activeNodes": active_nodes,
        "recentJobs": recent_jobs,
        "timestamp": now_ts()
    }

@app.get("/api/frontend/jobs")
def get_jobs_for_frontend(status: Optional[str] = None, limit: int = 50):
    """Get jobs with frontend-friendly format"""
    conn = db_connect()
    c = conn.cursor()
    
    if status:
        c.execute("""
            SELECT job_id, status, payload, created_at, assigned_node, started_at, finished_at, result
            FROM jobs WHERE status = ? ORDER BY created_at DESC LIMIT ?
        """, (status, limit))
    else:
        c.execute("""
            SELECT job_id, status, payload, created_at, assigned_node, started_at, finished_at, result
            FROM jobs ORDER BY created_at DESC LIMIT ?
        """, (limit,))
    
    jobs = []
    for row in c.fetchall():
        payload = json.loads(row[2]) if row[2] else {}
        result = json.loads(row[7]) if row[7] else {}
        
        # Calculate duration if job is finished
        duration = None
        if row[5] and row[6]:  # started_at and finished_at
            duration = row[6] - row[5]
        
        jobs.append({
            "jobId": row[0],
            "status": row[1],
            "datasetName": payload.get("datasetName", "Unknown"),
            "datasetUrl": payload.get("datasetUrl"),
            "meta": payload.get("meta", {}),
            "createdAt": row[3],
            "assignedNode": row[4],
            "startedAt": row[5],
            "finishedAt": row[6],
            "duration": duration,
            "modelHash": result.get("modelHash") if result else None,
            "metadata": result.get("meta") if result else None
        })
    
    conn.close()
    return {"jobs": jobs, "count": len(jobs)}

@app.get("/api/frontend/jobs/{job_id}")
def get_job_details(job_id: str):
    """Get detailed job information including logs"""
    conn = db_connect()
    c = conn.cursor()
    
    # Get job info
    c.execute("""
        SELECT job_id, status, payload, created_at, assigned_node, started_at, finished_at, result
        FROM jobs WHERE job_id = ?
    """, (job_id,))
    
    row = c.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Job not found")
    
    payload = json.loads(row[2]) if row[2] else {}
    result = json.loads(row[7]) if row[7] else {}
    
    # Calculate duration
    duration = None
    if row[5] and row[6]:  # started_at and finished_at
        duration = row[6] - row[5]
    
    # Get job logs
    c.execute("SELECT line, ts FROM logs WHERE job_id = ? ORDER BY id ASC", (job_id,))
    logs = [{"line": log[0], "timestamp": log[1]} for log in c.fetchall()]
    
    # Get provenance records
    c.execute("SELECT record, created_at FROM provenance WHERE job_id = ?", (job_id,))
    provenance = []
    for prov_row in c.fetchall():
        record = json.loads(prov_row[0]) if prov_row[0] else {}
        provenance.append({
            "record": record,
            "createdAt": prov_row[1]
        })
    
    conn.close()
    
    job_details = {
        "jobId": row[0],
        "status": row[1],
        "datasetName": payload.get("datasetName", "Unknown"),
        "datasetUrl": payload.get("datasetUrl"),
        "meta": payload.get("meta", {}),
        "createdAt": row[3],
        "assignedNode": row[4],
        "startedAt": row[5],
        "finishedAt": row[6],
        "duration": duration,
        "modelHash": result.get("modelHash") if result else None,
        "metadata": result.get("meta") if result else None,
        "logs": logs,
        "provenance": provenance
    }
    
    return job_details

@app.get("/api/frontend/nodes")
def get_nodes_for_frontend():
    """Get compute nodes with frontend-friendly format"""
    conn = db_connect()
    c = conn.cursor()
    
    c.execute("SELECT node_id, info, last_seen FROM nodes ORDER BY last_seen DESC")
    nodes = []
    current_time = now_ts()
    
    for row in c.fetchall():
        info = json.loads(row[1]) if row[1] else {}
        last_seen = row[2]
        
        # Determine node status
        if current_time - last_seen < 30:  # active if seen in last 30 seconds
            status = "online"
        elif current_time - last_seen < 300:  # warning if seen in last 5 minutes
            status = "warning"
        else:
            status = "offline"
        
        nodes.append({
            "nodeId": row[0],
            "status": status,
            "lastSeen": str(last_seen),
            "lastSeenAgo": current_time - last_seen,
            "specs": {
                "cpuUsage": info.get("cpuUsage", 0),
                "ramUsage": info.get("ramUsage", 0),
                "totalRAM_GB": info.get("totalRAM_GB", 0),
                "os": info.get("os", "Unknown"),
                "platform": info.get("platform", "Unknown"),
                "processor": info.get("processor", "Unknown")
            },
            "uptime": "99.9%" if status == "online" else "0%",
            "region": info.get("region", info.get("os", "Unknown"))
        })
    
    conn.close()
    return {"nodes": nodes, "count": len(nodes)}

@app.get("/api/frontend/logs/{job_id}")
def get_job_logs_stream(job_id: str, limit: int = 1000):
    """Get streaming logs for a specific job"""
    conn = db_connect()
    c = conn.cursor()
    
    c.execute("SELECT line, ts FROM logs WHERE job_id = ? ORDER BY id DESC LIMIT ?", (job_id, limit))
    logs = [{"line": row[0], "timestamp": row[1]} for row in c.fetchall()]
    logs.reverse()  # Show oldest first
    
    conn.close()
    return {"jobId": job_id, "logs": logs}

@app.delete("/api/frontend/jobs/{job_id}")
def delete_job(job_id: str):
    """Delete a job and its associated data"""
    conn = db_connect()
    c = conn.cursor()
    
    # Delete job and related records
    c.execute("DELETE FROM logs WHERE job_id = ?", (job_id,))
    c.execute("DELETE FROM provenance WHERE job_id = ?", (job_id,))
    c.execute("DELETE FROM job_scripts WHERE job_id = ?", (job_id,))
    c.execute("DELETE FROM jobs WHERE job_id = ?", (job_id,))
    
    deleted = c.rowcount > 0
    conn.commit()
    conn.close()
    
    if not deleted:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return {"status": "ok", "message": "Job deleted successfully", "jobId": job_id}

@app.delete("/api/frontend/nodes/{node_id}")
def delete_node(node_id: str):
    """Delete a compute node"""
    conn = db_connect()
    c = conn.cursor()
    
    # Check if node has active jobs
    c.execute("SELECT COUNT(*) FROM jobs WHERE assigned_node = ? AND status IN ('assigned', 'running')", (node_id,))
    active_jobs = c.fetchone()[0]
    
    if active_jobs > 0:
        conn.close()
        raise HTTPException(status_code=400, detail=f"Cannot delete node with {active_jobs} active job(s)")
    
    # Delete the node
    c.execute("DELETE FROM nodes WHERE node_id = ?", (node_id,))
    deleted = c.rowcount > 0
    conn.commit()
    conn.close()
    
    if not deleted:
        raise HTTPException(status_code=404, detail="Node not found")
    
    return {"status": "ok", "message": "Node deleted successfully", "nodeId": node_id}

@app.delete("/api/frontend/nodes/{node_id}")
def delete_node(node_id: str):
    """Delete a compute node"""
    conn = db_connect()
    c = conn.cursor()
    
    # Check if node has active jobs
    c.execute("SELECT COUNT(*) FROM jobs WHERE assigned_node = ? AND status IN ('assigned', 'running')", (node_id,))
    active_jobs = c.fetchone()[0]
    
    if active_jobs > 0:
        conn.close()
        raise HTTPException(status_code=400, detail=f"Cannot delete node with {active_jobs} active job(s)")
    
    # Delete the node
    c.execute("DELETE FROM nodes WHERE node_id = ?", (node_id,))
    deleted = c.rowcount > 0
    conn.commit()
    conn.close()
    
    if not deleted:
        raise HTTPException(status_code=404, detail="Node not found")
    
    return {"status": "ok", "message": "Node deleted successfully", "nodeId": node_id}

@app.post("/api/frontend/jobs/{job_id}/restart")
def restart_job(job_id: str):
    """Restart a finished or failed job"""
    conn = db_connect()
    c = conn.cursor()
    
    # Reset job status to pending
    c.execute("""
        UPDATE jobs SET status = 'pending', assigned_node = NULL, 
        started_at = NULL, finished_at = NULL, result = NULL 
        WHERE job_id = ?
    """, (job_id,))
    
    updated = c.rowcount > 0
    conn.commit()
    conn.close()
    
    if not updated:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return {"status": "ok", "message": "Job restarted successfully", "jobId": job_id}

@app.get("/api/frontend/system/health")
def system_health():
    """Get system health status"""
    conn = db_connect()
    c = conn.cursor()
    
    try:
        # Test database connection
        c.execute("SELECT 1")
        db_status = "healthy"
    except Exception:
        db_status = "unhealthy"
    
    # Count active nodes
    cutoff = now_ts() - 60
    c.execute("SELECT COUNT(*) FROM nodes WHERE last_seen > ?", (cutoff,))
    active_nodes = c.fetchone()[0]
    
    # Count jobs by status
    c.execute("SELECT status, COUNT(*) FROM jobs GROUP BY status")
    job_counts = {row[0]: row[1] for row in c.fetchall()}
    
    conn.close()
    
    return {
        "status": "healthy" if db_status == "healthy" else "unhealthy",
        "database": db_status,
        "activeNodes": active_nodes,
        "jobQueue": {
            "pending": job_counts.get("pending", 0),
            "running": job_counts.get("assigned", 0),
            "completed": job_counts.get("finished", 0)
        },
        "timestamp": now_ts()
    }

@app.get("/api/frontend/earnings/{aptos_public_key}")
def get_earnings_by_public_key(aptos_public_key: str):
    """Get earnings data for a specific Aptos public key"""
    conn = db_connect()
    c = conn.cursor()
    
    # Get nodes associated with this public key
    # Note: In real implementation, you'd have a mapping table
    # For now, we'll mock this by using node specs to store public keys
    c.execute("SELECT node_id, info FROM nodes")
    user_nodes = []
    for row in c.fetchall():
        info = json.loads(row[1]) if row[1] else {}
        if info.get('aptosPublicKey') == aptos_public_key:
            user_nodes.append(row[0])
    
    # Calculate earnings from completed jobs
    if user_nodes:
        placeholders = ','.join(['?' for _ in user_nodes])
        c.execute(f"""
            SELECT COUNT(*) as total_jobs, 
                   AVG(CASE WHEN finished_at AND started_at THEN finished_at - started_at ELSE NULL END) as avg_duration
            FROM jobs WHERE assigned_node IN ({placeholders}) AND status = 'finished'
        """, user_nodes)
        job_stats = c.fetchone()
        total_jobs = job_stats[0] if job_stats else 0
        avg_duration = job_stats[1] if job_stats and job_stats[1] else 0
    else:
        total_jobs = 0
        avg_duration = 0
    
    # Mock earnings calculation (in real implementation, fetch from payment records)
    total_earned = total_jobs * 12.5  # Mock: $12.50 per job
    today_earned = min(total_earned, 45.20)  # Mock today's earnings
    weekly_earned = min(total_earned, 284.15)  # Mock weekly earnings
    monthly_earned = min(total_earned, 967.45)  # Mock monthly earnings
    
    conn.close()
    
    return {
        "totalEarned": total_earned,
        "todayEarned": today_earned,
        "weeklyEarned": weekly_earned,
        "monthlyEarned": monthly_earned,
        "totalJobs": total_jobs,
        "activeNodes": len(user_nodes),
        "averageJobDuration": avg_duration / 60 if avg_duration else 0,  # Convert to minutes
        "estimatedMonthly": total_earned * 1.2  # Mock growth estimate
    }

@app.get("/api/frontend/payments/{aptos_public_key}")
def get_payments_by_public_key(aptos_public_key: str, limit: int = 50):
    """Get payment history for a specific Aptos public key"""
    conn = db_connect()
    c = conn.cursor()
    
    # Get user's nodes
    c.execute("SELECT node_id, info FROM nodes")
    user_nodes = []
    for row in c.fetchall():
        info = json.loads(row[1]) if row[1] else {}
        if info.get('aptosPublicKey') == aptos_public_key:
            user_nodes.append(row[0])
    
    payments = []
    if user_nodes:
        # Get completed jobs for user's nodes
        placeholders = ','.join(['?' for _ in user_nodes])
        c.execute(f"""
            SELECT job_id, assigned_node, started_at, finished_at, payload, result 
            FROM jobs 
            WHERE assigned_node IN ({placeholders}) AND status = 'finished'
            ORDER BY finished_at DESC LIMIT ?
        """, user_nodes + [limit])
        
        for row in c.fetchall():
            job_id, node_id, started_at, finished_at, payload_json, result_json = row
            payload = json.loads(payload_json) if payload_json else {}
            duration = (finished_at - started_at) / 60 if finished_at and started_at else 0  # minutes
            
            # Mock payment calculation
            amount = duration * 0.25  # Mock: $0.25 per minute
            
            payments.append({
                "id": f"pay_{job_id[:8]}",
                "jobId": job_id,
                "nodeId": node_id,
                "amount": round(amount, 2),
                "currency": "PHOTON",
                "timestamp": finished_at * 1000,  # Convert to milliseconds
                "status": "completed",
                "txHash": f"0x{hashlib.sha256(job_id.encode()).hexdigest()[:8]}...{hashlib.sha256(job_id.encode()).hexdigest()[-4:]}",
                "jobType": payload.get('meta', {}).get('type', 'Training'),
                "duration": int(duration)
            })
    
    conn.close()
    return {"payments": payments, "count": len(payments)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=BACKEND_HOST, port=BACKEND_PORT)