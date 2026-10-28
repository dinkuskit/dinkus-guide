# Proof: Ask Service Warm In-Memory Runner & Bounded FIFO Queue (`2026-10-27`)

## Summary of Changes

1. **Warm In-Memory Corpus, Embeddings & FTS5 Index (`createWarmGuideRunner` in `src/ask-service.js`)**:
   - Loads and verifies the pinned 164-source corpus and 2,154-chunk `qwen3-embedding` vector cache (`verifyCorpus({ chunkCorpusImpl: chunkCorpus })`) once at service initialization and warms the `WeakMap`-cached `:memory:` SQLite FTS5 index (`rankEvidence("dinkuskit", verifiedCorpus, 1)`) before accepting HTTP requests.
   - Fails closed at startup (`unavailable`) if `DINKUS_GUIDE_EMBED_BASE_URL` is configured without a verified embeddings cache.
   - Propagates per-request `AbortSignal` cancellation (`AbortSignal.any([init.signal, signal])`) to both embedding and model `fetch` calls, translating aborted requests to `504 timeout` (`{ error: "timeout" }`) and masking provider details as `503 unavailable`.
2. **Bounded FIFO Wait Queue (`concurrency: 4`, `queueSize: 8`)**:
   - Raises `DEFAULT_LIMITS.concurrency` from `2` to `4` (`max: 16`) and adds `DEFAULT_LIMITS.queueSize: 8` (`min: 0`, `max: 64`, configurable via `DINKUS_GUIDE_SERVICE_QUEUE_SIZE` in `bin/dinkus-guide-serve`).
   - Holds bursts up to `concurrency + queueSize` (`12` simultaneous visitor requests by default) in FIFO order, removes timed-out or client-aborted waiters from the queue immediately without consuming an execution slot or rate-limit token, and rejects overflow above `queueSize` immediately with `429 overloaded`.

## Automated Verification

```text
$ npm test
ℹ tests 72
ℹ pass 72
ℹ fail 0

$ npm run verify
project verified: 164 pinned public sources (dinkuskit=58, transition=1, emdash=105); dev=75 cases (unseen holdout isolated outside public repo)
```

## Live Warm HTTP vs. Cold CLI Latency Benchmark

Measured against local OpenAI-compatible loopback endpoints for `nemotron-3.5-super-vl` (`DINKUS_GUIDE_NO_THINK=1`) and `qwen3-embedding` (`4096` dimensions across `2,154` verified chunks):

- **One-time service startup (`createAskService` corpus + 100 MB embeddings verification + SQLite FTS5 index build)**: `514 ms`

| Mode | Question | HTTP Status | Guide Status | Citations | Latency (`ms`) |
| --- | --- | ---: | --- | ---: | ---: |
| Cold CLI spawn (`runGuide`) #1 | `How do I install and start the local template store?` | — | `answered` | 1 | `5,366` |
| Cold CLI spawn (`runGuide`) #2 | `How does @dinkuskit/commerce handle carts, checkout, and order lifecycles?` | — | `answered` | 10 | `8,596` |
| Warm HTTP `POST /ask` (sequential #1) | `How do I install and start the local template store?` | `200` | `answered` | 2 | `4,401` |
| Warm HTTP `POST /ask` (sequential #2) | `How does @dinkuskit/commerce handle carts, checkout, and order lifecycles?` | `200` | `answered` | 10 | `5,092` |
| Warm HTTP `POST /ask` (2 concurrent, #1) | `How do I install and start the local template store?` | `200` | `answered` | 2 | `8,598` |
| Warm HTTP `POST /ask` (2 concurrent, #2) | `How does @dinkuskit/commerce handle carts, checkout, and order lifecycles?` | `200` | `answered` | 10 | `9,163` |

## Scope & Privacy Verification

- Modified files:
  - `src/ask-service.js`
  - `bin/dinkus-guide-serve`
  - `docs/ask-service.md`
  - `tests/ask-service.test.js`
  - `proof/ask-service-warm-queue-20261027/PROOF.md`
- Zero overlap with `src/guide.js`, `tests/guide.test.js`, or `corpus/*`.
- Public privacy check confirmed zero internal hostnames, private IP addresses, or private repository references in tracked files.
