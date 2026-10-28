# Ask-only service adapter

This optional Node 24 adapter supports the public DinkusGuide pilot tracked in
[website issue #98](https://github.com/dinkuskit/dinkuskit/issues/98). It is source
for a controlled installation, not a deployed public service. Start it explicitly
with `node bin/dinkus-guide-serve` after configuring the existing Guide model,
embeddings and verified public corpus. It never syncs or changes the corpus.

The listener binds **127.0.0.1 only**, default port 8789. A separately approved
TLS ingress and service connection are needed for an EmDash installation on
another host. Running this command does not configure a tunnel, public DNS,
access policy, credentials or hosting. No package publication is required.

Set `DINKUS_GUIDE_SERVICE_TOKEN` through the deployment's supported secret
consumer. It must have at least 32 non-whitespace characters. Do not put it in
browser code, a URL, source control or logs. The service compares Bearer tokens
in constant time and does not forward this service token to its CLI child.
`DINKUS_GUIDE_SERVICE_PORT` is the optional local listener port.

## Wire contract

Only `POST /ask` is available. Send `Content-Type: application/json`,
`Authorization: Bearer <service credential>`, and exactly:

```json
{"question":"How do I set up the template store?"}
```

No history, conversation identifier, model, endpoint, instructions, user identity
or arbitrary control fields are accepted. Each question is independent. There
are no cookies, CORS allowance, action tools, generic command routes or corpus
administration routes. The service uses a fixed Node executable and fixed CLI
path/arguments, with `--` before the question. Shell syntax and option-like text
remain question data.

Success is the completed response, never raw streamed tokens:

```json
{"status":"answered","answer":"The complete validated answer.","citations":["https://github.com/owner/repository/blob/0123456789012345678901234567890123456789/README.md#L1-L3"]}
```

`status` preserves the Guide result (`answered`, `insufficient_evidence`, or
`out_of_scope` if Guide produces it). The current Guide uses
`insufficient_evidence` for its boundary refusals. The adapter does not relabel
these. Answers are returned intact; results larger than the configured response
bound are unavailable rather than silently shortened. Plain text renderers must
keep model-provided HTML/Markdown inert. Citation objects from the CLI become
their exact verified URL strings; evidence excerpts, model configuration and
other diagnostic fields do not enter the browser contract. Every citation must
match the admitted manifest's immutable provenance and the CLI's evidence.

Errors have only an `error` key:

| HTTP | Error | Meaning |
| --- | --- | --- |
| 400 | `invalid_request` | Malformed JSON, encoding, content type or payload |
| 401 | `unauthorized` | Missing or invalid service authentication |
| 404 / 405 | `not_found` / `method_not_allowed` | Unsupported surface |
| 413 | `too_large` | Question or body exceeds the bound |
| 429 | `overloaded` | Global rate or concurrency cap reached |
| 503 | `unavailable` | Missing/stale corpus, provider failure or invalid output |
| 504 | `timeout` | Request deadline reached |

All responses are `no-store`. No questions, answers, tokens or raw provider errors
are logged or persisted by this adapter.

## Bounds and isolation

Environment variables below use the `DINKUS_GUIDE_SERVICE_` prefix. Invalid
configuration refuses startup. Defaults are conservative limits, not measured
latency or throughput promises. The EmDash host may impose a shorter deadline.

| Suffix | Default | Allowed maximum |
| --- | ---: | ---: |
| `QUESTION_CHARACTERS` | 2000 Unicode code points | 8000 |
| `BODY_BYTES` | 16384 | 65536 |
| `RESPONSE_BYTES` | 65536 | 1048576 |
| `DURATION_MS` | 90000 | 90000 |
| `CONCURRENCY` | 2 | 16 |
| `REQUESTS_PER_MINUTE` | 20 | 600 |

All values must be positive integers. The rate cap is global for this single
listener process, with no waiting queue; it is not a per-visitor identity system
or a distributed rate limiter. Keep a single listener for a controlled pilot.
Multiple replicas require a separately reviewed shared admission boundary.
The listener caps simultaneous connections at 64. Deployment-specific ingress
limits and the website's trusted-client controls remain separate responsibilities.

Timeout and client disconnect abort the owned CLI process. Its concurrency slot
is released only after process closure, with SIGKILL after a 500ms SIGTERM grace
period. An HTTP timeout alone never admits replacement work into that slot.
The public development evaluator stays separate; no evaluation runs per ask.
Retrieval, output validation and the no-provider-fallback policy remain Guide's.

## Verification

`node --test tests/ask-service.test.js` exercises a real local HTTP listener with
labeled synthetic answer workers, malformed/forged citations, limit boundaries,
interleaved visitors, overload, timeout, disconnect and a real owned child
cancellation. `npm test && npm run verify` covers the existing Guide and public
development suite contracts. Synthetic workers do not prove real-model quality,
an installed EmDash plugin, hosted ingress, or production availability.
