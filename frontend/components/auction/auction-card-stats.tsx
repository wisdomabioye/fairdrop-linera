'use client';

import { TrendingDown, Users } from 'lucide-react';
import { type AuctionSummary } from '@/lib/gql/types';

export interface AuctionCardStatsProps {
  auction: AuctionSummary;
}

/**
 * Auction statistics display (bids and bidders count)
 */
export function AuctionCardStats({ auction }: AuctionCardStatsProps) {
  return (
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
  );
}
