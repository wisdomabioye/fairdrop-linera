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
    type Message = ();
    type Parameters = IndexerParameters;
    type InstantiationArgument = ();
    type EventValue = AuctionEvent;

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
                    panic!("Indexer already initialized. Instantiate a new indexer instance to subscribe to auction chain/app.");
                }

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
            AuctionEvent::ApplicationInitialized { aac_chain: _ } => {
                // Initialization event - just confirms stream exists, no action needed
            }

            AuctionEvent::AuctionCreated {
                auction_id,
                item_name,
                image,
                max_bid_amount,
                total_supply,
                start_price,
                floor_price,
                price_decay_interval,
                price_decay_amount,
                start_time,
                end_time,
                creator,
                payment_token_app,
                auction_token_app,
            } => {
                // Determine initial status: Scheduled if start_time is in the future, otherwise Active
                let now = self.runtime.system_time();
                let initial_status = if now < start_time {
                    AuctionStatus::Scheduled
                } else {
                    AuctionStatus::Active
                };

                let summary = AuctionSummary {
                    // Original auction parameters
                    auction_id,
                    item_name,
                    image,
                    max_bid_amount,
                    total_supply,
                    start_price,
                    floor_price,
                    price_decay_interval,
                    price_decay_amount,
                    start_time,
                    end_time,
                    creator,
                    payment_token_app,
                    auction_token_app,
                    // Derived state
                    current_price: start_price,
                    sold: 0,
                    clearing_price: None,
                    status: initial_status,
                    total_bids: 0,
                    total_bidders: 0,
                };

                self.state
                    .auction_summaries
                    .insert(&auction_id, summary)
                    .unwrap();
                self.state.bid_history.insert(&auction_id, Vec::new()).unwrap();

                // Update creator index - add auction_id to creator's auction list
                let mut creator_auctions = self
                    .state
                    .auctions_by_creator
                    .get(&creator)
                    .await
                    .unwrap()
                    .unwrap_or_default();

                creator_auctions.push(auction_id);
                self.state
                    .auctions_by_creator
                    .insert(&creator, creator_auctions)
                    .unwrap();
            }

            AuctionEvent::BidAccepted {
                auction_id,
                bid_id,
                user_chain,
                quantity,
                amount_paid,
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
                        amount_paid,
                        timestamp: self.runtime.system_time(),
                        claimed: false,  // Not yet claimed
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

            AuctionEvent::SettlementClaimed {
                auction_id: _,
                user_chain: _,
                allocated_quantity: _,
                clearing_price: _,
                total_cost: _,
                refund: _,
            } => {
                // Log only, no state changes needed
                // Settlement claims are tracked on AAC chain, not in indexer
            }

            AuctionEvent::AuctionCancelled {
                auction_id,
                reason: _,
            } => {
                if let Some(mut summary) = self
                    .state
                    .auction_summaries
                    .get(&auction_id)
                    .await
                    .unwrap()
                {
                    summary.status = AuctionStatus::Cancelled;
                    self.state
                        .auction_summaries
                        .insert(&auction_id, summary)
                        .unwrap();
                }
            }

            AuctionEvent::PaymentReceived { .. } => {
                // Payment received event - informational only, no state update needed
            }

            AuctionEvent::RefundIssued { .. } => {
                // Refund issued event - informational only, no state update needed
            }
        }
    }
}
