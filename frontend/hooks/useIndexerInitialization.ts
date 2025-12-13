/**
 * useIndexerInitialization Hook
 *
 * Manages indexer initialization lifecycle with automatic background verification
 * and localStorage caching for instant initialization on return visits.
 *
 * Features:
 * - Auto-initialization on mount
 * - localStorage caching (instant on return visits)
 * - Background verification of on-chain state
 * - Chain-aware (handles chain switches)
 *
 * Usage:
 * ```tsx
 * const { initialized, initializing, error, recheck } = useIndexerInitialization({
 *   indexerChainId: INDEXER_CHAIN_ID,
 *   aacChain: AAC_CHAIN_ID,
 *   auctionApp: AUCTION_APP_ID,
 *   indexerApp
 * });
 *
 * if (initializing) return <Loading />;
 * if (error) return <Error error={error} />;
 * // Ready to use indexer queries
 * ```
 */

import { useEffect, useCallback } from 'react';
import { useAuctionStore } from '@/store/auction-store';
import type { ApplicationClient } from 'linera-react-client';
import type { SubscriptionInfo } from '@/lib/gql/types';

export interface UseIndexerInitializationOptions {
    /** The indexer chain ID to initialize */
    indexerChainId: string;
    /** The AAC chain to subscribe to */
    aacChain: string;
    /** The auction application ID */
    auctionApp: string;
    /** The indexer application client */
    indexerApp: ApplicationClient | null;
    /** Skip auto-initialization (default: false) */
    skip?: boolean;
}

export interface UseIndexerInitializationResult {
    /** Is the indexer initialized? */
    initialized: boolean;
    /** Is initialization in progress? */
    initializing: boolean;
    /** Initialization error if any */
    error: Error | null;
    /** Subscription info from on-chain */
    subscriptionInfo: SubscriptionInfo | null;
    /** Manually trigger re-check of on-chain state */
    recheck: () => Promise<SubscriptionInfo | null | undefined>;
    /** Reset indexer state (useful for chain switches) */
    reset: () => void;
}

/**
 * Hook for managing indexer initialization
 */
export function useIndexerInitialization(
    options: UseIndexerInitializationOptions
): UseIndexerInitializationResult {
    const { indexerChainId, aacChain, auctionApp, indexerApp, skip = false } = options;

    // Subscribe to store state
    const {
        indexerInitialized,
        indexerInitializing,
        indexerError,
        subscriptionInfo,
        initializeIndexer,
        checkSubscriptionInfo,
        resetIndexer
    } = useAuctionStore();

    /**
     * Auto-initialize on mount if not already initialized
     */
    useEffect(() => {
        if (skip || !indexerApp || indexerInitialized || indexerInitializing) {
            return;
        }

        // Trigger initialization
        initializeIndexer(indexerChainId, aacChain, auctionApp, indexerApp).catch((err) => {
            console.error('[useIndexerInitialization] Auto-init failed:', err);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        skip,
        indexerApp,
        indexerInitialized,
        indexerInitializing,
        indexerChainId,
        aacChain,
        auctionApp
    ]);

    /**
     * Manual re-check of on-chain subscription info
     */
    const recheck = useCallback(async () => {
        if (!indexerApp) {
            console.warn('[useIndexerInitialization] Cannot recheck: indexerApp not available');
            return;
        }

        try {
            return await checkSubscriptionInfo(indexerApp);
        } catch (err) {
            console.error('[useIndexerInitialization] Recheck failed:', err);
            throw err;
        }
    }, [indexerApp, checkSubscriptionInfo]);

    /**
     * Reset indexer state
     */
    const reset = useCallback(() => {
        resetIndexer();
    }, [resetIndexer]);

    return {
        initialized: indexerInitialized,
        initializing: indexerInitializing,
        error: indexerError,
        subscriptionInfo,
        recheck,
        reset
    };
}
