# Recursive Self-Improving Memory System Spec

Version: `v1`
Status: Active
Canonical store: `SQLite`
Scope: `LeetCode` algorithm game design memory

Related artifact: [memory-erd.md](./memory-erd.md)

## 1. Purpose

This memory system exists to make the agent recursively self-improve at designing algorithm-teaching games.

The system must:

1. Remember what was tried
2. Compare outcomes across attempts
3. Generalize scoped lessons from evidence
4. Update belief strength over time
5. Retrieve the right lessons for the next design/build/test decision
6. Audit whether retrieval helped or hurt

The target loop is:

`retrieve -> predict -> act -> evaluate -> distill -> update beliefs -> audit retrieval -> repeat`

## 2. Goals

Primary goals:

1. Reduce repeated mistakes across cycles
2. Improve prediction accuracy over time
3. Reduce iterations required to reach a keep-worthy game
4. Increase keep rate without collapsing into one mechanic family
5. Track algorithm-specific learnings across the curriculum

Secondary goals:

1. Keep memory legible to humans through generated markdown
2. Keep the playtester blind
3. Keep the system deterministic enough to debug

## 3. Non-Goals

This system does not aim to:

1. Store full source files or large transcripts in the database
2. Replace git as the artifact store
3. Use embeddings in v1
4. Support human review workflows

## 4. Core Design Decisions

1. One shared memory system with namespaces: `global`, `leetcode`
2. SQLite is the source of truth
3. Markdown is generated from the database for retrieval and inspection
4. The system starts from scratch with no backfill
5. Principle promotion and confidence updates are fully autonomous
6. The playtester is blind to lineage, prior metrics, and target intent
7. Retrieval is role-specific and budget-capped

## 4.1 ERD

See [memory-erd.md](./memory-erd.md) for the full entity relationship diagram.

## 5. Tables

- `runs` — one row per loop cycle
- `concepts` — canonical game concepts
- `concept_versions` — iterations of a concept within runs
- `scorecards` — predicted and actual metric snapshots
- `metric_definitions` — what metrics exist and how they scale
- `metric_values` — individual metric readings on a scorecard
- `playtests` — blind play session reports
- `principles` — learned rules, anti-patterns, procedures, open questions
- `principle_evidence` — links between principles and the versions that support/contradict them
- `retrieval_briefs` — what each role was told before acting
- `retrieval_items` — ranked items within a brief, with usefulness feedback
- `tags` — taxonomy for concepts, versions, and principles
- `artifacts` — file paths and git commits for game/solver code
- `bugs` — tracked defects found during playtesting
- `bug_fix_passes` — engineer fix attempts
- `qa_retest_results` — playtester verification of fixes

## 6. Principle Lifecycle

```
candidate -> emerging -> validated
                     \-> contested -> deprecated
```

Confidence is recomputed from evidence after each cycle. Principles are never hand-promoted in markdown.
