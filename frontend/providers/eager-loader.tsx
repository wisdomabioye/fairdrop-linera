'use client';

/**
 * EagerLoader - Centralized Background Data Fetching
 *
 * Manages polling for LIST data only:
 * - Active auctions list (polling)
 * - Settled auctions list (no polling - rarely changes)
 * - User's created auctions (no polling - user triggers refetch)
 * - User's token balances (polling - can change externally)
 *
 * Individual auction detail polling is handled by useCachedAuctionSummary.
 */

import { useEffect, useRef } from 'react';
import { useLineraClient } from 'linera-react-client';
import { useAuctionStore } from '@/store/auction-store';
import { pollingManager } from '@/lib/utils/polling-manager';
import { useAacApp } from '@/hooks';
import { getTokenList } from '@/config/app.token-store';

const POLLING = {
  ACTIVE: 10_000,   // 10s - prices change frequently
  BALANCES: 15_000, // 15s - balances can change from deposits/bids
} as const;

const PAGE_SIZE = 20;

export function EagerLoader({ children }: { children: React.ReactNode }) {
  const { isConnected, walletAddress } = useLineraClient();
  const aacApp = useAacApp();
  const tokens = getTokenList();

  const {
    fetchActiveAuctions,
    fetchSettledAuctions,
    fetchAuctionsByCreator,
    fetchUserBalances,
    startPollingActiveAuctions,
  } = useAuctionStore();

  // Track cleanup functions
  const activePollingCleanup = useRef<(() => void) | null>(null);
  const balancePollingCleanup = useRef<(() => void) | null>(null);
  const tier2Loaded = useRef(false);
  const tier3Loaded = useRef(false);

  // ============ TIER 1: Active Auctions (Immediate + Polling) ============
  useEffect(() => {
    if (!aacApp.app) return;

    // Initial fetch
    fetchActiveAuctions(0, PAGE_SIZE, aacApp.app);

    // Start polling
    activePollingCleanup.current = startPollingActiveAuctions(0, PAGE_SIZE, aacApp.app, POLLING.ACTIVE);

    return () => {
      activePollingCleanup.current?.();
      activePollingCleanup.current = null;
    };
  }, [aacApp.app, fetchActiveAuctions, startPollingActiveAuctions]);

  // ============ TIER 2: Settled Auctions (Delayed 500ms, no polling) ============
  useEffect(() => {
    if (!aacApp.app || tier2Loaded.current) return;

    const timer = setTimeout(() => {
      tier2Loaded.current = true;
      fetchSettledAuctions(0, PAGE_SIZE, aacApp.app!);
    }, 500);

    return () => clearTimeout(timer);
  }, [aacApp.app, fetchSettledAuctions]);

  // ============ TIER 3: User Data (Wallet-gated, delayed 1000ms) ============
  useEffect(() => {
    // Cleanup previous polling when wallet changes/disconnects
    if (balancePollingCleanup.current) {
      balancePollingCleanup.current();
      balancePollingCleanup.current = null;
    }

    if (!aacApp.app || !isConnected || !walletAddress) {
      tier3Loaded.current = false;
      return;
    }

    if (tier3Loaded.current) return;

    const tokenAppIds = tokens.map(t => t.appId);

    const timer = setTimeout(() => {
      tier3Loaded.current = true;

      // Initial fetches
      fetchAuctionsByCreator(walletAddress, aacApp.app!);
      fetchUserBalances(walletAddress, tokenAppIds, aacApp.app!);

      // Start polling for user balances
      balancePollingCleanup.current = pollingManager.subscribe(
        `user-balances-${walletAddress}`,
        () => fetchUserBalances(walletAddress, tokenAppIds, aacApp.app!),
        POLLING.BALANCES
      );
    }, 1000);

    return () => {
      clearTimeout(timer);
      balancePollingCleanup.current?.();
      balancePollingCleanup.current = null;
    };
  }, [aacApp.app, isConnected, walletAddress, tokens, fetchAuctionsByCreator, fetchUserBalances]);

  return <>{children}</>;
}