'use client';

import { Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { type AuctionSummary } from '@/lib/gql/types';
import { getAuctionStatusBadge } from '@/lib/utils/auction-utils';
import { cn } from '@/lib/utils';

export interface AuctionCardImageProps {
  auction: AuctionSummary;
}

/**
 * Image placeholder with status badge for auction cards
 * TODO: Replace with actual item images when available
 */
export function AuctionCardImage({ auction }: AuctionCardImageProps) {
  const statusBadge = getAuctionStatusBadge(auction);

  return (
    <div className="relative">
      <div className="w-full h-40 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mb-3">
        <Package className="h-16 w-16 text-muted-foreground/30" />
      </div>
      <Badge
        className={cn(
          'absolute top-2 left-2',
          statusBadge.className
        )}
        variant={statusBadge.variant}
      >
        {statusBadge.text}
      </Badge>
    </div>
  );
}
