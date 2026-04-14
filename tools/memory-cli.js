#!/usr/bin/env node

import fs from 'node:fs';

import { DEFAULT_DB_PATH } from './memory/config.js';
import { renderMarkdownSurfaces } from './memory/render.js';
import { checkSolverDiff } from './memory/solver_diff.js';
import {
  addPrincipleEvidence,
  auditRetrievalBrief,
  createArtifact,
  createConceptVersion,
  createPlaytest,
  createRetrievalBrief,
  createRun,
  createScorecard,
  detectContradictions,
  distillRun,
  finishRun,
  getBugDetails,
  getBriefDetails,
  initializeMemorySystem,
  listBugs,
  portfolioReview,
  recentMechanicFamilies,
  recordCycle,
  recordBugfix,
  recordDecision,
  recordQaRetest,
  recordTransferTest,
  reportBug,
  recomputeBeliefs,
  upsertConcept,
  upsertPrinciple,
  validateRun,
  withDatabase,
} from './memory/service.js';

function usage() {
  console.error(`Usage:
  node tools/memory-cli.js init [--db path]
  node tools/memory-cli.js create-run --json '{...}'
  node tools/memory-cli.js finish-run --json '{...}'
  node tools/memory-cli.js upsert-concept --json '{...}'
  node tools/memory-cli.js create-version --json '{...}'
  node tools/memory-cli.js record-decision --json '{...}'
  node tools/memory-cli.js write-scorecard --json '{...}'
  node tools/memory-cli.js write-playtest --json '{...}'
  node tools/memory-cli.js report-bug --json '{...}'
  node tools/memory-cli.js record-bugfix --json '{...}'
  node tools/memory-cli.js record-qa-retest --json '{...}'
  node tools/memory-cli.js list-bugs [--json '{...}']
  node tools/memory-cli.js show-bug --json '{"bugId":"..."}'
  node tools/memory-cli.js write-artifact --json '{...}'
  node tools/memory-cli.js upsert-principle --json '{...}'
  node tools/memory-cli.js add-evidence --json '{...}'
  node tools/memory-cli.js recompute-beliefs [--json '{"namespace":"..."}']
  node tools/memory-cli.js create-brief --json '{...}'
  node tools/memory-cli.js audit-brief --json '{...}'
  node tools/memory-cli.js render [--json '{"runId":"..."}']
  node tools/memory-cli.js validate-run --json '{"runId":"..."}'
  node tools/memory-cli.js distill --json '{"runId":"..."}'
  node tools/memory-cli.js record-cycle --json '{...}'
  node tools/memory-cli.js portfolio-review [--json '{"namespace":"..."}']
  node tools/memory-cli.js recent-mechanics [--json '{"namespace":"...","limit":2}']
  node tools/memory-cli.js detect-contradictions [--json '{"namespace":"..."}']
  node tools/memory-cli.js record-transfer-test --json '{"versionId":"...","leetcodeProblem":"LC #125 Valid Palindrome","outcome":"transfer|partial|no_transfer","reportSummary":"..."}'
  node tools/memory-cli.js check-solver-diff --spec leetcode/specs/<game>.md
`);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const command = args.shift();
  const options = {};

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = args[index + 1];
    if (next && !next.startsWith('--')) {
      options[key] = next;
      index += 1;
    } else {
      options[key] = true;
    }
  }

  return { command, options };
}

function loadPayload(options) {
  if (options.json) return JSON.parse(options.json);
  if (options.input) {
    return JSON.parse(fs.readFileSync(options.input, 'utf8'));
  }
  return {};
}

function print(result) {
  console.log(JSON.stringify(result, null, 2));
}

const { command, options } = parseArgs(process.argv);
const dbPath = options.db || DEFAULT_DB_PATH;

if (!command) {
  usage();
  process.exit(1);
}

try {
  if (command === 'init') {
    const result = initializeMemorySystem({ dbPath });
    const renderResult = withDatabase(dbPath, (db) => renderMarkdownSurfaces(db));
    print({ ...result, ...renderResult });
    process.exit(0);
  }

  // check-solver-diff is a pure file parser — no DB access needed.
  if (command === 'check-solver-diff') {
    const specPath = options.spec;
    if (!specPath && !options.text) {
      console.error('check-solver-diff: pass --spec <path> or --text <inline>.');
      process.exit(2);
    }
    const result = checkSolverDiff({ specPath, specText: options.text });
    print(result);
    process.exit(result.valid ? 0 : 1);
  }

  const payload = loadPayload(options);

  const result = withDatabase(dbPath, (db) => {
    if (command === 'create-run') return createRun(db, payload);
    if (command === 'finish-run') return finishRun(db, payload);
    if (command === 'upsert-concept') return upsertConcept(db, payload);
    if (command === 'create-version') return createConceptVersion(db, payload);
    if (command === 'record-decision') return recordDecision(db, payload);
    if (command === 'write-scorecard') return createScorecard(db, payload);
    if (command === 'write-playtest') return createPlaytest(db, payload);
    if (command === 'report-bug') return reportBug(db, payload);
    if (command === 'record-bugfix') return recordBugfix(db, payload);
    if (command === 'record-qa-retest') return recordQaRetest(db, payload);
    if (command === 'list-bugs') return listBugs(db, payload);
    if (command === 'write-artifact') return createArtifact(db, payload);
    if (command === 'upsert-principle') return upsertPrinciple(db, payload);
    if (command === 'add-evidence') return addPrincipleEvidence(db, payload);
    if (command === 'recompute-beliefs') return recomputeBeliefs(db, payload);
    if (command === 'create-brief') return createRetrievalBrief(db, payload);
    if (command === 'audit-brief') return auditRetrievalBrief(db, payload);
    if (command === 'render') return renderMarkdownSurfaces(db, payload);
    if (command === 'validate-run') return validateRun(db, payload);
    if (command === 'distill') return distillRun(db, payload);
    if (command === 'record-cycle') return recordCycle(db, payload);
    if (command === 'show-brief') return getBriefDetails(db, payload.briefId);
    if (command === 'show-bug') return getBugDetails(db, payload.bugId);
    if (command === 'portfolio-review') return portfolioReview(db, payload);
    if (command === 'recent-mechanics') return recentMechanicFamilies(db, payload);
    if (command === 'detect-contradictions') return detectContradictions(db, payload);
    if (command === 'record-transfer-test') return recordTransferTest(db, payload);
    throw new Error(`Unknown command: ${command}`);
  });

  print(result);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
