# Rung 2 evaluation suite & citation-span grader (`#3`)

- Status: In progress — designing Dev (`eval/cases.json`) and Holdout (`eval/holdout.json`) suites and upgraded grader
- Repository: `dinkuskit/dinkus-guide`, Issue `#3` (Part of `#2`)
- Branch: `codex/rung2-eval-grader-20261026`
- Base SHA: `62050f61726f5f6401359efddf83e71b3c8f41aa`
- Worktree: isolated sibling worktree
- Owner / closer: coordinator for Bobby
- Mutation owner: assigned worker lane for Issue `#3` (Rung 2)
- Scope: Expand `eval/cases.json` (60–75 multi-fact cases across 7 repos and 6 categories), add isolated `eval/holdout.json` (25–30 cases), upgrade `bin/dinkus-guide-eval` (`--suite`, `--mode retrieval|recall|extractive|model`, `anyOfSources`, `forbiddenFacts`, verifiable on-disk citation line-span checking, 5 diagnostic failure buckets), add `corpus embed` support, verify unit tests and live loopback baselines
- Gates: human merge/deploy; public-repo privacy gate; holdout promotion-exam isolation
- Stop: review-clean PR for `#3` at `WAITING_FOR_HUMAN` for merge
