# Evaluation

Evaluation separates public iterative development from isolated promotion
testing across two disjoint v4 suites:

- **Public development suite (`eval/cases.json`, `dinkus-guide-dev-v4`, `role: "development"`)**:
  75 multi-fact developer and operator cases across all 7 approved product/API
  repositories. Ordinary verification (`npm test` and `npm run verify`) checks
  `eval/cases.json` without requiring holdout access and fails closed if any
  holdout or extra suite JSON is placed under `eval/`.
- **External locked promotion exam (`role: "locked_promotion_exam"`)**:
  25–30 unseen cases stored outside the public repository in owner-controlled
  storage unavailable to optimization workers (including through network
  access), stratified across the exact same 6 categories and 7 product/API repositories.
  **Strict promotion-exam lock**: Rung 3 prompt/harness optimizers and Rung 4
  LoRA training data generators are strictly forbidden from mounting, reading,
  indexing, or tuning against the external holdout suite. At evaluation time,
  `validateSuite` enforces 25–30 cases, category/repository stratification, and
  explicit Rung 3 / Rung 4 policy metadata for `role: "locked_promotion_exam"`,
  `--check-disjoint eval/cases.json` enforces zero duplicate case IDs or
  normalized question strings, and `--summary-only` emits aggregate scores,
  buckets, and `suiteSha256` while redacting external `suite` and `suiteFile`
  identifiers to `<external-suite>` and redacting case-derived diagnostics on
  both successful and failed runs so unseen case IDs, questions, suite labels,
  and gold expectations never appear on stdout or stderr.

## Question categories & core guardrails

Every v4 case declares a `category`:

1. `lookup` — Exact CLI flags, API routes, webhook headers, config keys, and
   schema contracts.
2. `workflow` — Step-by-step developer and merchant procedures.
3. `transition_trap` — Questions touching retired or superseded surfaces
   (`@dinkuskit/blocks` / `dinkusBlocks`, `isolated-ship`, superseded
   WooCommerce inventory sync bridges, unbuilt standalone Payments adoption,
   pasted store keys, and EmDash Marketplace-to-Registry storage) that must
   steer to active contracts while omitting case-insensitive `forbiddenFacts`.
4. `cross_plugin` — Multi-document authority boundaries spanning plugins and
   repositories.
5. `honest_abstention` — Nonexistent versions, undocumented third-party SaaS
   integrations, unbuilt future capabilities, and nonexistent `dinkus-guide`
   mutation/private-storage surfaces (`abstain: true`,
   `expectedStatus: "insufficient_evidence"`).
6. `boundary_refusal` — Imperative mutation/deploy/commit requests,
   screenshot/image visual inspection requests, private merchant/customer data
   probes, and prompt-injection payloads (`abstain: true`,
   `expectedStatus: "insufficient_evidence"`).

## Running suites

```sh
./bin/dinkus-guide-eval run --suite eval/cases.json --mode retrieval --k 12 --json
./bin/dinkus-guide-eval run --suite eval/cases.json --mode extractive --json
./bin/dinkus-guide-eval run --suite eval/cases.json --mode model --json

# Owner-only promotion runs against an external unseen holdout suite:
./bin/dinkus-guide-eval run --suite "$DINKUS_GUIDE_HOLDOUT_SUITE" --check-disjoint eval/cases.json --summary-only --mode retrieval --k 12 --json
./bin/dinkus-guide-eval run --suite "$DINKUS_GUIDE_HOLDOUT_SUITE" --check-disjoint eval/cases.json --summary-only --mode extractive --json
./bin/dinkus-guide-eval run --suite "$DINKUS_GUIDE_HOLDOUT_SUITE" --check-disjoint eval/cases.json --summary-only --mode model --json
```

`--mode recall` remains supported as a backward-compatible alias for
`--mode retrieval`.

## Citation-span grader & 5 diagnostic failure buckets

`bin/dinkus-guide-eval` spawns `bin/dinkus-guide` as a black-box CLI and never
imports ranking or answer functions from `src/`.

1. **Flexible citation groups (`sources` + `anyOfSources`)**: Answerable cases
   can require mandatory `sources: [...]` and/or acceptable sibling groups
   `anyOfSources: [["doc-a", "doc-b"], ...]`, where citing at least one valid
   source from each group satisfies that group.
2. **Negative assertions (`forbiddenFacts`)**: Any case-insensitive substring
   match of `forbiddenFacts` in `response.answer` fails `factPass` and sets
   `forbiddenClaim: true` (aggregated as `report.forbiddenClaims`).
3. **Verifiable on-disk citation spans**: For every returned citation on
   non-abstaining cases, the grader verifies that `sourceId` exists in
   `corpus/manifest.json`, `1 <= startLine <= endLine`, `endLine` does not
   exceed the actual line count of `.cache/dinkus-guide/sources/<sourceId>.md`
   on disk, and the union of `response.answer` (with extractive question echo
   removed) plus the exact cited on-disk file line spans supports every required
   string in `facts`.
4. **5 diagnostic failure buckets**: Every failed case is classified into
   exactly one primary `failureBucket` and aggregated in `report.failureBuckets`,
   `report.byCategory`, and `report.byLayer`:
   - `retrieval_miss` — Pre-synthesis top-$k$ retrieval missed required
     `sources` / `anyOfSources` (or missed span facts in standalone
     `retrieval`/`recall` mode).
   - `schema_error` — Model output failed strict JSON or citation schema
     validation (exit code `4`).
   - `abstention_error` — False abstention (`insufficient_evidence` on an
     answerable case), false answer (`answered` on an `abstain: true` case), or
     an unconstrained `abstain: true` answer body that omits explicit
     sentence- and clause-level refusal/scope-limitation cues or introduces
     ungrounded, substantive, procedural, address/PII, URL, code, pricing, or
     secret-like content (`verifyAbstentionAnswer`).
   - `citation_miss` — Returned citations had an invalid or out-of-bounds line
     span, or missed a required `sources` / `anyOfSources` group after facts
     passed.
   - `fact_miss` — Required `facts` were missing from the answer + cited on-disk
     line spans, or a `forbiddenFacts` claim appeared in `response.answer`.

Missing or unreachable model or embedding endpoints are reported as
`unavailable` with a null score, never as a zero-quality model result. Any
real-model or hybrid embedding run records the actual returned provider model
identity separately from requested configuration, the corpus hash, `suiteSha256`,
tested commit SHA, commands, and limits, without storing credentials, private
hostnames/IPs, unseen holdout questions, or raw provider transcripts.
