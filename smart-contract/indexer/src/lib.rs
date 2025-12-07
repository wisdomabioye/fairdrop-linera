use async_graphql::{Request, Response};
use auction::AuctionAbi;
use linera_sdk::linera_base_types::{ApplicationId, ChainId, ContractAbi, ServiceAbi};
use linera_sdk::graphql::GraphQLMutationRoot;
use serde::{Deserialize, Serialize};

pub use shared;

/// Indexer Application ABI
#[derive(Debug, Deserialize, Serialize)]
pub struct IndexerAbi;

impl ContractAbi for IndexerAbi {
    type Operation = IndexerOperation;
    type Response = IndexerResponse;
}

impl ServiceAbi for IndexerAbi {
    type Query = Request;
    type QueryResponse = Response;
}

#[derive(Debug, Deserialize, Serialize, GraphQLMutationRoot)]
pub enum IndexerOperation {
    /// Initialize subscription to Auction app's event stream
    Initialize,
}

#[derive(Debug, Default, Deserialize, Serialize)]
pub enum IndexerResponse {
    #[default]
    Ok,
}

/// Indexer Parameters
/// Needs to know which Auction application to subscribe to
#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct IndexerParameters {
    pub aac_chain: ChainId, // Which AAC chain to subscribe to
    pub auction_app: ApplicationId<AuctionAbi>, // AAC ApplicationId
}
