# Public corpus sources

`manifest.json` records immutable source commits, SHA-256 hashes, provenance,
and licenses. Synchronization stores public snapshots only in the ignored
local cache; the source documents are not redistributed in this repository.

## Org direction documents

The corpus admits only `VISION.md` and `ROADMAP.md` from `dinkuskit/.github`.
These describe direction and planning, not proof of shipped capabilities.
This separate document allowlist does not expand the seven product/API
repositories covered by existing frozen evaluation suites.

The pins use public candidate commit
`344d6f54877d5490449b477c8e43f7409e55cc81`, which adds the owner-approved
scoped MIT license in [org PR #16](https://github.com/dinkuskit/.github/pull/16).
That PR is a merge dependency; this pin is not a claim that the license change
is on the org's main branch. Recheck the dependency before merging this corpus
update. All existing source pins remain unchanged; refreshing the website
sources awaits corrected, merged website documentation.

The source files retain their notices and links to
[`LICENSE-DOCUMENTS.md`](https://github.com/dinkuskit/.github/blob/344d6f54877d5490449b477c8e43f7409e55cc81/LICENSE-DOCUMENTS.md).
That license applies only to these two documents, not `CONTRIBUTING.md`, other
org files, or other repositories. Attribution and the permission notice follow.

### MIT License — org vision and planning documents only

Copyright (c) 2026 DinkusKit contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
