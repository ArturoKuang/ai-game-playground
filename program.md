# Puzzle Lab — Agentic Design Funnel

Three specialized agents work in sequence to find fun games fast. Each agent has a focused role, a separate prompt, and a clean boundary. The funnel shape means cheap work (design) filters before expensive work (engineering).

---

## The Funnel

```
 DESIGNER (prompts/designer.md)
 ├─ reads: learnings.md, results.tsv, specs/
 ├─ brainstorms 5-8 concepts
 ├─ filters through 3 litmus tests
 └─ outputs: 2-3 specs in specs/<game>.md
        │
        ▼
 ENGINEER (prompts/engineer.md)  ← parallel per spec
 ├─ reads: one spec + code patterns
 ├─ builds prototype + solver
 ├─ computes raw metrics
 ├─ auto-kills if metrics are fatal
 └─ outputs: metrics appended to spec + committed prototype
        │
        ▼
 PLAYTESTER (tools/review-prompt.md)  ← per surviving prototype
 ├─ reads: nothing (blind play)
 ├─ plays 3 sessions (intuitive, strategic, exploratory)
 └─ outputs: blind play report appended to spec
        │
        ▼
 DESIGNER (decision round)
 ├─ reads: spec + metrics + play report
 ├─ decides: keep / iterate / kill
 ├─ if iterate: revises spec → back to ENGINEER (max 3 iterations)
 ├─ if keep: ENGINEER does polish pass
 └─ if kill: logs to results.tsv
```

---

## How to Run the Funnel

### Step 1: Spawn the Designer

Launch a designer agent with `prompts/designer.md` as the system prompt. Tell it:

> "Read learnings.md and results.tsv. Brainstorm 5-8 new game concepts, filter to 2-3, and write specs to specs/."

The designer produces spec files. Review them if you want, or proceed directly.

### Step 2: Spawn Engineers (parallel)

For each spec the designer produced, launch an engineer agent with `prompts/engineer.md`. Tell it:

> "Build and evaluate the game specified in specs/<game-name>.md"

Engineers can run in parallel (use git worktrees for isolation). Each engineer either:
- **Auto-kills** and writes failure metrics to the spec, or
- **Passes** and writes full metrics to the spec + commits the prototype

### Step 3: Spawn Playtesters (parallel)

For each game that survived auto-kill, launch a playtester agent with `tools/review-prompt.md`. Tell it:

> "Play and review the game <GameName>"

Playtesters run blind — they never see source code or metrics.

### Step 4: Designer Decision Round

Launch the designer agent again. Tell it:

> "Read the specs in specs/ that have metrics and play reports. Make keep/iterate/kill decisions."

If it decides to **iterate**, it revises the spec and the loop goes back to Step 2 for that game. Maximum 3 iterations per concept.

If it decides to **keep**, go to Step 5.

### Step 5: Polish (KEEP only)

Launch the engineer with the kept spec:

> "Polish the game specified in specs/<game-name>.md — the designer marked it KEEP."

Then launch the playtester for a final blind review.

### Step 6: Log & Loop

After all decisions are made, append results to `results.tsv`:

```
commit_hash	entropy	skill_depth	counterintuitive	drama	decision_entropy	info_gain_ratio	status	game	description
```

Status: `keep`, `iterate`, `promote`, `shelve`, `killed`.

**Go back to Step 1. The funnel never stops.**

---

## The Spec Format

Each spec lives at `specs/<game-name>.md`. It is the **single source of truth** for a concept's entire lifecycle — from initial idea through metrics, playtesting, and decision.

See `prompts/designer.md` for the full spec template. Key sections:

| Section | Written By | When |
|---|---|---|
| Rules, Why It Works, Predicted Failure Mode, Expected Metrics, Player Experience, Difficulty Knobs | Designer | Phase 1 |
| Solver Metrics | Engineer | After build |
| Play Report | Playtester | After blind play |
| Decision | Designer | Phase 2 |

Dead specs stay in `specs/` — they're searchable reference for what's been tried.

---

## Agent Boundaries

| | Designer | Engineer | Playtester |
|---|---|---|---|
| **Reads code** | Never | Yes | Never |
| **Writes code** | Never | Yes | Never |
| **Reads learnings.md** | Yes | Never | Never |
| **Reads metrics** | Yes (raw) | Produces them | Never |
| **Reads play reports** | Yes | Never | Produces them |
| **Makes taste calls** | Yes | Never | Never |
| **Makes kill decisions** | Yes | Auto-kill only (metrics) | Never |
| **Reads other specs** | Yes (for context) | Only their assigned spec | Never |

---

## Frozen Games — Do NOT Iterate

| Game | Mechanic | Status |
|---|---|---|
| BitMap | 5x5 nonogram/picross deduction | Frozen |
| LightsOut | Toggle cells + neighbors to turn all off | Frozen |
| FloodFill | Absorb colors from corner, +N gain preview | Frozen |
| PathWeaver | Guaranteed-solvable Hamiltonian path | Frozen |
| BounceOut | Aim ball, predict bounces (short aim line) | Frozen |
| DropPop | Two-tap select-then-pop, quadratic scoring | Frozen |
| IceSlide | Collect gems (stopping points) + slide to goal | Frozen |
| ChainPop | 3 taps, chain reactions on floating bubbles | Frozen |
| Claim | Pick cells to score; claiming locks neighbors | Frozen |
| Loop | Intersecting ring rotation puzzle | Frozen |

---

## Project Architecture

```
src/
  games/          ← one file per game (self-contained)
  solvers/        ← one solver per game (pure logic, no UI)
  components/     ← shared UI (Tile, ShareButton, StatsModal, CelebrationBurst)
  utils/          ← seeding, scoring, stats persistence, sharing
  types.ts        ← shared types
App.tsx           ← navigation shell with game menu
program.md        ← this file (funnel orchestrator)
prompts/
  designer.md     ← designer agent prompt
  engineer.md     ← engineer agent prompt
tools/
  review-prompt.md ← playtester agent prompt
  playtest.mjs     ← browser automation harness for playtester
specs/            ← one spec per concept (lifecycle document)
learnings.md      ← design patterns and quality metric heuristics (designer reads this)
results.tsv       ← experiment log
```

---

## Hard Rules

1. **2D** — no 3D rendering
2. **No external assets** — use emoji, unicode, colored shapes, system fonts
3. **1-5 minute sessions**
4. **Daily seed** — same puzzle for everyone each day
5. **Stats + streaks** — use the stats system in `src/utils/stats.ts`
6. **Shareable results** — emoji summary for group chats

---

## Process Log

| Session | Concepts | Iters | Kills | Keeps | Failure Mode | Process Change |
|---|---|---|---|---|---|---|
| 2026-03-30 | 6 | 16 | 6 | 0 | A10 (fully-visible optimization) | Added litmus tests, tighter kill rules |
| 2026-03-30b | 4 | 10 | 4 | 0 | A10 then weak signal | Full-visibility constraint satisfaction always A10 |
| 2026-03-30c | 5 | 12 | 5 | 0 | Deduction plateaus at 50; A10; non-inverse ops | Only self-inverse toggle or incommensurable costs |
| 2026-03-31 | 11 | 18 | 11 | 0 | A10 (3), d8-clones (3), misc (5) | Shelved sandpile; Trace best lead |
| 2026-03-31b | — | — | — | — | PROCESS OVERHAUL | Kill rules too aggressive; loosened; froze anti-patterns |
| 2026-03-31c | — | — | — | — | EVALUATION OVERHAUL | Solver metrics replace subjective scoring; blind playtester |
| 2026-03-31d | — | — | — | — | FUNNEL OVERHAUL | Split single agent into Designer/Engineer/Playtester funnel. Cheap design filters before expensive engineering. |
