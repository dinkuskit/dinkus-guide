# Rung 3 Task State (`dinkus-guide#4`)

- **Repository**: `dinkuskit/dinkus-guide` (PUBLIC)
- **Branch**: `codex/rung3-constrained-decoding-and-probes-20261027`
- **Base SHA**: `af7038971ade6f3d7d55a0dd8e5e4fc3c1dd24d9` (`origin/main`, includes Rung 2 / `#9`)
- **Evaluated Implementation SHA**: `8a14a80cc411ae2b9ee3509028c75b900a285014`
- **Status**: `IN_REVIEW` (Epoch 1 and Epoch 2 review findings repaired and re-verified; entering Epoch 3 GitHub Actions CI, comprehensive secondary `P3` review, and native ClawSweeper review)
- **Terminal Gate**: `WAITING_FOR_HUMAN` before merge

## Completed Milestones
- [x] Stage A Probe 1: Constrained JSON decoding (`response_format: json_schema`, quote-free single-line sentence pattern, HTTP `400` non-schema fallback, fail-closed uncited-`answered` rejection + canonical `insufficient_evidence` normalization) — `Dev` `schema_error: 8 -> 0`, `Holdout` `schema_error: 2 -> 0`
- [x] Stage A Probe 2: Multi-section evidence windowing & complementary Pass-2 selection — `Dev` span-fact `recall@12: 33/56 -> 53/56` (`94.6%`), `Holdout` `14/22 -> 21/22` (`95.5%`)
- [x] Stage B `Propose -> Probe -> Compose` (`P1` `AgentHints`, `P2` canonical abstention sentence, `P3` negated retired-identifier steering, conciseness bound) + blinded manual A/B comparative evaluation (`PROBES.md`, `PROBES.json`)
- [x] Added Rung 3 unit and compatibility regression tests (`60/60` pass) and updated `AGENTS.md` + `docs/architecture.md`; `npm run verify` green with frozen `corpus/manifest.json`, `eval/cases.json`, `src/corpus.js`, and `bin/dinkus-guide-eval`
- [x] Repaired Epoch 1 (`REVIEW_1.md`) and Epoch 2 (`REVIEW_2.md`) review findings and re-ran exact-SHA `Dev` (`67/75` `89.3%` model, `69/75` `92.0%` extractive) + blind `--summary-only` `Holdout` (`25/28` `89.3%` model, `26/28` `92.9%` extractive) on clean commit `8a14a80cc411ae2b9ee3509028c75b900a285014`, closing temporary loopback forwards immediately
