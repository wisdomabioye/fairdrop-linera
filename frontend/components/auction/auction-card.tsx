'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { AuctionStatus, type AuctionSummary } from '@/lib/gql/types';
import { calculateCurrentPrice, isEndingVerySoon } from '@/lib/utils/auction-utils';
import { cn } from '@/lib/utils';
import { APP_ROUTES } from '@/config/app.route';
import { AuctionCardImage } from './auction-card-image';
import { AuctionCardPrice } from './auction-card-price';
import { AuctionCardCountdown } from './auction-card-countdown';
import { AuctionCardSupply } from './auction-card-supply';
import { AuctionCardStats } from './auction-card-stats';
import { AuctionCardActions } from './auction-card-actions';

export interface AuctionCardProps {
  auction: AuctionSummary;
  onBidClick?: (auctionId: number) => void;
  onClaimClick?: (auctionId: number) => void;
  onNotifyClick?: (auctionId: number) => void;
  onViewDetails?: (auctionId: number) => void;
  isRefreshing?: boolean;
}

export function AuctionCard({
  auction,
  onBidClick,
  onClaimClick,
  onNotifyClick,
  onViewDetails,
  isRefreshing = false
}: AuctionCardProps) {
  const router = useRouter();
  const [currentPrice, setCurrentPrice] = useState(calculateCurrentPrice(auction));

  // Only update price for active auctions
  useEffect(() => {
    if (auction.status !== AuctionStatus.Active) return;

    const interval = setInterval(() => {
      setCurrentPrice(calculateCurrentPrice(auction));
    }, 1000);

    return () => clearInterval(interval);
  }, [auction]);

  const handleViewDetails = () => {
    if (onViewDetails) {
      onViewDetails(auction.auctionId);
    } else {
      router.push(APP_ROUTES.auctionDetail(auction.auctionId));
    }
  };

  const handleAction = (e: React.MouseEvent, callback?: (id: number) => void) => {
    e.stopPropagation(); // Prevent card click
    if (callback) {
      callback(auction.auctionId);
    }
  };

  return (
    <Card
      className={cn(
        'hover-lift cursor-pointer relative overflow-hidden animate-fade-in group w-full',
        // Status-specific border colors
        auction.status === AuctionStatus.Active && 'border-primary/20',
        auction.status === AuctionStatus.Settled && 'border-green-500/20',
        auction.status === AuctionStatus.Scheduled && 'border-blue-500/20'
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
        <AuctionCardImage auction={auction} />

        {/* Item Name */}
        <CardTitle className="text-xl line-clamp-1">
          {auction.itemName}
        </CardTitle>

        {/* Status-aware Price Display */}
        <AuctionCardPrice
          auction={auction}
          currentPrice={currentPrice}
          isEndingNow={isEndingVerySoon(auction.endTime)}
        />
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status-aware Countdown */}
        <AuctionCardCountdown auction={auction} />

        {/* Supply Progress - show only for active/settled */}
        {(auction.status === AuctionStatus.Active || auction.status === AuctionStatus.Settled) && (
          <AuctionCardSupply auction={auction} />
        )}

        {/* Stats */}
        <AuctionCardStats auction={auction} />

        {/* Status-aware Action Buttons */}
        <AuctionCardActions
          auction={auction}
          onViewDetails={handleViewDetails}
          onBidClick={onBidClick ? (e) => handleAction(e, onBidClick) : undefined}
          onClaimClick={onClaimClick ? (e) => handleAction(e, onClaimClick) : undefined}
          onNotifyClick={onNotifyClick ? (e) => handleAction(e, onNotifyClick) : undefined}
        />
      </CardContent>
    </Card>
  );
}
