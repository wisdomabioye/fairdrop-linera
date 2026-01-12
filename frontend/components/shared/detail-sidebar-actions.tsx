'use client';

import { memo } from 'react';
import { Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BidForm } from '@/components/auction/bid-form';
import { ClaimForm } from '../auction/auction-claim-form';
import { AuctionStatus, type AuctionSummary } from '@/lib/gql/types';
import { formatTimeRemaining } from '@/lib/utils/auction-utils';
import type { ApplicationClient } from 'linera-react-client';

export interface DetailSidebarActionsProps {
  auction: AuctionSummary;
  aacApp: ApplicationClient | null;
  onBidSuccess?: () => void;
  onClaimSuccess?: () => void;
}

// Memoized BidForm wrapper - only re-renders when auction ID changes
const MemoizedBidForm = memo(BidForm, (prevProps, nextProps) => {
  // Only re-render if these key values actually changed
  return (
    prevProps.auction.auctionId === nextProps.auction.auctionId &&
    prevProps.auction.currentPrice === nextProps.auction.currentPrice &&
    prevProps.auction.sold === nextProps.auction.sold &&
    prevProps.auction.status === nextProps.auction.status &&
    prevProps.auction.totalBids === nextProps.auction.totalBids &&
    prevProps.auction.maxBidAmount === nextProps.auction.maxBidAmount
  );
});

/**
 * Status-aware sidebar actions component
 * - Active: Shows bid form
 * - Settled: Shows claim form (handles wallet check, loading, error internally)
 * - Scheduled: Shows countdown to start
 */
export function DetailSidebarActions({
  auction,
  aacApp,
  onBidSuccess,
  onClaimSuccess
}: DetailSidebarActionsProps) {
  switch (auction.status) {
    case AuctionStatus.Active:
      return (
        <MemoizedBidForm
          auction={auction}
          onSuccess={onBidSuccess}
        />
      );

    case AuctionStatus.Settled:
      // ClaimForm handles all states internally (wallet check, loading, error, etc.)
      return (
        <ClaimForm
          auction={auction}
          aacApp={aacApp}
          onSuccess={onClaimSuccess}
        />
      );

    case AuctionStatus.Scheduled:
      return (
        <Card>
          <CardHeader>
            <CardTitle>Auction Not Started</CardTitle>
            <CardDescription>
              Bidding will open soon
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                <div className="font-semibold mb-1">Starts in</div>
                <div className="text-lg">{formatTimeRemaining(auction.startTime)}</div>
              </AlertDescription>
            </Alert>
            <div className="text-sm text-muted-foreground text-center">
              Check back when the auction starts to place your bids
            </div>
          </CardContent>
        </Card>
      );

    default:
      return (
        <Card>
          <CardHeader>
            <CardTitle>Auction Unavailable</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>
                This auction is not available for bidding.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      );
  }
}
