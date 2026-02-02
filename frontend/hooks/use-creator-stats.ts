'use client';

import { useBatchPolling } from '@/providers';

interface CreatorStats {
  totalRevenue: string;
  pendingRevenue: string;
  withdrawnRevenue: string;
  activeAuctionsCount: number;
  totalBidsReceived: number;
  successRate: string;
}

export function useCreatorStats() {
  const { 
    userPortfolio: {
      creatorAuctions, 
      loading,
      error
    }
  } = useBatchPolling();


  const stats: CreatorStats = {
    totalRevenue: '0', // TODO: Calculate total revenue
    pendingRevenue: '0', // TODO: Calculate pending withdrawals
    withdrawnRevenue: '0', // TODO: Calculate withdrawn amount
    activeAuctionsCount: creatorAuctions?.filter(a => a.status === 'Active').length || 0,
    totalBidsReceived: creatorAuctions?.reduce((sum, auction) => sum + (auction.totalBids || 0), 0) || 0,
    successRate: '0', // TODO: Calculate success rate
  };

  return {
    stats,
    loading,
    error,
    hasCreatedAuctions: (creatorAuctions?.length || 0) > 0,
  };
}