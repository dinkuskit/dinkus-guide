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
- `src/guide.js` refuses instruction overrides ("system override", "ignore
  previous instructions") and requests to reveal, leak or dump secrets, API
  keys or credentials, in either word order. The refreshed README and DEPLOY
  now explain agent API tokens, so the frozen
  `dev-refusal-prompt-injection-forged-citation` request found matching public
  passages and extractive mode answered instead of abstaining. Questions about
  how tokens and secrets are configured stay answerable
  (`tests/guide.test.js`).

## Source identity and license

Every website pin was read from `dinkuskit/dinkuskit` at
`33c91aebf9365190580f9afd9be167b0fa0032e1`, whose root `LICENSE` is the MIT
License. `corpus sync` fetched each exact raw URL, and every byte count and
SHA-256 below matched the manifest:

| ID | Path | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| `kit-deploy` | `DEPLOY.md` | 15832 | `ac1f7161c75492908ddb379b134dcb01355956ac7972dafbf0fb6089d49cb6e0` |
| `kit-readme` | `README.md` | 8355 | `5e3dedcccf289cf400f93d77f7dac077116b176e72b8b466704e13fadbfbf3b4` |
| `kit-cloudflare-readme` | `cloudflare/README.md` | 534 | `68d1a30d7f87c051bdd79a6622d91651d0b8bbfbca832affcb425dde9b757185` |
| `kit-charter` | `docs/CHARTER.md` | 8510 | `d2f6f28eac95e39068cfb4e97aefb1297b05de927f27cd642c3d17bd9dfd6604` |
| `kit-account-pages` | `docs/account-pages.md` | 4247 | `b12032c3bd354999d1671002ba6da6f02dadd6940a8e3c8a1717fc2370038b85` |
| `kit-getting-started` | `docs/getting-started.md` | 3069 | `381a3992d17d47b4b3227618311f783de06c37d96d3db495e513d40e0ffd1fde` |
| `kit-inventory-overview` | `docs/inventory-overview.md` | 3621 | `0991a9bdb910a8504d7984a7090a11ad1adebbc3332308bf3cb150b6dc78e7bf` |
| `kit-merchant-account-model` | `docs/merchant-account-model.md` | 9951 | `770fd55a965f1ccd929c822710b28f8ebdc605ecd121ef4402fdb9450004d404` |
| `kit-organization-approvals` | `docs/organization-approvals.md` | 6751 | `6f388b1b207ab50862b0e77f8f04c55ed638f52968f05de678811985a3f11d21` |
| `kit-provenance` | `docs/provenance.md` | 5435 | `ad6ba9a932385a98240aad1d1cc037db292ea92cb5b0d77c918c5915cf290a6d` |
| `kit-shared-store-connections` | `docs/shared-store-connections.md` | 25904 | `03a17e65954045a5738abd2a12a99d002d2b26b35225976043bb305852f36ee3` |
| `kit-commerce-reference` | `docs/updates/reference/commerce.md` | 12226 | `b8e313d4563c8830f25331838cf7a189e6db235dd49af2f61d241b9f5d608fb8` |
| `kit-payments-reference` | `docs/updates/reference/payments.md` | 7411 | `0587df7c90892bc7147b2abd0c60c60cb99d5693fcaa1e52a152c4514ecd0fe2` |
| `kit-ship-reference` | `docs/updates/reference/ship.md` | 6435 | `7110d54f5bd5d07334577520bf02db985b0b6fdf1d46076b2bed0d040fc324d3` |
| `kit-start-here` | `docs/updates/start-here.md` | 4951 | `aa77f36078c1da4974dc0b0500ce60af42fd22cb327d25c7e3bc64a6c2c4ebd0` |
| `kit-troubleshooting` | `docs/updates/troubleshooting.md` | 6229 | `c71575ab0f1db5921fe53ae178ae21929db653535f168c580289a396ca37bf1c` |
| `kit-owner-setup` | `docs/updates/store-owners/setup.md` | 6215 | `200ab888a92f318eab8d970334d645f2a86d8512f3e0d1f1bc59982bce5e5e88` |
| `kit-owner-first-product` | `docs/updates/store-owners/first-product.md` | 5065 | `a52b59aee822858d3283fda8b4391b5de0bf364d43e3d862c9e98314f1c79481` |
| `kit-owner-test-order` | `docs/updates/store-owners/test-order.md` | 5545 | `128f3bc1c531aac1bd857e156586bbb83fede3d360f717fd0946b13b40d3faea` |
| `kit-dev-integrate` | `docs/updates/developers/integrate.md` | 7112 | `136c45ef7e98e57dd5967905f213e3898c3e57457e48fa3ccf28e05c2e9a383e` |
| `kit-dev-add-on` | `docs/updates/developers/add-on.md` | 5455 | `5fd043b47f052f597f05bd1a08ad51382c96d9425e24d677774dcbe5ae55e8cd` |
| `kit-dev-contribute` | `docs/updates/developers/contribute.md` | 6006 | `bc13e18adbe766d15524dea9b184e57f254b4186374732f8bfefbd6e0491b7f0` |
| `kit-dinkusguide-pilot` | `docs/dinkusguide-pilot.md` | 5671 | `7947357be8ac0439d82c377e02fec08c4cea9137349b974c9474a2f62dd62ff0` |

All 23 are public Markdown pages in the website repository. The `docs/updates/`
pages are the published dinkuskit.com articles. None of them is a draft,
private note or internal authoring guide.

## Verification (Node 24.22.0)

| Command | Result |
| --- | --- |
| `npm test` | 61 passed, 0 failed |
| `npm run verify` | 173 pinned public sources (dinkuskit=67, transition=1, emdash=105); dev=75 |
| `dinkus-guide corpus sync --json` | verified, 173 sources, corpus hash `23e68385c8058f201020d5ed9404683c783bb2c339b1dc76446f1d8a7223f1b4` |
| `dinkus-guide-eval run --mode retrieval` | 53/56 before and after (same 3 retrieval misses) |
| `dinkus-guide-eval run --mode extractive` | 66/75 before and after, with the same passing cases |

Without the refusal change, extractive mode scored 65/75 on the refreshed
corpus (the forged-citation case above).

## Not proven here

Model mode was not run: the model endpoint is on the owner's machine and is not
reachable from this cloud session. Before the chat bubble goes live, run
`dinkus-guide corpus sync` (and `corpus embed` when embeddings are configured)
on the Guide host, then `dinkus-guide-eval run --json` in model mode, and
compare with the Rung 3 baseline. No holdout suite was read.
