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

**How to apply**: For any game where the player makes a choice, ask: "Can I show what each option does before they commit?" If yes, show it. If showing the full answer trivializes the game (see A3), show partial info. **Caveat (P9)**: P1 only helps when the puzzle has enough decision axes for comparison. Landing dots on a 1-gem IceSlide puzzle were neutral (16→16, `4089331`) because there was only one viable path to compare against. **Caveat (P10)**: P1 works best when the COST shown is an OPPORTUNITY cost (what you lose access to) rather than a CALCULABLE penalty (exact points lost). Claim's "+5 pts, locks 12 pts" works because the lock significance depends on future strategy (incommensurate). Cross's "+5 pts, eliminates 12 pts" failed because the penalty was directly calculable. Shift's "region → N" failed because all 20 options were mechanically scannable. Tint's conflict penalty "+7 quad, -5 clash = +2" failed because gain AND cost were both numeric — player just picks max delta. The sweet spot: show WHAT happens (visual preview) but let the player JUDGE how much it matters.

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

### P9: Minimum Decision Complexity Floor (Even on Easy Days)

**What**: Even the easiest (Monday) puzzle must have at least 2 independent decision axes — e.g., 2 collectibles that create route-order choices.

**Why**: P1 (pre-commitment info) and P4 (day-of-week difficulty) become meaningless when the puzzle only has one viable path. Showing all options doesn't help if there's nothing to compare. Monday should be easy to *solve*, but the player should still face "which order?" or "which route?" choices.

**Evidence**:
- IceSlide 1 gem Mon: 16/30 (`8c2ed21`, `4089331`). Landing previews + gems both scored d3=1 — one gem = one path. Two independent reviewers confirmed.
- IceSlide 2 gems Mon: 18/30 (`a9d8c5c`). d3 jumped 1→2. Same mechanics, but 2 gems = genuine route comparison.

**Affects**: d3 (decisions) +1, d4 (tension) +1, d7 (skill ceiling) +1

**How to apply**: Before shipping, check: on the easiest seed, are there 2+ genuinely different strategies? If not, increase the minimum constraint count. Scale *difficulty* with day-of-week, but never scale below the decision floor.

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

### A6: Moving Targets Kill Strategic Depth

**What it looks like**: Game elements move continuously, so the board state changes between the player's observation and action.

**Why it fails**: Collapses d3 (decisions), d7 (skill ceiling), and d10 (aha moments) simultaneously. The player can't compare options or plan ahead because positions change unpredictably. Optimal play degrades to "react to clusters as they form" — reflex, not strategy.

**Evidence**: ChainPop wave-multiplier experiment scored 13/30 (`96124f1`). Despite adding strategic scoring depth (wave ×N multiplier), d3=1, d7=1, d10=1 because bubble movement prevented planning. Two independent reviewers flagged the same root cause. Static version also scored 13/30 (`062eec2`) — removing movement was necessary but not sufficient; chain prediction visibility was also needed.

**Test**: Can the player pause, study the board, and form a plan? If no, the movement is undermining strategy. Movement is acceptable ONLY if the player has a way to freeze/pause before committing (like BounceOut's aim line) or if the movement IS the puzzle (like Mini Metro's demand growth).

---

### A7: Uncontrolled Auto-Play Destroys Agency

**What it looks like**: After the player's action, the game automatically performs additional actions (auto-cascades, auto-matches, chain reactions) that the player cannot influence or stop.

**Why it fails**: Collapses d3, d4, d7, d9, d10 simultaneously. The player becomes a spectator watching the game play itself. Worse, the auto-play can be so powerful that a single input determines the entire outcome, making the game a one-shot slot machine (A5).

**Evidence**: DropPop auto-cascade (`20f6add`) scored 4/30. One pop triggered ×10 cascade clearing 75% of board. d3=0, d4=0, d7=0, d9=0, d10=0. The cascade minimum group size of 2 was too low — gravity almost always creates pairs.

**Fix**: Auto-play is acceptable ONLY if: (a) the player triggered it intentionally through planning, AND (b) the cascade is capped or predictable, AND (c) most game decisions are still manual. If auto-play dominates, switch to player-triggered bonuses (highlight gravity groups, let player choose).

---

### A8: Low Branching Factor Kills Decision Depth

**What it looks like**: At each decision point, the player has only 1-2 valid options due to tight constraints (e.g., strict sequence matching on adjacent cells).

**Why it fails**: Collapses d3 (decisions) because there's nothing to compare. Even removing previews/highlights doesn't help — the player is scanning for the one valid move, not choosing between strategies. Path is effectively forced.

**Evidence**: LinkUp killed at 14/30 (`738fe10`, `1672266`). Adjacent cells with the right number in a 1→2→3→4→1 cycle yield ~1-2 valid moves per step. Both with and without highlights, d3=1. Two independent reviewers confirmed.

**Test**: At each decision point, how many genuinely different options does the player have? If average < 2.5, the constraint is too tight. Loosen the matching rule (e.g., ±1 instead of exact +1) or increase the grid/neighbor count.

---

### A9: Preview-Outcome Gap Kills Informed Decisions

**What it looks like**: The game shows a preview of the action's first-order effects, but hidden second-order effects (chain reactions, cascading settles) change the outcome dramatically. The player sees "X will happen" but "X + Y + Z" actually happens.

**Why it fails**: P1 (preview) only helps when the preview closely matches the actual outcome. If chain reactions add 50%+ unpreviewable consequences, the player is effectively guessing about the real result. This creates frustration without insight — the player can't learn from mistakes because the causal chain is invisible.

**Evidence**: Tumble killed at 44→53→49/100 (`35a7cb0`, `70c8010`, `1869326`). On a 5×5 grid with match-3 groups + gravity, chain pops after re-settling were unpredictable. The reviewer failed to solve the puzzle in 4+ attempts despite understanding the mechanics. V2 (no preview info) scored d7=7 but d9=4 (too hard). V3 (partial preview) didn't improve overall score.

**Test**: Does the preview show ≥80% of what actually happens? If not, either remove auto-chains (make each step player-triggered) or show the full chain step-by-step in preview. The gap between "what I see" and "what happens" should be small enough for human working memory.

---

### A10: Fully-Visible Optimization = Planning Puzzle Trap

**What it looks like**: The entire board state is visible from the start, and the player must find the optimal configuration/coloring/assignment. The player plans everything before acting; execution is rote.

**Why it fails**: Collapses d4 (tension) and d10 (aha) simultaneously. No information is revealed during play, so there's no progressive discovery. The player either finds the optimal in the planning phase or doesn't — execution adds nothing. P1 previews with calculable deltas make this worse by turning each decision into "scan for max number."

**Evidence**: Tint killed after 3 iterations (42→49→46). Map coloring + quadratic scoring + P1 deltas. Even with irreversible painting and conflict penalties, d4 never exceeded 4. Reviewers consistently flagged: "tension is front-loaded in planning, execution is rote."

**Test**: Can the player solve the puzzle by staring at the board before touching anything? If yes, the game lacks execution uncertainty. Good games reveal information THROUGH play (Wordle: guess → feedback, Minesweeper: click → revealed, Claim: pick → lock cascade).

**Extended evidence**: A10 also applies to constraint satisfaction puzzles, not just optimization. Fit (polyomino packing + row/col clues) scored 47→39 because tight uniqueness constraints pruned the theoretical search space (100k+ positions) to ~2-3 valid options per shape. The player solved the puzzle entirely through pre-play analysis. **Key insight**: the effective branching factor (after constraint propagation) matters, not the theoretical one.

---

### A11: Information Asymmetry Between Solver and Player

**What it looks like**: Par/optimal is computed using information the player doesn't have (hidden values, full board knowledge). The player must guess, making the skill gap feel luck-dependent.

**Why it fails**: Collapses d7 (skill ceiling — player can't approach par through skill alone) and d10 (aha — no deducible insights, just lucky/unlucky reveals). Creates a FAIRNESS problem: par feels unachievable.

**Evidence**: Dig killed after 2 iterations (38→41). Par used full underground knowledge, but player only had column sum clues. Reviewer: "improvement feels luck-dependent" and "a human can never approach this since underground values are hidden until revealed."

**Test**: Can a perfectly-playing human (given infinite time but only player-visible information) reliably reach par? If not, the information asymmetry is too large. Either give the player DEDUCIBLE clues (like Minesweeper numbers) or compute par based on player-available information.

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
- [ ] **Not A10** — player cannot solve by staring before touching (Design Introspection Stare Test)
- [ ] **No dominant strategy** — best approach cannot be described in one sentence (Design Introspection Test 1)
- [ ] **Correct puzzle type** — if optimization, costs are incommensurable per P10; if constraint satisfaction, constraints couple non-trivially
- [ ] **Effective branching factor > 3** — for constraint satisfaction, count ACTUAL valid options per step after constraint propagation, not theoretical positions. Tight uniqueness clues can prune 99% of options, making A10 apply despite large boards (Fit: 6×6 grid, 100k+ theoretical positions, ~3 actual valid options per shape = A10)

If a game can't check 11/14 of these at design time, reconsider the mechanic. The last 4 items are the most important — they predict the 40-vs-60 split that the first 10 cannot.

---

## Changelog

| Date | Entry | Evidence |
|------|-------|---------|
| 2026-03-29 | Initial creation from 11-game evaluation + 8 iteration experiments | results.tsv rows e294a89 through 4348c4e |
| 2026-03-30 | Added A9 (preview-outcome gap) from Tumble kill | Tumble 44→53→49 killed after 3 iterations |
| 2026-03-30 | Claim kept at 63/100 — locking + P1 value preview = d3=8 | Claim v1→v6: 41→38→56→56→63→62 |
| 2026-03-30 | Killed 10 games, key learnings: (1) variants of same template get d8=2, (2) small combinatorial spaces are exhaustible, (3) P1 with all options scannable creates brute-force not insight, (4) single-push clearing = A5 in disguise | Flip d8=2, Cross 45→51→43, Shift 46→48, Shove 42→37 |
| 2026-03-30 | Added A10 (fully-visible optimization = planning puzzle trap) from Tint kill. P10 caveat updated with Tint evidence. | Tint 42→49→46, killed after 3 iterations |
| 2026-03-30 | Added A11 (information asymmetry between solver and player) from Dig kill. Hidden random values = luck not skill. | Dig 38→41, killed after 2 iterations |
| 2026-03-30 | Bloom killed: chain reactions satisfying (d2=6, d10=6) but strategy transparent ("tap 4s adjacent to 4s"). Games need INCOMMENSURABLE costs — where the best move depends on future decisions you haven't made yet. | Bloom 44→53→46, killed after 3 iterations |
| 2026-03-30 | Rift killed: A10+P10 again. Halving row/col on pick is a CALCULABLE cost; preview shows exact delta, making "scan for max" optimal. 4 games killed this session (Tint/Dig/Bloom/Rift) — all share the transparent-strategy problem. Next game MUST use Claim-style LOCKING (binary access loss) not numerical penalties. | Rift 33/100, killed after 1 iteration |
| 2026-03-30 | Span killed: binary blocking IS better than numerical penalties (d3: 4→5 vs Rift) but still A10. Span is a Claim variant without Claim's d3=8 depth. Key lesson: grid-based pick-and-block is Claim's territory; next game must use a DIFFERENT mechanic family (sequencing, merge, grouping, or packing). | Span 48→48, killed after 2 iterations |
| 2026-03-30 | Stack killed: 2048 variant = A4 clone (d8=2). KEY INSIGHT: all 6 killed games were OPTIMIZATION puzzles (maximize a score). The frozen games that work (LightsOut, BitMap, PathWeaver) are CONSTRAINT SATISFACTION puzzles (find a solution). Constraint satisfaction creates aha from DEDUCTION, not calculation. Next game must be constraint satisfaction. | Stack 36/100, killed after 1 iteration |
| 2026-03-30 | Prism killed (regression 47→39). Auto-deduce removed player agency — the act of MANUAL constraint propagation IS the fun in deduction puzzles. Also: 4×4 Latin square too small for daily puzzle depth (game solvable in 3 guesses on Monday). Auto-filling forced cells is like auto-completing a Sudoku — it robs the player of aha moments. | Prism v1 47, v2 39 (`3ac0ef5`, `d9c13e6`) |
| 2026-03-30 | Probe killed after 3 iterations (51→50→50). Minesweeper × Nonogram hybrid created genuine aha (d10=6) but strategy is LEARNABLE — same "probe safe zones, cross-reference row/col" technique works every puzzle. d5 capped at 4. KEY INSIGHT: deduction with a FIXED TECHNIQUE (like Sudoku naked singles) creates d10 the first time but becomes rote. Games that score d5≥5 need strategy that VARIES per puzzle, not just different numbers. | Probe v1-v3 (`a495ea0`→`dcd2d53`) |
| 2026-03-30 | Scale mercy-killed: balance beam = linear equation = A10. Linear/arithmetic constraints are tractable by humans → always A10. Games that resist A10 need NONLINEAR coupling. | Scale v1 46 (`b0a67f3`) |
| 2026-03-30 | Turn killed (45→9): CRITICAL — backward scrambling only works when the operation is SELF-INVERSE. Turn's directional propagation is NOT self-inverse: forward 3 moves creates a puzzle requiring millions of moves to solve backward. LightsOut works because XOR toggle IS self-inverse. Any new toggle game must verify invertibility. | Turn v1-v2 (`f3e0945`→`8d19377`) |
