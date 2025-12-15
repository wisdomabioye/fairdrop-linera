import { useState, useCallback } from 'react';
import { FUNGIBLE_MUTATION } from '@/lib/gql/queries';
import type { ApplicationClient } from 'linera-react-client';

export interface UseFungibleMutationsOptions {
    /** The fungible token application client */
    fungibleApp: ApplicationClient | null;
    /** Callback after successful mint */
    onMintSuccess?: () => void;
    /** Callback after successful transfer */
    onTransferSuccess?: () => void;
    /** Callback after successful approve */
    onApproveSuccess?: () => void;
    /** Callback after any mutation error */
    onError?: (error: Error) => void;
}

export interface UseFungibleMutationsResult {
    // Mint operation
    mint: (owner: string, amount: string) => Promise<boolean>;
    isMinting: boolean;
    mintError: Error | null;

    // Transfer operation
    transfer: (owner: string, amount: string, targetAccount: string) => Promise<boolean>;
    isTransferring: boolean;
    transferError: Error | null;

    // Approve operation
    approve: (owner: string, spender: string, allowance: string) => Promise<boolean>;
    isApproving: boolean;
    approveError: Error | null;

    // TransferFrom operation
    transferFrom: (owner: string, spender: string, amount: string, targetAccount: string) => Promise<boolean>;
    isTransferringFrom: boolean;
    transferFromError: Error | null;

    // Claim operation
    claim: (sourceAccount: string, amount: string, targetAccount: string) => Promise<boolean>;
    isClaiming: boolean;
    claimError: Error | null;

    // Query operations (Balance, TickerSymbol, TokenName via mutation)
    getBalance: (owner: string) => Promise<string | null>;
    getTickerSymbol: () => Promise<string | null>;
    getTokenName: () => Promise<string | null>;
    isQuerying: boolean;
    queryError: Error | null;
}

export function useFungibleMutations(options: UseFungibleMutationsOptions): UseFungibleMutationsResult {
    const {
        fungibleApp,
        onMintSuccess,
        onTransferSuccess,
        onApproveSuccess,
        onError
    } = options;

    // Mint state
    const [isMinting, setIsMinting] = useState(false);
    const [mintError, setMintError] = useState<Error | null>(null);

    // Transfer state
    const [isTransferring, setIsTransferring] = useState(false);
    const [transferError, setTransferError] = useState<Error | null>(null);

    // Approve state
    const [isApproving, setIsApproving] = useState(false);
    const [approveError, setApproveError] = useState<Error | null>(null);

    // TransferFrom state
    const [isTransferringFrom, setIsTransferringFrom] = useState(false);
    const [transferFromError, setTransferFromError] = useState<Error | null>(null);

    // Claim state
    const [isClaiming, setIsClaiming] = useState(false);
    const [claimError, setClaimError] = useState<Error | null>(null);

    // Query state
    const [isQuerying, setIsQuerying] = useState(false);
    const [queryError, setQueryError] = useState<Error | null>(null);

    // Mint operation
    const mint = useCallback(
        async (owner: string, amount: string): Promise<boolean> => {
            if (!fungibleApp?.walletClient) {
                const err = new Error('Wallet not connected');
                setMintError(err);
                onError?.(err);
                return false;
            }

            setIsMinting(true);
            setMintError(null);

            try {
                const result = await fungibleApp.walletClient.mutate<string>(
                    JSON.stringify(FUNGIBLE_MUTATION.Mint(owner, Number(amount)))
                );

                const parsed = JSON.parse(result) as { data: unknown | null, errors?: any[] };

                if (parsed.errors && parsed.errors.length > 0) {
                    throw new Error(`GraphQL error: ${JSON.stringify(parsed.errors)}`);
                }

                if (parsed.data === null) {
                    throw new Error('Mint operation returned null');
                }

                onMintSuccess?.();
                return true;
            } catch (error) {
                const err = error instanceof Error ? error : new Error('Mint failed');
                setMintError(err);
                onError?.(err);
                console.error('Error minting tokens:', error);
                return false;
            } finally {
                setIsMinting(false);
            }
        },
        [fungibleApp, onMintSuccess, onError]
    );

    // Transfer operation
    const transfer = useCallback(
        async (owner: string, amount: string, targetAccount: string): Promise<boolean> => {
            if (!fungibleApp?.walletClient) {
                const err = new Error('Wallet not connected');
                setTransferError(err);
                onError?.(err);
                return false;
            }

            setIsTransferring(true);
            setTransferError(null);

            try {
                const result = await fungibleApp.walletClient.mutate<string>(
                    JSON.stringify(FUNGIBLE_MUTATION.Transfer(owner, Number(amount), targetAccount))
                );

                const parsed = JSON.parse(result) as { data: unknown | null, errors?: any[] };

                if (parsed.errors && parsed.errors.length > 0) {
                    throw new Error(`GraphQL error: ${JSON.stringify(parsed.errors)}`);
                }

                if (parsed.data === null) {
                    throw new Error('Transfer operation returned null');
                }

                onTransferSuccess?.();
                return true;
            } catch (error) {
                const err = error instanceof Error ? error : new Error('Transfer failed');
                setTransferError(err);
                onError?.(err);
                console.error('Error transferring tokens:', error);
                return false;
            } finally {
                setIsTransferring(false);
            }
        },
        [fungibleApp, onTransferSuccess, onError]
    );

    // Approve operation
    const approve = useCallback(
        async (owner: string, spender: string, allowance: string): Promise<boolean> => {
            if (!fungibleApp?.walletClient) {
                const err = new Error('Wallet not connected');
                setApproveError(err);
                onError?.(err);
                return false;
            }

            setIsApproving(true);
            setApproveError(null);

            try {
                const result = await fungibleApp.walletClient.mutate<string>(
                    JSON.stringify(FUNGIBLE_MUTATION.Approve(owner, spender, Number(allowance)))
                );

                const parsed = JSON.parse(result) as { data: unknown | null, errors?: any[] };

                if (parsed.errors && parsed.errors.length > 0) {
                    throw new Error(`GraphQL error: ${JSON.stringify(parsed.errors)}`);
                }

                if (parsed.data === null) {
                    throw new Error('Approve operation returned null');
                }

                onApproveSuccess?.();
                return true;
            } catch (error) {
                const err = error instanceof Error ? error : new Error('Approve failed');
                setApproveError(err);
                onError?.(err);
                console.error('Error approving allowance:', error);
                return false;
            } finally {
                setIsApproving(false);
            }
        },
        [fungibleApp, onApproveSuccess, onError]
    );

    // TransferFrom operation
    const transferFrom = useCallback(
        async (owner: string, spender: string, amount: string, targetAccount: string): Promise<boolean> => {
            if (!fungibleApp?.walletClient) {
                const err = new Error('Wallet not connected');
                setTransferFromError(err);
                onError?.(err);
                return false;
            }

            setIsTransferringFrom(true);
            setTransferFromError(null);

            try {
                const result = await fungibleApp.walletClient.mutate<string>(
                    JSON.stringify(FUNGIBLE_MUTATION.TransferFrom(owner, spender, Number(amount), targetAccount))
                );

                const parsed = JSON.parse(result) as { data: unknown | null, errors?: any[] };

                if (parsed.errors && parsed.errors.length > 0) {
                    throw new Error(`GraphQL error: ${JSON.stringify(parsed.errors)}`);
                }

                if (parsed.data === null) {
                    throw new Error('TransferFrom operation returned null');
                }

                return true;
            } catch (error) {
                const err = error instanceof Error ? error : new Error('TransferFrom failed');
                setTransferFromError(err);
                onError?.(err);
                console.error('Error in transferFrom:', error);
                return false;
            } finally {
                setIsTransferringFrom(false);
            }
        },
        [fungibleApp, onError]
    );

    // Claim operation
    const claim = useCallback(
        async (sourceAccount: string, amount: string, targetAccount: string): Promise<boolean> => {
            if (!fungibleApp?.walletClient) {
                const err = new Error('Wallet not connected');
                setClaimError(err);
                onError?.(err);
                return false;
            }

            setIsClaiming(true);
            setClaimError(null);

            try {
                const result = await fungibleApp.walletClient.mutate<string>(
                    JSON.stringify(FUNGIBLE_MUTATION.Claim(sourceAccount, Number(amount), targetAccount))
                );

                const parsed = JSON.parse(result) as { data: unknown | null, errors?: any[] };

                if (parsed.errors && parsed.errors.length > 0) {
                    throw new Error(`GraphQL error: ${JSON.stringify(parsed.errors)}`);
                }

                if (parsed.data === null) {
                    throw new Error('Claim operation returned null');
                }

                return true;
            } catch (error) {
                const err = error instanceof Error ? error : new Error('Claim failed');
                setClaimError(err);
                onError?.(err);
                console.error('Error claiming tokens:', error);
                return false;
            } finally {
                setIsClaiming(false);
            }
        },
        [fungibleApp, onError]
    );

    // Get balance (mutation-based query)
    const getBalance = useCallback(
        async (owner: string): Promise<string | null> => {
            if (!fungibleApp?.walletClient) {
                const err = new Error('Wallet not connected');
                setQueryError(err);
                onError?.(err);
                return null;
            }

            setIsQuerying(true);
            setQueryError(null);

            try {
                const result = await fungibleApp.walletClient.mutate<string>(
                    JSON.stringify(FUNGIBLE_MUTATION.Balance(owner))
                );

                const parsed = JSON.parse(result) as { data: { balance: string } | null, errors?: any[] };

                if (parsed.errors && parsed.errors.length > 0) {
                    throw new Error(`GraphQL error: ${JSON.stringify(parsed.errors)}`);
                }

                return parsed.data?.balance || null;
            } catch (error) {
                const err = error instanceof Error ? error : new Error('Get balance failed');
                setQueryError(err);
                onError?.(err);
                console.error('Error getting balance:', error);
                return null;
            } finally {
                setIsQuerying(false);
            }
        },
        [fungibleApp, onError]
    );

    // Get ticker symbol (mutation-based query)
    const getTickerSymbol = useCallback(
        async (): Promise<string | null> => {
            if (!fungibleApp?.walletClient) {
                const err = new Error('Wallet not connected');
                setQueryError(err);
                onError?.(err);
                return null;
            }

            setIsQuerying(true);
            setQueryError(null);

            try {
                const result = await fungibleApp.walletClient.mutate<string>(
                    JSON.stringify(FUNGIBLE_MUTATION.TickerSymbol())
                );

                const parsed = JSON.parse(result) as { data: { tickerSymbol: string } | null, errors?: any[] };

                if (parsed.errors && parsed.errors.length > 0) {
                    throw new Error(`GraphQL error: ${JSON.stringify(parsed.errors)}`);
                }

                return parsed.data?.tickerSymbol || null;
            } catch (error) {
                const err = error instanceof Error ? error : new Error('Get ticker symbol failed');
                setQueryError(err);
                onError?.(err);
                console.error('Error getting ticker symbol:', error);
                return null;
            } finally {
                setIsQuerying(false);
            }
        },
        [fungibleApp, onError]
    );

    // Get token name (mutation-based query)
    const getTokenName = useCallback(
        async (): Promise<string | null> => {
            if (!fungibleApp?.walletClient) {
                const err = new Error('Wallet not connected');
                setQueryError(err);
                onError?.(err);
                return null;
            }

            setIsQuerying(true);
            setQueryError(null);

            try {
                const result = await fungibleApp.walletClient.mutate<string>(
                    JSON.stringify(FUNGIBLE_MUTATION.TokenName())
                );

                const parsed = JSON.parse(result) as { data: { tokenName: string } | null, errors?: any[] };

                if (parsed.errors && parsed.errors.length > 0) {
                    throw new Error(`GraphQL error: ${JSON.stringify(parsed.errors)}`);
                }

                return parsed.data?.tokenName || null;
            } catch (error) {
                const err = error instanceof Error ? error : new Error('Get token name failed');
                setQueryError(err);
                onError?.(err);
                console.error('Error getting token name:', error);
                return null;
            } finally {
                setIsQuerying(false);
            }
        },
        [fungibleApp, onError]
    );

    return {
        mint,
        isMinting,
        mintError,

        transfer,
        isTransferring,
        transferError,

        approve,
        isApproving,
        approveError,

        transferFrom,
        isTransferringFrom,
        transferFromError,

        claim,
        isClaiming,
        claimError,

        getBalance,
        getTickerSymbol,
        getTokenName,
        isQuerying,
        queryError,
    };
}
