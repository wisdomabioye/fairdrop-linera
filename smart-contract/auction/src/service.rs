#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use async_graphql::{EmptySubscription, Object, Request, Response, Schema, SimpleObject};
use linera_sdk::graphql::GraphQLMutationRoot;
use linera_sdk::linera_base_types::{Amount, ChainId, WithServiceAbi};
use linera_sdk::views::View;
use linera_sdk::{Service, ServiceRuntime};
use auction::AuctionAbi;
use shared::types::{AuctionId, SettlementResult, UserCommitment};
use std::sync::Arc;
use self::state::{AuctionState, AuctionData};

#[derive(SimpleObject)]
struct AuctionCommitment {
    auction_id: AuctionId,
    commitment: UserCommitment,
}

pub struct AuctionService {
    state: Arc<AuctionState>,
    runtime: Arc<ServiceRuntime<Self>>,
}

linera_sdk::service!(AuctionService);

impl WithServiceAbi for AuctionService {
    type Abi = AuctionAbi;
}

impl Service for AuctionService {
    type Parameters = ();

    async fn new(runtime: ServiceRuntime<Self>) -> Self {
        let state = AuctionState::load(runtime.root_view_storage_context())
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
    state: Arc<AuctionState>,
}

#[Object]
impl QueryRoot {
    // ─────────────────────────────────────────────────────────
    // AAC Chain Queries (available on AAC chain)
    // ─────────────────────────────────────────────────────────

    /// Get current price for an auction (AAC only)
    /// Price is calculated on-demand based on auction parameters and current time
    async fn current_price(&self, auction_id: AuctionId) -> Result<Amount, String> {
        let auction = self
            .state
            .auctions
            .get(&auction_id)
            .await
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Auction not found".to_string())?;

        // Get current time from the service runtime
        let current_time = linera_sdk::linera_base_types::Timestamp::now();

        // Use shared utility function for price calculation
        let price = shared::calculate_current_price(
            auction.params.start_price,
            auction.params.floor_price,
            auction.params.price_decay_amount,
            auction.params.price_decay_interval,
            auction.params.start_time,
            current_time,
        );

        Ok(price)
    }

    /// Get auction info (AAC only)
    async fn auction_info(&self, auction_id: AuctionId) -> Result<AuctionData, String> {
        let auction = self
            .state
            .auctions
            .get(&auction_id)
            .await
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Auction not found".to_string())?;
        Ok(auction)
    }

    /// Get claimable settlement for a user (AAC only)
    /// Returns None if auction not settled or user has no unclaimed bids
    async fn claimable_settlement(
        &self,
        auction_id: AuctionId,
        user_chain: ChainId,
    ) -> Result<Option<UserCommitment>, String> {
        // Get auction
        let auction = self
            .state
            .auctions
            .get(&auction_id)
            .await
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Auction not found".to_string())?;

        // Check if auction is settled
        if auction.status != shared::types::AuctionStatus::Settled {
            return Ok(None); // Not settled yet
        }

        let clearing_price = auction
            .clearing_price
            .ok_or_else(|| "Clearing price not set".to_string())?;

        // O(1) lookup: Get all unclaimed bids for this user and auction
        let user_bids = self
            .state
            .user_auction_bids
            .get(&(user_chain, auction_id))
            .await
            .map_err(|e| e.to_string())?
            .unwrap_or_default();

        let mut total_quantity = 0u64;
        let mut total_paid = Amount::ZERO;

        for bid in user_bids {
            if !bid.claimed {
                total_quantity += bid.quantity;
                total_paid = total_paid.saturating_add(bid.amount_paid);
            }
        }

        // No unclaimed bids
        if total_quantity == 0 {
            return Ok(None);
        }

        // Calculate settlement
        let total_cost = clearing_price.saturating_mul(total_quantity as u128);
        let refund = total_paid.saturating_sub(total_cost);

        Ok(Some(UserCommitment {
            total_quantity,
            settlement: Some(SettlementResult {
                allocated_quantity: total_quantity,
                clearing_price,
                total_cost,
                refund,
            }),
        }))
    }

    // ─────────────────────────────────────────────────────────
    // UIC Chain Queries (available on UIC chains)
    // ─────────────────────────────────────────────────────────

    /// Get user's commitment for an auction (UIC only)
    async fn my_commitment_for_auction(
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
    async fn my_auction_commitment(&self) -> Result<Vec<AuctionCommitment>, String> {
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
