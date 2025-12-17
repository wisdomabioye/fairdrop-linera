use linera_sdk::linera_base_types::{AccountOwner, Amount, ChainId, Timestamp};
use serde::{Deserialize, Serialize};

use crate::types::AuctionId;

/// Stream name for all auction events
pub const AUCTION_STREAM: &[u8] = b"fairdrop_auctions";

/// Events emitted by AAC (Auction Authority Chain)
#[derive(Debug, Clone, Serialize, Deserialize, Eq, PartialEq)]
pub enum AuctionEvent {
    /// Application initialized (emitted on deployment to create stream)
    ApplicationInitialized {
        aac_chain: ChainId,
    },

    /// Auction created
    AuctionCreated {
        auction_id: AuctionId,
        item_name: String,
        image: String,
        total_supply: u64,
        max_bid_amount: u64,
        start_price: Amount,
        floor_price: Amount,
        price_decay_interval: u64, // Microseconds between price drops
        price_decay_amount: Amount, // Amount to decrease per interval
        start_time: Timestamp,
        end_time: Timestamp,
        creator: AccountOwner, // Creator's account (for fund transfers)
        payment_token_app: linera_sdk::linera_base_types::ApplicationId, // Payment token app
        auction_token_app: linera_sdk::linera_base_types::ApplicationId, // Auction token app
    },

    /// Bid accepted
    BidAccepted {
        auction_id: AuctionId,
        bid_id: u64,
        user_chain: ChainId,
        quantity: u64,
        amount_paid: Amount, // Total amount paid by user
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

    /// User claimed settlement
    SettlementClaimed {
        auction_id: AuctionId,
        user_chain: ChainId,
        allocated_quantity: u64,
        clearing_price: Amount,
        total_cost: Amount,
        refund: Amount,
    },

    /// Auction cancelled by creator
    AuctionCancelled {
        auction_id: AuctionId,
        reason: String,
    },

    /// Payment received for bid (escrow)
    PaymentReceived {
        auction_id: AuctionId,
        user_chain: ChainId,
        amount: Amount,
        bid_id: u64,
    },

    /// Refund issued to user after settlement
    RefundIssued {
        auction_id: AuctionId,
        user_chain: ChainId,
        refund_amount: Amount,
    },
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, Eq, PartialEq)]
pub enum ClearReason {
    SupplyExhausted,
    TimeExpired,
}
