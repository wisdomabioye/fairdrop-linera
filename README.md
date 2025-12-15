# Fairdrop

A decentralized, transparent Dutch auction protocol on Linera blockchain. Uniform clearing price ensures every participant pays the same fair market-driven price.

## Quick Links
- 📄 [Full Whitepaper](./FAIRDROP.md)

---

## Project Structure

```
fairdrop/
├── smart-contract/
│   ├── auction/              # Core auction application (AAC)
│   │   └── src/
│   │       ├── contract.rs   # Auction logic & cross-chain messaging
│   │       ├── service.rs    # GraphQL queries & mutations
│   │       └── state.rs      # Auction state management
│   │
│   └── indexer/              # User Interface Chain (UIC)
│       └── src/              # Event indexing & bid history tracking
│
└── frontend/
    ├── app-pages/            # Next.js pages (landing, auctions, faucet)
    ├── components/           # React components
    │   ├── auction/          # Auction cards, timers, bid forms
    │   ├── faucet/           # Token faucet UI (enhanced)
    │   └── wallet/           # Wallet connection & menu
    ├── hooks/                # Custom React hooks
    ├── providers/            # Context providers (Linera, sync status)
    └── lib/                  # Utilities (polling, deduplication, formatting)
```

### Smart Contract Architecture
- **auction/** - Auction Application Chain (AAC) handling auction creation, bidding, and settlement
- **indexer/** - User Interface Chain (UIC) for querying auction state and bid history

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

## Getting Started

### Prerequisites
- Node.js 18+
- Rust & Cargo
- Linera CLI tools

### Installation

```bash
# Clone the repository
git clone https://github.com/wisdomabioye/fairdrop.git
cd fairdrop

# Install frontend dependencies
cd frontend
npm install

# Run development server
npm run dev
```

### Deploy Smart Contracts

```bash
cd smart-contract/auction
linera project publish-and-create
```

---

## Core Features

- **Descending Price Mechanism** - Automated price reduction at preset intervals
- **Uniform Clearing** - All participants pay the same final clearing price
- **Cross-Chain Bidding** - Bid from any chain via message passing
- **Real-Time Updates** - Live auction state via event streaming
- **Token Integration** - Built on Linera's fungible token standard
- **Smart Polling** - Efficient 30s intervals with tab visibility optimization

---

## Contact

📧 xpldevelopers@gmail.com
🌐 www.fairdrop.io *(coming soon)*
🔗 [Smart Contract Repo](https://github.com/wisdomabioye/fairdrop-smart-contract)
📦 [React Client Library](https://github.com/wisdomabioye/linera-react-client)

---

*Last Updated: 2025-12-15*
