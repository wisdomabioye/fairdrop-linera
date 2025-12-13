/**
 * useCachedBidHistory Hook
 *
 * Optimized hook for accessing bid history with intelligent caching.
 *
 * Features:
 * - Reads from centralized store (instant)
 * - Longer TTL (30s) since bid history changes less frequently
 * - Auto-fetches if data is missing or stale
 * - Stale-while-revalidate strategy
 *
 * Usage:
 * ```tsx
 * const { bids, loading, error, refetch, isStale } = useCachedBidHistory({
 *   auctionId: '1',
 *   offset: 0,
 *   limit: 50,
 *   indexerApp
 * });
 * ```
 */

import { useEffect, useCallback } from 'react';
import { useAuctionStore } from '@/store/auction-store';
import type { ApplicationClient } from 'linera-react-client';
import type { BidRecord } from '@/lib/gql/types';

export interface UseCachedBidHistoryOptions {
    /** Auction ID */
    auctionId: string;
    /** Pagination offset */
    offset: number;
    /** Pagination limit */
    limit: number;
    /** The indexer application client */
    indexerApp: ApplicationClient | null;
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
    /** Has loaded at least once? */
    hasLoadedOnce: boolean;
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
        indexerApp,
        skip = false
    } = options;

    // Subscribe to store
    const {
        bidHistory,
        indexerInitialized,
        fetchBidHistory,
        isStale: checkIsStale
    } = useAuctionStore();

    // Get cached entry
    const entry = bidHistory.get(auctionId);

    // Derived state
    const bids = entry?.data ?? null;
    const loading = entry?.status === 'loading' && !bids;
    const isFetching = entry?.status === 'loading';
    const error = entry?.error ?? null;
    const hasLoadedOnce = entry?.status === 'success' || bids !== null;
    const isStale = checkIsStale('bidHistory', auctionId);

    /**
     * Fetch bid history
     */
    const refetch = useCallback(async () => {
        if (!indexerInitialized || !indexerApp || skip) return;

        try {
            await fetchBidHistory(auctionId, offset, limit, indexerApp);
        } catch (err) {
            console.error('[useCachedBidHistory] Refetch failed:', err);
        }
    }, [indexerInitialized, indexerApp, skip, auctionId, offset, limit, fetchBidHistory]);

    /**
     * Initial fetch
     */
    useEffect(() => {
        if (skip || !indexerInitialized || !indexerApp) return;

        // Fetch if no data or stale
        if (!entry || isStale) {
            refetch();
        }
    }, [skip, indexerInitialized, indexerApp, auctionId, isStale]);

    return {
        bids,
        loading,
        isFetching,
        error,
        hasLoadedOnce,
        isStale,
        refetch
    };
}
