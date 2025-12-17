'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { BidForm } from './bid-form';
import type { AuctionSummary } from '@/lib/gql/types';
import { formatTokenAmount } from '@/lib/utils/auction-utils';

export interface BidDialogProps {
  auction: AuctionSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (auctionId: number, quantity: number) => void;
}

export function BidDialog({
  auction,
  open,
  onOpenChange,
  onSuccess
}: BidDialogProps) {
  const handleSuccess = (auctionId: number, quantity: number) => {
    // Close dialog after successful bid
    onOpenChange(false);
    if (onSuccess) {
      onSuccess(auctionId, quantity);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  if (!auction) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{auction.itemName}</DialogTitle>
          <DialogDescription>
            Current Price: {formatTokenAmount(auction.currentPrice, 18, 4)} fUSD •{' '}
            {auction.totalSupply - auction.sold} / {auction.totalSupply} remaining
          </DialogDescription>
        </DialogHeader>

        <BidForm
          auction={auction}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
          compact
        />
      </DialogContent>
    </Dialog>
  );
}
