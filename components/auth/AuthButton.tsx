'use client';

import { useAppKit, useAppKitAccount } from '@reown/appkit/react';

export default function AuthButton() {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();

  const handleClick = () => {
    open();
  };

  if (isConnected && address) {
    return (
      <button
        onClick={handleClick}
        className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
      >
        {address.slice(0, 6)}...{address.slice(-4)}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
    >
      Get Started
    </button>
  );
}
