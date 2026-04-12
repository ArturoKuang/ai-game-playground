# Algorithm Arcade

A collection of puzzle games where playing optimally naturally teaches algorithm and data structure concepts from coding interviews (LeetCode, NeetCode). The player should finish a game and later realize "oh, I was doing binary search the whole time."

## Design Process

A **three-agent funnel** defined in **`leetcode/program.md`**:

- **Designer** (`leetcode/prompts/designer.md`) — brainstorms concepts, filters through litmus tests, makes keep/iterate/kill decisions. Never writes code.
- **Engineer** (`leetcode/prompts/engineer.md`) — builds prototypes + solvers, computes quality metrics, auto-kills on fatal metric thresholds. Never makes taste calls.
- **Playtester** (`leetcode/prompts/playtester.md`) — plays blind (no source code), reports strategy evolution. Never scores or decides.

## Memory System

SQLite-backed memory tracking design cycles, metrics, playtest reports, and learned principles.

- **Canonical store**: `memory/system.sqlite` (gitignored)
- **CLI**: `node tools/memory-cli.mjs <command>`
- **Read surfaces**: `memory/*.md` (generated from SQLite)
- **Spec**: `memory-system-spec.md` / `memory-erd.md`

Initialize with: `node tools/memory-cli.mjs init`

## Quality Gates

Games must pass a **dual gate** — Algorithm Gate AND Fun Gate (see `leetcode/specs/game-feel.md`):

**Algorithm Gate** (auto-kill if any fails):
- Structural Fit: board->input, moves->operations, win->goal
- Efficiency Gap < 15%
- Difficulty Breakpoint at D1 or D5
- Difficulty Scaling monotonic
- Playtester strategy matches target algorithm

**Fun Gate** (iterate if any fails):
- Comprehension Speed <= 5 moves
- Dead Moments = 0
- Replay Pull >= 3/5
- Decision Density >= 60%
- Juice Checklist = 8/8

## Project Structure

```
App.tsx              -- navigation shell with curriculum-organized home screen
src/
  games/             -- one file per game (self-contained), registered in index.ts
  solvers/           -- one solver per game (pure logic, no UI)
  components/        -- shared UI: GameScreenTemplate, Tile, MoveCounter,
                        WinOverlay, ShareButton, StatsModal, CelebrationBurst
  utils/             -- seeding, scoring, stats persistence, sharing
  types.ts           -- shared types (GameMeta)
leetcode/
  program.md         -- autonomous loop orchestrator (inner loop)
  curriculum.md      -- algorithm topic map + progression (Tier 1-4)
  learnings.md       -- design learnings
  results.tsv        -- experiment log
  prompts/           -- designer, engineer, playtester prompts
  specs/             -- one spec per game concept (_template.md, game-feel.md)
memory/              -- SQLite store + generated markdown surfaces
tools/
  memory-cli.mjs     -- memory system CLI
  memory/            -- memory system internals
  playtest.mjs       -- browser automation harness
  playtest-session.mjs
  ralph-loop.mjs     -- autonomous loop runner
run-program.md       -- Blind 75 outer control loop
memory-system-spec.md
memory-erd.md
```

## Running the Loop

### One Cycle

```
Read run-program.md. Find the first unchecked Blind 75 problem. Run one full cycle from leetcode/program.md.
```

### Autonomous Loop

```
/loop "Read run-program.md. Find the first unchecked problem. Run one cycle from leetcode/program.md. Update the tracker."
```

### Engineer Work

Use the `Agent` tool with `isolation: "worktree"` for all build work so half-built prototypes don't break the main branch.

## Hard Rules

1. **2D** — no 3D rendering
2. **No external assets** — emoji, unicode, colored shapes, system fonts only
3. **1-5 minute sessions** at medium difficulty
4. **Difficulty selector** — 5 levels, not daily seed
5. **No algorithm jargon in gameplay** — reveal algorithm + LeetCode links only after winning
6. **Same codebase** — games in `src/games/`, solvers in `src/solvers/`, registered in `src/games/index.ts`
7. **Use GameScreenTemplate** — new games compose `src/components/GameScreenTemplate.tsx`
8. **Memory is canonical** — SQLite store is source of truth, not markdown files
9. **Retrieval before action** — always generate a retrieval brief before design or build work
