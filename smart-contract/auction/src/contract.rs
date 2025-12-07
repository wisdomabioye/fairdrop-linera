#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use self::state::{AuctionData, AuctionState};
use auction::{AuctionAbi, AuctionOperation, AuctionParameters, AuctionResponse};
use linera_sdk::linera_base_types::{StreamUpdate, WithContractAbi};
use linera_sdk::views::{RootView, View};
use linera_sdk::{Contract, ContractRuntime};
use shared::events::{AuctionEvent, ClearReason, AUCTION_STREAM};
use shared::messages::AuctionMessage;
use shared::types::{BidRecord, SettlementResult};

pub struct AuctionContract {
    state: AuctionState,
    runtime: ContractRuntime<Self>,
}

linera_sdk::contract!(AuctionContract);

impl WithContractAbi for AuctionContract {
    type Abi = AuctionAbi;
}

impl Contract for AuctionContract {
    type Message = AuctionMessage;
    type Parameters = AuctionParameters;
    type InstantiationArgument = ();
    type EventValue = AuctionEvent;

    async fn load(runtime: ContractRuntime<Self>) -> Self {
        let state = AuctionState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        AuctionContract { state, runtime }
    }

    async fn instantiate(&mut self, _argument: Self::InstantiationArgument) {
        // Validate that the application parameters were configured correctly
        self.runtime.application_parameters();
    }

    async fn execute_operation(&mut self, operation: Self::Operation) -> Self::Response {
        match operation {
            // ═══════════════════════════════════════════════════════════
            // AAC CHAIN OPERATIONS
            // ═══════════════════════════════════════════════════════════

            AuctionOperation::CreateAuction { params } => {
                // Validate on AAC chain
                assert_eq!(
                    self.runtime.chain_id(),
                    self.runtime.application_parameters().aac_chain,
                    "Only AAC chain can create auctions"
                );

                let auction_id = params.auction_id;
                let auction = AuctionData::new(params.clone(), self.runtime.system_time());

                self.state.auctions.insert(&auction_id, auction).unwrap();

                // Emit creation event
                let event = AuctionEvent::AuctionCreated {
                    auction_id,
                    item_name: params.item_name,
                    total_supply: params.total_supply,
                    start_price: params.start_price,
                    floor_price: params.floor_price,
                    start_time: params.start_time,
                    end_time: params.end_time,
                };
                self.runtime.emit(AUCTION_STREAM.into(), &event);

                AuctionResponse::AuctionCreated { auction_id }
            }

            // Is this really needed? We should be able to compute the from auction params at any given time
            AuctionOperation::UpdatePrice { auction_id } => {
                let auction = self
                    .state
                    .auctions
                    .get(&auction_id)
                    .await
                    .expect("Failed to get auction")
                    .expect("Auction not found");

                // Update price if interval passed
                let now = self.runtime.system_time();
                let elapsed = now.delta_since(auction.last_price_update).as_micros();
                let intervals = elapsed / auction.params.price_decay_interval;

                if intervals > 0 {
                    let auction_mut = self.state.auctions.get_mut(&auction_id).await.unwrap().unwrap();
                    let total_decay = auction_mut
                        .params
                        .price_decay_amount
                        .saturating_mul(intervals as u128);
                    let new_price = auction_mut
                        .current_price
                        .saturating_sub(total_decay)
                        .max(auction_mut.params.floor_price);

                    auction_mut.current_price = new_price;
                    auction_mut.last_price_update = now;

                    let event = AuctionEvent::PriceUpdated {
                        auction_id: auction_mut.params.auction_id,
                        new_price,
                        timestamp: now,
                    };
                    self.runtime.emit(AUCTION_STREAM.into(), &event);
                }

                AuctionResponse::Ok
            }

            AuctionOperation::PruneSettledAuction { auction_id } => {
                let auction = self
                    .state
                    .auctions
                    .get(&auction_id)
                    .await
                    .expect("Failed to get auction")
                    .expect("Auction not found");

                // Validate auction is settled
                assert_eq!(
                    auction.status,
                    shared::types::AuctionStatus::Settled,
                    "Auction not settled"
                );

                // Check if settled > 1 hour ago
                let one_hour_micros = 60 * 60 * 1_000_000;
                let settled_at = auction.settled_at.expect("Settled time not set");
                let elapsed = self.runtime.system_time().delta_since(settled_at).as_micros();

                assert!(elapsed >= one_hour_micros, "Auction settled less than 1 hour ago");

                // Remove all bids for this auction
                let bid_ids: Vec<u64> = self.state.bids.indices().await.unwrap();
                for bid_id in bid_ids {
                    if let Some(bid) = self.state.bids.get(&bid_id).await.unwrap() {
                        if bid.auction_id == auction_id {
                            self.state.bids.remove(&bid_id).unwrap();
                        }
                    }
                }

                // Update auction to mark bids as pruned
                let auction_mut = self.state.auctions.get_mut(&auction_id).await.unwrap().unwrap();
                auction_mut.bids_pruned = true;

                AuctionResponse::Ok
            }

            // ═══════════════════════════════════════════════════════════
            // UIC CHAIN OPERATIONS
            // ═══════════════════════════════════════════════════════════

            AuctionOperation::Buy { auction_id, quantity } => {
                // Store local commitment (UIC state)
                let mut commitment = self
                    .state
                    .my_commitments
                    .get(&auction_id)
                    .await
                    .unwrap()
                    .unwrap_or_default();

                commitment.total_quantity += quantity;
                self.state
                    .my_commitments
                    .insert(&auction_id, commitment)
                    .unwrap();

                // Send message to AAC chain
                let params = self.runtime.application_parameters();
                let user_chain = self.runtime.chain_id();
                self.runtime
                    .prepare_message(AuctionMessage::PlaceBid {
                        auction_id,
                        user_chain,
                        quantity,
                    })
                    .send_to(params.aac_chain);

                AuctionResponse::BidSubmitted {
                    auction_id,
                    quantity,
                }
            }

            AuctionOperation::SubscribeToAuction { aac_chain } => {
                let app_id = self.runtime.application_id().forget_abi();
                self.runtime.subscribe_to_events(
                    aac_chain,
                    app_id,
                    AUCTION_STREAM.into(),
                );

                AuctionResponse::Ok
            }

            AuctionOperation::UnsubscribeFromAuction { aac_chain } => {
                let app_id = self.runtime.application_id().forget_abi();
                self.runtime.unsubscribe_from_events(
                    aac_chain,
                    app_id,
                    AUCTION_STREAM.into(),
                );

                AuctionResponse::Ok
            }
        }
    }

    async fn execute_message(&mut self, message: Self::Message) {
        match message {
            // ═══════════════════════════════════════════════════════════
            // MESSAGES RECEIVED BY AAC CHAIN
            // ═══════════════════════════════════════════════════════════

            AuctionMessage::PlaceBid {
                auction_id,
                user_chain,
                quantity,
            } => {
                // First, update price if needed (separate scope to avoid borrow conflicts)
                {
                    let auction = self.state.auctions.get(&auction_id).await.expect("Failed to get auction").expect("Auction not found");
                    let now = self.runtime.system_time();
                    let elapsed = now.delta_since(auction.last_price_update).as_micros();
                    let intervals = elapsed / auction.params.price_decay_interval;

                    if intervals > 0 {
                        let auction_mut = self.state.auctions.get_mut(&auction_id).await.unwrap().unwrap();
                        let total_decay = auction_mut.params.price_decay_amount.saturating_mul(intervals as u128);
                        let new_price = auction_mut.current_price.saturating_sub(total_decay).max(auction_mut.params.floor_price);
                        auction_mut.current_price = new_price;
                        auction_mut.last_price_update = now;

                        let event = AuctionEvent::PriceUpdated {
                            auction_id: auction_mut.params.auction_id,
                            new_price,
                            timestamp: now,
                        };
                        self.runtime.emit(AUCTION_STREAM.into(), &event);
                    }
                }

                // Now get mutable reference to auction for bid processing
                let auction = self.state.auctions.get_mut(&auction_id).await.unwrap().unwrap();
                let current_price = auction.current_price;

                // Check if auction still active
                if auction.status != shared::types::AuctionStatus::Active {
                    let event = AuctionEvent::BidRejected {
                        auction_id,
                        user_chain,
                        reason: "Auction not active".to_string(),
                    };
                    self.runtime.emit(AUCTION_STREAM.into(), &event);
                    return;
                }

                // Calculate available quantity
                let remaining = auction.total_supply.saturating_sub(auction.sold);
                if remaining == 0 {
                    let event = AuctionEvent::BidRejected {
                        auction_id,
                        user_chain,
                        reason: "Supply exhausted".to_string(),
                    };
                    self.runtime.emit(AUCTION_STREAM.into(), &event);
                    return;
                }

                let accepted_quantity = quantity.min(remaining);

                // Create bid record
                let bid_id = *self.state.next_bid_id.get();
                self.state.next_bid_id.set(bid_id + 1);

                let bid = BidRecord {
                    bid_id,
                    auction_id,
                    user_chain,
                    quantity: accepted_quantity,
                    price_at_bid: current_price,
                    timestamp: self.runtime.system_time(),
                };

                self.state.bids.insert(&bid_id, bid).unwrap();

                // Update sold quantity
                auction.sold += accepted_quantity;

                // Update user total
                let user_total = self
                    .state
                    .user_totals
                    .get(&(auction_id, user_chain))
                    .await
                    .unwrap()
                    .unwrap_or(0);
                self.state
                    .user_totals
                    .insert(&(auction_id, user_chain), user_total + accepted_quantity)
                    .unwrap();

                // Emit bid accepted event
                let event = AuctionEvent::BidAccepted {
                    auction_id,
                    bid_id,
                    user_chain,
                    quantity: accepted_quantity,
                    price_at_bid: current_price,
                    total_sold: auction.sold,
                    remaining: auction.total_supply - auction.sold,
                };
                self.runtime.emit(AUCTION_STREAM.into(), &event);

                // Check if supply exhausted
                let supply_exhausted = auction.sold >= auction.total_supply;
                if supply_exhausted {
                    auction.clearing_price = Some(current_price);
                    auction.status = shared::types::AuctionStatus::Ended;
                }
                // Release mutable reference before calling count_bids
                let _ = auction;

                if supply_exhausted {
                    let total_bids = self.count_bids_for_auction(auction_id).await;

                    let event = AuctionEvent::AuctionCleared {
                        auction_id,
                        clearing_price: current_price,
                        total_bids,
                        reason: ClearReason::SupplyExhausted,
                    };
                    self.runtime.emit(AUCTION_STREAM.into(), &event);

                    // Auto-settle
                    self.settle_auction(auction_id).await;
                }
            }

            // ═══════════════════════════════════════════════════════════
            // MESSAGES RECEIVED BY UIC CHAINS
            // ═══════════════════════════════════════════════════════════

            AuctionMessage::SettlementResult { auction_id, result } => {
                // Received on UIC chain from AAC chain
                let mut commitment = self
                    .state
                    .my_commitments
                    .get(&auction_id)
                    .await
                    .unwrap()
                    .unwrap_or_default();

                commitment.settlement = Some(result);
                self.state
                    .my_commitments
                    .insert(&auction_id, commitment)
                    .unwrap();
            }
        }
    }

    async fn process_streams(&mut self, updates: Vec<StreamUpdate>) {
        for update in updates {
            assert_eq!(update.stream_id.stream_name, AUCTION_STREAM.into());
            assert_eq!(
                update.stream_id.application_id,
                self.runtime.application_id().forget_abi().into()
            );

            for index in update.new_indices() {
                let _event: AuctionEvent =
                    self.runtime
                        .read_event(update.chain_id, AUCTION_STREAM.into(), index);

                // UIC can process events for live updates if needed
                // For now, we just acknowledge receiving them
            }
        }
    }

    async fn store(mut self) {
        self.state.save().await.expect("Failed to save state");
    }
}

impl AuctionContract {
    /// Settle auction and send settlement results to all bidders
    async fn settle_auction(&mut self, auction_id: u64) {
        let auction = self
            .state
            .auctions
            .get(&auction_id)
            .await
            .unwrap()
            .expect("Auction not found");
        let clearing_price = auction.clearing_price.expect("Clearing price not set");

        let bid_ids: Vec<u64> = self.state.bids.indices().await.unwrap();
        let mut bidders = std::collections::HashSet::new();

        for bid_id in bid_ids {
            if let Some(bid) = self.state.bids.get(&bid_id).await.unwrap() {
                if bid.auction_id != auction_id {
                    continue;
                }

                bidders.insert(bid.user_chain);

                // Calculate refund
                let paid = bid.price_at_bid.saturating_mul(bid.quantity as u128);
                let owed = clearing_price.saturating_mul(bid.quantity as u128);
                let refund = paid.saturating_sub(owed);

                // Send settlement to user
                self.runtime
                    .prepare_message(AuctionMessage::SettlementResult {
                        auction_id,
                        result: SettlementResult {
                            allocated_quantity: bid.quantity,
                            clearing_price,
                            total_cost: owed,
                            refund,
                        },
                    })
                    .send_to(bid.user_chain);
            }
        }

        // Update auction status
        let auction = self
            .state
            .auctions
            .get_mut(&auction_id)
            .await
            .unwrap()
            .unwrap();
        auction.status = shared::types::AuctionStatus::Settled;
        auction.settled_at = Some(self.runtime.system_time());

        // Emit settlement event
        let event = AuctionEvent::AuctionSettled {
            auction_id,
            clearing_price,
            total_bidders: bidders.len() as u64,
            total_sold: auction.sold,
        };
        self.runtime.emit(AUCTION_STREAM.into(), &event);
    }

    /// Count total bids for an auction
    async fn count_bids_for_auction(&self, auction_id: u64) -> u64 {
        let bid_ids: Vec<u64> = self.state.bids.indices().await.unwrap();
        let mut count = 0;

        for bid_id in bid_ids {
            if let Some(bid) = self.state.bids.get(&bid_id).await.unwrap() {
                if bid.auction_id == auction_id {
                    count += 1;
                }
            }
        }

        count
    }
}
