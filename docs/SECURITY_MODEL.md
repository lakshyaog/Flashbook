# FlashBook AI — Security Model & Threat Assessment

**Audience:** Security Auditors, Protocol Engineers, Hackathon Reviewers  
**Status:** Pre-Audit Engineering Specification

---

## 1. Trust Boundaries & Invariants

### 1.1 Non-Custodial Invariant
- The exchange smart contract **never** assumes arbitrary custody over user funds.
- Funds are pulled into escrow **only** when an order is placed (`placeOrder`) or a match occurs.
- If an order is cancelled or expires, all remaining unfulfilled escrowed tokens are immediately and atomically unlocked back to the maker.
- The protocol owner/admin has **no capability** to withdraw user escrow balances.

### 1.2 Mathematical & Decimal Invariants
- `Quote Token (FakeUSDT)` = 6 decimals.
- `Base Token (FakeWETH)` = 18 decimals.
- Price format: Scaled as units of Quote Token per 1 unit of Base Token (multiplied by `1e6`).
- Calculation of quote amount:
  $$\text{quoteAmount} = \frac{\text{baseAmount} \times \text{price}}{10^{18}}$$
- All integer division in smart contracts rounds in favor of the protocol/escrow safety, with zero floating-point arithmetic.
- Zero-token transfer checks protect against reversion in standard ERC-20 implementations.

---

## 2. Threat Vector Analysis & Mitigations

| Threat Vector | Severity | Attack Mechanism | Implemented Mitigation |
|---|---|---|---|
| **Reentrancy** | CRITICAL | Malicious ERC-20 token reenters exchange contract during transfer. | Uses OpenZeppelin `ReentrancyGuard` (`nonReentrant` on all external state-modifying functions) + strict Checks-Effects-Interactions (CEI). |
| **Frontrunning / MEV** | MEDIUM | Arbitrageur intercepts taker order to trade ahead of user. | Limit orders only execute at the specified limit price or better. Price-time priority queues order execution deterministically. |
| **Integer Overflow / Underflow** | HIGH | Arithmetic manipulation in price/amount formulas. | Solidity 0.8+ checked arithmetic + explicit boundary validation (`require(amount > 0 && price > 0)`). |
| **Fake Token Injection** | HIGH | Malicious actor attempts to list spoofed token contracts. | Only admin-whitelisted token pairs are registered in `FlashBookExchange`. |
| **Unauthorized Order Cancellation** | HIGH | Attacker attempts to cancel another user's order and steal funds. | Strict check: `require(order.maker == msg.sender, "Unauthorized");`. |
| **Market Maker Runaway Loss** | HIGH | Market crash or Oracle desync drains market-maker funds. | Avellaneda-Stoikov model with volatility scaling, max order caps, circuit breakers, inventory hard limits, and default dry-run mode. |
| **Private Key Leakage** | CRITICAL | Storing keys in frontend code, database, or logs. | Zero private keys stored in frontend or backend. Users sign via browser wallet. Backend AI MM operates with isolated environment variables. |
| **Denial of Service (Gas Limit)** | MEDIUM | Massive number of tiny orders congesting on-chain book traversal. | Fixed loop boundary per matching transaction (`maxMatchesPerTx = 10`), minimum order size thresholds (`minOrderSize`). |
| **Emergency Halt** | MEDIUM | Critical bug or flash-loan exploit detected. | `Pausable` mechanism allows owner to freeze order placement and matching while preserving order cancellation / withdrawals. |

---

## 3. Safe ERC-20 Handling

- All token interactions use OpenZeppelin's `SafeERC20` wrapper (`safeTransfer`, `safeTransferFrom`).
- Handles tokens that do not return a boolean (such as standard USDT on mainnet).
- Reverts on incomplete allowances or insufficient user balances prior to state changes.
