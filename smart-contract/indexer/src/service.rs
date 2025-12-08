#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use async_graphql::{EmptySubscription, Object, Request, Response, Schema};
use linera_sdk::graphql::GraphQLMutationRoot;
use linera_sdk::linera_base_types::{AccountOwner, Amount, WithServiceAbi};
use linera_sdk::views::View;
use linera_sdk::{Service, ServiceRuntime};
use std::sync::Arc;
use self::state::{IndexerState, SubscriptionInfoView};
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
    /// Get all active auctions with pagination
    /// - offset: Skip the first N auctions (default: 0)
    /// - limit: Return at most N auctions (default: unlimited)
    async fn active_auctions(
        &self,
        offset: Option<usize>,
        limit: Option<usize>,
    ) -> Result<Vec<AuctionSummary>, String> {
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

        // Apply pagination
        let offset = offset.unwrap_or(0);
        let result = result.into_iter().skip(offset);

        let result = if let Some(limit) = limit {
            result.take(limit).collect()
        } else {
            result.collect()
        };

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

    /// Get bid history for an auction with pagination
    /// - offset: Skip the first N bids (default: 0)
    /// - limit: Return at most N bids (default: unlimited)
    async fn bid_history(
        &self,
        auction_id: AuctionId,
        offset: Option<usize>,
        limit: Option<usize>,
    ) -> Result<Vec<BidRecord>, String> {
        let bids = self
            .state
            .bid_history
            .get(&auction_id)
            .await
            .map_err(|e| e.to_string())?
            .unwrap_or_default();

        // Apply pagination
        let offset = offset.unwrap_or(0);
        let bids = bids.into_iter().skip(offset);

        let bids = if let Some(limit) = limit {
            bids.take(limit).collect()
        } else {
            bids.collect()
        };

        Ok(bids)
    }

    /// Get all settled auctions with pagination
    /// - offset: Skip the first N auctions (default: 0)
    /// - limit: Return at most N auctions (default: unlimited)
    async fn settled_auctions(
        &self,
        offset: Option<usize>,
        limit: Option<usize>,
    ) -> Result<Vec<AuctionSummary>, String> {
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

        // Apply pagination
        let offset = offset.unwrap_or(0);
        let result = result.into_iter().skip(offset);

        let result = if let Some(limit) = limit {
            result.take(limit).collect()
        } else {
            result.collect()
        };

        Ok(result)
    }

    /// Get all auctions (any status) with pagination
    /// - offset: Skip the first N auctions (default: 0)
    /// - limit: Return at most N auctions (default: unlimited)
    async fn all_auctions(
        &self,
        offset: Option<usize>,
        limit: Option<usize>,
    ) -> Result<Vec<AuctionSummary>, String> {
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

        // Apply pagination
        let offset = offset.unwrap_or(0);
        let result = result.into_iter().skip(offset);

        let result = if let Some(limit) = limit {
            result.take(limit).collect()
        } else {
            result.collect()
        };

        Ok(result)
    }

    /// Get current subscription information
    /// Returns which AAC chain and auction app this indexer is subscribed to.
    /// Returns None if not yet initialized.
    async fn subscription_info(&self) -> Result<Option<SubscriptionInfoView>, String> {
        let initialized = *self.state.initialized.get();

        if !initialized {
            return Ok(None);
        }

        let subscription = self
            .state
            .subscription
            .get()
            .clone()
            .ok_or("Indexer initialized but subscription info missing")?;

        Ok(Some(SubscriptionInfoView {
            aac_chain: subscription.aac_chain,
            auction_app: subscription.auction_app,
            initialized: true,
        }))
    }

    /// Calculate current price for an auction
    /// Price is calculated on-demand based on auction parameters and current time
    async fn current_price(&self, auction_id: AuctionId) -> Result<Amount, String> {
        let summary = self
            .state
            .auction_summaries
            .get(&auction_id)
            .await
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Auction not found".to_string())?;

        // Get current time - Note: This is the indexer's local time
        let current_time = linera_sdk::linera_base_types::Timestamp::now();

        // Use shared utility function
        let price = shared::calculate_current_price(
            summary.start_price,
            summary.floor_price,
            summary.price_decay_amount,
            summary.price_decay_interval,
            summary.start_time,
            current_time,
        );

        Ok(price)
    }

    /// Get all auctions created by a specific user with pagination
    /// - creator: The account owner to query auctions for
    /// - offset: Skip the first N auctions (default: 0)
    /// - limit: Return at most N auctions (default: unlimited)
    async fn auctions_by_creator(
        &self,
        creator: AccountOwner,
        offset: Option<usize>,
        limit: Option<usize>,
    ) -> Result<Vec<AuctionSummary>, String> {
        // Get auction IDs for this creator
        let auction_ids = self
            .state
            .auctions_by_creator
            .get(&creator)
            .await
            .map_err(|e| e.to_string())?
            .unwrap_or_default();

        let mut result = Vec::new();

        // Fetch full auction summaries
        for auction_id in auction_ids {
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

        // Apply pagination
        let offset = offset.unwrap_or(0);
        let result = result.into_iter().skip(offset);

        let result = if let Some(limit) = limit {
            result.take(limit).collect()
        } else {
            result.collect()
        };

        Ok(result)
    }
}
