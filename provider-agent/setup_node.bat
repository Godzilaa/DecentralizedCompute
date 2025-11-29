@echo off
title Aptos Compute Node Setup

echo.
echo =====================================
echo   Aptos Compute Node Quick Setup
echo =====================================
echo.

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed or not in PATH
    echo Please install Python 3.7+ and try again
    pause
    exit /b 1
)

REM Check if agent.py exists
if not exist "agent.py" (
    echo ❌ agent.py not found in current directory
    echo Please run this from the provider-agent folder
    pause
    exit /b 1
)

REM Run the interactive setup
python setup_node.py

pause