'use client';

import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { useAppKitProvider, useAppKitAccount } from '@reown/appkit/react';

// Contract addresses
const CONTRACT_ADDRESSES = {
  USDM: '0x4605821e41B3e95C78C2e3871bc4597a0939189A',
  ORDER_BOOK: '0xcAA2bdD4A51702AaB56dE268E178f822CEC9F104',
};

// ABIs (minimal for what we need)
const USDM_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function mint(address to, uint256 amount)',
  'function decimals() view returns (uint8)',
];

const ORDER_BOOK_ABI = [
  'function deposit(uint256 amount)',
  'function withdraw(uint256 amount)',
  'function placeOrder(uint256 marketId, bool isYes, uint256 price, uint256 shares) returns (uint256)',
  'function cancelOrder(uint256 orderId)',
  'function claimWinnings(uint256 marketId) returns (uint256)',
  'function balances(address user) view returns (uint256)',
  'function getPosition(uint256 marketId, address user) view returns (uint256 yesShares, uint256 noShares)',
];

export type BetStatus = 'idle' | 'connecting' | 'approving' | 'depositing' | 'placing' | 'success' | 'error';

export function useBetting() {
  const { walletProvider } = useAppKitProvider('eip155');
  const { address, isConnected } = useAppKitAccount();
  
  const [status, setStatus] = useState<BetStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  // Get user's USDm balance
  const getUsdmBalance = useCallback(async (): Promise<bigint> => {
    if (!walletProvider || !address) return BigInt(0);
    
    try {
      const provider = new ethers.BrowserProvider(walletProvider as any);
      const usdm = new ethers.Contract(CONTRACT_ADDRESSES.USDM, USDM_ABI, provider);
      return await usdm.balanceOf(address);
    } catch (err) {
      console.error('Error getting balance:', err);
      return BigInt(0);
    }
  }, [walletProvider, address]);

  // Get user's deposited balance in OrderBook
  const getDepositedBalance = useCallback(async (): Promise<bigint> => {
    if (!walletProvider || !address) return BigInt(0);
    
    try {
      const provider = new ethers.BrowserProvider(walletProvider as any);
      const orderBook = new ethers.Contract(CONTRACT_ADDRESSES.ORDER_BOOK, ORDER_BOOK_ABI, provider);
      return await orderBook.balances(address);
    } catch (err) {
      console.error('Error getting deposited balance:', err);
      return BigInt(0);
    }
  }, [walletProvider, address]);

  // Mint test USDm tokens (only works on testnet)
  const mintTestTokens = useCallback(async (amount: bigint): Promise<boolean> => {
    if (!walletProvider || !address) return false;
    
    try {
      setStatus('approving');
      const provider = new ethers.BrowserProvider(walletProvider as any);
      const signer = await provider.getSigner();
      const usdm = new ethers.Contract(CONTRACT_ADDRESSES.USDM, USDM_ABI, signer);
      
      const tx = await usdm.mint(address, amount);
      await tx.wait();
      
      setStatus('idle');
      return true;
    } catch (err) {
      console.error('Error minting:', err);
      setError('Failed to mint test tokens');
      setStatus('error');
      return false;
    }
  }, [walletProvider, address]);

  // Deposit USDm into OrderBook
  const deposit = useCallback(async (amount: bigint): Promise<boolean> => {
    if (!walletProvider || !address) return false;
    
    try {
      const provider = new ethers.BrowserProvider(walletProvider as any);
      const signer = await provider.getSigner();
      
      // First approve
      setStatus('approving');
      const usdm = new ethers.Contract(CONTRACT_ADDRESSES.USDM, USDM_ABI, signer);
      const allowance = await usdm.allowance(address, CONTRACT_ADDRESSES.ORDER_BOOK);
      
      if (allowance < amount) {
        const approveTx = await usdm.approve(CONTRACT_ADDRESSES.ORDER_BOOK, amount);
        await approveTx.wait();
      }
      
      // Then deposit
      setStatus('depositing');
      const orderBook = new ethers.Contract(CONTRACT_ADDRESSES.ORDER_BOOK, ORDER_BOOK_ABI, signer);
      const depositTx = await orderBook.deposit(amount);
      await depositTx.wait();
      
      setStatus('idle');
      return true;
    } catch (err) {
      console.error('Error depositing:', err);
      setError('Failed to deposit');
      setStatus('error');
      return false;
    }
  }, [walletProvider, address]);

  // Place a bet (order)
  const placeBet = useCallback(async (
    marketId: number,
    isYes: boolean,
    priceInCents: number, // 1-99 (probability %)
    amountUsdm: bigint
  ): Promise<boolean> => {
    if (!walletProvider || !address) {
      setError('Please connect your wallet');
      setStatus('error');
      return false;
    }
    
    try {
      setStatus('connecting');
      const provider = new ethers.BrowserProvider(walletProvider as any);
      const signer = await provider.getSigner();
      
      // Check deposited balance
      const orderBook = new ethers.Contract(CONTRACT_ADDRESSES.ORDER_BOOK, ORDER_BOOK_ABI, signer);
      const depositedBalance = await orderBook.balances(address);
      
      // If not enough deposited, we need to deposit first
      const price = BigInt(priceInCents) * BigInt(10000); // Convert to 6 decimals (0.01 = 10000)
      const shares = (amountUsdm * BigInt(1000000)) / price;
      const cost = (shares * price) / BigInt(1000000);
      
      if (depositedBalance < cost) {
        // Need to deposit more
        const usdm = new ethers.Contract(CONTRACT_ADDRESSES.USDM, USDM_ABI, signer);
        const walletBalance = await usdm.balanceOf(address);
        
        if (walletBalance < cost) {
          // Need to mint test tokens first
          setStatus('approving');
          const mintTx = await usdm.mint(address, cost * BigInt(2)); // Mint extra
          await mintTx.wait();
        }
        
        // Approve and deposit
        setStatus('approving');
        const allowance = await usdm.allowance(address, CONTRACT_ADDRESSES.ORDER_BOOK);
        if (allowance < cost) {
          const approveTx = await usdm.approve(CONTRACT_ADDRESSES.ORDER_BOOK, cost * BigInt(10));
          await approveTx.wait();
        }
        
        setStatus('depositing');
        const depositTx = await orderBook.deposit(cost);
        await depositTx.wait();
      }
      
      // Place the order
      setStatus('placing');
      const tx = await orderBook.placeOrder(marketId, isYes, price, shares);
      const receipt = await tx.wait();
      
      setTxHash(receipt.hash);
      setStatus('success');
      return true;
    } catch (err: any) {
      console.error('Error placing bet:', err);
      setError(err.message || 'Failed to place bet');
      setStatus('error');
      return false;
    }
  }, [walletProvider, address]);

  // Reset state
  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
    setTxHash(null);
  }, []);

  return {
    isConnected,
    address,
    status,
    error,
    txHash,
    placeBet,
    deposit,
    mintTestTokens,
    getUsdmBalance,
    getDepositedBalance,
    reset,
  };
}
