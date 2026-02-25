'use client';

import { useEffect, useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, POOL_ABI, CHAIN_CONFIG, USDM_DECIMALS } from '../lib/contracts';

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
            cityName: info[0],            // cityName
            lat: Number(info[1]),          // lat
            lon: Number(info[2]),          // lon
            isRainMarket: info[3],         // isRainMarket
            historicalAvg: Number(info[4]),// historicalAvg
            startTime: Number(info[5]),   // startTime
            endTime: Number(info[6]),     // endTime
            yesPool: status[0],           // yesPool (bigint)
            noPool: status[1],            // noPool (bigint)
            resolved: status[2],          // resolved
            outcome: status[3],           // outcome
            creator: status[4],           // creator
            cancelled: status[5],         // cancelled
          }))
        );
      }

      const fetchedMarkets = await Promise.all(marketPromises);

// Sort: active first (by time remaining), then resolved/cancelled at bottom
fetchedMarkets.sort((a, b) => {
  const now = Date.now() / 1000;
  const aActive = !a.resolved && !a.cancelled && a.endTime > now;
  const bActive = !b.resolved && !b.cancelled && b.endTime > now;

  // Active markets first
  if (aActive && !bActive) return -1;
  if (!aActive && bActive) return 1;

  // Within active: soonest ending first
  if (aActive && bActive) return a.endTime - b.endTime;

  // Within resolved: most recent first
  return b.id - a.id;
});

setMarkets(fetchedMarkets);

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
        // Contract returns multiplier * 100 (e.g. 200 = 2.00x)
        yesMultiplier: Number(result[2]) / 100,
        noMultiplier: Number(result[3]) / 100,
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
