'use client';

import { useAppKit } from '@reown/appkit/react';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../hooks/useTranslation';

const IS_MAINNET = process.env.NEXT_PUBLIC_NETWORK === 'mainnet';

interface FundButtonProps {
  onGetTestTokens?: () => Promise<boolean>;
  isLoading?: boolean;
  canClaim?: boolean;
  className?: string;
}

export default function FundButton({ 
  onGetTestTokens, 
  isLoading = false, 
  canClaim = true,
  className = '' 
}: FundButtonProps) {
  const { open } = useAppKit();
  const { isConnected } = useAuth();
  const { t } = useTranslation();

  if (!isConnected) return null;

  if (IS_MAINNET) {
    // Mainnet: open Reown's built-in on-ramp (Coinbase Pay, etc.)
    return (
      <button
        onClick={() => open({ view: 'OnRampProviders' })}
        className={`px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium 
          hover:bg-emerald-700 transition-colors flex items-center gap-2 ${className}`}
      >
        <span>💰</span>
        {t('fund.deposit') || 'Deposit'}
      </button>
    );
  }

  // Testnet: faucet button
  return (
    <button
      onClick={onGetTestTokens}
      disabled={isLoading || !canClaim}
      className={`px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium 
        hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
        flex items-center gap-2 ${className}`}
    >
      <span>🪙</span>
      {isLoading 
        ? (t('fund.claiming') || 'Claiming...') 
        : !canClaim 
          ? (t('fund.cooldown') || 'Cooldown') 
          : (t('fund.getTestTokens') || 'Get Test Tokens')
      }
    </button>
  );
}
