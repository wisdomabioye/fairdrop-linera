use linera_sdk::linera_base_types::{Amount, ChainId, Timestamp};
use serde::{Deserialize, Serialize};

use crate::types::AuctionId;

/// Stream name for all auction events
pub const AUCTION_STREAM: &[u8] = b"fairdrop_auctions";

/// Events emitted by AAC (Auction Authority Chain)
#[derive(Debug, Clone, Serialize, Deserialize, Eq, PartialEq)]
pub enum AuctionEvent {
    /// Auction created
    AuctionCreated {
        auction_id: AuctionId,
        item_name: String,
        total_supply: u64,
        start_price: Amount,
        floor_price: Amount,
        start_time: Timestamp,
        end_time: Timestamp,
    },

    /// Price updated (interval passed)
    PriceUpdated {
        auction_id: AuctionId,
        new_price: Amount,
        timestamp: Timestamp,
    },

    /// Bid accepted
    BidAccepted {
        auction_id: AuctionId,
        bid_id: u64,
        user_chain: ChainId,
        quantity: u64,
        price_at_bid: Amount,
        total_sold: u64,
        remaining: u64,
    },

    /// Bid rejected
    BidRejected {
        auction_id: AuctionId,
        user_chain: ChainId,
        reason: String,
    },

    /// Auction cleared (supply exhausted or time expired)
    AuctionCleared {
        auction_id: AuctionId,
        clearing_price: Amount,
        total_bids: u64,
        reason: ClearReason,
    },

    /// Auction settled (all users notified)
    AuctionSettled {
        auction_id: AuctionId,
        clearing_price: Amount,
        total_bidders: u64,
        total_sold: u64,
    },
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, Eq, PartialEq)]
pub enum ClearReason {
    SupplyExhausted,
    TimeExpired,
}
