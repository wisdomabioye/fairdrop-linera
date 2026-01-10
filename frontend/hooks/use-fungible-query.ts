import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useTokenStore } from '@/store/token-store';
import { ChainApp } from 'linera-react-client';

export interface UseFungibleQueryOptions {
    /** The normalized fungible chain (wallet or public) */
    chainApp?: ChainApp | null;
    /** Token application ID (optional - required for store integration) */
    tokenId?: string;
    /** Chain ID where this token is being used (optional - required for store integration) */
    chainId?: string;
    /** User address for balance lookups */
    address?: string;
    /** Auto-fetch on mount */
    autoFetch?: boolean;
    /** Polling interval in milliseconds (optional) */
    pollingInterval?: number;
    /** Whether wallet is currently syncing (prevents queries during sync) */
    isWalletSyncing?: boolean;
}

export interface UseFungibleQueryResult {
    balanceLoading: boolean;
    balanceError: Error | null;
    fetchBalance: (address: string) => Promise<void>;

    // Token info
    tickerSymbol: string | null;
    tokenName: string | null;
    tokenInfoLoading: boolean;
    tokenInfoError: Error | null;
    fetchTokenInfo: () => Promise<void>;

    // Helper to get balance for specific account
    getAccountBalance: (address: string) => string | null;
}

export function useFungibleQuery(options: UseFungibleQueryOptions): UseFungibleQueryResult {
    const {
        chainApp,
        tokenId,
        chainId,
        address,
        autoFetch = false,
        isWalletSyncing = false
    } = options;

    // Get store state and methods
    const {
        fetchBalance: storeFetchBalance,
        fetchTokenInfo: storeFetchTokenInfo,
        getBalance,
        getBalanceStatus,
        getTokenSymbol,
        getTokenName,
        getTokenInfoStatus,
        invalidateBalance,
    } = useTokenStore();

    // Get loading/error states for the specific address
    const balanceLoading = useMemo(() => {
        if (!tokenId || !chainId || !address) return false;
        return getBalanceStatus(tokenId, chainId, address) === 'loading';
    }, [tokenId, chainId, address, getBalanceStatus]);

    const balanceError = useMemo(() => {
        if (!tokenId || !chainId || !address) return null;
        const status = getBalanceStatus(tokenId, chainId, address);
        return status === 'error' ? new Error('Failed to fetch balance') : null;
    }, [tokenId, chainId, address, getBalanceStatus]);

    // Get token info from store
    const tickerSymbol = useMemo(() => {
        if (!tokenId || !chainId) return null;
        return getTokenSymbol(tokenId, chainId);
    }, [tokenId, chainId, getTokenSymbol]);

    const tokenName = useMemo(() => {
        if (!tokenId || !chainId) return null;
        return getTokenName(tokenId, chainId);
    }, [tokenId, chainId, getTokenName]);

    const tokenInfoLoading = useMemo(() => {
        if (!tokenId || !chainId) return false;
        return getTokenInfoStatus(tokenId, chainId) === 'loading';
    }, [tokenId, chainId, getTokenInfoStatus]);

    const tokenInfoError = useMemo(() => {
        if (!tokenId || !chainId) return null;
        const status = getTokenInfoStatus(tokenId, chainId);
        return status === 'error' ? new Error('Failed to fetch token info') : null;
    }, [tokenId, chainId, getTokenInfoStatus]);

    // Fetch methods - delegate to store
    const fetchBalance = useCallback(async (targetAddress: string) => {
        if (isWalletSyncing || !tokenId || !chainId || !chainApp) {
            return;
        }

        await storeFetchBalance(tokenId, chainId, targetAddress, chainApp);
    }, [tokenId, chainId, chainApp, isWalletSyncing, storeFetchBalance]);

    const fetchTokenInfo = useCallback(async () => {
        if (isWalletSyncing || !tokenId || !chainId || !chainApp) {
            return;
        }

        await storeFetchTokenInfo(tokenId, chainId, chainApp);
    }, [tokenId, chainId, chainApp, isWalletSyncing, storeFetchTokenInfo]);

    // Helper to get balance for a specific account
    const getAccountBalance = useCallback((targetAddress: string): string | null => {
        if (!tokenId || !chainId) return null;
        return getBalance(tokenId, chainId, targetAddress);
    }, [tokenId, chainId, getBalance]);

    // Track chainApp to detect changes and invalidate stale cache
    const prevChainAppRef = useRef(chainApp);

    // Invalidate cache when chainApp changes (indicates token switch completed)
    useEffect(() => {
        const chainAppChanged = prevChainAppRef.current !== chainApp;

        if (chainAppChanged && chainApp && tokenId && chainId && address) {
            console.log('[useFungibleQuery] chainApp changed, invalidating and refetching for token:', tokenId);
            // Invalidate the cached balance to clear any stale data
            invalidateBalance(tokenId, chainId, address);

            // Force refetch with new chainApp
            fetchBalance(address);
            // fetchTokenInfo();
        }

        prevChainAppRef.current = chainApp;
    }, [chainApp, tokenId, chainId, address, invalidateBalance, fetchBalance, fetchTokenInfo]);

    // Auto-fetch on mount only (not on subsequent renders)
    useEffect(() => {
        if (autoFetch && chainApp && tokenId && chainId && address && !isWalletSyncing) {
            fetchBalance(address);
            fetchTokenInfo();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoFetch]); // Only run when autoFetch changes (typically just on mount)

    return {
        balanceLoading,
        balanceError,
        fetchBalance,
        tickerSymbol,
        tokenName,
        tokenInfoLoading,
        tokenInfoError,
        fetchTokenInfo,
        getAccountBalance,
    };
}
