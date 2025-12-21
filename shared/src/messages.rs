use serde::{Deserialize, Serialize};

/// Messages sent to Indexer (not used - Indexer uses events only)
/// Indexer is a different application, so it has its own message type
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum IndexerMessage {
    // Empty - Indexer uses event streams only
}
