# Guide context alignment — October 26, 2026

Base: `62050f61726f5f6401359efddf83e71b3c8f41aa`.
Scope: public product-context links in `AGENTS.md`. Guide remains optional,
read-only, citation-backed, and limited to its admitted public corpus. Broader
business/site knowledge principles do not authorize private ingestion or new
action tools. No model, prompt, training, scoring, or holdout file was changed.

## Public context

- [Org vision](https://github.com/dinkuskit/.github/blob/36aab690a7ef66dc119aab70e258ea979c54841a/VISION.md)
  and [scope and planning](https://github.com/dinkuskit/.github/blob/36aab690a7ef66dc119aab70e258ea979c54841a/ROADMAP.md).
- [Canonical selective research guidance](https://github.com/saariuslystoned/SaariusSkills/blob/23f2bb1208b3baa7aedaa87faec00395f9bdd061/skills/emdash-commerce/SKILL.md).

All three immutable links were fetched successfully. Linking source context in
an agent contract is separate from admitting source content to Guide's corpus.

## Corpus admission pending

The complete public tree at org commit
`36aab690a7ef66dc119aab70e258ea979c54841a` has no license file. The corpus
contract currently admits MIT sources only. The manifest and repository
allowlist therefore remain unchanged; no license or source permission was
inferred. An owner licensing decision and a verified license reference covering
these source bytes are required before admission.

Prepared candidate metadata, **not admitted sources**:

| ID | Path | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| `org-vision` | `VISION.md` | 8192 | `7f82951ec27c2f88ee88278a6d3c31d9dd59173b77ef92aa6d99262d6ae49064` |
| `org-roadmap` | `ROADMAP.md` | 5911 | `8acb16bf86456e7e969d81ef35568a1116779dd1608a4e86dfcd6ef8ed42bfac` |

Both candidates would use repository `dinkuskit/.github`, the org commit above,
layer `dinkuskit`, status `active`, and their immutable blob links as provenance.
Recheck bytes, license coverage, and pins when the follow-up is admitted.
`CONTRIBUTING.md` is not needed for this bounded product-context update.

The 14 existing website pins remain at
`11dfa2434b8d3137cbf95b66e5438cc3af10ec34`. Their refresh awaits corrected,
merged website source. No unmerged branch was silently admitted.

Evaluation PR #9 owns its current frozen Dev/Holdout baseline and verifier.
Before a later corpus expansion lands, coordinate dependency order and corpus
identity with that owner. Adding a corpus repository must not silently demand
new cases in an existing frozen baseline.

## Verification

Node `v24.22.1`:

- `npm test`: 47/47 passed.
- `npm run verify`: 162 pins; layers `dinkuskit=56`, `transition=1`, `emdash=105`.
- `dinkus-guide corpus sync --json` and `corpus verify --json`: both verified
  all 162 public source snapshots, with embedding/provider configuration unset.
- Corpus hash unchanged:
  `dc80b5fa494a7d7d2e90c2ae4e80cc512e217b837100e2101941e51d0ac5a501`.
- `git diff --check`: passed. Manifest, source allowlist, evaluator, frozen
  cases, and existing proof were not modified.

No live model/provider run, private research ingestion, deployment, package
publication, installation, or merge was performed. The context-only PR does not
claim org-corpus admission is complete. The coordinator owns review, the pending
licensing decision, and the human merge gate.
