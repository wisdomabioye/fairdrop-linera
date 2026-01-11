import { useEffect, useRef, useCallback } from 'react';
import type { AuctionParam } from '@/lib/gql/types';

const STORAGE_KEY = 'auction_form_draft';
const AUTO_SAVE_DELAY = 500;

export interface FormDraft {
  formData: Omit<AuctionParam, 'startTime' | 'endTime'>;
  startDate?: string;
  endDate?: string;
  currentStep: number;
}

export function usePersistedAuctionForm() {
  const saveTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const loadDraft = useCallback((): FormDraft | null => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (!saved) return null;
      return JSON.parse(saved) as FormDraft;
    } catch {
      return null;
    }
  }, []);

  const saveDraft = useCallback((draft: FormDraft) => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
      } catch (error) {
        console.warn('Failed to save draft:', error);
      }
    }, AUTO_SAVE_DELAY);
  }, []);

  const clearDraft = useCallback(() => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    } catch (error) {
      console.warn('Failed to clear draft:', error);
    }
  }, []);

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
    clearDraft
  };
}
