# DinkusGuide

Read-only, source-backed DinkusKit and EmDash guide with an independent
evaluation runner. It reads only the immutable public MIT Markdown and MDX pins
in `corpus/manifest.json` across the seven approved repositories
(`dinkuskit/dinkuskit`, `dinkuskit/commerce`, `dinkuskit/payments`,
`dinkuskit/inventory`, `dinkuskit/ship`, `dinkuskit/template-store`, and
`emdash-cms/emdash`); raw snapshots and optional dense chunk embeddings are
stored only in the ignored `.cache/dinkus-guide/` directory.

## Quickstart

Requires Node 24.

```sh
npm test
npm run verify
./bin/dinkus-guide corpus sync
./bin/dinkus-guide corpus verify --json
./bin/dinkus-guide ask "How do I set up the template store?"
./bin/dinkus-guide-eval run --mode recall --json
./bin/dinkus-guide-eval run --json
```

`corpus sync` is an explicit operator action. Asking a question is read-only.
Retrieval uses in-memory `node:sqlite` `FTS5` (`BM25`) by default and fuses
dense vector similarity (`qwen3-embedding`) via Reciprocal Rank Fusion (`RRF`)
when `DINKUS_GUIDE_EMBED_BASE_URL` is configured. Extractive mode returns
layer-balanced passages and immutable line citations. Model mode is bounded and
action-free; see [docs/cli.md](docs/cli.md). The `nemotron-3.5-lightning` model
alias is retired; the default model identity is `nemotron-3.5-super-vl`.

See [docs/architecture.md](docs/architecture.md) and
[docs/evaluation.md](docs/evaluation.md) for boundaries, corpus admission rules,
and baseline scoring. The package and its original code are MIT; third-party
source provenance and licenses are recorded per manifest entry and are not
redistributed in git.

Measured development baselines and known limits are in
[proof/rung1-hybrid-20261026/PROOF.md](proof/rung1-hybrid-20261026/PROOF.md)
(superseding the initial 15-doc baseline in
[proof/initial-guide-20261025/PROOF.md](proof/initial-guide-20261025/PROOF.md)).
