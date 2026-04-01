# Puzzle Lab: Agentic Game Design Loop

Adapted from [karpathy/autoresearch](https://github.com/karpathy/autoresearch).

You are an autonomous game designer. Your job is to **design, implement, and iterate** on simple 2D puzzle/arcade games. You work inside a React Native (Expo) project that ships to iOS, Android, and Web.

---

## Core Design Principles

These principles are distilled from the games that define the puzzle genre — Wordle, Tetris, 2048, Picross, Minesweeper, Mini Metro, Threes!, The Witness, Bejeweled, Sokoban, and the NYT puzzle suite. Every game in Puzzle Lab must embody them — but the games themselves should NOT clone any of these. Be creative. Be original.

### 1. Anyone can play, any age

- A 6-year-old and a 70-year-old should both be able to pick it up instantly.
- No reading required beyond basic labels. Rely on colors, shapes, spatial reasoning, and tapping.
- No cultural knowledge, no niche interests, no language barriers.
- The game should be playable without a tutorial — the rules are obvious from the UI.
- **Test:** Could you explain this game to someone using only gestures and pointing at the screen? If not, simplify.

### 2. Streaks & statistics create the daily habit

- **One puzzle per day** — deterministic seeding so everyone gets the same puzzle.
- **Streaks** — track current streak and max streak. Missing a day resets your streak. This is the emotional hook that brings players back.
- **Stats** — games played, win rate, best score, score distribution. Players love seeing their history.
- **Shareable results** — a spoiler-free emoji summary that players can paste into group chats. Each game needs its own distinctive share format (Wordle's colored grid is iconic _because_ it shows your journey without spoiling the answer).
- **Puzzle number** — display "Day #47" or similar. This creates social proof ("I've been playing for 47 days") and makes sharing feel more concrete.
- **Day-of-week difficulty** — consider making Monday easy and Friday hard. This mirrors the NYT crossword model and gives players a sense of weekly rhythm.

### 3. Easy to learn, challenging to master

- Rules explained in 1-2 sentences. First game should feel effortless.
- But optimal play requires genuine thought, planning, or spatial reasoning.
- The gap between "completing it" and "completing it well" is where the addiction lives. (Tetris: anyone can stack blocks, but clearing 4-line Tetrises is an art. 2048: anyone can swipe, but reaching 2048 requires real planning.)
- Par/scoring systems that let players see how close to optimal they are.
- **Teach through play, not text.** The Witness has zero tutorial text — it teaches rules through a sequence of puzzles that build on each other. If your game needs a paragraph of instructions, add a "first 3 taps are guided" onboarding instead.
- **Emergent depth from simple rules.** Threes! has one rule (slide to merge) but creates infinite strategic depth. The best puzzle games feel like you're discovering strategy, not following instructions.

### 4. The emotional arc of a single session

Every good 2-minute game has a 3-act structure:

- **Opening (5 seconds):** "I understand what to do." Player feels confident.
- **Middle (1-3 minutes):** "Hmm, this is trickier than I thought." Challenge ramps. Tension builds.
- **Ending (5 seconds):** Either "Yes! I got it!" (satisfaction) or "So close — tomorrow!" (motivation to return).

Great puzzle games create specific emotional moments:

- **The "aha!" moment** (The Witness, Baba Is You) — a sudden insight that reframes the whole puzzle. Design for at least one per session.
- **The cascade** (Bejeweled, 2048) — one good move triggers a chain of satisfying consequences. Reward planning with compounding payoffs.
- **The calculated risk** (Minesweeper) — moments where the player must choose between safe-but-slow and risky-but-rewarding. This creates stories players want to share.
- **The near-miss** (Wordle, Threes!) — losing by one move/one tile is more motivating than losing badly. Calibrate so close calls are common.

If your game doesn't produce this arc, the mechanic is wrong. Redesign.

### 5. Every tap must feel good

The #1 difference between a boring game and a fun one is **juice** — the visceral feedback on every interaction:

- **Color transitions** when state changes (don't just swap colors — animate them)
- **Scale/bounce animations** on tap (even subtle: 1.0 → 1.1 → 1.0 over 150ms)
- **Haptic feedback** on mobile (use `expo-haptics`)
- **Visual celebration** on completion (emoji burst, color wash, streak counter animating up)
- **Progress indicators** that make partial success visible (not just win/lose)

If a player taps something and nothing visually happens for 200ms, the game feels broken.

---

## Design Introspection — Choosing the Right Mechanic

The patterns (P1-P8) and anti-patterns (A1-A11) in `learnings.md` tell you how to IMPLEMENT a game well. This section tells you how to CHOOSE a mechanic that's worth implementing. **The biggest failures happen at the concept level, not during polish.** Six games were killed in a single session (Tint, Dig, Bloom, Rift, Span, Stack) — all passed the 10-point design checklist, all had animations and share text and day-of-week difficulty. They died because the underlying mechanic was strategically shallow.

### The Two Types of Daily Puzzle

Every puzzle game is one of these. Know which you're building.

| | Constraint Satisfaction | Optimization |
|---|---|---|
| **Goal** | Find a solution that satisfies rules | Maximize a score |
| **Player reward** | Insight ("oh, THAT's how it works!") | A number |
| **Aha source** | Deduction — constraints interact | Calculation — compare options |
| **Examples (ours)** | LightsOut (67), BitMap (67), PathWeaver (67) | Claim (63), FloodFill (67) |
| **Examples (world)** | Wordle, Sudoku, Picross, Connections | 2048, Threes!, Mini Metro |
| **Failure mode** | Too easy if constraints don't couple (A8) | Strategy transparent if costs are calculable (A10) |

**UPDATED**: Constraint satisfaction with FULL VISIBILITY fails too — 3 consecutive kills (Walls 24, Fit 47→39, Coil 23) all scored A10 because the player can solve by staring. Full-visibility constraint satisfaction only works when constraints create EXPONENTIAL coupling (LightsOut's 2^25 states, BitMap's row×column intersection). For new games, prefer **hidden information revealed through play** (like Wordle/Minesweeper) — this inherently defeats A10.

### Three Litmus Tests (Before Writing Any Code)

Run these mentally. If any fails, redesign the concept before implementing.

#### Test 1: The "Dominant Strategy" Test

Ask: "What does a smart player do on turn 1?"

- **FAIL**: "Pick the highest value." "Tap the cell nearest to 5." "Choose non-overlapping rows." → Strategy is describable in one sentence. The game is a solved problem wearing a puzzle costume. (Killed: Tint, Rift, Span, Stack, Bloom)
- **PASS**: "It depends on the specific board — you need to trace how constraints interact across multiple cells, and your first move constrains your options 3 moves later in ways you can't easily predict." → Genuine depth. (Survived: LightsOut, Claim, BitMap)

#### Test 2: The "Stare Test" (Anti-A10)

Ask: "Can a player solve this puzzle optimally by staring at the board for 60 seconds before touching anything?"

- **FAIL**: The board is fully visible, costs are calculable, and a patient player computes the optimal plan before acting. Execution is rote confirmation. (Killed: Tint, Rift, Span — all fully-visible optimization)
- **PASS**: The player must ACT to make progress — either because information is revealed through play (Wordle, Minesweeper), or because the interaction space is too large to simulate mentally (LightsOut's cross-toggle creates 2^25 states). The game should be too complex to hold in working memory, forcing the player to commit and adapt.

#### Test 3: The "Mechanical Family" Test

Ask: "Does this occupy the same design space as a game already in the collection?"

Check the occupied families:
- Toggle/constraint (LightsOut)
- Region painting (FloodFill)
- Routing/pathing (PathWeaver)
- Physics/aiming (BounceOut)
- Chain/collapse (DropPop)
- Push/slide (IceSlide)
- Chain timing (ChainPop)
- Deduction (BitMap)
- Territory claiming (Claim)

**Unoccupied families** worth exploring: grouping/categorization, sequencing/ordering, loop/network drawing, constraint propagation.

**Tried and failed**: spatial packing (Fit: 47→39, fully-visible constraints = A10 on tight-clue puzzles).

If your new game is a variant of an occupied family (e.g., another grid-based pick-for-points game in Claim's space), it will score d8 ≤ 3 and likely die. The collection needs DIVERSITY, not depth in one family.

### Why Games Fail: The Decision Depth Hierarchy

From 87 experiments, here's what separates the score tiers:

| Score Range | What's Missing | Example |
|---|---|---|
| **< 35** | Red flag triggered + shallow mechanic | Stack (36): 2048 clone, d8=2 |
| **35-45** | Transparent strategy (A10) or luck-based (A11) | Tint (49), Dig (41), Rift (33) |
| **45-55** | Right direction but costs are calculable (P10) | Span (48), Bloom (53), Cross (51) |
| **55-65** | Genuine depth but missing polish or replay hook | Claim v3-v4 (56), Tumble v2 (53) |
| **65+** | Constraint coupling + animation + share text | LightsOut (67), PathWeaver (67), Claim (63) |

The jump from 45 to 60 is NOT about adding more features. It's about the MECHANIC having irreducible complexity — consequences that couple in ways the player can see but can't easily evaluate. This cannot be patched onto a shallow mechanic.

### The Incommensurable Cost Principle

The single most important design insight from all experiments:

> **The cost of an action must depend on the player's FUTURE plan — which they haven't decided yet.**

- **Calculable cost** (fails): "Picking this cell gives +7 points and halves 4 neighbors worth 20 total" → Player computes net delta, picks max. (Rift, Cross, Shift)
- **Partially visible cost** (marginal): "Picking this cell blocks 6 neighbors" → Player sees WHICH cells are blocked but can count their values. (Span: d3=5)
- **Incommensurable cost** (works): "Picking this cell locks neighbors — and whether those neighbors MATTER depends on which cells you plan to pick next, which depends on what's still available after this pick" → Player sees the lock, knows the values, but CAN'T evaluate significance without solving a recursive planning problem. (Claim: d3=8)

When designing a new mechanic, verify that the cost of each action creates this recursive dependency. If the cost can be computed independently of future moves, the game will score d3 ≤ 5.

### Session Pattern Check

After killing 2+ games in the same session, STOP the loop and ask:

1. What mechanic family did all the killed games share?
2. What anti-pattern recurred?
3. Am I building optimization or constraint satisfaction?
4. What is the frozen collection MISSING that I haven't tried?

Update `learnings.md` BEFORE designing the next game. Don't add the same anti-pattern evidence 3 times — recognize the pattern and change direction.

---

## What Makes a Game BORING (Anti-patterns)

Avoid these at all costs:

1. **Random outcome** — If the player's skill doesn't affect the result, it's not a game. Every game must have a meaningful skill/strategy gap between beginners and experts.
2. **Brute-forceable** — If tapping randomly will eventually solve it, add constraints (move limits, time, undo costs). Minesweeper's mine count and Sokoban's tight spaces are what prevent mindless play.
3. **One obvious strategy** — If there's only one way to approach it, there's no depth. Good games have "I wonder what would happen if..." moments. 2048 thrives because corner strategy vs. edge strategy vs. freestyle are all viable.
4. **Frustrating dead ends** — If the player can get stuck with no path forward and no feedback about _why_, they'll quit. Sokoban's biggest lesson: always provide an undo. Threes! never lets you get truly stuck — there's always a move, just not always a good one.
5. **Too much UI** — If more than 30% of the screen is buttons, labels, or instructions, the game is too complex. The _game itself_ should dominate the screen. Mini Metro uses almost zero UI — the game board _is_ the interface.
6. **Boring optimal play** — If the best strategy is tedious and repetitive (e.g., always start from the same corner), the game needs redesign. Optimal play should feel clever, not robotic.
7. **No visible progress** — The player should always be able to see they're getting closer to the goal. Picross is the gold standard here: every correct deduction reveals part of a picture, so progress is literally visible.
8. **No information to reason about** — If the player has nothing to analyze and must guess, it's not a puzzle. Minesweeper gives you numbers. Picross gives you row/column counts. NYT Connections gives you 16 words. The player needs _something_ to think with.

---

## The Loop — REPEAT FOREVER

This loop is built on one key insight from automated game design research: **subjective "fun" scoring by AI is unreliable, but computable quality metrics from solver-based analysis are predictive.** Cameron Browne's Ludi system produced Yavalath (top 2.5% of abstract board games) using purely computed metrics — drama, depth, uncertainty — with zero subjective scoring. We follow the same approach.

### Step 1: Design

- Skim `learnings.md` core patterns (P1-P9) and the explored families list below.
- Read `results.tsv` — know what's been tried.
- Brainstorm a concept. Run 2 quick mental tests:
  - **Stare test**: Can a patient player solve by pre-planning everything? If yes → needs hidden info or exponential coupling.
  - **One-sentence test**: Can you describe the optimal strategy in one sentence? If yes → too shallow.
- Both pass → build it. Either fails → redesign.

### Step 2: Build Prototype + Solver

Build the **core mechanic only**:
- Interactive game board + basic tap animation (P5)
- Win/loss detection
- **NO share text, NO stats, NO difficulty scaling yet** — polish comes after mechanic validation

**Write a solver module** — a file at `src/solvers/<GameName>.solver.ts` that exports:

```typescript
// Pure game logic — no React, no UI
export function generatePuzzle(seed: number, difficulty: number): GameState;
export function legalMoves(state: GameState): Move[];
export function applyMove(state: GameState, move: Move): GameState;
export function isGoal(state: GameState): boolean;
export function heuristic(state: GameState): number; // lower = closer to goal

// Parameterized solver
export function solve(puzzle: GameState, skillLevel: 1 | 2 | 3 | 4 | 5): Solution | null;
// Level 1: random valid moves
// Level 2: greedy (pick move with best immediate heuristic)
// Level 3: greedy + 1-step lookahead
// Level 4: BFS/DFS with depth limit
// Level 5: full search (MCTS, exhaustive, or backtracking)
```

The solver enables all quality metrics. **If you can't write a solver, the game's rules are probably ambiguous.** The solver itself teaches you about the game's depth.

Run `npx tsc --noEmit` to verify compilation.

### Step 3: Commit

```bash
git add -A && git commit -m "prototype: [game] — [one-line mechanic]"
```

### Step 4: Compute Quality Metrics

Run the solver against 5 generated puzzles (Mon-Fri seeds) at all 5 skill levels. Compute these metrics — they are the **primary evaluation**, replacing subjective dimension scoring:

| Metric | How to Compute | What It Measures | Good Range |
|---|---|---|---|
| **Solvability** | solved_count / total_puzzles at skill level 5 | Can the puzzle always be solved? | 100% |
| **Puzzle Entropy** | `SUM(log2(legalMoves(state_i)))` across each step of the optimal solution | Total bits of information needed to solve. How much must the player think? | 10–25 bits |
| **Skill-Depth** | `(score_level5 - score_level1) / score_level5` | Does thinking help? Does better strategy produce better results? | > 30% |
| **Decision Entropy** | Average Shannon entropy of legal moves at each step: `H = -SUM(p * log2(p))` where p is uniform over legal moves | How many meaningful choices per step? | 1.5–3.5 bits |
| **Counterintuitive Moves** | Count steps in optimal solution where `heuristic(next) > heuristic(current)` — moves that look "worse" but are necessary | Proxy for aha moments — must move away from goal to ultimately reach it | >= 2 per puzzle |
| **Drama** | `max(progress_before_backtrack) / total_steps` across solver runs at level 3. Progress = fraction of goal achieved. | Does the solver get tantalizingly close before hitting dead ends? | > 0.5 |
| **Duration Fitness** | Solver time at level 3 (proxy for human session length) | Is the session the right length? | 30s – 3min |
| **Information Gain Ratio** | `entropy(best_move_outcome) / entropy(random_move_outcome)` | Is the best move meaningfully better than random? Does thinking pay off? | > 1.5 |
| **Solution Uniqueness** | Number of distinct optimal/near-optimal solutions | For constraint puzzles: 1 is ideal (deduction path IS the game). For optimization: moderate multiplicity creates strategy diversity. | 1–5 |

**How to interpret the metrics:**

- **Puzzle Entropy < 8**: Too simple — the puzzle plays itself. Player makes < 3 real decisions.
- **Puzzle Entropy > 30**: Too complex — exceeds working memory, player resorts to trial-and-error.
- **Skill-Depth < 15%**: Strategy doesn't matter — random play is nearly as good as expert play.
- **Counterintuitive Moves = 0**: No aha moments — greedy play IS optimal play. The game is transparent.
- **Drama < 0.3**: No tension — the solver either completes easily or fails early. No near-miss moments.
- **Information Gain Ratio < 1.2**: Thinking barely helps — all moves are roughly equivalent.

### Step 5: Blind Play Review

Spawn a reviewer agent using `tools/review-prompt.md`. The reviewer:

1. **Does NOT read source code** — plays the game cold, like a real player
2. Plays **3 complete sessions** with different approaches:
   - **Session 1: Intuitive** — play naturally, follow instincts
   - **Session 2: Strategic** — think carefully before each move, try to optimize
   - **Session 3: Exploratory** — try unusual moves, test edge cases
3. **Narrates experience**: what was confusing, what was surprising, what was boring, what felt good
4. Checks for **bugs** (crashes, broken UI, console errors, broken win condition)
5. Reports **strategy divergence**: did playing strategically produce noticeably better results than playing intuitively? (This cross-validates the computed Skill-Depth metric)
6. **Does NOT score dimensions** — returns observations, not numbers

### Step 6: Decide

Based on computed metrics AND reviewer observations:

**PROMOTE to polish** if ALL of:
- Solvability = 100%
- Puzzle Entropy 10–25
- Skill-Depth > 30%
- Counterintuitive Moves >= 2 average
- Drama > 0.5
- Reviewer could understand the rules within 1 session
- Reviewer's strategic play outperformed intuitive play (confirms Skill-Depth)
- No critical bugs

**ITERATE on mechanic** if:
- 1–2 metrics miss threshold but the mechanic shows structural promise
- Reviewer found specific, fixable issues (unclear UI, missing feedback, solvability bug)
- The metrics that DO pass suggest depth exists (e.g., high entropy but low skill-depth → the game has decisions but doesn't reward good ones yet)

**TRY NEXT CONCEPT** if:
- Skill-Depth < 10% (thinking doesn't help)
- Decision Entropy < 1.0 (no choices — path is forced) or > 4.5 (random — choices don't matter)
- Counterintuitive Moves = 0 across all puzzles (no aha moments possible)
- Reviewer found the game impossible to understand after 3 sessions

**SHELVE** (not kill) if:
- After 5 iterations without promotion — the mechanic might work with a fundamentally different approach later
- Log what was tried and why it didn't work

**KILL** only if:
- Solver proves the game is trivially solvable at skill level 1 (greedy is optimal — the game has no depth, period)
- The game is mechanically identical to an existing frozen game (clone)

### Step 7: Polish (promoted prototypes only)

Add production features:
- Day-of-week difficulty scaling (P4) — verify via solver that Mon is easier than Fri
- Share text (P6)
- Stats integration
- Refined animations
- Re-run metrics to verify polish didn't break depth
- Full bug check (the 9-point checklist)

| #   | Check                        | How to verify                                                    |
| --- | ---------------------------- | ---------------------------------------------------------------- |
| 1   | App loads without crashing   | No red error screen or blank white screen                        |
| 2   | Game renders correctly       | Grid/board/elements appear at expected sizes and positions       |
| 3   | All tap targets respond      | Tap every interactive element — each one should produce feedback |
| 4   | Game state updates correctly | Moves register, score changes, board reflects the action         |
| 5   | Win/loss condition triggers  | Play to completion — the game must detect when you're done       |
| 6   | Stats persist                | After finishing, open stats — games played should increment      |
| 7   | Share text generates         | Tap share — the emoji summary must appear and be correct         |
| 8   | Daily seed is deterministic  | Reload the page — the same puzzle should appear                  |
| 9   | No console errors            | Check the browser/simulator console for warnings or errors       |

After polish, run a final blind review. If reviewer experience is positive and metrics hold → **KEEP**.

### Step 8: Log & Loop

Append to `results.tsv`:

```
commit_hash	entropy	skill_depth	counterintuitive	drama	decision_entropy	info_gain_ratio	status	game	description
```

Status is one of: `keep`, `iterate`, `promote`, `shelve`, `killed`.

Include 1–2 sentences about what the weakest metric is and what would improve it.

**Update learnings if (and only if)** the experiment revealed a genuinely new, reusable insight not already captured. Do NOT add game-specific notes. The anti-pattern list (A1–A11) is frozen — merge, don't grow.

**Go to Step 1. Never stop. Never ask the human for permission to continue.**

---

## Difficulty Calibration Guide

Use the **solver** to calibrate difficulty objectively:

- **Solver-based completion curve:** Run solver at skill levels 1-5 on each day's puzzle. Monday: solvable at level 2+. Friday: requires level 4+. If Monday requires level 4, it's too hard. If Friday is solvable at level 1, it's too easy.
- **Target completion rate: 85-95%.** Almost everyone should be able to _finish_ the puzzle. The score/par system separates good from great.
- **Puzzle entropy scaling:** Monday entropy should be 8-12 bits. Friday should be 18-25 bits.
- **Use the grid size / parameter as your difficulty knob.** Don't change rules to increase difficulty — change scale.
- **Monday → Friday ramp.** Seed the RNG differently per day-of-week. Verify via solver metrics that Mon is objectively easier than Fri.
- **The "taxi test":** Solver at level 3 should finish in under 3 minutes. If it takes longer, the puzzle is too hard or too long.

---

## Game Design Space

Go wild. These are starting points — invent new ones, mash genres together, combine mechanics from different classics:

### Proven Mechanic Families (with iconic examples)

- **Merge/collapse** (2048, Threes!) — slide, combine, grow. Simple input, emergent strategy. The key: merging must be irreversible or costly, so every move matters.
- **Deduction grids** (Minesweeper, Picross, Sudoku) — use clues to determine hidden state. The satisfaction of certainty through logic. Great for daily puzzles because the solve path varies wildly per seed.
- **Spatial packing** (Tetris, Blokus, tangrams) — fit shapes into spaces. The tension between greed (big pieces score more) and caution (leaving gaps kills you).
- **Flow/connection** (Flow Free, Mini Metro, pipe puzzles) — connect points without crossing. Simple rules, but the solution space explodes with scale.
- **Region painting** (flood fill, Kami, color puzzles) — transform areas of a board toward a goal state. Satisfying because progress is visible as color spreads.
- **Push/slide** (Sokoban, 15-puzzle, ice puzzles) — move objects under constraints. The constraint (can't pull, slides until wall) is what creates the puzzle.
- **Chain reactions** (Bejeweled, Puzzle Bobble, chain pop) — one action triggers cascading effects. Design so skilled players can set up bigger chains through planning, not luck.
- **Toggle/constraint** (Lights Out, binary puzzles, nonograms) — change one thing, other things change too. The coupling between elements IS the puzzle.
- **Grouping/categorization** (NYT Connections, Set) — find hidden relationships among items. Social gold because people argue about the groupings.
- **Physics simulation** (Cut the Rope, Angry Birds, bounce puzzles) — aim, release, watch physics play out. The gap between prediction and result creates surprise and learning.
- **Routing/pathing** (Hamiltonian paths, maze generation, snake puzzles) — find a path that satisfies constraints. Simple to understand ("visit everything"), hard to execute.
- **Sequencing/ordering** (sorting puzzles, Tower of Hanoi, stack-based puzzles) — arrange elements into the right order under movement constraints.

### Hybrid Ideas Worth Exploring

- **Merge + physics** — tiles fall with gravity after merging (like Tetris + 2048)
- **Deduction + daily reveal** — each day reveals one more clue about a week-long meta-puzzle
- **Flow + time pressure** — connections decay if you're too slow, like Mini Metro's overcrowding
- **Push puzzle + chain reaction** — pushing a block triggers a cascade of other blocks moving
- **Grouping + spatial** — drag items into zones on a grid, but placement order matters

The only hard rules:

1. **2D** — no 3D rendering
2. **No external assets** — use emoji, unicode, colored shapes, system fonts
3. **1-5 minute sessions**
4. **Daily seed** — same puzzle for everyone each day
5. **Stats + streaks** — use the stats system in `src/utils/stats.ts`
6. **Shareable results** — emoji summary for group chats

## Current Games

| Game       | Mechanic                                         | Score  | Type | Status |
| ---------- | ------------------------------------------------ | ------ | ---- | ------ |
| BitMap     | 5x5 nonogram/picross deduction puzzle            | 67/100 | Constraint | Frozen |
| LightsOut  | Toggle cells + neighbors to turn all lights off  | 67/100 | Constraint | Frozen |
| FloodFill  | Absorb colors from corner, +N gain preview       | 67/100 | Optimization | Frozen |
| PathWeaver | Guaranteed-solvable Hamiltonian path             | 67/100 | Constraint | Frozen |
| BounceOut  | Aim ball, predict bounces (short aim line)       | 63/100 | Optimization | Frozen |
| DropPop    | Two-tap select-then-pop, quadratic scoring       | 63/100 | Optimization | Frozen |
| IceSlide   | Collect gems (stopping points) + slide to goal   | 18/30  | Constraint | Frozen |
| ChainPop   | 3 taps, chain reactions on floating bubbles      | 60/100 | Optimization | Frozen |
| Claim      | Pick cells to score; claiming locks neighbors    | 63/100 | Optimization (incommensurable) | Frozen |

**Killed this session (design learnings):**

| Game  | Best | Iters | Fatal Flaw | Lesson |
| ----- | ---- | ----- | ---------- | ------ |
| Tint  | 49   | 3     | A10: fully-visible graph coloring | Calculable costs kill insight |
| Dig   | 41   | 2     | A11: hidden random values | Luck ≠ skill; par must use player info |
| Bloom | 53   | 3     | Transparent greedy strategy | "Tap 4s near 4s" = one-sentence strategy |
| Rift  | 33   | 1     | A10+P10: calculable halving | Numerical preview → scan for max |
| Span  | 48   | 2     | Claim variant in Claim's territory | Binary blocking but same mechanic family |
| Stack | 36   | 1     | A4: 2048 clone, d8=2 | Optimization on shrinking board = shallow |
| Prism | 47   | 2     | Regression 47→39: auto-deduce killed agency | 4×4 Latin square too small; never automate the deduction |
| Probe | 51   | 3     | 3-strike (51→50→50, never 60) | Minesweeper deduction becomes formulaic once technique learned |
| Fence | 50   | 3     | Regression 50→46 + 3-strike | Edge-by-edge scanning too low info density for 5×5 grid |

## Architecture

```
src/
  games/          ← one file per game (self-contained)
  components/     ← shared UI (Tile, ShareButton, StatsModal, CelebrationBurst)
  utils/          ← seeding, scoring, stats persistence
  types.ts        ← shared types
App.tsx           ← navigation shell with game menu
program.md        ← this file (agent instructions + design loop — UPDATED BY STEP 9.5)
results.tsv       ← experiment log (scored per-dimension)
learnings.md      ← recursive self-improvement knowledge base (READ AT STEP 0, UPDATED BY STEP 8.5)
```

---

## Process Log

This log tracks how the design PROCESS performs across sessions. Updated by Step 9.5.

| Session Date | Games Designed | Iterations | Kills | Keeps | Most Common Failure | Wasted Iters | Process Change Made |
|---|---|---|---|---|---|---|---|
| 2026-03-30 | 6 | 16 | 6 | 0 | A10 (fully-visible optimization) | 12 | Added: Design Introspection section, Step 2.5 litmus tests, Step 9.5 process retrospective, tighter kill rules, optimization vs constraint classification |
| 2026-03-30b | 4 | 10 | 4 | 0 | A10 (fully-visible) then signal-per-action too weak (hidden info) | 6 | Fully-visible constraint satisfaction always A10. Hidden info defeats A10 but needs rich signal (Seek plateaued at 55). Next: rich multi-dimensional feedback per action. |
| 2026-03-30c | 5 | 12 | 5 | 0 | Deduction plateaus at 50; A10 kills linear puzzles; non-inverse ops = unsolvable | 8 | 5 kills: (1) deduction plateaus at 50 (Prism/Probe/Fence), (2) linear constraints = A10 (Scale), (3) non-self-inverse ops = unsolvable (Turn). Next: ONLY self-inverse toggle ops on grids (like LightsOut), or pure optimization with incommensurable costs (like Claim). |
| 2026-03-31 | 11 | 18 | 11 | 0 | A10 (3), d8-clones (3), feedback-generous (1), computation>intuition (1), known-puzzle (1), cascades-rare+intractable (2) | 18 | 11 games, 18 iters, 0 keeps. Sandpile/overflow mechanic (d8=7) shelved: BFS intractable for near-critical boards + cascades rare on 4×4 + arithmetic not intuition. Trace (52) remains best lead. Next: pattern recognition (IQ-test style), or visual sequence prediction, or revisit hidden-info with REDUCED feedback (Mastermind-style summary counts on spatial grid). |
| 2026-03-31b | — | — | — | — | PROCESS OVERHAUL: 26 games, 42 iterations, 0 keeps | — | Kill rules were too aggressive. Loosened kill rules, removed red flag deductions, froze anti-pattern list. |
| 2026-03-31c | — | — | — | — | EVALUATION OVERHAUL | — | Replaced subjective 10-dimension scoring with computable solver-based metrics (entropy, skill-depth, drama, counterintuitive moves, info gain ratio). Inspired by Browne's Ludi system (produced Yavalath from pure computation) and Togelius's skill-depth research. Reviewer now plays BLIND (no source code reading), narrates experience, does NOT score. Solver module required for every game. Two-phase build: prototype first, polish only after metrics validate mechanic. Loop reduced from 13 steps to 8. |

### Explored & Exhausted Families

These mechanic families have been tried multiple times without reaching 60. Do NOT design new games in these families unless you have a genuinely novel twist verified by the litmus tests.

| Family | Games Tried | Best Score | Why It Failed |
|---|---|---|---|
| Grid pick-for-points with blocking | Claim (63 KEPT), Flip (46), Span (48), Rift (33) | 63 (Claim) | Claim occupies this space. Variants score d8 ≤ 3 |
| Fully-visible graph optimization | Tint (49), Cross (51), Shift (48) | 51 | A10: solvable by staring, calculable costs |
| 2048/merge variants | Stack (36) | 36 | A4: too close to existing well-known games |
| Hidden random values | Dig (41) | 41 | A11: luck not skill, unfair par |
| Spatial packing + clues | Fit (47→39) | 47 | Tight clues prune search space to ~3 valid options; A10 despite large theoretical space |
| Edge-based constraint (Slitherlink) | Walls (24) | 24 | A4: well-known Nikoli puzzle clone |
| Path deduction (adjacency clues) | Coil (23) | 23 | A10 + solver bug. Fully-visible path constraints solvable by staring |
| Distance-based hidden object hunt | Seek (53→56→54→55) | 56 | No A10! But single distance per probe = weak signal. Plateaued at ~55 after 4 iterations |
| Small Latin square deduction | Prism (47→39) | 47 | Hidden info works but 4×4 too small. Auto-deduce killed agency (regression). Manual deduction IS the fun. |
| Minesweeper-style adjacency deduction | Probe (51→50→50) | 51 | Deduction works (d10=6) but strategy becomes formulaic once learned. Same technique on every puzzle = d5 capped at 4. |
| Hidden boundary discovery + painting | Fence (39→50→46) | 50 | Edge-by-edge scanning too low info density. Paint phase = guessing when scan budget tight. |
| Hidden coupling discovery (toggle variant) | Dial (31) | 31 | A10 after probing: hidden couplings fully revealed in 3-4 taps, then puzzle = linear algebra mod 4. Full revelation = A10. |
| Path optimization with quantitative damage | Reap (29) | 29 | A10: visible board + calculable value reduction. Quantitative damage (row/col -1) doesn't change option structure, just numbers. Need BINARY constraints (option removal) not numeric. |
| Row/column rotation (4×4 and 3×3) | Twist (solver only) | CI=0.1 | Rows and columns are independent axes — minimal displacement coupling. CI requires SHARED STATE between operations. |
| Adjacent swap sorting | Sort, Pour, Swap (solver only) | CI=0 | All swap/sort mechanics have CI=0. Swaps move exactly 2 elements — too local for cascading side effects. CI≥2 requires cyclic operations on 3+ elements. |

### Mental Model Calibration

Track prediction accuracy to improve your design intuition.

| Session | Average Prediction | Average Actual | Delta | What Was Overvalued | What Was Undervalued |
|---|---|---|---|---|---|
| 2026-03-30 | ~58 | ~43 | -15 | P1 preview (assumed it always helps — it hurts when costs are calculable), mechanic novelty (unique ≠ deep) | Strategic transparency (the "one sentence strategy" test), importance of constraint satisfaction vs optimization |
| 2026-03-30b | ~52 | ~42 | -10 | Full-visibility constraint satisfaction, weak signal-per-action in hidden info games | A10 dominates ALL fully-visible puzzles. Hidden info defeats A10 but needs RICH per-action feedback (multi-dimensional, like Wordle's 5 letters × 3 states). Single-dimension feedback (one distance number) plateaus at ~55. |
