#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use self::state::IndexerState;
use indexer::{IndexerAbi, IndexerOperation, IndexerParameters, IndexerResponse};
use linera_sdk::linera_base_types::{StreamUpdate, WithContractAbi};
use linera_sdk::views::{RootView, View};
use linera_sdk::{Contract, ContractRuntime};
use shared::events::{AuctionEvent, AUCTION_STREAM};
use shared::types::{AuctionStatus, AuctionSummary, BidRecord};

pub struct IndexerContract {
    state: IndexerState,
    runtime: ContractRuntime<Self>,
}

linera_sdk::contract!(IndexerContract);

impl WithContractAbi for IndexerContract {
    type Abi = IndexerAbi;
}

impl Contract for IndexerContract {
    type Message = ();  // Indexer doesn't receive messages, only events
    type Parameters = IndexerParameters;
    type InstantiationArgument = ();
    type EventValue = AuctionEvent;  // Event type for reading auction events

    async fn load(runtime: ContractRuntime<Self>) -> Self {
        let state = IndexerState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        IndexerContract { state, runtime }
    }

    async fn instantiate(&mut self, _argument: Self::InstantiationArgument) {
        // Indexer is ready to be initialized via the Initialize operation
    }

    async fn execute_operation(&mut self, operation: Self::Operation) -> Self::Response {
        match operation {
            IndexerOperation::Initialize {
                aac_chain,
                auction_app,
            } => {
                // Check if already initialized - can only initialize once
                if *self.state.initialized.get() {
                    panic!("Indexer already initialized. Deploy a new indexer instance to subscribe to a different chain/app.");
                }

                // Subscribe to Auction app's event stream
                // Note: No access control is implemented. 
                // Initialize indexer once per chain for an auction_app
                self.runtime.subscribe_to_events(
                    aac_chain,
                    auction_app,
                    AUCTION_STREAM.into(),
                );

                // Store subscription information
                self.state.subscription.set(Some(state::SubscriptionInfo {
                    aac_chain,
                    auction_app,
                }));

                self.state.initialized.set(true);

                IndexerResponse::Initialized {
                    aac_chain,
                    auction_app,
                }
            }
        }
    }

    async fn execute_message(&mut self, _message: Self::Message) {
        // Indexer doesn't receive messages
        panic!("Indexer should not receive messages");
    }

    async fn process_streams(&mut self, updates: Vec<StreamUpdate>) {
        for update in updates {
            assert_eq!(update.stream_id.stream_name, AUCTION_STREAM.into());

            for index in update.new_indices() {
                let event: AuctionEvent = self
                    .runtime
                    .read_event(update.chain_id, AUCTION_STREAM.into(), index);

                self.handle_event(event).await;
            }
        }
    }

    async fn store(mut self) {
        self.state.save().await.expect("Failed to save state");
    }
}

impl IndexerContract {
    async fn handle_event(&mut self, event: AuctionEvent) {
        match event {
            AuctionEvent::AuctionCreated {
                auction_id,
                item_name,
                total_supply,
                start_price, 
                ..
            } => {
                let summary = AuctionSummary {
                    auction_id,
                    item_name,
                    current_price: start_price,
                    total_supply,
                    sold: 0,
                    clearing_price: None,
                    status: AuctionStatus::Active,
                    total_bids: 0,
                    total_bidders: 0,
                };

                self.state
                    .auction_summaries
                    .insert(&auction_id, summary)
                    .unwrap();
                self.state.bid_history.insert(&auction_id, Vec::new()).unwrap();
            }

            AuctionEvent::PriceUpdated {
                auction_id,
                new_price,
                timestamp: _,
            } => {
                if let Some(mut summary) = self
                    .state
                    .auction_summaries
                    .get(&auction_id)
                    .await
                    .unwrap()
                {
                    summary.current_price = new_price;
                    self.state
                        .auction_summaries
                        .insert(&auction_id, summary)
                        .unwrap();
                }
            }

            AuctionEvent::BidAccepted {
                auction_id,
                bid_id,
                user_chain,
                quantity,
                price_at_bid,
                total_sold,
                remaining: _,
            } => {
                // Update summary
                if let Some(mut summary) = self
                    .state
                    .auction_summaries
                    .get(&auction_id)
                    .await
                    .unwrap()
                {
                    summary.sold = total_sold;
                    summary.total_bids += 1;
                    self.state
                        .auction_summaries
                        .insert(&auction_id, summary)
                        .unwrap();
                }

                // Store bid in history
                if let Some(mut history) = self.state.bid_history.get(&auction_id).await.unwrap() {
                    history.push(BidRecord {
                        bid_id,
                        auction_id,
                        user_chain,
                        quantity,
                        price_at_bid,
                        timestamp: self.runtime.system_time(),
                    });
                    self.state.bid_history.insert(&auction_id, history).unwrap();
                }
            }

            AuctionEvent::BidRejected {
                auction_id: _,
                user_chain: _,
                reason: _,
            } => {
                // Log only, no state changes
            }

            AuctionEvent::AuctionCleared {
                auction_id,
                clearing_price,
                total_bids: _,
                reason: _,
            } => {
                if let Some(mut summary) = self
                    .state
                    .auction_summaries
                    .get(&auction_id)
                    .await
                    .unwrap()
                {
                    summary.clearing_price = Some(clearing_price);
                    summary.status = AuctionStatus::Ended;
                    self.state
                        .auction_summaries
                        .insert(&auction_id, summary)
                        .unwrap();
                }
            }

            AuctionEvent::AuctionSettled {
                auction_id,
                clearing_price: _,
                total_bidders,
                total_sold: _,
            } => {
                if let Some(mut summary) = self
                    .state
                    .auction_summaries
                    .get(&auction_id)
                    .await
                    .unwrap()
                {
                    summary.status = AuctionStatus::Settled;
                    summary.total_bidders = total_bidders;
                    self.state
                        .auction_summaries
                        .insert(&auction_id, summary)
                        .unwrap();
                }
            }
        }
    }
}
