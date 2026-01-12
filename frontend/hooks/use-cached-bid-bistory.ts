/**
 * useCachedBidHistory Hook
 *
 * Reads bid history from centralized store with auto-fetch and optional polling.
 * 
 * NOTE: This hook manages its own polling for individual auction bid history.
 * Bid history is per-auction and needs its own polling when viewing auction details.
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
    enablePolling = false,
    pollInterval = 5000,
    skip = false
  } = options;

  const { isPublicClientSyncing } = useSyncStatus();

  const {
    bidHistory,
    fetchBidHistory,
    isStale: checkIsStale,
    startPollingBidHistory
  } = useAuctionStore();

  // Use refs to avoid re-renders
  const hasLoadedOnce = useRef(false);
  const pollingUnsubscribe = useRef<(() => void) | null>(null);

  // Get cached entry
  const entry = bidHistory.get(auctionId);
  const bids = entry?.data ?? null;
  const status = entry?.status ?? 'idle';
  const isFetching = status === 'loading';
  const error = entry?.error ?? null;
  const isStale = checkIsStale('bidHistory', auctionId);

  // Track first successful load
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

  // Initial fetch
  useEffect(() => {
    if (skip || !aacApp || isPublicClientSyncing) return;

    if ((!entry || isStale) && !isFetching) {
      refetch();
    }
  }, [skip, aacApp, isStale, isPublicClientSyncing, entry, isFetching, refetch]);

  // Polling setup
  useEffect(() => {
    // Cleanup previous polling
    if (pollingUnsubscribe.current) {
      pollingUnsubscribe.current();
      pollingUnsubscribe.current = null;
    }

    if (!enablePolling || !aacApp || skip) {
      return;
    }

    // Start new polling
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
