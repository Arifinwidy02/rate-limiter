import { test } from "node:test";
import assert from "node:assert/strict";
import { FixedWindowLimiter, SlidingWindowLimiter, TokenBucketLimiter, LeakyBucketLimiter, FixedClock } from "../dist/src/index.js";

test("fixed window grants up to limit then blocks until next window", () => {
  const clock = new FixedClock(0);
  const l = new FixedWindowLimiter(3, 60_000, clock);
  assert.equal(l.allow("a").allowed, true);
  assert.equal(l.allow("a").allowed, true);
  assert.equal(l.allow("a").allowed, true);
  assert.equal(l.allow("a").allowed, false);
  clock.advance(60_001);
  assert.equal(l.allow("a").allowed, true);
});

test("fixed window exhibits the boundary flaw (2x burst)", () => {
  const clock = new FixedClock(0);
  const l = new FixedWindowLimiter(5, 60_000, clock);
  clock.advance(59_900);
  for (let i = 0; i < 5; i++) assert.equal(l.allow("a").allowed, true); // burst A
  clock.advance(200); // boundary crossed
  let burstB = 0;
  for (let i = 0; i < 5; i++) if (l.allow("a").allowed) burstB++;
  assert.equal(burstB, 5, "fixed window wrongly allows a second full burst");
});

test("sliding window rejects the boundary burst", () => {
  const clock = new FixedClock(0);
  const l = new SlidingWindowLimiter(5, 60_000, clock);
  clock.advance(59_900);
  for (let i = 0; i < 5; i++) l.allow("a"); // burst A
  clock.advance(200); // boundary crossed
  let burstB = 0;
  for (let i = 0; i < 5; i++) if (l.allow("a").allowed) burstB++;
  assert.equal(burstB, 0, "sliding window should reject the boundary burst");
});

test("token bucket allows a burst up to capacity then refills", () => {
  const clock = new FixedClock(0);
  const l = new TokenBucketLimiter(3, 1, clock); // 3 tokens, refill 1/s
  for (let i = 0; i < 3; i++) assert.equal(l.allow("a").allowed, true);
  assert.equal(l.allow("a").allowed, false);
  clock.advance(1000);
  assert.equal(l.allow("a").allowed, true);
});

test("leaky bucket caps burst to capacity", () => {
  const clock = new FixedClock(0);
  const l = new LeakyBucketLimiter(3, 2, clock); // capacity 3, drain 2/s
  for (let i = 0; i < 3; i++) assert.equal(l.allow("a").allowed, true);
  assert.equal(l.allow("a").allowed, false);
  clock.advance(500);
  assert.equal(l.allow("a").allowed, true);
});

test("keys are isolated", () => {
  const clock = new FixedClock(0);
  const l = new FixedWindowLimiter(1, 60_000, clock);
  assert.equal(l.allow("a").allowed, true);
  assert.equal(l.allow("b").allowed, true);
  assert.equal(l.allow("a").allowed, false);
});
