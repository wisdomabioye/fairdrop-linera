/**
 * Centralized Token Store
 *
 * Global state management for fungible token data using Zustand.
 * Provides normalized caching, request deduplication, and efficient polling.
 *
 * Features:
 * - Normalized state: one entry per (tokenId, chainId, address) triple
 * - Request deduplication: prevents duplicate in-flight requests
 * - TTL-based caching: automatic stale detection
 * - Persists across navigation: balances remain when switching pages
 * - Chain-aware: different chains have separate cached balances
 */

import { create } from 'zustand';
import { queryDeduplicator } from '@/lib/utils/query-deduplicator';
import { FUNGIBLE_QUERY } from '@/lib/gql/queries';
import type { ChainApp } from 'linera-react-client';

// TTL constants (in milliseconds)
const BALANCE_TTL = 10000; // 10 seconds - balances can change frequently
const TOKEN_INFO_TTL = 6000000; // token info should not change
const ALLOWANCE_TTL = 10000; // 10 seconds - allowances can change frequently

export type FetchStatus = 'idle' | 'loading' | 'success' | 'error';

/**
 * Token balance cache entry
 * Key: `${tokenId}:${chainId}:${address}`
 */
export interface TokenBalanceCacheEntry {
    tokenId: string;
    chainId: string;
    address: string;
    balance: string | null;
    timestamp: number;
    status: FetchStatus;
    error: Error | null;
}

/**
 * Token info cache entry (symbol, name)
 * Key: `${tokenId}:${chainId}`
 */
export interface TokenInfoCacheEntry {
    tokenId: string;
    chainId: string;
    symbol: string | null;
    name: string | null;
    timestamp: number;
    status: FetchStatus;
    error: Error | null;
}

/**
 * Allowance cache entry
 * Key: `${tokenId}:${chainId}:${owner}:${spender}`
 */
export interface AllowanceCacheEntry {
    tokenId: string;
    chainId: string;
    owner: string;
    spender: string;
    allowance: string | null;
    timestamp: number;
    status: FetchStatus;
    error: Error | null;
}

/**
 * Main token store interface
 */
export interface TokenStore {
    // ============ Normalized Caches ============
    balances: Map<string, TokenBalanceCacheEntry>; // `${tokenId}:${chainId}:${address}` -> balance
    tokenInfo: Map<string, TokenInfoCacheEntry>; // `${tokenId}:${chainId}` -> info
    allowances: Map<string, AllowanceCacheEntry>; // `${tokenId}:${chainId}:${owner}:${spender}` -> allowance

    // ============ Fetch Actions ============
    fetchBalance: (tokenId: string, chainId: string, address: string, chainApp: ChainApp, force?: boolean) => Promise<void>;
    fetchTokenInfo: (tokenId: string, chainId: string, chainApp: ChainApp, force?: boolean) => Promise<void>;
    fetchAccounts: (tokenId: string, chainId: string, chainApp: ChainApp, force?: boolean) => Promise<void>;
    fetchAllowances: (tokenId: string, chainId: string, chainApp: ChainApp, force?: boolean) => Promise<void>;

    // ============ Getters ============
    getBalance: (tokenId: string, chainId: string, address: string) => string | null;
    getTokenSymbol: (tokenId: string, chainId: string) => string | null;
    getTokenName: (tokenId: string, chainId: string) => string | null;
    getBalanceStatus: (tokenId: string, chainId: string, address: string) => FetchStatus;
    getTokenInfoStatus: (tokenId: string, chainId: string) => FetchStatus;
    getAllowance: (tokenId: string, chainId: string, owner: string, spender: string) => string | null;
    getAllowanceStatus: (tokenId: string, chainId: string, owner: string, spender: string) => FetchStatus;

    // ============ Invalidation Actions ============
    invalidateBalance: (tokenId: string, chainId: string, address?: string) => void;
    invalidateTokenInfo: (tokenId: string, chainId: string) => void;
    invalidateAllowance: (tokenId: string, chainId: string, owner?: string, spender?: string) => void;
    invalidateAll: () => void;

    // ============ Combined Invalidate + Refetch Actions ============
    invalidateAndRefreshBalance: (tokenId: string, chainId: string, address: string, chainApp: ChainApp) => Promise<void>;
    invalidateAndRefreshAccounts: (tokenId: string, chainId: string, chainApp: ChainApp) => Promise<void>;
    invalidateAndRefreshTokenInfo: (tokenId: string, chainId: string, chainApp: ChainApp) => Promise<void>;
    invalidateAndRefreshAllowances: (tokenId: string, chainId: string, chainApp: ChainApp) => Promise<void>;

    // ============ Utility Actions ============
    isBalanceStale: (tokenId: string, chainId: string, address: string) => boolean;
    isTokenInfoStale: (tokenId: string, chainId: string) => boolean;
    isAllowanceStale: (tokenId: string, chainId: string, owner: string, spender: string) => boolean;
}

/**
 * Create the token store
 */
export const useTokenStore = create<TokenStore>((set, get) => ({
    // ============ Initial State ============
    balances: new Map(),
    tokenInfo: new Map(),
    allowances: new Map(),

    // ============ Fetch Actions ============
    /**
     * Fetch balance for a specific address
     * Delegates to fetchAccounts for efficiency (caches all balances in one query)
     */
    fetchBalance: async (tokenId, chainId, address, chainApp, force = false) => {
        const key = `${tokenId}:${chainId}:${address.toLowerCase()}`;

        // Check cache first (skip if forced)
        if (!force) {
            const cached = get().balances.get(key);
            if (cached && cached.status === 'success') {
                const age = Date.now() - cached.timestamp;
                if (age < BALANCE_TTL) {
                    // Cache hit - fresh data
                    return;
                }
            }
        }

        // Delegate to fetchAccounts which caches all balances efficiently
        await get().fetchAccounts(tokenId, chainId, chainApp, force);
        // The balance for 'address' is now in the cache
    },

    fetchTokenInfo: async (tokenId, chainId, chainApp, force = false) => {
        const key = `${tokenId}:${chainId}`;
        const dedupeKey = `token-info-${key}`;

        // Check cache first (skip if forced)
        if (!force) {
            const cached = get().tokenInfo.get(key);
            if (cached && cached.status === 'success') {
                const age = Date.now() - cached.timestamp;
                if (age < TOKEN_INFO_TTL) {
                    // Cache hit - fresh data
                    return;
                }
            }
        }

        await queryDeduplicator.deduplicate(dedupeKey, async () => {
            // Set loading state
            set((state) => {
                const newTokenInfo = new Map(state.tokenInfo);
                const existing = newTokenInfo.get(key);

                newTokenInfo.set(key, {
                    tokenId,
                    chainId,
                    symbol: existing?.symbol ?? null,
                    name: existing?.name ?? null,
                    timestamp: existing?.timestamp ?? Date.now(),
                    status: 'loading',
                    error: null,
                });

                return { tokenInfo: newTokenInfo };
            });

            try {
                if (!chainApp) {
                    throw new Error('Chain is invalid');
                }

                // Fetch ticker symbol
                const tickerResult = await chainApp.query<string>(
                    JSON.stringify(FUNGIBLE_QUERY.TickerSymbol())
                );
                const tickerParsed = JSON.parse(tickerResult) as {
                    data: { tickerSymbol: string } | null;
                };

                // Fetch token name
                const nameResult = await chainApp.query<string>(
                    JSON.stringify(FUNGIBLE_QUERY.TokenName())
                );
                const nameParsed = JSON.parse(nameResult) as {
                    data: { tokenName: string } | null;
                };

                const symbol = tickerParsed.data?.tickerSymbol || null;
                const name = nameParsed.data?.tokenName || null;

                // Update cache with success
                set((state) => {
                    const newTokenInfo = new Map(state.tokenInfo);

                    newTokenInfo.set(key, {
                        tokenId,
                        chainId,
                        symbol,
                        name,
                        timestamp: Date.now(),
                        status: 'success',
                        error: null,
                    });

                    return { tokenInfo: newTokenInfo };
                });
            } catch (err) {
                const error = err instanceof Error ? err : new Error('Failed to fetch token info');

                // Update cache with error
                set((state) => {
                    const newTokenInfo = new Map(state.tokenInfo);
                    const existing = newTokenInfo.get(key);

                    newTokenInfo.set(key, {
                        tokenId,
                        chainId,
                        symbol: existing?.symbol ?? null,
                        name: existing?.name ?? null,
                        timestamp: existing?.timestamp ?? Date.now(),
                        status: 'error',
                        error,
                    });

                    return { tokenInfo: newTokenInfo };
                });

                throw error;
            }
        });
    },

    fetchAccounts: async (tokenId, chainId, chainApp) => {
        const dedupeKey = `accounts-${tokenId}:${chainId}`;

        await queryDeduplicator.deduplicate(dedupeKey, async () => {
            try {
                if (!chainApp) {
                    throw new Error('Chain is invalid');
                }

                const result = await chainApp.query<string>(
                    JSON.stringify(FUNGIBLE_QUERY.Accounts())
                );

                const parsed = JSON.parse(result) as {
                    data: {
                        accounts: {
                            entries: Array<{ key: string; value: string }> | null;
                        } | null;
                    } | null;
                };

                const entries = parsed?.data?.accounts?.entries || [];

                // Update cache for all accounts
                set((state) => {
                    const newBalances = new Map(state.balances);

                    entries.forEach((account) => {
                        const key = `${tokenId}:${chainId}:${account.key.toLowerCase()}`;
                        newBalances.set(key, {
                            tokenId,
                            chainId,
                            address: account.key.toLowerCase(),
                            balance: account.value,
                            timestamp: Date.now(),
                            status: 'success',
                            error: null,
                        });
                    });

                    return { balances: newBalances };
                });
            } catch (err) {
                console.error('Failed to fetch accounts:', err);
                throw err;
            }
        });
    },

    fetchAllowances: async (tokenId, chainId, chainApp, force = false) => {
        const dedupeKey = `allowances-${tokenId}:${chainId}`;

        // Check if we should skip fetch
        if (!force) {
            // Check if we have any allowances cached for this token+chain
            const hasCache = Array.from(get().allowances.keys()).some(key =>
                key.startsWith(`${tokenId}:${chainId}:`)
            );

            if (hasCache) {
                // Check if any cached allowance is fresh
                const hasFresh = Array.from(get().allowances.values()).some(entry => {
                    if (entry.tokenId === tokenId && entry.chainId === chainId) {
                        const age = Date.now() - entry.timestamp;
                        return age < ALLOWANCE_TTL && entry.status === 'success';
                    }
                    return false;
                });

                if (hasFresh) {
                    // Have fresh cache, skip fetch
                    return;
                }
            }
        }

        await queryDeduplicator.deduplicate(dedupeKey, async () => {
            try {
                if (!chainApp) {
                    throw new Error('Chain is invalid');
                }

                const result = await chainApp.query<string>(
                    JSON.stringify(FUNGIBLE_QUERY.Allowances())
                );

                const parsed = JSON.parse(result) as {
                    data: {
                        allowances: {
                            entries: Array<{ key: string; value: string }> | null;
                        } | null;
                    } | null;
                };

                const entries = parsed?.data?.allowances?.entries || [];

                // Update cache for all allowances
                set((state) => {
                    const newAllowances = new Map(state.allowances);

                    entries.forEach((allowanceEntry) => {
                        try {
                            // Parse the OwnerSpender key (JSON format)
                            const ownerSpender = JSON.parse(allowanceEntry.key) as { owner: string; spender: string };
                            const key = `${tokenId}:${chainId}:${ownerSpender.owner.toLowerCase()}:${ownerSpender.spender.toLowerCase()}`;

                            newAllowances.set(key, {
                                tokenId,
                                chainId,
                                owner: ownerSpender.owner.toLowerCase(),
                                spender: ownerSpender.spender.toLowerCase(),
                                allowance: allowanceEntry.value,
                                timestamp: Date.now(),
                                status: 'success',
                                error: null,
                            });
                        } catch (err) {
                            console.error('Failed to parse allowance key:', allowanceEntry.key, err);
                        }
                    });

                    return { allowances: newAllowances };
                });
            } catch (err) {
                console.error('Failed to fetch allowances:', err);
                throw err;
            }
        });
    },

    // ============ Getters ============
    getBalance: (tokenId, chainId, address) => {
        const key = `${tokenId}:${chainId}:${address.toLowerCase()}`;
        const entry = get().balances.get(key);

        // Try case-insensitive match if exact match fails
        if (!entry) {
            const lowerAddress = address.toLowerCase();
            for (const [cachedKey, cachedEntry] of get().balances.entries()) {
                const [cachedTokenId, cachedChainId, cachedAddress] = cachedKey.split(':');
                if (
                    cachedTokenId === tokenId &&
                    cachedChainId === chainId &&
                    cachedAddress.toLowerCase() === lowerAddress
                ) {
                    return cachedEntry.balance;
                }
            }
        }

        return entry?.balance ?? null;
    },

    getTokenSymbol: (tokenId, chainId) => {
        const key = `${tokenId}:${chainId}`;
        const entry = get().tokenInfo.get(key);
        return entry?.symbol ?? null;
    },

    getTokenName: (tokenId, chainId) => {
        const key = `${tokenId}:${chainId}`;
        const entry = get().tokenInfo.get(key);
        return entry?.name ?? null;
    },

    getBalanceStatus: (tokenId, chainId, address) => {
        const key = `${tokenId}:${chainId}:${address.toLowerCase()}`;
        const entry = get().balances.get(key);
        return entry?.status ?? 'idle';
    },

    getTokenInfoStatus: (tokenId, chainId) => {
        const key = `${tokenId}:${chainId}`;
        const entry = get().tokenInfo.get(key);
        return entry?.status ?? 'idle';
    },

    getAllowance: (tokenId, chainId, owner, spender) => {
        const key = `${tokenId}:${chainId}:${owner.toLowerCase()}:${spender.toLowerCase()}`;
        const entry = get().allowances.get(key);

        // Try case-insensitive match if exact match fails
        if (!entry) {
            const lowerOwner = owner.toLowerCase();
            const lowerSpender = spender.toLowerCase();
            for (const [cachedKey, cachedEntry] of get().allowances.entries()) {
                const [cachedTokenId, cachedChainId, cachedOwner, cachedSpender] = cachedKey.split(':');
                if (
                    cachedTokenId === tokenId &&
                    cachedChainId === chainId &&
                    cachedOwner.toLowerCase() === lowerOwner &&
                    cachedSpender.toLowerCase() === lowerSpender
                ) {
                    return cachedEntry.allowance;
                }
            }
        }

        return entry?.allowance ?? null;
    },

    getAllowanceStatus: (tokenId, chainId, owner, spender) => {
        const key = `${tokenId}:${chainId}:${owner.toLowerCase()}:${spender.toLowerCase()}`;
        const entry = get().allowances.get(key);
        return entry?.status ?? 'idle';
    },

    // ============ Invalidation Actions ============
    invalidateBalance: (tokenId, chainId, address) => {
        set((state) => {
            const newBalances = new Map(state.balances);

            if (address) {
                // Invalidate specific balance
                const key = `${tokenId}:${chainId}:${address.toLowerCase()}`;
                const existing = newBalances.get(key);
                if (existing) {
                    newBalances.set(key, {
                        ...existing,
                        timestamp: 0, // Mark as stale
                    });
                }
            } else {
                // Invalidate all balances for this token + chain combo
                newBalances.forEach((value, key) => {
                    if (key.startsWith(`${tokenId}:${chainId}:`)) {
                        newBalances.set(key, {
                            ...value,
                            timestamp: 0,
                        });
                    }
                });
            }

            return { balances: newBalances };
        });
    },

    invalidateTokenInfo: (tokenId, chainId) => {
        set((state) => {
            const newTokenInfo = new Map(state.tokenInfo);
            const key = `${tokenId}:${chainId}`;
            const existing = newTokenInfo.get(key);

            if (existing) {
                newTokenInfo.set(key, {
                    ...existing,
                    timestamp: 0, // Mark as stale
                });
            }

            return { tokenInfo: newTokenInfo };
        });
    },

    invalidateAllowance: (tokenId, chainId, owner, spender) => {
        set((state) => {
            const newAllowances = new Map(state.allowances);

            if (owner && spender) {
                // Invalidate specific allowance
                const key = `${tokenId}:${chainId}:${owner.toLowerCase()}:${spender.toLowerCase()}`;
                const existing = newAllowances.get(key);
                if (existing) {
                    newAllowances.set(key, {
                        ...existing,
                        timestamp: 0, // Mark as stale
                    });
                }
            } else if (owner) {
                // Invalidate all allowances for this owner
                newAllowances.forEach((value, key) => {
                    if (key.startsWith(`${tokenId}:${chainId}:${owner.toLowerCase()}:`)) {
                        newAllowances.set(key, {
                            ...value,
                            timestamp: 0,
                        });
                    }
                });
            } else {
                // Invalidate all allowances for this token + chain combo
                newAllowances.forEach((value, key) => {
                    if (key.startsWith(`${tokenId}:${chainId}:`)) {
                        newAllowances.set(key, {
                            ...value,
                            timestamp: 0,
                        });
                    }
                });
            }

            return { allowances: newAllowances };
        });
    },

    invalidateAll: () => {
        set((state) => {
            // Mark all balances as stale
            const newBalances = new Map(state.balances);
            newBalances.forEach((value, key) => {
                newBalances.set(key, {
                    ...value,
                    timestamp: 0,
                });
            });

            // Mark all token info as stale
            const newTokenInfo = new Map(state.tokenInfo);
            newTokenInfo.forEach((value, key) => {
                newTokenInfo.set(key, {
                    ...value,
                    timestamp: 0,
                });
            });

            // Mark all allowances as stale
            const newAllowances = new Map(state.allowances);
            newAllowances.forEach((value, key) => {
                newAllowances.set(key, {
                    ...value,
                    timestamp: 0,
                });
            });

            return {
                balances: newBalances,
                tokenInfo: newTokenInfo,
                allowances: newAllowances,
            };
        });
    },

    // ============ Combined Invalidate + Refetch Actions ============
    /**
     * Invalidate and force refresh a specific balance
     * Clears deduplicator, invalidates cache, and forces fresh fetch
     */
    invalidateAndRefreshBalance: async (tokenId, chainId, address, chainApp) => {
        const key = `${tokenId}:${chainId}:${address.toLowerCase()}`;
        const dedupeKey = `balance-${key}`;

        // Clear any in-flight requests for this resource
        queryDeduplicator.clear(dedupeKey);

        // Invalidate cache (keeps existing data visible, marks as stale)
        get().invalidateBalance(tokenId, chainId, address.toLowerCase());

        // Force fresh fetch
        await get().fetchBalance(tokenId, chainId, address.toLowerCase(), chainApp, true);
    },

    /**
     * Invalidate and force refresh all accounts for a token
     * Clears deduplicator, invalidates cache, and forces fresh fetch
     */
    invalidateAndRefreshAccounts: async (tokenId, chainId, chainApp) => {
        const dedupeKey = `accounts-${tokenId}:${chainId}`;

        // Clear any in-flight requests for this resource
        queryDeduplicator.clear(dedupeKey);

        // Invalidate all balances for this token + chain combo
        get().invalidateBalance(tokenId, chainId);

        // Force fresh fetch
        await get().fetchAccounts(tokenId, chainId, chainApp, true);
    },

    /**
     * Invalidate and force refresh token info
     * Clears deduplicator, invalidates cache, and forces fresh fetch
     */
    invalidateAndRefreshTokenInfo: async (tokenId, chainId, chainApp) => {
        const key = `${tokenId}:${chainId}`;
        const dedupeKey = `token-info-${key}`;

        // Clear any in-flight requests for this resource
        queryDeduplicator.clear(dedupeKey);

        // Invalidate cache (keeps existing data visible, marks as stale)
        get().invalidateTokenInfo(tokenId, chainId);

        // Force fresh fetch
        await get().fetchTokenInfo(tokenId, chainId, chainApp, true);
    },

    /**
     * Invalidate and force refresh all allowances for a token
     * Clears deduplicator, invalidates cache, and forces fresh fetch
     */
    invalidateAndRefreshAllowances: async (tokenId, chainId, chainApp) => {
        const dedupeKey = `allowances-${tokenId}:${chainId}`;

        // Clear any in-flight requests for this resource
        queryDeduplicator.clear(dedupeKey);

        // Invalidate all allowances for this token + chain combo
        get().invalidateAllowance(tokenId, chainId);

        // Force fresh fetch
        await get().fetchAllowances(tokenId, chainId, chainApp, true);
    },

    // ============ Utility Actions ============
    isBalanceStale: (tokenId, chainId, address) => {
        const key = `${tokenId}:${chainId}:${address.toLowerCase()}`;
        const entry = get().balances.get(key);

        if (!entry || entry.status === 'idle') return true;

        const age = Date.now() - entry.timestamp;
        return age > BALANCE_TTL;
    },

    isTokenInfoStale: (tokenId, chainId) => {
        const key = `${tokenId}:${chainId}`;
        const entry = get().tokenInfo.get(key);

        if (!entry || entry.status === 'idle') return true;

        const age = Date.now() - entry.timestamp;
        return age > TOKEN_INFO_TTL;
    },

    isAllowanceStale: (tokenId, chainId, owner, spender) => {
        const key = `${tokenId}:${chainId}:${owner.toLowerCase()}:${spender.toLowerCase()}`;
        const entry = get().allowances.get(key);

        if (!entry || entry.status === 'idle') return true;

        const age = Date.now() - entry.timestamp;
        return age > ALLOWANCE_TTL;
    },
}));
