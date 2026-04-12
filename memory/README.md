# Memory System

The canonical memory store is `memory/system.sqlite`. Markdown files in this directory are generated read surfaces, not the source of truth.

## What Lives Here

- `system.sqlite` (ignored by git): canonical SQLite store
- `current_principles.md`: active principles and open questions
- `current_anti_patterns.md`: active anti-patterns
- `blind_spots.md`: open questions and contested beliefs
- `designer_brief.md`: latest designer retrieval brief
- `engineer_brief.md`: latest engineer retrieval brief
- `playtester_packet.md`: blind playtest protocol and optional calibration
- `run_summary.md`: latest run summary

## Bootstrap

```bash
npm run memory:init
```

That creates the schema, seeds metric definitions, and renders the markdown surfaces.

## Core Commands

```bash
node tools/memory-cli.mjs create-run --json '{...}'
node tools/memory-cli.mjs upsert-concept --json '{...}'
node tools/memory-cli.mjs create-version --json '{...}'
node tools/memory-cli.mjs write-scorecard --json '{...}'
node tools/memory-cli.mjs write-playtest --json '{...}'
node tools/memory-cli.mjs report-bug --json '{...}'
node tools/memory-cli.mjs record-bugfix --json '{...}'
node tools/memory-cli.mjs record-qa-retest --json '{...}'
node tools/memory-cli.mjs list-bugs --json '{...}'
node tools/memory-cli.mjs upsert-principle --json '{...}'
node tools/memory-cli.mjs add-evidence --json '{...}'
node tools/memory-cli.mjs recompute-beliefs --json '{"namespace":"leetcode"}'
node tools/memory-cli.mjs create-brief --json '{...}'
node tools/memory-cli.mjs audit-brief --json '{...}'
node tools/memory-cli.mjs render
```

## Record A Whole Cycle

For normal loop work, prefer `record-cycle` so the run writes stay coherent.

The payload can contain:

- `run`: namespace, loop type, status, summary
- `concept`: canonical name, current status, summary, tags
- `version`: hypothesis, notes, tags, optional parent version
- `predictedScorecard`
- `actualScorecard`
- `playtests`
- `artifacts`
- `decision`
- `distillation.emissions`

Each distillation emission is structured on purpose. `v1` does not write free-form natural language directly into the database without structure.

## Brief Generation

Designer and engineer work must start by generating retrieval briefs:

```bash
node tools/memory-cli.mjs create-brief --json '{"runId":"...","role":"designer","task":"...","tags":["search","hidden-information"]}'
node tools/memory-cli.mjs create-brief --json '{"runId":"...","role":"engineer","task":"...","tags":["search","budget-pressure"]}'
```

The playtester does not read history. Its packet is rendered from the memory store and contains only the blind protocol, rubric, and optional unrelated calibration.

## QA Loop Commands

Use these to run the engineer/playtester QA loop explicitly:

```bash
node tools/memory-cli.mjs report-bug --json '{
  "versionId":"VERSION_ID",
  "playtestId":"PLAYTEST_ID",
  "title":"Reset button does not restore initial board",
  "severity":"high",
  "reproductionSteps":"Start game, make two moves, press reset.",
  "expectedBehavior":"Board returns to the initial state.",
  "actualBehavior":"Board stays dirty after reset.",
  "blocking":true
}'

node tools/memory-cli.mjs record-bugfix --json '{
  "bugId":"BUG_ID",
  "engineerRole":"engineer",
  "summary":"Reset now rehydrates the initial seeded state."
}'

node tools/memory-cli.mjs record-qa-retest --json '{
  "bugId":"BUG_ID",
  "testerRole":"playtester",
  "status":"fixed",
  "notes":"Retested twice and verified."
}'
```
