import { useCallback, useEffect, useRef, useMemo } from 'react';
import { pollingManager } from '@/lib/utils/polling-manager';
import type {
    AccountBalance,
    Allowance
} from '@/lib/gql/types';
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
    // Accounts data
    accounts: AccountBalance[];
    accountsLoading: boolean;
    accountsError: Error | null;
    fetchAccounts: () => Promise<void>;

    // Allowances data
    allowances: Allowance[];
    allowancesLoading: boolean;
    allowancesError: Error | null;
    fetchAllowances: () => Promise<void>;

    // Token info
    tickerSymbol: string | null;
    tokenName: string | null;
    tokenInfoLoading: boolean;
    tokenInfoError: Error | null;
    fetchTokenInfo: () => Promise<void>;

    // Helper to get balance for specific account
    getAccountBalance: (owner: string) => string | null;

    // Helper to get allowance for specific owner-spender pair
    getAllowance: (owner: string, spender: string) => string | null;
}

export function useFungibleQuery(options: UseFungibleQueryOptions): UseFungibleQueryResult {
    const {
        chainApp,
        tokenId,
        chainId,
        autoFetch = false,
        pollingInterval,
        isWalletSyncing = false
    } = options;

    const appId = `${tokenId}-${chainId}`;

    // Get store state and methods
    const {
        balances,
        allowances: allowancesMap,
        tokenInfo,
        fetchAccounts: storeFetchAccounts,
        fetchAllowances: storeFetchAllowances,
        fetchTokenInfo: storeFetchTokenInfo,
        getBalance,
        getAllowance: storeGetAllowance,
        getTokenSymbol,
        getTokenName,
    } = useTokenStore();

    // Derive accounts array from store's balances Map
    const accounts = useMemo(() => {
        if (!tokenId || !chainId) return [];

        const result: AccountBalance[] = [];
        const prefix = `${tokenId}:${chainId}:`;

        for (const [key, entry] of balances.entries()) {
            if (key.startsWith(prefix) && entry.status === 'success' && entry.balance) {
                const owner = key.substring(prefix.length);
                result.push({
                    key: owner,
                    value: entry.balance
                });
            }
        }

        return result;
    }, [balances, tokenId, chainId]);

    // Derive allowances array from store's allowances Map
    const allowances = useMemo(() => {
        if (!tokenId || !chainId) return [];

        const result: Allowance[] = [];
        const prefix = `${tokenId}:${chainId}:`;

        for (const [key, entry] of allowancesMap.entries()) {
            if (key.startsWith(prefix) && entry.status === 'success' && entry.allowance) {
                // Extract owner:spender from key (format: tokenId:chainId:owner:spender)
                const ownerSpenderPart = key.substring(prefix.length);
                const [owner, spender] = ownerSpenderPart.split(':');

                if (owner && spender) {
                    // Create the OwnerSpender serialized key format
                    const ownerSpenderKey = JSON.stringify({ owner, spender });
                    result.push({
                        key: ownerSpenderKey,
                        value: entry.allowance
                    });
                }
            }
        }

        return result;
    }, [allowancesMap, tokenId, chainId]);

    // Get loading/error states from store cache entries
    const accountsLoading = useMemo(() => {
        if (!tokenId || !chainId) return false;

        // Check if any account entry is loading
        const prefix = `${tokenId}:${chainId}:`;
        for (const [key, entry] of balances.entries()) {
            if (key.startsWith(prefix) && entry.status === 'loading') {
                return true;
            }
        }
        return false;
    }, [balances, tokenId, chainId]);

    const accountsError = useMemo(() => {
        if (!tokenId || !chainId) return null;

        // Return first error found
        const prefix = `${tokenId}:${chainId}:`;
        for (const [key, entry] of balances.entries()) {
            if (key.startsWith(prefix) && entry.status === 'error') {
                return entry.error || new Error('Failed to fetch accounts');
            }
        }
        return null;
    }, [balances, tokenId, chainId]);

    const allowancesLoading = useMemo(() => {
        if (!tokenId || !chainId) return false;

        const prefix = `${tokenId}:${chainId}:`;
        for (const [key, entry] of allowancesMap.entries()) {
            if (key.startsWith(prefix) && entry.status === 'loading') {
                return true;
            }
        }
        return false;
    }, [allowancesMap, tokenId, chainId]);

    const allowancesError = useMemo(() => {
        if (!tokenId || !chainId) return null;

        const prefix = `${tokenId}:${chainId}:`;
        for (const [key, entry] of allowancesMap.entries()) {
            if (key.startsWith(prefix) && entry.status === 'error') {
                return entry.error || new Error('Failed to fetch allowances');
            }
        }
        return null;
    }, [allowancesMap, tokenId, chainId]);

    // Get token info from store
    const tickerSymbol = useMemo(() => {
        if (!tokenId || !chainId) return null;
        return getTokenSymbol(tokenId, chainId);
    }, [tokenId, chainId, getTokenSymbol, tokenInfo]);

    const tokenName = useMemo(() => {
        if (!tokenId || !chainId) return null;
        return getTokenName(tokenId, chainId);
    }, [tokenId, chainId, getTokenName, tokenInfo]);

    const tokenInfoLoading = useMemo(() => {
        if (!tokenId || !chainId) return false;

        const key = `${tokenId}:${chainId}`;
        const entry = tokenInfo.get(key);
        return entry?.status === 'loading';
    }, [tokenInfo, tokenId, chainId]);

    const tokenInfoError = useMemo(() => {
        if (!tokenId || !chainId) return null;

        const key = `${tokenId}:${chainId}`;
        const entry = tokenInfo.get(key);
        return entry?.status === 'error' ? (entry.error || new Error('Failed to fetch token info')) : null;
    }, [tokenInfo, tokenId, chainId]);

    // Fetch methods - delegate to store
    const fetchAccounts = useCallback(async () => {
        if (isWalletSyncing || !tokenId || !chainId || !chainApp) {
            return;
        }

        await storeFetchAccounts(tokenId, chainId, chainApp);
    }, [tokenId, chainId, chainApp, isWalletSyncing, storeFetchAccounts]);

    const fetchAllowances = useCallback(async () => {
        if (isWalletSyncing || !tokenId || !chainId || !chainApp) {
            return;
        }

        await storeFetchAllowances(tokenId, chainId, chainApp);
    }, [tokenId, chainId, chainApp, isWalletSyncing, storeFetchAllowances]);

    const fetchTokenInfo = useCallback(async () => {
        if (isWalletSyncing || !tokenId || !chainId || !chainApp) {
            return;
        }

        await storeFetchTokenInfo(tokenId, chainId, chainApp);
    }, [tokenId, chainId, chainApp, isWalletSyncing, storeFetchTokenInfo]);

    // Helper to get balance for a specific account
    const getAccountBalance = useCallback((owner: string): string | null => {
        if (!tokenId || !chainId) return null;
        return getBalance(tokenId, chainId, owner);
    }, [tokenId, chainId, getBalance]);

    // Helper to get allowance for a specific owner-spender pair
    const getAllowance = useCallback((owner: string, spender: string): string | null => {
        if (!tokenId || !chainId) return null;
        return storeGetAllowance(tokenId, chainId, owner, spender);
    }, [tokenId, chainId, storeGetAllowance]);

    // Track if initial fetch is done
    const initialFetchDone = useRef(false);

    // Store fetch functions in refs to avoid dependency issues
    const fetchAccountsRef = useRef(fetchAccounts);
    const fetchAllowancesRef = useRef(fetchAllowances);
    const fetchTokenInfoRef = useRef(fetchTokenInfo);

    // Update refs when functions change
    useEffect(() => {
        fetchAccountsRef.current = fetchAccounts;
        fetchAllowancesRef.current = fetchAllowances;
        fetchTokenInfoRef.current = fetchTokenInfo;
    });

    // Auto-fetch on mount (only once, skip if syncing)
    useEffect(() => {
        if (autoFetch && chainApp && tokenId && chainId && !initialFetchDone.current && !isWalletSyncing) {
            initialFetchDone.current = true;
            fetchAccountsRef.current();
            fetchAllowancesRef.current();
            fetchTokenInfoRef.current();
        }
    }, [autoFetch, chainApp, tokenId, chainId, isWalletSyncing]);

    // Smart polling with PollingManager (skip if syncing)
    useEffect(() => {
        if (!pollingInterval || !chainApp || !tokenId || !chainId || isWalletSyncing) {
            return;
        }

        const pollingKey = `fungible-${appId}`;

        // Subscribe to polling
        const unsubscribe = pollingManager.subscribe(
            pollingKey,
            async () => {
                // Use refs to avoid stale closures
                await Promise.all([
                    fetchAccountsRef.current(),
                    fetchAllowancesRef.current(),
                ]);
            },
            pollingInterval
        );

        return () => {
            unsubscribe();
        };
    }, [pollingInterval, chainApp, tokenId, chainId, appId, isWalletSyncing]);

    return {
        accounts,
        accountsLoading,
        accountsError,
        fetchAccounts,

        allowances,
        allowancesLoading,
        allowancesError,
        fetchAllowances,

        tickerSymbol,
        tokenName,
        tokenInfoLoading,
        tokenInfoError,
        fetchTokenInfo,

        getAccountBalance,
        getAllowance,
    };
}
