'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { BidForm } from './bid-form';
import { formatTokenAmount } from '@/lib/utils/auction-utils';
import { getTokenByAppId } from '@/config/app.token-store';
import type { AuctionSummary } from '@/lib/gql/types';

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

  const paymentToken = getTokenByAppId(auction?.paymentTokenApp);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{auction.itemName}</DialogTitle>
          <DialogDescription>
            Current Price: {formatTokenAmount(auction.currentPrice, 18, 4)} {paymentToken.symbol} •{' '}
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
