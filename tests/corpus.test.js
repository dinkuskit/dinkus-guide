import assert from "node:assert/strict";
import { copyFile, mkdtemp, mkdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";
import { loadManifest, syncCorpus } from "../src/corpus.js";

test("manifest admits only the frozen source shape", async () => {
  const manifest = await loadManifest();
  assert.equal(manifest.sources.length, 15);
  assert.ok(manifest.sources.every((source) => /^[a-f0-9]{40}$/.test(source.commit)));
  assert.ok(manifest.sources.every((source) => source.repository !== "dinkuskit/blocks"));
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
