# Architecture

DinkusGuide is a small Node 24 native ESM library and CLI with zero npm runtime
dependencies. `src/corpus.js` validates the reviewed manifest (`10–250` public
MIT `.md`/`.mdx` pins across `dinkuskit/dinkuskit`, `dinkuskit/commerce`,
`dinkuskit/payments`, `dinkuskit/inventory`, `dinkuskit/ship`,
`dinkuskit/template-store`, and `emdash-cms/emdash`), each tagged with explicit
`layer` (`dinkuskit`, `emdash`, or `transition`) and `status` (`active` or
`retired`), plus its operator-populated `.cache/dinkus-guide/` directory.

## Corpus hygiene

- **Retired surfaces excluded**: `dinkuskit/blocks` historical API/usage docs,
  retired `isolated-ship*` notes, superseded v1 `merchant-inventory-connect.md`,
  `<plugin>/docs/website/**` release templates containing literal `{{version}}`
  placeholders, internal meta-authoring guides (`documentation-authoring.md`,
  `docs/updates/README.md`), `WAITING_FOR_HUMAN` drafts, `docs/implementation/*`
  slice notes (except `template-store`'s `upstream-blocks-transition.md` in the
  `transition` layer), and duplicate `emdash/skills/**` mirrors are excluded.
- **Deferred sibling repos (Rung 1)**: `dinkuskit/coupons`, `dinkuskit/bundles`,
  `dinkuskit/template-services`, and `dinkuskit/template-marketing` remain
  deferred outside `APPROVED_REPOSITORIES` until their public docs stabilize.
  Upstream `dinkuskit/ship` currently exposes six canonical public Markdown
  files (`README.md`, `service/README.md`, `CHARTER.md`, webhook, and two
  contracts).
- **Tombstone tagging**: any manifest entry marked `status: "retired"` has
  `[STATUS: RETIRED]` prepended to every chunk's excerpt, headings, and
  embedding text, and passes `"status": "retired"` to Worker B with instructions
  never to recommend retired APIs.

## Chunking and hybrid retrieval

`src/guide.js` strips YAML frontmatter (retaining `title`, `description`,
`summary`, and `product` as heading context) and top-level MDX `import`
statements while keeping raw cached files untouched so `#Lstart-Lend` citations
match exact 1-based GitHub line numbers. Documents are chunked along ATX
headings outside fenced code blocks, preserving fenced code, `<Steps>` blocks,
and indented numbered-step continuations.

Worker A indexes chunks in an in-memory `node:sqlite` `FTS5` table (`porter
unicode61`) for offline `BM25` lexical ranking. When optional dense embeddings
(`qwen3-embedding`) are configured and synced to `.cache/dinkus-guide/embeddings.json`
(via `corpus sync` or `corpus embed`), Worker A fuses `FTS5` `BM25` ranks with
cosine similarity ranks via Reciprocal Rank Fusion (`RRF`, $k = 60$). Two-pass
diversity selection prevents the larger `emdash` documentation layer from
crowding out `dinkuskit` or `transition` evidence in `E1..E12`.

## Synthesis and safety boundary

Model mode uses an internal per-request wire contract: Worker B
(`nemotron-3.5-super-vl`) receives only unique `E1..En` IDs alongside
`sourceId`, `status`, `startLine`, `endLine`, and `excerpt`, with zero callable
tools, and returns only `{"status","answer","citationIds"}`. Answered output
needs a nonempty answer and at least one known `E1..En` ID; insufficient output
must use `citationIds: []`. URLs, source spans, and legacy citation objects are
never accepted from the model.

`ask` has no persistent database, server, write API, or code execution path.
Source Markdown and model responses are untrusted data. The guide does not
interpret source instructions, use arbitrary URLs, inspect screenshots, access
private information, edit repositories, or send messages.

`bin/dinkus-guide-eval` is separate: it spawns the public `dinkus-guide`
executable, evaluates `eval/cases.json` (67-case development suite) or
`--suite eval/holdout.json` (29-case locked promotion exam off-limits to Rung 3
optimizers and Rung 4 LoRA data generators), verifies cited line spans directly
against cached on-disk source snapshots, and classifies failures into five
diagnostic buckets (`retrieval_miss`, `schema_error`, `abstention_error`,
`citation_miss`, `fact_miss`).
