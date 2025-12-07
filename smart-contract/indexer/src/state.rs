use async_graphql::SimpleObject;
use linera_sdk::linera_base_types::{ApplicationId, ChainId};
use linera_sdk::views::{linera_views, MapView, RegisterView, RootView, ViewStorageContext};
use shared::types::{AuctionId, AuctionSummary, BidRecord};

/// Subscription information (stored in state)
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SubscriptionInfo {
    pub aac_chain: ChainId,
    pub auction_app: ApplicationId,
}

/// Subscription information view (for GraphQL queries)
#[derive(Debug, Clone, SimpleObject)]
pub struct SubscriptionInfoView {
    pub aac_chain: ChainId,
    pub auction_app: ApplicationId,
    pub initialized: bool,
}

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

    /// Current subscription information (set during Initialize)
    pub subscription: RegisterView<Option<SubscriptionInfo>>,
}
