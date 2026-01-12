/**
 * useCachedBidHistory Hook
 *
 * Reads bid history from centralized store with auto-fetch.
 * 
 * NOTE: Polling is OFF by default. Enable explicitly if needed.
 */

import { useEffect, useCallback, useRef } from 'react';
import { useAuctionStore } from '@/store/auction-store';
import { useSyncStatus } from '@/providers';
import type { ApplicationClient } from 'linera-react-client';
import type { BidRecord } from '@/lib/gql/types';

export interface UseCachedBidHistoryOptions {
  auctionId: string;
  offset: number;
  limit: number;
  aacApp: ApplicationClient | null;
  /** Enable polling - OFF by default */
  enablePolling?: boolean;
  pollInterval?: number;
  skip?: boolean;
}

export interface UseCachedBidHistoryResult {
  bids: BidRecord[] | null;
  loading: boolean;
  isFetching: boolean;
  error: Error | null;
  status: 'idle' | 'loading' | 'success' | 'error';
  isStale: boolean;
  refetch: () => Promise<void>;
}

export function useCachedBidHistory(
  options: UseCachedBidHistoryOptions
): UseCachedBidHistoryResult {
  const {
    auctionId,
    offset,
    limit,
    aacApp,
    enablePolling = false, // OFF by default
    pollInterval = 10000,  // 10s if enabled
    skip = false
  } = options;

  const { isPublicClientSyncing } = useSyncStatus();

  const {
    bidHistory,
    fetchBidHistory,
    isStale: checkIsStale,
    startPollingBidHistory
  } = useAuctionStore();

  const hasLoadedOnce = useRef(false);
  const pollingUnsubscribe = useRef<(() => void) | null>(null);

  const entry = bidHistory.get(auctionId);
  const bids = entry?.data ?? null;
  const status = entry?.status ?? 'idle';
  const isFetching = status === 'loading';
  const error = entry?.error ?? null;
  const isStale = checkIsStale('bidHistory', auctionId);

  if ((status === 'success' || bids) && !hasLoadedOnce.current) {
    hasLoadedOnce.current = true;
  }

  const loading =
    (status === 'loading' || isPublicClientSyncing || (status === 'idle' && !skip && !!aacApp)) &&
    !hasLoadedOnce.current;

  const refetch = useCallback(async () => {
    if (!aacApp || skip || isPublicClientSyncing) return;
    try {
      await fetchBidHistory(auctionId, offset, limit, aacApp);
    } catch (err) {
      console.error('[useCachedBidHistory] Refetch failed:', err);
    }
  }, [aacApp, skip, isPublicClientSyncing, auctionId, offset, limit, fetchBidHistory]);

  // Initial fetch only - no automatic refetch on stale
  useEffect(() => {
    if (skip || !aacApp || isPublicClientSyncing) return;

    // Only fetch if no data at all (not on stale)
    if (!entry && !isFetching) {
      refetch();
    }
  }, [skip, aacApp, isPublicClientSyncing, entry, isFetching, refetch]);

  // Polling setup - only if explicitly enabled
  useEffect(() => {
    // Cleanup previous
    if (pollingUnsubscribe.current) {
      pollingUnsubscribe.current();
      pollingUnsubscribe.current = null;
    }

    // Only start if explicitly enabled
    if (!enablePolling || !aacApp || skip) {
      return;
    }

    pollingUnsubscribe.current = startPollingBidHistory(auctionId, offset, limit, aacApp, pollInterval);

    return () => {
      if (pollingUnsubscribe.current) {
        pollingUnsubscribe.current();
        pollingUnsubscribe.current = null;
      }
    };
  }, [enablePolling, skip, aacApp, auctionId, offset, limit, pollInterval, startPollingBidHistory]);

  return {
    bids,
    loading,
    isFetching,
    error,
    status,
    isStale,
    refetch,
  };
}
