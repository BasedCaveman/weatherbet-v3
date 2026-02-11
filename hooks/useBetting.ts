'use client';

import { useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import { useAppKitProvider, useAppKitAccount } from '@reown/appkit/react';

// Contract addresses - MegaETH Testnet
const CONTRACTS = {
  USDM: '0x4605821e41B3e95C78C2e3871bc4597a0939189A',
  ORDER_BOOK: '0xcAA2bdD4A51702AaB56dE268E178f822CEC9F104',
};

const RPC_URL = 'https://timothy.megaeth.com/rpc';

const USDM_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function faucet()',
  'function faucetAmount() view returns (uint256)',
  'function canClaimFaucet(address user) view returns (bool)',
];

const ORDER_BOOK_ABI = [
  'function deposit(uint256 amount)',
  'function withdraw(uint256 amount)',
  'function placeOrder(uint256 marketId, bool isYes, uint256 price, uint256 shares) returns (uint256)',
  'function balances(address user) view returns (uint256)',
  'function getPosition(uint256 marketId, address user) view returns (uint256 yesShares, uint256 noShares)',
];

export type BetStatus = 'idle' | 'preparing' | 'approving' | 'depositing' | 'confirming' | 'success' | 'error';

export interface UserBalance {
  wallet: string;
  deposited: string;
  total: string;
  eth: string;
  canClaimFaucet: boolean;
}

export interface Position {
  marketId: number;
  yesShares: string;
  noShares: string;
}

export function useBetting() {
  const { walletProvider } = useAppKitProvider('eip155');
  const { address, isConnected } = useAppKitAccount();
  
  const [status, setStatus] = useState<BetStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [balances, setBalances] = useState<UserBalance>({ 
    wallet: '0', deposited: '0', total: '0', eth: '0', canClaimFaucet: true 
  });
  const [positions, setPositions] = useState<Position[]>([]);
  const [isReady, setIsReady] = useState(false);

  const getReadProvider = useCallback(() => {
    return new ethers.JsonRpcProvider(RPC_URL);
  }, []);

  const refreshBalances = useCallback(async () => {
    if (!address) return;
    
    try {
      const provider = getReadProvider();
      const usdm = new ethers.Contract(CONTRACTS.USDM, USDM_ABI, provider);
      const orderBook = new ethers.Contract(CONTRACTS.ORDER_BOOK, ORDER_BOOK_ABI, provider);
      
      const [walletBal, depositedBal, ethBal, canClaim] = await Promise.all([
        usdm.balanceOf(address),
        orderBook.balances(address),
        provider.getBalance(address),
        usdm.canClaimFaucet(address).catch(() => true),
      ]);
      
      // FIXED: Use BigInt math then format, don't add formatted strings
      const totalBal = walletBal + depositedBal;
      
      setBalances({
        wallet: ethers.formatUnits(walletBal, 6),
        deposited: ethers.formatUnits(depositedBal, 6),
        total: ethers.formatUnits(totalBal, 6),
        eth: ethers.formatEther(ethBal),
        canClaimFaucet: canClaim,
      });
      
      setIsReady(true);
    } catch (err) {
      console.error('Error refreshing balances:', err);
    }
  }, [address, getReadProvider]);

  const refreshPositions = useCallback(async (marketIds: number[]) => {
    if (!address) return;
    
    try {
      const provider = getReadProvider();
      const orderBook = new ethers.Contract(CONTRACTS.ORDER_BOOK, ORDER_BOOK_ABI, provider);
      
      const positionPromises = marketIds.map(async (marketId) => {
        const [yesShares, noShares] = await orderBook.getPosition(marketId, address);
        return {
          marketId,
          yesShares: ethers.formatUnits(yesShares, 6),
          noShares: ethers.formatUnits(noShares, 6),
        };
      });
      
      const newPositions = await Promise.all(positionPromises);
      setPositions(newPositions.filter(p => 
        parseFloat(p.yesShares) > 0 || parseFloat(p.noShares) > 0
      ));
    } catch (err) {
      console.error('Error getting positions:', err);
    }
  }, [address, getReadProvider]);

  useEffect(() => {
    if (isConnected && address) {
      refreshBalances();
      refreshPositions([1]);
    }
  }, [isConnected, address, refreshBalances, refreshPositions]);

  // Uses faucet() — works for ALL accounts (Google smart accounts + MetaMask)
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
      const usdm = new ethers.Contract(CONTRACTS.USDM, USDM_ABI, signer);
      
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
        errorMsg = 'Network error. Google accounts may need ETH for gas. Try with a wallet app instead.';
      } else if (err.reason) {
        errorMsg = err.reason;
      }
      
      setError(errorMsg);
      setStatus('error');
      return false;
    }
  }, [walletProvider, address, refreshBalances]);

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
      const usdm = new ethers.Contract(CONTRACTS.USDM, USDM_ABI, signer);
      const orderBook = new ethers.Contract(CONTRACTS.ORDER_BOOK, ORDER_BOOK_ABI, signer);
      
      const amountWei = ethers.parseUnits(amountUsd.toString(), 6);
      const price = BigInt(500000); // 0.50 USDm
      const shares = (amountWei * BigInt(1000000)) / price;
      const cost = (shares * price) / BigInt(1000000);
      
      // Check balances using READ provider (no wallet popup)
      const readProvider = getReadProvider();
      const usdmRead = new ethers.Contract(CONTRACTS.USDM, USDM_ABI, readProvider);
      const orderBookRead = new ethers.Contract(CONTRACTS.ORDER_BOOK, ORDER_BOOK_ABI, readProvider);
      
      const [walletBalance, depositedBalance, allowance] = await Promise.all([
        usdmRead.balanceOf(address),
        orderBookRead.balances(address),
        usdmRead.allowance(address, CONTRACTS.ORDER_BOOK),
      ]);
      
      const totalAvailable = walletBalance + depositedBalance;
      
      if (totalAvailable < cost) {
        setError(`Not enough funds. You have $${parseFloat(ethers.formatUnits(totalAvailable, 6)).toFixed(2)} but need $${parseFloat(ethers.formatUnits(cost, 6)).toFixed(2)}.`);
        setStatus('error');
        return false;
      }
      
      // Step 1: Approve if needed (one-time large approval)
      // Use MaxUint256 so user only approves ONCE ever
      if (allowance < cost) {
        setStatus('approving');
        const maxApproval = ethers.MaxUint256;
        const approveTx = await usdm.approve(CONTRACTS.ORDER_BOOK, maxApproval);
        await approveTx.wait();
      }
      
      // Step 2: Deposit from wallet to OrderBook if needed
      if (depositedBalance < cost) {
        const depositNeeded = cost - depositedBalance;
        if (walletBalance < depositNeeded) {
          setError('Not enough funds in wallet');
          setStatus('error');
          return false;
        }
        setStatus('depositing');
        const depositTx = await orderBook.deposit(depositNeeded);
        await depositTx.wait();
      }
      
      // Step 3: Place the order
      setStatus('confirming');
      const orderTx = await orderBook.placeOrder(marketId, isYes, price, shares);
      await orderTx.wait();
      
      await refreshBalances();
      await refreshPositions([marketId]);
      
      setStatus('success');
      return true;
    } catch (err: any) {
      console.error('Error placing bet:', err);
      
      let errorMsg = 'Failed to place bet';
      if (err.reason) {
        errorMsg = err.reason;
      } else if (err.message) {
        if (err.message.includes('insufficient funds')) {
          errorMsg = 'Not enough ETH for gas. Get test ETH from the MegaETH faucet.';
        } else if (err.message.includes('user rejected')) {
          errorMsg = 'Transaction cancelled';
        } else if (err.message.includes('Magic RPC') || err.message.includes('Failed to fetch')) {
          errorMsg = 'Network error. Google accounts may not support this chain yet. Try connecting a wallet app.';
        } else if (err.message.includes('missing revert data')) {
          errorMsg = 'Transaction failed. Make sure you have enough funds and try again.';
        } else {
          errorMsg = err.message.slice(0, 120);
        }
      }
      
      setError(errorMsg);
      setStatus('error');
      return false;
    }
  }, [walletProvider, address, refreshBalances, refreshPositions, getReadProvider]);

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
  }, []);

  return {
    isConnected,
    address,
    isReady,
    balances,
    positions,
    refreshBalances,
    refreshPositions,
    placeBet,
    getTestTokens,
    status,
    error,
    reset,
  };
}
