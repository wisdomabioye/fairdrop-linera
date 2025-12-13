'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Users, Package, TrendingDown } from 'lucide-react';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import type { AuctionSummary } from '@/lib/gql/types';
import {
  calculateCurrentPrice,
  formatTimeRemaining,
  getAuctionStatusBadge,
  calculateSupplyPercentage,
  getSupplyColor,
  formatTokenAmount,
  isEndingVerySoon
} from '@/lib/utils/auction-utils';
import { cn } from '@/lib/utils';

export interface AuctionCardProps {
  auction: AuctionSummary;
  showQuickBid?: boolean;
  onBidClick?: (auctionId: number) => void;
  onViewDetails?: (auctionId: number) => void;
  isRefreshing?: boolean;
}

export function AuctionCard({
  auction,
  showQuickBid = true,
  onBidClick,
  onViewDetails,
  isRefreshing = false
}: AuctionCardProps) {
  const router = useRouter();
  const [currentPrice, setCurrentPrice] = useState(
    calculateCurrentPrice(auction)
  );
  const [timeRemaining, setTimeRemaining] = useState(
    formatTimeRemaining(auction.endTime)
  );

  // Update price and countdown every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPrice(calculateCurrentPrice(auction));
      setTimeRemaining(formatTimeRemaining(auction.endTime));
    }, 1000);

    return () => clearInterval(interval);
  }, [auction]);

  const statusBadge = getAuctionStatusBadge(auction);
  const supplyPercentage = calculateSupplyPercentage(auction.sold, auction.totalSupply);
  const supplyColor = getSupplyColor(supplyPercentage);
  const isEndingNow = isEndingVerySoon(auction.endTime);

  const handleViewDetails = () => {
    if (onViewDetails) {
      onViewDetails(auction.auctionId);
    } else {
      router.push(`/auction-detail?id=${auction.auctionId}`);
    }
  };

  const handleQuickBid = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    if (onBidClick) {
      onBidClick(auction.auctionId);
    }
  };

  return (
    <Card
      className={cn(
        'hover-lift cursor-pointer relative overflow-hidden animate-fade-in',
        'group'
      )}
      onClick={handleViewDetails}
    >
      {/* Refresh Indicator */}
      {isRefreshing && (
        <div className="absolute top-3 right-3 z-10">
          <Spinner className="h-4 w-4 text-primary" />
        </div>
      )}

      <CardHeader className="space-y-2">
        {/* Image Placeholder & Status Badge */}
        <div className="relative">
          <div className="w-full h-40 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mb-3">
            <Package className="h-16 w-16 text-muted-foreground/30" />
          </div>
          <Badge
            className={cn(
              'absolute top-2 left-2',
              statusBadge.className
            )}
            variant={statusBadge.variant as any}
          >
            {statusBadge.text}
          </Badge>
        </div>

        {/* Item Name */}
        <CardTitle className="text-xl line-clamp-1">
          {auction.itemName}
        </CardTitle>

        {/* Current Price */}
        <div className={cn(
          'text-2xl font-bold text-primary',
          isEndingNow && 'animate-countdown-pulse'
        )}>
          <div className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            <span>{formatTokenAmount(currentPrice, 18, 4)}</span>
          </div>
          <CardDescription className="text-xs mt-1">
            Current Price
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Countdown */}
        <div className="flex items-center gap-2 text-sm">
          <Clock className={cn(
            'h-4 w-4',
            isEndingNow && 'text-warning animate-pulse'
          )} />
          <span className={cn(
            'font-medium',
            isEndingNow && 'text-warning'
          )}>
            {timeRemaining}
          </span>
        </div>

        {/* Supply Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Supply</span>
            <span className="font-medium">
              {auction.sold} / {auction.totalSupply}
            </span>
          </div>
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full transition-all duration-500',
                supplyColor
              )}
              style={{ width: `${supplyPercentage}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground text-right">
            {supplyPercentage}% sold
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t">
          <div className="flex items-center gap-1.5">
            <TrendingDown className="h-4 w-4" />
            <span>{auction.totalBids} bids</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            <span>{auction.totalBidders} bidders</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleViewDetails}
          >
            View Details
          </Button>
          {showQuickBid && auction.status === 1 && ( // AuctionStatus.Active
            <Button
              variant="default"
              className="flex-1"
              onClick={handleQuickBid}
            >
              Quick Bid
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
