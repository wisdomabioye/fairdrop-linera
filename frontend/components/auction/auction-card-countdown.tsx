'use client';

import { useState, useEffect } from 'react';
import { Clock, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AuctionStatus, type AuctionSummary } from '@/lib/gql/types';
import { formatTimeRemaining, isEndingVerySoon, formatTimeSince, isStartingVerySoon } from '@/lib/utils/auction-utils';
import { cn } from '@/lib/utils';

export interface AuctionCardCountdownProps {
  auction: AuctionSummary;
}

/**
 * Status-aware countdown display for auction cards
 * - Active: Countdown to end time
 * - Scheduled: Countdown to start time
 * - Settled: Time since auction ended
 */
export function AuctionCardCountdown({ auction }: AuctionCardCountdownProps) {
  const [timeDisplay, setTimeDisplay] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    const updateCountdown = () => {
      switch (auction.status) {
        case AuctionStatus.Scheduled:
          setTimeDisplay(`Starts in ${formatTimeRemaining(auction.startTime)}`);
          setIsUrgent(isStartingVerySoon(auction.startTime));
          break;

        case AuctionStatus.Active:
          setTimeDisplay(formatTimeRemaining(auction.endTime));
          setIsUrgent(isEndingVerySoon(auction.endTime));
          break;

        case AuctionStatus.Settled:
          setTimeDisplay(`Ended ${formatTimeSince(auction.endTime)}`);
          setIsUrgent(false);
          break;
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [auction]);

  if (auction.status === AuctionStatus.Settled) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CheckCircle className="h-4 w-4 text-green-500" />
        <span>{timeDisplay}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <Clock className={cn(
        'h-4 w-4',
        isUrgent && 'text-warning animate-pulse'
      )} />
      <span className={cn(
        'font-medium',
        isUrgent && 'text-warning'
      )}>
        {timeDisplay}
      </span>
      {auction.status === AuctionStatus.Scheduled && (
        <Badge variant="outline" className="ml-auto text-blue-600 border-blue-600">
          Upcoming
        </Badge>
      )}
    </div>
  );
}
