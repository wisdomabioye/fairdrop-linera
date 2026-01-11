#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use std::sync::Arc;

use async_graphql::{EmptySubscription, Object, Request, Response, Schema};
use fungible::{FungibleOperation, OwnerSpender, Parameters};
use linera_sdk::{
    graphql::GraphQLMutationRoot,
    linera_base_types::{AccountOwner, Amount, WithServiceAbi},
    views::{MapView, View},
    Service, ServiceRuntime,
};

use self::state::FungibleTokenState;

#[derive(Clone)]
pub struct FungibleTokenService {
    state: Arc<FungibleTokenState>,
    runtime: Arc<ServiceRuntime<Self>>,
}

linera_sdk::service!(FungibleTokenService);

impl WithServiceAbi for FungibleTokenService {
    type Abi = fungible::FungibleTokenAbi;
}

impl Service for FungibleTokenService {
    type Parameters = Parameters;

    async fn new(runtime: ServiceRuntime<Self>) -> Self {
        let state = FungibleTokenState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        FungibleTokenService {
            state: Arc::new(state),
            runtime: Arc::new(runtime),
        }
    }

    async fn handle_query(&self, request: Request) -> Response {
        let schema = Schema::build(
            self.clone(),
            FungibleOperation::mutation_root(self.runtime.clone()),
            EmptySubscription,
        )
        .finish();
        schema.execute(request).await
    }
}

#[Object]
impl FungibleTokenService {
    /// Get all account balances
    async fn accounts(&self) -> &MapView<AccountOwner, Amount> {
        &self.state.accounts
    }

    /// Get balance for a single address
    async fn balance(&self, owner: AccountOwner) -> Result<Amount, async_graphql::Error> {
        match self.state.accounts.get(&owner).await {
            Ok(Some(amount)) => Ok(amount),
            Ok(None) => Ok(Amount::ZERO),
            Err(e) => Err(async_graphql::Error::new(format!("Failed to fetch balance: {}", e))),
        }
    }

    /// Get all allowances
    async fn allowances(&self) -> &MapView<OwnerSpender, Amount> {
        &self.state.allowances
    }

    /// Get allowance for a specific owner-spender pair
    async fn allowance(&self, owner: AccountOwner, spender: AccountOwner) -> Result<Amount, async_graphql::Error> {
        let owner_spender = OwnerSpender { owner, spender };
        match self.state.allowances.get(&owner_spender).await {
            Ok(Some(amount)) => Ok(amount),
            Ok(None) => Ok(Amount::ZERO),
            Err(e) => Err(async_graphql::Error::new(format!("Failed to fetch allowance: {}", e))),
        }
    }

    /// Get the ticker symbol
    async fn ticker_symbol(&self) -> Result<String, async_graphql::Error> {
        Ok(self.runtime.application_parameters().symbol)
    }

    /// Get the token name
    async fn token_name(&self) -> Result<String, async_graphql::Error> {
        Ok(self.runtime.application_parameters().name)
    }
}
