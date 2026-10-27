# Rung 3 Task State (`dinkus-guide#4`)

- **Repository**: `dinkuskit/dinkus-guide` (PUBLIC)
- **Branch**: `codex/rung3-constrained-decoding-and-probes-20261027`
- **Base SHA**: `af7038971ade6f3d7d55a0dd8e5e4fc3c1dd24d9` (`origin/main`, includes Rung 2 / `#9`)
- **Evaluated Implementation SHA**: `31a9f003f73714eb3b6ed5e1726f51ca8394accd`
- **Status**: `IN_REVIEW` (implementation + proof committed; entering GitHub Actions CI, OpenClaw `P3`, and native ClawSweeper review)
- **Terminal Gate**: `WAITING_FOR_HUMAN` before merge

## Completed Milestones
- [x] Stage A Probe 1: Constrained JSON decoding (`response_format: json_schema`, quote-free single-line sentence pattern, HTTP `400` non-schema fallback, transport normalization) — `Dev` `schema_error: 8 -> 0`, `Holdout` `schema_error: 2 -> 0`
- [x] Stage A Probe 2: Multi-section evidence windowing & complementary Pass-2 selection — `Dev` span-fact `recall@12: 33/56 -> 53/56` (`94.6%`), `Holdout` `14/22 -> 21/22` (`95.5%`)
- [x] Stage B `Propose -> Probe -> Compose` (`P1` `AgentHints`, `P2` canonical abstention sentence, `P3` negated retired-identifier steering, conciseness bound) + blinded manual A/B comparative evaluation (`PROBES.md`, `PROBES.json`)
- [x] Added 4 Rung 3 unit tests (`60/60` pass) and updated `AGENTS.md` + `docs/architecture.md`; `npm run verify` green with frozen `corpus/manifest.json`, `eval/cases.json`, and `bin/dinkus-guide-eval`
- [x] Executed exact-SHA `Dev` (`67/75` `89.3%` model, `71/75` `94.7%` extractive) + one-shot blind `--summary-only` `Holdout` (`26/28` `92.9%` model, `27/28` `96.4%` extractive) on clean commit `31a9f003f73714eb3b6ed5e1726f51ca8394accd` and closed temporary loopback forwards immediately
