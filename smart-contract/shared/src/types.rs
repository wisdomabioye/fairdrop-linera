use async_graphql::{scalar, InputObject, SimpleObject};
use linera_sdk::linera_base_types::{AccountOwner, Amount, ChainId, Timestamp};
use serde::{Deserialize, Serialize};

pub type AuctionId = u64;

/// Auction configuration parameters (for GraphQL input)
#[derive(Debug, Clone, Serialize, Deserialize, Eq, PartialEq, InputObject)]
#[graphql(name = "AuctionParamsInput")]
pub struct AuctionParamsInput {
    pub item_name: String,
    pub total_supply: u64, // Total quantity for sale
    pub start_price: Amount, // Starting price per unit
    pub floor_price: Amount, // Minimum price (reserve)
    pub price_decay_interval: u64, // Microseconds between price drops
    pub price_decay_amount: Amount, // Amount to decrease per interval
    pub start_time: Timestamp,
    pub end_time: Timestamp,
    pub creator: AccountOwner, // Creator's account (for fund transfers)
}

/// Auction configuration parameters (for output and internal use)
#[derive(Debug, Clone, Serialize, Deserialize, Eq, PartialEq, SimpleObject)]
pub struct AuctionParams {
    pub item_name: String,
    pub total_supply: u64,
    pub start_price: Amount,
    pub floor_price: Amount,
    pub price_decay_interval: u64,
    pub price_decay_amount: Amount,
    pub start_time: Timestamp,
    pub end_time: Timestamp,
    pub creator: AccountOwner,
}

// Conversion from input to internal type
impl From<AuctionParamsInput> for AuctionParams {
    fn from(input: AuctionParamsInput) -> Self {
        Self {
            item_name: input.item_name,
            total_supply: input.total_supply,
            start_price: input.start_price,
            floor_price: input.floor_price,
            price_decay_interval: input.price_decay_interval,
            price_decay_amount: input.price_decay_amount,
            start_time: input.start_time,
            end_time: input.end_time,
            creator: input.creator,
        }
    }
}

scalar!(AuctionStatus);
#[derive(Debug, Clone, Copy, Serialize, Deserialize, Eq, PartialEq)]
pub enum AuctionStatus {
    Scheduled, // Created but not yet started (current_time < start_time)
    Active, // Accepting bids (started and not ended)
    Ended, // Supply exhausted or time expired, ready for settlement
    Settled, // Settlement complete
    Cancelled, // Cancelled by creator (only Scheduled auctions can be cancelled)
}

/// Individual bid record (stored on AAC)
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct BidRecord {
    pub bid_id: u64,
    pub auction_id: AuctionId,
    pub user_chain: ChainId,
    pub quantity: u64,
    pub amount_paid: Amount,
    pub timestamp: Timestamp,
    pub claimed: bool,
}

/// User's local commitment (stored on UIC)
#[derive(Debug, Clone, Default, Serialize, Deserialize, SimpleObject)]
pub struct UserCommitment {
    pub total_quantity: u64, // Total quantity bid for
    pub settlement: Option<SettlementResult>,
}

/// Settlement result sent from AAC to UIC
#[derive(Debug, Clone, Serialize, Deserialize, Eq, PartialEq, SimpleObject)]
pub struct SettlementResult {
    pub allocated_quantity: u64, // Quantity received
    pub clearing_price: Amount, // Final uniform price
    pub total_cost: Amount, // allocated_quantity × clearing_price
    pub refund: Amount, // Overpayment refunded
}

/// Auction summary (materialized by Indexer)
/// Flattened structure combining original params + derived state
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct AuctionSummary {
    // ──────────────────────────────────────────────────────────
    // Original Auction Parameters (from AuctionParams)
    // ──────────────────────────────────────────────────────────
    pub auction_id: AuctionId,
    pub item_name: String,
    pub total_supply: u64,
    pub start_price: Amount,
    pub floor_price: Amount,
    pub price_decay_interval: u64,
    pub price_decay_amount: Amount,
    pub start_time: Timestamp,
    pub end_time: Timestamp,
    pub creator: AccountOwner,

    // ──────────────────────────────────────────────────────────
    // Derived State (computed/updated during auction lifecycle)
    // ──────────────────────────────────────────────────────────
    pub current_price: Amount,
    pub sold: u64,
    pub clearing_price: Option<Amount>,
    pub status: AuctionStatus,
    pub total_bids: u64,
    pub total_bidders: u64,
}
