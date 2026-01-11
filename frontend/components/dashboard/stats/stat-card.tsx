'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUp, ArrowDown, Minus, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  trend?: {
    value: string;
    direction: 'up' | 'down' | 'neutral';
  };
  icon?: LucideIcon;
  description?: string;
  loading?: boolean;
  highlight?: boolean;
  className?: string;
}

export function StatCard({
  title,
  value,
  trend,
  icon: Icon,
  description,
  loading = false,
  highlight = false,
  className,
}: StatCardProps) {
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
        return 'text-success bg-success/10 border-success/30';
      case 'down':
        return 'text-error bg-error/10 border-error/30';
      case 'neutral':
        return 'text-muted-foreground bg-muted/50 border-border';
    }
  };

  if (loading) {
    return (
      <Card className={cn('animate-fade-in', className)}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="h-4 w-24 bg-muted/50 animate-pulse rounded" />
            {Icon && (
              <div className="w-10 h-10 rounded-full bg-muted/50 animate-pulse" />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="h-9 w-32 bg-muted/50 animate-pulse rounded" />
          {description && (
            <div className="h-3 w-40 bg-muted/50 animate-pulse rounded" />
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        'group hover-lift animate-fade-in',
        highlight && 'bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30',
        className
      )}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          {Icon && (
            <div className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center transition-all',
              highlight
                ? 'bg-primary/20 shadow-lg shadow-primary/20'
                : 'bg-primary/10 group-hover:bg-primary/20'
            )}>
              <Icon className="w-5 h-5 text-primary" />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-baseline gap-2">
          <div className={cn(
            'text-3xl font-bold tabular-nums transition-all',
            highlight && 'text-primary'
          )}>
            {value}
          </div>
          {trend && (
            <div className={cn(
              'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border shadow-sm',
              getTrendColor()
            )}>
              {getTrendIcon()}
              <span>{trend.value}</span>
            </div>
          )}
        </div>
        {description && (
          <p className="text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
