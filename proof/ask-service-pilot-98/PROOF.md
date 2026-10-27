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

Current-source external review and CI are pending. Merge and rollout: WAITING_FOR_HUMAN.
