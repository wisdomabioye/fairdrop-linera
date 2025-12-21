use async_graphql::{scalar, InputObject, SimpleObject};
use linera_sdk::linera_base_types::{AccountOwner, Amount, ApplicationId, Timestamp};
use serde::{Deserialize, Serialize};

pub type AuctionId = u64;

/// Auction configuration parameters (for GraphQL input)
#[derive(Debug, Clone, Serialize, Deserialize, Eq, PartialEq, InputObject)]
#[graphql(name = "AuctionParamsInput")]
pub struct AuctionParamsInput {
    pub item_name: String,
    pub image: String,
    pub max_bid_amount: Amount,
    pub total_supply: Amount, // Total quantity for sale
    pub start_price: Amount, // Starting price per unit
    pub floor_price: Amount, // Minimum price (reserve)
    pub price_decay_interval: u64, // Microseconds between price drops
    pub price_decay_amount: Amount, // Amount to decrease per interval
    pub start_time: Timestamp,
    pub end_time: Timestamp,
    pub creator: AccountOwner, // Creator's account (for fund transfers)
    pub payment_token_app: ApplicationId, // Fungible token application for payments
    pub auction_token_app: ApplicationId,
}

/// Auction configuration parameters (for output and internal use)
#[derive(Debug, Clone, Serialize, Deserialize, Eq, PartialEq, SimpleObject)]
pub struct AuctionParams {
    pub item_name: String,
    pub image: String,
    pub total_supply: Amount,
    pub max_bid_amount: Amount,
    pub start_price: Amount,
    pub floor_price: Amount,
    pub price_decay_interval: u64,
    pub price_decay_amount: Amount,
    pub start_time: Timestamp,
    pub end_time: Timestamp,
    pub creator: AccountOwner,
    pub payment_token_app: ApplicationId,
    pub auction_token_app: ApplicationId,
}

// Conversion from input to internal type
impl From<AuctionParamsInput> for AuctionParams {
    fn from(input: AuctionParamsInput) -> Self {
        Self {
            item_name: input.item_name,
            image: input.image,
            max_bid_amount: input.max_bid_amount,
            total_supply: input.total_supply,
            start_price: input.start_price,
            floor_price: input.floor_price,
            price_decay_interval: input.price_decay_interval,
            price_decay_amount: input.price_decay_amount,
            start_time: input.start_time,
            end_time: input.end_time,
            creator: input.creator,
            payment_token_app: input.payment_token_app,
            auction_token_app: input.auction_token_app,
        }
    }
}

scalar!(AuctionStatus);
#[derive(Debug, Clone, Copy, Serialize, Deserialize, Eq, PartialEq)]
pub enum AuctionStatus {
    Scheduled, // Created but not yet started (current_time < start_time)
    Active, // Accepting bids (started and not ended)
    Settled, // Settlement complete
    Pruned,
    Cancelled, // Cancelled by creator (only Scheduled auctions can be cancelled)
}

/// Individual bid record (stored on AAC)
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct BidRecord {
    pub bid_id: u64,
    pub auction_id: AuctionId,
    pub user_account: AccountOwner,
    pub quantity: Amount,
    pub amount_paid: Amount,
    pub timestamp: Timestamp,
    pub claimed: bool,
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
    pub image: String,
    pub max_bid_amount: Amount,
    pub total_supply: Amount,
    pub start_price: Amount,
    pub floor_price: Amount,
    pub price_decay_interval: u64,
    pub price_decay_amount: Amount,
    pub start_time: Timestamp,
    pub end_time: Timestamp,
    pub creator: AccountOwner,
    pub payment_token_app: ApplicationId,
    pub auction_token_app: ApplicationId,

    // ──────────────────────────────────────────────────────────
    // Derived State (computed/updated during auction lifecycle)
    // ──────────────────────────────────────────────────────────
    pub current_price: Amount,
    pub sold: Amount,
    pub clearing_price: Option<Amount>,
    pub status: AuctionStatus,
    pub total_bids: u64,
    pub total_bidders: u64,
}
