'use client';

import { useEffect, useState } from 'react';
import { Network, Wallet, Copy, Check } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { ChainType } from './chain-selector';

export interface ChainInfoDisplayProps {
  chainType: ChainType;
  chainId?: string | null;
  address?: string | null;
  isLoading?: boolean;
  className?: string;
}

export function ChainInfoDisplay({
  chainType,
  chainId,
  address,
  isLoading,
  className,
}: ChainInfoDisplayProps) {
  const [copiedField, setCopiedField] = useState<'chainId' | 'address' | null>(null);
  const Icon = chainType === 'wallet' ? Wallet : Network;

  const handleCopy = async (text: string, field: 'chainId' | 'address') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success(`${field === 'chainId' ? 'Chain ID' : 'Address'} copied!`);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  const truncateString = (str: string, startChars = 12, endChars = 8) => {
    if (str.length <= startChars + endChars) return str;
    return `${str.slice(0, startChars)}...${str.slice(-endChars)}`;
  };

  if (!chainId && !address && !isLoading) {
    return null;
  }

  return (
    <Card className={cn('p-4 border-2', className)}>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center border',
              chainType === 'wallet'
                ? 'bg-gradient-to-br from-blue-500/20 to-blue-500/10 border-blue-500/30'
                : 'bg-gradient-to-br from-purple-500/20 to-purple-500/10 border-purple-500/30'
            )}
          >
            <Icon
              className={cn(
                'h-4 w-4',
                chainType === 'wallet' ? 'text-blue-500' : 'text-purple-500'
              )}
            />
          </div>
          <h3 className="font-semibold text-sm">
            {chainType === 'wallet' ? 'Wallet Chain' : 'Public Chain'} Info
          </h3>
        </div>

        {/* Chain ID */}
        {(chainId || isLoading) && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium">Chain ID</p>
            {isLoading ? (
              <div className="h-5 w-full bg-muted animate-pulse rounded" />
            ) : chainId ? (
              <div className="flex items-center gap-2 group">
                <code className="text-xs font-mono bg-muted px-2 py-1 rounded flex-1 truncate">
                  {truncateString(chainId)}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleCopy(chainId, 'chainId')}
                >
                  {copiedField === 'chainId' ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
            ) : null}
          </div>
        )}

        {/* Address */}
        {(address || isLoading) && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium">Chain Address</p>
            {isLoading ? (
              <div className="h-5 w-full bg-muted animate-pulse rounded" />
            ) : address ? (
              <div className="flex items-center gap-2 group">
                <code className="text-xs font-mono bg-muted px-2 py-1 rounded flex-1 truncate">
                  {truncateString(address)}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleCopy(address, 'address')}
                >
                  {copiedField === 'address' ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </Card>
  );
}
