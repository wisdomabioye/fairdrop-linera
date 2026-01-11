/**
 * useCachedUserBalances Hook
 *
 * Optimized hook for fetching user balances for multiple tokens in a single batched request.
 * Uses AAC_QUERY.UserBalances to reduce N requests → 1 request.
 *
 * Features:
 * - Reads from centralized store (instant)
 * - Auto-fetches if data is missing or stale
 * - Batched query for all tokens at once
 * - Stale-while-revalidate strategy
 *
 * Usage:
 * ```tsx
 * const { balances, loading, error, status, refetch } = useCachedUserBalances({
 *   address: '0x123...',
 *   tokenApps: ['app1', 'app2', 'app3'],
 *   aacApp
 * });
 * ```
 */

import { useEffect, useCallback, useState } from 'react';
import { useAuctionStore } from '@/store/auction-store';
import { useSyncStatus } from '@/providers';
import type { ApplicationClient } from 'linera-react-client';

export interface UseCachedUserBalancesOptions {
    /** User address */
    address: string;
    /** Array of token application IDs to fetch balances for */
    tokenApps: string[];
    /** The AAC application client */
    aacApp: ApplicationClient | null;
    /** Skip fetching (useful when conditionally loading) */
    skip?: boolean;
}

export interface UseCachedUserBalancesResult {
    /** User balances: Map of tokenApp -> amount */
    balances: Map<string, number> | null;
    /** Is initial loading? (only true on very first fetch) */
    loading: boolean;
    /** Is currently fetching? (may be true while showing cached data) */
    isFetching: boolean;
    /** Any errors */
    error: Error | null;
    /** Fetch status */
    status: 'idle' | 'loading' | 'success' | 'error';
    /** Is cached data stale? */
    isStale: boolean;
    /** Manually refetch balances */
    refetch: () => Promise<void>;
    invalidateAndRefreshUserBalances: (address: string, tokenApps: string[], aacApp: ApplicationClient) => Promise<void>;
}

export function useCachedUserBalances(
    options: UseCachedUserBalancesOptions
): UseCachedUserBalancesResult {
    const {
        address,
        tokenApps,
        aacApp,
        skip = false
    } = options;

    // Get sync status
    const { isPublicClientSyncing } = useSyncStatus();

    // Subscribe to store
    const {
        userBalances,
        // fetchUserBalances,
        invalidateAndRefreshUserBalances,
        isStale: checkIsStale
    } = useAuctionStore();

    // Track if we've ever successfully loaded balances for this user
    const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

    // Get cached entry
    const entry = userBalances.get(address);

    // Derived state
    const balances = entry?.data ?? null;
    const status = entry?.status ?? 'idle';
    const isFetching = status === 'loading';
    const error = entry?.error ?? null;
    const isStale = checkIsStale('userBalances', address);

    // Update hasLoadedOnce when we get successful data
    useEffect(() => {
        if ((status === 'success' || balances) && !hasLoadedOnce) {
            setHasLoadedOnce(true);
        }
    }, [status, balances, hasLoadedOnce]);

    // CRITICAL: Only show loading on first load (before any data has been loaded)
    // Once data has been fetched once, never show full loading skeleton again
    // - First load: show skeleton
    // - Refetching with cached data: show data with isFetching indicator
    const loading = (
        (status === 'loading' || isPublicClientSyncing || (status === 'idle' && !skip && !!aacApp && tokenApps.length > 0))
        && !hasLoadedOnce
    );

    /**
     * Fetch user balances
     */
    const refetch = useCallback(async () => {
        if (!aacApp || skip || isPublicClientSyncing || tokenApps.length === 0) return;

        try {
            await invalidateAndRefreshUserBalances(address, tokenApps, aacApp);
        } catch (err) {
            console.error('[useCachedUserBalances] Refetch failed:', err);
        }
    }, [aacApp, skip, isPublicClientSyncing, address, tokenApps, invalidateAndRefreshUserBalances]);

    /**
     * Initial fetch and refetch on stale data
     * Wait for sync to complete before fetching
     */
    useEffect(() => {
        if (skip || !aacApp || isPublicClientSyncing || tokenApps.length === 0) return;

        // Fetch if we have no data at all, or if data is stale AND not currently loading
        if ((!entry || isStale) && !isFetching) {
            refetch();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [skip, aacApp, isStale, isPublicClientSyncing, tokenApps.length]);

    return {
        balances,
        loading,
        isFetching,
        error,
        status,
        isStale,
        refetch,
        invalidateAndRefreshUserBalances
    };
}
