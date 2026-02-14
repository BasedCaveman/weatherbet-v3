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

      const marketPromises = [];
      for (let i = 1; i <= marketCount; i++) {
        marketPromises.push(
          Promise.all([
            pool.getMarket(i),
            pool.getMarketStatus(i),
          ]).then(([info, status]) => ({
            id: i,
            // getMarket returns: (cityName, lat, lon, isRainMarket, historicalAvg, startTime, endTime)
            cityName: info.cityName,
            lat: Number(info.lat),
            lon: Number(info.lon),
            isRainMarket: info.isRainMarket,
            historicalAvg: Number(info.historicalAvg),
            startTime: Number(info.startTime),
            endTime: Number(info.endTime),
            // getMarketStatus returns: (yesPool, noPool, resolved, outcome, creator, cancelled, creatorEarnings)
            yesPool: status.yesPool,
            noPool: status.noPool,
            resolved: status.resolved,
            outcome: status.outcome,
            creator: status.creator,
            cancelled: status.cancelled,
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
        yesPct: Number(result.yesPct),
        noPct: Number(result.noPct),
        // Contract returns multiplier × 1e6 (PRECISION), so divide back
        yesMultiplier: Number(result.yesMultiplier) / 1e6,
        noMultiplier: Number(result.noMultiplier) / 1e6,
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
