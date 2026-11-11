import { FixedWindowLimiter, SlidingWindowLimiter, TokenBucketLimiter, LeakyBucketLimiter } from "../src/index.js";
import type { RateLimiter } from "../src/index.js";

const N = 200_000;
const KEYS = 100;

function bench(name: string, make: () => RateLimiter) {
  const limiter = make();
  const start = process.hrtime.bigint();
  let granted = 0;
  for (let i = 0; i < N; i++) {
    const key = "k" + (i % KEYS);
    if (limiter.allow(key).allowed) granted++;
  }
  const ms = Number(process.hrtime.bigint() - start) / 1e6;
  console.log(`${name.padEnd(18)} ${(N / ms * 1000 / 1e6).toFixed(2)} M req/s  (granted ${granted})`);
}

bench("fixed-window", () => new FixedWindowLimiter(100, 60_000));
bench("sliding-window", () => new SlidingWindowLimiter(100, 60_000));
bench("token-bucket", () => new TokenBucketLimiter(100, 100 / 60));
bench("leaky-bucket", () => new LeakyBucketLimiter(100, 100 / 60));
