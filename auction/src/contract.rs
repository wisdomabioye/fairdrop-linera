#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use self::state::{AuctionData, AuctionState};
use auction::{AuctionAbi, AuctionOperation, AuctionResponse};
use fungible::{FungibleOperation, FungibleResponse, FungibleTokenAbi};
use linera_sdk::linera_base_types::{Account, AccountOwner, Amount, ApplicationId, Timestamp, StreamUpdate, WithContractAbi};
use linera_sdk::views::{RootView, View};
use linera_sdk::{Contract, ContractRuntime};
use shared::events::{AuctionEvent, AUCTION_STREAM};
// use shared::messages::AuctionMessage;
use shared::types::{AuctionParams, BidRecord, AuctionStatus /* , SettlementResult */};

pub struct AuctionContract {
    state: AuctionState,
    runtime: ContractRuntime<Self>,
}

linera_sdk::contract!(AuctionContract);

impl WithContractAbi for AuctionContract {
    type Abi = AuctionAbi;
}

impl Contract for AuctionContract {
    type Message = ();
    type Parameters = ();
    type InstantiationArgument = ();
    type EventValue = AuctionEvent;

    async fn load(runtime: ContractRuntime<Self>) -> Self {
        let state = AuctionState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        AuctionContract { state, runtime }
    }

    async fn instantiate(&mut self, _argument: Self::InstantiationArgument) {
        let creator_chain_id = self.runtime.application_creator_chain_id();

        // Emit initialization event to create the stream
        // This ensures the stream exists on every chain where the app is deployed
        let event = AuctionEvent::ApplicationInitialized {
            aac_chain: creator_chain_id
        };
        self.runtime.emit(AUCTION_STREAM.into(), &event);
    }

    async fn execute_operation(&mut self, operation: Self::Operation) -> Self::Response {
        match operation {
            // ═══════════════════════════════════════════════════════════
            // AAC CHAIN OPERATIONS (when called on AAC)
            // ═══════════════════════════════════════════════════════════

            AuctionOperation::CreateAuction { params } => {
                self.handle_create_auction(params.into()).await
            }

            AuctionOperation::CancelAuction { auction_id } => {
                self.handle_cancel_auction(auction_id).await
            }

            AuctionOperation::PruneSettledAuction { auction_id } => {
                self.handle_prune_settled_auction(auction_id).await
            }

            AuctionOperation::Trigger {} => {
                AuctionResponse::Ok
            }

            AuctionOperation::Buy { auction_id, quantity } => {
                self.handle_place_bid(auction_id, quantity).await
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

            AuctionOperation::ClaimSettlement { auction_id } => {
                self.handle_claim_settlement(auction_id).await
            }
        }
    }

    async fn execute_message(&mut self, _message: Self::Message) {
        panic!("Cross-chain message is not supported!");
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
            }
        }
    }

    async fn store(mut self) {
        self.state.save().await.expect("Failed to save state");
    }
}

// ═══════════════════════════════════════════════════════════
// Helper Structs for Clean Data Flow
// ═══════════════════════════════════════════════════════════

/// Data returned from bid validation phase
struct BidValidation {
    bidder: AccountOwner,
    accepted_quantity: Amount,
    amount_paid: Amount,
    current_price: Amount,
    payment_token_app: ApplicationId,
    should_settle: bool,
}

/// Data loaded for claim processing
struct ClaimData {
    unclaimed_bids: Vec<BidRecord>,
    clearing_price: Amount,
    payment_token_app: ApplicationId,
    auction_token_app: ApplicationId,
}

/// Calculated settlement amounts
struct Settlement {
    total_quantity: Amount,
    total_cost: Amount,
    refund: Amount,
}

impl AuctionContract {
    // ═══════════════════════════════════════════════════════════
    // Operation Handlers
    // ═══════════════════════════════════════════════════════════

    /// Handle auction creation on AAC chain
    async fn handle_create_auction(&mut self, params: AuctionParams) -> AuctionResponse {
        let user_account = self.runtime.authenticated_signer().expect("Caller must be authenticated");

        // Auto-generate auction ID
        let auction_id = *self.state.next_auction_id.get();
        self.state.next_auction_id.set(auction_id + 1);

        let auction = AuctionData::new(params.clone(), self.runtime.system_time());

        self.state.auctions.insert(&auction_id, auction).unwrap();

        // Emit creation event with full params
        let event = AuctionEvent::AuctionCreated {
            auction_id,
            item_name: params.item_name.clone(),
            image: params.image.clone(),
            max_bid_amount: params.max_bid_amount,
            total_supply: params.total_supply,
            start_price: params.start_price,
            floor_price: params.floor_price,
            price_decay_interval: params.price_decay_interval,
            price_decay_amount: params.price_decay_amount,
            start_time: params.start_time,
            end_time: params.end_time,
            creator: user_account,
            payment_token_app: params.payment_token_app,
            auction_token_app: params.auction_token_app,
        };
        self.runtime.emit(AUCTION_STREAM.into(), &event);

        AuctionResponse::AuctionCreated { auction_id }
    }

    /// Handle auction cancellation by creator (before start, AAC only)
    async fn handle_cancel_auction(&mut self, auction_id: u64) -> AuctionResponse {
        let auction = self
            .state
            .auctions
            .get(&auction_id)
            .await
            .expect("Failed to get auction")
            .expect("Auction not found");

        // Validate caller is the creator
        let authenticated_signer = self.runtime.authenticated_signer()
            .expect("Caller must be authenticated to cancel auction");

        assert_eq!(
            authenticated_signer,
            auction.params.creator,
            "Only the creator can cancel the auction"
        );

        // Validate auction is in Scheduled status
        assert_eq!(
            auction.status,
            AuctionStatus::Scheduled,
            "Only scheduled auctions can be cancelled (auction must not have started yet)"
        );

        // Update auction status to Cancelled
        let auction_mut = self.state.auctions.get_mut(&auction_id).await.unwrap().unwrap();
        auction_mut.status = AuctionStatus::Cancelled;

        // Emit cancellation event
        let reason = format!(
            "Cancelled by creator before start_time ({:?})",
            auction.params.start_time
        );

        let event = AuctionEvent::AuctionCancelled {
            auction_id,
            reason,
        };
        self.runtime.emit(AUCTION_STREAM.into(), &event);

        AuctionResponse::Ok
    }

    /// Handle pruning of settled auction bids (two-tier strategy)
    async fn handle_prune_settled_auction(&mut self, auction_id: u64) -> AuctionResponse {
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
            AuctionStatus::Settled,
            "Auction not settled"
        );

        // Calculate elapsed time since settlement
        let one_hour_micros = 60 * 60 * 1_000_000u64;
        let ninety_days_micros = 90 * 24 * 60 * 60 * 1_000_000u64;
        let settled_at = auction.settled_at.expect("Settled time not set");
        let elapsed = self.runtime.system_time().delta_since(settled_at).as_micros();

        // Must be at least 1 hour after settlement to prune
        assert!(
            elapsed >= one_hour_micros,
            "Auction settled less than 1 hour ago. Cannot prune yet."
        );

        // Two-tier pruning strategy
        let prune_all = elapsed >= ninety_days_micros;

        // Iterate over all user-auction combinations to find bids for this auction
        let all_keys: Vec<(AccountOwner, u64)> = self.state.user_auction_bids.indices().await.unwrap();

        for (user_chain, auction_id_key) in all_keys {
            if auction_id_key == auction_id {
                let user_bids = self
                    .state
                    .user_auction_bids
                    .get(&(user_chain, auction_id))
                    .await
                    .unwrap()
                    .unwrap_or_default();

                if prune_all {
                    // Tier 2 (90+ days): Prune all bids for this user-auction
                    self.state
                        .user_auction_bids
                        .remove(&(user_chain, auction_id))
                        .unwrap();
                } else {
                    // Tier 1 (1hr - 90 days): Prune only claimed bids
                    let mut filtered_bids = user_bids;
                    filtered_bids.retain(|bid| !bid.claimed);

                    if filtered_bids.is_empty() {
                        // Remove entry if all bids were pruned
                        self.state
                            .user_auction_bids
                            .remove(&(user_chain, auction_id))
                            .unwrap();
                    } else {
                        // Update with remaining bids
                        self.state
                            .user_auction_bids
                            .insert(&(user_chain, auction_id), filtered_bids)
                            .unwrap();
                    }
                }
            }
        }

        // Update auction to mark bids as pruned (if all were pruned)
        if prune_all {
            let auction_mut = self.state.auctions.get_mut(&auction_id).await.unwrap().unwrap();
            auction_mut.bids_pruned = true;
        }

        AuctionResponse::Ok
    }

    /// Handle settlement claim from user chain (AAC processes this)
    async fn handle_claim_settlement(&mut self, auction_id: u64) -> AuctionResponse {
        let user_account = self.runtime.authenticated_signer()
            .expect("Caller must be authenticated");

        // 1. VALIDATE & LOAD - single auction read with all needed data
        let claim_data = match self.load_claim_data(auction_id, user_account).await {
            Ok(data) => data,
            Err(()) => return AuctionResponse::Ok, // Early exit if no unclaimed bids
        };

        // 2. CALCULATE - pure function, no side effects
        let settlement = Self::calculate_settlement(&claim_data);

        // 3. EXECUTE - all mutations and transfers together
        self.execute_settlement(auction_id, user_account, settlement, &claim_data).await;

        AuctionResponse::Ok
    }

    /// Handle bid placement from user chains
    async fn handle_place_bid(&mut self, auction_id: u64, quantity: Amount) -> AuctionResponse {
        let bidder = self.runtime.authenticated_signer()
            .expect("Caller must be authenticated");

        // 1. VALIDATE - all fast-fail checks, get immutable data
        let validation = match self.validate_bid(auction_id, quantity, bidder).await {
            Ok(v) => v,
            Err(()) => return AuctionResponse::Ok, // Validation emits rejection event
        };

        // 2. COLLECT PAYMENT - fail-fast before state changes
        if let Err(reason) = self.collect_payment(validation.bidder, validation.amount_paid, validation.payment_token_app) {
            let event = AuctionEvent::BidRejected {
                auction_id,
                user_account: bidder,
                reason: format!(
                    "Payment failed: {}. Ensure you have sufficient fungible token balance on AAC",
                    reason
                ),
            };
            self.runtime.emit(AUCTION_STREAM.into(), &event);
            return AuctionResponse::Ok;
        }

        // 3. EXECUTE - state mutations (guaranteed success path)
        let bid = self.execute_bid(auction_id, &validation).await;

        // 4. SETTLE - explicit settlement check (not hidden)
        if validation.should_settle {
            // Set clearing price and settle
            let auction = self.state.auctions.get_mut(&auction_id).await.unwrap().unwrap();
            auction.clearing_price = Some(validation.current_price);
            
            self.settle_auction(auction_id).await;
        }

        AuctionResponse::BidPlaced { 
            auction_id, 
            bid_id: bid.bid_id, 
            user_account: bidder, 
            quantity: bid.quantity, 
            amount_paid: bid.amount_paid, 
            timestamp: bid.timestamp, 
            claimed: bid.claimed 
        }
    }

    /// Settle auction (manual claim-based settlement - no auto-messaging)
    async fn settle_auction(&mut self, auction_id: u64) {
        // Get mutable reference for updating status
        let auction = self
            .state
            .auctions
            .get_mut(&auction_id)
            .await
            .unwrap()
            .expect("Auction not found");

        let clearing_price = auction.clearing_price.expect("Clearing price not set");
        let total_bidders = auction.total_bidders;
        let total_sold = auction.sold;

        // Update auction status to Settled
        auction.status = AuctionStatus::Settled;
        auction.settled_at = Some(self.runtime.system_time());

        // Emit settlement event
        // NOTE: Users must manually claim their settlements via ClaimSettlement operation
        let event = AuctionEvent::AuctionSettled {
            auction_id,
            clearing_price,
            total_bidders,
            total_sold,
        };
        self.runtime.emit(AUCTION_STREAM.into(), &event);
    }

    // ═══════════════════════════════════════════════════════════
    // Helper Functions
    // ═══════════════════════════════════════════════════════════

    /// Load and validate claim data (single auction read)
    async fn load_claim_data(&mut self, auction_id: u64, user_account: AccountOwner) -> Result<ClaimData, ()> {
        // Verify auction is settled
        let auction = self.state.auctions
            .get(&auction_id)
            .await
            .expect("Failed to get auction")
            .expect("Auction not found");

        assert_eq!(
            auction.status,
            AuctionStatus::Settled,
            "Auction not settled yet"
        );

        let clearing_price = auction.clearing_price.expect("Clearing price not set");
        let payment_token_app = auction.params.payment_token_app;
        let auction_token_app = auction.params.auction_token_app;

        // Get all bids and filter for unclaimed
        let user_bids = self.state.user_auction_bids
            .get(&(user_account, auction_id))
            .await
            .unwrap()
            .unwrap_or_default();

        let unclaimed_bids: Vec<BidRecord> = user_bids
            .into_iter()
            .filter(|bid| !bid.claimed)
            .collect();

        // Early exit if no unclaimed bids
        if unclaimed_bids.is_empty() {
            return Err(());
        }

        Ok(ClaimData {
            unclaimed_bids,
            clearing_price,
            payment_token_app,
            auction_token_app,
        })
    }

    /// Pure calculation of settlement amounts
    fn calculate_settlement(claim_data: &ClaimData) -> Settlement {
        let (total_quantity, total_paid) = claim_data.unclaimed_bids
            .iter()
            .fold((Amount::ZERO, Amount::ZERO), |(qty, paid), bid| {
                (qty.saturating_add(bid.quantity), paid.saturating_add(bid.amount_paid))
            });

        let total_cost = claim_data.clearing_price.saturating_mul(total_quantity.into());
        let refund = total_paid.saturating_sub(total_cost);

        Settlement {
            total_quantity,
            total_cost,
            refund,
        }
    }

    /// Execute settlement mutations and transfers
    async fn execute_settlement(
        &mut self,
        auction_id: u64,
        user_account: AccountOwner,
        settlement: Settlement,
        claim_data: &ClaimData,
    ) {
        // Mark all unclaimed bids as claimed
        let mut user_bids = self.state.user_auction_bids
            .get(&(user_account, auction_id))
            .await
            .unwrap()
            .unwrap_or_default();

        for bid in &mut user_bids {
            if !bid.claimed {
                bid.claimed = true;
            }
        }

        // Save updated bids
        self.state.user_auction_bids
            .insert(&(user_account, auction_id), user_bids)
            .unwrap();

        // Execute refund transfer
        self.refund_payment(auction_id, user_account, settlement.refund, claim_data.payment_token_app);

        // Transfer auction tokens
        self.auction_token_transfer(user_account, settlement.total_quantity, claim_data.auction_token_app);

        // Emit settlement claimed event
        let event = AuctionEvent::SettlementClaimed {
            auction_id,
            user_account,
            allocated_quantity: settlement.total_quantity,
            clearing_price: claim_data.clearing_price,
            total_cost: settlement.total_cost,
            refund: settlement.refund,
        };
        self.runtime.emit(AUCTION_STREAM.into(), &event);
    }

    /// Validate bid and return all data needed for execution
    async fn validate_bid(
        &mut self,
        auction_id: u64,
        quantity: Amount,
        bidder: AccountOwner,
    ) -> Result<BidValidation, ()> {
        let current_price = self.calculate_current_price(auction_id).await;
        let now = self.runtime.system_time();

        // Get auction data (single read)
        let auction = self.state.auctions.get_mut(&auction_id).await.unwrap().unwrap();
        let current_status = auction.status;
        let start_time = auction.params.start_time;
        let end_time = auction.params.end_time;
        let total_supply = auction.total_supply;
        let sold = auction.sold;
        let payment_token_app = auction.params.payment_token_app;

        // Check time expiration first
        if now > end_time && current_status == AuctionStatus::Active {
            // Set clearing price and settle
            auction.clearing_price = Some(current_price);
            
            self.settle_auction(auction_id).await;

            let event = AuctionEvent::BidRejected {
                auction_id,
                user_account: bidder,
                reason: format!("Auction expired at: {:?}", end_time),
            };
            self.runtime.emit(AUCTION_STREAM.into(), &event);
            return Err(());
        }

        // Validate auction state (Scheduled→Active transition)
        let new_status = self.validate_auction_state(
            current_status,
            start_time,
            end_time,
            now,
            auction_id,
            bidder,
        )?;

        // Apply status change if needed
        if let Some(status) = new_status {
            let auction = self.state.auctions.get_mut(&auction_id).await.unwrap().unwrap();
            auction.status = status;
        }

        // Validate supply
        let remaining = total_supply.saturating_sub(sold);
        if remaining == Amount::ZERO {
            let event = AuctionEvent::BidRejected {
                auction_id,
                user_account: bidder,
                reason: "Supply exhausted".to_string(),
            };
            self.runtime.emit(AUCTION_STREAM.into(), &event);
            return Err(());
        }

        let accepted_quantity = quantity.min(remaining);
        let amount_paid = current_price.saturating_mul(accepted_quantity.into());

        // Check if this bid will exhaust supply
        let will_exhaust_supply = sold.saturating_add(accepted_quantity) >= total_supply;

        Ok(BidValidation {
            bidder,
            accepted_quantity,
            amount_paid,
            current_price,
            payment_token_app,
            should_settle: will_exhaust_supply,
        })
    }

    /// Execute bid state mutations and emit events
    async fn execute_bid(&mut self, auction_id: u64, validation: &BidValidation) -> BidRecord {
        // Create bid record
        let bid_id = *self.state.next_bid_id.get();
        self.state.next_bid_id.set(bid_id + 1);

        let bid = BidRecord {
            bid_id,
            auction_id,
            user_account: validation.bidder,
            quantity: validation.accepted_quantity,
            amount_paid: validation.amount_paid,
            timestamp: self.runtime.system_time(),
            claimed: false,
        };

        // Insert bid
        let mut user_bids = self.state.user_auction_bids
            .get(&(validation.bidder, auction_id))
            .await
            .unwrap()
            .unwrap_or_default();

        let is_first_bid = user_bids.is_empty();
        user_bids.push(bid.clone());

        self.state.user_auction_bids
            .insert(&(validation.bidder, auction_id), user_bids)
            .unwrap();

        // Update auction state
        let auction = self.state.auctions.get_mut(&auction_id).await.unwrap().unwrap();
        auction.sold = auction.sold.saturating_add(validation.accepted_quantity);
        auction.total_bids += 1;
        if is_first_bid {
            auction.total_bidders += 1;
        }
        let total_sold = auction.sold;
        let remaining = auction.total_supply.saturating_sub(auction.sold);

        // Update user total
        let user_total = self.state.user_totals
            .get(&(auction_id, validation.bidder))
            .await
            .unwrap()
            .unwrap_or(Amount::ZERO);

        self.state.user_totals
            .insert(&(auction_id, validation.bidder), user_total.saturating_add(validation.accepted_quantity))
            .unwrap();

        // Emit events
        let payment_event = AuctionEvent::PaymentReceived {
            auction_id,
            user_account: bid.user_account,
            amount: bid.amount_paid,
            bid_id: bid.bid_id,
        };
        self.runtime.emit(AUCTION_STREAM.into(), &payment_event);

        let event = AuctionEvent::BidAccepted {
            auction_id,
            bid_id: bid.bid_id,
            user_account: bid.user_account,
            quantity: bid.quantity,
            amount_paid: bid.amount_paid,
            total_sold,
            remaining,
        };
        self.runtime.emit(AUCTION_STREAM.into(), &event);

        bid
    }

    // ═══════════════════════════════════════════════════════════
    // Utility Functions
    // ═══════════════════════════════════════════════════════════

    /// Calculate current price based on elapsed time since auction start
    /// On-demand calculation
    async fn calculate_current_price(&mut self, auction_id: u64) -> Amount {
        let auction = self
            .state
            .auctions
            .get(&auction_id)
            .await
            .expect("Failed to get auction")
            .expect("Auction not found");

        let current_time = self.runtime.system_time();

        // Use shared utility function
        shared::calculate_current_price(
            auction.params.start_price,
            auction.params.floor_price,
            auction.params.price_decay_amount,
            auction.params.price_decay_interval,
            auction.params.start_time,
            current_time,
        )
    }

    /// Validate auction state and handle transitions
    /// Returns Ok(Some(new_status)) if transition needed, Ok(None) if ready, Err if rejected
    fn validate_auction_state(
        &mut self,
        current_status: AuctionStatus,
        start_time: Timestamp,
        end_time: Timestamp,
        now: Timestamp,
        auction_id: u64,
        user_account: AccountOwner,
    ) -> Result<Option<AuctionStatus>, ()> {
        // Handle Scheduled → Active transition
        if current_status == AuctionStatus::Scheduled {
            if now >= start_time {
                return Ok(Some(AuctionStatus::Active));
            } else {
                let event = AuctionEvent::BidRejected {
                    auction_id,
                    user_account,
                    reason: format!("Auction not started yet. Starts at: {:?}", start_time),
                };
                self.runtime.emit(AUCTION_STREAM.into(), &event);
                return Err(());
            }
        }

        // Check if auction has expired (time-based expiration)
        if now > end_time && current_status == AuctionStatus::Active {
            let event = AuctionEvent::BidRejected {
                auction_id,
                user_account,
                reason: format!("Auction expired at: {:?}", end_time),
            };
            self.runtime.emit(AUCTION_STREAM.into(), &event);
            return Err(());
        }

        // Check if auction is active
        if current_status != AuctionStatus::Active {
            let event = AuctionEvent::BidRejected {
                auction_id,
                user_account,
                reason: "Auction not active".to_string(),
            };
            self.runtime.emit(AUCTION_STREAM.into(), &event);
            return Err(());
        }

        Ok(None)
    }


    // ═══════════════════════════════════════════════════════════
    // Payment Helper Methods
    // ═══════════════════════════════════════════════════════════

    /// Helper: Collect payment from user to escrow (synchronous on AAC)
    /// Returns Ok if successful, Err with reason if payment fails
    fn collect_payment(
        &mut self,
        bidder: AccountOwner,
        amount: Amount,
        payment_token_app: ApplicationId,
    ) -> Result<(), String> {
        // Define escrow account owned by the application
        let escrow_account = Account {
            chain_id: self.runtime.chain_id(), // AAC chain
            owner: self.runtime.application_id().into(), // App-owned escrow
        };

        // Transfer from bidder (on AAC) to escrow (on AAC) - synchronous
        let transfer_operation = FungibleOperation::Transfer {
            owner: bidder,
            amount,
            target_account: escrow_account,
        };

        // Convert untyped ApplicationId to typed for the call
        let typed_app: ApplicationId<FungibleTokenAbi> = unsafe {
            std::mem::transmute(payment_token_app)
        };

        // Call fungible token application (synchronous - same chain)
        // This will fail immediately if user has insufficient balance
        match self.runtime.call_application(true, typed_app, &transfer_operation) {
            FungibleResponse::Ok => Ok(()),
            FungibleResponse::Balance(_) | FungibleResponse::TickerSymbol(_) | FungibleResponse::TokenName(_) => {
                Err("Unexpected response from fungible token".to_string())
            }
        }
    }

    /// Helper: Refund excess payment to user after settlement (synchronous on AAC)
    fn refund_payment(
        &mut self,
        auction_id: u64,
        bidder: AccountOwner,
        refund_amount: Amount,
        payment_token_app: ApplicationId,
    ) {
        if refund_amount == Amount::ZERO {
            return; // No refund needed
        }

        // User account on AAC (refund stays on AAC for fast settlement)
        let user_account = Account {
            chain_id: self.runtime.chain_id(), // AAC
            owner: bidder,
        };

        // Transfer from escrow (app-owned) back to user
        let transfer_operation = FungibleOperation::Transfer {
            owner: self.runtime.application_id().into(), // From app escrow
            amount: refund_amount,
            target_account: user_account,
        };

        // Convert untyped ApplicationId to typed for the call
        let typed_app: ApplicationId<FungibleTokenAbi> = unsafe {
            std::mem::transmute(payment_token_app)
        };

        // Call fungible token application (synchronous - same chain)
        match self.runtime.call_application(true, typed_app, &transfer_operation) {
            FungibleResponse::Ok => {
                // Emit refund event
                let event = AuctionEvent::RefundIssued {
                    auction_id,
                    user_account: bidder,
                    refund_amount,
                };
                self.runtime.emit(AUCTION_STREAM.into(), &event);
            }
            _ => {
                // This should not fail since escrow has the funds
                panic!("Failed to refund payment to user");
            }
        }
    }

    /// Helper: Transfer auction token to user after settlement (synchronous on AAC)
    fn auction_token_transfer(
        &mut self,
        bidder: AccountOwner,
        allocated_quantity: Amount,
        auction_token_app: ApplicationId,
    ) {
        if allocated_quantity == Amount::ZERO {
            return;
        }

        // User account on AAC (auction token stays on AAC for fast settlement)
        let user_account = Account {
            chain_id: self.runtime.chain_id(), // AAC
            owner: bidder,
        };

        // Transfer from escrow (app-owned) back to user
        let transfer_operation = FungibleOperation::Transfer {
            owner: self.runtime.application_id().into(), // From app escrow
            amount: allocated_quantity,
            target_account: user_account,
        };

        // Convert untyped ApplicationId to typed for the call
        let typed_app: ApplicationId<FungibleTokenAbi> = unsafe {
            std::mem::transmute(auction_token_app)
        };

        // Call fungible token application (synchronous - same chain)
        match self.runtime.call_application(true, typed_app, &transfer_operation) {
            FungibleResponse::Ok => {}
            _ => {
                // This should not fail since escrow has the funds
                panic!("Failed to transfer auction token to bidder");
            }
        }
    }

}
