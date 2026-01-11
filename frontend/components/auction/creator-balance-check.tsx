'use client';

import { useMemo, useEffect } from 'react';
import { useWalletConnection } from 'linera-react-client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { WalletConnectButton } from '@/components/wallet';
import { AlertCircle, CheckCircle, Wallet } from 'lucide-react';
import { getTokenByAppId } from '@/config/app.token-store';

export interface CreatorBalanceCheckProps {
  /** The auction token application ID to check balance for */
  auctionTokenId: string;
  /** Required amount of tokens needed to create the auction */
  requiredAmount: number;
  /** Callback when balance validation state changes */
  onBalanceValidated: (isValid: boolean) => void;
  /** Callback to open deposit dialog */
  onDepositClick: () => void;
  /** Current AAC balance for the token */
  currentAACBalance: number;
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
  currentAACBalance,
  onBalanceValidated,
  onDepositClick
}: CreatorBalanceCheckProps) {
  const { address, isConnected } = useWalletConnection();

  const tokenInfo = useMemo(() => {
    return getTokenByAppId(auctionTokenId);
  }, [auctionTokenId]);

  const hasEnoughBalance = currentAACBalance >= requiredAmount;
  const shortfall = Math.max(0, requiredAmount - currentAACBalance);

  // Notify parent when balance validation status changes
  useEffect(() => {
    onBalanceValidated(hasEnoughBalance && isConnected);
  }, [hasEnoughBalance, isConnected, onBalanceValidated]);

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

  // Wallet not connected
  if (!isConnected) {
    return (
      <Alert>
        <Wallet className="h-4 w-4" />
        <div className="space-y-3">
          <AlertDescription>
            Connect your wallet to check your {tokenInfo.symbol} balance.
          </AlertDescription>
          <WalletConnectButton />
        </div>
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
            {hasEnoughBalance ? `${tokenInfo.symbol} Balance Check Passed` : `Insufficient ${tokenInfo.symbol} Balance`}
          </p>
          <AlertDescription className="mt-1">
            {hasEnoughBalance ? (
              <>
                You have enough {tokenInfo.symbol} deposited to create this auction.
              </>
            ) : (
              <>
                You need to deposit at least {shortfall.toLocaleString()} more {tokenInfo.symbol} to your AAC balance.
              </>
            )}
          </AlertDescription>
        </div>

        {/* Balance Summary */}
        <div className="rounded-lg bg-muted/50 p-3 space-y-1.5">
          <div className="flex justify-between items-center text-sm gap-2">
            <span className="text-muted-foreground">AAC Balance</span>
            <span className="font-medium">
              {currentAACBalance.toLocaleString()} {tokenInfo.symbol}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm gap-2 pt-1.5 border-t">
            <span className="text-muted-foreground">Required</span>
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

        {/* Deposit Button - only show when insufficient balance */}
        {!hasEnoughBalance && (
          <Button
            type="button"
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
