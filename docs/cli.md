# CLI contract

Node 24 native ESM (`node:sqlite` built-in), with no npm runtime dependencies.

```text
dinkus-guide corpus sync [--json]
dinkus-guide corpus verify [--json]
dinkus-guide ask QUESTION [--json] [--mode extractive|model]
dinkus-guide-eval run [--json] [--mode extractive|model|recall] [--k 12]
```

`sync` is the only command that writes to disk (`.cache/dinkus-guide/`). It
admits only exact manifest URLs, rejects redirects, path traversal, symlinks,
oversized files, NUL bytes, and SHA-256 mismatches, and verifies all cached
sources. When `DINKUS_GUIDE_EMBED_BASE_URL` is set during `corpus sync`, it also
computes chunk embeddings via `/v1/embeddings` (`DINKUS_GUIDE_EMBED_MODEL`,
default `qwen3-embedding`; `DINKUS_GUIDE_EMBED_API_KEY` required on non-loopback
HTTPS and optional on loopback HTTP) and writes `.cache/dinkus-guide/embeddings.json`
bound to the exact `corpusHash` and returned `modelIdentity`. Running `corpus sync`
without `DINKUS_GUIDE_EMBED_BASE_URL` discards any existing `embeddings.json` so
an operator can always recover from a stale or corrupt embedding cache into
offline `BM25` mode. `verify` checks all source hashes and any cached
embeddings. `ask` never writes to disk.

When `DINKUS_GUIDE_EMBED_BASE_URL` is unset, `ask` runs pure offline `FTS5`
`BM25` retrieval with zero network requests in `extractive` mode. When
`DINKUS_GUIDE_EMBED_BASE_URL` is set during `ask`, `ask` embeds the query and
fuses `FTS5` `BM25` with cached chunk vectors via Reciprocal Rank Fusion
(`RRF`), failing closed if the embeddings cache is missing, out of date for
current chunk spans, or mismatched in dimensions or `modelIdentity`.

Extractive answers return ranked passages with immutable GitHub line citations,
or `insufficient_evidence` when the corpus does not support an answer. Model
mode sends bounded `E1..En` passages to an OpenAI-compatible endpoint with no
tool definitions or actions. It requires `DINKUS_GUIDE_BASE_URL`,
`DINKUS_GUIDE_MODEL` (default `nemotron-3.5-super-vl`), and
`DINKUS_GUIDE_API_KEY`. The retired `lightning` and `nemotron-3.5-lightning`
aliases are rejected. Base URLs must be credential-free HTTPS, or HTTP on
loopback only; base paths are preserved and `/v1` is appended only when absent.
Requests enforce timeouts, bounded response sizes, and redirect refusal. Set
`DINKUS_GUIDE_NO_THINK=1` only for a local provider that exposes the optional
Super VL no-think control. Provider errors, malformed JSON, tool calls, and
forged citations fail honestly; there is no silent fallback.

Exit codes: `0` success, `2` usage error, `3` missing/invalid/stale corpus or
embeddings cache, `4` model or embedding provider/output error. JSON errors go
to stdout as a single object; human errors go to stderr. Process environment is
the sole provider configuration; credentials are never printed.
