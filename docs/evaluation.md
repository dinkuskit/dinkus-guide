# Evaluation

Evaluation separates iterative development from promotion testing across two
disjoint v4 suites verified by `npm run verify`:

- **Development suite (`eval/cases.json`, `dinkus-guide-dev-v4`, `role: "development"`)**:
  67 multi-fact developer and operator cases across all 7 approved public
  repositories.
- **Holdout suite (`eval/holdout.json`, `dinkus-guide-holdout-v4`, `role: "locked_promotion_exam"`)**:
  29 unseen cases stratified across the exact same 6 categories and 7
  repositories. **`eval/holdout.json` is the locked promotion exam**: Rung 3
  prompt/harness optimizers and Rung 4 LoRA training data generators are
  strictly forbidden from reading, indexing, or tuning against
  `eval/holdout.json`. Automated verification enforces zero duplicate case IDs
  and zero duplicate normalized question strings between `eval/cases.json` and
  `eval/holdout.json`.

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
./bin/dinkus-guide-eval run --suite eval/holdout.json --mode retrieval --k 12 --json
./bin/dinkus-guide-eval run --suite eval/holdout.json --mode extractive --json
./bin/dinkus-guide-eval run --suite eval/holdout.json --mode model --json
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
     answerable case) or false answer (`answered` on an `abstain: true` case).
   - `citation_miss` — Returned citations had an invalid or out-of-bounds line
     span, or missed a required `sources` / `anyOfSources` group after facts
     passed.
   - `fact_miss` — Required `facts` were missing from the answer + cited on-disk
     line spans, or a `forbiddenFacts` claim appeared in `response.answer`.

Missing or unreachable model or embedding endpoints are reported as
`unavailable` with a null score, never as a zero-quality model result. Any
real-model or hybrid embedding run records the actual returned provider model
identity separately from requested configuration, the corpus hash, tested commit
SHA, commands, and limits, without storing credentials, private hostnames/IPs,
or raw provider transcripts.
