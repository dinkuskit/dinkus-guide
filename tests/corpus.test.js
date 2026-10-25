import assert from "node:assert/strict";
import { copyFile, mkdtemp, mkdir, realpath, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";
import { loadManifest, syncCorpus } from "../src/corpus.js";

test("manifest admits only the frozen source shape", async () => {
  const manifest = await loadManifest();
  assert.equal(manifest.sources.length, 15);
  assert.ok(manifest.sources.every((source) => /^[a-f0-9]{40}$/.test(source.commit)));
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
