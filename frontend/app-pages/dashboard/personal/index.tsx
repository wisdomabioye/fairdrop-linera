'use client';

import { useState } from 'react';
import { useWalletConnection, useLineraApplication } from 'linera-react-client';
import type { ApplicationClient } from 'linera-react-client';
import { usePersonalStats } from '@/hooks/analytics/use-personal-stats';
import { StatCard } from '@/components/dashboard/stats/stat-card';
import { WalletConnectionPrompt } from '@/components/wallet/wallet-connection-prompt';
import { TrendingUp, Trophy, DollarSign, Percent } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCachedAllMyCommitments, useCachedAuctionSummary } from '@/hooks';
import { AuctionCard } from '@/components/auction/auction-card';
import { ViewToggle } from '@/components/dashboard/filters/view-toggle';
import { EmptyState } from '@/components/loading/empty-state';
import { AAC_APP_ID } from '@/config/app.config';
import type { UserCommitment } from '@/lib/gql/types';

export default function PersonalDashboard() {
  const aacApp = useLineraApplication(AAC_APP_ID);
  const { isConnected } = useWalletConnection();
  const [activeTab, setActiveTab] = useState<'active' | 'won' | 'all'>('active');

  const { stats, loading } = usePersonalStats();
  const { commitments } = useCachedAllMyCommitments({
    uicApp: aacApp.app,
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

  // We'll filter by status when fetching individual auctions
  const allCommitments = commitments || [];

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
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'active' | 'won' | 'all')} className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="active">Active Bids</TabsTrigger>
            <TabsTrigger value="won">Won Auctions</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
          <ViewToggle />
        </div>

        <TabsContent value="active" className="mt-4">
          {allCommitments.length === 0 ? (
            <EmptyState
              title="No active bids"
              description="You don't have any active bids at the moment."
            />
          ) : (
            <CommitmentGrid
              commitments={allCommitments}
              aacApp={aacApp.app}
              filterStatus="Active"
            />
          )}
        </TabsContent>

        <TabsContent value="won" className="mt-4">
          {allCommitments.length === 0 ? (
            <EmptyState
              title="No won auctions"
              description="You haven't won any auctions yet."
            />
          ) : (
            <CommitmentGrid
              commitments={allCommitments}
              aacApp={aacApp.app}
              filterStatus="Settled"
            />
          )}
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          {allCommitments.length === 0 ? (
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
