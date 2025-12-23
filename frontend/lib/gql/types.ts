import { microsecondsToMilliseconds } from '@/lib/utils/auction-utils';

export const AuctionStatus = {
    Scheduled: 'Scheduled',
    Active: 'Active',
    Ended: 'Ended',
    Settled: 'Settled',
    Cancelled: 'Cancelled'
} as const;

export type AuctionStatus = typeof AuctionStatus[keyof typeof AuctionStatus];

export interface AuctionParam {
    image: string;
    itemName: string;
    totalSupply: number;
    startPrice: string;
    floorPrice: string;
    priceDecayInterval: number;
    priceDecayAmount: string;
    startTime: number;
    endTime: number;
    creator: string;
}

export interface AuctionSummary extends AuctionParam {
    auctionId: number;
    currentPrice: string;
    sold: number;
    clearingPrice: string | null;
    status: AuctionStatus;
    totalBids: number;
    totalBidders: number;
}

export interface BidRecord {
    bidId: number;
    auctionId: number;
    userChain: string;
    quantity: number;
    amountPaid: number;
    timestamp: number;
    claimed: boolean;
}

export interface SettlementResult {
    allocatedQuantity: number;
    clearingPrice: string;
    totalCost: string;
    refund: string;
}

export interface UserCommitment {
    totalQuantity: number;
    settlement: SettlementResult | null;
}

export interface AuctionCommitment {
    auctionId: string;
    commitment: UserCommitment;
}

export interface SubscriptionInfo {
    aacChain: string;
    auctionApp: string;
    initialized: boolean;
}


// ============ Data Transformers ============
// Transform AuctionWithId (from AAC) to AuctionSummary (frontend format)
export interface AuctionWithId {
    auctionId: number;
    currentPrice: string;
    lastPriceUpdate: number;
    totalSupply: number;
    sold: number;
    clearingPrice: string | null;
    status: AuctionStatus;
    settledAt: number | null;
    bidsPruned: boolean;
    totalBids: number;
    totalBidders: number;
    params: {
        image: string;
        itemName: string;
        totalSupply: number;
        startPrice: string;
        floorPrice: string;
        priceDecayInterval: number;
        priceDecayAmount: string;
        startTime: number;
        endTime: number;
        creator: string;
    };
}

export function transformAuctionStatus(auction: AuctionWithId): AuctionStatus {
    // Update status for UI
    if (
        auction.status === AuctionStatus.Scheduled 
        &&
        Date.now() >= microsecondsToMilliseconds(auction.params.startTime)
        &&
        Date.now() < microsecondsToMilliseconds(auction.params.endTime)
    ) {
        return AuctionStatus.Active;
    }

    if (
        auction.status === AuctionStatus.Active
        &&
        Date.now() > microsecondsToMilliseconds(auction.params.endTime)
    ) {
        return AuctionStatus.Ended;
    }

    return auction.status;

}

export function transformAuctionWithId(auction: AuctionWithId): AuctionSummary {
    return {
        auctionId: auction.auctionId,
        image: auction.params.image,
        itemName: auction.params.itemName,
        totalSupply: auction.params.totalSupply,
        startPrice: auction.params.startPrice,
        floorPrice: auction.params.floorPrice,
        priceDecayInterval: auction.params.priceDecayInterval,
        priceDecayAmount: auction.params.priceDecayAmount,
        // Convert timestamps from microseconds (backend) to milliseconds (JavaScript)
        startTime: microsecondsToMilliseconds(auction.params.startTime),
        endTime: microsecondsToMilliseconds(auction.params.endTime),
        creator: auction.params.creator,
        currentPrice: auction.currentPrice,
        sold: auction.sold,
        clearingPrice: auction.clearingPrice,
        status: transformAuctionStatus(auction),
        totalBids: auction.totalBids,
        totalBidders: auction.totalBidders,
    };
}

export function transformBidRecord(bid: BidRecord): BidRecord {
    return {
        ...bid,
        // Convert timestamp from microseconds (backend) to milliseconds (JavaScript)
        timestamp: microsecondsToMilliseconds(bid.timestamp)
    };
}

// ============ Fungible Token Types ============

export interface AccountBalance {
    key: string; // AccountOwner
    value: string; // Amount
}

export interface Allowance {
    key: string; // OwnerSpender (serialized scalar)
    value: string; // Amount
}

export interface FungibleAccounts {
    accounts: {
        entries: AccountBalance[];
    };
}

export interface FungibleAllowances {
    allowances: {
        entries: Allowance[];
    };
}

export interface FungibleTokenInfo {
    tickerSymbol: string;
    tokenName: string;
}

// Mutation responses
export interface MintResponse {
    mint: null;
}

export interface ApproveResponse {
    approve: null;
}

export interface TransferResponse {
    transfer: null;
}

export interface TransferFromResponse {
    transferFrom: null;
}

export interface ClaimResponse {
    claim: null;
}

export interface BalanceResponse {
    balance: string;
}

export interface TickerSymbolResponse {
    tickerSymbol: string;
}

export interface TokenNameResponse {
    tokenName: string;
}
