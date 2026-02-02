'use client';

import Link from 'next/link';
import { toast } from 'sonner';
import { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp, RefreshCw, Check, Clock, ExternalLink, Timer, Ban,
  List, LayoutGrid, ChevronDown, ChevronUp, Coins, ArrowDownUp
} from 'lucide-react';
import { useWalletConnection, useLineraApplication } from 'linera-react-client';
import { WalletConnectionPrompt } from '@/components/wallet/wallet-connection-prompt';
import { EmptyState } from '@/components/loading/empty-state';
import { AAC_APP_ID } from '@/config/app.config';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAuctionMutations } from '@/hooks';
import { useBatchPolling } from '@/providers';
import { useAuctionStore } from '@/store/auction-store';
import { formatRelativeTime, formatTokenAmount } from '@/lib/utils/auction-utils';
import { AuctionStatus, type BidRecord, type AuctionSummary } from '@/lib/gql/types';
import { getTokenByAppId } from '@/config/app.token-store';
import { APP_ROUTES } from '@/config/app.route';
import { cn } from '@/lib/utils';

type ViewMode = 'individual' | 'consolidated';
type SortBy = 'recent' | 'auction' | 'amount';

/** Grouped bids by auction */
interface AuctionBidGroup {
  auctionId: number;
  auction: AuctionSummary | null;
  bids: BidRecord[];
  totalQuantity: number;
  totalPaid: number;
  allClaimed: boolean;
  anyClaimed: boolean;
  latestBidTime: number;
}

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

/** Auction group status badge */
function AuctionGroupStatusBadge({ group }: { group: AuctionBidGroup }) {
  const auctionStatus = group.auction?.status;
  const isSettled = auctionStatus === AuctionStatus.Settled;
  const isActive = auctionStatus === AuctionStatus.Active || auctionStatus === AuctionStatus.Scheduled;
  const isCancelled = auctionStatus === AuctionStatus.Cancelled;

  if (group.allClaimed) {
    return (
      <Badge variant="success" className="gap-1">
        <Check className="h-3 w-3" />
        All Claimed
      </Badge>
    );
  }

  if (group.anyClaimed && isSettled) {
    return (
      <Badge variant="warning" className="gap-1">
        <Clock className="h-3 w-3" />
        Partially Claimed
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
        Active
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
  const [claimingAuctionId, setClaimingAuctionId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('consolidated');
  const [sortBy, setSortBy] = useState<SortBy>('recent');
  const [expandedAuctions, setExpandedAuctions] = useState<Set<number>>(new Set());

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

  // Group bids by auction
  const auctionGroups = useMemo((): AuctionBidGroup[] => {
    if (!allUserBids) return [];

    const grouped = allUserBids.reduce((acc, bid) => {
      if (!acc[bid.auctionId]) {
        acc[bid.auctionId] = {
          auctionId: bid.auctionId,
          auction: allAuctionsCache.get(bid.auctionId.toString())?.data ?? null,
          bids: [],
          totalQuantity: 0,
          totalPaid: 0,
          allClaimed: true,
          anyClaimed: false,
          latestBidTime: 0,
        };
      }
      acc[bid.auctionId].bids.push(bid);
      acc[bid.auctionId].totalQuantity += bid.quantity;
      acc[bid.auctionId].totalPaid += bid.amountPaid;
      if (!bid.claimed) acc[bid.auctionId].allClaimed = false;
      if (bid.claimed) acc[bid.auctionId].anyClaimed = true;
      if (bid.timestamp > acc[bid.auctionId].latestBidTime) {
        acc[bid.auctionId].latestBidTime = bid.timestamp;
      }
      return acc;
    }, {} as Record<number, AuctionBidGroup>);

    let groups = Object.values(grouped);

    // Sort groups
    switch (sortBy) {
      case 'recent':
        groups.sort((a, b) => b.latestBidTime - a.latestBidTime);
        break;
      case 'auction':
        groups.sort((a, b) => a.auctionId - b.auctionId);
        break;
      case 'amount':
        groups.sort((a, b) => b.totalPaid - a.totalPaid);
        break;
    }

    return groups;
  }, [allUserBids, allAuctionsCache, sortBy]);

  const { claimSettlement, error: claimError } = useAuctionMutations({
    aacApp: aacApp.app,
    onSuccess: (event) => {
      if (event.type === 'claim') {
        toast.success('Successfully claimed your settlement!');
        setClaimingAuctionId(null);
        refetch();
      }
    },
    onError: (event) => {
      if (event.type === 'claim') {
        const msg = event.error.message;
        toast.error(msg.indexOf('wasm') > 0 ? msg.substring(0, msg.indexOf('wasm')) : 'Failed to claim settlement');
        setClaimingAuctionId(null);
      }
    }
  });

  const handleClaim = async (auctionId: number) => {
    setClaimingAuctionId(auctionId);
    const success = await claimSettlement(auctionId);
    if (!success && claimError) {
      console.error('[MyBids] Claim failed:', claimError);
      setClaimingAuctionId(null);
    }
  };

  const toggleExpanded = (auctionId: number) => {
    setExpandedAuctions(prev => {
      const next = new Set(prev);
      if (next.has(auctionId)) {
        next.delete(auctionId);
      } else {
        next.add(auctionId);
      }
      return next;
    });
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

  // Calculate stats
  const totalBids = allUserBids?.length ?? 0;
  const totalAuctions = auctionGroups.length;
  const readyToClaim = auctionGroups.filter(g => {
    const isSettled = g.auction?.status === AuctionStatus.Settled;
    return isSettled && !g.allClaimed;
  }).length;
  const totalCommitted = auctionGroups.reduce((sum, g) => sum + g.totalPaid, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">My Bids</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track and manage your auction bids
          </p>
        </div>
        <div className="flex items-center gap-2">
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
      </div>

      {/* Stats Summary */}
      {!loading && allUserBids && allUserBids.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border rounded-lg p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Bids</p>
            <p className="text-2xl font-bold mt-1">{totalBids}</p>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Auctions</p>
            <p className="text-2xl font-bold mt-1">{totalAuctions}</p>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Ready to Claim</p>
            <p className="text-2xl font-bold mt-1 text-warning">{readyToClaim}</p>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Committed</p>
            <p className="text-2xl font-bold mt-1 font-mono">{formatTokenAmount(totalCommitted, 18, 2)}</p>
          </div>
        </div>
      )}

      {/* View Controls */}
      {!loading && allUserBids && allUserBids.length > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-4">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="consolidated" className="gap-2">
                <LayoutGrid className="h-4 w-4" />
                By Auction
              </TabsTrigger>
              <TabsTrigger value="individual" className="gap-2">
                <List className="h-4 w-4" />
                All Bids
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Sort:</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortBy(sortBy === 'recent' ? 'amount' : sortBy === 'amount' ? 'auction' : 'recent')}
              className="gap-1"
            >
              <ArrowDownUp className="h-3 w-3" />
              {sortBy === 'recent' ? 'Recent' : sortBy === 'amount' ? 'Amount' : 'Auction #'}
            </Button>
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

      {/* Consolidated View */}
      {!loading && allUserBids && allUserBids.length > 0 && viewMode === 'consolidated' && (
        <div className="space-y-3">
          {auctionGroups.map((group) => {
            const auctionStatus = group.auction?.status;
            const isSettled = auctionStatus === AuctionStatus.Settled;
            const isActive = auctionStatus === AuctionStatus.Active || auctionStatus === AuctionStatus.Scheduled;
            const isCancelled = auctionStatus === AuctionStatus.Cancelled;
            const canClaim = isSettled && !group.allClaimed;
            const paymentToken = group.auction?.paymentTokenApp ? getTokenByAppId(group.auction.paymentTokenApp) : null;
            const auctionToken = group.auction?.auctionTokenApp ? getTokenByAppId(group.auction.auctionTokenApp) : null;
            const isExpanded = expandedAuctions.has(group.auctionId);

            return (
              <Collapsible key={group.auctionId} open={isExpanded} onOpenChange={() => toggleExpanded(group.auctionId)}>
                <div className="bg-card border rounded-lg overflow-hidden">
                  {/* Main Row */}
                  <div className="p-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      {/* Auction Info */}
                      <div className="flex items-center gap-3 min-w-0">
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                        <div className="min-w-0">
                          <Link
                            href={APP_ROUTES.auction(group.auctionId.toString())}
                            className="flex items-center gap-1.5 font-medium hover:text-primary transition-colors"
                          >
                            {group.auction?.itemName || `Auction #${group.auctionId}`}
                            <ExternalLink className="h-3 w-3 opacity-50 flex-shrink-0" />
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {group.bids.length} bid{group.bids.length !== 1 ? 's' : ''} • Last: {formatRelativeTime(group.latestBidTime)}
                          </p>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-6 flex-wrap">
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Quantity</p>
                          <p className="font-mono font-medium">
                            {formatTokenAmount(group.totalQuantity)}
                            {auctionToken && <span className="text-muted-foreground ml-1 text-xs">{auctionToken.symbol}</span>}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Total Paid</p>
                          <p className="font-mono font-medium">
                            {formatTokenAmount(group.totalPaid, 18, 4)}
                            {paymentToken && <span className="text-muted-foreground ml-1 text-xs">{paymentToken.symbol}</span>}
                          </p>
                        </div>
                        <AuctionGroupStatusBadge group={group} />

                        {/* Claim Button */}
                        {!group.allClaimed && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>
                                  <Button
                                    variant={canClaim ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => handleClaim(group.auctionId)}
                                    disabled={!canClaim || claimingAuctionId === group.auctionId}
                                  >
                                    {claimingAuctionId === group.auctionId ? (
                                      <>
                                        <RefreshCw className="h-3 w-3 animate-spin" />
                                        Claiming...
                                      </>
                                    ) : (
                                      <>
                                        <Coins className="h-3 w-3" />
                                        Claim All
                                      </>
                                    )}
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              {!canClaim && (
                                <TooltipContent>
                                  {isActive && "Auction is still active"}
                                  {isCancelled && "Auction was cancelled"}
                                  {!auctionStatus && "Loading auction status..."}
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Bid Details */}
                  <CollapsibleContent>
                    <div className="border-t bg-muted/30">
                      <div className="p-4 space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                          Individual Bids
                        </p>
                        {group.bids
                          .sort((a, b) => b.timestamp - a.timestamp)
                          .map((bid) => (
                            <div
                              key={bid.bidId}
                              className={cn(
                                "flex items-center justify-between gap-4 py-2 px-3 rounded-md",
                                bid.claimed ? "bg-success/5" : "bg-background"
                              )}
                            >
                              <div className="flex items-center gap-3">
                                {bid.claimed ? (
                                  <Check className="h-4 w-4 text-success" />
                                ) : (
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                )}
                                <div>
                                  <p className="text-sm font-mono">
                                    {formatTokenAmount(bid.quantity)} {auctionToken?.symbol}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatRelativeTime(bid.timestamp)}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-mono">
                                  {formatTokenAmount(bid.amountPaid, 18, 4)} {paymentToken?.symbol}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {bid.claimed ? 'Claimed' : 'Pending'}
                                </p>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      )}

      {/* Individual Bids View (Original Table) */}
      {!loading && allUserBids && allUserBids.length > 0 && viewMode === 'individual' && (
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
                {[...allUserBids]
                  .sort((a, b) => {
                    switch (sortBy) {
                      case 'recent': return b.timestamp - a.timestamp;
                      case 'auction': return a.auctionId - b.auctionId;
                      case 'amount': return b.amountPaid - a.amountPaid;
                      default: return 0;
                    }
                  })
                  .map((bid) => {
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
                            {auction?.data?.itemName || `#${bid.auctionId}`}
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
                            {formatTokenAmount(bid.amountPaid, 18, 4)}
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
                                      onClick={() => handleClaim(bid.auctionId)}
                                      disabled={!canClaim || claimingAuctionId === bid.auctionId}
                                    >
                                      {claimingAuctionId === bid.auctionId ? (
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
            {[...allUserBids]
              .sort((a, b) => {
                switch (sortBy) {
                  case 'recent': return b.timestamp - a.timestamp;
                  case 'auction': return a.auctionId - b.auctionId;
                  case 'amount': return b.amountPaid - a.amountPaid;
                  default: return 0;
                }
              })
              .map((bid) => {
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
                        {auction?.data?.itemName || `Auction #${bid.auctionId}`}
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
                          {formatTokenAmount(bid.amountPaid, 18, 4)}
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
                        onClick={() => handleClaim(bid.auctionId)}
                        disabled={!canClaim || claimingAuctionId === bid.auctionId}
                      >
                        {claimingAuctionId === bid.auctionId ? (
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-card border rounded-lg p-4">
            <Skeleton className="h-3 w-16 mb-2" />
            <Skeleton className="h-8 w-12" />
          </div>
        ))}
      </div>

      {/* View Toggle Skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-9 w-24" />
      </div>

      {/* Cards Skeleton */}
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card border rounded-lg p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8" />
                <div>
                  <Skeleton className="h-5 w-32 mb-1" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <Skeleton className="h-3 w-12 mb-1" />
                  <Skeleton className="h-5 w-16" />
                </div>
                <div className="text-right">
                  <Skeleton className="h-3 w-12 mb-1" />
                  <Skeleton className="h-5 w-20" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-9 w-24" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
