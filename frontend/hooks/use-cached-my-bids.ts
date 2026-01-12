/**
 * useCachedUserBidRecord Hook
 *
 * Reads user's bid record from centralized store with auto-fetch on stale/missing data.
 * 
 * NOTE: No polling - refetch on mutation success (bid placed, claim, etc.)
 */

import { useEffect, useCallback, useRef } from 'react';
import { useAuctionStore } from '@/store/auction-store';
import { useSyncStatus } from '@/providers';
import { type ApplicationClient, useWalletConnection } from 'linera-react-client';
import type { BidRecord } from '@/lib/gql/types';

export interface UseCachedUserBidRecordOptions {
  auctionId: string;
  aacApp: ApplicationClient | null;
  skip?: boolean;
}

export interface UseCachedUserBidRecordResult {
  totalQuantity: number | null;
  totalPaid: number | null;
  userBidRecord: BidRecord[] | null;
  loading: boolean;
  isFetching: boolean;
  error: Error | null;
  status: 'idle' | 'loading' | 'success' | 'error';
  isStale: boolean;
  refetch: () => Promise<void>;
}

export function useCachedUserBidRecord(
  options: UseCachedUserBidRecordOptions
): UseCachedUserBidRecordResult {
  const { auctionId, aacApp, skip = false } = options;
  const { address = '' } = useWalletConnection();
  const { isWalletClientSyncing } = useSyncStatus();

  const {
    userBids,
    fetchUserBids,
    isStale: checkIsStale
  } = useAuctionStore();

  // Use ref to track first load (no re-renders)
  const hasLoadedOnce = useRef(false);

  // Get cached entry
  const auctionMap = userBids.get(auctionId);
  const entry = auctionMap?.get(address);
  const userBidRecord = entry?.data ?? null;
  const status = entry?.status ?? 'idle';
  const isFetching = status === 'loading';
  const error = entry?.error ?? null;
  const isStale = checkIsStale('userBids', `${auctionId}:${address}`);

  // Track first successful load
  if ((status === 'success' || userBidRecord) && !hasLoadedOnce.current) {
    hasLoadedOnce.current = true;
  }

  const loading =
    (status === 'loading' || isWalletClientSyncing || (status === 'idle' && !skip && !!aacApp && !!address)) &&
    !hasLoadedOnce.current;

  const refetch = useCallback(async () => {
    if (!aacApp || skip || !address || isWalletClientSyncing) return;
    try {
      await fetchUserBids(auctionId, address, aacApp);
    } catch (err) {
      console.error('[useCachedUserBidRecord] Refetch failed:', err);
    }
  }, [aacApp, skip, address, isWalletClientSyncing, auctionId, fetchUserBids]);

  // Initial fetch
  useEffect(() => {
    if (skip || !aacApp || !address || isWalletClientSyncing) return;

    // Fetch if no entry, no data, or stale (and not already fetching)
    if ((!entry || !entry.data || isStale) && !isFetching) {
      refetch();
    }
  }, [skip, aacApp, address, isWalletClientSyncing, entry, isStale, isFetching, refetch]);

  return {
    totalQuantity: userBidRecord?.reduce((prev, curr) => prev + curr.quantity, 0) ?? 0,
    totalPaid: userBidRecord?.reduce((prev, curr) => prev + curr.amountPaid, 0) ?? 0,
    userBidRecord,
    loading,
    isFetching,
    error,
    status,
    isStale,
    refetch,
  };
}
