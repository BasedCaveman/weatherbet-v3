'use client';

import { createAppKit } from '@reown/appkit/react';
import { EthersAdapter } from '@reown/appkit-adapter-ethers';
import { ReactNode, useEffect, useState } from 'react';

// Define MegaETH Testnet manually with correct RPC
const megaethTestnet = {
  id: 6343,
  name: 'MegaETH Testnet',
  nativeCurrency: {
    name: 'ETH',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://timothy.megaeth.com/rpc'],
    },
    public: {
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
};

const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || 'ff6342f0134a0af6e9f7b972fb1c0afa';

let initialized = false;

function initializeAppKit() {
  if (initialized || typeof window === 'undefined') return;
  
  try {
    createAppKit({
      adapters: [new EthersAdapter()],
      networks: [megaethTestnet as any],
      defaultNetwork: megaethTestnet as any,
      projectId,
      metadata: {
        name: 'WeatherBet',
        description: 'Weather Prediction Markets',
        url: typeof window !== 'undefined' ? window.location.origin : 'https://weatherbet-v3.vercel.app',
        icons: ['https://weatherbet-v3.vercel.app/icon.png']
      },
      features: {
        analytics: false,
        email: false, // Disable email login
        socials: ['google', 'apple'], // Only Google and Apple
      },
      themeMode: 'dark',
      themeVariables: {
        '--w3m-accent': '#10b981', // Emerald color
        '--w3m-border-radius-master': '12px',
      }
    });
    initialized = true;
    console.log('AppKit initialized successfully');
  } catch (error) {
    console.error('AppKit initialization error:', error);
  }
}

if (typeof window !== 'undefined') {
  initializeAppKit();
}

export function ReownProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    initializeAppKit();
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white animate-pulse text-xl">🌦️ Loading...</div>
      </div>
    );
  }

  return <>{children}</>;
}
