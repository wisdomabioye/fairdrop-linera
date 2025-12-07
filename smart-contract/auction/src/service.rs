#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use async_graphql::{EmptySubscription, Object, Request, Response, Schema, SimpleObject};
use linera_sdk::graphql::GraphQLMutationRoot;
use linera_sdk::linera_base_types::{Amount, WithServiceAbi};
use linera_sdk::views::View;
use linera_sdk::{Service, ServiceRuntime};
use auction::AuctionAbi;
use shared::types::{AuctionId, AuctionStatus, UserCommitment};
use std::sync::Arc;

#[derive(SimpleObject)]
struct AuctionCommitment {
    auction_id: AuctionId,
    commitment: UserCommitment,
}

pub struct AuctionService {
    state: Arc<state::AuctionState>,
    runtime: Arc<ServiceRuntime<Self>>,
}

linera_sdk::service!(AuctionService);

impl WithServiceAbi for AuctionService {
    type Abi = AuctionAbi;
}

impl Service for AuctionService {
    type Parameters = ();

    async fn new(runtime: ServiceRuntime<Self>) -> Self {
        let state = state::AuctionState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        AuctionService {
            state: Arc::new(state),
            runtime: Arc::new(runtime),
        }
    }

    async fn handle_query(&self, request: Request) -> Response {
        let schema = Schema::build(
            QueryRoot {
                state: self.state.clone(),
            },
            auction::AuctionOperation::mutation_root(self.runtime.clone()),
            EmptySubscription,
        )
        .finish();

        schema.execute(request).await
    }
}

struct QueryRoot {
    state: Arc<state::AuctionState>,
}

#[Object]
impl QueryRoot {
    // ─────────────────────────────────────────────────────────
    // AAC Chain Queries (available on AAC chain)
    // ─────────────────────────────────────────────────────────

    /// Get current price for an auction (AAC only)
    async fn current_price(&self, auction_id: AuctionId) -> Result<Amount, String> {
        let auction = self
            .state
            .auctions
            .get(&auction_id)
            .await
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Auction not found".to_string())?;
        Ok(auction.current_price)
    }

    /// Get auction status (AAC only)
    async fn auction_status(&self, auction_id: AuctionId) -> Result<AuctionStatus, String> {
        let auction = self
            .state
            .auctions
            .get(&auction_id)
            .await
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Auction not found".to_string())?;
        Ok(auction.status)
    }

    /// Get total sold for an auction (AAC only)
    async fn total_sold(&self, auction_id: AuctionId) -> Result<u64, String> {
        let auction = self
            .state
            .auctions
            .get(&auction_id)
            .await
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Auction not found".to_string())?;
        Ok(auction.sold)
    }

    // ─────────────────────────────────────────────────────────
    // UIC Chain Queries (available on UIC chains)
    // ─────────────────────────────────────────────────────────

    /// Get user's commitment for an auction (UIC only)
    async fn my_commitment(
        &self,
        auction_id: AuctionId,
    ) -> Result<Option<UserCommitment>, String> {
        self.state
            .my_commitments
            .get(&auction_id)
            .await
            .map_err(|e| e.to_string())
    }

    /// Get all user's commitments (UIC only)
    async fn my_auctions(&self) -> Result<Vec<AuctionCommitment>, String> {
        let indices = self
            .state
            .my_commitments
            .indices()
            .await
            .map_err(|e| e.to_string())?;
        let mut result = Vec::new();

        for auction_id in indices {
            if let Some(commitment) = self
                .state
                .my_commitments
                .get(&auction_id)
                .await
                .map_err(|e| e.to_string())?
            {
                result.push(AuctionCommitment {
                    auction_id,
                    commitment,
                });
            }
        }

        Ok(result)
    }
}
