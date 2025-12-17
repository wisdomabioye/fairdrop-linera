/**
 * Query Deduplication Utility
 *
 * Prevents duplicate in-flight requests for the same resource.
 * If a request is already in progress for a given key, subsequent
 * requests will wait for and share the same promise.
 *
 * Example:
 * const deduplicator = new QueryDeduplicator();
 *
 * // These three calls will only trigger ONE actual fetch
 * const result1 = deduplicator.deduplicate('auction-123', () => fetchAuction('123'));
 * const result2 = deduplicator.deduplicate('auction-123', () => fetchAuction('123'));
 * const result3 = deduplicator.deduplicate('auction-123', () => fetchAuction('123'));
 */

export class QueryDeduplicator {
  private inflight: Map<string, Promise<unknown>> = new Map();

  /**
   * Deduplicate a query by key
   * @param key - Unique identifier for this query
   * @param fn - Function that performs the query
   * @returns Promise that resolves with the query result
   */
  async deduplicate<T>(key: string, fn: () => Promise<T>): Promise<T> {
    // Check if request is already in flight
    const existing = this.inflight.get(key);
    if (existing) {
      console.debug(`[QueryDeduplicator] Reusing in-flight request for key: ${key}`);
      return existing as Promise<T>;
    }

    // Create new request
    const promise = fn()
      .then((result) => {
        // Clean up after successful completion
        this.inflight.delete(key);
        return result;
      })
      .catch((error) => {
        // Clean up after error
        this.inflight.delete(key);
        throw error;
      });

    // Store in-flight request
    this.inflight.set(key, promise);
    return promise;
  }

  /**
   * Clear a specific key from the deduplication cache
   * @param key - Key to clear
   */
  clear(key: string): void {
    this.inflight.delete(key);
  }

  /**
   * Clear all in-flight requests
   */
  clearAll(): void {
    this.inflight.clear();
  }

  /**
   * Check if a request is currently in flight
   * @param key - Key to check
   */
  isInflight(key: string): boolean {
    return this.inflight.has(key);
  }
}

// Export a singleton instance
export const queryDeduplicator = new QueryDeduplicator();
