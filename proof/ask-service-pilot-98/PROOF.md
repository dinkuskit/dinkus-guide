# Ask-only service pilot proof

Source: dinkuskit/dinkus-guide, branch codex/dinkusguide-ask-service-98.
Base: d8eb8bb7d5877ee120a1d6ff5d4045712c91a03e.
Acceptance: [website issue #98](https://github.com/dinkuskit/dinkuskit/issues/98).

## Verification

- Node 24.22.0. npm test: 70/70 passed, including 10 new adapter cases.
- npm run verify: 164 admitted public sources; public development suite 75 cases.
- Tests exercise a local HTTP listener with synthetic Guide workers, request/Unicode/body limits, unexpected fields, authority-expansion attempts, forged citations, visitor interleaving, global rate/concurrency, timeout, disconnect and actual child termination.
- Existing read-only Guide CLI real-model smoke: exit 0, status answered, model nemotron-3.5-super-vl, 9.9 seconds, 279 answer characters and 1 citation. Corpus hash: 2bc34f2be1c0d91d2e5ee2a1acf5ba466e67ae11bdfe379214107b45d32835b2. This is a single measured request, not a throughput or accuracy benchmark.

- Controlled HTTP adapter with real Guide transport: HTTP 200 in 2.636 seconds, full answer and citation URLs preserved exactly. One real-model question; no broader quality claim.

## Boundaries

No corpus, retrieval, model prompts, evaluator or source admission changes. No private holdout access. No deployment, public listener, credentials, permissions, or account changes. Generated output stays under ignored runs/ask-service-pilot-98/.

The default service launcher remains uninstalled and disabled. Its fixed CLI runner is tested for option separation and child cancellation; real-model HTTP proof uses an explicitly injected controlled transport to the existing supported Guide CLI. It does not prove a deployed service, TLS ingress, an installed EmDash plugin or production availability.

## Review repair

Native review of `344a7c55b07cdb6a1c8b676edc38ea9574e575db` found that the
option-boundary CLI test inherited provider configuration. Accepted as a
required repair: the test now supplies only `PATH`, following the existing CLI
tests. This prevents a configured operator checkout from making model calls
and keeps its expected error independent of installed credentials. The focused
tests also pass with synthetic provider/embedding environment canaries set.
No findings were rejected. Comprehensive review of that original head was clean;
new-head CI and both review results are maintained in the linked PR.

Jev classification for that publication used the rubric by hand: both duplicate
Before-merge boxes were `repair` / actionable. The available Jev route was hosted;
the assignment excludes paid inference, so no hosted judge call was made.

Merge and rollout: WAITING_FOR_HUMAN.
