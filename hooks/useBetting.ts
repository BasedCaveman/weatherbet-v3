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
  'function mint(address to, uint256 amount)',
];

const ORDER_BOOK_ABI = [
  'function deposit(uint256 amount)',
  'function withdraw(uint256 amount)',
  'function placeOrder(uint256 marketId, bool isYes, uint256 price, uint256 shares) returns (uint256)',
  'function balances(address user) view returns (uint256)',
  'function getPosition(uint256 marketId, address user) view returns (uint256 yesShares, uint256 noShares)',
];

export type BetStatus = 'idle' | 'preparing' | 'confirming' | 'success' | 'error';

export interface UserBalance {
  wallet: string;
  deposited: string;
  eth: string;
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
  const [balances, setBalances] = useState<UserBalance>({ wallet: '0', deposited: '0', eth: '0' });
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
      
      const [walletBal, depositedBal, ethBal] = await Promise.all([
        usdm.balanceOf(address),
        orderBook.balances(address),
        provider.getBalance(address),
      ]);
      
      setBalances({
        wallet: ethers.formatUnits(walletBal, 6),
        deposited: ethers.formatUnits(depositedBal, 6),
        eth: ethers.formatEther(ethBal),
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

  const getTestTokens = useCallback(async (amount: number = 1000): Promise<boolean> => {
    if (!walletProvider || !address) {
      setError('Please connect your wallet first');
      return false;
    }
    
    try {
      setStatus('preparing');
      setError(null);
      
      const provider = new ethers.BrowserProvider(walletProvider as any);
      const signer = await provider.getSigner();
      const usdm = new ethers.Contract(CONTRACTS.USDM, USDM_ABI, signer);
      
      const amountWei = ethers.parseUnits(amount.toString(), 6);
      
      setStatus('confirming');
      const tx = await usdm.mint(address, amountWei);
      await tx.wait();
      
      await refreshBalances();
      setStatus('success');
      return true;
    } catch (err: any) {
      console.error('Error getting test tokens:', err);
      setError(err.reason || err.message || 'Failed to get test tokens');
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
      setError('Please connect your wallet first');
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
      const price = BigInt(500000);
      const shares = (amountWei * BigInt(1000000)) / price;
      const cost = (shares * price) / BigInt(1000000);
      
      const [walletBalance, depositedBalance, allowance] = await Promise.all([
        usdm.balanceOf(address),
        orderBook.balances(address),
        usdm.allowance(address, CONTRACTS.ORDER_BOOK),
      ]);
      
      if (walletBalance + depositedBalance < cost) {
        const needed = cost - walletBalance - depositedBalance + ethers.parseUnits('10', 6);
        setStatus('confirming');
        const mintTx = await usdm.mint(address, needed);
        await mintTx.wait();
      }
      
      const largeApproval = ethers.parseUnits('1000000', 6);
      if (allowance < cost) {
        setStatus('confirming');
        const approveTx = await usdm.approve(CONTRACTS.ORDER_BOOK, largeApproval);
        await approveTx.wait();
      }
      
      if (depositedBalance < cost) {
        const depositNeeded = cost - depositedBalance;
        setStatus('confirming');
        const depositTx = await orderBook.deposit(depositNeeded);
        await depositTx.wait();
      }
      
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
          errorMsg = 'Insufficient funds. Get test tokens first.';
        } else if (err.message.includes('user rejected')) {
          errorMsg = 'Transaction cancelled';
        } else {
          errorMsg = err.message.slice(0, 100);
        }
      }
      
      setError(errorMsg);
      setStatus('error');
      return false;
    }
  }, [walletProvider, address, refreshBalances, refreshPositions]);

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
