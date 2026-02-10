'use client';

import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, ORDER_BOOK_ABI, CHAIN_CONFIG } from '@/lib/contracts';

export interface Market {
  id: number;
  cityName: string;
  isRainMarket: boolean;
  startTime: number;
  endTime: number;
  historicalAvg: number;
  resolved: boolean;
  outcome: boolean;
  totalYesShares: bigint;
  totalNoShares: bigint;
}

export function useMarkets() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMarkets() {
      try {
        const provider = new ethers.JsonRpcProvider(CHAIN_CONFIG.rpcUrl);
        const contract = new ethers.Contract(
          CONTRACT_ADDRESSES.ORDER_BOOK,
          ORDER_BOOK_ABI,
          provider
        );

        const nextId = await contract.nextMarketId();
        const marketCount = Number(nextId) - 1;

        const marketPromises = [];
        for (let i = 1; i <= marketCount; i++) {
          marketPromises.push(contract.getMarket(i));
        }

        const marketData = await Promise.all(marketPromises);
        
        const formattedMarkets: Market[] = marketData.map((m, index) => ({
          id: index + 1,
          cityName: m.cityName,
          isRainMarket: m.isRainMarket,
          startTime: Number(m.startTime),
          endTime: Number(m.endTime),
          historicalAvg: Number(m.historicalAvg),
          resolved: m.resolved,
          outcome: m.outcome,
          totalYesShares: m.totalYesShares,
          totalNoShares: m.totalNoShares,
        }));

        setMarkets(formattedMarkets);
      } catch (err) {
        console.error('Error fetching markets:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch markets');
      } finally {
        setLoading(false);
      }
    }

    fetchMarkets();
  }, []);

  return { markets, loading, error };
}

export function useMarketPrices(marketId: number) {
  const [prices, setPrices] = useState({
    bestYesBid: 0,
    bestYesAsk: 0,
    bestNoBid: 0,
    bestNoAsk: 0,
  });

  useEffect(() => {
    async function fetchPrices() {
      try {
        const provider = new ethers.JsonRpcProvider(CHAIN_CONFIG.rpcUrl);
        const contract = new ethers.Contract(
          CONTRACT_ADDRESSES.ORDER_BOOK,
          ORDER_BOOK_ABI,
          provider
        );

        const result = await contract.getBestPrices(marketId);
        setPrices({
          bestYesBid: Number(result.bestYesBid) / 1e6,
          bestYesAsk: Number(result.bestYesAsk) / 1e6,
          bestNoBid: Number(result.bestNoBid) / 1e6,
          bestNoAsk: Number(result.bestNoAsk) / 1e6,
        });
      } catch (err) {
        console.error('Error fetching prices:', err);
      }
    }

    if (marketId > 0) {
      fetchPrices();
    }
  }, [marketId]);

  return prices;
}
