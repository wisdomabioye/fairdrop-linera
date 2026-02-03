'use client';

import { useState, useMemo, useCallback } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLineraClient } from 'linera-react-client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GlobalStatsBar } from '@/components/dashboard/stats/global-stats-bar';
import { ViewToggle } from '@/components/dashboard/filter/view-toggle';
import { AuctionCard } from '@/components/auction/auction-card';
import { AuctionTable } from '@/components/auction/auction-table';
import { BidDialog } from '@/components/auction/bid-dialog';
import { AuctionSkeletonGrid, AuctionSkeletonTable } from '@/components/loading/auction-skeleton';
import { ErrorState } from '@/components/loading/error-state';
import { EmptyState } from '@/components/loading/empty-state';
import { useUIStore } from '@/store/ui-store';
import { AuctionStatus, type AuctionSummary } from '@/lib/gql/types';
import { APP_ROUTES } from '@/config/app.route';
import { useBatchPolling } from '@/providers';
import { microsecondsToMilliseconds } from '@/lib/utils/auction-utils';
import { cn } from '@/lib/utils';

type AuctionFilter = 'active' | 'ending-soon' | 'settled';

const VALID_FILTERS: AuctionFilter[] = ['active', 'ending-soon', 'settled'];

// Time threshold for "ending soon" (1 hour in milliseconds)
const ENDING_SOON_THRESHOLD = 60 * 60 * 1000;

function DashboardContent({
  onRefresh,
  isRefreshing,
}: {
  onRefresh: () => void;
  isRefreshing: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { walletAddress } = useLineraClient();
  const { viewMode } = useUIStore();

  // Get filter from URL, default to 'active'
  const filterParam = searchParams.get('filter') as AuctionFilter | null;
  const filter: AuctionFilter = filterParam && VALID_FILTERS.includes(filterParam) ? filterParam : 'active';

  // Update URL when filter changes
  const setFilter = useCallback((newFilter: AuctionFilter) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newFilter === 'active') {
      params.delete('filter');
    } else {
      params.set('filter', newFilter);
    }
    const query = params.toString();
    router.push(query ? `?${query}` : '/', { scroll: false });
  }, [router, searchParams]);

  const [bidDialog, setBidDialog] = useState<{
    open: boolean;
    auction: AuctionSummary | null;
  }>({
    open: false,
    auction: null,
  });

  const {
    dashboardData: {
      allAuctions,
      globalStats,
      loading,
      isFetching,
      error,
      refetch
    }
  } = useBatchPolling();

  // Filter auctions based on selected tab
  const filteredAuctions = useMemo(() => {
    if (!allAuctions) return null;

    const now = Date.now();

    switch (filter) {
      case 'ending-soon':
        return allAuctions.filter((a: AuctionSummary) => {
          if (a.status !== AuctionStatus.Active) return false;
          const endTime = microsecondsToMilliseconds(a.endTime);
          const timeRemaining = endTime - now;
          return timeRemaining > 0 && timeRemaining <= ENDING_SOON_THRESHOLD;
        });
      case 'settled':
        return allAuctions.filter((a: AuctionSummary) =>
          a.status === AuctionStatus.Settled || a.status === AuctionStatus.Cancelled
        );
      case 'active':
      default:
        return allAuctions.filter((a: AuctionSummary) =>
          a.status === AuctionStatus.Active
        );
    }
  }, [allAuctions, filter]);

  // Calculate filter counts
  const filterCounts = useMemo(() => {
    if (!allAuctions) return { active: 0, endingSoon: 0, settled: 0 };

    const now = Date.now();

    return {
      active: allAuctions.filter((a: AuctionSummary) =>
        a.status === AuctionStatus.Active
      ).length,
      endingSoon: allAuctions.filter((a: AuctionSummary) => {
        if (a.status !== AuctionStatus.Active) return false;
        const endTime = microsecondsToMilliseconds(a.endTime);
        const timeRemaining = endTime - now;
        return timeRemaining > 0 && timeRemaining <= ENDING_SOON_THRESHOLD;
      }).length,
      settled: allAuctions.filter((a: AuctionSummary) =>
        a.status === AuctionStatus.Settled || a.status === AuctionStatus.Cancelled
      ).length,
    };
  }, [allAuctions]);

  const handleBidClick = (auctionId: number) => {
    const auction = allAuctions?.find(a => a.auctionId === auctionId);
    if (auction) {
      setBidDialog({ open: true, auction });
    }
  };

  const isLoading = loading || isRefreshing;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            {walletAddress ? 'Welcome Back' : 'Explore Auctions'}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Descending-price auctions with uniform clearing
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Refresh Button */}
          <Button
            variant="outline"
            size="icon"
            onClick={onRefresh}
            disabled={isLoading}
            className={cn(
              "h-9 w-9 transition-all",
              isLoading && "opacity-70"
            )}
            title="Refresh auctions"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
          <Button onClick={() => router.push(APP_ROUTES.creatorCreate)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Auction
          </Button>
        </div>
      </div>

      {/* Global Stats */}
      <GlobalStatsBar stats={globalStats} loading={loading} />

      {/* Filters & View Toggle */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as AuctionFilter)}>
          <TabsList>
            <TabsTrigger value="active">
              Active
              {filterCounts.active > 0 && (
                <span className="ml-1.5 text-xs opacity-70">({filterCounts.active})</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="ending-soon">
              Ending Soon
              {filterCounts.endingSoon > 0 && (
                <span className="ml-1.5 text-xs text-orange-500 font-medium">({filterCounts.endingSoon})</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="settled">
              Settled
              {filterCounts.settled > 0 && (
                <span className="ml-1.5 text-xs opacity-70">({filterCounts.settled})</span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <ViewToggle />
      </div>

      {/* Loading State */}
      {loading && (
        viewMode === 'grid' ? (
          <AuctionSkeletonGrid count={8} />
        ) : (
          <AuctionSkeletonTable count={8} />
        )
      )}

      {/* Error State */}
      {error && !allAuctions?.length && (
        <ErrorState
          error={error}
          onRetry={refetch}
          title="Failed to load auctions"
        />
      )}

      {/* Empty State */}
      {!loading && !error && filteredAuctions && filteredAuctions.length === 0 && (
        <EmptyState
          title={`No ${filter.replace('-', ' ')} auctions`}
          description={`There are no ${filter.replace('-', ' ')} auctions at the moment.`}
          icon={<Plus className="h-12 w-12" />}
          action={filter === 'active' && (
            <Button onClick={() => router.push(APP_ROUTES.creatorCreate)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Auction
            </Button>
          )}
        />
      )}

      {/* Auctions Display */}
      {!loading && filteredAuctions && filteredAuctions.length > 0 && (
        <>
          {viewMode === 'grid' ? (
            <div className="grid gap-6 justify-start [grid-template-columns:repeat(auto-fill,minmax(345px,350px))]">
              {filteredAuctions.map((auction: AuctionSummary) => (
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
              auctions={filteredAuctions}
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
      />
    </div>
  );
}

export default function DashboardOverview() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    // Reset refreshing state after a delay
    setTimeout(() => setIsRefreshing(false), 1500);
  }, []);

  return (
    <DashboardContent
      onRefresh={handleRefresh}
      isRefreshing={isRefreshing}
    />
  );
}