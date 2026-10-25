import { readFile } from "node:fs/promises";
import { loadManifest } from "./corpus.js";

const manifest = await loadManifest();
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url)));
if (packageJson.license !== "MIT" || packageJson.type !== "module") throw new Error("package metadata is incomplete");
console.log(`project verified: ${manifest.sources.length} pinned public sources`);
