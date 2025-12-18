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
    const [isRefetching, setIsRefetching] = useState(false);

    // Derived state
    const auction = entry?.data ?? null;
    const isFetching = entry?.status === 'loading';
    const error = entry?.error ?? null;
    const hasLoadedOnce = entry?.status === 'success' || auction !== null;
    const isStale = checkIsStale('auction', auctionId);

    // Loading state: show loading if no data exists AND (currently fetching OR syncing OR will fetch soon)
    const loading = !auction && (
        entry?.status === 'loading' ||
        isRefetching ||
        isPublicClientSyncing ||
        (!hasLoadedOnce && !skip && !!aacApp) // Initial load state
    );

    /**
     * Fetch auction summary
     */
    const refetch = useCallback(async () => {
        if (!aacApp || skip || isPublicClientSyncing) return;

        try {
            setIsRefetching(true);
            await fetchAuctionSummary(auctionId, aacApp);
        } catch (err) {
            console.error('[useCachedAuctionSummary] Refetch failed:', err);
        } finally {
            setIsRefetching(false);
        }
    }, [aacApp, skip, isPublicClientSyncing, auctionId, fetchAuctionSummary]);

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
