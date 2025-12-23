import { useCachedActiveAuctions } from '../auctions/use-cached-active-auctions';

interface GlobalStats {
  activeAuctionsCount: number;
  totalVolume: string;
  totalBidders: number;
  totalBidsCount: number;
  avgPrice: string;
  floorPrice: string;
  startPrice: string;
}

export function useGlobalStats() {
  const { auctions, loading, error } = useCachedActiveAuctions({
    offset: 0,
    limit: 100,
    aacApp: null,
    enablePolling: false,
  });

  const stats: GlobalStats = {
    activeAuctionsCount: auctions?.length || 0,
    totalVolume: '0', // TODO: Calculate from auction data
    totalBidders: 0, // TODO: Aggregate unique bidders
    totalBidsCount: auctions?.reduce((sum, auction) => sum + (auction.totalBids || 0), 0) || 0,
    avgPrice: '0', // TODO: Calculate average price
    floorPrice: '0', // TODO: Get min floor price
    startPrice: '0', // TODO: Get max start price
  };

  return {
    stats,
    loading,
    error,
  };
}
