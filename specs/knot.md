# Knot

## Rules
Draw a single closed loop on a grid that passes through every marked cell. Some cells have hidden directional constraints (entry/exit directions) revealed only when the loop reaches them. Complete the loop within par segments.

## Mechanic Type
Constraint Satisfaction

## Why It Works

### Stare Test
The marked cells (which the loop must pass through) are all visible, and the grid structure is known. But the DIRECTIONAL CONSTRAINTS are hidden -- revealed only when the player's loop reaches a marked cell. The player sees "loop must pass through cell (3,2)" but does NOT know that (3,2) requires entering from the left and exiting upward until the loop actually arrives. This means the player cannot pre-plan the entire route. They commit to a partial loop, discover a directional constraint that may conflict with their current trajectory, and must adapt in real time. This is the Wordle structure: act (extend the loop), get feedback (discover directional constraint), revise strategy (reroute).

The hidden directional constraints create PROGRESSIVE REVELATION. After the loop passes through 3 of 8 marked cells, the player knows 3 directional constraints and can use them to reason about the remaining 5 (e.g., "if cell (3,2) requires entering from the left, then the loop must approach from the left side, which means it can't also be passing through (3,1) in that segment"). But the remaining 5 constraints are still unknown, so the player is reasoning under PARTIAL information -- the classic structure that defeats A10.

The state space is also rich: on a 6x6 grid with 8 marked cells, the number of Hamiltonian-like loops passing through all marked cells is enormous. The directional constraints prune this dramatically, but the player only discovers the pruning AS they build. The effective planning horizon is 2-3 cells ahead, because directional constraints at the next marked cell might invalidate any longer plan.

### Dominant Strategy Test
"Connect the nearest marked cell" fails because directional constraints might force the loop to approach from a specific direction, requiring a detour AWAY from the cell before entering it correctly. A marked cell at (3,4) with a "must enter from below" constraint means the loop must come from (4,4), not (3,3) or (2,4) -- even if those are closer to the previous cell. The player must DISCOVER this by reaching the cell, then potentially backtrack (using undo at move cost) or plan a route that approaches from the correct direction.

"Explore marked cells closest to the grid edge first" fails because edge cells constrain the loop's overall shape -- committing to an edge route early might make it impossible to reach interior cells from the required direction. "Explore interior cells first" fails because interior cells have more possible entry/exit directions, making their constraints less informative early.

The incommensurable cost: extending the loop toward cell A (revealing A's constraint) might force a reroute that makes reaching cell B from B's required direction impossible. Whether to explore A or B first depends on their (hidden) constraints -- a genuine information-value tradeoff.

### Family Test
Loop drawing with hidden directional constraints. This is NOT:
- PathWeaver (open path, no loop; no hidden constraints)
- Slitherlink/Walls (boundary loop with numeric edge clues -- Knot has a through-cell loop with hidden directional constraints)
- Coil (spring pushing -- completely different mechanic)
- Loop (ring rotation -- different interaction type entirely)
- Any deduction game (Knot has spatial construction, not just inference)

The defining novelty is the COMBINATION of spatial construction (drawing a loop on a grid, which is tactile and satisfying) with hidden information revealed through construction (directional constraints appear as the loop reaches cells). The loop must be CLOSED (return to start), creating a global constraint that interacts with local directional constraints. The player is simultaneously a BUILDER (constructing a loop) and a DETECTIVE (discovering constraints).

**Unoccupied family**: Loop/network drawing with hidden constraints and progressive revelation.

## Predicted Failure Mode
**Most likely death: hidden constraints feel arbitrary.** If the directional constraints don't "make sense" -- if they feel randomly assigned rather than part of a coherent structure -- the player will feel that the game is punishing them for not being psychic. MITIGATION: the directional constraints must be GENERATED from a valid solution. The generator first draws a valid loop, then assigns directional constraints based on that loop's actual entry/exit at each cell. This guarantees solvability AND makes the constraints feel "fair" in retrospect ("of course the loop enters from the left there -- that's the only way to also reach cell (4,3) from below"). Additionally, the FIRST marked cell the player reaches should have a "generous" constraint (one that's compatible with multiple approach directions) to avoid instant frustration.

**Second risk: backtracking feels punishing.** If the player extends the loop 6 cells, hits a directional constraint that invalidates the route, and must undo all 6 cells, the game is frustrating, not fun. MITIGATION: (a) Undo is available but costs +1 to move count (P2 -- undo with cost preserves tension). (b) The generator ensures that no directional constraint requires undoing more than 3 segments to reroute. (c) Show a "warning glow" when the loop is heading toward a marked cell from an incompatible direction -- not revealing the constraint, but hinting "you might want to reconsider your approach angle." This is partial information (P1) that reduces frustration without trivializing the puzzle.

**Third risk: the loop closure constraint is too hard.** The loop must return to its starting cell after passing through all marked cells. On larger grids, finding ANY Hamiltonian-like loop is hard. MITIGATION: the loop does NOT need to visit every cell -- only the MARKED cells. The remaining cells are empty corridor. With 8 marked cells on a 6x6 grid (36 cells), the loop uses ~18-22 cells (about 50-60% of the grid), leaving ample routing space. The generator validates that multiple valid loops exist (not just one), so the player has flexibility.

**Anti-pattern proximity: A10 (if constraints were all visible).** The hidden constraints are the specific defense against A10. Without hidden info, this would be a Slitherlink variant (A4 + A10). With hidden info, each loop extension is a genuine decision under uncertainty.

## Expected Metrics
| Metric | Prediction | Reasoning |
|---|---|---|
| Puzzle Entropy | 15-28 | 6x6 grid, 6-10 marked cells, loop must pass through all. With hidden directional constraints, the effective state space is pruned progressively as constraints are revealed. Each puzzle has 3-8 valid loops given all constraints, but the player discovers constraints incrementally. Entropy measures the total information in the decision sequence. |
| Skill-Depth | 45-70% | Strategic players reason about approach angles: "Cell (3,4) is surrounded by 3 already-visited cells, so it can only be entered from the 4th direction. I should leave that direction open by routing my loop accordingly." They plan 2-3 cells ahead, anticipating likely constraints based on grid geometry. Greedy players (nearest cell first) hit more conflicts and waste more undo moves. |
| Counterintuitive Moves | 2-4 | "Extend the loop AWAY from the nearest marked cell" -- to approach a different marked cell from the correct direction (just discovered), which then enables reaching the first marked cell from a compatible angle. Also: "Loop through empty corridor instead of directly connecting two adjacent marked cells" -- because the directional constraints at both cells are incompatible with a direct connection. Detour routing is the core CI source. |
| Drama | 0.5-0.7 | Near-miss: "Loop passed through 7 of 8 marked cells, but the last cell requires entering from below, and the loop's current endpoint is ABOVE the cell. Closing the loop through the cell requires a 5-cell detour that conflicts with closing the loop back to start." The tension between reaching the last cell and closing the loop creates natural drama. |
| Decision Entropy | 2.0-3.5 | At each extension step, the player has 2-4 viable next cells (adjacent, not yet visited). After revealing a directional constraint, some options are eliminated, leaving 2-3 genuine choices. Rich enough for comparison without being overwhelming. |
| Info Gain Ratio | 2.0-3.0 | Strategic players use revealed constraints to infer likely constraints at unreached cells: "This cell enters from the left, so the loop must be coming from the west side of the grid here. The next marked cell to the northwest probably requires entering from below (since the loop will be heading north)." This inference reduces wasted exploration. |

## Player Experience
**Opening (10s):** A 6x6 grid with 8 marked cells (glowing dots). A starting cell in the bottom-left corner is highlighted -- this is where the loop begins and must end. You tap (1,0) -- the cell adjacent to the start. The loop extends, shown as a thick colored line. You head north toward the nearest marked cell at (3,0). You reach (3,0) -- the cell reveals its constraint with a brief animation: an arrow showing "enter from below, exit right." Perfect -- you entered from below (coming from (2,0)). The constraint is satisfied, and the cell glows gold. The loop must now exit to the right. You extend to (3,1).

**Middle (2min):** Five marked cells passed. The loop has formed an S-shape across the grid. Two marked cells remain: (1,4) and (4,5). You're currently at (3,3). The nearest is (1,4) -- two cells up and one right. You extend the loop upward: (2,3), (1,3), (1,4). Constraint revealed: "enter from the right, exit upward." But you entered from the LEFT (coming from (1,3)). Conflict! The cell flashes red. You need to approach (1,4) from the RIGHT side -- from (1,5). You undo 3 segments (3 moves added to count, per P2 cost). Now at (3,3) again. You route the loop RIGHT first: (3,4), (3,5), (2,5), (1,5), (1,4). This time you enter from the right. Constraint satisfied! The detour cost 3 extra segments but 0 undos. You exit upward from (1,4) to (0,4). One marked cell left: (4,5). You need to loop down to (4,5) and then back to the start at (0,0).

**Ending (15s):** The loop is at (0,4). You need to reach (4,5) -- far south. Route: (0,5), (1,5)... wait, (1,5) is already part of the loop. Can't revisit. You go (0,5), then down the east edge: (1,5) is blocked. No -- you route through the interior: (0,4), (0,3), (0,2), (0,1), (0,0)... but that closes the loop without reaching (4,5). Stuck. You undo back to (0,4) and rethink. The loop must somehow reach (4,5) from the north side of the grid. You see it: route through the center: (0,4), (0,5), (1,5), (2,5) -- wait, (1,5) is already in the loop from the detour. The S-shape used (1,5). This is the near-miss moment: the earlier detour to approach (1,4) from the right used the cells you now need. If you'd found a different route to (1,4) that avoided (1,5) and (2,5), the south path would be open. One routing decision in the middle determined the endgame.

**The aha moment:** "I shouldn't rush to the nearest marked cell -- I need to think about HOW I approach it, because the approach direction is constrained. Going east first opens the south corridor for later, even though it's away from the immediate target."

**The near-miss:** "22 segments, par was 20. The detour at cell (1,4) used 3 extra segments AND blocked the corridor I needed for cell (4,5). If I'd routed through row 2 instead of row 1 for the approach, I'd have saved the segments AND kept the corridor open."

**Screenshot:** A 6x6 grid showing the completed loop as a thick colored path weaving through marked cells (gold dots). Directional arrows visible at each marked cell. Loop segments colored by order (cool-to-warm gradient). "Knot #42: 20 segments, 8/8 cells. Par: 20."

## Difficulty Knobs
1. **Marked cell count and grid size** (Monday: 5 marked cells on 5x5, short loop with simple routing; Friday: 10 marked cells on 7x7, long loop requiring careful corridor management)
2. **Directional constraint tightness** (Monday: each marked cell has 3 compatible approach directions, generous routing; Friday: each marked cell has only 1-2 compatible directions, forcing specific approaches with minimal flexibility)
3. **Hidden vs. revealed constraints** (Monday: 2 of 5 directional constraints are pre-revealed, reducing uncertainty; Friday: all constraints hidden, maximum discovery-through-play)
4. **Par generosity** (Monday: par = optimal + 4, room for 2 undos and a detour; Friday: par = optimal + 1, requiring near-perfect routing with minimal backtracking)

---
<!-- BELOW THIS LINE: filled by engineer and playtester, not designer -->

## Solver Metrics

Computed on 5 puzzles (Mon-Fri seeds), 5 skill levels each.

| Metric | Mon | Tue | Wed | Thu | Fri | Avg |
|---|---|---|---|---|---|---|
| Solvability | Y | Y | Y | Y | Y | 100% |
| Puzzle Entropy | 14.7 | 11.2 | 20.3 | 21.0 | 26.8 | 18.80 |
| Skill-Depth | 15% | 35% | 100% | 100% | 100% | 70% |
| Decision Entropy | 1.47 | 1.24 | 1.45 | 1.50 | 1.34 | 1.40 |
| Counterintuitive | 0 | 1 | 2 | 2 | 4 | 1.80 |
| Drama | 1.00 | 0.18 | 0.73 | 0.67 | 0.70 | 0.66 |
| Duration (s) | 0.01 | 0.00 | 0.01 | 0.01 | 0.02 | 0.01 |
| Info Gain Ratio | 1.63 | 1.44 | 1.31 | 1.29 | 1.19 | 1.37 |
| Solution Uniqueness | 1 | 1 | 1 | 1 | 1 | 1 |

**Auto-kill check**: PASSED
**Weakest metric**: Decision Entropy -- 1.40 avg (low end of good range; constraint-guided routing narrows choices at each step, but stays above 1.0 threshold)
**Strongest metric**: Skill-Depth -- 70% avg (strong separation between random and strategic play, especially on harder difficulties where constraint reasoning dominates)

## Play Report
<!-- Playtester fills this section with blind play observations -->

## Decision
<!-- Designer fills this after reviewing metrics + play report -->
<!-- Status: keep / iterate / kill -->
