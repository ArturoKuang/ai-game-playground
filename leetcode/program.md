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
      ├── PHASE 2.5: PORTFOLIO CRITIQUE (designer, pre-design gate)
      │   ├─ reads: memory/portfolio_review.md + memory/contradictions.md
      │   ├─ notes dominant mechanic family + diversity constraint
      │   └─ if same mechanic appears in last 2 keeps: must pick a different family
      │      OR justify why repeating teaches a different insight
      │
      ├── PHASE 3: DESIGN (designer role)
      │   ├─ reads: memory/designer_brief.md + curriculum.md + learnings.md
      │   ├─ picks 1-2 algorithm topics
      │   ├─ brainstorms 3-5 concepts per topic
      │   ├─ filters through 5 litmus tests
      │   ├─ writes predicted scorecard to memory
      │   ├─ spec MUST include: Mechanic Family + Solver Strategies sections
      │   └─ outputs: 1-2 specs in leetcode/specs/<game>.md
      │
      ├── PHASE 3.5: SOLVER-DIFF GATE (pre-build)
      │   ├─ run: node tools/memory-cli.js check-solver-diff --spec <spec>
      │   ├─ verifies L2 and L5 strategies are structurally different
      │   ├─ blocks build if valid: false
      │   └─ designer revises spec until gate passes
      │
      ├── PHASE 4: BUILD (engineer role — use Agent with worktree isolation)
      │   ├─ reads: memory/engineer_brief.md + spec
      │   ├─ builds prototype + solver (L2 and L5 per spec)
      │   ├─ computes standard + algorithm-specific metrics
      │   ├─ writes actual scorecard to memory
      │   ├─ tags version with the declared `mechanic:<family>` tag
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
      │   ├─ record-decision REQUIRES learnings[] for keep/kill
      │   ├─ (auto-creates principles + evidence + recomputes beliefs)
      │   ├─ if iterate: revises spec → back to PHASE 4 (max 3 iterations)
      │   ├─ if keep: proceed to PHASE 8
      │   └─ if kill: log to memory + results.tsv
      │
      ├── PHASE 8: POLISH (keep only)
      │   ├─ engineer adds: difficulty UI, concept bridge, share text, stats
      │   ├─ playtester does final review
      │   └─ TRANSFER PROBE: playtester receives a fresh LeetCode problem in the same
      │      family, reports whether intuition transferred — record via
      │      `record-transfer-test`
      │
      ├── PHASE 9: DISTILL (cross-cutting learnings only)
      │   ├─ per-decision learnings already recorded in Phase 7
      │   └─ add any cross-concept principles, recompute if needed
      │
      ├── PHASE 10: AUDIT, VALIDATE & RENDER
      │   ├─ audit retrieval usefulness
      │   ├─ validate-run (blocks if learnings missing; warns on missing
      │   │   transfer test or missing mechanic:* tag)
      │   ├─ detect-contradictions (surfaces stale/contested principles)
      │   ├─ render markdown surfaces (auto-generates learnings.md,
      │   │   portfolio_review.md, contradictions.md)
      │   └─ update curriculum.md, results.tsv
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
1. Initialize memory: node tools/memory-cli.js init (if first run)
2. Create run in memory
3. Generate retrieval briefs + render
4. Design: pick next unlocked topic, brainstorm, filter, output specs
5. Build: use Agent tool (worktree isolation) per spec → prototype + metrics
6. Playtest: blind play → strategy evolution report + bug reports
7. QA fix loop: fix blocking bugs, retest
8. Designer decision: use distill to get prompts, then record-decision with learnings[]
9. If keep: polish pass
10. Distill cross-cutting learnings + audit retrieval
11. validate-run (fix errors if any) + render (auto-generates learnings.md)
12. Update curriculum.md, results.tsv
13. Commit all changes

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
node tools/memory-cli.js create-run --json '{
  "namespace": "leetcode",
  "loopType": "algorithm_arcade",
  "status": "active",
  "summary": "Algorithm Arcade cycle — targeting [TOPIC]"
}'
```

### Phase 2: Retrieve

Generate role-specific retrieval briefs before design or build work:

```bash
node tools/memory-cli.js create-brief --json '{"runId":"RUN_ID","role":"designer","task":"Select or revise an algorithm concept","tags":["TOPIC_TAGS"]}'
node tools/memory-cli.js create-brief --json '{"runId":"RUN_ID","role":"engineer","task":"Build and measure the next algorithm prototype","tags":["TOPIC_TAGS"]}'
node tools/memory-cli.js render
```

### Phase 2.5: Portfolio Critique

Before designing, the designer must read `memory/portfolio_review.md`. This surface is auto-generated from `mechanic:<family>` tags on kept concepts and flags mechanic homogeneity.

```bash
# View current portfolio
cat memory/portfolio_review.md

# Or query directly:
node tools/memory-cli.js portfolio-review --json '{"namespace":"leetcode"}'
node tools/memory-cli.js recent-mechanics --json '{"limit":2}'
```

**Diversity constraint**: If the same mechanic family appears in the last 2 keeps, the designer must either (a) pick a different mechanic family this cycle, or (b) explicitly justify in the spec why repeating teaches a genuinely different insight. "It worked last time" is not a justification.

The designer also reads `memory/contradictions.md` and surfaces any principles that newer evidence has challenged.

### Phase 3: Design

Designer reads `memory/designer_brief.md` + curriculum + learnings + portfolio review. Outputs:
- Concept record in memory (with `mechanic:<family>` tag)
- Concept version record
- Predicted scorecard
- Spec file in `leetcode/specs/<game>.md` including:
  - `## Mechanic Family` section (declares mechanic:<family>)
  - `## Solver Strategies` section (declares L2 and L5 strategies structurally)

### Phase 3.5: Solver-Diff Gate

Before the engineer builds, verify that L2 and L5 are declared as structurally different strategies. This is a pure spec-file parser — no DB access needed.

```bash
node tools/memory-cli.js check-solver-diff --spec leetcode/specs/<game>.md
```

Exit code 0 = valid, 1 = invalid. The check catches:
- Missing `## Solver Strategies` section
- L2 and L5 with identical names
- L2 and L5 sharing Approach / Information access / Termination
- Fewer than 2 structural differences listed
- Missing algorithm keyword on L5
- L2 approach that leaks L5 algorithm keywords (Equilibrium-style trap)

If the gate fails, the designer revises the spec. The engineer does not build until the gate passes.

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
node tools/memory-cli.js report-bug --json '{...}'

# Engineer fixes
node tools/memory-cli.js record-bugfix --json '{...}'

# Playtester retests
node tools/memory-cli.js record-qa-retest --json '{...}'
```

Repeat until no blocking bugs remain.

### Phase 7: Designer Decision

Do NOT decide while blocking bugs are open. Evaluate against BOTH gates (see `leetcode/specs/game-feel.md`):

- **KEEP**: Algorithm Gate passes (Structural Fit, Breakpoint D3-D4, Efficiency Gap ≥ 20%, Wasted Work ≥ 30%, Scaling monotonic, Algorithm Alignment ≥ 90%, Strategy Match) AND Fun Gate passes (Comprehension ≤ 5, Dead Moments 0, Confusion ≤ 2, Shift ≥ 1, Replay Pull ≥ 3/5, Best Moment ≥ 3/5, Decision Density > 60%, Juice 8/8)
- **ITERATE (polish)**: Algorithm Gate passes, Fun Gate fails → polish iteration (max 2 rounds)
- **ITERATE (mechanic)**: Structural fit strong but solver metrics miss → revise spec (max 3 iterations)
- **KILL**: Efficiency Gap < 15%, or Structural Fit fails, or Algorithm Alignment < 90%, or algorithm doesn't emerge from play

**Recording the decision:** `record-decision` now **requires a `learnings` array** for keep and kill decisions. You cannot record a keep/kill without extracting at least one learning. Use `distill` first to get guided prompts:

```bash
# 1. Get guided extraction prompts
node tools/memory-cli.js distill --json '{"runId":"RUN_ID"}'

# 2. Record decision with learnings (principles + evidence created automatically)
node tools/memory-cli.js record-decision --json '{
  "versionId": "VERSION_ID",
  "decision": "keep",
  "learnings": [
    {
      "title": "Short principle name",
      "principleType": "principle",
      "statement": "What we learned, stated as a reusable rule.",
      "tags": ["algorithm-family", "mechanic-type"],
      "whyItMatters": "Why this matters for future designs.",
      "evidence": [
        { "relationType": "support", "weight": 1.0, "effectSize": 0.7, "scopeMatch": 1.0 }
      ]
    }
  ]
}'
```

For iterate decisions, learnings are optional but encouraged.

### Phase 8: Polish (Keep Only)

1. Difficulty level UI (clear selector)
2. Concept bridge card (post-win reveal)
3. Share text (emoji grid)
4. Stats integration
5. Animations
6. Re-run metrics to verify
7. **Transfer Probe** — post-win, the playtester is given a fresh LeetCode problem in the same algorithm family (see curriculum.md). Without looking at source or hints, they attempt the problem and report whether the game's intuition transferred.

```bash
node tools/memory-cli.js record-transfer-test --json '{
  "versionId": "VERSION_ID",
  "leetcodeProblem": "LC #125 Valid Palindrome",
  "testerRole": "transfer_tester",
  "outcome": "transfer|partial|no_transfer",
  "reportSummary": "Player solved LC #125 using the same pair-and-converge intuition the game drilled. Did not need to re-derive the pattern."
}'
```

Outcomes:
- `transfer`: player solved the LeetCode problem using the game's intuition with no re-derivation
- `partial`: player got the core pattern but stumbled on a detail (e.g. handling non-alphanumeric chars)
- `no_transfer`: player could not solve the problem, or solved it but using a different mental model than the game taught

A keep with `no_transfer` is a red flag — the game may win the Fun Gate and Algorithm Gate yet fail at its actual purpose.

### Phase 9: Distill

**NOTE: If you used `record-decision` with `learnings` in Phase 7, principles and evidence are already created and beliefs already recomputed. This phase is for additional learnings only.**

If there are cross-cutting insights not captured by individual decisions (e.g., patterns across multiple concepts in this cycle), add them now:

```bash
# Check what distill prompts remain unanswered
node tools/memory-cli.js distill --json '{"runId":"RUN_ID"}'

# Add any additional principles manually
node tools/memory-cli.js upsert-principle --json '{...}'
node tools/memory-cli.js add-evidence --json '{...}'

# Recompute beliefs (only needed if you added principles manually above)
node tools/memory-cli.js recompute-beliefs --json '{"namespace":"leetcode"}'
```

### Phase 10: Audit, Validate & Render

Audit every retrieval item: `useful`, `irrelevant`, `misleading`, `unknown`.

```bash
node tools/memory-cli.js audit-brief --json '{...}'
```

**Validate the run** — this gate blocks the loop if learnings are missing:

```bash
node tools/memory-cli.js validate-run --json '{"runId":"RUN_ID"}'
```

If `valid: false`, fix the errors before proceeding (usually: go back and re-record decisions with learnings).

**Detect contradictions** — surfaces principles where new evidence contradicts older beliefs:

```bash
node tools/memory-cli.js detect-contradictions --json '{"namespace":"leetcode"}'
```

Review `memory/contradictions.md` after rendering. If a principle moved to `contested` or `deprecated`, decide whether to split, revise, or retire it.

**Render all surfaces** — this auto-generates `learnings.md`, `portfolio_review.md`, and `contradictions.md` from SQLite:

```bash
node tools/memory-cli.js render
```

Update `leetcode/curriculum.md` and `leetcode/results.tsv`. Do NOT manually edit `leetcode/learnings.md`, `memory/portfolio_review.md`, or `memory/contradictions.md` — they are auto-generated by `render`.

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
9. **Memory is canonical** — `leetcode/learnings.md` is auto-generated by `render` from the SQLite store; never edit it manually
10. **Retrieval before action** — never start design or build without generating a retrieval brief first
11. **No decision with open bugs** — do not record keep/iterate/kill while blocking bugs remain
12. **Render after beliefs** — always render markdown surfaces after recomputing beliefs
13. **Mechanic family declared** — every concept version must carry a `mechanic:<family>` tag for portfolio tracking
14. **Solver-diff gate before build** — no build starts until `check-solver-diff` returns valid
15. **Transfer probe before final keep** — every keep must have a `transfer_probe:*` playtest recorded in Phase 8
