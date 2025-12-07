#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use async_graphql::{EmptySubscription, Object, Request, Response, Schema};
use linera_sdk::graphql::GraphQLMutationRoot;
use linera_sdk::linera_base_types::WithServiceAbi;
use linera_sdk::views::View;
use linera_sdk::{Service, ServiceRuntime};
use std::sync::Arc;
use self::state::IndexerState;
use indexer::IndexerAbi;
use shared::types::{AuctionId, AuctionStatus, AuctionSummary, BidRecord};

pub struct IndexerService {
    state: Arc<IndexerState>,
    runtime: Arc<ServiceRuntime<Self>>,
}

linera_sdk::service!(IndexerService);

impl WithServiceAbi for IndexerService {
    type Abi = IndexerAbi;
}

impl Service for IndexerService {
    type Parameters = ();

    async fn new(runtime: ServiceRuntime<Self>) -> Self {
        let state = IndexerState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        IndexerService {
            state: Arc::new(state),
            runtime: Arc::new(runtime),
        }
    }

    async fn handle_query(&self, request: Request) -> Response {
        let schema = Schema::build(
            QueryRoot {
                state: self.state.clone(),
            },
            indexer::IndexerOperation::mutation_root(self.runtime.clone()),
            EmptySubscription,
        )
        .finish();

        schema.execute(request).await
    }
}

struct QueryRoot {
    state: Arc<IndexerState>,
}

#[Object]
impl QueryRoot {
    /// Get all active auctions
    async fn active_auctions(&self) -> Result<Vec<AuctionSummary>, String> {
        let indices = self
            .state
            .auction_summaries
            .indices()
            .await
            .map_err(|e| e.to_string())?;
        let mut result = Vec::new();

        for auction_id in indices {
            if let Some(summary) = self
                .state
                .auction_summaries
                .get(&auction_id)
                .await
                .map_err(|e| e.to_string())?
            {
                if summary.status == AuctionStatus::Active {
                    result.push(summary);
                }
            }
        }

        Ok(result)
    }

    /// Get auction summary by ID
    async fn auction_summary(
        &self,
        auction_id: AuctionId,
    ) -> Result<Option<AuctionSummary>, String> {
        self.state
            .auction_summaries
            .get(&auction_id)
            .await
            .map_err(|e| e.to_string())
    }

    /// Get bid history for an auction
    async fn bid_history(&self, auction_id: AuctionId) -> Result<Vec<BidRecord>, String> {
        Ok(self
            .state
            .bid_history
            .get(&auction_id)
            .await
            .map_err(|e| e.to_string())?
            .unwrap_or_default())
    }

    /// Get all settled auctions
    async fn settled_auctions(&self) -> Result<Vec<AuctionSummary>, String> {
        let indices = self
            .state
            .auction_summaries
            .indices()
            .await
            .map_err(|e| e.to_string())?;
        let mut result = Vec::new();

        for auction_id in indices {
            if let Some(summary) = self
                .state
                .auction_summaries
                .get(&auction_id)
                .await
                .map_err(|e| e.to_string())?
            {
                if summary.status == AuctionStatus::Settled {
                    result.push(summary);
                }
            }
        }

        Ok(result)
    }

    /// Get all auctions (any status)
    async fn all_auctions(&self) -> Result<Vec<AuctionSummary>, String> {
        let indices = self
            .state
            .auction_summaries
            .indices()
            .await
            .map_err(|e| e.to_string())?;
        let mut result = Vec::new();

        for auction_id in indices {
            if let Some(summary) = self
                .state
                .auction_summaries
                .get(&auction_id)
                .await
                .map_err(|e| e.to_string())?
            {
                result.push(summary);
            }
        }

        Ok(result)
    }
}
