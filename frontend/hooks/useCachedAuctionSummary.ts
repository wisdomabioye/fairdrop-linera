/**
 * useCachedAuctionSummary Hook
 *
 * Optimized hook for accessing auction summary with intelligent caching and polling.
 *
 * Features:
 * - Reads from centralized store (instant)
 * - Auto-fetches if data is missing or stale
 * - Automatic polling subscription with reference counting
 * - Stale-while-revalidate strategy
 *
 * Usage:
 * ```tsx
 * const { auction, loading, error, refetch, isStale } = useCachedAuctionSummary({
 *   auctionId: '1',
 *   indexerApp,
 *   enablePolling: true
 * });
 * ```
 */

import { useEffect, useCallback, useState } from 'react';
import { useAuctionStore } from '@/store/auction-store';
import { useSyncStatus } from '@/providers';
import type { ApplicationClient } from 'linera-react-client';
import type { AuctionSummary } from '@/lib/gql/types';

export interface UseCachedAuctionSummaryOptions {
    /** Auction ID to fetch */
    auctionId: string;
    /** The AAC application client */
    aacApp: ApplicationClient | null;
    /** Enable automatic polling (default: true for active auctions) */
    enablePolling?: boolean;
    /** Polling interval in milliseconds (default: 5000ms) */
    pollInterval?: number;
    /** Skip fetching (useful when conditionally loading) */
    skip?: boolean;
}

export interface UseCachedAuctionSummaryResult {
    /** Auction summary data */
    auction: AuctionSummary | null;
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
    /** Manually refetch auction */
    refetch: () => Promise<void>;
}

export function useCachedAuctionSummary(
    options: UseCachedAuctionSummaryOptions
): UseCachedAuctionSummaryResult {
    const {
        auctionId,
        aacApp,
        enablePolling = true,
        pollInterval = 5000,
        skip = false
    } = options;

    // Get sync status
    const { isPublicClientSyncing } = useSyncStatus();

    // Subscribe to store
    const {
        auctions,
        fetchAuctionSummary,
        isStale: checkIsStale,
        startPollingAuction
    } = useAuctionStore();

    // Get cached entry
    const entry = auctions.get(auctionId);

    // Local state for managing polling subscription
    const [_pollingUnsubscribe, setPollingUnsubscribe] = useState<(() => void) | null>(null);

    // Derived state
    const auction = entry?.data ?? null;
    const loading = entry?.status === 'loading' && !auction;
    const isFetching = entry?.status === 'loading';
    const error = entry?.error ?? null;
    const hasLoadedOnce = entry?.status === 'success' || auction !== null;
    const isStale = checkIsStale('auction', auctionId);

    /**
     * Fetch auction summary
     */
    const refetch = useCallback(async () => {
        if (!aacApp || skip || isPublicClientSyncing) return;

        try {
            await fetchAuctionSummary(auctionId, aacApp);
        } catch (err) {
            console.error('[useCachedAuctionSummary] Refetch failed:', err);
        }
    }, [aacApp, skip, isPublicClientSyncing, auctionId, fetchAuctionSummary]);

    /**
     * Initial fetch and refetch on stale
     */
    useEffect(() => {
        if (skip || !aacApp || isPublicClientSyncing) return;

        // Check if entry exists by reading from store directly
        const currentEntry = auctions.get(auctionId);

        // Fetch if no entry exists OR entry has no data OR data is stale
        // This handles initial load, failed fetches, and invalidated cache
        if (!currentEntry || !currentEntry.data || isStale) {
            refetch();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [skip, aacApp, auctionId, isPublicClientSyncing, isStale]);

    /**
     * Setup polling if enabled
     */
    useEffect(() => {
        if (!enablePolling || !aacApp || skip) {
            return;
        }

        // Start polling
        const unsubscribe = startPollingAuction(auctionId, aacApp, pollInterval);
        setPollingUnsubscribe(() => unsubscribe);

        // Cleanup
        return () => {
            unsubscribe();
            setPollingUnsubscribe(null);
        };
    }, [enablePolling, skip, aacApp, auctionId, pollInterval]);

    return {
        auction,
        loading,
        isFetching,
        error,
        hasLoadedOnce,
        isStale,
        refetch
    };
}
