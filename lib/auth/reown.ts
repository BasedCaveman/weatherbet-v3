'use client';
import { createAppKit } from '@reown/appkit/react';
import { EthersAdapter } from '@reown/appkit-adapter-ethers';
import type { AppKitNetwork } from '@reown/appkit/networks';

const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || 'ff6342f0134a0af6e9f7b972fb1c0afa';

// Define MegaETH ourselves instead of using Reown's outdated preset
const megaethTestnet = {
  id: 6343,
  name: 'MegaETH Testnet',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://timothy.megaeth.com/rpc'],
    },
  },
  blockExplorers: {
    default: {
      name: 'MegaETH Explorer',
      url: 'https://megaeth-testnet-v2.blockscout.com',
    },
  },
  testnet: true,
} as const satisfies AppKitNetwork;

let appKit: ReturnType<typeof createAppKit> | null = null;

export function getAppKit() {
  if (appKit) return appKit;
  if (typeof window === 'undefined') return null;

  appKit = createAppKit({
    adapters: [new EthersAdapter()],
    networks: [megaethTestnet],
    projectId,
    metadata: {
      name: 'WeatherBet',
      description: 'Weather Prediction Markets',
      url: 'https://weatherbet.app',
      icons: ['https://weatherbet.app/icon.png'],
    },
    features: {
      analytics: false,
    },
  });

  return appKit;
}

export { projectId, megaethTestnet };
