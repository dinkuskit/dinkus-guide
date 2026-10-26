import { createHash } from "node:crypto";
import { lstat, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MAX_BYTES = 1_000_000;
const MAX_EMBEDDINGS_BYTES = 128_000_000;
const MIN_SOURCES = 10;
const MAX_SOURCES = 250;
const SHA256 = /^[a-f0-9]{64}$/;
const COMMIT = /^[a-f0-9]{40}$/;
const REPOSITORY = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
export const APPROVED_REPOSITORIES = new Set([
  "dinkuskit/dinkuskit",
  "dinkuskit/commerce",
  "dinkuskit/payments",
  "dinkuskit/inventory",
  "dinkuskit/ship",
  "dinkuskit/template-store",
  "emdash-cms/emdash"
]);
export const ALLOWED_LAYERS = new Set(["dinkuskit", "emdash", "transition"]);
export const ALLOWED_STATUSES = new Set(["active", "retired"]);

export const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
export const manifestPath = path.join(root, "corpus", "manifest.json");
export const cacheRoot = path.join(root, ".cache", "dinkus-guide");
export const embeddingsCachePath = path.join(cacheRoot, "embeddings.json");

function digest(value) { return createHash("sha256").update(value).digest("hex"); }
function chunkSetIdentity(chunks) {
  return digest(JSON.stringify(chunks.map((chunk) => [chunk.key, chunk.embedText])));
}

function inferLayer(repository) {
  return repository === "emdash-cms/emdash" ? "emdash" : "dinkuskit";
}

function validLayerForRepository(repository, layer) {
  if (!ALLOWED_LAYERS.has(layer)) return false;
  if (repository === "emdash-cms/emdash" && layer === "dinkuskit") return false;
  if (repository.startsWith("dinkuskit/") && layer === "emdash") return false;
  return true;
}

export async function loadManifest() {
  let manifest;
  try { manifest = JSON.parse(await readFile(manifestPath, "utf8")); } catch { throw new Error("manifest is not valid JSON"); }
  if (manifest.version !== 1 || !Array.isArray(manifest.sources) ||
      manifest.sources.length < MIN_SOURCES || manifest.sources.length > MAX_SOURCES) {
    throw new Error(`manifest must be version 1 with ${MIN_SOURCES}-${MAX_SOURCES} sources`);
  }
  const ids = new Set();
  const normalizedSources = [];
  for (const source of manifest.sources) {
    if (!source || ids.has(source.id) || !/^[a-z0-9-]+$/.test(source.id) ||
      !REPOSITORY.test(source.repository) || !APPROVED_REPOSITORIES.has(source.repository) ||
      !COMMIT.test(source.commit) || !/^[A-Za-z0-9._/-]+$/.test(source.path) || source.path.startsWith("/") ||
      source.path.includes("..") || !/\.(?:md|mdx)$/.test(source.path) || !SHA256.test(source.sha256) ||
      source.license !== "MIT" || typeof source.provenance !== "string" ||
      source.provenance !== `https://github.com/${source.repository}/blob/${source.commit}/${source.path}`) {
      throw new Error(`invalid manifest source: ${source?.id ?? "unknown"}`);
    }
    const layer = source.layer ?? inferLayer(source.repository);
    const status = source.status ?? "active";
    if (!validLayerForRepository(source.repository, layer) || !ALLOWED_STATUSES.has(status)) {
      throw new Error(`invalid manifest source: ${source.id}`);
    }
    ids.add(source.id);
    normalizedSources.push({ ...source, layer, status });
  }
  return { ...manifest, sources: normalizedSources };
}

export function corpusIdentity(manifest) { return digest(JSON.stringify(manifest)); }
function sourceUrl(source) { return `https://raw.githubusercontent.com/${source.repository}/${source.commit}/${source.path}`; }
function cachePath(source) {
  const file = path.resolve(cacheRoot, "sources", `${source.id}.md`);
  const parent = path.resolve(cacheRoot, "sources");
  if (!file.startsWith(`${parent}${path.sep}`)) throw new Error("cache path escapes cache root");
  return file;
}

async function rejectSymlinks(target, allowMissingLeaf = true) {
  const relative = path.relative(root, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("cache path escapes root");
  let current = root;
  for (const part of relative.split(path.sep)) {
    current = path.join(current, part);
    try {
      const stat = await lstat(current);
      if (stat.isSymbolicLink() || (!stat.isDirectory() && current !== target)) {
        throw new Error(`cache path component is not a directory: ${current}`);
      }
    } catch (error) {
      if (error.code === "ENOENT" && allowMissingLeaf) return;
      throw error;
    }
  }
}

async function validateBytes(source, bytes) {
  if (bytes.byteLength > MAX_BYTES) throw new Error(`${source.id}: source exceeds ${MAX_BYTES} bytes`);
  const actual = digest(bytes);
  if (actual !== source.sha256) throw new Error(`${source.id}: sha256 mismatch`);
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  if (text.includes("\u0000")) throw new Error(`${source.id}: NUL byte is not allowed`);
  return text;
}

async function boundedResponseBytes(response, sourceId) {
  const reader = response.body?.getReader?.();
  if (!reader) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > MAX_BYTES) throw new Error(`${sourceId}: source exceeds ${MAX_BYTES} bytes`);
    return bytes;
  }
  const chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) { await reader.cancel(); throw new Error(`${sourceId}: source exceeds ${MAX_BYTES} bytes`); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

function validateEmbeddingVector(vector, dimensions) {
  if (!Array.isArray(vector) || vector.length !== dimensions || dimensions < 1) return false;
  let normSq = 0;
  for (const value of vector) {
    if (typeof value !== "number" || !Number.isFinite(value)) return false;
    normSq += value * value;
  }
  return normSq > 0;
}

async function loadVerifiedEmbeddings(corpus, chunkCorpusImpl) {
  await rejectSymlinks(embeddingsCachePath, true);
  let stat;
  try {
    stat = await lstat(embeddingsCachePath);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("embeddings cache path is not a regular file");
  if (stat.size > MAX_EMBEDDINGS_BYTES) throw new Error("embeddings cache exceeds size limit");
  let parsed;
  try {
    parsed = JSON.parse(await readFile(embeddingsCachePath, "utf8"));
  } catch {
    throw new Error("embeddings cache is not valid JSON");
  }
  if (!parsed || parsed.version !== 1 || typeof parsed.corpusHash !== "string" ||
      (parsed.chunkSetHash !== undefined && (typeof parsed.chunkSetHash !== "string" || !SHA256.test(parsed.chunkSetHash))) ||
      typeof parsed.modelIdentity !== "string" || !parsed.modelIdentity.trim() ||
      !Number.isInteger(parsed.dimensions) || parsed.dimensions < 1 ||
      !Array.isArray(parsed.chunks) || parsed.chunks.length < 1) {
    throw new Error("embeddings cache has invalid schema");
  }
  if (parsed.corpusHash !== corpus.corpusHash) return null;
  const vectors = new Map();
  for (const entry of parsed.chunks) {
    if (!entry || typeof entry.key !== "string" || vectors.has(entry.key) ||
        !validateEmbeddingVector(entry.vector, parsed.dimensions)) {
      throw new Error("embeddings cache contains an invalid chunk vector");
    }
    vectors.set(entry.key, Float64Array.from(entry.vector));
  }
  const resolveChunker = chunkCorpusImpl ?? (await import("./guide.js")).chunkCorpus;
  const expectedChunks = resolveChunker(corpus);
  const expectedChunkSetHash = chunkSetIdentity(expectedChunks);
  if (vectors.size !== expectedChunks.length ||
      expectedChunks.some((chunk) => !vectors.has(chunk.key)) ||
      (parsed.chunkSetHash && parsed.chunkSetHash !== expectedChunkSetHash)) {
    throw Object.assign(
      new Error("corpus embeddings cache is out of date for current chunking; run corpus sync with embedding configuration"),
      { code: 3 }
    );
  }
  return {
    corpusHash: parsed.corpusHash,
    chunkSetHash: parsed.chunkSetHash ?? expectedChunkSetHash,
    requestedModel: typeof parsed.requestedModel === "string" ? parsed.requestedModel : null,
    modelIdentity: parsed.modelIdentity.trim(),
    dimensions: parsed.dimensions,
    vectors
  };
}

export async function syncCorpusEmbeddings(corpus, { embedTransport, chunkCorpusImpl, batchSize = 16 } = {}) {
  if (!embedTransport) throw new Error("embedTransport is required");
  const resolveChunker = chunkCorpusImpl ?? (await import("./guide.js")).chunkCorpus;
  await rejectSymlinks(cacheRoot);
  await mkdir(cacheRoot, { recursive: true });
  await rejectSymlinks(embeddingsCachePath, true);
  try {
    const existing = await lstat(embeddingsCachePath);
    if (!existing.isFile() || existing.isSymbolicLink()) {
      throw new Error("embeddings cache path is not a regular file");
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const chunks = resolveChunker(corpus);
  if (!chunks.length) throw new Error("cannot embed an empty corpus");
  const encoded = [];
  let modelIdentity = null;
  let requestedModel = null;
  let dimensions = null;
  for (let start = 0; start < chunks.length; start += batchSize) {
    const slice = chunks.slice(start, start + batchSize);
    const response = await embedTransport({ inputs: slice.map((chunk) => chunk.embedText) });
    if (!response || !Array.isArray(response.vectors) || response.vectors.length !== slice.length ||
        typeof response.model !== "string" || !response.model.trim()) {
      throw new Error("embedding provider returned an invalid batch response");
    }
    const batchModel = response.model.trim();
    if (modelIdentity === null) modelIdentity = batchModel;
    else if (modelIdentity !== batchModel) throw new Error("embedding provider changed model identity mid-sync");
    requestedModel = response.requestedModel ?? requestedModel;
    for (let idx = 0; idx < slice.length; idx += 1) {
      const vector = response.vectors[idx];
      if (dimensions === null) dimensions = Array.isArray(vector) ? vector.length : 0;
      if (!validateEmbeddingVector(vector, dimensions)) {
        throw new Error("embedding provider returned an invalid vector");
      }
      encoded.push({ key: slice[idx].key, vector: vector.map((val) => Number(val.toPrecision(7))) });
    }
  }
  const payload = JSON.stringify({
    version: 1,
    corpusHash: corpus.corpusHash,
    chunkSetHash: chunkSetIdentity(chunks),
    requestedModel,
    modelIdentity,
    dimensions,
    chunks: encoded
  });
  if (Buffer.byteLength(payload, "utf8") > MAX_EMBEDDINGS_BYTES) {
    throw new Error("embeddings cache exceeds size limit");
  }
  const temporary = `${embeddingsCachePath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporary, payload, { encoding: "utf8", mode: 0o600 });
  await rejectSymlinks(temporary, false);
  await rename(temporary, embeddingsCachePath);
  return verifyCorpus({ chunkCorpusImpl: resolveChunker });
}

export async function syncCorpus({ fetchImpl = fetch, timeoutMs = 15_000, concurrency = 6, embedTransport, chunkCorpusImpl } = {}) {
  const manifest = await loadManifest();
  await rejectSymlinks(cacheRoot);
  await mkdir(path.join(cacheRoot, "sources"), { recursive: true });
  await rejectSymlinks(path.join(cacheRoot, "sources"));

  let cursor = 0;
  let failure = null;
  async function downloadOne(index) {
    const source = manifest.sources[index];
    const target = cachePath(source);
    await rejectSymlinks(target);
    let response;
    try { response = await fetchImpl(sourceUrl(source), { redirect: "manual", signal: AbortSignal.timeout(timeoutMs) }); }
    catch { throw new Error(`${source.id}: download failed`); }
    if (response.status >= 300 && response.status < 400) throw new Error(`${source.id}: redirects are not allowed`);
    if (!response.ok) throw new Error(`${source.id}: download failed with HTTP ${response.status}`);
    const text = await validateBytes(source, await boundedResponseBytes(response, source.id));
    const temporary = `${target}.${process.pid}.${Date.now()}.${index}.tmp`;
    await writeFile(temporary, text, { encoding: "utf8", mode: 0o600 });
    await rejectSymlinks(temporary, false);
    await rename(temporary, target);
  }
  async function worker() {
    while (failure === null && cursor < manifest.sources.length) {
      const index = cursor++;
      try {
        await downloadOne(index);
      } catch (error) {
        if (failure === null) failure = error;
        return;
      }
    }
  }
  const workerCount = Math.max(1, Math.min(concurrency, manifest.sources.length));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  if (failure) throw failure;

  const verified = await verifyCorpus({ includeEmbeddings: false });
  if (embedTransport) {
    return syncCorpusEmbeddings(verified, { embedTransport, chunkCorpusImpl });
  }
  await rejectSymlinks(embeddingsCachePath, true);
  let existingEmbeddingsStat = null;
  try {
    existingEmbeddingsStat = await lstat(embeddingsCachePath);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  if (existingEmbeddingsStat) {
    if (!existingEmbeddingsStat.isFile() || existingEmbeddingsStat.isSymbolicLink()) {
      throw new Error("embeddings cache path is not a regular file");
    }
    await rm(embeddingsCachePath, { force: true });
  }
  return verified;
}

export async function verifyCorpus({ includeEmbeddings = true, chunkCorpusImpl } = {}) {
  const manifest = await loadManifest();
  const documents = [];
  for (const source of manifest.sources) {
    const file = cachePath(source);
    await rejectSymlinks(file, false);
    let stat;
    try { stat = await lstat(file); } catch { throw new Error(`${source.id}: cache is missing`); }
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`${source.id}: cache path is not a regular file`);
    const bytes = await readFile(file);
    const text = await validateBytes(source, bytes);
    documents.push({ source, text, lines: text.split(/\r?\n/) });
  }
  const corpusHash = corpusIdentity(manifest);
  const embeddings = includeEmbeddings
    ? await loadVerifiedEmbeddings({ manifest, documents, corpusHash }, chunkCorpusImpl)
    : null;
  return { manifest, documents, corpusHash, embeddings };
}

export function citationFor(source, startLine, endLine) {
  return { sourceId: source.id, startLine, endLine, url: `${source.provenance}#L${startLine}-L${endLine}` };
}

export function validateCitation(citation, corpus) {
  if (!citation || !Number.isInteger(citation.startLine) || !Number.isInteger(citation.endLine) ||
      citation.startLine < 1 || citation.endLine < citation.startLine) return false;
  const doc = corpus.documents.find(({ source }) => source.id === citation.sourceId);
  return Boolean(doc && citation.endLine <= doc.lines.length);
}
