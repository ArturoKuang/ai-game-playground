# Algorithm Arcade — Autonomous Design Loop

An overnight-capable agentic loop that designs, builds, tests, and iterates on puzzle games teaching algorithm/data structure concepts. Runs without human intervention. Takes inspiration from the Puzzle Lab funnel (`../program.md`) but adds algorithm-specific metrics, difficulty progression, and a curriculum-driven topic selector.

---

## Architecture

```
 ORCHESTRATOR (this file — you)
 │
 ├─ reads: curriculum.md, results.tsv, learnings.md
 ├─ picks next topic(s) from curriculum
 ├─ tracks budget: iterations remaining, games kept, games killed
 │
 └─── LOOP (repeat until budget exhausted or all Tier 1-2 topics covered)
      │
      ├── STEP 1: DESIGNER (leetcode/prompts/designer.md)
      │   ├─ reads: curriculum.md, learnings.md, results.tsv, specs/
      │   ├─ picks 1-2 algorithm topics
      │   ├─ brainstorms 3-5 concepts per topic
      │   ├─ filters through 5 litmus tests
      │   └─ outputs: 2-3 specs in leetcode/specs/<game>.md
      │
      ├── STEP 2: ENGINEER (leetcode/prompts/engineer.md) ← parallel per spec
      │   ├─ reads: one spec + code patterns
      │   ├─ builds prototype + solver (Level 5 = target algorithm)
      │   ├─ computes standard + algorithm-specific metrics
      │   ├─ auto-kills if metrics fatal
      │   └─ outputs: metrics in spec + committed prototype
      │
      ├── STEP 3: PLAYTESTER (leetcode/prompts/playtester.md) ← per survivor
      │   ├─ reads: nothing (blind play)
      │   ├─ plays Easy → Medium → Hard progression
      │   ├─ reports strategy evolution + pattern discovery
      │   └─ outputs: blind play report in spec
      │
      ├── STEP 4: DESIGNER DECISION
      │   ├─ reads: spec + metrics + play report
      │   ├─ decides: keep / iterate / kill
      │   ├─ if iterate: revises spec → back to STEP 2 (max 3 iterations)
      │   ├─ if keep: update curriculum.md, go to STEP 5
      │   └─ if kill: log to results.tsv + learnings.md
      │
      ├── STEP 5: POLISH (keep only)
      │   ├─ ENGINEER adds: difficulty UI, concept bridge, share text, stats
      │   └─ PLAYTESTER does final review
      │
      └── STEP 6: LOG & CONTINUE
          ├─ append to results.tsv
          ├─ update learnings.md if new insight
          ├─ update curriculum.md status
          └─ loop back to STEP 1
```

---

## How to Run This Overnight

### Option A: Single Long-Running Session

Launch a single Claude Code session with this prompt:

```
Read leetcode/program.md and execute the full autonomous loop.

Budget: 8 hours or 20 game concepts (whichever comes first).
Start with Tier 1 topics from leetcode/curriculum.md.
For each cycle, use Agent tool with worktree isolation for engineers.
Commit after each prototype and each polish pass.
Log everything to leetcode/results.tsv.

If you get stuck on a concept after 3 iterations, kill it and move on.
Bias toward breadth (more topics covered) over depth (perfect games).
```

### Option B: Batched Sessions (More Reliable)

Run one cycle per session. Use this kickoff prompt:

```
Read leetcode/program.md. Execute ONE cycle of the algorithm game loop:
1. Read curriculum.md — pick the next unlocked topic
2. Spawn designer → produce 2-3 specs
3. Spawn engineers (parallel, worktree isolation) → build + measure
4. Spawn playtesters (parallel) → blind play report
5. Spawn designer decision round → keep/iterate/kill
6. If keep: spawn engineer polish pass
7. Log results, update curriculum.md, update learnings.md
8. Commit all changes

Then report: what was tried, what survived, what was learned.
```

### Option C: Full Auto with Loop Command

Use the `/loop` skill to run batched cycles:

```
/loop 30m "Execute one cycle of leetcode/program.md"
```

This runs a cycle every 30 minutes, allowing ~16 cycles in 8 hours.

---

## Orchestrator Decision Logic

### Topic Selection

```
1. Read curriculum.md
2. Find all topics where status = "todo" AND all prereqs have status = "keep"
3. Prefer Tier 1 over Tier 2 (breadth first within the current tier)
4. If multiple candidates: pick the one with the most downstream dependents
5. Select 1-2 topics per cycle
```

### Budget Management

```
per_cycle:
  max_concepts_per_topic: 5  (designer brainstorms)
  max_specs_per_cycle: 3     (designer filters to)
  max_iterations_per_spec: 3 (before kill)

total_budget:
  max_cycles: 20
  max_hours: 8
  stop_early_if: all Tier 1 topics have status != "todo"
```

### When to Stop

1. **All Tier 1 topics processed** — either kept or killed with lessons logged
2. **Budget exhausted** — 20 cycles or 8 hours
3. **Stuck** — 3 consecutive cycles with 0 keeps and no new learnings
4. **Success** — 5+ games kept across different topics

---

## Agent Boundaries

| | Designer | Engineer | Playtester |
|---|---|---|---|
| **Reads code** | Never | Yes | Never |
| **Writes code** | Never | Yes | Never |
| **Reads curriculum.md** | Yes | Yes (for alignment validation) | Never |
| **Reads learnings.md** | Yes (leetcode + puzzle lab) | Never | Never |
| **Reads metrics** | Yes (raw) | Produces them | Never |
| **Reads play reports** | Yes | Never | Produces them |
| **Makes taste calls** | Yes | Never | Never |
| **Makes kill decisions** | Yes | Auto-kill only (metrics) | Never |
| **Names algorithms** | Yes | Yes (in solver) | **Never** (plain English only) |

---

## Results Log Format

Append to `leetcode/results.tsv`:

```
commit	entropy	skill_depth	CI	drama	DE	IGR	algo_align	greedy_gap	insight_inflect	status	game	algorithm	description
```

Status: `keep`, `iterate`, `kill`, `auto-kill`.

---

## The Algorithm Alignment Validation

This is the key metric that distinguishes algorithm games from regular puzzle games. After the engineer reports metrics:

1. **Designer reads Algorithm Alignment score.** If < 50%, auto-kill — the game doesn't teach the target algorithm regardless of how fun it is.
2. **Designer reads the playtester's "The Pattern" description.** If the playtester's plain-English description of the winning strategy doesn't match the target algorithm, the game fails even if metrics are good.
3. **Both must pass.** Metrics prove the algorithm is optimal; playtester proves a human can discover it.

### Example validation:

**Target**: Binary Search
**Solver alignment**: 85% (each move eliminates ~half the remaining space) ✓
**Playtester pattern**: "Always guess the middle of what's left" ✓✓ — perfect match
**Decision**: Metrics + human discovery aligned → KEEP candidate

**Target**: Dynamic Programming  
**Solver alignment**: 90% (solver reuses subproblem results) ✓
**Playtester pattern**: "I just tried different paths until one worked" ✗ — they brute-forced it
**Decision**: Algorithm is optimal but humans don't discover it → ITERATE (make subproblem reuse more visible/rewarding)

---

## Learnings Integration

After each cycle:

1. **If a game is killed**: Log WHY in `leetcode/learnings.md`. What about the algorithm made it hard to gamify?
2. **If a game is kept**: Log what WORKED. What game mechanic successfully embodied the algorithm?
3. **Cross-reference** with puzzle lab learnings (`../learnings.md`). Algorithm games must satisfy BOTH sets of constraints.

---

## Hard Rules

1. **2D** — no 3D rendering
2. **No external assets** — emoji, unicode, colored shapes, system fonts
3. **1-5 minute sessions** at medium difficulty
4. **Difficulty selector** — 5 levels (Easy/Medium/Hard), not daily seed
5. **No algorithm jargon in gameplay** — the game never says "binary search" or "O(n log n)"
6. **Concept bridge AFTER completion only** — reveal the algorithm name + LeetCode links after winning
7. **Same codebase** — games go in `src/games/`, solvers in `src/solvers/`, registered in `src/games/index.ts`
8. **Stats per difficulty level** — track completion rate and move count per difficulty
