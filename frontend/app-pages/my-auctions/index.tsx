'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Hammer, TrendingDown, Plus } from 'lucide-react';
import { useLineraApplication } from 'linera-react-client';
import { useCachedAuctionsByCreator } from '@/hooks';
import { INDEXER_APP_ID, UIC_APP_ID } from '@/config/app.config';
import { AuctionCard } from '@/components/auction/auction-card';
import { BidDialog } from '@/components/auction/bid-dialog';
import { AuctionSkeletonGrid } from '@/components/loading/auction-skeleton';
import { ErrorState } from '@/components/loading/error-state';
import { EmptyState } from '@/components/loading/empty-state';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { APP_ROUTES } from '@/config/app.route';
import type { AuctionSummary } from '@/lib/gql/types';

export default function MyAuctionsPage() {
    const router = useRouter();
    const indexerApp = useLineraApplication(INDEXER_APP_ID);
    const uicApp = useLineraApplication(UIC_APP_ID);

    const [bidDialog, setBidDialog] = useState<{
        open: boolean;
        auction: AuctionSummary | null;
    }>({
        open: false,
        auction: null
    });

    // Get current user's address
    const userAddress = uicApp.app?.walletClient?.getAddress() || '';

    // Fetch auctions created by user
    const {
        auctions: createdAuctions,
        loading: loadingCreated,
        error: errorCreated,
        refetch: refetchCreated
    } = useCachedAuctionsByCreator({
        creator: userAddress,
        offset: 0,
        limit: 50,
        indexerApp: indexerApp.app,
        skip: !userAddress || !indexerApp.app
    });

    const handleBidClick = (auctionId: number) => {
        const auction = createdAuctions?.find(a => a.auctionId === auctionId);
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
                <h1 className="text-4xl font-bold mb-2">My Auctions</h1>
                <p className="text-muted-foreground">
                    Manage auctions you've created and track your bids
                </p>
            </header>

            {/* Tabs */}
            <Tabs defaultValue="created" className="space-y-6">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                    <TabsTrigger value="created" className="gap-2">
                        <Hammer className="h-4 w-4" />
                        Created by Me
                    </TabsTrigger>
                    <TabsTrigger value="bids" className="gap-2">
                        <TrendingDown className="h-4 w-4" />
                        My Bids
                    </TabsTrigger>
                </TabsList>

                {/* Created Auctions Tab */}
                <TabsContent value="created" className="space-y-6">
                    {loadingCreated && (
                        <AuctionSkeletonGrid count={6} />
                    )}

                    {errorCreated && (
                        <ErrorState
                            error={errorCreated}
                            onRetry={refetchCreated}
                            title="Failed to load your auctions"
                        />
                    )}

                    {!loadingCreated && !errorCreated && (!createdAuctions || createdAuctions.length === 0) && (
                        <EmptyState
                            title="You haven't created any auctions yet"
                            description="Create your first auction to get started"
                            icon={<Hammer className="h-12 w-12" />}
                            action={
                                <Button onClick={handleCreateAuction} className="gap-2">
                                    <Plus className="h-4 w-4" />
                                    Create Auction
                                </Button>
                            }
                        />
                    )}

                    {createdAuctions && createdAuctions.length > 0 && (
                        <div className="space-y-6">
                            {/* Group by status */}
                            <AuctionGroup
                                title="Active"
                                auctions={createdAuctions.filter(a => a.status === 1)}
                                onBidClick={handleBidClick}
                            />
                            <AuctionGroup
                                title="Ended"
                                auctions={createdAuctions.filter(a => a.status === 2)}
                                onBidClick={handleBidClick}
                            />
                            <AuctionGroup
                                title="Settled"
                                auctions={createdAuctions.filter(a => a.status === 3)}
                                onBidClick={handleBidClick}
                            />
                        </div>
                    )}
                </TabsContent>

                {/* My Bids Tab */}
                <TabsContent value="bids" className="space-y-6">
                    <EmptyState
                        title="Bid tracking coming soon"
                        description="This feature requires additional indexing capabilities"
                        icon={<TrendingDown className="h-12 w-12" />}
                        action={
                            <Button onClick={() => router.push('/active-auction')}>
                                Browse Active Auctions
                            </Button>
                        }
                    />
                </TabsContent>
            </Tabs>

            {/* Bid Dialog */}
            <BidDialog
                auction={bidDialog.auction}
                open={bidDialog.open}
                onOpenChange={(open) => setBidDialog({ ...bidDialog, open })}
            />
        </div>
    );
}

// Helper component to group auctions by status
function AuctionGroup({
    title,
    auctions,
    onBidClick
}: {
    title: string;
    auctions: AuctionSummary[];
    onBidClick: (id: number) => void;
}) {
    if (auctions.length === 0) return null;

    return (
        <div>
            <h2 className="text-2xl font-semibold mb-4">
                {title} ({auctions.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {auctions.map((auction) => (
                    <AuctionCard
                        key={auction.auctionId}
                        auction={auction}
                        showQuickBid={auction.status === 1}
                        onBidClick={onBidClick}
                    />
                ))}
            </div>
        </div>
    );
}
