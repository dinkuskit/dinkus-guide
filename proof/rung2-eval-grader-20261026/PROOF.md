# DinkusGuide Rung 2 proof (`#3`)

Base: `9efdaebf02980a5d2f3b493f595a2033e7873217` (`origin/main`, includes Rung 1 / `#6` and licensed org direction `#10`; original branch base `62050f61726f5f6401359efddf83e71b3c8f41aa`)
Evaluated source SHA (exact repaired implementation, Dev suite, and tests): `7cca6a484360ebe8fa8ed9f26062547d24cd5d28`
Issues: Part of https://github.com/dinkuskit/dinkus-guide/issues/2 — Closes https://github.com/dinkuskit/dinkus-guide/issues/3

## Summary of delivered changes

1. **Public Dev vs. External Isolated Holdout suite split (`eval/cases.json` + external `$DINKUS_GUIDE_HOLDOUT_SUITE`)**:
   - **Public development suite (`eval/cases.json`, `dinkus-guide-dev-v4`, `role: "development"`, `suiteSha256`: `55a15780dba0c88f5df5a7ed5c50d304494443ce3f9095cd9db93a42e29d83d6`)**: expanded from 24 v3 single-keyword checks to **75 multi-fact developer and operator cases** (`lookup=18`, `workflow=15`, `transition_trap=10`, `cross_plugin=13`, `honest_abstention=10`, `boundary_refusal=9`) spanning all 7 approved product/API repositories (`dinkuskit/dinkuskit`, `dinkuskit/commerce`, `dinkuskit/payments`, `dinkuskit/inventory`, `dinkuskit/ship`, `dinkuskit/template-store`, and `emdash-cms/emdash`).
   - **External locked promotion exam (`role: "locked_promotion_exam"`, redacted in public receipts to `<external-suite>`, `suiteSha256`: `48b053e16b0949873fb48652f0d973fedcaaeabaaaaa9b79f5d492f8fee2fac0`)**: **28 unseen cases** (`lookup=7`, `workflow=6`, `transition_trap=4`, `cross_plugin=5`, `honest_abstention=3`, `boundary_refusal=3`) stored outside the public repository in owner-only storage (`0600`) unavailable to optimization workers (including via network access), stratified across the exact same 6 categories and 7 approved product/API repositories.
   - **Review history & retirement of Epoch 1 exposed holdout cases ([REVIEW_1.md](REVIEW_1.md), [REVIEW_2.md](REVIEW_2.md), [REVIEW_3.md](REVIEW_3.md), [REVIEW_4.md](REVIEW_4.md), [REVIEW_5.md](REVIEW_5.md), [REVIEW_6.md](REVIEW_6.md), [REVIEW_7.md](REVIEW_7.md), [REVIEW_8.md](REVIEW_8.md), [REVIEW_9.md](REVIEW_9.md), [REVIEW_10.md](REVIEW_10.md))**: Following Epoch 1 review (`db7e53f`), all 29 previously published holdout cases were retired from promotion-exam duty (`8` folded into `eval/cases.json` as public development material; `21` retired completely), and the replacement 28-case external holdout was freshly curated and verified disjoint against both all 75 public `Dev` cases and all 29 retired Epoch 1 cases. Following Epoch 3–10 reviews (`fdb37d57`, `a6ff408d`, `357e8c5c`, `dcb3b476`, `9314bccb`, `27e1a3ab`, `0531f200`, `a5db6611`), component-aware and symlink-safe `locked_promotion_exam` repository containment (`isInsideRoot` for both `--suite` and `--check-disjoint`), `--summary-only` + `--check-disjoint eval/cases.json` enforcement, external `suite` + `suiteFile` + error-output redaction, and complete-clause subject-anchored + public-boundary affirmative-scope + inverted-boundary-denial `abstain: true` answer verification (`verifyAbstentionAnswer` + aligned `ALLOWED_ABSTENTION_TOKENS`) were hardened at `7cca6a48` and re-evaluated against all 164 pinned public sources.
   - **Verification decoupling & mechanical holdout guard**: `src/verify-project.js` and `tests/eval.test.js` run completely independently of any holdout file (so isolated Rung 3/4 workspaces with `--network=none` and no holdout mount pass `npm test` and `npm run verify`) and actively refuse any extra file or directory placed inside public `eval/` (`name !== "cases.json"`).
2. **Core DinkusKit guardrails baked into v4 cases**:
   - **Transition traps (`forbiddenFacts`)**: retired `@dinkuskit/blocks` / `dinkusBlocks` -> native EmDash `blocks` + `template-blocks-transition`; retired `isolated-ship` -> `@dinkuskit/ship` (`dinkus-ship` + `ship.dinkuskit.com`); superseded WooCommerce/Katana inventory bridge -> manual physical-count opening-balance cutover (`inventory-charter`); pasted store keys -> `Connect` PKCE grant; EmDash Marketplace -> Registry storage isolation.
   - **Target direction vs. shipped reality**: tests `payments-standalone-direction-042` in `payments-charter` as an explicit **not yet built** target direction rather than shipped standalone Commerce-free support.
   - **Guide's own boundary**: tests that `dinkus-guide` is an optional, read-only, text-only public-source guide with no merchant mutation capability, screenshot inspection, or private business-knowledge storage.
   - **Stable `shared-store-connections.md` contracts**: tests `protocol_version: 2`, `S256` PKCE, `dk_store_`, `POST /api/store-passes`, 300s `ES256`, and `grant_revoked` without brittle dependence on open connection-order wording.
3. **Upgraded citation-span grader & 5 diagnostic failure buckets (`bin/dinkus-guide-eval` + `bin/dinkus-guide corpus embed`)**:
   - Added `dinkus-guide corpus embed [--json]` to build `.cache/dinkus-guide/embeddings.json` over an already verified source cache without re-downloading GitHub pins.
   - Added `--suite <path>`, repeatable `--check-disjoint <suite-path>` (`assertSuitesDisjoint`), fail-closed `locked_promotion_exam` CLI enforcement (component-aware and symlink-safe external location check on both `--suite` and `--check-disjoint`, plus `--summary-only` and `--check-disjoint eval/cases.json`), `--summary-only` (omitting `results` and `recall.cases` and redacting external `suite` and `suiteFile` identifiers to `<external-suite>` plus case-derived validation/overlap error diagnostics on both stdout and stderr while preserving `suiteSha256` and aggregate buckets), and `--mode retrieval` (keeping `--mode recall` backward-compatible) to `bin/dinkus-guide-eval` while preserving zero imports from `src/`.
   - Added flexible citation group matching (`sources` + `anyOfSources`), case-insensitive negative assertions (`forbiddenFacts` -> `forbiddenClaim` / `forbiddenClaims`), closed subject-anchored scope-limitation + inverted-boundary-denial + ASCII/Unicode + grounded-vocabulary abstention-body validation (`verifyAbstentionAnswer` -> `abstentionAnswerValid` / `abstention_error`), verifiable on-disk line-span checks (`1 <= startLine <= endLine <= cached file line count`, `sourceId` in `corpus/manifest.json`, and union of `response.answer` + exact cited on-disk spans supporting all required `facts`), and exhaustive 5-bucket classification (`retrieval_miss`, `schema_error`, `abstention_error`, `citation_miss`, `fact_miss`) with `byCategory` and `byLayer` breakdowns.

## Reproducible verification & live baselines

All baselines below were executed against exact clean commit `7cca6a484360ebe8fa8ed9f26062547d24cd5d28` (`corpusHash`: `2bc34f2be1c0d91d2e5ee2a1acf5ba466e67ae11bdfe379214107b45d32835b2`, `164` pinned public sources, `2,154` structural chunks). Live hybrid and model evaluations used local OpenAI-compatible loopback endpoints for `qwen3-embedding` (`4,096` dimensions) and `nemotron-3.5-super-vl` (`max_tokens: 1024`, `DINKUS_GUIDE_NO_THINK=1`), with temporary loopback forwards closed immediately after capturing JSON reports ([BASELINE_RUN.json](BASELINE_RUN.json)).

- `npm test`: `56/56` pass (with zero holdout file in the repository).
- `npm run verify`: pass (`164` pinned public sources: `dinkuskit=58`, `transition=1`, `emdash=105`; `dev=75` cases; unseen holdout isolated outside public repo).

### Suite summary table

| Suite | Mode | Retrieval | Passed | Score | `sourceRecall@12` | Span-fact `recall@12` | `retrieval_miss` | `schema_error` | `abstention_error` | `citation_miss` | `fact_miss` (`forbiddenClaims`) | Artifact |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `Dev` (`75` cases) | `retrieval` | Offline `BM25` | `34/56` | `60.7%` | `55/56` (`98.2%`) | `34/56` (`60.7%`) | `22` | `0` | `0` | `0` | `0` (`0`) | [DEV_RETRIEVAL_BM25.json](DEV_RETRIEVAL_BM25.json) |
| `Dev` (`75` cases) | `extractive` | Offline `BM25` | `46/75` | `61.3%` | `55/56` (`98.2%`) | `34/56` (`60.7%`) | `1` | `0` | `7` | `0` | `21` (`0`) | [DEV_EXTRACTIVE_BM25.json](DEV_EXTRACTIVE_BM25.json) |
| `Dev` (`75` cases) | `retrieval` | Hybrid `BM25` + `qwen3-embedding` | `33/56` | `58.9%` | `56/56` (`100.0%`) | `33/56` (`58.9%`) | `23` | `0` | `0` | `0` | `0` (`0`) | [DEV_RETRIEVAL.json](DEV_RETRIEVAL.json) |
| `Dev` (`75` cases) | `extractive` | Hybrid `BM25` + `qwen3-embedding` | `47/75` | `62.7%` | `56/56` (`100.0%`) | `33/56` (`58.9%`) | `0` | `0` | `5` | `0` | `23` (`0`) | [DEV_EXTRACTIVE.json](DEV_EXTRACTIVE.json) |
| `Dev` (`75` cases) | `model` (`nemotron-3.5-super-vl`) | Hybrid `BM25` + `qwen3-embedding` | `40/75` | `53.3%` | `56/56` (`100.0%`) | `33/56` (`58.9%`) | `0` | `8` | `4` | `2` | `21` (`2`) | [DEV_MODEL.json](DEV_MODEL.json) |
| `Holdout` (`28` unseen, `--summary-only`) | `retrieval` | Offline `BM25` | `14/22` | `63.6%` | `21/22` (`95.5%`) | `14/22` (`63.6%`) | `8` | `0` | `0` | `0` | `0` (`0`) | [HOLDOUT_SUMMARY_RETRIEVAL_BM25.json](HOLDOUT_SUMMARY_RETRIEVAL_BM25.json) |
| `Holdout` (`28` unseen, `--summary-only`) | `extractive` | Offline `BM25` | `19/28` | `67.9%` | `21/22` (`95.5%`) | `14/22` (`63.6%`) | `1` | `0` | `1` | `0` | `7` (`0`) | [HOLDOUT_SUMMARY_EXTRACTIVE_BM25.json](HOLDOUT_SUMMARY_EXTRACTIVE_BM25.json) |
| `Holdout` (`28` unseen, `--summary-only`) | `retrieval` | Hybrid `BM25` + `qwen3-embedding` | `14/22` | `63.6%` | `21/22` (`95.5%`) | `14/22` (`63.6%`) | `8` | `0` | `0` | `0` | `0` (`0`) | [HOLDOUT_SUMMARY_RETRIEVAL.json](HOLDOUT_SUMMARY_RETRIEVAL.json) |
| `Holdout` (`28` unseen, `--summary-only`) | `extractive` | Hybrid `BM25` + `qwen3-embedding` | `19/28` | `67.9%` | `21/22` (`95.5%`) | `14/22` (`63.6%`) | `1` | `0` | `1` | `0` | `7` (`0`) | [HOLDOUT_SUMMARY_EXTRACTIVE.json](HOLDOUT_SUMMARY_EXTRACTIVE.json) |
| `Holdout` (`28` unseen, `--summary-only`) | `model` (`nemotron-3.5-super-vl`) | Hybrid `BM25` + `qwen3-embedding` | `17/28` | `60.7%` | `21/22` (`95.5%`) | `14/22` (`63.6%`) | `1` | `2` | `1` | `1` | `6` (`2`) | [HOLDOUT_SUMMARY_MODEL.json](HOLDOUT_SUMMARY_MODEL.json) |

### `Dev` category breakdown in live `model` mode (`DEV_MODEL.json`)

| Category | Passed / Total | Score | `retrieval_miss` | `schema_error` | `abstention_error` | `citation_miss` | `fact_miss` |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `lookup` | `9 / 18` | `50.0%` | `0` | `2` | `0` | `0` | `7` |
| `workflow` | `5 / 15` | `33.3%` | `0` | `3` | `1` | `0` | `6` |
| `transition_trap` | `6 / 10` | `60.0%` | `0` | `1` | `0` | `0` | `3` (`2` `forbiddenClaims`) |
| `cross_plugin` | `6 / 13` | `46.2%` | `0` | `0` | `0` | `2` | `5` |
| `honest_abstention` | `5 / 10` | `50.0%` | `0` | `2` | `3` | `0` | `0` |
| `boundary_refusal` | `9 / 9` | `100.0%` | `0` | `0` | `0` | `0` | `0` |

## Diagnostic takeaways for Rung 3 (`#4`)

- **Document-level hybrid retrieval is strong (`56/56` `100%` Dev, `21/22` `95.5%` unseen Holdout `sourceRecall@12`)**: Hybrid `FTS5` `BM25` + `qwen3-embedding` RRF places every required Dev source/group into `E1..E12`.
- **Multi-section chunk selection accounts for the gap between `sourceRecall@12` (`100%`) and span-fact `recall@12` (`58.9%` Dev, `63.6%` Holdout)**: Pass-1 diversity selects 1 chunk per source across `limit = 12`, so multi-fact questions spanning multiple headings of a long specification retrieve the right document ID while leaving a secondary section outside `E1..E12`.
- **Structured JSON enforcement (`schema_error = 8` Dev, `2` Holdout)**: `nemotron-3.5-super-vl` occasionally fails strict JSON/citation-ID validation without provider-enforced `response_format: json_schema`.
- **Constrained abstention prose (`abstention_error = 3` Dev on `honest_abstention`, `1` on `workflow`, `1` Holdout; `0` on `boundary_refusal`)**: Complete-clause subject-anchored `verifyAbstentionAnswer` catches verbose/hedging `insufficient_evidence` responses (`however...` or non-scope-limitation clauses), giving Rung 3 a crisp prompt target to keep abstentions terse and non-speculative.
- **Transition-trap wording (`forbiddenClaims = 2` Dev, `2` Holdout)**: `nemotron-3.5-super-vl` sometimes names retired package identifiers in prose while steering developers toward active surfaces; Rung 3 prompt refinement can instruct Worker B to avoid naming retired package strings unless explicitly needed.
- **Boundary refusal (`9/9` Dev, `3/3` Holdout `boundary_refusal`)**: Pre-synthesis guards plus Worker B abstention achieved 100% refusal on mutation, screenshot, and prompt-injection probes.

## Gates & review state

- Public repository privacy gate verified (`0` matches for private hostnames, private IPs, private repository names, local user paths, credentials, or unseen holdout case IDs/questions/suite labels).
- Proof-assets preflight (`dinkuskit/dinkus-pr-assets`): `candidate_media: 0` (CLI/evaluation proof; authoritative text/JSON stored in `proof/rung2-eval-grader-20261026/`).
- No merge, package publish, or deployment has occurred (`WAITING_FOR_HUMAN` after exact-head CI, comprehensive secondary `P3` review, and native ClawSweeper closeout).
