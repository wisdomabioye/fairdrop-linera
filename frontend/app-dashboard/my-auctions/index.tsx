'use client';

import { useEffect, useState } from 'react';
import { useWalletConnection } from 'linera-react-client';
import { Plus, Gavel } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WalletConnectionPrompt } from '@/components/wallet/wallet-connection-prompt';
import { AuctionCard } from '@/components/auction/auction-card';
import { AuctionTable } from '@/components/auction/auction-table';
import { ViewToggle } from '@/components/dashboard/filter/view-toggle';
import { EmptyState } from '@/components/loading/empty-state';
import { AuctionSkeletonGrid, AuctionSkeletonTable } from '@/components/loading/auction-skeleton';
import { useBatchPolling } from '@/providers';
import { useUIStore } from '@/store/ui-store';
import { APP_ROUTES } from '@/config/app.route';

export default function MyAuctionsPage() {
  const router = useRouter();
  const { isConnected } = useWalletConnection();
  const { viewMode } = useUIStore();
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'scheduled' | 'ended'>('all');

  const { 
    userPortfolio: { creatorAuctions, loading, refetch }
  } = useBatchPolling();

  useEffect(() => {
    refetch();
  }, [])

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

  const filteredAuctions = statusFilter === 'all'
    ? creatorAuctions
    : creatorAuctions?.filter(a => a.status?.toLowerCase() === statusFilter.toLowerCase());

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Auctions</h1>
          <p className="text-muted-foreground mt-1">
            {creatorAuctions?.length || 0} {creatorAuctions?.length === 1 ? 'auction' : 'auctions'} created
          </p>
        </div>
        <Button onClick={() => router.push(APP_ROUTES.creatorCreate)} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Auction
        </Button>
      </div>

      {/* Filters & View Toggle */}
      <div className="flex items-center justify-between">
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | 'active' | 'scheduled' | 'ended')}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
            <TabsTrigger value="ended">Ended</TabsTrigger>
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
            <Button onClick={() => router.push('/create-auction')} className="gap-2">
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
              {filteredAuctions.map((auction) => (
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
	