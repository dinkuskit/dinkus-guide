# DinkusGuide v1 proof

Implementation tested: `13f1a0c35b1ac523d6be413b0209d9ffb30e177c`.
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

- `npm test`: 27/27 pass.
- `npm run verify`: pass; 15 pinned public documents.
- `node bin/dinkus-guide corpus verify --json`: pass.
- `node bin/dinkus-guide-eval run --json --mode extractive`: 23/24 (95.8%).
- `node bin/dinkus-guide-eval run --json --mode model`: actual local
  `nemotron-3.5-super-vl`, 19/24 (79.2%).

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
shares that miss. Three other model cases (checkout, Stripe test mode, Ship
status) emitted an empty abstention answer, which correctly
failed the current output contract. Cross-payments answered but omitted a
required source citation. Preserve these misses; do not tune the answer key.
Next work should improve supported abstentions and source coverage, then repeat
the frozen suite. Screenshots remain explicitly unsupported in this text-only
version. Harness², model training, public gateway admission, and workload
onboarding remain separate future work.

[Repair history](REPAIR_HISTORY.md) preserves earlier results and the initial
scorer correction. Its older scores and pending-provider statements are
historical, superseded by this proof. No holdout has been used for optimization.

## Review repair

The comprehensive review of `612e6be034280a4cf622dd0311ea2d05bcc576a6`
identified three P2 findings. All were accepted and fixed in `13f1a0c`:
file-URL decoding for spaces/non-ASCII paths, false mutation refusals for
instructional questions, and counting uncited same-source evidence in the
scorer. Added regression coverage passed. Cases and corpus were unchanged.
The previous 18/24 model result is preserved in
[pre-review history](PRE_REVIEW_MODEL_BASELINE.json), but is superseded because
its scorer could include uncited passages. The corrected live run scored 19/24.
One live attempt timed out; one bounded retry completed with unchanged limits.

Grok ACP's six-case source-blind retest passed on `b2429ff`, including prior
retrieval failures and no-write proof. It is historical evidence for that head,
not an exact-head verdict on the repairs. The [three-question repaired-head retest](INDEPENDENT_PROOF.md) passed
on `13f1a0c`, with unchanged source and cache. No independent held-out model accuracy is claimed.

## Review state

CI, comprehensive Spark-2 review, and native ClawSweeper evidence must be checked
against the delivered head before merge. No merge or deployment has occurred.
Independent final proof and review receipts are recorded separately as they
complete; a queued request is not a clean verdict.
