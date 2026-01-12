/**
 * useCachedAuctionSummary Hook
 *
 * Reads individual auction from cache with auto-fetch and optional polling.
 * 
 * NOTE: This hook manages its own polling for individual auction pages.
 * EagerLoader handles list polling, but individual auctions need their own.
 */

import { useEffect, useCallback, useRef } from 'react';
import { useAuctionStore } from '@/store/auction-store';
import { useSyncStatus } from '@/providers';
import type { ApplicationClient } from 'linera-react-client';
import type { AuctionSummary } from '@/lib/gql/types';

export interface UseCachedAuctionSummaryOptions {
  auctionId: string;
  aacApp: ApplicationClient | null;
  enablePolling?: boolean;
  pollInterval?: number;
  skip?: boolean;
}

export interface UseCachedAuctionSummaryResult {
  auction: AuctionSummary | null;
  loading: boolean;
  isFetching: boolean;
  error: Error | null;
  status: 'idle' | 'loading' | 'success' | 'error';
  isStale: boolean;
  refetch: () => Promise<void>;
}

export function useCachedAuctionSummary(
  options: UseCachedAuctionSummaryOptions
): UseCachedAuctionSummaryResult {
  const {
    auctionId,
    aacApp,
    enablePolling = false,
    pollInterval = 5000,
    skip = false
  } = options;

  const { isPublicClientSyncing } = useSyncStatus();

  const {
    auctions,
    fetchAuctionSummary,
    isStale: checkIsStale,
    startPollingAuction
  } = useAuctionStore();

  // Use refs to avoid re-renders
  const hasLoadedOnce = useRef(false);
  const pollingUnsubscribe = useRef<(() => void) | null>(null);

  // Get cached entry
  const entry = auctions.get(auctionId);
  const auction = entry?.data ?? null;
  const status = entry?.status ?? 'idle';
  const isFetching = status === 'loading';
  const error = entry?.error ?? null;
  const isStale = checkIsStale('auction', auctionId);

  // Track first successful load
  if ((status === 'success' || auction) && !hasLoadedOnce.current) {
    hasLoadedOnce.current = true;
  }

  // Only show loading skeleton on first load
  const loading =
    (status === 'loading' || isPublicClientSyncing || (status === 'idle' && !skip && !!aacApp)) &&
    !hasLoadedOnce.current;

  // Refetch callback
  const refetch = useCallback(async () => {
    if (!aacApp || skip || isPublicClientSyncing) return;
    try {
      await fetchAuctionSummary(auctionId, aacApp);
    } catch (err) {
      console.error('[useCachedAuctionSummary] Refetch failed:', err);
    }
  }, [aacApp, skip, isPublicClientSyncing, auctionId, fetchAuctionSummary]);

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
    pollingUnsubscribe.current = startPollingAuction(auctionId, aacApp, pollInterval);

    return () => {
      if (pollingUnsubscribe.current) {
        pollingUnsubscribe.current();
        pollingUnsubscribe.current = null;
      }
    };
  }, [enablePolling, skip, aacApp, auctionId, pollInterval, startPollingAuction]);

  return {
    auction,
    loading,
    isFetching,
    error,
    status,
    isStale,
    refetch
  };
}
