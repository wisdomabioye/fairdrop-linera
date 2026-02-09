'use client';

import { createContext, useContext, useEffect, useReducer, useRef, useCallback } from 'react';
import { useWalletConnection } from 'linera-react-client';
import { useAuctionStore } from '@/store/auction-store';
import { useTokenStore } from '@/store/token-store';
import { useChain } from '@/hooks/use-chain';

// ============ Types ============
export interface SyncStatus {
  isClientSyncing: boolean;
  isPublicClientSyncing: boolean;
  isWalletClientSyncing: boolean;
}

export interface SyncProviderOptions {
  enabled?: boolean;
  debounceTimeout?: number;
}

// ============ State & Actions ============
interface SyncState {
  isPublicSyncing: boolean;
  isWalletSyncing: boolean;
  hasCompletedFirstPublicSync: boolean;
  hasCompletedFirstWalletSync: boolean;
}

type SyncAction =
  | { type: 'PUBLIC_SYNC_START' }
  | { type: 'PUBLIC_SYNC_END' }
  | { type: 'WALLET_SYNC_START' }
  | { type: 'WALLET_SYNC_END' }
  | { type: 'WALLET_DISCONNECTED' };

const initialState: SyncState = {
  isPublicSyncing: false,
  isWalletSyncing: false,
  hasCompletedFirstPublicSync: false,
  hasCompletedFirstWalletSync: false,
};

function syncReducer(state: SyncState, action: SyncAction): SyncState {
  switch (action.type) {
    case 'PUBLIC_SYNC_START':
      return { ...state, isPublicSyncing: true };

    case 'PUBLIC_SYNC_END':
      return {
        ...state,
        isPublicSyncing: false,
        hasCompletedFirstPublicSync: true,
      };

    case 'WALLET_SYNC_START':
      return { ...state, isWalletSyncing: true };

    case 'WALLET_SYNC_END':
      return {
        ...state,
        isWalletSyncing: false,
        hasCompletedFirstWalletSync: true,
      };

    case 'WALLET_DISCONNECTED':
      // Reset wallet sync state but keep first-sync flags
      return {
        ...state,
        isWalletSyncing: false,
      };

    default:
      return state;
  }
}

// ============ Context ============
const SyncContext = createContext<SyncStatus | undefined>(undefined);

// ============ Provider ============
export function SyncProvider({
  children,
  debounceTimeout = 4000,
}: {
  children: React.ReactNode;
} & SyncProviderOptions) {
  const { address } = useWalletConnection();
  const { publicChain, walletChain, isConnected, isInitialized } = useChain();
  const { 
    invalidateAll,
    invalidateDashboardBatch,
    invalidateUserPortfolioBatch
  } = useAuctionStore();
  const { invalidateAll: invalidateAllFungibleData } = useTokenStore();

  const [state, dispatch] = useReducer(syncReducer, initialState);

  // Refs for timers
  const walletTimerRef = useRef<NodeJS.Timeout | null>(null);
  const publicTimerRef = useRef<NodeJS.Timeout | null>(null);
  const invalidationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Track previous state for detecting transitions
  const prevStateRef = useRef(state);

  // Clear all timers helper
  const clearWalletTimer = useCallback(() => {
    if (walletTimerRef.current) {
      clearTimeout(walletTimerRef.current);
      walletTimerRef.current = null;
    }
  }, []);

  const clearPublicTimer = useCallback(() => {
    if (publicTimerRef.current) {
      clearTimeout(publicTimerRef.current);
      publicTimerRef.current = null;
    }
  }, []);

  const clearInvalidationTimer = useCallback(() => {
    if (invalidationTimerRef.current) {
      clearTimeout(invalidationTimerRef.current);
      invalidationTimerRef.current = null;
    }
  }, []);

  /**
   * Debounced invalidation - only invalidate once even if both clients sync
   */
  const scheduleInvalidation = useCallback(() => {
    clearInvalidationTimer();

    invalidationTimerRef.current = setTimeout(() => {
      console.log('[SyncProvider] Executing debounced cache invalidation');
      invalidateAll();
      invalidateDashboardBatch();
      invalidateAllFungibleData();

      if (address) {
        invalidateUserPortfolioBatch(address);
      }
    }, 100); // Small delay to batch simultaneous sync completions
  }, [
    clearInvalidationTimer, 
    invalidateAll, 
    invalidateDashboardBatch,
    invalidateUserPortfolioBatch,
    invalidateAllFungibleData]);

  /**
   * Handle sync completion - detect transitions and invalidate
   */
  useEffect(() => {
    const prev = prevStateRef.current;

    // Detect public sync completion (was syncing, now not)
    if (prev.isPublicSyncing && !state.isPublicSyncing) {
      if (state.hasCompletedFirstPublicSync && prev.hasCompletedFirstPublicSync) {
        // Not first sync, schedule invalidation
        console.log('[SyncProvider] Public sync completed');
        scheduleInvalidation();
      } else {
        console.log('[SyncProvider] Public first sync completed - skipping invalidation');
      }
    }

    // Detect wallet sync completion (was syncing, now not)
    if (prev.isWalletSyncing && !state.isWalletSyncing) {
      if (state.hasCompletedFirstWalletSync && prev.hasCompletedFirstWalletSync) {
        // Not first sync, schedule invalidation
        console.log('[SyncProvider] Wallet sync completed');
        scheduleInvalidation();
      } else {
        console.log('[SyncProvider] Wallet first sync completed - skipping invalidation');
      }
    }

    prevStateRef.current = state;
  }, [state, scheduleInvalidation]);

  /**
   * Handle wallet disconnect - clear timer and reset state
   */
  useEffect(() => {
    if (!isConnected && prevStateRef.current.isWalletSyncing) {
      console.log('[SyncProvider] Wallet disconnected while syncing');
      clearWalletTimer();
      dispatch({ type: 'WALLET_DISCONNECTED' });
    }
  }, [isConnected, clearWalletTimer]);

  /**
   * Initial public sync on mount
   */
  useEffect(() => {
    if (isInitialized && !state.hasCompletedFirstPublicSync) {
      console.log('[SyncProvider] Public client initializing, starting sync');
      dispatch({ type: 'PUBLIC_SYNC_START' });

      clearPublicTimer();
      publicTimerRef.current = setTimeout(() => {
        dispatch({ type: 'PUBLIC_SYNC_END' });
      }, debounceTimeout);
    }
  }, [isInitialized, state.hasCompletedFirstPublicSync, clearPublicTimer, debounceTimeout]);

  /**
   * Initial wallet sync on connect
   */
  useEffect(() => {
    if (isInitialized && isConnected && !state.hasCompletedFirstWalletSync) {
      console.log('[SyncProvider] Wallet connected, starting sync');
      dispatch({ type: 'WALLET_SYNC_START' });

      clearWalletTimer();
      walletTimerRef.current = setTimeout(() => {
        dispatch({ type: 'WALLET_SYNC_END' });
      }, debounceTimeout);
    }
  }, [isInitialized, isConnected, state.hasCompletedFirstWalletSync, clearWalletTimer, debounceTimeout]);

  /**
   * Handle wallet notifications
   */
  const handleWalletNotification = useCallback(() => {
    console.debug('[SyncProvider] Wallet notification received');
    dispatch({ type: 'WALLET_SYNC_START' });

    clearWalletTimer();
    walletTimerRef.current = setTimeout(() => {
      dispatch({ type: 'WALLET_SYNC_END' });
    }, debounceTimeout);
  }, [debounceTimeout, clearWalletTimer]);

  /**
   * Handle public notifications
   */
  const handlePublicNotification = useCallback(() => {
    console.debug('[SyncProvider] Public notification received');
    dispatch({ type: 'PUBLIC_SYNC_START' });

    clearPublicTimer();
    publicTimerRef.current = setTimeout(() => {
      dispatch({ type: 'PUBLIC_SYNC_END' });
    }, debounceTimeout);
  }, [debounceTimeout, clearPublicTimer]);

  /**
   * Subscribe to wallet notifications with proper cleanup
   */
  useEffect(() => {
    if (!walletChain || !isConnected) return;

    console.log('[SyncProvider] Subscribing to wallet notifications');
    walletChain.onNotification(handleWalletNotification);

    return () => {
      console.log('[SyncProvider] Unsubscribing from wallet notifications');
      // Note: If walletChain has offNotification, call it here:
      // walletChain.offNotification?.(handleWalletNotification);
      clearWalletTimer();
    };
  }, [walletChain, isConnected, handleWalletNotification, clearWalletTimer]);

  /**
   * Subscribe to public notifications with proper cleanup
   */
  useEffect(() => {
    if (!publicChain) return;

    console.log('[SyncProvider] Subscribing to public notifications');
    publicChain.onNotification(handlePublicNotification);

    return () => {
      console.log('[SyncProvider] Unsubscribing from public notifications');
      // Note: If publicChain has offNotification, call it here:
      // publicChain.offNotification?.(handlePublicNotification);
      clearPublicTimer();
    };
  }, [publicChain, handlePublicNotification, clearPublicTimer]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      clearWalletTimer();
      clearPublicTimer();
      clearInvalidationTimer();
    };
  }, [clearWalletTimer, clearPublicTimer, clearInvalidationTimer]);

  const value: SyncStatus = {
    isClientSyncing: state.isPublicSyncing || state.isWalletSyncing,
    isPublicClientSyncing: state.isPublicSyncing,
    isWalletClientSyncing: state.isWalletSyncing,
  };

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}


/**
 * Hook to access sync status
 * @throws Error if used outside SyncProvider
 */
export function useSyncStatus(): SyncStatus {
    const context = useContext(SyncContext);
    if (context === undefined) {
        throw new Error('useSyncStatus must be used within a SyncProvider');
    }
    return context;
}