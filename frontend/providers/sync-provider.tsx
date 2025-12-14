'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useLineraClient } from 'linera-react-client';
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
    /** Debounce timeout in milliseconds (default: 1500) */
    debounceTimeout?: number;
}

const SyncContext = createContext<SyncStatus | undefined>(undefined);

export function SyncProvider({
    children,
    enabled = true,
    debounceTimeout = 1500,
}: {
    children: React.ReactNode;
} & SyncProviderOptions) {
    const { publicClient, walletClient } = useLineraClient();
    const { invalidateAll } = useAuctionStore();

    const [isWalletClientSyncing, setIsWalletClientSyncing] = useState(false);
    const [isPublicClientSyncing, setIsPublicClientSyncing] = useState(false);

    // Refs to track debounce timers
    const walletTimerRef = useRef<NodeJS.Timeout | null>(null);
    const publicTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Refs to track previous sync state for detecting transitions
    const prevWalletSyncingRef = useRef(false);
    const prevPublicSyncingRef = useRef(false);

    const isClientSyncing = isWalletClientSyncing || isPublicClientSyncing;

    /**
     * Handle sync completion - call invalidateAll when syncing stops
     */
    useEffect(() => {
        // Detect wallet client sync completion
        if (prevWalletSyncingRef.current && !isWalletClientSyncing) {
            console.log('[SyncProvider] Wallet client sync completed, invalidating caches');
            invalidateAll();
        }
        prevWalletSyncingRef.current = isWalletClientSyncing;

        // Detect public client sync completion
        if (prevPublicSyncingRef.current && !isPublicClientSyncing) {
            console.log('[SyncProvider] Public client sync completed, invalidating caches');
            invalidateAll();
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
