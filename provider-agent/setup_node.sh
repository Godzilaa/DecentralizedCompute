#!/bin/bash

echo ""
echo "====================================="
echo "  Aptos Compute Node Quick Setup"
echo "====================================="
echo ""

# Check if Python is available
if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
    echo "❌ Python is not installed or not in PATH"
    echo "Please install Python 3.7+ and try again"
    exit 1
fi

# Check if agent.py exists
if [ ! -f "agent.py" ]; then
    echo "❌ agent.py not found in current directory"
    echo "Please run this from the provider-agent folder"
    exit 1
fi

# Determine Python command
PYTHON_CMD="python3"
if ! command -v python3 &> /dev/null; then
    PYTHON_CMD="python"
fi

# Run the interactive setup
$PYTHON_CMD setup_node.py