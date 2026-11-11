import { FixedWindowLimiter, SlidingWindowLimiter, FixedClock } from "../src/index.js";

/**
 * Demo: prove the Fixed Window boundary flaw and how Sliding Window fixes it.
 *
 * Limit: 5 requests per 60s window.
 * Attack: 5 requests just BEFORE the window boundary, then 5 more just AFTER.
 * Fixed Window counts them in two different windows → grants all 10 in ~200ms.
 * Sliding Window weights the previous window's count → rejects the second burst.
 */

function scenario(label: string, limiter: { allow(k: string): { allowed: boolean } }, clock: FixedClock) {
  const granted: boolean[] = [];
  clock.advance(59_900); // sit near the end of window 1
  for (let i = 0; i < 5; i++) granted.push(limiter.allow("u1").allowed); // burst A (window 1)
  clock.advance(200); // cross into window 2
  for (let i = 0; i < 5; i++) granted.push(limiter.allow("u1").allowed); // burst B (window 2)
  const total = granted.filter(Boolean).length;
  console.log(`${label}: granted ${total}/10 in ~200ms (limit 5/60s)`);
  return total;
}

const fwClock = new FixedClock(0);
const swClock = new FixedClock(0);
const fixed = new FixedWindowLimiter(5, 60_000, fwClock);
const sliding = new SlidingWindowLimiter(5, 60_000, swClock);

scenario("Fixed Window ", fixed, fwClock);
scenario("Sliding Window", sliding, swClock);
