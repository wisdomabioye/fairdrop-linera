/**
 * Auction Hooks Index
 *
 * Centralized exports for all auction-related React hooks.
 */

// Indexer initialization
export { useIndexerInitialization } from './useIndexerInitialization';
export type {
    UseIndexerInitializationOptions,
    UseIndexerInitializationResult
} from './useIndexerInitialization';

// Data fetching hooks
export { useCachedActiveAuctions } from './useCachedActiveAuctions';
export type {
    UseCachedActiveAuctionsOptions,
    UseCachedActiveAuctionsResult
} from './useCachedActiveAuctions';

export { useCachedAuctionSummary } from './useCachedAuctionSummary';
export type {
    UseCachedAuctionSummaryOptions,
    UseCachedAuctionSummaryResult
} from './useCachedAuctionSummary';

export { useCachedBidHistory } from './useCachedBidHistory';
export type {
    UseCachedBidHistoryOptions,
    UseCachedBidHistoryResult
} from './useCachedBidHistory';

export { useCachedMyCommitment } from './useCachedMyCommitment';
export type {
    UseCachedMyCommitmentOptions,
    UseCachedMyCommitmentResult
} from './useCachedMyCommitment';

export { useCachedAllMyCommitments } from './useCachedAllMyCommitments';
export type {
    UseCachedAllMyCommitmentsOptions,
    UseCachedAllMyCommitmentsResult
} from './useCachedAllMyCommitments';

export { useCachedSettledAuctions } from './useCachedSettledAuctions';
export type {
    UseCachedSettledAuctionsOptions,
    UseCachedSettledAuctionsResult
} from './useCachedSettledAuctions';

export { useCachedAuctionsByCreator } from './useCachedAuctionsByCreator';
export type {
    UseCachedAuctionsByCreatorOptions,
    UseCachedAuctionsByCreatorResult
} from './useCachedAuctionsByCreator';

// Mutation hooks
export { useAuctionMutations } from './useAuctionMutations';
export type {
    UseAuctionMutationsOptions,
    UseAuctionMutationsResult
} from './useAuctionMutations';

// Fungible token hooks
export { useFungibleQuery } from './useFungibleQuery';
export type {
    UseFungibleQueryOptions,
    UseFungibleQueryResult
} from './useFungibleQuery';

export { useFungibleMutations } from './useFungibleMutation';
export type {
    UseFungibleMutationsOptions,
    UseFungibleMutationsResult
} from './useFungibleMutation';
