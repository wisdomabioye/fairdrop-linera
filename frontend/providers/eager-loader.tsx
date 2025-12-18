'use client'

/**
 * Eagerly load needed data with Progressive Loading strategy
 *
 * Loading Priority Tiers:
 * - Tier 1 (T=0ms): Critical - Active Auctions (homepage must-have)
 * - Tier 2 (T=500ms): Important - Settled Auctions (visible tabs)
 * - Tier 3 (T=1000ms): User Data - Creator auctions, Commitments (wallet-gated)
 * - Tier 4 (T=1500ms): Nice-to-Have - Token balances (background updates)
 */
import { useEffect, useState } from 'react';
import { useLineraClient, useLineraApplication } from 'linera-react-client';
import { useSyncStatus } from './sync-provider';
import {
    useCachedActiveAuctions,
    useCachedSettledAuctions,
    useCachedAuctionsByCreator,
    useCachedAllMyCommitments,
} from '@/hooks';
import { useTokenStore } from '@/store/token-store';
import { getTokenList } from '@/config/app.token-store';
import { AAC_APP_ID, UIC_APP_ID } from '@/config/app.config';

export function EagerLoader({
    children
}: {
    children: React.ReactNode;
}) {
    const aacApp = useLineraApplication(AAC_APP_ID); // Same as uicApp
    // const uicApp = useLineraApplication(UIC_APP_ID);
    const { isConnected, walletAddress } = useLineraClient();
    const { isWalletClientSyncing } = useSyncStatus();

    // ============ Token Store Actions ============
    const { fetchAccounts, fetchTokenInfo } = useTokenStore();

    // ============ Get Token Applications ============
    const tokens = getTokenList();
    const lusdApp = useLineraApplication(tokens[0]?.appId);
    const fusdApp = useLineraApplication(tokens[1]?.appId);
    const tokenApps = [
        { token: tokens[0], app: lusdApp.app },
        { token: tokens[1], app: fusdApp.app },
    ];

    // ============ Progressive Loading State ============
    const [loadTier2, setLoadTier2] = useState(false); // Settled auctions
    const [loadTier3, setLoadTier3] = useState(false); // User data
    const [loadTier4, setLoadTier4] = useState(false); // Token balances

    // ============ Progressive Loading Timers ============
    useEffect(() => {
        // Tier 2: Load after 500ms
        const tier2Timer = setTimeout(() => {
            setLoadTier2(true);
        }, 500);

        // Tier 3: Load after 1000ms (only if wallet connected)
        const tier3Timer = setTimeout(() => {
            if (isConnected) {
                setLoadTier3(true);
            }
        }, 1000);

        // Tier 4: Load after 1500ms (only if wallet connected)
        const tier4Timer = setTimeout(() => {
            if (isConnected) {
                setLoadTier4(true);
            }
        }, 1500);

        return () => {
            clearTimeout(tier2Timer);
            clearTimeout(tier3Timer);
            clearTimeout(tier4Timer);
        };
    }, [isConnected]);

    // Update Tier 3 and 4 when wallet connects
    useEffect(() => {
        if (isConnected) {
            // If user connects wallet after initial load, trigger Tier 3/4 after short delay
            const tier3Delay = setTimeout(() => setLoadTier3(true), 100);
            const tier4Delay = setTimeout(() => setLoadTier4(true), 600);

            return () => {
                clearTimeout(tier3Delay);
                clearTimeout(tier4Delay);
            };
        }
    }, [isConnected]);

    // ============ TIER 1: CRITICAL (T=0) - Homepage Must-Haves ============
    // Load active auctions immediately - critical for homepage
    // IMPORTANT: limit must match active-auction page (20) to avoid conflicts
    useCachedActiveAuctions({
        aacApp: aacApp.app,
        limit: 20,
        offset: 0,
        skip: false,
        enablePolling: true,
    });

    // ============ TIER 2: IMPORTANT (T=500ms) - Visible Tabs ============
    // Load settled auctions after initial render
    useCachedSettledAuctions({
        aacApp: aacApp.app,
        limit: 20,
        offset: 0,
        skip: !loadTier2,
        enablePolling: loadTier2,
    });

    // ============ TIER 3: USER DATA (T=1000ms) - Personalization ============
    // Load user's created auctions (wallet-gated)
    useCachedAuctionsByCreator({
        creator: walletAddress ?? '',
        aacApp: aacApp.app,
        limit: 20,
        offset: 0,
        skip: !walletAddress || !loadTier3,
        enablePolling: !!walletAddress && loadTier3,
    });

    // Load user's commitments for all auctions (for "My Bids" page)
    useCachedAllMyCommitments({
        uicApp: aacApp.app, // uicApp is the same with aacApp
        skip: !isConnected || !loadTier3,
    });

    // ============ TIER 4: NICE-TO-HAVE (T=1500ms) - Background Updates ============
    // Load balances and token info for all supported tokens
    useEffect(() => {
        if (!isConnected || isWalletClientSyncing || !walletAddress || !loadTier4) return;

        // Load token info and balances for each token
        tokenApps.forEach(({ token, app }) => {
            if (!token || !app) return;

            // Fetch token info (name, symbol) - cached for 100 minutes
            fetchTokenInfo(token.appId, app).catch((err) => {
                console.error(`[EagerLoader] Failed to fetch token info for ${token.symbol}:`, err);
            });

            // Fetch all accounts (balances) for this user
            fetchAccounts(token.appId, app).catch((err) => {
                console.error(`[EagerLoader] Failed to fetch accounts for ${token.symbol}:`, err);
            });
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isConnected, isWalletClientSyncing, walletAddress, loadTier4, fetchAccounts, fetchTokenInfo]);

    return (
        children
    )
}