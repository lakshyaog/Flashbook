#!/usr/bin/env bash
# Seeds a fresh local Anvil chain with demo liquidity so the dashboard isn't empty on camera.
#   Alice (Anvil #2) rests sell orders, Bob (Anvil #3) rests buy orders,
#   then a few matching orders create real trades, a price and candles.
# Usage: ./scripts/seed-demo.sh            (requires anvil running + contracts deployed)
#        SPACING=5 ./scripts/seed-demo.sh  (faster, flatter chart)
set -euo pipefail

CAST="${CAST:-$HOME/.foundry/bin/cast}"
RPC="${RPC_URL:-http://127.0.0.1:8545}"

WETH=0x5FbDB2315678afecb367f032d93F642f64180aa3
USDT=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
EXCHANGE=0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0

# Public Anvil test keys — never use on a real network
ALICE_KEY=0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a
ALICE=0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
BOB_KEY=0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6
BOB=0x90F79bf6EB2c4f870365E785982E1f101E93b906

MAX=0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff
BUY=0
SELL=1

send() { "$CAST" send --rpc-url "$RPC" --private-key "$1" "${@:2}" >/dev/null; }

# price in USDT (6 decimals), amount in WETH (18 decimals)
order() { # key side price amount
  send "$1" "$EXCHANGE" "placeOrder(uint8,uint256,uint256)" "$2" \
    "$("$CAST" parse-units "$3" 6)" \
    "$("$CAST" parse-units "$4" 18)"
}

echo "→ Funding Alice and Bob"
send "$ALICE_KEY" "$WETH" "mint(address,uint256)" "$ALICE" "$("$CAST" parse-units 50 18)"
send "$ALICE_KEY" "$USDT" "mint(address,uint256)" "$ALICE" "$("$CAST" parse-units 100000 6)"
send "$BOB_KEY"   "$WETH" "mint(address,uint256)" "$BOB"   "$("$CAST" parse-units 50 18)"
send "$BOB_KEY"   "$USDT" "mint(address,uint256)" "$BOB"   "$("$CAST" parse-units 100000 6)"

echo "→ Approving the exchange"
for k in "$ALICE_KEY" "$BOB_KEY"; do
  send "$k" "$WETH" "approve(address,uint256)" "$EXCHANGE" "$MAX"
  send "$k" "$USDT" "approve(address,uint256)" "$EXCHANGE" "$MAX"
done

SPACING="${SPACING:-20}" # seconds between trades; trades take real block time, so spacing shapes the 1m chart
PRICES=(2985 2992 2988 3001 2996 3004 2999 3008 3010)
echo "→ Creating trade history (${#PRICES[@]} trades, ${SPACING}s apart — about $(( ${#PRICES[@]} * SPACING / 60 )) min)"
for p in "${PRICES[@]}"; do
  order "$ALICE_KEY" $SELL "$p" 0.4
  order "$BOB_KEY"   $BUY  "$p" 0.4
  echo "   trade @ $p"
  sleep "$SPACING"
done

echo "→ Resting liquidity"
for p in 3018 3025 3036 3050; do order "$ALICE_KEY" $SELL "$p" 0.6; done
for p in 3002 2994 2980 2965; do order "$BOB_KEY"   $BUY  "$p" 0.6; done

echo "✓ Done. Alice ($ALICE) has asks from 3018, Bob ($BOB) has bids from 3002."
echo "  Wait ~5s for the indexer, then refresh the dashboard."
