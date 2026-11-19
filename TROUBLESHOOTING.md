# FlashBook AI — Troubleshooting Guide

## MetaMask RPC Error: "Too many errors, retrying in 0.5 minutes"

### Problem
When using MetaMask with a local Anvil node (Chain ID: 31337), you may encounter:
```
MetaMask - RPC Error: RPC 0x7a69 Custom eth_getBlockByNumber: 
RPC endpoint returned too many errors, retrying in 0.5 minutes.
```

### Root Cause
MetaMask aggressively polls the RPC endpoint for block updates, transaction receipts, and balance changes. Local Anvil nodes can become overwhelmed by this high request volume, especially when:
- Multiple tabs are open
- The frontend polls frequently (every 2-3 seconds)
- MetaMask is monitoring multiple accounts
- Transaction history is being synced

### Solutions

#### Solution 1: Restart Anvil with More Generous Limits (Recommended)
Stop your current Anvil instance and restart with adjusted parameters:

```bash
# Stop existing Anvil (Ctrl+C)

# Start Anvil with optimized settings
anvil --port 8545 --block-time 2 --gas-limit 30000000
```

The `--block-time 2` option produces blocks every 2 seconds instead of instant mining, which reduces polling frequency.

#### Solution 2: Clear MetaMask's Rate Limiting Cache
1. Open MetaMask
2. Click on your account icon (top right)
3. Go to **Settings** → **Advanced**
4. Click **"Clear activity tab data"**
5. Click **"Reset account"** (this only clears transaction history, not your keys)
6. Refresh your browser

#### Solution 3: Reduce Frontend Polling (Already Applied)
The codebase has been updated with:
- Wagmi polling interval increased to 4 seconds
- React Query refetch intervals set to 6 seconds
- Request batching enabled
- Disabled refetch on window focus

#### Solution 4: Use a Single Browser Tab
- Close all other tabs with localhost:5173
- Close any other dApps connected to the local Anvil node
- Disconnect and reconnect MetaMask to the site

#### Solution 5: Temporarily Switch Networks
If the error persists:
1. In MetaMask, switch to Sepolia or Ethereum Mainnet
2. Wait 30 seconds for the rate limit to reset
3. Switch back to Localhost 8545

#### Solution 6: Add Custom Network with Different Chain ID
If rate limiting persists, you can create a fresh Anvil instance:

```bash
# Start Anvil on a different port with a different chain ID
anvil --port 8546 --chain-id 1337
```

Then add a new network in MetaMask:
- **Network Name**: Anvil Dev 2
- **RPC URL**: http://127.0.0.1:8546
- **Chain ID**: 1337
- **Currency Symbol**: ETH

You'll need to redeploy contracts to this new chain.

---

## Backend API Connection Issues

### Problem: "Backend offline" warning in UI

**Symptoms:**
- Red banner appears at top: "Backend offline"
- Order book, trades, and market data show zeros or dashes

**Solution:**
```bash
# Terminal 1: Ensure Anvil is running
anvil --port 8545

# Terminal 2: Start backend
cd backend
npm install  # if first time
npm run dev  # should show "running on port 3001"

# Terminal 3: Start frontend
cd frontend
npm install  # if first time
npm run dev
```

Check backend health:
```bash
curl http://localhost:3001/api/health
```

---

## Contract Deployment Issues

### Problem: Contracts not found at expected addresses

**Solution: Redeploy contracts**
```bash
cd contracts
forge clean
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
```

The deterministic addresses should be:
- FakeWETH: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- FakeUSDT: `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`
- Exchange: `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0`

If addresses differ, update `.env` files in both `backend/` and `frontend/`.

---

## Transaction Failures

### Problem: "Insufficient funds" or "Gas estimation failed"

**Solution: Claim test tokens from faucet**
1. In the FlashBook AI UI, click **"Faucet"** in the sidebar
2. Click **"Claim Tokens"**
3. Approve the MetaMask transaction
4. Wait for confirmation

Or use cast CLI:
```bash
# Get some ETH for gas (Anvil accounts start with 10000 ETH)
# Claim FakeWETH
cast send 0x5FbDB2315678afecb367f032d93F642f64180aa3 "faucet()" --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Claim FakeUSDT
cast send 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 "faucet()" --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

---

## Performance Optimization Tips

### For Best Local Development Experience:

1. **Use a single browser window** with DevTools closed
2. **Restart Anvil periodically** (every few hours) to clear accumulated state
3. **Use the latest MetaMask version** (older versions have worse rate limiting)
4. **Disable MetaMask on other sites** while developing
5. **Use incognito/private mode** for a clean MetaMask state

### Recommended Development Setup:
```bash
# Terminal 1: Anvil with 2-second blocks
anvil --port 8545 --block-time 2

# Terminal 2: Backend with reduced logging
cd backend && npm run dev

# Terminal 3: Frontend
cd frontend && npm run dev

# Open ONE browser tab at http://localhost:5173
```

---

## Still Having Issues?

### Check System Status:
```bash
# Verify Anvil is running
curl -X POST http://127.0.0.1:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Verify backend is running
curl http://localhost:3001/api/health

# Check for port conflicts
lsof -i :8545  # Anvil
lsof -i :3001  # Backend
lsof -i :5173  # Frontend
```

### Reset Everything:
```bash
# Kill all processes
pkill -f anvil
pkill -f "npm run dev"

# Clean slate
cd contracts && forge clean
cd backend && rm -rf data/*.json
cd frontend && rm -rf dist node_modules/.vite

# Restart services in order
anvil --port 8545 --block-time 2
# (in new terminal) cd backend && npm run dev
# (in new terminal) cd frontend && npm run dev
```

### Contact & Support
If issues persist, check:
- Node.js version: `node -v` (should be 18+)
- Foundry version: `forge --version`
- MetaMask version: Check in extension settings
- Console errors: Open browser DevTools → Console tab
