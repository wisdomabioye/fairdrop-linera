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
        return {
            query: `mutation { initialize(aacChain: ${aac_chain}, auctionApp: ${auction_app}) }`
        }
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

    AuctionInfo (auction_id: number) {
        return {
            query: `query { 
                auctionInfo(auctionId: ${auction_id}) {
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
        return {
            query: `mutation { 
                createAuction(
                    params: {
                        itemName: "${itemName}",
                        totalSupply: ${totalSupply},
                        startPrice: "${Number(startPrice)}",
                        floorPrice: "${Number(floorPrice)}",
                        priceDecayInterval: ${priceDecayInterval},
                        priceDecayAmount: "${Number(priceDecayAmount).toFixed(1)}",
                        startTime: ${startTime},
                        endTime: ${endTime},
                        creator: "${creator}"
                    }
                
                )    
            }`
        }
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
        return {
            query: `mutation { 
                createAuction(
                    params: {
                        itemName: "${itemName}",
                        totalSupply: ${totalSupply},
                        startPrice: "${Number(startPrice)}",
                        floorPrice: "${Number(floorPrice)}",
                        priceDecayInterval: ${priceDecayInterval},
                        priceDecayAmount: "${Number(priceDecayAmount).toFixed(1)}",
                        startTime: ${startTime},
                        endTime: ${endTime},
                        creator: "${creator}"
                    }
                
                )    
            }`
        }
    },

    Buy (auction_id: number, quantity: number) {
        return {
            query: `mutation { buy(auctionId: ${auction_id}, quantity: ${quantity}) }`
        }
    },

    SubscribeToAuction (aac_chain: string) {
        return {
            query: `mutation { subscribeToAuction(aacChain: ${aac_chain}) }`
        }
    },

    UnsubscribeFromAuction (aac_chain: string) {
        return {
            query: `mutation { unsubscribeFromAuction(aacChain: ${aac_chain}) }`
        }
    },

    ClaimSettlement (auction_id: number) {
        return {
            query: `mutation { claimSettlement(auctionId: ${auction_id}) }`
        }
    }
}