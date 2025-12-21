use async_graphql::{SimpleObject};
use linera_sdk::linera_base_types::{Amount, AccountOwner, Timestamp};
use linera_sdk::views::{linera_views, MapView, RegisterView, RootView, ViewStorageContext};
use shared::types::{AuctionId, AuctionParams, AuctionStatus, BidRecord};

#[derive(RootView)]
#[view(context = ViewStorageContext)]
pub struct AuctionState {
    // ─────────────────────────────────────────────────────────
    // AAC Chain State (only used on AAC chain)
    // ─────────────────────────────────────────────────────────

    /// Active auctions (AAC only)
    pub auctions: MapView<AuctionId, AuctionData>,

    /// Bid records indexed by (user_account, auction_id) for O(1) lookups (AAC only)
    pub user_auction_bids: MapView<(AccountOwner, AuctionId), Vec<BidRecord>>,

    /// User totals per auction (AAC only, for quick lookup)
    pub user_totals: MapView<(AuctionId, AccountOwner), Amount>,  // (auction_id, user) → quantity

    /// Next auction ID (AAC only, for auto-incrementing auction IDs)
    pub next_auction_id: RegisterView<u64>,

    /// Next bid ID (AAC only, for generating unique bid IDs)
    pub next_bid_id: RegisterView<u64>,
}

/// Auction state data (stored on AAC chain)
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, SimpleObject)]
pub struct AuctionData {
    pub params: AuctionParams,
    pub current_price: Amount,
    pub last_price_update: Timestamp,
    pub total_supply: Amount,
    pub sold: Amount,
    pub clearing_price: Option<Amount>,
    pub status: AuctionStatus,
    pub settled_at: Option<Timestamp>,
    pub bids_pruned: bool,
    // Cached counters to avoid O(n) scans on user_auction_bids
    pub total_bids: u64,      // Total number of bids placed
    pub total_bidders: u64,   // Total unique users who bid
}

impl AuctionData {
    pub fn new(params: AuctionParams, current_time: Timestamp) -> Self {
        // Set status to Scheduled if start_time is in the future, otherwise Active
        let status = if current_time < params.start_time {
            AuctionStatus::Scheduled
        } else {
            AuctionStatus::Active
        };

        Self {
            current_price: params.start_price,
            last_price_update: params.start_time,
            total_supply: params.total_supply,
            sold: Amount::ZERO,
            clearing_price: None,
            status,
            settled_at: None,
            bids_pruned: false,
            total_bids: 0,
            total_bidders: 0,
            params,
        }
    }
}

