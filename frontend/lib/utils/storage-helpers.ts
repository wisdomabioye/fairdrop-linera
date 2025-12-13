/**
 * Storage Helper Utilities
 *
 * Helpers for managing indexer initialization state in localStorage
 * with chain-awareness and type safety.
 *
 * Note: Initialization is tracked per indexer chain ID.
 * The same indexer application can exist on multiple chains,
 * and each chain needs its own initialization.
 */

import type { SubscriptionInfo } from '@/lib/gql/types';

const STORAGE_KEY = 'fairdrop_indexer_init';

interface StoredInitState {
  indexerChainId: string;  // Indexer chain ID (unique per chain)
  subscriptionInfo: SubscriptionInfo;
  timestamp: number;
}

/**
 * Get stored initialization state for a specific indexer chain
 * @param indexerChainId - The indexer chain ID
 * @returns Stored subscription info or null
 */
export const getStoredInitState = (indexerChainId: string): SubscriptionInfo | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const data: StoredInitState = JSON.parse(stored);

    // Validate it's for the same indexer chain and is initialized
    if (data.indexerChainId === indexerChainId && data.subscriptionInfo.initialized) {
      return data.subscriptionInfo;
    }
  } catch (error) {
    console.error('[StorageHelpers] Error reading init state:', error);
    return null;
  }
  return null;
};

/**
 * Store initialization state for a specific indexer chain
 * @param indexerChainId - The indexer chain ID
 * @param info - Subscription info to store
 */
export const setStoredInitState = (indexerChainId: string, info: SubscriptionInfo): void => {
  try {
    const data: StoredInitState = {
      indexerChainId,
      subscriptionInfo: info,
      timestamp: Date.now()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('[StorageHelpers] Error storing init state:', error);
  }
};

/**
 * Clear stored initialization state
 */
export const clearStoredInitState = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('[StorageHelpers] Error clearing init state:', error);
  }
};

/**
 * Check if stored state exists for an indexer chain
 * @param indexerChainId - The indexer chain ID to check
 * @returns True if valid stored state exists
 */
export const hasStoredInitState = (indexerChainId: string): boolean => {
  return getStoredInitState(indexerChainId) !== null;
};
