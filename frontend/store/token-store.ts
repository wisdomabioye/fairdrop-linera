/**
 * Centralized Token Store
 *
 * Global state management for fungible token data using Zustand.
 * Provides normalized caching, request deduplication, and efficient polling.
 *
 * Features:
 * - Normalized state: one entry per (tokenId, address) pair
 * - Request deduplication: prevents duplicate in-flight requests
 * - TTL-based caching: automatic stale detection
 * - Persists across navigation: balances remain when switching pages
 * - Token switching: clean transitions without data mixing
 */

import { create } from 'zustand';
import { queryDeduplicator } from '@/lib/utils/query-deduplicator';
import { FUNGIBLE_QUERY } from '@/lib/gql/queries';
import type { ApplicationClient } from 'linera-react-client';

// TTL constants (in milliseconds)
const BALANCE_TTL = 10000; // 10 seconds - balances can change frequently
const TOKEN_INFO_TTL = 6000000; // token info should not change

export type FetchStatus = 'idle' | 'loading' | 'success' | 'error';

/**
 * Token balance cache entry
 * Key: `${tokenId}:${address}`
 */
export interface TokenBalanceCacheEntry {
    tokenId: string;
    address: string;
    balance: string | null;
    timestamp: number;
    status: FetchStatus;
    error: Error | null;
}

/**
 * Token info cache entry (symbol, name)
 * Key: `${tokenId}`
 */
export interface TokenInfoCacheEntry {
    tokenId: string;
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
    balances: Map<string, TokenBalanceCacheEntry>; // `${tokenId}:${address}` -> balance
    tokenInfo: Map<string, TokenInfoCacheEntry>; // `${tokenId}` -> info

    // ============ Fetch Actions ============
    fetchBalance: (tokenId: string, address: string, fungibleApp: ApplicationClient) => Promise<void>;
    fetchTokenInfo: (tokenId: string, fungibleApp: ApplicationClient) => Promise<void>;
    fetchAccounts: (tokenId: string, fungibleApp: ApplicationClient) => Promise<void>;

    // ============ Getters ============
    getBalance: (tokenId: string, address: string) => string | null;
    getTokenSymbol: (tokenId: string) => string | null;
    getTokenName: (tokenId: string) => string | null;
    getBalanceStatus: (tokenId: string, address: string) => FetchStatus;
    getTokenInfoStatus: (tokenId: string) => FetchStatus;

    // ============ Invalidation Actions ============
    invalidateBalance: (tokenId: string, address?: string) => void;
    invalidateTokenInfo: (tokenId: string) => void;
    invalidateAll: () => void;

    // ============ Utility Actions ============
    isBalanceStale: (tokenId: string, address: string) => boolean;
    isTokenInfoStale: (tokenId: string) => boolean;
}

/**
 * Create the token store
 */
export const useTokenStore = create<TokenStore>((set, get) => ({
    // ============ Initial State ============
    balances: new Map(),
    tokenInfo: new Map(),

    // ============ Fetch Actions ============
    fetchBalance: async (tokenId, address, fungibleApp) => {
        const key = `${tokenId}:${address}`;
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
                    address,
                    balance: existing?.balance ?? null,
                    timestamp: existing?.timestamp ?? Date.now(),
                    status: 'loading',
                    error: null,
                });

                return { balances: newBalances };
            });

            try {
                if (!fungibleApp?.walletClient) {
                    throw new Error('Wallet not connected');
                }

                const result = await fungibleApp.walletClient.query<string>(
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

    fetchTokenInfo: async (tokenId, fungibleApp) => {
        const dedupeKey = `token-info-${tokenId}`;

        // Check cache first
        const cached = get().tokenInfo.get(tokenId);
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
                const existing = newTokenInfo.get(tokenId);

                newTokenInfo.set(tokenId, {
                    tokenId,
                    symbol: existing?.symbol ?? null,
                    name: existing?.name ?? null,
                    timestamp: existing?.timestamp ?? Date.now(),
                    status: 'loading',
                    error: null,
                });

                return { tokenInfo: newTokenInfo };
            });

            try {
                if (!fungibleApp?.walletClient) {
                    throw new Error('Wallet not connected');
                }

                // Fetch ticker symbol
                const tickerResult = await fungibleApp.walletClient.query<string>(
                    JSON.stringify(FUNGIBLE_QUERY.TickerSymbol())
                );
                const tickerParsed = JSON.parse(tickerResult) as {
                    data: { tickerSymbol: string } | null;
                };

                // Fetch token name
                const nameResult = await fungibleApp.walletClient.query<string>(
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

                    newTokenInfo.set(tokenId, {
                        tokenId,
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
                    const existing = newTokenInfo.get(tokenId);

                    newTokenInfo.set(tokenId, {
                        tokenId,
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

    fetchAccounts: async (tokenId, fungibleApp) => {
        const dedupeKey = `accounts-${tokenId}`;

        await queryDeduplicator.deduplicate(dedupeKey, async () => {
            try {
                if (!fungibleApp?.walletClient) {
                    throw new Error('Wallet not connected');
                }

                const result = await fungibleApp.walletClient.query<string>(
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
                        const key = `${tokenId}:${account.key}`;
                        newBalances.set(key, {
                            tokenId,
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
    getBalance: (tokenId, address) => {
        const key = `${tokenId}:${address}`;
        const entry = get().balances.get(key);

        // Try case-insensitive match if exact match fails
        if (!entry) {
            const lowerAddress = address.toLowerCase();
            for (const [cachedKey, cachedEntry] of get().balances.entries()) {
                const [cachedTokenId, cachedAddress] = cachedKey.split(':');
                if (
                    cachedTokenId === tokenId &&
                    cachedAddress.toLowerCase() === lowerAddress
                ) {
                    return cachedEntry.balance;
                }
            }
        }

        return entry?.balance ?? null;
    },

    getTokenSymbol: (tokenId) => {
        const entry = get().tokenInfo.get(tokenId);
        return entry?.symbol ?? null;
    },

    getTokenName: (tokenId) => {
        const entry = get().tokenInfo.get(tokenId);
        return entry?.name ?? null;
    },

    getBalanceStatus: (tokenId, address) => {
        const key = `${tokenId}:${address}`;
        const entry = get().balances.get(key);
        return entry?.status ?? 'idle';
    },

    getTokenInfoStatus: (tokenId) => {
        const entry = get().tokenInfo.get(tokenId);
        return entry?.status ?? 'idle';
    },

    // ============ Invalidation Actions ============
    invalidateBalance: (tokenId, address) => {
        set((state) => {
            const newBalances = new Map(state.balances);

            if (address) {
                // Invalidate specific balance
                const key = `${tokenId}:${address}`;
                const existing = newBalances.get(key);
                if (existing) {
                    newBalances.set(key, {
                        ...existing,
                        timestamp: 0, // Mark as stale
                    });
                }
            } else {
                // Invalidate all balances for this token
                newBalances.forEach((value, key) => {
                    if (key.startsWith(`${tokenId}:`)) {
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

    invalidateTokenInfo: (tokenId) => {
        set((state) => {
            const newTokenInfo = new Map(state.tokenInfo);
            const existing = newTokenInfo.get(tokenId);

            if (existing) {
                newTokenInfo.set(tokenId, {
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
    isBalanceStale: (tokenId, address) => {
        const key = `${tokenId}:${address}`;
        const entry = get().balances.get(key);

        if (!entry || entry.status === 'idle') return true;

        const age = Date.now() - entry.timestamp;
        return age > BALANCE_TTL;
    },

    isTokenInfoStale: (tokenId) => {
        const entry = get().tokenInfo.get(tokenId);

        if (!entry || entry.status === 'idle') return true;

        const age = Date.now() - entry.timestamp;
        return age > TOKEN_INFO_TTL;
    },
}));
