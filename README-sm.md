# Fairdrop Smart Contracts

Linera blockchain applications implementing Dutch auction protocol with cross-chain bidding.

---

## Architecture Overview

```
smart-contract/
├── auction/          # Auction Application Chain (AAC)
├── indexer/          # User Interface Chain (UIC)
├── fungible/         # Fungible token implementation
└── shared/           # Common types, events, and utilities
```

### Chain Roles

**Auction Application Chain (AAC)**
- Manages auction lifecycle (creation, bidding, settlement)
- Processes cross-chain bid messages
- Emits auction events to subscribers
- Handles token transfers and refunds

**User Interface Chain (UIC)**
- Subscribes to AAC event stream
- Indexes auction events and bid history
- Provides read-optimized queries for frontend
- Enables efficient data retrieval without querying AAC directly

---

## Modules

### `auction/`
**Core auction application with Dutch (descending-price) mechanism**

**Key Files:**
- `contract.rs` - Auction logic, cross-chain messaging, bid processing
- `service.rs` - GraphQL API (queries & mutations)
- `state.rs` - Auction state management, participant tracking

**Operations:**
- `CreateAuction` - Initialize new auction (AAC only)
- `Buy` - Place bid from any chain (cross-chain)
- `SubscribeToAuction` - Subscribe to event stream
- `ClaimSettlement` - Retrieve settlement results
- `PruneSettledAuction` - Archive completed auctions

**Features:**
- Automated price reduction at intervals
- Uniform clearing price (all buyers pay same price)
- Cross-chain bidding via message passing
- Event-driven state updates
- Settlement with refunds for overbids

---

### `indexer/`
**Event indexer for efficient auction queries**

**Key Files:**
- `contract.rs` - Event subscription and processing
- `service.rs` - GraphQL queries for bid history
- `state.rs` - Indexed auction and bid data

**Purpose:**
- Listens to AAC's event stream (`AUCTION_STREAM`)
- Stores auction history and bid records
- Provides fast queries without AAC dependency
- Tracks bid acceptance/rejection events

**Queries:**
- `auction_summary()` - Get auction overview
- `bid_history()` - Retrieve all bids for an auction
- `user_bids()` - Get specific user's bid history
- `active_auctions()` - List ongoing auctions

---

### `fungible/`
**Fungible token implementation for payments**

**Features:**
- ERC20-like token standard
- Balance tracking and transfers
- Integration with auction contract for bid payments
- Faucet support for test tokens

---

### `shared/`
**Common types and utilities across all applications**

**Modules:**
- `events.rs` - Auction event definitions (`BidAccept`, `BidRejected`, `Settled`)
- `messages.rs` - Cross-chain message types (`PlaceBid`, `SettlementResult`)
- `types.rs` - Core data structures (`AuctionParams`, `BidRecord`, `SettlementResult`)
- `utils.rs` - Helper functions (`calculate_current_price`)

**Exports:**
- `AuctionEvent` - Event stream format
- `AuctionMessage` - Cross-chain messaging
- `AuctionParams` - Auction configuration
- `BidRecord` - Bid tracking structure

---


---

## Cross-Chain Bidding Flow

```
User Chain              AAC Chain              Indexer Chain
    │                      │                        │
    │ Buy(auction_id, qty) │                        │
    ├─────────────────────>│                        │
    │                      │ Process bid            │
    │                      │ Transfer tokens        │
    │                      │ Update state           │
    │                      │                        │
    │                      │ Emit BidAccept Event   │
    │                      ├───────────────────────>│
    │                      │                        │ Store event
    │ SettlementResult     │                        │ Update index
    │<─────────────────────┤                        │
    │                      │                        │
```

---

## Build & Deploy

### Prerequisites
```bash
# Install Linera CLI
cargo install linera-sdk

# Set Rust toolchain
rustup override set 1.85.0
```

### Build
```bash
cd smart-contract

# Build all contracts
cargo build --release --target wasm32-unknown-unknown

# Or build individual modules
cd auction && cargo build --release --target wasm32-unknown-unknown
cd indexer && cargo build --release --target wasm32-unknown-unknown
```

### Deploy Auction Application
```bash
cd auction
linera publish-and-create ...
```

### Deploy Indexer
```bash
cd indexer
linera publish-and-create

# Initialize with AAC details
linera query-node mutation '
  mutation {
    initialize(
      aacChain: "e476187f6ddfeb9d588c7b45d3df334d5501d6499b3f9ad5595cae86cce16a65",
      auctionApp: "e476...cae86cce16a65050000000000000000000000e476"
    )
  }
'
```

---

## Event Stream

### Auction Events
```rust
pub enum AuctionEvent {
    Created {
        auction_id: u64,
        params: AuctionParams,
    },
    BidPlaced {
        auction_id: u64,
        user_chain: ChainId,
        quantity: u64,
    },
    BidAccept {
        auction_id: u64,
        bid_id: String,
        user_chain: ChainId,
        quantity: u64,
        price: String,
    },
    BidRejected {
        auction_id: u64,
        user_chain: ChainId,
        reason: String,
    },
    Settled {
        auction_id: u64,
        final_price: String,
        total_sold: u64,
        reason: ClearReason,
    },
}
```

---

## Testing

```bash
# Run all tests
cargo test
```

---

## Security Considerations

- **Parameter Validation**: Auction params validated on creation
- **Access Control**: Only AAC chain can create auctions
- **Rate Limiting**: Consider implementing bid spam protection
- **Token Safety**: Atomic token transfers with rollback on failure
- **Time Expiration**: Auctions auto-settle at end_time

---

## Performance

**Auction Contract:**
- Bid processing: < 100ms
- Price calculation: O(1)
- Settlement: O(n) where n = number of bids

**Indexer:**
- Event processing: < 50ms
- Query response: < 10ms (indexed)
- Storage: ~1KB per bid record

---

## Version

**Linera SDK:** 0.15.5
**Rust Edition:** 2021
**License:** Apache-2.0

---

*Last Updated: 2025-12-15*
