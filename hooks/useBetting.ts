'use client';

import { useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import { useAppKitProvider, useAppKitAccount } from '@reown/appkit/react';
import { CONTRACT_ADDRESSES, POOL_ABI, USDM_ABI, CHAIN_CONFIG, USDM_DECIMALS } from '../lib/contracts';

export type BetStatus = 'idle' | 'preparing' | 'approving' | 'confirming' | 'success' | 'error';

export interface UserBalance {
  wallet: string;
  eth: string;
  canClaimFaucet: boolean;
}

export interface UserBet {
  marketId: number;
  yesAmount: string;
  noAmount: string;
  claimed: boolean;
}

export function useBetting() {
  const { walletProvider } = useAppKitProvider('eip155');
  const { address, isConnected } = useAppKitAccount();

  const [status, setStatus] = useState<BetStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [balances, setBalances] = useState<UserBalance>({
    wallet: '0', eth: '0', canClaimFaucet: true,
  });
  const [userBets, setUserBets] = useState<UserBet[]>([]);
  const [isReady, setIsReady] = useState(false);

  const getReadProvider = useCallback(() => {
    return new ethers.JsonRpcProvider(CHAIN_CONFIG.rpcUrl);
  }, []);

  // ============ BALANCES ============

  const refreshBalances = useCallback(async () => {
    if (!address) return;

    try {
      const provider = getReadProvider();
      const usdm = new ethers.Contract(CONTRACT_ADDRESSES.USDM, USDM_ABI, provider);

      const [walletBal, ethBal, canClaim] = await Promise.all([
        usdm.balanceOf(address),
        provider.getBalance(address),
        usdm.canClaimFaucet(address).catch(() => true),
      ]);

      setBalances({
        wallet: ethers.formatUnits(walletBal, USDM_DECIMALS),
        eth: ethers.formatEther(ethBal),
        canClaimFaucet: canClaim,
      });

      setIsReady(true);
    } catch (err) {
      console.error('Error refreshing balances:', err);
    }
  }, [address, getReadProvider]);

  // ============ USER BETS ============

  const refreshUserBets = useCallback(async (marketIds: number[]) => {
    if (!address) return;

    try {
      const provider = getReadProvider();
      const pool = new ethers.Contract(CONTRACT_ADDRESSES.POOL, POOL_ABI, provider);

      const betPromises = marketIds.map(async (marketId) => {
        const result = await pool.getUserBet(marketId, address);
        return {
          marketId,
          yesAmount: ethers.formatUnits(result[0], USDM_DECIMALS),
          noAmount: ethers.formatUnits(result[1], USDM_DECIMALS),
          claimed: result[2],
        };
      });

      const bets = await Promise.all(betPromises);
      setUserBets(bets.filter(b =>
        parseFloat(b.yesAmount) > 0 || parseFloat(b.noAmount) > 0
      ));
    } catch (err) {
      console.error('Error fetching user bets:', err);
    }
  }, [address, getReadProvider]);

  // ============ INIT ============

  useEffect(() => {
    if (isConnected && address) {
      refreshBalances();
    }
  }, [isConnected, address, refreshBalances]);

  // ============ FAUCET ============

  const getTestTokens = useCallback(async (): Promise<boolean> => {
    if (!walletProvider || !address) {
      setError('Please sign in first');
      return false;
    }

    try {
      setStatus('preparing');
      setError(null);

      const provider = new ethers.BrowserProvider(walletProvider as any);
      const signer = await provider.getSigner();
      const usdm = new ethers.Contract(CONTRACT_ADDRESSES.USDM, USDM_ABI, signer);

      setStatus('confirming');
      const tx = await usdm.faucet();
      await tx.wait();

      await refreshBalances();
      setStatus('success');
      return true;
    } catch (err: any) {
      console.error('Error claiming faucet:', err);

      let errorMsg = 'Failed to get test tokens';
      if (err.message?.includes('Cooldown')) {
        errorMsg = 'Please wait before claiming again';
      } else if (err.message?.includes('user rejected')) {
        errorMsg = 'Cancelled';
      } else if (err.message?.includes('Magic RPC') || err.message?.includes('Failed to fetch')) {
        errorMsg = 'Network error. Try connecting a wallet app instead.';
      } else if (err.reason) {
        errorMsg = err.reason;
      }

      setError(errorMsg);
      setStatus('error');
      return false;
    }
  }, [walletProvider, address, refreshBalances]);

  // ============ PLACE BET ============
  // Pool contract: just approve + bet(). No deposit step!

  const placeBet = useCallback(async (
    marketId: number,
    isYes: boolean,
    amountUsd: number
  ): Promise<boolean> => {
    if (!walletProvider || !address) {
      setError('Please sign in first');
      return false;
    }

    try {
      setStatus('preparing');
      setError(null);

      const provider = new ethers.BrowserProvider(walletProvider as any);
      const signer = await provider.getSigner();
      const usdm = new ethers.Contract(CONTRACT_ADDRESSES.USDM, USDM_ABI, signer);
      const pool = new ethers.Contract(CONTRACT_ADDRESSES.POOL, POOL_ABI, signer);

      const amountWei = ethers.parseUnits(amountUsd.toString(), USDM_DECIMALS);

      // Check balance + allowance using READ provider (no wallet popup)
      const readProvider = getReadProvider();
      const usdmRead = new ethers.Contract(CONTRACT_ADDRESSES.USDM, USDM_ABI, readProvider);

      const [walletBalance, allowance] = await Promise.all([
        usdmRead.balanceOf(address),
        usdmRead.allowance(address, CONTRACT_ADDRESSES.POOL),
      ]);

      if (walletBalance < amountWei) {
        const bal = parseFloat(ethers.formatUnits(walletBalance, USDM_DECIMALS)).toFixed(2);
        setError(`Not enough funds. You have $${bal} but need $${amountUsd.toFixed(2)}.`);
        setStatus('error');
        return false;
      }

      // Step 1: Approve if needed (one-time MaxUint256)
      if (allowance < amountWei) {
        setStatus('approving');
        const approveTx = await usdm.approve(CONTRACT_ADDRESSES.POOL, ethers.MaxUint256);
        await approveTx.wait();
      }

      // Step 2: Bet! Direct to pool — no deposit step
      setStatus('confirming');
      const betTx = await pool.bet(marketId, isYes, amountWei);
      await betTx.wait();

      await refreshBalances();
      await refreshUserBets([marketId]);

      setStatus('success');
      return true;
    } catch (err: any) {
      console.error('Error placing bet:', err);

      let errorMsg = 'Failed to place bet';
      if (err.reason) {
        errorMsg = err.reason;
      } else if (err.message) {
        if (err.message.includes('insufficient funds')) {
          errorMsg = 'Not enough ETH for gas.';
        } else if (err.message.includes('user rejected')) {
          errorMsg = 'Transaction cancelled';
        } else if (err.message.includes('Magic RPC') || err.message.includes('Failed to fetch')) {
          errorMsg = 'Network error. Try connecting a wallet app.';
        } else if (err.message.includes('BetTooSmall')) {
          errorMsg = 'Minimum bet is 1 USDm.';
        } else if (err.message.includes('MarketNotActive')) {
          errorMsg = 'This market is no longer active.';
        } else if (err.message.includes('missing revert data')) {
          errorMsg = 'Transaction failed. Check your balance and try again.';
        } else {
          errorMsg = err.message.slice(0, 120);
        }
      }

      setError(errorMsg);
      setStatus('error');
      return false;
    }
  }, [walletProvider, address, refreshBalances, refreshUserBets, getReadProvider]);

  // ============ CLAIM WINNINGS ============

  const claimWinnings = useCallback(async (marketId: number): Promise<boolean> => {
    if (!walletProvider || !address) {
      setError('Please sign in first');
      return false;
    }

    try {
      setStatus('confirming');
      setError(null);

      const provider = new ethers.BrowserProvider(walletProvider as any);
      const signer = await provider.getSigner();
      const pool = new ethers.Contract(CONTRACT_ADDRESSES.POOL, POOL_ABI, signer);

      const tx = await pool.claim(marketId);
      await tx.wait();

      await refreshBalances();
      await refreshUserBets([marketId]);

      setStatus('success');
      return true;
    } catch (err: any) {
      console.error('Error claiming winnings:', err);
      setError(err.reason || 'Failed to claim winnings');
      setStatus('error');
      return false;
    }
  }, [walletProvider, address, refreshBalances, refreshUserBets]);

  // ============ RESET ============

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
  }, []);

  return {
    isConnected,
    address,
    isReady,
    balances,
    userBets,
    refreshBalances,
    refreshUserBets,
    placeBet,
    claimWinnings,
    getTestTokens,
    status,
    error,
    reset,
  };
}
