use linera_sdk::linera_base_types::{AccountOwner, ApplicationId, Amount, ChainId, Timestamp};
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
        total_supply: Amount,
        max_bid_amount: Amount,
        start_price: Amount,
        floor_price: Amount,
        price_decay_interval: u64, // Microseconds between price drops
        price_decay_amount: Amount, // Amount to decrease per interval
        start_time: Timestamp,
        end_time: Timestamp,
        creator: AccountOwner, // Creator's account (for fund transfers)
        payment_token_app: ApplicationId, // Payment token app
        auction_token_app: ApplicationId, // Auction token app
    },

    /// Bid accepted
    BidAccepted {
        auction_id: AuctionId,
        bid_id: u64,
        user_account: AccountOwner,
        quantity: Amount,
        amount_paid: Amount, // Total amount paid by user
        total_sold: Amount,
        remaining: Amount,
    },

    /// Bid rejected
    BidRejected {
        auction_id: AuctionId,
        user_account: AccountOwner,
        reason: String,
    },

    /// Auction settled
    AuctionSettled {
        auction_id: AuctionId,
        clearing_price: Amount,
        total_bidders: u64,
        total_sold: Amount,
    },

    /// User claimed settlement
    SettlementClaimed {
        auction_id: AuctionId,
        user_account: AccountOwner,
        allocated_quantity: Amount,
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
        user_account: AccountOwner,
        amount: Amount,
        bid_id: u64,
    },

    /// Refund issued to user after settlement
    RefundIssued {
        auction_id: AuctionId,
        user_account: AccountOwner,
        refund_amount: Amount,
    },
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, Eq, PartialEq)]
pub enum ClearReason {
    SupplyExhausted,
    TimeExpired,
}
