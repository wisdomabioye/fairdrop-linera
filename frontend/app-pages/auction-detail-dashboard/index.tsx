'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Share2, Clock, TrendingDown, Package2, Users, Zap, Trophy } from 'lucide-react';
import { useLineraApplication, useWalletConnection } from 'linera-react-client';
import { useCachedAuctionSummary, useCachedMyCommitment } from '@/hooks';
import { AAC_APP_ID } from '@/config/app.config';
import { BidHistory } from '@/components/auction/bid-history';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ErrorState } from '@/components/loading/error-state';
import { DetailPriceDisplay } from '@/app-pages/auction-detail/components/detail-price-display';
import { DetailCountdown } from '@/app-pages/auction-detail/components/detail-countdown';
import { DetailSidebarActions } from '@/app-pages/auction-detail/components/detail-sidebar-actions';
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
  const params = useParams();
  const auctionId = params?.auctionId as string || '';
  const { isConnected } = useWalletConnection();

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

  // Fetch user's commitment
  const { commitment } = useCachedMyCommitment({
    auctionId,
    uicApp: aacApp.app,
    skip: !auctionId || !aacApp.app?.walletClient
  });

  // Update price for active auctions
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
    router.push('/');
  };

  // Loading state
  if (loading || (isFetching && !auction)) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-10 w-32" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-[500px] w-full" />
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
      <div className="max-w-7xl mx-auto">
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
  const isActive = auction.status === AuctionStatus.Active;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header with Back and Share */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={handleBack}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Auctions
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleShare}
          className="gap-2"
        >
          <Share2 className="h-4 w-4" />
          <span className="hidden sm:inline">Share</span>
        </Button>
      </div>

      {/* Hero Section with Title and Status */}
      <Card className="border-none shadow-lg bg-gradient-to-br from-card via-card to-card/50">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-4xl font-bold">{auction.itemName}</h1>
                <Badge
                  className={cn('text-xs px-3 py-1', statusBadge.className)}
                  variant={statusBadge.variant}
                >
                  {statusBadge.text}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground font-mono">
                Auction #{auction.auctionId}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Auction Visual */}
          <Card className="overflow-hidden">
            <div className="relative w-full h-[400px] bg-gradient-to-br from-primary/5 via-accent/5 to-primary/10 flex items-center justify-center group">
              <div className="absolute inset-0 bg-grid-white/5" />
              <Package2 className="h-32 w-32 text-muted-foreground/20 group-hover:scale-110 transition-transform duration-500" />

              {/* Floating Stats */}
              <div className="absolute bottom-4 left-4 right-4 flex gap-2">
                <div className="flex-1 bg-background/80 backdrop-blur-sm rounded-lg p-3 border border-border/50">
                  <p className="text-xs text-muted-foreground mb-1">Supply</p>
                  <p className="text-lg font-bold">{auction.sold} / {auction.totalSupply}</p>
                </div>
                <div className="flex-1 bg-background/80 backdrop-blur-sm rounded-lg p-3 border border-border/50">
                  <p className="text-xs text-muted-foreground mb-1">Bids</p>
                  <p className="text-lg font-bold">{auction.totalBids}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Key Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center gap-2 text-primary mb-2">
                  <TrendingDown className="h-4 w-4" />
                  <p className="text-xs font-medium">Current Price</p>
                </div>
                <DetailPriceDisplay
                  auction={auction}
                  currentPrice={currentPrice}
                  isEndingNow={isEndingVerySoon(auction.endTime)}
                />
              </CardContent>
            </Card>

            <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent">
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center gap-2 text-blue-500 mb-2">
                  <Clock className="h-4 w-4" />
                  <p className="text-xs font-medium">Time Remaining</p>
                </div>
                <DetailCountdown auction={auction} />
              </CardContent>
            </Card>

            <Card className="border-success/20 bg-gradient-to-br from-success/5 to-transparent">
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center gap-2 text-success mb-2">
                  <Package2 className="h-4 w-4" />
                  <p className="text-xs font-medium">Availability</p>
                </div>
                <p className="text-2xl font-bold">{supplyPercentage}%</p>
                <p className="text-xs text-muted-foreground">sold</p>
              </CardContent>
            </Card>

            <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center gap-2 text-amber-500 mb-2">
                  <Users className="h-4 w-4" />
                  <p className="text-xs font-medium">Participation</p>
                </div>
                <p className="text-2xl font-bold">{auction.totalBids}</p>
                <p className="text-xs text-muted-foreground">bids</p>
              </CardContent>
            </Card>
          </div>

          {/* Supply Progress */}
          <Card>
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Supply Progress</p>
                <p className="text-sm text-muted-foreground">
                  {auction.sold} of {auction.totalSupply} sold
                </p>
              </div>
              <div className="relative w-full h-4 bg-secondary rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full transition-all duration-700 ease-out',
                    isActive
                      ? 'bg-gradient-to-r from-primary via-primary to-primary/80'
                      : 'bg-success'
                  )}
                  style={{ width: `${supplyPercentage}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Auction Mechanism Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Auction Mechanism
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground">Start Price</p>
                  <p className="text-lg font-mono font-semibold">
                    {formatTokenAmount(auction.startPrice, 18, 4)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Floor Price</p>
                  <p className="text-lg font-mono font-semibold">
                    {formatTokenAmount(auction.floorPrice, 18, 4)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Price Decay</p>
                  <p className="text-base font-mono">
                    -{formatTokenAmount(auction.priceDecayAmount, 18, 4)} / {auction.priceDecayInterval}s
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Clearing Price</p>
                  <p className="text-lg font-mono font-semibold">
                    {auction.clearingPrice
                      ? formatTokenAmount(auction.clearingPrice, 18, 4)
                      : <span className="text-muted-foreground">Not set</span>
                    }
                  </p>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground">Start Time</p>
                  <p>{formatAbsoluteTime(auction.startTime)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">End Time</p>
                  <p>{formatAbsoluteTime(auction.endTime)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">How It Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Package2 className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium mb-1">Descending Price Auction</p>
                  <p className="text-xs text-muted-foreground">
                    Price decreases over time until floor price is reached
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                  <Users className="h-4 w-4 text-success" />
                </div>
                <div>
                  <p className="font-medium mb-1">Uniform Clearing</p>
                  <p className="text-xs text-muted-foreground">
                    All successful bidders pay the same clearing price
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          {/* Action Card */}
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

          {/* User's Commitment */}
          {isActive && commitment && commitment.totalQuantity > 0 && (
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Trophy className="h-5 w-5 text-primary" />
                  Your Bids
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Quantity</span>
                  <span className="text-2xl font-bold text-primary">{commitment.totalQuantity}</span>
                </div>
                <Separator />
                <p className="text-xs text-muted-foreground">
                  Your committed bids in this auction
                </p>
              </CardContent>
            </Card>
          )}

          {/* Bid History - Scrollable */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Bid History</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Sorted: Recent to oldest</p>
            </CardHeader>
            <div className="max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
              <BidHistory
                auctionId={auctionId}
                currentUserChain={aacApp.app?.walletClient?.getChainId()}
                compact
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
