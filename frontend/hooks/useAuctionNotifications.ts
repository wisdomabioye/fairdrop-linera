/**
 * useAuctionNotifications Hook
 *
 * Listens to real-time blockchain notifications from Linera client.
 * Automatically invalidates all cached data when notifications are received,
 * triggering re-fetches across all active hooks.
 *
 * Features:
 * - Subscribes to Linera client notifications
 * - Invalidates all auction store caches on new blocks
 * - Clean setup/teardown
 *
 * Usage:
 * ```tsx
 * // In your App.tsx or root component
 * useAuctionNotifications();
 * ```
 */

import { useEffect } from 'react';
import { useLineraClient } from 'linera-react-client';
import { useAuctionStore } from '@/store/auction-store';
import { AAC_APP_ID } from '@/config/app.config';


export interface UseAuctionNotificationsOptions {
    /** Whether to enable notifications (default: true) */
    enabled?: boolean;
}

export function useAuctionNotifications(
    options: UseAuctionNotificationsOptions = {}
): void {
    const { enabled = true } = options;

    const { publicClient, walletClient } = useLineraClient();
    const { invalidateAll } = useAuctionStore();

    /**
     * Set up Linera client notification listener
     */
    useEffect(() => {
        if (!publicClient || !enabled) {
            return;
        }

        console.log('[useAuctionNotifications publicClient] Setting up notification listener');

        // Subscribe to notifications
        publicClient.onNotification((notification: unknown) => {
            console.log('[useAuctionNotifications publicClient] Received notification, invalidating all caches', notification);

            // Invalidate all cached data - this will trigger re-fetches
            // in all active hooks that depend on stale data
            invalidateAll();
        });

        // Cleanup on unmount
        return () => {
            console.log('[useAuctionNotifications] Component unmounting');
        };
    }, [publicClient, enabled, invalidateAll]);

    useEffect(() => {
        if (!walletClient || !enabled) {
            return;
        }

        console.log('[useAuctionNotifications walletClient] Setting up notification listener');

        // Subscribe to notifications
        walletClient.onNotification((notification: unknown) => {
            console.log('[useAuctionNotifications walletClient] Received notification, invalidating all caches', notification);
            invalidateAll();
        });

        // Cleanup on unmount
        return () => {
            console.log('[useAuctionNotifications] Component unmounting');
        };
    }, [walletClient, enabled, invalidateAll]);

}
