# Rung 2 Task State (`dinkus-guide#3`)

- **Repository**: `dinkuskit/dinkus-guide` (PUBLIC)
- **Branch**: `codex/rung2-eval-grader-20261026`
- **Base SHA**: `9efdaebf02980a5d2f3b493f595a2033e7873217` (synchronized from `62050f61726f5f6401359efddf83e71b3c8f41aa` after `#10`)
- **Evaluated Implementation SHA**: `893d2ca677b5259632c9668002317bdd31139ff5`
- **Status**: `IN_REVIEW` (Epoch 4 external `suite` label redaction + clause-grounded abstention verification committed at `893d2ca6`, `56/56` tests green, live 164-source baselines captured, entering Epoch 5 review)
- **Terminal Gate**: `WAITING_FOR_HUMAN` before merge

## Completed Milestones
- [x] Expanded public `eval/cases.json` (`dinkus-guide-dev-v4`, 75 multi-fact cases across 6 categories and 7 approved product/API repos) and retired Epoch 1 exposed holdout cases
- [x] Externalized unseen promotion exam (`role: "locked_promotion_exam"`, 28 freshly curated disjoint cases at mode `0600` outside public repo) and decoupled `npm test` / `npm run verify` from holdout access
- [x] Upgraded `bin/dinkus-guide-eval` (`--suite`, `--check-disjoint`, `--summary-only` `suite` + `suiteFile` + failure-output redaction, `--mode retrieval`, `anyOfSources`, `forbiddenFacts`, clause-and-vocabulary constrained `verifyAbstentionAnswer`, verifiable on-disk line-span bounds, 5 failure buckets) and `bin/dinkus-guide corpus embed`
- [x] Synchronized with `origin/main` (`9efdaebf02980a5d2f3b493f595a2033e7873217`, `164` pinned public sources); `npm test` (`56/56` pass) and `npm run verify` pass without holdout access
- [x] Live Hybrid (`qwen3-embedding`) + `nemotron-3.5-super-vl` baselines captured on exact SHA `893d2ca677b5259632c9668002317bdd31139ff5` (`Dev` + aggregate `--summary-only` `Holdout`); temporary loopback forwards closed immediately
