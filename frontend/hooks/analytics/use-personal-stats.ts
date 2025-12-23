import { useLineraApplication } from 'linera-react-client';
import { useCachedAllMyCommitments } from '../auctions/use-cached-all-my-commitments';
import { AAC_APP_ID } from '@/config/app.config';

interface PersonalStats {
  activeBidsCount: number;
  wonAuctionsCount: number;
  totalSpent: string;
  totalMinimumRefund: string;
  avgDiscountAchieved: string;
}

export function usePersonalStats() {
  const aacApp = useLineraApplication(AAC_APP_ID);

  const { commitments, loading, error } = useCachedAllMyCommitments({
    uicApp: aacApp.app,
  });

  const stats: PersonalStats = {
    activeBidsCount: commitments?.length || 0,
    wonAuctionsCount: 0, // TODO: Filter won commitments
    totalSpent: '0', // TODO: Sum spent amounts
    totalMinimumRefund: '0', // TODO: Calculate unclaimed bids - current price
    avgDiscountAchieved: '0', // TODO: Calculate average discount
  };

  return {
    stats,
    loading,
    error,
    hasActivity: (commitments?.length || 0) > 0,
  };
}
