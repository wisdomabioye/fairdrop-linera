'use client';

import { useRouter } from 'next/navigation';
import { CheckCircle2, RefreshCw } from 'lucide-react';
import { useLineraApplication } from 'linera-react-client';
import { useCachedSettledAuctions, useAuctionMutations, useCachedMyCommitment } from '@/hooks';
import { AAC_APP_ID, UIC_APP_ID } from '@/config/app.config';
import { AuctionCard } from '@/components/auction/auction-card';
import { AuctionSkeletonGrid } from '@/components/loading/auction-skeleton';
import { ErrorState } from '@/components/loading/error-state';
import { EmptyState } from '@/components/loading/empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function SettledAuctions() {
    const router = useRouter();
    const aacApp = useLineraApplication(AAC_APP_ID);
    const uicApp = useLineraApplication(UIC_APP_ID);

    const {
        auctions,
        loading,
        isFetching,
        error,
        hasLoadedOnce,
        refetch
    } = useCachedSettledAuctions({
        offset: 0,
        limit: 20,
        aacApp: aacApp.app
    });

    const { claimSettlement, isClaiming } = useAuctionMutations({
        uicApp: uicApp.app,
        onClaimSuccess: (auctionId) => {
            toast.success('Settlement claimed successfully!', {
                description: `Auction ID: ${auctionId}`
            });
            refetch();
        },
        onError: (error) => {
            toast.error('Failed to claim settlement', {
                description: error.message
            });
        }
    });

    const handleCreateAuction = () => {
        router.push('/create-auction');
    };

    const handleClaimClick = async (auctionId: number) => {
        await claimSettlement(auctionId);
    };

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <header className="mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-bold mb-2">Settled Auctions</h1>
                        <p className="text-muted-foreground">
                            Completed auctions with final clearing prices
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => refetch()}
                        disabled={isFetching}
                    >
                        <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </header>

            {/* Loading State */}
            {loading && !hasLoadedOnce && (
                <AuctionSkeletonGrid count={8} />
            )}

            {/* Error State */}
            {error && (
                <ErrorState
                    error={error}
                    onRetry={refetch}
                    title="Failed to load settled auctions"
                />
            )}

            {/* Empty State */}
            {!loading && !error && auctions && auctions.length === 0 && (
                <EmptyState
                    title="No settled auctions yet"
                    description="Settled auctions will appear here after they end"
                    icon={<CheckCircle2 className="h-12 w-12" />}
                    action={
                        <Button onClick={handleCreateAuction}>
                            View Active Auctions
                        </Button>
                    }
                />
            )}

            {/* Auctions Grid */}
            {auctions && auctions.length > 0 && (
                <div className="space-y-6">
                    {/* Info Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Settlement Information</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                These auctions have ended and been settled. The clearing price is the final price all winners pay.
                                If you participated, you can claim your settlement below.
                            </p>
                        </CardContent>
                    </Card>

                    {/* Auctions Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {auctions.map((auction) => (
                            <SettledAuctionCard
                                key={auction.auctionId}
                                auction={auction}
                                onClaimClick={handleClaimClick}
                                isClaiming={isClaiming}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// Settled Auction Card with Claim Button
function SettledAuctionCard({
    auction,
    onClaimClick,
    isClaiming
}: {
    auction: any;
    onClaimClick: (id: number) => void;
    isClaiming: boolean;
}) {
    const uicApp = useLineraApplication(UIC_APP_ID);

    const { commitment, loading } = useCachedMyCommitment({
        auctionId: auction.auctionId.toString(),
        uicApp: uicApp.app,
        skip: !uicApp.app
    });

    const hasCommitment = commitment && commitment.totalQuantity > 0;
    const hasClaimed = commitment?.settlement && commitment.totalQuantity > 0;

    return (
        <div className="relative">
            <AuctionCard
                auction={auction}
                showQuickBid={false}
            />
            {hasCommitment && !hasClaimed && (
                <div className="absolute bottom-4 left-4 right-4">
                    <Button
                        onClick={() => onClaimClick(auction.auctionId)}
                        disabled={isClaiming || loading}
                        className="w-full gap-2"
                        variant="success"
                    >
                        {isClaiming ? 'Claiming...' : 'Claim Settlement'}
                    </Button>
                </div>
            )}
        </div>
    );
}