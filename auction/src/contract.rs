#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use self::state::{AuctionData, AuctionState};
use auction::{AuctionAbi, AuctionOperation, AuctionResponse};
use fungible::{FungibleOperation, FungibleResponse, FungibleTokenAbi};
use linera_sdk::linera_base_types::{Account, AccountOwner, Amount, ApplicationId, ChainId, StreamUpdate, WithContractAbi};
use linera_sdk::views::{RootView, View};
use linera_sdk::{Contract, ContractRuntime};
use shared::events::{AuctionEvent, AUCTION_STREAM,};
use shared::messages::AuctionMessage;
use shared::types::{AuctionParams, BidRecord, AuctionStatus, AuctionParameters};

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
        let app_params = self.runtime.application_parameters();

        // Emit initialization event to create the stream
        let event = AuctionEvent::ApplicationInitialized {
            aac_chain: app_params.aac_chain
        };
        self.runtime.emit(AUCTION_STREAM.into(), &event);
    }

    async fn execute_operation(&mut self, operation: Self::Operation) -> Self::Response {
        let app_params = self.runtime.application_parameters();
        let current_chain = self.runtime.chain_id();

        match operation {
            AuctionOperation::CreateAuction { params } => {
                if current_chain == app_params.aac_chain {
                    self.handle_create_auction(params.into()).await
                } else {
                    let message = AuctionMessage::CreateAuction { params };

                    self.runtime
                        .prepare_message(message)
                        .with_authentication()
                        .with_tracking()
                        .send_to(app_params.aac_chain);

                    AuctionResponse::Ok
                }
            }

            AuctionOperation::CancelAuction { auction_id } => {
                if current_chain == app_params.aac_chain {
                    self.handle_cancel_auction(auction_id).await
                } else {
                    let message = AuctionMessage::CancelAuction { auction_id };

                    self.runtime
                        .prepare_message(message)
                        .with_authentication()
                        .with_tracking()
                        .send_to(app_params.aac_chain);

                    AuctionResponse::Ok
                }
            }

            AuctionOperation::PruneSettledAuction { auction_id } => {
                if current_chain == app_params.aac_chain {
                    self.handle_prune_settled_auction(auction_id).await
                } else {
                    let message = AuctionMessage::PruneSettledAuction { auction_id };

                    self.runtime
                        .prepare_message(message)
                        .with_authentication()
                        .with_tracking()
                        .send_to(app_params.aac_chain);

                    AuctionResponse::Ok
                }
            }

            AuctionOperation::Trigger {} => {
                AuctionResponse::Ok
            }

            AuctionOperation::Buy { auction_id, quantity } => {
                if current_chain == app_params.aac_chain {
                    self.handle_place_bid(auction_id, quantity).await
                } else {
                    let message = AuctionMessage::Buy { auction_id, quantity };

                    self.runtime
                        .prepare_message(message)
                        .with_authentication()
                        .with_tracking()
                        .send_to(app_params.aac_chain);

                    AuctionResponse::Ok
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

            AuctionOperation::ClaimSettlement { auction_id } => {
                self.handle_claim_settlement(auction_id).await
            }

            AuctionOperation::WithdrawProceed { auction_id } => {
                if current_chain == app_params.aac_chain {
                    self.withdraw_auction_proceeds(auction_id).await
                } else {
                    let message = AuctionMessage::WithdrawProceed { auction_id };

                    self.runtime
                        .prepare_message(message)
                        .with_authentication()
                        .send_to(app_params.aac_chain);

                    AuctionResponse::Ok
                }
            }

            AuctionOperation::WithdrawUnsoldToken { auction_id } => {
                if current_chain == app_params.aac_chain {
                    self.withdraw_auction_unsold_token(auction_id).await
                } else {
                    let message = AuctionMessage::WithdrawUnsoldToken { auction_id };

                    self.runtime
                        .prepare_message(message)
                        .with_authentication()
                        .send_to(app_params.aac_chain);

                    AuctionResponse::Ok
                }
            }

            AuctionOperation::Deposit { app_token_id, amount } => {
                // Validate amount
                if amount == Amount::ZERO {
                    panic!("Deposit amount must be greater than zero");
                }

                // Validate token is supported
                let token_app = self.validate_supported_token(app_token_id);

                let depositor = self.runtime.authenticated_signer()
                    .expect("Caller must be authenticated to deposit");

                if current_chain == app_params.aac_chain {
                    // Direct deposit on AAC chain (e.g., creator depositing auction tokens)
                    // Transfer tokens directly from user → app escrow (same chain, cross-owner)
                    let app_escrow_account = Account {
                        chain_id: app_params.aac_chain,
                        owner: self.runtime.application_id().into(),
                    };

                    let transfer_operation = FungibleOperation::Transfer {
                        owner: depositor,
                        amount,
                        target_account: app_escrow_account,
                    };

                    match self.runtime.call_application(true, token_app, &transfer_operation) {
                        FungibleResponse::Ok => {}
                        _ => panic!("Token transfer failed. Ensure sufficient balance"),
                    }

                    // Update internal balances directly
                    match self.execute_deposit(depositor, token_app, amount).await {
                        Ok(_) => AuctionResponse::Ok,
                        Err(_) => panic!("Deposit failed"),
                    }
                } else {
                    // STEP 1 (User Chain): Transfer tokens from user → user's account on AAC chain
                    // This is a CROSS-CHAIN transfer with the SAME OWNER
                    let user_account_on_aac = Account {
                        chain_id: app_params.aac_chain,  // Different chain (AAC)
                        owner: depositor,                 // Same owner
                    };

                    let transfer_operation = FungibleOperation::Transfer {
                        owner: depositor,
                        amount,
                        target_account: user_account_on_aac,
                    };

                    // Call the token application from parameters (no dynamic loading)
                    match self.runtime.call_application(true, token_app, &transfer_operation) {
                        FungibleResponse::Ok => {}
                        _ => panic!("Token transfer failed. Ensure sufficient balance"),
                    }

                    // STEP 2: Send cross-chain message to AAC to complete the deposit
                    let message = AuctionMessage::Deposit {
                        app_token_id,
                        amount
                    };

                    self.runtime
                        .prepare_message(message)
                        .with_authentication()
                        .send_to(app_params.aac_chain);

                    AuctionResponse::Ok
                }
            }

            AuctionOperation::Withdraw { app_token_id, amount, target_chain } => {
                // Validate token is supported
                let token_app = self.validate_supported_token(app_token_id);

                if current_chain == app_params.aac_chain {
                    match self.execute_withdrawal(token_app, amount, target_chain).await {
                        Ok(_remaining_balance) => AuctionResponse::Ok,
                        Err(reason) => {
                            panic!("Withdrawal failed: {}", reason);
                        }
                    }
                } else {
                    // Send token app ID in the message
                    let message = AuctionMessage::Withdraw {
                        app_token_id,
                        amount,
                        target_chain
                    };

                    self.runtime
                        .prepare_message(message)
                        .with_authentication()
                        .send_to(app_params.aac_chain);

                    AuctionResponse::Ok
                }
            }

            AuctionOperation::UploadBlob { data } => {
                use base64::{Engine, engine::general_purpose};

                let bytes = general_purpose::STANDARD
                    .decode(&data)
                    .expect("Invalid base64 data");

                let blob_hash = self.runtime.create_data_blob(bytes);

                AuctionResponse::BlobUploaded(format!("{:?}", blob_hash))
            }

        }
    }

    async fn execute_message(&mut self, message: Self::Message) {
        match message {
            AuctionMessage::CreateAuction { params } => {
                self.handle_create_auction(params.into()).await;
            }

            AuctionMessage::CancelAuction { auction_id } => {
                self.handle_cancel_auction(auction_id).await;
            }

            AuctionMessage::PruneSettledAuction { auction_id } => {
                self.handle_prune_settled_auction(auction_id).await;
            }

            AuctionMessage::Buy { auction_id, quantity } => {
                self.handle_place_bid(auction_id, quantity).await;
            }

            AuctionMessage::ClaimSettlement { auction_id } => {
                self.handle_claim_settlement(auction_id).await;
            }

            AuctionMessage::WithdrawProceed { auction_id } => {
                self.withdraw_auction_proceeds(auction_id).await;
            }

            AuctionMessage::WithdrawUnsoldToken { auction_id } => {
                self.withdraw_auction_unsold_token(auction_id).await;
            }

            AuctionMessage::Deposit { app_token_id, amount } => {
                let depositor = self.runtime.authenticated_signer()
                    .expect("Caller must be authenticated to deposit");

                // Validate token is supported
                let token_app = self.validate_supported_token(app_token_id);

                // STEP 2 (AAC Chain): Transfer tokens from user → app escrow
                // This is a CROSS-OWNER transfer on the SAME CHAIN (AAC)
                let app_escrow_account = Account {
                    chain_id: self.runtime.chain_id(),  // Same chain (AAC)
                    owner: self.runtime.application_id().into(),  // App-owned escrow
                };

                let transfer_operation = FungibleOperation::Transfer {
                    owner: depositor,
                    amount,
                    target_account: app_escrow_account,
                };

                // Call the token application from parameters (no dynamic loading)
                match self.runtime.call_application(true, token_app, &transfer_operation) {
                    FungibleResponse::Ok => {}
                    _ => panic!("Token transfer to escrow failed"),
                }

                // Now update internal balances
                match self.execute_deposit(depositor, token_app, amount).await {
                    Ok(_new_balance) => {
                        // Deposit successful
                    },
                    Err(reason) => {
                        panic!("Deposit failed: {}", reason);
                    }
                }
            }

            AuctionMessage::Withdraw { app_token_id, amount, target_chain } => {
                // Validate token is supported
                let token_app = self.validate_supported_token(app_token_id);

                match self.execute_withdrawal(token_app, amount, target_chain).await {
                    Ok(_remaining_balance) => {
                        // Withdrawal successful
                    },
                    Err(reason) => {
                        panic!("Withdrawal failed: {}", reason);
                    }
                }
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

        // Validate both tokens are supported
        let auction_token_app = self.validate_supported_token(params.auction_token_app);
        let _payment_token_app = self.validate_supported_token(params.payment_token_app);

        // Convert to untyped for state operations
        let auction_token_app_untyped = auction_token_app.forget_abi();

        // Validate creator has deposited auction tokens
        let creator_balance = self.get_balance(user_account, auction_token_app_untyped).await;
        assert!(
            creator_balance >= params.total_supply,
            "Insufficient auction token balance. Have: {}, Need: {}. Please deposit auction tokens first.",
            creator_balance, params.total_supply
        );

        // Lock auction tokens in app escrow
        let app_escrow = self.runtime.application_id().into();
        self.internal_transfer(
            user_account,
            app_escrow,
            auction_token_app_untyped,
            params.total_supply,
            "lock_auction_tokens".to_string(),
        )
        .await
        .expect("Failed to lock auction tokens");

        // Auto-generate auction ID
        let auction_id = *self.state.next_auction_id.get();
        self.state.next_auction_id.set(auction_id + 1);

        // Upload image blob and get hash
        let image_hash = self.upload_image_blob(params.image);

        // Create params with blob hash instead of raw image data
        let params_with_hash = AuctionParams {
            image: image_hash.clone(),
            ..params
        };

        let auction = AuctionData::new(params_with_hash.clone(), self.runtime.system_time());

        self.state.auctions.insert(&auction_id, auction).unwrap();

        // Emit creation event with full params
        let event = AuctionEvent::AuctionCreated {
            auction_id,
            item_name: params_with_hash.item_name.clone(),
            image: image_hash,
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

        AuctionResponse::AuctionCreated(auction_id)
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

        // 2. COLLECT PAYMENT - fail-fast before state changes (via internal transfer)
        let app_escrow = self.runtime.application_id().into();
        if let Err(reason) = self.internal_transfer(
            validation.bidder,
            app_escrow,
            validation.payment_token_app,
            validation.amount_paid,
            "bid".to_string(),
        ).await {
            let event = AuctionEvent::BidRejected {
                auction_id,
                user_account: bidder,
                reason: format!(
                    "Payment failed: {}. Please deposit sufficient payment tokens first.",
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

        AuctionResponse::BidPlaced(auction_id, bid.bid_id)
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
    // Core Balance Management Functions
    // ═══════════════════════════════════════════════════════════

    /// Execute deposit: ONLY way funds enter the application
    /// Called after tokens have been transferred to app escrow
    /// 1. Credit user's internal balance
    /// 2. Update global stats
    /// 3. Emit TokenDeposited event
    ///
    /// NOTE: Before calling this function, tokens must have been transferred:
    /// - User chain: user → user's account on AAC (cross-chain, same owner)
    /// - AAC chain: user → app escrow (cross-owner, same chain)
    async fn execute_deposit(
        &mut self,
        depositor: AccountOwner,
        token_app: ApplicationId<FungibleTokenAbi>,
        amount: Amount,
    ) -> Result<Amount, String> {
        // Tokens have already been transferred to app escrow in the message handler

        // Convert to untyped ApplicationId for state storage
        let token_app_untyped = token_app.forget_abi();

        // 1. Credit user's internal balance
        let current_balance = self.state.user_balances
            .get(&(depositor, token_app_untyped))
            .await
            .map_err(|e| format!("Failed to get balance: {}", e))?
            .unwrap_or(Amount::ZERO);

        let new_balance = current_balance.saturating_add(amount);

        self.state.user_balances
            .insert(&(depositor, token_app_untyped), new_balance)
            .map_err(|e| format!("Failed to update balance: {}", e))?;

        // 2. Update global stats
        let total_dep = self.state.total_deposited
            .get(&token_app_untyped)
            .await
            .map_err(|e| format!("Failed to get total deposited: {}", e))?
            .unwrap_or(Amount::ZERO);

        self.state.total_deposited
            .insert(&token_app_untyped, total_dep.saturating_add(amount))
            .map_err(|e| format!("Failed to update total deposited: {}", e))?;

        // 3. Emit event
        let event = AuctionEvent::TokenDeposited {
            user: depositor,
            token_app: token_app_untyped,
            amount,
            new_balance,
        };
        self.runtime.emit(AUCTION_STREAM.into(), &event);

        Ok(new_balance)
    }

    /// Execute withdrawal: ONLY way funds exit the application
    /// 1. Validate sufficient internal balance
    /// 2. Deduct from user's internal balance
    /// 3. Transfer tokens from app escrow → user account (on target_chain)
    /// 4. Update global stats
    /// 5. Emit TokenWithdrawn event
    async fn execute_withdrawal(
        &mut self,
        token_app: ApplicationId<FungibleTokenAbi>,
        amount: Amount,
        target_chain: ChainId,
    ) -> Result<Amount, String> {
        let withdrawer = self.runtime.authenticated_signer()
            .expect("Caller must be authenticated to withdraw");

        if amount == Amount::ZERO {
            return Err("Withdrawal amount must be greater than zero".to_string());
        }

        // Convert to untyped ApplicationId for state storage
        let token_app_untyped = token_app.forget_abi();

        // 1 & 2. Validate and deduct from internal balance
        let current_balance = self.state.user_balances
            .get(&(withdrawer, token_app_untyped))
            .await
            .map_err(|e| format!("Failed to get balance: {}", e))?
            .unwrap_or(Amount::ZERO);

        if current_balance < amount {
            return Err(format!(
                "Insufficient balance. Have: {}, Need: {}",
                current_balance, amount
            ));
        }

        let remaining_balance = current_balance.saturating_sub(amount);

        self.state.user_balances
            .insert(&(withdrawer, token_app_untyped), remaining_balance)
            .map_err(|e| format!("Failed to update balance: {}", e))?;

        // 3. Transfer tokens from escrow to user on target chain
        let user_account = Account {
            chain_id: target_chain,
            owner: withdrawer,
        };

        let transfer_operation = FungibleOperation::Transfer {
            owner: self.runtime.application_id().into(), // From app escrow
            amount,
            target_account: user_account,
        };

        match self.runtime.call_application(true, token_app, &transfer_operation) {
            FungibleResponse::Ok => {}
            _ => {
                // Rollback balance change
                self.state.user_balances
                    .insert(&(withdrawer, token_app_untyped), current_balance)
                    .map_err(|e| format!("Failed to rollback balance: {}", e))?;
                return Err("Token transfer failed".to_string());
            }
        }

        // 4. Update global stats
        let total_with = self.state.total_withdrawn
            .get(&token_app_untyped)
            .await
            .map_err(|e| format!("Failed to get total withdrawn: {}", e))?
            .unwrap_or(Amount::ZERO);

        self.state.total_withdrawn
            .insert(&token_app_untyped, total_with.saturating_add(amount))
            .map_err(|e| format!("Failed to update total withdrawn: {}", e))?;

        // 5. Emit event
        let event = AuctionEvent::TokenWithdrawn {
            user: withdrawer,
            token_app: token_app_untyped,
            amount,
            remaining_balance,
            target_chain,
        };
        self.runtime.emit(AUCTION_STREAM.into(), &event);

        Ok(remaining_balance)
    }

    /// Internal transfer: ONLY way funds move between accounts
    /// 1. Validate source has sufficient balance
    /// 2. Deduct from source balance
    /// 3. Credit to destination balance
    /// 4. Emit InternalTransfer event with reason
    async fn internal_transfer(
        &mut self,
        from: AccountOwner,
        to: AccountOwner,
        token_app: ApplicationId,
        amount: Amount,
        reason: String,
    ) -> Result<(), String> {
        if amount == Amount::ZERO {
            return Ok(()); // No-op for zero amount
        }

        // 1 & 2. Validate and deduct from source
        let from_balance = self.state.user_balances
            .get(&(from, token_app))
            .await
            .map_err(|e| format!("Failed to get source balance: {}", e))?
            .unwrap_or(Amount::ZERO);

        if from_balance < amount {
            return Err(format!(
                "Insufficient balance for internal transfer. Have: {}, Need: {}",
                from_balance, amount
            ));
        }

        let from_new_balance = from_balance.saturating_sub(amount);

        self.state.user_balances
            .insert(&(from, token_app), from_new_balance)
            .map_err(|e| format!("Failed to deduct from source: {}", e))?;

        // 3. Credit to destination
        let to_balance = self.state.user_balances
            .get(&(to, token_app))
            .await
            .map_err(|e| format!("Failed to get destination balance: {}", e))?
            .unwrap_or(Amount::ZERO);

        let to_new_balance = to_balance.saturating_add(amount);

        self.state.user_balances
            .insert(&(to, token_app), to_new_balance)
            .map_err(|e| format!("Failed to credit to destination: {}", e))?;

        // 4. Emit event
        let event = AuctionEvent::InternalTransfer {
            from,
            to,
            token_app,
            amount,
            reason,
        };
        self.runtime.emit(AUCTION_STREAM.into(), &event);

        Ok(())
    }

    // ═══════════════════════════════════════════════════════════
    // Balance Query Helpers
    // ═══════════════════════════════════════════════════════════

    /// Get balance for a specific user and token
    async fn get_balance(&self, user: AccountOwner, token_app: ApplicationId) -> Amount {
        self.state.user_balances
            .get(&(user, token_app))
            .await
            .ok()
            .flatten()
            .unwrap_or(Amount::ZERO)
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

        let total_cost = Self::amount_mul(claim_data.clearing_price, total_quantity);
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

        // Execute refund transfer (from app escrow to bidder)
        let app_escrow = self.runtime.application_id().into();
        if settlement.refund > Amount::ZERO {
            self.internal_transfer(
                app_escrow,
                user_account,
                claim_data.payment_token_app,
                settlement.refund,
                "settlement_refund".to_string(),
            )
            .await
            .expect("Failed to refund payment");
        }

        // Transfer auction tokens (from app escrow to bidder)
        if settlement.total_quantity > Amount::ZERO {
            self.internal_transfer(
                app_escrow,
                user_account,
                claim_data.auction_token_app,
                settlement.total_quantity,
                "settlement_allocation".to_string(),
            )
            .await
            .expect("Failed to transfer auction tokens");
        }

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
        let now = self.runtime.system_time();

        // 1. Read auction data immutably first
        let auction = match self.state.auctions.get(&auction_id).await {
            Ok(Some(a)) => a,
            Ok(None) => {
                let event = AuctionEvent::BidRejected {
                    auction_id,
                    user_account: bidder,
                    reason: "Auction not found".to_string(),
                };
                self.runtime.emit(AUCTION_STREAM.into(), &event);
                return Err(());
            }
            Err(e) => {
                let event = AuctionEvent::BidRejected {
                    auction_id,
                    user_account: bidder,
                    reason: format!("Failed to load auction: {}", e),
                };
                self.runtime.emit(AUCTION_STREAM.into(), &event);
                return Err(());
            }
        };

        // Extract all needed values before any mutations
        let current_status = auction.status;
        let start_time = auction.params.start_time;
        let end_time = auction.params.end_time;
        let total_supply = auction.total_supply;
        let sold = auction.sold;
        let payment_token_app = auction.params.payment_token_app;
        let max_bid_amount = auction.params.max_bid_amount;
        let start_price = auction.params.start_price;
        let floor_price = auction.params.floor_price;
        let price_decay_amount = auction.params.price_decay_amount;
        let price_decay_interval = auction.params.price_decay_interval;

        // Drop the immutable borrow
        drop(auction);

        // 2. Calculate current price using extracted values
        let current_price = shared::calculate_current_price(
            start_price,
            floor_price,
            price_decay_amount,
            price_decay_interval,
            start_time,
            now,
        );

        // 3. Check time expiration - handle settlement if needed
        if now > end_time && current_status == AuctionStatus::Active {
            // Set clearing price
            if let Ok(Some(auction_mut)) = self.state.auctions.get_mut(&auction_id).await {
                auction_mut.clearing_price = Some(current_price);
            }
            
            // Settle auction (separate mutable borrow)
            self.settle_auction(auction_id).await;

            let event = AuctionEvent::BidRejected {
                auction_id,
                user_account: bidder,
                reason: format!("Auction expired at: {:?}", end_time),
            };
            self.runtime.emit(AUCTION_STREAM.into(), &event);
            return Err(());
        }

        // 4. Validate auction state and handle Scheduled → Active transition
        match current_status {
            AuctionStatus::Scheduled => {
                if now >= start_time {
                    // Transition to Active
                    if let Ok(Some(auction_mut)) = self.state.auctions.get_mut(&auction_id).await {
                        auction_mut.status = AuctionStatus::Active;
                    }
                } else {
                    let event = AuctionEvent::BidRejected {
                        auction_id,
                        user_account: bidder,
                        reason: format!("Auction not started yet. Starts at: {:?}", start_time),
                    };
                    self.runtime.emit(AUCTION_STREAM.into(), &event);
                    return Err(());
                }
            }
            AuctionStatus::Active => {
                // Already active, continue
            }
            _ => {
                let event = AuctionEvent::BidRejected {
                    auction_id,
                    user_account: bidder,
                    reason: format!("Auction not active. Current status: {:?}", current_status),
                };
                self.runtime.emit(AUCTION_STREAM.into(), &event);
                return Err(());
            }
        }

        // 5. Validate supply
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

        let mut accepted_quantity = quantity.min(remaining);

        // 6. Check user's cumulative bid against max_bid_amount
        let user_current_total = self.state.user_totals
            .get(&(auction_id, bidder))
            .await
            .ok()
            .flatten()
            .unwrap_or(Amount::ZERO);

        let new_total = user_current_total.saturating_add(accepted_quantity);

        if new_total > max_bid_amount {
            let allowed = max_bid_amount.saturating_sub(user_current_total);
            accepted_quantity = allowed.min(accepted_quantity);

            if accepted_quantity == Amount::ZERO {
                let event = AuctionEvent::BidRejected {
                    auction_id,
                    user_account: bidder,
                    reason: format!(
                        "Maximum bid amount reached. Your total: {}, Max allowed: {}",
                        user_current_total, max_bid_amount
                    ),
                };
                self.runtime.emit(AUCTION_STREAM.into(), &event);
                return Err(());
            }
        }

        let amount_paid = Self::amount_mul(current_price, accepted_quantity);

        // 7. Check if this bid will exhaust supply
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

    /// Withdraw auction proceeds by auction creator
    async fn withdraw_auction_proceeds(&mut self, auction_id: u64) -> AuctionResponse {
        let creator = self.runtime.authenticated_signer()
            .expect("Caller must be authenticated");
        
        let auction = self.state.auctions.get(&auction_id).await
            .expect("Failed to get auction")
            .expect("Auction not found");
        
        if creator != auction.params.creator {
            panic!("Only Auction creator can withdraw proceeds");
        }

        // both conditions must be checked properly
        if auction.status != AuctionStatus::Settled && auction.status != AuctionStatus::Cancelled {
            panic!("Auction must be settled or cancelled");
        }

        let clearing_price = auction.clearing_price.expect("Clearing price not set");
        let proceeds_amount = Self::amount_mul(auction.sold, clearing_price);
        let payment_token_app = auction.params.payment_token_app;

        // Drop immutable borrow before mutable operations
        drop(auction);

        // Transfer proceeds from app escrow to creator (internal balance)
        let app_escrow = self.runtime.application_id().into();
        self.internal_transfer(
            app_escrow,
            creator,
            payment_token_app,
            proceeds_amount,
            "proceeds".to_string(),
        )
        .await
        .expect("Failed to transfer proceeds to creator");

        AuctionResponse::Ok
    }

    /// Withdraw auction unsold token by auction creator
    async fn withdraw_auction_unsold_token(&mut self, auction_id: u64) -> AuctionResponse {
        let creator = self.runtime.authenticated_signer()
            .expect("Caller must be authenticated");
        
        let auction = self.state.auctions.get(&auction_id).await
            .expect("Failed to get auction")
            .expect("Auction not found");
        
        if creator != auction.params.creator {
            panic!("Only Auction creator can withdraw unsold tokens");
        }

        // Fix: Use && instead of || 
        if auction.status != AuctionStatus::Settled && auction.status != AuctionStatus::Cancelled {
            panic!("Auction must be settled or cancelled");
        }

        let unsold_token = auction.params.total_supply.saturating_sub(auction.sold);

        if unsold_token == Amount::ZERO {
            panic!("No unsold tokens");
        }

        let auction_token_app = auction.params.auction_token_app;

        // Drop immutable borrow before mutable operations
        drop(auction);

        // Transfer unsold tokens from app escrow to creator (internal balance)
        let app_escrow = self.runtime.application_id().into();
        self.internal_transfer(
            app_escrow,
            creator,
            auction_token_app,
            unsold_token,
            "unsold_return".to_string(),
        )
        .await
        .expect("Failed to transfer unsold tokens to creator");

        AuctionResponse::Ok
    }

    // ═══════════════════════════════════════════════════════════
    // Token Application Helpers
    // ═══════════════════════════════════════════════════════════

    fn upload_image_blob(&mut self, image_base64: String) -> String {
        use base64::{Engine, engine::general_purpose};

        let bytes = general_purpose::STANDARD
            .decode(&image_base64)
            .expect("Invalid base64 data");

        let blob_hash = self.runtime.create_data_blob(bytes);

        format!("{:?}", blob_hash)
    }

    /// Validate that a token application is supported
    fn validate_supported_token(&mut self, app_token_id: ApplicationId) -> ApplicationId<FungibleTokenAbi> {
        let supported_tokens = self.runtime.application_parameters().supported_tokens;

        // Find the token in supported_tokens list
        for token in supported_tokens {
            if token.forget_abi() == app_token_id {
                return token;
            }
        }

        panic!(
            "Token {:?} is not in the supported tokens list. Please use a supported token.",
            app_token_id
        );
    }

    /// Multiply two Amount values correctly (price × quantity = cost)
    /// Handles the 18-decimal internal representation
    fn amount_mul(a: Amount, b: Amount) -> Amount {
        const DECIMALS: u128 = 1_000_000_000_000_000_000; // 10^18
        let a_raw: u128 = a.into();
        let b_raw: u128 = b.into();
        let result = a_raw.saturating_mul(b_raw) / DECIMALS;
        Amount::from_attos(result)
    }

}

// ...existing code...

#[cfg(test)]
mod tests {
    use linera_sdk::linera_base_types::Amount;
    use super::AuctionContract;

    #[test]
    fn test_amount_representation() {
        let ten = Amount::from_tokens(10);
        let two = Amount::from_tokens(2);
        
        // Buggy way
        let buggy = ten.saturating_mul(two.into());
        println!("10 * 2 (buggy) = {} raw", Into::<u128>::into(buggy));
        
        // Fixed way
        let fixed = AuctionContract::amount_mul(ten, two);
        println!("10 * 2 (fixed) = {} raw", Into::<u128>::into(fixed));
        
        assert_eq!(fixed, Amount::from_tokens(20));
    }

    #[test]
    fn test_amount_mul_various_cases() {
        // Test: 10 tokens × 1 token = 10 tokens
        let result = AuctionContract::amount_mul(
            Amount::from_tokens(10),
            Amount::from_tokens(1),
        );
        assert_eq!(result, Amount::from_tokens(10));
        println!("10 × 1 = {} tokens ✓", Into::<u128>::into(result) / 1_000_000_000_000_000_000);

        // Test: 5 tokens × 3 tokens = 15 tokens
        let result = AuctionContract::amount_mul(
            Amount::from_tokens(5),
            Amount::from_tokens(3),
        );
        assert_eq!(result, Amount::from_tokens(15));
        println!("5 × 3 = {} tokens ✓", Into::<u128>::into(result) / 1_000_000_000_000_000_000);

        // Test: 100 tokens × 0 tokens = 0 tokens
        let result = AuctionContract::amount_mul(
            Amount::from_tokens(100),
            Amount::ZERO,
        );
        assert_eq!(result, Amount::ZERO);
        println!("100 × 0 = 0 tokens ✓");

        // Test: 1 token × 1 token = 1 token
        let result = AuctionContract::amount_mul(
            Amount::from_tokens(1),
            Amount::from_tokens(1),
        );
        assert_eq!(result, Amount::from_tokens(1));
        println!("1 × 1 = 1 token ✓");
    }

    #[test]
    fn test_internal_transfer_balance_logic() {
        // Simulate the balance arithmetic used in internal_transfer
        let from_balance = Amount::from_tokens(100);
        let transfer_amount = Amount::from_tokens(25);
        let to_balance = Amount::from_tokens(10);

        // Validate sufficient balance
        assert!(from_balance >= transfer_amount, "Insufficient balance");

        // Calculate new balances
        let from_new_balance = from_balance.saturating_sub(transfer_amount);
        let to_new_balance = to_balance.saturating_add(transfer_amount);

        assert_eq!(from_new_balance, Amount::from_tokens(75));
        assert_eq!(to_new_balance, Amount::from_tokens(35));

        println!("From: 100 - 25 = {} tokens ✓", Into::<u128>::into(from_new_balance) / 1_000_000_000_000_000_000);
        println!("To: 10 + 25 = {} tokens ✓", Into::<u128>::into(to_new_balance) / 1_000_000_000_000_000_000);
    }

    #[test]
    fn test_internal_transfer_insufficient_balance() {
        let from_balance = Amount::from_tokens(10);
        let transfer_amount = Amount::from_tokens(25);

        // This should fail validation
        let has_sufficient = from_balance >= transfer_amount;
        assert!(!has_sufficient, "Should detect insufficient balance");

        println!("Correctly detected insufficient balance: have 10, need 25 ✓");
    }

    #[test]
    fn test_bid_payment_calculation() {
        // Simulate a bid: price=10, quantity=2, expected payment=20
        let price = Amount::from_tokens(10);
        let quantity = Amount::from_tokens(2);
        
        let amount_paid = AuctionContract::amount_mul(price, quantity);
        
        assert_eq!(amount_paid, Amount::from_tokens(20));
        println!("Bid payment: {} tokens × {} quantity = {} paid ✓", 
            Into::<u128>::into(price) / 1_000_000_000_000_000_000,
            Into::<u128>::into(quantity) / 1_000_000_000_000_000_000,
            Into::<u128>::into(amount_paid) / 1_000_000_000_000_000_000
        );

        // Simulate balance check
        let user_balance = Amount::from_tokens(50);
        assert!(user_balance >= amount_paid, "User should have enough balance");
        
        let remaining = user_balance.saturating_sub(amount_paid);
        assert_eq!(remaining, Amount::from_tokens(30));
        println!("After bid: 50 - 20 = {} remaining ✓", 
            Into::<u128>::into(remaining) / 1_000_000_000_000_000_000
        );
    }

    #[test]
    fn test_settlement_refund_calculation() {
        // Simulate settlement: paid at higher price, clearing at lower price
        let bid_price = Amount::from_tokens(10);
        let clearing_price = Amount::from_tokens(7);
        let quantity = Amount::from_tokens(5);

        let amount_paid = AuctionContract::amount_mul(bid_price, quantity); // 50
        let total_cost = AuctionContract::amount_mul(clearing_price, quantity); // 35
        let refund = amount_paid.saturating_sub(total_cost); // 15

        assert_eq!(amount_paid, Amount::from_tokens(50));
        assert_eq!(total_cost, Amount::from_tokens(35));
        assert_eq!(refund, Amount::from_tokens(15));

        println!("Paid: {} tokens", Into::<u128>::into(amount_paid) / 1_000_000_000_000_000_000);
        println!("Cost at clearing: {} tokens", Into::<u128>::into(total_cost) / 1_000_000_000_000_000_000);
        println!("Refund: {} tokens ✓", Into::<u128>::into(refund) / 1_000_000_000_000_000_000);
    }
}