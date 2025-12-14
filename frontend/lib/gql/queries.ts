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
                auctionsByCreator(creator: "${creator}", offset: ${offset}, limit: ${limit}) {
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
                        userChain
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
        const query = `mutation { initialize(aacChain: "${aac_chain}", auctionApp: "${auction_app}") }`;
        return { query };
    }
}

/**
 * Auction Authority Chain Query
 */
export const AAC_QUERY = {
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

    ClaimableSettlement (auction_id: number, user_chain: string) {
        return {
            query: `query {
                claimableSettlement(auctionId: ${auction_id}, userChain: "${user_chain}") {
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
                auctionsByCreator(creator: "${creator}") {
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
                    userChain
                    quantity
                    amountPaid
                    timestamp
                    claimed
                }
            }`
        }
    },
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
                    itemName: "${itemName}",
                    totalSupply: ${totalSupply},
                    startPrice: "${startPrice}",
                    floorPrice: "${floorPrice}",
                    priceDecayInterval: ${priceDecayInterval},
                    priceDecayAmount: "${priceDecayAmount}",
                    startTime: ${startTime},
                    endTime: ${endTime},
                    creator: "${creator}"
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

    PruneSettledAuction (auction_id: number) {
        return {
            query: `mutation { pruneSettledAuction(auctionId: ${auction_id}) }`
        }
    },
}

/**
 * User Interaction Chain Query
 */
export const UIC_QUERY = {
    /** Get my commitment for an auction */
    MyCommitmentForAuction (auction_id: number) {
        return {
            query: `query {
                myCommitmentForAuction(auctionId: ${auction_id}) {
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

    /** Get my commit for all auctions */
    MyAuctionCommitment () {
        return {
            query: `query {
                myAuctionCommitment {
                    auctionId
                    
                    commitment {
                        totalQuantity
                    
                        settlement {
                            allocatedQuantity
                            clearingPrice
                            totalCost
                            refund
                        } 
                    } 
                }
            }`
        }
    }
}

/**
 * User Interaction Chain Mutation
 */
export const UIC_MUTATION = {
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
                    itemName: "${itemName}",
                    totalSupply: ${totalSupply},
                    startPrice: "${startPrice}",
                    floorPrice: "${floorPrice}",
                    priceDecayInterval: ${priceDecayInterval},
                    priceDecayAmount: "${priceDecayAmount}",
                    startTime: ${startTime},
                    endTime: ${endTime},
                    creator: "${creator}"
                }
            )
        }`;
        return { query };
    },

    Buy (auction_id: string, quantity: string) {
        return {
            query: `mutation { buy(auctionId: ${auction_id}, quantity: ${quantity}) }`
        }
    },

    SubscribeToAuction (aac_chain: string) {
        return {
            query: `mutation { subscribeToAuction(aacChain: "${aac_chain}") }`
        }
    },

    UnsubscribeFromAuction (aac_chain: string) {
        return {
            query: `mutation { unsubscribeFromAuction(aacChain: "${aac_chain}") }`
        }
    },

    ClaimSettlement (auction_id: number) {
        return {
            query: `mutation { claimSettlement(auctionId: ${auction_id}) }`
        }
    }
}