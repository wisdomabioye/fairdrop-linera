#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use async_graphql::{EmptySubscription, Object, Request, Response, Schema, SimpleObject};
use linera_sdk::graphql::GraphQLMutationRoot;
use linera_sdk::linera_base_types::{Amount, AccountOwner, WithServiceAbi};
use linera_sdk::views::View;
use linera_sdk::{Service, ServiceRuntime};
use auction::AuctionAbi;
use shared::types::{AuctionId, BidRecord};
use std::sync::Arc;
use self::state::{AuctionState, AuctionData};

#[derive(SimpleObject)]
struct AuctionWithId {
    auction_id: AuctionId,
    #[graphql(flatten)]
    data: AuctionData,
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
    async fn current_price(&self, auction_id: AuctionId) -> Result<Amount, String> {
        let auction = self
            .state
            .auctions
            .get(&auction_id)
            .await
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Auction not found".to_string())?;

        // Return the stored current_price
        // This is updated by the contract during operations (bids, price updates, etc.)
        Ok(auction.current_price)
    }

    /// Get auction info (AAC only)
    async fn auction_info(&self, auction_id: AuctionId) -> Result<AuctionWithId, String> {
        let auction = self
            .state
            .auctions
            .get(&auction_id)
            .await
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Auction not found".to_string())?;

        Ok(AuctionWithId {
            auction_id,
            data: auction,
        })
    }

    /// Get user's bids for a specific auction (AAC only)
    /// O(1) lookup using composite key (user, auction_id)
    async fn user_bids(
        &self,
        user: AccountOwner,
        auction_id: AuctionId,
    ) -> Result<Vec<BidRecord>, String> {
        let bids = self
            .state
            .user_auction_bids
            .get(&(user, auction_id))
            .await
            .map_err(|e| e.to_string())?
            .unwrap_or_default();

        Ok(bids)
    }

    // ─────────────────────────────────────────────────────────
    // Temporary Indexer Replacement Queries (AAC only)
    // TODO: These will be replaced by dedicated Indexer service once event streaming is stable
    // ─────────────────────────────────────────────────────────

    /// Get all auctions in reverse chronological order (newest first)
    /// Uses reverse iteration from next_auction_id for O(limit) performance
    /// - offset: Skip the first N newest auctions (default: 0)
    /// - limit: Return at most N auctions (default: 10)
    ///
    /// Note: Returns all auctions regardless of status. Frontend should filter by status if needed.
    /// This is a temporary workaround - Indexer will provide filtered queries (active_auctions, settled_auctions) in the future.
    async fn all_auctions(
        &self,
        offset: Option<usize>,
        limit: Option<usize>,
    ) -> Result<Vec<AuctionWithId>, String> {
        let next_id = *self.state.next_auction_id.get();

        if next_id == 0 {
            return Ok(Vec::new()); // No auctions created yet
        }

        let offset = offset.unwrap_or(0);
        let limit = limit.unwrap_or(10);

        // Calculate auction ID range for reverse iteration
        let total_auctions = next_id as usize;

        if offset >= total_auctions {
            return Ok(Vec::new()); // Offset beyond available auctions
        }

        let start_id = total_auctions - 1 - offset; // Newest auction after offset
        let items_available = start_id + 1; // How many auctions from start_id down to 0
        let items_to_fetch = items_available.min(limit);

        let mut result = Vec::new();

        // Iterate in reverse: from start_id down to (start_id - items_to_fetch + 1)
        for i in 0..items_to_fetch {
            let auction_id = (start_id - i) as u64;

            if let Some(auction) = self
                .state
                .auctions
                .get(&auction_id)
                .await
                .map_err(|e| e.to_string())?
            {
                result.push(AuctionWithId {
                    auction_id,
                    data: auction,
                });
            }
        }

        Ok(result)
    }

    /// Get all auctions created by a specific user (newest first)
    /// Note: No pagination needed for temporary workaround - returns all creator's auctions.
    /// Indexer will provide paginated queries in the future.
    async fn auctions_by_creator(
        &self,
        creator: linera_sdk::linera_base_types::AccountOwner,
    ) -> Result<Vec<AuctionWithId>, String> {
        let next_id = *self.state.next_auction_id.get();

        if next_id == 0 {
            return Ok(Vec::new());
        }

        let mut result = Vec::new();

        // Iterate all auctions in reverse (newest first) and filter by creator
        for auction_id in (0..next_id).rev() {
            if let Some(auction) = self
                .state
                .auctions
                .get(&auction_id)
                .await
                .map_err(|e| e.to_string())?
            {
                if auction.params.creator == creator {
                    result.push(AuctionWithId {
                        auction_id,
                        data: auction,
                    });
                }
            }
        }

        Ok(result)
    }

    /// Get bid history for a specific auction in chronological order (oldest first)
    /// Uses the total number of bids from auction.total_bids for reverse iteration
    /// - auction_id: The auction to get bids for
    /// - offset: Skip the first N oldest bids (default: 0)
    /// - limit: Return at most N bids (default: 50)
    ///
    /// Note: This flattens all user_auction_bids entries for the given auction.
    /// This is a temporary workaround - Indexer will provide optimized bid_history queries in the future.
    async fn bid_history(
        &self,
        auction_id: AuctionId,
        offset: Option<usize>,
        limit: Option<usize>,
    ) -> Result<Vec<BidRecord>, String> {
        // Get auction to verify it exists
        let _auction = self
            .state
            .auctions
            .get(&auction_id)
            .await
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Auction not found".to_string())?;

        let offset = offset.unwrap_or(0);
        let limit = limit.unwrap_or(50);

        // Collect all bids for this auction from user_auction_bids map
        // Note: This iterates all entries in the map and filters by auction_id
        // For large maps, this is O(n). Indexer will provide O(1) lookup in the future.
        let indices = self
            .state
            .user_auction_bids
            .indices()
            .await
            .map_err(|e| e.to_string())?;

        let mut all_bids = Vec::new();

        for (user_chain, aid) in indices {
            if aid == auction_id {
                if let Some(user_bids) = self
                    .state
                    .user_auction_bids
                    .get(&(user_chain, aid))
                    .await
                    .map_err(|e| e.to_string())?
                {
                    all_bids.extend(user_bids);
                }
            }
        }

        // Sort by bid_id (chronological order)
        all_bids.sort_by_key(|bid| bid.bid_id);

        // Apply pagination
        let result: Vec<BidRecord> = all_bids
            .into_iter()
            .skip(offset)
            .take(limit)
            .collect();

        Ok(result)
    }
}
