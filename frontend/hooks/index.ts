/**
 * Auction Hooks Index
 *
 * Centralized exports for all auction-related React hooks.
 */

export { usePolling } from './use-polling';

// Indexer initialization
export { useIndexerInitialization } from './use-indexer-initialization';
export type {
    UseIndexerInitializationOptions,
    UseIndexerInitializationResult
} from './use-indexer-initialization';

// Data fetching hooks
export { useCachedActiveAuctions } from './use-cached-active-auctions';
export type {
    UseCachedActiveAuctionsOptions,
    UseCachedActiveAuctionsResult
} from './use-cached-active-auctions';

export { useCachedAuctionSummary } from './use-cached-auction-summary';
export type {
    UseCachedAuctionSummaryOptions,
    UseCachedAuctionSummaryResult
} from './use-cached-auction-summary';

export { useCachedBidHistory } from './use-cached-bid-bistory';
export type {
    UseCachedBidHistoryOptions,
    UseCachedBidHistoryResult
} from './use-cached-bid-bistory';

export { useCachedMyCommitment } from './use-cached-my-bids';
export type {
    UseCachedMyCommitmentOptions,
    UseCachedMyCommitmentResult
} from './use-cached-my-bids';

export { useCachedSettledAuctions } from './use-cached-settled-auctions';
export type {
    UseCachedSettledAuctionsOptions,
    UseCachedSettledAuctionsResult
} from './use-cached-settled-auctions';

export { useCachedAuctionsByCreator } from './use-cached-auctions-by-creator';
export type {
    UseCachedAuctionsByCreatorOptions,
    UseCachedAuctionsByCreatorResult
} from './use-cached-auctions-by-creator';

// Mutation hooks
export { useAuctionMutations } from './use-auction-mutations';
export type {
    UseAuctionMutationsOptions,
    UseAuctionMutationsResult
} from './use-auction-mutations';

// Fungible token hooks
export { useFungibleQuery } from './use-fungible-query';
export type {
    UseFungibleQueryOptions,
    UseFungibleQueryResult
} from './use-fungible-query';

export { useFungibleMutations } from './use-fungible-mutation';
export type {
    UseFungibleMutationsOptions,
    UseFungibleMutationsResult
} from './use-fungible-mutation';


export { useCachedUserBalances } from './use-cached-user-balances';
export type {
    UseCachedUserBalancesOptions,
    UseCachedUserBalancesResult
} from './use-cached-user-balances'