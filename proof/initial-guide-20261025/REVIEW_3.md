# Comprehensive review round 3

Repository: dinkuskit/dinkus-guide, PR 1.
Base: ca39eb7500b8c8f57526385700244e7cb9cbc4ae.
Reviewed head: 0c0d464c2993bbbf74425f2ae0b8273c06daf74d.
Request: req-20261025T205023Z-8142115528 (epoch 3).
Reviewer: OpenClaw, Codex gpt-6.1-sol.
Scope: comprehensive, P3 maximum, exact_tuple_qualified=true.
Terminal: three findings, not clean.

All three findings were accepted as required_fix:
- P2 (`src/guide.js:12`): informational command/step/script questions (such as `What command should I run to start the template store?`) were blocked by the mutation guard. Refined `instructionalHowTo` and sentence-level `directMutation` handling so informational command/procedure questions pass through while imperative and mixed action requests still abstain.
- P2 (`src/guide.js:4`): bare `screen`, `image`, `visual`, and `vision` matches rejected ordinary documentation questions (such as `How do I edit page content in the admin screen?` and `How do I upload a product image?`). Restricted `screenshotRequest` to visual-input inspection requests (`screenshot`, `ui debug`, attached/pasted visual inputs, or deictic visual inspection).
- P3 (`bin/dinkus-guide:50,69`): `corpus sync` and `corpus verify` propagated string filesystem error codes (`ENOENT`) to `process.exit`. Wrapped corpus commands in numeric exit code `3` and guarded `process.exit` with `Number.isInteger(error?.code)`.

Owner-directed corpus update in the same slice:
- Pruned retired `dinkuskit/blocks` from `APPROVED_REPOSITORIES` in `src/corpus.js` and removed the `blocks-retirement` manifest pin.
- Added `template-blocks-transition` (`dinkuskit/template-store` `docs/implementation/upstream-blocks-transition.md` at `bcbfe13629fb972ca4af28e3480bf2da45558b0b`, SHA-256 `a89c44eb609c5ba30bb218dc6efb310c9238f4c883da570a0947db6a5055bc91`), keeping 15 pinned public MIT sources (`corpusHash` `e2ec499d5c054e3e4a3bbbc30d8aa4f387f7c5a189a794022c3e5ce362d5bda4`).
- Bumped `eval/cases.json` to `corrected-public-development-v3` (version 3), replacing only the retired `blocks-retired` question with `blocks-transition` while keeping the other 23 cases unchanged.

Repaired and verified in `a0a435ed1fc1c6a07f838451455e7c10b4253937`:
- Unit and CLI regression tests: 35/35 pass; `npm run verify` passes.
- Extractive `v3` baseline (`EXTRACTIVE_BASELINE_V3.json`): 23/24 (95.8%).
- Live `nemotron-3.5-super-vl` `v3` baseline (`MODEL_BASELINE_V3.json`, `MODEL_RUN_V3.json`) on `a0a435ed1fc1c6a07f838451455e7c10b4253937`: 20/24 (83.3%).
- Historical `v2` baselines (`EXTRACTIVE_BASELINE.json`, `MODEL_BASELINE.json`) remain preserved as append-only history.
- Native ClawSweeper and JevSweeper coverage remain unavailable/ineligible as recorded in `REVIEW_1.md` until repository native review enrollment is separately configured; human merge remains gated.
