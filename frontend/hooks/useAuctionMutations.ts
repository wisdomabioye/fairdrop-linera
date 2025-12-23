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
import { AAC_MUTATION } from '@/lib/gql/queries';
import type { ApplicationClient } from 'linera-react-client';
import type { AuctionParam } from '@/lib/gql/types';

export interface UseAuctionMutationsOptions {
    /** The AAC application client */
    aacApp: ApplicationClient | null;
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
    /** Claim settlement */
    claimSettlement: (auctionId: number) => Promise<boolean>;
    /** Trigger changes on Public Client */
    trigger: () => Promise<void>;
    // Loading states
    /** Is auction creation in progress? */
    isCreating: boolean;
    /** Is buy/bid placement in progress? */
    isBuying: boolean;
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
        aacApp,
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
    const [isClaiming, setIsClaiming] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const trigger = useCallback(
        async (): Promise<void> => {
            try {
                const result = await aacApp?.mutate<string>(
                    JSON.stringify(AAC_MUTATION.Trigger())
                );

                console.log('[useAuctionMutations] Trigger:', result);

            } catch (err) {
                console.error('[useAuctionMutations] Trigger failed:', err);
            }
        },
        [aacApp]
    )

    /**
     * Create a new auction
     */
    const createAuction = useCallback(
        async (params: AuctionParam): Promise<boolean> => {
            if (!aacApp?.canMutate()) {
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
                const result = await aacApp.mutate<string>(
                    JSON.stringify(AAC_MUTATION.CreateAuction(params))
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
        [aacApp, onCreateSuccess, onError, invalidateActiveAuctions, trigger, isWalletClientSyncing]
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

            if (!aacApp?.canMutate()) {
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
                const result = await aacApp.mutate<string>(
                    JSON.stringify(AAC_MUTATION.Buy(auctionId.toString(), quantity.toString()))
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
        [aacApp, onBuySuccess, onError, invalidateAuction, invalidateUserCommitment, invalidateAllMyCommitments, invalidateBidHistory, trigger, isWalletClientSyncing]
    );

    /**
     * Claim settlement
     */
    const claimSettlement = useCallback(
        async (auctionId: number): Promise<boolean> => {
            if (!aacApp?.canMutate()) {
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
                const result = await aacApp.mutate<string>(
                    JSON.stringify(AAC_MUTATION.ClaimSettlement(auctionId))
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
        [aacApp, onClaimSuccess, onError, invalidateUserCommitment, trigger, isWalletClientSyncing]
    );

    return {
        createAuction,
        buy,
        claimSettlement,
        trigger,
        isCreating,
        isBuying,
        isClaiming,
        error
    };
}
