# DinkusGuide repair proof

Repair base: `5dc17f39d922a86ef56acdf27d7cf83265a132b9`.

## Preserved history

The original v1 extractive result was 20/24 (83.3%), using a flawed scorer that
searched `JSON.stringify` of the entire result. It remains history only and is
superseded by corrected suite/scorer version 2. The original model 0/24 result
was provider-unavailable evidence, not live-model quality.

## Repair and results

- Direct mutations/private-data extraction are refused while read-only how-to
  questions and public customer concepts remain answerable.
- Retrieval requires substantive exact topical terms, uses heading-aware bounded
  passages, and suppresses redundant overlap. Unsupported-version and no-evidence
  checks are shared by extractive and provider modes.
- Model output validates source spans without trusting model URLs; the Guide
  constructs authoritative URLs, requires citations for answered output and none
  for insufficient evidence, and rejects forged spans, empty answers and tools.
  Requested and actual returned model identities are separate.
- HTTP has timeout, `max_tokens`, bounded response bytes, redirect refusal,
  credential-free HTTPS (or loopback HTTP), path-preserving v1 append, and an
  optional local Super VL no-think control.
- Sync validates approved public repositories, cache containment and symlinks,
  bounded downloads, timeout, and atomic verified writes.

Corrected public suite: `corrected-public-development-v2` version 2, 24 cases.
Extractive result: 19/24 (79.2%), corpus hash
`377d1157e8448dd28d1dd9d834ac3be6608ddb45c162b516f8be61b010571346`.
Misses: `ownership`, `commerce-docs`, `template`, `emdash-start`, `webhook`.
These remain visible; expected facts were not changed to raise the score.

Model evaluation with no configured provider reports `unavailable` and
`score: null`, not zero model quality. No live model, secret, private source,
deployment, push, or PR was used; the parent must run the approved Super VL
consumer separately.

## Verification

- `npm test`: 17/17 passed.
- `npm run verify`: passed.
- `dinkus-guide corpus sync --json`: passed, 15 sources, corpus hash above.
- `dinkus-guide corpus verify --json`: passed.
- Samples: template-color how-to answered; quantum teleportation insufficient;
  Stripe webhook answered with pinned evidence; screenshot request explicitly
  text-only/insufficient.
- CLI unknown `--bogus`: exit 2.

Limitations remain: extractive answers are passage-oriented, five public cases
still miss, and screenshot/video inspection is explicitly unavailable. The
24-case suite remains text-only.
