/**
 * Polling Manager
 *
 * Manages singleton polling intervals per resource with reference counting.
 * Only one interval runs per resource key, regardless of how many subscribers.
 *
 * Features:
 * - Reference counting: starts polling when first subscriber connects,
 *   stops when last unsubscribes
 * - Adaptive polling: slows down when tab is inactive
 * - Uses setTimeout instead of setInterval to prevent overlapping executions
 * - Efficient resource management
 */

type UnsubscribeFn = () => void;

interface PollingSubscription {
  key: string;
  callback: () => Promise<void> | void;
  interval: number;
  timeoutId: ReturnType<typeof setTimeout> | null;
  subscribers: Set<string>;
  isPaused: boolean;
  isExecuting: boolean;
}

export class PollingManager {
  private subscriptions: Map<string, PollingSubscription> = new Map();
  private subscriberCounter = 0;
  private isTabActive = true;

  constructor() {
    // Listen for tab visibility changes
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  /**
   * Handle tab visibility changes (slow down polling when tab is inactive)
   */
  private handleVisibilityChange = () => {
    this.isTabActive = !document.hidden;

    if (this.isTabActive) {
      // Tab became active - resume all paused subscriptions
      console.debug('[PollingManager] Tab active - resuming all polling');
      this.subscriptions.forEach((sub) => {
        if (sub.isPaused) {
          this.resumePolling(sub);
        }
      });
    } else {
      // Tab became inactive - pause all subscriptions
      console.debug('[PollingManager] Tab inactive - pausing all polling');
      this.subscriptions.forEach((sub) => {
        this.pausePolling(sub);
      });
    }
  };

  /**
   * Subscribe to polling for a resource
   * @param key - Unique identifier for this resource
   * @param callback - Function to call on each poll
   * @param interval - Polling interval in milliseconds
   * @returns Unsubscribe function
   */
  subscribe(
    key: string,
    callback: () => Promise<void> | void,
    interval: number
  ): UnsubscribeFn {
    // Generate unique subscriber ID
    const subscriberId = `sub-${++this.subscriberCounter}`;

    // Get or create subscription
    let subscription = this.subscriptions.get(key);

    if (!subscription) {
      // Create new subscription
      subscription = {
        key,
        callback,
        interval,
        timeoutId: null,
        subscribers: new Set([subscriberId]),
        isPaused: false,
        isExecuting: false,
      };

      this.subscriptions.set(key, subscription);

      // Start polling immediately
      this.startPolling(subscription);

      console.debug(`[PollingManager] Started polling for key: ${key} (${interval}ms)`);
    } else {
      // Add subscriber to existing subscription
      subscription.subscribers.add(subscriberId);

      console.debug(
        `[PollingManager] Added subscriber to key: ${key} (total: ${subscription.subscribers.size})`
      );
    }

    // Return unsubscribe function
    return () => {
      this.unsubscribe(key, subscriberId);
    };
  }

  /**
   * Unsubscribe from polling
   * @param key - Resource key
   * @param subscriberId - Subscriber ID
   */
  private unsubscribe(key: string, subscriberId: string): void {
    const subscription = this.subscriptions.get(key);

    if (!subscription) return;

    // Remove subscriber
    subscription.subscribers.delete(subscriberId);

    console.debug(
      `[PollingManager] Removed subscriber from key: ${key} (remaining: ${subscription.subscribers.size})`
    );

    // If no more subscribers, stop polling
    if (subscription.subscribers.size === 0) {
      this.stopPolling(subscription);
      this.subscriptions.delete(key);

      console.debug(`[PollingManager] Stopped polling for key: ${key}`);
    }
  }

  /**
   * Start polling using setTimeout (non-overlapping)
   */
  private startPolling(subscription: PollingSubscription): void {
    // Don't start if tab is inactive
    if (!this.isTabActive) {
      subscription.isPaused = true;
      return;
    }

    // Execute immediately on start
    this.scheduleNext(subscription, 0);
  }

  /**
   * Schedule the next poll execution
   */
  private scheduleNext(subscription: PollingSubscription, delay: number): void {
    // Clear any existing timeout
    if (subscription.timeoutId) {
      clearTimeout(subscription.timeoutId);
      subscription.timeoutId = null;
    }

    // Don't schedule if paused or no subscribers
    if (subscription.isPaused || subscription.subscribers.size === 0) {
      return;
    }

    subscription.timeoutId = setTimeout(async () => {
      // Skip if already executing (shouldn't happen with setTimeout, but safety check)
      if (subscription.isExecuting) {
        this.scheduleNext(subscription, subscription.interval);
        return;
      }

      subscription.isExecuting = true;

      try {
        await subscription.callback();
      } catch (error) {
        console.error(`[PollingManager] Error in callback for key: ${subscription.key}`, error);
      } finally {
        subscription.isExecuting = false;

        // Schedule next only if still active
        if (!subscription.isPaused && subscription.subscribers.size > 0) {
          this.scheduleNext(subscription, subscription.interval);
        }
      }
    }, delay);
  }

  /**
   * Stop polling for a subscription
   */
  private stopPolling(subscription: PollingSubscription): void {
    if (subscription.timeoutId) {
      clearTimeout(subscription.timeoutId);
      subscription.timeoutId = null;
    }
  }

  /**
   * Pause polling for a subscription
   */
  private pausePolling(subscription: PollingSubscription): void {
    if (subscription.timeoutId) {
      clearTimeout(subscription.timeoutId);
      subscription.timeoutId = null;
    }
    subscription.isPaused = true;
  }

  /**
   * Resume polling for a subscription
   */
  private resumePolling(subscription: PollingSubscription): void {
    subscription.isPaused = false;
    // Resume with full interval delay (not immediately)
    this.scheduleNext(subscription, subscription.interval);
  }

  /**
   * Manually trigger a poll for a key (useful for refresh)
   * @param key - Resource key
   */
  async trigger(key: string): Promise<void> {
    const subscription = this.subscriptions.get(key);
    if (subscription && !subscription.isExecuting) {
      subscription.isExecuting = true;
      try {
        await subscription.callback();
      } catch (error) {
        console.error(`[PollingManager] Error in trigger for key: ${key}`, error);
      } finally {
        subscription.isExecuting = false;
      }
    }
  }

  /**
   * Get number of active subscriptions
   */
  getActiveCount(): number {
    return this.subscriptions.size;
  }

  /**
   * Get subscriber count for a key
   */
  getSubscriberCount(key: string): number {
    return this.subscriptions.get(key)?.subscribers.size ?? 0;
  }

  /**
   * Clean up all subscriptions (call on unmount/cleanup)
   */
  destroy(): void {
    this.subscriptions.forEach((sub) => {
      this.stopPolling(sub);
    });
    this.subscriptions.clear();

    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }
}

// Export singleton instance
export const pollingManager = new PollingManager();
