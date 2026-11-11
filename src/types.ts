export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Unix epoch milliseconds when the next request would be allowed, when blocked. */
  retryAfterMs: number;
  /** Total limit for the window (where meaningful). */
  limit: number;
}

export interface RateLimiter {
  /**
   * Attempt to allow one request for the given key (e.g. IP, user id).
   * Implementations must be deterministic for a fixed clock.
   */
  allow(key: string): RateLimitResult;
}
