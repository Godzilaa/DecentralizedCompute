#!/bin/bash

# Install dependencies
pip install -r requirements.txt

# Set environment variables for production
export SC_HOST="0.0.0.0"
export SC_PORT="8000"
export SC_DB="./data/shelbycompute.db"

# Create data directory
mkdir -p ./data

# Start the server
python main.py