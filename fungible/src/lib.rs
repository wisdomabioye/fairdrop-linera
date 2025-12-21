use async_graphql::{Request, Response, scalar};
use linera_sdk::{
    graphql::GraphQLMutationRoot,
    linera_base_types::{Account, AccountOwner, Amount, ContractAbi, ServiceAbi},
};
use serde::{Deserialize, Serialize};

/// ABI for the Fungible Token Faucet Application
pub struct FungibleTokenAbi;

impl ContractAbi for FungibleTokenAbi {
    type Operation = FungibleOperation;
    type Response = FungibleResponse;
}

impl ServiceAbi for FungibleTokenAbi {
    type Query = Request;
    type QueryResponse = Response;
}

/// Parameters for the fungible token (name and symbol)
#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Parameters {
    pub name: String,
    pub symbol: String,
}

impl Parameters {
    pub fn new(name: impl Into<String>, symbol: impl Into<String>) -> Self {
        Self {
            name: name.into(),
            symbol: symbol.into(),
        }
    }
}


/// Operations that can be performed on the fungible token
#[derive(Debug, Deserialize, Serialize, GraphQLMutationRoot)]
pub enum FungibleOperation {
    /// Mint tokens to an account (faucet functionality - no permission check)
    Mint {
        owner: AccountOwner,
        amount: Amount,
    },

    /// Transfer tokens to another account
    Transfer {
        owner: AccountOwner,
        amount: Amount,
        target_account: Account,
    },

    /// Transfer tokens from an owner's account using an allowance
    TransferFrom {
        owner: AccountOwner,
        spender: AccountOwner,
        amount: Amount,
        target_account: Account,
    },

    /// Approve a spender to use tokens from the owner's account
    Approve {
        owner: AccountOwner,
        spender: AccountOwner,
        allowance: Amount,
    },

    /// Query the balance of an account
    Balance {
        owner: AccountOwner,
    },

    /// Query the ticker symbol
    TickerSymbol,

    /// Query the token name
    TokenName,

    /// Claim tokens from another chain
    Claim {
        source_account: Account,
        amount: Amount,
        target_account: Account,
    },
}

/// Responses from operations
#[derive(Debug, Deserialize, Serialize)]
pub enum FungibleResponse {
    Ok,
    Balance(Amount),
    TickerSymbol(String),
    TokenName(String),
}

/// Messages for cross-chain communication
#[derive(Debug, Deserialize, Serialize)]
pub enum Message {
    /// Credits the target account, or source if bouncing
    Credit {
        target: AccountOwner,
        amount: Amount,
        source: AccountOwner,
    },

    /// Withdraws from an account and transfers to target
    Withdraw {
        owner: AccountOwner,
        amount: Amount,
        target_account: Account,
    },
}

/// Owner-Spender pair for allowances
#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq, Hash)]
pub struct OwnerSpender {
    pub owner: AccountOwner,
    pub spender: AccountOwner,
}

scalar!(OwnerSpender);

impl OwnerSpender {
    pub fn new(owner: AccountOwner, spender: AccountOwner) -> Self {
        if owner == spender {
            panic!("owner should be different from spender");
        }
        Self { owner, spender }
    }
}
