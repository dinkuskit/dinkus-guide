# DinkusGuide Rung 2 proof (`#3`)

Base: `62050f61726f5f6401359efddf83e71b3c8f41aa` (`origin/main`, includes Rung 1 / `PR #6`)
Evaluated source SHA (exact implementation, suites, and tests): `ae8623c8eb8d52240ccd52df85d382f92e996a3d`
Issues: Part of https://github.com/dinkuskit/dinkus-guide/issues/2 — Closes https://github.com/dinkuskit/dinkus-guide/issues/3

## Summary of delivered changes

1. **Dev vs. Holdout suite split (`eval/cases.json` + `eval/holdout.json`)**:
   - **Development suite (`eval/cases.json`, `dinkus-guide-dev-v4`, `role: "development"`)**: expanded from 24 v3 single-keyword checks to **67 multi-fact developer and operator cases** (`lookup=16`, `workflow=14`, `transition_trap=8`, `cross_plugin=12`, `honest_abstention=9`, `boundary_refusal=8`) spanning all 7 approved public repositories across the 162 pinned corpus files (`dinkuskit/dinkuskit`, `dinkuskit/commerce`, `dinkuskit/payments`, `dinkuskit/inventory`, `dinkuskit/ship`, `dinkuskit/template-store`, and `emdash-cms/emdash`).
   - **Locked holdout promotion exam (`eval/holdout.json`, `dinkus-guide-holdout-v4`, `role: "locked_promotion_exam"`)**: **29 unseen cases** (`lookup=7`, `workflow=6`, `transition_trap=4`, `cross_plugin=5`, `honest_abstention=4`, `boundary_refusal=3`) stratified across the exact same 6 categories and 7 approved repositories, runnable via `./bin/dinkus-guide-eval run --suite eval/holdout.json`.
   - **Holdout isolation & disjointness enforcement**: `src/verify-project.js` and `tests/eval.test.js` enforce zero duplicate case IDs and zero duplicate normalized question strings between `eval/cases.json` and `eval/holdout.json`, alongside explicit policy documentation in `README.md`, `docs/evaluation.md`, and `eval/holdout.json` prohibiting Rung 3 prompt/harness optimizers and Rung 4 LoRA training data generators from reading, indexing, or tuning against `eval/holdout.json` (or `HOLDOUT_*.json` baseline artifacts).
2. **Core DinkusKit guardrails baked into v4 cases**:
   - **Transition traps (`forbiddenFacts`)**: retired `@dinkuskit/blocks` / `dinkusBlocks` -> native EmDash `blocks` + `template-blocks-transition`; retired `isolated-ship` -> `@dinkuskit/ship` (`dinkus-ship` + `ship.dinkuskit.com`); superseded WooCommerce inventory bridge -> manual physical-count opening-balance cutover (`inventory-charter`); pasted store keys -> `Connect` PKCE grant; EmDash Marketplace -> Registry storage isolation.
   - **Target direction vs. shipped reality**: tests `payments-standalone-direction-042` in `payments-charter` as an explicit **not yet built** target direction rather than shipped standalone Commerce-free support.
   - **Guide's own boundary**: tests that `dinkus-guide` is an optional, read-only, text-only public-source guide with no merchant mutation capability, screenshot inspection, or private business-knowledge storage.
   - **Stable `shared-store-connections.md` contracts**: tests `protocol_version: 2`, `S256` PKCE, `dk_store_`, `POST /api/store-passes`, 300s `ES256`, and `grant_revoked` without brittle dependence on open connection-order wording.
3. **Upgraded citation-span grader & 5 diagnostic failure buckets (`bin/dinkus-guide-eval` + `bin/dinkus-guide corpus embed`)**:
   - Added `dinkus-guide corpus embed [--json]` to build `.cache/dinkus-guide/embeddings.json` over an already verified source cache without re-downloading GitHub pins.
   - Added `--suite <path>` (sanitizing `suiteFile` in JSON reports) and `--mode retrieval` (keeping `--mode recall` backward-compatible) to `bin/dinkus-guide-eval` while preserving zero imports from `src/`.
   - Added flexible citation group matching (`sources` + `anyOfSources`), case-insensitive negative assertions (`forbiddenFacts` -> `forbiddenClaim` / `forbiddenClaims`), verifiable on-disk line-span checks (`1 <= startLine <= endLine <= cached file line count`, `sourceId` in `corpus/manifest.json`, and union of `response.answer` + exact cited on-disk spans supporting all required `facts`), and exhaustive 5-bucket classification (`retrieval_miss`, `schema_error`, `abstention_error`, `citation_miss`, `fact_miss`) with `byCategory` and `byLayer` breakdowns.

## Reproducible verification & live baselines

All baselines were executed against exact clean commit `ae8623c8eb8d52240ccd52df85d382f92e996a3d` (`corpusHash`: `dc80b5fa494a7d7d2e90c2ae4e80cc512e217b837100e2101941e51d0ac5a501`, `162` pinned sources, `2,138` structural chunks). Live hybrid and model evaluations used local OpenAI-compatible loopback endpoints for `qwen3-embedding` (`4,096` dimensions, `220,659` ms `corpus embed`) and `nemotron-3.5-super-vl` (`max_tokens: 1024`, `DINKUS_GUIDE_NO_THINK=1`), with temporary loopback forwards closed immediately after capturing JSON reports ([BASELINE_RUN.json](BASELINE_RUN.json)).

- `npm test`: `53/53` pass.
- `npm run verify`: pass (`162` pinned public sources: `dinkuskit=56`, `transition=1`, `emdash=105`; `dev=67` cases, `holdout=29` cases).

### Suite summary table

| Suite | Mode | Retrieval | Passed | Score | `sourceRecall@12` | Span-fact `recall@12` | `retrieval_miss` | `schema_error` | `abstention_error` | `citation_miss` | `fact_miss` (`forbiddenClaims`) | Artifact |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `Dev` (`67` cases) | `retrieval` | Offline `BM25` | `30/50` | `60.0%` | `49/50` (`98.0%`) | `30/50` (`60.0%`) | `20` | `0` | `0` | `0` | `0` (`0`) | [DEV_RETRIEVAL_BM25.json](DEV_RETRIEVAL_BM25.json) |
| `Dev` (`67` cases) | `extractive` | Offline `BM25` | `41/67` | `61.2%` | `49/50` (`98.0%`) | `30/50` (`60.0%`) | `1` | `0` | `6` | `0` | `19` (`0`) | [DEV_EXTRACTIVE_BM25.json](DEV_EXTRACTIVE_BM25.json) |
| `Dev` (`67` cases) | `retrieval` | Hybrid `BM25` + `qwen3-embedding` | `29/50` | `58.0%` | `50/50` (`100.0%`) | `29/50` (`58.0%`) | `21` | `0` | `0` | `0` | `0` (`0`) | [DEV_RETRIEVAL.json](DEV_RETRIEVAL.json) |
| `Dev` (`67` cases) | `extractive` | Hybrid `BM25` + `qwen3-embedding` | `42/67` | `62.7%` | `50/50` (`100.0%`) | `29/50` (`58.0%`) | `0` | `0` | `4` | `0` | `21` (`0`) | [DEV_EXTRACTIVE.json](DEV_EXTRACTIVE.json) |
| `Dev` (`67` cases) | `model` (`nemotron-3.5-super-vl`) | Hybrid `BM25` + `qwen3-embedding` | `38/67` | `56.7%` | `50/50` (`100.0%`) | `29/50` (`58.0%`) | `0` | `5` | `1` | `2` | `21` (`2`) | [DEV_MODEL.json](DEV_MODEL.json) |
| `Holdout` (`29` cases) | `retrieval` | Offline `BM25` | `15/22` | `68.2%` | `22/22` (`100.0%`) | `15/22` (`68.2%`) | `7` | `0` | `0` | `0` | `0` (`0`) | [HOLDOUT_RETRIEVAL_BM25.json](HOLDOUT_RETRIEVAL_BM25.json) |
| `Holdout` (`29` cases) | `extractive` | Offline `BM25` | `20/29` | `69.0%` | `22/22` (`100.0%`) | `15/22` (`68.2%`) | `0` | `0` | `2` | `0` | `7` (`0`) | [HOLDOUT_EXTRACTIVE_BM25.json](HOLDOUT_EXTRACTIVE_BM25.json) |
| `Holdout` (`29` cases) | `retrieval` | Hybrid `BM25` + `qwen3-embedding` | `16/22` | `72.7%` | `22/22` (`100.0%`) | `16/22` (`72.7%`) | `6` | `0` | `0` | `0` | `0` (`0`) | [HOLDOUT_RETRIEVAL.json](HOLDOUT_RETRIEVAL.json) |
| `Holdout` (`29` cases) | `extractive` | Hybrid `BM25` + `qwen3-embedding` | `21/29` | `72.4%` | `22/22` (`100.0%`) | `16/22` (`72.7%`) | `0` | `0` | `2` | `0` | `6` (`0`) | [HOLDOUT_EXTRACTIVE.json](HOLDOUT_EXTRACTIVE.json) |
| `Holdout` (`29` cases) | `model` (`nemotron-3.5-super-vl`) | Hybrid `BM25` + `qwen3-embedding` | `21/29` | `72.4%` | `22/22` (`100.0%`) | `16/22` (`72.7%`) | `0` | `1` | `0` | `1` | `6` (`0`) | [HOLDOUT_MODEL.json](HOLDOUT_MODEL.json) |

### `Dev` category breakdown in live `model` mode (`DEV_MODEL.json`)

| Category | Passed / Total | Score | `retrieval_miss` | `schema_error` | `abstention_error` | `citation_miss` | `fact_miss` |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `lookup` | `8 / 16` | `50.0%` | `0` | `2` | `0` | `0` | `6` |
| `workflow` | `4 / 14` | `28.6%` | `0` | `2` | `1` | `0` | `7` |
| `transition_trap` | `4 / 8` | `50.0%` | `0` | `0` | `0` | `0` | `4` (`2` `forbiddenClaims`) |
| `cross_plugin` | `6 / 12` | `50.0%` | `0` | `0` | `0` | `2` | `4` |
| `honest_abstention` | `8 / 9` | `88.9%` | `0` | `1` | `0` | `0` | `0` |
| `boundary_refusal` | `8 / 8` | `100.0%` | `0` | `0` | `0` | `0` | `0` |

## Diagnostic takeaways for Rung 3 (`#4`)

- **Document-level hybrid retrieval is 100% (`50/50` Dev, `22/22` Holdout `sourceRecall@12`; `retrieval_miss = 0` in end-to-end runs)**: Hybrid `FTS5` `BM25` + `qwen3-embedding` RRF places every required source or `anyOfSources` group into `E1..E12`.
- **Multi-section chunk selection accounts for the gap between `sourceRecall@12` (`100%`) and span-fact `recall@12` (`58.0%` Dev)**: Pass-1 diversity selects 1 chunk per source across `limit = 12`, so multi-fact questions spanning multiple headings of a long specification (`commerce-cli-spec`, `payments-authorize-net`, `emdash-docs-reference-cli`) retrieve the right document ID while leaving a secondary section outside `E1..E12`.
- **Structured JSON enforcement (`schema_error = 5` on Dev)**: Five `nemotron-3.5-super-vl` Dev runs exited with code `4` due to strict JSON/citation-ID validation without provider-enforced `response_format: json_schema`.
- **Transition-trap wording (`forbiddenClaims = 2` on Dev)**: On `dev-trap-blocks-package-retirement` and `dev-trap-emdash-native-blocks-vs-plugin`, `nemotron-3.5-super-vl` named the retired `@dinkuskit/blocks` package in its prose while explaining the replacement; Rung 3 prompt refinement can steer retired-package answers to omit retired package identifiers when steering developers to active surfaces.
- **Abstention & refusal accuracy (`16/17` Dev, `7/7` Holdout in `model` mode)**: Pre-synthesis guards plus Worker B abstention eliminated all undocumented-SaaS and prompt-injection false answers (`abstention_error = 0` on abstention/refusal categories; `1` false abstention on `dev-workflow-ship-admin-label-purchase`).

## Gates & review state

- Public repository privacy gate verified (`0` matches for private hostnames, private IPs, private repository names, local user paths, or credentials).
- Proof-assets preflight (`dinkuskit/dinkus-pr-assets`): `candidate_media: 0` (CLI/evaluation proof; authoritative text/JSON stored in `proof/rung2-eval-grader-20261026/`).
- No merge, package publish, or deployment has occurred (`WAITING_FOR_HUMAN` after exact-head CI, comprehensive OpenClaw `P3`, native ClawSweeper, and JevSweeper closeout).
