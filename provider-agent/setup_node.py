#!/usr/bin/env python3
"""
Interactive Node Setup Script
Prompts user for configuration and starts the compute node agent
"""

import os
import re
import subprocess
import sys
from typing import Optional

def print_banner():
    """Print welcome banner"""
    print("=" * 60)
    print("🚀 Aptos Decentralized Compute Node Setup")
    print("=" * 60)
    print()

def validate_aptos_address(address: str) -> bool:
    """Validate Aptos public key format"""
    if not address:
        return False
    
    # Remove whitespace
    address = address.strip()
    
    # Check if it starts with 0x and has correct length
    if not address.startswith('0x'):
        return False
    
    # Should be 66 characters total (0x + 64 hex chars)
    if len(address) != 66:
        return False
    
    # Check if remaining characters are valid hex
    hex_part = address[2:]
    return re.match(r'^[0-9a-fA-F]+$', hex_part) is not None

def get_aptos_public_key() -> Optional[str]:
    """Prompt user for Aptos public key with validation"""
    print("📱 Aptos Wallet Configuration")
    print("-" * 30)
    print("To receive earnings from compute jobs, please provide your Aptos wallet address.")
    print("This should be your PUBLIC address (starts with 0x).")
    print()
    print("💡 How to find your Aptos address:")
    print("   • Petra Wallet: Settings → Account → Copy Address")
    print("   • Martian Wallet: Click account name → Copy Address")
    print("   • Aptos CLI: Run 'aptos account list'")
    print()
    
    while True:
        address = input("Enter your Aptos public key (or press Enter to skip): ").strip()
        
        # Allow skipping
        if not address:
            print("⚠️  Skipping Aptos configuration - earnings will not be tracked")
            return None
        
        if validate_aptos_address(address):
            print(f"✅ Valid Aptos address: {address[:10]}...{address[-8:]}")
            return address
        else:
            print("❌ Invalid Aptos address format!")
            print("   Expected format: 0x followed by 64 hexadecimal characters")
            print("   Example: 0x742d35cc6e8ce2f719b7e4132a1f2ad6c4c3ff85b24b8c9e3b7f15c24e2b4e7f")
            print()

def get_backend_url() -> str:
    """Prompt user for backend URL"""
    print("\n🌐 Backend Configuration")
    print("-" * 25)
    default_url = "http://127.0.0.1:8000"
    url = input(f"Backend URL (default: {default_url}): ").strip()
    return url if url else default_url

def get_polling_settings() -> tuple[int, int]:
    """Get polling and heartbeat intervals"""
    print("\n⚙️  Node Settings")
    print("-" * 16)
    
    try:
        poll_interval = input("Job polling interval in seconds (default: 5): ").strip()
        poll_interval = int(poll_interval) if poll_interval else 5
    except ValueError:
        poll_interval = 5
    
    try:
        heartbeat_interval = input("Heartbeat interval in seconds (default: 10): ").strip()
        heartbeat_interval = int(heartbeat_interval) if heartbeat_interval else 10
    except ValueError:
        heartbeat_interval = 10
    
    return poll_interval, heartbeat_interval

def confirm_settings(aptos_key: Optional[str], backend_url: str, poll_interval: int, heartbeat_interval: int) -> bool:
    """Show configuration summary and confirm"""
    print("\n📋 Configuration Summary")
    print("-" * 24)
    print(f"Aptos Public Key: {aptos_key[:10] + '...' + aptos_key[-8:] if aptos_key else 'Not configured'}")
    print(f"Backend URL: {backend_url}")
    print(f"Poll Interval: {poll_interval} seconds")
    print(f"Heartbeat Interval: {heartbeat_interval} seconds")
    print()
    
    while True:
        confirm = input("Start the node with these settings? (y/n): ").strip().lower()
        if confirm in ['y', 'yes']:
            return True
        elif confirm in ['n', 'no']:
            return False
        else:
            print("Please enter 'y' or 'n'")

def start_agent(aptos_key: Optional[str], backend_url: str, poll_interval: int, heartbeat_interval: int):
    """Start the agent with configured environment variables"""
    print("\n🚀 Starting Compute Node Agent...")
    print("-" * 32)
    
    # Set environment variables
    env = os.environ.copy()
    if aptos_key:
        env['APTOS_PUBLIC_KEY'] = aptos_key
    env['BACKEND_URL'] = backend_url
    env['POLL_INTERVAL'] = str(poll_interval)
    env['HEARTBEAT_INTERVAL'] = str(heartbeat_interval)
    
    try:
        # Start the agent
        subprocess.run([sys.executable, 'agent.py'], env=env, check=True)
    except KeyboardInterrupt:
        print("\n\n🛑 Node agent stopped by user")
    except subprocess.CalledProcessError as e:
        print(f"\n❌ Error starting agent: {e}")
        print("Please check the agent.py file and try again.")
    except FileNotFoundError:
        print("\n❌ agent.py not found in current directory")
        print("Please make sure you're running this from the provider-agent folder.")

def main():
    """Main setup flow"""
    print_banner()
    
    try:
        # Get user configuration
        aptos_key = get_aptos_public_key()
        backend_url = get_backend_url()
        poll_interval, heartbeat_interval = get_polling_settings()
        
        # Confirm settings
        if not confirm_settings(aptos_key, backend_url, poll_interval, heartbeat_interval):
            print("Setup cancelled by user.")
            return
        
        # Start the agent
        start_agent(aptos_key, backend_url, poll_interval, heartbeat_interval)
        
    except KeyboardInterrupt:
        print("\n\n🛑 Setup cancelled by user")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")

if __name__ == "__main__":
    main()