'use client';

import { CheckCircle, Clock, TrendingDown } from 'lucide-react';
import { CardDescription } from '@/components/ui/card';
import { AuctionStatus, type AuctionSummary } from '@/lib/gql/types';
import { formatTokenAmount } from '@/lib/utils/auction-utils';
import { cn } from '@/lib/utils';

export interface AuctionCardPriceProps {
  auction: AuctionSummary;
  currentPrice: string;
  isEndingNow: boolean;
}

/**
 * Status-aware price display for auction cards
 * - Active: Shows current declining price
 * - Settled: Shows final clearing price
 * - Scheduled: Shows starting price
 */
export function AuctionCardPrice({
  auction,
  currentPrice,
  isEndingNow
}: AuctionCardPriceProps) {
  switch (auction.status) {
    case AuctionStatus.Active:
      return (
        <div className={cn(
          'text-2xl font-bold text-primary',
          isEndingNow && 'animate-countdown-pulse'
        )}>
          <div className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            <span>{formatTokenAmount(currentPrice, 18, 4)} fUSD</span>
          </div>
          <CardDescription className="text-xs mt-1">
            Current Price
          </CardDescription>
        </div>
      );

    case AuctionStatus.Settled:
      return (
        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            <span>{formatTokenAmount(auction.clearingPrice || '0', 18, 4)} fUSD</span>
          </div>
          <CardDescription className="text-xs mt-1">
            Clearing Price • {auction.sold} sold
          </CardDescription>
        </div>
      );

    case AuctionStatus.Scheduled:
      return (
        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            <span>{formatTokenAmount(auction.startPrice, 18, 4)} fUSD</span>
          </div>
          <CardDescription className="text-xs mt-1">
            Starting Price
          </CardDescription>
        </div>
      );

    default:
      return null;
  }
}
