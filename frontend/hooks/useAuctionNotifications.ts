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

export interface UseAuctionNotificationsOptions {
    /** Whether to enable notifications (default: true) */
    enabled?: boolean;
}

export function useAuctionNotifications(
    options: UseAuctionNotificationsOptions = {}
): void {
    const { enabled = true } = options;

    const { client } = useLineraClient();
    const { invalidateAll } = useAuctionStore();

    /**
     * Set up Linera client notification listener
     */
    useEffect(() => {
        if (!client || !enabled) {
            return;
        }

        console.log('[useAuctionNotifications] Setting up notification listener');

        // Subscribe to notifications
        client.onNotification(() => {
            console.log('[useAuctionNotifications] Received notification, invalidating all caches');

            // Invalidate all cached data - this will trigger re-fetches
            // in all active hooks that depend on stale data
            invalidateAll();
        });

        // Cleanup on unmount
        return () => {
            console.log('[useAuctionNotifications] Component unmounting');
        };
    }, [client, enabled, invalidateAll]);
}
