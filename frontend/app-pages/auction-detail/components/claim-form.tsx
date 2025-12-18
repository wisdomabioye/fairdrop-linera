'use client';

import { useState } from 'react';
import { Gift, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useWalletConnection } from 'linera-react-client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { WalletConnectButton } from '@/components/wallet';
import { useSyncStatus } from '@/providers';
import { useCachedMyCommitment } from '@/hooks/useCachedMyCommitment';
import { useAuctionMutations } from '@/hooks/useAuctionMutations';
import { formatTokenAmount } from '@/lib/utils/auction-utils';
import type { ApplicationClient } from 'linera-react-client';

export interface ClaimFormProps {
  auctionId: string;
  uicApp: ApplicationClient | null;
  onSuccess?: () => void;
}

/**
 * Claim form for settled auctions
 * Handles wallet connection, loading, error, and settlement states
 * Allows users to claim their allocated items and refunds
 */
export function ClaimForm({
  auctionId,
  uicApp,
  onSuccess
}: ClaimFormProps) {
  const [claimed, setClaimed] = useState(false);
  const { isConnected, isConnecting } = useWalletConnection();
  const { isWalletClientSyncing } = useSyncStatus();

  // Fetch user's commitment
  const {
    commitment,
    loading,
    error: fetchError,
    hasLoadedOnce
  } = useCachedMyCommitment({
    auctionId,
    uicApp,
    skip: !auctionId || !uicApp?.walletClient
  });

  const { claimSettlement, isClaiming, error: claimError } = useAuctionMutations({
    uicApp,
    onClaimSuccess: () => {
      setClaimed(true);
      toast.success('Successfully claimed your settlement!');
      onSuccess?.();
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to claim settlement');
    }
  });

  const handleClaim = async () => {
    const success = await claimSettlement(Number(auctionId));
    if (!success && claimError) {
      console.error('[ClaimForm] Claim failed:', claimError);
    }
  };

  // State 1: Wallet not connected
  if (!isConnected && !isConnecting) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Settlement</CardTitle>
          <CardDescription>
            Connect your wallet to check for claimable items
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              Connect your wallet to see if you have any items or refunds to claim from this auction.
            </AlertDescription>
          </Alert>
          <WalletConnectButton fullWidth />
        </CardContent>
      </Card>
    );
  }

  // State 2: Wallet connecting or syncing
  if (isConnecting || isWalletClientSyncing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Settlement</CardTitle>
          <CardDescription>
            Preparing wallet...
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  // State 3: Loading commitment data
  if (loading || (!hasLoadedOnce && !fetchError)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Settlement</CardTitle>
          <CardDescription>
            Checking your participation...
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  // State 4: Error fetching commitment
  if (fetchError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Settlement</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load your settlement data. Please try refreshing the page.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // State 5: No commitment - user didn't participate
  if (!commitment) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Settlement</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You didn't participate in this auction.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // At this point, commitment is guaranteed to exist
  // Check if user has items to claim
  const hasAllocation = (commitment.settlement?.allocatedQuantity || 0) > 0;
  const hasRefund = commitment.settlement?.refund && BigInt(commitment.settlement.refund) > BigInt(0);

  // State 6: No claimable items
  if (!hasAllocation && !hasRefund) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Settlement</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You have no items or refunds to claim from this auction.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (claimed) {
    return (
      <Card className="border-green-500/20 bg-green-500/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <CardTitle className="text-green-600">Claimed!</CardTitle>
          </div>
          <CardDescription>
            Your settlement has been successfully claimed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {hasAllocation && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Items Claimed</span>
              <span className="font-semibold">{commitment.settlement?.allocatedQuantity || 0}</span>
            </div>
          )}
          {hasRefund && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Refund Claimed</span>
              <span className="font-semibold font-mono">
                {formatTokenAmount(commitment.settlement?.refund ?? '0', 18, 4)} fUSD
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Claim Settlement</CardTitle>
        <CardDescription>
          Your auction has been settled. Claim your items and refund.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Settlement Details */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Your Bids</span>
            <span className="font-semibold">{commitment.totalQuantity}</span>
          </div>

          {commitment.settlement && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Settlement Breakdown</h4>

                {hasAllocation && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Items Won</span>
                    <span className="font-semibold text-green-600">
                      {commitment.settlement.allocatedQuantity}
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Clearing Price</span>
                  <span className="font-mono">
                    {formatTokenAmount(commitment.settlement.clearingPrice, 18, 4)} fUSD
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Cost</span>
                  <span className="font-mono">
                    {formatTokenAmount(commitment.settlement.totalCost, 18, 4)} fUSD
                  </span>
                </div>

                {hasRefund && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Refund</span>
                    <span className="font-mono text-green-600">
                      +{formatTokenAmount(commitment.settlement.refund, 18, 4)} fUSD
                    </span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Error Display */}
        {claimError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{claimError.message}</AlertDescription>
          </Alert>
        )}

        {/* Claim Button */}
        <Button
          className="w-full bg-green-600 hover:bg-green-700"
          size="lg"
          onClick={handleClaim}
          disabled={isClaiming || !uicApp?.walletClient}
        >
          {isClaiming ? (
            <>
              <span className="animate-spin mr-2">⏳</span>
              Claiming...
            </>
          ) : (
            <>
              <Gift className="h-4 w-4 mr-2" />
              Claim {hasAllocation ? 'Items' : ''}{hasAllocation && hasRefund ? ' & ' : ''}{hasRefund ? 'Refund' : ''}
            </>
          )}
        </Button>

        {!uicApp?.walletClient && (
          <p className="text-xs text-center text-muted-foreground">
            Connect your wallet to claim
          </p>
        )}
      </CardContent>
    </Card>
  );
}
