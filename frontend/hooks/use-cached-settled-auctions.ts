/**
 * useCachedSettledAuctions Hook
 *
 * Optimized hook for accessing settled auctions list with intelligent caching.
 *
 * Features:
 * - Reads from centralized store (instant)
 * - Auto-fetches if data is missing or stale
 * - Optional polling (disabled by default - settled auctions are immutable)
 * - Stale-while-revalidate: shows cached data while fetching fresh data
 *
 * Usage:
 * ```tsx
 * const { auctions, loading, error, refetch, isStale } = useCachedSettledAuctions({
 *   offset: 0,
 *   limit: 20,
 *   indexerApp
 * });
 * ```
 */

import { useEffect, useCallback, useState } from 'react';
import { useAuctionStore } from '@/store/auction-store';
import type { ApplicationClient } from 'linera-react-client';
import type { AuctionSummary } from '@/lib/gql/types';

export interface UseCachedSettledAuctionsOptions {
    /** Pagination offset */
    offset: number;
    /** Pagination limit */
    limit: number;
    /** The AAC (Auction Authority Chain) application client */
    aacApp: ApplicationClient | null;
    /** Enable automatic polling (default: false - settled auctions don't change) */
    enablePolling?: boolean;
    /** Polling interval in milliseconds (default: 60000ms / 1 minute) */
    pollInterval?: number;
    /** Skip fetching (useful when conditionally loading) */
    skip?: boolean;
}

export interface UseCachedSettledAuctionsResult {
    /** List of settled auctions */
    auctions: AuctionSummary[] | null;
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
    /** Manually refetch auctions */
    refetch: () => Promise<void>;
}

export function useCachedSettledAuctions(
    options: UseCachedSettledAuctionsOptions
): UseCachedSettledAuctionsResult {
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
        settledAuctions,
        allAuctionsCache,
        fetchSettledAuctions,
        isStale: checkIsStale
    } = useAuctionStore();

    // Local state for polling interval
    const [_pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

    // Derived state - map IDs to full auction data from normalized cache
    const auctions = settledAuctions?.auctionIds
        ? settledAuctions.auctionIds
            .map(id => allAuctionsCache.get(id)?.data)
            .filter(Boolean) as AuctionSummary[]
        : null;
    const status = settledAuctions?.status ?? 'idle';
    const isFetching = status === 'loading';
    const error = settledAuctions?.error ?? null;
    const isStale = checkIsStale('settledAuctions');

    // CRITICAL: Distinguish initial load vs unavailable data
    const loading = (
        status === 'loading' ||
        (status === 'idle' && !skip && !!aacApp)
    );

    /**
     * Fetch settled auctions
     */
    const refetch = useCallback(async () => {
        if (!aacApp || skip) return;
        console.log('aacApp', aacApp)

        try {
            await fetchSettledAuctions(offset, limit, aacApp);
        } catch (err) {
            console.error('[useCachedSettledAuctions] Refetch failed:', err);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [aacApp, skip, offset, limit]);

    /**
     * Initial fetch - only run once when conditions are met
     */
    useEffect(() => {
        if (skip || !aacApp) return;

        // Only fetch if we have no data at all, or if data is stale AND not currently loading
        if ((!settledAuctions || isStale) && !isFetching) {
            refetch();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [skip, aacApp]);

    /**
     * Setup polling if enabled
     * Note: Polling is typically not needed for settled auctions since they're immutable
     */
    useEffect(() => {
        if (!enablePolling || skip || !aacApp) {
            return;
        }

        // Start polling using setInterval
        const interval = setInterval(() => {
            refetch();
        }, pollInterval);

        setPollingInterval(interval);

        // Cleanup
        return () => {
            clearInterval(interval);
            setPollingInterval(null);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enablePolling, skip, pollInterval]);

    return {
        auctions,
        loading,
        isFetching,
        error,
        status,
        isStale,
        refetch
    };
}
