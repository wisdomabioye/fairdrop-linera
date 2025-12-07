use async_graphql::{scalar, InputObject, SimpleObject};
use linera_sdk::linera_base_types::{Amount, ChainId, Timestamp};
use serde::{Deserialize, Serialize};

pub type AuctionId = u64;

/// Auction configuration parameters
#[derive(Debug, Clone, Serialize, Deserialize, InputObject)]
pub struct AuctionParams {
    pub auction_id: AuctionId,
    pub item_name: String,
    pub total_supply: u64, // Total quantity for sale
    pub start_price: Amount, // Starting price per unit
    pub floor_price: Amount, // Minimum price (reserve)
    pub price_decay_interval: u64, // Microseconds between price drops
    pub price_decay_amount: Amount, // Amount to decrease per interval
    pub start_time: Timestamp,
    pub end_time: Timestamp,
    pub creator: ChainId,
}

scalar!(AuctionStatus);
#[derive(Debug, Clone, Copy, Serialize, Deserialize, Eq, PartialEq)]
pub enum AuctionStatus {
    Active, // Accepting bids
    Ended, // Supply exhausted or time expired, ready for settlement
    Settled, // Settlement complete
    Cancelled, // Cancelled by creator
}

/// Individual bid record (stored on AAC)
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct BidRecord {
    pub bid_id: u64,
    pub auction_id: AuctionId,
    pub user_chain: ChainId,
    pub quantity: u64,
    pub price_at_bid: Amount,
    pub timestamp: Timestamp,
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
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct AuctionSummary {
    pub auction_id: AuctionId,
    pub item_name: String,
    pub current_price: Amount,
    pub total_supply: u64,
    pub sold: u64,
    pub clearing_price: Option<Amount>,
    pub status: AuctionStatus,
    pub total_bids: u64,
    pub total_bidders: u64,
}
