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
    pip install fastapi uvicorn pydantic sqlalchemy requests
    python shelbycompute-backend.py

Then point your provider agent to BACKEND_URL (default http://localhost:8000)
"""
from fastapi import FastAPI, BackgroundTasks, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import time
import uuid
import os
import hashlib
import json
import threading
import requests
from prisma import Prisma
import asyncio
from contextlib import asynccontextmanager

# --- Configuration ---
DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://user:password@localhost:5432/shelbycompute")
BACKEND_HOST = os.environ.get("SC_HOST", "0.0.0.0")
BACKEND_PORT = int(os.environ.get("SC_PORT", "8000"))
SHELBY_API_URL = os.environ.get("SHELBY_API_URL")  # optional
SHELBY_API_KEY = os.environ.get("SHELBY_API_KEY")  # optional
APTOS_SENDER_ADDRESS = os.environ.get("APTOS_SENDER_ADDRESS")
APTOS_PRIVATE_KEY = os.environ.get("APTOS_PRIVATE_KEY")

# Global Prisma client
prisma = Prisma()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await prisma.connect()
    yield
    # Shutdown
    await prisma.disconnect()

app = FastAPI(title="ShelbyCompute Minimal Backend", lifespan=lifespan)

# --- Pydantic models ---
class NodeRegister(BaseModel):
    nodeId: str
    specs: Dict[str, Any]
    containerSupported: bool = True
    handshakeKey: Optional[str]

class HeartbeatIn(BaseModel):
    nodeId: str

class JobCreateIn(BaseModel):
    jobId: Optional[str]
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
    signature: Optional[str]

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

# --- Helper utilities ---
def now_ts():
    return int(time.time())

# --- Endpoints ---
@app.post("/api/nodes/register")
async def register_node(payload: NodeRegister):
    from datetime import datetime
    now = datetime.now()
    
    # Upsert node (create or update)
    await prisma.node.upsert(
        where={"nodeId": payload.nodeId},
        data={
            "create": {
                "nodeId": payload.nodeId,
                "info": payload.specs,
                "lastSeen": now
            },
            "update": {
                "info": payload.specs,
                "lastSeen": now
            }
        }
    )
    return {"status": "ok", "nodeId": payload.nodeId}

@app.post("/api/nodes/heartbeat")
async def heartbeat(hb: HeartbeatIn):
    from datetime import datetime
    
    await prisma.node.update(
        where={"nodeId": hb.nodeId},
        data={"lastSeen": datetime.now()}
    )
    return {"status": "ok", "nodeId": hb.nodeId}

@app.post("/api/jobs/create")
async def create_job(job: JobCreateIn):
    job_id = job.jobId or str(uuid.uuid4())
    payload = {
        "jobId": job_id,
        "datasetName": job.datasetName,
        "datasetUrl": job.datasetUrl,
        "datasetHash": job.datasetHash,
        "meta": job.meta or {},
        "createdAt": now_ts()
    }
    
    await prisma.job.create(
        data={
            "jobId": job_id,
            "status": "pending",
            "payload": payload
        }
    )
    return {"status": "ok", "jobId": job_id}

@app.get("/api/jobs/poll", response_model=JobPollOut)
async def poll_for_job(nodeId: str):
    # simple first-come-first-serve: return the oldest pending job
    job = await prisma.job.find_first(
        where={"status": "pending"},
        order={"createdAt": "asc"}
    )
    
    if not job:
        return {"job": None}
    
    payload = job.payload
    return { "job": {
        "jobId": payload.get("jobId"),
        "datasetName": payload.get("datasetName"),
        "dataset": payload.get("datasetName"),   # <-- alias for CLI compatibility
        "datasetUrl": payload.get("datasetUrl"),
        "meta": payload.get("meta"),
        "createdAt": payload.get("createdAt")
    }   }


@app.post("/api/jobs/ack")
async def ack_job(payload: JobAckIn):
    from datetime import datetime
    
    # Try to update only pending jobs
    job = await prisma.job.find_first(
        where={"jobId": payload.jobId, "status": "pending"}
    )
    
    if not job:
        raise HTTPException(status_code=400, detail="Job not available for assignment")
    
    await prisma.job.update(
        where={"jobId": payload.jobId},
        data={
            "status": "assigned",
            "assignedNode": payload.nodeId,
            "startedAt": datetime.now()
        }
    )
    return {"status": "ok", "jobId": payload.jobId}

@app.post("/api/jobs/finish")
async def finish_job(finish: FinishJobIn, background_tasks: BackgroundTasks):
    from datetime import datetime
    
    # Check if job exists
    job = await prisma.job.find_unique(where={"jobId": finish.jobId})
    if not job:
        raise HTTPException(status_code=404, detail="job not found")
    
    # Update job status
    await prisma.job.update(
        where={"jobId": finish.jobId},
        data={
            "status": "finished",
            "finishedAt": datetime.now(),
            "result": {"modelHash": finish.modelHash, "meta": finish.metadata}
        }
    )
    
    # Create provenance record
    record = {
        "jobId": finish.jobId,
        "nodeId": finish.nodeId,
        "modelHash": finish.modelHash,
        "modelSizeBytes": finish.modelSizeBytes,
        "durationSeconds": finish.durationSeconds,
        "metadata": finish.metadata,
        "ts": now_ts()
    }
    
    provenance = await prisma.provenance.create(
        data={
            "jobId": finish.jobId,
            "record": record
        }
    )

    # background actions: push to shelby (if config), process payment, trigger photon
    asyncio.create_task(process_post_job_actions(finish.jobId, finish.nodeId, record))

    return {"status": "ok", "jobId": finish.jobId, "provenanceId": provenance.id}

@app.post("/api/jobs/stream-log")
async def stream_log(job_id: str, line: str):
    await prisma.log.create(
        data={
            "jobId": job_id,
            "line": line
        }
    )
    return {"status": "ok"}

@app.post("/api/usage-report")
async def usage_report(rep: UsageReport):
    # store usage into logs table as simple metric lines
    line = json.dumps({"cpu": rep.cpu_percent, "ram": rep.ram_percent, "ts": rep.ts})
    
    await prisma.log.create(
        data={
            "jobId": rep.jobId,
            "line": line
        }
    )
    return {"status": "ok"}

# --- Background processing ---
async def process_post_job_actions(job_id: str, node_id: str, record: Dict[str, Any]):
    # 1) write to Shelby if configured
    try:
        if SHELBY_API_URL and SHELBY_API_KEY:
            write_to_shelby(record)
    except Exception as e:
        print("Shelby write failed:", e)

    # 2) calculate cost and (optional) execute Aptos payment
    try:
        cost = await calculate_cost_for_job(job_id)
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

async def calculate_cost_for_job(job_id: str) -> float:
    # very simple pricing: $0.05 per minute
    job = await prisma.job.find_unique(
        where={"jobId": job_id},
        select={"startedAt": True, "finishedAt": True}
    )
    
    if not job or not job.startedAt or not job.finishedAt:
        return 0.0
    
    duration = job.finishedAt - job.startedAt
    duration_minutes = max(1, int(duration.total_seconds() / 60))
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
async def list_jobs():
    jobs = await prisma.job.find_many(
        order={"createdAt": "desc"}
    )
    
    return [{
        "jobId": job.jobId,
        "status": job.status,
        "payload": job.payload,
        "assigned": job.assignedNode,
        "startedAt": job.startedAt.isoformat() if job.startedAt else None,
        "finishedAt": job.finishedAt.isoformat() if job.finishedAt else None
    } for job in jobs]

@app.get("/api/debug/logs")
async def dump_logs(limit: int = 200):
    logs = await prisma.log.find_many(
        order={"id": "desc"},
        take=limit
    )
    
    return [{
        "jobId": log.jobId,
        "line": log.line,
        "ts": int(log.timestamp.timestamp())
    } for log in logs]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=BACKEND_HOST, port=BACKEND_PORT)
