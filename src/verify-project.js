import { readFile } from "node:fs/promises";
import { ALLOWED_LAYERS, ALLOWED_STATUSES, loadManifest, manifestPath } from "./corpus.js";

const rawManifest = JSON.parse(await readFile(manifestPath, "utf8"));
for (const entry of rawManifest.sources ?? []) {
  if (!ALLOWED_LAYERS.has(entry?.layer) || !ALLOWED_STATUSES.has(entry?.status)) {
    throw new Error(`manifest source ${entry?.id ?? "unknown"} must explicitly declare valid layer and status`);
  }
}
const manifest = await loadManifest();
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
if (packageJson.license !== "MIT" || packageJson.type !== "module") throw new Error("package metadata is incomplete");
const byLayer = {};
for (const source of manifest.sources) byLayer[source.layer] = (byLayer[source.layer] ?? 0) + 1;
console.log(`project verified: ${manifest.sources.length} pinned public sources (${Object.entries(byLayer).map(([k, v]) => `${k}=${v}`).join(", ")})`);
