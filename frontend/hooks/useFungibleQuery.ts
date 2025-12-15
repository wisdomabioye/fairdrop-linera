import { useState, useCallback, useEffect, useRef } from 'react';
import { FUNGIBLE_QUERY } from '@/lib/gql/queries';
import { pollingManager } from '@/lib/utils/polling-manager';
import { queryDeduplicator } from '@/lib/utils/query-deduplicator';
import type { ApplicationClient } from 'linera-react-client';
import type {
    FungibleAccounts,
    FungibleAllowances,
    AccountBalance,
    Allowance
} from '@/lib/gql/types';

export interface UseFungibleQueryOptions {
    /** The fungible token application client */
    fungibleApp: ApplicationClient | null;
    /** Auto-fetch on mount */
    autoFetch?: boolean;
    /** Polling interval in milliseconds (optional) */
    pollingInterval?: number;
    /** App ID for deduplication and polling keys */
    appId?: string;
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
    const { fungibleApp, autoFetch = false, pollingInterval, appId = 'unknown', isWalletSyncing = false } = options;

    // Accounts state
    const [accounts, setAccounts] = useState<AccountBalance[]>([]);
    const [accountsLoading, setAccountsLoading] = useState(false);
    const [accountsError, setAccountsError] = useState<Error | null>(null);

    // Allowances state
    const [allowances, setAllowances] = useState<Allowance[]>([]);
    const [allowancesLoading, setAllowancesLoading] = useState(false);
    const [allowancesError, setAllowancesError] = useState<Error | null>(null);

    // Token info state
    const [tickerSymbol, setTickerSymbol] = useState<string | null>(null);
    const [tokenName, setTokenName] = useState<string | null>(null);
    const [tokenInfoLoading, setTokenInfoLoading] = useState(false);
    const [tokenInfoError, setTokenInfoError] = useState<Error | null>(null);

    // Fetch accounts with deduplication
    const fetchAccounts = useCallback(async () => {
        if (!fungibleApp?.walletClient) {
            setAccountsError(new Error('Fungible app not initialized'));
            return;
        }

        // Don't fetch if wallet is syncing
        if (isWalletSyncing) {
            // console.debug('[useFungibleQuery] Skipping fetch - wallet is syncing');
            return;
        }

        const dedupeKey = `fungible-accounts-${appId}`;

        setAccountsLoading(true);
        setAccountsError(null);

        try {
            await queryDeduplicator.deduplicate(dedupeKey, async () => {
                const result = await fungibleApp.walletClient!.query<string>(
                    JSON.stringify(FUNGIBLE_QUERY.Accounts())
                );
                // console.log('Accounts', result)
                const parsed = JSON.parse(result) as { data: FungibleAccounts | null, errors?: any[] };

                if (parsed.errors && parsed.errors.length > 0) {
                    throw new Error(`GraphQL error: ${JSON.stringify(parsed.errors)}`);
                }

                if (parsed.data?.accounts?.entries) {
                    setAccounts(parsed.data.accounts.entries);
                } else {
                    setAccounts([]);
                }
            });
        } catch (error) {
            const err = error instanceof Error ? error : new Error('Failed to fetch accounts');
            setAccountsError(err);
            // console.error('Error fetching accounts:', error);
        } finally {
            setAccountsLoading(false);
        }
    }, [fungibleApp, appId, isWalletSyncing]);

    // Fetch allowances with deduplication
    const fetchAllowances = useCallback(async () => {
        if (!fungibleApp?.walletClient) {
            setAllowancesError(new Error('Fungible app not initialized'));
            return;
        }

        // Don't fetch if wallet is syncing
        if (isWalletSyncing) {
            // console.debug('[useFungibleQuery] Skipping allowances fetch - wallet is syncing');
            return;
        }

        const dedupeKey = `fungible-allowances-${appId}`;

        setAllowancesLoading(true);
        setAllowancesError(null);

        try {
            await queryDeduplicator.deduplicate(dedupeKey, async () => {
                const result = await fungibleApp.walletClient!.query<string>(
                    JSON.stringify(FUNGIBLE_QUERY.Allowances())
                );

                const parsed = JSON.parse(result) as { data: FungibleAllowances | null, errors?: any[] };
                if (parsed.errors && parsed.errors.length > 0) {
                    throw new Error(`GraphQL error: ${JSON.stringify(parsed.errors)}`);
                }

                if (parsed.data?.allowances?.entries) {
                    setAllowances(parsed.data.allowances.entries);
                } else {
                    setAllowances([]);
                }
            });
        } catch (error) {
            const err = error instanceof Error ? error : new Error('Failed to fetch allowances');
            setAllowancesError(err);
            // console.error('Error fetching allowances:', error);
        } finally {
            setAllowancesLoading(false);
        }
    }, [fungibleApp, appId, isWalletSyncing]);

    // Fetch token info (ticker symbol and token name)
    const fetchTokenInfo = useCallback(async () => {
        if (!fungibleApp?.walletClient) {
            setTokenInfoError(new Error('Fungible app not initialized'));
            return;
        }

        // Don't fetch if wallet is syncing
        if (isWalletSyncing) {
            // console.debug('[useFungibleQuery] Skipping token info fetch - wallet is syncing');
            return;
        }

        const dedupeKey = `fungible-token-info-${appId}`;

        setTokenInfoLoading(true);
        setTokenInfoError(null);

        try {
            await queryDeduplicator.deduplicate(dedupeKey, async () => {
                // Fetch ticker symbol
                const tickerResult = await fungibleApp.walletClient!.query<string>(
                    JSON.stringify(FUNGIBLE_QUERY.TickerSymbol())
                );
                const tickerParsed = JSON.parse(tickerResult) as { data: { tickerSymbol: string } | null, errors?: any[] };

                if (tickerParsed.errors && tickerParsed.errors.length > 0) {
                    throw new Error(`GraphQL error fetching ticker: ${JSON.stringify(tickerParsed.errors)}`);
                }

                // Fetch token name
                const nameResult = await fungibleApp.walletClient!.query<string>(
                    JSON.stringify(FUNGIBLE_QUERY.TokenName())
                );
                const nameParsed = JSON.parse(nameResult) as { data: { tokenName: string } | null, errors?: any[] };

                if (nameParsed.errors && nameParsed.errors.length > 0) {
                    throw new Error(`GraphQL error fetching token name: ${JSON.stringify(nameParsed.errors)}`);
                }

                setTickerSymbol(tickerParsed.data?.tickerSymbol || null);
                setTokenName(nameParsed.data?.tokenName || null);
            });
        } catch (error) {
            const err = error instanceof Error ? error : new Error('Failed to fetch token info');
            setTokenInfoError(err);
            // console.error('Error fetching token info:', error);
        } finally {
            setTokenInfoLoading(false);
        }
    }, [fungibleApp, appId, isWalletSyncing]);

    // Helper to get balance for a specific account
    const getAccountBalance = useCallback((owner: string): string | null => {
        // console.log('[getAccountBalance] Looking for owner:', owner);
        // console.log('[getAccountBalance] Available accounts:', accounts);

        // Try exact match first
        let account = accounts.find(acc => acc.key === owner);

        // If not found, try case-insensitive match
        if (!account) {
            account = accounts.find(acc => acc.key.toLowerCase() === owner.toLowerCase());
            if (account) {
                // console.log('[getAccountBalance] Found via case-insensitive match');
            }
        }

        const balance = account ? account.value : null;
        // console.log('[getAccountBalance] Returning balance:', balance);
        return balance;
    }, [accounts]);

    // Helper to get allowance for a specific owner-spender pair
    // Note: OwnerSpender is a scalar, so we need to parse the serialized key
    const getAllowance = useCallback((owner: string, spender: string): string | null => {
        // Try to find by parsing the serialized OwnerSpender key
        // The key format depends on how the scalar is serialized
        const allowance = allowances.find(allow => {
            try {
                // Attempt to parse if it's JSON serialized
                const parsed = JSON.parse(allow.key);
                return parsed.owner === owner && parsed.spender === spender;
            } catch {
                // If not JSON, it might be a different format
                // For now, return false and the function will return null
                return false;
            }
        });
        return allowance ? allowance.value : null;
    }, [allowances]);

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
        if (autoFetch && fungibleApp && !initialFetchDone.current && !isWalletSyncing) {
            initialFetchDone.current = true;
            fetchAccountsRef.current();
            fetchAllowancesRef.current();
            fetchTokenInfoRef.current();
        }
    }, [autoFetch, fungibleApp, isWalletSyncing]);

    // Smart polling with PollingManager (skip if syncing)
    useEffect(() => {
        if (!pollingInterval || !fungibleApp || isWalletSyncing) {
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
    }, [pollingInterval, fungibleApp, appId, isWalletSyncing]);

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
