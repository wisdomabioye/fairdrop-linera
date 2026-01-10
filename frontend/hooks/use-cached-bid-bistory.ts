/**
 * useCachedBidHistory Hook
 *
 * Optimized hook for accessing bid history with intelligent caching.
 *
 * Features:
 * - Reads from centralized store (instant)
 * - Auto-fetches if data is missing or stale
 * - Optional polling with reference counting
 * - Stale-while-revalidate strategy
 *
 * Usage:
 * ```tsx
 * const { bids, loading, error, refetch, isStale } = useCachedBidHistory({
 *   auctionId: '1',
 *   offset: 0,
 *   limit: 50,
 *   aacApp,
 *   enablePolling: true
 * });
 * ```
 */

import { useEffect, useCallback, useState } from 'react';
import { useAuctionStore } from '@/store/auction-store';
import { useSyncStatus } from '@/providers';
import type { ApplicationClient } from 'linera-react-client';
import type { BidRecord } from '@/lib/gql/types';

export interface UseCachedBidHistoryOptions {
    /** Auction ID */
    auctionId: string;
    /** Pagination offset */
    offset: number;
    /** Pagination limit */
    limit: number;
    /** The AAC (Auction Authority Chain) application client */
    aacApp: ApplicationClient | null;
    /** Enable automatic polling (default: false) */
    enablePolling?: boolean;
    /** Polling interval in milliseconds (default: 5000ms) */
    pollInterval?: number;
    /** Skip fetching (useful when conditionally loading) */
    skip?: boolean;
}

export interface UseCachedBidHistoryResult {
    /** List of bid records */
    bids: BidRecord[] | null;
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
    /** Manually refetch bid history */
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

    // Get sync status
    const { isPublicClientSyncing } = useSyncStatus();

    // Subscribe to store
    const {
        bidHistory,
        fetchBidHistory,
        isStale: checkIsStale,
        startPollingBidHistory
    } = useAuctionStore();

    // Local state for managing polling subscription
    const [_pollingUnsubscribe, setPollingUnsubscribe] = useState<(() => void) | null>(null);
    
    // Track if we've ever successfully loaded bid history for this auction
    const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

    // Get cached entry
    const entry = bidHistory.get(auctionId);

    // Derived state
    const bids = entry?.data ?? null;
    const status = entry?.status ?? 'idle';
    const isFetching = status === 'loading';
    const error = entry?.error ?? null;
    const isStale = checkIsStale('bidHistory', auctionId);

    // Update hasLoadedOnce when we get successful data
    useEffect(() => {
        if ((status === 'success' || bids) && !hasLoadedOnce) {
            setHasLoadedOnce(true);
        }
    }, [status, bids, hasLoadedOnce]);

    // CRITICAL: Only show loading on first load (before any data has been loaded)
    // Once data has been fetched once, never show full loading skeleton again
    // - First load: show skeleton
    // - Refetching with cached data: show data with isFetching indicator
    const loading = (
        (status === 'loading' || isPublicClientSyncing || (status === 'idle' && !skip && !!aacApp))
        && !hasLoadedOnce
    );

    /**
     * Fetch bid history
     */
    const refetch = useCallback(async () => {
        if (!aacApp || skip || isPublicClientSyncing) return;

        try {
            await fetchBidHistory(auctionId, offset, limit, aacApp);
        } catch (err) {
            console.error('[useCachedBidHistory] Refetch failed:', err);
        }
    }, [aacApp, skip, isPublicClientSyncing, auctionId, offset, limit, fetchBidHistory]);

    /**
     * Initial fetch and refetch on stale data
     * Wait for sync to complete before fetching
     */
    useEffect(() => {
        if (skip || !aacApp || isPublicClientSyncing) return;

        // Fetch if we have no data at all, or if data is stale AND not currently loading
        if ((!entry || isStale) && !isFetching) {
            refetch();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [skip, aacApp, isStale, isPublicClientSyncing]);

    /**
     * Setup polling if enabled
     */
    useEffect(() => {
        if (!enablePolling || skip || !aacApp) {
            return;
        }

        // Start polling
        const unsubscribe = startPollingBidHistory(auctionId, (bids?.length || 0), limit, aacApp, pollInterval);
        setPollingUnsubscribe(() => unsubscribe);

        // Cleanup
        return () => {
            unsubscribe();
            setPollingUnsubscribe(null);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enablePolling, skip, aacApp, auctionId, offset, limit, pollInterval]);

    return {
        bids,
        loading,
        isFetching,
        error,
        status,
        isStale,
        refetch
    };
}
