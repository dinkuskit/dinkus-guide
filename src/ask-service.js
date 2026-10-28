import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { timingSafeEqual } from "node:crypto";
import { fileURLToPath } from "node:url";
import { citationFor, loadManifest, verifyCorpus } from "./corpus.js";
import { answerQuestion, chunkCorpus, createOpenAICompatibleEmbedTransport, createOpenAICompatibleTransport, rankEvidence } from "./guide.js";

export const DEFAULT_LIMITS = Object.freeze({
  questionCharacters: 2000, bodyBytes: 16384, responseBytes: 65536,
  durationMs: 90000, concurrency: 4, queueSize: 8, requestsPerMinute: 20
});
const cli = fileURLToPath(new URL("../bin/dinkus-guide", import.meta.url));
const failure = (code) => Object.assign(new Error(code), { publicCode: code });

/** Only the completed, validated CLI result crosses this boundary. */
export function normalizeAnswer(value, manifest, maxBytes = DEFAULT_LIMITS.responseBytes) {
  if (!value || value.mode !== "model" ||
      !["answered", "insufficient_evidence", "out_of_scope"].includes(value.status) ||
      typeof value.answer !== "string" || !value.answer.trim() ||
      !Array.isArray(value.citations) || !Array.isArray(value.evidence)) throw failure("unavailable");
  const citations = value.citations.map((item) => {
    const source = manifest.sources.find((candidate) => candidate.id === item?.sourceId);
    if (!source || !Number.isSafeInteger(item.startLine) || !Number.isSafeInteger(item.endLine) ||
        item.startLine < 1 || item.endLine < item.startLine ||
        item.url !== citationFor(source, item.startLine, item.endLine).url ||
        !value.evidence.some((e) => e.sourceId === item.sourceId && e.startLine === item.startLine &&
          e.endLine === item.endLine && e.url === item.url)) throw failure("unavailable");
    const url = new URL(item.url);
    if (url.protocol !== "https:" || url.hostname !== "github.com" || url.username || url.password || url.search ||
        !/^\/[^/]+\/[^/]+\/blob\/[a-f0-9]{40}\/.+/.test(url.pathname)) throw failure("unavailable");
    return item.url;
  });
  if ((value.status === "answered") !== (citations.length > 0)) throw failure("unavailable");
  const result = { status: value.status, answer: value.answer, citations };
  if (Buffer.byteLength(JSON.stringify(result)) > maxBytes) throw failure("unavailable");
  return result;
}

/** Fixed executable, argv and model mode; no shell, visitor environment or options. */
export function runGuide(question, { signal, maxBytes = 1048576 } = {}) {
  return new Promise((resolve, reject) => {
    const env = { ...process.env };
    delete env.DINKUS_GUIDE_SERVICE_TOKEN;
    const child = spawn(process.execPath, [cli, "ask", "--json", "--mode", "model", "--", question], {
      stdio: ["ignore", "pipe", "ignore"], windowsHide: true, env
    });
    let chunks = [], size = 0, killTimer, error;
    const stop = (reason) => {
      error ??= reason;
      child.kill("SIGTERM");
      killTimer ??= setTimeout(() => child.kill("SIGKILL"), 500);
      killTimer.unref();
    };
    const abort = () => stop(failure("timeout"));
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) abort();
    child.stdout.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) { stop(failure("unavailable")); return; }
      if (!error) chunks.push(chunk);
    });
    child.once("error", () => { error = failure("unavailable"); });
    // The slot remains occupied until the exact owned child has actually closed.
    child.once("close", (code) => {
      clearTimeout(killTimer);
      signal?.removeEventListener("abort", abort);
      if (error || code !== 0) { reject(error ?? failure("unavailable")); return; }
      try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8"))); }
      catch { reject(failure("unavailable")); }
    });
  });
}

/** Preloads verified corpus, embeddings, and in-memory FTS5 index once per server lifecycle. */
export async function createWarmGuideRunner({ corpus, env = process.env, fetchImpl = fetch } = {}) {
  const verifiedCorpus = corpus ?? await verifyCorpus({ chunkCorpusImpl: chunkCorpus });
  if (env.DINKUS_GUIDE_EMBED_BASE_URL && !verifiedCorpus.embeddings?.vectors?.size) throw failure("unavailable");
  rankEvidence("dinkuskit", verifiedCorpus, 1);
  const runner = async (question, { signal } = {}) => {
    if (signal?.aborted) throw failure("timeout");
    const fetchForRequest = signal
      ? (url, init = {}) => fetchImpl(url, {
          ...init,
          signal: init.signal ? AbortSignal.any([init.signal, signal]) : signal
        })
      : fetchImpl;
    try {
      const transport = createOpenAICompatibleTransport({
        fetchImpl: fetchForRequest,
        baseUrl: env.DINKUS_GUIDE_BASE_URL,
        model: env.DINKUS_GUIDE_MODEL || "nemotron-3.5-super-vl",
        apiKey: env.DINKUS_GUIDE_API_KEY,
        noThink: env.DINKUS_GUIDE_NO_THINK === "1"
      });
      const embedTransport = env.DINKUS_GUIDE_EMBED_BASE_URL
        ? createOpenAICompatibleEmbedTransport({
            fetchImpl: fetchForRequest,
            baseUrl: env.DINKUS_GUIDE_EMBED_BASE_URL,
            model: env.DINKUS_GUIDE_EMBED_MODEL || "qwen3-embedding",
            apiKey: env.DINKUS_GUIDE_EMBED_API_KEY || ""
          })
        : undefined;
      return await answerQuestion(question, verifiedCorpus, { mode: "model", limit: 12, transport, embedTransport });
    } catch {
      throw failure(signal?.aborted ? "timeout" : "unavailable");
    }
  };
  runner.manifest = verifiedCorpus.manifest;
  return runner;
}

function authorized(header, token) {
  if (typeof header !== "string") return false;
  const received = Buffer.from(header);
  const expected = Buffer.from(`Bearer ${token}`);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

function limitsWith(overrides) {
  const limits = { ...DEFAULT_LIMITS, ...overrides };
  const maxima = { questionCharacters: 8000, bodyBytes: 65536, responseBytes: 1048576,
    durationMs: 90000, concurrency: 16, queueSize: 64, requestsPerMinute: 600 };
  for (const [name, value] of Object.entries(limits)) {
    const min = name === "queueSize" ? 0 : 1;
    if (!(name in DEFAULT_LIMITS) || !Number.isSafeInteger(value) || value < min || value > maxima[name]) {
      throw new Error("Invalid service limits");
    }
  }
  return limits;
}

export async function createAskService({ token, manifest, corpus, env, fetchImpl, runQuestion, limits: overrides } = {}) {
  if (typeof token !== "string" || token.length < 32 || /\s/.test(token)) throw new Error("A service token of at least 32 non-whitespace characters is required");
  const limits = limitsWith(overrides);
  if (!runQuestion) {
    const warmRunner = await createWarmGuideRunner({ corpus, env, fetchImpl });
    runQuestion = warmRunner;
    manifest ??= warmRunner.manifest;
  }
  manifest ??= await loadManifest();
  let active = 0, windowStart = Date.now(), accepted = 0;
  const queue = [];
  const server = createServer(async (req, res) => {
    const controller = new AbortController();
    let deadline;
    const reply = (status, data) => {
      if (res.destroyed || res.writableEnded) return;
      res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store",
        "x-content-type-options": "nosniff", ...(status === 429 ? { "retry-after": "60" } : {}) });
      res.end(JSON.stringify(data));
    };
    const cancel = () => { if (!res.writableEnded) controller.abort(); };
    req.once("aborted", cancel);
    res.once("close", cancel);
    try {
      // No generic command, health, corpus, model-selection or CORS endpoint.
      if (req.url !== "/ask") { reply(404, { error: "not_found" }); return; }
      if (req.method !== "POST") { reply(405, { error: "method_not_allowed" }); return; }
      if (!authorized(req.headers.authorization, token)) { reply(401, { error: "unauthorized" }); return; }
      if (req.headers["content-encoding"] || !/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(req.headers["content-type"] ?? "")) {
        reply(400, { error: "invalid_request" }); return;
      }
      if (Number(req.headers["content-length"]) > limits.bodyBytes) { reply(413, { error: "too_large" }); req.resume(); return; }
      deadline = setTimeout(() => { controller.abort(); reply(504, { error: "timeout" }); req.resume(); }, limits.durationMs);
      let bytes = 0, parts = [];
      for await (const chunk of req.iterator({ destroyOnReturn: false })) {
        bytes += chunk.length;
        if (controller.signal.aborted) return;
        if (bytes > limits.bodyBytes) { reply(413, { error: "too_large" }); req.resume(); return; }
        parts.push(chunk);
      }
      let input;
      try { input = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(parts))); }
      catch { reply(400, { error: "invalid_request" }); return; }
      if (!input || Array.isArray(input) || Object.keys(input).length !== 1 || typeof input.question !== "string" ||
          !input.question.trim() || input.question.includes("\0")) { reply(400, { error: "invalid_request" }); return; }
      if ([...input.question].length > limits.questionCharacters) { reply(413, { error: "too_large" }); return; }
      if (Date.now() - windowStart >= 60000) { windowStart = Date.now(); accepted = 0; }
      if (accepted >= limits.requestsPerMinute || (active >= limits.concurrency && queue.length >= limits.queueSize)) {
        reply(429, { error: "overloaded" }); return;
      }
      if (active >= limits.concurrency) {
        const acquired = await new Promise((resolve) => {
          const entry = {
            wake: () => { controller.signal.removeEventListener("abort", onAbort); resolve(true); }
          };
          const onAbort = () => {
            const idx = queue.indexOf(entry);
            if (idx !== -1) queue.splice(idx, 1);
            resolve(false);
          };
          if (controller.signal.aborted) { resolve(false); return; }
          controller.signal.addEventListener("abort", onAbort, { once: true });
          queue.push(entry);
        });
        if (!acquired || controller.signal.aborted) return;
        if (Date.now() - windowStart >= 60000) { windowStart = Date.now(); accepted = 0; }
        if (accepted >= limits.requestsPerMinute) {
          const next = queue.shift();
          if (next) next.wake();
          else active -= 1;
          reply(429, { error: "overloaded" });
          return;
        }
      } else {
        active += 1;
      }
      accepted += 1;
      // Attach release to real completion, not to the HTTP timeout/disconnect.
      const running = Promise.resolve().then(() => runQuestion(input.question, { signal: controller.signal }));
      const released = running.finally(() => {
        const next = queue.shift();
        if (next) next.wake();
        else active -= 1;
      });
      try { reply(200, normalizeAnswer(await released, manifest, limits.responseBytes)); }
      catch (error) { reply(error?.publicCode === "timeout" ? 504 : 503, { error: error?.publicCode === "timeout" ? "timeout" : "unavailable" }); }
    } catch { reply(503, { error: "unavailable" }); }
    finally { clearTimeout(deadline); req.removeListener("aborted", cancel); res.removeListener("close", cancel); }
  });
  server.requestTimeout = limits.durationMs;
  server.headersTimeout = Math.min(limits.durationMs, 10000);
  server.keepAliveTimeout = 1000;
  server.maxConnections = 64;
  return server;
}
