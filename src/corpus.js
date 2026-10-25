import { createHash } from "node:crypto";
import { lstat, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MAX_BYTES = 1_000_000;
const SHA256 = /^[a-f0-9]{64}$/;
const COMMIT = /^[a-f0-9]{40}$/;
const REPOSITORY = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const APPROVED_REPOSITORIES = new Set([
  "dinkuskit/dinkuskit", "dinkuskit/commerce", "dinkuskit/payments", "dinkuskit/ship",
  "dinkuskit/template-store", "emdash-cms/emdash"
]);

export const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
export const manifestPath = path.join(root, "corpus", "manifest.json");
export const cacheRoot = path.join(root, ".cache", "dinkus-guide");

function digest(value) { return createHash("sha256").update(value).digest("hex"); }

export async function loadManifest() {
  let manifest;
  try { manifest = JSON.parse(await readFile(manifestPath, "utf8")); } catch { throw new Error("manifest is not valid JSON"); }
  if (manifest.version !== 1 || !Array.isArray(manifest.sources) || manifest.sources.length < 10 || manifest.sources.length > 15) {
    throw new Error("manifest must be version 1 with 10-15 sources");
  }
  const ids = new Set();
  for (const source of manifest.sources) {
    if (!source || ids.has(source.id) || !/^[a-z0-9-]+$/.test(source.id) ||
      !REPOSITORY.test(source.repository) || !APPROVED_REPOSITORIES.has(source.repository) ||
      !COMMIT.test(source.commit) || !/^[A-Za-z0-9._/-]+$/.test(source.path) || source.path.startsWith("/") ||
      source.path.includes("..") || !SHA256.test(source.sha256) || source.license !== "MIT" ||
      typeof source.provenance !== "string" || !source.provenance.startsWith(`https://github.com/${source.repository}/blob/${source.commit}/`)) {
      throw new Error(`invalid manifest source: ${source?.id ?? "unknown"}`);
    }
    ids.add(source.id);
  }
  return manifest;
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
  let current = root;
  for (const part of relative.split(path.sep)) {
    current = path.join(current, part);
    try {
      const stat = await lstat(current);
      if (stat.isSymbolicLink() || (!stat.isDirectory() && current !== target)) throw new Error(`cache path component is not a directory: ${current}`);
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

export async function syncCorpus({ fetchImpl = fetch, timeoutMs = 10_000 } = {}) {
  const manifest = await loadManifest();
  await rejectSymlinks(cacheRoot);
  await mkdir(path.join(cacheRoot, "sources"), { recursive: true });
  await rejectSymlinks(path.join(cacheRoot, "sources"));
  for (const source of manifest.sources) {
    const target = cachePath(source);
    await rejectSymlinks(target);
    let response;
    try { response = await fetchImpl(sourceUrl(source), { redirect: "manual", signal: AbortSignal.timeout(timeoutMs) }); }
    catch { throw new Error(`${source.id}: download failed`); }
    if (response.status >= 300 && response.status < 400) throw new Error(`${source.id}: redirects are not allowed`);
    if (!response.ok) throw new Error(`${source.id}: download failed with HTTP ${response.status}`);
    const text = await validateBytes(source, await boundedResponseBytes(response, source.id));
    const temporary = `${target}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(temporary, text, { encoding: "utf8", mode: 0o600 });
    await rejectSymlinks(temporary, false);
    await rename(temporary, target);
  }
  return verifyCorpus();
}

export async function verifyCorpus() {
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
  return { manifest, documents, corpusHash: corpusIdentity(manifest) };
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
