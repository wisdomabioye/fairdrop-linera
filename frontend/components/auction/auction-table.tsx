'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { APP_ROUTES } from '@/config/app.route';
import { AuctionStatus, type AuctionSummary } from '@/lib/gql/types';
import { calculateCurrentPrice, formatTokenAmount, formatTimeRemaining } from '@/lib/utils/auction-utils';

interface AuctionTableProps {
  auctions: AuctionSummary[];
  onBidClick?: (auctionId: number) => void;
  onClaimClick?: (auctionId: number) => void;
}

export function AuctionTable({ auctions, onBidClick, onClaimClick }: AuctionTableProps) {
  const router = useRouter();

  if (!auctions || auctions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No auctions found
      </div>
    );
  }

  return (
    <div className="w-full border border-border/50 rounded-xl overflow-hidden">
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead className="bg-muted/50 border-b border-border/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Auction
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Current Price
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Time Remaining
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Supply
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Bids
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border/30">
            {auctions.map((auction) => (
              <AuctionTableRow
                key={auction.auctionId}
                auction={auction}
                onBidClick={onBidClick}
                onClaimClick={onClaimClick}
                onViewDetails={() => router.push(APP_ROUTES.auctionDetail(auction.auctionId))}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface AuctionTableRowProps {
  auction: AuctionSummary;
  onBidClick?: (auctionId: number) => void;
  onClaimClick?: (auctionId: number) => void;
  onViewDetails: () => void;
}

function AuctionTableRow({ auction, onBidClick, onClaimClick, onViewDetails }: AuctionTableRowProps) {
  const [currentPrice, setCurrentPrice] = useState(calculateCurrentPrice(auction));
  const [timeRemaining, setTimeRemaining] = useState(formatTimeRemaining(auction.endTime));

  useEffect(() => {
    if (auction.status !== AuctionStatus.Active) return;

    const interval = setInterval(() => {
      setCurrentPrice(calculateCurrentPrice(auction));
      setTimeRemaining(formatTimeRemaining(auction.endTime));
    }, 1000);

    return () => clearInterval(interval);
  }, [auction]);

  const getStatusBadge = () => {
    switch (auction.status) {
      case AuctionStatus.Active:
        return <Badge className="bg-primary/10 text-primary border-primary/30">Active</Badge>;
      case AuctionStatus.Settled:
        return <Badge className="bg-success/10 text-success border-success/30">Settled</Badge>;
      case AuctionStatus.Scheduled:
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/30">Scheduled</Badge>;
      case AuctionStatus.Cancelled:
        return <Badge className="bg-muted text-muted-foreground border-border">Cancelled</Badge>;
      default:
        return <Badge>{auction.status}</Badge>;
    }
  };

  return (
    <tr
      className="hover:bg-muted/30 transition-colors cursor-pointer"
      onClick={onViewDetails}
    >
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
            {auction.image ? (
              <Image
                src={auction.image}
                alt={auction.itemName}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <span className="text-2xl">📦</span>
              </div>
            )}
          </div>
          <div>
            <p className="font-medium text-sm">{auction.itemName}</p>
            {getStatusBadge()}
          </div>
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="text-sm font-semibold text-primary">
          {formatTokenAmount(currentPrice.toString())}
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="text-sm text-muted-foreground">
          {auction.status === AuctionStatus.Active ? timeRemaining : '-'}
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="text-sm">
          <span className="font-semibold">{auction.sold}</span>
          <span className="text-muted-foreground"> / {auction.totalSupply}</span>
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="text-sm text-muted-foreground">
          {auction.totalBids || 0}
        </div>
      </td>
      <td className="px-4 py-4 text-right">
        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          {auction.status === AuctionStatus.Active && onBidClick && (
            <Button
              size="sm"
              onClick={() => onBidClick(auction.auctionId)}
            >
              Bid
            </Button>
          )}
          {auction.status === AuctionStatus.Settled && onClaimClick && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onClaimClick(auction.auctionId)}
            >
              Claim
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={onViewDetails}
          >
            View
          </Button>
        </div>
      </td>
    </tr>
  );
}
