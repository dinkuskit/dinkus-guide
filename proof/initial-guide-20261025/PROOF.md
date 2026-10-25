# DinkusGuide repair proof

Repair base: `da7febcd0161e6ff7701ae48cf1ede4599977338`.

## Preserved history

The original v1 extractive result was 20/24 (83.3%), using a flawed scorer that
searched `JSON.stringify` of the entire result. It remains history only and is
superseded by corrected suite/scorer version 2. The original model 0/24 result
was provider-unavailable evidence, not live-model quality.

## Repair and results

- Direct mutations/private-data extraction are refused while read-only how-to
  questions and public customer concepts remain answerable.
- Retrieval requires substantive exact topical terms, uses bounded windows around
  actual matches, preserves excerpt/citation spans exactly, diversifies sources,
  and adds generic procedural/context ranking for setup and webhook questions.
  Unsupported-version and no-evidence checks are shared by extractive and provider
  modes. Direct deploy/commit requests refuse while benign read-only explanations
  remain answerable.
- Model output validates source spans without trusting model URLs; the Guide
  constructs authoritative URLs, requires citations for answered output and none
  for insufficient evidence, and rejects forged spans, empty answers and tools.
  Requested and actual returned model identities are separate.
- Runtime integration history retained from the bounded actual-model consumer
  at the repair sequence: the old prompt scored 6/24, and the explicit source
  schema scored 17/24. These are runtime integration results, not fabricated
  pass results. The follow-up wire correction assigns unique per-request
  evidence IDs and accepts only model `citationIds`; source spans and URLs are
  resolved authoritatively inside the Guide.
- HTTP has timeout, `max_tokens`, bounded response bytes, redirect refusal,
  credential-free HTTPS (or loopback HTTP), correct root/`/v1`/prefixed-`/v1`
  endpoint construction, one streamed-response decoder with flush, and an
  optional local Super VL no-think control. The retired
  `nemotron-3.5-lightning` alias advises `nemotron-3.5-super-vl`.
- Sync validates approved public repositories, cache containment and symlinks,
  bounded downloads, timeout, and atomic verified writes.

Corrected public suite: `corrected-public-development-v2` version 2, 24 cases.
Extractive result: 22/24 (91.7%), corpus hash
`377d1157e8448dd28d1dd9d834ac3be6608ddb45c162b516f8be61b010571346`.
Misses: `ownership`, `blocks-retired`. The corrected evaluator normalizes
whitespace for facts, scores extractive facts from the answer after removing the
echoed question plus cited evidence, and exits nonzero for unavailable model
reports (`score: null`). Expected facts and cases were not changed to raise the
score.

Model evaluation with no configured provider reports `unavailable` and
`score: null`, not zero model quality. No live model, secret, private source,
deployment, push, or PR was used; the parent must run the approved Super VL
consumer separately.

## Verification

- `npm test`: 20/20 passed.
- `npm run verify`: passed.
- `dinkus-guide corpus sync --json`: passed, 15 sources, corpus hash above.
- `dinkus-guide corpus verify --json`: passed.
- Samples: template setup cites `pnpm install --frozen-lockfile` and `pnpm dev`;
  store-name guidance cites site identity; Stripe webhook cites the endpoint,
  Connected accounts, event, and authoritative lookup; quantum teleportation is
  insufficient; deploy/commit is refused; screenshot request is explicitly
  text-only/insufficient.
- CLI unknown `--bogus`: exit 2.

Limitations remain: extractive answers are passage-oriented, five public cases
still miss, and screenshot/video inspection is explicitly unavailable. The
24-case suite remains text-only.
