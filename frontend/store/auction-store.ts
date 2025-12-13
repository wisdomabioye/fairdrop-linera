/**
 * Centralized Auction Store
 *
 * Global state management for auction data using Zustand.
 * Provides normalized caching, request deduplication, and intelligent polling.
 *
 * Features:
 * - Normalized state: one entry per auction/resource
 * - Request deduplication: prevents duplicate in-flight requests
 * - Intelligent polling: one interval per resource with reference counting
 * - Stale-while-revalidate: show cached data, fetch in background
 * - Automatic cache invalidation on mutations
 * - Indexer initialization management with localStorage persistence
 */

import { create } from 'zustand';
import { queryDeduplicator } from '@/lib/utils/query-deduplicator';
import { pollingManager } from '@/lib/utils/polling-manager';
import {
    INDEXER_QUERY,
    INDEXER_MUTATION,
    // AAC_QUERY,
    UIC_QUERY
} from '@/lib/gql/queries';
import type {
    AuctionSummary,
    BidRecord,
    UserCommitment,
    SubscriptionInfo
} from '@/lib/gql/types';
import type { ApplicationClient } from 'linera-react-client';
import {
    getStoredInitState,
    setStoredInitState,
    clearStoredInitState
} from '@/lib/utils/storage-helpers';

// TTL constants (in milliseconds)
const AUCTION_DATA_TTL = 5000; // 5 seconds - active auction data changes frequently
const AUCTION_LIST_TTL = 10000; // 10 seconds - auction lists
const BID_HISTORY_TTL = 30000; // 30 seconds - bid history changes less frequently
const USER_COMMITMENT_TTL = 10000; // 10 seconds - user commitments

// Store types
export type FetchStatus = 'idle' | 'loading' | 'success' | 'error';

/**
 * Cache entry for auction summary data
 */
export interface AuctionCacheEntry {
    data: AuctionSummary | null;
    timestamp: number;
    status: FetchStatus;
    error: Error | null;
}

/**
 * Cache entry for auction lists (active, settled, by creator)
 */
export interface AuctionListCacheEntry {
    data: AuctionSummary[] | null;
    timestamp: number;
    status: FetchStatus;
    error: Error | null;
    offset: number;
    limit: number;
}

/**
 * Cache entry for bid history
 */
export interface BidHistoryCacheEntry {
    data: BidRecord[] | null;
    timestamp: number;
    status: FetchStatus;
    error: Error | null;
}

/**
 * Cache entry for user commitments
 */
export interface UserCommitmentCacheEntry {
    data: UserCommitment | null;
    timestamp: number;
    status: FetchStatus;
    error: Error | null;
}

/**
 * Main auction store interface
 */
export interface AuctionStore {
    // ============ Indexer Initialization State ============
    indexerInitialized: boolean;
    indexerInitializing: boolean;
    indexerError: Error | null;
    subscriptionInfo: SubscriptionInfo | null;
    indexerChainId: string | null;

    // ============ Normalized Caches ============
    auctions: Map<string, AuctionCacheEntry>; // auctionId -> auction summary
    activeAuctions: AuctionListCacheEntry | null;
    settledAuctions: AuctionListCacheEntry | null;
    auctionsByCreator: Map<string, AuctionListCacheEntry>; // creator -> auctions
    bidHistory: Map<string, BidHistoryCacheEntry>; // auctionId -> bids
    userCommitments: Map<string, Map<string, UserCommitmentCacheEntry>>; // auctionId -> userChain -> commitment

    // ============ Indexer Actions ============
    initializeIndexer: (
        indexerChainId: string,
        aacChain: string,
        auctionApp: string,
        indexerApp: ApplicationClient
    ) => Promise<void>;
    checkSubscriptionInfo: (indexerApp: ApplicationClient) => Promise<SubscriptionInfo | null>;
    resetIndexer: () => void;

    // ============ Fetch Actions ============
    fetchAuctionSummary: (auctionId: string, indexerApp: ApplicationClient) => Promise<void>;
    fetchActiveAuctions: (offset: number, limit: number, indexerApp: ApplicationClient) => Promise<void>;
    fetchSettledAuctions: (offset: number, limit: number, indexerApp: ApplicationClient) => Promise<void>;
    fetchAuctionsByCreator: (creator: string, offset: number, limit: number, indexerApp: ApplicationClient) => Promise<void>;
    fetchBidHistory: (auctionId: string, offset: number, limit: number, indexerApp: ApplicationClient) => Promise<void>;
    fetchMyCommitment: (auctionId: string, uicApp: ApplicationClient) => Promise<void>;

    // ============ Invalidation Actions ============
    invalidateAuction: (auctionId: string) => void;
    invalidateActiveAuctions: () => void;
    invalidateSettledAuctions: () => void;
    invalidateAuctionsByCreator: (creator: string) => void;
    invalidateBidHistory: (auctionId: string) => void;
    invalidateUserCommitment: (auctionId: string, userChain?: string) => void;
    invalidateAll: () => void;

    // ============ Polling Actions ============
    startPollingAuction: (auctionId: string, indexerApp: ApplicationClient, interval?: number) => () => void;
    startPollingActiveAuctions: (offset: number, limit: number, indexerApp: ApplicationClient, interval?: number) => () => void;

    // ============ Utility Actions ============
    isStale: (
        type: 'auction' | 'activeAuctions' | 'settledAuctions' | 'auctionsByCreator' | 'bidHistory' | 'userCommitment',
        key?: string
    ) => boolean;
}

/**
 * Create the auction store
 */
export const useAuctionStore = create<AuctionStore>((set, get) => ({
    // ============ Initial State ============
    indexerInitialized: false,
    indexerInitializing: false,
    indexerError: null,
    subscriptionInfo: null,
    indexerChainId: null,

    auctions: new Map(),
    activeAuctions: null,
    settledAuctions: null,
    auctionsByCreator: new Map(),
    bidHistory: new Map(),
    userCommitments: new Map(),

    // ============ Indexer Initialization ============
    initializeIndexer: async (indexerChainId, aacChain, auctionApp, indexerApp) => {
        await queryDeduplicator.deduplicate('indexer-init', async () => {
            try {
                set({
                    indexerInitializing: true,
                    indexerError: null,
                    indexerChainId
                });

                // OPTIMIZATION: Check localStorage first
                // const cached = getStoredInitState(indexerChainId);
                // if (cached?.initialized) {
                //     console.log('[AuctionStore] Using cached initialization state');
                //     set({
                //         indexerInitialized: true,
                //         indexerInitializing: false,
                //         subscriptionInfo: cached
                //     });

                //     // Note: Background verification removed to prevent state toggling
                //     // The cached state is already verified on initial initialization
                //     return;
                // }

                // Check on-chain state
                const infoResult = await indexerApp.publicClient.query<string>(
                    JSON.stringify(INDEXER_QUERY.SubscriptionInfo())
                );
                console.log('SubscriptionInfo', infoResult)
                const { data } = JSON.parse(infoResult) as { data: { subscriptionInfo: SubscriptionInfo | null } };
                const info = data.subscriptionInfo;

                if (info?.initialized) {
                    // Already initialized, cache and return
                    console.log('[AuctionStore] Indexer already initialized on-chain');
                    // setStoredInitState(indexerChainId, info);
                    set({
                        indexerInitialized: true,
                        indexerInitializing: false,
                        subscriptionInfo: info
                    });
                    return;
                }

                // Not initialized, perform mutation
                console.log('[AuctionStore] Initializing indexer...');
                await indexerApp.publicClient.systemMutate<string>(
                    JSON.stringify(INDEXER_MUTATION.Initialize(aacChain, auctionApp))
                );

                const newInfo: SubscriptionInfo = {
                    aacChain,
                    auctionApp,
                    initialized: true
                };

                // setStoredInitState(indexerChainId, newInfo);
                set({
                    indexerInitialized: true,
                    indexerInitializing: false,
                    subscriptionInfo: newInfo
                });

            } catch (err) {
                const error = err instanceof Error ? err : new Error('Indexer initialization failed');
                set({
                    indexerError: error,
                    indexerInitializing: false
                });
                throw error;
            }
        });
    },

    checkSubscriptionInfo: async (indexerApp) => {
        const result = await indexerApp.publicClient.query<string>(
            JSON.stringify(INDEXER_QUERY.SubscriptionInfo())
        );
        console.log('checkSubscriptionInfo', result)
        const { data } = JSON.parse(result) as { data: { subscriptionInfo: SubscriptionInfo | null } };
        const info = data.subscriptionInfo;

        // Update local state to match on-chain reality
        set({
            subscriptionInfo: info,
            indexerInitialized: !!info?.initialized
        });

        // Update localStorage if initialized
        if (info?.initialized && get().indexerChainId) {
            // setStoredInitState(get().indexerChainId!, info);
        }

        return info;
    },

    resetIndexer: () => {
        clearStoredInitState();
        set({
            indexerInitialized: false,
            indexerInitializing: false,
            indexerError: null,
            subscriptionInfo: null,
            indexerChainId: null
        });
    },

    // ============ Fetch Actions ============
    fetchAuctionSummary: async (auctionId, indexerApp) => {
        // Guard: Ensure indexer is initialized
        if (!get().indexerInitialized) {
            throw new Error('Indexer not initialized. Call initializeIndexer() first.');
        }

        const key = `auction-summary-${auctionId}`;

        await queryDeduplicator.deduplicate(key, async () => {
            // Update status to loading
            set((state) => {
                const newAuctions = new Map(state.auctions);
                const existing = newAuctions.get(auctionId);
                newAuctions.set(auctionId, {
                    data: existing?.data ?? null,
                    timestamp: existing?.timestamp ?? Date.now(),
                    status: 'loading',
                    error: null,
                });
                return { auctions: newAuctions };
            });

            try {
                const result = await indexerApp.publicClient.query<string>(
                    JSON.stringify(INDEXER_QUERY.AuctionSummary(auctionId))
                );
                console.log('AuctionSummary', result)

                const { data } = JSON.parse(result) as {
                    data: { auctionSummary: AuctionSummary | null } 
                };

                // Update cache with success
                set((state) => {
                    const newAuctions = new Map(state.auctions);
                    newAuctions.set(auctionId, {
                        data: data.auctionSummary,
                        timestamp: Date.now(),
                        status: 'success',
                        error: null,
                    });
                    return { auctions: newAuctions };
                });
            } catch (err) {
                const error = err instanceof Error ? err : new Error('Failed to fetch auction summary');

                // Update cache with error
                set((state) => {
                    const newAuctions = new Map(state.auctions);
                    const existing = newAuctions.get(auctionId);
                    newAuctions.set(auctionId, {
                        data: existing?.data ?? null,
                        timestamp: existing?.timestamp ?? Date.now(),
                        status: 'error',
                        error,
                    });
                    return { auctions: newAuctions };
                });

                throw error;
            }
        });
    },

    fetchActiveAuctions: async (offset, limit, indexerApp) => {
        if (!get().indexerInitialized) {
            throw new Error('Indexer not initialized. Call initializeIndexer() first.');
        }

        const key = `active-auctions-${offset}-${limit}`;

        await queryDeduplicator.deduplicate(key, async () => {
            set((state) => ({
                activeAuctions: {
                    data: state.activeAuctions?.data ?? null,
                    timestamp: state.activeAuctions?.timestamp ?? Date.now(),
                    status: 'loading',
                    error: null,
                    offset,
                    limit,
                }
            }));

            try {
                const result = await indexerApp.publicClient.query<string>(
                    JSON.stringify(INDEXER_QUERY.ActiveAuctions(offset, limit))
                );
                console.log('ActiveAuctions', result)

                const { data } = JSON.parse(result) as {
                    data: { activeAuctions: AuctionSummary[] | null }
                };

                set({
                    activeAuctions: {
                        data: data.activeAuctions,
                        timestamp: Date.now(),
                        status: 'success',
                        error: null,
                        offset,
                        limit,
                    }
                });
            } catch (err) {
                const error = err instanceof Error ? err : new Error('Failed to fetch active auctions');

                set((state) => ({
                    activeAuctions: {
                        data: state.activeAuctions?.data ?? null,
                        timestamp: state.activeAuctions?.timestamp ?? Date.now(),
                        status: 'error',
                        error,
                        offset,
                        limit,
                    }
                }));

                throw error;
            }
        });
    },

    fetchSettledAuctions: async (offset, limit, indexerApp) => {
        if (!get().indexerInitialized) {
            throw new Error('Indexer not initialized. Call initializeIndexer() first.');
        }

        const key = `settled-auctions-${offset}-${limit}`;

        await queryDeduplicator.deduplicate(key, async () => {
            set((state) => ({
                settledAuctions: {
                    data: state.settledAuctions?.data ?? null,
                    timestamp: state.settledAuctions?.timestamp ?? Date.now(),
                    status: 'loading',
                    error: null,
                    offset,
                    limit,
                }
            }));

            try {
                const result = await indexerApp.publicClient.query<string>(
                    JSON.stringify(INDEXER_QUERY.SettledAuctions(offset, limit))
                );
                console.log('SettledAuctions', result)

                const { data } = JSON.parse(result) as {
                    data: { settledAuctions: AuctionSummary[] | null } 
                };

                set({
                    settledAuctions: {
                        data: data.settledAuctions,
                        timestamp: Date.now(),
                        status: 'success',
                        error: null,
                        offset,
                        limit,
                    }
                });
            } catch (err) {
                const error = err instanceof Error ? err : new Error('Failed to fetch settled auctions');

                set((state) => ({
                    settledAuctions: {
                        data: state.settledAuctions?.data ?? null,
                        timestamp: state.settledAuctions?.timestamp ?? Date.now(),
                        status: 'error',
                        error,
                        offset,
                        limit,
                    }
                }));

                throw error;
            }
        });
    },

    fetchAuctionsByCreator: async (creator, offset, limit, indexerApp) => {
        if (!get().indexerInitialized) {
            throw new Error('Indexer not initialized. Call initializeIndexer() first.');
        }

        const key = `auctions-by-creator-${creator}-${offset}-${limit}`;

        await queryDeduplicator.deduplicate(key, async () => {
            set((state) => {
                const newMap = new Map(state.auctionsByCreator);
                const existing = newMap.get(creator);
                newMap.set(creator, {
                    data: existing?.data ?? null,
                    timestamp: existing?.timestamp ?? Date.now(),
                    status: 'loading',
                    error: null,
                    offset,
                    limit,
                });
                return { auctionsByCreator: newMap };
            });

            try {
                const result = await indexerApp.publicClient.query<string>(
                    JSON.stringify(INDEXER_QUERY.AuctionsByCreator(creator, offset, limit))
                );
                console.log('AuctionsByCreator', result)

                const { data } = JSON.parse(result) as {
                    data: { auctionsByCreator: AuctionSummary[] | null } 
                };

                set((state) => {
                    const newMap = new Map(state.auctionsByCreator);
                    newMap.set(creator, {
                        data: data.auctionsByCreator,
                        timestamp: Date.now(),
                        status: 'success',
                        error: null,
                        offset,
                        limit,
                    });
                    return { auctionsByCreator: newMap };
                });
            } catch (err) {
                const error = err instanceof Error ? err : new Error('Failed to fetch auctions by creator');

                set((state) => {
                    const newMap = new Map(state.auctionsByCreator);
                    const existing = newMap.get(creator);
                    newMap.set(creator, {
                        data: existing?.data ?? null,
                        timestamp: existing?.timestamp ?? Date.now(),
                        status: 'error',
                        error,
                        offset,
                        limit,
                    });
                    return { auctionsByCreator: newMap };
                });

                throw error;
            }
        });
    },

    fetchBidHistory: async (auctionId, offset, limit, indexerApp) => {
        if (!get().indexerInitialized) {
            throw new Error('Indexer not initialized. Call initializeIndexer() first.');
        }

        const key = `bid-history-${auctionId}-${offset}-${limit}`;

        await queryDeduplicator.deduplicate(key, async () => {
            set((state) => {
                const newMap = new Map(state.bidHistory);
                const existing = newMap.get(auctionId);
                newMap.set(auctionId, {
                    data: existing?.data ?? null,
                    timestamp: existing?.timestamp ?? Date.now(),
                    status: 'loading',
                    error: null,
                });
                return { bidHistory: newMap };
            });

            try {
                const result = await indexerApp.publicClient.query<string>(
                    JSON.stringify(INDEXER_QUERY.BidHistory(auctionId, offset, limit))
                );
                console.log('BidHistory', result)

                const { data } = JSON.parse(result) as {
                    data: { bidHistory: BidRecord[] | null } 
                };

                set((state) => {
                    const newMap = new Map(state.bidHistory);
                    newMap.set(auctionId, {
                        data: data.bidHistory,
                        timestamp: Date.now(),
                        status: 'success',
                        error: null,
                    });
                    return { bidHistory: newMap };
                });
            } catch (err) {
                const error = err instanceof Error ? err : new Error('Failed to fetch bid history');

                set((state) => {
                    const newMap = new Map(state.bidHistory);
                    const existing = newMap.get(auctionId);
                    newMap.set(auctionId, {
                        data: existing?.data ?? null,
                        timestamp: existing?.timestamp ?? Date.now(),
                        status: 'error',
                        error,
                    });
                    return { bidHistory: newMap };
                });

                throw error;
            }
        });
    },

    fetchMyCommitment: async (auctionId, uicApp) => {
        const key = `my-commitment-${auctionId}`;
        const userChain = uicApp.walletClient?.getChainId(); // Get current user's chain

        await queryDeduplicator.deduplicate(key, async () => {
            set((state) => {
                const newMap = new Map(state.userCommitments);
                const auctionMap = newMap.get(auctionId) ?? new Map();
                const existing = auctionMap.get(userChain);

                auctionMap.set(userChain, {
                    data: existing?.data ?? null,
                    timestamp: existing?.timestamp ?? Date.now(),
                    status: 'loading',
                    error: null,
                });
                newMap.set(auctionId, auctionMap);
                return { userCommitments: newMap };
            });

            try {
                const result = await uicApp.walletClient?.query<string>(
                    JSON.stringify(UIC_QUERY.MyCommitmentForAuction(Number(auctionId)))
                );
                console.log('MyCommitmentForAuction', result)

                const { data } = JSON.parse(result || '') as {
                    data: { myCommitmentForAuction: UserCommitment | null } 
                };

                set((state) => {
                    const newMap = new Map(state.userCommitments);
                    const auctionMap = newMap.get(auctionId) ?? new Map();

                    auctionMap.set(userChain, {
                        data: data.myCommitmentForAuction,
                        timestamp: Date.now(),
                        status: 'success',
                        error: null,
                    });
                    newMap.set(auctionId, auctionMap);
                    return { userCommitments: newMap };
                });
            } catch (err) {
                const error = err instanceof Error ? err : new Error('Failed to fetch user commitment');

                set((state) => {
                    const newMap = new Map(state.userCommitments);
                    const auctionMap = newMap.get(auctionId) ?? new Map();
                    const existing = auctionMap.get(userChain);

                    auctionMap.set(userChain, {
                        data: existing?.data ?? null,
                        timestamp: existing?.timestamp ?? Date.now(),
                        status: 'error',
                        error,
                    });
                    newMap.set(auctionId, auctionMap);
                    return { userCommitments: newMap };
                });

                throw error;
            }
        });
    },

    // ============ Invalidation Actions ============
    invalidateAuction: (auctionId) => {
        set((state) => {
            const newAuctions = new Map(state.auctions);
            const existing = newAuctions.get(auctionId);
            if (existing) {
                newAuctions.set(auctionId, {
                    ...existing,
                    timestamp: 0, // Mark as stale
                });
            }
            return { auctions: newAuctions };
        });
    },

    invalidateActiveAuctions: () => {
        set((state) => ({
            activeAuctions: state.activeAuctions ? {
                ...state.activeAuctions,
                timestamp: 0
            } : null
        }));
    },

    invalidateSettledAuctions: () => {
        set((state) => ({
            settledAuctions: state.settledAuctions ? {
                ...state.settledAuctions,
                timestamp: 0
            } : null
        }));
    },

    invalidateAuctionsByCreator: (creator) => {
        set((state) => {
            const newMap = new Map(state.auctionsByCreator);
            const existing = newMap.get(creator);
            if (existing) {
                newMap.set(creator, {
                    ...existing,
                    timestamp: 0
                });
            }
            return { auctionsByCreator: newMap };
        });
    },

    invalidateBidHistory: (auctionId) => {
        set((state) => {
            const newMap = new Map(state.bidHistory);
            const existing = newMap.get(auctionId);
            if (existing) {
                newMap.set(auctionId, {
                    ...existing,
                    timestamp: 0
                });
            }
            return { bidHistory: newMap };
        });
    },

    invalidateUserCommitment: (auctionId, userChain) => {
        set((state) => {
            const newMap = new Map(state.userCommitments);
            const auctionMap = newMap.get(auctionId);

            if (auctionMap) {
                if (userChain) {
                    // Invalidate specific user
                    const existing = auctionMap.get(userChain);
                    if (existing) {
                        auctionMap.set(userChain, {
                            ...existing,
                            timestamp: 0
                        });
                    }
                } else {
                    // Invalidate all users for this auction
                    auctionMap.forEach((value, key) => {
                        auctionMap.set(key, {
                            ...value,
                            timestamp: 0
                        });
                    });
                }
                newMap.set(auctionId, auctionMap);
            }

            return { userCommitments: newMap };
        });
    },

    invalidateAll: () => {
        set({
            auctions: new Map(),
            activeAuctions: null,
            settledAuctions: null,
            auctionsByCreator: new Map(),
            bidHistory: new Map(),
            userCommitments: new Map(),
        });
    },

    // ============ Polling Actions ============
    startPollingAuction: (auctionId, indexerApp, interval = 5000) => {
        const key = `auction-${auctionId}`;

        return pollingManager.subscribe(
            key,
            () => get().fetchAuctionSummary(auctionId, indexerApp),
            interval
        );
    },

    startPollingActiveAuctions: (offset, limit, indexerApp, interval = 10000) => {
        const key = `active-auctions-${offset}-${limit}`;

        return pollingManager.subscribe(
            key,
            () => get().fetchActiveAuctions(offset, limit, indexerApp),
            interval
        );
    },

    // ============ Utility Actions ============
    isStale: (type, key) => {
        const now = Date.now();

        switch (type) {
            case 'auction': {
                if (!key) return true;
                const entry = get().auctions.get(key);
                if (!entry || entry.status === 'idle') return true;
                return now - entry.timestamp > AUCTION_DATA_TTL;
            }
            case 'activeAuctions': {
                const entry = get().activeAuctions;
                if (!entry || entry.status === 'idle') return true;
                return now - entry.timestamp > AUCTION_LIST_TTL;
            }
            case 'settledAuctions': {
                const entry = get().settledAuctions;
                if (!entry || entry.status === 'idle') return true;
                return now - entry.timestamp > AUCTION_LIST_TTL;
            }
            case 'auctionsByCreator': {
                if (!key) return true;
                const entry = get().auctionsByCreator.get(key);
                if (!entry || entry.status === 'idle') return true;
                return now - entry.timestamp > AUCTION_LIST_TTL;
            }
            case 'bidHistory': {
                if (!key) return true;
                const entry = get().bidHistory.get(key);
                if (!entry || entry.status === 'idle') return true;
                return now - entry.timestamp > BID_HISTORY_TTL;
            }
            case 'userCommitment': {
                if (!key) return true;
                const [auctionId, userChain] = key.split(':');
                const auctionMap = get().userCommitments.get(auctionId);
                if (!auctionMap || !userChain) return true;
                const entry = auctionMap.get(userChain);
                if (!entry || entry.status === 'idle') return true;
                return now - entry.timestamp > USER_COMMITMENT_TTL;
            }
            default:
                return true;
        }
    },
}));
