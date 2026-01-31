/**
 * useCachedUserBalances Hook
 *
 * Reads user balances from centralized store with auto-fetch on stale/missing data.
 * Uses batched query for all tokens at once.
 * Supports optional polling (enabled by default).
 */

import { useEffect, useCallback, useRef } from 'react';
import { useAuctionStore } from '@/store/auction-store';
import { useSyncStatus } from '@/providers';
import type { ApplicationClient } from 'linera-react-client';

export interface UseCachedUserBalancesOptions {
  address: string;
  tokenApps: string[];
  aacApp: ApplicationClient | null;
  skip?: boolean;
  /** Enable polling - ON by default */
  enablePolling?: boolean;
  /** Polling interval in ms (default: 15000) */
  pollInterval?: number;
}

export interface UseCachedUserBalancesResult {
  balances: Map<string, number> | null;
  loading: boolean;
  isFetching: boolean;
  error: Error | null;
  status: 'idle' | 'loading' | 'success' | 'error';
  isStale: boolean;
  refetch: () => Promise<void>;
}

export function useCachedUserBalances(
  options: UseCachedUserBalancesOptions
): UseCachedUserBalancesResult {
  const {
    address,
    tokenApps,
    aacApp,
    skip = false,
    enablePolling = true,
    pollInterval = 15000
  } = options;

  const { isPublicClientSyncing } = useSyncStatus();

  const {
    userBalances,
    invalidateAndRefreshUserBalances,
    startPollingUserBalances,
    isStale: checkIsStale
  } = useAuctionStore();

  // Use ref to track first load (no re-renders)
  const hasLoadedOnce = useRef(false);
  const pollingUnsubscribe = useRef<(() => void) | null>(null);

  // Get cached entry
  const entry = userBalances.get(address);
  const balances = entry?.data ?? null;
  const status = entry?.status ?? 'idle';
  const isFetching = status === 'loading';
  const error = entry?.error ?? null;
  const isStale = checkIsStale('userBalances', address);

  // Track first successful load
  if ((status === 'success' || balances) && !hasLoadedOnce.current) {
    hasLoadedOnce.current = true;
  }

  const loading =
    (status === 'loading' || isPublicClientSyncing || (status === 'idle' && !skip && !!aacApp && tokenApps.length > 0)) &&
    !hasLoadedOnce.current;

  const refetch = useCallback(async () => {
    if (!aacApp || skip || isPublicClientSyncing || tokenApps.length === 0) return;
    try {
      await invalidateAndRefreshUserBalances(address, tokenApps, aacApp);
    } catch (err) {
      console.error('[useCachedUserBalances] Refetch failed:', err);
    }
  }, [aacApp, skip, isPublicClientSyncing, address, tokenApps, invalidateAndRefreshUserBalances]);

  // Initial fetch
  useEffect(() => {
    if (skip || !aacApp || isPublicClientSyncing || tokenApps.length === 0) return;

    if ((!entry || isStale) && !isFetching) {
      refetch();
    }
  }, [skip, aacApp, isStale, isPublicClientSyncing, tokenApps.length, entry, isFetching, refetch]);

  // Polling setup - enabled by default
  useEffect(() => {
    // Cleanup previous
    if (pollingUnsubscribe.current) {
      pollingUnsubscribe.current();
      pollingUnsubscribe.current = null;
    }

    if (!enablePolling || !aacApp || !address || skip || tokenApps.length === 0) {
      return;
    }

    pollingUnsubscribe.current = startPollingUserBalances(address, tokenApps, aacApp, pollInterval);

    return () => {
      if (pollingUnsubscribe.current) {
        pollingUnsubscribe.current();
        pollingUnsubscribe.current = null;
      }
    };
  }, [enablePolling, skip, aacApp, address, tokenApps, pollInterval, startPollingUserBalances]);

  return {
    balances,
    loading,
    isFetching,
    error,
    status,
    isStale,
    refetch,
  };
}
