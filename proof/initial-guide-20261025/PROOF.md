# DinkusGuide v1 proof

Implementation tested: `b2429ffe5b2f6217fb3eb1b96ad9b422ef293027`.
Base: `ca39eb7500b8c8f57526385700244e7cb9cbc4ae`.
PR: https://github.com/dinkuskit/dinkus-guide/pull/1

## What exists

A read-only Node 24 CLI, 15 explicitly pinned public source documents, immutable
line citations, bounded optional model answering, and a separate CLI evaluator.
Source synchronization is an explicit operator action; answering has no action
tools. No private archives, store access, deployment, or training are included.
Cursor ACP implemented the source; Grok ACP provided independent CLI proof.
The coordinator performed source review, provider proof, and this closeout.

## Reproducible checks

- `npm test`: 25/25 pass.
- `npm run verify`: pass; 15 pinned public documents.
- `node bin/dinkus-guide corpus verify --json`: pass.
- `node bin/dinkus-guide-eval run --json --mode extractive`: 23/24 (95.8%).
- `node bin/dinkus-guide-eval run --json --mode model`: actual local
  `nemotron-3.5-super-vl`, 18/24 (75%).

Both evaluations use `corrected-public-development-v2`, version 2, and corpus
hash `377d1157e8448dd28d1dd9d834ac3be6608ddb45c162b516f8be61b010571346`.
See [extractive results](EXTRACTIVE_BASELINE.json), [model results](MODEL_BASELINE.json),
and [model run metadata](MODEL_RUN.json). These are public development-checklist
scores, not independent held-out accuracy or production-readiness claims.

Actual model proof used the existing Spark DGX benchmark consumer through a
temporary local loopback adapter. Credentials stayed inside that existing
consumer. The adapter forwarded only the bounded public question/excerpts;
there were 18 provider requests, a 1,024-token output cap and thinking disabled.
Six refusals/unsupported cases were resolved before requesting the model.
This proves model answering through that test route, not permanent credential
integration, a deployed service, Discord availability, or screenshot support.
Spark runtime source was `35d2eeb2bd55b2c038745025efa89cb7413a5a65` (PR #292).

## Known misses and next bounded work

Extractive mode lacks sufficient evidence for the ownership question. The model
shares that miss. Four other model cases (checkout, Stripe test mode, Ship
status, template setup) emitted an empty abstention answer, which correctly
failed the current output contract. Cross-payments answered but omitted a
required source citation. Preserve these misses; do not tune the answer key.
Next work should improve supported abstentions and source coverage, then repeat
the frozen suite. Screenshots remain explicitly unsupported in this text-only
version. Harness², model training, public gateway admission, and workload
onboarding remain separate future work.

[Repair history](REPAIR_HISTORY.md) preserves earlier results and the initial
scorer correction. Its older scores and pending-provider statements are
historical, superseded by this proof. No holdout has been used for optimization.

## Review state

CI, comprehensive Spark-2 review, and native ClawSweeper evidence must be checked
against the delivered head before merge. No merge or deployment has occurred.
Independent final proof and review receipts are recorded separately as they
complete; a queued request is not a clean verdict.
