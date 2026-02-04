# Fairdrop

A decentralized, transparent Dutch auction protocol on Linera blockchain. Uniform clearing price ensures every participant pays the same fair market-driven price.

## Quick Links
- 📄 [Full Whitepaper](./FAIRDROP.md)

---

## How It Works

**Dutch Auction**: Price starts high and decreases at intervals until all items are sold or auction ends. All winners pay the same clearing price.

**Internal Balance System**: Users deposit tokens to the Auction Authority Chain (AAC), bid using internal balances, and withdraw to any chain.

---

## Core Features

- **Descending Price Mechanism** - Automated price reduction at preset intervals
- **Uniform Clearing** - All participants pay the same final clearing price
- **Cross-Chain Bidding** - Bid from any chain via message passing
- **Real-Time Updates** - Live auction state via event streaming
- **Token Integration** - Built on Linera's fungible token standard
- **Smart Polling** - Efficient 30s intervals with tab visibility optimization

---

## Architecture

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│ User Chain  │────────▶│  AAC Chain  │────────▶│   Indexer   │
│  (Any)      │  Bids   │  (Auction)  │ Events  │  (Query)    │
└─────────────┘         └─────────────┘         └─────────────┘
```

**Components:**
- **Auction App (AAC)**: Manages auctions, processes bids, handles deposits/withdrawals
- **Indexer**: Subscribes to events, provides fast queries for frontend
- **Fungible Tokens**: Payment tokens (registered at deployment)

---

## Key Features

### Token Operations (Index-Based)
- **Deposit**: Transfer tokens from user chain → AAC internal balance
- **Withdraw**: Transfer from AAC balance → target chain
- **Internal Transfers**: Used for bidding and settlements

### Auction Lifecycle
1. **Create** auction on AAC with payment/auction tokens
2. **Bid** from any chain using internal balance
3. **Settle** at end time or when sold out (uniform clearing price)
4. **Claim** won items or refunds

### Cross-Chain
- Deposit from any chain
- Withdraw to any chain
- Bid from any chain
- Automatic message routing

---

## Build & Deploy 

### Build
```bash
cargo build --release --target wasm32-unknown-unknown
```

### Deploy Auction Application (On Conway Testnet)

**⚠️ Critical**: To deploy on a different network other than Conway, we must run `sh deploy-tokens.sh` to deploy supported tokens then update `supported_tokens` and `aac_chain` in `json-parameter.json` for auction and token operations to work. We can now deploy the auction application like so:

```bash
sh deploy-auction.sh
```

## Module Structure

```
auction/
├── src/
│   ├── contract.rs   # Auction logic, deposit/withdraw, cross-chain messaging
│   ├── service.rs    # GraphQL API (queries, mutations)
│   └── state.rs      # Auction state, user balances, bid tracking
└── Cargo.toml

indexer/
├── src/
│   ├── contract.rs   # Event subscription, processing
│   ├── service.rs    # GraphQL queries (read-only)
│   └── state.rs      # Indexed data storage
└── Cargo.toml

shared/
└── src/
    ├── events.rs     # AuctionEvent definitions
    ├── messages.rs   # Cross-chain messages
    └── types.rs      # AuctionParams, BidRecord, etc.
```

---

## Testing

```bash
cargo test --package auction
cargo test --package indexer
```

---

## Requirements

- **Linera SDK**: 0.15.11+
- **Rust**: 1.86.0+
- **Target**: wasm32-unknown-unknown

### Frontend Stack
- **Next.js 16** + **React 19** + **TypeScript**
- **Tailwind CSS 4** for styling
- **linera-react-client** for blockchain integration

---

## Development Progress

### ✅ Completed Features

- ✅ **Direct Chain Query** - AAC & UIC state queries (`smart-contract/auction/src/`)
- ✅ **Indexer** - Event tracking Auction and bid history (`smart-contract/indexer/`)
- ✅ **Faucet** - Test token distribution with enhanced UI/UX
- ✅ **Syncing Status** - Real-time wallet sync indicators
- ✅ **Auction Creation** - Dutch auction initialization
- ✅ **Bid Placement** - Cross-chain bidding mechanism
- ✅ **Bid Settlement** - Uniform clearing price calculation
- ✅ **Payment Token Integration** - Linera fungible token support

### 🎯 Next Milestone

**NFT Support & Marketplace Features**
- NFT auction integration with Linera NFT standard
- Discovery features (search, filtering, categories)
- Multi-asset auction support (bundles, mixed assets)
- Introduce analytics dashboard with real-time metrics

---

## Roadmap Excerpt

| Phase | Focus | Key Features |
|-------|-------|-------------|
| **Phase 1: MVP** (Q1 2026) | Smart contract deployment | ✅ Core auction logic<br>✅ Frontend launch<br>🔄 Cross-chain optimization |
| **Phase 2: Ecosystem** (Q2 2026) | NFT & Token Integration | NFT marketplace support<br>Multi-asset auctions<br>Discovery features |
| **Phase 3: Governance** (Q3 2026) | DAO Structure | Community voting<br>Protocol upgrades<br>Treasury management |
| **Phase 4: Analytics** (Q4 2026) | AI Optimization | Price prediction<br>Demand forecasting<br>Sentiment analysis |
| **Phase 5: Scale** (2027+) | Global Expansion | Multi-chain support<br>Fiat integration<br>Enterprise solutions |

📖 **[Read full roadmap in FAIRDROP.md](./FAIRDROP.md#6-roadmap)**

---

## Contact

📧 xpldevelopers@gmail.com
🌐 www.fairdrop.io *(coming soon)*
🔗 [Smart Contract Repo](https://github.com/wisdomabioye/fairdrop-smart-contract)
📦 [React Client Library](https://github.com/wisdomabioye/linera-react-client)

---

*Last Updated: 2026-01-08*
