'use client';

import { TrendingDown, CheckCircle, Clock } from 'lucide-react';
import { AuctionStatus, type AuctionSummary } from '@/lib/gql/types';
import { formatTokenAmount } from '@/lib/utils/auction-utils';
import { cn } from '@/lib/utils';

export interface DetailPriceDisplayProps {
  auction: AuctionSummary;
  currentPrice: string;
  isEndingNow?: boolean;
}

/**
 * Status-aware price display for auction detail page
 * - Active: Shows current declining price
 * - Settled: Shows final clearing price
 * - Scheduled: Shows starting price
 */
export function DetailPriceDisplay({
  auction,
  currentPrice,
  isEndingNow = false
}: DetailPriceDisplayProps) {
  switch (auction.status) {
    case AuctionStatus.Active:
      return (
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Current Price</p>
          <p className={cn(
            'text-2xl font-bold text-primary flex items-center gap-2',
            isEndingNow && 'animate-countdown-pulse'
          )}>
            <TrendingDown className="h-6 w-6" />
            {formatTokenAmount(currentPrice, 18, 4)} fUSD
          </p>
        </div>
      );

    case AuctionStatus.Settled:
      return (
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Final Clearing Price</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400 flex items-center gap-2">
            <CheckCircle className="h-6 w-6" />
            {formatTokenAmount(auction.clearingPrice || auction.currentPrice, 18, 4)} fUSD
          </p>
        </div>
      );

    case AuctionStatus.Scheduled:
      return (
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Starting Price</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2">
            <Clock className="h-6 w-6" />
            {formatTokenAmount(auction.startPrice, 18, 4)} fUSD
          </p>
        </div>
      );

    default:
      return (
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Price</p>
          <p className="text-2xl font-bold text-muted-foreground">
            {formatTokenAmount(currentPrice, 18, 4)} fUSD
          </p>
        </div>
      );
  }
}
