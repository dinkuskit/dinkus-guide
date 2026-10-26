# Rung 2 Task State (`dinkus-guide#3`)

- **Repository**: `dinkuskit/dinkus-guide` (PUBLIC)
- **Branch**: `codex/rung2-eval-grader-20261026`
- **Base SHA**: `62050f61726f5f6401359efddf83e71b3c8f41aa`
- **Evaluated Implementation SHA**: `afec26d3340f2fca3f46657c550949536c450bc7`
- **Status**: `IN_REVIEW` (Epoch 1 holdout-isolation repair committed, live Dev + aggregate-only unseen Holdout baselines captured on `afec26d`, entering Epoch 2 review)
- **Terminal Gate**: `WAITING_FOR_HUMAN` before merge

## Completed Milestones
- [x] Expanded public `eval/cases.json` (`dinkus-guide-dev-v4`, 75 multi-fact cases across 6 categories and 7 approved repos) and retired Epoch 1 exposed holdout cases
- [x] Externalized unseen promotion exam (`dinkus-guide-holdout-v4`, 28 freshly curated disjoint cases at mode `0600` outside public repo) and decoupled `npm test` / `npm run verify` from holdout access
- [x] Upgraded `bin/dinkus-guide-eval` (`--suite`, `--check-disjoint`, `--summary-only`, `--mode retrieval`, `anyOfSources`, `forbiddenFacts`, verifiable on-disk line-span bounds, 5 failure buckets) and `bin/dinkus-guide corpus embed`
- [x] `npm test` (`54/54` pass) and `npm run verify` pass without holdout access
- [x] Live Hybrid (`qwen3-embedding`) + `nemotron-3.5-super-vl` baselines captured on exact SHA `afec26d3340f2fca3f46657c550949536c450bc7` (`Dev` + aggregate `--summary-only` `Holdout`); temporary loopback forwards closed immediately
