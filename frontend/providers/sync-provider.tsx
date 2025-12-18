'use client';

import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useLineraClient, useWalletConnection } from 'linera-react-client';
import { useAuctionStore } from '@/store/auction-store';

export interface SyncStatus {
    /** True if either wallet or public client is syncing */
    isClientSyncing: boolean;
    /** True if wallet client is syncing */
    isWalletClientSyncing: boolean;
    /** True if public client is syncing */
    isPublicClientSyncing: boolean;
}

export interface SyncProviderOptions {
    /** Whether to enable sync tracking (default: true) */
    enabled?: boolean;
    /** Debounce timeout in milliseconds (default: 3000) */
    debounceTimeout?: number;
}

const SyncContext = createContext<SyncStatus | undefined>(undefined);

export function SyncProvider({
    children,
    enabled = true,
    debounceTimeout = 3000,
}: {
    children: React.ReactNode;
} & SyncProviderOptions) {
    const { publicClient, walletClient } = useLineraClient();
    const { isConnected } = useWalletConnection();
    const { invalidateAll } = useAuctionStore();

    const [isWalletClientSyncing, setIsWalletClientSyncing] = useState(false);
    const [isPublicClientSyncing, setIsPublicClientSyncing] = useState(false);

    // Refs to track debounce timers
    const walletTimerRef = useRef<NodeJS.Timeout | null>(null);
    const publicTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Refs to track previous sync state for detecting transitions
    const prevWalletSyncingRef = useRef(false);
    const prevPublicSyncingRef = useRef(false);

    // Track if this is the first sync completion (skip invalidation on initial load)
    const hasCompletedFirstPublicSyncRef = useRef(false);
    const hasCompletedFirstWalletSyncRef = useRef(false);

    const isClientSyncing = isWalletClientSyncing || isPublicClientSyncing;

    /**
     * Set initial syncing state when wallet client becomes available
     */
    useEffect(() => {
        if (walletClient && enabled && isConnected) {
            console.log('[SyncProvider] Wallet client available, assuming initial sync');
            setIsWalletClientSyncing(true);
        }
    }, [walletClient, enabled, isConnected]);

    /**
     * Set initial syncing state when public client becomes available
     */
    useEffect(() => {
        if (publicClient && enabled) {
            console.log('[SyncProvider] Public client available, assuming initial sync');
            setIsPublicClientSyncing(true);
        }
    }, [publicClient, enabled]);

    /**
     * Handle sync completion - call invalidateAll when syncing stops
     * Skip invalidation on first sync to prevent double-fetch on initial page load
     */
    useEffect(() => {
        // Detect wallet client sync completion
        if (prevWalletSyncingRef.current && !isWalletClientSyncing) {
            if (!hasCompletedFirstWalletSyncRef.current) {
                console.log('[SyncProvider] Wallet client first sync completed - skipping cache invalidation');
                hasCompletedFirstWalletSyncRef.current = true;
            } else {
                console.log('[SyncProvider] Wallet client sync completed, invalidating caches');
                invalidateAll();
            }
        }
        prevWalletSyncingRef.current = isWalletClientSyncing;

        // Detect public client sync completion
        if (prevPublicSyncingRef.current && !isPublicClientSyncing) {
            if (!hasCompletedFirstPublicSyncRef.current) {
                console.log('[SyncProvider] Public client first sync completed - skipping cache invalidation');
                hasCompletedFirstPublicSyncRef.current = true;
            } else {
                console.log('[SyncProvider] Public client sync completed, invalidating caches');
                invalidateAll();
            }
        }
        prevPublicSyncingRef.current = isPublicClientSyncing;
    }, [isWalletClientSyncing, isPublicClientSyncing, invalidateAll]);

    /**
     * Handle wallet client notifications
     */
    const handleWalletNotification = useCallback(() => {
        console.log('[SyncProvider] Wallet client notification received');

        // Set syncing state
        setIsWalletClientSyncing(true);

        // Clear existing timer
        if (walletTimerRef.current) {
            clearTimeout(walletTimerRef.current);
        }

        // Set new debounce timer
        walletTimerRef.current = setTimeout(() => {
            console.log('[SyncProvider] Wallet client sync settled');
            setIsWalletClientSyncing(false);
        }, debounceTimeout);
    }, [debounceTimeout]);

    /**
     * Handle public client notifications
     */
    const handlePublicNotification = useCallback(() => {
        console.log('[SyncProvider] Public client notification received');

        // Set syncing state
        setIsPublicClientSyncing(true);

        // Clear existing timer
        if (publicTimerRef.current) {
            clearTimeout(publicTimerRef.current);
        }

        // Set new debounce timer
        publicTimerRef.current = setTimeout(() => {
            console.log('[SyncProvider] Public client sync settled');
            setIsPublicClientSyncing(false);
        }, debounceTimeout);
    }, [debounceTimeout]);

    /**
     * Subscribe to wallet client notifications
     */
    useEffect(() => {
        if (!walletClient || !enabled) {
            return;
        }

        console.log('[SyncProvider] Setting up wallet client notification listener');

        // Subscribe to notifications
        walletClient.onNotification(handleWalletNotification);

        // Cleanup
        return () => {
            console.log('[SyncProvider] Cleaning up wallet client notification listener');
            if (walletTimerRef.current) {
                clearTimeout(walletTimerRef.current);
            }
        };
    }, [walletClient, enabled, handleWalletNotification]);

    /**
     * Subscribe to public client notifications
     */
    useEffect(() => {
        if (!publicClient || !enabled) {
            return;
        }

        console.log('[SyncProvider] Setting up public client notification listener');

        // Subscribe to notifications
        publicClient.onNotification(handlePublicNotification);

        // Cleanup
        return () => {
            console.log('[SyncProvider] Cleaning up public client notification listener');
            if (publicTimerRef.current) {
                clearTimeout(publicTimerRef.current);
            }
        };
    }, [publicClient, enabled, handlePublicNotification]);

    const value: SyncStatus = {
        isClientSyncing,
        isWalletClientSyncing,
        isPublicClientSyncing,
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
