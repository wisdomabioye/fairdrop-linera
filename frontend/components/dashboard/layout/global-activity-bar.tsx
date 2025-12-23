'use client';

import { useGlobalStats } from '@/hooks/analytics/use-global-stats';
import { TrendingUp, Activity, Users, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GlobalActivityBarProps {
  className?: string;
}

export function GlobalActivityBar({ className }: GlobalActivityBarProps) {
  const { stats, loading } = useGlobalStats();

  const items = [
    {
      label: 'Active Auctions',
      value: loading ? '...' : stats.activeAuctionsCount.toString(),
      icon: Activity,
      color: 'text-primary',
    },
    {
      label: 'Total Bids',
      value: loading ? '...' : stats.totalBidsCount.toString(),
      icon: TrendingUp,
      color: 'text-success',
    },
    {
      label: 'Active Bidders',
      value: loading ? '...' : (stats.totalBidders || 0).toString(),
      icon: Users,
      color: 'text-blue-500',
    },
    {
      label: '24h Volume',
      value: loading ? '...' : (stats.totalVolume || '0'),
      icon: Zap,
      color: 'text-amber-500',
    },
  ];

  return (
    <div className={cn(
      'border-b border-border/50 bg-card/50 backdrop-blur-sm',
      className
    )}>
      <div className="container max-w-full px-4 py-2">
        <div className="flex items-center justify-between gap-4 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-6">
            {items.map((item, index) => {
              const Icon = item.icon;
              return (
                <div
                  key={index}
                  className="flex items-center gap-2 text-sm whitespace-nowrap"
                >
                  <Icon className={cn('h-3.5 w-3.5', item.color)} />
                  <span className="text-muted-foreground font-medium">
                    {item.label}:
                  </span>
                  <span className="font-bold text-foreground">
                    {item.value}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Optional: Live indicator */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
            <span className="hidden sm:inline">Live</span>
          </div>
        </div>
      </div>
    </div>
  );
}
