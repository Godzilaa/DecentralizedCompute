# ShelbyCompute Backend - PostgreSQL with Prisma Setup

## Prerequisites

1. **NeonDB Account**: Create a free PostgreSQL database at [neon.tech](https://neon.tech)
2. **Python 3.8+**: Ensure Python is installed
3. **Node.js**: Required for Prisma CLI (optional, can use Python client directly)

## Setup Instructions

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Environment Configuration

1. Copy the example environment file:
   ```bash
   copy .env.example .env
   ```

2. Update `.env` with your NeonDB connection string:
   ```
   DATABASE_URL="postgresql://username:password@ep-your-endpoint.region.aws.neon.tech/neondb?sslmode=require"
   ```

### 3. Database Setup

1. Generate Prisma client:
   ```bash
   python -c "from prisma import Prisma; Prisma().generate()"
   ```

2. Push the schema to your database:
   ```bash
   python -c "from prisma import Prisma; import asyncio; asyncio.run(Prisma().connect()); asyncio.run(Prisma().db.push())"
   ```

   Note: The Python Prisma client will automatically create tables when you first connect.

### 4. Run the Application

```bash
python main.py
```

Or with uvicorn directly:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Key Changes from SQLite Version

- **Database**: Migrated from SQLite to PostgreSQL with NeonDB
- **ORM**: Replaced raw SQL with Prisma ORM
- **Async**: All database operations are now async
- **Schema**: Proper relational schema with foreign keys
- **Types**: Better type safety with Prisma models

## API Endpoints

All endpoints remain the same:

- `POST /api/nodes/register` - Register a compute node
- `POST /api/nodes/heartbeat` - Send node heartbeat
- `POST /api/jobs/create` - Create a new job
- `GET /api/jobs/poll` - Poll for available jobs
- `POST /api/jobs/ack` - Acknowledge job assignment
- `POST /api/jobs/finish` - Mark job as finished
- `POST /api/jobs/stream-log` - Stream job logs
- `POST /api/usage-report` - Report usage metrics
- `GET /api/debug/jobs` - List all jobs (debug)
- `GET /api/debug/logs` - Dump logs (debug)

## Database Schema

The Prisma schema defines four main tables:
- `nodes` - Compute node information
- `jobs` - Job definitions and status
- `provenance` - Job execution records
- `logs` - Job logs and usage metrics

## Troubleshooting

1. **Database Connection Issues**: Verify your DATABASE_URL is correct
2. **Schema Sync**: Run `prisma db push` if models are out of sync
3. **Dependencies**: Ensure all Python packages are installed correctly

## Development

For development with auto-reload:
```bash
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```