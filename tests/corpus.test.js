import assert from "node:assert/strict";
import { test } from "node:test";
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
