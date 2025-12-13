'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { useWalletConnection, getLineraClientManager } from 'linera-react-client';
import { WalletSelectionDialog } from '../wallet/wallet-selection-dialog';
import { SUPPORTED_WALLETS } from '@/config/app.wallets';
import { toast } from 'sonner';

interface WalletConnectProps {
  onConnect?: (address: string) => void;
  onDisconnect?: () => void;
}

export function WalletConnect({ onConnect, onDisconnect }: WalletConnectProps) {
  const {
    isConnected,
    isConnecting,
    address,
    error: connectionError,
    connect,
    disconnect,
  } = useWalletConnection();

  const [isDisconnecting, setIsDisconnecting] = React.useState(false);
  const [showWalletDialog, setShowWalletDialog] = React.useState(false);

  // Call callbacks when connection state changes
  React.useEffect(() => {
    if (isConnected && address) {
      onConnect?.(address);
    }
  }, [isConnected, address, onConnect]);

  const handleConnect = async () => {
    setShowWalletDialog(true);
  };

  const handleWalletSelect = async (walletId: string) => {
    try {
      // Currently only MetaMask is supported by linera-react-client
      // Future: Add support for other wallets here
      if (walletId === 'metamask') {
        await connect();
        setShowWalletDialog(false);
        toast.success('Wallet Connected', {
          description: 'Your wallet has been successfully connected to Fairdrop.',
        });
      } else {
        // For other wallets, show a message that they're coming soon
        const wallet = SUPPORTED_WALLETS.find(w => w.id === walletId);
        toast.info(`${wallet?.name || 'Wallet'} Coming Soon`, {
          description: 'Support for this wallet is currently in development. Stay tuned!',
        });
      }
    } catch (err) {
      console.error('Failed to connect:', err);
      toast.error('Connection Failed', {
        description: err instanceof Error ? err.message : 'Failed to connect wallet. Please try again.',
      });
      throw err; // Re-throw to let the dialog handle it
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await disconnect();

      // Wait for state to actually update
      // Poll isConnected until it becomes false
      let attempts = 0;
      const maxAttempts = 30; // 3 seconds max

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100));

        // Check client manager state directly to see if disconnection is complete
        const clientManager = getLineraClientManager();

        if (clientManager && !clientManager.canWrite()) {
          // Successfully disconnected
          console.log('Wallet disconnected successfully');
          toast.success('Wallet Disconnected', {
            description: 'Your wallet has been disconnected successfully.',
          });
          onDisconnect?.();
          break;
        }

        attempts++;
      }

      if (attempts >= maxAttempts) {
        console.warn('Disconnect state update timeout - state may be stale');
        onDisconnect?.();
      }
    } catch (err) {
      console.error('Failed to disconnect:', err);
      toast.error('Disconnect Failed', {
        description: 'Failed to disconnect wallet. Please try again.',
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (isConnected && address) {
    return (
      <div className='flex items-center gap-2'>
        <div className='group relative px-4 py-2 rounded-lg bg-gradient-to-r from-success/10 to-success/5 border border-success/30 text-success text-sm font-medium shadow-lg shadow-success/10 hover:shadow-success/20 transition-all'>
          <div className='flex items-center gap-2'>
            <div className='relative'>
              <span className='w-2 h-2 bg-success rounded-full inline-block animate-pulse' />
              <span className='absolute inset-0 w-2 h-2 bg-success rounded-full animate-ping opacity-75' />
            </div>
            <span className='font-mono'>{formatAddress(address)}</span>
            <svg className='w-4 h-4 opacity-50' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' />
            </svg>
          </div>

          {/* Tooltip */}
          <div className='absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-card border border-white/10 rounded-lg text-xs text-text-secondary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl'>
            Connected Wallet
            <div className='absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-card' />
          </div>
        </div>
        <Button
          variant='ghost'
          size='sm'
          onClick={handleDisconnect}
          disabled={isDisconnecting}
          className='hover:text-error hover:border-error/30'
        >
          {isDisconnecting && (
            <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
          )}
          {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className='flex flex-col items-end gap-2'>
        <Button
          variant='gradient'
          size='sm'
          onClick={handleConnect}
          disabled={isConnecting}
          className='relative overflow-hidden group'
        >
          <span className='relative z-10 flex items-center gap-2'>
            {isConnecting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className='w-4 h-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1' />
              </svg>
            )}
            {isConnecting ? 'Connecting...' : 'Connect Wallet'}
          </span>
        </Button>
        {connectionError && (
          <div className='max-w-xs text-right'>
            <p className='text-xs text-error bg-error/10 border border-error/30 rounded-lg px-3 py-2'>
              {connectionError.message}
            </p>
          </div>
        )}
      </div>

      <WalletSelectionDialog
        open={showWalletDialog}
        onClose={() => setShowWalletDialog(false)}
        wallets={SUPPORTED_WALLETS}
        onWalletSelect={handleWalletSelect}
        isConnecting={isConnecting}
      />
    </>
  );
}
