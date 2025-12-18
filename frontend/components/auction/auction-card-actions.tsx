'use client';

import { Bell, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuctionStatus, type AuctionSummary } from '@/lib/gql/types';

export interface AuctionCardActionsProps {
  auction: AuctionSummary;
  onViewDetails: () => void;
  onBidClick?: (e: React.MouseEvent) => void;
  onClaimClick?: (e: React.MouseEvent) => void;
  onNotifyClick?: (e: React.MouseEvent) => void;
}

/**
 * Status-aware action buttons for auction cards
 * - Active: View Details + Quick Bid
 * - Settled: View Results + Claim Rewards
 * - Scheduled: View Details + Notify Me
 */
export function AuctionCardActions({
  auction,
  onViewDetails,
  onBidClick,
  onClaimClick,
  onNotifyClick
}: AuctionCardActionsProps) {
  switch (auction.status) {
    case AuctionStatus.Active:
      return (
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onViewDetails}
          >
            View Details
          </Button>
          {onBidClick && (
            <Button
              variant="default"
              className="flex-1"
              onClick={onBidClick}
            >
              Quick Bid
            </Button>
          )}
        </div>
      );

    case AuctionStatus.Settled:
      return (
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onViewDetails}
          >
            View Results
          </Button>
          {onClaimClick && (
            <Button
              variant="default"
              className="flex-1 bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700"
              onClick={onClaimClick}
            >
              <Gift className="h-4 w-4 mr-1" />
              Claim
            </Button>
          )}
        </div>
      );

    case AuctionStatus.Scheduled:
      return (
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onViewDetails}
          >
            View Details
          </Button>
          {onNotifyClick && (
            <Button
              variant="secondary"
              className="flex-1"
              onClick={onNotifyClick}
            >
              <Bell className="h-4 w-4 mr-1" />
              Notify Me
            </Button>
          )}
        </div>
      );

    default:
      return (
        <Button
          variant="outline"
          className="w-full"
          onClick={onViewDetails}
        >
          View Details
        </Button>
      );
  }
}
