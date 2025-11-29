@echo off

REM Install dependencies
pip install -r requirements.txt

REM Set environment variables for production
set SC_HOST=0.0.0.0
set SC_PORT=8000
set SC_DB=./data/shelbycompute.db

REM Create data directory
if not exist "data" mkdir data

REM Start the server
python main.py