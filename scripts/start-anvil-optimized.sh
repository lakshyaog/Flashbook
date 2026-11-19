#!/bin/bash

# FlashBook AI - Start Anvil with Optimized Settings for MetaMask
# This script starts Anvil with settings that reduce MetaMask RPC rate limiting

echo "🔨 Starting Anvil with optimized settings for MetaMask..."
echo ""
echo "Configuration:"
echo "  - Port: 8545"
echo "  - Block time: 2 seconds (reduces polling frequency)"
echo "  - Gas limit: 30M (generous for complex transactions)"
echo "  - Chain ID: 31337"
echo ""
echo "This should resolve 'RPC endpoint returned too many errors' issues."
echo ""
echo "Press Ctrl+C to stop Anvil"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Ensure PATH includes Foundry
export PATH="$PATH:$HOME/.foundry/bin"

# Start Anvil with optimized parameters
anvil \
  --port 8545 \
  --block-time 2 \
  --gas-limit 30000000 \
  --accounts 10 \
  --balance 10000
