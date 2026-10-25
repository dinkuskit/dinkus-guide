# Initial Guide proof

In progress. Source base: ca39eb7500b8c8f57526385700244e7cb9cbc4ae.

The owner approved creation of dinkuskit/dinkus-guide, a read-only Guide with a
separate evaluation runner, baseline-first development, and a scoped but deferred
Harness² experiment. This record must distinguish real source retrieval,
synthetic provider tests, and any real model call. It is not deployment evidence.

## Initial preparation

- New public repository created under the requested DinkusKit organization.
- Isolated implementation worktree/branch created from its initial README commit.
- Compared a Python stdlib design and a Node 24 native ESM design; selected Node
  without runtime dependencies for DinkusKit integration and small surface area.
- Credentials absent from the current process; no secret files opened. Existing
  Spark consumer contracts are being checked before claiming live-model access.

## Implementation and baseline

- Implemented Node 24 native ESM Guide and separate CLI-spawning evaluator with
  no runtime dependencies, 15 pinned MIT public Markdown sources, SHA-256
  manifest validation, redirect/path/size/symlink checks and ignored cache.
- Verification: `npm test` passed 12/12; `npm run verify` passed; corpus sync and
  verify passed for corpus hash
  `377d1157e8448dd28d1dd9d834ac3be6608ddb45c162b516f8be61b010571346`.
- Extractive public development baseline: 20/24 (83.3%). Four misses are
  retrieval/citation or rubric gaps: ownership and docs/reference questions
  surfaced relevant facts without the expected source ID, the EmDash-start
  fact was absent from the bounded passages, and the example question did not
  match its expected citation. No case-specific answer table was added.
- Model-mode baseline: 0/24 because no model credentials/configuration were
  present. This is provider-unavailable evidence, not live-model quality.
- Three asks were exercised: template setup answered with pinned citations,
  Stripe test mode answered with pinned citations, and screenshot/edit request
  returned explicit text-only/read-only insufficient evidence.
- Synthetic tests cover malformed/wrong-hash and redirect source responses,
  source instruction injection, missing/invalid citations, provider failures,
  tool output, retired model alias, and no-write ask behavior. No live model was
  invoked.
