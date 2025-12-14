'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, RefreshCw } from 'lucide-react';
import { useLineraApplication } from 'linera-react-client';
import { useCachedActiveAuctions } from '@/hooks';
import { AAC_APP_ID } from '@/config/app.config';
import { AuctionCard } from '@/components/auction/auction-card';
import { BidDialog } from '@/components/auction/bid-dialog';
import { AuctionSkeletonGrid } from '@/components/loading/auction-skeleton';
import { ErrorState } from '@/components/loading/error-state';
import { EmptyState } from '@/components/loading/empty-state';
import { Button } from '@/components/ui/button';
import type { AuctionSummary } from '@/lib/gql/types';
import { APP_ROUTES } from '@/config/app.route';

export default function ActiveAuctions() {
    const router = useRouter();
    const aacApp = useLineraApplication(AAC_APP_ID);

    const [bidDialog, setBidDialog] = useState<{
        open: boolean;
        auction: AuctionSummary | null;
    }>({
        open: false,
        auction: null
    });
    
    const {
        auctions,
        loading,
        isFetching,
        error,
        hasLoadedOnce,
        refetch
    } = useCachedActiveAuctions({
        offset: 0,
        limit: 20,
        aacApp: aacApp.app,
        pollInterval: 30000,
        enablePolling: true
    });

    const handleBidClick = (auctionId: number) => {
        const auction = auctions?.find(a => a.auctionId === auctionId);
        if (auction) {
            setBidDialog({ open: true, auction });
        }
    };

    const handleCreateAuction = () => {
        router.push(APP_ROUTES.createAuction);
    };

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <header className="mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-bold mb-2">Active Auctions</h1>
                        <p className="text-muted-foreground">
                            Descending-price auctions with uniform clearing
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => refetch()}
                            disabled={isFetching}
                        >
                            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button
                            onClick={handleCreateAuction}
                            className="gap-2"
                        >
                            <Plus className="h-4 w-4" />
                            Create Auction
                        </Button>
                    </div>
                </div>
            </header>

            {/* Loading State */}
            {((loading)) && (
                <AuctionSkeletonGrid count={4} />
            )}

            {/* Error State */}
            {error && !auctions?.length && (
                <ErrorState
                    error={error}
                    onRetry={refetch}
                    title="Failed to load active auctions"
                />
            )}

            {/* Empty State */}
            {!loading && !error && auctions && auctions.length === 0 && (
                <EmptyState
                    title="No active auctions"
                    description="Be the first to create an auction!"
                    icon={<Plus className="h-12 w-12" />}
                    action={
                        <Button onClick={handleCreateAuction} className="gap-2">
                            <Plus className="h-4 w-4" />
                            Create Auction
                        </Button>
                    }
                />
            )}

            {/* Auctions Grid */}
            {auctions && auctions.length > 0 && (
                <div className="flex flex-wrap gap-6">
                    {auctions.map((auction) => (
                        <AuctionCard
                            key={auction.auctionId}
                            auction={auction}
                            showQuickBid
                            isRefreshing={isFetching && hasLoadedOnce}
                            onBidClick={handleBidClick}
                        />
                    ))}
                </div>
            )}

            {/* Bid Dialog */}
            <BidDialog
                auction={bidDialog.auction}
                open={bidDialog.open}
                onOpenChange={(open) => setBidDialog({ ...bidDialog, open })}
                onSuccess={() => {
                    // Refetch to update auction data after successful bid
                    refetch();
                }}
            />
        </div>
    );
}