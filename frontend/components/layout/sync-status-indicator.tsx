'use client';

import { useSyncStatus } from '@/providers';
import { Loader2 } from 'lucide-react';

/**
 * Global sync status indicator
 * Shows syncing status for wallet and public clients
 * Fixed at bottom right corner, auto-collapses when not syncing
 */
export function SyncStatusIndicator() {
  const { isWalletClientSyncing, isPublicClientSyncing } = useSyncStatus();

  const isSyncing = isWalletClientSyncing || isPublicClientSyncing;

  // Collapse when not syncing
  if (!isSyncing) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="rounded-full border bg-card/95 backdrop-blur-sm shadow-lg px-4 py-2.5 flex items-center gap-2.5 hover:bg-card transition-colors">
        {/* Syncing Icon */}
        <Loader2 className="h-4 w-4 animate-spin text-primary" />

        {/* Status Text */}
        <div className="flex items-center gap-2 text-sm">
          {isWalletClientSyncing && isPublicClientSyncing ? (
            <span className="font-medium text-foreground">Syncing wallet & public</span>
          ) : isWalletClientSyncing ? (
            <span className="font-medium text-foreground">Syncing wallet</span>
          ) : (
            <span className="font-medium text-foreground">Syncing public</span>
          )}
        </div>

        {/* Sync Status Dots */}
        <div className="flex items-center gap-1.5 ml-1">
          {isWalletClientSyncing && (
            <div
              className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"
              title="Wallet syncing"
              aria-label="Wallet syncing"
            />
          )}
          {isPublicClientSyncing && (
            <div
              className="h-2 w-2 rounded-full bg-green-500 animate-pulse"
              title="Public syncing"
              aria-label="Public syncing"
            />
          )}
        </div>
      </div>
    </div>
  );
}
