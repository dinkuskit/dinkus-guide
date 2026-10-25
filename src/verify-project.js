import { readFile } from "node:fs/promises";
import { loadManifest } from "./corpus.js";

const manifest = await loadManifest();
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url)));
if (packageJson.license !== "MIT" || packageJson.type !== "module") throw new Error("package metadata is incomplete");
if (manifest.sources.some((source) => source.repository === "dinkuskit/blocks" && source.id !== "blocks-retirement")) {
  throw new Error("unexpected blocks source");
}
console.log(`project verified: ${manifest.sources.length} pinned public sources`);
