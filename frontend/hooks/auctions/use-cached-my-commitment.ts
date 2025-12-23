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
 *   uicApp
 * });
 * ```
 */

import { useEffect, useCallback, useMemo } from 'react';
import { useAuctionStore } from '@/store/auction-store';
import { useSyncStatus } from '@/providers';
import type { ApplicationClient } from 'linera-react-client';
import type { UserCommitment, SettlementResult } from '@/lib/gql/types';

export interface UseCachedMyCommitmentOptions {
    /** Auction ID */
    auctionId: string;
    /** The UIC (User Interaction Chain) application client */
    uicApp: ApplicationClient | null;
    /** Skip fetching (useful when conditionally loading) */
    skip?: boolean;
}

export interface UseCachedMyCommitmentResult {
    /** User's total committed quantity */
    totalQuantity: number | null;
    /** Settlement result (if auction is settled) */
    settlement: SettlementResult | null;
    /** Full commitment data */
    commitment: UserCommitment | null;
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
        uicApp,
        skip = false
    } = options;

    // Get user chain from UIC app (memoized to prevent infinite loops)
    const userChain = useMemo(
        () => uicApp?.walletClient?.getChainId() ?? '',
        [uicApp]
    );

    // Get sync status
    const { isWalletClientSyncing } = useSyncStatus();

    // Subscribe to store
    const {
        userCommitments,
        fetchMyCommitment,
        isStale: checkIsStale
    } = useAuctionStore();
    // Get cached entry
    const auctionMap = userCommitments.get(auctionId);
    const entry = auctionMap?.get(userChain);

    // Derived state
    const commitment = entry?.data ?? null;
    const totalQuantity = commitment?.totalQuantity ?? null;
    const settlement = commitment?.settlement ?? null;
    const loading = entry?.status === 'loading' && !commitment;
    const isFetching = entry?.status === 'loading';
    const error = entry?.error ?? null;
    const hasLoadedOnce = entry?.status === 'success' || commitment !== null;
    const isStale = checkIsStale('userCommitment', `${auctionId}:${userChain}`);

    /**
     * Fetch user commitment
     */
    const refetch = useCallback(async () => {
        if (!uicApp || skip || !userChain || isWalletClientSyncing) return;

        try {
            await fetchMyCommitment(auctionId, userChain, uicApp);
        } catch (err) {
            console.error('[useCachedMyCommitment] Refetch failed:', err);
        }
    }, [uicApp, skip, userChain, isWalletClientSyncing, auctionId, fetchMyCommitment]);

    /**
     * Initial fetch and refetch on stale
     */
    useEffect(() => {
        if (skip || !uicApp || !userChain || isWalletClientSyncing) return;

        // Check if entry exists by reading from store directly
        const auctionMap = userCommitments.get(auctionId);
        const currentEntry = auctionMap?.get(userChain);

        // Fetch if no entry exists OR entry has no data OR data is stale
        // This handles initial load, failed fetches, and invalidated cache
        if (!currentEntry || !currentEntry.data || isStale) {
            refetch();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [skip, uicApp, userChain, auctionId, isWalletClientSyncing, isStale]);

    return {
        totalQuantity,
        settlement,
        commitment,
        loading,
        isFetching,
        error,
        hasLoadedOnce,
        isStale,
        refetch
    };
}
