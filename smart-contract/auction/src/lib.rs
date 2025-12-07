use async_graphql::{Request, Response};
use linera_sdk::linera_base_types::{ChainId, ContractAbi, ServiceAbi};
use linera_sdk::graphql::GraphQLMutationRoot;
use serde::{Deserialize, Serialize};
use shared::types::AuctionParams;

pub use shared;

/// The unified Auction Application ABI
/// Used by both AAC chains and UIC chains
#[derive(Debug, Deserialize, Serialize)]
pub struct AuctionAbi;

impl ContractAbi for AuctionAbi {
    type Operation = AuctionOperation;
    type Response = AuctionResponse;
}

impl ServiceAbi for AuctionAbi {
    type Query = Request;
    type QueryResponse = Response;
}

/// Operations that can be executed on the Auction Application
/// Different operations are relevant for different chain types:
/// - AAC Chain: CreateAuction, UpdatePrice, PruneSettledAuction
/// - UIC Chains: Buy, SubscribeToAuction, UnsubscribeFromAuction
#[derive(Debug, Deserialize, Serialize, GraphQLMutationRoot)]
pub enum AuctionOperation {
    // ─────────────────────────────────────────────────────────
    // AAC Chain Operations (only valid on AAC chain)
    // ─────────────────────────────────────────────────────────

    /// Create a new auction (AAC chain only)
    CreateAuction {
        params: AuctionParams,
    },

    /// Manually trigger price update (optional, auto-updates on bid)
    UpdatePrice {
        auction_id: u64,
    },

    /// Prune settled auction bids (after Indexer archives)
    PruneSettledAuction {
        auction_id: u64,
    },

    // ─────────────────────────────────────────────────────────
    // UIC Chain Operations (executed by users on their chains)
    // ─────────────────────────────────────────────────────────

    /// Place a bid (UIC operation)
    Buy {
        auction_id: u64,
        quantity: u64,
    },

    /// Subscribe to AAC events for live updates
    SubscribeToAuction {
        aac_chain: ChainId,
    },

    /// Unsubscribe from AAC events
    UnsubscribeFromAuction {
        aac_chain: ChainId,
    },
}

#[derive(Debug, Default, Deserialize, Serialize)]
pub enum AuctionResponse {
    #[default]
    Ok,

    AuctionCreated {
        auction_id: u64,
    },

    BidSubmitted {
        auction_id: u64,
        quantity: u64,
    },
}

/// Application parameters
/// Each chain (AAC or UIC) needs to know the AAC chain ID
#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct AuctionParameters {
    pub aac_chain: ChainId,  // The AAC chain ID (needed by UICs to send messages)
}
