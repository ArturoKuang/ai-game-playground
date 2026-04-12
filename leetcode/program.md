# Algorithm Arcade — Claude Code Design Loop

An agentic loop that designs, builds, tests, and iterates on puzzle games teaching algorithm/data structure concepts. Designed to run autonomously in Claude Code using the `/loop` skill, `Agent` tool with worktree isolation, and the SQLite memory system.

---

## Architecture

```
 ORCHESTRATOR (this file — you)
 │
 ├─ reads: curriculum.md, memory/designer_brief.md, memory/run_summary.md
 ├─ picks next topic(s) from curriculum
 ├─ tracks budget: iterations remaining, games kept, games killed
 │
 └─── LOOP (repeat until budget exhausted or all Tier 1-2 topics covered)
      │
      ├── PHASE 1: START RUN
      │   └─ create-run in SQLite memory
      │
      ├── PHASE 2: RETRIEVE
      │   ├─ generate designer brief
      │   ├─ generate engineer brief
      │   └─ render markdown surfaces
      │
      ├── PHASE 3: DESIGN (designer role)
      │   ├─ reads: memory/designer_brief.md + curriculum.md + learnings.md
      │   ├─ picks 1-2 algorithm topics
      │   ├─ brainstorms 3-5 concepts per topic
      │   ├─ filters through 5 litmus tests
      │   ├─ writes predicted scorecard to memory
      │   └─ outputs: 1-2 specs in leetcode/specs/<game>.md
      │
      ├── PHASE 4: BUILD (engineer role — use Agent with worktree isolation)
      │   ├─ reads: memory/engineer_brief.md + spec
      │   ├─ builds prototype + solver
      │   ├─ computes standard + algorithm-specific metrics
      │   ├─ writes actual scorecard to memory
      │   ├─ auto-kills if metrics fatal
      │   └─ outputs: committed prototype + metrics in spec
      │
      ├── PHASE 5: PLAYTEST (playtester role)
      │   ├─ reads: memory/playtester_packet.md ONLY (blind)
      │   ├─ plays Easy → Medium → Hard progression
      │   ├─ reports bugs, strategy evolution, pattern discovery
      │   └─ outputs: blind play report in spec + bug reports in memory
      │
      ├── PHASE 6: QA FIX LOOP (if bugs found)
      │   ├─ engineer fixes blocking bugs
      │   ├─ playtester retests
      │   └─ repeat until no blocking bugs remain
      │
      ├── PHASE 7: DESIGNER DECISION
      │   ├─ reads: spec + metrics + play report + bug status
      │   ├─ decides: keep / iterate / kill
      │   ├─ if iterate: revises spec → back to PHASE 4 (max 3 iterations)
      │   ├─ if keep: proceed to PHASE 8
      │   └─ if kill: log to memory + results.tsv + learnings.md
      │
      ├── PHASE 8: POLISH (keep only)
      │   ├─ engineer adds: difficulty UI, concept bridge, share text, stats
      │   └─ playtester does final review
      │
      ├── PHASE 9: DISTILL
      │   ├─ emit candidate principles, anti-patterns, evidence
      │   └─ recompute beliefs
      │
      ├── PHASE 10: AUDIT & RENDER
      │   ├─ audit retrieval usefulness
      │   ├─ render markdown surfaces
      │   └─ update curriculum.md, results.tsv, learnings.md
      │
      └── REPEAT
```

---

## How to Run in Claude Code

### Option A: Autonomous Loop (Recommended)

Use the `/loop` skill for self-paced autonomous cycles:

```
/loop "Read leetcode/program.md and execute ONE cycle of the algorithm game loop. Follow the 10-phase sequence exactly."
```

This lets Claude Code self-pace — it runs one cycle, then schedules the next wake-up automatically.

### Option B: Single Cycle

Run one cycle per conversation. Use this kickoff prompt:

```
Read leetcode/program.md. Execute ONE cycle of the algorithm game loop:
1. Initialize memory: node tools/memory-cli.mjs init (if first run)
2. Create run in memory
3. Generate retrieval briefs + render
4. Design: pick next unlocked topic, brainstorm, filter, output specs
5. Build: use Agent tool (worktree isolation) per spec → prototype + metrics
6. Playtest: blind play → strategy evolution report + bug reports
7. QA fix loop: fix blocking bugs, retest
8. Designer decision: keep/iterate/kill
9. If keep: polish pass
10. Distill + recompute beliefs + audit retrieval + render
11. Update curriculum.md, results.tsv, learnings.md
12. Commit all changes

Report: what was tried, what survived, what was learned.
```

### Option C: Timed Loop

Use the `/loop` skill with a fixed interval:

```
/loop 20m "Execute one cycle of leetcode/program.md"
```

---

## Claude Code Agent Strategy

### Engineer Work: Use Agent with Worktree Isolation

Build work should use the `Agent` tool with `isolation: "worktree"` so the engineer agent works on an isolated copy of the repo. This prevents half-built prototypes from breaking the main branch.

```
Agent({
  description: "Build <GameName> prototype",
  isolation: "worktree",
  prompt: "Read leetcode/specs/<game>.md. Build the prototype in src/games/<GameName>.tsx and solver in src/solvers/<GameName>.solver.ts. Compute metrics. Report back with the actual scorecard. Commit your work."
})
```

### Playtester Work: Use Agent (No Code Access)

The playtester agent should NOT read source code. Launch it with strict instructions:

```
Agent({
  description: "Blind playtest <GameName>",
  prompt: "Read memory/playtester_packet.md. Start the dev server, open <GameName> in browser. Play blind at Easy, Medium, Hard. Report strategy evolution, bugs, pattern discovery. Do NOT read any source code."
})
```

### Parallel Engineering

When multiple specs survive design filtering, launch engineer agents in parallel:

```
// In a single message, launch multiple agents:
Agent({ description: "Build GameA", isolation: "worktree", prompt: "..." })
Agent({ description: "Build GameB", isolation: "worktree", prompt: "..." })
```

---

## Phase Details

### Phase 1: Start Run

```bash
node tools/memory-cli.mjs create-run --json '{
  "namespace": "leetcode",
  "loopType": "algorithm_arcade",
  "status": "active",
  "summary": "Algorithm Arcade cycle — targeting [TOPIC]"
}'
```

### Phase 2: Retrieve

Generate role-specific retrieval briefs before design or build work:

```bash
node tools/memory-cli.mjs create-brief --json '{"runId":"RUN_ID","role":"designer","task":"Select or revise an algorithm concept","tags":["TOPIC_TAGS"]}'
node tools/memory-cli.mjs create-brief --json '{"runId":"RUN_ID","role":"engineer","task":"Build and measure the next algorithm prototype","tags":["TOPIC_TAGS"]}'
node tools/memory-cli.mjs render
```

### Phase 3: Design

Designer reads `memory/designer_brief.md` + curriculum + learnings. Outputs:
- Concept record in memory
- Concept version record
- Predicted scorecard
- Spec file in `leetcode/specs/<game>.md`

### Phase 4: Build

Engineer reads `memory/engineer_brief.md` + spec. Outputs:
- Game file: `src/games/<GameName>.tsx`
- Solver: `src/solvers/<GameName>.solver.ts`
- Registered in `src/games/index.ts`
- Actual scorecard in memory
- Artifacts recorded

### Phase 5: Playtest

Playtester reads `memory/playtester_packet.md` ONLY. Must NOT see:
- Target algorithm
- Expected strategy
- Actual metrics
- Concept lineage

Reports: blind play at Easy → Medium → Hard, strategy evolution, bugs.

### Phase 6: QA Fix Loop

```bash
# Playtester reports bug
node tools/memory-cli.mjs report-bug --json '{...}'

# Engineer fixes
node tools/memory-cli.mjs record-bugfix --json '{...}'

# Playtester retests
node tools/memory-cli.mjs record-qa-retest --json '{...}'
```

Repeat until no blocking bugs remain.

### Phase 7: Designer Decision

Do NOT decide while blocking bugs are open. Evaluate against BOTH gates (see `leetcode/specs/game-feel.md`):

- **KEEP**: Algorithm Gate passes (Structural Fit, Breakpoint D3-D4, Efficiency Gap ≥ 20%, Wasted Work ≥ 30%, Scaling monotonic, Strategy Match) AND Fun Gate passes (Comprehension ≤ 5, Dead Moments 0, Confusion ≤ 2, Shift ≥ 1, Replay Pull ≥ 3/5, Best Moment ≥ 3/5, Decision Density > 60%, Juice 8/8)
- **ITERATE (polish)**: Algorithm Gate passes, Fun Gate fails → polish iteration (max 2 rounds)
- **ITERATE (mechanic)**: Structural fit strong but solver metrics miss → revise spec (max 3 iterations)
- **KILL**: Efficiency Gap < 15%, or Structural Fit fails, or algorithm doesn't emerge from play

### Phase 8: Polish (Keep Only)

1. Difficulty level UI (clear selector)
2. Concept bridge card (post-win reveal)
3. Share text (emoji grid)
4. Stats integration
5. Animations
6. Re-run metrics to verify

### Phase 9: Distill

Emit structured memory objects:
- Candidate principles / anti-patterns / procedures / open questions
- Evidence rows linking version to principle

```bash
node tools/memory-cli.mjs recompute-beliefs --json '{"namespace":"leetcode"}'
```

### Phase 10: Audit & Render

Audit every retrieval item: `useful`, `irrelevant`, `misleading`, `unknown`.

```bash
node tools/memory-cli.mjs audit-brief --json '{...}'
node tools/memory-cli.mjs render
```

Update `leetcode/curriculum.md`, `leetcode/results.tsv`, `leetcode/learnings.md`.

---

## Topic Selection Logic

```
1. Read curriculum.md
2. Find all topics where status = "todo" AND all prereqs have status = "keep"
3. Prefer Tier 1 over Tier 2 (breadth first within current tier)
4. If multiple candidates: pick the one with the most downstream dependents
5. Select 1-2 topics per cycle
```

## Budget Management

```
per_cycle:
  max_concepts_per_topic: 5  (designer brainstorms)
  max_specs_per_cycle: 3     (designer filters to)
  max_iterations_per_spec: 3 (before kill)

total_budget:
  max_cycles: 20
  stop_early_if: all Tier 1 topics have status != "todo"
```

## When to Stop

1. All Tier 1 topics processed — either kept or killed with lessons logged
2. Budget exhausted — 20 cycles
3. Stuck — 3 consecutive cycles with 0 keeps and no new learnings
4. Success — 5+ games kept across different topics

---

## Agent Boundaries

| | Designer | Engineer | Playtester |
|---|---|---|---|
| **Reads code** | Never | Yes | Never |
| **Writes code** | Never | Yes | Never |
| **Reads curriculum.md** | Yes | Yes (alignment) | Never |
| **Reads learnings.md** | Yes | Never | Never |
| **Reads memory briefs** | designer_brief | engineer_brief | playtester_packet |
| **Reads metrics** | Yes (raw) | Produces them | Never |
| **Reads play reports** | Yes | Never | Produces them |
| **Makes taste calls** | Yes | Never | Never |
| **Makes kill decisions** | Yes | Auto-kill only | Never |
| **Names algorithms** | Yes | Yes (in solver) | **Never** |

---

## Hard Rules

1. **2D** — no 3D rendering
2. **No external assets** — emoji, unicode, colored shapes, system fonts
3. **1-5 minute sessions** at medium difficulty
4. **Difficulty selector** — 5 levels (Easy/Medium/Hard), not daily seed
5. **No algorithm jargon in gameplay** — the game never says "binary search"
6. **Concept bridge AFTER completion only** — reveal algorithm + LeetCode links after winning
7. **Same codebase** — games in `src/games/`, solvers in `src/solvers/`, registered in `src/games/index.ts`
8. **Stats per difficulty level** — track completion rate and move count per difficulty
9. **Memory is canonical** — do not treat `leetcode/learnings.md` as the source of truth; the SQLite store is canonical
10. **Retrieval before action** — never start design or build without generating a retrieval brief first
11. **No decision with open bugs** — do not record keep/iterate/kill while blocking bugs remain
12. **Render after beliefs** — always render markdown surfaces after recomputing beliefs
