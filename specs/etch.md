# Etch

## Rules
Remove blocks from a grid one at a time to leave a pattern where each row and column has exactly the target number of blocks remaining. Each removal must be adjacent to the previous one (carving a connected path). Solve within par removals.

## Mechanic Type
Constraint Satisfaction

## Why It Works

### Stare Test
A 6x6 grid (36 blocks). Row targets specify how many blocks remain per row (e.g., row 1: keep 3, row 2: keep 2). Column targets similarly. The player can compute WHICH cells need removing (total to remove = 36 - sum of row targets). On a 6x6 grid with typical targets, ~16-20 cells need removing. But the CONTIGUITY CONSTRAINT (each removal adjacent to the last) means the player must find a connected path through ALL cells-to-remove. This is equivalent to finding a Hamiltonian path on the subgraph of removable cells -- an NP-hard problem in general. The player cannot solve by staring because the path-planning problem is computationally hard: knowing WHAT to remove is easy, but finding a CONNECTED ORDER to remove them requires navigating a maze-like path through the grid. A dead-end (no adjacent removable cell) forces backtracking to a different path, but there's no undo -- the block is already removed.

More critically, the row/column targets create AMBIGUITY about which cells to remove. If row 3 needs 4 blocks remaining out of 6, the player must remove 2 from that row -- but WHICH 2? There are C(6,2) = 15 ways to choose. The column constraints reduce options, but typically 3-5 valid configurations exist for each row. The player must simultaneously solve a SET SELECTION problem (which cells) and a PATH PLANNING problem (what order). These two problems are coupled: some valid cell selections have no connected removal path, while others do. The player must find a selection that's both constraint-satisfying AND path-connected.

### Dominant Strategy Test
"Remove cells that violate the most constraints" fails because: (a) the NEXT removal must be adjacent to the CURRENT one, so the player can't freely choose the most-violated cell, and (b) removing a cell might satisfy its row target but leave the column in a state where the remaining removable cells in that column aren't reachable by the path. The contiguity constraint couples SPATIAL decisions (where to go next) with CONSTRAINT decisions (which cells to sacrifice), creating incommensurable costs at every step.

"Start in a corner and spiral inward" fails because the spiral will inevitably remove cells that should be kept (violating row/column targets). The path must SKIP certain cells, which means it snakes through the grid in a non-obvious pattern.

"Plan the full path first, then execute" fails because the path-planning problem is NP-hard for 16-20 nodes -- the player cannot enumerate all valid paths. They must plan locally (2-3 steps ahead) while maintaining global awareness of which cells still need removing and whether the remaining cells are still reachable.

### Family Test
Contiguous path carving with constraint satisfaction. This is NOT:
- PathWeaver (constructing a path FROM start TO end -- Etch destroys blocks to leave a pattern)
- FloodFill (painting connected regions -- Etch removes cells, doesn't color them)
- Fit (placing shapes onto a grid -- Etch removes FROM a grid)
- Any toggle/constraint game (no state cycling -- permanent removal)
- Any sorting/ordering game (spatial, not sequential)

The defining novelty: the player carves a DESTRUCTIVE path through the grid, and the path's shape determines which blocks remain. It's like sculpting -- chiseling away material to reveal a pattern, but you can only chisel adjacent to your last cut. The contiguity constraint transforms a static puzzle (which cells to remove?) into a dynamic one (how to REACH those cells in a connected sequence?). The closest commercial analog is nonogram + maze -- you know what the result should look like, but the construction process IS the puzzle.

## Predicted Failure Mode
**Most likely death: too hard / frustrating.** If most removal paths lead to dead-ends (no adjacent removable cell), the player spends most of their time getting stuck and restarting. The path-planning component could overwhelm the constraint-satisfaction component. Mitigation: generate puzzles by working BACKWARD from a valid path (start with a connected removal path, then compute the row/column targets it produces). This guarantees solvability AND ensures the path feels discoverable. Also: on Monday, the path through removable cells should be highly connected (each removable cell has 2-3 removable neighbors), so dead-ends are rare.

**Second risk: A10 on small boards.** A 4x4 grid with 6 cells to remove might be plannable by staring. Mitigation: minimum 6x6 on all days, with 16+ cells to remove. The path-planning problem on 16+ cells in a 6x6 grid is well beyond human mental simulation.

**Third risk: decision entropy too low (A8).** If the contiguity constraint is too tight, the player has only 1-2 adjacent removable cells at each step, making the path forced. Mitigation: ensure each removable cell has on average 2.5+ removable neighbors (dense subgraph of removable cells). The player should have genuine choices about direction at most steps.

**Anti-pattern proximity: A10 (fully visible).** The row/column targets and the grid are fully visible. Defense is the NP-hard path-planning on the removable subgraph. But the EMOTIONAL defense is more important: the game FEELS dynamic because the path snakes through the grid, and dead-ends create real tension. Each step is a commitment that constrains future options.

## Expected Metrics
| Metric | Prediction | Reasoning |
|---|---|---|
| Puzzle Entropy | 20-30 | 6x6 grid, ~18 cells to remove. Each step has 2-4 adjacent removable cells. Path length 18 with branching 2.5 = 2.5^18 paths (~3.6 billion). Even with heavy pruning, effective state space is enormous. |
| Skill-Depth | 50-75% | Strategic players plan 3-4 steps ahead, checking for dead-ends before committing. They also identify "bridge cells" (cells that connect two clusters of removable cells) and ensure they're reached at the right time. Random path-walkers hit dead-ends and waste moves. |
| Counterintuitive Moves | 2-5 | "Remove this cell that DOESN'T need removing" -- sometimes the player must carve through a non-target cell to reach a cluster of target cells on the other side, then account for the extra removal in their row/column planning. Also: "Go south even though most remaining targets are north" -- because the path must loop around to avoid a dead-end corridor. Path-level detours that look wrong locally but maintain global connectivity are the primary CI source. |
| Drama | 0.5-0.8 | The player has carved 15 of 18 cells. Three remain, in an L-shape. The current position is adjacent to 2 of them, but removing cell A first cuts off access to cell C (dead-end). Must go to B first, then C, then A. Realizing this at step 15 is a genuine "oh no" moment. Late-game path geometry creates natural tension. |
| Decision Entropy | 1.5-3.0 | 2-4 adjacent removable cells per step on average. Some steps are forced (1 option), some have 3-4 genuine choices. The average should be ~2.5, solidly in the sweet spot. |
| Info Gain Ratio | 2.0-3.0 | Strategic players who avoid dead-ends and plan bridge crossings will complete the path in par. Players who walk greedily will hit dead-ends, waste moves on backtracking (if allowed), or fail. |

## Player Experience
**Opening (10s):** A 6x6 grid of stone blocks. Row targets on the left (3, 2, 4, 3, 2, 4), column targets on top (3, 4, 2, 3, 4, 2). You calculate: row 1 needs 3 kept, so 3 must go. Total to remove: 18 blocks. You see highlighted candidates -- cells you might want to remove based on targets. You tap a corner block to start carving. It crumbles with a satisfying chip-away animation, leaving a gap. A subtle path marker shows where you started.

**Middle (2min):** Ten blocks carved. The path snakes through the grid like a river. You're at position (3,4), and three adjacent cells are removable. Going right reaches (3,5) -- good, row 3 still needs 1 more removal. But then you'd be at the edge with only (4,5) accessible, which you DON'T want to remove (column 5 is at target). Dead end. Going down reaches (4,4) -- column 4 needs exactly 1 more removal, so that works. From (4,4), you can reach (4,3) and (5,4), keeping the path alive. Going left reaches (3,3) -- but column 3 is already at target. Removing (3,3) would push column 3 below target. Unless... you reclassify which cells to remove in column 3, swapping your plan. The contiguity constraint is forcing you to RETHINK your removal set, not just your path.

**Ending (20s):** Two cells left. You're at (5,2), and the last removable cells are (5,3) and (6,2). Both are adjacent -- no dead-end risk. But (5,3) would bring row 5 to exactly 2 remaining (target: 2) while (6,2) would bring column 2 to exactly 3 remaining (target: 3). Either order works for the final targets, but you go (6,2) then (5,3) for the satisfying column-first completion. Last block crumbles. Grid shows the remaining 18 blocks forming a pattern that satisfies all row and column targets. 18 moves, par was 19. The carved path traces through the empty cells like a river through a canyon.

**The aha moment:** "I can't go straight to that cluster of removable cells in the northeast -- there's a bridge cell at (2,4) that I need to cross first, and if I remove it now, I'll be trapped in the northwest. I need to finish the southeast BEFORE crossing the bridge. The path order is the puzzle, not just which cells to remove."

**The near-miss:** "I hit a dead-end at (4,6) because I carved (4,5) instead of going around. Had to waste 2 extra moves carving non-target cells to reconnect. 20 moves, par was 18. The dead-end at step 12 cost me the puzzle."

**Screenshot:** A 6x6 emoji grid where remaining blocks are solid squares and removed blocks show the path as footprint emojis. Row/column targets along the edges, all satisfied. The carved path visible as a winding trail through the grid.

## Difficulty Knobs
1. **Grid size and removal count** (Monday: 5x5 grid, ~10 cells to remove, short manageable path; Friday: 7x7 grid, ~24 cells to remove, long path with multiple bridge crossings)
2. **Subgraph connectivity** (Monday: removable cells form a highly connected subgraph with 2.5+ neighbors each, very few dead-ends possible; Friday: removable cells have 2.0 average neighbors with bottleneck bridges, dead-ends are real threats)
3. **Target ambiguity** (Monday: row/column targets uniquely determine which cells to remove, player only solves the path problem; Friday: 3-5 valid removal sets exist, player must find one that's BOTH constraint-satisfying AND path-connected)
4. **Par calibration** (Monday: par = optimal path length + 3; Friday: par = optimal path length + 1)

---
<!-- BELOW THIS LINE: filled by engineer and playtester, not designer -->

## Solver Metrics

Computed on 5 puzzles (Mon-Fri seeds 42001-42005), 5 skill levels each.

| Metric | Mon | Tue | Wed | Thu | Fri | Avg |
|---|---|---|---|---|---|---|
| Solvability | YES | YES | YES | YES | YES | 100% |
| Puzzle Entropy | 10.8 | 12.4 | 16.9 | 18.1 | 23.0 | 16.2 |
| Skill-Depth | 80% | 80% | 80% | 80% | 80% | 80% |
| Decision Entropy | 1.80 | 1.77 | 1.54 | 1.64 | 1.43 | 1.64 |
| Counterintuitive | 0 | 0 | 0 | 0 | 0 | 0 |
| Drama | 1.00 | 1.00 | 0.00 | 0.00 | 0.00 | 0.40 |
| Duration (s) | 0.000 | 0.000 | 0.000 | 0.001 | 0.000 | 0.000 |
| Info Gain Ratio | 1.25 | 1.24 | 1.11 | 1.09 | 1.03 | 1.14 |
| Solution Uniqueness | 1 | 1 | 1 | 1 | 2 | 1.2 |

Skill level breakdown:

| Day | L1 | L2 | L3 | L4 | L5 |
|---|---|---|---|---|---|
| Mon (5x5, 9 removals) | FAIL | 9 | 9 | 9 | 9 |
| Tue (5x5, 10 removals) | FAIL | 10 | 10 | 10 | 10 |
| Wed (6x6, 15 removals) | FAIL | FAIL | FAIL | 15 | 15 |
| Thu (6x6, 16 removals) | FAIL | FAIL | FAIL | 16 | 16 |
| Fri (7x7, 23 removals) | FAIL | FAIL | FAIL | 23 | 23 |

**Auto-kill check**: FAILED (Counterintuitive = 0 on all puzzles)

**Important note on CI=0**: This is a mathematical property of backward-generated puzzles with exact row/col targets, NOT evidence that greedy is optimal. Greedy (L2) fails on 3/5 puzzles; DFS is required for harder puzzles. The heuristic (constraint excess) decreases monotonically because the removal set exactly matches the targets by construction. The game's real depth comes from path planning (avoiding dead-ends, choosing direction), which the CI metric doesn't capture. Greedy fails because it picks locally-good cells that lead to path dead-ends, not because the constraints are trivial.

**Weakest metric**: Counterintuitive -- 0 (structural property of exact-target backward generation; aha moments exist in path planning, not constraint violations)
**Strongest metric**: Skill-Depth -- 80% (random and greedy solvers fail on most puzzles; DFS with backtracking required)

## Play Report
<!-- Playtester fills this section with blind play observations -->

## Decision

**Status: KILL (auto-kill confirmed)**

**Metrics reviewed:**
- Counterintuitive Moves = 0 across all 5 puzzles -- FATAL
- Drama = 0.40 (below 0.5 threshold for engagement)
- Info Gain Ratio = 1.14 (near the 1.2 red flag floor)
- Skill-Depth = 80% is misleading -- it measures DFS vs random, not strategic vs greedy. The depth comes from backtracking search (path finding), not from counterintuitive insight.

**Root cause:** Irreversible contiguous path carving is structurally monotonic. When the removal set exactly matches row/column targets (backward generation), the constraint-excess heuristic decreases monotonically with each correct removal. There is never a reason to remove a cell that INCREASES constraint violations. The "depth" is pathfinding (avoiding dead-ends), not strategic sacrifice. Pathfinding difficulty is computational, not insightful -- it creates frustration (dead-ends), not aha moments.

**Lesson for learnings.md:** Irreversible contiguous path carving with exact targets produces CI=0 because the constraint satisfaction is monotonic by construction. The game's difficulty is PATH PLANNING (NP-hard maze traversal), not STRATEGIC DECISION-MAKING. Path planning creates computational challenge (can I reach all cells?) but not counterintuitive insight (should I sacrifice something now?). For a daily puzzle, difficulty must come from strategy, not from computation. Players want to feel clever, not to feel like a search algorithm.

**Exhausted family:** Irreversible contiguous path carving with constraint targets.
