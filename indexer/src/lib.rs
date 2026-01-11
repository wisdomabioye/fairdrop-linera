use async_graphql::{Request, Response};
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
    /// Initialize subscription to Auction app's event stream.
    /// Can only be called once per indexer instance.
    Initialize {
        aac_chain: ChainId,
        auction_app: ApplicationId,
    },
}

#[derive(Debug, Default, Deserialize, Serialize)]
pub enum IndexerResponse {
    #[default]
    Ok,

    Initialized {
        aac_chain: ChainId,
        auction_app: ApplicationId,
    },
}

/// Indexer Parameters - Empty, configuration is done via Initialize operation
#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct IndexerParameters {}
