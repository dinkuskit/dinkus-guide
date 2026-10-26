import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { copyFile, mkdtemp, mkdir, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";
import { APPROVED_CONTEXT_DOCUMENTS, APPROVED_REPOSITORIES, loadManifest, syncCorpus } from "../src/corpus.js";
import { chunkCorpus } from "../src/guide.js";

test("manifest admits seven product/API repositories and only approved org context documents", async () => {
  const manifest = await loadManifest();
  assert.ok(manifest.sources.length >= 160 && manifest.sources.length <= 250);
  const reposPresent = new Set(manifest.sources.map((source) => source.repository));
  assert.deepEqual(reposPresent, new Set([...APPROVED_REPOSITORIES, ...APPROVED_CONTEXT_DOCUMENTS.keys()]));
  assert.equal(APPROVED_REPOSITORIES.has("dinkuskit/.github"), false, "context admission must not expand frozen repository coverage");
  assert.deepEqual(
    manifest.sources.filter((source) => source.repository === "dinkuskit/.github").map((source) => source.path).sort(),
    ["ROADMAP.md", "VISION.md"]
  );
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

test("org context admission rejects other files from the same repository", async () => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "dinkus-context-reject-"));
  try {
    await mkdir(path.join(temporaryRoot, "src"));
    await mkdir(path.join(temporaryRoot, "corpus"));
    await copyFile(new URL("../src/corpus.js", import.meta.url), path.join(temporaryRoot, "src", "corpus.js"));
    const baseManifest = JSON.parse(await readFile(new URL("../corpus/manifest.json", import.meta.url), "utf8"));
    for (const documentPath of ["CONTRIBUTING.md", "LICENSE-DOCUMENTS.md", "profile/README.md", "docs/VISION.md"]) {
      const manifest = structuredClone(baseManifest);
      const source = manifest.sources.find((entry) => entry.repository === "dinkuskit/.github");
      source.path = documentPath;
      source.provenance = `https://github.com/${source.repository}/blob/${source.commit}/${source.path}`;
      await writeFile(path.join(temporaryRoot, "corpus", "manifest.json"), JSON.stringify(manifest));
      const isolated = await import(`${pathToFileURL(path.join(temporaryRoot, "src", "corpus.js")).href}?context=${encodeURIComponent(documentPath)}`);
      await assert.rejects(isolated.loadManifest(), /invalid manifest source/);
    }
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
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
    await mkdir(path.join(temporaryRoot, "bin"));
    await mkdir(path.join(temporaryRoot, "src"));
    await mkdir(path.join(temporaryRoot, "corpus"));
    await copyFile(new URL("../bin/dinkus-guide", import.meta.url), path.join(temporaryRoot, "bin", "dinkus-guide"));
    await copyFile(new URL("../src/guide.js", import.meta.url), path.join(temporaryRoot, "src", "guide.js"));
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

    // Provider/output failures during syncCorpusEmbeddings propagate exit code 4
    await assert.rejects(
      isolated.syncCorpusEmbeddings(synced, {
        chunkCorpusImpl: chunkCorpus,
        batchSize: 4,
        embedTransport: (() => {
          let batch = 0;
          return async ({ inputs }) => ({
            model: (batch++ === 0) ? "qwen3-embedding:0.6b" : "qwen3-embedding:drifted",
            vectors: inputs.map(() => [1, 0.2, 0.5])
          });
        })()
      }),
      (err) => err.code === 4 && /changed model identity mid-sync/.test(err.message)
    );
    await assert.rejects(
      isolated.syncCorpusEmbeddings(synced, {
        chunkCorpusImpl: chunkCorpus,
        embedTransport: async () => ({ model: "qwen3-embedding:0.6b", vectors: [] })
      }),
      (err) => err.code === 4 && /invalid batch response/.test(err.message)
    );
    await assert.rejects(
      isolated.syncCorpusEmbeddings(synced, {
        chunkCorpusImpl: chunkCorpus,
        embedTransport: async ({ inputs }) => ({
          model: "qwen3-embedding:0.6b",
          vectors: inputs.map(() => [0, 0, 0])
        })
      }),
      (err) => err.code === 4 && /invalid vector/.test(err.message)
    );
    await assert.rejects(
      isolated.syncCorpusEmbeddings(synced, {
        chunkCorpusImpl: chunkCorpus,
        maxEmbeddingsBytes: 128,
        embedTransport: async ({ inputs }) => ({
          model: "qwen3-embedding:0.6b",
          vectors: inputs.map(() => [1, 0.2, 0.5])
        })
      }),
      (err) => err.code === 4 && /exceeds size limit/.test(err.message)
    );

    // Corrupt embeddings.json fails closed on verifyCorpus, and recovers cleanly on normal syncCorpus without embedTransport
    await writeFile(isolated.embeddingsCachePath, "{corrupt-json", "utf8");
    await assert.rejects(isolated.verifyCorpus(), /embeddings cache is not valid JSON/);
    const offlineRecovered = await isolated.syncCorpus({
      fetchImpl: async (url) => new Response(bodies.get(url))
    });
    assert.equal(offlineRecovered.embeddings, null);
    const verifiedAfterOfflineRecovery = await isolated.verifyCorpus();
    assert.equal(verifiedAfterOfflineRecovery.embeddings, null);

    // Corrupt embeddings.json also recovers cleanly on syncCorpus with embedTransport
    await writeFile(isolated.embeddingsCachePath, JSON.stringify({ version: 99, broken: true }), "utf8");
    await assert.rejects(isolated.verifyCorpus(), /embeddings cache has invalid schema/);
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

    // Empty chunks array or out-of-date chunk keys/chunkSetHash under the same corpusHash fail closed on verifyCorpus
    const validRawCached = JSON.parse(await readFile(isolated.embeddingsCachePath, "utf8"));
    await writeFile(
      isolated.embeddingsCachePath,
      JSON.stringify({ ...validRawCached, chunks: [] }),
      "utf8"
    );
    await assert.rejects(isolated.verifyCorpus(), /embeddings cache has invalid schema/);

    await writeFile(
      isolated.embeddingsCachePath,
      JSON.stringify({ ...validRawCached, chunks: validRawCached.chunks.slice(0, -1) }),
      "utf8"
    );
    await assert.rejects(
      isolated.verifyCorpus(),
      (err) => err.code === 3 && /out of date for current chunking/.test(err.message)
    );

    const driftedKeyCached = structuredClone(validRawCached);
    driftedKeyCached.chunks[0].key = "doc-1:999-1000";
    await writeFile(isolated.embeddingsCachePath, JSON.stringify(driftedKeyCached), "utf8");
    await assert.rejects(
      isolated.verifyCorpus(),
      (err) => err.code === 3 && /out of date for current chunking/.test(err.message)
    );

    await writeFile(
      isolated.embeddingsCachePath,
      JSON.stringify({ ...validRawCached, chunkSetHash: "a".repeat(64) }),
      "utf8"
    );
    await assert.rejects(
      isolated.verifyCorpus(),
      (err) => err.code === 3 && /out of date for current chunking/.test(err.message)
    );

    // Stale corpusHash returns null embeddings for offline BM25, while CLI corpus verify with configured embed endpoint fails closed
    const rawCached = structuredClone(validRawCached);
    rawCached.corpusHash = "f".repeat(64);
    await writeFile(isolated.embeddingsCachePath, JSON.stringify(rawCached), "utf8");
    const staleVerified = await isolated.verifyCorpus();
    assert.equal(staleVerified.embeddings, null);
    const { spawn } = await import("node:child_process");
    const cliVerifyWithEmbedEnv = await new Promise((resolve) => {
      const child = spawn(process.execPath, [path.join(temporaryRoot, "bin", "dinkus-guide"), "corpus", "verify", "--json"], {
        cwd: temporaryRoot,
        env: { PATH: process.env.PATH, DINKUS_GUIDE_EMBED_BASE_URL: "http://127.0.0.1:8787" }
      });
      let stdout = "";
      child.stdout.on("data", (chunk) => { stdout += chunk; });
      child.on("close", (code) => resolve({ code, value: JSON.parse(stdout) }));
    });
    assert.equal(cliVerifyWithEmbedEnv.code, 3);
    assert.match(cliVerifyWithEmbedEnv.value.error, /corpus embeddings cache is missing/);

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
