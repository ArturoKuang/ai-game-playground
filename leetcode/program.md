# Algorithm Arcade Memory-Native Loop

This loop designs algorithm-teaching games inside the `leetcode` namespace, but it now runs through the shared SQLite memory system instead of markdown-first learnings.

## Required Phase Order

Every cycle must execute in this order:

1. `Start Run`
2. `Retrieve`
3. `Predict`
4. `Act`
5. `Evaluate`
6. `QA Fix Loop`
7. `Distill`
8. `Update Beliefs`
9. `Audit Retrieval`
10. `Render`
11. `Repeat`

Do not skip retrieval, belief recomputation, or retrieval audit.

Inside `Evaluate` and `QA Fix Loop`, use this sub-sequence:

`Playtester QA -> Engineer bugfix -> Playtester retest -> repeat until no blocking bugs remain`

## Inputs Before Work Starts

- Designer reads `memory/designer_brief.md` plus the algorithm curriculum and current spec context.
- Engineer reads `memory/engineer_brief.md` plus the assigned spec and code.
- Playtester reads `memory/playtester_packet.md` only.

The playtester must remain blind to target algorithm, prior decisions, lineage, and prior metrics.

Required handoffs:

- `Designer -> Engineer`: algorithm game spec plus predicted scorecard
- `Engineer -> Playtester`: playable build plus controls, with no target algorithm explanation
- `Playtester -> Engineer`: structured bug report
- `Engineer -> Playtester`: QA retest build
- `Playtester -> Designer`: blind play report plus final bug status
- `Designer -> Engineer` on iterate: revised spec with the next hypothesis

## Artifact Templates

These are the minimum fields for each handoff artifact in the algorithm-game loop.

### Algorithm Game Spec

Required fields:

1. `game_name`
2. `algorithm_target`
3. `core_insight`
4. `one_line_pitch`
5. `rules`
6. `core_actions`
7. `algorithm_to_mechanic_mapping`
8. `why_greedy_fails`
9. `aha_moment`
10. `difficulty_progression`
11. `predicted_failure_mode`
12. `acceptance_criteria`
13. `predicted_scorecard`
14. `open_questions_for_engineering`

### Predicted Scorecard

Required fields:

1. `metric_key`
2. `predicted_value`
3. `reason`

Recommended metric set:

- `skill_depth`
- `counterintuitive_moves`
- `algorithm_alignment`
- `greedy_optimal_gap`
- `difficulty_curve`
- `insight_inflection`

### Implementation Packet

Required fields:

1. `version_id`
2. `algorithm_game_spec`
3. `prototype_scope`
4. `difficulty_scope`
5. `non_goals`
6. `predicted_scorecard`

### Prototype Package

Required fields:

1. `game_entrypoint`
2. `difficulty_controls`
3. `changed_files`
4. `artifact_paths`
5. `actual_scorecard`
6. `known_issues`

### Bug Report

Required fields:

1. `bug_id`
2. `title`
3. `severity`
4. `blocking`
5. `reproduction_steps`
6. `expected_behavior`
7. `actual_behavior`
8. `notes`

### Bugfix Patch

Required fields:

1. `bug_id`
2. `summary`
3. `changed_files`
4. `commit_or_artifact_ref`
5. `known_limitations`

### QA Retest Report

Required fields:

1. `bug_id`
2. `retest_status`
3. `notes`
4. `new_bugs_found`

### Blind Play Report

Required fields:

1. `rules_clarity`
2. `easy_strategy`
3. `medium_strategy`
4. `hard_strategy`
5. `strategy_evolution`
6. `plain_english_pattern`
7. `naive_vs_optimal`
8. `confusion_points`
9. `bug_summary`
10. `verdict`

### Decision Memo

Required fields:

1. `decision`
2. `why`
3. `evidence_used`
4. `bug_status`
5. `algorithm_alignment_judgment`
6. `next_action`

If `decision = iterate`, also require:

1. `spec_changes`
2. `target_metric_delta`
3. `target_strategy_shift`

If `decision = kill`, also require:

1. `lesson_to_distill`

If `decision = keep`, also require:

1. `polish_scope`

## Operational Contract

### 1. Start Run

Create a run in the `leetcode` namespace:

```bash
node tools/memory-cli.mjs create-run --json '{
  "namespace": "leetcode",
  "loopType": "algorithm_arcade",
  "status": "active",
  "summary": "Algorithm Arcade cycle"
}'
```

### 2. Retrieve

Generate role-specific retrieval briefs before design or build work:

```bash
node tools/memory-cli.mjs create-brief --json '{"runId":"...","role":"designer","task":"Select or revise an algorithm concept","tags":["dfs","search","hidden-information"]}'
node tools/memory-cli.mjs create-brief --json '{"runId":"...","role":"engineer","task":"Build and measure the next algorithm prototype","tags":["dfs","budget-pressure","difficulty-curve"]}'
node tools/memory-cli.mjs render
```

### 3. Predict

Designer outputs to memory:

- concept record
- concept version record
- predicted scorecard

The predicted scorecard should include standard metrics plus algorithm metrics when relevant:

- `solvability`
- `puzzle_entropy`
- `skill_depth`
- `counterintuitive_moves`
- `drama`
- `decision_entropy`
- `info_gain_ratio`
- `algorithm_alignment`
- `greedy_optimal_gap`
- `difficulty_curve`
- `insight_inflection`

### 4. Act

Engineer builds the assigned version and writes:

- implementation artifacts
- actual scorecard
- raw metric values

The engineer should read the brief before opening the spec or code so implementation starts from retrieved memory, not ad hoc recall.

Required handoff to playtesting:

- game entrypoint
- controls
- neutral session instructions

Must not include:

- target algorithm explanation
- expected strategy
- actual metrics

### 5. Evaluate

Playtester writes blind playtest records.

The playtester report must describe the discovered strategy in plain English without algorithm jargon.

If bugs are found, the playtester must also hand back a structured bug report using:

```bash
node tools/memory-cli.mjs report-bug --json '{
  "versionId":"VERSION_ID",
  "playtestId":"PLAYTEST_ID",
  "title":"Bug title",
  "severity":"high",
  "reproductionSteps":"How to reproduce it.",
  "expectedBehavior":"What should happen.",
  "actualBehavior":"What happened instead.",
  "blocking":true
}'
```

Do not let the designer make the final keep / iterate / kill decision while blocking bugs remain open.

### 6. QA Fix Loop

After playtesting, the engineer owns bugfix work until QA is clear enough for real evaluation.

Loop steps:

1. playtester reports bugs
2. engineer fixes the reported bugs
3. engineer records the fix pass
4. playtester re-tests the bug
5. repeat until blocking bugs are cleared

Engineer fix pass:

```bash
node tools/memory-cli.mjs record-bugfix --json '{
  "bugId":"BUG_ID",
  "engineerRole":"engineer",
  "summary":"What changed to address the bug.",
  "gitCommit":"COMMIT_HASH"
}'
```

Playtester retest:

```bash
node tools/memory-cli.mjs record-qa-retest --json '{
  "bugId":"BUG_ID",
  "playtestId":"PLAYTEST_ID",
  "testerRole":"playtester",
  "status":"fixed",
  "notes":"Retest result."
}'
```

Valid retest statuses:

- `fixed`
- `still_failing`
- `new_issue`
- `not_retested`

Only after blocking bugs are closed should the designer write the final decision:

- `keep`
- `iterate`
- `kill`

### 7. Distill

Distillation is explicit. Emit structured memory objects, not free-form transcript dumps.

Outputs:

- candidate principles
- anti-patterns
- procedures
- open questions
- evidence rows linking version to principle

Use `record-cycle` when you want one structured write path for the whole cycle.

### 8. Update Beliefs

Recompute confidence and statuses after distillation:

```bash
node tools/memory-cli.mjs recompute-beliefs --json '{"namespace":"leetcode"}'
```

Status promotion is autonomous. Principles are not hand-promoted in markdown.

### 9. Audit Retrieval

Every retrieval item should be audited:

- `useful`
- `irrelevant`
- `misleading`
- `unknown`

This affects future ranking, so do not leave the audit step out of the loop.

### 10. Render

Regenerate the read surfaces:

```bash
node tools/memory-cli.mjs render
```

## Memory Inputs By Phase

- Retrieve: principles, anti-patterns, similar versions, blind spots, procedures
- Predict: designer brief plus current algorithm curriculum context
- Act: engineer brief plus assigned spec and implementation context
- Evaluate: playtester packet only
- QA Fix Loop: bug reports, bugfix passes, QA retest results
- Distill and Update Beliefs: full cycle outputs plus relevant memory history

## Memory Outputs By Phase

- Predict: concept hypothesis and predicted scorecard
- Act: artifacts, implementation facts, actual scorecard
- Evaluate: playtest report, discovered strategy description, bug reports
- QA Fix Loop: bugfix passes, QA retest results, then final decision
- Distill: candidate principles, anti-patterns, procedures, open questions, evidence
- Update Beliefs: confidence and status updates
- Audit Retrieval: usefulness feedback

## Hard Rules

- Do not treat `leetcode/learnings.md` as canonical memory.
- Do not let the loop begin directly at design.
- Do not let the playtester see target intent.
- Do not let blocking bugs remain open when recording a final keep / iterate / kill decision.
- Do not skip rendering after belief updates; the briefs and summaries must stay in sync with SQLite.
