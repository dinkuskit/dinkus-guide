# Review Receipt — Epoch 1 (`2650040332a53e126b056f383c711a5fc478542b`)

- **Repository / PR**: `dinkuskit/dinkus-guide#11` (`https://github.com/dinkuskit/dinkus-guide/pull/11`)
- **Base SHA**: `af7038971ade6f3d7d55a0dd8e5e4fc3c1dd24d9`
- **Reviewed Head SHA**: `2650040332a53e126b056f383c711a5fc478542b` (implementation `31a9f003f73714eb3b6ed5e1726f51ca8394accd`)

## 1. Required Review Rails

1. **GitHub Actions CI**:
   - `verify` (`push`, run `40515285140`): **PASS**
   - `verify` (`pull_request`, run `40515370972`): **PASS**
   - `ClawSweeper dispatch` (`pull_request_target`, run `40515371842`): **PASS**
2. **Comprehensive Secondary Review (`P3`)**:
   - Request ID: `req-20261027T134940Z-37347703750` (`review_scope=comprehensive`, `applied_max_priority=P3`, `exact_tuple_contract=review-conductor-openclaw-v1`, `engine=codex`, `model=gpt-5.6-terra`, `thinking=high`, `review_epoch=1`)
   - Verdict: **`needs-human` (`1` `P2` finding, `incorrect (0.88)`)**:
     - **`OC-1.1` (`P2`, `src/guide.js:1185`) — Replace unsupported answers when normalizing to insufficient evidence**: Relabeling `{status:"answered", citationIds:[]}` to `insufficient_evidence` or stripping citations from `insufficient_evidence` preserved the unconstrained `answer` string, exposing unsupported operational prose despite `insufficient_evidence`.
3. **Native ClawSweeper (Revision 1)**:
   - Comment: `https://github.com/dinkuskit/dinkus-guide/pull/11#issuecomment-6443938057` (run `40515897254`)
   - Bind metadata: `sha=2650040332a53e126b056f383c711a5fc478542b`, `reviewed_at=2026-10-27T14:00:19.512Z`, `lease_comment_id=6443660060`, `source_revision=32e6699a58da01ea6a41853416c6e724f3c334007b6545d0f677f8b3e59cdaa3`
   - Proof confidence: **`4/6` (`🐚 platinum hermit`, `Sufficient (live_output)`)**; security `None`; frozen evaluation and blinded Holdout redaction boundaries **Verified**.
   - Verdict: **`clawsweeper-review-state:blocked` (`2` actionable `P2` findings across `B1..B4`)**:
     - **`CS-1.1` (`B1` / `B3`, `P2` / `merge-risk: 🚨 compatibility` `P1`, `src/guide.js:777-817`) — Exclude courtesy text from the unknown-entity veto**: Stripping only the leading word of the entire string classified capitalized sign-offs or multi-sentence openers (such as `Explain public template store colors. Thanks!` on a `>= 10`-document offline corpus) as unknown proper entities and vetoed supported evidence while lowercase `thanks!` succeeded.
     - **`CS-1.2` (`B2`, `P2`, `src/guide.js:1184-1185`) — Reject uncited factual answers instead of relabeling their status**: Rewriting `{status:"answered", answer:"Use an undocumented command.", citationIds:[]}` to `insufficient_evidence` with the same `answer` bypassed `answerQuestion`'s missing-citation rejection (`answered model output requires a citation ID`) and allowed `bin/dinkus-guide` to print unsupported instructions.

## 2. JevSweeper Disposition

- **Coverage**: `unavailable`
- **Judge**: `rubric by hand (Jev MCP unavailable in non-shell PATH and hosted route gated by AGENTS.md no-paid-calls rule)`
- **`next_move`**: `repair`

| Item | Summary | Pre-Jev | Rubric Verdict | Coordinator Status | Final Adjudication |
| --- | --- | --- | --- | --- | --- |
| `CS-1.1` (`B1`) | Exclude courtesy text, clause-initial words, and uniform-case clauses from `extractProperEntityTerms` while retaining undocumented-integration abstentions (`P2`) | `repair` | `repair` | `actionable` | `required_fix` |
| `CS-1.2` / `OC-1.1` (`B2`) | Remove uncited-`answered` status relabeling so `answerQuestion` rejects uncited `answered` payloads, and replace `answer` with `CANONICAL_INSUFFICIENT_ANSWER` whenever normalizing `insufficient_evidence` (`P2`) | `repair` | `repair` | `actionable` | `required_fix` |
| `B3` | Remove the extra `unknownTopicalCount >= 2` lexical veto and add `>= 10`-doc offline regression tests covering capitalized/lowercase courtesy sign-offs, multi-sentence openers, and Title Case queries alongside undocumented-integration abstentions (`P1`) | `repair` | `repair` | `actionable` | `required_fix` |
| `B4` | Run `node --test tests/guide.test.js`, `npm test` (`60/60`), `npm run verify`, and re-bind all 10 offline and live `Dev` + aggregate `--summary-only` external `Holdout` baselines to clean repaired commit `fce6b1e528d5c93cb02d0fa1e891ebc426c8f4b1` (`P2`) | `repair` | `repair` | `actionable` | `required_fix` |

## 3. Scoped Repair Actions (`fce6b1e528d5c93cb02d0fa1e891ebc426c8f4b1`)

1. Added `COURTESY_TERMS` and `NON_ENTITY_WORDS` in `src/guide.js`, filtered `COURTESY_TERMS` in `queryTokenInfo` so conversational greetings/sign-offs never dilute lexical coverage, replaced `strippedLeadingWord` with clause-aware `extractProperEntityTerms(question)` (skipping trailing sign-offs, leading courtesy prefixes, non-CamelCase clause-initial words, uniform Title Case / ALL-CAPS clauses, and discourse/calendar words while retaining CamelCase and mid-clause undocumented integration identifiers like `NetSuite`, `Klarna`, `Afterpay`, and `DHL`), and removed the extra `unknownTopicalCount >= 2` veto so existing `0.6` coverage behavior is preserved.
2. Removed the `decoded.status === "answered" && decoded.citationIds.length === 0` rewrite in `createOpenAICompatibleTransport` so uncited `answered` responses fail closed in `answerQuestion` (`answered model output requires a citation ID`), and replaced `answer` with `CANONICAL_INSUFFICIENT_ANSWER` (`"The pinned public corpus does not contain enough evidence to answer this question."`) whenever `createOpenAICompatibleTransport` normalizes `status === "insufficient_evidence"`.
3. Expanded `tests/guide.test.js` (`60/60` pass) with regressions for uncited `answered` rejection, `insufficient_evidence` unsupported-answer replacement, and `>= 10`-doc offline queries with capitalized/lowercase courtesy text (`Thanks!`, `thanks!`, `Hello!`), multi-sentence openers, and Title Case queries, then re-ran `npm run verify` and all 10 exact-SHA `Dev` and `--summary-only` `Holdout` evaluations on `fce6b1e528d5c93cb02d0fa1e891ebc426c8f4b1`.
