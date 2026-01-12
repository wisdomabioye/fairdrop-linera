/**
 * useCachedMyCommitment Hook
 *
 * Optimized hook for accessing user's auction commitment with intelligent caching.
 *
 * Features:
 * - Reads from centralized store (instant)
 * - Auto-fetches if data is missing or stale
 * - Automatic invalidation on buy/claim mutations
 * - Stale-while-revalidate strategy
 *
 * Usage:
 * ```tsx
 * const { commitment, settlement, loading, error, refetch } = useCachedMyCommitment({
 *   auctionId: '1',
 *   aacApp
 * });
 * ```
 */

import { useEffect, useCallback, useState } from 'react';
import { useAuctionStore } from '@/store/auction-store';
import { useSyncStatus } from '@/providers';
import { type ApplicationClient, useWalletConnection } from 'linera-react-client';
import type { BidRecord } from '@/lib/gql/types';

export interface UseCachedUserBidRecordOptions {
    /** Auction ID */
    auctionId: string;
    /** The UIC (User Interaction Chain) application client */
    aacApp: ApplicationClient | null;
    /** Skip fetching (useful when conditionally loading) */
    skip?: boolean;
}

export interface UseCachedUserBidRecordResult {
    /** User's total committed quantity */
    totalQuantity: number | null;
    /** Total Amount Paid */
    totalPaid: number | null;
    /** User bid data for this auction */
    userBidRecord: BidRecord[] | null;
    /** Is initial loading? (only true on very first fetch) */
    loading: boolean;
    /** Is currently fetching? (may be true while showing cached data) */
    isFetching: boolean;
    /** Any errors */
    error: Error | null;
    /** Fetch status: 'idle' | 'loading' | 'success' | 'error' */
    status: 'idle' | 'loading' | 'success' | 'error';
    /** Is cached data stale? */
    isStale: boolean;
    /** Manually refetch commitment */
    refetch: () => Promise<void>;
}

export function useCachedUserBidRecord(
    options: UseCachedUserBidRecordOptions
): UseCachedUserBidRecordResult {
    const {
        auctionId,
        aacApp,
        skip = false
    } = options;
    const { address = '' } = useWalletConnection();
    // Get sync status
    const { isClientSyncing } = useSyncStatus();

    // Subscribe to store
    const {
        userBids,
        fetchUserBids,
        isStale: checkIsStale
    } = useAuctionStore();
    
    // Track if we've ever successfully loaded user bids for this auction
    const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
    
    // Get cached entry
    const auctionMap = userBids.get(auctionId);
    const entry = auctionMap?.get(address);

    // Derived state
    const userBidRecord = entry?.data ?? null;
    const status = entry?.status ?? 'idle';
    const isFetching = status === 'loading';
    const error = entry?.error ?? null;
    const isStale = checkIsStale('userBids', `${auctionId}:${address}`);

    // Update hasLoadedOnce when we get successful data
    useEffect(() => {
        if ((status === 'success' || userBidRecord) && !hasLoadedOnce) {
            setHasLoadedOnce(true);
        }
    }, [status, userBidRecord, hasLoadedOnce]);

    // CRITICAL: Only show loading on first load (before any data has been loaded)
    // Once data has been fetched once, never show full loading skeleton again
    // - First load: show skeleton
    // - Refetching with cached data: show data with isFetching indicator
    const loading = (
        (status === 'loading' || isClientSyncing || (status === 'idle' && !skip && !!aacApp && !!address))
        && !hasLoadedOnce
    );

    /**
     * Fetch user commitment
     */
    const refetch = useCallback(async () => {
        if (!aacApp || skip || !address || isClientSyncing) return;

        try {
            await fetchUserBids(auctionId, address, aacApp);
        } catch (err) {
            console.error('[useCachedMyBids] Refetch failed:', err);
        }
    }, [aacApp, skip, address, isClientSyncing, auctionId, fetchUserBids]);

    /**
     * Initial fetch and refetch on stale
     */
    useEffect(() => {
        if (skip || !aacApp || !address || isClientSyncing) return;

        // Check if entry exists by reading from store directly
        const auctionMap = userBids.get(auctionId);
        const currentEntry = auctionMap?.get(address);

        // Fetch if no entry exists OR entry has no data OR data is stale
        // This handles initial load, failed fetches, and invalidated cache
        if (!currentEntry || !currentEntry.data || isStale) {
            refetch();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [skip, aacApp, address, auctionId, isClientSyncing, isStale]);

    return {
        totalQuantity: userBidRecord?.reduce((prev, curr) => prev + curr.quantity, 0) ?? 0,
        totalPaid: userBidRecord?.reduce((prev, curr) => prev + curr.amountPaid, 0) ?? 0,
        userBidRecord,
        loading,
        isFetching,
        error,
        status,
        isStale,
        refetch
    };
}
