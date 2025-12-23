

import { QueryBatchBuilder, formatGraphQLValue } from './query-builder';

/**
 * AAC Query Batch Builder
 */
export class AACQueryBatchBuilder extends QueryBatchBuilder {
    constructor() {
        super('query');
    }

    currentPrice(auction_id: number): this {
        const queryBody = `currentPrice(auctionId: ${auction_id})`;
        return this.addFragment(queryBody);
    }

    auctionInfo(auction_id: number): this {
        const queryBody = `auctionInfo(auctionId: ${auction_id}) {
                    auctionId
                    currentPrice
                    lastPriceUpdate
                    totalSupply
                    sold
                    clearingPrice
                    status
                    settledAt
                    bidsPruned
                    totalBids
                    totalBidders

                    params {
                        itemName
                        image
                        maxBidAmount
                        totalSupply
                        startPrice
                        floorPrice
                        priceDecayInterval
                        priceDecayAmount
                        startTime
                        endTime
                        creator
                        paymentTokenApp
                        auctionTokenApp
                    }
                }`;
        return this.addFragment(queryBody);
    }

    claimableSettlement(auction_id: number, user_chain: string): this {
        const queryBody = `claimableSettlement(auctionId: ${auction_id}, userChain: ${formatGraphQLValue(user_chain)}) {
                    totalQuantity

                    settlement {
                        allocatedQuantity
                        clearingPrice
                        totalCost
                        refund
                    }
                }`;
        return this.addFragment(queryBody);
    }

    allAuctions(offset: number, limit: number): this {
        const queryBody = `allAuctions(offset: ${offset}, limit: ${limit}) {
                    auctionId
                    currentPrice
                    lastPriceUpdate
                    totalSupply
                    sold
                    clearingPrice
                    status
                    settledAt
                    bidsPruned
                    totalBids
                    totalBidders

                    params {
                        itemName
                        totalSupply
                        startPrice
                        floorPrice
                        priceDecayInterval
                        priceDecayAmount
                        startTime
                        endTime
                        creator
                    }
                }`;
        return this.addFragment(queryBody);
    }

    auctionsByCreator(creator: string): this {
        const queryBody = `auctionsByCreator(creator: ${formatGraphQLValue(creator)}) {
                    auctionId
                    currentPrice
                    lastPriceUpdate
                    totalSupply
                    sold
                    clearingPrice
                    status
                    settledAt
                    bidsPruned
                    totalBids
                    totalBidders

                    params {
                        itemName
                        totalSupply
                        startPrice
                        floorPrice
                        priceDecayInterval
                        priceDecayAmount
                        startTime
                        endTime
                        creator
                    }
                }`;
        return this.addFragment(queryBody);
    }

    bidHistory(auction_id: number, offset: number, limit: number): this {
        const queryBody = `bidHistory(auctionId: ${auction_id}, offset: ${offset}, limit: ${limit}) {
                    bidId
                    auctionId
                    userAccount
                    quantity
                    amountPaid
                    timestamp
                    claimed
                }`;
        return this.addFragment(queryBody);
    }

    userBids(user: string, auction_id: number): this {
        const queryBody = `userBids(user: ${formatGraphQLValue(user)}, auction_id: ${auction_id}) {
                    bidId
                    auctionId
                    userAccount
                    quantity
                    amountPaid
                    timestamp
                    claimed
                }`;
        return this.addFragment(queryBody);
    }
}

/**
 * Indexer Chain Query
 */
export const INDEXER_QUERY = {
    /** Get Active auctions */
    ActiveAuctions (offset: number, limit: number) {
        return {
            query: `
            query {
                activeAuctions(offset: ${offset}, limit: ${limit}) {
                    auctionId
                    itemName
                    totalSupply
                    startPrice
                    floorPrice
                    priceDecayInterval
                    priceDecayAmount
                    startTime
                    endTime
                    creator

                    currentPrice
                    sold
                    clearingPrice
                    status
                    totalBids
                    totalBidders
                }
            }`
        }
    },
    
    /** Get settled auctions */
    SettledAuctions (offset: number, limit: number) {
        return {
            query: `
            query {
                settledAuctions(offset: ${offset}, limit: ${limit}) {
                    auctionId
                    itemName
                    totalSupply
                    startPrice
                    floorPrice
                    priceDecayInterval
                    priceDecayAmount
                    startTime
                    endTime
                    creator

                    currentPrice
                    sold
                    clearingPrice
                    status
                    totalBids
                    totalBidders
                }
            }`
        }
    },

    /** Auctions by Creator */
    AuctionsByCreator (creator: string, offset: number, limit: number) {
        return {
            query: `
            query {
                auctionsByCreator(creator: ${formatGraphQLValue(creator)}, offset: ${offset}, limit: ${limit}) {
                    auctionId
                    itemName
                    totalSupply
                    startPrice
                    floorPrice
                    priceDecayInterval
                    priceDecayAmount
                    startTime
                    endTime
                    creator

                    currentPrice
                    sold
                    clearingPrice
                    status
                    totalBids
                    totalBidders
                }
            }`
        }
    },

    /** Get a single auction summary */
    AuctionSummary (auction_id: string) {
        return {
            query: `
                query {
                    auctionSummary(auctionId: ${auction_id}) {
                        auctionId
                        itemName
                        totalSupply
                        startPrice
                        floorPrice
                        priceDecayInterval
                        priceDecayAmount
                        startTime
                        endTime
                        creator

                        currentPrice
                        sold
                        clearingPrice
                        status
                        totalBids
                        totalBidders
                    }
                }
            `
        }
    },

    /** Get bid history for an auction */
    BidHistory(auction_id: string, offset: number, limit: number) {
        return {
            query: `
                query {
                    bidHistory(auctionId: ${auction_id}, offset: ${offset}, limit: ${limit}) {
                        bidId
                        auctionId
                        userAccount
                        quantity
                        amountPaid
                        timestamp
                        claimed
                    }
                }
            `
        }
    },

    /** Get Indexer Subscription Info */
    SubscriptionInfo() {
        return {
            query: `
                query {
                    subscriptionInfo {
                        aacChain
                        auctionApp
                        initialized
                    }
                }`
        }
    }
}

/**
 * Indexer Chain Mutation
 */
export const INDEXER_MUTATION = {
    Initialize (aac_chain: string, auction_app: string) {
        const query = `mutation { initialize(aacChain: ${formatGraphQLValue(aac_chain)}, auctionApp: ${formatGraphQLValue(auction_app)}) }`;
        return { query };
    }
}

/**
 * Auction Authority Chain Query
 */
export const AAC_QUERY = {
    /** Create a batch query builder */
    batch(): AACQueryBatchBuilder {
        return new AACQueryBatchBuilder();
    },

    CurrentPrice (auction_id: number) {
        return {
            query: `query { currentPrice(auctionId: ${auction_id}) }`
        }
    },

    AuctionInfo (auction_id: string) {
        return {
            query: `query {
                auctionInfo(auctionId: ${auction_id}) {
                    auctionId
                    currentPrice
                    lastPriceUpdate
                    totalSupply
                    sold
                    clearingPrice
                    status
                    settledAt
                    bidsPruned
                    totalBids
                    totalBidders

                    params {
                        itemName
                        image
                        maxBidAmount
                        totalSupply
                        startPrice
                        floorPrice
                        priceDecayInterval
                        priceDecayAmount
                        startTime
                        endTime
                        creator
                        paymentTokenApp
                        auctionTokenApp
                    }
                }
            }`
        }
    },

    ClaimableSettlement (auction_id: number, user_chain: string) {
        return {
            query: `query {
                claimableSettlement(auctionId: ${auction_id}, userChain: ${formatGraphQLValue(user_chain)}) {
                    totalQuantity

                    settlement {
                        allocatedQuantity
                        clearingPrice
                        totalCost
                        refund
                    }
                }
            }`
        }
    },

    // ─────────────────────────────────────────────────────────
    // Temporary Indexer Replacement Queries
    // TODO: Switch back to INDEXER_QUERY once event streaming is stable
    // ─────────────────────────────────────────────────────────

    /** Get all auctions (temporary indexer replacement) */
    AllAuctions (offset: number, limit: number) {
        return {
            query: `query {
                allAuctions(offset: ${offset}, limit: ${limit}) {
                    auctionId
                    currentPrice
                    lastPriceUpdate
                    totalSupply
                    sold
                    clearingPrice
                    status
                    settledAt
                    bidsPruned
                    totalBids
                    totalBidders

                    params {
                        itemName
                        totalSupply
                        startPrice
                        floorPrice
                        priceDecayInterval
                        priceDecayAmount
                        startTime
                        endTime
                        creator
                    }
                }
            }`
        }
    },

    /** Get auctions by creator (temporary indexer replacement) */
    AuctionsByCreator (creator: string) {
        return {
            query: `query {
                auctionsByCreator(creator: ${formatGraphQLValue(creator)}) {
                    auctionId
                    currentPrice
                    lastPriceUpdate
                    totalSupply
                    sold
                    clearingPrice
                    status
                    settledAt
                    bidsPruned
                    totalBids
                    totalBidders

                    params {
                        itemName
                        totalSupply
                        startPrice
                        floorPrice
                        priceDecayInterval
                        priceDecayAmount
                        startTime
                        endTime
                        creator
                    }
                }
            }`
        }
    },

    /** Get bid history for an auction (temporary indexer replacement) */
    BidHistory (auction_id: string, offset: number, limit: number) {
        return {
            query: `query {
                bidHistory(auctionId: ${auction_id}, offset: ${offset}, limit: ${limit}) {
                    bidId
                    auctionId
                    userAccount
                    quantity
                    amountPaid
                    timestamp
                    claimed
                }
            }`
        }
    },

    UserBids (user: string, auction_id: number) {
        return {
            query: `query {
                userBids(user: ${formatGraphQLValue(user)}, auction_id: ${auction_id}) {
                    bidId
                    auctionId
                    userAccount
                    quantity
                    amountPaid
                    timestamp
                    claimed
                }
            }`
        }
    }
}

/**
 * Auction Authority Chain Mutation
 */
export const AAC_MUTATION = {
    CreateAuction ({
        itemName,
        totalSupply,
        startPrice,
        floorPrice,
        priceDecayInterval,
        priceDecayAmount,
        startTime,
        endTime,
        creator
    }: {
        itemName: string;
        totalSupply: number
        startPrice: string;
        floorPrice: string;
        priceDecayInterval: number;
        priceDecayAmount: string;
        startTime: number;
        endTime: number;
        creator: string;
    }) {
        const query = `mutation {
            createAuction(
                params: {
                    itemName: ${formatGraphQLValue(itemName)},
                    totalSupply: ${totalSupply},
                    startPrice: ${formatGraphQLValue(startPrice)},
                    floorPrice: ${formatGraphQLValue(floorPrice)},
                    priceDecayInterval: ${priceDecayInterval},
                    priceDecayAmount: ${formatGraphQLValue(priceDecayAmount)},
                    startTime: ${startTime},
                    endTime: ${endTime},
                    creator: ${formatGraphQLValue(creator)}
                }
            )
        }`;
        return { query };
    },

    CancelAuction (auction_id: number) {
        return {
            query: `mutation { cancelAuction(auctionId: ${auction_id}) }`
        }
    },

    Trigger () {
        return {
            query: `mutation { trigger }`
        }
    },

    PruneSettledAuction (auction_id: number) {
        return {
            query: `mutation { pruneSettledAuction(auctionId: ${auction_id}) }`
        }
    },
    
    Buy (auction_id: string, quantity: string) {
        return {
            query: `mutation { buy(auctionId: ${auction_id}, quantity: ${quantity}) }`
        }
    },

    ClaimSettlement (auction_id: number) {
        return {
            query: `mutation { claimSettlement(auctionId: ${auction_id}) }`
        }
    }
}

export const FUNGIBLE_MUTATION = {
    Mint (owner: string, amount: number) {
        return {
            query: `mutation { mint(owner: ${formatGraphQLValue(owner)}, amount: ${formatGraphQLValue(String(amount))}) }`
        }
    },

    Approve (owner: string, spender: string, allowance: number) {
        return {
            query: `mutation { approve(owner: ${formatGraphQLValue(owner)}, spender: ${formatGraphQLValue(spender)}, allowance: ${formatGraphQLValue(String(allowance))}) }`
        }
    },

    Transfer (owner: string, amount: number, target_account: string) {
        return {
            query: `mutation { transfer(owner: ${formatGraphQLValue(owner)}, amount: ${formatGraphQLValue(String(amount))}, targetAccount: ${formatGraphQLValue(target_account)}) }`
        }
    },

    TransferFrom (owner: string, spender: string, amount: number, target_account: string) {
        return {
            query: `mutation { transferFrom(owner: ${formatGraphQLValue(owner)}, spender: ${formatGraphQLValue(spender)}, amount: ${formatGraphQLValue(String(amount))}, targetAccount: ${formatGraphQLValue(target_account)}) }`
        }
    },

    Claim (source_account: string, amount: number, target_account: string) {
        return {
            query: `mutation { transferFrom(sourceAccount: ${formatGraphQLValue(source_account)}, amount: ${formatGraphQLValue(String(amount))}, targetAccount: ${formatGraphQLValue(target_account)}) }`
        }
    },

    Balance (owner: string) {
        return {
            query: `mutation { balance(owner: ${formatGraphQLValue(owner)}) }`
        }
    },

    TickerSymbol () {
        return {
            query: `mutation { tickerSymbol }`
        }
    },

    TokenName () {
        return {
            query: `mutation { tokenName }`
        }
    },
    
}

export const FUNGIBLE_QUERY = {
    Accounts () {
        return {
            query: `query {
                accounts {
                    entries {
                        key
                        value
                    }
                }
            }`
        }
    },

    Allowances () {
        return {
            query: `query {
                allowances {
                    entries {
                        key
                        value
                    }
                }
            }`
        }
    },

    TickerSymbol () {
        return {
            query: `query { tickerSymbol }`
        }
    },

    TokenName () {
        return {
            query: `query { tokenName }`
        }
    },

}