

import { QueryBatchBuilder, formatGraphQLValue } from './query-builder';
import { RecipientAccount, AuctionParam } from './types';

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
        const queryBody = `userBids(user: ${formatGraphQLValue(user)}, auctionId: ${auction_id}) {
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

    userBalance (user: string, token_app: string): this {
        const queryBody = `userBalance(user: ${formatGraphQLValue(user)}, tokenApp: ${formatGraphQLValue(token_app)})`;
        
        return this.addFragment(queryBody);
    }

    userBalances (user: string, token_apps: string[]): this {
        const queryBody = `
            userBalances(user: ${formatGraphQLValue(user)}, tokenApps: ${formatGraphQLValue(token_apps)}) {
                tokenApp
                amount
            }`;

        return this.addFragment(queryBody);
    }

    globalStats (): this {
        const queryBody = `
            globalStats {
                totalAuctions
                totalBids
                depositedByToken { tokenApp amount }
                withdrawnByToken { tokenApp amount }
                totalValueLocked { tokenApp amount }
            }`;
        
        return this.addFragment(queryBody);
    }
}

/**
 * ============================================================================
 * BATCH QUERY USAGE GUIDE
 * ============================================================================
 *
 * The AACQueryBatchBuilder above allows batching multiple queries into a single
 * GraphQL request to the Auction Authority Chain (AAC).
 *
 * **Performance Benefits:**
 * - Reduces N API calls → 1 API call
 * - Reduces network latency (1 round-trip instead of N)
 * - Reduces server load (1 GraphQL parse/execute cycle instead of N)
 *
 * **When to Batch (Decision Tree):**
 *
 * 1. ✅ Fetching THE SAME query type for MULTIPLE items
 *    - Example: userBalances for N different tokens (N calls → 1 call)
 *    - Example: Multiple auction prices in a portfolio view
 *    - Example: Bid history for multiple auctions in admin dashboard
 *
 * 2. ✅ Queries ALWAYS fetched together (guaranteed co-dependencies)
 *    - Example: Auction detail page needs auction + bidHistory + userBids
 *    - Example: User portfolio needs balances + deposits + withdrawals
 *
 * 3. ❌ DON'T batch unrelated queries that live on different pages
 *    - Example: Active auctions (home page) + settled auctions (history page)
 *    - Example: Global stats (dashboard) + user profile (settings)
 *
 * 4. ❌ DON'T batch constant data that only needs one fetch ever
 *    - Example: Token metadata (name, symbol) - cache forever, no need to batch
 *    - Example: Auction terms/rules that never change
 *
 * **Canonical Example: userBalances (see auction-store.fetchUserBalances)**
 *
 * BEFORE (N+1 Problem):
 * ```typescript
 * // User has 5 tokens → 5 individual API calls
 * for (const tokenApp of tokenApps) {
 *   const balance = await AAC_QUERY.UserBalance(address, tokenApp);
 * }
 * ```
 *
 * AFTER (Batched):
 * ```typescript
 * // User has 5 tokens → 1 batched API call
 * const balances = await AAC_QUERY.UserBalances(address, tokenApps);
 * // Returns array of {tokenApp, amount} objects
 * ```
 *
 * **How to Use AACQueryBatchBuilder:**
 *
 * ```typescript
 * const builder = new AACQueryBatchBuilder();
 *
 * // Add multiple fragments
 * builder
 *   .auctionSummary('1')
 *   .bidHistory('1', 0, 50)
 *   .userBids('1', userAddress);
 *
 * // Build and execute
 * const query = builder.build();
 * const result = await aacApp.graphql(query);
 *
 * // Access results
 * const auction = result.auctionSummary_1;
 * const bids = result.bidHistory_1;
 * const userBids = result.userBids_1;
 * ```
 *
 * **Naming Convention:**
 * - Query results are named: `{method}_{auctionId}` or `{method}_{address}`
 * - Example: `auctionSummary_1`, `userBids_0x123...`
 * - This prevents conflicts when batching the same query type for different IDs
 *
 * **Current Batched Queries:**
 * - ✅ userBalances (address, tokenApps[]) - CANONICAL EXAMPLE
 *
 * **Future Batching Opportunities:**
 * - Auction detail page (auction + bidHistory + userBids)
 * - Portfolio view (multiple userBalance calls for different tokens)
 * - Admin dashboard (multiple auction stats)
 *
 * ============================================================================
 */

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
                userBids(user: ${formatGraphQLValue(user)}, auctionId: ${auction_id}) {
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

    UserBalance (user: string, token_app: string) {
        return {
            query: `query {
                userBalance(user: ${formatGraphQLValue(user)}, tokenApp: ${formatGraphQLValue(token_app)})
            }`
        }
    },

    UserBalances (user: string, token_apps: string[]) {
        return {
            query: `query {
                userBalances(user: ${formatGraphQLValue(user)}, tokenApps: ${formatGraphQLValue(token_apps)}) {
                    tokenApp
                    amount
                }
            }`
        }
    },

    GlobalStats () {
        return {
            query: `query {
                globalStats {
                    totalAuctions
                    totalBids
                    depositedByToken { tokenApp amount }
                    withdrawnByToken { tokenApp amount }
                    totalValueLocked { tokenApp amount }
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
        image,
        totalSupply,
        maxBidAmount,
        startPrice,
        floorPrice,
        priceDecayInterval,
        priceDecayAmount,
        startTime,
        endTime,
        creator,
        paymentTokenApp,
        auctionTokenApp
    }: AuctionParam) {
        const query = `mutation {
            createAuction(
                params: {
                    itemName: ${formatGraphQLValue(itemName)},
                    image: ${formatGraphQLValue(image)},
                    maxBidAmount: ${formatGraphQLValue(String(maxBidAmount))},
                    paymentTokenApp: ${formatGraphQLValue(paymentTokenApp)},
                    auctionTokenApp: ${formatGraphQLValue(auctionTokenApp)},
                    totalSupply: ${formatGraphQLValue(String(totalSupply))},
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
            query: `mutation { buy(auctionId: ${auction_id}, quantity: ${formatGraphQLValue(quantity)}) }`
        }
    },

    ClaimSettlement (auction_id: number) {
        return {
            query: `mutation { claimSettlement(auctionId: ${auction_id}) }`
        }
    },

    WithdrawProceed (auction_id: number) {
        return {
            query: `mutation { withdrawProceed(auctionId: ${auction_id}) }`
        }
    },

    WithdrawUnsoldToken (auction_id: number) {
        return {
            query: `mutation { withdrawUnsoldToken(auctionId: ${auction_id}) }`
        }
    },

    Deposit (app_token_id: string, amount: string) {
        return {
            query: `mutation { deposit(appTokenId: ${formatGraphQLValue(app_token_id)}, amount: ${formatGraphQLValue(amount)}) }`
        }
    },

    Withdraw (app_token_id: string, amount: string, target_chain: string) {
        return {
            query: `mutation { withdraw(appTokenId: ${formatGraphQLValue(app_token_id)}, amount: ${formatGraphQLValue(amount)}, targetChain: ${formatGraphQLValue(target_chain)}) }`
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

    Transfer (owner: string, amount: number, target_account: RecipientAccount) {
        return {
            query: `mutation { 
            transfer(
                owner: ${formatGraphQLValue(owner)}, 
                amount: ${formatGraphQLValue(String(amount))}, 
                targetAccount: {
                    chainId: ${formatGraphQLValue(target_account.chainId)},
                    owner: ${formatGraphQLValue(target_account.owner)}
                }
            )}`
        }
    },

    TransferFrom (owner: string, spender: string, amount: number, target_account: RecipientAccount) {
        return {
            query: `mutation { 
            transferFrom(
                owner: ${formatGraphQLValue(owner)}, 
                spender: ${formatGraphQLValue(spender)}, 
                amount: ${formatGraphQLValue(String(amount))}, 
                targetAccount: {
                    chainId: ${formatGraphQLValue(target_account.chainId)},
                    owner: ${formatGraphQLValue(target_account.owner)}
                }    
            )}`
        }
    },

    Claim (source_account: string, amount: number, target_account: RecipientAccount) {
        return {
            query: `mutation { 
            transferFrom(
                sourceAccount: ${formatGraphQLValue(source_account)}, 
                amount: ${formatGraphQLValue(String(amount))}, 
                targetAccount: {
                    chainId: ${formatGraphQLValue(target_account.chainId)},
                    owner: ${formatGraphQLValue(target_account.owner)}
                }
            )}`
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
    Balance (owner: string) {
        return {
            query: `query {
                balance(owner: ${formatGraphQLValue(owner)})
            }`
        }
    },

    Allowance (owner: string, spender: string) {
        return {
            query: `query {
                allowance(owner: ${formatGraphQLValue(owner)}, spender: ${formatGraphQLValue(spender)})
            }`
        }
    },

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