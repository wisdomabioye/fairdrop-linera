/**
 * useCachedAllUserBids Hook
 *
 * Reads all user's bids across all auctions from centralized store with auto-fetch on stale/missing data.
 *
 * NOTE: No polling - refetch on mutation success (bid placed, claim, etc.)
 */

import { useEffect, useCallback, useRef } from 'react';
import { useAuctionStore } from '@/store/auction-store';
import { useSyncStatus } from '@/providers';
import { type ApplicationClient, useWalletConnection } from 'linera-react-client';
import type { BidRecord } from '@/lib/gql/types';

export interface UseCachedAllUserBidsOptions {
  aacApp: ApplicationClient | null;
  skip?: boolean;
}

export interface UseCachedAllUserBidsResult {
  totalQuantity: number | null;
  totalPaid: number | null;
  allUserBids: BidRecord[] | null;
  loading: boolean;
  isFetching: boolean;
  error: Error | null;
  status: 'idle' | 'loading' | 'success' | 'error';
  isStale: boolean;
  refetch: () => Promise<void>;
}

export function useCachedAllUserBids(
  options: UseCachedAllUserBidsOptions
): UseCachedAllUserBidsResult {
  const { aacApp, skip = false } = options;
  const { address = '' } = useWalletConnection();
  const { isWalletClientSyncing } = useSyncStatus();

  const {
    allUserBids: allUserBidsMap,
    fetchAllUserBids,
    isStale: checkIsStale
  } = useAuctionStore();

  // Use ref to track first load (no re-renders)
  const hasLoadedOnce = useRef(false);

  // Get cached entry
  const entry = allUserBidsMap.get(address);
  const allUserBids = entry?.data ?? null;
  const status = entry?.status ?? 'idle';
  const isFetching = status === 'loading';
  const error = entry?.error ?? null;
  const isStale = checkIsStale('allUserBids', address);

  // Track first successful load
  if ((status === 'success' || allUserBids) && !hasLoadedOnce.current) {
    hasLoadedOnce.current = true;
  }

  const loading =
    (status === 'loading' || isWalletClientSyncing || (status === 'idle' && !skip && !!aacApp && !!address)) &&
    !hasLoadedOnce.current;

  const refetch = useCallback(async () => {
    if (!aacApp || skip || !address || isWalletClientSyncing) return;
    try {
      await fetchAllUserBids(address, aacApp);
    } catch (err) {
      console.error('[useCachedAllUserBids] Refetch failed:', err);
    }
  }, [aacApp, skip, address, isWalletClientSyncing, fetchAllUserBids]);

  // Initial fetch
  useEffect(() => {
    if (skip || !aacApp || !address || isWalletClientSyncing) return;

    // Fetch if no entry, no data, or stale (and not already fetching)
    if ((!entry || !entry.data || isStale) && !isFetching) {
      refetch();
    }
  }, [skip, aacApp, address, isWalletClientSyncing, entry, isStale, isFetching, refetch]);

  return {
    totalQuantity: allUserBids?.reduce((prev, curr) => prev + curr.quantity, 0) ?? 0,
    totalPaid: allUserBids?.reduce((prev, curr) => prev + curr.amountPaid, 0) ?? 0,
    allUserBids,
    loading,
    isFetching,
    error,
    status,
    isStale,
    refetch,
  };
}
