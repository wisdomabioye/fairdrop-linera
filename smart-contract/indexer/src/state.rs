use linera_sdk::views::{linera_views, MapView, RegisterView, RootView, ViewStorageContext};
use shared::types::{AuctionId, AuctionSummary, BidRecord};

/// Indexer state - stores materialized views of auction data
#[derive(RootView)]
#[view(context = ViewStorageContext)]
pub struct IndexerState {
    /// Materialized auction summaries
    pub auction_summaries: MapView<AuctionId, AuctionSummary>,

    /// Full bid history (never pruned, unlike AAC)
    pub bid_history: MapView<AuctionId, Vec<BidRecord>>,

    /// Initialization flag
    pub initialized: RegisterView<bool>,
}
