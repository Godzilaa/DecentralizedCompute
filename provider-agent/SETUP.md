# Node Setup Instructions

## Quick Interactive Setup (Recommended)

The easiest way to set up your compute node is using our interactive setup script:

### Windows:
```powershell
# Double-click setup_node.bat or run in PowerShell:
.\setup_node.bat
```

### Linux/Mac:
```bash
# Make executable and run:
chmod +x setup_node.sh
./setup_node.sh
```

### Or use Python directly:
```bash
python setup_node.py
```

The interactive setup will:
- ✅ Guide you through wallet configuration
- ✅ Validate your Aptos public key format  
- ✅ Configure backend settings
- ✅ Set polling intervals
- ✅ Start your node automatically

---

## Manual Setup (Advanced Users)

To run a compute node manually and receive earnings to your Aptos wallet, follow these steps:

### 1. Set Your Aptos Public Key

Before starting the node, set your Aptos wallet public key as an environment variable:

#### Windows (PowerShell):
```powershell
$env:APTOS_PUBLIC_KEY="0x1234567890abcdef1234567890abcdef12345678"
python agent.py
```

#### Windows (Command Prompt):
```cmd
set APTOS_PUBLIC_KEY=0x1234567890abcdef1234567890abcdef12345678
python agent.py
```

#### Linux/Mac:
```bash
export APTOS_PUBLIC_KEY="0x1234567890abcdef1234567890abcdef12345678"
python agent.py
```

### 2. Get Your Aptos Public Key

You can get your Aptos public key from:
- **Petra Wallet**: Go to Settings → Account → Copy Address
- **Martian Wallet**: Click on account name → Copy Address  
- **Aptos CLI**: Run `aptos account list`

### 3. What Happens When You Register

When you start the agent with an Aptos public key:

1. ✅ **Node Registration**: Your node registers with the backend
2. 💰 **Earnings Tracking**: Jobs completed on your node are linked to your wallet
3. 🏆 **Payment Processing**: Earnings are calculated and recorded for your address
4. 📊 **Dashboard Access**: View your earnings at `/earnings` page in the frontend

### 4. Example Startup Messages

**With Aptos Key Configured:**
```
Aptos Compute Node Agent initializing...
Node ID generated: f566effa-2601-4bfc-8a26-f811fee17df4
Handshake Key secured 🔑
Aptos Wallet: 0x123456...abcdef
System Specs: {'cpuUsage': 15.2, 'ramUsage': 45.8, ...}
Registering node with Aptos wallet: 0x123456...abcdef
Node Registered ✅
```

**Without Aptos Key:**
```
Aptos Compute Node Agent initializing...
Node ID generated: f566effa-2601-4bfc-8a26-f811fee17df4
Handshake Key secured 🔑
⚠️  No Aptos public key configured - earnings will not be tracked
System Specs: {'cpuUsage': 15.2, 'ramUsage': 45.8, ...}
Node Registered ✅
```

### 5. Viewing Your Earnings

1. Go to the compute platform frontend
2. Navigate to the "Earnings" tab
3. Enter your Aptos public key
4. View your earnings dashboard with:
   - Total earnings
   - Payment history
   - Node performance metrics
   - Transaction details

### 6. Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `APTOS_PUBLIC_KEY` | Your Aptos wallet address | No | None |
| `BACKEND_URL` | Backend server URL | No | `http://127.0.0.1:8000` |
| `POLL_INTERVAL` | Job polling interval (seconds) | No | `5` |
| `HEARTBEAT_INTERVAL` | Heartbeat interval (seconds) | No | `10` |

### 7. Security Notes

- ⚠️ **Only provide your PUBLIC key** - Never share your private key
- 🔒 **Public keys are safe to share** - They're used only for payment routing
- 💡 **Multiple nodes, same wallet** - You can run multiple nodes with the same Aptos address
- 🛡️ **No signing required** - The node doesn't perform any wallet transactions

### 8. Troubleshooting

**Issue**: Node registers but earnings not tracked
**Solution**: Make sure you set the `APTOS_PUBLIC_KEY` environment variable before starting the agent

**Issue**: Invalid Aptos public key format
**Solution**: Ensure your public key starts with `0x` and is 66 characters long (64 hex chars + 0x prefix)

**Issue**: Can't see earnings in dashboard  
**Solution**: Use the exact same public key in both the agent and the earnings dashboard

**Issue**: Interactive setup not working
**Solution**: Make sure you have Python 3.7+ installed and you're in the provider-agent directory