'use client';

import { useWalletConnection, useLineraApplication } from 'linera-react-client';
import type { ApplicationClient } from 'linera-react-client';
import { WalletConnectionPrompt } from '@/components/wallet/wallet-connection-prompt';
import { useCachedAllMyCommitments, useCachedAuctionSummary } from '@/hooks';
import { AuctionCard } from '@/components/auction/auction-card';
import { ViewToggle } from '@/components/dashboard/filters/view-toggle';
import { EmptyState } from '@/components/loading/empty-state';
import { AuctionSkeletonGrid } from '@/components/loading/auction-skeleton';
import { Trophy } from 'lucide-react';
import { AAC_APP_ID } from '@/config/app.config';
import type { UserCommitment } from '@/lib/gql/types';

export default function MySettlements() {
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
          description="Connect your wallet to view your settlements."
        />
      </div>
    );
  }

  // Filter settled auctions - we'll check status when we fetch individual auctions
  const settledBids = commitments || [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Wins & Settlements</h1>
          <p className="text-muted-foreground mt-1">
            {settledBids.length} claimable {settledBids.length === 1 ? 'auction' : 'auctions'}
          </p>
        </div>
        <ViewToggle />
      </div>

      {/* Loading State */}
      {loading && <AuctionSkeletonGrid count={4} />}

      {/* Empty State */}
      {!loading && settledBids.length === 0 && (
        <EmptyState
          title="No settlements yet"
          description="Auctions you've won will appear here for claiming."
          icon={<Trophy className="h-12 w-12" />}
        />
      )}

      {/* Settlements Display */}
      {!loading && settledBids.length > 0 && (
        <div className="grid gap-6 justify-start [grid-template-columns:repeat(auto-fill,minmax(345px,350px))]">
          {settledBids.map((item) => (
            <SettlementCommitmentCard
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

// Component to fetch and display settled auction with commitment badge
function SettlementCommitmentCard({
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

  // Only show settled auctions
  if (auction.status !== 'Settled') {
    return null;
  }

  return (
    <div className="relative">
      {/* Settlement Info Badge */}
      <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
        <div className="bg-success text-success-foreground px-2 py-1 rounded-md text-xs font-semibold shadow-lg">
          Won: {commitment.totalQuantity}
        </div>
        {commitment.settlement && (
          <div className="bg-primary text-primary-foreground px-2 py-1 rounded-md text-xs font-semibold shadow-lg">
            Refund: {commitment.settlement.refund}
          </div>
        )}
      </div>
      <AuctionCard auction={auction} />
    </div>
  );
}
