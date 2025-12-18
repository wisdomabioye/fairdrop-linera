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
import { useSyncStatus } from '@/providers';
import { UIC_MUTATION, AAC_MUTATION } from '@/lib/gql/queries';
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
    /** Trigger changes on Public Client */
    trigger: () => Promise<void>;
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

    // Get sync status
    const { isWalletClientSyncing } = useSyncStatus();

    // Get store actions for cache invalidation
    const {
        invalidateActiveAuctions,
        invalidateAuction,
        invalidateUserCommitment,
        invalidateAllMyCommitments,
        invalidateBidHistory
    } = useAuctionStore();

    // Loading states
    const [isCreating, setIsCreating] = useState(false);
    const [isBuying, setIsBuying] = useState(false);
    const [isSubscribing, setIsSubscribing] = useState(false);
    const [isClaiming, setIsClaiming] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const trigger = useCallback(
        async (): Promise<void> => {
            try {
                const result = await uicApp?.publicClient.systemMutate<string>(
                    JSON.stringify(AAC_MUTATION.Trigger())
                );

                console.log('[useAuctionMutations] Trigger:', result);

            } catch (err) {
                console.error('[useAuctionMutations] Trigger failed:', err);
            }
        },
        [uicApp]
    )

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

            if (isWalletClientSyncing) {
                const err = new Error('Wallet is syncing, please wait');
                setError(err);
                onError?.(err);
                return false;
            }

            setIsCreating(true);
            setError(null);

            try {
                const result = await uicApp.walletClient.mutate<string>(
                    JSON.stringify(UIC_MUTATION.CreateAuction(params))
                );
                // console.log('📥 CreateAuction raw result:', result);

                const parsed = JSON.parse(result) as { data: unknown | null, errors?: unknown[] };
                // console.log('📊 Parsed result:', parsed);

                if (parsed.errors && parsed.errors.length > 0) {
                    console.error('❌ GraphQL errors:', parsed.errors);
                    throw new Error(`GraphQL error: ${JSON.stringify(parsed.errors)}`);
                }

                if (parsed.data === null) {
                    throw new Error('Auction creation returned null');
                }
                // Trigger publicClient
                await trigger();

                // Invalidate active auctions list to trigger refetch
                invalidateActiveAuctions();

                const auctionId = ''; // Auction ID will be generated by AAC
                onCreateSuccess?.(auctionId);

                return true;
            } catch (err: any) {
                const error = err instanceof Error ? err : new Error('Failed to create auction');
                setError(error);
                console.error('❌ CreateAuction failed:', error);
                console.error('❌ Error details:', err);
                onError?.(error);
                return false;
            } finally {
                setIsCreating(false);
            }
        },
        [uicApp, onCreateSuccess, onError, invalidateActiveAuctions, trigger, isWalletClientSyncing]
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

            if (isWalletClientSyncing) {
                const err = new Error('Wallet is syncing, please wait');
                setError(err);
                onError?.(err);
                return false;
            }

            setIsBuying(true);
            setError(null);

            try {
                const result = await uicApp.walletClient.mutate<string>(
                    JSON.stringify(UIC_MUTATION.Buy(auctionId.toString(), quantity.toString()))
                );

                console.log('[useAuctionMutations] Buy result:', result);
                
                // Trigger publicClient
                await trigger();

                // Invalidate affected caches
                invalidateAuction(auctionId.toString());
                invalidateBidHistory(auctionId.toString());
                invalidateUserCommitment(auctionId.toString());
                invalidateAllMyCommitments(); // Invalidate all commitments view

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
        [uicApp, onBuySuccess, onError, invalidateAuction, invalidateUserCommitment, invalidateAllMyCommitments, invalidateBidHistory, trigger, isWalletClientSyncing]
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

            if (isWalletClientSyncing) {
                const err = new Error('Wallet is syncing, please wait');
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
        [uicApp, onError, isWalletClientSyncing]
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

            if (isWalletClientSyncing) {
                const err = new Error('Wallet is syncing, please wait');
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
        [uicApp, onError, isWalletClientSyncing]
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

            if (isWalletClientSyncing) {
                const err = new Error('Wallet is syncing, please wait');
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

                // Trigger publicClient
                await trigger();

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
        [uicApp, onClaimSuccess, onError, invalidateUserCommitment, trigger, isWalletClientSyncing]
    );

    return {
        createAuction,
        buy,
        subscribeToAuction,
        unsubscribeFromAuction,
        claimSettlement,
        trigger,
        isCreating,
        isBuying,
        isSubscribing,
        isClaiming,
        error
    };
}
