# Rung 3 Single-Variable Probes & Pre-Training `Propose -> Probe -> Compose` Ledger (`#4`)

- **Base SHA**: `af7038971ade6f3d7d55a0dd8e5e4fc3c1dd24d9` (`origin/main`, Rung 2 baseline)
- **Composed Implementation SHA**: `8a14a80cc411ae2b9ee3509028c75b900a285014` (Epoch 1 initial compose `31a9f003f73714eb3b6ed5e1726f51ca8394accd`, Epoch 2 & 3 review repairs [REVIEW_1.md](REVIEW_1.md), [REVIEW_2.md](REVIEW_2.md))
- **Frozen Corpus**: `164` pinned public sources (`2,154` chunks, `corpusHash`: `2bc34f2be1c0d91d2e5ee2a1acf5ba466e67ae11bdfe379214107b45d32835b2`)
- **Frozen Public Dev Suite**: `eval/cases.json` (`dinkus-guide-dev-v4`, `75` cases, `suiteSha256`: `55a15780dba0c88f5df5a7ed5c50d304494443ce3f9095cd9db93a42e29d83d6`)
- **Holdout Isolation**: Zero reads, copies, greps, or tuning against the external unseen holdout suite occurred during Stage A or Stage B. Every probe and candidate selection below used only `eval/cases.json` against the frozen `bin/dinkus-guide-eval` judge and local OpenAI-compatible loopback endpoints for `qwen3-embedding` (`4,096` dims) and `nemotron-3.5-super-vl` (`temperature: 0`, `max_tokens: 1024`, `DINKUS_GUIDE_NO_THINK=1`).

---

## 1. Stage A: Deterministic Harness & Retrieval Window Probes (`Dev`)

| Stage / Probe | Mode & Retrieval | `Passed` | Score | `sourceRecall@12` | Span-fact `recall@12` | `retrieval_miss` | `schema_error` | `abstention_error` | `citation_miss` | `fact_miss` (`forbiddenClaims`) | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Rung 2 Baseline** | `retrieval` (BM25) | `34/56` | `60.7%` | `55/56` (`98.2%`) | `34/56` (`60.7%`) | `22` | `0` | `0` | `0` | `0` (`0`) | Reference |
| **Rung 2 Baseline** | `extractive` (BM25) | `46/75` | `61.3%` | `55/56` (`98.2%`) | `34/56` (`60.7%`) | `1` | `0` | `7` | `0` | `21` (`0`) | Reference |
| **Rung 2 Baseline** | `retrieval` (Hybrid) | `33/56` | `58.9%` | `56/56` (`100.0%`) | `33/56` (`58.9%`) | `23` | `0` | `0` | `0` | `0` (`0`) | Reference |
| **Rung 2 Baseline** | `extractive` (Hybrid) | `47/75` | `62.7%` | `56/56` (`100.0%`) | `33/56` (`58.9%`) | `0` | `0` | `5` | `0` | `23` (`0`) | Reference |
| **Rung 2 Baseline** | `model` (Hybrid) | `40/75` | `53.3%` | `56/56` (`100.0%`) | `33/56` (`58.9%`) | `0` | `8` | `4` | `2` | `21` (`2`) | Reference |
| **Probe A1** (`response_format: json_schema`) | `model` (Hybrid) | `41/75` | `54.7%` | `56/56` (`100.0%`) | `33/56` (`58.9%`) | `0` | **`0`** | `10` | `2` | `22` (`2`) | **`KEEP`** |
| **Probe A2** (Multi-section windowing + Pass-2) | `retrieval` (BM25) | **`53/56`** | **`94.6%`** | **`56/56` (`100.0%`)** | **`53/56` (`94.6%`)** | `3` | `0` | `0` | `0` | `0` (`0`) | **`KEEP`** |
| **Probe A2** (Multi-section windowing + Pass-2) | `extractive` (BM25) | **`71/75`** | **`94.7%`** | **`56/56` (`100.0%`)** | **`53/56` (`94.6%`)** | `0` | `0` | `1` | `0` | `3` (`0`) | **`KEEP`** |
| **Probe A2** (Multi-section windowing + Pass-2) | `retrieval` (Hybrid) | **`53/56`** | **`94.6%`** | **`56/56` (`100.0%`)** | **`53/56` (`94.6%`)** | `3` | `0` | `0` | `0` | `0` (`0`) | **`KEEP`** |
| **Probe A2** (Multi-section windowing + Pass-2) | `extractive` (Hybrid) | **`71/75`** | **`94.7%`** | **`56/56` (`100.0%`)** | **`53/56` (`94.6%`)** | `0` | `0` | `1` | `0` | `3` (`0`) | **`KEEP`** |
| **Probe A2** (Stage A Combined) | `model` (Hybrid) | **`63/75`** | **`84.0%`** | **`56/56` (`100.0%`)** | **`53/56` (`94.6%`)** | `0` | **`0`** | `1` | `2` | `9` (`2`) | **`KEEP`** |

### Stage A Technical Notes
1. **Probe A1 (`buildGuideResponseFormat` + `createOpenAICompatibleTransport` in `src/guide.js`)**:
   - Constrains OpenAI-compatible decoding via `response_format: { type: "json_schema", json_schema: { name: "dinkus_guide_response", strict: true, schema: { anyOf: [...] } } }`:
     - `status: "answered"` requires `citationIds` (`minItems: 1`, `enum: ["E1", ..., "Ek"]`).
     - `status: "insufficient_evidence"` requires `citationIds: []` (`maxItems: 0`).
     - `answer` enforces single-line, quote-free, terminal-punctuated prose (`pattern: "^[A-Za-z0-9\`'(\\[]+[^\"\\r\\n]*[.!?]$"`), preventing unescaped inline double quotes from closing the JSON string early during guided decoding.
   - Includes a one-shot HTTP `400` fallback when a mock or non-schema provider explicitly rejects `response_format`, plus post-decode cross-field normalization (`insufficient_evidence` -> `citationIds: []`).
   - Result: `schema_error` dropped from **`8` to `0`** on `Dev`.
2. **Probe A2 (Query-aware window expansion, adjacent coalescing, and complementary Pass-2 selection in `src/guide.js`)**:
   - Keeps `chunkDocument` / `chunkCorpus` unchanged so `.cache/dinkus-guide/embeddings.json` (`2,154` chunk vectors) remains valid without re-embedding.
   - Expands selected seed chunks across adjacent structural sections of the same document within bounded character budgets (`3,600` primary / `2,200` secondary), coalesces contiguous/overlapping windows (`<= 4,200` chars) with exact 1-based `#Lstart-Lend` GitHub line bounds, caps Pass-1 distinct sources at `9` (at `k = 12`) so Pass-2 adds complementary query-term sections from long multi-heading specs (`CLI-SPEC.md`, `CHARTER.md`, `shared-store-connections.md`) while keeping the `emdash` layer cap (`<= 6`) intact, and abstains cleanly on ungrounded proper-entity and `dinkus-guide` write/private-storage queries.
   - Result: Hybrid span-fact `recall@12` jumped from **`33/56` (`58.9%`) to `53/56` (`94.6%`)** while preserving `56/56` (`100.0%`) `sourceRecall@12`; `extractive` jumped from **`47/75` (`62.7%`) to `71/75` (`94.7%`)**; live `model` jumped from **`41/75` (`54.7%`) to `63/75` (`84.0%`)**.

---

## 2. Stage B: Single-Variable Prompt & `AgentHints` `Propose -> Probe -> Compose` (`Dev`)

All Stage B candidates were probed one variable at a time on top of the locked Stage A baseline (`63/75`, `84.0%`) on `eval/cases.json` (`--mode model`). Note per `AGENTS.md` line 50 and `plans/harness2-deferred.md`: this was executed as a manual bounded single-run `Propose -> Probe -> Compose` experiment over `src/guide.js` prompt/`AgentHints` surfaces; no external `harness2` self-editing executor, recurring optimizer, or model training is enabled.

| Candidate | `Passed` | Score | `schema_error` | `abstention_error` | `citation_miss` | `fact_miss` | `forbiddenClaims` | `lookup` | `workflow` | `transition_trap` | `cross_plugin` | `honest_abstention` | `boundary_refusal` | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Stage A Reference** | `63/75` | `84.0%` | `0` | `1` | `2` | `9` | `2` | `16/18` | `14/15` | `7/10` | `8/13` | `9/10` | `9/9` | Reference |
| **Candidate P1** (`AgentHints` + multi-source cite rule) | `64/75` | `85.3%` | `1` | `1` | `2` | **`7`** | `2` | **`17/18`** | `13/15` | `7/10` | **`9/13`** | `9/10` | `9/9` | **`KEEP`** (add conciseness bound) |
| **Candidate P2** (Canonical abstention template + threshold) | `64/75` | `85.3%` | `0` | **`0`** | `3` | `8` | `2` | `16/18` | `14/15` | `7/10` | `8/13` | **`10/10`** | **`9/9`** | **`KEEP`** |
| **Candidate P3** (Transition-trap steering v1) | `62/75` | `82.7%` | `0` | `1` | `3` | `9` | `2` | `16/18` | `14/15` | `7/10` | `7/13` | `9/10` | `9/9` | **Refine in Compose** |
| **Composed (`P1 + P2 + P3` + Conciseness Guard)** | **`66/75`** | **`88.0%`** | **`0`** | **`0`** | **`2`** | **`7`** | **`0`** | **`16/18`** | **`14/15`** | **`9/10`** | **`8/13`** | **`10/10`** | **`9/9`** | **`KEEP` (Adopted)** |

### Key Diagnostic Findings Across Stage B Probes
- **Candidate P1 (`buildAgentHint`)**: Prepending `[Ek] source=<id> repo=<repo> layer=<layer> path=<path> lines=<start>-<end> (<role>)` reduced `fact_miss` from `9` to `7` and lifted `cross_plugin` (`8/13 -> 9/13`), with one verbose workflow answer truncating at `max_tokens: 1024`. Adding a `2 to 5 concise sentences (under 180 words)` instruction in Compose eliminated truncation (`schema_error = 0`).
- **Candidate P2 (Canonical abstention sentence)**: Requiring `'The pinned public corpus does not contain enough evidence to answer this question.'` whenever `status === "insufficient_evidence"` and clarifying that explicit `"not yet built"` charter records are answerable eliminated `abstention_error` to **`0`** (`75/75` `abstentionPassed`, `19/19` on `abstain: true` cases).
- **Candidate P3 -> Compose refinement (Negated retired-identifier echo)**: Probe P3 revealed why `forbiddenClaims` remained `2` under a generic *"do not echo retired packages"* rule: active pairing/provenance documents (`kit-provenance.md`, `template-v1-pairing.md`) contain literal negated mentions (`"does not depend on @dinkuskit/blocks"`), which Worker B quoted verbatim when explaining native EmDash `Blocks`. Refining the rule in Compose to paraphrase even negated mentions from active docs (`"a separate page-blocks package"`) reduced `forbiddenClaims` from **`2` to `0`** (`75/75` `forbiddenPassed`, `transition_trap: 7/10 -> 9/10`).

---

## 3. Blinded Fixed-Protocol A/B Comparative Adjudication

Per the `Harness²` experiment evaluation contract (`AGENTS.md` line 59 prohibits paid external model calls from a code assignment, and the local `jev-decision` MCP adapter lacked `node` in non-shell `PATH` while its configured route points to a paid hosted endpoint), `jev` status was recorded as `unavailable` and an **explicitly labeled independent manual fallback** (an isolated read-only subagent given only anonymized fixed-protocol `A`/`B` metrics and 4 neutral choice criteria without original/candidate labels) evaluated Stage A (`A`) vs. Stage B Composed (`B`):

- **`jev`**: `unavailable` (no paid hosted call executed per `AGENTS.md` line 59; native MCP process lacked `node` in Dock `PATH`).
- **Independent manual fallback (`judge: manual`)**: returned `B-better` -> mapped in experiment record to **`candidate-better` (`status: keep`)**, citing strictly higher overall pass rate (`66/75` `88.0%` vs. `63/75` `84.0%`), `0` `abstention_error` (`75/75` vs. `74/75`), and `0` `forbiddenClaims` (`75/75` vs. `73/75`) with zero regression in `schema_error` (`0`), `citationSpanValid` (`75/75`), or retrieval recall (`53/56` span-fact, `56/56` source).
