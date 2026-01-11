import { useCachedMyCommitment, useAacApp } from '@/hooks';

interface PersonalStats {
  activeBidsCount: number;
  wonAuctionsCount: number;
  totalSpent: string;
  totalMinimumRefund: string;
  avgDiscountAchieved: string;
}

export function usePersonalStats() {
  const aacApp = useAacApp();

  const { commitment: userBidRecord, loading, error } = useCachedMyCommitment({
    aacApp: aacApp.app,
    auctionId: '0'
  });

  const stats: PersonalStats = {
    activeBidsCount: userBidRecord?.length || 0,
    wonAuctionsCount: 0, // TODO: Filter won commitments
    totalSpent: '0', // TODO: Sum spent amounts
    totalMinimumRefund: '0', // TODO: Calculate unclaimed bids - current price
    avgDiscountAchieved: '0', // TODO: Calculate average discount
  };

  return {
    stats,
    loading,
    error,
    hasActivity: (userBidRecord?.length || 0) > 0,
  };
}
	