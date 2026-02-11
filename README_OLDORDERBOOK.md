# WeatherBet v3.0

**Bet on weather in capital cities worldwide. Simple, secure, transparent.**

## Core Principles

Following Vitalik's "Art of Simplification":
- ✅ Minimize code complexity
- ✅ Avoid unnecessary dependencies  
- ✅ Add invariants where possible
- ✅ No Web3 jargon

## Key Features

### 🔐 Simple Authentication
- **iOS/macOS**: Sign in with Apple
- **Others**: Sign in with Google
- No wallet connection needed
- Smart account created automatically

### 💰 Your Currency
- Auto-detect your region from IP
- Display prices in local currency (BRL, EUR, JPY, etc.)
- Convert to/from USDm automatically
- No ETH needed

### 📊 Order Book Trading
- Peer-to-peer trading (no AMM)
- Simple limit orders
- Real-time order matching
- Transparent pricing

### 📍 Capital Cities Only
- ~195 capital cities worldwide
- Pre-loaded market data
- Reliable oracle data
- Focused scope for MVP

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Auth**: Reown AppKit (Apple/Google only)
- **Blockchain**: MegaETH (sub-cent fees)
- **Currency**: USDm (Ethena stablecoin)
- **Oracle**: Chainlink Data Streams (native precompile)

## Project Structure

```
weatherbet-v3/
├── app/                    # Next.js app directory
│   ├── page.tsx           # Landing page
│   ├── markets/           # Market pages
│   ├── account/           # User account
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── auth/             # Authentication
│   ├── markets/          # Market UI
│   └── account/          # Account UI
├── lib/                  # Utilities
│   ├── auth/            # Reown config
│   ├── contracts/       # Contract interaction
│   ├── utils/           # Helpers
│   └── data/            # Static data
├── contracts/           # Smart contracts
│   ├── WeatherOrderBook.sol
│   └── MarketFactory.sol
└── tests/              # Tests
```

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open browser
http://localhost:3000
```

## Smart Contract Architecture

### WeatherOrderBook.sol (~100 lines)

**Core Invariants:**
1. Total orders ≤ Total liquidity
2. YES price + NO price = $1.00
3. Orders only before market end
4. Winners get exactly $1.00/share

**Functions:**
- `placeOrder()` - Create limit order
- `cancelOrder()` - Cancel unfilled order
- `matchOrders()` - Auto-matching engine
- `resolveMarket()` - Oracle resolution
- `claimWinnings()` - Claim after resolution

## User Flow (No Web3 Jargon)

1. **Land** → See capital cities with weather markets
2. **Get Started** → One-click Apple/Google sign-in
3. **Add Funds** → Deposit USDm (shown in local currency)
4. **Pick City** → Browse capital cities
5. **Place Bet** → YES or NO on weather outcome
6. **Watch** → Real-time order book
7. **Cash Out** → Claim winnings after resolution

## Development Principles

### Planning
- Write detailed plan in markdown first
- Mark won't-do items clearly
- Work section by section
- Track progress with checkboxes

### Git Workflow
- Commit after each working section
- Use `git reset --hard HEAD` if stuck
- Start features from clean slate
- Don't rely on AI tool revert

### Testing
- E2E tests over unit tests
- Test before proceeding
- Simulate user clicks
- Catch regressions early

## Deployment

- **Contracts**: MegaETH mainnet
- **Frontend**: Vercel
- **Domain**: TBD

## License

MIT

## Links

- [Implementation Plan](./IMPLEMENTATION_PLAN.md)
- [MegaETH Docs](https://docs.megaeth.com)
- [Reown Docs](https://docs.reown.com)
- [USDm Info](https://ethena.fi)
