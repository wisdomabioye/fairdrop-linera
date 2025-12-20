'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Package, Share2 } from 'lucide-react';
import { useLineraApplication } from 'linera-react-client';
import { useCachedAuctionSummary, useCachedMyCommitment } from '@/hooks';
import { AAC_APP_ID } from '@/config/app.config';
import { BidHistory } from '@/components/auction/bid-history';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ErrorState } from '@/components/loading/error-state';
import { DetailPriceDisplay } from './components/detail-price-display';
import { DetailCountdown } from './components/detail-countdown';
import { DetailSidebarActions } from './components/detail-sidebar-actions';
import { AuctionStatus } from '@/lib/gql/types';
import {
  calculateCurrentPrice,
  getAuctionStatusBadge,
  calculateSupplyPercentage,
  formatTokenAmount,
  formatAbsoluteTime,
  isEndingVerySoon
} from '@/lib/utils/auction-utils';

export default function AuctionDetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auctionId = searchParams?.get('id') || '';

  const aacApp = useLineraApplication(AAC_APP_ID);

  const [currentPrice, setCurrentPrice] = useState('0');

  // Fetch auction details
  const {
    auction,
    isFetching,
    loading,
    error,
    refetch
  } = useCachedAuctionSummary({
    auctionId,
    aacApp: aacApp.app,
    enablePolling: true,
    skip: !auctionId || !aacApp.app
  });

  // Fetch user's commitment (for active auctions display)
  const { commitment } = useCachedMyCommitment({
    auctionId,
    uicApp: aacApp.app,
    skip: !auctionId || !aacApp.app?.walletClient
  });

  // Update price only for active auctions
  useEffect(() => {
    if (!auction || auction.status !== AuctionStatus.Active) return;

    const updatePrice = () => {
      setCurrentPrice(calculateCurrentPrice(auction));
    };

    updatePrice();
    const interval = setInterval(updatePrice, 1000);

    return () => clearInterval(interval);
  }, [auction]);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: auction?.itemName || 'Auction',
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard');
    }
  };

  const handleBack = () => {
    router.back();
  };

  // Loading state
  if (loading || (isFetching && !auction)) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Skeleton className="h-10 w-32 mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-96 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !auction) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <ErrorState
          error={error || new Error('Auction not found')}
          onRetry={refetch}
          title="Failed to load auction details"
        />
      </div>
    );
  }

  const statusBadge = getAuctionStatusBadge(auction);
  const supplyPercentage = calculateSupplyPercentage(auction.sold, auction.totalSupply);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <Button
          variant="ghost"
          onClick={handleBack}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={handleShare}
        >
          <Share2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Auction Hero */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-3xl">{auction.itemName}</CardTitle>
                    <Badge
                      className={cn(statusBadge.className)}
                      variant={statusBadge.variant}
                    >
                      {statusBadge.text}
                    </Badge>
                  </div>
                  <CardDescription>
                    Auction ID: {auction.auctionId}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Image Placeholder */}
              <div className="w-full h-96 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                <Package className="h-32 w-32 text-muted-foreground/30" />
              </div>

              {/* Price and Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Status-aware price display */}
                <DetailPriceDisplay
                  auction={auction}
                  currentPrice={currentPrice}
                  isEndingNow={isEndingVerySoon(auction.endTime)}
                />

                {/* Status-aware countdown */}
                <DetailCountdown auction={auction} />

                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Supply</p>
                  <p className="text-2xl font-bold">
                    {auction.sold} / {auction.totalSupply}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Bids</p>
                  <p className="text-2xl font-bold">{auction.totalBids}</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: `${supplyPercentage}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground text-right">
                  {supplyPercentage}% sold
                </p>
              </div>

              <Separator />

              {/* Auction Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">Start Price</p>
                  <p className="font-mono">{formatTokenAmount(auction.startPrice, 18, 4)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Floor Price</p>
                  <p className="font-mono">{formatTokenAmount(auction.floorPrice, 18, 4)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Price Decay</p>
                  <p className="font-mono">
                    {formatTokenAmount(auction.priceDecayAmount, 18, 4)} every {auction.priceDecayInterval}s
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Clearing Price</p>
                  <p className="font-mono">
                    {auction.clearingPrice ? formatTokenAmount(auction.clearingPrice, 18, 4) : 'TBD'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Start Time</p>
                  <p>{formatAbsoluteTime(auction.startTime)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">End Time</p>
                  <p>{formatAbsoluteTime(auction.endTime)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bid History */}
          <BidHistory
            auctionId={auctionId}
            currentUserChain={aacApp.app?.walletClient?.getChainId()}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status-aware Actions (Bid/Claim) */}
          <DetailSidebarActions
            auction={auction}
            uicApp={aacApp.app}
            onBidSuccess={() => {
              refetch();
            }}
            onClaimSuccess={() => {
              refetch();
            }}
          />

          {/* User's Commitment (for active auctions) */}
          {auction.status === AuctionStatus.Active && commitment && commitment.totalQuantity > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Your Bids</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Quantity</span>
                  <span className="font-semibold">{commitment.totalQuantity}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
