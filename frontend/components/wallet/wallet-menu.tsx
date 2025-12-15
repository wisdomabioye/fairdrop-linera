'use client';

import * as React from 'react';
import Link from 'next/link';
import { useLineraClient } from 'linera-react-client';
import { useSyncStatus } from '@/providers/sync-provider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Copy, Check, Loader2, User, LogOut, Wallet, Hash, ChevronDown } from 'lucide-react';
import { APP_ROUTES } from '@/config/app.route';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface WalletMenuProps {
  address: string;
  onDisconnect: () => void;
  isDisconnecting?: boolean;
}

export function WalletMenu({ address, onDisconnect, isDisconnecting }: WalletMenuProps) {
  const { walletChainId } = useLineraClient();
  const { isWalletClientSyncing } = useSyncStatus();
  const [isOpen, setIsOpen] = React.useState(false);
  const [copiedAddress, setCopiedAddress] = React.useState(false);
  const [copiedChainId, setCopiedChainId] = React.useState(false);

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const copyToClipboard = async (text: string, type: 'address' | 'chainId') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'address') {
        setCopiedAddress(true);
        setTimeout(() => setCopiedAddress(false), 2000);
      } else {
        setCopiedChainId(true);
        setTimeout(() => setCopiedChainId(false), 2000);
      }
      toast.success('Copied to clipboard');
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'group relative px-4 py-2 rounded-lg border text-sm font-medium shadow-lg transition-all',
            'bg-gradient-to-r hover:shadow-xl',
            isWalletClientSyncing
              ? 'from-warning/10 to-warning/5 border-warning/30 text-warning hover:shadow-warning/20'
              : 'from-success/10 to-success/5 border-success/30 text-success hover:shadow-success/20'
          )}
        >
          <div className="flex items-center gap-2">
            {/* Status Indicator */}
            <div className="relative">
              {isWalletClientSyncing ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <>
                  <span className="w-2 h-2 bg-success rounded-full inline-block animate-pulse" />
                  <span className="absolute inset-0 w-2 h-2 bg-success rounded-full animate-ping opacity-75" />
                </>
              )}
            </div>

            {/* Address */}
            <span className="font-mono">{formatAddress(address)}</span>

            {/* Dropdown Icon */}
            <ChevronDown
              className={cn(
                'w-4 h-4 opacity-50 transition-transform',
                isOpen && 'rotate-180'
              )}
            />
          </div>
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-80 p-0 bg-card border-white/10 shadow-2xl"
        align="end"
        sideOffset={8}
      >
        {/* Header with Sync Status */}
        <div className="p-4 pb-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-text-primary">Wallet</span>
            </div>
            {isWalletClientSyncing && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-warning/10 border border-warning/30">
                <Loader2 className="w-3 h-3 text-warning animate-spin" />
                <span className="text-xs font-medium text-warning">Syncing...</span>
              </div>
            )}
          </div>

          {/* Address */}
          <div className="space-y-2 mt-3">
            <div className="flex items-center justify-between text-xs text-text-secondary">
              <span>Address</span>
            </div>
            <button
              onClick={() => copyToClipboard(address, 'address')}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-glass border border-white/10 hover:border-primary/30 hover:bg-white/5 transition-all group"
            >
              <span className="font-mono text-sm text-text-primary truncate">{address}</span>
              {copiedAddress ? (
                <Check className="w-4 h-4 text-success flex-shrink-0" />
              ) : (
                <Copy className="w-4 h-4 text-text-secondary group-hover:text-primary flex-shrink-0" />
              )}
            </button>
          </div>

          {/* Chain ID */}
          {walletChainId && (
            <div className="space-y-2 mt-3">
              <div className="flex items-center justify-between text-xs text-text-secondary">
                <span>Chain ID</span>
              </div>
              <button
                onClick={() => copyToClipboard(walletChainId, 'chainId')}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-glass border border-white/10 hover:border-primary/30 hover:bg-white/5 transition-all group"
              >
                <div className="flex items-center gap-2 truncate">
                  <Hash className="w-3.5 h-3.5 text-text-secondary flex-shrink-0" />
                  <span className="font-mono text-sm text-text-primary truncate">{walletChainId}</span>
                </div>
                {copiedChainId ? (
                  <Check className="w-4 h-4 text-success flex-shrink-0" />
                ) : (
                  <Copy className="w-4 h-4 text-text-secondary group-hover:text-primary flex-shrink-0" />
                )}
              </button>
            </div>
          )}
        </div>

        <Separator className="bg-white/10" />

        {/* Navigation Links */}
        <div className="p-2">
          <Link
            href={APP_ROUTES.myAuctions}
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-white/5 transition-all group"
          >
            <User className="w-4 h-4 group-hover:text-primary transition-colors" />
            <span>My Auctions</span>
          </Link>
        </div>

        <Separator className="bg-white/10" />

        {/* Disconnect */}
        <div className="p-2">
          <button
            onClick={() => {
              setIsOpen(false);
              onDisconnect();
            }}
            disabled={isDisconnecting}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:text-error hover:bg-error/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {isDisconnecting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LogOut className="w-4 h-4 group-hover:text-error transition-colors" />
            )}
            <span>{isDisconnecting ? 'Disconnecting...' : 'Disconnect Wallet'}</span>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
