# Architecture

DinkusGuide is a small Node 24 native ESM library and CLI. `src/corpus.js`
validates the reviewed manifest and its operator-populated cache. `src/guide.js`
token-matches bounded Markdown line windows for extractive retrieval and
validates every model citation against both the manifest and supplied evidence.
The model transport has no callable tools.

The guide has no server, database, framework, runtime package, write API or
code execution path. Source Markdown and model responses are untrusted data.
The guide does not interpret source instructions, use arbitrary URLs, inspect
screenshots, access private information, edit repositories or send messages.

`bin/dinkus-guide-eval` is intentionally separate: it spawns the public guide
executable and scores the public JSON contract. It does not import rankers,
answer functions or internal implementation. The 24 cases in
`eval/cases.json` are public development cases, not held-out proof.
