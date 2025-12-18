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
    AAC_QUERY,
    UIC_QUERY
} from '@/lib/gql/queries';
import {
    type AuctionSummary,
    type AuctionWithId,
    type BidRecord,
    type UserCommitment,
    type AuctionCommitment,
    type SubscriptionInfo,
    transformAuctionWithId,
    transformBidRecord,
    AuctionStatus
} from '@/lib/gql/types';
import type { ApplicationClient } from 'linera-react-client';
import {
    // getStoredInitState,
    // setStoredInitState,
    clearStoredInitState
} from '@/lib/utils/storage-helpers';


// TTL constants (in milliseconds)
// Note: TTLs are set ~20% longer than default polling intervals to prevent
// cache expiration right when polling checks, reducing unnecessary API calls
const AUCTION_DATA_TTL = 6000; // 6s (polling: 5s) - auction data changes frequently
const AUCTION_LIST_TTL = 12000; // 12s (polling: 10s) - auction lists
const BID_HISTORY_TTL = 6000; // 6s (polling: 5s) - bid history
const USER_COMMITMENT_TTL = 10000; // 10s - user commitments (no default polling)

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
 * Stores only auction IDs from the specific query, not full data.
 * Full auction data is looked up from the normalized allAuctionsCache.
 */
export interface AuctionListCacheEntry {
    auctionIds: string[];  // IDs of auctions from this specific query
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
 * Cache entry for all user commitments
 */
export interface AllCommitmentsCacheEntry {
    data: AuctionCommitment[] | null;
    timestamp: number;
    status: FetchStatus;
    error: Error | null;
}

/**
 * Metadata for all auctions fetch operations
 */
export interface AllAuctionsMetadata {
    lastFetchTime: number;
    status: FetchStatus;
    error: Error | null;
    offset: number;
    limit: number;
    fetchedIds: string[]; // IDs that were fetched in the last query
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
    allAuctionsCache: Map<string, AuctionCacheEntry>; // auctionId -> auction (normalized, single source of truth)
    allAuctionsMeta: AllAuctionsMetadata | null; // metadata for allAuctions fetches
    activeAuctions: AuctionListCacheEntry | null;
    settledAuctions: AuctionListCacheEntry | null;
    auctionsByCreator: Map<string, AuctionListCacheEntry>; // creator -> auctions
    bidHistory: Map<string, BidHistoryCacheEntry>; // auctionId -> bids
    userCommitments: Map<string, Map<string, UserCommitmentCacheEntry>>; // auctionId -> userChain -> commitment
    allMyCommitments: Map<string, AllCommitmentsCacheEntry>; // userChain -> all commitments

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
    // TEMPORARY: Using AAC queries while indexer event streaming is fixed
    fetchAuctionSummary: (auctionId: string, aacApp: ApplicationClient, force?: boolean) => Promise<void>;
    fetchActiveAuctions: (offset: number, limit: number, aacApp: ApplicationClient) => Promise<void>;
    fetchSettledAuctions: (offset: number, limit: number, aacApp: ApplicationClient) => Promise<void>;
    fetchAuctionsByCreator: (creator: string, aacApp: ApplicationClient) => Promise<void>;
    fetchBidHistory: (auctionId: string, offset: number, limit: number, aacApp: ApplicationClient) => Promise<void>;
    fetchMyCommitment: (auctionId: string, userChain: string, uicApp: ApplicationClient) => Promise<void>;
    fetchAllMyCommitments: (userChain: string, uicApp: ApplicationClient) => Promise<void>;

    // ============ Internal Fetch Methods ============
    _fetchAllAuctionsInternal: (offset: number, limit: number, aacApp: ApplicationClient, force?: boolean) => Promise<string[]>;

    // ============ Invalidation Actions ============
    invalidateAuction: (auctionId: string) => void;
    invalidateActiveAuctions: () => void;
    invalidateSettledAuctions: () => void;
    invalidateAuctionsByCreator: (creator: string) => void;
    invalidateBidHistory: (auctionId: string) => void;
    invalidateUserCommitment: (auctionId: string, userChain?: string) => void;
    invalidateAllMyCommitments: (userChain?: string) => void;
    invalidateAll: () => void;

    // ============ Polling Actions ============
    // TEMPORARY: Using AAC app while indexer event streaming is fixed
    startPollingAuction: (auctionId: string, aacApp: ApplicationClient, interval?: number) => () => void;
    startPollingActiveAuctions: (offset: number, limit: number, aacApp: ApplicationClient, interval?: number) => () => void;
    startPollingBidHistory: (auctionId: string, offset: number, limit: number, aacApp: ApplicationClient, interval?: number) => () => void;

    // ============ Utility Actions ============
    isStale: (
        type: 'auction' | 'activeAuctions' | 'settledAuctions' | 'auctionsByCreator' | 'bidHistory' | 'userCommitment' | 'allMyCommitments',
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
    allAuctionsCache: new Map(),
    allAuctionsMeta: null,
    activeAuctions: null,
    settledAuctions: null,
    auctionsByCreator: new Map(),
    bidHistory: new Map(),
    userCommitments: new Map(),
    allMyCommitments: new Map(),

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
                const { data } = JSON.parse(infoResult) as { data: { subscriptionInfo: SubscriptionInfo | null } };
                const info = data.subscriptionInfo;
                console.log('subscriptionInfo', infoResult)

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
                await indexerApp.publicClient.systemMutate<string>(
                    JSON.stringify(INDEXER_MUTATION.Initialize(aacChain, auctionApp))
                );

                const postInitResult = await indexerApp.publicClient.query<string>(
                    JSON.stringify(INDEXER_QUERY.SubscriptionInfo())
                );

                const postData = JSON.parse(postInitResult) as { data: { subscriptionInfo: SubscriptionInfo | null } };
                const verifiedInfo = postData.data.subscriptionInfo;

                if (verifiedInfo?.initialized) {
                    console.log('✅ State verified: indexer successfully initialized on-chain');
                    set({
                        indexerInitialized: true,
                        indexerInitializing: false,
                        subscriptionInfo: verifiedInfo
                    });
                } else {
                    console.error('⚠️ WARNING: Mutation succeeded but state not persisted!');
                    // Fall back to local state
                    const newInfo: SubscriptionInfo = {
                        aacChain,
                        auctionApp,
                        initialized: true
                    };
                    set({
                        indexerInitialized: true,
                        indexerInitializing: false,
                        subscriptionInfo: newInfo
                    });
                }

            } catch (err: unknown) {
                const error = new Error('Indexer initialization failed');
                console.error('❌ Indexer initialization error:', error);
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
        // console.log('checkSubscriptionInfo', result)
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

    // ============ Internal Fetch Methods ============
    /**
     * Internal method to fetch all auctions and populate normalized cache.
     * This is the ONLY method that calls AAC_QUERY.AllAuctions.
     *
     * Returns the list of auction IDs that were fetched, allowing callers
     * to track which auctions belong to their specific query.
     *
     * @param offset - Pagination offset
     * @param limit - Number of auctions to fetch
     * @param aacApp - AAC application client
     * @param force - Force fetch even if cache is fresh
     * @returns Array of auction IDs that were fetched
     */
    _fetchAllAuctionsInternal: async (offset, limit, aacApp, force = false): Promise<string[]> => {
        const key = `all-auctions-${offset}-${limit}`;

        // Check if we can skip fetch (unless forced)
        const meta = get().allAuctionsMeta;
        if (!force && meta) {
            const age = Date.now() - meta.lastFetchTime;
            if (age < AUCTION_LIST_TTL && meta.status === 'success') {
                // Cache is fresh, return the IDs from the previous fetch
                // NOT all cache keys - this prevents list shuffling!
                return meta.fetchedIds;
            }
        }

        return await queryDeduplicator.deduplicate(key, async () => {
            // Set loading state
            set((state) => ({
                allAuctionsMeta: {
                    lastFetchTime: state.allAuctionsMeta?.lastFetchTime ?? Date.now(),
                    status: 'loading',
                    error: null,
                    offset,
                    limit,
                    fetchedIds: state.allAuctionsMeta?.fetchedIds ?? []
                }
            }));

            try {
                const result = await aacApp.publicClient.query<string>(
                    JSON.stringify(AAC_QUERY.AllAuctions(offset, limit))
                );

                const { data } = JSON.parse(result) as {
                    data: { allAuctions: AuctionWithId[] | null }
                };

                const allAuctions = (data.allAuctions || []).map(transformAuctionWithId);
                const fetchedIds = allAuctions.map(a => String(a.auctionId));

                // Populate normalized cache with ALL auctions
                set((state) => {
                    const newCache = new Map(state.allAuctionsCache);

                    allAuctions.forEach(auction => {
                        newCache.set(String(auction.auctionId), {
                            data: auction,
                            timestamp: Date.now(),
                            status: 'success',
                            error: null
                        });
                    });

                    return {
                        allAuctionsCache: newCache,
                        allAuctionsMeta: {
                            lastFetchTime: Date.now(),
                            status: 'success',
                            error: null,
                            offset,
                            limit,
                            fetchedIds // Store the IDs we just fetched
                        }
                    };
                });

                return fetchedIds;
            } catch (err) {
                const error = err instanceof Error ? err : new Error('Failed to fetch all auctions');

                set((state) => ({
                    allAuctionsMeta: {
                        lastFetchTime: state.allAuctionsMeta?.lastFetchTime ?? Date.now(),
                        status: 'error',
                        error,
                        offset,
                        limit,
                        fetchedIds: state.allAuctionsMeta?.fetchedIds ?? []
                    }
                }));

                throw error;
            }
        });
    },

    // ============ Fetch Actions ============
    fetchAuctionSummary: async (auctionId, aacApp, force = false) => {
        // CRITICAL: Convert to string for consistent Map key lookups
        const stringKey = String(auctionId);

        // Check normalized cache first (skip if forced)
        if (!force) {
            const cached = get().allAuctionsCache.get(stringKey);

            if (cached && cached.status === 'success' && cached.data) {
                const age = Date.now() - cached.timestamp;
                if (age < AUCTION_DATA_TTL) {
                    // Cache hit! Update auctions map and return
                    set((state) => {
                        const newAuctions = new Map(state.auctions);
                        newAuctions.set(stringKey, cached);
                        return { auctions: newAuctions };
                    });
                    return; // No API call needed
                }
            }
        }

        // Cache miss or stale - fetch from API
        const key = `auction-summary-${stringKey}`;

        await queryDeduplicator.deduplicate(key, async () => {
            // Set loading state
            set((state) => {
                const newAuctions = new Map(state.auctions);
                const existing = newAuctions.get(stringKey);
                newAuctions.set(stringKey, {
                    data: existing?.data ?? null,
                    timestamp: existing?.timestamp ?? Date.now(),
                    status: 'loading',
                    error: null,
                });
                return { auctions: newAuctions };
            });

            try {
                // Fetch from API
                const result = await aacApp.publicClient.query<string>(
                    JSON.stringify(AAC_QUERY.AuctionInfo(auctionId))
                );

                const parsed = JSON.parse(result) as {
                    data: { auctionInfo: AuctionWithId | null } | null
                };

                // Transform AuctionWithId to AuctionSummary
                const auctionSummary = parsed?.data?.auctionInfo
                    ? transformAuctionWithId(parsed.data.auctionInfo)
                    : null;

                const cacheEntry: AuctionCacheEntry = {
                    data: auctionSummary,
                    timestamp: Date.now(),
                    status: 'success',
                    error: null,
                };

                // Update BOTH caches (auctions and allAuctionsCache)
                // CRITICAL: Always use String() to ensure consistent Map keys (prevent duplicates)
                set((state) => {
                    const newAuctions = new Map(state.auctions);
                    const newAllAuctions = new Map(state.allAuctionsCache);

                    const stringKey = String(auctionId);
                    newAuctions.set(stringKey, cacheEntry);
                    newAllAuctions.set(stringKey, cacheEntry);

                    return {
                        auctions: newAuctions,
                        allAuctionsCache: newAllAuctions
                    };
                });
            } catch (err) {
                const error = err instanceof Error ? err : new Error('Failed to fetch auction summary');

                // Update cache with error
                set((state) => {
                    const newAuctions = new Map(state.auctions);
                    const stringKey = String(auctionId);
                    const existing = newAuctions.get(stringKey);
                    newAuctions.set(stringKey, {
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

    fetchActiveAuctions: async (offset, limit, aacApp) => {
        // Set loading state
        set((state) => ({
            activeAuctions: {
                auctionIds: state.activeAuctions?.auctionIds ?? [],
                timestamp: state.activeAuctions?.timestamp ?? Date.now(),
                status: 'loading',
                error: null,
                offset,
                limit,
            }
        }));

        try {
            // Fetch auctions and get the IDs that were fetched
            const fetchedIds = await get()._fetchAllAuctionsInternal(offset, limit, aacApp);

            // Filter ONLY the fetched IDs by status (not the entire cache)
            const activeAuctionIds = fetchedIds.filter(id => {
                const entry = get().allAuctionsCache.get(id);
                const auction = entry?.data;
                return auction && (
                    auction.status === AuctionStatus.Active ||
                    auction.status === AuctionStatus.Scheduled
                );
            });

            set({
                activeAuctions: {
                    auctionIds: activeAuctionIds,
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
                    auctionIds: state.activeAuctions?.auctionIds ?? [],
                    timestamp: state.activeAuctions?.timestamp ?? Date.now(),
                    status: 'error',
                    error,
                    offset,
                    limit,
                }
            }));

            throw error;
        }
    },

    fetchSettledAuctions: async (offset, limit, aacApp) => {
        // Set loading state
        set((state) => ({
            settledAuctions: {
                auctionIds: state.settledAuctions?.auctionIds ?? [],
                timestamp: state.settledAuctions?.timestamp ?? Date.now(),
                status: 'loading',
                error: null,
                offset,
                limit,
            }
        }));

        try {
            // Fetch auctions and get the IDs that were fetched
            const fetchedIds = await get()._fetchAllAuctionsInternal(offset, limit, aacApp);

            // Filter ONLY the fetched IDs by status (not the entire cache)
            const settledAuctionIds = fetchedIds.filter(id => {
                const entry = get().allAuctionsCache.get(id);
                const auction = entry?.data;
                return auction && auction.status === AuctionStatus.Settled;
            });

            set({
                settledAuctions: {
                    auctionIds: settledAuctionIds,
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
                    auctionIds: state.settledAuctions?.auctionIds ?? [],
                    timestamp: state.settledAuctions?.timestamp ?? Date.now(),
                    status: 'error',
                    error,
                    offset,
                    limit,
                }
            }));

            throw error;
        }
    },

    fetchAuctionsByCreator: async (creator, aacApp) => {
        // TEMPORARY: Skip indexer check - using AAC directly
        // TEMPORARY: No offset/limit - returns all creator's auctions
        // if (!get().indexerInitialized) {
        //     throw new Error('Indexer not initialized. Call initializeIndexer() first.');
        // }

        const key = `auctions-by-creator-${creator}`;

        await queryDeduplicator.deduplicate(key, async () => {
            set((state) => {
                const newMap = new Map(state.auctionsByCreator);
                const existing = newMap.get(creator);
                newMap.set(creator, {
                    auctionIds: existing?.auctionIds ?? [],
                    timestamp: existing?.timestamp ?? Date.now(),
                    status: 'loading',
                    error: null,
                    offset: 0,
                    limit: 999, // No real limit for temporary workaround
                });
                return { auctionsByCreator: newMap };
            });

            try {
                // TEMPORARY: Use AAC.AuctionsByCreator (no pagination)
                const result = await aacApp.publicClient.query<string>(
                    JSON.stringify(AAC_QUERY.AuctionsByCreator(creator))
                );
                // console.log('AuctionsByCreator (AAC)', result);

                const { data } = JSON.parse(result) as {
                    data: { auctionsByCreator: AuctionWithId[] | null }
                };

                // Transform AuctionWithId[] to AuctionSummary[] and populate normalized cache
                const auctions = (data.auctionsByCreator || []).map(transformAuctionWithId);

                // Populate normalized cache
                set((state) => {
                    const newCache = new Map(state.allAuctionsCache);
                    auctions.forEach(auction => {
                        newCache.set(String(auction.auctionId), {
                            data: auction,
                            timestamp: Date.now(),
                            status: 'success',
                            error: null
                        });
                    });
                    return { allAuctionsCache: newCache };
                });

                // Store only IDs in creator cache
                const auctionIds = auctions.map(a => String(a.auctionId));
                set((state) => {
                    const newMap = new Map(state.auctionsByCreator);
                    newMap.set(creator, {
                        auctionIds,
                        timestamp: Date.now(),
                        status: 'success',
                        error: null,
                        offset: 0,
                        limit: 999,
                    });
                    return { auctionsByCreator: newMap };
                });
            } catch (err) {
                const error = err instanceof Error ? err : new Error('Failed to fetch auctions by creator');

                set((state) => {
                    const newMap = new Map(state.auctionsByCreator);
                    const existing = newMap.get(creator);
                    newMap.set(creator, {
                        auctionIds: existing?.auctionIds ?? [],
                        timestamp: existing?.timestamp ?? Date.now(),
                        status: 'error',
                        error,
                        offset: 0,
                        limit: 999,
                    });
                    return { auctionsByCreator: newMap };
                });

                throw error;
            }
        });
    },

    fetchBidHistory: async (auctionId, offset, limit, aacApp) => {
        // TEMPORARY: Skip indexer check - using AAC directly
        // if (!get().indexerInitialized) {
        //     throw new Error('Indexer not initialized. Call initializeIndexer() first.');
        // }

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
                // TEMPORARY: Use AAC.BidHistory instead of INDEXER.BidHistory
                const result = await aacApp.publicClient.query<string>(
                    JSON.stringify(AAC_QUERY.BidHistory(auctionId, offset, limit))
                );
                // console.log('BidHistory (AAC)', result);

                const { data } = JSON.parse(result) as {
                    data: { bidHistory: BidRecord[] | null }
                };

                // Transform bid records to convert timestamps from microseconds to milliseconds
                const transformedBids = data.bidHistory?.map(transformBidRecord) || null;

                set((state) => {
                    const newMap = new Map(state.bidHistory);
                    newMap.set(auctionId, {
                        data: transformedBids,
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

    fetchMyCommitment: async (auctionId, userChain, uicApp) => {
        // Validate userChain to prevent undefined keys in cache
        if (!userChain) {
            console.warn('[fetchMyCommitment] userChain is required');
            return;
        }

        const key = `my-commitment-${auctionId}-${userChain}`;

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
                if (!uicApp.walletClient) {
                    throw new Error('Wallet is not connected');
                }

                const result = await uicApp.walletClient.query<string>(
                    JSON.stringify(UIC_QUERY.MyCommitmentForAuction(Number(auctionId)))
                );

                const { data } = JSON.parse(result) as {
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

    fetchAllMyCommitments: async (userChain, uicApp) => {
        // Validate userChain to prevent undefined keys in cache
        if (!userChain) {
            console.warn('[fetchAllMyCommitments] userChain is required');
            return;
        }

        const key = `all-my-commitments-${userChain}`;

        await queryDeduplicator.deduplicate(key, async () => {
            set((state) => {
                const newMap = new Map(state.allMyCommitments);
                const existing = newMap.get(userChain);

                newMap.set(userChain, {
                    data: existing?.data ?? null,
                    timestamp: existing?.timestamp ?? Date.now(),
                    status: 'loading',
                    error: null,
                });
                return { allMyCommitments: newMap };
            });

            try {
                if (!uicApp.walletClient) {
                    throw new Error('Wallet is not connected');
                }

                const result = await uicApp.walletClient.query<string>(
                    JSON.stringify(UIC_QUERY.MyAuctionCommitments())
                );
                // console.log('MyAuctionCommitments', JSON.parse(result))
                const { data } = JSON.parse(result) as {
                    data: { myAuctionCommitment: AuctionCommitment[] | null }
                };

                set((state) => {
                    const newMap = new Map(state.allMyCommitments);

                    newMap.set(userChain, {
                        data: data.myAuctionCommitment,
                        timestamp: Date.now(),
                        status: 'success',
                        error: null,
                    });
                    return { allMyCommitments: newMap };
                });
            } catch (err) {
                const error = err instanceof Error ? err : new Error('Failed to fetch all commitments');

                set((state) => {
                    const newMap = new Map(state.allMyCommitments);
                    const existing = newMap.get(userChain);

                    newMap.set(userChain, {
                        data: existing?.data ?? null,
                        timestamp: existing?.timestamp ?? Date.now(),
                        status: 'error',
                        error,
                    });
                    return { allMyCommitments: newMap };
                });

                throw error;
            }
        });
    },

    // ============ Invalidation Actions ============
    invalidateAuction: (auctionId) => {
        set((state) => {
            // Invalidate in both caches
            const newAuctions = new Map(state.auctions);
            const newAllAuctions = new Map(state.allAuctionsCache);

            const existing = newAuctions.get(auctionId);
            if (existing) {
                const stale = { ...existing, timestamp: 0 };
                newAuctions.set(auctionId, stale);
            }

            const existingInAll = newAllAuctions.get(auctionId);
            if (existingInAll) {
                newAllAuctions.set(auctionId, {
                    ...existingInAll,
                    timestamp: 0
                });
            }

            return {
                auctions: newAuctions,
                allAuctionsCache: newAllAuctions
            };
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

    invalidateAllMyCommitments: (userChain) => {
        set((state) => {
            const newMap = new Map(state.allMyCommitments);

            if (userChain) {
                // Invalidate specific user
                const existing = newMap.get(userChain);
                if (existing) {
                    newMap.set(userChain, {
                        ...existing,
                        timestamp: 0
                    });
                }
            } else {
                // Invalidate all users
                newMap.forEach((value, key) => {
                    newMap.set(key, {
                        ...value,
                        timestamp: 0
                    });
                });
            }

            return { allMyCommitments: newMap };
        });
    },

    invalidateAll: () => {
        set((state) => {
            // Mark all auctions as stale (timestamp = 0) instead of deleting
            const newAuctions = new Map(state.auctions);
            newAuctions.forEach((value, key) => {
                newAuctions.set(key, { ...value, timestamp: 0 });
            });

            // Mark normalized cache as stale
            const newAllAuctions = new Map(state.allAuctionsCache);
            newAllAuctions.forEach((value, key) => {
                newAllAuctions.set(key, { ...value, timestamp: 0 });
            });

            // Mark auction lists as stale
            const newActiveAuctions = state.activeAuctions
                ? { ...state.activeAuctions, timestamp: 0 }
                : null;
            const newSettledAuctions = state.settledAuctions
                ? { ...state.settledAuctions, timestamp: 0 }
                : null;

            // Mark auctions by creator as stale
            const newAuctionsByCreator = new Map(state.auctionsByCreator);
            newAuctionsByCreator.forEach((value, key) => {
                newAuctionsByCreator.set(key, { ...value, timestamp: 0 });
            });

            // Mark bid history as stale
            const newBidHistory = new Map(state.bidHistory);
            newBidHistory.forEach((value, key) => {
                newBidHistory.set(key, { ...value, timestamp: 0 });
            });

            // Mark user commitments as stale
            const newUserCommitments = new Map(state.userCommitments);
            newUserCommitments.forEach((auctionMap, auctionId) => {
                const newAuctionMap = new Map(auctionMap);
                newAuctionMap.forEach((value, userChain) => {
                    newAuctionMap.set(userChain, { ...value, timestamp: 0 });
                });
                newUserCommitments.set(auctionId, newAuctionMap);
            });

            // Mark all my commitments as stale
            const newAllMyCommitments = new Map(state.allMyCommitments);
            newAllMyCommitments.forEach((value, key) => {
                newAllMyCommitments.set(key, { ...value, timestamp: 0 });
            });

            return {
                auctions: newAuctions,
                allAuctionsCache: newAllAuctions,
                allAuctionsMeta: state.allAuctionsMeta ? {
                    ...state.allAuctionsMeta,
                    lastFetchTime: 0
                } : null,
                activeAuctions: newActiveAuctions,
                settledAuctions: newSettledAuctions,
                auctionsByCreator: newAuctionsByCreator,
                bidHistory: newBidHistory,
                userCommitments: newUserCommitments,
                allMyCommitments: newAllMyCommitments,
            };
        });
    },

    // ============ Polling Actions ============
    startPollingAuction: (auctionId, aacApp, interval = 5000) => {
        const key = `auction-${auctionId}`;

        return pollingManager.subscribe(
            key,
            () => get().fetchAuctionSummary(auctionId, aacApp),
            interval
        );
    },

    startPollingActiveAuctions: (offset, limit, aacApp, interval = 10000) => {
        const key = `active-auctions-${offset}-${limit}`;

        return pollingManager.subscribe(
            key,
            () => get().fetchActiveAuctions(offset, limit, aacApp),
            interval
        );
    },

    // ============ Polling Actions ============
    startPollingBidHistory: (auctionId, offset, limit, aacApp, interval = 5000) => {
        const key = `bid-history-${auctionId}-${offset}-${limit}`;

        return pollingManager.subscribe(
            key,
            () => get().fetchBidHistory(auctionId, offset, limit, aacApp),
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
            case 'allMyCommitments': {
                if (!key) return true;
                const entry = get().allMyCommitments.get(key);
                if (!entry || entry.status === 'idle') return true;
                return now - entry.timestamp > USER_COMMITMENT_TTL;
            }
            default:
                return true;
        }
    },
}));
