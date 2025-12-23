'use client';

import { useWalletConnection } from 'linera-react-client';
import { WalletConnectionPrompt } from '@/components/wallet/wallet-connection-prompt';
import { useCreatorStats } from '@/hooks/analytics/use-creator-stats';
import { StatCard } from '@/components/dashboard/stats/stat-card';
import { DollarSign, Gavel, TrendingUp, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function CreatorAnalytics() {
  const { isConnected } = useWalletConnection();
  const { stats, loading, hasCreatedAuctions } = useCreatorStats();

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <WalletConnectionPrompt
          title="Connect Your Wallet"
          description="Connect your wallet to view your creator analytics."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Creator Analytics</h1>
        <p className="text-muted-foreground mt-1">
          Track your auction performance and revenue
        </p>
      </div>

      {/* Revenue Stats */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={stats.totalRevenue}
          icon={DollarSign}
          description="All-time earnings"
          loading={loading}
          highlight
        />
        <StatCard
          title="Active Auctions"
          value={stats.activeAuctionsCount}
          icon={Gavel}
          loading={loading}
        />
        <StatCard
          title="Total Bids"
          value={stats.totalBidsReceived}
          icon={TrendingUp}
          loading={loading}
        />
        <StatCard
          title="Success Rate"
          value={`${stats.successRate}%`}
          icon={CheckCircle}
          loading={loading}
        />
      </div>

      {/* Revenue Breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Pending Revenue</span>
              <span className="text-lg font-bold">{stats.pendingRevenue}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Withdrawn Revenue</span>
              <span className="text-lg font-bold">{stats.withdrawnRevenue}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Avg. Bids per Auction</span>
              <span className="text-lg font-bold">
                {stats.activeAuctionsCount > 0
                  ? (stats.totalBidsReceived / stats.activeAuctionsCount).toFixed(1)
                  : '0'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Auctions</span>
              <span className="text-lg font-bold">{stats.activeAuctionsCount}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Placeholder */}
      {!hasCreatedAuctions && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Gavel className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Analytics Yet</h3>
            <p className="text-sm text-muted-foreground">
              Create your first auction to start tracking analytics
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
