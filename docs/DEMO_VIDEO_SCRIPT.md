# FlashBook AI — Demo Video Script

**Target length:** ~3:30 · **Format:** screen recording + voiceover · **Audience:** hackathon judges

---

## Setup (do this before recording)

### 1. Start a clean stack

Four terminals, from the repo root:

```bash
# Terminal 1 — local chain
~/.foundry/bin/anvil --port 8545

# Terminal 2 — deploy contracts (once per fresh anvil)
cd contracts && ~/.foundry/bin/forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast

# Terminal 3 — backend (indexer + API + AI market maker)
cd backend && npm run dev

# Terminal 4 — frontend
cd frontend && npm run dev
```

> **Restarting anvil?** A new chain means the backend's saved state is stale. Stop the backend, move `backend/data/flashbook_db.json` aside, redeploy, then start the backend again.

### 2. Seed demo liquidity (one command, ~3 minutes)

```bash
./scripts/seed-demo.sh
```

This creates two test traders — **Alice** sells, **Bob** buys — makes 9 real on-chain trades spaced 20 seconds apart (so the 1-minute chart has shape), then leaves 4 bids and 4 asks resting in the book.

### 3. Connect your wallet

In MetaMask, add network **Local Anvil** (`http://127.0.0.1:8545`, chain ID `31337`) and import a fresh Anvil test account (e.g. account #4: `0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a`). Use the **Faucet** to claim FWETH and FUSDT.

### 4. Warm up the AI

Go to the **AI Market Maker** page and click **Recalculate quote** 5–6 times so its charts and decision log have history.

### 5. Browser

Zoom 90–100%, hide the bookmarks bar, close other tabs. Start on the **Dashboard**, chart on **1m**.

---

## 0:00 – 0:20 · Hook

**On screen:** Dashboard, full view. Slow cursor sweep across the KPI row.

> "Most DEXs today are AMMs — you trade against a curve, not against other people, and you pay for it in slippage. Order books fix that, but they usually run off-chain on a centralized server.
>
> This is **FlashBook AI**: a fully on-chain limit order book exchange, with an AI market maker that explains every quote it makes."

---

## 0:20 – 0:55 · The dashboard at a glance

**On screen:** Hover each KPI tile left to right.

> "Everything on this screen comes from the chain — nothing is mocked.
>
> Up top: the last traded price with its trend, the 24-hour range, volume, the bid-ask spread, and the AI market maker's status."

**On screen:** Point at the order book, then the chart. Click **1m → 5m → 1m** on the timeframe selector.

> "On the left, the live order book — sells in red, buys in green, with depth bars for liquidity at each level. In the middle, the price chart, built from real settled trades, at whatever timeframe you need."

**On screen:** Click the **Market Depth** tab, then back to **Price**.

> "And the depth view shows cumulative buy and sell liquidity on either side of the mid price."

---

## 0:55 – 1:45 · Live trade: on-chain matching and settlement

**On screen:** Click the best ask (**3018**) in the order book — the price auto-fills in the order form.

> "Let's trade. I click a sell order in the book, and it fills the price for me."

**On screen:** Set amount to `0.3`. Point at order value and fee. Click **Approve** if it appears.

> "The form shows the order value and the 0.1% protocol fee. The first time, I approve the token once so the exchange can escrow my funds — it's non-custodial; funds are only locked while an order is open."

**On screen:** Click **Place Limit Buy**, confirm in MetaMask. Show the toast, the new row in Recent Trades, the 3018 level shrinking in the book, and the price tile updating.

> "I submit, and the smart contract matches it against Alice's resting order using **price-time priority** — best price first, then first-come-first-served.
>
> Settlement is **atomic**: in one transaction, I receive FWETH and Alice receives USDT minus the fee. No intermediary, no partial state.
>
> And there it is — the trade in Recent Trades, the book updated, the last price moved."

**On screen:** Click the tx link in Recent Trades (optional).

> "Every fill links straight to its transaction."

---

## 1:45 – 2:05 · Cancel = instant refund

**On screen:** Place a resting buy well below the book (e.g. `2950`, `0.2`). Then in **Open Orders**, click **Cancel** and confirm.

> "Resting orders lock funds in escrow. Cancelling is one click, and the escrow comes straight back to my wallet. Cancellation even works while the exchange is paused in an emergency — so funds can never get stuck."

---

## 2:05 – 2:55 · The AI market maker

**On screen:** Sidebar → **AI Market Maker**. Point at the control bar and KPIs.

> "Thin order books are the classic problem for on-chain exchanges. FlashBook's answer is an AI market maker based on the **Avellaneda-Stoikov** model — the framework professional market-making desks use."

**On screen:** Point at Reference mid vs Reservation price, then Inventory.

> "It reads the live mid price, then computes a **reservation price** — what it's actually willing to trade at given its inventory. Holding too much ETH? It shifts quotes down to sell. Too little? It shifts up to buy."

**On screen:** Hover the **Quote history** chart so the tooltip shows all four lines.

> "Here's that over time: the mid, the reservation price, and the bid and ask it places around it. When volatility rises, the spread widens automatically."

**On screen:** Point at the risk badge and Strategy parameters, scroll to the **Decision log**, click **Recalculate quote** once.

> "Safety is built in: a **circuit breaker** stops quoting if price moves more than 5%, and exposure limits cap inventory. It's running in **dry-run** mode here — every quote is computed and logged with its reasoning, so you can audit exactly why it did what it did before any capital is at risk."

---

## 2:55 – 3:15 · Markets and history

**On screen:** Sidebar → **Markets**. Point at the buy/sell pressure bar.

> "The Markets page shows the full picture for a pair — price, liquidity on each side, and buy versus sell pressure."

**On screen:** Sidebar → **History**. Toggle My orders / Market trades, click the **Filled** filter, hover **Export CSV**.

> "History is the audit trail: every order with its fill progress, every market trade with buyer, seller and fee — exportable to CSV."

---

## 3:15 – 3:40 · Under the hood, what's next, close

**On screen:** Back to Dashboard. Optionally cut to a terminal running `forge test` (all green).

> "Under the hood: Solidity contracts built with Foundry — reentrancy guards, safe token transfers, emergency pause — backed by 12 tests including fuzz tests proving funds are always preserved. A TypeScript backend indexes every on-chain event and runs the AI. The frontend is React with Wagmi, so any Web3 wallet works.
>
> Next on our roadmap: more trading pairs, user-tunable strategy settings, and switching the market maker from dry-run to live on-chain quoting.
>
> FlashBook AI: a real order book, fully on-chain, with an AI you can actually explain. Thanks for watching."

---

## Recording tips

- **Record section by section** — redoing 30 seconds beats redoing 3 minutes.
- **Trim wallet popups** in editing; keep talking over slow confirmations ("settlement is happening on-chain right now…").
- The 1m chart shows the **last 30 minutes** — record within half an hour of seeding, or re-run the seed on a fresh chain.
- Say **"testnet tokens, no real funds"** once; the faucet modal says it too.
- Over time? Cut in this order: Markets/History → Cancel → Depth tab.
