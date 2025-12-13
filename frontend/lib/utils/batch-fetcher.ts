/**
 * Auction Batch Fetcher
 *
 * Batches multiple auction fetch requests to optimize network usage.
 * Useful when multiple components mount simultaneously (e.g., list of auction cards).
 *
 * Features:
 * - Collects requests in a queue
 * - Flushes queue every 50ms OR when reaches 10 items
 * - Fetches all queued auctions in parallel with connection pooling
 * - Returns individual results to each caller
 *
 * Example:
 * const fetcher = new AuctionBatchFetcher(fetchFn);
 *
 * // These requests get batched together
 * const auction1 = fetcher.fetch('id1');
 * const auction2 = fetcher.fetch('id2');
 * const auction3 = fetcher.fetch('id3');
 */

type FetchFunction<T> = (ids: string[]) => Promise<Map<string, T>>;

export class BatchFetcher<T> {
  private queue: Map<string, Promise<T>> = new Map();
  private resolvers: Map<string, (value: T) => void> = new Map();
  private rejecters: Map<string, (error: Error) => void> = new Map();
  private flushTimer: NodeJS.Timeout | null = null;
  private fetchFn: FetchFunction<T>;
  private maxBatchSize: number;
  private flushDelay: number;

  constructor(
    fetchFn: FetchFunction<T>,
    options: {
      maxBatchSize?: number;
      flushDelay?: number;
    } = {}
  ) {
    this.fetchFn = fetchFn;
    this.maxBatchSize = options.maxBatchSize ?? 10;
    this.flushDelay = options.flushDelay ?? 50;
  }

  /**
   * Queue a fetch request
   * @param id - Unique identifier
   * @returns Promise that resolves with the fetched data
   */
  fetch(id: string): Promise<T> {
    // If already in queue, return existing promise
    const existing = this.queue.get(id);
    if (existing) {
      return existing;
    }

    // Create new promise
    const promise = new Promise<T>((resolve, reject) => {
      this.resolvers.set(id, resolve);
      this.rejecters.set(id, reject);
    });

    this.queue.set(id, promise);

    // Schedule flush
    this.scheduleFlush();

    // If batch is full, flush immediately
    if (this.queue.size >= this.maxBatchSize) {
      this.flush();
    }

    return promise;
  }

  /**
   * Schedule a flush
   */
  private scheduleFlush(): void {
    if (this.flushTimer) return;

    this.flushTimer = setTimeout(() => {
      this.flush();
    }, this.flushDelay);
  }

  /**
   * Flush the queue and fetch all batched requests
   */
  private async flush(): Promise<void> {
    // Clear timer
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    // Nothing to flush
    if (this.queue.size === 0) return;

    // Get current batch
    const ids = Array.from(this.queue.keys());
    const resolvers = new Map(this.resolvers);
    const rejecters = new Map(this.rejecters);

    // Clear queue
    this.queue.clear();
    this.resolvers.clear();
    this.rejecters.clear();

    console.debug(`[BatchFetcher] Flushing batch of ${ids.length} items`);

    try {
      // Fetch all in parallel
      const results = await this.fetchFn(ids);

      // Resolve individual promises
      ids.forEach((id) => {
        const result = results.get(id);
        const resolve = resolvers.get(id);

        if (result && resolve) {
          resolve(result);
        } else if (resolve) {
          // If no result, reject with error
          const reject = rejecters.get(id);
          if (reject) {
            reject(new Error(`No result for id: ${id}`));
          }
        }
      });
    } catch (error) {
      // If batch fails, reject all promises
      const err = error instanceof Error ? error : new Error('Batch fetch failed');

      ids.forEach((id) => {
        const reject = rejecters.get(id);
        if (reject) {
          reject(err);
        }
      });
    }
  }

  /**
   * Clear the queue without flushing
   */
  clear(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    this.queue.clear();
    this.resolvers.clear();
    this.rejecters.clear();
  }
}

/**
 * Create a batch fetcher for auctions
 * @param fetchAuctionFn - Function that fetches a single auction
 * @returns BatchFetcher instance
 */
export function createAuctionBatchFetcher<T>(
  fetchAuctionFn: (id: string) => Promise<T>
): BatchFetcher<T> {
  return new BatchFetcher<T>(
    async (ids: string[]) => {
      // Fetch all in parallel
      const results = await Promise.allSettled(ids.map((id) => fetchAuctionFn(id)));

      // Build result map
      const map = new Map<string, T>();

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          map.set(ids[index], result.value);
        }
      });

      return map;
    },
    {
      maxBatchSize: 10,
      flushDelay: 50,
    }
  );
}
