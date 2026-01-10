import { useEffect, useRef, useCallback } from 'react';
import { AuctionFormData } from '@/components/auction/create-auction-form';

const STORAGE_KEY = 'auction_form_draft';
const AUTO_SAVE_DELAY = 500; // ms

export interface PersistedFormState {
  formData: AuctionFormData | null;
  savedAt: number | null;
}

/**
 * Hook to persist auction form data to localStorage with auto-save
 *
 * Features:
 * - Auto-saves form data with debouncing (500ms)
 * - Restores saved draft on mount
 * - Provides hasDraft flag to show draft indicator
 * - Clear method to remove saved data
 */
export function usePersistedAuctionForm() {
  const saveTimerRef = useRef<NodeJS.Timeout>();

  /**
   * Load saved form data from localStorage
   */
  const loadDraft = useCallback((): PersistedFormState => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        return { formData: null, savedAt: null };
      }

      const parsed = JSON.parse(saved) as PersistedFormState;

      // Validate that the data has the expected structure
      if (!parsed.formData || typeof parsed.savedAt !== 'number') {
        return { formData: null, savedAt: null };
      }

      return parsed;
    } catch (error) {
      console.warn('[PersistedForm] Failed to load draft:', error);
      return { formData: null, savedAt: null };
    }
  }, []);

  /**
   * Save form data to localStorage (debounced)
   */
  const saveDraft = useCallback((formData: AuctionFormData) => {
    // Clear existing timer
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    // Schedule save
    saveTimerRef.current = setTimeout(() => {
      try {
        const state: PersistedFormState = {
          formData,
          savedAt: Date.now()
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (error) {
        console.warn('[PersistedForm] Failed to save draft:', error);
      }
    }, AUTO_SAVE_DELAY);
  }, []);

  /**
   * Clear saved form data from localStorage
   */
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);

      // Clear pending save timer
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    } catch (error) {
      console.warn('[PersistedForm] Failed to clear draft:', error);
    }
  }, []);

  /**
   * Check if there's a saved draft
   */
  const hasDraft = useCallback((): boolean => {
    const { formData } = loadDraft();
    return formData !== null;
  }, [loadDraft]);

  /**
   * Cleanup timer on unmount
   */
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  return {
    loadDraft,
    saveDraft,
    clearDraft,
    hasDraft
  };
}
