# Authentication Setup Guide

## Overview

WeatherBet uses Reown (formerly WalletConnect) for authentication with ONLY Apple and Google sign-in options. No wallet connection, no Web3 jargon.

## Features

✅ **OS-Based Auth Selection**
- iOS/macOS → Apple Sign-In
- Android/Windows/Linux → Google Sign-In

✅ **Smart Account Creation**
- Automatic ERC-4337 smart account
- No seed phrases or private keys
- Gas sponsorship enabled

✅ **No Web3 Jargon**
- "Get Started" instead of "Connect Wallet"
- "Add Funds" instead of "Deposit"
- "Cash Out" instead of "Withdraw"

## Setup Instructions

### 1. Get Reown Project ID

1. Go to [cloud.reown.com](https://cloud.reown.com)
2. Create a new project
3. Copy your Project ID
4. Add to `.env.local`:

```bash
NEXT_PUBLIC_REOWN_PROJECT_ID=your_project_id_here
```

### 2. Configure Social Login

In your Reown dashboard:

1. Go to **Settings** → **Social Login**
2. Enable **Google** and **Apple**
3. Configure OAuth credentials:

**Google:**
- Go to [Google Cloud Console](https://console.cloud.google.com)
- Create OAuth 2.0 credentials
- Add authorized redirect URIs:
  - `https://your-domain.com/callback`
  - `http://localhost:3000/callback` (for development)

**Apple:**
- Go to [Apple Developer](https://developer.apple.com)
- Create a Sign in with Apple identifier
- Configure redirect URIs

### 3. Configure Gas Sponsorship (Optional)

For a better UX, enable gas sponsorship so users don't need ETH:

1. In Reown dashboard → **Gas Sponsorship**
2. Add MegaETH testnet
3. Fund the paymaster wallet

## Testing

### Local Development

```bash
# Install dependencies
npm install

# Set environment variables
cp .env.example .env.local
# Edit .env.local with your Reown Project ID

# Run dev server
npm run dev

# Visit test page
http://localhost:3000/auth-test
```

### Test Checklist

- [ ] Apple auth shows on iOS/macOS
- [ ] Google auth shows on Android/Windows/Linux
- [ ] Smart account created after sign-in
- [ ] No "Connect Wallet" text visible
- [ ] Location auto-detected correctly
- [ ] Currency matches detected region

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                   User Device                         │
├──────────────────────────────────────────────────────┤
│                                                      │
│  1. Click "Get Started"                              │
│  2. OS Detection (iOS/Mac → Apple, Other → Google)  │
│  3. Social Auth Flow                                 │
│  4. Smart Account Created (ERC-4337)                 │
│  5. Session Stored                                   │
│                                                      │
└──────────────────────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────┐
│                 Reown AppKit                          │
├──────────────────────────────────────────────────────┤
│                                                      │
│  • Social Login (Apple/Google only)                  │
│  • Smart Account Creation                            │
│  • Session Management                                │
│  • Transaction Signing                               │
│  • Gas Sponsorship                                   │
│                                                      │
└──────────────────────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────┐
│                  MegaETH Network                      │
├──────────────────────────────────────────────────────┤
│                                                      │
│  • Smart Account Contract                            │
│  • WeatherOrderBook Contract                         │
│  • USDm Token                                        │
│                                                      │
└──────────────────────────────────────────────────────┘
```

## Components

### ReownProvider
- Wraps app with Reown context
- Manages wallet connection state
- Provides ethers provider/signer

### AuthButton
- Detects OS
- Shows appropriate auth option
- No Web3 terminology
- Handles loading/connected states

### useAuth Hook
- Clean API for auth state
- `isAuthenticated` instead of `isConnected`
- `login()` instead of `open()`
- `logout()` instead of `disconnect()`

## Security Considerations

### Smart Account Security
- User controls account via social login
- Can export/upgrade to self-custody
- Social recovery via email
- 2FA recommended

### Session Management
- Sessions stored securely
- Auto-logout after inactivity
- Session revocation supported

### Privacy
- No PII stored on-chain
- Social login handles identity
- Minimal data collection

## Troubleshooting

### "Project ID not found"
→ Check NEXT_PUBLIC_REOWN_PROJECT_ID in .env.local

### "Social login not enabled"
→ Enable Google/Apple in Reown dashboard

### "Wrong auth provider shown"
→ Check OS detection in useLocation.ts

### "Smart account not created"
→ Verify gas sponsorship is enabled

## Next Steps

After authentication is working:

1. ✅ Test on multiple devices/browsers
2. ✅ Verify OS detection accuracy
3. ✅ Test with real social accounts
4. ✅ Enable gas sponsorship
5. → Move to Phase 4: Location & Currency

## Resources

- [Reown Docs](https://docs.reown.com)
- [AppKit React](https://docs.reown.com/appkit/react/core/installation)
- [ERC-4337 Standard](https://eips.ethereum.org/EIPS/eip-4337)
