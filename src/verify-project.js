import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { ALLOWED_LAYERS, ALLOWED_STATUSES, APPROVED_REPOSITORIES, loadManifest, manifestPath, root } from "./corpus.js";
import { APPROVED_EVAL_REPOSITORIES, validateSuite, verifySuiteStratification } from "../bin/dinkus-guide-eval";

const rawManifest = JSON.parse(await readFile(manifestPath, "utf8"));
for (const entry of rawManifest.sources ?? []) {
  if (!ALLOWED_LAYERS.has(entry?.layer) || !ALLOWED_STATUSES.has(entry?.status)) {
    throw new Error(`manifest source ${entry?.id ?? "unknown"} must explicitly declare valid layer and status`);
  }
}
const manifest = await loadManifest();
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
if (packageJson.license !== "MIT" || packageJson.type !== "module") throw new Error("package metadata is incomplete");

const evalRepoSet = new Set(APPROVED_EVAL_REPOSITORIES);
if (evalRepoSet.size !== APPROVED_REPOSITORIES.size || [...APPROVED_REPOSITORIES].some((repo) => !evalRepoSet.has(repo))) {
  throw new Error("evaluator APPROVED_EVAL_REPOSITORIES is out of sync with corpus APPROVED_REPOSITORIES");
}

const evalEntries = await readdir(path.join(root, "eval"));
for (const name of evalEntries) {
  if (name !== "cases.json") {
    throw new Error(`public eval/ directory must contain only development cases.json (found ${name}); keep unseen holdout material external`);
  }
}

const sourceById = new Map(manifest.sources.map((source) => [source.id, source]));
const manifestIds = new Set(sourceById.keys());

const devSuite = validateSuite(
  JSON.parse(await readFile(path.join(root, "eval", "cases.json"), "utf8")),
  { manifestIds, sourceRepositories: sourceById, requireCategories: true }
);

verifySuiteStratification("eval/cases.json", devSuite, {
  minCases: 60,
  maxCases: 75,
  expectedRole: "development",
  sourceRepositories: sourceById,
  requiredRepositories: [...APPROVED_REPOSITORIES]
});

const byLayer = {};
for (const source of manifest.sources) byLayer[source.layer] = (byLayer[source.layer] ?? 0) + 1;
console.log(
  `project verified: ${manifest.sources.length} pinned public sources (${Object.entries(byLayer).map(([k, v]) => `${k}=${v}`).join(", ")}); ` +
  `dev=${devSuite.cases.length} cases (unseen holdout isolated outside public repo)`
);
