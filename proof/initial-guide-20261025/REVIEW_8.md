# Comprehensive review round 8

Repository: dinkuskit/dinkus-guide, PR 1.
Base: ca39eb7500b8c8f57526385700244e7cb9cbc4ae.
Reviewed head: 9e3670cc6db222ef7e61400b38896c62b7b9f7f6.
Request: req-20261025T223953Z-9970633090 (epoch 8).
Reviewer: OpenClaw, Codex gpt-6.1-sol.
Scope: comprehensive, P3 maximum, exact_tuple_qualified=true.
Terminal: one finding, not clean.

Accepted as required_fix:
- P2 (`src/guide.js:109`): `unsupportedVersion` matched `\b\d+(?:\.\d+)+\b` and checked `line.includes(version)`, allowing `v`-prefixed or major-only version requests (such as `v99.99` or `v99`) and substring version traps (such as `V2.0` against `1.2.0`) to bypass the guard and retrieve instructions for the wrong version. Fixed in `e08b1cccf84ac0306d630a2c10fd5ebadd118414` by normalizing `v`-prefixed dotted/prerelease and explicit `v`/`version` major version references across both questions and corpus lines with exact token boundaries before retrieval, and normalizing `v`-prefixed version tokens in `terms`/`containsTerm` so supported versions match whether written with or without `v`.

Verification on `e08b1cccf84ac0306d630a2c10fd5ebadd118414`:
- Unit and CLI regression tests: 39/39 pass; `npm run verify` passes.
- Extractive `v3` (`EXTRACTIVE_BASELINE_V3.json`): 23/24 (95.8%), byte-for-byte identical across all 24 retrieval windows and model prompts relative to `cb4e9be43466fca0ccb1fa45fdb951e7abd1930d`.
- Live `nemotron-3.5-super-vl` `v3` evidence remains source-bound to `cb4e9be43466fca0ccb1fa45fdb951e7abd1930d` (`MODEL_RERUN_V3.json`, 17/24) and `a0a435ed1fc1c6a07f838451455e7c10b4253937` (`MODEL_BASELINE_V3.json`, 20/24).
- Native ClawSweeper and JevSweeper coverage remain unavailable/ineligible as recorded in `REVIEW_1.md`; human merge remains gated.
