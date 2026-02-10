'use client';

import { useEffect, useState } from 'react';
import { useAppKit, useAppKitAccount } from '@reown/appkit/react';

interface UseAuthReturn {
  address: string | undefined;
  isConnected: boolean;
  isLoading: boolean;
  connect: () => void;
  disconnect: () => void;
}

export function useAuth(): UseAuthReturn {
  const { open, close } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(false);
  }, []);

  const connect = () => {
    open();
  };

  const disconnect = () => {
    close();
  };

  return {
    address,
    isConnected,
    isLoading,
    connect,
    disconnect,
  };
}
