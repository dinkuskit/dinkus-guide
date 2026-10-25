# DinkusGuide

Read-only, source-backed DinkusKit and EmDash guide with an independent
evaluation runner. It reads only the 15 immutable public Markdown pins in
`corpus/manifest.json`; raw snapshots are downloaded to the ignored cache.

## Quickstart

Requires Node 24.

```sh
npm test
npm run verify
./bin/dinkus-guide corpus sync
./bin/dinkus-guide corpus verify --json
./bin/dinkus-guide ask "How do I set up the template store?"
./bin/dinkus-guide-eval run --json
```

`corpus sync` is an explicit operator action. Asking a question is read-only.
Extractive mode returns ranked passages and immutable line citations. Model mode
is bounded and action-free; see [docs/cli.md](docs/cli.md). The `lightning`
model alias is retired; the default model identity is
`nemotron-3.5-super-vl` (or the corrected `nemotron-3.5-lightning` alias).

See [docs/architecture.md](docs/architecture.md) and
[docs/evaluation.md](docs/evaluation.md) for boundaries and baseline rules.
The package and its original code are MIT; third-party source provenance and
licenses are recorded per manifest entry and are not redistributed in git.
