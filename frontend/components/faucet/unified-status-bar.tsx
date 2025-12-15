'use client';

import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface UnifiedStatusBarProps {
  isWalletSyncing?: boolean;
  isLoading?: boolean;
  isMinting?: boolean;
  error?: Error | null;
  className?: string;
}

export function UnifiedStatusBar({
  isWalletSyncing,
  isLoading,
  isMinting,
  error,
  className,
}: UnifiedStatusBarProps) {
  // Determine status
  const status = error
    ? 'error'
    : isMinting
      ? 'minting'
      : isWalletSyncing
        ? 'syncing'
        : isLoading
          ? 'loading'
          : 'ready';

  // Don't show bar if status is ready and no error
  if (status === 'ready' && !error) {
    return null;
  }

  const statusConfig = {
    error: {
      icon: <AlertCircle className="h-5 w-5" />,
      text: error?.message || 'An error occurred',
      subtext: 'Please try again',
      bgClass: 'bg-destructive/10',
      borderClass: 'border-destructive/20',
      textClass: 'text-destructive',
    },
    minting: {
      icon: <Loader2 className="h-5 w-5 animate-spin" />,
      text: 'Minting tokens...',
      subtext: 'Please wait while your transaction is processed',
      bgClass: 'bg-primary/10',
      borderClass: 'border-primary/20',
      textClass: 'text-primary',
    },
    syncing: {
      icon: <Loader2 className="h-5 w-5 animate-spin" />,
      text: 'Wallet Syncing',
      subtext: 'Please wait while your wallet synchronizes...',
      bgClass: 'bg-blue-500/10',
      borderClass: 'border-blue-500/20',
      textClass: 'text-blue-500',
    },
    loading: {
      icon: <Loader2 className="h-5 w-5 animate-spin" />,
      text: 'Loading...',
      subtext: 'Fetching your token balance',
      bgClass: 'bg-muted',
      borderClass: 'border-muted',
      textClass: 'text-muted-foreground',
    },
    ready: {
      icon: <CheckCircle2 className="h-5 w-5" />,
      text: 'Ready',
      subtext: 'Your wallet is ready to mint tokens',
      bgClass: 'bg-success/10',
      borderClass: 'border-success/20',
      textClass: 'text-success',
    },
  };

  const config = statusConfig[status];

  return (
    <div
      className={cn(
        'rounded-lg border p-4 transition-all duration-300 animate-in fade-in slide-in-from-top-2',
        config.bgClass,
        config.borderClass,
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className={config.textClass}>{config.icon}</div>
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-medium', config.textClass)}>{config.text}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{config.subtext}</p>
        </div>
      </div>
    </div>
  );
}
