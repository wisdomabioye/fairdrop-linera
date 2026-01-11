/**
 * Auction Hooks Index
 *
 * Centralized exports for all auction-related React hooks.
 */

export { usePolling } from './usePolling';

// Indexer initialization
export { useIndexerInitialization } from './auctions/use-indexer-initialization';
export type {
    UseIndexerInitializationOptions,
    UseIndexerInitializationResult
} from './auctions/use-indexer-initialization';

// Data fetching hooks
export { useCachedActiveAuctions } from './auctions/use-cached-active-auctions';
export type {
    UseCachedActiveAuctionsOptions,
    UseCachedActiveAuctionsResult
} from './auctions/use-cached-active-auctions';

export { useCachedAuctionSummary } from './auctions/use-cached-auction-summary';
export type {
    UseCachedAuctionSummaryOptions,
    UseCachedAuctionSummaryResult
} from './auctions/use-cached-auction-summary';

export { useCachedBidHistory } from './auctions/use-cached-bid-history';
export type {
    UseCachedBidHistoryOptions,
    UseCachedBidHistoryResult
} from './auctions/use-cached-bid-history';

export { useCachedMyCommitment } from './auctions/use-cached-my-commitment';
export type {
    UseCachedMyCommitmentOptions,
    UseCachedMyCommitmentResult
} from './auctions/use-cached-my-commitment';

export { useCachedAllMyCommitments } from './auctions/use-cached-all-my-commitments';
export type {
    UseCachedAllMyCommitmentsOptions,
    UseCachedAllMyCommitmentsResult
} from './auctions/use-cached-all-my-commitments';

export { useCachedSettledAuctions } from './auctions/use-cached-settled-auctions';
export type {
    UseCachedSettledAuctionsOptions,
    UseCachedSettledAuctionsResult
} from './auctions/use-cached-settled-auctions';

export { useCachedAuctionsByCreator } from './auctions/use-cached-auctions-by-creator';
export type {
    UseCachedAuctionsByCreatorOptions,
    UseCachedAuctionsByCreatorResult
} from './auctions/use-cached-auctions-by-creator';

// Mutation hooks
export { useAuctionMutations } from './auctions/use-auction-mutations';
export type {
    UseAuctionMutationsOptions,
    UseAuctionMutationsResult
} from './auctions/use-auction-mutations';

// Fungible token hooks
export { useFungibleQuery } from './auctions/use-fungible-query';
export type {
    UseFungibleQueryOptions,
    UseFungibleQueryResult
} from './auctions/use-fungible-query';

export { useFungibleMutations } from './auctions/use-fungible-mutation';
export type {
    UseFungibleMutationsOptions,
    UseFungibleMutationsResult
} from './auctions/use-fungible-mutation';
