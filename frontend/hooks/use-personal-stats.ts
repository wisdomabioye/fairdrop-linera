import { useBatchPolling } from '@/providers';

interface PersonalStats {
  activeBidsCount: number;
  wonAuctionsCount: number;
  totalSpent: string;
  totalMinimumRefund: string;
  avgDiscountAchieved: string;
}

export function usePersonalStats() {
  const { 
    userPortfolio: {
      allUserBids, 
      loading, 
      error
    }
  } = useBatchPolling();


  const stats: PersonalStats = {
    activeBidsCount: allUserBids?.length || 0,
    wonAuctionsCount: 0, // TODO: Filter won commitments
    totalSpent: '0', // TODO: Sum spent amounts
    totalMinimumRefund: '0', // TODO: Calculate unclaimed bids - current price
    avgDiscountAchieved: '0', // TODO: Calculate average discount
  };

  return {
    stats,
    loading,
    error,
    hasActivity: (allUserBids?.length || 0) > 0,
  };
}
	