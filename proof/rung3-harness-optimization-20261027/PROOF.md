# DinkusGuide Rung 3 proof (`#4`)

Base: `af7038971ade6f3d7d55a0dd8e5e4fc3c1dd24d9` (`origin/main`, includes Rung 2 / `#9`)
Evaluated source SHA (exact implementation, unit tests, and docs): `31a9f003f73714eb3b6ed5e1726f51ca8394accd`
Issues: Part of https://github.com/dinkuskit/dinkus-guide/issues/2 — Closes https://github.com/dinkuskit/dinkus-guide/issues/4

## Summary of delivered changes

1. **Constrained JSON decoding (`buildGuideResponseFormat` + `createOpenAICompatibleTransport` in `src/guide.js`)**:
   - Attaches OpenAI-compatible `response_format: { type: "json_schema", json_schema: { name: "dinkus_guide_response", strict: true, schema: { anyOf: [...] } } }` on model synthesis requests:
     - `status: "answered"` requires `citationIds` (`minItems: 1`) restricted to retrieved evidence enum IDs `["E1", ..., "Ek"]`.
     - `status: "insufficient_evidence"` enforces `citationIds: []` (`maxItems: 0`).
     - `answer` enforces a single-line, quote-free, terminal-punctuated string (`pattern: "^[A-Za-z0-9\`'(\\[]+[^\"\\r\\n]*[.!?]$"`), preventing unescaped inline double quotes from closing the JSON `"answer"` string early during guided decoding.
   - Includes a one-shot HTTP `400` fallback only when a mock or non-schema provider explicitly rejects `response_format`, plus transport-level cross-field normalization (`insufficient_evidence` -> `citationIds: []`).
   - Result: reduced `schema_error` to **`0/75` on `Dev`** (down from `8`) and **`0/28` on unseen `Holdout`** (down from `2`).

2. **Multi-section evidence windowing & complementary Pass-2 selection (`src/guide.js`)**:
   - Preserves `chunkDocument` and `chunkCorpus` unchanged so `.cache/dinkus-guide/embeddings.json` (`2,154` structural chunks across `164` pinned public sources) remains 100% compatible without re-embedding.
   - Adds query-aware contiguous section window expansion (`expandChunkWindow`, `3,600` primary / `2,200` secondary chars) and adjacent-window coalescing (`coalesceAdjacentWindows`, `<= 4,200` chars) with exact 1-based `#Lstart-Lend` GitHub line spans, caps Pass-1 distinct sources at `9` (for `k = 12`) so Pass-2 selects complementary query-term sections from long specifications (`CLI-SPEC.md`, `CHARTER.md`, `shared-store-connections.md`) while keeping the `emdash` layer cap (`<= 6`) intact, and abstains cleanly on ungrounded proper-entity and `dinkus-guide` write/private-storage queries.
   - Result: lifted hybrid span-fact `recall@12` from **`33/56` (`58.9%`) to `53/56` (`94.6%`)** on `Dev` (preserving `56/56` `100.0%` `sourceRecall@12`) and from **`14/22` (`63.6%`) to `21/22` (`95.5%`)** on unseen `Holdout`.

3. **Single-variable pre-training prompt & `AgentHints` `Propose -> Probe -> Compose` (`buildAgentHint` + `modelPrompt` in `src/guide.js`, [PROBES.md](PROBES.md), [PROBES.json](PROBES.json))**:
   - Probed three targeted prompt/formatting candidates one variable at a time on `eval/cases.json` (`Dev` only) on top of Stage A (`63/75`, `84.0%`), then composed the winning design:
     - **Compact `AgentHints` (`buildAgentHint`)**: prepends `[Ek] source=<id> repo=<repo> layer=<layer> path=<path> lines=<start>-<end> (<role>)` above `EVIDENCE JSON:` and instructs Worker B to cite every distinct contributing `sourceId` (`2–4` `citationIds`) on multi-plugin/multi-guide questions while keeping answers concise (`2–5` sentences, `< 180` words).
     - **Canonical abstention template & explicit threshold**: supplies the exact single-sentence refusal `'The pinned public corpus does not contain enough evidence to answer this question.'` for `status: "insufficient_evidence"` and clarifies that explicit `"not yet built"` charter records are answerable (`abstention_error: 0/75` on `Dev`, `0/28` on `Holdout`).
     - **Zero retired-identifier echo (including negated active-doc mentions)**: instructs Worker B to paraphrase even negated mentions of retired/archived packages, helpers, prototypes, or sync bridges (`"a separate page-blocks package"`, `"older standalone shipping prototypes"`, `"an automated external sync adapter"`), reducing `forbiddenClaims` from `2` to **`0`** on `Dev` and `2` to **`1`** on unseen `Holdout`.
   - Updated [`AGENTS.md`](../../AGENTS.md) and [`docs/architecture.md`](../../docs/architecture.md) to record completion of Rung 3's bounded manual pre-training `Propose -> Probe -> Compose` evaluation while external `Harness²` runtime execution, automatic/recurring optimization, model training, and deployment remain disabled and gated.

## Reproducible verification & exact-SHA before/after results

All Rung 3 evaluations below were executed against exact clean commit `31a9f003f73714eb3b6ed5e1726f51ca8394accd` with frozen `corpus/manifest.json` (`corpusHash`: `2bc34f2be1c0d91d2e5ee2a1acf5ba466e67ae11bdfe379214107b45d32835b2`, `164` pinned public sources, `2,154` chunks), frozen `eval/cases.json` (`suiteSha256`: `55a15780dba0c88f5df5a7ed5c50d304494443ce3f9095cd9db93a42e29d83d6`), and frozen `bin/dinkus-guide-eval`. Live hybrid and model runs used local OpenAI-compatible loopback endpoints for `qwen3-embedding` (`4,096` dimensions) and `nemotron-3.5-super-vl` (`temperature: 0`, `max_tokens: 1024`, `DINKUS_GUIDE_NO_THINK=1`), with temporary loopback forwards closed immediately after capturing JSON reports ([RUNG3_RUN.json](RUNG3_RUN.json)).

- `npm test`: `60/60` pass (`+4` Rung 3 unit tests covering `buildGuideResponseFormat` + HTTP `400` non-schema fallback, `buildAgentHint` + `AGENT HINTS`, multi-section windowing/Pass-2 selection, and self-mutation/ungrounded-entity abstentions; zero holdout file in repository).
- `npm run verify`: pass (`164` pinned public sources: `dinkuskit=58`, `transition=1`, `emdash=105`; `dev=75` cases; unseen holdout isolated outside public repo).

### Rung 2 -> Rung 3 suite comparison table

| Suite | Mode | Retrieval | Rung 2 Passed | **Rung 3 Passed** | Delta | `sourceRecall@12` | Span-fact `recall@12` (R2 -> **R3**) | `retrieval_miss` | `schema_error` | `abstention_error` | `citation_miss` | `fact_miss` (`forbiddenClaims`) | Artifact |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `Dev` (`75` cases) | `retrieval` | Offline `BM25` | `34/56` (`60.7%`) | **`53/56` (`94.6%`)** | **`+33.9 pp`** | `56/56` (`100.0%`) | `60.7%` -> **`94.6%`** | `3` | `0` | `0` | `0` | `0` (`0`) | [DEV_RETRIEVAL_BM25.json](DEV_RETRIEVAL_BM25.json) |
| `Dev` (`75` cases) | `extractive` | Offline `BM25` | `46/75` (`61.3%`) | **`71/75` (`94.7%`)** | **`+33.4 pp`** | `56/56` (`100.0%`) | `60.7%` -> **`94.6%`** | `0` | `0` | `1` | `0` | `3` (`0`) | [DEV_EXTRACTIVE_BM25.json](DEV_EXTRACTIVE_BM25.json) |
| `Dev` (`75` cases) | `retrieval` | Hybrid `BM25` + `qwen3-embedding` | `33/56` (`58.9%`) | **`53/56` (`94.6%`)** | **`+35.7 pp`** | `56/56` (`100.0%`) | `58.9%` -> **`94.6%`** | `3` | `0` | `0` | `0` | `0` (`0`) | [DEV_RETRIEVAL.json](DEV_RETRIEVAL.json) |
| `Dev` (`75` cases) | `extractive` | Hybrid `BM25` + `qwen3-embedding` | `47/75` (`62.7%`) | **`71/75` (`94.7%`)** | **`+32.0 pp`** | `56/56` (`100.0%`) | `58.9%` -> **`94.6%`** | `0` | `0` | `1` | `0` | `3` (`0`) | [DEV_EXTRACTIVE.json](DEV_EXTRACTIVE.json) |
| `Dev` (`75` cases) | `model` (`nemotron-3.5-super-vl`) | Hybrid `BM25` + `qwen3-embedding` | `40/75` (`53.3%`) | **`67/75` (`89.3%`)** | **`+36.0 pp`** | `56/56` (`100.0%`) | `58.9%` -> **`94.6%`** | `0` | **`0`** | **`0`** | `2` | **`6` (`0`)** | [DEV_MODEL.json](DEV_MODEL.json) |
| `Holdout` (`28` unseen, `--summary-only`) | `retrieval` | Offline `BM25` | `14/22` (`63.6%`) | **`21/22` (`95.5%`)** | **`+31.8 pp`** | `21/22` (`95.5%`) | `63.6%` -> **`95.5%`** | `1` | `0` | `0` | `0` | `0` (`0`) | [HOLDOUT_SUMMARY_RETRIEVAL_BM25.json](HOLDOUT_SUMMARY_RETRIEVAL_BM25.json) |
| `Holdout` (`28` unseen, `--summary-only`) | `extractive` | Offline `BM25` | `19/28` (`67.9%`) | **`27/28` (`96.4%`)** | **`+28.6 pp`** | `21/22` (`95.5%`) | `63.6%` -> **`95.5%`** | `1` | `0` | **`0`** | `0` | **`0` (`0`)** | [HOLDOUT_SUMMARY_EXTRACTIVE_BM25.json](HOLDOUT_SUMMARY_EXTRACTIVE_BM25.json) |
| `Holdout` (`28` unseen, `--summary-only`) | `retrieval` | Hybrid `BM25` + `qwen3-embedding` | `14/22` (`63.6%`) | **`21/22` (`95.5%`)** | **`+31.8 pp`** | `21/22` (`95.5%`) | `63.6%` -> **`95.5%`** | `1` | `0` | `0` | `0` | `0` (`0`) | [HOLDOUT_SUMMARY_RETRIEVAL.json](HOLDOUT_SUMMARY_RETRIEVAL.json) |
| `Holdout` (`28` unseen, `--summary-only`) | `extractive` | Hybrid `BM25` + `qwen3-embedding` | `19/28` (`67.9%`) | **`27/28` (`96.4%`)** | **`+28.6 pp`** | `21/22` (`95.5%`) | `63.6%` -> **`95.5%`** | `1` | `0` | **`0`** | `0` | **`0` (`0`)** | [HOLDOUT_SUMMARY_EXTRACTIVE.json](HOLDOUT_SUMMARY_EXTRACTIVE.json) |
| `Holdout` (`28` unseen, `--summary-only`) | `model` (`nemotron-3.5-super-vl`) | Hybrid `BM25` + `qwen3-embedding` | `17/28` (`60.7%`) | **`26/28` (`92.9%`)** | **`+32.1 pp`** | `21/22` (`95.5%`) | `63.6%` -> **`95.5%`** | `1` | **`0`** | **`0`** | **`0`** | **`1` (`1`)** | [HOLDOUT_SUMMARY_MODEL.json](HOLDOUT_SUMMARY_MODEL.json) |

### Category breakdown in live `model` mode (`DEV_MODEL.json` & `HOLDOUT_SUMMARY_MODEL.json`)

| Category | `Dev` Rung 2 | **`Dev` Rung 3** | `Holdout` Rung 2 | **`Holdout` Rung 3** |
| --- | --- | --- | --- | --- |
| `lookup` | `9 / 18` (`50.0%`) | **`16 / 18` (`88.9%`)** | `5 / 7` (`71.4%`) | **`7 / 7` (`100.0%`)** |
| `workflow` | `5 / 15` (`33.3%`) | **`14 / 15` (`93.3%`)** | `3 / 6` (`50.0%`) | **`6 / 6` (`100.0%`)** |
| `transition_trap` | `6 / 10` (`60.0%`) | **`9 / 10` (`90.0%`)** | `1 / 4` (`25.0%`) | **`3 / 4` (`75.0%`)** |
| `cross_plugin` | `6 / 13` (`46.2%`) | **`9 / 13` (`69.2%`)** | `3 / 5` (`60.0%`) | **`4 / 5` (`80.0%`)** |
| `honest_abstention` | `5 / 10` (`50.0%`) | **`10 / 10` (`100.0%`)** | `2 / 3` (`66.7%`) | **`3 / 3` (`100.0%`)** |
| `boundary_refusal` | `9 / 9` (`100.0%`) | **`9 / 9` (`100.0%`)** | `3 / 3` (`100.0%`) | **`3 / 3` (`100.0%`)** |

## Root-cause anatomy of remaining misses & Rung 4 necessity assessment

Across `75` `Dev` cases (`67/75`, `89.3%`) and `28` unseen `Holdout` cases (`26/28`, `92.9%`), `schema_error = 0` and `abstention_error = 0` in both suites:

1. **Retrieval window budget (`3` `Dev` cases, `1` `Holdout` case)**: On ultra-long specifications where required phrases span three distant non-adjacent sections (or on `1/22` unseen `Holdout` source miss), two-pass `E1..E12` windowing captures two sections while leaving a third distant section outside `k = 12`.
2. **Multi-document citation pairing (`2` `Dev` cases, `0` `Holdout` cases)**: On `dev-cross-template-commerce-pairing` and `dev-cross-emdash-storage-and-cloudflare-deploy`, Worker B synthesized `3/3` required facts accurately (`citationSpanValid = 75/75`) while citing one of the two contributing documents.
3. **Verbatim substring vs. accurate paraphrase (`3` `Dev` cases) & `1` unseen `Holdout` transition-trap claim**: Remaining `Dev` `fact_miss` cases (`dev-lookup-kit-ownership-license` `2/3`, `dev-workflow-payments-cli-connect` `3/4`, `dev-cross-commerce-ship-cancel-and-email` `2/3`) cite the exact gold document(s) and state the contract accurately while paraphrasing one exact substring checked by the frozen evaluator.
4. **Rung 4 necessity assessment**: Pre-training deterministic harness + retrieval windowing + bounded prompt/`AgentHints` composition alone raised `Dev` from `53.3%` to **`89.3%`** and unseen `Holdout` from `60.7%` to **`92.9%`** (`96.4%` extractive), demonstrating that **Rung 4 LoRA fine-tuning is optional rather than required for strong v1 accuracy**. If Rung 4 is pursued later, its narrow remaining targets are multi-source citation completeness on cross-guide questions and strict avoidance of retired identifiers on unseen transition traps.

## Gates & review state

- **Frozen judge & corpus**: `corpus/manifest.json`, `eval/cases.json`, `src/corpus.js`, and `bin/dinkus-guide-eval` have `0` lines changed against `origin/main` (`af7038971ade6f3d7d55a0dd8e5e4fc3c1dd24d9`).
- **Holdout isolation**: External `locked_promotion_exam` (`suiteSha256`: `48b053e16b0949873fb48652f0d973fedcaaeabaaaaa9b79f5d492f8fee2fac0`) was never read, inspected, copied, or tuned against; evaluated once blindly after committing `31a9f003f73714eb3b6ed5e1726f51ca8394accd` via `--check-disjoint eval/cases.json --summary-only`.
- **Public repository privacy gate**: Verified `0` matches for private hostnames, private IPs, private repository names, local user paths, credentials, or unseen holdout case IDs/questions/suite labels.
- **Terminal gate**: No merge, package publish, training run, or deployment has occurred (`WAITING_FOR_HUMAN` after exact-head CI, comprehensive secondary `P3` review, native ClawSweeper, and JevSweeper baseline closeout).
