/**
 * useAuctionMutations Hook
 *
 * Provides mutation functions for auction interactions with automatic cache invalidation.
 *
 * Features:
 * - Create auctions
 * - Place bids (buy)
 * - Claim settlements
 * - Subscribe/unsubscribe to AAC
 * - Automatic cache invalidation after mutations
 * - Proper error handling and loading states
 *
 * Usage:
 * ```tsx
 * const {
 *   createAuction,
 *   buy,
 *   claimSettlement,
 *   isBuying,
 *   error
 * } = useAuctionMutations({ uicApp });
 * ```
 */

import { useState, useCallback } from 'react';
import { useAuctionStore } from '@/store/auction-store';
import { UIC_MUTATION } from '@/lib/gql/queries';
import type { ApplicationClient } from 'linera-react-client';
import type { AuctionParam } from '@/lib/gql/types';

export interface UseAuctionMutationsOptions {
    /** The UIC (User Interaction Chain) application client */
    uicApp: ApplicationClient | null;
    /** Callback after successful auction creation */
    onCreateSuccess?: (auctionId: string) => void;
    /** Callback after successful buy */
    onBuySuccess?: (auctionId: number, quantity: number) => void;
    /** Callback after successful settlement claim */
    onClaimSuccess?: (auctionId: number) => void;
    /** Callback after any mutation error */
    onError?: (error: Error) => void;
}

export interface UseAuctionMutationsResult {
    // Mutation functions
    /** Create a new auction */
    createAuction: (params: AuctionParam) => Promise<boolean>;
    /** Place a bid (buy) */
    buy: (auctionId: number, quantity: number) => Promise<boolean>;
    /** Subscribe to AAC for auction updates */
    subscribeToAuction: (aacChain: string) => Promise<boolean>;
    /** Unsubscribe from AAC */
    unsubscribeFromAuction: (aacChain: string) => Promise<boolean>;
    /** Claim settlement */
    claimSettlement: (auctionId: number) => Promise<boolean>;

    // Loading states
    /** Is auction creation in progress? */
    isCreating: boolean;
    /** Is buy/bid placement in progress? */
    isBuying: boolean;
    /** Is subscription operation in progress? */
    isSubscribing: boolean;
    /** Is claim operation in progress? */
    isClaiming: boolean;

    // Error state
    /** Last mutation error */
    error: Error | null;
}

export function useAuctionMutations(
    options: UseAuctionMutationsOptions
): UseAuctionMutationsResult {
    const {
        uicApp,
        onCreateSuccess,
        onBuySuccess,
        onClaimSuccess,
        onError
    } = options;

    // Get store actions for cache invalidation
    const {
        invalidateActiveAuctions,
        invalidateAuction,
        invalidateUserCommitment,
        invalidateBidHistory
    } = useAuctionStore();

    // Loading states
    const [isCreating, setIsCreating] = useState(false);
    const [isBuying, setIsBuying] = useState(false);
    const [isSubscribing, setIsSubscribing] = useState(false);
    const [isClaiming, setIsClaiming] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    /**
     * Create a new auction
     */
    const createAuction = useCallback(
        async (params: AuctionParam): Promise<boolean> => {
            if (!uicApp?.walletClient) {
                const err = new Error('Wallet not connected');
                setError(err);
                onError?.(err);
                return false;
            }

            setIsCreating(true);
            setError(null);

            try {
                console.log('params', params);
                const result = await uicApp.walletClient.mutate<string>(
                    JSON.stringify(UIC_MUTATION.CreateAuction(params))
                );
                console.log('[useAuctionMutations] Create auction result:', result);

                const { data, /* errors */ } = JSON.parse(result) as { data: unknown | null, errors: unknown[] };

                if (data === null) {
                    throw new Error('Auction creation error');
                }

                // Invalidate active auctions list
                invalidateActiveAuctions();

                // Extract auction ID from result if needed
                const auctionId = 'new'; // You may need to parse this from result
                onCreateSuccess?.(auctionId);

                return true;
            } catch (err) {
                const error = err instanceof Error ? err : new Error('Failed to create auction');
                setError(error);
                console.error('[useAuctionMutations] Create failed:', error);
                onError?.(error);
                return false;
            } finally {
                setIsCreating(false);
            }
        },
        [uicApp, onCreateSuccess, onError, invalidateActiveAuctions]
    );

    /**
     * Place a bid (buy)
     */
    const buy = useCallback(
        async (auctionId: number, quantity: number): Promise<boolean> => {
            if (quantity <= 0) {
                const err = new Error('Quantity must be greater than 0');
                setError(err);
                onError?.(err);
                return false;
            }

            if (!uicApp?.walletClient) {
                const err = new Error('Wallet not connected');
                setError(err);
                onError?.(err);
                return false;
            }

            setIsBuying(true);
            setError(null);

            try {
                const result = await uicApp.walletClient.mutate<string>(
                    JSON.stringify(UIC_MUTATION.Buy(auctionId, quantity))
                );

                console.log('[useAuctionMutations] Buy result:', result);

                // Invalidate affected caches
                invalidateAuction(auctionId.toString());
                invalidateUserCommitment(auctionId.toString());
                invalidateBidHistory(auctionId.toString());

                onBuySuccess?.(auctionId, quantity);
                return true;
            } catch (err) {
                const error = err instanceof Error ? err : new Error('Failed to place bid');
                setError(error);
                console.error('[useAuctionMutations] Buy failed:', error);
                onError?.(error);
                return false;
            } finally {
                setIsBuying(false);
            }
        },
        [uicApp, onBuySuccess, onError, invalidateAuction, invalidateUserCommitment, invalidateBidHistory]
    );

    /**
     * Subscribe to AAC for auction updates
     */
    const subscribeToAuction = useCallback(
        async (aacChain: string): Promise<boolean> => {
            if (!uicApp?.walletClient) {
                const err = new Error('Wallet not connected');
                setError(err);
                onError?.(err);
                return false;
            }

            setIsSubscribing(true);
            setError(null);

            try {
                const result = await uicApp.walletClient.mutate<string>(
                    JSON.stringify(UIC_MUTATION.SubscribeToAuction(aacChain))
                );

                console.log('[useAuctionMutations] Subscribe result:', result);
                return true;
            } catch (err) {
                const error = err instanceof Error ? err : new Error('Failed to subscribe');
                setError(error);
                console.error('[useAuctionMutations] Subscribe failed:', error);
                onError?.(error);
                return false;
            } finally {
                setIsSubscribing(false);
            }
        },
        [uicApp, onError]
    );

    /**
     * Unsubscribe from AAC
     */
    const unsubscribeFromAuction = useCallback(
        async (aacChain: string): Promise<boolean> => {
            if (!uicApp?.walletClient) {
                const err = new Error('Wallet not connected');
                setError(err);
                onError?.(err);
                return false;
            }

            setIsSubscribing(true);
            setError(null);

            try {
                const result = await uicApp.walletClient.mutate<string>(
                    JSON.stringify(UIC_MUTATION.UnsubscribeFromAuction(aacChain))
                );

                console.log('[useAuctionMutations] Unsubscribe result:', result);
                return true;
            } catch (err) {
                const error = err instanceof Error ? err : new Error('Failed to unsubscribe');
                setError(error);
                console.error('[useAuctionMutations] Unsubscribe failed:', error);
                onError?.(error);
                return false;
            } finally {
                setIsSubscribing(false);
            }
        },
        [uicApp, onError]
    );

    /**
     * Claim settlement
     */
    const claimSettlement = useCallback(
        async (auctionId: number): Promise<boolean> => {
            if (!uicApp?.walletClient) {
                const err = new Error('Wallet not connected');
                setError(err);
                onError?.(err);
                return false;
            }

            setIsClaiming(true);
            setError(null);

            try {
                const result = await uicApp.walletClient.mutate<string>(
                    JSON.stringify(UIC_MUTATION.ClaimSettlement(auctionId))
                );

                console.log('[useAuctionMutations] Claim settlement result:', result);

                // Invalidate user commitment cache
                invalidateUserCommitment(auctionId.toString());

                onClaimSuccess?.(auctionId);
                return true;
            } catch (err) {
                const error = err instanceof Error ? err : new Error('Failed to claim settlement');
                setError(error);
                console.error('[useAuctionMutations] Claim failed:', error);
                onError?.(error);
                return false;
            } finally {
                setIsClaiming(false);
            }
        },
        [uicApp, onClaimSuccess, onError, invalidateUserCommitment]
    );

    return {
        createAuction,
        buy,
        subscribeToAuction,
        unsubscribeFromAuction,
        claimSettlement,
        isCreating,
        isBuying,
        isSubscribing,
        isClaiming,
        error
    };
}
