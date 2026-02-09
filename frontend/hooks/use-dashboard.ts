/**
 * useDashboard Hook
 *
 * Composite hook that fetches dashboard data in a single batched request.
 * Combines: allAuctions + globalStats
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
import type { AuctionSummary, AuctionGlobalStats } from '@/lib/gql/types';

export interface UseDashboardOptions {
  offset?: number;
  limit?: number;
  aacApp: ApplicationClient | null;
  skip?: boolean;
  /** Enable polling - ON by default for dashboard */
  enablePolling?: boolean;
  /** Polling interval in ms (default: 10000) */
  pollInterval?: number;
}

export interface UseDashboardResult {
  allAuctions: AuctionSummary[] | null;
  activeAuctions: AuctionSummary[] | null;
  globalStats: AuctionGlobalStats | null;
  loading: boolean;
  isFetching: boolean;
  error: Error | null;
  status: 'idle' | 'loading' | 'success' | 'error';
  isStale: boolean;
  refetch: () => Promise<void>;
}

export function useDashboard(
  options: UseDashboardOptions
): UseDashboardResult {
  const {
    offset = 0,
    limit = 100,
    aacApp,
    skip = false,
    enablePolling = false,
    pollInterval = 10000
  } = options;

  const { isPublicClientSyncing } = useSyncStatus();

  // Select only the specific data entries we need (not entire Maps)
  const {
    allAuctionsEntry,
    activeAuctionsEntry,
    globalStatsEntry,
    batchDashboard,
  } = useAuctionStore(
    useShallow((state) => ({
      allAuctionsEntry: state.allAuctions,
      activeAuctionsEntry: state.activeAuctions,
      globalStatsEntry: state.globalStats,
      batchDashboard: state.batchDashboard,
    }))
  );

  // Select all auction data from normalized cache
  const allAuctionIds = allAuctionsEntry?.auctionIds;
  const allAuctionsData = useAuctionStore(
    useShallow((state) => {
      if (!allAuctionIds) return null;
      return allAuctionIds
        .map(id => state.allAuctionsCache.get(id)?.data)
        .filter(Boolean) as AuctionSummary[];
    })
  );

  // Select active auction data from normalized cache
  const activeAuctionIds = activeAuctionsEntry?.auctionIds;
  const activeAuctionsData = useAuctionStore(
    useShallow((state) => {
      if (!activeAuctionIds) return null;
      return activeAuctionIds
        .map(id => state.allAuctionsCache.get(id)?.data)
        .filter(Boolean) as AuctionSummary[];
    })
  );

  // Get stable function references separately (won't cause re-renders)
  const fetchDashboardBatch = useAuctionStore((state) => state.fetchDashboardBatch);
  const startPollingDashboardBatch = useAuctionStore((state) => state.startPollingDashboardBatch);
  const checkIsStale = useAuctionStore((state) => state.isStale);

  // Use refs to avoid re-renders
  const hasLoadedOnce = useRef(false);
  const pollingUnsubscribe = useRef<(() => void) | null>(null);

  const allAuctions = allAuctionsData ?? null;
  const activeAuctions = activeAuctionsData ?? null;
  const globalStats = globalStatsEntry?.data ?? null;

  // Use batch metadata for status
  const status = batchDashboard?.status ?? 'idle';
  const isFetching = status === 'loading';
  const error = batchDashboard?.error ?? null;
  const isStale = checkIsStale('batchDashboard');

  // Track first successful load
  if ((status === 'success' || (activeAuctions && globalStats)) && !hasLoadedOnce.current) {
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
      await fetchDashboardBatch(offset, limit, aacApp, true);
    } catch (err) {
      console.error('[useDashboard] Refetch failed:', err);
    }
  }, [aacApp, skip, isPublicClientSyncing, offset, limit, fetchDashboardBatch]);

  // Initial fetch - runs on mount and when explicitly invalidated by SyncProvider
  useEffect(() => {
    if (skip || !aacApp || isPublicClientSyncing) return;

    // Fetch if no data yet, or if explicitly invalidated (timestamp = 0)
    // const isInvalidated = batchDashboard?.timestamp === 0;
    if ((!batchDashboard /* || isInvalidated */ || isStale) && !isFetching) {
      fetchDashboardBatch(offset, limit, aacApp);
    }
  }, [skip, aacApp, isPublicClientSyncing, batchDashboard, isStale, isFetching, offset, limit, fetchDashboardBatch]);

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
      pollingUnsubscribe.current = startPollingDashboardBatch(
        offset,
        limit,
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
  }, [enablePolling, skip, aacApp, offset, limit, pollInterval, startPollingDashboardBatch]);

  return {
    allAuctions,
    activeAuctions,
    globalStats,
    loading,
    isFetching,
    error,
    status,
    isStale,
    refetch,
  };
}
