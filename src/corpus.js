import { createHash } from "node:crypto";
import { lstat, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const MAX_BYTES = 1_000_000;
const SHA256 = /^[a-f0-9]{64}$/;
const COMMIT = /^[a-f0-9]{40}$/;
const REPOSITORY = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

export const root = path.resolve(new URL("..", import.meta.url).pathname);
export const manifestPath = path.join(root, "corpus", "manifest.json");
export const cacheRoot = path.join(root, ".cache", "dinkus-guide");

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

export async function loadManifest() {
  const raw = await readFile(manifestPath, "utf8");
  let manifest;
  try { manifest = JSON.parse(raw); } catch { throw new Error("manifest is not valid JSON"); }
  if (manifest.version !== 1 || !Array.isArray(manifest.sources) || manifest.sources.length < 10 || manifest.sources.length > 15) {
    throw new Error("manifest must be version 1 with 10-15 sources");
  }
  const ids = new Set();
  for (const source of manifest.sources) {
    if (!source || ids.has(source.id) || !/^[a-z0-9-]+$/.test(source.id) ||
      !REPOSITORY.test(source.repository) || !COMMIT.test(source.commit) ||
      !/^[A-Za-z0-9._/-]+$/.test(source.path) || source.path.startsWith("/") ||
      source.path.includes("..") || !SHA256.test(source.sha256) ||
      source.license !== "MIT" || typeof source.provenance !== "string" ||
      !source.provenance.startsWith(`https://github.com/${source.repository}/blob/${source.commit}/`)) {
      throw new Error(`invalid manifest source: ${source?.id ?? "unknown"}`);
    }
    ids.add(source.id);
  }
  return manifest;
}

export function corpusIdentity(manifest) {
  return digest(JSON.stringify(manifest));
}

function sourceUrl(source) {
  return `https://raw.githubusercontent.com/${source.repository}/${source.commit}/${source.path}`;
}

function cachePath(source) {
  return path.join(cacheRoot, "sources", `${source.id}.md`);
}

async function validateBytes(source, bytes) {
  if (bytes.byteLength > MAX_BYTES) throw new Error(`${source.id}: source exceeds ${MAX_BYTES} bytes`);
  const actual = digest(bytes);
  if (actual !== source.sha256) throw new Error(`${source.id}: sha256 mismatch`);
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  if (text.includes("\u0000")) throw new Error(`${source.id}: NUL byte is not allowed`);
  return text;
}

export async function syncCorpus({ fetchImpl = fetch } = {}) {
  const manifest = await loadManifest();
  await mkdir(path.join(cacheRoot, "sources"), { recursive: true });
  for (const source of manifest.sources) {
    const response = await fetchImpl(sourceUrl(source), { redirect: "manual" });
    if (response.status < 300 || response.status >= 400) {
      if (!response.ok) throw new Error(`${source.id}: download failed with HTTP ${response.status}`);
    } else {
      throw new Error(`${source.id}: redirects are not allowed`);
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    const text = await validateBytes(source, bytes);
    await writeFile(cachePath(source), text, { encoding: "utf8", mode: 0o600 });
  }
  return verifyCorpus();
}

export async function verifyCorpus() {
  const manifest = await loadManifest();
  const documents = [];
  for (const source of manifest.sources) {
    const file = cachePath(source);
    let stat;
    try { stat = await lstat(file); } catch { throw new Error(`${source.id}: cache is missing`); }
    if (!stat.isFile()) throw new Error(`${source.id}: cache path is not a regular file`);
    const bytes = await readFile(file);
    const text = await validateBytes(source, bytes);
    documents.push({ source, text, lines: text.split(/\r?\n/) });
  }
  return { manifest, documents, corpusHash: corpusIdentity(manifest) };
}

export function citationFor(source, startLine, endLine) {
  return {
    sourceId: source.id,
    startLine,
    endLine,
    url: `${source.provenance}#L${startLine}-L${endLine}`
  };
}

export function validateCitation(citation, corpus) {
  if (!citation || !Number.isInteger(citation.startLine) || !Number.isInteger(citation.endLine) ||
      citation.startLine < 1 || citation.endLine < citation.startLine) return false;
  const doc = corpus.documents.find(({ source }) => source.id === citation.sourceId);
  return Boolean(doc && citation.endLine <= doc.lines.length && citation.url === `${doc.source.provenance}#L${citation.startLine}-L${citation.endLine}`);
}
