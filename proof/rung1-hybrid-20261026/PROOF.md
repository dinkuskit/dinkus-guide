# DinkusGuide Rung 1 proof (`#2`)

Base: `11babd627bb5a6562a537bd16a2a39f8e126c5a7`
Evaluated source (`src/` unchanged since): `25c3738b68fc87c36f5f67d31039c5f539ae1bc7`
Issue: https://github.com/dinkuskit/dinkus-guide/issues/2

## What exists

Rung 1 expands `corpus/manifest.json` from 15 to 162 immutable public MIT
documentation pins (`2,138` structural chunks) across all seven approved public
repositories (`dinkuskit/dinkuskit`, `dinkuskit/commerce`,
`dinkuskit/payments`, `dinkuskit/inventory`, `dinkuskit/ship`,
`dinkuskit/template-store`, and `emdash-cms/emdash`), replaces the v1 per-topic
regex score boosts with `node:sqlite` `FTS5` (`BM25`) + optional dense vector
(`qwen3-embedding`) Reciprocal Rank Fusion (`RRF`, $k = 60$) hybrid search and
two-pass layer diversity balancing, preserves `[STATUS: RETIRED]` chunk/prompt
provenance and Worker B `E1..En` isolation, and reports standalone `recall@k`
before model synthesis runs.

## Corpus coverage and hygiene

- **162 pinned public MIT files** (`corpusHash`:
  `dc80b5fa494a7d7d2e90c2ae4e80cc512e217b837100e2101941e51d0ac5a501`):
  - `dinkuskit` layer: `56` active sources (`dinkuskit/dinkuskit`: `12`,
    `dinkuskit/commerce`: `22`, `dinkuskit/payments`: `11`,
    `dinkuskit/inventory`: `4`, `dinkuskit/ship`: `6`,
    `dinkuskit/template-store`: `3` active + `1` transition = `4` total across
    DinkusKit repos).
  - `transition` layer: `1` active source
    (`dinkuskit/template-store:docs/implementation/upstream-blocks-transition.md`).
  - `emdash` layer: `105` active sources (`README.md`, `94`
    `docs/src/content/docs/**/*.{md,mdx}` pages, and `10` non-empty
    `packages/*/README.md` files).
- **Excluded retired/internal surfaces**:
  - Retired `dinkuskit/blocks` historical API/usage docs (`APPROVED_REPOSITORIES`
    rejects `dinkuskit/blocks`).
  - Sibling repositories deferred for Rung 1: `dinkuskit/coupons`,
    `dinkuskit/bundles`, `dinkuskit/template-services`, and
    `dinkuskit/template-marketing`.
  - Release website templates (`<plugin>/docs/website/**`) containing literal
    `{{version}}` / `{{release_date}}` placeholders, meta-authoring guides
    (`docs/documentation-authoring.md`, `docs/updates/README.md`),
    `docs/implementation/*` slice notes (except `upstream-blocks-transition.md`),
    retired `isolated-ship*` and v1 `merchant-inventory-connect.md`,
    `WAITING_FOR_HUMAN` drafts (`checkout-timing-decision.md`, `v1-demo-plan.md`),
    and duplicate `emdash/skills/**` mirrors.
- **Upstream documentation notes**:
  - `dinkuskit/ship` currently exposes six canonical public Markdown documents;
    broader merchant shipping guides remain upstream work rather than invented
    here.
  - `dinkuskit/dinkuskit#90` (`docs/updates/**` expansion) was still open on
    upstream `main` when this manifest was pinned (`commerce#186`,
    `payments#92`, and `ship#72` were already merged on `main`).

## Reproducible checks

- `npm test`: `47/47` pass.
- `npm run verify`: pass (`162` pinned public sources: `dinkuskit=56`,
  `transition=1`, `emdash=105`).
- `node bin/dinkus-guide corpus verify --json`: pass.
- Offline `FTS5` `BM25` standalone retrieval recall (`node bin/dinkus-guide-eval run --json --mode recall`):
  `18/19` (`94.7%`, [RECALL_BM25.json](RECALL_BM25.json)).
- Offline `FTS5` `BM25` extractive mode (`node bin/dinkus-guide-eval run --json --mode extractive`):
  `23/24` (`95.8%`, [EXTRACTIVE_BM25.json](EXTRACTIVE_BM25.json)).
- Hybrid `FTS5` `BM25` + `qwen3-embedding:latest` (`4,096` dims across `2,138`
  chunks) standalone retrieval recall: `19/19` (`100.0%`,
  [RECALL_HYBRID.json](RECALL_HYBRID.json)).
- Hybrid `FTS5` `BM25` + `qwen3-embedding:latest` extractive mode: `24/24`
  (`100.0%`, [EXTRACTIVE_HYBRID.json](EXTRACTIVE_HYBRID.json)).
- Hybrid Worker B synthesis (`nemotron-3.5-super-vl`, `max_tokens: 1024`,
  thinking disabled): `19/24` (`79.2%`, [MODEL_HYBRID.json](MODEL_HYBRID.json);
  run metadata in [HYBRID_RUN.json](HYBRID_RUN.json)).
- Source-blind CLI behavior retest: PASS across all contracted clauses with
  byte-identical cache fingerprint before and after
  ([INDEPENDENT_PROOF.md](INDEPENDENT_PROOF.md)).

All evaluations use the frozen `corrected-public-development-v3` suite (version
3, 24 cases; `eval/cases.json` unmodified). Live embedding and model runs used
temporary local OpenAI-compatible loopback forwards to the existing test
runtimes (`213,125` ms corpus embedding sync across `2,138` chunks; `109,705` ms
across the 24-case model evaluation). No credentials, internal hostnames, or raw
provider transcripts are stored.

## Known misses and next bounded work

- **Offline `FTS5` `BM25` (`23/24` extractive, `18/19` `recall@12`)**:
  `ownership` misses `kit-readme` in pure lexical mode because `kit-readme` does
  not mention `"MIT"` or ownership directly (`payments-readme`,
  `commerce-readme`, and `kit-provenance` match `"license"`/`"MIT"` instead).
  Dense `qwen3-embedding:latest` RRF pulls `kit-readme` into `E1..E12` alongside
  the license-bearing sources (`19/19` `recall@12`, `24/24` hybrid extractive).
- **Worker B synthesis (`19/24` hybrid model mode)**: with `19/19` retrieval
  recall established before synthesis, all five remaining model misses are
  Worker B synthesis/schema failures (`ownership` and `emdash-start` exited with
  code 4 on strict JSON output validation; `template`, `kit-start`, and
  `cross-payments` matched required facts but cited sibling documents rather
  than every benchmark source ID). Those belong to Rung 2 (`#3` evaluation
  expansion) and Rung 3 (`#4` `response_format: json_schema` + prompt synthesis
  refinement).

## Review state

- Epoch 1 (`0835ec55cfd474043cfbfd2cedafe13db4bcbb6a`): GitHub CI passed;
  comprehensive `P3` OpenClaw review (`req-20261026T141702Z-202754229745`)
  reported 1 `P2` finding (`OC-1`: offline `corpus sync` recovery when
  `embeddings.json` is corrupt), repaired and regression-tested in Epoch 2
  ([REVIEW_1.md](REVIEW_1.md)).
- Exact-head CI and comprehensive `P3` OpenClaw review must verify the current
  PR head before human merge decision; native ClawSweeper repository onboarding
  is not yet configured on `dinkuskit/dinkus-guide`. No merge or deployment has
  occurred.
