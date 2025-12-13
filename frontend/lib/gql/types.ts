
export const AuctionStatus = {
    Schedule: 0,
    Active: 1,
    Ended: 2,
    Settled: 3,
    Cancelled: 4
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