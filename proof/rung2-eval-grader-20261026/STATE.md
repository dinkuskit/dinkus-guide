# Rung 2 Task State (`dinkus-guide#3`)

- **Repository**: `dinkuskit/dinkus-guide` (PUBLIC)
- **Branch**: `codex/rung2-eval-grader-20261026`
- **Base SHA**: `9efdaebf02980a5d2f3b493f595a2033e7873217` (synchronized from `62050f61726f5f6401359efddf83e71b3c8f41aa` after `#10`)
- **Evaluated Implementation SHA**: `adbcb75bae45c5291a07e08b512d8b86aeaada52`
- **Status**: `IN_REVIEW` (Epoch 9 inverted boundary denial fixes committed at `adbcb75b`, `56/56` tests green, live 164-source baselines captured, entering Epoch 10 review)
- **Terminal Gate**: `WAITING_FOR_HUMAN` before merge

## Completed Milestones
- [x] Expanded public `eval/cases.json` (`dinkus-guide-dev-v4`, 75 multi-fact cases across 6 categories and 7 approved product/API repos) and retired Epoch 1 exposed holdout cases
- [x] Externalized unseen promotion exam (`role: "locked_promotion_exam"`, 28 freshly curated disjoint cases at mode `0600` outside public repo) and decoupled `npm test` / `npm run verify` from holdout access
- [x] Upgraded `bin/dinkus-guide-eval` (`--suite`, `--check-disjoint`, fail-closed `locked_promotion_exam` `--summary-only` + `--check-disjoint eval/cases.json` enforcement, `--summary-only` `suite` + `suiteFile` + failure-output redaction, `--mode retrieval`, `anyOfSources`, `forbiddenFacts`, complete-clause subject-anchored + public-boundary affirmative-scope + inverted-boundary-denial `verifyAbstentionAnswer` + aligned `ALLOWED_ABSTENTION_TOKENS`, verifiable on-disk line-span bounds, 5 failure buckets) and `bin/dinkus-guide corpus embed`
- [x] Synchronized with `origin/main` (`9efdaebf02980a5d2f3b493f595a2033e7873217`, `164` pinned public sources); `npm test` (`56/56` pass) and `npm run verify` pass without holdout access
- [x] Live Hybrid (`qwen3-embedding`) + `nemotron-3.5-super-vl` baselines captured on exact SHA `adbcb75bae45c5291a07e08b512d8b86aeaada52` (`Dev` + aggregate `--summary-only` `Holdout`); temporary loopback forwards closed immediately
