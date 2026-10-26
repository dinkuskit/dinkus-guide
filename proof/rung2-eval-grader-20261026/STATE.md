# Rung 2 Task State (`dinkus-guide#3`)

- **Repository**: `dinkuskit/dinkus-guide` (PUBLIC)
- **Branch**: `codex/rung2-eval-grader-20261026`
- **Base SHA**: `62050f61726f5f6401359efddf83e71b3c8f41aa`
- **Evaluated Implementation SHA**: `ae8623c8eb8d52240ccd52df85d382f92e996a3d`
- **Status**: `IN_REVIEW` (implementation, unit tests, and live Dev + Holdout baselines complete; pushing branch and opening PR for exact-head CI, comprehensive OpenClaw `P3`, and native ClawSweeper)
- **Terminal Gate**: `WAITING_FOR_HUMAN` before merge

## Completed Milestones
- [x] Expanded `eval/cases.json` (`dinkus-guide-dev-v4`, 67 multi-fact cases across 6 categories and 7 approved repos)
- [x] Created isolated locked promotion exam `eval/holdout.json` (`dinkus-guide-holdout-v4`, 29 disjoint cases across 6 categories and 7 approved repos)
- [x] Upgraded `bin/dinkus-guide-eval` (`--suite`, `--mode retrieval`, `anyOfSources`, `forbiddenFacts`, verifiable on-disk line-span bounds, 5 failure buckets) and `bin/dinkus-guide corpus embed`
- [x] `npm test` (`53/53` pass) and `npm run verify` pass
- [x] Live Hybrid (`qwen3-embedding`) + `nemotron-3.5-super-vl` baselines captured on exact SHA `ae8623c8eb8d52240ccd52df85d382f92e996a3d` (`Dev` + `Holdout`); temporary loopback forwards closed immediately
