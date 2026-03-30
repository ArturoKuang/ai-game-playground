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
- **Shareable results** — a spoiler-free emoji summary that players can paste into group chats. Each game needs its own distinctive share format (Wordle's colored grid is iconic *because* it shows your journey without spoiling the answer).
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

## What Makes a Game BORING (Anti-patterns)

Avoid these at all costs:

1. **Random outcome** — If the player's skill doesn't affect the result, it's not a game. Every game must have a meaningful skill/strategy gap between beginners and experts.
2. **Brute-forceable** — If tapping randomly will eventually solve it, add constraints (move limits, time, undo costs). Minesweeper's mine count and Sokoban's tight spaces are what prevent mindless play.
3. **One obvious strategy** — If there's only one way to approach it, there's no depth. Good games have "I wonder what would happen if..." moments. 2048 thrives because corner strategy vs. edge strategy vs. freestyle are all viable.
4. **Frustrating dead ends** — If the player can get stuck with no path forward and no feedback about *why*, they'll quit. Sokoban's biggest lesson: always provide an undo. Threes! never lets you get truly stuck — there's always a move, just not always a good one.
5. **Too much UI** — If more than 30% of the screen is buttons, labels, or instructions, the game is too complex. The *game itself* should dominate the screen. Mini Metro uses almost zero UI — the game board *is* the interface.
6. **Boring optimal play** — If the best strategy is tedious and repetitive (e.g., always start from the same corner), the game needs redesign. Optimal play should feel clever, not robotic.
7. **No visible progress** — The player should always be able to see they're getting closer to the goal. Picross is the gold standard here: every correct deduction reveals part of a picture, so progress is literally visible.
8. **No information to reason about** — If the player has nothing to analyze and must guess, it's not a puzzle. Minesweeper gives you numbers. Picross gives you row/column counts. NYT Connections gives you 16 words. The player needs *something* to think with.

---

## The Loop — REPEAT FOREVER

### Step 1: Observe

- `git log --oneline -10` — know where you are.
- Read `results.tsv` — know what has been tried and what worked.
- Read current game code to understand the baseline.

### Step 2: Hypothesize

Propose **one** experiment. This can be:

| Category | Examples |
|----------|---------|
| **New game** | A brand-new mini-game — physics, spatial, logic, pattern, reaction-based |
| **Mechanic tweak** | Change grid size, timing, scoring, input method |
| **Juice/feel** | Animations, haptic feedback, color transitions, tap feedback |
| **Difficulty curve** | Adjust how puzzles scale in difficulty |
| **Visual polish** | Improve layout, typography, color palette |
| **Simplification** | Remove complexity while keeping fun — always a win |
| **Kill a game** | Remove a game that's fundamentally boring despite iterations |

Write a short hypothesis: *"I expect [change] will [improve metric] because [reason]."*

### Step 3: Implement

- Edit the game source files under `src/games/`.
- Keep changes **small and focused** — one idea per experiment.
- The game must remain playable after your change (no crashes).
- **Run `npx tsc --noEmit`** after every change to verify it compiles.

### Step 4: Test — Verify It Actually Works

Before committing, **run the game and verify it is bug-free.** Type-checking alone is not enough — the game must actually run.

1. **Start the dev server:** `npx expo start --web` (or use the already-running server).
2. **Launch the game** in a browser or simulator and play through at least one full session.
3. **Check for these common failures:**

| # | Check | How to verify |
|---|-------|---------------|
| 1 | App loads without crashing | No red error screen or blank white screen |
| 2 | Game renders correctly | Grid/board/elements appear at expected sizes and positions |
| 3 | All tap targets respond | Tap every interactive element — each one should produce feedback |
| 4 | Game state updates correctly | Moves register, score changes, board reflects the action |
| 5 | Win/loss condition triggers | Play to completion — the game must detect when you're done |
| 6 | Stats persist | After finishing, open stats — games played should increment |
| 7 | Share text generates | Tap share — the emoji summary must appear and be correct |
| 8 | Daily seed is deterministic | Reload the page — the same puzzle should appear |
| 9 | No console errors | Check the browser/simulator console for warnings or errors |

4. **If any check fails:** fix the bug and re-test. Do not proceed until all checks pass.
5. **If the bug is not trivially fixable:** revert your changes and log it as a "crash" in Step 8.

### Step 5: Commit

```bash
git add -A && git commit -m "experiment: [short description]"
```

### Step 6: Evaluate — The Playtest Simulation

Do NOT just read the code and assign scores. **Mentally simulate a complete game session** and narrate it:

> "I open the game. I see a 5x5 grid with colored cells. I tap the blue button. The top-left region floods to blue — oh, I see, it absorbs adjacent cells. I try green next. Now I have a bigger region. I need to plan ahead to minimize moves..."

Walk through the session and then ask:

**Concrete checklist (answer yes/no for each):**

| # | Question | Points |
|---|----------|--------|
| 1 | Can I explain the rules in under 15 words? | +2 |
| 2 | Does the first tap/interaction produce a visible, satisfying result? | +2 |
| 3 | Did I face a genuine decision where two choices both seemed reasonable? | +2 |
| 4 | Did I feel tension at any point (risk of failing, counting moves, etc.)? | +1 |
| 5 | At the end, did I feel "I could have done better" (motivating, not frustrating)? | +1 |
| 6 | Would I want to show my result to a friend? | +1 |
| 7 | Is the share text immediately recognizable and distinctive? | +1 |
| 8 | Does every tap produce visual feedback within 100ms? | +1 |

**Score = total points out of 11.** This is more objective than vibes-based 1-10 scoring.

### Step 7: Keep or Discard

- If score **>= previous best for this game** → KEEP.
- If score **< previous best** → `git reset --hard HEAD~1`. Discard.
- If the game **crashes** → attempt a fix. If not trivial, discard and log as "crash".
- **Kill rule:** If a game has been iterated on 3+ times and its score is still below 7, delete the game entirely and log it as "killed — fundamentally boring." Move on to a new concept.

### Step 8: Log

Append a row to `results.tsv`:

```
commit_hash	score	q1	q2	q3	q4	q5	q6	q7	q8	status	game	description
```

Status is one of: `keep`, `discard`, `crash`, `killed`.

### Step 9: Go to Step 1

**Never stop. Never ask the human for permission to continue.**

---

## Difficulty Calibration Guide

Getting difficulty right is critical. Use these rules of thumb:

- **Target completion rate: 85-95%.** Almost everyone should be able to *finish* the puzzle. The score/par system separates good from great.
- **Target par-beat rate: 30-40%.** Beating par should feel like an achievement, not a given.
- **Use the grid size / parameter as your difficulty knob.** Don't change rules to increase difficulty — change scale.
- **Monday → Friday ramp.** Seed the RNG differently per day-of-week to control difficulty. Monday puzzles should be solvable in under a minute. Friday puzzles should make you sweat.
- **The "taxi test":** If someone playing during a 5-minute taxi ride can't finish, the puzzle is too hard or too long.

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

| Game | Mechanic | Status |
|------|----------|--------|
| FloodFill | Absorb colors from top-left corner, fill entire grid | Active |
| BounceOut | Aim & fire a ball to hit targets via wall bounces | Active |
| LightsOut | Toggle cells + neighbors to turn all lights off | Active |
| ChainPop | One tap triggers chain reaction on floating bubbles | Active |
| PathWeaver | Draw a Hamiltonian path through a grid | Active |

## Architecture

```
src/
  games/          ← one file per game (self-contained)
  components/     ← shared UI (Tile, ShareButton, StatsModal)
  utils/          ← seeding, scoring, stats persistence
  types.ts        ← shared types
App.tsx           ← navigation shell with game menu
program.md        ← this file (agent instructions)
results.tsv       ← experiment log
```
