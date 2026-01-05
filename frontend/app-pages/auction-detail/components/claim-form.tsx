'use client';

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
import { useCachedMyCommitment } from '@/hooks/use-cached-my-bids';
import { useAuctionMutations } from '@/hooks/use-auction-mutations';
import { formatTokenAmount } from '@/lib/utils/auction-utils';
import type { ApplicationClient } from 'linera-react-client';

export interface ClaimFormProps {
  auctionId: string;
  aacApp: ApplicationClient | null;
  onSuccess?: () => void;
}

/**
 * Claim form for settled auctions
 * Handles wallet connection, loading, error, and settlement states
 * Allows users to claim their allocated items and refunds
 */
export function ClaimForm({
  auctionId,
  aacApp,
  onSuccess
}: ClaimFormProps) {
  const { isConnected, isConnecting } = useWalletConnection();
  const { isClientSyncing } = useSyncStatus();

  // Fetch user's commitment
  const {
    commitment,
    totalQuantity = 0,
    totalPaid = 0,
    loading,
    error: fetchError,
    isFetching
  } = useCachedMyCommitment({
    auctionId,
    aacApp,
    skip: !auctionId || !aacApp
  });

  const { claimSettlement, isClaiming, error: claimError } = useAuctionMutations({
    aacApp,
    onClaimSuccess: () => {
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
  if (isConnecting || isClientSyncing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Settlement</CardTitle>
          <CardDescription>
            Syncing...
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
  if (loading || (isFetching && !fetchError)) {
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
  if (!commitment?.length) {
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

  const claimed = commitment.filter(c => c.claimed).length === 0;
  const hasAllocation = (totalQuantity || 0) > 0;
  const hasRefund = totalPaid && totalPaid > 0;
  const pricePerItem = (totalQuantity || 0) / (totalPaid || 0)
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
          {!!hasAllocation && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Items Claimed</span>
              <span className="font-semibold">{totalQuantity || 0}</span>
            </div>
          )}
          {!!hasRefund && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Refund Claimed</span>
              <span className="font-semibold font-mono">
                {formatTokenAmount('0', 18, 4)} fUSD
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
            <span className="font-semibold">{totalQuantity}</span>
          </div>

          {commitment && totalQuantity && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Settlement Breakdown</h4>

                {hasAllocation && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Items Won</span>
                    <span className="font-semibold text-green-600">
                      {totalQuantity}
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Clearing Price</span>
                  <span className="font-mono">
                    {formatTokenAmount(pricePerItem.toString(), 18, 4)} fUSD
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Cost</span>
                  <span className="font-mono">
                    {formatTokenAmount((totalPaid || 0).toString(), 18, 4)} fUSD
                  </span>
                </div>

                {hasRefund && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Refund</span>
                    <span className="font-mono text-green-600">
                      +{formatTokenAmount((pricePerItem || 0).toString(), 18, 4)} fUSD
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
          disabled={isClaiming || !aacApp}
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

        {!aacApp && (
          <p className="text-xs text-center text-muted-foreground">
            Connect your wallet to claim
          </p>
        )}
      </CardContent>
    </Card>
  );
}
