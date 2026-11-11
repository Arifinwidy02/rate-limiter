import type { Clock } from "../clock.js";
import { RealClock } from "../clock.js";
import type { RateLimiter, RateLimitResult } from "../types.js";

interface Bucket {
  queue: number[];
}

/**
 * Leaky Bucket: requests enter a FIFO queue drained at a constant rate.
 * The queue capacity bounds the burst; overflow is rejected. Output rate is
 * perfectly regular (no bursts), at the cost of up to `capacity` slots of latency.
 */
export class LeakyBucketLimiter implements RateLimiter {
  private buckets = new Map<string, Bucket>();
  constructor(
    private capacity: number,
    private drainPerSecond: number,
    private clock: Clock = new RealClock(),
  ) {}

  allow(key: string): RateLimitResult {
    const now = this.clock.now();
    let b = this.buckets.get(key);
    if (!b) {
      b = { queue: [] };
      this.buckets.set(key, b);
    }

    // Each queued item occupies 1/drainPerSecond seconds and drains FIFO.
    const drainIntervalMs = 1000 / this.drainPerSecond;
    while (b.queue.length > 0 && now - b.queue[0] >= drainIntervalMs) {
      b.queue.shift();
    }

    if (b.queue.length >= this.capacity) {
      const nextSlotMs = b.queue[0] + drainIntervalMs - now;
      return { allowed: false, remaining: 0, retryAfterMs: Math.max(0, Math.ceil(nextSlotMs)), limit: this.capacity };
    }

    b.queue.push(now);
    return { allowed: true, remaining: this.capacity - b.queue.length, retryAfterMs: 0, limit: this.capacity };
  }
}
