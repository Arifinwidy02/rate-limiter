# Rate Limiter

Production-grade HTTP rate limiting in TypeScript — four algorithms implemented and benchmarked side-by-side, including a **live demo of the Fixed Window boundary-exploitation flaw** and the sliding-window fix.

## Why this exists

Rate limiting sounds simple — "5 requests per minute" — but the naive implementation has a subtle, exploitable hole. This repo demonstrates each algorithm's trade-offs with working code, a reproducible demo, and tests, so the reasoning behind the design decisions is as visible as the code itself.

## The four algorithms

| Algorithm | Burst behavior | Output rate | Memory (per key) | Best for |
|---|---|---|---|---|
| **Fixed Window** | ❌ exploitable at boundaries | regular | `O(1)` | simple, best-effort |
| **Sliding Window** (weighted counter) | ✅ smooth | regular | `O(1)` | accurate, low memory |
| **Token Bucket** | ✅ short bursts allowed | average-bounded | `O(1)` | APIs that tolerate bursts |
| **Leaky Bucket** | ✅ capped, zero burst | perfectly regular | `O(queue)` | strict throughput shaping |

## The Fixed Window flaw (live demo)

Fixed Window counts requests in fixed, time-aligned buckets. The flaw: a client can send a **full burst right before a window boundary and another right after**, getting `2 × limit` requests in a fraction of the window.

```
$ npm run demo

Fixed Window : granted 10/10 in ~200ms (limit 5/60s)   ← 2x the limit!
Sliding Window: granted  5/10 in ~200ms (limit 5/60s)   ← corrected
```

Sliding Window fixes it by weighting the previous window's count by how much of it still overlaps the current one — so a boundary-straddling burst is still counted against the same rolling 60s.

## Usage

```ts
import { SlidingWindowLimiter } from "./dist/src/index.js";

// 100 requests per minute, per key (IP / user id)
const limiter = new SlidingWindowLimiter(100, 60_000);

const result = limiter.allow("192.168.1.10");
// result.allowed, result.remaining, result.retryAfterMs
```

## Running it

```bash
npm install
npm run build     # compile TypeScript
npm run demo      # boundary-flaw demo
npm run bench     # side-by-side throughput
npm test          # unit tests
```

## Benchmarks

Single-threaded, 200k requests across 100 keys (Node 24, in-memory):

| Algorithm | Throughput |
|---|---|
| fixed-window | ~20 M req/s |
| sliding-window | ~21 M req/s |
| token-bucket | ~21 M req/s |
| leaky-bucket | ~23 M req/s |

## Design notes (ADR)

- **In-memory by default.** Each limiter keeps state in a `Map`, keyed by caller identity. For distributed deployments, swap the backing store for Redis/etcd while keeping the same `RateLimiter` interface.
- **Testable clock.** All algorithms accept a `Clock`, so time-based behavior is tested deterministically with `FixedClock` — no sleeps in tests.
- **Uniform interface.** Every algorithm implements `allow(key): RateLimitResult`, so they're interchangeable behind the same middleware.

## License

MIT
