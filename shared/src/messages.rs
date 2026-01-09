use serde::{Deserialize, Serialize};
use linera_sdk::linera_base_types::{ApplicationId, ChainId, Amount};
use crate::types::{AuctionParamsInput, AuctionId};

/// Messages for the Auction Application (used by both AAC and UIC chains)
/// Since AAC and UIC are the same application,
/// they share the same Message enum
#[derive(Debug, Clone, Serialize, Deserialize, Eq, PartialEq)]
pub enum AuctionMessage {
    // ─────────────────────────────────────────────────────────
    // Messages received by AAC Chain
    // ─────────────────────────────────────────────────────────

    CreateAuction {
        params: AuctionParamsInput,
    },

    CancelAuction {
        auction_id: AuctionId,
    },

    PruneSettledAuction {
        auction_id: AuctionId,
    },

    Buy {
        auction_id: AuctionId,
        quantity: Amount,
    },

    ClaimSettlement {
        auction_id: AuctionId,
    },

    WithdrawProceed {
        auction_id: AuctionId,
    },

    WithdrawUnsoldToken {
        auction_id: AuctionId,
    },

    Deposit {
        /// Application ID of the token to deposit (must be in supported_tokens)
        app_token_id: ApplicationId,
        amount: Amount
    },

    Withdraw {
        /// Application ID of the token to withdraw (must be in supported_tokens)
        app_token_id: ApplicationId,
        amount: Amount,
        target_chain: ChainId
    },

}

/// Messages sent to Indexer (not used - Indexer uses events only)
/// Indexer is a different application, so it has its own message type
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum IndexerMessage {
    // Empty - Indexer uses event streams only
}
