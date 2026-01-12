/**
 * useCachedSettledAuctions Hook
 *
 * Reads settled auctions from centralized store with auto-fetch on stale/missing data.
 * 
 * NOTE: Polling is managed by EagerLoader, not this hook.
 * Settled auctions rarely change, so polling is typically not needed.
 */

import { useEffect, useCallback, useRef } from 'react';
import { useAuctionStore } from '@/store/auction-store';
import type { ApplicationClient } from 'linera-react-client';
import type { AuctionSummary } from '@/lib/gql/types';

export interface UseCachedSettledAuctionsOptions {
  offset: number;
  limit: number;
  aacApp: ApplicationClient | null;
  skip?: boolean;
}

export interface UseCachedSettledAuctionsResult {
  auctions: AuctionSummary[] | null;
  loading: boolean;
  isFetching: boolean;
  error: Error | null;
  status: 'idle' | 'loading' | 'success' | 'error';
  isStale: boolean;
  refetch: () => Promise<void>;
}

export function useCachedSettledAuctions(
  options: UseCachedSettledAuctionsOptions
): UseCachedSettledAuctionsResult {
  const { offset, limit, aacApp, skip = false } = options;

  const {
    settledAuctions,
    allAuctionsCache,
    fetchSettledAuctions,
    isStale: checkIsStale
  } = useAuctionStore();

  // Use ref to track first load (no re-renders)
  const hasLoadedOnce = useRef(false);

  // Derive auctions from normalized cache
  const auctions = settledAuctions?.auctionIds
    ? settledAuctions.auctionIds
        .map(id => allAuctionsCache.get(id)?.data)
        .filter(Boolean) as AuctionSummary[]
    : null;

  const status = settledAuctions?.status ?? 'idle';
  const isFetching = status === 'loading';
  const error = settledAuctions?.error ?? null;
  const isStale = checkIsStale('settledAuctions');

  // Track first successful load
  if ((status === 'success' || auctions) && !hasLoadedOnce.current) {
    hasLoadedOnce.current = true;
  }

  const loading =
    (status === 'loading' || (status === 'idle' && !skip && !!aacApp)) &&
    !hasLoadedOnce.current;

  const refetch = useCallback(async () => {
    if (!aacApp || skip) return;
    try {
      await fetchSettledAuctions(offset, limit, aacApp);
    } catch (err) {
      console.error('[useCachedSettledAuctions] Refetch failed:', err);
    }
  }, [aacApp, skip, offset, limit, fetchSettledAuctions]);

  // Initial fetch
  useEffect(() => {
    if (skip || !aacApp) return;

    if ((!settledAuctions || isStale) && !isFetching) {
      refetch();
    }
  }, [skip, aacApp, settledAuctions, isStale, isFetching, refetch]);

  return {
    auctions,
    loading,
    isFetching,
    error,
    status,
    isStale,
    refetch,
  };
}
