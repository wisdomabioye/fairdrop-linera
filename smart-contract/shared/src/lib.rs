pub mod events;
pub mod messages;
pub mod types;

// Re-export commonly used types
pub use events::{AuctionEvent, ClearReason, AUCTION_STREAM};
pub use messages::{AuctionMessage, IndexerMessage};
pub use types::{
    AuctionId, AuctionParams, AuctionStatus, AuctionSummary, BidRecord, SettlementResult,
    UserCommitment,
};

// Also export the ABI type for external reference
pub struct AuctionAbi;
