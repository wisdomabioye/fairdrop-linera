'use client';

import { memo } from 'react';
import { Wallet, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface BalanceDisplayProps {
  balance: number | null;
  tokenSymbol?: string;
  isLoading?: boolean;
  className?: string;
}

export const BalanceDisplay = memo(function BalanceDisplay({
  balance,
  tokenSymbol = '',
  isLoading = false,
  className,
}: BalanceDisplayProps) {

  return (
    <Card className={cn('bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20', className)}>
      <div className="p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500/20 to-green-500/10 border border-green-500/30 flex items-center justify-center">
              <Wallet className="h-4 w-4 text-green-500" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Balance</span>
          </div>
          <TrendingUp className="h-4 w-4 text-green-500" />
        </div>

        {/* Balance Amount */}
        <div className="space-y-1">
          {isLoading ? (
            <div className="h-10 w-full bg-muted animate-pulse rounded" />
          ) : (
            <>
              <div className="text-3xl md:text-4xl font-bold tracking-tight">
                {balance?.toLocaleString() || '0'}
              </div>
              <div className="text-sm text-muted-foreground font-medium">
                {tokenSymbol}
              </div>
            </>
          )}
        </div>
      </div>
    </Card>
  );
});
