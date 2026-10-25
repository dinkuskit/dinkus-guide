# Architecture

DinkusGuide is a small Node 24 native ESM library and CLI. `src/corpus.js`
validates the reviewed manifest and its operator-populated cache. `src/guide.js`
token-matches bounded Markdown line windows for extractive retrieval and
validates every model citation ID against the supplied evidence before resolving
it to an authoritative manifest URL. Model mode uses an internal per-request
wire contract: each evidence object has a unique `id` such as `E1`, plus
`sourceId`, `startLine`, `endLine`, and `excerpt`; the model returns only
`{status, answer, citationIds}`. Answered output needs a nonempty answer and at
least one known ID. Insufficient output must use `citationIds: []`. URLs,
source spans, and legacy citation objects are never accepted from the model.
The public `GuideAnswer` evidence and citations shape is unchanged.
The model transport has no callable tools.

The guide has no server, database, framework, runtime package, write API or
code execution path. Source Markdown and model responses are untrusted data.
The guide does not interpret source instructions, use arbitrary URLs, inspect
screenshots, access private information, edit repositories or send messages.

`bin/dinkus-guide-eval` is intentionally separate: it spawns the public guide
executable and scores the public JSON contract. It does not import rankers,
answer functions or internal implementation. The 24 cases in
`eval/cases.json` are public development cases, not held-out proof.
