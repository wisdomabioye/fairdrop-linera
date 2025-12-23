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

import { useEffect, useCallback } from 'react';
import { useAuctionStore } from '@/store/auction-store';
import { useSyncStatus } from '@/providers';
import { type ApplicationClient, useWalletConnection } from 'linera-react-client';
import type { BidRecord } from '@/lib/gql/types';

export interface UseCachedMyCommitmentOptions {
    /** Auction ID */
    auctionId: string;
    /** The UIC (User Interaction Chain) application client */
    aacApp: ApplicationClient | null;
    /** Skip fetching (useful when conditionally loading) */
    skip?: boolean;
}

export interface UseCachedMyCommitmentResult {
    /** User's total committed quantity */
    totalQuantity: number | null;
    /** Full commitment data */
    userBids: BidRecord[] | null;
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
    /** Manually refetch commitment */
    refetch: () => Promise<void>;
}

export function useCachedMyCommitment(
    options: UseCachedMyCommitmentOptions
): UseCachedMyCommitmentResult {
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
    // Get cached entry
    const auctionMap = userBids.get(auctionId);
    const entry = auctionMap?.get(address);

    // Derived state
    const commitment = entry?.data ?? null;
    const totalQuantity = commitment?.totalQuantity ?? null;
    const loading = entry?.status === 'loading' && !commitment;
    const isFetching = entry?.status === 'loading';
    const error = entry?.error ?? null;
    const hasLoadedOnce = entry?.status === 'success' || commitment !== null;
    const isStale = checkIsStale('userCommitment', `${auctionId}:${address}`);

    /**
     * Fetch user commitment
     */
    const refetch = useCallback(async () => {
        if (!aacApp || skip || !address || isClientSyncing) return;

        try {
            await fetchUserBids(auctionId, address, aacApp);
        } catch (err) {
            console.error('[useCachedMyCommitment] Refetch failed:', err);
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
        totalQuantity,
        userBids,
        loading,
        isFetching,
        error,
        hasLoadedOnce,
        isStale,
        refetch
    };
}
