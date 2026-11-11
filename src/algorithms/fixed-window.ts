import type { Clock } from "../clock.js";
import { RealClock } from "../clock.js";
import type { RateLimiter, RateLimitResult } from "../types.js";

interface Entry {
  count: number;
  windowIndex: number;
}

/**
 * Fixed Window: requests counted per fixed, time-aligned window.
 * FLAW: a burst straddling a window boundary can be granted 2x the limit —
 * e.g. limit 5/min allows 5 at 11:59:59 and 5 at 12:00:01 (10 in ~2s).
 */
export class FixedWindowLimiter implements RateLimiter {
  private buckets = new Map<string, Entry>();
  constructor(private limit: number, private windowMs: number, private clock: Clock = new RealClock()) {}

  allow(key: string): RateLimitResult {
    const now = this.clock.now();
    const index = Math.floor(now / this.windowMs);
    let entry = this.buckets.get(key);
    if (!entry || entry.windowIndex !== index) {
      entry = { count: 0, windowIndex: index };
      this.buckets.set(key, entry);
    }
    if (entry.count < this.limit) {
      entry.count++;
      return { allowed: true, remaining: this.limit - entry.count, retryAfterMs: 0, limit: this.limit };
    }
    const retryAfterMs = (index + 1) * this.windowMs - now;
    return { allowed: false, remaining: 0, retryAfterMs, limit: this.limit };
  }
}
