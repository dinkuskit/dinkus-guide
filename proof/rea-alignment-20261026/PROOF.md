# Guide context and corpus alignment — October 26, 2026

Base: `62050f61726f5f6401359efddf83e71b3c8f41aa`.

Guide remains optional, read-only, citation-backed, and limited to its admitted
public corpus. Broader business/site knowledge principles do not authorize
private ingestion or new action tools. No model, prompt, training, scoring,
or frozen evaluation file was changed.

## Sources, licensing, and dependency

- `AGENTS.md` links the public org direction at
  `36aab690a7ef66dc119aab70e258ea979c54841a` and the canonical selective
  [research guidance](https://github.com/saariuslystoned/SaariusSkills/blob/23f2bb1208b3baa7aedaa87faec00395f9bdd061/skills/emdash-commerce/SKILL.md).
- Org [PR #16](https://github.com/dinkuskit/.github/pull/16) supplies the
  owner-approved MIT license for **only** `VISION.md` and `ROADMAP.md` at
  public candidate `344d6f54877d5490449b477c8e43f7409e55cc81`.
  It remains a merge dependency; this proof does not call it merged or on main.
- [`corpus/README.md`](../../corpus/README.md) preserves attribution, the full
  scoped permission notice, the immutable license link, and dependency status.
  Neither `CONTRIBUTING.md` nor another org file was admitted or labeled MIT.

The two new immutable manifest sources were fetched, hashed, and verified:

| ID | Path | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| `org-vision` | `VISION.md` | 8271 | `aad06c8fc9ed30530acca53c0e6722476c52b3c215b13afc86220689110618bf` |
| `org-roadmap` | `ROADMAP.md` | 5990 | `a2697aa45f9a2e638196e46cd513aedfe9bf438378a760b39de6502d5fd73f40` |

Both use repository `dinkuskit/.github`, the licensed candidate above,
layer `dinkuskit`, status `active`, license `MIT`, and immutable blob provenance.
The separate context-document allowlist admits exactly these paths. The
seven product/API repository set remains unchanged, preserving existing
frozen evaluation coverage semantics.

All 162 existing source entries remain byte-for-byte equivalent. The 14
website pins remain at `11dfa2434b8d3137cbf95b66e5438cc3af10ec34`; refreshing
them awaits corrected, merged website source. No private research was admitted.

## Verification

Node `v24.22.1`:

- `npm test`: 48/48 passed, including refusal of unapproved org paths.
- `npm run verify`: 164 pins; layers `dinkuskit=58`, `transition=1`, `emdash=105`.
- `dinkus-guide corpus sync --json` and `corpus verify --json`: both verified
  all 164 public snapshots with embedding/provider configuration unset.
- New corpus hash:
  `01e257ce5c3496a9f940b9955fb6c1e7d07d4d2ee1e0303c281d3cc032cef6db`.
- `git diff --check`: passed. Exact diff check confirmed evaluator entrypoints,
  verification source, and existing evaluation fixtures unchanged.

Compatibility with evaluation [PR #9](https://github.com/dinkuskit/dinkus-guide/pull/9),
head `db7e53fdc3c80699cbf5f9ec6ff3b875243eb933`, was checked in a disposable
checkout from the shared base. This source diff and PR #9's diff both applied
cleanly; the combined tree passed 54/54 tests and `npm run verify` with
164 sources, 67 Dev cases, and 29 Holdout cases. README and architecture edits
touch only introductory corpus descriptions, outside PR #9's changed sections.
No PR #9 branch, evaluator, or frozen case file was edited.

No live model/provider run, deployment, package publication, installation, or
merge was performed. Existing measured baselines still belong to their original
162-source corpus hash; these checks make no new model-quality claim. The
coordinator owns review and the human merge gate, including the license-source
dependency.
