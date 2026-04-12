# Puzzle Lab — Codex Execution Loop

This is the primary orchestration document for the `puzzle_lab` namespace when Codex is the operator.

It is optimized for how Codex actually works in this repo:

1. one operator working directly in the workspace
2. SQLite memory as the canonical store
3. concrete local commands, not abstract agent choreography
4. role execution through explicit subagents or tightly separated role passes

If you are running the algorithm-learning loop, use `leetcode/program.md` instead.

## Codex Operating Model

Codex owns the full loop end to end.

`Designer`, `Engineer`, and `Playtester` should be treated as distinct subagents or, if you are not literally spawning agents, as strictly separated role passes with artifact handoffs between them:

1. `Designer`:
   choose direction, define hypothesis, predict outcomes
2. `Engineer`:
   build the prototype, measure it, write artifacts and scorecards
3. `Playtester`:
   interact with the game blind and report what actually emerged

The orchestrator must preserve the handoff boundaries even when one operator performs all roles.

Required handoffs:

1. `Designer -> Engineer`: game spec plus predicted scorecard
2. `Engineer -> Playtester`: playable build plus controls, but no strategy or metrics
3. `Playtester -> Engineer`: bug report for QA fixes
4. `Engineer -> Playtester`: QA retest build
5. `Playtester -> Designer`: blind play report plus final bug status
6. `Designer -> Engineer` on iterate: revised spec for the next version

## Artifact Templates

These are the minimum fields for each handoff artifact. If a field is missing, the handoff is underspecified.

### Game Spec

Required fields:

1. `game_name`
2. `one_line_pitch`
3. `player_problem`
4. `rules`
5. `core_actions`
6. `win_or_failure_condition`
7. `target_player_experience`
8. `hypothesis`
9. `predicted_failure_mode`
10. `difficulty_knobs`
11. `acceptance_criteria`
12. `predicted_scorecard`
13. `open_questions_for_engineering`

### Predicted Scorecard

Required fields:

1. `metric_key`
2. `predicted_value`
3. `reason`

Minimum expectation:

- 2 or more concrete metrics
- each prediction should be falsifiable

### Implementation Packet

Required fields:

1. `version_id`
2. `game_spec`
3. `prototype_scope`
4. `non_goals`
5. `acceptance_criteria`
6. `predicted_scorecard`

### Prototype Package

Required fields:

1. `game_entrypoint`
2. `changed_files`
3. `artifact_paths`
4. `implementation_notes`
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

Valid `retest_status` values:

- `fixed`
- `still_failing`
- `new_issue`
- `not_retested`

### Blind Play Report

Required fields:

1. `rules_clarity`
2. `intuitive_strategy`
3. `evolved_strategy`
4. `plain_english_pattern`
5. `confusion_points`
6. `boring_moments`
7. `best_moment`
8. `bug_summary`
9. `verdict`

### Decision Memo

Required fields:

1. `decision`
2. `why`
3. `evidence_used`
4. `bug_status`
5. `next_action`

If `decision = iterate`, also require:

1. `spec_changes`
2. `target_metric_delta`
3. `target_behavior_delta`

If `decision = kill`, also require:

1. `lesson_to_distill`

If `decision = keep`, also require:

1. `polish_scope`

Do not assume this repo has prompt files, spec folders, or a separate review prompt. The old Puzzle Lab funnel used those surfaces. The current repo does not. Use the memory system and the live repo layout instead.

Do not treat markdown notes as canonical memory. If something matters to the loop, write it to SQLite first and regenerate markdown surfaces from there.

## Current Repo Reality

These are the real execution surfaces today:

- Canonical memory store: `memory/system.sqlite`
- Memory CLI: `tools/memory-cli.mjs`
- Generated read surfaces: `memory/current_principles.md`, `memory/current_anti_patterns.md`, `memory/blind_spots.md`, `memory/designer_brief.md`, `memory/engineer_brief.md`, `memory/playtester_packet.md`, `memory/run_summary.md`
- Blind play harness: `tools/playtest.mjs`, `tools/playtest-session.mjs`
- Shared UI: `src/components/`
- Shared utilities: `src/utils/`
- Game registry: `src/games/index.ts`

Important implications:

1. `prompts/` is not a live dependency for Puzzle Lab execution
2. `specs/` is not the canonical concept store
3. `tools/review-prompt.md` is not a live dependency
4. the game registry is currently minimal, so the first complete prototype matters more than producing lots of paper designs

## Required Phase Order

Every cycle must run in this exact order:

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
11. `Finish Run`
12. `Repeat`

Do not skip retrieval, belief updates, or retrieval audit.

Inside `Evaluate` and `QA Fix Loop`, use this sub-sequence:

`Playtester QA -> Engineer bugfix -> Playtester retest -> repeat until no blocking bugs remain`

## Bootstrap

Before the first cycle in a fresh workspace:

```bash
npm run memory:init
npm run memory:render
```

Read:

- `memory/current_principles.md`
- `memory/current_anti_patterns.md`
- `memory/blind_spots.md`

If the CLI or schema cannot store a field the loop now depends on, extend the memory tooling first. Do not bypass SQLite by inventing a side markdown workflow.

## One-Cycle Checklist

### 1. Start Run

Create a run:

```bash
node tools/memory-cli.mjs create-run --json '{
  "namespace": "puzzle_lab",
  "loopType": "design_cycle",
  "status": "active",
  "summary": "Puzzle Lab Codex cycle"
}'
```

Capture the returned `run_id`. Everything in the cycle hangs off that.

### 2. Retrieve

Generate the role briefs before deciding what to build:

```bash
node tools/memory-cli.mjs create-brief --json '{
  "runId": "RUN_ID",
  "role": "designer",
  "task": "Choose the next puzzle direction",
  "tags": ["search", "hidden-information", "resource-pressure"]
}'

node tools/memory-cli.mjs create-brief --json '{
  "runId": "RUN_ID",
  "role": "engineer",
  "task": "Build and measure the selected puzzle version",
  "tags": ["solver", "difficulty", "interaction"]
}'

node tools/memory-cli.mjs render
```

Then read:

1. `memory/designer_brief.md`
2. `memory/engineer_brief.md`
3. `memory/playtester_packet.md`

The playtester packet is the only blind surface. Do not contaminate it with concept history, expected strategy, or raw metrics.

### 3. Predict

In `Designer` mode, Codex should:

1. review the retrieval brief
2. inspect the live repo with `rg` before making assumptions
3. choose one design direction, not a broad brainstorm dump
4. define the concept and the concrete version hypothesis
5. write a predicted scorecard before code changes begin

Minimum writes:

1. concept
2. concept version
3. predicted scorecard

Required handoff to engineering:

1. a game spec
2. the version hypothesis
3. the predicted scorecard
4. explicit prototype acceptance criteria

The engineer should start from the spec, not from loose chat instructions.

Use the CLI directly:

```bash
node tools/memory-cli.mjs upsert-concept --json '{
  "namespace": "puzzle_lab",
  "canonicalName": "Concept Name",
  "currentStatus": "candidate",
  "summary": "One-sentence design summary",
  "tags": ["search", "hidden-information"]
}'

node tools/memory-cli.mjs create-version --json '{
  "conceptId": "CONCEPT_ID",
  "runId": "RUN_ID",
  "hypothesis": "If the board hides information behind a limited probe budget, players will need search rather than inspection.",
  "notes": "First playable cut",
  "tags": ["search", "budget-pressure"]
}'

node tools/memory-cli.mjs write-scorecard --json '{
  "versionId": "VERSION_ID",
  "kind": "predicted",
  "authorRole": "designer",
  "summary": "Predicted depth from hidden information plus budget pressure.",
  "metrics": [
    { "metricKey": "entropy", "value": 14, "rationale": "Expect moderate branching." },
    { "metricKey": "skill_depth", "value": 0.35, "rationale": "Random play should underperform planning." }
  ]
}'
```

Predictions should be falsifiable. "Could be fun" is not a useful prediction.

### 4. Act

In `Engineer` mode, Codex should:

1. inspect existing code patterns first
2. build the smallest viable playable prototype
3. register it in `src/games/index.ts`
4. record changed files as artifacts
5. write the actual scorecard after measuring real behavior

Default build targets:

1. game code in `src/games/`
2. solver or logic support where needed
3. shared UI only when reuse is warranted

Default validation posture:

1. run the cheapest meaningful validation available
2. prefer compile or smoke checks before deeper polish
3. measure before making taste claims

Artifact and scorecard writes:

```bash
node tools/memory-cli.mjs write-artifact --json '{
  "versionId": "VERSION_ID",
  "artifactType": "source",
  "filePath": "src/games/ExampleGame.tsx",
  "gitCommit": "COMMIT_HASH"
}'

node tools/memory-cli.mjs write-scorecard --json '{
  "versionId": "VERSION_ID",
  "kind": "actual",
  "authorRole": "engineer",
  "summary": "Prototype built and measured.",
  "metrics": [
    { "metricKey": "entropy", "value": 11.8, "rationale": "Measured from legal move branching." },
    { "metricKey": "skill_depth", "value": 0.22, "rationale": "Strategic play outperforms random, but not enough yet." }
  ]
}'
```

If the repo is still at zero playable Puzzle Lab games, bias toward one complete playable loop over ambitious system design.

Required handoff to playtesting:

1. game id or entrypoint
2. controls needed to operate the build
3. any neutral session instructions

Must not hand off:

1. expected strategy
2. raw metrics
3. designer rationale beyond neutral rules context

### 5. Evaluate

In `Playtester` mode, Codex should interact with the game blind through the harness, not by reasoning from source.

If a local app session is required, start it separately using the normal Expo command for the target surface. Then use:

```bash
node tools/playtest.mjs start GAME_ID
node tools/playtest.mjs elements
node tools/playtest.mjs screenshot
node tools/playtest.mjs text
node tools/playtest.mjs console
node tools/playtest.mjs close
```

Minimum playtest write with current tooling:

```bash
node tools/memory-cli.mjs write-playtest --json '{
  "versionId": "VERSION_ID",
  "testerRole": "playtester",
  "strategyMode": "blind",
  "blindPattern": "Plain-English strategy the player discovered",
  "verdict": "iterate",
  "reportSummary": "What worked, what confused the player, and whether the intended pattern emerged."
}'
```

The playtester should also produce a concrete QA bug report for engineering when bugs are found. Minimum bug report fields:

1. bug title
2. reproduction steps
3. expected behavior
4. actual behavior
5. severity
6. whether the bug blocks meaningful evaluation

Do not record the final designer decision yet if blocking bugs are still open.

### 6. QA Fix Loop

After playtesting, the engineer owns QA fixes until the playtester reports that blocking bugs are gone.

Loop steps:

1. playtester reports bugs
2. engineer fixes the reported bugs
3. engineer hands back a QA retest build
4. playtester re-tests the same bugs plus any obvious regressions
5. repeat until no blocking bugs remain

Engineer responsibilities in this loop:

1. treat the playtester bug report as a concrete handoff artifact
2. fix bugs before new feature work
3. record fix notes in version notes or implementation notes
4. hand the playtester a retest target, not a vague "should be fixed"

Playtester responsibilities in this loop:

1. verify each bug as `fixed` or `still failing`
2. report newly introduced bugs separately
3. explicitly mark when the build is clear for design evaluation

Only after the build is clear enough for real evaluation should the designer make the final keep / iterate / kill decision.

Then record the version decision:

```bash
node tools/memory-cli.mjs record-decision --json '{
  "versionId": "VERSION_ID",
  "decision": "iterate",
  "notes": "Good signal, but the core insight did not emerge clearly enough."
}'
```

Current tooling stores `blind_pattern`, `verdict`, and `report_summary`. If the loop needs richer structured blind-learning fields, extend the schema and CLI before relying on them.

### 7. Distill

After evaluation, create structured memory outputs:

1. candidate principles
2. anti-patterns
3. procedures
4. open questions
5. evidence rows

Use structured writes, not free-form conclusions.

Example:

```bash
node tools/memory-cli.mjs upsert-principle --json '{
  "namespace": "puzzle_lab",
  "title": "Hidden information preserves search depth",
  "principleType": "principle",
  "statement": "In search-oriented puzzle games, hidden target state helps prevent full-board inspection from replacing interactive discovery.",
  "whyItMatters": "Supports real search behavior instead of A10 stare-solving.",
  "status": "candidate",
  "tags": ["search", "hidden-information"]
}'

node tools/memory-cli.mjs add-evidence --json '{
  "principleId": "PRINCIPLE_ID",
  "versionId": "VERSION_ID",
  "relationType": "support",
  "weight": 0.7,
  "effectSize": 0.6,
  "scopeMatch": 1.0,
  "note": "Blind play required probing rather than inspection."
}'
```

If you already have the whole cycle payload assembled cleanly, prefer:

```bash
node tools/memory-cli.mjs record-cycle --json '{...}'
```

That keeps writes transactional and reduces drift between records.

### 8. Update Beliefs

Recompute confidence and statuses:

```bash
node tools/memory-cli.mjs recompute-beliefs --json '{"namespace":"puzzle_lab"}'
```

### 9. Audit Retrieval

Every retrieved item should be marked:

1. `useful`
2. `irrelevant`
3. `misleading`
4. `unknown`

This is mandatory. Without retrieval audit, the system cannot learn whether its own memory helped.

Example:

```bash
node tools/memory-cli.mjs audit-brief --json '{
  "briefId": "BRIEF_ID",
  "feedback": [
    {
      "sourceType": "principle",
      "sourceId": "PRINCIPLE_ID",
      "usefulnessFeedback": "useful"
    }
  ]
}'
```

Audit both designer and engineer briefs by the end of the cycle.

### 10. Render

Regenerate the markdown read surfaces:

```bash
npm run memory:render
```

At minimum, refresh:

1. `memory/current_principles.md`
2. `memory/current_anti_patterns.md`
3. `memory/blind_spots.md`
4. `memory/designer_brief.md`
5. `memory/engineer_brief.md`
6. `memory/playtester_packet.md`
7. `memory/run_summary.md`

### 11. Finish Run

Close the run explicitly:

```bash
node tools/memory-cli.mjs finish-run --json '{
  "runId": "RUN_ID",
  "status": "completed",
  "summary": "One-sentence result summary"
}'
```

Then render again if needed so `memory/run_summary.md` reflects the final state.

## Codex-Specific Rules

These are the behaviors this document expects from Codex:

1. work from the real repo state, not from stale docs
2. inspect current files before proposing structure
3. prefer one complete cycle over half-finished brainstorming
4. keep role boundaries even when one operator performs all roles
5. do not read source during blind play
6. if memory tooling is missing a required capability, add the capability instead of bypassing the system
7. do not create new ad hoc root markdown files as a substitute for structured memory writes

## What Counts As Success

A good cycle does all of the following:

1. starts from retrieval
2. records a falsifiable prediction
3. produces a playable artifact or a hard measured failure
4. records blind evaluation separately from implementation metrics
5. runs the QA fix loop until blocking bugs are cleared
6. distills at least one reusable structured lesson
7. audits whether retrieval helped

If a cycle ends with only code changes and no memory writes, the loop was not completed.
