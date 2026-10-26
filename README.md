# FlashBook AI — Autonomous On-Chain DEX & AI Market Maker

> **Decentralized limit order book exchange with deterministic price-time priority, atomic on-chain settlement, and an autonomous Avellaneda-Stoikov AI market maker.**

[![Foundry](https://img.shields.io/badge/Foundry-v1.8.5-orange.svg)](https://getfoundry.sh/)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.24-363636.svg)](https://soliditylang.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF.svg)](https://vitejs.dev/)
[![Wagmi](https://img.shields.io/badge/Wagmi-2.14-1E88E5.svg)](https://wagmi.sh/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC.svg)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 1. Project Overview & Hackathon Demonstration

**FlashBook AI** is a non-custodial decentralized finance (DeFi) trading platform featuring:

1. **Non-Custodial Wallet Connectivity:** Native Wagmi & Viem integration supporting MetaMask, Coinbase Wallet, Brave, and injected Web3 wallets with automatic Sepolia and Local Anvil chain detection.
2. **On-Chain Limit Order Book:** Transparent on-chain order placement (`placeOrder`), deterministic price-time priority matching, and instant escrowed cancellation (`cancelOrder`).
3. **Atomic On-Chain Settlement:** Compatible orders match and settle atomically in a single transaction. Funds are transferred directly between maker and taker without intermediaries.
4. **Autonomous AI Market Maker:** Implements the **Avellaneda-Stoikov** optimal quoting model with realized volatility tracking, inventory skew compensation, circuit breakers, and an explainable decision dashboard.
5. **Real-Time Event Indexing:** Idempotent blockchain event listener indexing `OrderPlaced`, `OrderMatched`, and `OrderCancelled` into a lightweight, high-performance database.
6. **Built-In Testnet Faucet:** One-click demo asset faucet dispensing 1,000 `FakeUSDT` and 1.0 `FakeWETH` under controlled testing cooldowns.
7. **Professional Dark Terminal UI:** Sleek, high-contrast trading interface with visual depth ladders, Recharts interactive price & depth curves, and transaction status alerts.

---

## 2. System Architecture

```
                                  +----------------------------+
                                  |   Browser Trading UI       |
                                  |   (React + Vite + Wagmi)   |
                                  +--------------+-------------+
                                                 |
                         +-----------------------+-----------------------+
                         |                                               |
                         v                                               v
            +---------------------------+                   +---------------------------+
            |  Smart Contracts Layer    |                   |   Backend & AI MM Layer   |
            |  (Foundry / Solidity)     |                   |   (Node.js + TypeScript)  |
            +-------------+-------------+                   +-------------+-------------+
                          |                                               |
        +-----------------+-----------------+               +-------------+-------------+
        |                 |                 |               |             |             |
        v                 v                 v               v             v             v
+---------------+ +---------------+ +---------------+ +----------+ +-----------+ +-----------+
|  FakeWETH     | |   FakeUSDT    | | FlashBook     | | Viem     | | Express   | | Avellaneda|
|  (18 Decimals)| |   (6 Decimals)| | Exchange      | | Event    | | REST & WS | | Stoikov   |
|  ERC-20       | |   ERC-20      | | Order Book    | | Indexer  | | API       | | AI MM     |
+---------------+ +---------------+ +---------------+ +----------+ +-----------+ +-----------+
```

---

## 3. Mathematical Quoting Model (AI Market Maker)

The autonomous market maker computes optimal bid/ask quotes using the **Avellaneda-Stoikov** framework:

$$r(s, q) = s - q \cdot \gamma \cdot \sigma^2 \cdot s$$

Where:
- $s$: Mid-market reference price.
- $q$: Inventory skew ($q_{current} - q_{target}$).
- $\gamma$: Risk aversion parameter ($\gamma = 0.1$).
- $\sigma$: Realized volatility of recent trades.
- $r(s, q)$: Reservation price (indifference price).

### Dynamic Optimal Spreads & Inventory Balancing
- **Long Inventory ($q > 0$):** Reservation price shifts **down**, quoting tighter asks and wider bids to shed inventory.
- **Short Inventory ($q < 0$):** Reservation price shifts **up**, quoting tighter bids to accumulate inventory.
- **Circuit Breaker:** If rapid price swings exceed 500 bps (5%), the risk engine immediately halts quoting (`riskStatus: 'CIRCUIT_BREAKER'`).
- **Dry-Run Safety:** Default mode logs recommendations to the telemetry dashboard without broadcasting on-chain transactions.

---

## 4. Quickstart Guide (Local Development)

### Prerequisites
- Node.js >= 18 (`node -v`)
- Foundry (`forge`, `anvil`, `cast`) installed

### Step 1: Start Local Anvil Blockchain
In Terminal 1:
```bash
anvil --port 8545
```

### Step 2: Deploy Smart Contracts
In Terminal 2:
```bash
cd contracts
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
```
*Deterministic Local Addresses:*
- `FakeWETH`: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- `FakeUSDT`: `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`
- `FlashBookExchange`: `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0`

### Step 3: Start Backend API, Indexer & AI Market Maker
In Terminal 3:
```bash
cd backend
npm install
npm run dev
```
Backend runs on `http://localhost:3001`.

### Step 4: Start Frontend Trading Terminal
In Terminal 4:
```bash
cd frontend
npm install
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## 5. Verification & Test Evidence

### Smart Contract Test Suite (`forge test`)
All 12 automated Foundry tests passed, including fuzz testing:
```
Ran 12 tests for test/FlashBookExchange.t.sol:FlashBookExchangeTest
[PASS] testFuzz_PreservationOfFunds(uint256,uint256) (runs: 256, μ: 749856)
[PASS] test_CancelBuyOrder_FullRefund() (gas: 418566)
[PASS] test_CancelOrder_RevertsIfUnauthorized() (gas: 326126)
[PASS] test_ExactMatch_AtomicSettlement() (gas: 787551)
[PASS] test_FaucetMinting() (gas: 209737)
[PASS] test_FeeWithdrawal() (gas: 760420)
[PASS] test_PartialFill_OrderRemainsActive() (gas: 826561)
[PASS] test_Pausable_CircuitBreaker() (gas: 486596)
[PASS] test_PlaceBuyOrder_EscrowsQuoteToken() (gas: 350698)
[PASS] test_PlaceOrder_RevertsOnZeroPriceOrAmount() (gas: 71727)
[PASS] test_PlaceSellOrder_EscrowsBaseToken() (gas: 326337)
[PASS] test_PriceImprovement_BuyerRefund() (gas: 721046)
Suite result: ok. 12 passed; 0 failed; 0 skipped
```

### AI Market Maker Strategy Unit Tests (`npm test`)
```
--- Running AI Market Maker Strategy Unit Tests ---
✅ PASSED: Volatility 0.005 is within reasonable bounds
✅ PASSED: Neutral inventory should have NORMAL risk status
✅ PASSED: Bid price must be below mid price
✅ PASSED: Ask price must be above mid price
✅ PASSED: Quotes must never cross
✅ PASSED: Neutral inventory gives equal max order sizes
✅ PASSED: Long inventory lowers reservation price
✅ PASSED: Long inventory dampens bid size and favors asks
✅ PASSED: Short inventory raises reservation price
✅ PASSED: Short inventory dampens ask size and favors bids
✅ PASSED: Large price swing trips circuit breaker
✅ PASSED: Circuit breaker sets quote sizes to 0
✅ PASSED: Extreme inventory trips exposure limit
✅ PASSED: Over-accumulated inventory stops bidding
--- All Market Maker Tests Passed Successfully! ---
```

### Live On-Chain Settlement Verification
- **Scenario:** Alice placed Limit Sell (1 WETH @ 3,000 USDT), Bob placed Limit Buy (1 WETH @ 3,000 USDT).
- **Tx Hash:** `0x7bbcf42d4c1e31a14e611fbaa72eebcb894371e7728eb51bf209681fa10b1c88`
- **Result:** Bob received 1 WETH; Alice received 2,997 USDT (reflecting 3 USDT protocol fee). Contract safely collected fee with zero stuck funds.

---

## 6. Sepolia Deployment

To deploy on Ethereum Sepolia testnet:

1. Configure `.env` with your Sepolia RPC and funded private key:
   ```bash
   cp .env.example .env
   ```
2. Run the deployment script:
   ```bash
   cd contracts
   forge script script/DeploySepolia.s.sol:DeploySepolia \
     --rpc-url $SEPOLIA_RPC \
     --broadcast \
     --verify \
     -vvvv
   ```
3. Update `frontend/.env` with the deployed Sepolia addresses:
   ```env
   VITE_SEPOLIA_EXCHANGE=0x...
   VITE_SEPOLIA_WETH=0x...
   VITE_SEPOLIA_USDT=0x...
   ```

---

## 7. Security Invariants & Disclosures

- **Non-Custodial:** User funds remain locked in escrow only for active limit orders. Cancellations immediately return 100% of unfulfilled funds.
- **Pausable Emergency Controls:** The protocol owner can freeze order placement and matching in emergencies, while order cancellations and escrow returns remain functional.
- **Reentrancy Protection:** All external state-modifying functions enforce OpenZeppelin `ReentrancyGuard` and SafeERC20.
- **Testnet Demonstration:** FlashBook AI uses demonstration tokens (`FakeUSDT`, `FakeWETH`). It does not use real USDT or mainnet funds.

---

## 8. Documentation Index

- [`docs/PROJECT_AUDIT.md`](docs/PROJECT_AUDIT.md) — Comprehensive gap analysis & baseline status
- [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md) — 10-phase execution plan
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — System components & data flow
- [`docs/SECURITY_MODEL.md`](docs/SECURITY_MODEL.md) — Threat matrix & formal invariants
- [`docs/TEST_PLAN.md`](docs/TEST_PLAN.md) — Quality assurance coverage & verification matrix
