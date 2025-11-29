# ShelbyCompute API Documentation

Base URL: `http://localhost:8000` (or your hosted domain)

## Frontend API Endpoints

### Dashboard & Statistics

#### GET `/api/frontend/dashboard`
Get dashboard statistics for the frontend.

**Response:**
```json
{
  "jobStats": {
    "pending": 2,
    "assigned": 1,
    "finished": 5,
    "total": 8
  },
  "activeNodes": 3,
  "recentJobs": [...],
  "timestamp": 1643723400
}
```

#### GET `/api/frontend/system/health`
Get system health status.

**Response:**
```json
{
  "status": "healthy",
  "database": "healthy",
  "activeNodes": 3,
  "jobQueue": {
    "pending": 2,
    "running": 1,
    "completed": 5
  },
  "timestamp": 1643723400
}
```

### Job Management

#### GET `/api/frontend/jobs`
Get jobs with frontend-friendly format.

**Query Parameters:**
- `status` (optional): Filter by job status (`pending`, `assigned`, `finished`)
- `limit` (optional): Number of jobs to return (default: 50)

**Response:**
```json
{
  "jobs": [
    {
      "jobId": "job-123",
      "status": "finished",
      "datasetName": "MNIST Dataset",
      "datasetUrl": "https://...",
      "meta": {},
      "createdAt": 1643723400,
      "assignedNode": "node-456",
      "startedAt": 1643723500,
      "finishedAt": 1643723800,
      "duration": 300,
      "modelHash": "abc123...",
      "metadata": {...}
    }
  ],
  "count": 1
}
```

#### GET `/api/frontend/jobs/{job_id}`
Get detailed job information including logs.

**Response:**
```json
{
  "jobId": "job-123",
  "status": "finished",
  "datasetName": "MNIST Dataset",
  "logs": [
    {
      "line": "Starting training...",
      "timestamp": 1643723500
    }
  ],
  "provenance": [...]
}
```

#### POST `/api/jobs/create`
Create a new job.

**Request Body:**
```json
{
  "jobId": "optional-job-id",
  "datasetName": "My Dataset",
  "datasetUrl": "https://example.com/dataset",
  "datasetHash": "optional-hash",
  "runtimeMinutesEstimate": 30,
  "meta": {
    "description": "Custom training job"
  }
}
```

#### POST `/api/jobs/upload-script`
Upload a custom training script for a job.

**Request Body:**
```json
{
  "jobId": "job-123",
  "script": "import torch\n# Your training code here",
  "requirements": "torch>=1.9.0\ntransformers>=4.0.0",
  "entrypoint": "train.py"
}
```

#### DELETE `/api/frontend/jobs/{job_id}`
Delete a job and its associated data.

#### POST `/api/frontend/jobs/{job_id}/restart`
Restart a finished or failed job.

### Node Management

#### GET `/api/frontend/nodes`
Get compute nodes with frontend-friendly format.

**Response:**
```json
{
  "nodes": [
    {
      "nodeId": "node-123",
      "status": "active",
      "lastSeen": 1643723400,
      "lastSeenAgo": 30,
      "specs": {
        "cpuUsage": 45.2,
        "ramUsage": 60.1,
        "totalRAM_GB": 16.0,
        "os": "Linux",
        "platform": "Ubuntu 20.04"
      }
    }
  ],
  "count": 1
}
```

### Logs & Monitoring

#### GET `/api/frontend/logs/{job_id}`
Get streaming logs for a specific job.

**Query Parameters:**
- `limit` (optional): Number of log lines to return (default: 1000)

**Response:**
```json
{
  "jobId": "job-123",
  "logs": [
    {
      "line": "Training epoch 1/5...",
      "timestamp": 1643723500
    }
  ]
}
```

## Core API Endpoints (for agents)

### Node Registration & Heartbeat

#### POST `/api/nodes/register`
Register a compute node.

#### POST `/api/nodes/heartbeat`
Send node heartbeat.

### Job Processing (Agent)

#### GET `/api/jobs/poll`
Poll for available jobs (used by agents).

#### POST `/api/jobs/ack`
Acknowledge job assignment.

#### GET `/api/jobs/fetch-script`
Fetch training script for a job.

#### POST `/api/jobs/finish`
Mark job as finished.

#### POST `/api/jobs/stream-log`
Stream job execution logs.

#### POST `/api/usage-report`
Report resource usage.

## WebSocket Support (Future Enhancement)

For real-time updates, consider implementing WebSocket endpoints:

- `/ws/dashboard` - Real-time dashboard updates
- `/ws/jobs/{job_id}/logs` - Real-time log streaming
- `/ws/nodes` - Real-time node status updates

## Error Responses

All endpoints return appropriate HTTP status codes:

- `200` - Success
- `400` - Bad Request
- `404` - Not Found
- `422` - Unprocessable Entity
- `500` - Internal Server Error

Error response format:
```json
{
  "detail": "Error message description"
}
```

## CORS Configuration

CORS is enabled for all origins in development. Configure properly for production:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourfrontend.com"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)
```

## Rate Limiting (Recommended)

Implement rate limiting for production:

```bash
pip install slowapi
```

## Authentication (Future)

Add JWT authentication for production deployment:

```python
from fastapi.security import HTTPBearer
security = HTTPBearer()
```

## Example Frontend Integration

### React/Vue.js Example

```javascript
// Dashboard data
const dashboardData = await fetch('/api/frontend/dashboard').then(r => r.json());

// Create new job
const newJob = await fetch('/api/jobs/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    datasetName: 'My Dataset',
    datasetUrl: 'https://example.com/data'
  })
});

// Upload training script
const script = `
import torch
print("Hello from custom training script!")
`;

await fetch('/api/jobs/upload-script', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jobId: 'job-123',
    script: script,
    requirements: 'torch>=1.9.0'
  })
});

// Get job logs
const logs = await fetch('/api/frontend/logs/job-123').then(r => r.json());
```

## Testing the API

You can test the API using curl, Postman, or the built-in FastAPI documentation at:
- `http://localhost:8000/docs` (Swagger UI)
- `http://localhost:8000/redoc` (ReDoc)