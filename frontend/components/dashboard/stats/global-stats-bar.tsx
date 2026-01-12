'use client';

import { useMemo } from 'react';
import { Activity, Gavel, ArrowDownToLine, ArrowUpFromLine, Lock } from 'lucide-react';
import { StatCard } from './stat-card';
import { getTokenByAppId } from '@/config/app.token-store';
import { formatTokenAmount } from '@/lib/utils/auction-utils';
import type { AuctionGlobalStats, AuctionChainTokenBalance } from '@/lib/gql/types';

interface GlobalStatsBarProps {
  stats: AuctionGlobalStats | null;
  loading?: boolean;
}

interface TokenBreakdown {
  symbol: string;
  amount: number;
  formatted: string;
}

/**
 * Convert AuctionChainTokenBalance[] to TokenBreakdown[] with formatted values
 */
function formatTokenBreakdown(balances: AuctionChainTokenBalance[] | undefined): TokenBreakdown[] {
  if (!balances || balances.length === 0) return [];

  return balances.map(b => {
    const tokenInfo = getTokenByAppId(b.tokenApp);
    const symbol = tokenInfo?.symbol || 'Unknown';
    const formatted = formatTokenAmount(b.amount, 18, 2);
    return {
      symbol,
      amount: b.amount,
      formatted: `${formatted} ${symbol}`,
    };
  });
}

/**
 * Calculate total value across all tokens (simple sum for display)
 */
function calculateTotal(balances: AuctionChainTokenBalance[] | undefined): string {
  if (!balances || balances.length === 0) return '0';

  const total = balances.reduce((sum, b) => sum + b.amount, 0);
  return formatTokenAmount(total, 18, 2);
}

/**
 * Get primary token display (first token with balance)
 */
function getPrimaryDisplay(balances: AuctionChainTokenBalance[] | undefined): string {
  if (!balances || balances.length === 0) return '0';

  // Find first token with balance
  const firstWithBalance = balances.find(b => b.amount > 0) || balances[0];
  const tokenInfo = getTokenByAppId(firstWithBalance.tokenApp);
  const symbol = tokenInfo?.symbol || '';
  const formatted = formatTokenAmount(firstWithBalance.amount, 18, 2);

  if (balances.length === 1) {
    return `${formatted} ${symbol}`;
  }

  // Show total if multiple tokens
  return calculateTotal(balances);
}

export function GlobalStatsBar({ stats, loading = false }: GlobalStatsBarProps) {
  // Memoize token breakdowns
  const depositedBreakdown = useMemo(
    () => formatTokenBreakdown(stats?.depositedByToken),
    [stats?.depositedByToken]
  );

  const withdrawnBreakdown = useMemo(
    () => formatTokenBreakdown(stats?.withdrawnByToken),
    [stats?.withdrawnByToken]
  );

  const tvlBreakdown = useMemo(
    () => formatTokenBreakdown(stats?.totalValueLocked),
    [stats?.totalValueLocked]
  );

  // Calculate descriptions
  const depositDescription = useMemo(() => {
    if (!stats?.depositedByToken?.length) return 'Total deposits';
    const count = stats.depositedByToken.filter(b => b.amount > 0).length;
    return count > 1 ? `Across ${count} tokens` : 'Total deposits';
  }, [stats?.depositedByToken]);

  const withdrawDescription = useMemo(() => {
    if (!stats?.withdrawnByToken?.length) return 'Total withdrawals';
    const count = stats.withdrawnByToken.filter(b => b.amount > 0).length;
    return count > 1 ? `Across ${count} tokens` : 'Total withdrawals';
  }, [stats?.withdrawnByToken]);

  const tvlDescription = useMemo(() => {
    if (!stats?.totalValueLocked?.length) return 'Currently locked';
    const count = stats.totalValueLocked.filter(b => b.amount > 0).length;
    return count > 1 ? `Across ${count} tokens` : 'Currently locked';
  }, [stats?.totalValueLocked]);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {/* Total Auctions */}
      <StatCard
        title="Total Auctions"
        value={stats?.totalAuctions?.toLocaleString() ?? '0'}
        icon={Gavel}
        description="Auctions created"
        loading={loading}
        accentColor="primary"
        highlight
      />

      {/* Total Bids */}
      <StatCard
        title="Total Bids"
        value={stats?.totalBids?.toLocaleString() ?? '0'}
        icon={Activity}
        description="Bids placed"
        loading={loading}
        accentColor="success"
      />

      {/* Total Value Locked */}
      <StatCard
        title="TVL"
        value={getPrimaryDisplay(stats?.totalValueLocked)}
        icon={Lock}
        description={tvlDescription}
        tokenBreakdown={tvlBreakdown}
        loading={loading}
        accentColor="warning"
        highlight
      />

      {/* Total Deposited */}
      <StatCard
        title="Deposited"
        value={getPrimaryDisplay(stats?.depositedByToken)}
        icon={ArrowDownToLine}
        description={depositDescription}
        tokenBreakdown={depositedBreakdown}
        loading={loading}
        accentColor="info"
      />

      {/* Total Withdrawn */}
      <StatCard
        title="Withdrawn"
        value={getPrimaryDisplay(stats?.withdrawnByToken)}
        icon={ArrowUpFromLine}
        description={withdrawDescription}
        tokenBreakdown={withdrawnBreakdown}
        loading={loading}
        accentColor="purple"
      />
    </div>
  );
}