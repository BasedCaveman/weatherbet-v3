'use client';

import { createAppKit } from '@reown/appkit/react';
import { EthersAdapter } from '@reown/appkit-adapter-ethers';
import { megaethTestnet } from '@reown/appkit/networks';
import { ReactNode, useEffect, useState } from 'react';

// Project ID from Reown
const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || 'ff6342f0134a0af6e9f7b972fb1c0afa';

// Initialize AppKit ONCE at module level
let initialized = false;

function initializeAppKit() {
  if (initialized || typeof window === 'undefined') return;
  
  try {
    createAppKit({
      adapters: [new EthersAdapter()],
      networks: [megaethTestnet],
      projectId,
      metadata: {
        name: 'WeatherBet',
        description: 'Weather Prediction Markets',
        url: 'https://weatherbet.app',
        icons: ['https://weatherbet.app/icon.png']
      },
      features: {
        analytics: false,
      }
    });
    initialized = true;
    console.log('AppKit initialized successfully');
  } catch (error) {
    console.error('AppKit initialization error:', error);
  }
}

// Initialize immediately when module loads
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return <>{children}</>;
}
