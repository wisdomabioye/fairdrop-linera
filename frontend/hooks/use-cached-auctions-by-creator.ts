/**
 * useCachedAuctionsByCreator Hook
 *
 * Reads creator's auctions from centralized store with auto-fetch on stale/missing data.
 * 
 * NOTE: Polling is managed by EagerLoader, not this hook.
 * This hook only reads from cache and triggers initial fetch if needed.
 */

import { useEffect, useCallback, useRef } from 'react';
import { useAuctionStore } from '@/store/auction-store';
import { useSyncStatus } from '@/providers';
import type { ApplicationClient } from 'linera-react-client';
import type { AuctionSummary } from '@/lib/gql/types';

export interface UseCachedAuctionsByCreatorOptions {
  creator: string;
  aacApp: ApplicationClient | null;
  skip?: boolean;
}

export interface UseCachedAuctionsByCreatorResult {
  auctions: AuctionSummary[] | null;
  loading: boolean;
  isFetching: boolean;
  error: Error | null;
  status: 'idle' | 'loading' | 'success' | 'error';
  isStale: boolean;
  refetch: () => Promise<void>;
}

export function useCachedAuctionsByCreator(
  options: UseCachedAuctionsByCreatorOptions
): UseCachedAuctionsByCreatorResult {
  const { creator, aacApp, skip = false } = options;

  const { isPublicClientSyncing } = useSyncStatus();

  const {
    auctionsByCreator,
    allAuctionsCache,
    fetchAuctionsByCreator,
    isStale: checkIsStale
  } = useAuctionStore();

  // Use ref to track first load (no re-renders)
  const hasLoadedOnce = useRef(false);
  // Track if this is initial mount to force fetch
  const isInitialMount = useRef(true);

  // Get auctions for this specific creator
  const creatorEntry = creator ? auctionsByCreator.get(creator) : null;

  // Derive auctions from normalized cache
  const auctions = creatorEntry?.auctionIds
    ? creatorEntry.auctionIds
        .map(id => allAuctionsCache.get(id)?.data)
        .filter(Boolean) as AuctionSummary[]
    : null;

  const status = creatorEntry?.status ?? 'idle';
  const isFetching = status === 'loading';
  const error = creatorEntry?.error ?? null;
  const isStale = checkIsStale('auctionsByCreator', creator);

  // Track first successful load
  if ((status === 'success' || auctions) && !hasLoadedOnce.current) {
    hasLoadedOnce.current = true;
  }

  const loading =
    (status === 'loading' || (status === 'idle' && !skip && !!aacApp && !!creator)) &&
    !hasLoadedOnce.current;

  const refetch = useCallback(async () => {
    if (!aacApp || skip || !creator || isPublicClientSyncing) return;
    try {
      await fetchAuctionsByCreator(creator, aacApp);
    } catch (err) {
      console.error('[useCachedAuctionsByCreator] Refetch failed:', err);
    }
  }, [aacApp, skip, creator, isPublicClientSyncing, fetchAuctionsByCreator]);

  // Initial fetch - always fetch on first mount to get fresh data
  useEffect(() => {
    if (skip || !aacApp || !creator || isPublicClientSyncing) return;

    // Always fetch on initial mount (handles navigation from create page)
    // After that, only fetch if stale or no data
    if (isInitialMount.current || !creatorEntry || isStale) {
      isInitialMount.current = false;
      if (!isFetching) {
        refetch();
      }
    }
  }, [skip, aacApp, creator, isPublicClientSyncing, creatorEntry, isStale, isFetching, refetch]);

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
