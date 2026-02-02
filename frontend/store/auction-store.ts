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
} from '@/lib/gql/queries';
import {
    type AuctionSummary,
    type AuctionWithId,
    type BidRecord,
    type SubscriptionInfo,
    transformAuctionWithId,
    transformBidRecord,
    AuctionStatus,
    type AuctionGlobalStats
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
const USER_BID_TTL = 30000; // 30s - user commitments (no default polling)
const USER_BALANCES_TTL = 15000; // 15s - user balances on AAC (deposits/withdrawals)
const GLOBAL_STATS_TTL = 30000; // 30s - global stats (changes infrequently)

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
 * Cache entry for user bids
 */
export interface UserBidsCacheEntry {
    data: BidRecord[] | null;
    timestamp: number;
    status: FetchStatus;
    error: Error | null;
}

/**
 * Cache entry for user balances (multiple tokens)
 */
export interface UserBalancesCacheEntry {
    data: Map<string, number> | null; // tokenApp -> amount
    timestamp: number;
    status: FetchStatus;
    error: Error | null;
}

/**
 * Cache entry for global stats
 */
export interface GlobalStatsCacheEntry {
    data: AuctionGlobalStats | null;
    timestamp: number;
    status: FetchStatus;
    error: Error | null;
}

/**
 * Cache entry for auction images
 * Images are immutable, so no TTL needed - cache forever once fetched
 */
export interface AuctionImageCacheEntry {
    objectUrl: string | null;  // Blob object URL for efficient rendering
    status: FetchStatus;
    error: Error | null;
}

/**
 * Batch fetch metadata - tracks batch operation state
 */
export interface BatchFetchMetadata {
    timestamp: number;
    status: FetchStatus;
    error: Error | null;
}

/**
 * Batch fetch result types
 */
export interface AuctionDetailBatchResult {
    auction: AuctionSummary | null;
    bidHistory: BidRecord[] | null;
}

export interface UserPortfolioBatchResult {
    allUserBids: BidRecord[] | null;
    creatorAuctions: AuctionSummary[] | null;
    balances: Map<string, number> | null;
}

export interface DashboardBatchResult {
    activeAuctions: AuctionSummary[] | null;
    globalStats: AuctionGlobalStats | null;
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
    userBids: Map<string, Map<string, UserBidsCacheEntry>>; // auctionId -> address -> userBids
    allUserBids: Map<string, UserBidsCacheEntry>; // address -> all user bids across all auctions
    userBalances: Map<string, UserBalancesCacheEntry>; // address -> balances (multiple tokens)
    globalStats: GlobalStatsCacheEntry | null; // global auction stats
    auctionImages: Map<string, AuctionImageCacheEntry>; // auctionId -> image (immutable, no TTL)

    // ============ Batch Fetch Metadata ============
    batchAuctionDetail: Map<string, BatchFetchMetadata>; // auctionId -> batch metadata
    batchUserPortfolio: Map<string, BatchFetchMetadata>; // address -> batch metadata
    batchDashboard: BatchFetchMetadata | null;

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
    fetchAuctionImage: (auctionId: string, aacApp: ApplicationClient) => Promise<string | null>;
    fetchActiveAuctions: (offset: number, limit: number, aacApp: ApplicationClient, force?: boolean) => Promise<void>;
    fetchSettledAuctions: (offset: number, limit: number, aacApp: ApplicationClient) => Promise<void>;
    fetchAuctionsByCreator: (creator: string, aacApp: ApplicationClient, force?: boolean) => Promise<void>;
    fetchBidHistory: (auctionId: string, offset: number, limit: number, aacApp: ApplicationClient, force?: boolean) => Promise<void>;
    fetchUserBids: (auctionId: string, address: string, aacApp: ApplicationClient, force?: boolean) => Promise<void>;
    fetchAllUserBids: (address: string, aacApp: ApplicationClient, force?: boolean) => Promise<void>;
    fetchUserBalances: (address: string, tokenApps: string[], aacApp: ApplicationClient, force?: boolean) => Promise<void>;
    fetchGlobalStats: (aacApp: ApplicationClient, force?: boolean) => Promise<void>;

    // ============ Internal Fetch Methods ============
    _fetchAllAuctionsInternal: (offset: number, limit: number, aacApp: ApplicationClient, force?: boolean) => Promise<string[]>;

    // ============ Batch Fetch Actions ============
    /**
     * Fetch auction detail data in a single batched request
     * Combines: auctionInfo + bidHistory
     * Populates: auctions, allAuctionsCache, bidHistory caches
     */
    fetchAuctionDetailBatch: (
        auctionId: string,
        bidOffset: number,
        bidLimit: number,
        aacApp: ApplicationClient,
        force?: boolean
    ) => Promise<AuctionDetailBatchResult>;

    /**
     * Fetch user portfolio data in a single batched request
     * Combines: allUserBids + auctionsByCreator + userBalances
     * Populates: allUserBids, auctionsByCreator, allAuctionsCache, userBalances caches
     */
    fetchUserPortfolioBatch: (
        address: string,
        tokenApps: string[],
        aacApp: ApplicationClient,
        force?: boolean
    ) => Promise<UserPortfolioBatchResult>;

    /**
     * Fetch dashboard data in a single batched request
     * Combines: allAuctions + globalStats
     * Populates: allAuctionsCache, activeAuctions, globalStats caches
     */
    fetchDashboardBatch: (
        offset: number,
        limit: number,
        aacApp: ApplicationClient,
        force?: boolean
    ) => Promise<DashboardBatchResult>;

    // ============ Batch Polling Actions ============
    startPollingAuctionDetailBatch: (
        auctionId: string,
        bidOffset: number,
        bidLimit: number,
        aacApp: ApplicationClient,
        interval?: number
    ) => () => void;

    startPollingUserPortfolioBatch: (
        address: string,
        tokenApps: string[],
        aacApp: ApplicationClient,
        interval?: number
    ) => () => void;

    startPollingDashboardBatch: (
        offset: number,
        limit: number,
        aacApp: ApplicationClient,
        interval?: number
    ) => () => void;

    // ============ Invalidation Actions ============
    invalidateAuction: (auctionId: string) => void;
    invalidateActiveAuctions: () => void;
    invalidateSettledAuctions: () => void;
    invalidateAuctionsByCreator: (creator: string) => void;
    invalidateBidHistory: (auctionId: string) => void;
    invalidateUserBids: (auctionId: string, address?: string) => void;
    invalidateAllUserBids: (address: string) => void;
    invalidateUserBalances: (address: string) => void;
    invalidateGlobalStats: () => void;
    invalidateAuctionDetailBatch: (auctionId: string) => void;
    invalidateUserPortfolioBatch: (address: string) => void;
    invalidateDashboardBatch: () => void;
    invalidateAll: () => void;

    // ============ Combined Invalidate + Refetch Actions ============
    invalidateAndRefreshAuction: (auctionId: string, aacApp: ApplicationClient) => Promise<void>;
    invalidateAndRefreshActiveAuctions: (offset: number, limit: number, aacApp: ApplicationClient) => Promise<void>;
    invalidateAndRefreshAuctionsByCreator: (creator: string, aacApp: ApplicationClient) => Promise<void>;
    invalidateAndRefreshBidHistory: (auctionId: string, offset: number, limit: number, aacApp: ApplicationClient) => Promise<void>;
    invalidateAndRefreshUserBids: (auctionId: string, address: string, aacApp: ApplicationClient) => Promise<void>;
    invalidateAndRefreshAllUserBids: (address: string, aacApp: ApplicationClient) => Promise<void>;
    invalidateAndRefreshUserBalances: (address: string, tokenApps: string[], aacApp: ApplicationClient) => Promise<void>;
    invalidateAndRefreshGlobalStats: (aacApp: ApplicationClient) => Promise<void>;

    // ============ Polling Actions ============
    // TEMPORARY: Using AAC app while indexer event streaming is fixed
    startPollingAuction: (auctionId: string, aacApp: ApplicationClient, interval?: number, force?: boolean) => () => void;
    startPollingActiveAuctions: (offset: number, limit: number, aacApp: ApplicationClient, interval?: number, force?: boolean) => () => void;
    startPollingAuctionsByCreator: (creator: string, aacApp: ApplicationClient, interval?: number, force?: boolean) => () => void;
    startPollingBidHistory: (auctionId: string, offset: number, limit: number, aacApp: ApplicationClient, interval?: number, force?: boolean) => () => void;
    startPollingGlobalStats: (aacApp: ApplicationClient, interval?: number, force?: boolean) => () => void;
    startPollingUserBalances: (address: string, tokenApps: string[], aacApp: ApplicationClient, interval?: number, force?: boolean) => () => void;

    // ============ Utility Actions ============
    isStale: (
        type: 'auction' | 'activeAuctions' | 'settledAuctions' | 'auctionsByCreator' | 'bidHistory' | 'userBids' | 'allUserBids' | 'userBalances' | 'globalStats' | 'batchAuctionDetail' | 'batchUserPortfolio' | 'batchDashboard',
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
    userBids: new Map(),
    allUserBids: new Map(),
    userBalances: new Map(),
    globalStats: null,
    auctionImages: new Map(),

    // Batch fetch metadata
    batchAuctionDetail: new Map(),
    batchUserPortfolio: new Map(),
    batchDashboard: null,

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
                const infoResult = await indexerApp.public.query<string>(
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
                await indexerApp.public.systemMutate<string>(
                    JSON.stringify(INDEXER_MUTATION.Initialize(aacChain, auctionApp))
                );

                const postInitResult = await indexerApp.public.query<string>(
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
        const result = await indexerApp.public.query<string>(
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
                const result = await aacApp.public.query<string>(
                    JSON.stringify(AAC_QUERY.AllAuctions(offset, limit))
                );
                console.log('AllAuctions' , result)
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
                console.log('err', err)
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
                const result = await aacApp.public.query<string>(
                    JSON.stringify(AAC_QUERY.AuctionInfo(auctionId))
                );
                console.log('AuctionInfo', result);
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

    /**
     * Fetch auction image from blob storage
     * Images are immutable - fetch once, cache forever (no TTL)
     * Returns object URL for efficient rendering, or null if not found
     */
    fetchAuctionImage: async (auctionId, aacApp): Promise<string | null> => {
        const stringKey = String(auctionId);

        // Check cache first - images never expire
        const cached = get().auctionImages.get(stringKey);
        if (cached && cached.status === 'success' && cached.objectUrl) {
            return cached.objectUrl;
        }

        // If already loading, wait for it (deduplication)
        if (cached?.status === 'loading') {
            // Return null for now, the hook will get updated when fetch completes
            return null;
        }

        const key = `auction-image-${stringKey}`;

        return await queryDeduplicator.deduplicate(key, async () => {
            // Set loading state
            set((state) => {
                const newImages = new Map(state.auctionImages);
                newImages.set(stringKey, {
                    objectUrl: null,
                    status: 'loading',
                    error: null,
                });
                return { auctionImages: newImages };
            });

            try {
                const result = await aacApp.public.query<string>(
                    JSON.stringify(AAC_QUERY.AuctionImage(Number(auctionId)))
                );

                const { data } = JSON.parse(result) as {
                    data: { auctionImage: number[] | null }
                };

                if (!data.auctionImage || data.auctionImage.length === 0) {
                    // No image found
                    set((state) => {
                        const newImages = new Map(state.auctionImages);
                        newImages.set(stringKey, {
                            objectUrl: null,
                            status: 'success',
                            error: null,
                        });
                        return { auctionImages: newImages };
                    });
                    return null;
                }

                // Convert number[] to Uint8Array, then to Blob, then to object URL
                const uint8Array = new Uint8Array(data.auctionImage);
                const blob = new Blob([uint8Array]); // Browser detects MIME from magic bytes
                const objectUrl = URL.createObjectURL(blob);

                set((state) => {
                    const newImages = new Map(state.auctionImages);
                    newImages.set(stringKey, {
                        objectUrl,
                        status: 'success',
                        error: null,
                    });
                    return { auctionImages: newImages };
                });

                return objectUrl;
            } catch (err) {
                const error = err instanceof Error ? err : new Error('Failed to fetch auction image');

                set((state) => {
                    const newImages = new Map(state.auctionImages);
                    newImages.set(stringKey, {
                        objectUrl: null,
                        status: 'error',
                        error,
                    });
                    return { auctionImages: newImages };
                });

                // Don't throw - just return null for images
                console.error('[fetchAuctionImage] Error:', error);
                return null;
            }
        });
    },

    fetchActiveAuctions: async (offset, limit, aacApp, force) => {
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
            const fetchedIds = await get()._fetchAllAuctionsInternal(offset, limit, aacApp, force);

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

    fetchAuctionsByCreator: async (creator, aacApp, force = false) => {
        // TEMPORARY: Skip indexer check - using AAC directly
        // TEMPORARY: No offset/limit - returns all creator's auctions
        // if (!get().indexerInitialized) {
        //     throw new Error('Indexer not initialized. Call initializeIndexer() first.');
        // }

        const key = `auctions-by-creator-${creator}`;

        // Check cache first (skip if forced)
        if (!force) {
            const cached = get().auctionsByCreator.get(creator);
            if (cached && cached.status === 'success') {
                const age = Date.now() - cached.timestamp;
                if (age < 12000) { // 12s TTL (same as AUCTION_LIST_TTL)
                    return; // Cache hit, no API call needed
                }
            }
        }

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
                const result = await aacApp.public.query<string>(
                    JSON.stringify(AAC_QUERY.AuctionsByCreator(creator))
                );
                console.log('AuctionsByCreator (AAC)', result);

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

    fetchBidHistory: async (auctionId, offset, limit, aacApp, force = false) => {
        // TEMPORARY: Skip indexer check - using AAC directly
        // if (!get().indexerInitialized) {
        //     throw new Error('Indexer not initialized. Call initializeIndexer() first.');
        // }

        const key = `bid-history-${auctionId}-${offset}-${limit}`;

        // Check cache first (skip if forced)
        if (!force) {
            const cached = get().bidHistory.get(auctionId);
            if (cached && cached.status === 'success' && cached.data) {
                const age = Date.now() - cached.timestamp;
                if (age < BID_HISTORY_TTL) {
                    return; // Cache hit, no API call needed
                }
            }
        }

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
                const result = await aacApp.public.query<string>(
                    JSON.stringify(AAC_QUERY.BidHistory(auctionId, offset, limit))
                );
                console.log('BidHistory (AAC)', result);

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

    fetchUserBids: async (auctionId, address, aacApp, force = false) => {
        // Validate address to prevent undefined keys in cache
        if (!address) {
            console.warn('[fetchUserBids] address is required');
            return;
        }

        const key = `my-bid-${auctionId}-${address}`;

        // Check cache first (skip if forced)
        if (!force) {
            const auctionMap = get().userBids.get(auctionId);
            const cached = auctionMap?.get(address);
            if (cached && cached.status === 'success') {
                const age = Date.now() - cached.timestamp;
                if (age < USER_BID_TTL) {
                    return; // Cache hit, no API call needed
                }
            }
        }

        await queryDeduplicator.deduplicate(key, async () => {
            set((state) => {
                const newMap = new Map(state.userBids);
                const auctionMap = newMap.get(auctionId) ?? new Map();
                const existing = auctionMap.get(address);

                auctionMap.set(address, {
                    data: existing?.data ?? null,
                    timestamp: existing?.timestamp ?? Date.now(),
                    status: 'loading',
                    error: null,
                });
                newMap.set(auctionId, auctionMap);
                return { userBids: newMap };
            });

            try {
                if (!aacApp) {
                    throw new Error('Wallet is not connected');
                }

                const result = await aacApp.public.query<string>(
                    JSON.stringify(AAC_QUERY.UserBids(address, Number(auctionId)))
                );

                console.log('MyCommitmentForAuction:', JSON.parse(result));

                const { data } = JSON.parse(result) as {
                    data: { userBids: BidRecord[] | null }
                };

                set((state) => {
                    const newMap = new Map(state.userBids);
                    const auctionMap = newMap.get(auctionId) ?? new Map();

                    auctionMap.set(address, {
                        data: (data.userBids || [])?.map(transformBidRecord), // Amount ("10.") type to number
                        timestamp: Date.now(),
                        status: 'success',
                        error: null,
                    });
                    newMap.set(auctionId, auctionMap);
                    return { userBids: newMap };
                });
            } catch (err) {
                const error = err instanceof Error ? err : new Error('Failed to fetch user commitment');

                set((state) => {
                    const newMap = new Map(state.userBids);
                    const auctionMap = newMap.get(auctionId) ?? new Map();
                    const existing = auctionMap.get(address);

                    auctionMap.set(address, {
                        data: existing?.data ?? null,
                        timestamp: existing?.timestamp ?? Date.now(),
                        status: 'error',
                        error,
                    });
                    newMap.set(auctionId, auctionMap);
                    return { userBids: newMap };
                });

                throw error;
            }
        });
    },

    /**
     * Fetch all bids placed by a user across all auctions
     * Uses AAC_QUERY.AllUserBids for a single request
     */
    fetchAllUserBids: async (address, aacApp, force = false) => {
        // Validate address to prevent undefined keys in cache
        if (!address) {
            console.warn('[fetchAllUserBids] address is required');
            return;
        }

        const key = `all-user-bids-${address}`;

        // Check cache first (skip if forced)
        if (!force) {
            const cached = get().allUserBids.get(address);
            if (cached && cached.status === 'success') {
                const age = Date.now() - cached.timestamp;
                if (age < USER_BID_TTL) {
                    return; // Cache hit, no API call needed
                }
            }
        }

        await queryDeduplicator.deduplicate(key, async () => {
            set((state) => {
                const newMap = new Map(state.allUserBids);
                const existing = newMap.get(address);

                newMap.set(address, {
                    data: existing?.data ?? null,
                    timestamp: existing?.timestamp ?? Date.now(),
                    status: 'loading',
                    error: null,
                });
                return { allUserBids: newMap };
            });

            try {
                if (!aacApp) {
                    throw new Error('Wallet is not connected');
                }

                const result = await aacApp.public.query<string>(
                    JSON.stringify(AAC_QUERY.AllUserBids(address))
                );
                
                console.log('fetchAllUserBids', result)

                const { data } = JSON.parse(result) as {
                    data: { allUserBids: BidRecord[] | null }
                };

                set((state) => {
                    const newMap = new Map(state.allUserBids);

                    newMap.set(address, {
                        data: (data.allUserBids || [])?.map(transformBidRecord),
                        timestamp: Date.now(),
                        status: 'success',
                        error: null,
                    });
                    return { allUserBids: newMap };
                });
            } catch (err) {
                const error = err instanceof Error ? err : new Error('Failed to fetch all user bids');

                set((state) => {
                    const newMap = new Map(state.allUserBids);
                    const existing = newMap.get(address);

                    newMap.set(address, {
                        data: existing?.data ?? null,
                        timestamp: existing?.timestamp ?? Date.now(),
                        status: 'error',
                        error,
                    });
                    return { allUserBids: newMap };
                });

                throw error;
            }
        });
    },

    /**
     * Fetch user balances for multiple tokens in a single batched request
     * Uses AAC_QUERY.UserBalances to reduce N requests → 1 request
     */
    fetchUserBalances: async (address, tokenApps, aacApp, force = false) => {
        // Validate inputs
        if (!address) {
            console.warn('[fetchUserBalances] address is required');
            return;
        }
        if (!tokenApps || tokenApps.length === 0) {
            console.warn('[fetchUserBalances] no token apps provided');
            return;
        }

        const key = `user-balances-${address}`;

        // Check cache first (skip if forced)
        if (!force) {
            const cached = get().userBalances.get(address);
            if (cached && cached.status === 'success') {
                const age = Date.now() - cached.timestamp;
                if (age < USER_BALANCES_TTL) {
                    // Cache hit - fresh data
                    return
                }
            }
        }

        await queryDeduplicator.deduplicate(key, async () => {
            // Set loading state
            set((state) => {
                const newMap = new Map(state.userBalances);
                const existing = newMap.get(address);

                newMap.set(address, {
                    data: existing?.data ?? null,
                    timestamp: existing?.timestamp ?? Date.now(),
                    status: 'loading',
                    error: null,
                });

                return { userBalances: newMap };
            });

            try {
                if (!aacApp) {
                    throw new Error('AAC App is not connected');
                }

                // Use batched query to fetch all balances at once
                const result = await aacApp.public.query<string>(
                    JSON.stringify(AAC_QUERY.UserBalances(address, tokenApps))
                );

                console.log('UserBalances', JSON.parse(result));

                const { data } = JSON.parse(result) as {
                    data: { userBalances: Array<{ tokenApp: string; amount: string | number }> | null }
                };

                // Convert array to Map for efficient lookups
                const balancesMap = new Map<string, number>();
                (data.userBalances || []).forEach(item => {
                    // Parse amount: handle both string ("10.") and number formats
                    const parsedAmount = typeof item.amount === 'string'
                        ? parseFloat(item.amount) || 0
                        : item.amount;
                    balancesMap.set(item.tokenApp, parsedAmount);
                });

                // Ensure all requested tokens are in the map (default to 0 if not found)
                tokenApps.forEach(tokenApp => {
                    if (!balancesMap.has(tokenApp)) {
                        balancesMap.set(tokenApp, 0);
                    }
                });

                set((state) => {
                    const newMap = new Map(state.userBalances);

                    newMap.set(address, {
                        data: balancesMap,
                        timestamp: Date.now(),
                        status: 'success',
                        error: null,
                    });

                    return { userBalances: newMap };
                });
            } catch (err) {
                const error = err instanceof Error ? err : new Error('Failed to fetch user balances');

                set((state) => {
                    const newMap = new Map(state.userBalances);
                    const existing = newMap.get(address);

                    newMap.set(address, {
                        data: existing?.data ?? null,
                        timestamp: existing?.timestamp ?? Date.now(),
                        status: 'error',
                        error,
                    });

                    return { userBalances: newMap };
                });

                throw error;
            }
        });
    },

    /**
     * Fetch global auction stats
     */
    fetchGlobalStats: async (aacApp, force = false) => {
        const key = 'global-stats';

        // Check cache first (skip if forced)
        if (!force) {
            const cached = get().globalStats;
            if (cached && cached.status === 'success' && cached.data) {
                const age = Date.now() - cached.timestamp;
                if (age < GLOBAL_STATS_TTL) {
                    return; // Cache hit, no API call needed
                }
            }
        }

        await queryDeduplicator.deduplicate(key, async () => {
            // Set loading state
            set((state) => ({
                globalStats: {
                    data: state.globalStats?.data ?? null,
                    timestamp: state.globalStats?.timestamp ?? Date.now(),
                    status: 'loading',
                    error: null,
                }
            }));

            try {
                const result = await aacApp.public.query<string>(
                    JSON.stringify(AAC_QUERY.GlobalStats())
                );

                const { data } = JSON.parse(result) as {
                    data: { globalStats: AuctionGlobalStats | null }
                };

                console.log('GlobalStats', data)

                set({
                    globalStats: {
                        data: data.globalStats,
                        timestamp: Date.now(),
                        status: 'success',
                        error: null,
                    }
                });
            } catch (err) {
                const error = err instanceof Error ? err : new Error('Failed to fetch global stats');

                set((state) => ({
                    globalStats: {
                        data: state.globalStats?.data ?? null,
                        timestamp: state.globalStats?.timestamp ?? Date.now(),
                        status: 'error',
                        error,
                    }
                }));

                throw error;
            }
        });
    },

    // ============ Batch Fetch Actions ============
    /**
     * Fetch auction detail data in a single batched request
     * Combines: auctionInfo + bidHistory
     */
    fetchAuctionDetailBatch: async (auctionId, bidOffset, bidLimit, aacApp, force = false): Promise<AuctionDetailBatchResult> => {
        const stringKey = String(auctionId);
        const batchKey = `batch-auction-detail-${stringKey}`;

        // Check if batch is fresh (unless forced)
        if (!force) {
            const batchMeta = get().batchAuctionDetail.get(stringKey);
            if (batchMeta && batchMeta.status === 'success') {
                const age = Date.now() - batchMeta.timestamp;
                if (age < AUCTION_DATA_TTL) {
                    // Return from existing caches
                    const auction = get().auctions.get(stringKey)?.data ?? null;
                    const bidHistory = get().bidHistory.get(stringKey)?.data ?? null;
                    return { auction, bidHistory };
                }
            }
        }

        // Check if we already have data (for background refresh)
        const existingMeta = get().batchAuctionDetail.get(stringKey);
        const hasExistingData = existingMeta?.status === 'success';

        return await queryDeduplicator.deduplicate(batchKey, async () => {
            // Only set loading state if we don't have existing data
            // This prevents UI flicker during background polls
            if (!hasExistingData) {
                set((state) => {
                    const newBatchMeta = new Map(state.batchAuctionDetail);
                    newBatchMeta.set(stringKey, {
                        timestamp: state.batchAuctionDetail.get(stringKey)?.timestamp ?? Date.now(),
                        status: 'loading',
                        error: null,
                    });
                    return { batchAuctionDetail: newBatchMeta };
                });
            }

            try {
                // Build batched query
                const batchQuery = AAC_QUERY.batch()
                    .auctionInfo(Number(auctionId))
                    .bidHistory(Number(auctionId), bidOffset, bidLimit)
                    .build();

                const result = await aacApp.public.query<string>(JSON.stringify(batchQuery));

                // console.log('fetchAuctionDetailBatch', result)

                const { data } = JSON.parse(result) as {
                    data: {
                        auctionInfo: AuctionWithId | null;
                        bidHistory: BidRecord[] | null;
                    }
                };

                // Transform data
                const auctionSummary = data.auctionInfo
                    ? transformAuctionWithId(data.auctionInfo)
                    : null;
                const transformedBids = data.bidHistory?.map(transformBidRecord) ?? null;

                const now = Date.now();

                // Populate all caches in a single set call
                set((state) => {
                    const newAuctions = new Map(state.auctions);
                    const newAllAuctions = new Map(state.allAuctionsCache);
                    const newBidHistory = new Map(state.bidHistory);
                    const newBatchMeta = new Map(state.batchAuctionDetail);

                    // Update auction caches
                    if (auctionSummary) {
                        const auctionEntry: AuctionCacheEntry = {
                            data: auctionSummary,
                            timestamp: now,
                            status: 'success',
                            error: null,
                        };
                        newAuctions.set(stringKey, auctionEntry);
                        newAllAuctions.set(stringKey, auctionEntry);
                    }

                    // Update bid history cache
                    newBidHistory.set(stringKey, {
                        data: transformedBids,
                        timestamp: now,
                        status: 'success',
                        error: null,
                    });

                    // Update batch metadata
                    newBatchMeta.set(stringKey, {
                        timestamp: now,
                        status: 'success',
                        error: null,
                    });

                    return {
                        auctions: newAuctions,
                        allAuctionsCache: newAllAuctions,
                        bidHistory: newBidHistory,
                        batchAuctionDetail: newBatchMeta,
                    };
                });

                return { auction: auctionSummary, bidHistory: transformedBids };
            } catch (err) {
                const error = err instanceof Error ? err : new Error('Failed to fetch auction detail batch');

                set((state) => {
                    const newBatchMeta = new Map(state.batchAuctionDetail);
                    newBatchMeta.set(stringKey, {
                        timestamp: state.batchAuctionDetail.get(stringKey)?.timestamp ?? Date.now(),
                        status: 'error',
                        error,
                    });
                    return { batchAuctionDetail: newBatchMeta };
                });

                throw error;
            }
        });
    },

    /**
     * Fetch user portfolio data in a single batched request
     * Combines: allUserBids + auctionsByCreator + userBalances
     */
    fetchUserPortfolioBatch: async (address, tokenApps, aacApp, force = false): Promise<UserPortfolioBatchResult> => {
        if (!address) {
            console.warn('[fetchUserPortfolioBatch] address is required');
            return { allUserBids: null, creatorAuctions: null, balances: null };
        }

        const batchKey = `batch-user-portfolio-${address}`;

        // Check if batch is fresh (unless forced)
        if (!force) {
            const batchMeta = get().batchUserPortfolio.get(address);
            if (batchMeta && batchMeta.status === 'success') {
                const age = Date.now() - batchMeta.timestamp;
                if (age < USER_BID_TTL) {
                    // Return from existing caches
                    const allUserBids = get().allUserBids.get(address)?.data ?? null;
                    const creatorEntry = get().auctionsByCreator.get(address);
                    const creatorAuctions = creatorEntry?.auctionIds
                        ? creatorEntry.auctionIds
                            .map(id => get().allAuctionsCache.get(id)?.data)
                            .filter(Boolean) as AuctionSummary[]
                        : null;
                    const balances = get().userBalances.get(address)?.data ?? null;
                    return { allUserBids, creatorAuctions, balances };
                }
            }
        }

        // Check if we already have data (for background refresh)
        const existingMeta = get().batchUserPortfolio.get(address);
        const hasExistingData = existingMeta?.status === 'success';

        return await queryDeduplicator.deduplicate(batchKey, async () => {
            // Only set loading state if we don't have existing data
            // This prevents UI flicker during background polls
            if (!hasExistingData) {
                set((state) => {
                    const newBatchMeta = new Map(state.batchUserPortfolio);
                    newBatchMeta.set(address, {
                        timestamp: state.batchUserPortfolio.get(address)?.timestamp ?? Date.now(),
                        status: 'loading',
                        error: null,
                    });
                    return { batchUserPortfolio: newBatchMeta };
                });
            }

            try {
                // Build batched query
                const batchQuery = AAC_QUERY.batch()
                    .allUserBids(address)
                    .auctionsByCreator(address)
                    .userBalances(address, tokenApps)
                    .build();

                const result = await aacApp.public.query<string>(JSON.stringify(batchQuery));

                // console.log('fetchUserPortfolioBatch', result)

                const { data } = JSON.parse(result) as {
                    data: {
                        allUserBids: BidRecord[] | null;
                        auctionsByCreator: AuctionWithId[] | null;
                        userBalances: Array<{ tokenApp: string; amount: string | number }> | null;
                    }
                };

                // Transform data
                const transformedBids = data.allUserBids?.map(transformBidRecord) ?? null;
                const creatorAuctions = (data.auctionsByCreator || []).map(transformAuctionWithId);

                // Convert balances array to Map
                const balancesMap = new Map<string, number>();
                (data.userBalances || []).forEach(item => {
                    const parsedAmount = typeof item.amount === 'string'
                        ? parseFloat(item.amount) || 0
                        : item.amount;
                    balancesMap.set(item.tokenApp, parsedAmount);
                });
                // Ensure all requested tokens are in the map
                tokenApps.forEach(tokenApp => {
                    if (!balancesMap.has(tokenApp)) {
                        balancesMap.set(tokenApp, 0);
                    }
                });

                const now = Date.now();

                // Populate all caches in a single set call
                set((state) => {
                    const newAllUserBids = new Map(state.allUserBids);
                    const newAuctionsByCreator = new Map(state.auctionsByCreator);
                    const newAllAuctionsCache = new Map(state.allAuctionsCache);
                    const newUserBalances = new Map(state.userBalances);
                    const newBatchMeta = new Map(state.batchUserPortfolio);

                    // Update allUserBids cache
                    newAllUserBids.set(address, {
                        data: transformedBids,
                        timestamp: now,
                        status: 'success',
                        error: null,
                    });

                    // Update auctionsByCreator cache and normalized auction cache
                    const auctionIds = creatorAuctions.map(a => String(a.auctionId));
                    creatorAuctions.forEach(auction => {
                        newAllAuctionsCache.set(String(auction.auctionId), {
                            data: auction,
                            timestamp: now,
                            status: 'success',
                            error: null,
                        });
                    });
                    newAuctionsByCreator.set(address, {
                        auctionIds,
                        timestamp: now,
                        status: 'success',
                        error: null,
                        offset: 0,
                        limit: 999,
                    });

                    // Update userBalances cache
                    newUserBalances.set(address, {
                        data: balancesMap,
                        timestamp: now,
                        status: 'success',
                        error: null,
                    });

                    // Update batch metadata
                    newBatchMeta.set(address, {
                        timestamp: now,
                        status: 'success',
                        error: null,
                    });

                    return {
                        allUserBids: newAllUserBids,
                        auctionsByCreator: newAuctionsByCreator,
                        allAuctionsCache: newAllAuctionsCache,
                        userBalances: newUserBalances,
                        batchUserPortfolio: newBatchMeta,
                    };
                });

                return {
                    allUserBids: transformedBids,
                    creatorAuctions,
                    balances: balancesMap,
                };
            } catch (err) {
                const error = err instanceof Error ? err : new Error('Failed to fetch user portfolio batch');

                set((state) => {
                    const newBatchMeta = new Map(state.batchUserPortfolio);
                    newBatchMeta.set(address, {
                        timestamp: state.batchUserPortfolio.get(address)?.timestamp ?? Date.now(),
                        status: 'error',
                        error,
                    });
                    return { batchUserPortfolio: newBatchMeta };
                });

                throw error;
            }
        });
    },

    /**
     * Fetch dashboard data in a single batched request
     * Combines: allAuctions + globalStats
     */
    fetchDashboardBatch: async (offset, limit, aacApp, force = false): Promise<DashboardBatchResult> => {
        const batchKey = `batch-dashboard-${offset}-${limit}`;

        // Check if batch is fresh (unless forced)
        if (!force) {
            const batchMeta = get().batchDashboard;
            if (batchMeta && batchMeta.status === 'success') {
                const age = Date.now() - batchMeta.timestamp;
                if (age < AUCTION_LIST_TTL) {
                    // Return from existing caches
                    const activeAuctionIds = get().activeAuctions?.auctionIds ?? [];
                    const activeAuctions = activeAuctionIds
                        .map(id => get().allAuctionsCache.get(id)?.data)
                        .filter(Boolean) as AuctionSummary[];
                    const globalStats = get().globalStats?.data ?? null;
                    return { activeAuctions, globalStats };
                }
            }
        }

        // Check if we already have data (for background refresh)
        const existingMeta = get().batchDashboard;
        const hasExistingData = existingMeta?.status === 'success';

        return await queryDeduplicator.deduplicate(batchKey, async () => {
            // Only set loading state if we don't have existing data
            // This prevents UI flicker during background polls
            if (!hasExistingData) {
                set((state) => ({
                    batchDashboard: {
                        timestamp: state.batchDashboard?.timestamp ?? Date.now(),
                        status: 'loading',
                        error: null,
                    }
                }));
            }

            try {
                // Build batched query
                const batchQuery = AAC_QUERY.batch()
                    .allAuctions(offset, limit)
                    .globalStats()
                    .build();

                const result = await aacApp.public.query<string>(JSON.stringify(batchQuery));

                // console.log('fetchDashboardBatch', result)

                const { data } = JSON.parse(result) as {
                    data: {
                        allAuctions: AuctionWithId[] | null;
                        globalStats: AuctionGlobalStats | null;
                    }
                };

                // Transform auctions
                const allAuctions = (data.allAuctions || []).map(transformAuctionWithId);
                const fetchedIds = allAuctions.map(a => String(a.auctionId));

                // Filter active auctions
                const activeAuctions = allAuctions.filter(auction =>
                    auction.status === AuctionStatus.Active ||
                    auction.status === AuctionStatus.Scheduled
                );
                const activeAuctionIds = activeAuctions.map(a => String(a.auctionId));

                const now = Date.now();

                // Populate all caches in a single set call
                set((state) => {
                    const newAllAuctionsCache = new Map(state.allAuctionsCache);

                    // Populate normalized cache
                    allAuctions.forEach(auction => {
                        newAllAuctionsCache.set(String(auction.auctionId), {
                            data: auction,
                            timestamp: now,
                            status: 'success',
                            error: null,
                        });
                    });

                    return {
                        allAuctionsCache: newAllAuctionsCache,
                        allAuctionsMeta: {
                            lastFetchTime: now,
                            status: 'success',
                            error: null,
                            offset,
                            limit,
                            fetchedIds,
                        },
                        activeAuctions: {
                            auctionIds: activeAuctionIds,
                            timestamp: now,
                            status: 'success',
                            error: null,
                            offset,
                            limit,
                        },
                        globalStats: {
                            data: data.globalStats,
                            timestamp: now,
                            status: 'success',
                            error: null,
                        },
                        batchDashboard: {
                            timestamp: now,
                            status: 'success',
                            error: null,
                        },
                    };
                });

                return { activeAuctions, globalStats: data.globalStats };
            } catch (err) {
                const error = err instanceof Error ? err : new Error('Failed to fetch dashboard batch');

                set((state) => ({
                    batchDashboard: {
                        timestamp: state.batchDashboard?.timestamp ?? Date.now(),
                        status: 'error',
                        error,
                    }
                }));

                throw error;
            }
        });
    },

    // ============ Batch Polling Actions ============
    startPollingAuctionDetailBatch: (auctionId, bidOffset, bidLimit, aacApp, interval = 5000) => {
        const key = `batch-auction-detail-${auctionId}`;

        return pollingManager.subscribe(
            key,
            async () => { await get().fetchAuctionDetailBatch(auctionId, bidOffset, bidLimit, aacApp, true); },
            interval
        );
    },

    startPollingUserPortfolioBatch: (address, tokenApps, aacApp, interval = 15000) => {
        const key = `batch-user-portfolio-${address}`;

        return pollingManager.subscribe(
            key,
            async () => { await get().fetchUserPortfolioBatch(address, tokenApps, aacApp, true); },
            interval
        );
    },

    startPollingDashboardBatch: (offset, limit, aacApp, interval = 10000) => {
        const key = `batch-dashboard-${offset}-${limit}`;

        return pollingManager.subscribe(
            key,
            async () => { await get().fetchDashboardBatch(offset, limit, aacApp, true); },
            interval
        );
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

    invalidateUserBids: (auctionId, address) => {
        set((state) => {
            const newMap = new Map(state.userBids);
            const auctionMap = newMap.get(auctionId);

            if (auctionMap) {
                if (address) {
                    // Invalidate specific user
                    const existing = auctionMap.get(address);
                    if (existing) {
                        auctionMap.set(address, {
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

            return { userBids: newMap };
        });
    },

    invalidateAllUserBids: (address) => {
        set((state) => {
            const newMap = new Map(state.allUserBids);
            const existing = newMap.get(address);

            if (existing) {
                newMap.set(address, {
                    ...existing,
                    timestamp: 0
                });
            }

            return { allUserBids: newMap };
        });
    },

    invalidateUserBalances: (address) => {
        set((state) => {
            const newMap = new Map(state.userBalances);
            const existing = newMap.get(address);

            if (existing) {
                newMap.set(address, {
                    ...existing,
                    timestamp: 0
                });
            }

            return { userBalances: newMap };
        });
    },

    invalidateGlobalStats: () => {
        set((state) => ({
            globalStats: state.globalStats ? {
                ...state.globalStats,
                timestamp: 0
            } : null
        }));
    },

    invalidateAuctionDetailBatch: (auctionId) => {
        const stringKey = String(auctionId);
        set((state) => {
            const newBatchMeta = new Map(state.batchAuctionDetail);
            const existing = newBatchMeta.get(stringKey);
            if (existing) {
                newBatchMeta.set(stringKey, { ...existing, timestamp: 0 });
            }
            return { batchAuctionDetail: newBatchMeta };
        });
        // Also invalidate underlying caches
        get().invalidateAuction(auctionId);
        get().invalidateBidHistory(auctionId);
    },

    invalidateUserPortfolioBatch: (address) => {
        set((state) => {
            const newBatchMeta = new Map(state.batchUserPortfolio);
            const existing = newBatchMeta.get(address);
            if (existing) {
                newBatchMeta.set(address, { ...existing, timestamp: 0 });
            }
            return { batchUserPortfolio: newBatchMeta };
        });
        // Also invalidate underlying caches
        get().invalidateAllUserBids(address);
        get().invalidateAuctionsByCreator(address);
        get().invalidateUserBalances(address);
    },

    invalidateDashboardBatch: () => {
        set((state) => ({
            batchDashboard: state.batchDashboard ? {
                ...state.batchDashboard,
                timestamp: 0
            } : null
        }));
        // Also invalidate underlying caches
        get().invalidateActiveAuctions();
        get().invalidateGlobalStats();
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
            const newUserBids = new Map(state.userBids);
            newUserBids.forEach((auctionMap, auctionId) => {
                const newAuctionMap = new Map(auctionMap);
                newAuctionMap.forEach((value, address) => {
                    newAuctionMap.set(address, { ...value, timestamp: 0 });
                });
                newUserBids.set(auctionId, newAuctionMap);
            });

            // Mark all user bids as stale
            const newAllUserBids = new Map(state.allUserBids);
            newAllUserBids.forEach((value, address) => {
                newAllUserBids.set(address, { ...value, timestamp: 0 });
            });

            // Mark user balances as stale
            const newUserBalances = new Map(state.userBalances);
            newUserBalances.forEach((value, address) => {
                newUserBalances.set(address, { ...value, timestamp: 0 });
            });

            // Mark global stats as stale
            const newGlobalStats = state.globalStats
                ? { ...state.globalStats, timestamp: 0 }
                : null;

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
                userBids: newUserBids,
                allUserBids: newAllUserBids,
                userBalances: newUserBalances,
                globalStats: newGlobalStats,
            };
        });
    },

    // ============ Combined Invalidate + Refetch Actions ============
    /**
     * Invalidate and force refresh auction summary
     * Clears deduplicator, invalidates cache, and forces fresh fetch
     */
    invalidateAndRefreshAuction: async (auctionId, aacApp) => {
        const key = `auction-summary-${String(auctionId)}`;

        // Clear any in-flight requests for this resource
        queryDeduplicator.clear(key);

        // Invalidate cache (keeps existing data visible, marks as stale)
        get().invalidateAuction(auctionId);

        // Force fresh fetch
        await get().fetchAuctionSummary(auctionId, aacApp, true);
    },

    /**
     * Invalidate and force refresh active auctions list
     * Clears deduplicator, invalidates cache, and forces fresh fetch
     */
    invalidateAndRefreshActiveAuctions: async (offset, limit, aacApp) => {
        const key = `all-auctions-${offset}-${limit}`;

        // Clear any in-flight requests for this resource
        queryDeduplicator.clear(key);

        // Invalidate cache (keeps existing data visible, marks as stale)
        get().invalidateActiveAuctions();

        // Force fresh fetch
        await get().fetchActiveAuctions(offset, limit, aacApp);
    },

    /**
     * Invalidate and force refresh auctions by creator
     * Clears deduplicator, invalidates cache, and forces fresh fetch
     */
    invalidateAndRefreshAuctionsByCreator: async (creator, aacApp) => {
        const key = `auctions-by-creator-${creator}`;

        // Clear any in-flight requests for this resource
        queryDeduplicator.clear(key);

        // Invalidate cache (keeps existing data visible, marks as stale)
        get().invalidateAuctionsByCreator(creator);

        // Force fresh fetch
        await get().fetchAuctionsByCreator(creator, aacApp);
    },

    /**
     * Invalidate and force refresh bid history
     * Clears deduplicator, invalidates cache, and forces fresh fetch
     */
    invalidateAndRefreshBidHistory: async (auctionId, offset, limit, aacApp) => {
        const key = `bid-history-${auctionId}-${offset}-${limit}`;

        // Clear any in-flight requests for this resource
        queryDeduplicator.clear(key);

        // Invalidate cache (keeps existing data visible, marks as stale)
        get().invalidateBidHistory(auctionId);

        // Force fresh fetch
        await get().fetchBidHistory(auctionId, offset, limit, aacApp, true);
    },

    /**
     * Invalidate and force refresh user bids for a specific auction
     * Clears deduplicator, invalidates cache, and forces fresh fetch
     */
    invalidateAndRefreshUserBids: async (auctionId, address, aacApp) => {
        const key = `my-bid-${auctionId}-${address}`;

        // Clear any in-flight requests for this resource
        queryDeduplicator.clear(key);

        // Invalidate cache (keeps existing data visible, marks as stale)
        get().invalidateUserBids(auctionId, address);

        // Force fresh fetch
        await get().fetchUserBids(auctionId, address, aacApp, true);
    },

    /**
     * Invalidate and force refresh all user bids across all auctions
     * Clears deduplicator, invalidates cache, and forces fresh fetch
     */
    invalidateAndRefreshAllUserBids: async (address, aacApp) => {
        const key = `all-user-bids-${address}`;

        // Clear any in-flight requests for this resource
        queryDeduplicator.clear(key);

        // Invalidate cache (keeps existing data visible, marks as stale)
        get().invalidateAllUserBids(address);

        // Force fresh fetch
        await get().fetchAllUserBids(address, aacApp, true);
    },

    /**
     * Invalidate and force refresh user balances
     * Clears deduplicator, invalidates cache, and forces fresh fetch
     */
    invalidateAndRefreshUserBalances: async (address, tokenApps, aacApp) => {
        const key = `user-balances-${address}`;

        // Clear any in-flight requests for this resource
        queryDeduplicator.clear(key);

        // Invalidate cache (keeps existing data visible, marks as stale)
        get().invalidateUserBalances(address);

        // Force fresh fetch
        await get().fetchUserBalances(address, tokenApps, aacApp, true);
    },

    /**
     * Invalidate and force refresh global stats
     */
    invalidateAndRefreshGlobalStats: async (aacApp) => {
        const key = 'global-stats';

        // Clear any in-flight requests for this resource
        queryDeduplicator.clear(key);

        // Invalidate cache
        get().invalidateGlobalStats();

        // Force fresh fetch
        await get().fetchGlobalStats(aacApp, true);
    },

    // ============ Polling Actions ============
    startPollingAuction: (auctionId, aacApp, interval = 5000, force = true) => {
        const key = `auction-${auctionId}`;

        return pollingManager.subscribe(
            key,
            () => get().fetchAuctionSummary(auctionId, aacApp, force),
            interval
        );
    },

    startPollingActiveAuctions: (offset, limit, aacApp, interval = 10000, force = true) => {
        const key = `active-auctions-${offset}-${limit}`;

        return pollingManager.subscribe(
            key,
            () => get().fetchActiveAuctions(offset, limit, aacApp, force),
            interval
        );
    },

    startPollingAuctionsByCreator: (creator, aacApp, interval = 10000, force = true) => {
        const key = `auctions-by-creator-${creator}`;

        return pollingManager.subscribe(
            key,
            () => get().fetchAuctionsByCreator(creator, aacApp, force),
            interval
        );
    },

    startPollingBidHistory: (auctionId, offset, limit, aacApp, interval = 5000, force = true) => {
        const key = `bid-history-${auctionId}-${offset}-${limit}`;

        return pollingManager.subscribe(
            key,
            () => get().fetchBidHistory(auctionId, offset, limit, aacApp, force),
            interval
        );
    },

    startPollingGlobalStats: (aacApp, interval = 30000, force = true) => {
        const key = 'global-stats';

        return pollingManager.subscribe(
            key,
            () => get().fetchGlobalStats(aacApp, force),
            interval
        );
    },

    startPollingUserBalances: (address, tokenApps, aacApp, interval = 15000, force = true) => {
        const key = `user-balances-${address}`;

        return pollingManager.subscribe(
            key,
            () => get().fetchUserBalances(address, tokenApps, aacApp, force),
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
            case 'userBids': {
                if (!key) return true;
                const [auctionId, address] = key.split(':');
                const auctionMap = get().userBids.get(auctionId);
                if (!auctionMap || !address) return true;
                const entry = auctionMap.get(address);
                if (!entry || entry.status === 'idle') return true;
                return now - entry.timestamp > USER_BID_TTL;
            }
            case 'allUserBids': {
                if (!key) return true;
                const entry = get().allUserBids.get(key);
                if (!entry || entry.status === 'idle') return true;
                return now - entry.timestamp > USER_BID_TTL;
            }
            case 'userBalances': {
                if (!key) return true;
                const entry = get().userBalances.get(key);
                if (!entry || entry.status === 'idle') return true;
                return now - entry.timestamp > USER_BALANCES_TTL;
            }
            case 'globalStats': {
                const entry = get().globalStats;
                if (!entry || entry.status === 'idle') return true;
                return now - entry.timestamp > GLOBAL_STATS_TTL;
            }
            case 'batchAuctionDetail': {
                if (!key) return true;
                const entry = get().batchAuctionDetail.get(key);
                if (!entry || entry.status === 'idle') return true;
                return now - entry.timestamp > AUCTION_DATA_TTL;
            }
            case 'batchUserPortfolio': {
                if (!key) return true;
                const entry = get().batchUserPortfolio.get(key);
                if (!entry || entry.status === 'idle') return true;
                return now - entry.timestamp > USER_BID_TTL;
            }
            case 'batchDashboard': {
                const entry = get().batchDashboard;
                if (!entry || entry.status === 'idle') return true;
                return now - entry.timestamp > AUCTION_LIST_TTL;
            }

            default:
                return true;
        }
    },
}));
