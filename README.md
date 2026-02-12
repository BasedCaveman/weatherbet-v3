# WeatherBet Smart Contracts

## Overview

Dynamic Parimutuel Pool for weather prediction markets. No AMM, no order book, no LP needed. Users bet into shared pools, winners split the losing side. Instant fills, live odds, built-in revenue model.

## Core Invariants

These properties MUST always hold:

1. **Pool Conservation**: `yesPool + noPool = total USDm held for that market`
2. **Payout Exactness**: Winners receive `(userBet / winningPool) × totalPool - fee`
3. **Fee Integrity**: Fee = 0.5% on **profit only** (losers pay nothing extra)
4. **Fee Distribution**: 60% platform + 30% climate fund + 10% creator = 100%
5. **Resolution Finality**: Markets can only be resolved once, after `endTime`
6. **Refund Guarantee**: Cancelled markets return 100% of all bets
7. **Bet Finality**: Bets cannot be withdrawn before resolution (committed to pool)
8. **Odds Accuracy**: Displayed odds always equal `sidePool / totalPool`

## Contracts

### WeatherBetPool.sol (~280 lines)

Core contract handling all betting logic.

**Key Functions:**
- `bet(marketId, isYes, amount)` — Bet YES or NO, instant fill into pool
- `claim(marketId)` — Winners claim payout after resolution
- `claimRefund(marketId)` — Full refund on cancelled markets
- `claimCreatorEarnings(marketId)` — Market creator claims 10% fee share
- `getOdds(marketId)` — Live odds from pool ratio
- `calculatePayout(marketId, isYes, amount)` — Preview potential return
- `getUserBet(marketId, user)` — User's position in a market
- `getMarket(marketId)` — Full market data including lat/lon

**State Variables:**
- `markets` — All market data (pools, times, resolution, creator)
- `userBets` — User bets per market (YES amount, NO amount, claimed)
- `platformBalance` — Accumulated platform fees (60%)
- `climateFundBalance` — Accumulated climate impact fees (30%)

### MockUSDm.sol (~60 lines)

Mock USDm token for testing (6 decimals like real USDm). Includes faucet function with configurable amount and cooldown.

### WeatherBetOracle.sol (~55 lines)

Oracle for creating and resolving markets. In production, replace with Chainlink Data Streams or API3 weather feeds.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    WeatherBetPool                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Betting                                                │
│  └── bet(marketId, isYes, amount)                      │
│      → Transfers USDm from user                        │
│      → Adds to YES or NO pool                          │
│      → Odds update instantly                           │
│                                                         │
│  Claims                                                 │
│  ├── claim(marketId)           → Winners get payout    │
│  ├── claimRefund(marketId)     → Cancelled = refund    │
│  └── claimCreatorEarnings(id)  → Creator gets 10%     │
│                                                         │
│  Market Lifecycle                                       │
│  ├── createMarket(city, lat, lon, type, avg, days)    │
│  ├── resolveMarket(marketId, actualValue)             │
│  └── cancelMarket(marketId)                            │
│                                                         │
│  View Functions                                         │
│  ├── getOdds(marketId)         → Live % + multipliers  │
│  ├── calculatePayout(id,side,amt) → Preview return     │
│  ├── getUserBet(id, user)      → User's position       │
│  ├── getMarket(id)             → Full market data      │
│  └── getBettorCount(id)        → Unique bettors        │
│                                                         │
│  Revenue (0.5% on winnings profit)                      │
│  ├── 60% → platformBalance     (project sustainability)│
│  ├── 30% → climateFundBalance  (impact initiatives)    │
│  └── 10% → creatorEarnings     (market creator reward) │
│                                                         │
└─────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
    ┌─────────┐        ┌──────────┐        ┌──────────┐
    │  USDm   │        │  Oracle  │        │ Climate  │
    │ (ERC20) │        │ (create/ │        │  Fund    │
    │         │        │  resolve)│        │ (30%)    │
    └─────────┘        └──────────┘        └──────────┘
```

## How Parimutuel Betting Works

### Placing Bets

Users bet USDm into YES or NO pools. Every bet fills instantly — no counterparty needed.

```
Market: "São Paulo rain > 150mm?"

YES pool: $700  (7 bettors)
NO pool:  $300  (3 bettors)
Total:    $1000

Live odds: YES 70% / NO 30%
YES pays: 1.43x ($1000/$700)
NO pays:  3.33x ($1000/$300)
```

### Odds Update With Every Bet

```
Alice bets $100 on NO:

YES pool: $700   →  YES 63.6%  →  pays 1.57x
NO pool:  $400   →  NO  36.4%  →  pays 2.75x
Total:    $1100
```

### Resolution & Payout

```
Actual rainfall: 180mm (exceeds 150mm) → YES wins

Bob had bet $100 on YES (out of $700 total YES)
Bob's share: $100 / $700 = 14.29%
Bob's gross payout: 14.29% × $1100 = $157.14
Bob's profit: $57.14
Fee (0.5% of profit): $0.29
Bob receives: $156.85

Fee breakdown:
  $0.17 → platform (60%)
  $0.09 → climate fund (30%)
  $0.03 → market creator (10%)
```

### Key Properties

- **Losers lose their bet.** Nothing more — no extra fees.
- **Winners split the total pool** proportional to their bet size.
- **Earlier bets get better odds** (pool is smaller when they enter).
- **Odds are always accurate** — they're just the pool ratio.

## Revenue Model

```
Revenue sources:
├── 0.5% fee on winner profits
│   ├── 60% → Platform treasury
│   ├── 30% → Climate impact fund (agricultural communities)
│   └── 10% → Market creator reward
│
└── (Future) Yield on pooled funds during betting period
    └── Same 60/30/10 split
```

**No token needed.** Revenue comes from usage fees, not token speculation.

**Climate impact is protocol-level**, not optional. 30% of all revenue automatically flows to a designated climate fund address. Anyone can trigger the withdrawal to that address.

## Gas Optimization

- Single `bet()` function (no approve→deposit→order dance)
- User only needs one USDm approval ever (`approve(pool, MaxUint256)`)
- Minimal storage writes per bet (2 sstore: pool total + user bet)
- No matching engine, no order book iteration
- View functions for all read operations (no state changes)

## Security

### Access Control
- Only oracle/owner can resolve markets
- Only oracle/owner can create markets
- Only owner can cancel markets (full refunds)
- Anyone can trigger climate fund withdrawal (to pre-set address only)
- Creator can only claim their own earnings

### Fund Safety
- All USDm transferred in on `bet()`, held by contract
- Payouts calculated deterministically from pool ratios
- Cancelled markets guarantee 100% refund
- No admin withdrawal of user funds (only platform fees + climate fund)

### Edge Cases Handled
- Empty pools: Default 50/50 odds, first bettor gets excellent odds
- Single-sided market: If only YES bets, YES wins = everyone gets their bet back (minus tiny fee), NO wins = no one to pay
- Zero profit: If payout equals bet (no profit), fee is zero
- Resolution before endTime: Reverts — prevents manipulation

## Testing

```bash
# Run all tests
npm test

# Run with gas reporting
REPORT_GAS=true npm test

# Run specific test
npx hardhat test tests/WeatherBetPool.test.ts
```

## Deployment

### Testnet

```bash
# 1. Deploy WeatherBetPool
#    Constructor args: (_usdm, _climateFund)
#    _usdm: 0x4605821e41B3e95C78C2e3871bc4597a0939189A
#    _climateFund: your climate fund address

# 2. Deploy WeatherBetOracle
#    Constructor arg: (_pool) = Pool address from step 1

# 3. Configure: pool.setOracle(oracle_address)

# 4. Create markets via oracle.createMarket(...)
```

### Contract Addresses — MegaETH Timothy Testnet (Chain 6343)

| Contract | Address |
|----------|---------|
| MockUSDm | `0x4605821e41B3e95C78C2e3871bc4597a0939189A` |
| WeatherBetPool | `_________________` |
| WeatherBetOracle | `_________________` |

*(Fill after deployment)*

## Comparison: Order Book vs Parimutuel Pool

| Feature | Order Book (v3) | Parimutuel Pool (v4) |
|---------|-----------------|----------------------|
| Counterparty needed | Yes ❌ | No ✅ |
| Instant fills | No (wait for match) ❌ | Yes (always) ✅ |
| Odds update | Only on match ❌ | On every bet ✅ |
| Lines of code | ~400 | ~280 ✅ |
| LP needed | Effectively yes ❌ | No ✅ |
| User fees | None | 0.5% on winnings only ✅ |
| Revenue model | None ❌ | Built-in ✅ |
| Climate impact | None ❌ | 30% of revenue ✅ |
| Creator incentive | None ❌ | 10% of revenue ✅ |
| Lat/Lon readable | No (hashed) ❌ | Yes (stored) ✅ |
| Math complexity | Medium | Low ✅ |
| External deps | None | None ✅ |
| Code auditability | Medium | High ✅ |

## Simplification Wins (v4 vs v3)

Following Vitalik's "Art of Simplification" principles:

**Minimized code:**
- Pool: ~280 lines vs OrderBook: ~400 lines (30% reduction)
- Removed: order matching engine, price level tracking, order cancellation, deposit/withdraw
- Added: climate impact fund, creator rewards, payout preview

**Avoided complex dependencies:**
- No matching algorithm
- No order book data structure
- No FIFO queue management
- Just arithmetic: `userBet / winningPool × totalPool`

**Added invariants:**
- Pool conservation (total in = total out)
- Fee distribution always sums to 100%
- Resolution only after endTime
- Cancelled markets = full refunds

**Removed unused features:**
- Order cancellation (no orders to cancel)
- Deposit/withdraw cycle (direct transfer)
- Price level scanning (no price levels)
- Partial fills (no matching)

**Garbage collected:**
- Entire order matching engine
- Balance management (deposit/withdraw)
- Order book data structures
- Price symmetry enforcement (handled naturally by pool ratio)

## Known Limitations

1. **No bet withdrawal**: Once you bet, funds are locked until resolution. This is by design — it prevents manipulation of odds before resolution.

2. **Single-sided market risk**: If everyone bets the same side, winners get very little profit (they split their own pool). Mitigation: UI shows odds clearly so users naturally balance.

3. **Oracle trust**: Markets are resolved by a centralized oracle. Future: Chainlink/API3 weather feeds for trustless resolution.

4. **No partial claims**: Users claim everything at once per market. Future: Could add per-side claiming if user bet on both sides.

5. **Fixed fee rate**: 0.5% is hardcoded. Future: Could make configurable per market or via governance.

## Future Improvements

- [ ] Chainlink/API3 weather oracle integration
- [ ] Yield generation on pooled funds (Aave/Compound)
- [ ] User-created markets (with deposit requirement)
- [ ] Multi-outcome markets (not just YES/NO)
- [ ] Batch betting (bet on multiple markets in one tx)
- [ ] Referral system (share % of referred user's fee)
- [ ] Market insurance pool (protect against oracle failure)
- [ ] Cross-chain deployment (Base, Arbitrum)
- [ ] Time-weighted odds snapshots (for analytics)

## Upgrade Path

Currently non-upgradeable for simplicity and auditability. Future considerations:

1. Deploy new Pool contract alongside existing one
2. Migrate markets and UI to new contract
3. Old contract stays live for existing market resolution
4. No proxy pattern needed — keep it simple
