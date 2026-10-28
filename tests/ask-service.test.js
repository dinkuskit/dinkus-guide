import assert from "node:assert/strict";
import { test } from "node:test";
import { request } from "node:http";
import { spawnSync } from "node:child_process";
import { createAskService, createWarmGuideRunner, DEFAULT_LIMITS, normalizeAnswer, runGuide } from "../src/ask-service.js";

const token = "synthetic-test-token-with-at-least-32-characters";
const source = { id: "public-doc", repository: "dinkuskit/dinkuskit", path: "README.md", provenance: `https://github.com/dinkuskit/dinkuskit/blob/${"a".repeat(40)}/README.md` };
const manifest = { sources: [source] };
const citation = { sourceId: source.id, startLine: 1, endLine: 3, url: `${source.provenance}#L1-L3` };
const answer = (text = "The complete validated answer.") => ({ mode: "model", status: "answered", answer: text, citations: [citation], evidence: [citation] });
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fixture(t, options = {}) {
  const server = await createAskService({ token, manifest, runQuestion: async (q) => answer(q), ...options });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => { server.closeAllConnections(); return new Promise((resolve) => server.close(resolve)); });
  const url = `http://127.0.0.1:${server.address().port}`;
  return { server, url, ask: (body, extra = {}) => fetch(`${url}/ask`, {
    method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body), ...extra
  }) };
}

test("completed output preserves the full answer and only admitted citations", () => {
  const full = "Full answer. ".repeat(1000);
  assert.deepEqual(normalizeAnswer(answer(full), manifest), { status: "answered", answer: full, citations: [citation.url] });
  for (const change of [
    { citations: [{ ...citation, url: "javascript:alert(1)" }] },
    { citations: [{ ...citation, sourceId: "private-canary" }] },
    { citations: [{ ...citation, endLine: 4 }] },
    { evidence: [] }, { answer: "" }, { mode: "extractive" }, { status: "answered", citations: [] }
  ]) assert.throws(() => normalizeAnswer({ ...answer(), ...change }, manifest), /unavailable/);
  assert.throws(() => normalizeAnswer(answer(full), manifest, 100), /unavailable/);
  assert.deepEqual(normalizeAnswer({ ...answer("No evidence."), status: "insufficient_evidence", citations: [] }, manifest), {
    status: "insufficient_evidence", answer: "No evidence.", citations: []
  });
});

test("only authenticated POST /ask with the exact question payload executes", async (t) => {
  let calls = 0;
  const f = await fixture(t, { runQuestion: async (q) => { calls++; return answer(q); } });
  for (const [path, init, status] of [
    ["/ask", {}, 405], ["/corpus/sync", { method: "POST" }, 404], ["/ask?model=x", { method: "POST" }, 404],
    ["/ask", { method: "POST", body: "{}", headers: { "content-type": "application/json" } }, 401]
  ]) assert.equal((await fetch(f.url + path, init)).status, status);
  for (const body of [{ question: "ok", model: "other" }, { question: "ok", url: "https://example.com" },
    { question: "ok", conversationId: "other-visitor" }, { question: " " }, { question: "\0" }, [], null]) {
    assert.equal((await f.ask(body)).status, 400);
  }
  assert.equal(calls, 0);
  const response = await f.ask({ question: "--version; touch /tmp/never-a-command" });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).answer, "--version; touch /tmp/never-a-command");
  assert.equal(calls, 1);
});

test("character and byte limits include unicode and bodies without Content-Length", async (t) => {
  const f = await fixture(t, { limits: { questionCharacters: 4, bodyBytes: 64 } });
  assert.equal((await f.ask({ question: "😀".repeat(4) })).status, 200);
  assert.equal((await f.ask({ question: "😀".repeat(5) })).status, 413);
  assert.equal((await f.ask({ question: "a".repeat(65) })).status, 413);
  const status = await new Promise((resolve, reject) => {
    const req = request(`${f.url}/ask`, { method: "POST", headers: {
      authorization: `Bearer ${token}`, "content-type": "application/json", "transfer-encoding": "chunked"
    } }, (res) => { res.resume(); res.on("end", () => resolve(res.statusCode)); });
    req.on("error", reject); req.write(" ".repeat(65)); req.end();
  });
  assert.equal(status, 413);
});

test("parallel visitors stay separate and the process enforces shared concurrency", async (t) => {
  assert.equal(DEFAULT_LIMITS.concurrency, 4);
  assert.equal(DEFAULT_LIMITS.queueSize, 8);
  let release;
  const f = await fixture(t, { limits: { concurrency: 2, queueSize: 0 }, runQuestion: async (q) => {
    await new Promise((resolve) => { (release ??= []).push(resolve); }); return answer(q);
  } });
  const a = f.ask({ question: "visitor A" }), b = f.ask({ question: "visitor B" });
  while (release?.length !== 2) await delay(5);
  assert.equal((await f.ask({ question: "overload" })).status, 429);
  release.forEach((resolve) => resolve());
  assert.equal((await (await a).json()).answer, "visitor A");
  assert.equal((await (await b).json()).answer, "visitor B");
});

test("bounded FIFO queue holds bursts up to queueSize, cancels disconnected waiters, and rejects overflow with 429", async (t) => {
  const started = [];
  const gates = new Map();
  const f = await fixture(t, { limits: { concurrency: 2, queueSize: 2 }, runQuestion: async (q) => {
    started.push(q);
    await new Promise((resolve) => { gates.set(q, resolve); });
    return answer(q);
  } });
  const r1 = f.ask({ question: "q1" });
  const r2 = f.ask({ question: "q2" });
  while (started.length < 2) await delay(5);

  const cancelQueued = new AbortController();
  const rCanceled = f.ask({ question: "q-cancel" }, { signal: cancelQueued.signal });
  const r3 = f.ask({ question: "q3" });
  await delay(15);
  assert.equal((await f.ask({ question: "q-overflow" })).status, 429);

  cancelQueued.abort();
  await assert.rejects(rCanceled);
  await delay(10);

  const r4 = f.ask({ question: "q4" });
  await delay(15);
  assert.equal((await f.ask({ question: "q-overflow-2" })).status, 429);

  gates.get("q1")();
  assert.equal((await (await r1).json()).answer, "q1");
  while (!started.includes("q3")) await delay(5);
  assert.ok(!started.includes("q-cancel"));

  gates.get("q2")();
  assert.equal((await (await r2).json()).answer, "q2");
  while (!started.includes("q4")) await delay(5);

  gates.get("q3")();
  gates.get("q4")();
  assert.equal((await (await r3).json()).answer, "q3");
  assert.equal((await (await r4).json()).answer, "q4");
  assert.deepEqual(started, ["q1", "q2", "q3", "q4"]);
});

test("timeout aborts work, frees only completed work, and hides provider errors", async (t) => {
  let signalled = false, release;
  const f = await fixture(t, { limits: { durationMs: 40, concurrency: 1, queueSize: 0 }, runQuestion: async (_q, { signal }) => {
    signal.addEventListener("abort", () => { signalled = true; });
    await new Promise((resolve) => { release = resolve; }); throw new Error("private provider detail");
  } });
  assert.equal((await f.ask({ question: "slow" })).status, 504);
  assert.equal(signalled, true);
  assert.equal((await f.ask({ question: "still busy" })).status, 429);
  release(); await delay(10);
  // A separate throwing fixture proves stable safe errors.
  const failed = await fixture(t, { runQuestion: async () => { throw new Error("private provider detail"); } });
  const response = await failed.ask({ question: "failure" });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "unavailable" });
});

test("abandoned requests propagate cancellation and release the slot", async (t) => {
  let entered = false, cancelled = false;
  const f = await fixture(t, { limits: { concurrency: 1 }, runQuestion: async (_q, { signal }) => {
    entered = true;
    await new Promise((resolve) => signal.addEventListener("abort", () => { cancelled = true; resolve(); }, { once: true }));
    throw new Error("abandoned");
  } });
  const controller = new AbortController();
  const pending = f.ask({ question: "cancel me" }, { signal: controller.signal });
  while (!entered) await delay(5);
  controller.abort(); await assert.rejects(pending);
  for (let i = 0; i < 50 && !cancelled; i++) await delay(5);
  assert.equal(cancelled, true);
});

test("global rate cap cannot be reset with visitor identifiers", async (t) => {
  const f = await fixture(t, { limits: { requestsPerMinute: 1 } });
  assert.equal((await f.ask({ question: "first" })).status, 200);
  assert.equal((await f.ask({ question: "second" })).status, 429);
});

test("CLI -- preserves leading option-looking questions as data", () => {
  const result = spawnSync(process.execPath, [new URL("../bin/dinkus-guide", import.meta.url).pathname,
    "ask", "--json", "--mode", "model", "--", "--version"], {
    encoding: "utf8", env: { PATH: process.env.PATH }
  });
  assert.notEqual(result.status, 0);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.status, "error");
  assert.doesNotMatch(parsed.error, /unknown option|expected ask|version/i);
});

test("real owned CLI child cancellation waits for process close", async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(runGuide("question", { signal: controller.signal }), (error) => error.publicCode === "timeout");
});

test("warm in-memory runner reuses pre-warmed corpus and propagates request abort to fetch", async (t) => {
  const docLines = [
    "# Template Store Setup",
    "Install dependencies with `npm install` and start the local template store.",
    "Configure the storefront environment before running migrations."
  ];
  const warmCorpus = {
    manifest,
    corpusHash: "b".repeat(64),
    documents: [{ source, text: docLines.join("\n"), lines: docLines }],
    embeddings: null
  };
  let fetchCalls = 0;
  const runner = await createWarmGuideRunner({
    corpus: warmCorpus,
    env: {
      DINKUS_GUIDE_BASE_URL: "http://127.0.0.1:8002/v1",
      DINKUS_GUIDE_MODEL: "nemotron-3.5-super-vl",
      DINKUS_GUIDE_API_KEY: "local"
    },
    fetchImpl: async (_url, init) => {
      fetchCalls += 1;
      if (init?.signal?.aborted) throw new Error("aborted");
      return new Response(JSON.stringify({
        model: "nemotron-3.5-super-vl",
        choices: [{
          message: {
            content: JSON.stringify({
              status: "answered",
              answer: "Install dependencies with `npm install` and start the local template store.",
              citationIds: ["E1"]
            })
          }
        }]
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
  });
  assert.equal(runner.manifest, manifest);

  const server = await createAskService({
    token,
    corpus: warmCorpus,
    env: {
      DINKUS_GUIDE_BASE_URL: "http://127.0.0.1:8002/v1",
      DINKUS_GUIDE_MODEL: "nemotron-3.5-super-vl",
      DINKUS_GUIDE_API_KEY: "local"
    },
    fetchImpl: async (_url, init) => {
      fetchCalls += 1;
      if (init?.signal?.aborted) throw new Error("aborted");
      return new Response(JSON.stringify({
        model: "nemotron-3.5-super-vl",
        choices: [{
          message: {
            content: JSON.stringify({
              status: "answered",
              answer: "Install dependencies with `npm install` and start the local template store.",
              citationIds: ["E1"]
            })
          }
        }]
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => { server.closeAllConnections(); return new Promise((resolve) => server.close(resolve)); });
  const url = `http://127.0.0.1:${server.address().port}/ask`;

  for (let i = 0; i < 2; i += 1) {
    const res = await fetch(url, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ question: "How do I install dependencies for the template store setup?" })
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, "answered");
    assert.deepEqual(body.citations, [`${source.provenance}#L1-L3`]);
  }
  assert.equal(fetchCalls, 2);

  const abortController = new AbortController();
  abortController.abort();
  await assert.rejects(runner("How do I install dependencies?", { signal: abortController.signal }), (err) => err.publicCode === "timeout");
  await assert.rejects(
    createWarmGuideRunner({ corpus: warmCorpus, env: { DINKUS_GUIDE_EMBED_BASE_URL: "http://127.0.0.1:11434/v1" } }),
    (err) => err.publicCode === "unavailable"
  );
});

test("invalid startup bounds and missing service credential fail closed", async () => {
  await assert.rejects(createAskService({ token: "short", manifest }));
  await assert.rejects(createAskService({ token, manifest, limits: { concurrency: 17 } }));
  await assert.rejects(createAskService({ token, manifest, limits: { queueSize: 65 } }));
  await assert.rejects(createAskService({ token, manifest, limits: { queueSize: -1 } }));
  await assert.rejects(createAskService({ token, manifest, limits: { durationMs: 90001 } }));
});
