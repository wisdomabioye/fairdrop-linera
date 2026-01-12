/**
 * useCachedGlobalStats Hook
 *
 * Reads global auction stats from centralized store with auto-fetch on stale/missing data.
 * Supports optional polling.
 */

import { useEffect, useCallback, useRef } from 'react';
import { useAuctionStore } from '@/store/auction-store';
import { useSyncStatus } from '@/providers';
import type { ApplicationClient } from 'linera-react-client';
import type { AuctionGlobalStats } from '@/lib/gql/types';

export interface UseCachedGlobalStatsOptions {
  aacApp: ApplicationClient | null;
  skip?: boolean;
  /** Enable polling for stats updates */
  enablePolling?: boolean;
  /** Polling interval in ms (default: 30000) */
  pollInterval?: number;
}

export interface UseCachedGlobalStatsResult {
  stats: AuctionGlobalStats | null;
  loading: boolean;
  isFetching: boolean;
  error: Error | null;
  status: 'idle' | 'loading' | 'success' | 'error';
  isStale: boolean;
  refetch: () => Promise<void>;
}

export function useCachedGlobalStats(
  options: UseCachedGlobalStatsOptions
): UseCachedGlobalStatsResult {
  const { 
    aacApp, 
    skip = false,
    enablePolling = false,
    pollInterval = 30000
  } = options;

  const { isPublicClientSyncing } = useSyncStatus();

  const {
    globalStats,
    fetchGlobalStats,
    startPollingGlobalStats,
    isStale: checkIsStale,
  } = useAuctionStore();

  const hasLoadedOnce = useRef(false);
  const pollingUnsubscribe = useRef<(() => void) | null>(null);

  const stats = globalStats?.data ?? null;
  const status = globalStats?.status ?? 'idle';
  const isFetching = status === 'loading';
  const error = globalStats?.error ?? null;
  const isStale = checkIsStale('globalStats');

  // Track first successful load
  if ((status === 'success' || stats) && !hasLoadedOnce.current) {
    hasLoadedOnce.current = true;
  }

  const loading =
    (status === 'loading' || isPublicClientSyncing || (status === 'idle' && !skip && !!aacApp)) &&
    !hasLoadedOnce.current;

  const refetch = useCallback(async () => {
    if (!aacApp || skip || isPublicClientSyncing) return;
    try {
      await fetchGlobalStats(aacApp, true);
    } catch (err) {
      console.error('[useCachedGlobalStats] Refetch failed:', err);
    }
  }, [aacApp, skip, isPublicClientSyncing, fetchGlobalStats]);

  // Initial fetch
  useEffect(() => {
    if (skip || !aacApp || isPublicClientSyncing) return;

    if ((!globalStats || isStale) && !isFetching) {
      fetchGlobalStats(aacApp);
    }
  }, [skip, aacApp, isStale, isPublicClientSyncing, globalStats, isFetching, fetchGlobalStats]);

  // Polling setup
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

    pollingUnsubscribe.current = startPollingGlobalStats(aacApp, pollInterval);

    return () => {
      if (pollingUnsubscribe.current) {
        pollingUnsubscribe.current();
        pollingUnsubscribe.current = null;
      }
    };
  }, [enablePolling, skip, aacApp, pollInterval, startPollingGlobalStats]);

  return {
    stats,
    loading,
    isFetching,
    error,
    status,
    isStale,
    refetch,
  };
}
