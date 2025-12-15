'use client';

import { useEffect, useState, useRef } from 'react';
import { Coins, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatTokenAmount } from '@/lib/utils/auction-utils';

export interface BalanceCardProps {
  balance: string | null;
  tokenSymbol?: string;
  isLoading?: boolean;
  isOptimistic?: boolean;
  className?: string;
}

function useCountUp(end: number, duration: number = 800) {
  const [count, setCount] = useState(end);
  const prevEndRef = useRef(end);

  useEffect(() => {
    const start = prevEndRef.current;
    prevEndRef.current = end;

    if (start === end) return;

    const startTime = Date.now();
    const diff = end - start;

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (easeOutCubic)
      const eased = 1 - Math.pow(1 - progress, 3);

      setCount(Math.floor(start + diff * eased));

      if (progress === 1) {
        clearInterval(timer);
        setCount(end);
      }
    }, 16); // ~60fps

    return () => clearInterval(timer);
  }, [end, duration]);

  return count;
}

export function BalanceCard({
  balance,
  tokenSymbol = '',
  isLoading = false,
  isOptimistic = false,
  className,
}: BalanceCardProps) {
  const balanceNumber = balance ? Number(balance) : 0;
  const animatedBalance = useCountUp(balanceNumber);

  return (
    <div
      className={cn(
        'rounded-xl border p-6 transition-all duration-300',
        isOptimistic
          ? 'bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30 shadow-lg shadow-primary/10'
          : 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-12 h-12 rounded-full flex items-center justify-center transition-all',
            isOptimistic
              ? 'bg-primary/30 shadow-lg shadow-primary/20'
              : 'bg-primary/20'
          )}>
            {isLoading ? (
              <Loader2 className="h-6 w-6 text-primary animate-spin" />
            ) : (
              <Coins className="h-6 w-6 text-primary" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Your Balance</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className={cn(
                'text-3xl font-bold tabular-nums transition-all',
                isOptimistic ? 'text-primary scale-110' : 'text-primary'
              )}>
                {isLoading
                  ? '...'
                  : formatTokenAmount(animatedBalance.toString(), 0, 0)}
              </p>
              <span className="text-lg font-medium text-muted-foreground">
                {tokenSymbol}
              </span>
            </div>
          </div>
        </div>

        {isOptimistic && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/20 border border-primary/30">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-semibold text-primary">Updating...</span>
          </div>
        )}
      </div>
    </div>
  );
}
