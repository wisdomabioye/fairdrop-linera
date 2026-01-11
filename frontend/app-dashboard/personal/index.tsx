'use client';

import { useState } from 'react';
import { TrendingUp, Trophy, DollarSign, Percent } from 'lucide-react';
import { type ApplicationClient, useWalletConnection } from 'linera-react-client';
import { StatCard } from '@/components/dashboard/stats/stat-card';
import { WalletConnectionPrompt } from '@/components/wallet/wallet-connection-prompt';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ViewToggle } from '@/components/dashboard/filter/view-toggle';
import { AuctionCard } from '@/components/auction/auction-card';
import { EmptyState } from '@/components/loading/empty-state';
import { 
  useAacApp,
  usePersonalStats, 
  useCachedMyCommitment, 
  useCachedAuctionSummary
} from '@/hooks';
import type { BidRecord } from '@/lib/gql/types';


type PersonalTabType = 'claimed' | 'unclaimed' | 'all';

export default function PersonalDashboard() {
  const aacApp = useAacApp();
  const { isConnected } = useWalletConnection();
  const [activeTab, setActiveTab] = useState<PersonalTabType>('claimed');
  const { stats, loading } = usePersonalStats();
  const { totalQuantity, commitment: userBidRecord = [] } = useCachedMyCommitment({
    aacApp: aacApp.app,
    auctionId: '0'
  });

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <WalletConnectionPrompt
          title="Connect Your Wallet"
          description="Connect your wallet to view your personal dashboard and bidding activity."
        />
      </div>
    );
  }

  const totalClaimed = userBidRecord?.map(bid => bid.claimed).length ?? 0
  const totalUnclaimed = userBidRecord?.map(bid => !bid.claimed).length ?? 0

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">My Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Track your bids and manage your auction activity
        </p>
      </div>

      {/* Personal Stats */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Bids"
          value={stats.activeBidsCount}
          icon={TrendingUp}
          loading={loading}
          highlight={stats.activeBidsCount > 0}
        />
        <StatCard
          title="Won Auctions"
          value={stats.wonAuctionsCount}
          icon={Trophy}
          loading={loading}
        />
        <StatCard
          title="Total Spent"
          value={stats.totalSpent}
          icon={DollarSign}
          loading={loading}
        />
        <StatCard
          title="Avg. Discount"
          value={stats.avgDiscountAchieved}
          icon={Percent}
          description="Savings from start price"
          loading={loading}
        />
      </div>

      {/* Bids Section */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as PersonalTabType)} className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="claimed">Claimed Bids</TabsTrigger>
            <TabsTrigger value="unclaimed">Unclaimed Auctions</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
          <ViewToggle />
        </div>

        <TabsContent value="claimed" className="mt-4">
          {totalClaimed === 0 ? (
            <EmptyState
              title="No claimed bids"
              description="You don't have any claimed bids at the moment."
            />
          ) : (
            <CommitmentGrid
              commitments={allCommitments}
              aacApp={aacApp.app}
              filterStatus="Claimed"
            />
          )}
        </TabsContent>

        <TabsContent value="won" className="mt-4">
          {totalUnclaimed === 0 ? (
            <EmptyState
              title="No unclaimed bids"
              description="You don't have unclaimed bid."
            />
          ) : (
            <CommitmentGrid
              commitments={allCommitments}
              aacApp={aacApp.app}
              filterStatus="Unclaimed"
            />
          )}
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          {userBidRecord && userBidRecord.length === 0 ? (
            <EmptyState
              title="No bidding activity"
              description="Start bidding on auctions to see them here."
            />
          ) : (
            <CommitmentGrid
              commitments={allCommitments}
              aacApp={aacApp.app}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Grid component that fetches and filters auctions
function CommitmentGrid({
  commitments,
  aacApp,
  filterStatus,
}: {
  commitments: { auctionId: string; commitment: UserCommitment }[];
  aacApp: ApplicationClient | null;
  filterStatus?: string;
}) {
  return (
    <div className="grid gap-6 justify-start [grid-template-columns:repeat(auto-fill,minmax(345px,350px))]">
      {commitments.map((item) => (
        <CommitmentCard
          key={item.auctionId}
          auctionId={item.auctionId}
          commitment={item.commitment}
          aacApp={aacApp}
          filterStatus={filterStatus}
        />
      ))}
    </div>
  );
}

// Card component that fetches auction and filters by status
function CommitmentCard({
  auctionId,
  commitment,
  aacApp,
  filterStatus,
}: {
  auctionId: string;
  commitment: UserCommitment;
  aacApp: ApplicationClient | null;
  filterStatus?: string;
}) {
  const { auction, loading } = useCachedAuctionSummary({
    auctionId: auctionId.toString(),
    aacApp,
    skip: !aacApp,
  });

  if (loading || !auction) {
    return <div className="h-64 animate-pulse bg-muted rounded-lg" />;
  }

  // Filter by status if specified
  if (filterStatus && auction.status !== filterStatus) {
    return null;
  }

  return (
    <div className="relative">
      {/* Commitment Badge */}
      <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
        <div className="bg-primary text-primary-foreground px-2 py-1 rounded-md text-xs font-semibold shadow-lg">
          Qty: {commitment.totalQuantity}
        </div>
        {commitment.settlement && auction.status === 'Settled' && (
          <div className="bg-success text-success-foreground px-2 py-1 rounded-md text-xs font-semibold shadow-lg">
            Won
          </div>
        )}
      </div>
      <AuctionCard auction={auction} />
    </div>
  );
}