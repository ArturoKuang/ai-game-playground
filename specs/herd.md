# Herd

## Rules
Issue directional commands to move all animals of one color simultaneously toward their matching pen. Animals block each other on collision. Get every animal home within par moves.

## Mechanic Type
Constraint Satisfaction

## Why It Works

### Stare Test
All positions are visible, but the state space explodes with concurrent agents. With 3 colors x 3 animals each = 9 agents on a 5x5 grid, even planning 3 moves ahead requires simulating 4 directions x 3 colors = 12 options per move, creating 12^3 = 1,728 possible 3-move sequences, each with 9 agents colliding and blocking in different ways. Human working memory caps at ~4-7 objects; tracking 9 agents with collision physics across 3+ moves exceeds mental simulation capacity. The game passes the stare test not through hidden information but through COMBINATORIAL EXPLOSION of visible interactions -- the same reason chess passes despite full visibility.

### Dominant Strategy Test
"Move the most blocked color first" sounds reasonable but fails immediately. Moving red animals left might clear a path for blue, but it also pushes red into green's path, creating a new blockage. The cost of every move is INCOMMENSURABLE: whether moving red-left is good depends on whether you later plan to move green-up or green-right, which depends on whether blue is blocking green's upward path, which depends on where red ends up. This is genuine recursive cost dependency -- the core design principle from learnings.md.

### Family Test
Multi-agent constrained movement. This is NOT:
- IceSlide (single agent sliding on ice to a goal)
- PathWeaver (single path through a grid)
- Push/slide family (single block pushing)
- Loop (ring rotation -- no agents, just permutation)

The defining feature is CONCURRENT agents with mutual blocking. Each command moves an entire GROUP simultaneously, and the interactions between groups create the puzzle's depth. The closest commercial analog is "Toad and Frog" puzzles or the Rush Hour family, but those move individual pieces. Herd's group-movement-with-collision is a distinct mechanical family.

## Predicted Failure Mode
**Most likely death: A10 on easy days.** Monday with 2 colors x 2 animals = 4 agents might be mentally simulable for careful players. Mitigation: even Monday must have at least one blocking interaction that requires a non-obvious "move away from the pen first" sequence. Minimum 2 colors x 2 animals with at least one interlock.

**Second risk: d1 failure (too complex).** "Move all animals of one color in one direction" is a compound action. Players might not immediately grasp that ALL same-color animals move simultaneously, or that collision stops movement. The rule is simple in words but the consequences are visually complex.

**Third risk: difficulty cliff.** Monday (2 colors) might be trivially easy while Friday (4 colors) might be impossibly hard. The difficulty curve must be smooth, scaling agents and blocking density gradually.

**Anti-pattern proximity: A10 (fully visible).** The game is fully visible, which is normally fatal. But like chess and Sokoban, the combinatorial explosion of agent interactions prevents mental computation beyond 2-3 moves. This ONLY works if the puzzle requires 4+ move solutions where blocking creates mandatory detours.

## Expected Metrics
| Metric | Prediction | Reasoning |
|---|---|---|
| Puzzle Entropy | 15-22 | 9-12 agents x 25 positions x blocking interactions. Effective state space is huge. ~5-10 moves per puzzle = 5-10 decisions. |
| Skill-Depth | 50-80% | Multi-agent planning rewards deep thinking. Random move selection almost never solves; strategic sequencing (unblock before herd) is essential. Sokoban-family puzzles typically have very high skill depth. |
| Counterintuitive Moves | 3-5 | "Move red AWAY from the red pen" to unblock green, then move green, then move red home. Detour moves are the heart of the puzzle. Every interesting solution requires at least one "wrong direction" move. |
| Drama | 0.6-0.8 | High drama: player gets 8 of 9 animals home, but the last one is blocked and requires undoing progress. Near-miss scenarios are inherent to the blocking mechanic. |
| Decision Entropy | 2.5-3.5 | 3-4 colors x 4 directions = 12-16 options per move, but blocking constraints make ~4-8 genuinely useful. |
| Info Gain Ratio | 2.0-3.0 | Strategic players will dramatically outperform random movers. The game is deterministic with full info -- skill is purely planning depth. |

## Player Experience
**Opening (10s):** A cheerful 5x5 grid. Three red foxes, three blue birds, three green frogs, each near but not at their matching colored pens on the grid edges. You tap the red arrow pointing left -- all three foxes scoot left simultaneously. Two reach the red pen; one bonks into a blue bird and stops short. Immediately you understand: "I need to move blue out of the way first."

**Middle (2-3min):** You move blue birds up to clear the path for the stuck red fox. But now a blue bird is blocking a green frog's path to the green pen. You see the cascade: to get green home, you need blue to move. But blue's current position is perfect for the blue pen. If you move blue to help green, you'll need to move blue BACK afterward. You're three moves into a planning chain, weighing: "Is there a sequence that avoids this triangle of blockages entirely?"

**Ending (30s):** Two animals left. One green frog needs to go right, but a red fox (already home) is in the way. Moving red would pull all red foxes out of their pen. You realize: the frog can go UP first (into an empty lane), then RIGHT, then DOWN into the green pen -- a 3-move detour around the parked foxes. You execute the sequence, last frog hops home, celebration burst. One over par -- that initial red-before-blue was the mistake. Screenshot: an emoji grid showing animal paths as colored arrows, final positions matching pens.

**The aha moment:** "I can't move blue without also moving THIS blue -- so I need green to go AROUND instead." The moment you see the multi-agent constraint and find the detour.

**The near-miss:** "If I'd started with green instead of red, the blocking pattern would have been simpler. The opening move determines everything."

## Difficulty Knobs
1. **Number of colors/species** (Monday: 2 colors x 2 animals = 4 agents, simple blocking; Friday: 4 colors x 3 animals = 12 agents, complex cascading blocks)
2. **Blocking density** (Monday: animals start near their pens with 1 interlock; Friday: animals start far from pens with 3-4 interlocking blocking chains)
3. **Par moves** (Monday: par = 2x optimal for generous margin; Friday: par = optimal + 1, demanding precise sequencing)

---
<!-- BELOW THIS LINE: filled by engineer and playtester, not designer -->

## Solver Metrics (v2 — lock-in-pen iteration)

Computed on 5 puzzles (Mon-Fri seeds), 5 skill levels each.

| Metric | Mon | Tue | Wed | Thu | Fri | Avg |
|---|---|---|---|---|---|---|
| Solvability | 100% | 100% | 100% | 100% | 100% | 100% |
| Puzzle Entropy | 16.98 | 19.47 | 37.34 | 44.52 | 40.87 | 31.84 |
| Skill-Depth | 94.6% | 91.8% | 88.5% | 93.0% | 92.5% | 92.1% |
| Decision Entropy | 1.58 | 1.52 | 2.21 | 2.30 | 1.99 | 1.92 |
| Counterintuitive | 0 | 0 | 0 | 0 | 1 | 0.2 |
| Drama | 1.00 | 1.00 | 1.00 | 1.00 | 0.67 | 0.93 |
| Duration (s) | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| Info Gain Ratio | 2.91 | 3.05 | 2.32 | 2.34 | 2.16 | 2.55 |
| Solution Uniqueness | 12 | 5 | 1 | 1 | 1 | 4.0 |

Optimal solution lengths: Mon=7, Tue=8, Wed=13, Thu=14, Fri=15.
Grid: 5x5. Mon-Tue: 2 colors x 2 animals (4 agents). Wed-Fri: 3 colors x 2 animals (6 agents).
L1 (random) solves Mon/Tue occasionally but inefficiently (130-201 moves). L3 solves Mon-Thu. L5 (A*) solves all.

**Changes from v1:**
- Lock-in-pen mechanic implemented: animals on matching pen are locked and immovable
- Controls restructured: color selector tabs + D-pad, all above the fold
- No-op moves (wall-press) no longer increment counter; shake animation feedback
- Undo fully reverses state including move counter
- Difficulty tuned: Mon=7 (down from 10), Tue=8 (down from 11)

**Auto-kill check**: PASSED
**Weakest metric**: Counterintuitive = 0.2 avg (lock-in-pen makes progress permanent; CI moves are rarer because the heuristic aligns better with optimal play. CI=1 on Fri only.)
**Strongest metric**: Skill-Depth = 92.1% (random play almost never solves; strategic sequencing essential)
**Note on CI**: The lock-in-pen mechanic fundamentally reduces CI because locked progress is irreversible. Within-color conflict (moving both animals of a color together when they need different directions) is the remaining CI source. The designer should evaluate whether this CI level is acceptable for the game's emotional arc.

## Play Report

**CRITICAL BUG**: Puzzle is unsolvable. Exhaustive brute-force search confirms distance never reaches 0. Animals leave pens when new commands issued — no lock-in-pen mechanic.

**CRITICAL BUG**: Controls below viewport fold (y=628 on 600px viewport). Completely hidden.

**BUG**: Wall-press increments move counter without moving any animal.

**BUG**: Undo doesn't decrement move counter.

**Session 1 (Intuitive)**: Rules understood after ~5 taps (once controls found by scrolling). "All same-color move together" immediately clear. Fox→ toward adjacent pen INCREASED distance (6→8) — counterintuitive. Birds solvable via 5-move snake route (↓↓→→↑). Foxes stuck at dist=2 after 10+ moves.

**Session 2 (Strategic)**: Planned fox route (→↓←), got one fox into pen. But it LEAVES on next command. Both foxes cannot be simultaneously in pens. Birds cleanly solved. Strategic play reached dist=2 faster but same outcome: never won.

**Session 3 (Edge Cases)**: No win condition reachable. 64 possible 3-move fox sequences tested, minimum dist=2. No failure state either (no move limit, game runs forever).

**Strategy Divergence**: Strategic play reached dist=2 in fewer moves (8 vs 10). Bird section genuinely rewarding (planning 5 steps ahead). But foxes are unsolvable, making strategy moot.

**Best Moment**: Bird snake route (↓↓→→↑) — genuine puzzle-solving aha, planning 5 steps ahead.
**Worst Moment**: Confirming via brute-force that no combination of moves produces dist=0. Puzzle is broken.

## Decision

**Status: ITERATE (iteration 1 of 3)**

**Reasoning:** Herd has the strongest raw metrics of all three specs by a wide margin: skill-depth=95%, CI=2.4 (counterintuitive detour moves are real and frequent), info-gain=5.01 (strategic play massively outperforms random), entropy=29.8 (rich decision space). The playtester confirmed the mechanic is genuinely rewarding when it works -- the bird sub-puzzle produced a "planning 5 steps ahead" aha moment, exactly the emotional peak this game is designed for.

The critical bugs are all IMPLEMENTATION failures, not design flaws:
- Animals leaving pens on subsequent commands (no lock-in-pen mechanic)
- Controls below the viewport fold
- Wall-press incrementing the move counter
- Undo not decrementing the move counter

These are fixable without changing the core mechanic. The design is structurally sound.

**What to change:**

1. **Lock-in-pen mechanic (CRITICAL).** When an animal reaches its matching pen, it is LOCKED and no longer responds to movement commands. This is the single most important fix -- it makes the puzzle solvable and preserves the core tension: "If I move blue to clear red's path, the blue that ISN'T home yet will also move and might leave its good position." The locked animals become obstacles and landmarks, changing the board state in satisfying ways as the puzzle progresses.

2. **Controls must be above the fold.** The directional arrows and color selector should be integrated INTO the grid area or immediately below it, never requiring a scroll. On a 600px viewport, the grid (5x5 at ~60px per cell = 300px) plus controls (80px) plus header (60px) = 440px, well within bounds.

3. **Wall-press should be a no-op.** If a command would move zero animals (all blocked or at walls), do not increment the move counter. Give a subtle shake animation to signal "nothing happened."

4. **Undo must decrement the move counter.** Undo should fully reverse the game state including the counter. However, per P2, consider making undo cost something (counts against par, or limited to 1-2 undos) to preserve tension.

5. **Difficulty tuning.** Monday puzzles (2 colors x 2 animals) should have optimal solutions of 4-6 moves, not 10-11 as the solver currently produces. The playtester found 10+ moves tedious even on Monday. Reduce grid clutter on easy days -- fewer blocking interactions, more direct paths, with 1 required detour for the aha moment.

**Target metrics for iteration 2:** Maintain CI >= 2 and skill-depth >= 80%. Monday drama should rise above 0.10 (currently near-zero because progress is monotonic on easy puzzles -- the lock-in-pen mechanic should help by creating "I locked one in but now the other is stuck" moments). All bugs resolved, puzzle fully solvable.
