#!/usr/bin/env node

import fs from 'node:fs';

import { DEFAULT_DB_PATH } from './memory/config.mjs';
import { renderMarkdownSurfaces } from './memory/render.mjs';
import {
  addPrincipleEvidence,
  auditRetrievalBrief,
  createArtifact,
  createConceptVersion,
  createPlaytest,
  createRetrievalBrief,
  createRun,
  createScorecard,
  finishRun,
  getBugDetails,
  getBriefDetails,
  initializeMemorySystem,
  listBugs,
  recordCycle,
  recordBugfix,
  recordDecision,
  recordQaRetest,
  reportBug,
  recomputeBeliefs,
  upsertConcept,
  upsertPrinciple,
  withDatabase,
} from './memory/service.mjs';

function usage() {
  console.error(`Usage:
  node tools/memory-cli.mjs init [--db path]
  node tools/memory-cli.mjs create-run --json '{...}'
  node tools/memory-cli.mjs finish-run --json '{...}'
  node tools/memory-cli.mjs upsert-concept --json '{...}'
  node tools/memory-cli.mjs create-version --json '{...}'
  node tools/memory-cli.mjs record-decision --json '{...}'
  node tools/memory-cli.mjs write-scorecard --json '{...}'
  node tools/memory-cli.mjs write-playtest --json '{...}'
  node tools/memory-cli.mjs report-bug --json '{...}'
  node tools/memory-cli.mjs record-bugfix --json '{...}'
  node tools/memory-cli.mjs record-qa-retest --json '{...}'
  node tools/memory-cli.mjs list-bugs [--json '{...}']
  node tools/memory-cli.mjs show-bug --json '{"bugId":"..."}'
  node tools/memory-cli.mjs write-artifact --json '{...}'
  node tools/memory-cli.mjs upsert-principle --json '{...}'
  node tools/memory-cli.mjs add-evidence --json '{...}'
  node tools/memory-cli.mjs recompute-beliefs [--json '{"namespace":"..."}']
  node tools/memory-cli.mjs create-brief --json '{...}'
  node tools/memory-cli.mjs audit-brief --json '{...}'
  node tools/memory-cli.mjs render [--json '{"runId":"..."}']
  node tools/memory-cli.mjs record-cycle --json '{...}'
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
    if (command === 'record-cycle') return recordCycle(db, payload);
    if (command === 'show-brief') return getBriefDetails(db, payload.briefId);
    if (command === 'show-bug') return getBugDetails(db, payload.bugId);
    throw new Error(`Unknown command: ${command}`);
  });

  print(result);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
