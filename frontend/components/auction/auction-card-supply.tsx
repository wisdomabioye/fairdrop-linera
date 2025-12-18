'use client';

import { type AuctionSummary } from '@/lib/gql/types';
import { calculateSupplyPercentage, getSupplyColor } from '@/lib/utils/auction-utils';
import { cn } from '@/lib/utils';

export interface AuctionCardSupplyProps {
  auction: AuctionSummary;
}

/**
 * Supply progress bar for auction cards
 * Shows how many items have been sold out of total supply
 */
export function AuctionCardSupply({ auction }: AuctionCardSupplyProps) {
  const supplyPercentage = calculateSupplyPercentage(auction.sold, auction.totalSupply);
  const supplyColor = getSupplyColor(supplyPercentage);

  return (
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
  );
}
