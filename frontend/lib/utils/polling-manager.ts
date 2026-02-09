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
 * - Per-subscriber callbacks to avoid overwrite issues
 * - Error backoff on consecutive failures
 * - Execution time compensation for accurate intervals
 */

type UnsubscribeFn = () => void;
type CallbackFn = () => Promise<void> | void;

interface SubscriberInfo {
  callback: CallbackFn;
}

interface PollingSubscription {
  key: string;
  interval: number;
  timeoutId: ReturnType<typeof setTimeout> | null;
  subscribers: Map<string, SubscriberInfo>;
  isPaused: boolean;
  isExecuting: boolean;
  /**
   * Generation token - incremented on state changes (pause, resume, trigger, unsubscribe, interval change)
   * to invalidate stale scheduled timeouts. Not incremented when scheduling, only when state changes.
   */
  token: number;
  lastPollTime: number;
  consecutiveErrors: number;
}

const MAX_BACKOFF_MS = 60000; // 1 minute max backoff
const BACKOFF_MULTIPLIER = 2;

export class PollingManager {
  private subscriptions: Map<string, PollingSubscription> = new Map();
  private subscriberCounter = 0;
  private isTabActive = true;
  private isDestroyed = false;

  constructor() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  private handleVisibilityChange = () => {
    this.isTabActive = !document.hidden;

    if (this.isTabActive) {
      console.debug('[PollingManager] Tab active - resuming all polling');
      this.subscriptions.forEach((sub) => {
        if (sub.isPaused && sub.subscribers.size > 0) {
          this.resumePolling(sub);
        }
      });
    } else {
      console.debug('[PollingManager] Tab inactive - pausing all polling');
      this.subscriptions.forEach((sub) => {
        this.pausePolling(sub);
      });
    }
  };

  subscribe(
    key: string,
    callback: CallbackFn,
    interval: number
  ): UnsubscribeFn {
    const subscriberId = `sub-${++this.subscriberCounter}`;

    let subscription = this.subscriptions.get(key);

    if (!subscription) {
      subscription = {
        key,
        interval,
        timeoutId: null,
        subscribers: new Map([[subscriberId, { callback }]]),
        isPaused: false,
        isExecuting: false,
        token: 0,
        lastPollTime: 0,
        consecutiveErrors: 0,
      };

      this.subscriptions.set(key, subscription);
      this.startPolling(subscription);

      console.debug(`[PollingManager] Started polling for key: ${key} (${interval}ms)`);
    } else {
      subscription.subscribers.set(subscriberId, { callback });

      const intervalChanged = subscription.interval !== interval;
      if (intervalChanged) {
        subscription.interval = interval;

        if (!subscription.isPaused && !subscription.isExecuting) {
          subscription.token++;
          // Account for elapsed time since last poll
          const elapsed = Date.now() - subscription.lastPollTime;
          const remaining = Math.max(0, interval - elapsed);
          this.scheduleNext(subscription, remaining);
        }
      }

      console.debug(
        `[PollingManager] Added subscriber to key: ${key} (total: ${subscription.subscribers.size})`
      );
    }

    return () => {
      this.unsubscribe(key, subscriberId);
    };
  }

  private unsubscribe(key: string, subscriberId: string): void {
    const subscription = this.subscriptions.get(key);
    if (!subscription) return;

    subscription.subscribers.delete(subscriberId);

    console.debug(
      `[PollingManager] Removed subscriber from key: ${key} (remaining: ${subscription.subscribers.size})`
    );

    if (subscription.subscribers.size === 0) {
      subscription.token++;
      subscription.isPaused = true;
      this.stopPolling(subscription);
      this.subscriptions.delete(key);

      console.debug(`[PollingManager] Stopped polling for key: ${key}`);
    }
  }

  private startPolling(subscription: PollingSubscription): void {
    if (this.isDestroyed) return;
    if (!this.isTabActive) {
      subscription.isPaused = true;
      return;
    }
    subscription.isPaused = false;
    this.scheduleNext(subscription, subscription.interval);
  }

  private scheduleNext(subscription: PollingSubscription, delay: number): void {
    if (this.isDestroyed) return;

    if (subscription.timeoutId) {
      clearTimeout(subscription.timeoutId);
      subscription.timeoutId = null;
    }

    if (subscription.isPaused || subscription.subscribers.size === 0) {
      return;
    }

    // Capture current token - timeout will only execute if token hasn't changed
    // Token is incremented by state changes (pause/resume/trigger/unsubscribe), not by scheduling
    const tokenAtSchedule = subscription.token;
    const subscriptionKey = subscription.key;

    subscription.timeoutId = setTimeout(async () => {
      // Early exit checks - get fresh reference from map
      const currentSub = this.subscriptions.get(subscriptionKey);
      if (this.isDestroyed || !currentSub || currentSub.token !== tokenAtSchedule) {
        return;
      }

      // Skip if already executing - the running execution's finally block will reschedule
      if (currentSub.isExecuting) {
        return;
      }

      currentSub.isExecuting = true;
      const startTime = Date.now();
      currentSub.lastPollTime = startTime;

      let hasError = false;
      try {
        await this.executeCallbacks(currentSub);
        currentSub.consecutiveErrors = 0;
      } catch (error) {
        hasError = true;
        currentSub.consecutiveErrors++;
        console.error(`[PollingManager] Error in callbacks for key: ${subscriptionKey}`, error);
      } finally {
        currentSub.isExecuting = false;

        // Re-check conditions after async work
        const stillValid =
          !this.isDestroyed &&
          this.subscriptions.has(subscriptionKey) &&
          currentSub.token === tokenAtSchedule &&
          !currentSub.isPaused &&
          currentSub.subscribers.size > 0;

        if (stillValid) {
          // Compensate for execution time
          const executionTime = Date.now() - startTime;
          let nextDelay = Math.max(0, currentSub.interval - executionTime);

          // Apply backoff on errors (starts at 2x interval on first error)
          if (hasError && currentSub.consecutiveErrors > 0) {
            const backoff = Math.min(
              MAX_BACKOFF_MS,
              currentSub.interval * Math.pow(BACKOFF_MULTIPLIER, currentSub.consecutiveErrors)
            );
            nextDelay = Math.max(nextDelay, backoff);
          }

          this.scheduleNext(currentSub, nextDelay);
        }
      }
    }, delay);
  }

  private async executeCallbacks(subscription: PollingSubscription): Promise<void> {
    const callbacks = Array.from(subscription.subscribers.values()).map((s) => s.callback);
    const results = await Promise.allSettled(callbacks.map((cb) => cb()));

    const errors = results.filter((r) => r.status === 'rejected');
    if (errors.length > 0) {
      throw new AggregateError(
        errors.map((e) => (e as PromiseRejectedResult).reason),
        `${errors.length} callback(s) failed`
      );
    }
  }

  private stopPolling(subscription: PollingSubscription): void {
    if (subscription.timeoutId) {
      clearTimeout(subscription.timeoutId);
      subscription.timeoutId = null;
    }
  }

  private pausePolling(subscription: PollingSubscription): void {
    if (subscription.timeoutId) {
      clearTimeout(subscription.timeoutId);
      subscription.timeoutId = null;
    }
    subscription.token++;
    subscription.isPaused = true;
  }

  private resumePolling(subscription: PollingSubscription): void {
    if (this.isDestroyed || subscription.subscribers.size === 0) return;

    subscription.isPaused = false;
    subscription.token++;

    // Account for time elapsed while paused
    const elapsed = Date.now() - subscription.lastPollTime;
    const remaining = Math.max(0, subscription.interval - elapsed);

    this.scheduleNext(subscription, remaining);
  }

  /**
   * Manually trigger a poll for a key
   * @returns true if triggered, false if already executing or not found
   */
  async trigger(key: string): Promise<boolean> {
    const subscription = this.subscriptions.get(key);
    if (!subscription || this.isDestroyed) return false;

    if (subscription.isExecuting) {
      // Return false to indicate trigger was skipped
      return false;
    }

    if (subscription.timeoutId) {
      clearTimeout(subscription.timeoutId);
      subscription.timeoutId = null;
    }

    const tokenAtTrigger = ++subscription.token;
    subscription.isExecuting = true;
    const startTime = Date.now();
    subscription.lastPollTime = startTime;

    let hasError = false;
    try {
      await this.executeCallbacks(subscription);
      subscription.consecutiveErrors = 0;
    } catch (error) {
      hasError = true;
      subscription.consecutiveErrors++;
      console.error(`[PollingManager] Error in trigger for key: ${key}`, error);
    } finally {
      subscription.isExecuting = false;

      const stillValid =
        !this.isDestroyed &&
        this.subscriptions.has(key) &&
        subscription.token === tokenAtTrigger &&
        !subscription.isPaused &&
        subscription.subscribers.size > 0;

      if (stillValid) {
        const executionTime = Date.now() - startTime;
        let nextDelay = Math.max(0, subscription.interval - executionTime);

        // Apply backoff on errors (starts at 2x interval on first error)
        if (hasError && subscription.consecutiveErrors > 0) {
          const backoff = Math.min(
            MAX_BACKOFF_MS,
            subscription.interval * Math.pow(BACKOFF_MULTIPLIER, subscription.consecutiveErrors)
          );
          nextDelay = Math.max(nextDelay, backoff);
        }

        this.scheduleNext(subscription, nextDelay);
      }
    }

    return true;
  }

  /**
   * Wait for current execution to complete, then trigger
   */
  async triggerWhenReady(key: string, timeoutMs = 30000): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      if (this.isDestroyed) return false;
      if (!this.subscriptions.has(key)) return false;

      // Attempt trigger - it returns false if executing or not found
      const triggered = await this.trigger(key);
      if (triggered) {
        return true;
      }

      // trigger returned false, likely due to isExecuting - wait and retry
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    return false;
  }

  getActiveCount(): number {
    return this.subscriptions.size;
  }

  getSubscriberCount(key: string): number {
    return this.subscriptions.get(key)?.subscribers.size ?? 0;
  }

  destroy(): void {
    this.isDestroyed = true;
    this.subscriptions.forEach((sub) => {
      sub.token++;
      this.stopPolling(sub);
    });
    this.subscriptions.clear();
    this.subscriberCounter = 0;

    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }
}

export const pollingManager = new PollingManager();
