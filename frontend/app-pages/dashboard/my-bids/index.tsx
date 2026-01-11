'use client';

import { useWalletConnection, useLineraApplication } from 'linera-react-client';
import type { ApplicationClient } from 'linera-react-client';
import { WalletConnectionPrompt } from '@/components/wallet/wallet-connection-prompt';
import { useCachedAllMyCommitments, useCachedAuctionSummary } from '@/hooks';
import { AuctionCard } from '@/components/auction/auction-card';
import { ViewToggle } from '@/components/dashboard/filters/view-toggle';
import { EmptyState } from '@/components/loading/empty-state';
import { AuctionSkeletonGrid } from '@/components/loading/auction-skeleton';
import { TrendingUp } from 'lucide-react';
import { AAC_APP_ID } from '@/config/app.config';
import type { UserCommitment } from '@/lib/gql/types';

export default function MyBids() {
  const aacApp = useLineraApplication(AAC_APP_ID);
  const { isConnected } = useWalletConnection();

  const { commitments, loading } = useCachedAllMyCommitments({
    uicApp: aacApp.app,
  });

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
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
            {commitments?.length} active {commitments?.length === 1 ? 'bid' : 'bids'}
          </p>
        </div>
        <ViewToggle />
      </div>

      {/* Loading State */}
      {loading && <AuctionSkeletonGrid count={4} />}

      {/* Empty State */}
      {!loading && commitments?.length === 0 && (
        <EmptyState
          title="No active bids"
          description="You don't have any active bids. Start bidding on auctions!"
          icon={<TrendingUp className="h-12 w-12" />}
        />
      )}

      {/* Bids Display */}
      {!loading && commitments && commitments?.length > 0 && (
        <div className="grid gap-6 justify-start [grid-template-columns:repeat(auto-fill,minmax(345px,350px))]">
          {commitments.map((item) => (
            <BidCommitmentCard
              key={item.auctionId}
              auctionId={item.auctionId}
              commitment={item.commitment}
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
  commitment,
  aacApp,
}: {
  auctionId: string;
  commitment: UserCommitment;
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
          Qty: {commitment.totalQuantity}
        </div>
      </div>
      <AuctionCard auction={auction} />
    </div>
  );
}
