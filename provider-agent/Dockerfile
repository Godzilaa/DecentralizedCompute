FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create data directory
RUN mkdir -p ./data

# Expose port
EXPOSE 8000

# Environment variables
ENV SC_HOST=0.0.0.0
ENV SC_PORT=8000
ENV SC_DB=./data/shelbycompute.db

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/debug/jobs || exit 1

# Start the application
CMD ["python", "main.py"]