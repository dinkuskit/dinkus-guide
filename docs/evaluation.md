# Evaluation

The frozen public development suite (`eval/cases.json`,
`corrected-public-development-v3`, version 3) contains 24 questions covering
ownership, Commerce, Stripe, Ship, template setup, EmDash, page blocks
transition, cross-source retrieval, wrong-version and unavailable facts,
private-data and edit refusal, and explicit text-only screenshot limitation.

Run standalone retrieval recall first, then extractive or model evaluation:

```sh
./bin/dinkus-guide-eval run --json --mode recall --k 12
./bin/dinkus-guide-eval run --json --mode extractive
./bin/dinkus-guide-eval run --json --mode model
```

Before scoring extractive answers or calling Worker B in `model` mode,
`dinkus-guide-eval` computes standalone retrieval `recall@k` (default `k = 12`)
across all non-abstention cases and embeds `report.recall` (`sourceHits`,
`sourceRecallAtK`, `hits`, `recallAtK`, and per-case diagnostics) in the JSON
output. `sourceHit` requires every expected `sourceId` in top-$k$ evidence;
`hit` additionally requires every expected fact string within those top-$k$
evidence spans.

In `extractive` and `model` modes, the evaluator checks facts in the answer (with
the echoed question removed) and in the exact cited evidence spans, requires
every expected source in multi-source cases, validates abstentions and exit
codes, and reports each case. The evaluator spawns `bin/dinkus-guide`; it never
imports ranking or answer functions. The screenshot case remains text-only.

Extractive and `recall` results measure retrieval and citation behavior only.
Fixture provider tests measure adapter validation only. Missing or unreachable
model or embedding endpoints are reported as `unavailable` with a null score
(while still preserving offline `recall` when computed before model synthesis),
not as a zero-quality model result. Any approved real-model or hybrid embedding
run must record the actual returned provider model identity separately from
requested configuration, the corpus hash, command, outcome, and limits, without
storing credentials, internal hostnames/IPs, or raw provider transcripts.
