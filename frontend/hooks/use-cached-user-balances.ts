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

import { useEffect, useCallback } from 'react';
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
        fetchUserBalances,
        isStale: checkIsStale
    } = useAuctionStore();

    // Get cached entry
    const entry = userBalances.get(address);

    // Derived state
    const balances = entry?.data ?? null;
    const status = entry?.status ?? 'idle';
    const isFetching = status === 'loading';
    const error = entry?.error ?? null;
    const isStale = checkIsStale('userBalances', address);

    // CRITICAL: Distinguish initial load vs unavailable data
    // status === 'idle' && balances === null → Initial load (show loading)
    // status === 'success' && balances === null → Fetched but no data (show empty state)
    // status === 'error' → Failed (show error)
    const loading = (
        status === 'loading' ||
        isPublicClientSyncing ||
        (status === 'idle' && !skip && !!aacApp && tokenApps.length > 0)
    );

    /**
     * Fetch user balances
     */
    const refetch = useCallback(async () => {
        if (!aacApp || skip || isPublicClientSyncing || tokenApps.length === 0) return;

        try {
            await fetchUserBalances(address, tokenApps, aacApp);
        } catch (err) {
            console.error('[useCachedUserBalances] Refetch failed:', err);
        }
    }, [aacApp, skip, isPublicClientSyncing, address, tokenApps, fetchUserBalances]);

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
        refetch
    };
}
