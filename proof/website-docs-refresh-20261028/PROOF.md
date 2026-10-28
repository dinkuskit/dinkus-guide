# Website docs refresh — October 28, 2026

Base: `d8eb8bb7d5877ee120a1d6ff5d4045712c91a03e`.

Refreshes the DinkusGuide website sources before the Ask DinkusGuide chat
bubble ([website #98](https://github.com/dinkuskit/dinkuskit/issues/98),
[website #100](https://github.com/dinkuskit/dinkuskit/pull/100)) goes live, so
visitors get answers from the current website docs rather than the 25 October
snapshot (`11dfa2434b8d3137cbf95b66e5438cc3af10ec34`).

## Change

- The 14 existing `dinkuskit/dinkuskit` entries move to merged website main
  `33c91aebf9365190580f9afd9be167b0fa0032e1` with recomputed SHA-256 and
  provenance. Their ids, paths, layers and statuses are unchanged.
- Nine website sources are added at the same commit: `docs/updates/start-here.md`,
  `docs/updates/troubleshooting.md`, the three `docs/updates/store-owners/`
  guides, the three `docs/updates/developers/` guides and
  `docs/dinkusguide-pilot.md`. The `docs/updates/` files are the same Markdown
  the Docs publish workflow puts on dinkuskit.com.
- No other source, model, prompt, scoring or evaluation file changed.

## Verification (Node 24.22.0)

| Command | Result |
| --- | --- |
| `npm test` | 60 passed, 0 failed |
| `npm run verify` | 173 pinned public sources (dinkuskit=67, transition=1, emdash=105); dev=75 |
| `dinkus-guide corpus sync --json` | verified, 173 sources, corpus hash `23e68385c8058f201020d5ed9404683c783bb2c339b1dc76446f1d8a7223f1b4` |
| `dinkus-guide-eval run --mode retrieval` | 53/56 before and after (same 3 retrieval misses) |
| `dinkus-guide-eval run --mode extractive` | 66/75 before, 65/75 after |

The one extractive change is `dev-refusal-prompt-injection-forged-citation`:
the refreshed README and DEPLOY pages now describe agent API tokens and
secrets, so offline extractive mode returns those public passages instead of
abstaining. Extractive mode only quotes admitted public passages. The ask
service the chat bubble uses runs model mode only.

## Not proven here

Model mode was not run: the model endpoint is on the owner's machine and is not
reachable from this cloud session. Before the chat bubble goes live, run
`dinkus-guide corpus sync` (and `corpus embed` when embeddings are configured)
on the Guide host, then `dinkus-guide-eval run --json` in model mode, and
compare with the Rung 3 baseline. No holdout suite was read.
