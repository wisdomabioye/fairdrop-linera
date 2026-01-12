'use client';

import { TrendingUp } from 'lucide-react';
import { type ApplicationClient, useWalletConnection, useLineraApplication } from 'linera-react-client';
import { WalletConnectionPrompt } from '@/components/wallet/wallet-connection-prompt';
import { useCachedAuctionSummary, useCachedMyCommitment } from '@/hooks';
import { AuctionCard } from '@/components/auction/auction-card';
import { ViewToggle } from '@/components/dashboard/filter/view-toggle';
import { EmptyState } from '@/components/loading/empty-state';
import { AuctionSkeletonGrid } from '@/components/loading/auction-skeleton';
import { AAC_APP_ID } from '@/config/app.config';

export default function MyBids() {
  const aacApp = useLineraApplication(AAC_APP_ID);
  const { isConnected } = useWalletConnection();

  const { commitment: userBidRecord, loading } = useCachedMyCommitment({
    aacApp: aacApp.app,
    auctionId: '0'
  });

  if (!isConnected) {
    return (
      <div className="mx-auto my-6 py-6 max-w-xl">
        <WalletConnectionPrompt
          title="Connect Your Wallet"
          description="Connect your wallet to view your bids."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Bids</h1>
          <p className="text-muted-foreground mt-1">
            {userBidRecord?.length} active {userBidRecord?.length === 1 ? 'bid' : 'bids'}
          </p>
        </div>
        <ViewToggle />
      </div>

      {/* Loading State */}
      {loading && <AuctionSkeletonGrid count={4} />}

      {/* Empty State */}
      {!loading && userBidRecord?.length === 0 && (
        <EmptyState
          title="No active bids"
          description="You don't have any active bids. Start bidding on auctions!"
          icon={<TrendingUp className="h-12 w-12" />}
        />
      )}

      {/* Bids Display */}
      {!loading && userBidRecord && userBidRecord?.length > 0 && (
        <div className="grid gap-6 justify-start [grid-template-columns:repeat(auto-fill,minmax(345px,350px))]">
          {userBidRecord.map((item) => (
            <BidCommitmentCard
              key={item.auctionId}
              auctionId={item.auctionId.toString()}
              totalQuantity={item.quantity}
              aacApp={aacApp.app}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Component to fetch and display auction with commitment badge
function BidCommitmentCard({
  auctionId,
  totalQuantity,
  aacApp,
}: {
  auctionId: string;
  totalQuantity: number;
  aacApp: ApplicationClient | null;
}) {
  const { auction, loading } = useCachedAuctionSummary({
    auctionId: auctionId.toString(),
    aacApp,
    skip: !aacApp,
  });

  if (loading || !auction) {
    return <div className="h-64 animate-pulse bg-muted rounded-lg" />;
  }

  return (
    <div className="relative">
      {/* Commitment Badge */}
      <div className="absolute top-2 right-2 z-10">
        <div className="bg-primary text-primary-foreground px-2 py-1 rounded-md text-xs font-semibold shadow-lg">
          Qty: {totalQuantity}
        </div>
      </div>
      <AuctionCard auction={auction} />
    </div>
  );
}