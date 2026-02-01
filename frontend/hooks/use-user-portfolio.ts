/**
 * useUserPortfolio Hook
 *
 * Composite hook that fetches user portfolio data in a single batched request.
 * Combines: allUserBids + auctionsByCreator + userBalances
 *
 * Benefits:
 * - Single API call instead of 3 separate calls
 * - Unified loading state
 * - Data arrives together (no UI flicker)
 * - Populates individual caches for backward compatibility
 */

import { useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuctionStore } from '@/store/auction-store';
import { useShallow } from 'zustand/react/shallow';
import { useSyncStatus } from '@/providers';
import { type ApplicationClient, useWalletConnection } from 'linera-react-client';
import type { AuctionSummary, BidRecord } from '@/lib/gql/types';

export interface UseUserPortfolioOptions {
  tokenApps: string[];
  aacApp: ApplicationClient | null;
  skip?: boolean;
  /** Enable polling - OFF by default */
  enablePolling?: boolean;
  /** Polling interval in ms (default: 15000) */
  pollInterval?: number;
}

export interface UseUserPortfolioResult {
  allUserBids: BidRecord[] | null;
  totalQuantity: number;
  totalPaid: number;
  creatorAuctions: AuctionSummary[] | null;
  balances: Map<string, number> | null;
  loading: boolean;
  isFetching: boolean;
  error: Error | null;
  status: 'idle' | 'loading' | 'success' | 'error';
  isStale: boolean;
  refetch: () => Promise<void>;
  getBidsByAuctionId: (auctionId: string) => {
    bids: BidRecord[];
    totalPaid: number;
    totalQuantity: number;
  };
}

export function useUserPortfolio(
  options: UseUserPortfolioOptions
): UseUserPortfolioResult {
  const {
    tokenApps,
    aacApp,
    skip = false,
    enablePolling = false,
    pollInterval = 15000
  } = options;

  const { address = '' } = useWalletConnection();
  const { isPublicClientSyncing } = useSyncStatus();

  // Select only the specific data entries we need (not entire Maps)
  const {
    allUserBidsEntry,
    creatorEntry,
    userBalancesEntry,
    batchMeta,
  } = useAuctionStore(
    useShallow((state) => ({
      allUserBidsEntry: state.allUserBids.get(address),
      creatorEntry: state.auctionsByCreator.get(address),
      userBalancesEntry: state.userBalances.get(address),
      batchMeta: state.batchUserPortfolio.get(address),
    }))
  );

  // Select creator auction data from normalized cache
  const creatorAuctionIds = creatorEntry?.auctionIds;
  const creatorAuctionsData = useAuctionStore(
    useShallow((state) => {
      if (!creatorAuctionIds) return null;
      return creatorAuctionIds
        .map(id => state.allAuctionsCache.get(id)?.data)
        .filter(Boolean) as AuctionSummary[];
    })
  );

  // Get stable function references separately (won't cause re-renders)
  const fetchUserPortfolioBatch = useAuctionStore((state) => state.fetchUserPortfolioBatch);
  const startPollingUserPortfolioBatch = useAuctionStore((state) => state.startPollingUserPortfolioBatch);
  const checkIsStale = useAuctionStore((state) => state.isStale);

  // Use refs to avoid re-renders
  const hasLoadedOnce = useRef(false);
  const pollingUnsubscribe = useRef<(() => void) | null>(null);

  const allUserBids = allUserBidsEntry?.data ?? null;
  const balances = userBalancesEntry?.data ?? null;
  const creatorAuctions = creatorAuctionsData ?? null;

  // Calculate totals
  const totalQuantity = allUserBids?.reduce((prev, curr) => prev + curr.quantity, 0) ?? 0;
  const totalPaid = allUserBids?.reduce((prev, curr) => prev + curr.amountPaid, 0) ?? 0;

  // Use batch metadata for status
  const status = batchMeta?.status ?? 'idle';
  const isFetching = status === 'loading';
  const error = batchMeta?.error ?? null;
  const isStale = checkIsStale('batchUserPortfolio', address);

  // Track first successful load
  if ((status === 'success' || (allUserBids && creatorAuctions && balances)) && !hasLoadedOnce.current) {
    hasLoadedOnce.current = true;
  }

  // Only show loading skeleton on first load
  const loading =
    (status === 'loading' || isPublicClientSyncing || (status === 'idle' && !skip && !!aacApp && !!address)) &&
    !hasLoadedOnce.current;

  // Refetch callback
  const refetch = useCallback(async () => {
    if (!aacApp || skip || !address || isPublicClientSyncing || tokenApps.length === 0) return;
    try {
      await fetchUserPortfolioBatch(address, tokenApps, aacApp, true);
    } catch (err) {
      console.error('[useUserPortfolio] Refetch failed:', err);
    }
  }, [aacApp, skip, address, isPublicClientSyncing, tokenApps, fetchUserPortfolioBatch]);

  // Get bids for a specific auction
  const getBidsByAuctionId = useCallback((auctionId: string) => {
    if (!allUserBids) return { bids: [], totalPaid: 0, totalQuantity: 0 };
    const bids = allUserBids.filter(bid => bid.auctionId.toString() === auctionId);
    return {
      bids,
      totalPaid: bids.reduce((sum, bid) => sum + bid.amountPaid, 0),
      totalQuantity: bids.reduce((sum, bid) => sum + bid.quantity, 0),
    };
  }, [allUserBids]);

  // Initial fetch
  useEffect(() => {
    if (skip || !aacApp || !address || isPublicClientSyncing || tokenApps.length === 0) return;

    if ((!batchMeta || isStale) && !isFetching) {
      fetchUserPortfolioBatch(address, tokenApps, aacApp);
    }
  }, [skip, aacApp, address, isPublicClientSyncing, tokenApps, batchMeta, isStale, isFetching, fetchUserPortfolioBatch]);

  // Polling setup with debounce to prevent rapid subscribe/unsubscribe cycles
  useEffect(() => {
    // Cleanup previous polling
    if (pollingUnsubscribe.current) {
      pollingUnsubscribe.current();
      pollingUnsubscribe.current = null;
    }

    if (!enablePolling || !aacApp || !address || skip || tokenApps.length === 0) {
      return;
    }

    // Debounce subscription start to batch rapid dependency changes
    const timeoutId = setTimeout(() => {
      pollingUnsubscribe.current = startPollingUserPortfolioBatch(
        address,
        tokenApps,
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
  }, [enablePolling, skip, aacApp, address, tokenApps, pollInterval, startPollingUserPortfolioBatch]);

  return {
    allUserBids,
    totalQuantity,
    totalPaid,
    creatorAuctions,
    balances,
    loading,
    isFetching,
    error,
    status,
    isStale,
    refetch,
    getBidsByAuctionId,
  };
}
