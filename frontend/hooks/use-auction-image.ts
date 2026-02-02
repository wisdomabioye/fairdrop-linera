/**
 * useAuctionImage Hook
 *
 * Fetches and caches auction images from blob storage.
 * Images are immutable - once fetched, they're cached permanently.
 *
 * Features:
 * - Lazy loading: only fetches when aacApp is ready
 * - Permanent cache: no refetching needed
 * - Progressive loading: returns null while loading
 * - Error resilience: gracefully handles missing images
 */

import { useEffect, useRef } from 'react';
import { useAuctionStore } from '@/store/auction-store';
import type { ApplicationClient } from 'linera-react-client';

export interface UseAuctionImageOptions {
  auctionId: string;
  aacApp: ApplicationClient | null;
  skip?: boolean;
}

export interface UseAuctionImageResult {
  imageUrl: string | null;
  loading: boolean;
  error: Error | null;
}

export function useAuctionImage(
  options: UseAuctionImageOptions
): UseAuctionImageResult {
  const { auctionId, aacApp, skip = false } = options;

  const { auctionImages, fetchAuctionImage } = useAuctionStore();

  // Track if we've initiated a fetch
  const hasFetched = useRef(false);

  // Get cached entry
  const entry = auctionImages.get(String(auctionId));
  const imageUrl = entry?.objectUrl ?? null;
  const status = entry?.status ?? 'idle';
  const loading = status === 'loading';
  const error = entry?.error ?? null;

  // Fetch image on mount (only once per auctionId)
  useEffect(() => {
    if (skip || !aacApp || !auctionId) return;

    // Only fetch if not already cached and not already fetched
    if (status === 'idle' && !hasFetched.current) {
      hasFetched.current = true;
      fetchAuctionImage(auctionId, aacApp).catch((err) => {
        console.error('[useAuctionImage] Fetch error:', err);
      });
    }
  }, [skip, aacApp, auctionId, status, fetchAuctionImage]);

  // Reset hasFetched when auctionId changes
  useEffect(() => {
    hasFetched.current = false;
  }, [auctionId]);

  return {
    imageUrl,
    loading,
    error,
  };
}
