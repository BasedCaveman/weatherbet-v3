'use client';

import { useEffect, useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, POOL_ABI, CHAIN_CONFIG } from '../lib/contracts';

export interface Market {
  id: number;
  cityName: string;
  lat: number;
  lon: number;
  isRainMarket: boolean;
  historicalAvg: number;
  startTime: number;
  endTime: number;
  yesPool: bigint;
  noPool: bigint;
  resolved: boolean;
  outcome: boolean;
  creator: string;
  cancelled: boolean;
}

export interface MarketOdds {
  yesPct: number;
  noPct: number;
  yesMultiplier: number;
  noMultiplier: number;
}

export function useMarkets() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMarkets = useCallback(async () => {
    try {
      setLoading(true);
      const provider = new ethers.JsonRpcProvider(CHAIN_CONFIG.rpcUrl);
      const pool = new ethers.Contract(CONTRACT_ADDRESSES.POOL, POOL_ABI, provider);

      const nextId = await pool.nextMarketId();
      const marketCount = Number(nextId) - 1;

      if (marketCount <= 0) {
        setMarkets([]);
        setLoading(false);
        return;
      }

      // Fetch BOTH getMarket and getMarketStatus for each market
      const marketPromises = [];
      for (let i = 1; i <= marketCount; i++) {
        marketPromises.push(
          Promise.all([
            pool.getMarket(i),
            pool.getMarketStatus(i),
          ]).then(([info, status]) => ({
            id: i,
            // getMarket returns: (cityName, lat, lon, isRainMarket, historicalAvg, startTime, endTime)
            cityName: info[0],
            lat: Number(info[1]),
            lon: Number(info[2]),
            isRainMarket: info[3],
            historicalAvg: Number(info[4]),
            startTime: Number(info[5]),
            endTime: Number(info[6]),
            // getMarketStatus returns: (yesPool, noPool, resolved, outcome, creator, cancelled, creatorEarnings)
            yesPool: BigInt(status[0].toString()),
            noPool: BigInt(status[1].toString()),
            resolved: status[2],
            outcome: status[3],
            creator: status[4],
            cancelled: status[5],
          }))
        );
      }

      const fetchedMarkets = await Promise.all(marketPromises);
      setMarkets(fetchedMarkets);
      setError(null);
    } catch (err) {
      console.error('Error fetching markets:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch markets');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMarkets();
  }, [fetchMarkets]);

  return { markets, loading, error, refetchMarkets: fetchMarkets };
}

export function useMarketOdds(marketId: number) {
  const [odds, setOdds] = useState<MarketOdds>({
    yesPct: 50,
    noPct: 50,
    yesMultiplier: 2,
    noMultiplier: 2,
  });

  const fetchOdds = useCallback(async () => {
    if (marketId <= 0) return;

    try {
      const provider = new ethers.JsonRpcProvider(CHAIN_CONFIG.rpcUrl);
      const pool = new ethers.Contract(CONTRACT_ADDRESSES.POOL, POOL_ABI, provider);

      const result = await pool.getOdds(marketId);
      setOdds({
        yesPct: Number(result[0]),
        noPct: Number(result[1]),
        // Contract returns multiplier × 1e6 (PRECISION)
        yesMultiplier: Number(result[2]) / 1e6,
        noMultiplier: Number(result[3]) / 1e6,
      });
    } catch (err) {
      console.error('Error fetching odds:', err);
    }
  }, [marketId]);

  useEffect(() => {
    fetchOdds();
  }, [fetchOdds]);

  return { odds, refetchOdds: fetchOdds };
}

