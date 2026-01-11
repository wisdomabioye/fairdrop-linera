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

    // Track chainApp changes and initialization
    const prevChainAppRef = useRef(chainApp);
    const hasInitializedRef = useRef(false);

    useEffect(() => {
        // Guard: can't do anything without these
        if (!chainApp || !tokenId || !chainId || !address || isWalletSyncing) {
            return;
        }

        const chainAppChanged = prevChainAppRef.current !== chainApp;
        const isFirstRun = !hasInitializedRef.current;

        // Scenario 1: chainApp changed (token switched)
        // Always invalidate and refetch to prevent stale balance display
        if (chainAppChanged) {
            console.log('[useFungibleQuery] chainApp changed, clearing cache for:', tokenId);
            invalidateBalance(tokenId, chainId, address);
            fetchBalance(address);
            fetchTokenInfo();
            hasInitializedRef.current = true;
        }
        // Scenario 2: Initial mount with autoFetch enabled
        // Only fetch on first mount, not on every dep change
        else if (isFirstRun && autoFetch) {
            console.log('[useFungibleQuery] Initial fetch for:', tokenId);
            fetchBalance(address);
            fetchTokenInfo();
            hasInitializedRef.current = true;
        }

        prevChainAppRef.current = chainApp;
    }, [
        chainApp,
        tokenId,
        chainId,
        address,
        autoFetch,
        isWalletSyncing,
        invalidateBalance,
        fetchBalance,
        fetchTokenInfo
    ]);
   

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
