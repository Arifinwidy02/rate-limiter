import type { Clock } from "../clock.js";
import { RealClock } from "../clock.js";
import type { RateLimiter, RateLimitResult } from "../types.js";

interface Window {
  count: number;
  windowStart: number;
}

interface Bucket {
  current: Window;
  prev: Window;
}

/**
 * Sliding Window (weighted counter, log-free): smooths the Fixed Window boundary
 * flaw by weighting the previous window's count by how much of it still overlaps.
 * Allowed when: prev.count * (1 - elapsedRatio) + current.count < limit.
 */
export class SlidingWindowLimiter implements RateLimiter {
  private buckets = new Map<string, Bucket>();
  constructor(private limit: number, private windowMs: number, private clock: Clock = new RealClock()) {}

  allow(key: string): RateLimitResult {
    const now = this.clock.now();
    let b = this.buckets.get(key);
    if (!b) {
      b = { current: { count: 0, windowStart: now }, prev: { count: 0, windowStart: now - this.windowMs } };
      this.buckets.set(key, b);
    }

    const elapsed = now - b.current.windowStart;

    // Roll windows forward as time passes.
    if (elapsed >= this.windowMs * 2) {
      b.prev = { count: 0, windowStart: now - this.windowMs };
      b.current = { count: 0, windowStart: now };
    } else if (elapsed >= this.windowMs) {
      b.prev = { count: b.current.count, windowStart: b.current.windowStart };
      b.current = { count: 0, windowStart: b.current.windowStart + this.windowMs };
    }

    const elapsedAfterRoll = now - b.current.windowStart;
    const overlapRatio = Math.max(0, 1 - elapsedAfterRoll / this.windowMs);
    // Round UP so the previous window's share is never under-counted: this is what
    // guarantees we reject a full burst that just crossed the boundary.
    const weighted = Math.ceil(b.prev.count * overlapRatio);

    if (weighted + b.current.count < this.limit) {
      b.current.count++;
      const remaining = Math.max(0, this.limit - weighted - b.current.count);
      return { allowed: true, remaining, retryAfterMs: 0, limit: this.limit };
    }
    const retryAfterMs = b.current.windowStart + this.windowMs - now;
    return { allowed: false, remaining: 0, retryAfterMs, limit: this.limit };
  }
}
