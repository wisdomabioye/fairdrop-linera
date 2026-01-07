'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Hammer, TrendingDown, Plus } from 'lucide-react';
import { useLineraApplication, useWalletConnection } from 'linera-react-client';
import { useCachedAuctionsByCreator } from '@/hooks';
import { AAC_APP_ID } from '@/config/app.config';
import { AuctionCard } from '@/components/auction/auction-card';
import { BidDialog } from '@/components/auction/bid-dialog';
import { AuctionSkeletonGrid } from '@/components/loading/auction-skeleton';
import { ErrorState } from '@/components/loading/error-state';
import { EmptyState } from '@/components/loading/empty-state';
import { WalletConnectionPrompt } from '@/components/wallet/wallet-connection-prompt';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { APP_ROUTES } from '@/config/app.route';
import { AuctionStatus, type AuctionSummary } from '@/lib/gql/types';

export default function MyAuctionsPage() {
    const router = useRouter();
    const aacApp = useLineraApplication(AAC_APP_ID);
    const { isConnected, address } = useWalletConnection();

    const [bidDialog, setBidDialog] = useState<{
        open: boolean;
        auction: AuctionSummary | null;
    }>({
        open: false,
        auction: null
    });

    // Fetch auctions created by user
    const {
        auctions: createdAuctions,
        loading: loadingCreated,
        error: errorCreated,
        refetch: refetchCreated
    } = useCachedAuctionsByCreator({
        creator: address!,
        offset: 0,
        limit: 20,
        aacApp: aacApp.app,
        skip: !address || !aacApp.app
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

    // Show wallet connection section if not connected
    if (!isConnected) {
        return (
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <header className="mb-8">
                    <h1 className="text-4xl font-bold mb-2">My Auctions</h1>
                    <p className="text-muted-foreground">
                        Manage auctions you've created and track your bids
                    </p>
                </header>

                <WalletConnectionPrompt
                    title="Connect Your Wallet"
                    description="Connect your wallet to view and manage your auctions. You'll be able to create new auctions and track your bidding activity."
                    className="max-w-2xl mx-auto"
                />
            </div>
        );
    }

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
                        <AuctionSkeletonGrid count={4} />
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
                        <CreatedAuctionsSubTabs
                            auctions={createdAuctions}
                            onBidClick={handleBidClick}
                        />
                    )}
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

// Created Auctions Sub-Tabs Component
function CreatedAuctionsSubTabs({
    auctions,
    onBidClick
}: {
    auctions: AuctionSummary[];
    onBidClick: (id: number) => void;
}) {
    const scheduledAuctions = auctions.filter(a => a.status === AuctionStatus.Scheduled);
    const activeAuctions = auctions.filter(a => a.status === AuctionStatus.Active);
    const settledAuctions = auctions.filter(a => a.status === AuctionStatus.Settled);
    const cancelledAuctions = auctions.filter(a => a.status === AuctionStatus.Cancelled);

    return (
        <Tabs defaultValue="active" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="scheduled">
                    Scheduled ({scheduledAuctions.length})
                </TabsTrigger>
                <TabsTrigger value="active">
                    Active ({activeAuctions.length})
                </TabsTrigger>
               <TabsTrigger value="settled">
                    Settled ({settledAuctions.length})
                </TabsTrigger>
                <TabsTrigger value="cancelled">
                    Cancelled ({cancelledAuctions.length})
                </TabsTrigger>
            </TabsList>

            <TabsContent value="scheduled">
                <AuctionGroup
                    auctions={scheduledAuctions}
                    onBidClick={onBidClick}
                    emptyMessage="No scheduled auctions"
                />
            </TabsContent>

            <TabsContent value="active">
                <AuctionGroup
                    auctions={activeAuctions}
                    onBidClick={onBidClick}
                    emptyMessage="No active auctions"
                />
            </TabsContent>

            <TabsContent value="settled">
                <AuctionGroup
                    auctions={settledAuctions}
                    onBidClick={onBidClick}
                    emptyMessage="No settled auctions"
                />
            </TabsContent>

            <TabsContent value="cancelled">
                <AuctionGroup
                    auctions={cancelledAuctions}
                    onBidClick={onBidClick}
                    emptyMessage="No cancelled auctions"
                />
            </TabsContent>
        </Tabs>
    );
}

// Helper component to group auctions
function AuctionGroup({
    auctions,
    onBidClick,
    emptyMessage
}: {
    auctions: AuctionSummary[];
    onBidClick: (id: number) => void;
    emptyMessage?: string;
}) {
    if (auctions.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                {emptyMessage || 'No auctions'}
            </div>
        );
    }

    return (
        <div className="grid gap-6 justify-start [grid-template-columns:repeat(auto-fill,minmax(345px,350px))]">
            {auctions.map((auction) => (
                <AuctionCard
                    key={auction.auctionId}
                    auction={auction}
                    onBidClick={onBidClick}
                />
            ))}
        </div>
    );
}