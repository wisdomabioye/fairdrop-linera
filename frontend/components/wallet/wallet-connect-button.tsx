'use client';

import { Wallet, Loader2 } from 'lucide-react';
import { useWalletConnection } from 'linera-react-client';
import { useSyncStatus } from '@/providers';
import { Button } from '@/components/ui/button';

export interface WalletConnectButtonProps {
  /** Custom button text when disconnected */
  connectText?: string;
  /** Custom button text when connecting */
  connectingText?: string;
  /** Button size */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  /** Button variant */
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  /** Additional className */
  className?: string;
  /** Full width button */
  fullWidth?: boolean;
}

/**
 * Wallet connect button with loading states
 * Handles connecting, syncing, and connected states
 */
export function WalletConnectButton({
  connectText = 'Connect Wallet',
  connectingText = 'Connecting...',
  size = 'default',
  variant = 'default',
  className = '',
  fullWidth = false
}: WalletConnectButtonProps) {
  const { isConnected, isConnecting, connect } = useWalletConnection();
  const { isWalletClientSyncing } = useSyncStatus();

  // Already connected and synced - don't show button
  if (isConnected && !isWalletClientSyncing) {
    return null;
  }

  // Show syncing state
  if (isConnected && isWalletClientSyncing) {
    return (
      <Button
        size={size}
        variant="outline"
        disabled
        className={fullWidth ? 'w-full' : className}
      >
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Syncing wallet...
      </Button>
    );
  }

  // Show connecting state
  if (isConnecting) {
    return (
      <Button
        size={size}
        variant={variant}
        disabled
        className={fullWidth ? 'w-full' : className}
      >
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        {connectingText}
      </Button>
    );
  }

  // Show connect button
  return (
    <Button
      size={size}
      variant={variant}
      onClick={connect}
      className={fullWidth ? 'w-full' : className}
    >
      <Wallet className="h-4 w-4 mr-2" />
      {connectText}
    </Button>
  );
}
