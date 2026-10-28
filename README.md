# DinkusGuide

Read-only, source-backed DinkusKit and EmDash guide with an independent
evaluation runner. It reads only the immutable public MIT Markdown and MDX pins
in `corpus/manifest.json` across the seven approved product/API repositories
(`dinkuskit/dinkuskit`, `dinkuskit/commerce`, `dinkuskit/payments`,
`dinkuskit/inventory`, `dinkuskit/ship`, `dinkuskit/template-store`, and
`emdash-cms/emdash`), plus the explicitly licensed `VISION.md` and `ROADMAP.md`
context documents from `dinkuskit/.github`. Raw snapshots and optional dense chunk embeddings are
stored only in the ignored `.cache/dinkus-guide/` directory.

An optional [authenticated loopback ask service](docs/ask-service.md) supports
the website pilot using the same validated Guide CLI, without exposing corpus
commands or raw model tokens. Deployment and public activation remain separate.

## Quickstart

Requires Node 24.

```sh
npm test
npm run verify
./bin/dinkus-guide corpus sync
./bin/dinkus-guide corpus embed --json   # optional when DINKUS_GUIDE_EMBED_BASE_URL is set
./bin/dinkus-guide corpus verify --json
./bin/dinkus-guide ask "How do I set up the template store?"
./bin/dinkus-guide-eval run --mode retrieval --json
./bin/dinkus-guide-eval run --json
./bin/dinkus-guide-eval run --suite "$DINKUS_GUIDE_HOLDOUT_SUITE" --check-disjoint eval/cases.json --summary-only --json
```

`corpus sync` and `corpus embed` are explicit operator actions. Asking a
question is read-only. Retrieval uses in-memory `node:sqlite` `FTS5` (`BM25`) by
default and fuses dense vector similarity (`qwen3-embedding`) via Reciprocal
Rank Fusion (`RRF`) when `DINKUS_GUIDE_EMBED_BASE_URL` is configured. Extractive
mode returns layer-balanced passages and immutable line citations. Model mode is
bounded and action-free; see [docs/cli.md](docs/cli.md). The
`nemotron-3.5-lightning` model alias is retired; the default model identity is
`nemotron-3.5-super-vl`.

## Development vs. Isolated Holdout Evaluation Split

- **Public development suite (`eval/cases.json`, `dinkus-guide-dev-v4`)**: 75
  realistic multi-fact developer and operator questions across all 7 approved
  product/API repositories and 6 diagnostic categories (`lookup`, `workflow`,
  `transition_trap`, `cross_plugin`, `honest_abstention`, `boundary_refusal`).
  `npm test` and `npm run verify` validate `eval/cases.json` without requiring
  access to any holdout file and refuse any holdout suite placed inside `eval/`.
- **External locked promotion exam (`role: "locked_promotion_exam"`, 25–30 unseen
  cases)**: Stored outside the public repository in owner-only storage
  unavailable to optimization workers (including via network access), stratified
  across the same 6 categories and 7 product/API repositories, and evaluated via `--suite`
  with `--check-disjoint eval/cases.json --summary-only` so public baseline
  proofs record cryptographic `suiteSha256` and aggregate failure buckets
  (redacting external suite labels and paths to `<external-suite>`) without
  leaking unseen questions, case IDs, suite labels, or gold expectations. **Strict
  holdout boundary:** Rung 3 prompt/harness optimizers and Rung 4 LoRA training
  data generators are strictly forbidden from mounting, reading, indexing, or
  tuning against any external holdout suite.

See [docs/architecture.md](docs/architecture.md) and
[docs/evaluation.md](docs/evaluation.md) for boundaries, corpus admission rules,
citation-span verification, and failure-bucket scoring. The package and its
original code are MIT; third-party source provenance and licenses are recorded
per manifest entry and are not redistributed in git.

Measured `Dev` and aggregate `Holdout` baselines and failure-bucket breakdowns
are in
[proof/rung2-eval-grader-20261026/PROOF.md](proof/rung2-eval-grader-20261026/PROOF.md)
(building on the Rung 1 hybrid corpus expansion in
[proof/rung1-hybrid-20261026/PROOF.md](proof/rung1-hybrid-20261026/PROOF.md)
and initial 15-doc baseline in
[proof/initial-guide-20261025/PROOF.md](proof/initial-guide-20261025/PROOF.md)).
