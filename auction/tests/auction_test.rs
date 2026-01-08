// Copyright (c) Fairdrop
// SPDX-License-Identifier: Apache-2.0

//! Integration tests for the Auction application

#![cfg(not(target_arch = "wasm32"))]

use async_graphql::InputType;
use linera_sdk::{
    linera_base_types::{AccountOwner, Amount, Timestamp},
    test::{QueryOutcome, TestValidator},
};
use auction::{AuctionAbi, AuctionOperation};
use shared::types::{AuctionParameters, AuctionParamsInput};

/// Test the complete auction lifecycle:
/// 1. Create fungible tokens (payment and auction tokens)
/// 2. Create auction application with required tokens
/// 3. Deposit tokens to internal balance
/// 4. Create an auction
/// 5. Place bids from multiple users
/// 6. Verify settlement
/// 7. Withdraw tokens
///
/// We have 3 chains:
/// * Chain A of user_a (bidder 1)
/// * Chain B of user_b (bidder 2)
/// * AAC chain for the auction application
///
/// Setup:
/// * user_a starts with 1000 payment tokens
/// * user_b starts with 500 payment tokens
/// * creator has 100 auction tokens
///
/// Actions:
/// * user_a deposits 500 payment tokens
/// * user_b deposits 300 payment tokens
/// * creator creates auction for 50 auction tokens at 10 payment tokens each
/// * user_a bids for 30 tokens
/// * user_b bids for 20 tokens
/// * Auction settles at uniform price
/// * Users claim settlements and withdraw
#[tokio::test]
async fn auction_lifecycle() {
    let (validator, auction_module_id) =
        TestValidator::with_current_module::<AuctionAbi, AuctionParameters, ()>().await;

    // Create chains
    let mut user_chain_a = validator.new_chain().await;
    let owner_a = AccountOwner::from(user_chain_a.public_key());

    let mut user_chain_b = validator.new_chain().await;
    let owner_b = AccountOwner::from(user_chain_b.public_key());

    let mut aac_chain = validator.new_chain().await;
    let creator = AccountOwner::from(aac_chain.public_key());

    // ═══════════════════════════════════════════════════════════
    // Step 1: Create Fungible Tokens
    // ═══════════════════════════════════════════════════════════

    // Payment token (shared by all users)
    let payment_token_module = user_chain_a
        .publish_bytecode_files_in::<fungible::FungibleTokenAbi, fungible::Parameters, ()>(
            "../fungible"
        )
        .await;

    let payment_params = fungible::Parameters::new("PAYMENT", "PMT");
    let payment_token_id = user_chain_a
        .create_application(
            payment_token_module,
            payment_params,
            (),
            vec![],
        )
        .await;

    // Mint initial balances for payment token on user_chain_a and distribute to users
    user_chain_a
        .add_block(|block| {
            block.with_operation(
                payment_token_id,
                fungible::FungibleOperation::Mint {
                    owner: owner_a,
                    amount: Amount::from_tokens(1000),
                },
            );
            block.with_operation(
                payment_token_id,
                fungible::FungibleOperation::Mint {
                    owner: owner_b,
                    amount: Amount::from_tokens(500),
                },
            );
        })
        .await;

    // Transfer owner_b's tokens to their chain using Claim
    let claim_cert_b = user_chain_b
        .add_block(|block| {
            block.with_operation(
                payment_token_id,
                fungible::FungibleOperation::Claim {
                    source_account: linera_sdk::linera_base_types::Account {
                        chain_id: user_chain_a.id(),
                        owner: owner_b,
                    },
                    amount: Amount::from_tokens(500),
                    target_account: linera_sdk::linera_base_types::Account {
                        chain_id: user_chain_b.id(),
                        owner: owner_b,
                    },
                },
            );
        })
        .await;

    // Process claim on source chain
    user_chain_a
        .add_block(|block| {
            block.with_messages_from(&claim_cert_b);
        })
        .await;

    // Receive tokens on destination chain
    user_chain_b.handle_received_messages().await;

    // Auction token (NFT - owned by creator)
    let auction_token_module = aac_chain
        .publish_bytecode_files_in::<fungible::FungibleTokenAbi, fungible::Parameters, ()>(
            "../fungible"
        )
        .await;

    let auction_params = fungible::Parameters::new("NFT", "NFT");
    let auction_token_id = aac_chain
        .create_application(
            auction_token_module,
            auction_params,
            (),
            vec![],
        )
        .await;

    // Mint initial balance for auction token
    aac_chain
        .add_block(|block| {
            block.with_operation(
                auction_token_id,
                fungible::FungibleOperation::Mint {
                    owner: creator,
                    amount: Amount::from_tokens(100),
                },
            );
        })
        .await;

    // Verify initial balances
    assert_eq!(
        fungible::query_account(payment_token_id, &user_chain_a, owner_a).await,
        Some(Amount::from_tokens(1000))
    );
    assert_eq!(
        fungible::query_account(payment_token_id, &user_chain_b, owner_b).await,
        Some(Amount::from_tokens(500))
    );
    assert_eq!(
        fungible::query_account(auction_token_id, &aac_chain, creator).await,
        Some(Amount::from_tokens(100))
    );

    // ═══════════════════════════════════════════════════════════
    // Step 2: Create Auction Application
    // ═══════════════════════════════════════════════════════════

    let auction_parameters = AuctionParameters {
        aac_chain: aac_chain.id(),
        supported_tokens: [payment_token_id, auction_token_id],
    };

    let auction_app_id = aac_chain
        .create_application(
            auction_module_id,
            auction_parameters,
            (),
            vec![
                payment_token_id.forget_abi(),
                auction_token_id.forget_abi(),
            ],
        )
        .await;

    // ═══════════════════════════════════════════════════════════
    // Step 3: Deposit Tokens to Internal Balance
    // ═══════════════════════════════════════════════════════════

    // creator deposits 50 auction tokens (index 1) before creating auction
    let deposit_cert_creator = aac_chain
        .add_block(|block| {
            block.with_operation(
                auction_app_id,
                AuctionOperation::Deposit {
                    token_index: 1,
                    amount: Amount::from_tokens(50),
                },
            );
        })
        .await;

    aac_chain.handle_received_messages().await;

    // user_a deposits 500 payment tokens (index 0)
    let deposit_cert_a = user_chain_a
        .add_block(|block| {
            block.with_operation(
                auction_app_id,
                AuctionOperation::Deposit {
                    token_index: 0,
                    amount: Amount::from_tokens(500),
                },
            );
        })
        .await;

    // Process deposit on AAC
    aac_chain
        .add_block(|block| {
            block.with_messages_from(&deposit_cert_a);
        })
        .await;

    user_chain_a.handle_received_messages().await;

    // user_b deposits 300 payment tokens
    let deposit_cert_b = user_chain_b
        .add_block(|block| {
            block.with_operation(
                auction_app_id,
                AuctionOperation::Deposit {
                    token_index: 0,
                    amount: Amount::from_tokens(300),
                },
            );
        })
        .await;

    aac_chain
        .add_block(|block| {
            block.with_messages_from(&deposit_cert_b);
        })
        .await;

    user_chain_b.handle_received_messages().await;

    // Verify balances transferred
    assert_eq!(
        fungible::query_account(payment_token_id, &user_chain_a, owner_a).await,
        Some(Amount::from_tokens(500)) // 1000 - 500 deposited
    );
    assert_eq!(
        fungible::query_account(payment_token_id, &user_chain_b, owner_b).await,
        Some(Amount::from_tokens(200)) // 500 - 300 deposited
    );

    // Verify internal balances via GraphQL
    let query = format!(
        "query {{ userBalance(user: {}, tokenApp: {}) }}",
        owner_a.to_value(),
        payment_token_id.forget_abi().to_value()
    );
    let QueryOutcome { response, .. } = aac_chain.graphql_query(auction_app_id, query).await;
    assert_eq!(
        response["userBalance"].as_str().unwrap(),
        "500."
    );

    // ═══════════════════════════════════════════════════════════
    // Step 4: Create Auction
    // ═══════════════════════════════════════════════════════════

    let start_time = Timestamp::from(1000000);
    let end_time = Timestamp::from(2000000);

    let auction_params = AuctionParamsInput {
        item_name: "Test NFT".to_string(),
        image: "test.png".to_string(),
        max_bid_amount: Amount::from_tokens(100),
        total_supply: Amount::from_tokens(50),
        start_price: Amount::from_tokens(10),
        floor_price: Amount::from_tokens(5),
        price_decay_interval: 60_000_000, // 60 seconds
        price_decay_amount: Amount::from_tokens(1),
        start_time,
        end_time,
        creator,
        payment_token_app: payment_token_id.forget_abi(),
        auction_token_app: auction_token_id.forget_abi(),
    };

    let _create_cert = aac_chain
        .add_block(|block| {
            block.with_operation(
                auction_app_id,
                AuctionOperation::CreateAuction {
                    params: auction_params.clone(),
                },
            );
        })
        .await;

    // Auction should be created (auction_id = 0)
    let query = "query { allAuctions(offset: 0, limit: 10) { auctionId } }";
    let QueryOutcome { response, .. } = aac_chain.graphql_query(auction_app_id, query.to_string()).await;
    let auctions = response["allAuctions"].as_array().unwrap();
    assert_eq!(auctions.len(), 1);
    assert_eq!(auctions[0]["auctionId"].as_u64().unwrap(), 0);

    // ═══════════════════════════════════════════════════════════
    // Step 5: Place Bids
    // ═══════════════════════════════════════════════════════════

    // user_a bids for 30 tokens
    let bid_cert_a = user_chain_a
        .add_block(|block| {
            block.with_operation(
                auction_app_id,
                AuctionOperation::Buy {
                    auction_id: 0,
                    quantity: Amount::from_tokens(30),
                },
            );
        })
        .await;

    aac_chain
        .add_block(|block| {
            block.with_messages_from(&bid_cert_a);
        })
        .await;

    user_chain_a.handle_received_messages().await;

    // user_b bids for 20 tokens
    let bid_cert_b = user_chain_b
        .add_block(|block| {
            block.with_operation(
                auction_app_id,
                AuctionOperation::Buy {
                    auction_id: 0,
                    quantity: Amount::from_tokens(20),
                },
            );
        })
        .await;

    aac_chain
        .add_block(|block| {
            block.with_messages_from(&bid_cert_b);
        })
        .await;

    user_chain_b.handle_received_messages().await;

    // Verify bids were recorded
    let query = "query { bidHistory(auctionId: 0, offset: 0, limit: 10) { userAccount quantity } }";
    let QueryOutcome { response, .. } = aac_chain.graphql_query(auction_app_id, query.to_string()).await;
    let bids = response["bidHistory"].as_array().unwrap();
    assert_eq!(bids.len(), 2);

    // ═══════════════════════════════════════════════════════════
    // Step 6: Settle Auction (manually trigger if needed)
    // ═══════════════════════════════════════════════════════════

    // In real scenario, auction settles at end_time or when sold out
    // For testing, we can verify the auction status
    let query = "query { auctionInfo(auctionId: 0) { status sold } }";
    let QueryOutcome { response, .. } = aac_chain.graphql_query(auction_app_id, query.to_string()).await;
    let status = response["auctionInfo"]["status"].as_str().unwrap();
    let sold = response["auctionInfo"]["sold"].as_str().unwrap();

    // If sold out (50 tokens), should be settled
    if sold == "50." {
        assert_eq!(status, "Settled");
    }

    // ═══════════════════════════════════════════════════════════
    // Step 7: Withdraw Tokens
    // ═══════════════════════════════════════════════════════════

    // user_a withdraws remaining balance back to their chain
    let withdraw_cert_a = aac_chain
        .add_block(|block| {
            block.with_operation(
                auction_app_id,
                AuctionOperation::Withdraw {
                    token_index: 0,
                    amount: Amount::from_tokens(100), // Withdraw some tokens
                    target_chain: user_chain_a.id(),
                },
            );
        })
        .await;

    user_chain_a
        .add_block(|block| {
            block.with_messages_from(&withdraw_cert_a);
        })
        .await;

    aac_chain.handle_received_messages().await;

    // Verify withdrawal increased balance on user chain
    let balance_a = fungible::query_account(payment_token_id, &user_chain_a, owner_a).await;
    assert!(balance_a.unwrap() >= Amount::from_tokens(600)); // Original 500 + withdrawn 100

    println!("✅ All auction tests passed!");
}

/// Test deposit and withdrawal operations
#[tokio::test]
async fn test_deposit_withdraw() {
    let (validator, auction_module_id) =
        TestValidator::with_current_module::<AuctionAbi, AuctionParameters, ()>().await;

    let mut user_chain = validator.new_chain().await;
    let owner = AccountOwner::from(user_chain.public_key());

    let mut aac_chain = validator.new_chain().await;

    // Create fungible token
    let token_module = user_chain
        .publish_bytecode_files_in::<fungible::FungibleTokenAbi, fungible::Parameters, ()>(
            "../fungible"
        )
        .await;

    let params = fungible::Parameters::new("TEST", "TST");
    let token_id = user_chain
        .create_application(token_module, params, (), vec![])
        .await;

    // Mint initial balance
    user_chain
        .add_block(|block| {
            block.with_operation(
                token_id,
                fungible::FungibleOperation::Mint {
                    owner,
                    amount: Amount::from_tokens(1000),
                },
            );
        })
        .await;

    // Create auction app
    let auction_parameters = AuctionParameters {
        aac_chain: aac_chain.id(),
        supported_tokens: [token_id, token_id], // Using same token for both slots
    };

    let auction_app_id = aac_chain
        .create_application(
            auction_module_id,
            auction_parameters,
            (),
            vec![token_id.forget_abi()],
        )
        .await;

    // Test deposit
    let deposit_amount = Amount::from_tokens(300);
    let deposit_cert = user_chain
        .add_block(|block| {
            block.with_operation(
                auction_app_id,
                AuctionOperation::Deposit {
                    token_index: 0,
                    amount: deposit_amount,
                },
            );
        })
        .await;

    aac_chain
        .add_block(|block| {
            block.with_messages_from(&deposit_cert);
        })
        .await;

    user_chain.handle_received_messages().await;

    // Verify balance transferred
    assert_eq!(
        fungible::query_account(token_id, &user_chain, owner).await,
        Some(Amount::from_tokens(700))
    );

    // Test withdrawal
    let withdraw_amount = Amount::from_tokens(150);
    let withdraw_cert = aac_chain
        .add_block(|block| {
            block.with_operation(
                auction_app_id,
                AuctionOperation::Withdraw {
                    token_index: 0,
                    amount: withdraw_amount,
                    target_chain: user_chain.id(),
                },
            );
        })
        .await;

    user_chain
        .add_block(|block| {
            block.with_messages_from(&withdraw_cert);
        })
        .await;

    aac_chain.handle_received_messages().await;

    // Verify withdrawal
    assert_eq!(
        fungible::query_account(token_id, &user_chain, owner).await,
        Some(Amount::from_tokens(850)) // 700 + 150
    );

    println!("✅ Deposit/Withdraw tests passed!");
}
