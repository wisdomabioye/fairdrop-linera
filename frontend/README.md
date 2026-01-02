# Fairdrop Frontend

Modern web interface for Fairdrop Dutch auction protocol on Linera blockchain.

---

## Tech Stack

- **Next.js 16** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS 4** - Styling
- **linera-react-client** - Blockchain integration
- **Zustand** - State management

---

## Project Structure

```
frontend/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout with providers
│   └── page.tsx           # Landing page
│
├── app-pages/             # Page components
│   ├── auction/           # Auction listing & details
│   ├── faucet/            # Token faucet page
│   └── my-auctions/       # User's auction dashboard
│
├── components/
│   ├── auction/           # Auction UI components
│   │   ├── auction-card.tsx
│   │   ├── bid-form.tsx
│   │   └── price-display.tsx
│   │
│   ├── faucet/            # Enhanced faucet components
│   │   ├── faucet-form-enhanced.tsx
│   │   ├── amount-presets.tsx
│   │   ├── balance-card.tsx
│   │   ├── mint-history.tsx
│   │   ├── success-overlay.tsx
│   │   ├── token-selector.tsx
│   │   └── unified-status-bar.tsx
│   │
│   ├── wallet/            # Wallet integration
│   │   ├── wallet-connect.tsx
│   │   ├── wallet-menu.tsx
│   │   └── wallet-selection-dialog.tsx
│   │
│   ├── layout/            # Layout components
│   │   ├── header.tsx
│   │   └── footer.tsx
│   │
│   └── ui/                # Reusable UI primitives
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       └── ...
│
├── hooks/                 # Custom React hooks
│   ├── useFungibleQuery.ts
│   ├── useFungibleMutations.ts
│   └── useAuctionQuery.ts
│
├── providers/             # Context providers
│   ├── linera-provider.tsx
│   └── sync-provider.tsx
│
├── store/                 # Zustand stores
│   └── auction-store.ts
│
├── lib/
│   ├── utils/             # Utility functions
│   │   ├── polling-manager.ts
│   │   ├── query-deduplicator.ts
│   │   └── batch-fetcher.ts
│   │
│   └── gql/               # GraphQL queries
│       ├── queries.ts
│       └── types.ts
│
└── config/                # Configuration
    ├── app.route.ts
    ├── app.wallets.ts
    └── app.token-store.ts
```

---

## Key Features

### 📊 Auction Features
- **Live Auctions**: Real-time price updates and countdown
- **Bid Placement**: Cross-chain bidding with instant feedback
- **Auction Cards**: Rich auction display with status indicators
- **Price Visualization**: Dynamic price charts and current price display

### 🎨 Enhanced Faucet
- **Smart Polling**: 30s intervals, pauses when tab inactive
- **Optimistic Updates**: Instant UI feedback before blockchain confirmation
- **Success Animations**: Celebration overlay on successful mint
- **Transaction History**: Last 10 mints with timestamps
- **Unified Status Bar**: Single status indicator for all states
- **Enhanced Token Selector**: Better padding, gradient icons, popular badges
- **Performance Optimized**: Query deduplication, prevents queries during sync

### 💰 Wallet Integration
- **Wallet Menu**: Dropdown with sync status, address, chain ID
- **Copy Functionality**: One-click copy for address and chain ID
- **My Auctions Link**: Quick access to user's auction dashboard
- **Real-time Sync Status**: Visual indicators when wallet is syncing
- **Multi-wallet Support**: MetaMask with extensibility for others

---

## Getting Started

### Prerequisites
```bash
node >= 18.0.0
npm >= 9.0.0
```

### Installation
```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
```

### Environment Variables
```env
NEXT_PUBLIC_FAUCET_URL=http://localhost:8080
NEXT_PUBLIC_AAC_APP=your-auction-app-id
NEXT_PUBLIC_INDEXER_APP=your-indexer-app-id
NEXT_PUBLIC_INDEXER_CHAIN_ID=indexer-chain-id
NEXT_PUBLIC_AAC_CHAIN=auction-chain-id
```

### Development
```bash
# Start development server
npm run dev

# Open http://localhost:3000
```

### Build
```bash
# Type check
npm run type-check

# Production build
npm run build

# Start production server
npm start
```

---

## Performance Optimizations

### Smart Polling System
```typescript
// polling-manager.ts
- Singleton pattern for efficient resource usage
- Reference counting (starts/stops based on subscribers)
- Adaptive polling (pauses when tab inactive)
- Automatic cleanup on unmount
```

### Query Deduplication
```typescript
// query-deduplicator.ts
- Prevents duplicate concurrent requests
- Shares results across components
- Reduces network overhead
```

### Optimistic UI Updates
```typescript
// Immediate feedback without waiting for blockchain
setOptimisticBalance(currentBalance + mintAmount);
await mint(address, amount);
```

---

## Custom Hooks

### `useFungibleQuery`
Query fungible token data with smart polling and deduplication.

```typescript
const {
  accounts,
  accountsLoading,
  fetchAccounts,
  getAccountBalance,
} = useFungibleQuery({
  fungibleApp: app,
  autoFetch: true,
  pollingInterval: 30000, // 30s
  appId: tokenId,
  isWalletSyncing: false,
});
```

**Features:**
- Query deduplication via `QueryDeduplicator`
- Smart polling via `PollingManager`
- Skips queries during wallet sync
- Case-insensitive address matching
- Memoized callbacks to prevent infinite loops

### `useFungibleMutations`
Handle token mutations (mint, transfer, etc.).

```typescript
const { mint, isMinting, mintError } = useFungibleMutations({
  fungibleApp: app,
  onMintSuccess: () => {
    toast.success('Tokens minted!');
    fetchAccounts(); // Refresh balance
  },
});
```

### `useSyncStatus`
Access real-time wallet sync status.

```typescript
const { isWalletClientSyncing, isPublicClientSyncing } = useSyncStatus();
```

---

## Component Architecture

### Reusable Faucet Components

**`<UnifiedStatusBar />`**
- Shows syncing, loading, minting, error, or ready state
- Auto-hides when status is ready
- Color-coded with appropriate icons

**`<AmountPresets />`**
- Large, tactile preset buttons (100, 500, 1000, 5000)
- Icons and labels for each preset
- "Recommended" and "Popular" badges
- Pulse animation on selected

**`<BalanceCard />`**
- Animated balance display with count-up effect
- Shows optimistic updates during minting
- Loading spinner during fetch

**`<MintHistory />`**
- Last 10 mints with relative timestamps
- Expandable/collapsible
- Latest badge on most recent mint

**`<SuccessOverlay />`**
- Full-screen celebration on successful mint
- Auto-dismisses after 3 seconds
- Decorative animations

**`<TokenSelector />`**
- Enhanced dropdown with better padding
- Gradient token icons
- Popular badges for featured tokens
- Chain ID preview

---

## State Management

### Zustand Store
```typescript
// store/auction-store.ts
const useAuctionStore = create((set) => ({
  auctions: [],
  selectedAuction: null,
  setAuctions: (auctions) => set({ auctions }),
  selectAuction: (id) => set({ selectedAuction: id }),
}));
```

### Context Providers
- **LineraProvider**: Blockchain connection and client management
- **SyncProvider**: Wallet sync status tracking

---

## Styling

### Tailwind Configuration
```javascript
// tailwind.config.js
- Custom color palette (primary, secondary, success, error)
- Dark mode support
- Custom animations (slide-in, fade-in, pulse)
- Responsive breakpoints
```

### Design System
- **Glassmorphism**: Translucent cards with backdrop blur
- **Gradients**: Subtle gradient backgrounds
- **Animations**: Smooth transitions and micro-interactions
- **Shadows**: Layered shadows for depth
- **Typography**: Inter font with varied weights

---

## Testing

```bash
# Run tests (when implemented)
npm test

```

---

## Deployment

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Environment Variables
Set these in Vercel dashboard:
- `NEXT_PUBLIC_FAUCET_URL`
- `NEXT_PUBLIC_AAC_APP`
- `NEXT_PUBLIC_INDEXER_APP`
- `NEXT_PUBLIC_INDEXER_CHAIN_ID`
- `NEXT_PUBLIC_AAC_CHAIN`

---

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## License

Apache-2.0

---

## Links

- **Main Repo**: [fairdrop-linera](https://github.com/wisdomabioye/fairdrop-linera)
- **Smart Contracts**: `../smart-contract/`
- **Whitepaper**: `../FAIRDROP.md`
- **Contact**: xpldevelopers@gmail.com

---

*Last Updated: 2025-12-15*
