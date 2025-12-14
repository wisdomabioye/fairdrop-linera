'use client';

import { useState, useEffect } from 'react';
import { Minus, Plus, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useLineraApplication, useWalletConnection } from 'linera-react-client';
import { useAuctionMutations, useCachedMyCommitment } from '@/hooks';
import { UIC_APP_ID } from '@/config/app.config';
import { AuctionStatus, type AuctionSummary } from '@/lib/gql/types';
import {
  calculateCurrentPrice,
  formatTimeRemaining,
  calculateBidCost,
  formatTokenAmount,
  formatAbsoluteTime
} from '@/lib/utils/auction-utils';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface BidFormProps {
  auction: AuctionSummary;
  onSuccess?: (auctionId: number, quantity: number) => void;
  onCancel?: () => void;
  compact?: boolean;
}

export function BidForm({
  auction,
  onSuccess,
  onCancel,
  compact = false
}: BidFormProps) {
  const uicApp = useLineraApplication(UIC_APP_ID);
  const { isConnected, isConnecting, connect } = useWalletConnection();
  const [quantity, setQuantity] = useState(1);
  const [currentPrice, setCurrentPrice] = useState(calculateCurrentPrice(auction));

  // Fetch user's current commitment
  const { commitment, loading: loadingCommitment } = useCachedMyCommitment({
    auctionId: auction.auctionId.toString(),
    uicApp: uicApp.app,
    skip: !uicApp.app
  });

  // Mutation hook for placing bids
  const {
    buy,
    isBuying,
    error: mutationError
  } = useAuctionMutations({
    uicApp: uicApp.app,
    onBuySuccess: (auctionId, qty) => {
      toast.success('Bid placed successfully!', {
        description: `You bid ${qty} unit(s) on ${auction.itemName}`
      });
      if (onSuccess) {
        onSuccess(auctionId, qty);
      }
    },
    onError: (error) => {
      toast.error('Bid failed', {
        description: error.message
      });
    }
  });

  // Update current price every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPrice(calculateCurrentPrice(auction));
    }, 1000);

    return () => clearInterval(interval);
  }, [auction]);

  // Calculate values
  const availableSupply = auction.totalSupply - auction.sold;
  const totalCost = calculateBidCost(quantity, currentPrice);
  const currentCommitment = commitment?.totalQuantity || 0;
  const totalCommitmentAfterBid = currentCommitment + quantity;

  // Validation
  const isAuctionActive = auction.status === AuctionStatus.Active; // AuctionStatus.Active
  const isQuantityValid = quantity >= 1 && quantity <= availableSupply;
  const canSubmit = isAuctionActive && isQuantityValid && uicApp.app && !isBuying;

  const handleIncrement = () => {
    if (quantity < availableSupply) {
      setQuantity(quantity + 1);
    }
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 1 && value <= availableSupply) {
      setQuantity(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canSubmit) return;

    const success = await buy(auction.auctionId, quantity);
    if (success) {
      setQuantity(1); // Reset quantity after successful bid
    }
  };

  // Wallet connection guard - show before checking auction status
  if (!isConnected) {
    return (
      <Card className={compact ? '' : undefined}>
        <CardHeader>
          <CardTitle>Place Your Bid</CardTitle>
          <CardDescription>
            Connect your wallet to participate in this auction
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">
              You need to connect your wallet to place bids on auctions.
            </p>
            <Button
              onClick={connect}
              disabled={isConnecting}
              variant="default"
              className="w-full"
            >
              {isConnecting ? (
                <>
                  <Spinner className="h-4 w-4 mr-2" />
                  Connecting...
                </>
              ) : (
                'Connect Wallet'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isAuctionActive) {
    let message: string;
    let description: string | undefined;

    switch (auction.status) {
      case AuctionStatus.Scheduled:
        message = 'Auction Not Started';
        description = `Bidding opens ${formatAbsoluteTime(auction.startTime)}`;
        break;
      case AuctionStatus.Ended:
        message = 'Auction Ended';
        description = 'Bidding is closed. Waiting for settlement.';
        break;
      case AuctionStatus.Settled:
        message = 'Auction Settled';
        description = auction.clearingPrice
          ? `Final clearing price: ${formatTokenAmount(auction.clearingPrice, 18, 4)}`
          : 'Settlement complete';
        break;
      case AuctionStatus.Cancelled:
        message = 'Auction Cancelled';
        description = 'This auction has been cancelled by the creator.';
        break;
      default:
        message = 'This auction is no longer active';
        description = undefined;
    }

    return (
      <Card className={compact ? '' : undefined}>
        <CardContent className="p-6 space-y-3 text-center">
          <p className="text-lg font-semibold text-muted-foreground">
            {message}
          </p>
          {description && (
            <p className="text-sm text-muted-foreground/80">
              {description}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={compact ? 'border-0 shadow-none' : undefined}>
      {!compact && (
        <CardHeader>
          <CardTitle>Place Your Bid</CardTitle>
          <CardDescription>
            {auction.itemName} • {formatTimeRemaining(auction.endTime)} remaining
          </CardDescription>
        </CardHeader>
      )}

      <CardContent className={cn(compact ? 'p-0' : 'space-y-6')}>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Current Price */}
          <div className="rounded-lg bg-primary/5 p-4 border border-primary/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingDown className="h-4 w-4" />
                <span>Current Price</span>
              </div>
              <div className="text-2xl font-bold text-primary">
                {formatTokenAmount(currentPrice, 18, 4)}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Price decreases over time • You'll pay the clearing price at settlement
            </p>
          </div>

          {/* Available Supply */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Available Supply</span>
            <span className="font-medium">
              {availableSupply} / {auction.totalSupply} remaining
            </span>
          </div>

          {/* Quantity Input */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleDecrement}
                disabled={quantity <= 1 || isBuying}
              >
                <Minus className="h-4 w-4" />
              </Button>

              <Input
                id="quantity"
                type="number"
                min={1}
                max={availableSupply}
                value={quantity}
                onChange={handleQuantityChange}
                disabled={isBuying}
                className="text-center text-lg font-semibold"
              />

              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleIncrement}
                disabled={quantity >= availableSupply || isBuying}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Total Cost Calculation */}
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Estimated Cost</span>
              <span className="text-lg font-bold">
                {formatTokenAmount(totalCost, 18, 4)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {quantity} × {formatTokenAmount(currentPrice, 18, 4)} = {formatTokenAmount(totalCost, 18, 4)}
            </p>
          </div>

          {/* Current Commitment */}
          {loadingCommitment ? (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Spinner className="h-4 w-4" />
              <span>Loading your commitment...</span>
            </div>
          ) : currentCommitment > 0 ? (
            <div className="border-t pt-4 space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Your Current Bid</span>
                <span className="font-medium">{currentCommitment} units</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total After This Bid</span>
                <span className="font-semibold">{totalCommitmentAfterBid} units</span>
              </div>
            </div>
          ) : null}

          {/* Error Message */}
          {mutationError && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
              <p className="text-sm text-destructive">{mutationError.message}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isBuying}
                className="flex-1"
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={!canSubmit}
              className={cn('gap-2', onCancel ? 'flex-1' : 'w-full')}
            >
              {isBuying ? (
                <>
                  <Spinner className="h-4 w-4" />
                  Placing Bid...
                </>
              ) : (
                'Place Bid'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
