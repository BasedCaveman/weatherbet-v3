# WeatherBet — Feature Observations & Plan

## Issues Found During Testing

### 1. ❌ Odds Don't Change After Betting (CRITICAL)
**Problem**: After betting YES on São Paulo, odds stay 50/50.
**Root Cause**: `placeBet()` hardcodes `price = 0.50` for every order. The order book has no automatic price discovery — it's a pure limit order book where price only changes when orders at different prices exist.

**Solutions (pick one):**

**Option A: Simple AMM-style auto-pricing (RECOMMENDED for MVP)**
- Add a function that calculates price based on YES vs NO volume
- Formula: `yesPrice = totalNoShares / (totalYesShares + totalNoShares)`
- Swap the order book for a simple LMSR or constant-product formula
- Users don't pick a price — they just pick YES/NO and amount
- Pro: Simple UX, odds move naturally
- Con: Requires contract change or wrapper

**Option B: Let users pick their own price**
- Show a slider: "What odds do you think? 30% / 50% / 70%"
- Places limit order at that price
- Odds display = best bid/ask from order book
- Pro: True order book, more sophisticated
- Con: Too complex for rural farmers

**Option C: Virtual AMM layer on top of order book**
- Frontend calculates "fair price" from order book depth
- Auto-fills user's order at the fair price
- Display odds based on total volume weighted price
- Pro: Keeps existing contracts, better UX
- Con: Odds only truly accurate with liquidity

**Recommendation**: For the UI overhaul, implement Option A at the contract level or Option C at the frontend level. For NOW, quick fix: display odds based on `totalYesShares` vs `totalNoShares` instead of the empty order book prices.

**Quick fix for current code** (useBetting.ts):
```typescript
// Instead of hardcoded 0.50:
const price = BigInt(500000); // always 50%

// Calculate from market volume:
const totalYes = market.totalYesShares;
const totalNo = market.totalNoShares;
const total = totalYes + totalNo;
const yesPrice = total > 0 
  ? Number(totalNo) / Number(total) 
  : 0.50;
// Display this as odds
```

---

### 2. ❌ Currency Conversion Not Applied to Bets (CRITICAL)
**Problem**: UI says "Prices in BRL" but bet buttons show $5/$10/$25/$50 and charge 10 USDm when you bet "$10" — should show R$25.90 and charge ~5 USDm.

**Fix**: 
- Preset buttons should show LOCAL currency: R$25.90 / R$51.70 / R$129.40 / R$258.80
- Behind the scenes, convert to USDm: R$25.90 ÷ 5.17 = 5 USDm
- The contract always works in USDm, the UI always shows local
- Min bet = 5 USDm (shown as R$25.90 in Brazil)

**Implementation**:
```typescript
const USDM_PRESETS = [5, 10, 25, 50]; // Always in USDm

// Display in local currency
const localPresets = USDM_PRESETS.map(usdm => ({
  usdm,
  local: usdm * exchangeRate, // e.g., 5 * 5.17 = R$25.85
  label: formatCurrency(usdm * exchangeRate), // "R$ 25,85"
}));

// When user taps R$25.85 → send 5 USDm to contract
```

**Priority**: Include in UI overhaul, affects AmountSheet component.

---

### 3. 🟡 User-Created Markets
**Question**: Can users create markets for their own location?

**Security concerns**:
- Oracle manipulation: Who resolves user-created markets?
- Spam: Anyone could create thousands of markets
- Liquidity fragmentation: Too many markets = no one bets

**Safe approach for later**:
- Users can REQUEST a market (submit location + type)
- Admin/oracle approves and creates it
- Or: Allow creation but require a deposit (e.g., 50 USDm) that's returned when market resolves
- Use Chainlink or API3 weather oracles for resolution (not user-reported)

**Timeline**: Future feature, not UI overhaul. Needs oracle infrastructure first.

---

### 4. 🟡 Proximity-Based Market Ordering
**Current**: All markets shown in creation order.
**Needed**: Closest market shown first, others ordered by distance.

**Implementation**:
```typescript
// Get user coordinates from browser geolocation or IP
const userLat = -21.245; // Lavras
const userLon = -45.000;

// Sort markets by distance
const sortedMarkets = markets.sort((a, b) => {
  const distA = haversine(userLat, userLon, a.lat, a.lon);
  const distB = haversine(userLat, userLon, b.lat, b.lon);
  return distA - distB;
});
```

**Problem**: Market lat/lon is stored as `locationHash` in the contract (keccak256), not readable. We need to either:
- Store lat/lon in the contract (add to Market struct)
- Or maintain a frontend mapping of marketId → coordinates

**Recommendation**: Frontend mapping for now, add to contract later.

**Timeline**: UI overhaul.

---

### 5. 🟡 Collapsed Market Display
**Problem**: With 10+ markets, the page becomes very long.
**Solution**: 
- Featured market (closest) = full card with YES/NO buttons
- Other markets = collapsed row: "🌧️ London — Rain — 55mm avg — 6d left"
- Tap to expand into full card
- Group by region when >15 markets

**Timeline**: UI overhaul.

---

### 6. 🟡 Portfolio / PNL Page
**Need**: Like Polymarket's portfolio showing all positions with:
- Current value
- Entry price
- Potential payout
- Unrealized P&L

**Data available from contract**:
- `getPosition(marketId, user)` → yesShares, noShares
- Market info (historicalAvg, endTime, resolved)
- Order history (from events)

**Missing from contract**:
- Average entry price (need to track from order events)
- Current market price (need order book depth or volume-based pricing)

**Implementation**:
- Read all user positions across all markets
- Calculate P&L based on current odds vs entry
- Show in "My Protections" tab

**Timeline**: UI overhaul (Phase: My Protections Screen).

---

### 7. 🟡 Temperature: °C vs °F
**Problem**: Temperature markets show °C everywhere, but US users expect °F.
**Fix**: 
```typescript
const isUS = userCurrency === 'USD';
const displayTemp = isUS 
  ? (celsius * 9/5) + 32  // Convert to °F
  : celsius;
const tempUnit = isUS ? '°F' : '°C';
```

**Timeline**: UI overhaul (simple, add to PriceDisplay component).

---

## Priority Matrix

| # | Issue | Priority | When |
|---|-------|----------|------|
| 1 | Odds don't change | 🔴 Critical | Quick fix NOW + proper fix in overhaul |
| 2 | Currency on bet amounts | 🔴 Critical | UI overhaul |
| 3 | User-created markets | 🟢 Future | Post-MVP |
| 4 | Proximity ordering | 🟡 Important | UI overhaul |
| 5 | Collapsed markets | 🟡 Important | UI overhaul |
| 6 | Portfolio/PNL | 🟡 Important | UI overhaul |
| 7 | °F for US users | 🟢 Easy | UI overhaul |

---

## Quick Fix for NOW (Odds Display)

Change `MarketCard.tsx` to calculate odds from market volume instead of empty order book:

```typescript
// BEFORE (broken — order book has no orders at different prices)
const yesProbability = prices.bestYesAsk > 0 
  ? Math.round(prices.bestYesAsk * 100) 
  : 50;

// AFTER (uses actual betting volume)
const totalYes = Number(market.totalYesShares);
const totalNo = Number(market.totalNoShares);
const totalVolume = totalYes + totalNo;
const yesProbability = totalVolume > 0 
  ? Math.round((totalNo / totalVolume) * 100) // More NO = higher YES price
  : 50; // Default 50/50 when no bets
const noProbability = 100 - yesProbability;
```

This makes odds move as people bet: if 70% of volume is on YES, YES odds go to ~30% (costs more), NO goes to ~70% (cheaper = higher potential return).
