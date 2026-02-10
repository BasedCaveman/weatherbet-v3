'use client';

import { createAppKit } from '@reown/appkit/react';
import { EthersAdapter } from '@reown/appkit-adapter-ethers';
import { megaethTestnet } from '@reown/appkit/networks';

const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || 'ff6342f0134a0af6e9f7b972fb1c0afa';

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
      icons: ['https://weatherbet.app/icon.png']
    },
    features: {
      analytics: false,
    }
  });

  return appKit;
}

export { projectId };
