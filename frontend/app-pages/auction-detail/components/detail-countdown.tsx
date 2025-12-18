'use client';

import { useState, useEffect } from 'react';
import { Clock, CheckCircle } from 'lucide-react';
import { AuctionStatus, type AuctionSummary } from '@/lib/gql/types';
import { formatTimeRemaining, formatTimeSince } from '@/lib/utils/auction-utils';

export interface DetailCountdownProps {
  auction: AuctionSummary;
}

/**
 * Status-aware countdown display for auction detail page
 * - Active: Countdown to end time
 * - Scheduled: Countdown to start time
 * - Settled: Time since auction ended
 */
export function DetailCountdown({ auction }: DetailCountdownProps) {
  const [timeDisplay, setTimeDisplay] = useState('');

  useEffect(() => {
    const updateCountdown = () => {
      switch (auction.status) {
        case AuctionStatus.Scheduled:
          setTimeDisplay(formatTimeRemaining(auction.startTime));
          break;

        case AuctionStatus.Active:
          setTimeDisplay(formatTimeRemaining(auction.endTime));
          break;

        case AuctionStatus.Settled:
          setTimeDisplay(formatTimeSince(auction.endTime));
          break;
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [auction]);

  switch (auction.status) {
    case AuctionStatus.Scheduled:
      return (
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Starts In</p>
          <p className="text-2xl font-bold flex items-center gap-2">
            <Clock className="h-6 w-6 text-blue-600" />
            {timeDisplay}
          </p>
        </div>
      );

    case AuctionStatus.Active:
      return (
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Time Remaining</p>
          <p className="text-2xl font-bold flex items-center gap-2">
            <Clock className="h-6 w-6" />
            {timeDisplay}
          </p>
        </div>
      );

    case AuctionStatus.Settled:
      return (
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Ended</p>
          <p className="text-2xl font-bold text-muted-foreground flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-600" />
            {timeDisplay}
          </p>
        </div>
      );

    default:
      return null;
  }
}
