'use client';

import { useState } from 'react';
import { useLineraApplication } from 'linera-react-client';
import { Trophy, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCachedBidHistory } from '@/hooks';
import { AAC_APP_ID } from '@/config/app.config';
// import type { BidRecord } from '@/lib/gql/types';
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
  currentUserChain?: string;
}

export function BidHistory({
  auctionId,
  limit = 20,
  compact = false,
  currentUserChain
}: BidHistoryProps) {
  const aacApp = useLineraApplication(AAC_APP_ID);
  const [offset, setOffset] = useState(0);

  const {
    bids,
    loading,
    isFetching,
    error,
    hasLoadedOnce
  } = useCachedBidHistory({
    auctionId,
    offset,
    limit,
    aacApp: aacApp.app,
    skip: !aacApp.app
  });

  const handleLoadMore = () => {
    setOffset(offset + limit);
  };

  const handleLoadPrevious = () => {
    setOffset(Math.max(0, offset - limit));
  };

  // Loading state
  if (loading && !hasLoadedOnce) {
    return (
      <Card className={compact ? 'border-0 shadow-none' : undefined}>
        <CardHeader>
          <CardTitle>Bid History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={compact ? 'border-0 shadow-none' : undefined}>
        <CardContent className="p-6 text-center text-destructive">
          <p>Failed to load bid history: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (!bids || bids.length === 0) {
    return (
      <Card className={compact ? 'border-0 shadow-none' : undefined}>
        <CardHeader>
          <CardTitle>Bid History</CardTitle>
        </CardHeader>
        <CardContent className="p-6 text-center text-muted-foreground">
          <Trophy className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No bids yet. Be the first to bid!</p>
        </CardContent>
      </Card>
    );
  }

  // Sort bids by timestamp: recent to oldest (descending)
  const sortedBids = [...bids].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <Card className={compact ? 'border-0 shadow-none' : undefined}>
      {!compact && (
        <CardHeader>
          <CardTitle>Bid History</CardTitle>
          <p className="text-sm text-muted-foreground">
            {sortedBids.length} bid{sortedBids.length !== 1 ? 's' : ''} shown
          </p>
        </CardHeader>
      )}

      <CardContent className={cn(compact ? 'p-0' : 'space-y-3')}>
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-sm text-muted-foreground">
                <th className="pb-2 font-medium">Bidder</th>
                <th className="pb-2 font-medium">Quantity</th>
                <th className="pb-2 font-medium">Amount Paid</th>
                <th className="pb-2 font-medium">Time</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedBids.map((bid) => {
                const isCurrentUser = currentUserChain && bid.userChain === currentUserChain;

                return (
                  <tr
                    key={bid.bidId}
                    className={cn(
                      'border-b last:border-0 text-sm',
                      isCurrentUser && 'bg-primary/5'
                    )}
                  >
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        {isCurrentUser && (
                          <div className="h-2 w-2 rounded-full bg-primary" />
                        )}
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {truncateAddress(bid.userChain, 8, 6)}
                        </code>
                      </div>
                    </td>
                    <td className="py-3 font-medium">{bid.quantity}</td>
                    <td className="py-3 font-mono">
                      {formatTokenAmount(bid.amountPaid.toString(), 18, 4)}
                    </td>
                    <td className="py-3 text-muted-foreground">
                      <span title={formatAbsoluteTime(bid.timestamp)}>
                        {formatRelativeTime(bid.timestamp)}
                      </span>
                    </td>
                    <td className="py-3">
                      {bid.claimed ? (
                        <div className="flex items-center gap-1 text-success">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-xs">Claimed</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <XCircle className="h-4 w-4" />
                          <span className="text-xs">Pending</span>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3">
          {sortedBids.map((bid) => {
            const isCurrentUser = currentUserChain && bid.userChain === currentUserChain;

            return (
              <div
                key={bid.bidId}
                className={cn(
                  'border rounded-lg p-4 space-y-2',
                  isCurrentUser && 'bg-primary/5 border-primary/20'
                )}
              >
                <div className="flex items-center justify-between">
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    {truncateAddress(bid.userChain, 6, 4)}
                  </code>
                  {bid.claimed ? (
                    <div className="flex items-center gap-1 text-success text-xs">
                      <CheckCircle className="h-3 w-3" />
                      <span>Claimed</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-muted-foreground text-xs">
                      <XCircle className="h-3 w-3" />
                      <span>Pending</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Quantity</span>
                  <span className="font-medium">{bid.quantity}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Amount Paid</span>
                  <span className="font-mono font-medium">
                    {formatTokenAmount(bid.amountPaid.toString(), 18, 4)}
                  </span>
                </div>

                <div className="text-xs text-muted-foreground pt-1 border-t">
                  {formatRelativeTime(bid.timestamp)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {sortedBids.length >= limit && (
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={handleLoadPrevious}
              disabled={offset === 0 || isFetching}
            >
              Previous
            </Button>

            <span className="text-sm text-muted-foreground">
              Showing {offset + 1} - {offset + sortedBids.length}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={handleLoadMore}
              disabled={isFetching}
            >
              Load More
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
