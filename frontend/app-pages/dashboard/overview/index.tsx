'use client';

import { useState } from 'react';
import { useLineraClient, useLineraApplication } from 'linera-react-client';
import { useCachedActiveAuctions } from '@/hooks';
import { AAC_APP_ID } from '@/config/app.config';
import { GlobalStatsBar } from '@/components/dashboard/stats/global-stats-bar';
import { ViewToggle } from '@/components/dashboard/filters/view-toggle';
import { AuctionCard } from '@/components/auction/auction-card';
import { AuctionTable } from '@/components/auction/auction-table';
import { BidDialog } from '@/components/auction/bid-dialog';
import { AuctionSkeletonGrid } from '@/components/loading/auction-skeleton';
import { ErrorState } from '@/components/loading/error-state';
import { EmptyState } from '@/components/loading/empty-state';
import { useGlobalStats } from '@/hooks/analytics/use-global-stats';
import { useUIStore } from '@/store/ui-store';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import type { AuctionSummary } from '@/lib/gql/types';

export default function DashboardOverview() {
  const router = useRouter();
  const { walletAddress } = useLineraClient();
  const aacApp = useLineraApplication(AAC_APP_ID);
  const { viewMode } = useUIStore();
  const [filter, setFilter] = useState<'all' | 'ending-soon' | 'settled'>('all');

  const [bidDialog, setBidDialog] = useState<{
    open: boolean;
    auction: AuctionSummary | null;
  }>({
    open: false,
    auction: null,
  });

  const { stats, loading: statsLoading } = useGlobalStats();

  const {
    auctions,
    loading,
    isFetching,
    error,
    refetch,
  } = useCachedActiveAuctions({
    offset: 0,
    limit: 50,
    aacApp: aacApp.app,
    pollInterval: 30000,
    enablePolling: true,
  });

  const handleBidClick = (auctionId: number) => {
    const auction = auctions?.find(a => a.auctionId === auctionId);
    if (auction) {
      setBidDialog({ open: true, auction });
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {walletAddress ? 'Welcome Back' : 'Explore Auctions'}
          </h1>
          <p className="text-muted-foreground mt-1">
            Descending-price auctions with uniform clearing
          </p>
        </div>
        <Button onClick={() => router.push('/create-auction')} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Auction
        </Button>
      </div>

      {/* Global Stats */}
      <GlobalStatsBar
        activeAuctionsCount={stats.activeAuctionsCount}
        totalVolume={stats.totalVolume}
        totalBidders={stats.totalBidders}
        totalBidsCount={stats.totalBidsCount}
        avgPrice={stats.avgPrice}
        floorPrice={stats.floorPrice}
        startPrice={stats.startPrice}
        loading={statsLoading}
      />

      {/* Filters & View Toggle */}
      <div className="flex items-center justify-between">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="ending-soon">Ending Soon</TabsTrigger>
            <TabsTrigger value="settled">Recently Settled</TabsTrigger>
          </TabsList>
        </Tabs>
        <ViewToggle />
      </div>

      {/* Loading State */}
      {loading && !auctions?.length && (
        <AuctionSkeletonGrid count={8} />
      )}

      {/* Error State */}
      {error && !auctions?.length && (
        <ErrorState
          error={error}
          onRetry={refetch}
          title="Failed to load auctions"
        />
      )}

      {/* Empty State */}
      {!loading && !error && auctions && auctions.length === 0 && (
        <EmptyState
          title="No auctions found"
          description="Be the first to create an auction!"
          icon={<Plus className="h-12 w-12" />}
          action={
            <Button onClick={() => router.push('/create-auction')} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Auction
            </Button>
          }
        />
      )}

      {/* Auctions Display */}
      {auctions && auctions.length > 0 && (
        <>
          {viewMode === 'grid' ? (
            <div className="grid gap-6 justify-start [grid-template-columns:repeat(auto-fill,minmax(345px,350px))]">
              {auctions.map((auction) => (
                <AuctionCard
                  key={auction.auctionId}
                  auction={auction}
                  isRefreshing={isFetching}
                  onBidClick={handleBidClick}
                />
              ))}
            </div>
          ) : (
            <AuctionTable
              auctions={auctions}
              onBidClick={handleBidClick}
            />
          )}
        </>
      )}

      {/* Bid Dialog */}
      <BidDialog
        auction={bidDialog.auction}
        open={bidDialog.open}
        onOpenChange={(open) => setBidDialog({ ...bidDialog, open })}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
