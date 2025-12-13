/**
 * useCachedActiveAuctions Hook
 *
 * Optimized hook for accessing active auctions list with intelligent caching.
 * TEMPORARY: Uses AAC directly while indexer event streaming is fixed.
 *
 * Features:
 * - Reads from centralized store (instant)
 * - Auto-fetches if data is missing or stale
 * - Optional polling with reference counting
 * - Stale-while-revalidate: shows cached data while fetching fresh data
 *
 * Usage:
 * ```tsx
 * const { auctions, loading, error, refetch, isStale } = useCachedActiveAuctions({
 *   offset: 0,
 *   limit: 20,
 *   aacApp,
 *   enablePolling: true
 * });
 * ```
 */

import { useEffect, useCallback, useState } from 'react';
import { useAuctionStore } from '@/store/auction-store';
import type { ApplicationClient } from 'linera-react-client';
import type { AuctionSummary } from '@/lib/gql/types';

export interface UseCachedActiveAuctionsOptions {
    /** Pagination offset */
    offset: number;
    /** Pagination limit */
    limit: number;
    /** The AAC (Auction Authority Chain) application client */
    aacApp: ApplicationClient | null;
    /** Enable automatic polling (default: false) */
    enablePolling?: boolean;
    /** Polling interval in milliseconds (default: 10000ms) */
    pollInterval?: number;
    /** Skip fetching (useful when conditionally loading) */
    skip?: boolean;
}

export interface UseCachedActiveAuctionsResult {
    /** List of active auctions */
    auctions: AuctionSummary[] | null;
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
    /** Manually refetch auctions */
    refetch: () => Promise<void>;
}

export function useCachedActiveAuctions(
    options: UseCachedActiveAuctionsOptions
): UseCachedActiveAuctionsResult {
    const {
        offset,
        limit,
        aacApp,
        enablePolling = false,
        pollInterval = 300000,
        skip = false
    } = options;

    // Subscribe to store
    const {
        activeAuctions,
        fetchActiveAuctions,
        isStale: checkIsStale,
        startPollingActiveAuctions
    } = useAuctionStore();

    // Local state for managing polling subscription
    const [_pollingUnsubscribe, setPollingUnsubscribe] = useState<(() => void) | null>(null);

    // Derived state
    const auctions = activeAuctions?.data ?? null;
    const loading = activeAuctions?.status === 'loading' && !auctions;
    const isFetching = activeAuctions?.status === 'loading';
    const error = activeAuctions?.error ?? null;
    const hasLoadedOnce = activeAuctions?.status === 'success' || auctions !== null;
    const isStale = checkIsStale('activeAuctions');

    /**
     * Fetch active auctions
     */
    const refetch = useCallback(async () => {
        if (!aacApp || skip) return;

        try {
            await fetchActiveAuctions(offset, limit, aacApp);
        } catch (err) {
            console.error('[useCachedActiveAuctions] Refetch failed:', err);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [aacApp, skip, offset, limit]);

    /**
     * Initial fetch - only run once when conditions are met
     */
    useEffect(() => {
        if (skip || !aacApp) return;

        // Only fetch if we have no data at all, or if data is stale AND not currently loading
        if ((!activeAuctions || isStale) && !isFetching) {
            refetch();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [skip, aacApp]);

    /**
     * Setup polling if enabled
     */
    useEffect(() => {
        if (!enablePolling || skip || !aacApp) {
            return;
        }

        // Start polling
        const unsubscribe = startPollingActiveAuctions(offset, limit, aacApp, pollInterval);
        setPollingUnsubscribe(() => unsubscribe);

        // Cleanup
        return () => {
            unsubscribe();
            setPollingUnsubscribe(null);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enablePolling, skip, aacApp, offset, limit, pollInterval]);

    return {
        auctions,
        loading,
        isFetching,
        error,
        hasLoadedOnce,
        isStale,
        refetch
    };
}
