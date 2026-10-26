# Independent source-blind CLI behavior proof

Result: PASS

- Repo worktree: isolated sibling worktree (`codex/dinkus-guide-rung1-20261026`)
- Head tested: `25c3738b68fc87c36f5f67d31039c5f539ae1bc7`, before and after
- Porcelain: empty before and after (`0` bytes)
- Cache fingerprint (`.cache/dinkus-guide`, `163` sorted `<relPath>:<fileSha256>` entries):
  `0cffe2d107686cde1c16d2d2eba96fc14c1addf9a57949392243bc8e89e78674` before and after
- CLI `corpusHash` across all runs:
  `dc80b5fa494a7d7d2e90c2ae4e80cc512e217b837100e2101941e51d0ac5a501`
- Contract inputs read by independent verifier: `README.md` and `docs/cli.md` only (`src/**`, `tests/**`, `proof/**`, `git diff`, and `git show` untouched).

## Clause verdicts

1. PASS (`corpus verify --json`, exit `0`, empty `stderr`): `status: "verified"`, `sources: 162`, `embeddings: { modelIdentity: "qwen3-embedding:latest", dimensions: 4096, chunks: 2138 }`.
2. PASS (`ask "How does the DinkusKit Inventory command receipt contract handle idempotency?" --json --mode extractive`, exit `0`, empty `stderr`): `status: "answered"`, top 4 citations in `dinkuskit/inventory` (`inventory-command-receipt-contract` `docs/COMMAND-RECEIPT-CONTRACT.md#L492-L514`, `inventory-readme` `README.md#L67-L73`, `inventory-charter` `docs/CHARTER.md#L103-L114`, `inventory-cli-spec` `docs/CLI-SPEC.md#L254-L293`).
3. PASS (`ask "How do EmDash plugin hooks work in a sandboxed Worker?" --json --mode extractive`, exit `0`, empty `stderr`): `status: "answered"`, top 4 citations in `emdash-cms/emdash` (`emdash-docs-deployment-plugin-sandbox` `#L134-L145`, `emdash-docs-plugins-creating-plugins-testing` `#L6-L24`, `emdash-readme` `#L146-L153`, `emdash-docs-plugins-creating-plugins-capabilities` `#L264-L266`), with YAML frontmatter and top-level MDX `import` lines cleanly excluded while preserving exact 1-based `#Lstart-Lend` GitHub line spans.
4. PASS (`ask "Delete the store database and create a pull request for me." --json --mode extractive`, exit `0`, empty `stderr`): `status: "insufficient_evidence"`, `evidence: []`, `citations: []`.
5. PASS (`ask "setup" --json --invalid-flag`, exit `2`, empty `stderr`): JSON error object `{"status":"error","error":"unknown option: --invalid-flag"}` on `stdout`.
6. PASS (`dinkus-guide-eval run --json --mode recall --k 12`, exit `1`, empty `stderr`): valid JSON report (`mode: "recall"`, `recall.k: 12`, `recall.hits: 18`, `recall.eligible: 19`).

## Follow-up note

The independent verifier also noted an adjacent CLI edge case (`ask "   " --json` exited `3` rather than `2`); `bin/dinkus-guide` now rejects blank/whitespace `ask` questions with exit code `2` alongside a regression test in `tests/guide.test.js` (`src/` unchanged).
