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
 * Main token store interface
 */
export interface TokenStore {
    // ============ Normalized Caches ============
    balances: Map<string, TokenBalanceCacheEntry>; // `${tokenId}:${chainId}:${address}` -> balance
    tokenInfo: Map<string, TokenInfoCacheEntry>; // `${tokenId}:${chainId}` -> info

    // ============ Fetch Actions ============
    fetchBalance: (tokenId: string, chainId: string, address: string, chainApp: ChainApp) => Promise<void>;
    fetchTokenInfo: (tokenId: string, chainId: string, chainApp: ChainApp) => Promise<void>;
    fetchAccounts: (tokenId: string, chainId: string, chainApp: ChainApp) => Promise<void>;

    // ============ Getters ============
    getBalance: (tokenId: string, chainId: string, address: string) => string | null;
    getTokenSymbol: (tokenId: string, chainId: string) => string | null;
    getTokenName: (tokenId: string, chainId: string) => string | null;
    getBalanceStatus: (tokenId: string, chainId: string, address: string) => FetchStatus;
    getTokenInfoStatus: (tokenId: string, chainId: string) => FetchStatus;

    // ============ Invalidation Actions ============
    invalidateBalance: (tokenId: string, chainId: string, address?: string) => void;
    invalidateTokenInfo: (tokenId: string, chainId: string) => void;
    invalidateAll: () => void;

    // ============ Utility Actions ============
    isBalanceStale: (tokenId: string, chainId: string, address: string) => boolean;
    isTokenInfoStale: (tokenId: string, chainId: string) => boolean;
}

/**
 * Create the token store
 */
export const useTokenStore = create<TokenStore>((set, get) => ({
    // ============ Initial State ============
    balances: new Map(),
    tokenInfo: new Map(),

    // ============ Fetch Actions ============
    fetchBalance: async (tokenId, chainId, address, chainApp) => {
        const key = `${tokenId}:${chainId}:${address}`;
        const dedupeKey = `balance-${key}`;

        // Check cache first
        const cached = get().balances.get(key);
        if (cached && cached.status === 'success') {
            const age = Date.now() - cached.timestamp;
            if (age < BALANCE_TTL) {
                // Cache hit - fresh data
                return;
            }
        }

        await queryDeduplicator.deduplicate(dedupeKey, async () => {
            // Set loading state
            set((state) => {
                const newBalances = new Map(state.balances);
                const existing = newBalances.get(key);

                newBalances.set(key, {
                    tokenId,
                    chainId,
                    address,
                    balance: existing?.balance ?? null,
                    timestamp: existing?.timestamp ?? Date.now(),
                    status: 'loading',
                    error: null,
                });

                return { balances: newBalances };
            });

            try {
                if (!chainApp) {
                    throw new Error('Chain not found');
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

                // Find balance for this address (case-insensitive)
                const entries = parsed?.data?.accounts?.entries || [];
                const account = entries.find(
                    (acc) => acc.key.toLowerCase() === address.toLowerCase()
                );

                const balance = account ? account.value : null;

                // Update cache with success
                set((state) => {
                    const newBalances = new Map(state.balances);

                    newBalances.set(key, {
                        tokenId,
                        chainId,
                        address,
                        balance,
                        timestamp: Date.now(),
                        status: 'success',
                        error: null,
                    });

                    return { balances: newBalances };
                });
            } catch (err) {
                const error = err instanceof Error ? err : new Error('Failed to fetch balance');

                // Update cache with error
                set((state) => {
                    const newBalances = new Map(state.balances);
                    const existing = newBalances.get(key);

                    newBalances.set(key, {
                        tokenId,
                        chainId,
                        address,
                        balance: existing?.balance ?? null,
                        timestamp: existing?.timestamp ?? Date.now(),
                        status: 'error',
                        error,
                    });

                    return { balances: newBalances };
                });

                throw error;
            }
        });
    },

    fetchTokenInfo: async (tokenId, chainId, chainApp) => {
        const key = `${tokenId}:${chainId}`;
        const dedupeKey = `token-info-${key}`;

        // Check cache first
        const cached = get().tokenInfo.get(key);
        if (cached && cached.status === 'success') {
            const age = Date.now() - cached.timestamp;
            if (age < TOKEN_INFO_TTL) {
                // Cache hit - fresh data
                return;
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
                        const key = `${tokenId}:${chainId}:${account.key}`;
                        newBalances.set(key, {
                            tokenId,
                            chainId,
                            address: account.key,
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

    // ============ Getters ============
    getBalance: (tokenId, chainId, address) => {
        const key = `${tokenId}:${chainId}:${address}`;
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
        const key = `${tokenId}:${chainId}:${address}`;
        const entry = get().balances.get(key);
        return entry?.status ?? 'idle';
    },

    getTokenInfoStatus: (tokenId, chainId) => {
        const key = `${tokenId}:${chainId}`;
        const entry = get().tokenInfo.get(key);
        return entry?.status ?? 'idle';
    },

    // ============ Invalidation Actions ============
    invalidateBalance: (tokenId, chainId, address) => {
        set((state) => {
            const newBalances = new Map(state.balances);

            if (address) {
                // Invalidate specific balance
                const key = `${tokenId}:${chainId}:${address}`;
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

            return {
                balances: newBalances,
                tokenInfo: newTokenInfo,
            };
        });
    },

    // ============ Utility Actions ============
    isBalanceStale: (tokenId, chainId, address) => {
        const key = `${tokenId}:${chainId}:${address}`;
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
}));
