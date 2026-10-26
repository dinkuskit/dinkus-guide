import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { copyFile, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import http from "node:http";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { APPROVED_REPOSITORIES, loadManifest, root } from "../src/corpus.js";
import {
  ALLOWED_CATEGORIES,
  FAILURE_BUCKETS,
  computeRecallCase,
  loadCorpusSources,
  scoreGuideRun,
  summarizeSuiteResults,
  validateSuite,
  verifyCitationSpan
} from "../bin/dinkus-guide-eval";

function normalizeText(value) {
  return String(value ?? "").toLowerCase().replace(/\s+/g, " ").trim();
}

test("dev and holdout suites satisfy schema, disjointness, category/repo stratification, and promotion-exam lock", async () => {
  const manifest = await loadManifest();
  const manifestIds = new Set(manifest.sources.map((s) => s.id));
  const sourceById = new Map(manifest.sources.map((s) => [s.id, s]));

  const devRaw = JSON.parse(await readFile(path.join(root, "eval", "cases.json"), "utf8"));
  const holdoutRaw = JSON.parse(await readFile(path.join(root, "eval", "holdout.json"), "utf8"));

  const dev = validateSuite(devRaw, { manifestIds, requireCategories: true });
  const holdout = validateSuite(holdoutRaw, { manifestIds, requireCategories: true });

  assert.equal(dev.role, "development");
  assert.ok(dev.cases.length >= 60 && dev.cases.length <= 75, `expected 60-75 dev cases, got ${dev.cases.length}`);
  assert.equal(holdout.role, "locked_promotion_exam");
  assert.ok(holdout.cases.length >= 25 && holdout.cases.length <= 30, `expected 25-30 holdout cases, got ${holdout.cases.length}`);
  assert.match(holdout.policy, /Rung 3/i);
  assert.match(holdout.policy, /Rung 4/i);

  const devIds = new Set(dev.cases.map((c) => c.id));
  const devQuestions = new Set(dev.cases.map((c) => normalizeText(c.question)));
  for (const item of holdout.cases) {
    assert.equal(devIds.has(item.id), false, `duplicate id across dev and holdout: ${item.id}`);
    assert.equal(devQuestions.has(normalizeText(item.question)), false, `duplicate question across dev and holdout: ${item.id}`);
  }

  for (const [label, suite] of [["dev", dev], ["holdout", holdout]]) {
    const categories = new Set(suite.cases.map((c) => c.category));
    assert.deepEqual(categories, ALLOWED_CATEGORIES, `${label} missing required categories`);
    const repos = new Set();
    for (const c of suite.cases) {
      for (const src of [...(c.sources ?? []), ...(c.anyOfSources ?? []).flat()]) {
        repos.add(sourceById.get(src)?.repository);
      }
    }
    for (const repo of APPROVED_REPOSITORIES) {
      assert.equal(repos.has(repo), true, `${label} missing repository ${repo}`);
    }
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

  // Holdout lock documentation + evaluator separation check
  const readme = await readFile(path.join(root, "README.md"), "utf8");
  const evalDoc = await readFile(path.join(root, "docs", "evaluation.md"), "utf8");
  assert.match(readme, /eval\/holdout\.json/);
  assert.match(readme, /Rung 3/);
  assert.match(readme, /Rung 4/);
  assert.match(evalDoc, /eval\/holdout\.json/);
  assert.match(evalDoc, /Rung 3/);
  assert.match(evalDoc, /Rung 4/);

  const evalBinSource = await readFile(path.join(root, "bin", "dinkus-guide-eval"), "utf8");
  assert.doesNotMatch(evalBinSource, /from\s+["']\.\.\/src\//);
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

test("CLI supports corpus embed, --suite, --mode retrieval, sanitized suiteFile, and end-to-end schema_error bucketing", async () => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "dinkus-guide-rung2-cli-"));
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
    const sources = [];
    for (let idx = 1; idx <= 10; idx += 1) {
      const id = `doc-${String(idx).padStart(2, "0")}`;
      const content = idx === 1
        ? "# Pitney Bowes tracking\nPitney Bowes webhook uses X-PB-ReferenceId.\n"
        : `# Store doc ${idx}\nRun pnpm dev to launch local template store ${idx}.\n`;
      const sha256 = createHash("sha256").update(content).digest("hex");
      const repo = idx === 1 ? "dinkuskit/ship" : "dinkuskit/template-store";
      sources.push({
        id,
        repository: repo,
        layer: "dinkuskit",
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

    const customSuitePath = path.join(temporaryRoot, "eval", "custom-holdout.json");
    await writeFile(customSuitePath, JSON.stringify({
      version: 4,
      suite: "custom-holdout-v4",
      cases: [
        {
          id: "pb-lookup",
          category: "lookup",
          question: "What header does Pitney Bowes tracking webhook use?",
          abstain: false,
          facts: ["Pitney Bowes", "X-PB-ReferenceId"],
          anyOfSources: [["doc-01", "doc-02"]]
        },
        {
          id: "malformed-model-case",
          category: "workflow",
          question: "How do I launch local template store 2?",
          abstain: false,
          facts: ["pnpm dev", "template store 2"],
          sources: ["doc-02"]
        }
      ]
    }));

    const runBin = (binName, cliArgs, extraEnv = {}) => new Promise((resolve) => {
      const child = spawn(process.execPath, [path.join(temporaryRoot, "bin", binName), ...cliArgs], {
        cwd: temporaryRoot,
        env: { PATH: process.env.PATH, ...extraEnv }
      });
      let stdout = "", stderr = "";
      child.stdout.on("data", (chunk) => { stdout += chunk; });
      child.stderr.on("data", (chunk) => { stderr += chunk; });
      child.on("close", (code) => resolve({ code, stderr, value: stdout ? JSON.parse(stdout) : null }));
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

    // --mode retrieval with --suite works and sanitizes suiteFile to repo-relative path
    const retrievalRun = await runBin("dinkus-guide-eval", [
      "run", "--suite", customSuitePath, "--mode", "retrieval", "--json"
    ], {
      DINKUS_GUIDE_EMBED_BASE_URL: loopbackUrl,
      DINKUS_GUIDE_EMBED_MODEL: "qwen3-embedding"
    });
    assert.equal(retrievalRun.code, 0);
    assert.equal(retrievalRun.value.suiteFile, "eval/custom-holdout.json");
    assert.equal(retrievalRun.value.mode, "retrieval");
    assert.equal(retrievalRun.value.recall.hits, 2);

    // --mode model records passed case + schema_error bucket when model emits malformed JSON
    const modelRun = await runBin("dinkus-guide-eval", [
      "run", "--suite", "eval/custom-holdout.json", "--mode", "model", "--json"
    ], {
      DINKUS_GUIDE_EMBED_BASE_URL: loopbackUrl,
      DINKUS_GUIDE_EMBED_MODEL: "qwen3-embedding",
      DINKUS_GUIDE_BASE_URL: loopbackUrl,
      DINKUS_GUIDE_MODEL: "nemotron-3.5-super-vl",
      DINKUS_GUIDE_API_KEY: "loopback-test"
    });
    assert.equal(modelRun.code, 1);
    assert.equal(modelRun.value.passed, 1);
    assert.equal(modelRun.value.failed, 1);
    assert.equal(modelRun.value.failureBuckets.schema_error, 1);
    assert.deepEqual(modelRun.value.modelIdentity, ["nemotron-3.5-super-vl-mock"]);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});
