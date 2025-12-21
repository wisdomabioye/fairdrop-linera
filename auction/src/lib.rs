use async_graphql::{Request, Response};
use linera_sdk::linera_base_types::{AccountOwner, Amount, ChainId, Timestamp, ContractAbi, ServiceAbi};
use linera_sdk::graphql::GraphQLMutationRoot;
use serde::{Deserialize, Serialize};
use shared::types::{ AuctionParamsInput, AuctionId };

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

#[derive(Debug, Deserialize, Serialize, GraphQLMutationRoot)]
pub enum AuctionOperation {
    // ─────────────────────────────────────────────────────────
    // AAC Chain Operations (only valid on AAC chain)
    // ─────────────────────────────────────────────────────────

    /// Create a new auction (AAC chain only)
    CreateAuction {
        params: AuctionParamsInput,
    },

    /// Prune settled auction bids (after Indexer archives)
    PruneSettledAuction {
        auction_id: u64,
    },

    /// Cancel an auction (AAC chain only, creator only, before start or zero bids)
    CancelAuction {
        auction_id: u64,
    },

    /// Trigger block execution on AAC
    Trigger,

    /// Place a bid directly on AAC
    Buy {
        auction_id: u64,
        quantity: Amount,
    },

    /// Subscribe to AAC events for live updates
    SubscribeToAuction {
        aac_chain: ChainId,
    },

    /// Unsubscribe from AAC events
    UnsubscribeFromAuction {
        aac_chain: ChainId,
    },

    /// Claim settlement for a settled auction AAC
    ClaimSettlement {
        auction_id: u64,
    },
}

#[derive(Debug, Default, Deserialize, Serialize)]
pub enum AuctionResponse {
    #[default]
    Ok,

    AuctionCreated {
        auction_id: u64,
    },

    BidPlaced {
        auction_id: AuctionId,
        bid_id: u64,
        user_account: AccountOwner,
        quantity: Amount,
        amount_paid: Amount,
        timestamp: Timestamp,
        claimed: bool,
    },
}
