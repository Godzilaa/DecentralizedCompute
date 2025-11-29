# ShelbyCompute Provider Agent - Deployment Guide

## Local Development
```bash
# Run locally
python main.py

# Or with custom configuration
export SC_HOST=0.0.0.0
export SC_PORT=8000
python main.py
```

## Docker Deployment
```bash
# Build and run with Docker
docker build -t shelbycompute-backend .
docker run -p 8000:8000 -v $(pwd)/data:/app/data shelbycompute-backend

# Or use Docker Compose
docker-compose up -d
```

## Cloud Deployment Options

### 1. Railway
- Connect your GitHub repository
- Set environment variables in Railway dashboard
- Deploy automatically

### 2. Render
- Create new Web Service
- Connect repository
- Set build command: `pip install -r requirements.txt`
- Set start command: `python main.py`

### 3. Heroku
```bash
# Add Procfile with: web: python main.py
heroku create your-app-name
heroku config:set SC_HOST=0.0.0.0
heroku config:set SC_PORT=$PORT
git push heroku main
```

### 4. DigitalOcean App Platform
- Connect GitHub repository
- Set environment variables
- Auto-deploy on push

### 5. VPS/EC2
```bash
# On server
git clone your-repo
cd provider-agent
pip install -r requirements.txt
# Run with process manager
pm2 start main.py --name shelbycompute-backend
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SC_HOST` | Server host | `0.0.0.0` |
| `SC_PORT` | Server port | `8000` |
| `SC_DB` | Database path | `./shelbycompute.db` |
| `SHELBY_API_URL` | Shelby integration URL | Optional |
| `SHELBY_API_KEY` | Shelby API key | Optional |
| `APTOS_SENDER_ADDRESS` | Aptos wallet address | Optional |
| `APTOS_PRIVATE_KEY` | Aptos private key | Optional |

## Health Check
- Endpoint: `GET /api/debug/jobs`
- Use for load balancer health checks

## API Endpoints
- `POST /api/jobs/create` - Create new job
- `GET /api/jobs/poll` - Poll for jobs
- `POST /api/nodes/register` - Register compute node
- Full API docs available at `/docs` when running