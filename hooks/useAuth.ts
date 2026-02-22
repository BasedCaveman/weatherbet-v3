'use client';

import { useEffect, useState } from 'react';
import { useAppKit, useAppKitAccount, useDisconnect } from '@reown/appkit/react';

interface UseAuthReturn {
  address: string | undefined;
  isConnected: boolean;
  isLoading: boolean;
  connect: () => void;
  disconnect: () => Promise<void>;
  openAccount: () => void;
}

export function useAuth(): UseAuthReturn {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const { disconnect: appKitDisconnect } = useDisconnect();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(false);
  }, []);

  const connect = () => {
    open();
  };

  const disconnect = async () => {
    await appKitDisconnect();
  };

  // Opens the Reown account modal (shows address, balance, disconnect option)
  const openAccount = () => {
    open({ view: 'Account' });
  };

  return {
    address,
    isConnected,
    isLoading,
    connect,
    disconnect,
    openAccount,
  };
}
