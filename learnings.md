# Design Learnings — Recursive Self-Improvement System

This file is a **living knowledge base** extracted from experiments. It is read at the start of every design loop iteration (Step 0) and updated at the end (Step 8.5). Every entry has **evidence** — a commit hash, a score delta, and a specific dimension affected.

> **Rule: Never add a learning without evidence. Never keep a learning that contradicts newer evidence.**

---

## How to Use This File

1. **Before designing**: Read the relevant section for your experiment type (new game, mechanic tweak, juice, etc.)
2. **Before evaluating**: Use the Score Prediction Heuristics to sanity-check your rubric scores
3. **After logging**: Update this file if the experiment produced a new insight or contradicted an existing one

---

## Proven Patterns (Do This)

Each pattern includes: what to do, why it works, evidence, and which rubric dimensions it affects.

### P1: Pre-Commitment Information Visibility

**What**: Show players the consequences of their action BEFORE they commit.

**Why**: Transforms guessing into reasoning. Players can compare options, creating genuine decisions (d3) and aha moments (d10) when the "obvious" choice isn't optimal.

**Evidence**:
- FloodFill +N gain counts on picker: 18 -> 20 (`d301d35`). "+1 now enables +8 next turn" creates genuine insight.
- DropPop two-tap select-then-pop: 17 -> 19 (`32f2aa9`). Group size preview lets players compare before committing.
- BounceOut blast radius preview (ChainPop): shows bubble count in range, helps timing decisions.

**Affects**: d3 (decisions) +1, d10 (aha) +1

**How to apply**: For any game where the player makes a choice, ask: "Can I show what each option does before they commit?" If yes, show it. If showing the full answer trivializes the game (see A3), show partial info.

---

### P2: Remove Fail-Safes That Kill Tension

**What**: No undo buttons, no infinite retries, no visual hints that solve the puzzle.

**Why**: If the player can't fail, decisions are meaningless. Tension (d4), skill ceiling (d7), and meaningful decisions (d3) all require the possibility of making a mistake.

**Evidence**:
- DropPop remove undo: 9 -> 17 (`3b81ea4`). Biggest single-change improvement. Red flag "no way to fail" removed.
- MirrorGrid killed at 1/30: red borders literally solved the puzzle. Two red flags triggered.
- TapOut killed at 6/30: pure reflex, zero strategy — no way to "play poorly" vs "play well."

**Affects**: d3 (decisions) +1-2, d4 (tension) +1-2, d7 (skill ceiling) +1-2

**How to apply**: Before adding undo/hints, ask: "Does this remove the only source of tension?" Undo is acceptable ONLY if it costs something (counts against par, like PathWeaver's undo counter).

---

### P3: Multi-Step Decisions Beat One-Shot Mechanics

**What**: Give players 3+ decisions per session, not 1.

**Why**: One-shot mechanics (single tap, single aim) collapse d3 (decisions), d4 (tension), d7 (skill ceiling), and d9 (pacing) simultaneously. Multiple decisions create a narrative arc.

**Evidence**:
- ChainPop 1 tap -> 3 taps: 10 -> 18 (`b717755`). Biggest mechanical change improvement (+8). Red flag "random tap can win" removed.
- TapOut killed at 6/30: 25 sequential taps but zero decisions — tap order is forced.

**Affects**: d3 +1-2, d4 +1, d7 +1, d9 +1

**How to apply**: Count the number of genuine decisions per session. If < 3, add more decision points or make existing ones richer. A "decision" must have 2+ viable options where reasonable players would disagree.

---

### P4: Day-of-Week Difficulty Scaling

**What**: Use `getDayDifficulty()` to make Monday easy and Friday hard. Scale multiple parameters, not just par.

**Why**: Creates a weekly rhythm, extends replay motivation (d5), and makes streaks feel like skill progression.

**Evidence**:
- Every game at 18+ uses day-of-week scaling.
- Best implementations scale 2-3 parameters simultaneously:
  - BitMap: fill rate + min/max fill + par time (`e294a89`)
  - FloodFill: num colors + par moves
  - ChainPop: num bubbles + par pops
- Worst: single scalar par (LightsOut `11-d`, PathWeaver `6-d`) — functional but uninspired.

**Affects**: d5 (one-more-day) +1, d7 (skill ceiling) +1

**How to apply**: For new games, design difficulty via 2+ linked parameters that change the puzzle character, not just the score threshold. Monday should feel "relaxing." Friday should feel "I need to think."

---

### P5: Animated Feedback on Every Core Action

**What**: Every tap that changes game state gets a spring animation (scale 1 -> 1.1-1.2 -> 1, 60-80ms + spring).

**Why**: Without animation, taps feel broken. With animation, taps feel alive. This is the #1 difference between d2=1 and d2=2.

**Evidence**:
- LightsOut add cell bounce: 19 -> 20 (`421630a`). Five cells bouncing simultaneously on toggle.
- PathWeaver add cell bounce: 16 -> 20 (`012a2df`). Bounce on path extension.
- ColorSort killed at 8/30 partially due to "minimal animations."

**Affects**: d2 (first-tap satisfaction) +1

**How to apply**: Use this exact pattern for cell-based games:
```typescript
Animated.sequence([
  Animated.timing(scale, { toValue: 1.15, duration: 60, useNativeDriver: true }),
  Animated.spring(scale, { toValue: 1, friction: 3, tension: 200, useNativeDriver: true }),
]).start();
```
For failure feedback, use a shake instead:
```typescript
Animated.sequence([
  Animated.timing(shakeX, { toValue: 6, duration: 40 }),
  Animated.timing(shakeX, { toValue: -6, duration: 40 }),
  // ... return to 0
]).start();
```

---

### P6: Iconic Share Text = Board State Visualization

**What**: Share text should show a visual representation of the puzzle or solution as an emoji grid, not just a score.

**Why**: Visual share text is instantly recognizable in group chats (d6), provokes comparison, and creates social proof. Wordle's colored grid is the gold standard.

**Evidence**:
- PathWeaver arrow grid (🟢➡️⬇️...🔴): d6=2 (`012a2df`)
- IceSlide 7x7 path map (🟢🟦⬛⭐): d6=2 (`4348c4e`)
- LightsOut 5x5 tap heatmap: d6=2 (already existed)
- BitMap nonogram grid: d6=1 (too dense to parse — shows limits)

**Affects**: d6 (shareability) +1

**How to apply**: Build a compact emoji grid (5x5 to 7x7 max) showing the game state or solution path. Use 3-4 distinct emoji types. The grid should be parseable at a glance in a group chat — if it looks like noise, it's too dense.

---

### P7: Guaranteed Solvability

**What**: Every puzzle presented to the player MUST have a valid solution. Verify this during generation.

**Why**: Unsolvable puzzles are the ultimate frustration — the player blames themselves, then the game, then quits. This is a silent killer that doesn't show up in code review.

**Evidence**:
- PathWeaver add DFS solvability: 16 -> 20 (`012a2df`). The old generator picked random start/end with no path validation.

**Affects**: d4 (tension) +1, d5 (one-more-day) +1 (players trust the game)

**How to apply**: Generate puzzles by working BACKWARDS from a solved state, or validate solutions via DFS/BFS before presenting. For constraint puzzles, use backtracking solvers. The cost is milliseconds; the benefit is permanent player trust.

---

### P8: Quadratic/Super-Linear Scoring Rewards Mastery

**What**: Score systems where bigger plays earn disproportionately more (size^2, combo multipliers).

**Why**: Linear scoring makes all plays equal. Quadratic scoring creates a tradeoff between safe small plays and risky big plays — the heart of strategic depth.

**Evidence**:
- DropPop quadratic scoring (size^2): 17 -> 19 (`32f2aa9`). 6-pop = 36pts vs two 3-pops = 18pts. Players actively seek to combine groups.

**Affects**: d3 (decisions) +1, d7 (skill ceiling) +1, d10 (aha) +1

**How to apply**: Wherever a player can choose between multiple small actions or one big action, make the big action disproportionately rewarding. Show the point values in the preview (P1) so players can reason about the tradeoff.

---

## Anti-Patterns (Never Do This)

### A1: Pure Reflex with Zero Strategy

**What it looks like**: The player's only skill is speed or pattern recognition with no planning horizon.

**Why it fails**: Collapses d3 (0), d10 (0), d5 (0). Players solve it once and never return.

**Killed**: TapOut (6/30) — "tap 1-25 in order, race the clock."

**Test**: Remove the timer. Is the game still interesting? If no, it's a reflex game.

---

### A2: Mechanics That Prevent All Failure

**What it looks like**: Undo buttons, visual hints that give away the answer, unlimited retries with no cost.

**Why it fails**: Red flag "no way to fail or play poorly." Kills d3, d4, d7 simultaneously.

**Killed**: MirrorGrid (1/30) — red borders solved the puzzle. DropPop (9/30 with undo).

**Test**: Can a player who taps randomly eventually "win"? Can a player who plans carefully get a measurably different result than one who doesn't? If no to either, the game has no failure mode.

---

### A3: Full-Solution Previews

**What it looks like**: Showing the complete trajectory, the full chain reaction, or the exact result before the player acts.

**Why it fails**: Turns a skill game into "confirm the preview." Kills d3 (decisions) and d7 (skill ceiling).

**Fixed**: BounceOut trajectory preview (80 steps with bounces) -> short 50px aim line: 17 -> 19 (`f72c3aa`).

**Test**: Does the preview remove the need to think? If yes, shorten it to directional hint only. The gap between "what I see" and "what happens" IS the game.

---

### A4: Clone Without a Twist

**What it looks like**: A well-known game (ball sort, 2048, Wordle) with identical mechanics and no distinguishing feature.

**Why it fails**: Red flag "essentially a clone." Players already have the original — why play yours?

**Killed**: ColorSort (8/30) — "ball sort clone with no twist."

**Test**: Can you describe what makes YOUR version different in one sentence? If not, add a twist or kill it.

---

### A5: One-Shot Mechanics

**What it looks like**: The entire game is a single action (one tap, one aim, one guess).

**Why it fails**: Collapses d3, d4, d7, d9 simultaneously. No narrative arc, no tension buildup.

**Fixed**: ChainPop 1 tap -> 3 taps: 10 -> 18 (`b717755`).

**Test**: Count genuine decision points per session. If < 3, the mechanic is too thin.

---

## Score Prediction Heuristics

Use these to sanity-check rubric scores before logging. If your score disagrees with the prediction by more than 3 points, re-examine your narration.

### Baseline Expectations

| Feature Present | Expected Score Range |
|----------------|---------------------|
| Functional game, no special features | 10-13 |
| + Day-of-week difficulty | +1-2 |
| + Animated tap feedback (spring) | +1 |
| + Pre-commitment info visibility | +1-2 |
| + Iconic emoji share text | +1 |
| + Multi-step decisions (3+) | +1-2 |
| + Guaranteed solvability | +1 |
| + Super-linear scoring | +1 |
| **Ceiling for a well-polished game** | **18-22** |

### Red Flag Penalties

| Red Flag | Penalty |
|----------|---------|
| Random play can win | -3 |
| No way to fail/play poorly | -3 |
| Optimal strategy obvious from move 1 | -3 |
| Clone without twist | -3 |
| Full-solution preview | -2 (soft) |
| No animation on core action | -1 (soft) |

### Dimension Correlation Map

Some dimensions are correlated — improving one often improves another:

```
d3 (decisions) <---> d7 (skill ceiling)     [strong: more decisions = more skill expression]
d3 (decisions) <---> d10 (aha)              [strong: decisions create insight moments]
d4 (tension)   <---> d5 (one-more-day)      [moderate: tension creates memorable sessions]
d2 (first-tap) <---> d9 (pacing)            [moderate: satisfying taps make time fly]
d6 (share)     <---> d5 (one-more-day)      [moderate: sharing creates social accountability]
```

Improving d3 is the **highest-leverage single improvement** — it correlates with d7, d10, and indirectly d4.

---

## Unsolved Problems

These are dimensions or challenges where we haven't found reliable solutions yet.

### U1: d5 (One-More-Day Pull) Ceiling at 2

**Problem**: No game has reliably scored d5=3. Binary solved/unsolved state limits replay motivation. Day-of-week difficulty helps but doesn't create "check at midnight" compulsion.

**Hypotheses to test**:
- Meta-progression: weekly challenges, achievement badges, unlock harder variants
- Social competition: leaderboards, friend comparisons
- Narrative hooks: daily puzzles that connect to a weekly meta-puzzle
- Imperfect information: puzzles where you can't be sure you found the optimal solution

### U2: d1 (Instant Clarity) Ceiling for Complex Mechanics

**Problem**: Deep games (LightsOut cross-toggle, BitMap nonogram clues) inherently need explanation. d1=1 seems to be the cost of depth.

**Hypotheses to test**:
- Guided first 3 taps that teach without text
- "Sandbox mode" first day that's trivially solvable, teaching mechanics through play
- Progressive rule reveal (start with simple version, add complexity over days)

### U3: Creating Truly Unique Mechanics (d8=3)

**Problem**: No game has scored d8=3 ("nothing else feels like this"). All games draw from known mechanic families.

**Hypotheses to test**:
- Hybrid mechanics: combine two proven families (merge + deduction, flow + chain reaction)
- Novel input: drag-to-draw, multi-touch, tilt/shake
- Constraint inversion: instead of "fill the grid," "remove everything but one cell"

---

## New Game Design Checklist

Before building a new game, verify it has:

- [ ] **3+ genuine decision points** per session (P3)
- [ ] **A way to fail** — measurable difference between good and bad play (A2)
- [ ] **Guaranteed solvability** — every seed has a valid solution (P7)
- [ ] **1-sentence rules** — if it needs a paragraph, simplify
- [ ] **Not a clone** — describe the twist in one sentence (A4)
- [ ] **Day-of-week difficulty** designed with 2+ linked parameters (P4)
- [ ] **Pre-commit preview** — player sees consequences before acting (P1)
- [ ] **Animated tap feedback** — spring animation on every state change (P5)
- [ ] **Iconic share text** — emoji grid showing game state (P6)
- [ ] **Scoring that rewards mastery** — super-linear or par-based (P8)

If a game can't check 8/10 of these at design time, reconsider the mechanic.

---

## Changelog

| Date | Entry | Evidence |
|------|-------|---------|
| 2026-03-29 | Initial creation from 11-game evaluation + 8 iteration experiments | results.tsv rows e294a89 through 4348c4e |
