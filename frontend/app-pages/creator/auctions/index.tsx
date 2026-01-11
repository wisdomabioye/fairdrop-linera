'use client';

import { useState } from 'react';
import { useLineraApplication, useWalletConnection } from 'linera-react-client';
import { useRouter } from 'next/navigation';
import { WalletConnectionPrompt } from '@/components/wallet/wallet-connection-prompt';
import { useCachedAuctionsByCreator } from '@/hooks';
import { AuctionCard } from '@/components/auction/auction-card';
import { AuctionTable } from '@/components/auction/auction-table';
import { useUIStore } from '@/store/ui-store';
import { ViewToggle } from '@/components/dashboard/filters/view-toggle';
import { EmptyState } from '@/components/loading/empty-state';
import { AuctionSkeletonGrid } from '@/components/loading/auction-skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, Gavel } from 'lucide-react';
import { AAC_APP_ID } from '@/config/app.config';

export default function CreatorAuctions() {
  const router = useRouter();
  const aacApp = useLineraApplication(AAC_APP_ID);
  const { address, isConnected } = useWalletConnection();
  const { viewMode } = useUIStore();
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'scheduled' | 'ended'>('all');

  const { auctions, loading } = useCachedAuctionsByCreator({
    aacApp: aacApp.app,
    offset: 0,
    limit: 20,
    creator: address ?? ''
  });

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <WalletConnectionPrompt
          title="Connect Your Wallet"
          description="Connect your wallet to manage your auctions."
        />
      </div>
    );
  }

  const filteredAuctions = statusFilter === 'all'
    ? auctions
    : auctions?.filter(a => a.status?.toLowerCase() === statusFilter.toLowerCase());

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Auctions</h1>
          <p className="text-muted-foreground mt-1">
            {auctions?.length || 0} {auctions?.length === 1 ? 'auction' : 'auctions'} created
          </p>
        </div>
        <Button onClick={() => router.push('/create-auction')} className="gap-2">
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
      {loading && <AuctionSkeletonGrid count={4} />}

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
