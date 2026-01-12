'use client';

import { useState } from 'react';
import { Minus, Plus, Wallet, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useWalletConnection } from 'linera-react-client';
import { useSyncStatus } from '@/providers';
import { useAuctionMutations, useCachedUserBidRecord, useAacApp, useCachedUserBalances } from '@/hooks';
import { AuctionStatus, type AuctionSummary } from '@/lib/gql/types';
import { getTokenByAppId, getPaymentTokenList } from '@/config/app.token-store';
import { DepositDialog } from '@/app-dashboard/aac-balances/deposit-dialog';
import {
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
  const aacApp = useAacApp();
  const { isConnected, isConnecting, connect, address } = useWalletConnection();
  const { isWalletClientSyncing } = useSyncStatus();
  const [quantity, setQuantity] = useState(1);
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);

  const paymentToken = getTokenByAppId(auction?.paymentTokenApp);

  // Fetch user's AAC balance
  const { balances, loading: balanceLoading } = useCachedUserBalances({
    address: address || '',
    tokenApps: getPaymentTokenList().map(p => p.appId),
    aacApp: aacApp.app,
    skip: !address || !aacApp.app
  });
  const userBalance = balances?.get(auction.paymentTokenApp) ?? 0;

  // Fetch user's current commitment
  const { totalQuantity } = useCachedUserBidRecord({
    auctionId: auction.auctionId.toString(),
    aacApp: aacApp.app,
    skip: !aacApp.app
  });

  const {
    buy,
    isBuying,
    error: mutationError
  } = useAuctionMutations({
    aacApp: aacApp.app,
    onSuccess: (event) => {
      if (event.type === 'buy') {
        toast.success(`Bid placed for ${event.data.quantity} unit(s)!`);
        setQuantity(1);
        onSuccess?.(event.data.auctionId, event.data.quantity);
      }
    },
    onError: (event) => {
      if (event.type === 'buy') {
        toast.error('Bid failed', { description: event.error.message });
      }
    }
  });
  // Calculations
  const maxQuantity = auction.maxBidAmount;
  const currentCommitment = totalQuantity || 0;
  const remainingLimit = maxQuantity - currentCommitment;
  const remainingSupply = auction.totalSupply - auction.sold;
  const effectiveMax = Math.min(remainingLimit, remainingSupply);
  const totalCost = calculateBidCost(quantity, auction.currentPrice);
  const totalCostNum = Number(totalCost);
  const hasSufficientBalance = userBalance >= totalCostNum;

  const isAuctionActive = auction.status === AuctionStatus.Active;
  const isQuantityValid = quantity >= 1 && quantity <= effectiveMax;
  const canSubmit = isAuctionActive && isQuantityValid && hasSufficientBalance && aacApp.app && !isBuying;

  const handleIncrement = () => setQuantity(q => Math.min(q + 1, effectiveMax));
  const handleDecrement = () => setQuantity(q => Math.max(q - 1, 1));
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 1) {
      setQuantity(Math.min(value, effectiveMax));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    const success = await buy(auction.auctionId, quantity);
    if (success) setQuantity(1);
  };

  // Wallet connection guard
  if (!isConnected) {
    return (
      <Card className={compact ? 'border-0 shadow-none' : undefined}>
        <CardContent className="p-4 text-center space-y-3">
          <p className="text-xs text-muted-foreground">Connect wallet to bid</p>
          <Button onClick={connect} disabled={isConnecting} size="sm" className="w-full">
            {isConnecting ? <><Spinner className="h-3 w-3 mr-1" />Connecting...</> : 'Connect Wallet'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Inactive auction states
  if (!isAuctionActive) {
    let statusMessage = 'Auction unavailable';
    if (auction.status === AuctionStatus.Scheduled) {
      statusMessage = `Opens ${formatAbsoluteTime(auction.startTime)}`;
    } else if (auction.status === AuctionStatus.Settled) {
      statusMessage = auction.clearingPrice 
        ? `Settled at ${formatTokenAmount(auction.clearingPrice, 18, 4)}` 
        : 'Auction ended';
    } else if (auction.status === AuctionStatus.Cancelled) {
      statusMessage = 'Auction cancelled';
    }

    return (
      <Card className={compact ? 'border-0 shadow-none' : undefined}>
        <CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">{statusMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={compact ? 'border-0 shadow-none' : undefined}>
        {!compact && (
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-sm font-medium truncate">{auction.itemName}</CardTitle>
            <p className="text-[10px] text-muted-foreground">
              {formatTimeRemaining(auction.endTime)} left · {remainingSupply} available
            </p>
          </CardHeader>
        )}

        <CardContent className={compact ? 'p-0' : 'px-4 pb-4 pt-2'}>
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Price */}
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground">Current Price</p>
              <p className="text-2xl font-bold tabular-nums">
                {formatTokenAmount(auction.currentPrice, 18, 2)}
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  {paymentToken.symbol}
                </span>
              </p>
            </div>

            {/* Balance Display */}
            <div className="flex items-center justify-between text-xs py-1.5 px-2 bg-muted/50 rounded">
              <span className="text-muted-foreground flex items-center gap-1">
                <Wallet className="h-3 w-3" />
                Balance
              </span>
              <div className="flex items-center gap-1.5">
                {balanceLoading ? (
                  <Spinner className="h-3 w-3" />
                ) : (
                  <span className={cn(
                    "font-medium",
                    !hasSufficientBalance && totalCostNum > 0 && "text-amber-600"
                  )}>
                    {formatTokenAmount(userBalance, 18, 2)} {paymentToken.symbol}
                  </span>
                )}
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-[10px]"
                  onClick={() => setDepositDialogOpen(true)}
                >
                  Deposit
                </Button>
              </div>
            </div>

            {/* Insufficient Balance Warning */}
            {!hasSufficientBalance && totalCostNum > 0 && !balanceLoading && (
              <div className="flex items-center gap-1.5 text-[10px] text-amber-600 px-2">
                <AlertCircle className="h-3 w-3 flex-shrink-0" />
                <span>
                  Need {formatTokenAmount(totalCostNum - userBalance, 18, 2)} more.{' '}
                  <button
                    type="button"
                    onClick={() => setDepositDialogOpen(true)}
                    className="underline font-medium"
                  >
                    Deposit now
                  </button>
                </span>
              </div>
            )}

            {/* Quantity Selector */}
            <div className="flex items-center justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-full"
                onClick={handleDecrement}
                disabled={quantity <= 1 || isBuying}
              >
                <Minus className="h-4 w-4" />
              </Button>

              <Input
                type="number"
                value={quantity}
                onChange={handleQuantityChange}
                disabled={isBuying}
                min={1}
                max={effectiveMax}
                className="w-16 h-12 text-center text-xl font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />

              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-full"
                onClick={handleIncrement}
                disabled={quantity >= effectiveMax || isBuying}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Limit Info */}
            <div className="text-[9px] text-center text-muted-foreground space-y-0.5">
              <p>Max per bidder: {maxQuantity} · You can bid: {effectiveMax}</p>
              {currentCommitment > 0 && (
                <p className="text-primary">Already committed: {currentCommitment}</p>
              )}
            </div>

            {/* Total */}
            <div className="text-center py-1.5 border-t">
              <p className="text-[10px] text-muted-foreground">Total Cost</p>
              <p className="text-lg font-semibold">
                {formatTokenAmount(totalCost, 18, 2)} {paymentToken.symbol}
              </p>
            </div>

            {/* Error */}
            {mutationError && (
              <p className="text-[10px] text-center text-destructive">
                {mutationError.message.split(':')[0]}
              </p>
            )}

            {/* Submit */}
            <div className="flex gap-2">
              {onCancel && (
                <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={isBuying} className="flex-1">
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                size="sm"
                disabled={!canSubmit || isWalletClientSyncing}
                className={cn('gap-1', onCancel ? 'flex-1' : 'w-full')}
              >
                {isWalletClientSyncing ? (
                  <><Spinner className="h-3 w-3" />Syncing</>
                ) : isBuying ? (
                  <><Spinner className="h-3 w-3" />Bidding</>
                ) : !hasSufficientBalance ? (
                  'Insufficient Balance'
                ) : (
                  `Bid ${quantity} for ${formatTokenAmount(totalCost, 18, 2)}`
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Deposit Dialog */}
      <DepositDialog
        open={depositDialogOpen}
        onOpenChange={setDepositDialogOpen}
        appTokenId={auction.paymentTokenApp}
        tokenInfo={paymentToken}
        currentAACBalance={userBalance}
      />
    </>
  );
}
