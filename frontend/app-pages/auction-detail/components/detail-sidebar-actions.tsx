'use client';

import { Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BidForm } from '@/components/auction/bid-form';
import { ClaimForm } from './claim-form';
import { AuctionStatus, type AuctionSummary } from '@/lib/gql/types';
import { formatTimeRemaining } from '@/lib/utils/auction-utils';
import type { ApplicationClient } from 'linera-react-client';

export interface DetailSidebarActionsProps {
  auction: AuctionSummary;
  uicApp: ApplicationClient | null;
  onBidSuccess?: () => void;
  onClaimSuccess?: () => void;
}

/**
 * Status-aware sidebar actions component
 * - Active: Shows bid form
 * - Settled: Shows claim form (handles wallet check, loading, error internally)
 * - Scheduled: Shows countdown to start
 */
export function DetailSidebarActions({
  auction,
  uicApp,
  onBidSuccess,
  onClaimSuccess
}: DetailSidebarActionsProps) {
  switch (auction.status) {
    case AuctionStatus.Active:
      return (
        <BidForm
          auction={auction}
          onSuccess={onBidSuccess}
        />
      );

    case AuctionStatus.Settled:
      // ClaimForm handles all states internally (wallet check, loading, error, etc.)
      return (
        <ClaimForm
          auctionId={auction.auctionId.toString()}
          uicApp={uicApp}
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
