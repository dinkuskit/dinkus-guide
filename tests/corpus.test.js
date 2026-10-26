import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { copyFile, mkdtemp, mkdir, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";
import { APPROVED_REPOSITORIES, loadManifest, syncCorpus } from "../src/corpus.js";
import { chunkCorpus } from "../src/guide.js";

test("manifest admits all seven approved repositories with explicit layer and status", async () => {
  const manifest = await loadManifest();
  assert.ok(manifest.sources.length >= 160 && manifest.sources.length <= 250);
  const reposPresent = new Set(manifest.sources.map((source) => source.repository));
  assert.deepEqual(reposPresent, APPROVED_REPOSITORIES);
  assert.ok(manifest.sources.every((source) => /^[a-f0-9]{40}$/.test(source.commit)));
  assert.ok(manifest.sources.every((source) => ["dinkuskit", "emdash", "transition"].includes(source.layer)));
  assert.ok(manifest.sources.every((source) => ["active", "retired"].includes(source.status)));
  assert.ok(manifest.sources.every((source) => source.repository !== "dinkuskit/blocks"));
  assert.ok(manifest.sources.every((source) => !source.path.includes("docs/website/")));
  assert.ok(manifest.sources.every((source) => source.path !== "docs/documentation-authoring.md"));
  assert.ok(manifest.sources.every((source) => source.path !== "docs/updates/README.md"));

  const v1Ids = [
    "kit-readme", "kit-getting-started", "kit-commerce-reference",
    "commerce-readme", "commerce-docs", "commerce-demo-checkout",
    "payments-readme", "payments-stripe-test-mode",
    "ship-readme", "ship-contract",
    "template-readme", "template-setup", "template-blocks-transition",
    "emdash-readme", "emdash-getting-started"
  ];
  const manifestIds = new Set(manifest.sources.map((source) => source.id));
  for (const id of v1Ids) assert.ok(manifestIds.has(id), `missing preserved v1 source id: ${id}`);
});

test("manifest rejects mismatched layer or invalid status metadata", async () => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "dinkus-layer-reject-"));
  try {
    await mkdir(path.join(temporaryRoot, "src"));
    await mkdir(path.join(temporaryRoot, "corpus"));
    await copyFile(new URL("../src/corpus.js", import.meta.url), path.join(temporaryRoot, "src", "corpus.js"));
    const baseManifest = JSON.parse(await readFile(new URL("../corpus/manifest.json", import.meta.url), "utf8"));

    for (const [label, override] of [
      ["emdash-as-dinkus", { repository: "emdash-cms/emdash", layer: "dinkuskit" }],
      ["dinkus-as-emdash", { repository: "dinkuskit/commerce", layer: "emdash" }],
      ["bad-status", { status: "draft" }]
    ]) {
      const candidate = structuredClone(baseManifest);
      const entry = candidate.sources[0];
      if (override.repository) {
        entry.repository = override.repository;
        entry.provenance = `https://github.com/${entry.repository}/blob/${entry.commit}/${entry.path}`;
      }
      if (override.layer) entry.layer = override.layer;
      if (override.status) entry.status = override.status;
      await writeFile(path.join(temporaryRoot, "corpus", "manifest.json"), JSON.stringify(candidate));
      const isolated = await import(`${pathToFileURL(path.join(temporaryRoot, "src", "corpus.js")).href}?${label}=${Date.now()}`);
      await assert.rejects(isolated.loadManifest(), /invalid manifest source/);
    }
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test("manifest rejects retired dinkuskit/blocks repository entries", async () => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "dinkus-blocks-reject-"));
  try {
    await mkdir(path.join(temporaryRoot, "src"));
    await mkdir(path.join(temporaryRoot, "corpus"));
    await copyFile(new URL("../src/corpus.js", import.meta.url), path.join(temporaryRoot, "src", "corpus.js"));
    const manifest = JSON.parse(await readFile(new URL("../corpus/manifest.json", import.meta.url), "utf8"));
    manifest.sources[manifest.sources.length - 1] = {
      id: "blocks-retirement",
      repository: "dinkuskit/blocks",
      commit: "694e4b4ff5ba76a04cc707a05188b164836d1a96",
      path: "README.md",
      sha256: "c14735a28fc193a9e3a7f2f2ce3d38ec300639c33ba433bad083491033ed9cd3",
      license: "MIT",
      provenance: "https://github.com/dinkuskit/blocks/blob/694e4b4ff5ba76a04cc707a05188b164836d1a96/README.md"
    };
    await writeFile(path.join(temporaryRoot, "corpus", "manifest.json"), JSON.stringify(manifest));
    const isolated = await import(`${pathToFileURL(path.join(temporaryRoot, "src", "corpus.js")).href}?blocks-test=${Date.now()}`);
    await assert.rejects(isolated.loadManifest(), /invalid manifest source: blocks-retirement/);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test("sync rejects redirects before accepting content", async () => {
  await assert.rejects(
    syncCorpus({ fetchImpl: async () => Response.redirect("https://example.invalid", 302) }),
    /redirects are not allowed/
  );
});

test("sync rejects content with a wrong hash", async () => {
  await assert.rejects(
    syncCorpus({ fetchImpl: async () => new Response("untrusted content") }),
    /sha256 mismatch/
  );
});

test("sync enforces the bounded download before hashing", async () => {
  const oversized = new Uint8Array(1_000_001);
  await assert.rejects(
    syncCorpus({ fetchImpl: async () => new Response(oversized) }),
    /exceeds 1000000 bytes/
  );
});

test("root decodes spaces and non-ASCII file URLs", async () => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "dinkus guide é "));
  try {
    await mkdir(path.join(temporaryRoot, "src"));
    await copyFile(new URL("../src/corpus.js", import.meta.url), path.join(temporaryRoot, "src", "corpus.js"));
    const isolated = await import(`${pathToFileURL(path.join(temporaryRoot, "src", "corpus.js")).href}?root-test=${Date.now()}`);
    assert.equal(isolated.root, await realpath(temporaryRoot));
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test("embeddings cache syncs in batches, verifies corpusHash/symlinks, and recovers on resync", async () => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "dinkus-embeddings-cache-"));
  try {
    await mkdir(path.join(temporaryRoot, "src"));
    await mkdir(path.join(temporaryRoot, "corpus"));
    await copyFile(new URL("../src/corpus.js", import.meta.url), path.join(temporaryRoot, "src", "corpus.js"));
    const commit = "0123456789012345678901234567890123456789";
    const sources = [];
    const bodies = new Map();
    for (let idx = 1; idx <= 10; idx += 1) {
      const id = `doc-${idx}`;
      const body = `# Doc ${idx}\n\nParagraph content for document ${idx}.\n`;
      const sha256 = createHash("sha256").update(body).digest("hex");
      const url = `https://raw.githubusercontent.com/dinkuskit/commerce/${commit}/docs/${id}.md`;
      bodies.set(url, body);
      sources.push({
        id,
        repository: "dinkuskit/commerce",
        layer: "dinkuskit",
        status: "active",
        commit,
        path: `docs/${id}.md`,
        sha256,
        license: "MIT",
        provenance: `https://github.com/dinkuskit/commerce/blob/${commit}/docs/${id}.md`
      });
    }
    await writeFile(path.join(temporaryRoot, "corpus", "manifest.json"), JSON.stringify({ version: 1, sources }));
    const isolated = await import(`${pathToFileURL(path.join(temporaryRoot, "src", "corpus.js")).href}?embed-cache=${Date.now()}`);

    const batchSizes = [];
    const synced = await isolated.syncCorpus({
      fetchImpl: async (url) => new Response(bodies.get(url)),
      chunkCorpusImpl: chunkCorpus,
      embedTransport: async ({ inputs }) => {
        batchSizes.push(inputs.length);
        return {
          model: "qwen3-embedding:0.6b",
          requestedModel: "qwen3-embedding",
          vectors: inputs.map((_, i) => [1, (i + 1) * 0.1, 0.5])
        };
      }
    });
    assert.ok(batchSizes.length >= 1);
    assert.equal(synced.embeddings.modelIdentity, "qwen3-embedding:0.6b");
    assert.equal(synced.embeddings.dimensions, 3);
    assert.equal(synced.embeddings.vectors.size, 10);

    // Corrupt embeddings.json fails closed on verifyCorpus, and recovers cleanly on syncCorpus with embedTransport
    await writeFile(isolated.embeddingsCachePath, "{corrupt-json", "utf8");
    await assert.rejects(isolated.verifyCorpus(), /embeddings cache is not valid JSON/);
    const recovered = await isolated.syncCorpus({
      fetchImpl: async (url) => new Response(bodies.get(url)),
      chunkCorpusImpl: chunkCorpus,
      embedTransport: async ({ inputs }) => ({
        model: "qwen3-embedding:0.6b",
        requestedModel: "qwen3-embedding",
        vectors: inputs.map(() => [0.6, 0.8, 0.0])
      })
    });
    assert.equal(recovered.embeddings.vectors.size, 10);

    // Stale corpusHash returns null embeddings instead of mismatched vectors
    const rawCached = JSON.parse(await readFile(isolated.embeddingsCachePath, "utf8"));
    rawCached.corpusHash = "f".repeat(64);
    await writeFile(isolated.embeddingsCachePath, JSON.stringify(rawCached), "utf8");
    const staleVerified = await isolated.verifyCorpus();
    assert.equal(staleVerified.embeddings, null);

    // Symlinked embeddings.json is rejected
    await rm(isolated.embeddingsCachePath, { force: true });
    const outsideTarget = path.join(temporaryRoot, "outside-embeddings.json");
    await writeFile(outsideTarget, "{}", "utf8");
    await symlink(outsideTarget, isolated.embeddingsCachePath);
    await assert.rejects(isolated.verifyCorpus(), /not a directory|not a regular file/);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});
