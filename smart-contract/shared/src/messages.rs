use linera_sdk::linera_base_types::ChainId;
use serde::{Deserialize, Serialize};

use crate::types::{AuctionId, SettlementResult};

/// Messages for the Auction Application (used by both AAC and UIC chains)
/// Since AAC and UIC are the SAME application on different chains,
/// they share the same Message enum
#[derive(Debug, Clone, Serialize, Deserialize, Eq, PartialEq)]
pub enum AuctionMessage {
    // ─────────────────────────────────────────────────────────
    // Messages received by AAC Chain
    // ─────────────────────────────────────────────────────────

    /// User places a bid (from UIC chain)
    PlaceBid {
        auction_id: AuctionId,
        user_chain: ChainId,
        quantity: u64, // How many units to bid for
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
/// Indexer is a DIFFERENT application, so it has its own message type
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum IndexerMessage {
    // Empty - Indexer uses event streams only
}
