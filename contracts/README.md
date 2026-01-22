# WeatherBet Smart Contracts

## Overview

Simple order book implementation for weather prediction markets. No AMM, no LMSR, just peer-to-peer limit orders.

## Core Invariants

These properties MUST always hold:

1. **Price Symmetry**: `YES_price + NO_price = 1.00 USDm`
2. **Balance Conservation**: `Total_deposits - Total_withdrawals = Contract_USDm_balance`
3. **Position Integrity**: `User_YES_shares + User_NO_shares ≤ Total_market_shares`
4. **Order Validity**: Orders only placeable before `market.endTime`
5. **Resolution Finality**: Markets can only be resolved once
6. **Payout Exactness**: Winning shares pay exactly `1.00 USDm` per share

## Contracts

### WeatherOrderBook.sol (~350 lines)

Main contract handling all trading logic.

**Key Functions:**
- `createMarket()` - Create new weather market
- `placeOrder()` - Place limit order (YES or NO)
- `cancelOrder()` - Cancel unfilled order
- `matchOrders()` - Auto-match complementary orders
- `resolveMarket()` - Resolve with oracle data
- `claimWinnings()` - Claim after resolution

**State Variables:**
- `markets` - All market data
- `orders` - All order data
- `positions` - User positions per market
- `balances` - User USDm balances
- `orderBook` - Price level order tracking

### MockUSDm.sol (~60 lines)

Mock USDm token for testing (6 decimals like real USDm).

### MockWeatherOracle.sol (~40 lines)

Mock oracle for testing. In production, replace with Chainlink Data Streams integration.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   WeatherOrderBook                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  User Balance Management                                │
│  ├── deposit(amount)                                    │
│  └── withdraw(amount)                                   │
│                                                         │
│  Order Management                                       │
│  ├── placeOrder(market, side, price, shares)          │
│  ├── cancelOrder(orderId)                              │
│  └── _matchOrders(market, side, price)                │
│                                                         │
│  Market Lifecycle                                       │
│  ├── createMarket(city, lat, lon, type, avg, days)    │
│  ├── resolveMarket(marketId, actualValue)             │
│  └── claimWinnings(marketId)                           │
│                                                         │
└─────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
    ┌─────────┐        ┌──────────┐        ┌──────────┐
    │  USDm   │        │  Oracle  │        │ Treasury │
    └─────────┘        └──────────┘        └──────────┘
```

## Order Matching Algorithm

When a new order is placed at price `P`:

1. Look for opposite side orders at price `1.00 - P`
2. Match FIFO (first in, first out)
3. Update positions for both users
4. Emit `OrderMatched` events
5. Any unfilled portion remains in order book

**Example:**
- User A places: BUY YES @ 0.60 for 100 shares
- User B places: BUY NO @ 0.40 for 50 shares
- Result: 50 shares matched, User A has 50 YES shares, User B has 50 NO shares
- User A's remaining 50 shares stay in order book at 0.60

## Gas Optimization

- Use `uint256` for all amounts (no SafeMath needed in 0.8+)
- Pack structs efficiently
- Minimize storage writes
- Batch operations where possible

## Security

### Access Control
- Only oracle can resolve markets
- Only oracle/treasury can create markets
- Users can only cancel their own orders

### Reentrancy Protection
- Checks-Effects-Interactions pattern
- Update state before external calls

### Price Validation
- Prices must be 0.01 - 0.99 USDm
- Enforced in `placeOrder()`

## Testing

```bash
# Run all tests
npm test

# Run with gas reporting
REPORT_GAS=true npm test

# Run specific test
npx hardhat test tests/WeatherOrderBook.test.ts
```

## Deployment

### Testnet

```bash
# Set up environment
cp .env.example .env
# Edit .env with your PRIVATE_KEY

# Deploy to MegaETH testnet
npm run deploy:testnet
```

### Mainnet

```bash
# Deploy to MegaETH mainnet (when available)
npm run deploy --network megaeth
```

## Contract Addresses

### MegaETH Timothy Testnet

To be filled after deployment:

```
MockUSDm: 
MockWeatherOracle: 
WeatherOrderBook: 
```

## Upgrade Path

Currently non-upgradeable for simplicity. Future considerations:

- Add proxy pattern if needed
- Migrate to real Chainlink oracle
- Add more market types
- Implement advanced order types

## Code Size

Target: Keep each contract under 24KB

Current sizes:
- WeatherOrderBook: ~12KB
- MockUSDm: ~2KB
- MockWeatherOracle: ~1KB

## Known Limitations

1. **Order Book Scanning**: `getBestPrices()` scans all price levels (slow for many orders)
   - Solution: Add price level tracking
2. **No Order Expiration**: Orders stay until cancelled or filled
   - Solution: Add `expiryTime` to Order struct
3. **No Partial Fills**: Orders are all-or-nothing
   - Solution: Already implemented with `filled` counter
4. **Single Market Type**: Only supports exceeding historical average
   - Solution: Add more outcome types

## Future Improvements

- [ ] Add order expiration times
- [ ] Optimize price level iteration
- [ ] Add market maker incentives
- [ ] Implement circuit breakers
- [ ] Add position limits per user
- [ ] Support batch order placement
- [ ] Add referral system

## Simplification Wins

Compared to AMM approach:

| Metric | AMM (v2) | Order Book (v3) |
|--------|----------|-----------------|
| Contract Size | ~500 lines | ~350 lines |
| Math Complexity | High (LMSR) | Low (arithmetic) |
| External Deps | PRBMath | None |
| LP Required | Yes | No |
| Price Discovery | Automatic | Market-driven |
| Code Auditability | Medium | High |

This follows Vitalik's "Art of Simplification" principles:
- ✅ Minimized code
- ✅ Avoided complex dependencies
- ✅ Added clear invariants
- ✅ Removed unused features (AMM, LP)
