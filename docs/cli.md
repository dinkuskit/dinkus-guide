# CLI contract

Node 24 native ESM, with no runtime dependencies.

```text
dinkus-guide corpus sync [--json]
dinkus-guide corpus verify [--json]
dinkus-guide ask QUESTION [--json] [--mode extractive|model]
dinkus-guide-eval run [--json] [--mode extractive|model]
```

`sync` is the only command that downloads anything. It admits only the exact
manifest URLs, rejects redirects, path traversal, symlinks, oversized files,
NUL bytes and SHA-256 mismatches, and writes only `.cache/dinkus-guide/`.
`verify` reads that cache. `ask` never writes.

Extractive answers return ranked passages with immutable GitHub line citations.
They return `insufficient_evidence` when the corpus does not support an answer.
Model mode sends bounded passages to an OpenAI-compatible endpoint with no tool
definitions or actions. It requires `DINKUS_GUIDE_BASE_URL`,
`DINKUS_GUIDE_MODEL` (default `nemotron-3.5-super-vl`), and
`DINKUS_GUIDE_API_KEY`. Environment variables are the only model configuration;
credentials are never printed. The retired `lightning` alias is not accepted.
Provider errors, malformed JSON, tool calls and forged citations fail honestly;
there is no silent model-to-extractive fallback.

Exit codes: `0` success, `2` usage error, `3` missing/invalid corpus, `4`
model/provider/output error. JSON errors go to stdout as a single object;
human errors go to stderr. The CLI has no config file or command-line
credential precedence: process environment is the sole model configuration.
