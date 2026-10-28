# Public corpus sources

`manifest.json` records immutable source commits, SHA-256 hashes, provenance,
and licenses. Synchronization stores public snapshots only in the ignored
local cache; the source documents are not redistributed in this repository.

## Org direction documents

The corpus admits only `VISION.md` and `ROADMAP.md` from `dinkuskit/.github`.
These describe direction and planning, not proof of shipped capabilities.
This separate document allowlist does not expand the seven product/API
repositories covered by existing frozen evaluation suites.

The pins use merged commit `ad903228db64e95c7fa985857df562e9a580c6a8`
from [org PR #16](https://github.com/dinkuskit/.github/pull/16), which adds the
owner-approved scoped MIT license. The document bytes and hashes are unchanged
from reviewed candidate `344d6f54877d5490449b477c8e43f7409e55cc81`.
The licensing dependency is resolved.

## Website sources

The `dinkuskit/dinkuskit` pins follow merged website main
`33c91aebf9365190580f9afd9be167b0fa0032e1` (27 October 2026), after the setup
guides were rewritten for Commerce 0.6.0, Payments 0.4.0 and Ship 0.3.0 and
published to dinkuskit.com. The public articles under `docs/updates/` (start
here, store-owner setup, first product, test order, troubleshooting and the
three developer guides) and the DinkusGuide pilot page are admitted beside the
existing website pages. `docs/updates/README.md` and
`docs/documentation-authoring.md` stay excluded as internal authoring guides.
Product plugin, template-store, EmDash and org pins are unchanged.

The source files retain their notices and links to
[`LICENSE-DOCUMENTS.md`](https://github.com/dinkuskit/.github/blob/ad903228db64e95c7fa985857df562e9a580c6a8/LICENSE-DOCUMENTS.md).
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
