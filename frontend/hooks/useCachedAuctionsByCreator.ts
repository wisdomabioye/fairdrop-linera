/**
 * useCachedAuctionsByCreator Hook
 *
 * Optimized hook for accessing auctions created by a specific user with intelligent caching.
 *
 * Features:
 * - Reads from centralized store (instant)
 * - Auto-fetches if data is missing or stale
 * - Optional polling with custom interval
 * - Stale-while-revalidate: shows cached data while fetching fresh data
 *
 * Usage:
 * ```tsx
 * const { auctions, loading, error, refetch } = useCachedAuctionsByCreator({
 *   creator: userAddress,
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

export interface UseCachedAuctionsByCreatorOptions {
    /** Creator's chain address */
    creator: string;
    /** Pagination offset */
    offset: number;
    /** Pagination limit */
    limit: number;
    /** The indexer application client */
    indexerApp: ApplicationClient | null;
    /** Enable automatic polling (default: false) */
    enablePolling?: boolean;
    /** Polling interval in milliseconds (default: 30000ms / 30 seconds) */
    pollInterval?: number;
    /** Skip fetching (useful when conditionally loading) */
    skip?: boolean;
}

export interface UseCachedAuctionsByCreatorResult {
    /** List of auctions created by this creator */
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

export function useCachedAuctionsByCreator(
    options: UseCachedAuctionsByCreatorOptions
): UseCachedAuctionsByCreatorResult {
    const {
        creator,
        offset,
        limit,
        indexerApp,
        enablePolling = false,
        pollInterval = 300000,
        skip = false
    } = options;

    // Subscribe to store
    const {
        auctionsByCreator,
        indexerInitialized,
        fetchAuctionsByCreator,
        isStale: checkIsStale
    } = useAuctionStore();

    // Local state for polling interval
    const [_pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

    // Get auctions for this specific creator
    const creatorAuctions = auctionsByCreator.get(creator) ?? null;

    // Derived state
    const auctions = creatorAuctions?.data ?? null;
    const loading = creatorAuctions?.status === 'loading' && !auctions;
    const isFetching = creatorAuctions?.status === 'loading';
    const error = creatorAuctions?.error ?? null;
    const hasLoadedOnce = creatorAuctions?.status === 'success' || auctions !== null;
    const isStale = checkIsStale('auctionsByCreator', creator);

    /**
     * Fetch auctions by creator
     */
    const refetch = useCallback(async () => {
        if (!indexerInitialized || !indexerApp || skip || !creator) return;

        try {
            await fetchAuctionsByCreator(creator, offset, limit, indexerApp);
        } catch (err) {
            console.error('[useCachedAuctionsByCreator] Refetch failed:', err);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [indexerInitialized, indexerApp, skip, creator, offset, limit]);

    /**
     * Initial fetch - only run once when conditions are met
     */
    useEffect(() => {
        if (skip || !indexerInitialized || !indexerApp || !creator) return;

        // Only fetch if we have no data at all, or if data is stale AND not currently loading
        if ((!creatorAuctions || isStale) && !isFetching) {
            refetch();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [skip, indexerInitialized, indexerApp, creator]);

    /**
     * Setup polling if enabled
     */
    useEffect(() => {
        if (!enablePolling || skip || !indexerInitialized || !indexerApp || !creator) {
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
    }, [enablePolling, skip, indexerInitialized, indexerApp, creator, pollInterval]);

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
