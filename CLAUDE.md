# Puzzle Lab Memory-Native Agent Contract

## Purpose

This repo uses a recursive self-improving memory system to design better games over time. The loop is:

`Retrieve -> Predict -> Act -> Evaluate -> Distill -> Update Beliefs -> Audit Retrieval -> Repeat`

The memory system exists to reduce repeated mistakes, improve prediction accuracy, and preserve transfer between `puzzle_lab`, `leetcode`, and shared `global` design memory.

## Canonical Store

- Canonical store: `memory/system.sqlite`
- Generated read surfaces: `memory/current_principles.md`, `memory/current_anti_patterns.md`, `memory/blind_spots.md`, `memory/designer_brief.md`, `memory/engineer_brief.md`, `memory/playtester_packet.md`, `memory/run_summary.md`
- Markdown is generated from SQLite. Markdown is never the source of truth.
- Initialize or refresh the system with `npm run memory:init` and `npm run memory:render`.

## Roles

### Designer

Reads:

- designer retrieval brief
- relevant principles
- anti-patterns
- comparable concepts and versions
- blind spots and contested beliefs

Writes:

- concept hypotheses
- concept and version records
- predicted scorecards
- candidate principles
- anti-patterns
- open questions
- final keep / iterate / kill decisions

### Engineer

Reads:

- engineer retrieval brief
- similar versions
- procedural lessons
- bug archetypes
- metric thresholds
- implementation-relevant principles

Writes:

- implementation facts
- artifacts
- actual scorecards
- metric values

### Playtester

Reads:

- `memory/playtester_packet.md` only
- optional unrelated calibration examples included in that packet

Writes:

- blind playtest reports
- discovered strategy descriptions
- verdicts

Must not read:

- concept lineage
- prior metrics
- current principle set
- target algorithm
- expected strategy

### Orchestrator

Reads and writes the whole loop. It is responsible for:

- starting and ending runs
- generating retrieval briefs
- recording scorecards and playtests
- distilling candidate beliefs and evidence
- recomputing confidence and statuses
- auditing retrieval usefulness
- rendering markdown surfaces

## Principle Semantics

- Principles are scoped beliefs, not universal truths.
- Every principle must have scope tags.
- Every principle carries a `status` and `confidence`.
- Statuses: `candidate`, `emerging`, `validated`, `contested`, `deprecated`
- Confidence starts at `0.30` and is recomputed after each cycle.
- Contradiction hurts confidence more than support helps it.
- Contested principles stay visible as warnings. Deprecated principles should not dominate retrieval.

## Required Workflow

Before any substantial task:

1. Start or resume a run in SQLite.
2. Generate a designer retrieval brief before design work.
3. Generate an engineer retrieval brief before implementation work.
4. Keep the playtester blind; it reads only the playtester packet.

After each completed cycle:

1. Write predicted and actual scorecards separately.
2. Record playtests independently.
3. Distill candidate principles, anti-patterns, procedures, open questions, and evidence.
4. Recompute belief confidence and statuses.
5. Audit each retrieval item as `useful`, `irrelevant`, `misleading`, or `unknown`.
6. Render the markdown read surfaces from SQLite.

## Operating Rule

If a document, spec, or note conflicts with the SQLite memory store, prefer SQLite and regenerate the markdown surfaces. Use `program.md` for Puzzle Lab execution and `leetcode/program.md` for Algorithm Arcade execution.
