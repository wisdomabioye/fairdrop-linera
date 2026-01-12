/**
 * useCachedActiveAuctions Hook
 *
 * Reads active auctions from centralized store with auto-fetch on stale/missing data.
 * 
 * NOTE: Polling is managed by EagerLoader, not this hook.
 * This hook only reads from cache and triggers initial fetch if needed.
 */

import { useEffect, useCallback, useRef } from 'react';
import { useAuctionStore } from '@/store/auction-store';
import { useSyncStatus } from '@/providers';
import type { ApplicationClient } from 'linera-react-client';
import type { AuctionSummary } from '@/lib/gql/types';

export interface UseCachedActiveAuctionsOptions {
  offset: number;
  limit: number;
  aacApp: ApplicationClient | null;
  skip?: boolean;
}

export interface UseCachedActiveAuctionsResult {
  auctions: AuctionSummary[] | null;
  loading: boolean;
  isFetching: boolean;
  error: Error | null;
  status: 'idle' | 'loading' | 'success' | 'error';
  isStale: boolean;
  refetch: () => Promise<void>;
}

export function useCachedActiveAuctions(
  options: UseCachedActiveAuctionsOptions
): UseCachedActiveAuctionsResult {
  const { offset, limit, aacApp, skip = false } = options;

  const { isPublicClientSyncing } = useSyncStatus();

  const {
    activeAuctions,
    allAuctionsCache,
    fetchActiveAuctions,
    isStale: checkIsStale,
  } = useAuctionStore();

  // Use ref to track first load (no re-renders)
  const hasLoadedOnce = useRef(false);

  // Derive auctions from normalized cache
  const auctions = activeAuctions?.auctionIds
    ? activeAuctions.auctionIds
        .map(id => allAuctionsCache.get(id)?.data)
        .filter(Boolean) as AuctionSummary[]
    : null;

  const status = activeAuctions?.status ?? 'idle';
  const isFetching = status === 'loading';
  const error = activeAuctions?.error ?? null;
  const isStale = checkIsStale('activeAuctions');

  // Track first successful load
  if ((status === 'success' || auctions) && !hasLoadedOnce.current) {
    hasLoadedOnce.current = true;
  }

  const loading =
    (status === 'loading' || isPublicClientSyncing || (status === 'idle' && !skip && !!aacApp)) &&
    !hasLoadedOnce.current;

  const refetch = useCallback(async () => {
    if (!aacApp || skip || isPublicClientSyncing) return;
    try {
      await fetchActiveAuctions(offset, limit, aacApp);
    } catch (err) {
      console.error('[useCachedActiveAuctions] Refetch failed:', err);
    }
  }, [aacApp, skip, isPublicClientSyncing, offset, limit, fetchActiveAuctions]);

  // Initial fetch
  useEffect(() => {
    if (skip || !aacApp || isPublicClientSyncing) return;

    if ((!activeAuctions || isStale) && !isFetching) {
      refetch();
    }
  }, [skip, aacApp, isStale, isPublicClientSyncing, activeAuctions, isFetching, refetch]);

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
