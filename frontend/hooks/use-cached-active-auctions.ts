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
import { useSyncStatus } from '@/providers';
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
    /** Fetch status: 'idle' | 'loading' | 'success' | 'error' */
    status: 'idle' | 'loading' | 'success' | 'error';
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
        enablePolling = true,
        pollInterval = 5000,
        skip = false
    } = options;

    const { isPublicClientSyncing } = useSyncStatus();

    // Subscribe to store
    const {
        activeAuctions,
        allAuctionsCache,
        fetchActiveAuctions,
        isStale: checkIsStale,
        // startPollingActiveAuctions
    } = useAuctionStore();

    // Local state for managing polling subscription
    const [_pollingUnsubscribe, setPollingUnsubscribe] = useState<(() => void) | null>(null);

    // Derived state - map IDs to full auction data from normalized cache
    const auctions = activeAuctions?.auctionIds
        ? activeAuctions.auctionIds
            .map(id => allAuctionsCache.get(id)?.data)
            .filter(Boolean) as AuctionSummary[]
        : null;
    const status = activeAuctions?.status ?? 'idle';
    const isFetching = status === 'loading';
    const error = activeAuctions?.error ?? null;
    const isStale = checkIsStale('activeAuctions');

    // CRITICAL: Distinguish initial load vs unavailable data
    // status === 'idle' && auctions === null → Initial load (show loading)
    // status === 'success' && auctions === null → Fetched but no data (show empty state)
    // status === 'error' → Failed (show error)
    const loading = (
        status === 'loading' ||
        isPublicClientSyncing ||
        (status === 'idle' && !skip && !!aacApp)
    );

    /**
     * Fetch active auctions
     */
    const refetch = useCallback(async () => {
        if (!aacApp || skip || isPublicClientSyncing) return;

        try {
            await fetchActiveAuctions(offset, limit, aacApp);
        } catch (err) {
            console.error('[useCachedActiveAuctions] Refetch failed:', err);
        }
    }, [aacApp, skip, isPublicClientSyncing, offset, limit, fetchActiveAuctions]);

    /**
     * Initial fetch and refetch on stale data
     * Wait for sync to complete before fetching
     */
    useEffect(() => {
        if (skip || !aacApp || isPublicClientSyncing) return;

        // Fetch if we have no data at all, or if data is stale AND not currently loading
        if ((!activeAuctions || isStale) && !isFetching) {
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
        // const unsubscribe = startPollingActiveAuctions(offset, limit, aacApp, pollInterval);
        // setPollingUnsubscribe(() => unsubscribe);

        // Cleanup
        return () => {
            // unsubscribe();
            setPollingUnsubscribe(null);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enablePolling, skip, aacApp, offset, limit, pollInterval]);

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
