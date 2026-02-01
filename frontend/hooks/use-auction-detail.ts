/**
 * useAuctionDetail Hook
 *
 * Composite hook that fetches auction detail data in a single batched request.
 * Combines: auctionInfo + bidHistory
 *
 * Benefits:
 * - Single API call instead of 2 separate calls
 * - Unified loading state
 * - Data arrives together (no UI flicker)
 * - Populates individual caches for backward compatibility
 */

import { useEffect, useCallback, useRef } from 'react';
import { useAuctionStore } from '@/store/auction-store';
import { useShallow } from 'zustand/react/shallow';
import { useSyncStatus } from '@/providers';
import type { ApplicationClient } from 'linera-react-client';
import type { AuctionSummary, BidRecord } from '@/lib/gql/types';

export interface UseAuctionDetailOptions {
  auctionId: string;
  bidOffset?: number;
  bidLimit?: number;
  aacApp: ApplicationClient | null;
  skip?: boolean;
  /** Enable polling - OFF by default */
  enablePolling?: boolean;
  /** Polling interval in ms (default: 5000) */
  pollInterval?: number;
}

export interface UseAuctionDetailResult {
  auction: AuctionSummary | null;
  bidHistory: BidRecord[] | null;
  loading: boolean;
  isFetching: boolean;
  error: Error | null;
  status: 'idle' | 'loading' | 'success' | 'error';
  isStale: boolean;
  refetch: () => Promise<void>;
}

export function useAuctionDetail(
  options: UseAuctionDetailOptions
): UseAuctionDetailResult {
  const {
    auctionId,
    bidOffset = 0,
    bidLimit = 50,
    aacApp,
    skip = false,
    enablePolling = false,
    pollInterval = 15_000
  } = options;

  const { isPublicClientSyncing } = useSyncStatus();

  const stringKey = String(auctionId);

  // Select only the specific data entries we need (not entire Maps)
  const {
    auctionEntry,
    bidHistoryEntry,
    batchMeta,
  } = useAuctionStore(
    useShallow((state) => ({
      auctionEntry: state.auctions.get(stringKey),
      bidHistoryEntry: state.bidHistory.get(stringKey),
      batchMeta: state.batchAuctionDetail.get(stringKey),
    }))
  );

  // Get stable function references separately (won't cause re-renders)
  const fetchAuctionDetailBatch = useAuctionStore((state) => state.fetchAuctionDetailBatch);
  const startPollingAuctionDetailBatch = useAuctionStore((state) => state.startPollingAuctionDetailBatch);
  const checkIsStale = useAuctionStore((state) => state.isStale);

  // Use refs to avoid re-renders
  const hasLoadedOnce = useRef(false);
  const pollingUnsubscribe = useRef<(() => void) | null>(null);

  const auction = auctionEntry?.data ?? null;
  const bidHistory = bidHistoryEntry?.data ?? null;

  // Use batch metadata for status (or derive from individual)
  const status = batchMeta?.status ?? 'idle';
  const isFetching = status === 'loading';
  const error = batchMeta?.error ?? null;
  const isStale = checkIsStale('batchAuctionDetail', stringKey);

  // Track first successful load
  if ((status === 'success' || (auction && bidHistory)) && !hasLoadedOnce.current) {
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
      await fetchAuctionDetailBatch(auctionId, bidOffset, bidLimit, aacApp, true);
    } catch (err) {
      console.error('[useAuctionDetail] Refetch failed:', err);
    }
  }, [aacApp, skip, isPublicClientSyncing, auctionId, bidOffset, bidLimit, fetchAuctionDetailBatch]);

  // Initial fetch
  useEffect(() => {
    if (skip || !aacApp || isPublicClientSyncing) return;

    if ((!batchMeta || isStale) && !isFetching) {
      fetchAuctionDetailBatch(auctionId, bidOffset, bidLimit, aacApp);
    }
  }, [skip, aacApp, isPublicClientSyncing, batchMeta, isStale, isFetching, auctionId, bidOffset, bidLimit, fetchAuctionDetailBatch]);

  // Polling setup with debounce to prevent rapid subscribe/unsubscribe cycles
  useEffect(() => {
    // Cleanup previous polling
    if (pollingUnsubscribe.current) {
      pollingUnsubscribe.current();
      pollingUnsubscribe.current = null;
    }

    if (!enablePolling || !aacApp || skip) {
      return;
    }

    // Debounce subscription start to batch rapid dependency changes
    const timeoutId = setTimeout(() => {
      pollingUnsubscribe.current = startPollingAuctionDetailBatch(
        auctionId,
        bidOffset,
        bidLimit,
        aacApp,
        pollInterval
      );
    }, 200);

    return () => {
      clearTimeout(timeoutId);
      if (pollingUnsubscribe.current) {
        pollingUnsubscribe.current();
        pollingUnsubscribe.current = null;
      }
    };
  }, [enablePolling, skip, aacApp, auctionId, bidOffset, bidLimit, pollInterval, startPollingAuctionDetailBatch]);

  return {
    auction,
    bidHistory,
    loading,
    isFetching,
    error,
    status,
    isStale,
    refetch,
  };
}
