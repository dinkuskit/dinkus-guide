import { readFile } from "node:fs/promises";
import path from "node:path";
import { ALLOWED_LAYERS, ALLOWED_STATUSES, APPROVED_REPOSITORIES, loadManifest, manifestPath, root } from "./corpus.js";
import { ALLOWED_CATEGORIES, validateSuite } from "../bin/dinkus-guide-eval";

function normalizeQuestion(value) {
  return String(value ?? "").toLowerCase().replace(/\s+/g, " ").trim();
}

function verifySuiteCoverage(label, suite, minCases, maxCases, expectedRole, sourceById) {
  if (suite.role !== expectedRole) {
    throw new Error(`${label} must declare role="${expectedRole}"`);
  }
  if (suite.cases.length < minCases || suite.cases.length > maxCases) {
    throw new Error(`${label} must contain ${minCases}-${maxCases} cases (got ${suite.cases.length})`);
  }
  const categories = new Set(suite.cases.map((item) => item.category));
  for (const cat of ALLOWED_CATEGORIES) {
    if (!categories.has(cat)) {
      throw new Error(`${label} is missing required category: ${cat}`);
    }
  }
  const coveredRepos = new Set();
  for (const item of suite.cases) {
    for (const src of [...(item.sources ?? []), ...(item.anyOfSources ?? []).flat()]) {
      const entry = sourceById.get(src);
      if (entry?.repository) coveredRepos.add(entry.repository);
    }
  }
  for (const repo of APPROVED_REPOSITORIES) {
    if (!coveredRepos.has(repo)) {
      throw new Error(`${label} is missing repository coverage for ${repo}`);
    }
  }
}

const rawManifest = JSON.parse(await readFile(manifestPath, "utf8"));
for (const entry of rawManifest.sources ?? []) {
  if (!ALLOWED_LAYERS.has(entry?.layer) || !ALLOWED_STATUSES.has(entry?.status)) {
    throw new Error(`manifest source ${entry?.id ?? "unknown"} must explicitly declare valid layer and status`);
  }
}
const manifest = await loadManifest();
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
if (packageJson.license !== "MIT" || packageJson.type !== "module") throw new Error("package metadata is incomplete");

const sourceById = new Map(manifest.sources.map((source) => [source.id, source]));
const manifestIds = new Set(sourceById.keys());

const devSuite = validateSuite(
  JSON.parse(await readFile(path.join(root, "eval", "cases.json"), "utf8")),
  { manifestIds, requireCategories: true }
);
const holdoutSuite = validateSuite(
  JSON.parse(await readFile(path.join(root, "eval", "holdout.json"), "utf8")),
  { manifestIds, requireCategories: true }
);

verifySuiteCoverage("eval/cases.json", devSuite, 60, 75, "development", sourceById);
verifySuiteCoverage("eval/holdout.json", holdoutSuite, 25, 30, "locked_promotion_exam", sourceById);
if (typeof holdoutSuite.policy !== "string" || !/Rung 3/i.test(holdoutSuite.policy) || !/Rung 4/i.test(holdoutSuite.policy)) {
  throw new Error("eval/holdout.json must declare its Rung 3 / Rung 4 locked promotion exam policy");
}

const devIds = new Set(devSuite.cases.map((item) => item.id));
const devQuestions = new Set(devSuite.cases.map((item) => normalizeQuestion(item.question)));
for (const item of holdoutSuite.cases) {
  if (devIds.has(item.id)) {
    throw new Error(`duplicate case id across dev and holdout suites: ${item.id}`);
  }
  if (devQuestions.has(normalizeQuestion(item.question))) {
    throw new Error(`duplicate question across dev and holdout suites: ${item.id}`);
  }
}

const byLayer = {};
for (const source of manifest.sources) byLayer[source.layer] = (byLayer[source.layer] ?? 0) + 1;
console.log(
  `project verified: ${manifest.sources.length} pinned public sources (${Object.entries(byLayer).map(([k, v]) => `${k}=${v}`).join(", ")}); ` +
  `dev=${devSuite.cases.length} cases, holdout=${holdoutSuite.cases.length} cases`
);
