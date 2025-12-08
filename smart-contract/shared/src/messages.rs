use linera_sdk::linera_base_types::ChainId;
use serde::{Deserialize, Serialize};

use crate::types::{AuctionId, AuctionParams, SettlementResult};

/// Messages for the Auction Application (used by both AAC and UIC chains)
/// Since AAC and UIC are the same application,
/// they share the same Message enum
#[derive(Debug, Clone, Serialize, Deserialize, Eq, PartialEq)]
pub enum AuctionMessage {
    // ─────────────────────────────────────────────────────────
    // Messages received by AAC Chain
    // ─────────────────────────────────────────────────────────

    /// Create auction (from UIC chain)
    CreateAuction {
        params: AuctionParams,
    },

    /// User places a bid (from UIC chain)
    PlaceBid {
        auction_id: AuctionId,
        user_chain: ChainId,
        quantity: u64, // How many units to bid for
    },

    /// User claims settlement (from UIC chain)
    ClaimSettlement {
        auction_id: AuctionId,
        user_chain: ChainId,
    },

    // ─────────────────────────────────────────────────────────
    // Messages received by UIC Chains
    // ─────────────────────────────────────────────────────────

    /// Settlement result (from AAC after auction clears)
    SettlementResult {
        auction_id: AuctionId,
        result: SettlementResult,
    },
}

/// Messages sent to Indexer (not used - Indexer uses events only)
/// Indexer is a different application, so it has its own message type
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum IndexerMessage {
    // Empty - Indexer uses event streams only
}
