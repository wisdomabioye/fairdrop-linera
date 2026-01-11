'use client';

import { Activity, Users, TrendingUp, DollarSign } from 'lucide-react';
import { StatCard } from './stat-card';

interface GlobalStatsBarProps {
  activeAuctionsCount?: number;
  totalVolume?: string;
  totalBidders?: number;
  totalBidsCount?: number;
  avgPrice?: string;
  floorPrice?: string;
  startPrice?: string;
  loading?: boolean;
}

export function GlobalStatsBar({
  activeAuctionsCount = 0,
  totalVolume = '0',
  totalBidders = 0,
  totalBidsCount = 0,
  avgPrice,
  floorPrice,
  startPrice,
  loading = false,
}: GlobalStatsBarProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Active Auctions"
        value={activeAuctionsCount}
        icon={Activity}
        description="Currently running"
        loading={loading}
      />
      <StatCard
        title="Total Volume"
        value={totalVolume}
        icon={DollarSign}
        description="All-time trading volume"
        loading={loading}
      />
      <StatCard
        title="Total Bidders"
        value={totalBidders}
        icon={Users}
        description={`${totalBidsCount} bids placed`}
        loading={loading}
      />
      <StatCard
        title="Price Range"
        value={avgPrice || '-'}
        icon={TrendingUp}
        description={floorPrice && startPrice ? `Floor: ${floorPrice} • Start: ${startPrice}` : 'Avg • Floor • Start'}
        loading={loading}
      />
    </div>
  );
}
