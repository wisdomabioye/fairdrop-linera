'use client';

import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useLineraChain } from 'linera-react-client';
import { useAuctionStore } from '@/store/auction-store';

export interface SyncStatus {
    /** True if either wallet or public client is syncing */
    isClientSyncing: boolean;
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
    // enabled = true,
    debounceTimeout = 3000,
}: {
    children: React.ReactNode;
} & SyncProviderOptions) {
    const { chain, isReady } = useLineraChain();
    const { invalidateAll } = useAuctionStore();
    const [isPublicClientSyncing, setIsPublicClientSyncing] = useState(false);

    const publicTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Refs to track previous sync state for detecting transitions
    const prevPublicSyncingRef = useRef(false);

    // Track if this is the first sync completion (skip invalidation on initial load)
    const hasCompletedFirstPublicSyncRef = useRef(false);

    const isClientSyncing = isPublicClientSyncing;

    /**
     * Set initial syncing state when public client becomes available
     */
    useEffect(() => {
        if (chain && isReady) {
            console.log('[SyncProvider] Public client available, assuming initial sync');
            setIsPublicClientSyncing(true);
        }
    }, [chain, isReady]);

    /**
     * Handle sync completion - call invalidateAll when syncing stops
     * Skip invalidation on first sync to prevent double-fetch on initial page load
     */
    useEffect(() => {
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
    }, [isPublicClientSyncing, invalidateAll]);

    /**
     * Handle public client notifications
     */
    const handlePublicNotification = useCallback(() => {
        // console.log('[SyncProvider] Public client notification received');

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
     * Subscribe to public client notifications
     */
    useEffect(() => {
        if (!chain || !isReady) {
            return;
        }

        console.log('[SyncProvider] Setting up public client notification listener');

        // Subscribe to notifications
        chain.onNotification(handlePublicNotification);

        // Cleanup
        return () => {
            console.log('[SyncProvider] Cleaning up public client notification listener');
            if (publicTimerRef.current) {
                clearTimeout(publicTimerRef.current);
            }
        };
    }, [chain, isReady, handlePublicNotification]);

    const value: SyncStatus = {
        isClientSyncing,
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
