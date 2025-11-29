# Aptos Move Contract Deployment Guide

## Prerequisites
1. Install Aptos CLI: https://aptos.dev/tools/aptos-cli/install-cli/
2. Make sure you have testnet APT in your wallet

## Steps to Deploy

### 1. Initialize Aptos CLI (if not done already)
```bash
aptos init --network testnet
```
This will:
- Create a `.aptos` folder with config
- Generate or import your private key
- Set the default network to testnet

### 2. Compile the Move module
```bash
cd move-contract
aptos move compile
```

### 3. Test the module (optional but recommended)
```bash
aptos move test
```

### 4. Deploy to testnet
```bash
aptos move publish --named-addresses apex_payments=0x612ab2c9a2d1e7e92867abf23c51f717887846b90a9981c05cee3db67c0ce5d4
```

**Important:** The address `0x612ab2c9a2d1e7e92867abf23c51f717887846b90a9981c05cee3db67c0ce5d4` must be YOUR wallet address that you initialized with `aptos init`.

### 5. Verify deployment
After successful deployment, verify the module exists:
```bash
curl "https://fullnode.testnet.aptoslabs.com/v1/accounts/0x612ab2c9a2d1e7e92867abf23c51f717887846b90a9981c05cee3db67c0ce5d4/modules"
```

## Alternative: Deploy with your wallet address

If you want to use a different address:

1. Get your wallet address from Petra
2. Update `Move.toml`:
   - Change the `apex_payments` address to YOUR address
3. Update `constants.ts` in the frontend with the same address
4. Run: `aptos move publish --named-addresses apex_payments=YOUR_ADDRESS`

## Troubleshooting

**Error: "Account does not exist"**
- Make sure the account has APT on testnet
- Get testnet APT from: https://aptoslabs.com/testnet-faucet

**Error: "Insufficient funds"**
- You need APT for gas fees
- Get more from the faucet

**Error: "Module already exists"**
- The module is already published at this address
- Use `aptos move upgrade` instead of `publish` to update it
