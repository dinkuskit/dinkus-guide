# DinkusGuide v1 proof

Implementation tested locally: `a0a435ed1fc1c6a07f838451455e7c10b4253937`.
Actual model run source: `a0a435ed1fc1c6a07f838451455e7c10b4253937`.
Base: `ca39eb7500b8c8f57526385700244e7cb9cbc4ae`.
PR: https://github.com/dinkuskit/dinkus-guide/pull/1

## What exists

A read-only Node 24 CLI, 15 explicitly pinned public source documents across the
six active public DinkusKit and EmDash repositories, immutable line citations,
bounded optional model answering, and a separate CLI evaluator. Source
synchronization is an explicit operator action; answering has no action tools.
No private archives, store access, deployment, or training are included.

## Reproducible checks

- `npm test`: 35/35 pass.
- `npm run verify`: pass; 15 pinned public documents.
- `node bin/dinkus-guide corpus verify --json`: pass.
- `node bin/dinkus-guide-eval run --json --mode extractive`: 23/24 (95.8%).
- `node bin/dinkus-guide-eval run --json --mode model`: actual local
  `nemotron-3.5-super-vl`, 20/24 (83.3%).

Both current evaluations use `corrected-public-development-v3`, version 3, and
corpus hash `e2ec499d5c054e3e4a3bbbc30d8aa4f387f7c5a189a794022c3e5ce362d5bda4`.
See [extractive v3 results](EXTRACTIVE_BASELINE_V3.json),
[model v3 results](MODEL_BASELINE_V3.json), and
[model v3 run metadata](MODEL_RUN_V3.json). Earlier `v2` artifacts
([extractive v2](EXTRACTIVE_BASELINE.json), [model v2](MODEL_BASELINE.json),
[model v2 metadata](MODEL_RUN.json)) remain preserved as append-only history.
These are public development-checklist scores, not independent held-out accuracy
or production-readiness claims.

Actual model proof used a local OpenAI-compatible loopback forward to the
`nemotron-3.5-super-vl` test consumer. Credentials stayed inside that existing
consumer. The adapter forwarded only the bounded public question/excerpts;
there were 18 provider requests, a 1,024-token output cap, and thinking disabled
(`50,610` ms total wall time). Six refusals/unsupported cases were resolved
before requesting the model. This proves model answering through that test route,
not permanent credential integration, a deployed service, Discord availability,
or screenshot support. Benchmark consumer runtime revision was
`35d2eeb2bd55b2c038745025efa89cb7413a5a65`.

## Known misses and next bounded work

Extractive mode lacks sufficient evidence for the ownership question (`23/24`).
The model shares that miss (`ownership` returns `insufficient_evidence`). Two
other model cases (`checkout`, `ship-status`) failed model-output validation
(exit code 4), and `cross-payments` answered with matching facts while omitting
one of the two required source citations (`20/24`). Preserve these misses; do
not tune the answer key. Next work should improve supported abstentions and
source coverage, then repeat the frozen suite. Screenshots remain explicitly
unsupported in this text-only version. Harness², model training, public gateway
admission, and workload onboarding remain separate future work.

[Repair history](REPAIR_HISTORY.md) preserves earlier results and the initial
scorer correction. Its older scores and pending-provider statements are
historical, superseded by this proof. No holdout has been used for optimization.

## Review repair

- [Round 1](REVIEW_1.md) (`612e6be`): three P2 findings fixed in `13f1a0c`
  (file-URL decoding, instructional refusal handling, exact-span evaluator
  scoring), with historical [pre-review model results](PRE_REVIEW_MODEL_BASELINE.json)
  and [independent three-question CLI proof](INDEPENDENT_PROOF.md).
- [Round 2](REVIEW_2.md) (`6a849d6`): four findings fixed in `39484bc`
  (product-only overview retrieval, plain `how to` requests, serialized IPv6
  loopback addresses, and corpus error exit codes in model `ask`).
- [Round 3](REVIEW_3.md) (`0c0d464`): three findings fixed in `a0a435e`
  (informational command/procedure questions through the mutation guard,
  screenshot refusal restricted to visual-input inspection requests, and numeric
  corpus exit-code normalization for `ENOENT` before `process.exit`), alongside
  owner-directed pruning of retired `dinkuskit/blocks` in favor of
  `dinkuskit/template-store`'s `docs/implementation/upstream-blocks-transition.md`
  in `corrected-public-development-v3`.

## Review state

CI, comprehensive OpenClaw review, and native ClawSweeper evidence must be
checked against the delivered head before merge. No merge or deployment has
occurred. Independent final proof and review receipts are recorded separately as
they complete; a queued request is not a clean verdict.
