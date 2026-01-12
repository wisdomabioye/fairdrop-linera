'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { 
  Activity, 
  Gavel, 
  ArrowDownToLine,
  ArrowUpFromLine,
  Lock
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useCachedGlobalStats, useAacApp } from '@/hooks';
import { getTokenByAppId } from '@/config/app.token-store';
import { formatTokenAmount } from '@/lib/utils/auction-utils';

interface GlobalActivityBarProps {
  className?: string;
}

interface StatItemProps {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
  loading?: boolean;
  tooltip?: string;
}

function StatItem({ label, value, icon: Icon, color, loading, tooltip }: StatItemProps) {
  const content = (
    <div className="flex items-center gap-2 text-sm whitespace-nowrap group cursor-default">
      <div className={cn(
        'p-1 rounded-md bg-current/10 transition-transform group-hover:scale-110',
        color
      )}>
        <Icon className="h-3 w-3" />
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] text-muted-foreground leading-none">
          {label}
        </span>
        {loading ? (
          <Skeleton className="h-4 w-12 mt-0.5" />
        ) : (
          <span className="font-bold text-foreground leading-tight">
            {value}
          </span>
        )}
      </div>
    </div>
  );

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {content}
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}

interface TokenBalanceDisplayProps {
  balances: Array<{ tokenApp: string; amount: number }>;
  loading?: boolean;
}

function TokenBalanceDisplay({ balances, loading }: TokenBalanceDisplayProps) {
  if (loading) {
    return <Skeleton className="h-4 w-20" />;
  }

  if (!balances || balances.length === 0) {
    return <span className="text-muted-foreground">-</span>;
  }

  // Show first token, tooltip shows all
  const firstBalance = balances[0];
  const tokenInfo = getTokenByAppId(firstBalance.tokenApp);
  const displayValue = `${formatTokenAmount(firstBalance.amount, 18, 2)} ${tokenInfo?.symbol || '???'}`;

  if (balances.length === 1) {
    return <span className="font-bold">{displayValue}</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="font-bold cursor-help">
          {displayValue}
          <span className="text-muted-foreground text-[10px] ml-1">
            +{balances.length - 1}
          </span>
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs space-y-1">
        {balances.map((b, i) => {
          const info = getTokenByAppId(b.tokenApp);
          return (
            <div key={i} className="flex justify-between gap-4">
              <span>{info?.symbol || 'Unknown'}</span>
              <span className="font-mono">{formatTokenAmount(b.amount, 18, 4)}</span>
            </div>
          );
        })}
      </TooltipContent>
    </Tooltip>
  );
}

export function GlobalActivityBar({ className }: GlobalActivityBarProps) {
  const aacApp = useAacApp();
  
  const { stats, loading } = useCachedGlobalStats({
    aacApp: aacApp.app,
    enablePolling: false,
    pollInterval: 30000,
    skip: !aacApp.app
  });

  // Memoize formatted values
  const formattedStats = useMemo(() => {
    if (!stats) {
      return {
        totalAuctions: '0',
        totalBids: '0',
        deposited: [],
        withdrawn: [],
        tvl: []
      };
    }

    return {
      totalAuctions: stats.totalAuctions?.toLocaleString() || '0',
      totalBids: stats.totalBids?.toLocaleString() || '0',
      deposited: stats.depositedByToken || [],
      withdrawn: stats.withdrawnByToken || [],
      tvl: stats.totalValueLocked || []
    };
  }, [stats]);

  // Calculate total TVL for tooltip
  const tvlTooltip = useMemo(() => {
    if (!formattedStats.tvl.length) return undefined;
    return `Total Value Locked across ${formattedStats.tvl.length} token(s)`;
  }, [formattedStats.tvl]);

  return (
    <div className={cn(
      'border-b border-border/40 bg-gradient-to-r from-card via-card/80 to-card',
      'backdrop-blur-sm shadow-sm',
      className
    )}>
      <div className="container max-w-full px-4 py-2.5">
        <div className="flex items-center justify-between gap-6 overflow-x-auto scrollbar-none">
          {/* Primary Stats */}
          <div className="flex items-center gap-6">
            <StatItem
              label="Auctions"
              value={formattedStats.totalAuctions}
              icon={Gavel}
              color="text-primary"
              loading={loading}
              tooltip="Total auctions created"
            />

            <div className="w-px h-6 bg-border/50" />

            <StatItem
              label="Total Bids"
              value={formattedStats.totalBids}
              icon={Activity}
              color="text-emerald-500"
              loading={loading}
              tooltip="Total bids placed across all auctions"
            />

            <div className="w-px h-6 bg-border/50 hidden sm:block" />

            {/* TVL - Most important */}
            <div className="hidden sm:flex items-center gap-2 text-sm whitespace-nowrap">
              <div className="p-1 rounded-md bg-amber-500/10 text-amber-500">
                <Lock className="h-3 w-3" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-muted-foreground leading-none">
                  TVL
                </span>
                <TokenBalanceDisplay 
                  balances={formattedStats.tvl} 
                  loading={loading} 
                />
              </div>
            </div>
          </div>

          {/* Secondary Stats - Hidden on mobile */}
          <div className="hidden md:flex items-center gap-6">
            {/* Deposited */}
            <div className="flex items-center gap-2 text-sm whitespace-nowrap">
              <div className="p-1 rounded-md bg-blue-500/10 text-blue-500">
                <ArrowDownToLine className="h-3 w-3" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-muted-foreground leading-none">
                  Deposited
                </span>
                <TokenBalanceDisplay 
                  balances={formattedStats.deposited} 
                  loading={loading} 
                />
              </div>
            </div>

            <div className="w-px h-6 bg-border/50" />

            {/* Withdrawn */}
            <div className="flex items-center gap-2 text-sm whitespace-nowrap">
              <div className="p-1 rounded-md bg-purple-500/10 text-purple-500">
                <ArrowUpFromLine className="h-3 w-3" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-muted-foreground leading-none">
                  Withdrawn
                </span>
                <TokenBalanceDisplay 
                  balances={formattedStats.withdrawn} 
                  loading={loading} 
                />
              </div>
            </div>
          </div>

          {/* Live Indicator */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="relative">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <div className="absolute inset-0 h-2 w-2 rounded-full bg-emerald-500 animate-ping opacity-75" />
              </div>
              <span className="hidden sm:inline font-medium">Live</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}