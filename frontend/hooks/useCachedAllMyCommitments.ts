/**
 * useCachedAllMyCommitments Hook
 *
 * Optimized hook for accessing all user's auction commitments with intelligent caching.
 *
 * Features:
 * - Reads from centralized store (instant)
 * - Auto-fetches if data is missing or stale
 * - Automatic invalidation on buy/claim mutations
 * - Stale-while-revalidate strategy
 *
 * Usage:
 * ```tsx
 * const { commitments, loading, error, refetch } = useCachedAllMyCommitments({
 *   uicApp
 * });
 * ```
 */

import { useEffect, useCallback, useMemo } from 'react';
import { useAuctionStore } from '@/store/auction-store';
import type { ApplicationClient } from 'linera-react-client';
import type { AuctionCommitment } from '@/lib/gql/types';

export interface UseCachedAllMyCommitmentsOptions {
    /** The UIC (User Interaction Chain) application client */
    uicApp: ApplicationClient | null;
    /** Skip fetching (useful when conditionally loading) */
    skip?: boolean;
}

export interface UseCachedAllMyCommitmentsResult {
    /** All user's auction commitments */
    commitments: AuctionCommitment[] | null;
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
    /** Manually refetch commitments */
    refetch: () => Promise<void>;
}

export function useCachedAllMyCommitments(
    options: UseCachedAllMyCommitmentsOptions
): UseCachedAllMyCommitmentsResult {
    const {
        uicApp,
        skip = false
    } = options;

    // Get user chain from UIC app (memoized to prevent infinite loops)
    const userChain = useMemo(
        () => uicApp?.walletClient?.getChainId() ?? '',
        [uicApp]
    );

    // Subscribe to store
    const {
        allMyCommitments,
        fetchAllMyCommitments,
        isStale: checkIsStale
    } = useAuctionStore();

    // Get cached entry
    const entry = allMyCommitments.get(userChain);

    // Derived state
    const commitments = entry?.data ?? null;
    const loading = entry?.status === 'loading' && !commitments;
    const isFetching = entry?.status === 'loading';
    const error = entry?.error ?? null;
    const hasLoadedOnce = entry?.status === 'success' || commitments !== null;
    const isStale = checkIsStale('allMyCommitments', userChain);

    /**
     * Fetch all user commitments
     */
    const refetch = useCallback(async () => {
        if (!uicApp || skip || !userChain) return;

        try {
            await fetchAllMyCommitments(userChain, uicApp);
        } catch (err) {
            console.error('[useCachedAllMyCommitments] Refetch failed:', err);
        }
    }, [uicApp, skip, userChain, fetchAllMyCommitments]);

    /**
     * Initial fetch
     */
    useEffect(() => {
        if (skip || !uicApp || !userChain) return;

        // Check if entry exists by reading from store directly
        const currentEntry = allMyCommitments.get(userChain);

        // Only fetch if no entry exists OR entry has no data
        // This handles both initial load and failed previous fetches
        if (!currentEntry || !currentEntry.data) {
            refetch();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [skip, uicApp, userChain]);

    return {
        commitments,
        loading,
        isFetching,
        error,
        hasLoadedOnce,
        isStale,
        refetch
    };
}
