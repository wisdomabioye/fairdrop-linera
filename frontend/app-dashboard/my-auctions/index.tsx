'use client';

import { useState, useMemo, useCallback } from 'react';
import { useWalletConnection } from 'linera-react-client';
import { Plus, Gavel, RefreshCw, Info } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WalletConnectionPrompt } from '@/components/wallet/wallet-connection-prompt';
import { AuctionCard } from '@/components/auction/auction-card';
import { AuctionTable } from '@/components/auction/auction-table';
import { ViewToggle } from '@/components/dashboard/filter/view-toggle';
import { EmptyState } from '@/components/loading/empty-state';
import { AuctionSkeletonGrid, AuctionSkeletonTable } from '@/components/loading/auction-skeleton';
import { useUIStore } from '@/store/ui-store';
import { APP_ROUTES } from '@/config/app.route';
import { useBatchPolling } from '@/providers';
import { AuctionStatus, type AuctionSummary } from '@/lib/gql/types';

type StatusFilter = 'all' | 'active' | 'scheduled' | 'ended';

function AuctionsContent({
  statusFilter,
  setStatusFilter,
  onRefresh,
  isRefreshing
}: {
  statusFilter: StatusFilter;
  setStatusFilter: (v: StatusFilter) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}) {
  const router = useRouter();
  const { viewMode } = useUIStore();

  const {
    userPortfolio: { creatorAuctions, loading }
  } = useBatchPolling();

  // Filter auctions using AuctionStatus enum
  const filteredAuctions = useMemo(() => {
    if (!creatorAuctions) return null;
    if (statusFilter === 'all') return creatorAuctions;

    return creatorAuctions.filter((a: AuctionSummary) => {
      switch (statusFilter) {
        case 'active':
          return a.status === AuctionStatus.Active;
        case 'scheduled':
          return a.status === AuctionStatus.Scheduled;
        case 'ended':
          return a.status === AuctionStatus.Settled || a.status === AuctionStatus.Cancelled;
        default:
          return true;
      }
    });
  }, [creatorAuctions, statusFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!creatorAuctions) return { total: 0, active: 0, scheduled: 0, ended: 0 };
    return {
      total: creatorAuctions.length,
      active: creatorAuctions.filter((a: AuctionSummary) => a.status === AuctionStatus.Active).length,
      scheduled: creatorAuctions.filter((a: AuctionSummary) => a.status === AuctionStatus.Scheduled).length,
      ended: creatorAuctions.filter((a: AuctionSummary) =>
        a.status === AuctionStatus.Settled || a.status === AuctionStatus.Cancelled
      ).length,
    };
  }, [creatorAuctions]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">My Auctions</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage and track your created auctions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing || loading}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing || loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => router.push(APP_ROUTES.creatorCreate)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Auction
          </Button>
        </div>
      </div>

      {/* Sync Notice */}
      <div className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 rounded-lg border border-blue-200 dark:border-blue-800/50">
        <Info className="h-4 w-4 flex-shrink-0" />
        <span>Newly created auctions may take a few minutes to appear. We&apos;re working to improve sync times.</span>
      </div>

      {/* Stats Summary */}
      {!loading && creatorAuctions && creatorAuctions.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border rounded-lg p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total</p>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Active</p>
            <p className="text-2xl font-bold mt-1 text-green-600">{stats.active}</p>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Scheduled</p>
            <p className="text-2xl font-bold mt-1 text-blue-600">{stats.scheduled}</p>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Ended</p>
            <p className="text-2xl font-bold mt-1">{stats.ended}</p>
          </div>
        </div>
      )}

      {/* Filters & View Toggle */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <TabsList>
            <TabsTrigger value="all">
              All {stats.total > 0 && <span className="ml-1.5 text-xs opacity-70">({stats.total})</span>}
            </TabsTrigger>
            <TabsTrigger value="active">
              Active {stats.active > 0 && <span className="ml-1.5 text-xs opacity-70">({stats.active})</span>}
            </TabsTrigger>
            <TabsTrigger value="scheduled">
              Scheduled {stats.scheduled > 0 && <span className="ml-1.5 text-xs opacity-70">({stats.scheduled})</span>}
            </TabsTrigger>
            <TabsTrigger value="ended">
              Ended {stats.ended > 0 && <span className="ml-1.5 text-xs opacity-70">({stats.ended})</span>}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <ViewToggle />
      </div>

      {/* Loading State */}
      {loading && (
        viewMode === 'grid' ? (
          <AuctionSkeletonGrid count={4} />
        ) : (
          <AuctionSkeletonTable count={4} />
        )
      )}

      {/* Empty State */}
      {!loading && (!filteredAuctions || filteredAuctions.length === 0) && (
        <EmptyState
          title={statusFilter === 'all' ? 'No auctions created' : `No ${statusFilter} auctions`}
          description={statusFilter === 'all' ? 'Create your first auction to get started!' : `You don't have any ${statusFilter} auctions.`}
          icon={<Gavel className="h-12 w-12" />}
          action={statusFilter === 'all' && (
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
                <AuctionCard key={auction.auctionId} auction={auction} />
              ))}
            </div>
          ) : (
            <AuctionTable auctions={filteredAuctions} />
          )}
        </>
      )}
    </div>
  );
}

export default function MyAuctionsPage() {
  const { isConnected } = useWalletConnection();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1500);
  }, []);

  if (!isConnected) {
    return (
      <div className="mx-auto my-6 py-6 max-w-xl">
        <WalletConnectionPrompt
          title="Connect Your Wallet"
          description="Connect your wallet to manage your auctions."
        />
      </div>
    );
  }

  return (
    <AuctionsContent
      statusFilter={statusFilter}
      setStatusFilter={setStatusFilter}
      onRefresh={handleRefresh}
      isRefreshing={isRefreshing}
    />
  );
}
	