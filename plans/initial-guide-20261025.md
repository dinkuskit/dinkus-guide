# Initial Guide and evaluation slice

Status: authorized implementation, 2026-10-25. Owner: Bobby.

## Outcome

Build a useful source-backed, read-only DinkusKit/EmDash Guide and an independent
evaluation runner in one public repository. Start with a terminal interface;
hosting is a separate decision. The implementation must not mutate products,
execute generated code, or confuse source excerpts with model-composed answers.

## Design decision

Compared Python standard-library CLI/retrieval with Node 24 native ESM. Both
can use a small verified cache and have no runtime packages. Choose Node 24 ESM
for compatibility with surrounding DinkusKit tooling, native fetch, and a future
product interface. Avoid a server, database, framework, and vector service in
this slice. Prefer a small API hiding source verification and retrieval behind
one question/answer contract. Source-derived behavior, not hardcoded answers.

## Interfaces to implement

```text
dinkus-guide corpus sync [--json]    explicit operator download into own cache
dinkus-guide corpus verify [--json]  check immutable source hashes
dinkus-guide ask QUESTION [--json] [--mode extractive|model]
dinkus-guide-eval run [--json] [--mode extractive|model]
```

Exact flags and exit codes belong in docs/cli.md. No credentials in CLI args.
No arbitrary local directory ingestion or arbitrary caller-provided source URLs.

Core conceptual types (names may adapt, responsibilities must remain):

```text
SourcePin { id, repository, commit, path, sha256, license/provenance }
Evidence { sourceId, startLine, endLine, excerpt, immutableUrl }
GuideAnswer { mode, status, answer, citations, corpusHash, modelIdentity? }
answerQuestion(question, verifiedCorpus, optionalModelTransport) -> GuideAnswer
```

The model transport receives bounded public excerpts and offers no action tools.
Model composition must not silently fall back to extractive mode. Invalid model
output must not escape as trusted citations. Return honest unavailable status.

## Proof and stopping point

- Public source pins and hashes, bounded safe corpus synchronization, verified
  cache, traceable line citations and explicit unsupported-question handling.
- Meaningful synthetic tests for malformed cache/paths, no evidence, source
  injection, provider failure and unexpected tool calls; no writes on ask.
- Freeze a small representative public-source development suite before tuning;
  run it through the public executable without importing implementation internals.
- Record every executed case and measured retrieval/citation/abstention result.
  Do not claim live-model quality from mock tests or source-excerpt answers.
- Exercise a real model only through already approved credentials/consumers and
  within existing local test authority. No credential extraction or new service.
- CI, docs, source/provenance checks, independent behavior proof, exact-head
  review and a reviewable PR. No merge, registry publication or runtime deploy.

True held-out evaluation for future optimization is separate from this public
development suite. Cases and rubric revisions must be frozen per comparison;
do not give an optimizer private holdout answers or access to their source.
