'use client';

import { useState, useMemo } from 'react';
import { Trophy, CheckCircle, Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { useCachedBidHistory, useAacApp } from '@/hooks';
import {
  truncateAddress,
  formatTokenAmount,
  formatRelativeTime,
  formatAbsoluteTime
} from '@/lib/utils/auction-utils';
import { cn } from '@/lib/utils';

export interface BidHistoryProps {
  auctionId: string;
  limit?: number;
  compact?: boolean;
  currentUserWalletAddress?: string;
}

export function BidHistory({
  auctionId,
  limit = 20,
  compact = false,
  currentUserWalletAddress
}: BidHistoryProps) {
  const aacApp = useAacApp();
  const [offset, setOffset] = useState(0);

  const {
    bids,
    loading,
    isFetching,
    error,
  } = useCachedBidHistory({
    auctionId,
    offset,
    limit,
    aacApp: aacApp.app,
    skip: !aacApp.app
  });

  // Sort bids: latest first
  const sortedBids = useMemo(() => {
    if (!bids) return [];
    return [...bids].sort((a, b) => b.timestamp - a.timestamp);
  }, [bids]);

  const handleLoadMore = () => setOffset(offset + limit);
  const handleLoadPrevious = () => setOffset(Math.max(0, offset - limit));

  // Loading state
  if (loading) {
    return (
      <div className={cn('px-3', compact && 'px-2')}>
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-2.5 w-16" />
              </div>
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="px-3 py-4 text-center text-sm text-destructive">
        Failed to load bids
      </div>
    );
  }

  // Empty state
  if (!sortedBids || sortedBids.length === 0) {
    return (
      <div className="px-3 py-6 text-center">
        <Trophy className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
        <p className="text-xs text-muted-foreground">No bids yet</p>
      </div>
    );
  }

  return (
    <div className={cn('px-3 pb-3', compact && 'px-2 pb-2')}>
      {/* Bid List */}
      <div className="space-y-1">
        {sortedBids.map((bid) => {
          const isCurrentUser = currentUserWalletAddress && 
            bid.userAccount.toLowerCase() === currentUserWalletAddress.toLowerCase();

          return (
            <div
              key={bid.bidId}
              className={cn(
                'flex items-center gap-2 py-1.5 px-2 rounded-md transition-colors',
                'hover:bg-muted/50',
                isCurrentUser && 'bg-primary/5'
              )}
            >
              {/* Status Icon */}
              <div className="flex-shrink-0">
                {bid.claimed ? (
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <Clock className="h-3.5 w-3.5 text-muted-foreground/60" />
                )}
              </div>

              {/* Bidder & Time */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {isCurrentUser && (
                    <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
                      You
                    </Badge>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <code className="text-[10px] text-muted-foreground truncate cursor-help">
                        {truncateAddress(bid.userAccount, 4, 3)}
                      </code>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p className="text-xs font-mono">{bid.userAccount}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p className="text-[9px] text-muted-foreground/70 cursor-help">
                      {formatRelativeTime(bid.timestamp)}
                    </p>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-xs">{formatAbsoluteTime(bid.timestamp)}</p>
                  </TooltipContent>
                </Tooltip>
              </div>

              {/* Quantity & Amount */}
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-medium">{bid.quantity}x</p>
                <p className="text-[9px] text-muted-foreground font-mono">
                  {formatTokenAmount(bid.amountPaid.toString(), 18, 2)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {sortedBids.length >= limit && (
        <div className="flex items-center justify-between pt-2 mt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs px-2"
            onClick={handleLoadPrevious}
            disabled={offset === 0 || isFetching}
          >
            Prev
          </Button>
          <span className="text-[10px] text-muted-foreground">
            {offset + 1}-{offset + sortedBids.length}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs px-2"
            onClick={handleLoadMore}
            disabled={isFetching}
          >
            More
          </Button>
        </div>
      )}
    </div>
  );
}
