'use client';

import { useEffect, memo } from 'react';
import { Wallet, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useTokenStore } from '@/store/token-store';
import type { ChainApp } from 'linera-react-client';
import { cn } from '@/lib/utils';

export interface BalanceDisplayProps {
  tokenId: string;
  chainId: string;
  address: string;
  chainApp: ChainApp | null;
  tokenSymbol?: string;
  tokenName?: string;
  className?: string;
}

export const BalanceDisplay = memo(function BalanceDisplay({
  tokenId,
  chainId,
  address,
  chainApp,
  tokenSymbol = '',
  tokenName = '',
  className,
}: BalanceDisplayProps) {
  const {
    getBalance,
    getTokenSymbol,
    getTokenName,
    getBalanceStatus,
    fetchBalance,
    fetchTokenInfo,
    isBalanceStale,
  } = useTokenStore();

  // Fetch balance and token info on mount and when dependencies change
  useEffect(() => {
    if (!chainApp || !address) return;

    const fetchData = async () => {
      try {
        // Fetch balance if stale
        if (isBalanceStale(tokenId, chainId, address)) {
          await fetchBalance(tokenId, chainId, address, chainApp);
        }

        // Fetch token info (has long TTL, won't refetch often)
        await fetchTokenInfo(tokenId, chainId, chainApp);
      } catch (error) {
        console.error('[BalanceDisplay] Failed to fetch data:', error);
      }
    };

    fetchData();
  }, [tokenId, chainId, address, chainApp, fetchBalance, fetchTokenInfo, isBalanceStale]);

  const balance = getBalance(tokenId, chainId, address);
  const symbol = getTokenSymbol(tokenId, chainId) || tokenSymbol;
  const name = getTokenName(tokenId, chainId) || tokenName;
  const status = getBalanceStatus(tokenId, chainId, address);
  const isLoading = status === 'loading';

  return (
    <Card className={cn('p-6 border-2', className)}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500/20 to-green-500/10 border border-green-500/30 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Your Balance</p>
              <p className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">
                {address.slice(0, 12)}...{address.slice(-8)}
              </p>
            </div>
          </div>
          <TrendingUp className="h-5 w-5 text-green-500" />
        </div>

        {/* Balance Amount */}
        <div className="space-y-1">
          {isLoading ? (
            <div className="h-10 w-48 bg-muted animate-pulse rounded" />
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold">
                {balance || '0'}
              </span>
              <span className="text-xl text-muted-foreground font-medium">
                {symbol}
              </span>
            </div>
          )}
          {name && (
            <p className="text-sm text-muted-foreground">{name}</p>
          )}
        </div>
      </div>
    </Card>
  );
});
