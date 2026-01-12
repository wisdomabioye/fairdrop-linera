'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowUp, ArrowDown, Minus, LucideIcon, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TokenBalance {
  symbol: string;
  amount: number;
  formatted: string;
}

interface StatCardProps {
  title: string;
  value: string | number;
  trend?: {
    value: string;
    direction: 'up' | 'down' | 'neutral';
  };
  icon?: LucideIcon;
  description?: string;
  /** Token breakdown for multi-token stats */
  tokenBreakdown?: TokenBalance[];
  loading?: boolean;
  highlight?: boolean;
  /** Subtle accent color */
  accentColor?: 'primary' | 'success' | 'warning' | 'info' | 'purple';
  className?: string;
}

const accentStyles = {
  primary: {
    icon: 'bg-primary/10 text-primary group-hover:bg-primary/20',
    highlight: 'from-primary/10 to-primary/5 border-primary/20',
    value: 'text-primary',
  },
  success: {
    icon: 'bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500/20',
    highlight: 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/20',
    value: 'text-emerald-500',
  },
  warning: {
    icon: 'bg-amber-500/10 text-amber-500 group-hover:bg-amber-500/20',
    highlight: 'from-amber-500/10 to-amber-500/5 border-amber-500/20',
    value: 'text-amber-500',
  },
  info: {
    icon: 'bg-blue-500/10 text-blue-500 group-hover:bg-blue-500/20',
    highlight: 'from-blue-500/10 to-blue-500/5 border-blue-500/20',
    value: 'text-blue-500',
  },
  purple: {
    icon: 'bg-purple-500/10 text-purple-500 group-hover:bg-purple-500/20',
    highlight: 'from-purple-500/10 to-purple-500/5 border-purple-500/20',
    value: 'text-purple-500',
  },
};

export function StatCard({
  title,
  value,
  trend,
  icon: Icon,
  description,
  tokenBreakdown,
  loading = false,
  highlight = false,
  accentColor = 'primary',
  className,
}: StatCardProps) {
  const styles = accentStyles[accentColor];

  const getTrendIcon = () => {
    if (!trend) return null;

    switch (trend.direction) {
      case 'up':
        return <ArrowUp className="w-3 h-3" />;
      case 'down':
        return <ArrowDown className="w-3 h-3" />;
      case 'neutral':
        return <Minus className="w-3 h-3" />;
    }
  };

  const getTrendColor = () => {
    if (!trend) return '';

    switch (trend.direction) {
      case 'up':
        return 'text-emerald-600 bg-emerald-500/10 border-emerald-500/30';
      case 'down':
        return 'text-red-600 bg-red-500/10 border-red-500/30';
      case 'neutral':
        return 'text-muted-foreground bg-muted/50 border-border';
    }
  };

  if (loading) {
    return (
      <Card className={cn('animate-fade-in', className)}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="w-10 h-10 rounded-full" />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-3 w-40" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        'group hover:shadow-md transition-all duration-200',
        highlight && `bg-gradient-to-br ${styles.highlight}`,
        className
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
            {title}
            {tokenBreakdown && tokenBreakdown.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-muted-foreground/60 cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <div className="space-y-1.5">
                    <p className="font-medium text-xs mb-2">Breakdown by token:</p>
                    {tokenBreakdown.map((token, i) => (
                      <div key={i} className="flex justify-between gap-4 text-xs">
                        <span className="text-muted-foreground">{token.symbol}</span>
                        <span className="font-mono font-medium">{token.formatted}</span>
                      </div>
                    ))}
                  </div>
                </TooltipContent>
              </Tooltip>
            )}
          </CardTitle>
          {Icon && (
            <div className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center transition-all',
              styles.icon
            )}>
              <Icon className="w-5 h-5" />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-baseline gap-2 flex-wrap">
          <div className={cn(
            'text-2xl md:text-3xl font-bold tabular-nums transition-all',
            highlight && styles.value
          )}>
            {value}
          </div>
          {trend && (
            <div className={cn(
              'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border',
              getTrendColor()
            )}>
              {getTrendIcon()}
              <span>{trend.value}</span>
            </div>
          )}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground line-clamp-1">
            {description}
          </p>
        )}
        {/* Token breakdown chips */}
        {tokenBreakdown && tokenBreakdown.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {tokenBreakdown.slice(0, 3).map((token, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/50 text-[10px] font-medium"
              >
                <span className="text-muted-foreground">{token.symbol}:</span>
                <span className="font-mono">{token.formatted}</span>
              </span>
            ))}
            {tokenBreakdown.length > 3 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted/50 text-[10px] text-muted-foreground">
                +{tokenBreakdown.length - 3} more
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}