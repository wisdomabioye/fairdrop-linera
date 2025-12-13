import { useEffect, useRef } from 'react';

export function usePolling(
  fn: () => Promise<void> | void,
  interval: number,
  options?: { immediate?: boolean }
) {
  const { immediate = true } = options || {};
  const savedFn = useRef(fn);

  // Always keep the latest fn without restarting the effect
  useEffect(() => {
    savedFn.current = fn;
  }, [fn]);

  useEffect(() => {
    if (interval <= 0) return;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const execute = async () => {
      if (cancelled) return;

      try {
        await savedFn.current();
      } finally {
        if (!cancelled) {
          timeoutId = setTimeout(execute, interval);
        }
      }
    };

    if (immediate) {
      execute();
    } else {
      timeoutId = setTimeout(execute, interval);
    }

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [interval]);
}
