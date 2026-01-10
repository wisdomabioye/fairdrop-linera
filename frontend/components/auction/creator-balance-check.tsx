'use client';

import { useEffect, useMemo } from 'react';
import { useCachedUserBalances } from '@/hooks/use-cached-user-balances';
import { useWalletConnection, useLineraApplication } from 'linera-react-client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, CheckCircle, Wallet } from 'lucide-react';
import { getTokenByAppId } from '@/config/app.token-store';
import { AAC_APP_ID } from '@/config/app.config';

export interface CreatorBalanceCheckProps {
  /** The auction token application ID to check balance for */
  auctionTokenId: string;
  /** Required amount of tokens needed to create the auction */
  requiredAmount: number;
  /** Callback when balance validation state changes */
  onBalanceValidated: (isValid: boolean) => void;
  /** Callback to open deposit dialog */
  onDepositClick: () => void;
}

/**
 * CreatorBalanceCheck Component
 *
 * Validates that the auction creator has sufficient AAC balance
 * to create an auction. Displays balance status and allows user
 * to deposit tokens if insufficient.
 */
export function CreatorBalanceCheck({
  auctionTokenId,
  requiredAmount,
  onBalanceValidated,
  onDepositClick
}: CreatorBalanceCheckProps) {
  const { address } = useWalletConnection();
  const aacApp = useLineraApplication(AAC_APP_ID);

  // Fetch AAC balance for the auction token
  const { balances, loading, error, refetch } = useCachedUserBalances({
    address: address || '',
    tokenApps: [auctionTokenId],
    aacApp: aacApp.app,
    skip: !address || !aacApp.app || !auctionTokenId
  });

  // Get current balance and token info
  const currentBalance = useMemo(() => {
    return balances?.get(auctionTokenId) ?? 0;
  }, [balances, auctionTokenId]);

  const tokenInfo = useMemo(() => {
    return getTokenByAppId(auctionTokenId);
  }, [auctionTokenId]);

  const hasEnoughBalance = currentBalance >= requiredAmount;
  const shortfall = Math.max(0, requiredAmount - currentBalance);

  // Notify parent component about validation state
  useEffect(() => {
    if (!loading && !error) {
      onBalanceValidated(hasEnoughBalance);
    }
  }, [hasEnoughBalance, loading, error, onBalanceValidated]);

  // Handle loading state
  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to check balance. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  // Handle missing token info
  if (!tokenInfo) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Invalid auction token selected.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert variant={hasEnoughBalance ? "default" : "destructive"}>
      {/* Status Icon - Direct child of Alert for grid layout */}
      {hasEnoughBalance ? (
        <CheckCircle className="text-green-500" />
      ) : (
        <AlertCircle />
      )}

      {/* Content - Direct child of Alert for grid layout */}
      <div className="space-y-3">
        {/* Status Message */}
        <div>
          <p className="font-semibold">
            {hasEnoughBalance ? 'Balance Check Passed' : 'Insufficient AAC Balance'}
          </p>
          <AlertDescription className="mt-1">
            {hasEnoughBalance ? (
              <>
                You have enough {tokenInfo.symbol} deposited in your AAC balance to create this auction.
              </>
            ) : (
              <>
                You need to deposit at least {shortfall.toLocaleString()} more {tokenInfo.symbol} to your AAC balance before creating this auction.
              </>
            )}
          </AlertDescription>
        </div>

        {/* Balance Summary */}
        <div className="rounded-lg bg-muted/50 p-3 space-y-1.5">
          <div className="flex justify-between items-center text-sm gap-2">
            <span className="text-muted-foreground">Your AAC Balance</span>
            <span className="font-medium">
              {currentBalance.toLocaleString()} {tokenInfo.symbol}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm gap-2">
            <span className="text-muted-foreground">Required for Auction</span>
            <span className="font-medium">
              {requiredAmount.toLocaleString()} {tokenInfo.symbol}
            </span>
          </div>
          {!hasEnoughBalance && (
            <div className="flex justify-between items-center text-sm font-semibold pt-1.5 border-t gap-2">
              <span className="text-destructive">Shortfall</span>
              <span className="text-destructive">
                {shortfall.toLocaleString()} {tokenInfo.symbol}
              </span>
            </div>
          )}
        </div>

        {/* Deposit Button */}
        {!hasEnoughBalance && (
          <Button
            onClick={onDepositClick}
            className="w-full"
            variant="default"
          >
            <Wallet className="h-4 w-4 mr-2" />
            Deposit {tokenInfo.symbol} to AAC
          </Button>
        )}
      </div>
    </Alert>
  );
}
