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

export function transformAuctionWithId(auction: AuctionWithId): AuctionSummary {
    return {
        auctionId: auction.auctionId,
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
        status: auction.status,
        totalBids: auction.totalBids,
        totalBidders: auction.totalBidders,
    };
}
