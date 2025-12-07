use linera_sdk::linera_base_types::{Amount, ChainId, Timestamp};
use linera_sdk::views::{linera_views, MapView, RegisterView, RootView, ViewStorageContext};
use shared::types::{AuctionId, AuctionParams, AuctionStatus, BidRecord, UserCommitment};

/// Unified state for the Auction Application
/// Different chain types use different subsets of this state:
/// - AAC Chain: Uses auctions, bids, user_totals (auction authority data)
/// - UIC Chains: Uses my_commitments (user-specific data)
#[derive(RootView)]
#[view(context = ViewStorageContext)]
pub struct AuctionState {
    // ─────────────────────────────────────────────────────────
    // AAC Chain State (only used on AAC chain)
    // ─────────────────────────────────────────────────────────

    /// Active auctions (AAC only)
    pub auctions: MapView<AuctionId, AuctionData>,

    /// All bid records (AAC only, cleared after settlement + pruning)
    pub bids: MapView<u64, BidRecord>,  // bid_id → BidRecord

    /// User totals per auction (AAC only, for quick lookup)
    pub user_totals: MapView<(AuctionId, ChainId), u64>,  // (auction_id, user) → quantity

    /// Next bid ID (AAC only)
    pub next_bid_id: RegisterView<u64>,

    // ─────────────────────────────────────────────────────────
    // UIC Chain State (only used on UIC chains)
    // ─────────────────────────────────────────────────────────

    /// User's commitments per auction (UIC only)
    pub my_commitments: MapView<AuctionId, UserCommitment>,
}

/// Auction state data (stored on AAC chain)
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct AuctionData {
    pub params: AuctionParams,
    pub current_price: Amount,
    pub last_price_update: Timestamp,
    pub total_supply: u64,
    pub sold: u64,
    pub clearing_price: Option<Amount>,
    pub status: AuctionStatus,
    pub settled_at: Option<Timestamp>,
    pub bids_pruned: bool,
}

impl AuctionData {
    pub fn new(params: AuctionParams, _current_time: Timestamp) -> Self {
        Self {
            current_price: params.start_price,
            last_price_update: params.start_time,
            total_supply: params.total_supply,
            sold: 0,
            clearing_price: None,
            status: AuctionStatus::Active,
            settled_at: None,
            bids_pruned: false,
            params,
        }
    }
}

