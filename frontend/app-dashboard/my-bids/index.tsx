'use client';

import Link from 'next/link';
import { toast } from 'sonner';
import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, RefreshCw, Check, Clock, ExternalLink, Timer, Ban } from 'lucide-react';
import { useWalletConnection, useLineraApplication } from 'linera-react-client';
import { WalletConnectionPrompt } from '@/components/wallet/wallet-connection-prompt';
import { EmptyState } from '@/components/loading/empty-state';
import { AAC_APP_ID } from '@/config/app.config';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuctionMutations } from '@/hooks';
import { useBatchPolling } from '@/providers';
import { useAuctionStore } from '@/store/auction-store';
import { formatRelativeTime, formatTokenAmount } from '@/lib/utils/auction-utils';
import { AuctionStatus, type BidRecord } from '@/lib/gql/types';
import { getTokenByAppId } from '@/config/app.token-store';
import { APP_ROUTES } from '@/config/app.route';

/** Status badge for bid claim state */
function BidStatusBadge({
  claimed,
  isSettled,
  isActive,
  isCancelled
}: {
  claimed: boolean;
  isSettled: boolean;
  isActive: boolean;
  isCancelled: boolean;
}) {
  if (claimed) {
    return (
      <Badge variant="success" className="gap-1">
        <Check className="h-3 w-3" />
        Claimed
      </Badge>
    );
  }

  if (isSettled) {
    return (
      <Badge variant="warning" className="gap-1">
        <Clock className="h-3 w-3" />
        Ready to Claim
      </Badge>
    );
  }

  if (isActive) {
    return (
      <Badge variant="active" className="gap-1">
        <Timer className="h-3 w-3" />
        Auction Active
      </Badge>
    );
  }

  if (isCancelled) {
    return (
      <Badge variant="destructive" className="gap-1">
        <Ban className="h-3 w-3" />
        Cancelled
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="gap-1">
      <Clock className="h-3 w-3" />
      Pending
    </Badge>
  );
}

export default function MyBids() {
  const aacApp = useLineraApplication(AAC_APP_ID);
  const { isConnected } = useWalletConnection();
  const [claimingBidId, setClaimingBidId] = useState<number | null>(null);

  const { 
    userPortfolio: {
      allUserBids, loading, isFetching, refetch
    }
  } = useBatchPolling();

  const {
    allAuctionsCache,
    fetchAuctionSummary,
  } = useAuctionStore();

  // Get unique auction IDs from bids
  const auctionIds = useMemo(() => {
    if (!allUserBids) return [];
    return [...new Set(allUserBids.map(bid => bid.auctionId.toString()))];
  }, [allUserBids]);

  // Fetch auction details for bids not in cache
  useEffect(() => {
    if (!aacApp.app || !auctionIds.length) return;

    auctionIds.forEach(auctionId => {
      const cached = allAuctionsCache.get(auctionId);
      if (!cached || !cached.data) {
        fetchAuctionSummary(auctionId, aacApp.app!);
      }
    });
  }, [auctionIds, aacApp.app, allAuctionsCache, fetchAuctionSummary]);


  const { claimSettlement, error: claimError } = useAuctionMutations({
    aacApp: aacApp.app,
    onSuccess: (event) => {
      if (event.type === 'claim') {
        toast.success('Successfully claimed your settlement!');
        setClaimingBidId(null);
        refetch();
      }
    },
    onError: (event) => {
      if (event.type === 'claim') {
        const msg = event.error.message;
        toast.error(msg.indexOf('wasm') > 0 ? msg.substring(0, msg.indexOf('wasm')) : 'Failed to claim settlement');
        setClaimingBidId(null);
      }
    }
  });

  const handleClaim = async (bid: BidRecord) => {
    setClaimingBidId(bid.bidId);
    const success = await claimSettlement(bid.auctionId);
    if (!success && claimError) {
      console.error('[MyBids] Claim failed:', claimError);
      setClaimingBidId(null);
    }
  };

  if (!isConnected) {
    return (
      <div className="mx-auto my-6 py-6 max-w-xl">
        <WalletConnectionPrompt
          title="Connect Your Wallet"
          description="Connect your wallet to view your bids."
        />
      </div>
    );
  }

  // Group bids by auction for summary stats
  const bidsByAuction = allUserBids?.reduce((acc, bid) => {
    if (!acc[bid.auctionId]) {
      acc[bid.auctionId] = [];
    }
    acc[bid.auctionId].push(bid);
    return acc;
  }, {} as Record<number, BidRecord[]>) ?? {};

  const totalBids = allUserBids?.length ?? 0;
  const totalAuctions = Object.keys(bidsByAuction).length;
  const unclaimedBids = allUserBids?.filter(b => !b.claimed).length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Bids</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track and manage your auction bids
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Summary */}
      {!loading && allUserBids && allUserBids.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-card border rounded-lg p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Bids</p>
            <p className="text-2xl font-bold mt-1">{totalBids}</p>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Auctions</p>
            <p className="text-2xl font-bold mt-1">{totalAuctions}</p>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Unclaimed</p>
            <p className="text-2xl font-bold mt-1">{unclaimedBids}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && <BidsTableSkeleton />}

      {/* Empty State */}
      {!loading && (!allUserBids || allUserBids.length === 0) && (
        <EmptyState
          title="No bids yet"
          description="You haven't placed any bids. Start bidding on auctions to see them here!"
          icon={<TrendingUp className="h-12 w-12" />}
        />
      )}

      {/* Bids Table */}
      {!loading && allUserBids && allUserBids.length > 0 && (
        <div className="bg-card border rounded-lg overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Auction</th>
                  <th className="px-4 py-3 font-medium">Quantity</th>
                  <th className="px-4 py-3 font-medium">Amount Paid</th>
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {allUserBids.map((bid) => {
                  const auction = allAuctionsCache.get(bid.auctionId.toString());
                  const auctionStatus = auction?.data?.status;
                  const isSettled = auctionStatus === AuctionStatus.Settled;
                  const isActive = auctionStatus === AuctionStatus.Active || auctionStatus === AuctionStatus.Scheduled;
                  const isCancelled = auctionStatus === AuctionStatus.Cancelled;
                  const canClaim = isSettled && !bid.claimed;
                  const paymentToken = auction?.data?.paymentTokenApp ? getTokenByAppId(auction.data.paymentTokenApp) : null;
                  const auctionToken = auction?.data?.auctionTokenApp ? getTokenByAppId(auction.data.auctionTokenApp) : null;

                  return (
                    <tr key={bid.bidId} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <Link
                          href={APP_ROUTES.auction(bid.auctionId.toString())}
                          className="flex items-center gap-1.5 text-sm font-medium hover:text-primary transition-colors"
                        >
                          #{bid.auctionId}
                          <ExternalLink className="h-3 w-3 opacity-50" />
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-mono">
                          {formatTokenAmount(bid.quantity)}
                          {auctionToken && <span className="text-muted-foreground ml-1">{auctionToken.symbol}</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-mono">
                          {formatTokenAmount(bid.amountPaid)}
                          {paymentToken && <span className="text-muted-foreground ml-1">{paymentToken.symbol}</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-muted-foreground">
                          {formatRelativeTime(bid.timestamp)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <BidStatusBadge
                          claimed={bid.claimed}
                          isSettled={isSettled}
                          isActive={isActive}
                          isCancelled={isCancelled}
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!bid.claimed && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>
                                  <Button
                                    variant={canClaim ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => handleClaim(bid)}
                                    disabled={!canClaim || claimingBidId === bid.bidId}
                                  >
                                    {claimingBidId === bid.bidId ? (
                                      <>
                                        <RefreshCw className="h-3 w-3 animate-spin" />
                                        Claiming...
                                      </>
                                    ) : (
                                      'Claim'
                                    )}
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              {!canClaim && !bid.claimed && (
                                <TooltipContent>
                                  {isActive && "Auction is still active"}
                                  {isCancelled && "Auction was cancelled"}
                                  {!auctionStatus && "Loading auction status..."}
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-border">
            {allUserBids.map((bid) => {
              const auction = allAuctionsCache.get(bid.auctionId.toString());
              const auctionStatus = auction?.data?.status;
              const isSettled = auctionStatus === AuctionStatus.Settled;
              const isActive = auctionStatus === AuctionStatus.Active || auctionStatus === AuctionStatus.Scheduled;
              const isCancelled = auctionStatus === AuctionStatus.Cancelled;
              const canClaim = isSettled && !bid.claimed;
              const paymentToken = auction?.data?.paymentTokenApp ? getTokenByAppId(auction.data.paymentTokenApp) : null;
              const auctionToken = auction?.data?.auctionTokenApp ? getTokenByAppId(auction.data.auctionTokenApp) : null;

              return (
                <div key={bid.bidId} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Link
                      href={APP_ROUTES.auction(bid.auctionId.toString())}
                      className="flex items-center gap-1.5 font-medium hover:text-primary transition-colors"
                    >
                      Auction #{bid.auctionId}
                      <ExternalLink className="h-3 w-3 opacity-50" />
                    </Link>
                    <BidStatusBadge
                      claimed={bid.claimed}
                      isSettled={isSettled}
                      isActive={isActive}
                      isCancelled={isCancelled}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Quantity</p>
                      <p className="font-mono">
                        {formatTokenAmount(bid.quantity)}
                        {auctionToken && <span className="text-muted-foreground ml-1">{auctionToken.symbol}</span>}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Paid</p>
                      <p className="font-mono">
                        {formatTokenAmount(bid.amountPaid)}
                        {paymentToken && <span className="text-muted-foreground ml-1">{paymentToken.symbol}</span>}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Time</p>
                      <p className="text-muted-foreground">{formatRelativeTime(bid.timestamp)}</p>
                    </div>
                  </div>

                  {!bid.claimed && (
                    <Button
                      variant={canClaim ? "default" : "outline"}
                      size="sm"
                      className="w-full"
                      onClick={() => handleClaim(bid)}
                      disabled={!canClaim || claimingBidId === bid.bidId}
                    >
                      {claimingBidId === bid.bidId ? (
                        <>
                          <RefreshCw className="h-3 w-3 animate-spin" />
                          Claiming...
                        </>
                      ) : canClaim ? (
                        'Claim Settlement'
                      ) : isActive ? (
                        'Auction Active'
                      ) : (
                        'Not Available'
                      )}
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function BidsTableSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats Skeleton */}
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card border rounded-lg p-4">
            <Skeleton className="h-3 w-16 mb-2" />
            <Skeleton className="h-8 w-12" />
          </div>
        ))}
      </div>

      {/* Table Skeleton */}
      <div className="bg-card border rounded-lg overflow-hidden">
        <div className="hidden md:block">
          <div className="bg-muted/50 px-4 py-3">
            <div className="grid grid-cols-6 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-4 w-16" />
              ))}
            </div>
          </div>
          <div className="divide-y divide-border">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="px-4 py-3">
                <div className="grid grid-cols-6 gap-4 items-center">
                  <Skeleton className="h-5 w-12" />
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-8 w-16 ml-auto" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile Skeleton */}
        <div className="md:hidden divide-y divide-border">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((j) => (
                  <div key={j}>
                    <Skeleton className="h-3 w-12 mb-1" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                ))}
              </div>
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
