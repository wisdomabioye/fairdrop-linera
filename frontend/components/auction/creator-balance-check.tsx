'use client';

import { useEffect, useMemo } from 'react';
import { useFungibleQuery } from '@/hooks';
import { useAacApp } from '@/hooks';
import { useWalletConnection, useLineraApplication, useLineraClient } from 'linera-react-client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { WalletConnectButton } from '@/components/wallet';
import { AlertCircle, CheckCircle, Wallet } from 'lucide-react';
import { getTokenByAppId } from '@/config/app.token-store';
import { useSyncStatus } from '@/providers';

export interface CreatorBalanceCheckProps {
  /** The auction token application ID to check balance for */
  auctionTokenId: string;
  /** Required amount of tokens needed to create the auction */
  requiredAmount: number;
  /** Callback when balance validation state changes */
  onBalanceValidated: (isValid: boolean) => void;
  /** Callback to open deposit dialog */
  onDepositClick: () => void;
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
  const { address } = useWalletConnection();
  const { walletChainId } = useLineraClient();
  const { isWalletClientSyncing } = useSyncStatus();
  const tokenApp = useLineraApplication(auctionTokenId);


  // Fetch wallet balance on wallet-chain (available to deposit)
  const { getAccountBalance, balanceLoading: walletLoading } = useFungibleQuery({
    tokenId: auctionTokenId,
    chainId: walletChainId,
    chainApp: tokenApp.app?.wallet,
    autoFetch: true
  });

  console.log("getAccountBalance(address)", getAccountBalance(address!))

  const walletBalance = useMemo(() => {
    const balance = address ? getAccountBalance(address) : null;
    return balance ?? 0;
  }, [address, getAccountBalance]);

  const tokenInfo = useMemo(() => {
    return getTokenByAppId(auctionTokenId);
  }, [auctionTokenId]);

  const hasEnoughBalance = currentAACBalance >= requiredAmount;
  const shortfall = Math.max(0, requiredAmount - currentAACBalance);

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
            {hasEnoughBalance ? `${tokenInfo.symbol} Balance on Auction Chain (AAC) Check Passed` : `Insufficient ${tokenInfo.symbol} Balance on Auction Chain (AAC)`}
          </p>
          <AlertDescription className="mt-1">
            {hasEnoughBalance ? (
              <>
                You have enough {tokenInfo.symbol} deposited in your Auction Chain balance for {tokenInfo.symbol} to create this auction.
              </>
            ) : (
              <>
                You need to deposit at least {shortfall.toLocaleString()} more {tokenInfo.symbol} to your Auction Chain balance before creating this auction.
              </>
            )}
          </AlertDescription>
        </div>

        {/* Balance Summary */}
        <div className="rounded-lg bg-muted/50 p-3 space-y-1.5">
          <div className="flex justify-between items-center text-sm gap-2">
            <span className="text-muted-foreground">AAC Balance (Deposited)</span>
            <span className="font-medium">
              {currentAACBalance.toLocaleString()} {tokenInfo.symbol}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm gap-2">
            <span className="text-muted-foreground">Wallet Balance (Available)</span>
            <span className="font-medium">
              {walletBalance.toLocaleString()} {tokenInfo.symbol}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm gap-2 pt-1.5 border-t">
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
        {
        
          !hasEnoughBalance && address ? (
            <Button
              type="button"
              onClick={onDepositClick}
              className="w-full"
              variant="default"
            >
              <Wallet className="h-4 w-4 mr-2" />
              Deposit {tokenInfo.symbol} to AAC
            </Button>
          )
          :
          <WalletConnectButton />
      
        }
      </div>
    </Alert>
  );
}
