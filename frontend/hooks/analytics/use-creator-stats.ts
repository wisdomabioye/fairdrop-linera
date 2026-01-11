'use client';

import { useWalletConnection } from 'linera-react-client';
import { useCachedAuctionsByCreator } from '../auctions/use-cached-auctions-by-creator';

interface CreatorStats {
  totalRevenue: string;
  pendingRevenue: string;
  withdrawnRevenue: string;
  activeAuctionsCount: number;
  totalBidsReceived: number;
  successRate: string;
}

export function useCreatorStats() {
  const { address } = useWalletConnection();

  const { auctions, loading, error } = useCachedAuctionsByCreator({
    creator: address || '',
    aacApp: null,
    limit: 20,
    offset: 0
  });

  const stats: CreatorStats = {
    totalRevenue: '0', // TODO: Calculate total revenue
    pendingRevenue: '0', // TODO: Calculate pending withdrawals
    withdrawnRevenue: '0', // TODO: Calculate withdrawn amount
    activeAuctionsCount: auctions?.filter(a => a.status === 'Active').length || 0,
    totalBidsReceived: auctions?.reduce((sum, auction) => sum + (auction.totalBids || 0), 0) || 0,
    successRate: '0', // TODO: Calculate success rate
  };

  return {
    stats,
    loading,
    error,
    hasCreatedAuctions: (auctions?.length || 0) > 0,
  };
}
