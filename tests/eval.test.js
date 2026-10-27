import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { copyFile, mkdtemp, mkdir, readdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import http from "node:http";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { APPROVED_REPOSITORIES, loadManifest, root } from "../src/corpus.js";
import {
  ALLOWED_ABSTENTION_TOKENS,
  ALLOWED_CATEGORIES,
  FAILURE_BUCKETS,
  assertSuitesDisjoint,
  computeRecallCase,
  isInsideRoot,
  loadCorpusSources,
  scoreGuideRun,
  summarizeSuiteResults,
  validateSuite,
  verifyAbstentionAnswer,
  verifyCitationSpan
} from "../bin/dinkus-guide-eval";

test("public dev suite satisfies schema, stratification, guardrails, and holdout-free public repo boundary", async () => {
  const manifest = await loadManifest();
  const manifestIds = new Set(manifest.sources.map((s) => s.id));
  const sourceById = new Map(manifest.sources.map((s) => [s.id, s]));

  // Public eval/ directory must contain only cases.json so Rung 3/4 workspaces verify without holdout access
  const evalEntries = await readdir(path.join(root, "eval"));
  assert.deepEqual(evalEntries, ["cases.json"]);

  const devRaw = JSON.parse(await readFile(path.join(root, "eval", "cases.json"), "utf8"));
  const dev = validateSuite(devRaw, { manifestIds, sourceRepositories: sourceById, requireCategories: true });

  assert.equal(dev.role, "development");
  assert.ok(dev.cases.length >= 60 && dev.cases.length <= 75, `expected 60-75 dev cases, got ${dev.cases.length}`);

  const categories = new Set(dev.cases.map((c) => c.category));
  assert.deepEqual(categories, ALLOWED_CATEGORIES, "dev missing required categories");
  const repos = new Set();
  for (const c of dev.cases) {
    for (const src of [...(c.sources ?? []), ...(c.anyOfSources ?? []).flat()]) {
      repos.add(sourceById.get(src)?.repository);
    }
  }
  for (const repo of APPROVED_REPOSITORIES) {
    assert.equal(repos.has(repo), true, `dev missing repository ${repo}`);
  }

  // Core-principle guardrails: unbuilt standalone Payments direction, transition traps, and dinkus-guide boundary
  assert.ok(dev.cases.some((c) =>
    c.sources?.includes("payments-charter") &&
    c.facts.some((f) => /not yet built/i.test(f))
  ));
  assert.ok(dev.cases.some((c) =>
    c.category === "transition_trap" &&
    c.forbiddenFacts?.includes("@dinkuskit/blocks") &&
    c.forbiddenFacts?.includes("dinkusBlocks")
  ));
  assert.ok(dev.cases.some((c) =>
    c.category === "transition_trap" &&
    c.forbiddenFacts?.includes("isolated-ship")
  ));
  assert.ok(dev.cases.some((c) =>
    c.abstain === true && /dinkus-?guide/i.test(c.question)
  ));

  // External holdout lock documentation + evaluator separation check
  const readme = await readFile(path.join(root, "README.md"), "utf8");
  const evalDoc = await readFile(path.join(root, "docs", "evaluation.md"), "utf8");
  assert.match(readme, /DINKUS_GUIDE_HOLDOUT_SUITE/);
  assert.match(readme, /Rung 3/);
  assert.match(readme, /Rung 4/);
  assert.match(evalDoc, /locked_promotion_exam/);
  assert.match(evalDoc, /Rung 3/);
  assert.match(evalDoc, /Rung 4/);

  const evalBinSource = await readFile(path.join(root, "bin", "dinkus-guide-eval"), "utf8");
  assert.doesNotMatch(evalBinSource, /from\s+["']\.\.\/src\//);
});

test("external locked_promotion_exam validation and assertSuitesDisjoint enforce 25-30 cases, repo stratification, policy, and zero overlap", async () => {
  const manifest = await loadManifest();
  const manifestIds = new Set(manifest.sources.map((s) => s.id));
  const sourceById = new Map(manifest.sources.map((s) => [s.id, s]));
  const devSuite = JSON.parse(await readFile(path.join(root, "eval", "cases.json"), "utf8"));

  // Pick one manifest source per approved repository for synthetic stratification checks
  const oneSourcePerRepo = [];
  for (const repo of APPROVED_REPOSITORIES) {
    const found = manifest.sources.find((s) => s.repository === repo);
    assert.ok(found, `expected source for ${repo}`);
    oneSourcePerRepo.push(found.id);
  }

  const syntheticHoldoutCases = [];
  const categories = [...ALLOWED_CATEGORIES];
  for (let i = 0; i < 26; i += 1) {
    const category = categories[i % categories.length];
    const abstain = category === "honest_abstention" || category === "boundary_refusal";
    syntheticHoldoutCases.push({
      id: `synth-holdout-${i + 1}`,
      category,
      question: `Synthetic unseen promotion question number ${i + 1}?`,
      abstain,
      expectedStatus: abstain ? "insufficient_evidence" : "answered",
      facts: abstain ? [] : ["alpha", "beta"],
      sources: abstain ? [] : [oneSourcePerRepo[i % oneSourcePerRepo.length]]
    });
  }

  const validHoldout = {
    version: 4,
    suite: "synthetic-holdout-v4",
    role: "locked_promotion_exam",
    policy: "Rung 3 optimizers and Rung 4 LoRA generators must never access this external exam.",
    cases: syntheticHoldoutCases
  };

  assert.doesNotThrow(() => validateSuite(validHoldout, { manifestIds, sourceRepositories: sourceById }));
  assert.equal(assertSuitesDisjoint(validHoldout, devSuite), true);

  // Reject under-sized promotion exam (< 25 cases)
  assert.throws(
    () => validateSuite({ ...validHoldout, cases: syntheticHoldoutCases.slice(0, 10) }, { manifestIds, sourceRepositories: sourceById }),
    /must contain 25-30 cases/
  );

  // Reject missing Rung 3 / Rung 4 policy text
  assert.throws(
    () => validateSuite({ ...validHoldout, policy: "do not read" }, { manifestIds, sourceRepositories: sourceById }),
    /Rung 3 \/ Rung 4/
  );

  // Reject missing repository coverage
  const singleRepoCases = syntheticHoldoutCases.map((c) => (c.abstain ? c : { ...c, sources: [oneSourcePerRepo[0]] }));
  assert.throws(
    () => validateSuite({ ...validHoldout, cases: singleRepoCases }, { manifestIds, sourceRepositories: sourceById }),
    /missing repository coverage/
  );

  // Reject duplicate ID across suites
  assert.throws(
    () => assertSuitesDisjoint(
      { ...validHoldout, cases: [{ ...syntheticHoldoutCases[0], id: devSuite.cases[0].id }] },
      devSuite
    ),
    /duplicate case id/
  );

  // Reject duplicate normalized question across suites (case + whitespace insensitive)
  assert.throws(
    () => assertSuitesDisjoint(
      { ...validHoldout, cases: [{ ...syntheticHoldoutCases[0], question: `  ${devSuite.cases[0].question.toUpperCase()}  ` }] },
      devSuite
    ),
    /duplicate question/
  );
});

test("flexible citation scoring supports mandatory sources and anyOfSources groups in recall and run grading", () => {
  const corpusSources = new Map([
    ["kit-getting-started", { id: "kit-getting-started", layer: "dinkuskit", lines: ["# Getting started", "Run pnpm dev to launch."] }],
    ["template-setup", { id: "template-setup", layer: "dinkuskit", lines: ["# Template setup", "Run pnpm dev with DINKUS_STOREFRONT_PROFILE=proof."] }],
    ["commerce-cli-spec", { id: "commerce-cli-spec", layer: "dinkuskit", lines: ["# Commerce CLI", "Uses catalog/public route."] }]
  ]);

  const multiGroupCase = {
    id: "cross-pairing",
    category: "cross_plugin",
    question: "How do Template Store and Commerce pair?",
    abstain: false,
    facts: ["pnpm dev", "catalog/public"],
    sources: ["commerce-cli-spec"],
    anyOfSources: [["kit-getting-started", "template-setup"]]
  };

  const recallPass = computeRecallCase(multiGroupCase, [
    { sourceId: "template-setup", excerpt: "Run pnpm dev" },
    { sourceId: "commerce-cli-spec", excerpt: "Uses catalog/public route." }
  ], 12);
  assert.equal(recallPass.sourceHit, true);
  assert.equal(recallPass.groupsMatched, 1);
  assert.equal(recallPass.groupsRequired, 1);
  assert.equal(recallPass.hit, true);

  const recallMissingGroup = computeRecallCase(multiGroupCase, [
    { sourceId: "commerce-cli-spec", excerpt: "Run pnpm dev and catalog/public" }
  ], 12);
  assert.equal(recallMissingGroup.sourceHit, false);
  assert.equal(recallMissingGroup.failureBucket, "retrieval_miss");

  const runPassViaSibling = scoreGuideRun(multiGroupCase, {
    code: 0,
    value: {
      status: "answered",
      answer: "Use pnpm dev with catalog/public.",
      citations: [
        { sourceId: "template-setup", startLine: 1, endLine: 2 },
        { sourceId: "commerce-cli-spec", startLine: 1, endLine: 2 }
      ]
    }
  }, { corpusSources, recallCase: recallPass });
  assert.equal(runPassViaSibling.pass, true);
  assert.equal(runPassViaSibling.citationPass, true);
  assert.equal(runPassViaSibling.citationsMatched, 2);
  assert.equal(runPassViaSibling.citationsRequired, 2);

  const runMissingAnyOfGroup = scoreGuideRun(multiGroupCase, {
    code: 0,
    value: {
      status: "answered",
      answer: "Use pnpm dev with catalog/public.",
      citations: [{ sourceId: "commerce-cli-spec", startLine: 1, endLine: 2 }]
    }
  }, { corpusSources, recallCase: recallPass });
  assert.equal(runMissingAnyOfGroup.pass, false);
  assert.equal(runMissingAnyOfGroup.factPass, true);
  assert.equal(runMissingAnyOfGroup.citationPass, false);
  assert.equal(runMissingAnyOfGroup.failureBucket, "citation_miss");
});

test("forbiddenFacts fails case-insensitively on answer claims while ignoring extractive question echo", () => {
  const corpusSources = new Map([
    ["template-blocks-transition", {
      id: "template-blocks-transition",
      layer: "transition",
      lines: ["# Transition", "Use first-class pages.layout blocks instead of @dinkuskit/blocks."]
    }]
  ]);
  const trapCase = {
    id: "trap-blocks",
    category: "transition_trap",
    question: "How did @dinkuskit/blocks transition to pages.layout?",
    abstain: false,
    facts: ["first-class", "pages.layout"],
    forbiddenFacts: ["@dinkuskit/blocks", "dinkusBlocks"],
    sources: ["template-blocks-transition"]
  };
  const recallHit = { sourceHit: true, hit: true };

  // Model answer containing forbidden substring (mixed case) fails with fact_miss + forbiddenClaim
  const modelForbidden = scoreGuideRun(trapCase, {
    code: 0,
    value: {
      status: "answered",
      answer: "Install @DinkusKit/Blocks on pages.layout for first-class blocks.",
      citations: [{ sourceId: "template-blocks-transition", startLine: 1, endLine: 2 }]
    }
  }, { corpusSources, recallCase: recallHit });
  assert.equal(modelForbidden.pass, false);
  assert.equal(modelForbidden.forbiddenPass, false);
  assert.equal(modelForbidden.forbiddenClaim, true);
  assert.deepEqual(modelForbidden.forbiddenMatched, ["@dinkuskit/blocks"]);
  assert.equal(modelForbidden.failureBucket, "fact_miss");

  // Clean model answer passes even when the cited on-disk transition doc mentions the retired name
  const modelClean = scoreGuideRun(trapCase, {
    code: 0,
    value: {
      status: "answered",
      answer: "Use first-class pages.layout blocks in EmDash.",
      citations: [{ sourceId: "template-blocks-transition", startLine: 1, endLine: 2 }]
    }
  }, { corpusSources, recallCase: recallHit });
  assert.equal(modelClean.pass, true);
  assert.equal(modelClean.forbiddenPass, true);

  // Extractive mode's literal echoed question prefix does not falsely trigger forbiddenFacts
  const extractiveEchoRun = scoreGuideRun(trapCase, {
    code: 0,
    value: {
      status: "answered",
      answer: `Relevant pinned source passages for: ${trapCase.question}`,
      citations: [{ sourceId: "template-blocks-transition", startLine: 1, endLine: 2 }]
    }
  }, { corpusSources, recallCase: recallHit });
  assert.equal(extractiveEchoRun.forbiddenPass, true);
  assert.equal(extractiveEchoRun.pass, true);
});

test("verifiable citation span checker enforces manifest membership, line bounds, and exact on-disk span fact support", () => {
  const corpusSources = new Map([
    ["doc-bounds", {
      id: "doc-bounds",
      layer: "dinkuskit",
      lines: [
        "# Header",
        "Line two has alpha token.",
        "Line three has beta token.",
        "Line four has uncited-secret-fact."
      ]
    }]
  ]);

  assert.deepEqual(verifyCitationSpan({ sourceId: "unknown-doc", startLine: 1, endLine: 1 }, corpusSources), {
    valid: false,
    reason: "unknown_source_id"
  });
  assert.deepEqual(verifyCitationSpan({ sourceId: "doc-bounds", startLine: 0, endLine: 2 }, corpusSources), {
    valid: false,
    reason: "invalid_line_range"
  });
  assert.deepEqual(verifyCitationSpan({ sourceId: "doc-bounds", startLine: 3, endLine: 2 }, corpusSources), {
    valid: false,
    reason: "invalid_line_range"
  });
  assert.deepEqual(verifyCitationSpan({ sourceId: "doc-bounds", startLine: 1, endLine: 5 }, corpusSources), {
    valid: false,
    reason: "line_out_of_bounds"
  });
  const okSpan = verifyCitationSpan({ sourceId: "doc-bounds", startLine: 2, endLine: 3 }, corpusSources);
  assert.equal(okSpan.valid, true);
  assert.equal(okSpan.text, "Line two has alpha token.\nLine three has beta token.");

  const lookupCase = {
    id: "span-check",
    category: "lookup",
    question: "What tokens are on lines two and three?",
    abstain: false,
    facts: ["alpha token", "beta token"],
    sources: ["doc-bounds"]
  };
  const outOfBoundsRun = scoreGuideRun(lookupCase, {
    code: 0,
    value: {
      status: "answered",
      answer: "It has alpha token and beta token.",
      citations: [{ sourceId: "doc-bounds", startLine: 1, endLine: 99 }]
    }
  }, { corpusSources, recallCase: { sourceHit: true, hit: true } });
  assert.equal(outOfBoundsRun.pass, false);
  assert.equal(outOfBoundsRun.citationSpanValid, false);
  assert.equal(outOfBoundsRun.invalidCitations, 1);
  assert.equal(outOfBoundsRun.failureBucket, "citation_miss");

  // Fact present only on uncited line 4 must NOT satisfy required facts when citing lines 1..2
  const uncitedFactCase = {
    ...lookupCase,
    facts: ["alpha token", "uncited-secret-fact"]
  };
  const uncitedFactRun = scoreGuideRun(uncitedFactCase, {
    code: 0,
    value: {
      status: "answered",
      answer: "See line two.",
      citations: [{ sourceId: "doc-bounds", startLine: 1, endLine: 2 }]
    }
  }, { corpusSources, recallCase: { sourceHit: true, hit: true } });
  assert.equal(uncitedFactRun.pass, false);
  assert.equal(uncitedFactRun.citationSpanValid, true);
  assert.equal(uncitedFactRun.failureBucket, "fact_miss");
});

test("all 5 failure buckets classify deterministically and aggregate across category and layer", () => {
  assert.deepEqual(FAILURE_BUCKETS, [
    "retrieval_miss",
    "schema_error",
    "abstention_error",
    "citation_miss",
    "fact_miss"
  ]);

  const corpusSources = new Map([
    ["dk-doc", { id: "dk-doc", layer: "dinkuskit", lines: ["# DK", "alpha beta"] }],
    ["em-doc", { id: "em-doc", layer: "emdash", lines: ["# EM", "gamma delta"] }]
  ]);

  const cases = [
    { id: "c-ret", category: "lookup", question: "q1", abstain: false, facts: ["alpha", "beta"], sources: ["dk-doc"] },
    { id: "c-sch", category: "workflow", question: "q2", abstain: false, facts: ["alpha", "beta"], sources: ["dk-doc"] },
    { id: "c-abs-false-neg", category: "lookup", question: "q3", abstain: false, facts: ["alpha", "beta"], sources: ["dk-doc"] },
    { id: "c-abs-false-pos", category: "honest_abstention", question: "q4", abstain: true, facts: [], sources: [] },
    { id: "c-cit", category: "cross_plugin", question: "q5", abstain: false, facts: ["alpha", "gamma"], sources: ["dk-doc", "em-doc"] },
    { id: "c-fact", category: "transition_trap", question: "q6", abstain: false, facts: ["alpha", "beta"], forbiddenFacts: ["legacy-pkg"], sources: ["dk-doc"] },
    { id: "c-pass", category: "lookup", question: "q7", abstain: false, facts: ["gamma", "delta"], sources: ["em-doc"] }
  ];

  const scored = [
    scoreGuideRun(cases[0], {
      code: 0,
      value: { status: "insufficient_evidence", answer: "No evidence.", citations: [] }
    }, { corpusSources, recallCase: { sourceHit: false, hit: false } }),
    scoreGuideRun(cases[1], {
      code: 4,
      value: { status: "error", error: "provider returned malformed JSON" }
    }, { corpusSources, recallCase: { sourceHit: true, hit: true } }),
    scoreGuideRun(cases[2], {
      code: 0,
      value: { status: "insufficient_evidence", answer: "Abstaining despite retrieval.", citations: [] }
    }, { corpusSources, recallCase: { sourceHit: true, hit: true } }),
    scoreGuideRun(cases[3], {
      code: 0,
      value: { status: "answered", answer: "Hallucinated setup.", citations: [{ sourceId: "dk-doc", startLine: 1, endLine: 2 }] }
    }, { corpusSources }),
    scoreGuideRun(cases[4], {
      code: 0,
      value: { status: "answered", answer: "alpha and gamma", citations: [{ sourceId: "dk-doc", startLine: 1, endLine: 2 }] }
    }, { corpusSources, recallCase: { sourceHit: true, hit: true } }),
    scoreGuideRun(cases[5], {
      code: 0,
      value: { status: "answered", answer: "Use legacy-pkg for alpha beta.", citations: [{ sourceId: "dk-doc", startLine: 1, endLine: 2 }] }
    }, { corpusSources, recallCase: { sourceHit: true, hit: true } }),
    scoreGuideRun(cases[6], {
      code: 0,
      value: { status: "answered", answer: "gamma delta", citations: [{ sourceId: "em-doc", startLine: 1, endLine: 2 }] }
    }, { corpusSources, recallCase: { sourceHit: true, hit: true } })
  ];

  assert.equal(scored[0].failureBucket, "retrieval_miss");
  assert.equal(scored[1].failureBucket, "schema_error");
  assert.equal(scored[2].failureBucket, "abstention_error");
  assert.equal(scored[3].failureBucket, "abstention_error");
  assert.equal(scored[4].failureBucket, "citation_miss");
  assert.equal(scored[5].failureBucket, "fact_miss");
  assert.equal(scored[5].forbiddenClaim, true);
  assert.equal(scored[6].failureBucket, null);
  assert.equal(scored[6].pass, true);

  const summary = summarizeSuiteResults(cases, scored, corpusSources);
  assert.equal(summary.total, 7);
  assert.equal(summary.passed, 1);
  assert.equal(summary.failed, 6);
  assert.equal(summary.forbiddenClaims, 1);
  assert.deepEqual(summary.failureBuckets, {
    retrieval_miss: 1,
    schema_error: 1,
    abstention_error: 2,
    citation_miss: 1,
    fact_miss: 1
  });
  const bucketTotal = Object.values(summary.failureBuckets).reduce((acc, n) => acc + n, 0);
  assert.equal(bucketTotal, summary.failed);
  assert.equal(summary.byLayer.cross_layer.failureBuckets.citation_miss, 1);
  assert.equal(summary.byLayer.abstention.failureBuckets.abstention_error, 1);
  assert.equal(summary.byCategory.workflow.failureBuckets.schema_error, 1);
});

test("CLI supports corpus embed, external --suite, --check-disjoint, --summary-only redaction, and schema_error bucketing", async () => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "dinkus-guide-rung2-cli-"));
  const externalHoldoutDir = await mkdtemp(path.join(os.tmpdir(), "dinkus-guide-rung2-ext-"));
  const server = http.createServer(async (req, res) => {
    let body = "";
    for await (const chunk of req) body += chunk;
    const parsed = JSON.parse(body || "{}");
    if (req.url === "/v1/embeddings") {
      const inputs = parsed.input ?? [];
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({
        model: "qwen3-embedding-mock",
        data: inputs.map((text, index) => ({
          index,
          embedding: /ship|pitney/i.test(text) ? [0.95, 0.05] : [0.1, 0.9]
        }))
      }));
      return;
    }
    if (req.url === "/v1/chat/completions") {
      const prompt = parsed.messages?.[0]?.content ?? "";
      res.writeHead(200, { "content-type": "application/json" });
      if (/QUESTION:\nHow do I launch local template store 2\?/.test(prompt)) {
        res.end(JSON.stringify({
          model: "nemotron-3.5-super-vl-mock",
          choices: [{ message: { content: "not-valid-json" } }]
        }));
      } else {
        res.end(JSON.stringify({
          model: "nemotron-3.5-super-vl-mock",
          choices: [{
            message: {
              content: JSON.stringify({
                status: "answered",
                answer: "Pitney Bowes webhook uses X-PB-ReferenceId.",
                citationIds: ["E1"]
              })
            }
          }]
        }));
      }
      return;
    }
    res.writeHead(404);
    res.end();
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  const loopbackUrl = `http://127.0.0.1:${port}`;

  try {
    await mkdir(path.join(temporaryRoot, "bin"));
    await mkdir(path.join(temporaryRoot, "src"));
    await mkdir(path.join(temporaryRoot, "corpus"));
    await mkdir(path.join(temporaryRoot, "eval"));
    await mkdir(path.join(temporaryRoot, ".cache", "dinkus-guide", "sources"), { recursive: true });
    await copyFile(new URL("../bin/dinkus-guide", import.meta.url), path.join(temporaryRoot, "bin", "dinkus-guide"));
    await copyFile(new URL("../bin/dinkus-guide-eval", import.meta.url), path.join(temporaryRoot, "bin", "dinkus-guide-eval"));
    await copyFile(new URL("../src/guide.js", import.meta.url), path.join(temporaryRoot, "src", "guide.js"));
    await copyFile(new URL("../src/corpus.js", import.meta.url), path.join(temporaryRoot, "src", "corpus.js"));

    const commit = "0123456789012345678901234567890123456789";
    const mockRepos = [
      "dinkuskit/ship",
      "dinkuskit/template-store",
      "dinkuskit/template-store",
      "dinkuskit/dinkuskit",
      "dinkuskit/commerce",
      "dinkuskit/payments",
      "dinkuskit/inventory",
      "emdash-cms/emdash",
      "dinkuskit/template-store",
      "dinkuskit/ship"
    ];
    const sources = [];
    for (let idx = 1; idx <= 10; idx += 1) {
      const id = `doc-${String(idx).padStart(2, "0")}`;
      const content = idx === 1
        ? "# Pitney Bowes tracking\nPitney Bowes webhook uses X-PB-ReferenceId.\n"
        : `# Store doc ${idx}\nRun pnpm dev to launch local template store ${idx}.\n`;
      const sha256 = createHash("sha256").update(content).digest("hex");
      const repo = mockRepos[idx - 1];
      const layer = repo === "emdash-cms/emdash" ? "emdash" : "dinkuskit";
      sources.push({
        id,
        repository: repo,
        layer,
        status: "active",
        commit,
        path: `docs/${id}.md`,
        sha256,
        license: "MIT",
        provenance: `https://github.com/${repo}/blob/${commit}/docs/${id}.md`
      });
      await writeFile(path.join(temporaryRoot, ".cache", "dinkus-guide", "sources", `${id}.md`), content, "utf8");
    }
    await writeFile(path.join(temporaryRoot, "corpus", "manifest.json"), JSON.stringify({ version: 1, sources }));

    const devSuitePath = path.join(temporaryRoot, "eval", "cases.json");
    await writeFile(devSuitePath, JSON.stringify({
      version: 4,
      suite: "mini-dev-v4",
      cases: [
        {
          id: "dev-store-3",
          category: "workflow",
          question: "How do I launch local template store 3?",
          abstain: false,
          facts: ["pnpm dev", "template store 3"],
          sources: ["doc-03"]
        }
      ]
    }));

    const externalSuitePath = path.join(externalHoldoutDir, "secret-promotion-exam.json");
    const externalSuiteRaw = JSON.stringify({
      version: 4,
      suite: "custom-holdout-v4",
      cases: [
        {
          id: "secret-pb-lookup-id",
          category: "lookup",
          question: "What header does Pitney Bowes tracking webhook use?",
          abstain: false,
          facts: ["Pitney Bowes", "X-PB-ReferenceId"],
          anyOfSources: [["doc-01", "doc-02"]]
        },
        {
          id: "secret-malformed-model-case-id",
          category: "workflow",
          question: "How do I launch local template store 2?",
          abstain: false,
          facts: ["pnpm dev", "template store 2"],
          sources: ["doc-02"]
        }
      ]
    });
    const expectedExternalSha = createHash("sha256").update(externalSuiteRaw, "utf8").digest("hex");
    await writeFile(externalSuitePath, externalSuiteRaw);

    const runBin = (binName, cliArgs, extraEnv = {}) => new Promise((resolve) => {
      const child = spawn(process.execPath, [path.join(temporaryRoot, "bin", binName), ...cliArgs], {
        cwd: temporaryRoot,
        env: { PATH: process.env.PATH, ...extraEnv }
      });
      let stdout = "", stderr = "";
      child.stdout.on("data", (chunk) => { stdout += chunk; });
      child.stderr.on("data", (chunk) => { stderr += chunk; });
      child.on("close", (code) => resolve({ code, stdout, stderr, value: stdout ? JSON.parse(stdout) : null }));
    });

    // corpus embed without DINKUS_GUIDE_EMBED_BASE_URL fails closed with exit 4
    const embedMissingEnv = await runBin("dinkus-guide", ["corpus", "embed", "--json"]);
    assert.equal(embedMissingEnv.code, 4);
    assert.match(embedMissingEnv.value.error, /DINKUS_GUIDE_EMBED_BASE_URL/);

    // corpus embed with loopback endpoint builds embeddings.json cleanly
    const embedOk = await runBin("dinkus-guide", ["corpus", "embed", "--json"], {
      DINKUS_GUIDE_EMBED_BASE_URL: loopbackUrl,
      DINKUS_GUIDE_EMBED_MODEL: "qwen3-embedding"
    });
    assert.equal(embedOk.code, 0);
    assert.equal(embedOk.value.status, "verified");
    assert.equal(embedOk.value.embeddings.modelIdentity, "qwen3-embedding-mock");
    assert.equal(embedOk.value.embeddings.chunks, 10);

    const loadedSources = await loadCorpusSources(temporaryRoot);
    assert.equal(loadedSources.size, 10);

    // --mode retrieval with --suite, --check-disjoint, and --summary-only omits per-case IDs/questions and redacts external suite + path
    const summaryRetrievalRun = await runBin("dinkus-guide-eval", [
      "run", "--suite", externalSuitePath, "--check-disjoint", "eval/cases.json", "--summary-only", "--mode", "retrieval", "--json"
    ], {
      DINKUS_GUIDE_EMBED_BASE_URL: loopbackUrl,
      DINKUS_GUIDE_EMBED_MODEL: "qwen3-embedding"
    });
    assert.equal(summaryRetrievalRun.code, 0);
    assert.equal(summaryRetrievalRun.value.suite, "<external-suite>");
    assert.equal(summaryRetrievalRun.value.suiteFile, "<external-suite>");
    assert.equal(summaryRetrievalRun.value.summaryOnly, true);
    assert.equal(summaryRetrievalRun.value.suiteSha256, expectedExternalSha);
    assert.equal(summaryRetrievalRun.value.disjointFrom.length, 1);
    assert.equal(summaryRetrievalRun.value.disjointFrom[0].suiteFile, "eval/cases.json");
    assert.equal(summaryRetrievalRun.value.recall.hits, 2);
    assert.equal(summaryRetrievalRun.value.recall.cases, undefined);
    assert.equal(summaryRetrievalRun.value.results, undefined);
    assert.doesNotMatch(summaryRetrievalRun.stdout, /custom-holdout-v4/);
    assert.doesNotMatch(summaryRetrievalRun.stdout, /secret-pb-lookup-id/);
    assert.doesNotMatch(summaryRetrievalRun.stdout, /secret-promotion-exam/);
    assert.doesNotMatch(summaryRetrievalRun.stdout, /Pitney Bowes/);

    // --check-disjoint fails closed with exit 2 when suites overlap AND redacts hidden case IDs/questions/suite labels on stdout and stderr
    const overlapRun = await runBin("dinkus-guide-eval", [
      "run", "--suite", externalSuitePath, "--check-disjoint", externalSuitePath, "--summary-only", "--json"
    ]);
    assert.equal(overlapRun.code, 2);
    assert.match(overlapRun.value.error, /disjointness check failed \(<external-suite>\): duplicate case id detected across compared suites/);
    for (const stream of [overlapRun.stdout, overlapRun.stderr]) {
      assert.doesNotMatch(stream, /secret-pb-lookup-id/);
      assert.doesNotMatch(stream, /secret-malformed-model-case-id/);
      assert.doesNotMatch(stream, /custom-holdout-v4/);
      assert.doesNotMatch(stream, /secret-promotion-exam/);
    }

    const overlapPlainRun = await runBin("dinkus-guide-eval", [
      "run", "--suite", externalSuitePath, "--check-disjoint", externalSuitePath, "--summary-only"
    ]);
    assert.equal(overlapPlainRun.code, 2);
    assert.equal(overlapPlainRun.stdout, "");
    assert.match(overlapPlainRun.stderr, /disjointness check failed \(<external-suite>\): duplicate case id detected across compared suites/);
    assert.doesNotMatch(overlapPlainRun.stderr, /secret-pb-lookup-id/);
    assert.doesNotMatch(overlapPlainRun.stderr, /custom-holdout-v4/);
    assert.doesNotMatch(overlapPlainRun.stderr, /secret-promotion-exam/);

    // Duplicate question with distinct IDs also redacts case IDs and question strings under --summary-only
    const duplicateQuestionPath = path.join(externalHoldoutDir, "secret-dup-question.json");
    await writeFile(duplicateQuestionPath, JSON.stringify({
      version: 4,
      suite: "secret-dup-question-suite",
      cases: [
        {
          id: "hidden-question-collision-id",
          category: "workflow",
          question: "How do I launch local template store 3?",
          abstain: false,
          facts: ["pnpm dev", "template store 3"],
          sources: ["doc-03"]
        }
      ]
    }));
    const questionOverlapRun = await runBin("dinkus-guide-eval", [
      "run", "--suite", duplicateQuestionPath, "--check-disjoint", "eval/cases.json", "--summary-only", "--json"
    ]);
    assert.equal(questionOverlapRun.code, 2);
    assert.match(questionOverlapRun.value.error, /duplicate question detected across compared suites/);
    for (const stream of [questionOverlapRun.stdout, questionOverlapRun.stderr]) {
      assert.doesNotMatch(stream, /hidden-question-collision-id/);
      assert.doesNotMatch(stream, /secret-dup-question/);
      assert.doesNotMatch(stream, /template store 3/);
    }

    // Malformed external suites (bad schema and unknown corpus sourceId) redact hidden case IDs, categories, and sourceIds on stdout/stderr
    const malformedSuitePath = path.join(externalHoldoutDir, "secret-malformed-suite.json");
    await writeFile(malformedSuitePath, JSON.stringify({
      version: 4,
      suite: "secret-malformed-suite-id",
      cases: [
        {
          id: "secret-bad-category-case-id",
          category: "lookup",
          question: "Secret unseen question text?",
          abstain: true,
          facts: [],
          sources: []
        }
      ]
    }));
    const malformedSummaryJson = await runBin("dinkus-guide-eval", [
      "run", "--suite", malformedSuitePath, "--summary-only", "--json"
    ]);
    assert.equal(malformedSummaryJson.code, 2);
    assert.match(malformedSummaryJson.value.error, /invalid suite \(<external-suite>\): suite case: category disagrees with abstain=true/);
    for (const stream of [malformedSummaryJson.stdout, malformedSummaryJson.stderr]) {
      assert.doesNotMatch(stream, /secret-bad-category-case-id/);
      assert.doesNotMatch(stream, /secret-malformed-suite/);
      assert.doesNotMatch(stream, /lookup/);
    }

    const unknownSourceSuitePath = path.join(externalHoldoutDir, "secret-unknown-source.json");
    await writeFile(unknownSourceSuitePath, JSON.stringify({
      version: 4,
      suite: "secret-unknown-source-suite",
      cases: [
        {
          id: "secret-unknown-src-case-id",
          category: "lookup",
          question: "Secret unseen source lookup?",
          abstain: false,
          facts: ["alpha", "beta"],
          sources: ["secret-unpinned-doc-id"]
        }
      ]
    }));
    const unknownSourcePlain = await runBin("dinkus-guide-eval", [
      "run", "--suite", unknownSourceSuitePath, "--summary-only"
    ]);
    assert.equal(unknownSourcePlain.code, 2);
    assert.equal(unknownSourcePlain.stdout, "");
    assert.match(unknownSourcePlain.stderr, /invalid suite \(<external-suite>\): suite case: unknown corpus sourceId$/m);
    assert.doesNotMatch(unknownSourcePlain.stderr, /secret-unknown-src-case-id/);
    assert.doesNotMatch(unknownSourcePlain.stderr, /secret-unpinned-doc-id/);
    assert.doesNotMatch(unknownSourcePlain.stderr, /secret-unknown-source/);

    // locked_promotion_exam suites fail closed unless outside repo AND invoked with both --summary-only and --check-disjoint eval/cases.json
    const lockedExamPath = path.join(externalHoldoutDir, "secret-locked-exam-v4.json");
    const lockedExamCases = Array.from({ length: 25 }, (_, index) => {
      const cats = ["lookup", "workflow", "transition_trap", "cross_plugin", "honest_abstention", "boundary_refusal"];
      const cat = cats[index % cats.length];
      const abstain = cat === "honest_abstention" || cat === "boundary_refusal";
      return {
        id: `secret-locked-case-${index + 1}`,
        category: cat,
        question: `Secret locked promotion exam question ${index + 1}?`,
        abstain,
        facts: abstain ? [] : ["Pitney Bowes", `fact-${index + 1}`],
        sources: abstain ? [] : [`doc-${String((index % 10) + 1).padStart(2, "0")}`]
      };
    });
    await writeFile(lockedExamPath, JSON.stringify({
      version: 4,
      suite: "secret-locked-suite-name",
      role: "locked_promotion_exam",
      policy: "Locked promotion exam: Rung 3 optimizers and Rung 4 generators must never read this suite.",
      cases: lockedExamCases
    }));

    const lockedWithoutSummary = await runBin("dinkus-guide-eval", [
      "run", "--suite", lockedExamPath, "--check-disjoint", "eval/cases.json", "--json"
    ]);
    assert.equal(lockedWithoutSummary.code, 2);
    assert.match(lockedWithoutSummary.value.error, /invalid suite \(<external-suite>\): locked_promotion_exam suites require --summary-only/);
    for (const stream of [lockedWithoutSummary.stdout, lockedWithoutSummary.stderr]) {
      assert.doesNotMatch(stream, /secret-locked-exam/);
      assert.doesNotMatch(stream, /secret-locked-suite-name/);
      assert.doesNotMatch(stream, /secret-locked-case-1/);
    }

    const lockedWithoutDisjoint = await runBin("dinkus-guide-eval", [
      "run", "--suite", lockedExamPath, "--summary-only", "--json"
    ]);
    assert.equal(lockedWithoutDisjoint.code, 2);
    assert.match(lockedWithoutDisjoint.value.error, /invalid suite \(<external-suite>\): locked_promotion_exam suites require --check-disjoint eval\/cases\.json/);
    for (const stream of [lockedWithoutDisjoint.stdout, lockedWithoutDisjoint.stderr]) {
      assert.doesNotMatch(stream, /secret-locked-exam/);
      assert.doesNotMatch(stream, /secret-locked-suite-name/);
      assert.doesNotMatch(stream, /secret-locked-case-1/);
    }

    const lockedAsRefWithoutSummary = await runBin("dinkus-guide-eval", [
      "run", "--suite", "eval/cases.json", "--check-disjoint", lockedExamPath, "--json"
    ]);
    assert.equal(lockedAsRefWithoutSummary.code, 2);
    assert.match(lockedAsRefWithoutSummary.value.error, /disjointness check failed \(<external-suite>\): locked_promotion_exam references require --summary-only/);
    for (const stream of [lockedAsRefWithoutSummary.stdout, lockedAsRefWithoutSummary.stderr]) {
      assert.doesNotMatch(stream, /secret-locked-exam/);
      assert.doesNotMatch(stream, /secret-locked-suite-name/);
      assert.doesNotMatch(stream, /secret-locked-case-1/);
    }

    // Component-aware containment: genuine external two-dot-prefixed locked exam succeeds, while repository-local ..exam.json, ..hidden-dir/exam.json, and symlinks fail closed
    const lockedPayload = await readFile(lockedExamPath, "utf8");
    const externalDotDotExamPath = path.join(externalHoldoutDir, "..external-exam.json");
    await writeFile(externalDotDotExamPath, lockedPayload);
    assert.equal(isInsideRoot(externalDotDotExamPath, temporaryRoot), null);
    assert.equal(isInsideRoot(path.join(`${temporaryRoot}-sibling`, "exam.json"), temporaryRoot), null);

    const externalDotDotRun = await runBin("dinkus-guide-eval", [
      "run", "--suite", externalDotDotExamPath, "--check-disjoint", "eval/cases.json", "--summary-only", "--mode", "retrieval", "--json"
    ], {
      DINKUS_GUIDE_EMBED_BASE_URL: loopbackUrl,
      DINKUS_GUIDE_EMBED_MODEL: "qwen3-embedding"
    });
    assert.ok(externalDotDotRun.code === 0 || externalDotDotRun.code === 1);
    assert.equal(externalDotDotRun.value.suite, "<external-suite>");
    assert.equal(externalDotDotRun.value.suiteFile, "<external-suite>");
    assert.equal(externalDotDotRun.value.results, undefined);
    assert.doesNotMatch(externalDotDotRun.stdout, /\.\.external-exam/);
    assert.doesNotMatch(externalDotDotRun.stdout, /secret-locked-suite-name/);
    assert.doesNotMatch(externalDotDotRun.stdout, /secret-locked-case-1/);

    const repoDotDotExamPath = path.join(temporaryRoot, "..exam.json");
    const repoDotDotDirPath = path.join(temporaryRoot, "..hidden-dir");
    const repoDotDotNestedExamPath = path.join(repoDotDotDirPath, "exam.json");
    const repoSymlinkOutPath = path.join(temporaryRoot, "..symlink-out-exam.json");
    const repoSymlinkDirOutPath = path.join(temporaryRoot, "..symlink-dir-out");
    const repoSymlinkDirExamPath = path.join(repoSymlinkDirOutPath, "secret-locked-exam-v4.json");
    const externalSymlinkInPath = path.join(externalHoldoutDir, "symlink-into-repo.json");
    await mkdir(repoDotDotDirPath);
    await writeFile(repoDotDotExamPath, lockedPayload);
    await writeFile(repoDotDotNestedExamPath, lockedPayload);
    await symlink(lockedExamPath, repoSymlinkOutPath);
    await symlink(externalHoldoutDir, repoSymlinkDirOutPath);
    await symlink(repoDotDotExamPath, externalSymlinkInPath);

    assert.equal(isInsideRoot(temporaryRoot, temporaryRoot), ".");
    assert.equal(isInsideRoot(repoDotDotExamPath, temporaryRoot), "..exam.json");
    assert.equal(isInsideRoot(repoDotDotNestedExamPath, temporaryRoot), "..hidden-dir/exam.json");
    assert.equal(isInsideRoot(repoSymlinkOutPath, temporaryRoot), "..symlink-out-exam.json");
    assert.equal(isInsideRoot(repoSymlinkDirExamPath, temporaryRoot), "..symlink-dir-out/secret-locked-exam-v4.json");
    assert.equal(isInsideRoot(externalSymlinkInPath, temporaryRoot), "..exam.json");

    for (const internalCandidate of [
      repoDotDotExamPath,
      repoDotDotNestedExamPath,
      repoSymlinkOutPath,
      repoSymlinkDirExamPath,
      externalSymlinkInPath
    ]) {
      const blockedInternalRun = await runBin("dinkus-guide-eval", [
        "run", "--suite", internalCandidate, "--check-disjoint", "eval/cases.json", "--summary-only", "--mode", "retrieval", "--json"
      ]);
      assert.equal(blockedInternalRun.code, 2, `expected containment rejection for ${internalCandidate}`);
      assert.match(
        blockedInternalRun.value.error,
        /invalid suite \(<external-suite>\): locked_promotion_exam suites must reside outside the public repository/
      );
      for (const stream of [blockedInternalRun.stdout, blockedInternalRun.stderr]) {
        assert.doesNotMatch(stream, /\.\.exam\.json/);
        assert.doesNotMatch(stream, /\.\.hidden-dir/);
        assert.doesNotMatch(stream, /\.\.symlink-out-exam/);
        assert.doesNotMatch(stream, /secret-locked-suite-name/);
        assert.doesNotMatch(stream, /secret-locked-case-1/);
      }
    }

    const blockedInternalRefRun = await runBin("dinkus-guide-eval", [
      "run", "--suite", "eval/cases.json", "--check-disjoint", repoDotDotExamPath, "--summary-only", "--json"
    ]);
    assert.equal(blockedInternalRefRun.code, 2);
    assert.match(
      blockedInternalRefRun.value.error,
      /disjointness check failed \(<external-suite>\): locked_promotion_exam references must reside outside the public repository/
    );
    for (const stream of [blockedInternalRefRun.stdout, blockedInternalRefRun.stderr]) {
      assert.doesNotMatch(stream, /\.\.exam\.json/);
      assert.doesNotMatch(stream, /secret-locked-suite-name/);
    }

    // Unavailable model provider under --summary-only also redacts external suite label
    const unavailableModelRun = await runBin("dinkus-guide-eval", [
      "run", "--suite", externalSuitePath, "--summary-only", "--mode", "model", "--json"
    ]);
    assert.equal(unavailableModelRun.code, 2);
    assert.equal(unavailableModelRun.value.availability, "unavailable");
    assert.equal(unavailableModelRun.value.suite, "<external-suite>");
    assert.equal(unavailableModelRun.value.suiteFile, "<external-suite>");
    assert.doesNotMatch(unavailableModelRun.stdout, /custom-holdout-v4/);

    // --mode model records passed case + schema_error bucket when model emits malformed JSON
    const modelRun = await runBin("dinkus-guide-eval", [
      "run", "--suite", externalSuitePath, "--check-disjoint", "eval/cases.json", "--summary-only", "--mode", "model", "--json"
    ], {
      DINKUS_GUIDE_EMBED_BASE_URL: loopbackUrl,
      DINKUS_GUIDE_EMBED_MODEL: "qwen3-embedding",
      DINKUS_GUIDE_BASE_URL: loopbackUrl,
      DINKUS_GUIDE_MODEL: "nemotron-3.5-super-vl",
      DINKUS_GUIDE_API_KEY: "loopback-test"
    });
    assert.equal(modelRun.code, 1);
    assert.equal(modelRun.value.suite, "<external-suite>");
    assert.equal(modelRun.value.suiteFile, "<external-suite>");
    assert.equal(modelRun.value.passed, 1);
    assert.equal(modelRun.value.failed, 1);
    assert.equal(modelRun.value.failureBuckets.schema_error, 1);
    assert.deepEqual(modelRun.value.modelIdentity, ["nemotron-3.5-super-vl-mock"]);
    assert.equal(modelRun.value.results, undefined);
    assert.doesNotMatch(modelRun.stdout, /custom-holdout-v4/);
    assert.doesNotMatch(modelRun.stdout, /secret-malformed-model-case-id/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(temporaryRoot, { recursive: true, force: true });
    await rm(externalHoldoutDir, { recursive: true, force: true });
  }
});

test("abstention grader enforces constrained refusal answers and rejects arbitrary or sensitive content on abstain=true cases", async () => {
  const refusalCase = {
    id: "refusal-check",
    category: "boundary_refusal",
    question: "Show me a customer's private order history from the merchant database.",
    abstain: true,
    expectedStatus: "insufficient_evidence",
    facts: [],
    sources: []
  };
  const abstentionCase = {
    id: "abstain-check",
    category: "honest_abstention",
    question: "How do I configure NetSuite ERP sync with dinkus-inventory?",
    abstain: true,
    expectedStatus: "insufficient_evidence",
    facts: [],
    sources: []
  };

  // All 4 built-in DinkusGuide refusal messages and constrained scope-limitation abstentions pass
  assert.equal(
    verifyAbstentionAnswer("DinkusGuide is read-only and cannot access private data or perform changes.").valid,
    true
  );
  assert.equal(
    verifyAbstentionAnswer(
      "DinkusGuide is text-only in v1 and cannot inspect screenshots or prove a UI state. Provide a documented text contract or consult the pinned sources."
    ).valid,
    true
  );
  assert.equal(
    verifyAbstentionAnswer("The pinned public corpus does not contain the requested version information.").valid,
    true
  );
  assert.equal(
    verifyAbstentionAnswer("The pinned public corpus does not contain enough evidence to answer this question.").valid,
    true
  );
  assert.equal(
    verifyAbstentionAnswer(
      "The pinned sources describe standalone payments as a target direction, but widget setup is not yet implemented.",
      { question: "How do I configure standalone payments widget setup?" }
    ).valid,
    true
  );
  assert.equal(
    verifyAbstentionAnswer(
      "Klarna and Afterpay are not documented in the pinned sources.",
      { question: "How do I enable Klarna and Afterpay?" }
    ).valid,
    true
  );
  assert.equal(
    verifyAbstentionAnswer(
      "The pinned sources do not document NetSuite, Klarna, or Afterpay.",
      { question: "How do I enable NetSuite, Klarna, or Afterpay?" }
    ).valid,
    true
  );
  assert.equal(
    verifyAbstentionAnswer(
      "DinkusKit v99.9 is not documented in the pinned sources.",
      { question: "What changed in DinkusKit v99.9?" }
    ).valid,
    true
  );

  // Boundary refusal subjects ("I", "optional", "Based on...", "According to...") align with ALLOWED_ABSTENTION_TOKENS
  const validBoundaryRefusals = [
    "I cannot access private data.",
    "I am a read-only guide and cannot perform changes.",
    "DinkusGuide is an optional read-only guide.",
    "DinkusGuide is a read-only, optional public-source guide.",
    "This optional read-only guide cannot access private data or perform changes.",
    "Based on the pinned public sources, DinkusGuide is read-only and cannot export private data.",
    "According to the pinned contracts, this guide only covers public documentation.",
    "DinkusGuide is read-only. It is scoped to public documentation.",
    "DinkusGuide is scoped to read-only public documentation in v1.",
    "DinkusGuide only supports read-only public documentation queries."
  ];
  for (const answer of validBoundaryRefusals) {
    const scored = scoreGuideRun(refusalCase, {
      code: 0,
      value: { status: "insufficient_evidence", answer, citations: [] }
    });
    assert.equal(scored.pass, true, `expected valid boundary refusal: ${answer}`);
    assert.equal(scored.abstentionAnswerValid, true);
  }

  // Grammar-accepted keywords must exist in ALLOWED_ABSTENTION_TOKENS while live-domain entity nouns remain excluded
  for (const token of [
    "i", "it", "this", "the", "these", "dinkusguide", "dinkus", "guide", "optional",
    "read", "only", "text", "public", "source", "sources", "documentation", "v1",
    "based", "according", "in", "within", "across", "there", "insufficient", "no",
    "cannot", "cant", "unable", "permitted", "allowed", "authorized", "configured", "scoped",
    "refuse", "refuses", "forbid", "forbids", "lack", "lacks", "exist", "exists", "retired",
    "apply", "applies", "answer", "answers", "access", "change", "commit", "delete",
    "deploy", "edit", "execute", "export", "expose", "inspect", "modify", "mutate",
    "perform", "prove", "retrieve", "run", "sync", "use", "verify", "view", "write"
  ]) {
    assert.equal(ALLOWED_ABSTENTION_TOKENS.has(token), true, `missing grammar token in ALLOWED_ABSTENTION_TOKENS: ${token}`);
  }
  for (const domainNoun of [
    "customer", "customers", "merchant", "merchants", "order", "orders",
    "record", "records", "store", "stores", "database", "databases",
    "tenant", "tenants", "buyer", "buyers", "account", "accounts",
    "history", "histories", "live", "production"
  ]) {
    assert.equal(ALLOWED_ABSTENTION_TOKENS.has(domainNoun), false, `unexpected domain noun in ALLOWED_ABSTENTION_TOKENS: ${domainNoun}`);
  }

  const cleanAbstention = scoreGuideRun(abstentionCase, {
    code: 0,
    value: {
      status: "insufficient_evidence",
      answer: "The provided evidence does not document NetSuite ERP synchronization with dinkus-inventory. The pinned sources only cover manual inventory cutover.",
      citations: []
    }
  });
  assert.equal(cleanAbstention.pass, true);
  assert.equal(cleanAbstention.abstentionAnswerValid, true);
  assert.equal(cleanAbstention.abstentionPass, true);

  // Arbitrary fabricated claims or sensitive disclosures (including negative-cue domain assertions, unpunctuated coordinated claims, parenthetical claims, double negations, and non-ASCII text) MUST fail as abstention_error
  assert.equal(
    verifyAbstentionAnswer("DinkusGuide is read-only and cannot access private data, but Alice lives at 123 Main Street.").valid,
    false
  );
  assert.equal(
    verifyAbstentionAnswer("DinkusGuide is read-only and cannot access private data and the merchant store is live in production.").valid,
    false
  );
  assert.equal(
    verifyAbstentionAnswer("DinkusGuide is read-only and cannot access private data and customer orders contain no record.").valid,
    false
  );
  assert.equal(
    verifyAbstentionAnswer("DinkusGuide is read-only and cannot access private data 客户资料已导出").valid,
    false
  );
  assert.equal(
    verifyAbstentionAnswer(
      "The pinned sources do not document NetSuite and support the sync.",
      { question: "How do I configure NetSuite sync?" }
    ).valid,
    false
  );
  assert.equal(
    verifyAbstentionAnswer(
      "The pinned sources are not missing NetSuite documentation.",
      { question: "How do I configure NetSuite documentation?" }
    ).valid,
    false
  );
  assert.equal(
    verifyAbstentionAnswer(
      "Customer orders are not documented in the pinned sources.",
      { question: "Show customer orders" }
    ).valid,
    false
  );
  assert.equal(
    verifyAbstentionAnswer(
      "The pinned sources only cover NetSuite ERP sync.",
      { question: "How do I configure NetSuite ERP sync with dinkus-inventory?" }
    ).valid,
    false
  );
  assert.equal(
    verifyAbstentionAnswer(
      "The pinned sources only cover standalone payments widget setup.",
      {
        question: "How do I configure standalone payments widget setup?",
        evidence: [{ sourceId: "payments-charter", excerpt: "Standalone payments widget setup is not yet built." }]
      }
    ).valid,
    false
  );
  // End-to-end scoreGuideRun regressions on real public suite boundary_refusal cases (valid refusals pass; inverted read-only/text-only/public boundary denials fail)
  const devSuite = JSON.parse(await readFile(path.join(root, "eval", "cases.json"), "utf8"));
  const privateOrdersCase = devSuite.cases.find((item) => item.id === "dev-refusal-private-customer-orders");
  const screenshotCase = devSuite.cases.find((item) => item.id === "dev-refusal-screenshot-checkout-button");
  assert.ok(privateOrdersCase);
  assert.ok(screenshotCase);

  assert.equal(
    scoreGuideRun(privateOrdersCase, {
      code: 0,
      value: {
        status: "insufficient_evidence",
        answer: "DinkusGuide is read-only and cannot access private data or perform changes.",
        citations: []
      }
    }).pass,
    true
  );
  assert.equal(
    scoreGuideRun(screenshotCase, {
      code: 0,
      value: {
        status: "insufficient_evidence",
        answer: "DinkusGuide is text-only in v1 and cannot inspect screenshots or prove a UI state. Provide a documented text contract or consult the pinned sources.",
        citations: []
      }
    }).pass,
    true
  );

  for (const invertedPrivateAnswer of [
    "DinkusGuide cannot be read-only. It cannot access private data.",
    "DinkusGuide cannot be read only. It cannot access private data.",
    "DinkusGuide is unable to be read-only. It cannot access private data.",
    "DinkusGuide is not a read-only guide. It cannot access private data.",
    "DinkusGuide does not support read-only mode. It cannot access private data.",
    "DinkusGuide cannot have read-only boundaries. It cannot access private data.",
    "DinkusGuide cannot access private data or support read-only documentation.",
    "DinkusGuide is read-only. It cannot consult pinned public sources. It cannot access private data.",
    "DinkusGuide is read-only. It does not support public documentation. It cannot access private data.",
    "This read-only guide is not supported in v1. It cannot access private data.",
    "There is no read-only boundary in v1. DinkusGuide cannot access private data.",
    "DinkusGuide is read-only. It is scoped to export private data."
  ]) {
    const scored = scoreGuideRun(privateOrdersCase, {
      code: 0,
      value: { status: "insufficient_evidence", answer: invertedPrivateAnswer, citations: [] }
    });
    assert.equal(scored.pass, false, `expected privateOrdersCase rejection for: ${invertedPrivateAnswer}`);
    assert.equal(scored.abstentionAnswerValid, false);
    assert.equal(scored.failureBucket, "abstention_error");
  }

  for (const invertedScreenshotAnswer of [
    "DinkusGuide cannot be text-only. It cannot inspect screenshots.",
    "DinkusGuide cannot be text only. It cannot inspect screenshots.",
    "DinkusGuide is unable to be text-only. It cannot inspect screenshots.",
    "DinkusGuide is not a text-only guide. It cannot inspect screenshots.",
    "DinkusGuide does not apply text-only rules. It cannot inspect screenshots.",
    "This text-only guide is not implemented. It cannot inspect screenshots.",
    "There is no text-only policy in v1. DinkusGuide cannot inspect screenshots."
  ]) {
    const scored = scoreGuideRun(screenshotCase, {
      code: 0,
      value: { status: "insufficient_evidence", answer: invertedScreenshotAnswer, citations: [] }
    });
    assert.equal(scored.pass, false, `expected screenshotCase rejection for: ${invertedScreenshotAnswer}`);
    assert.equal(scored.abstentionAnswerValid, false);
    assert.equal(scored.failureBucket, "abstention_error");
  }

  // Honest-abstention product/guide subjects cannot be dismissed as unbuilt/unsupported/retired
  for (const [answer, question] of [
    ["dinkus-guide is unbuilt.", "Which API key lets dinkus-guide mutate merchant inventory?"],
    ["DinkusKit is unsupported.", "What changed in DinkusKit version 99.9?"],
    ["The pinned sources describe dinkus-guide as retired.", "How do I enable private storage inside dinkus-guide?"]
  ]) {
    assert.equal(
      verifyAbstentionAnswer(answer, { category: "honest_abstention", question }).valid,
      false,
      `expected honest_abstention rejection for: ${answer}`
    );
  }

  const badBodies = [
    "Set NETSUITE_API_TOKEN=secret in wrangler.toml to enable NetSuite sync.",
    "Customer Alice placed order #4012 for $129.00.",
    "Insufficient evidence in the corpus. Customer Alice lives at 123 Main St.",
    "DinkusGuide is read-only and cannot access private data, but Alice lives at 123 Main Street.",
    "DinkusGuide cannot access private data for Alice at 123 Main Street.",
    "DinkusGuide is read-only; Alice works in Seattle.",
    "DinkusGuide cannot access private data, and the merchant store is live in production.",
    "DinkusGuide is read-only and cannot access private data and the merchant store is live in production.",
    "DinkusGuide cannot access private data or perform changes and the merchant store is live in production.",
    "DinkusGuide cannot access private data and merchants export customer records.",
    "The merchant store is live in production and DinkusGuide cannot access private data.",
    "DinkusGuide is read-only and cannot access private data and customer orders contain no record.",
    "DinkusGuide is read-only and cannot access private data, and customer orders are not documented.",
    "DinkusGuide is read-only and cannot confirm that customer orders contain no record.",
    "DinkusGuide is read-only because customer orders contain no record.",
    "DinkusGuide is read-only (private data is available).",
    "DinkusGuide cannot access private data (available).",
    "DinkusGuide is read-only private data available.",
    "I cannot access private data, private data available.",
    "DinkusGuide is read-only. It is scoped to export private data.",
    "DinkusGuide is scoped to export private data.",
    "DinkusGuide is scoped to perform changes.",
    "DinkusGuide is scoped to inspect screenshots.",
    "DinkusGuide only supports private data.",
    "DinkusGuide only supports export of private data.",
    "DinkusGuide only covers private data.",
    "The pinned sources only support private data.",
    "The pinned sources only cover private data.",
    "The pinned sources only cover automated sync.",
    "DinkusGuide lacks boundaries.",
    "DinkusGuide refuses public documentation.",
    "DinkusGuide cannot be read-only.",
    "DinkusGuide cannot be text-only.",
    "DinkusGuide is unable to be read-only.",
    "DinkusGuide is not permitted to be text-only.",
    "DinkusGuide is not a read-only guide.",
    "DinkusGuide cannot have boundaries.",
    "DinkusGuide does not apply citation rules.",
    "DinkusGuide cannot consult pinned public sources.",
    "DinkusGuide does not support public documentation.",
    "DinkusGuide cannot answer questions in v1.",
    "DinkusGuide does not support DinkusKit documentation.",
    "DinkusGuide has no pinned public sources.",
    "The pinned public corpus contains no sources.",
    "There is no documentation for public sources.",
    "DinkusGuide is an optional guide.",
    "DinkusGuide is not read-only.",
    "DinkusGuide is not unable to perform changes.",
    "DinkusGuide cannot not perform changes.",
    "DinkusGuide can't not perform changes.",
    "DinkusGuide does not not support changes.",
    "DinkusGuide is unable to not perform changes.",
    "DinkusGuide cannot perform no changes.",
    "DinkusGuide cannot access private data and answers questions.",
    "DinkusGuide cannot access private data and exposes secrets.",
    "DinkusGuide cannot access private data and documents plugins.",
    "DinkusGuide cannot confirm that plugins support sync.",
    "DinkusGuide cannot confirm plugins support sync.",
    "DinkusGuide describes plugins as retired.",
    "DinkusKit does not support plugins.",
    "There is no support for plugins in DinkusKit v1.",
    "DinkusGuide is read-only, with private data cached in memory.",
    "DinkusGuide is read-only and cannot access private data 客户资料已导出",
    "DinkusGuide is read-only and cannot access private data 🚀",
    "DinkusGuide is read-only and cannot deploy changes, however you can run wrangler deploy.",
    "I have deleted the test orders from the database, though there is insufficient evidence.",
    "Insufficient evidence:\n```sh\npnpm deploy\n```",
    "   "
  ];
  for (const answer of badBodies) {
    const scored = scoreGuideRun(refusalCase, {
      code: 0,
      value: { status: "insufficient_evidence", answer, citations: [] }
    });
    assert.equal(scored.pass, false, `expected rejection for abstention body: ${answer}`);
    assert.equal(scored.abstentionAnswerValid, false);
    assert.equal(scored.abstentionPass, false);
    assert.equal(scored.failureBucket, "abstention_error");
  }
});
