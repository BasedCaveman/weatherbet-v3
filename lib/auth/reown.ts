import { createAppKit } from '@reown/appkit/react'
import { EthersAdapter } from '@reown/appkit-adapter-ethers'
import { megaETHTestnet } from '@reown/appkit/networks'

// Get project ID from environment
const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID

if (!projectId) {
  throw new Error('NEXT_PUBLIC_REOWN_PROJECT_ID is not set')
}

// Define MegaETH testnet
const megaETH = {
  id: 77777,
  name: 'MegaETH Timothy Testnet',
  network: 'megaeth-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc-testnet.megaeth.com'],
    },
    public: {
      http: ['https://rpc-testnet.megaeth.com'],
    },
  },
  blockExplorers: {
    default: {
      name: 'MegaETH Explorer',
      url: 'https://explorer-testnet.megaeth.com',
    },
  },
  testnet: true,
}

// Metadata
const metadata = {
  name: 'WeatherBet',
  description: 'Bet on weather in capital cities worldwide',
  url: 'https://weatherbet.app', // Update with actual domain
  icons: ['https://weatherbet.app/icon.png'] // Update with actual icon
}

// Create modal with ONLY social login options
export const appKit = createAppKit({
  adapters: [new EthersAdapter()],
  networks: [megaETH],
  metadata,
  projectId,
  features: {
    analytics: true,
    email: false, // Disable email
    socials: ['google', 'apple'], // ONLY Google and Apple
    emailShowWallets: false, // Hide wallet options from email flow
  },
  themeMode: 'light',
  themeVariables: {
    '--w3m-accent': '#2563eb', // Primary blue
    '--w3m-border-radius-master': '8px',
  },
  // Hide all wallet connect options
  featuredWalletIds: [],
  includeWalletIds: [],
  excludeWalletIds: ['ALL'], // Exclude all wallets
  enableWalletConnect: false, // Disable WalletConnect
})
