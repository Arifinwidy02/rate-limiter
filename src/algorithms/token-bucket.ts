import type { Clock } from "../clock.js";
import { RealClock } from "../clock.js";
import type { RateLimiter, RateLimitResult } from "../types.js";

interface Bucket {
  tokens: number;
  lastRefill: number;
}

/**
 * Token Bucket: a bucket holds up to `capacity` tokens, refilled at a fixed rate.
 * Each request consumes one token. Allows short bursts (up to capacity) while
 * bounding the sustained average rate.
 */
export class TokenBucketLimiter implements RateLimiter {
  private buckets = new Map<string, Bucket>();
  constructor(
    private capacity: number,
    private refillPerSecond: number,
    private clock: Clock = new RealClock(),
  ) {}

  allow(key: string): RateLimitResult {
    const now = this.clock.now();
    let b = this.buckets.get(key);
    if (!b) {
      b = { tokens: this.capacity, lastRefill: now };
      this.buckets.set(key, b);
    }

    const elapsedSec = (now - b.lastRefill) / 1000;
    const newTokens = elapsedSec * this.refillPerSecond;
    b.tokens = Math.min(this.capacity, b.tokens + newTokens);
    b.lastRefill = now;

    if (b.tokens >= 1) {
      b.tokens -= 1;
      return { allowed: true, remaining: Math.floor(b.tokens), retryAfterMs: 0, limit: this.capacity };
    }
    const retryAfterMs = Math.ceil((1 - b.tokens) / this.refillPerSecond * 1000);
    return { allowed: false, remaining: 0, retryAfterMs, limit: this.capacity };
  }
}
