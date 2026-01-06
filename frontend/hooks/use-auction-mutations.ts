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
import { type ApplicationClient, useWalletConnection } from 'linera-react-client';
import type { AuctionParam } from '@/lib/gql/types';

export type MutationType = 'create' | 'buy' | 'claim' | 'deposit' | 'withdraw' | 'cancel' | 'withdrawProceed' | 'withdrawUnsoldToken' | 'prune';

/**
 * Discriminated union for mutation success events
 * Allows TypeScript to properly narrow types based on mutation type
 */
export type MutationSuccessEvent =
    | { type: 'create'; data: { auctionId: string } }
    | { type: 'buy'; data: { auctionId: number; quantity: number } }
    | { type: 'claim'; data: { auctionId: number } }
    | { type: 'cancel'; data: { auctionId: number } }
    | { type: 'withdrawProceed'; data: { auctionId: number } }
    | { type: 'withdrawUnsoldToken'; data: { auctionId: number } }
    | { type: 'prune'; data: { auctionId: number } }
    | { type: 'deposit'; data: { tokenApp: string; amount: string } }
    | { type: 'withdraw'; data: { tokenApp: string; amount: string; targetChain: string } };

/**
 * Discriminated union for mutation error events
 */
export type MutationErrorEvent = {
    type: MutationType;
    error: Error;
};

export interface UseAuctionMutationsOptions {
    /** The AAC application client */
    aacApp: ApplicationClient | null;
    /** Callback after any successful mutation */
    onSuccess?: (event: MutationSuccessEvent) => void;
    /** Callback after any mutation error */
    onError?: (event: MutationErrorEvent) => void;
}

export interface UseAuctionMutationsResult {
    // Mutation functions
    /** Create a new auction */
    createAuction: (params: AuctionParam) => Promise<boolean>;
    /** Place a bid (buy) */
    buy: (auctionId: number, quantity: number) => Promise<boolean>;
    /** Claim settlement */
    claimSettlement: (auctionId: number) => Promise<boolean>;
    /** Cancel an auction */
    cancelAuction: (auctionId: number) => Promise<boolean>;
    /** Withdraw proceeds from settled auction */
    withdrawProceed: (auctionId: number) => Promise<boolean>;
    /** Withdraw unsold tokens from settled auction */
    withdrawUnsoldToken: (auctionId: number) => Promise<boolean>;
    /** Prune a settled auction */
    pruneSettledAuction: (auctionId: number) => Promise<boolean>;
    /** Deposit tokens to AAC */
    deposit: (tokenApp: string, amount: string) => Promise<boolean>;
    /** Withdraw tokens from AAC */
    withdraw: (tokenApp: string, amount: string, targetChain: string) => Promise<boolean>;
    /** Trigger changes on Public Client */
    trigger: () => Promise<void>;
    // Loading states
    /** Is auction creation in progress? */
    isCreating: boolean;
    /** Is buy/bid placement in progress? */
    isBuying: boolean;
    /** Is claim operation in progress? */
    isClaiming: boolean;
    /** Is auction cancellation in progress? */
    isCancelling: boolean;
    /** Is proceed withdrawal in progress? */
    isWithdrawingProceed: boolean;
    /** Is unsold token withdrawal in progress? */
    isWithdrawingUnsoldToken: boolean;
    /** Is pruning in progress? */
    isPruning: boolean;
    /** Is deposit in progress? */
    isDepositing: boolean;
    /** Is withdrawal in progress? */
    isWithdrawing: boolean;

    // Error state
    /** Last mutation error */
    error: Error | null;
}

export function useAuctionMutations(
    options: UseAuctionMutationsOptions
): UseAuctionMutationsResult {
    const {
        aacApp,
        onSuccess,
        onError
    } = options;
    const { address } = useWalletConnection();
    // Get sync status
    const { isClientSyncing } = useSyncStatus();

    // Get store actions for cache invalidation
    const {
        invalidateActiveAuctions,
        invalidateAuction,
        invalidateBidHistory,
        invalidateUserBalances
    } = useAuctionStore();

    // Loading states
    const [isCreating, setIsCreating] = useState(false);
    const [isBuying, setIsBuying] = useState(false);
    const [isClaiming, setIsClaiming] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const [isWithdrawingProceed, setIsWithdrawingProceed] = useState(false);
    const [isWithdrawingUnsoldToken, setIsWithdrawingUnsoldToken] = useState(false);
    const [isPruning, setIsPruning] = useState(false);
    const [isDepositing, setIsDepositing] = useState(false);
    const [isWithdrawing, setIsWithdrawing] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const trigger = useCallback(
        async (): Promise<void> => {
            try {
                const result = await aacApp?.wallet?.mutate<string>(
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
            if (!aacApp?.wallet || !address) {
                const err = new Error('Wallet not connected');
                setError(err);
                onError?.({ type: 'create', error: err });
                return false;
            }

            if (isClientSyncing) {
                const err = new Error('Client is syncing, please wait');
                setError(err);
                onError?.({ type: 'create', error: err });
                return false;
            }

            setIsCreating(true);
            setError(null);

            try {
                const result = await aacApp.wallet.mutate<string>(
                    JSON.stringify(AAC_MUTATION.CreateAuction(params)), 
                    { owner: address }
                );
                console.log('📥 CreateAuction raw result:', result);

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
                onSuccess?.({ type: 'create', data: { auctionId } });

                return true;
            } catch (err: any) {
                const error = err instanceof Error ? err : new Error('Failed to create auction');
                setError(error);
                console.error('❌ CreateAuction failed:', error);
                console.error('❌ Error details:', err);
                onError?.({ type: 'create', error });
                return false;
            } finally {
                setIsCreating(false);
            }
        },
        [aacApp, onSuccess, onError, invalidateActiveAuctions, trigger, isClientSyncing]
    );

    /**
     * Place a bid (buy)
     */
    const buy = useCallback(
        async (auctionId: number, quantity: number): Promise<boolean> => {
            if (quantity <= 0) {
                const err = new Error('Quantity must be greater than 0');
                setError(err);
                onError?.({ type: 'buy', error: err });
                return false;
            }

            if (!aacApp?.wallet || !address) {
                const err = new Error('Wallet not connected');
                setError(err);
                onError?.({ type: 'buy', error: err });
                return false;
            }

            if (isClientSyncing) {
                const err = new Error('Client is syncing, please wait');
                setError(err);
                onError?.({ type: 'buy', error: err });
                return false;
            }

            setIsBuying(true);
            setError(null);

            try {
                const result = await aacApp.wallet.mutate<string>(
                    JSON.stringify(AAC_MUTATION.Buy(auctionId.toString(), quantity.toString())),
                    { owner: address }
                );

                console.log('[useAuctionMutations] Buy result:', result);
                
                // Trigger publicClient
                await trigger();

                // Invalidate affected caches
                invalidateAuction(auctionId.toString());
                invalidateBidHistory(auctionId.toString());

                onSuccess?.({ type: 'buy', data: { auctionId, quantity } });
                return true;
            } catch (err) {
                const error = err instanceof Error ? err : new Error('Failed to place bid');
                setError(error);
                console.error('[useAuctionMutations] Buy failed:', error);
                onError?.({ type: 'buy', error });
                return false;
            } finally {
                setIsBuying(false);
            }
        },
        [aacApp, onSuccess, onError, invalidateAuction, invalidateBidHistory, trigger, isClientSyncing]
    );

    /**
     * Claim settlement
     */
    const claimSettlement = useCallback(
        async (auctionId: number): Promise<boolean> => {
            if (!aacApp?.wallet || !address) {
                const err = new Error('Wallet not connected');
                setError(err);
                onError?.({ type: 'claim', error: err });
                return false;
            }

            if (isClientSyncing) {
                const err = new Error('Client is syncing, please wait');
                setError(err);
                onError?.({ type: 'claim', error: err });
                return false;
            }

            setIsClaiming(true);
            setError(null);

            try {
                const result = await aacApp.wallet.mutate<string>(
                    JSON.stringify(AAC_MUTATION.ClaimSettlement(auctionId)),
                    { owner: address }
                );

                console.log('[useAuctionMutations] Claim settlement result:', result);

                // Trigger publicClient
                await trigger();
                onSuccess?.({ type: 'claim', data: { auctionId } });
                return true;
            } catch (err) {
                const error = err instanceof Error ? err : new Error('Failed to claim settlement');
                setError(error);
                console.error('[useAuctionMutations] Claim failed:', error);
                onError?.({ type: 'claim', error });
                return false;
            } finally {
                setIsClaiming(false);
            }
        },
        [aacApp, onSuccess, onError, trigger, isClientSyncing]
    );

    /**
     * Deposit tokens to AAC
     */
    const deposit = useCallback(
        async (tokenApp: string, amount: string): Promise<boolean> => {
            if (!aacApp?.wallet || !address) {
                const err = new Error('Wallet not connected');
                setError(err);
                onError?.({ type: 'deposit', error: err });
                return false;
            }

            if (isClientSyncing) {
                const err = new Error('Client is syncing, please wait');
                setError(err);
                onError?.({ type: 'deposit', error: err });
                return false;
            }

            setIsDepositing(true);
            setError(null);

            try {
                const result = await aacApp.wallet.mutate<string>(
                    JSON.stringify(AAC_MUTATION.Deposit(Number(tokenApp), amount)),
                    { owner: address }
                );

                console.log('[useAuctionMutations] Deposit result:', result);

                // Trigger publicClient
                await trigger();

                // Invalidate user balances cache
                invalidateUserBalances(address);

                onSuccess?.({ type: 'deposit', data: { tokenApp, amount } });
                return true;
            } catch (err) {
                const error = err instanceof Error ? err : new Error('Failed to deposit');
                setError(error);
                console.error('[useAuctionMutations] Deposit failed:', error);
                onError?.({ type: 'deposit', error });
                return false;
            } finally {
                setIsDepositing(false);
            }
        },
        [aacApp, address, onSuccess, onError, trigger, isClientSyncing, invalidateUserBalances]
    );

    /**
     * Withdraw tokens from AAC
     */
    const withdraw = useCallback(
        async (tokenApp: string, amount: string, targetChain: string): Promise<boolean> => {
            if (!aacApp?.wallet || !address) {
                const err = new Error('Wallet not connected');
                setError(err);
                onError?.({ type: 'withdraw', error: err });
                return false;
            }

            if (isClientSyncing) {
                const err = new Error('Client is syncing, please wait');
                setError(err);
                onError?.({ type: 'withdraw', error: err });
                return false;
            }

            if (!targetChain) {
                const err = new Error('Target chain is required');
                setError(err);
                onError?.({ type: 'withdraw', error: err });
                return false;
            }

            setIsWithdrawing(true);
            setError(null);

            try {
                const result = await aacApp.wallet.mutate<string>(
                    JSON.stringify(AAC_MUTATION.Withdraw(Number(tokenApp), amount, `"${targetChain}"`)),
                    { owner: address }
                );

                console.log('[useAuctionMutations] Withdraw result:', result);

                // Trigger publicClient
                await trigger();

                // Invalidate user balances cache
                invalidateUserBalances(address);

                onSuccess?.({ type: 'withdraw', data: { tokenApp, amount, targetChain } });
                return true;
            } catch (err) {
                const error = err instanceof Error ? err : new Error('Failed to withdraw');
                setError(error);
                console.error('[useAuctionMutations] Withdraw failed:', error);
                onError?.({ type: 'withdraw', error });
                return false;
            } finally {
                setIsWithdrawing(false);
            }
        },
        [aacApp, address, onSuccess, onError, trigger, isClientSyncing, invalidateUserBalances]
    );

    /**
     * Cancel an auction
     */
    const cancelAuction = useCallback(
        async (auctionId: number): Promise<boolean> => {
            if (!aacApp?.wallet || !address) {
                const err = new Error('Wallet not connected');
                setError(err);
                onError?.({ type: 'cancel', error: err });
                return false;
            }

            if (isClientSyncing) {
                const err = new Error('Client is syncing, please wait');
                setError(err);
                onError?.({ type: 'cancel', error: err });
                return false;
            }

            setIsCancelling(true);
            setError(null);

            try {
                const result = await aacApp.wallet.mutate<string>(
                    JSON.stringify(AAC_MUTATION.CancelAuction(auctionId)),
                    { owner: address }
                );

                console.log('[useAuctionMutations] Cancel auction result:', result);

                // Trigger publicClient
                await trigger();

                // Invalidate affected caches
                invalidateAuction(auctionId.toString());
                invalidateActiveAuctions();

                onSuccess?.({ type: 'cancel', data: { auctionId } });
                return true;
            } catch (err) {
                const error = err instanceof Error ? err : new Error('Failed to cancel auction');
                setError(error);
                console.error('[useAuctionMutations] Cancel failed:', error);
                onError?.({ type: 'cancel', error });
                return false;
            } finally {
                setIsCancelling(false);
            }
        },
        [aacApp, address, onSuccess, onError, trigger, isClientSyncing, invalidateAuction, invalidateActiveAuctions]
    );

    /**
     * Withdraw proceeds from settled auction
     */
    const withdrawProceed = useCallback(
        async (auctionId: number): Promise<boolean> => {
            if (!aacApp?.wallet || !address) {
                const err = new Error('Wallet not connected');
                setError(err);
                onError?.({ type: 'withdrawProceed', error: err });
                return false;
            }

            if (isClientSyncing) {
                const err = new Error('Client is syncing, please wait');
                setError(err);
                onError?.({ type: 'withdrawProceed', error: err });
                return false;
            }

            setIsWithdrawingProceed(true);
            setError(null);

            try {
                const result = await aacApp.wallet.mutate<string>(
                    JSON.stringify(AAC_MUTATION.WithdrawProceed(auctionId)),
                    { owner: address }
                );

                console.log('[useAuctionMutations] Withdraw proceed result:', result);

                // Trigger publicClient
                await trigger();

                // Invalidate user balances (proceeds go to user's balance)
                invalidateUserBalances(address);

                onSuccess?.({ type: 'withdrawProceed', data: { auctionId } });
                return true;
            } catch (err) {
                const error = err instanceof Error ? err : new Error('Failed to withdraw proceeds');
                setError(error);
                console.error('[useAuctionMutations] Withdraw proceed failed:', error);
                onError?.({ type: 'withdrawProceed', error });
                return false;
            } finally {
                setIsWithdrawingProceed(false);
            }
        },
        [aacApp, address, onSuccess, onError, trigger, isClientSyncing, invalidateUserBalances]
    );

    /**
     * Withdraw unsold tokens from settled auction
     */
    const withdrawUnsoldToken = useCallback(
        async (auctionId: number): Promise<boolean> => {
            if (!aacApp?.wallet || !address) {
                const err = new Error('Wallet not connected');
                setError(err);
                onError?.({ type: 'withdrawUnsoldToken', error: err });
                return false;
            }

            if (isClientSyncing) {
                const err = new Error('Client is syncing, please wait');
                setError(err);
                onError?.({ type: 'withdrawUnsoldToken', error: err });
                return false;
            }

            setIsWithdrawingUnsoldToken(true);
            setError(null);

            try {
                const result = await aacApp.wallet.mutate<string>(
                    JSON.stringify(AAC_MUTATION.WithdrawUnsoldToken(auctionId)),
                    { owner: address }
                );

                console.log('[useAuctionMutations] Withdraw unsold token result:', result);

                // Trigger publicClient
                await trigger();

                // Invalidate user balances (unsold tokens go to user's balance)
                invalidateUserBalances(address);

                onSuccess?.({ type: 'withdrawUnsoldToken', data: { auctionId } });
                return true;
            } catch (err) {
                const error = err instanceof Error ? err : new Error('Failed to withdraw unsold tokens');
                setError(error);
                console.error('[useAuctionMutations] Withdraw unsold token failed:', error);
                onError?.({ type: 'withdrawUnsoldToken', error });
                return false;
            } finally {
                setIsWithdrawingUnsoldToken(false);
            }
        },
        [aacApp, address, onSuccess, onError, trigger, isClientSyncing, invalidateUserBalances]
    );

    /**
     * Prune a settled auction
     */
    const pruneSettledAuction = useCallback(
        async (auctionId: number): Promise<boolean> => {
            if (!aacApp?.wallet || !address) {
                const err = new Error('Wallet not connected');
                setError(err);
                onError?.({ type: 'prune', error: err });
                return false;
            }

            if (isClientSyncing) {
                const err = new Error('Client is syncing, please wait');
                setError(err);
                onError?.({ type: 'prune', error: err });
                return false;
            }

            setIsPruning(true);
            setError(null);

            try {
                const result = await aacApp.wallet.mutate<string>(
                    JSON.stringify(AAC_MUTATION.PruneSettledAuction(auctionId)),
                    { owner: address }
                );

                console.log('[useAuctionMutations] Prune settled auction result:', result);

                // Trigger publicClient
                await trigger();

                // Invalidate affected caches
                invalidateAuction(auctionId.toString());

                onSuccess?.({ type: 'prune', data: { auctionId } });
                return true;
            } catch (err) {
                const error = err instanceof Error ? err : new Error('Failed to prune settled auction');
                setError(error);
                console.error('[useAuctionMutations] Prune failed:', error);
                onError?.({ type: 'prune', error });
                return false;
            } finally {
                setIsPruning(false);
            }
        },
        [aacApp, address, onSuccess, onError, trigger, isClientSyncing, invalidateAuction]
    );

    return {
        createAuction,
        buy,
        claimSettlement,
        cancelAuction,
        withdrawProceed,
        withdrawUnsoldToken,
        pruneSettledAuction,
        deposit,
        withdraw,
        trigger,
        isCreating,
        isBuying,
        isClaiming,
        isCancelling,
        isWithdrawingProceed,
        isWithdrawingUnsoldToken,
        isPruning,
        isDepositing,
        isWithdrawing,
        error
    };
}
