# Chain

## Rules
Build a path by tapping adjacent cells one at a time. Each tapped cell is consumed and rotates all its untapped neighbors one step on the color wheel (R->G->B->R). The consumed cell must match the corresponding color in the target sequence. Consume all cells with every consumed color matching its target position.

## Mechanic Type
Constraint Satisfaction

## Why It Works

### Stare Test
All cell colors are visible, and the target sequence is known. But the ROTATION SIDE EFFECT at every consumption step makes pre-planning impossible beyond 3-4 steps. Consuming cell A (matching sequence color 1) rotates A's 2-4 untapped neighbors one step on the wheel. Now the colors of those neighbors have CHANGED. Whether neighbor B now matches sequence color 2 depends on B's original color AND how many times B has been rotated by consuming OTHER cells adjacent to B. On a 5x5 grid, a cell in the interior has 4 neighbors. Being adjacent to 4 cells that might be consumed before it means the cell could be rotated 0, 1, 2, 3, or 4 times -- each yielding a different final color. Planning the full 25-step consumption sequence requires tracking rotation counts for every cell across every step. Even planning 5 steps ahead requires tracking rotations for ~8-12 cells that are adjacent to the consumed cells. This exceeds human working memory.

The rotation mechanic creates CASCADING STATE CHANGES: consuming cell 1 changes cells 2, 3, and 4. Consuming cell 2 (now rotated) changes cells 5, 6, and 7. But cell 5 might be adjacent to cell 1 (already consumed), so cell 5's rotation count is the SUM of rotations from cell 1 and cell 2. The rotation count accumulates non-linearly across the consumption path.

### Dominant Strategy Test
"Consume cells that already match the target sequence color" fails catastrophically. Consuming a matching cell ROTATES its neighbors, potentially BREAKING matches at those neighbors for their future positions in the sequence. A red cell that matches target position 1 is a tempting first move, but consuming it rotates its 3 untapped neighbors -- if any of those neighbors needs to be the SAME color (now rotated away) at a later sequence position, the match is destroyed.

"Avoid rotating cells that you'll need later" is better intuition but impossible to execute: EVERY consumption rotates neighbors, and every cell will eventually be consumed (the goal is to consume ALL cells). The player must sequence consumptions so that each cell accumulates the RIGHT NUMBER of rotations before being consumed. Cell B (currently green, target = blue) needs exactly 1 rotation (G->B) before consumption. If B is adjacent to cells A and C, and A will be consumed first, then B gets 1 rotation from A's consumption. Perfect -- B is now blue when consumed. But if C is ALSO consumed before B, B gets a second rotation (B->R), making it red. The player must ensure that B is consumed AFTER A but BEFORE C. The ordering constraint at EVERY cell depends on the ordering at its NEIGHBORS, creating a web of local sequencing dependencies that interact globally.

This is the hallmark of incommensurable cost: the value of consuming cell X at position N in the sequence depends on (a) X's current color (after all prior rotations), (b) the target color at position N, AND (c) which of X's neighbors will be consumed AFTER X (determining which future cells receive X's rotation side effect). The player is simultaneously satisfying a LOCAL constraint (match color) and managing GLOBAL side effects (rotation cascading).

### Family Test
Sequential consumption with color-rotation side effects. This is NOT:
- PathWeaver (open path with no state transformation -- Chain has rotation at every step)
- Loop (ring rotation of tiles -- Chain is sequential consumption on a grid)
- LightsOut (simultaneous toggle -- Chain is sequential with accumulating rotations)
- Phase (global phase cycling -- Phase was simultaneous; Chain is one-cell-at-a-time with local effects)
- Sort (1D ordering -- Chain is 2D path with color transformation)
- Herd (group movement -- no path construction)

The defining novelty: the game board TRANSFORMS as the player interacts with it. Each step changes the state of multiple cells, and the accumulated changes determine whether future steps can satisfy their constraints. This is "the floor changes color as you walk" -- a mechanic where the path itself reshapes the terrain for subsequent steps. The 3-color rotation wheel is simple enough to reason about locally (one step = predictable) but the ACCUMULATION of rotations from multiple sources creates complexity that emerges from simplicity.

**Unoccupied family**: Sequential consumption with accumulating local state transformation.

## Predicted Failure Mode
**Most likely death: too hard for humans (computation > intuition).** If tracking rotation counts across multiple cells requires mental arithmetic, the game feels like homework. MITIGATION: (a) Show the CURRENT color of each cell in real time as the player extends the path (rotation effects applied visually as neighbors rotate). The player sees colors CHANGE as they consume cells, making the rotation effects visceral and visual, not arithmetic. (b) Show the NEXT target color prominently -- the player looks for "which adjacent cell is the right color RIGHT NOW?" rather than computing future rotations. (c) Allow tentative path extension -- the player can extend the path and see rotation effects without committing, then retract the last 1-2 extensions. This makes exploration tactile.

**Second risk: forced paths (low branching factor, A8).** If the target sequence and rotation mechanics constrain the path to 1-2 valid options at each step, the game is a forced march. MITIGATION: the target sequence should be designed with 3-5 valid consumption orderings (multiple cells of the right color available at each step). The rotation mechanic CREATES new matches as it destroys others, maintaining a healthy branching factor. The generator validates that at least 2 valid paths exist at each step.

**Third risk: the 3-color wheel is too simple.** With only 3 colors (R, G, B), every cell cycles through all 3 with period 3. After 3 rotations, a cell returns to its original color. This periodicity might make rotation effects too predictable, reducing them to a simple modular arithmetic exercise. MITIGATION: the PATH constraint (adjacency requirement) limits WHICH cells are available at each step, so even if rotation is predictable, the COMBINATION of "right color AND right position AND right sequence step" creates genuine constraint coupling.

**Anti-pattern proximity: A10 (fully visible), Phase-style opacity.** Defense against A10: while all initial colors and the target sequence are visible, the accumulated rotation effects create a state-space that exceeds mental simulation (unlike pure A10 puzzles where the state doesn't change). Defense against Phase-opacity: showing real-time color changes as the player extends the path makes rotation effects VISIBLE and INTUITIVE, not abstract.

## Expected Metrics
| Metric | Prediction | Reasoning |
|---|---|---|
| Puzzle Entropy | 18-35 | 5x5 grid = 25 cells in the path. At each step, 2-4 adjacent untapped cells are candidates. After rotation filtering (must match target), 1-3 are valid. The rotation accumulation creates additional branching (a cell might become valid after rotation by a neighbor's consumption). Total decision info across 25 steps: ~18-35 bits depending on puzzle tightness. |
| Skill-Depth | 50-75% | Strategic players plan 3-4 steps ahead: "If I consume A now, B rotates to blue, which matches step 3. Then consuming B rotates C to red for step 4." This lookahead chain exploits rotation to CREATE future matches. Greedy players (consume whatever matches NOW) quickly run out of matching cells because their rotations break future matches. The skill gap is in rotation EXPLOITATION vs. rotation AVOIDANCE. |
| Counterintuitive Moves | 3-5 | "Consume this cell that does NOT match the current target color" -- wait, it must match. Okay, the CI is different: "Consume cell A (which matches) instead of cell B (which also matches), even though B is closer to the remaining cluster." Why? Because consuming A rotates cell C into the right color for step 4, while consuming B would rotate C AWAY from step 4's color. The CI is in WHICH matching cell to consume, not whether to consume a non-match. Also: "Take a longer path to avoid rotating a critical cell" -- routing around a cell to preserve its color for a later step. |
| Drama | 0.5-0.7 | Near-miss: "23 of 25 cells consumed, but the last 2 cells are both green and the target needs blue then red. If I'd consumed cell (2,3) before cell (2,4), the rotation would have set up the right colors for the finale. One swap in the ordering and I'd have cleared the board." |
| Decision Entropy | 2.0-3.5 | At each step: 2-4 adjacent cells available, of which 1-3 match the target color. After rotation analysis, 1-2 are genuinely interesting (different rotation side effects). Tight enough for comparison without being overwhelming. |
| Info Gain Ratio | 2.0-3.5 | Strategic players clear 90%+ of cells by exploiting rotation chains. Greedy players get stuck at 60-80% when rotation effects create color mismatches in the remaining cells. The gap comes from forward-planning rotation effects vs. reacting to them. |

## Player Experience
**Opening (10s):** A 5x5 grid of colored cells (red, green, blue). Below the grid, a sequence of 25 colored dots: the target. Dot 1 is red. You look for a red cell on the grid edge (the path must start somewhere). Cell (0,0) is red. You tap it -- it pulses, turns gold (consumed), and its neighbors ROTATE: (0,1) shifts from green to blue, (1,0) shifts from blue to red. The rotation animation is smooth -- a brief color wheel spin on each neighbor. Satisfying. Dot 2 in the target sequence is blue. You look at your available neighbors: (0,1) is now blue (just rotated!), (1,0) is now red. (0,1) matches. You tap (0,1).

**Middle (2min):** Twelve cells consumed. The path snakes across the grid. You're at (2,3). Target dot 13 is green. Neighbors: (2,4) is red, (1,3) is blue, (3,3) is green. Perfect -- (3,3) is green, matching dot 13. But wait: if you consume (3,3), it rotates (3,4) from blue to red and (4,3) from red to green. Dot 14 is blue and dot 15 is green. After consuming (3,3): (3,4) = red (need blue for dot 14 -- doesn't match), (4,3) = green (matches dot 15). Dead end at dot 14. What if you DON'T consume (3,3) yet? Instead, consume (1,3) -- it's blue, and dot 13 is green... no, (1,3) doesn't match. Consume (2,4) -- it's red, dot 13 is green. Doesn't match either. Only (3,3) matches green for dot 13. But consuming it breaks dot 14. You look deeper: after consuming (3,3), can you reach a DIFFERENT cell for dot 14? (3,2) is unclaimed and adjacent to (3,3). What color is (3,2)? Currently green. After (3,3) is consumed, does (3,3) rotate (3,2)? Yes -- (3,2) rotates from green to blue. Blue matches dot 14! The path goes (3,3) -> (3,2) instead of (3,3) -> (3,4). The rotation that "broke" (3,4) simultaneously "fixed" (3,2). This is the aha moment.

**Ending (15s):** Two cells left: (4,4) and (4,3). Target dots 24 and 25 are blue and red. (4,4) is currently blue (after 3 rotations from neighboring consumptions). (4,3) is green. If you consume (4,4) first (blue = dot 24), it rotates (4,3) from green to blue. But dot 25 needs red, and (4,3) is now blue. Wrong. If you consume (4,3) first -- it's green, dot 24 is blue. Doesn't match. Stuck? You retrace: 3 steps back, you consumed (3,4) which rotated (4,4) to blue. What if you had consumed (3,3) instead at that point? (4,3) would have gotten an extra rotation (green -> blue), and then (4,4) consumed later would rotate (4,3) from blue to red. Red = dot 25! You undo 3 steps, reroute through (3,3), and the endgame resolves perfectly. The last cell consumed triggers a cascade of color-wheel animations across the grid as all cells spin to gold. Board cleared.

**The aha moment:** "I should consume A instead of B -- not because A is a better match, but because A's rotation side effect sets up the NEXT cell's color perfectly. The rotation isn't a penalty to manage -- it's a TOOL to exploit."

**The near-miss:** "24 of 25 cells consumed, but the last cell is green and the target needs red. Two rotations short. If I'd routed through (2,4) instead of (2,3) three steps ago, the extra rotation from (2,4)'s consumption would have pushed the last cell to red. The path I chose was locally optimal but globally wrong."

**Screenshot:** A 5x5 grid showing the consumption path as a numbered trail (1-25) with colors matching the target sequence. The path shape tells the story -- snaking detours where the player routed around cells to manage rotations. "Chain #42: 25/25 consumed, 2 undos. Par: 0 undos."

## Difficulty Knobs
1. **Grid size** (Monday: 4x4 = 16 cells, short sequence, limited rotation cascading; Friday: 5x5 = 25 cells, long sequence with deep rotation cascading)
2. **Color count** (Monday: 2 colors (R, G) with period-2 rotation, simpler to track; Friday: 3 colors (R, G, B) with period-3 rotation, harder to predict accumulated effects)
3. **Target sequence constraint** (Monday: target has 3-4 "free" positions where any color is accepted, relaxing the constraint; Friday: all 25 positions are strictly constrained, requiring exact rotation management)
4. **Undo allowance** (Monday: 4 free undos before penalty; Friday: 1 free undo, then each undo counts against par)

---
<!-- BELOW THIS LINE: filled by engineer and playtester, not designer -->

## Solver Metrics
<!-- Engineer fills this section with raw computed metrics -->

## Play Report
<!-- Playtester fills this section with blind play observations -->

## Decision

**Status: KILL (auto-killed, Decision Entropy = 0.60)**

Decision Entropy 0.60 is well below the 1.0 red flag threshold (A8: low branching factor). The target sequence color constraint combined with rotation side effects prunes the choice space to ~1 valid move per step. The mechanic is clever on paper -- cascading color rotations creating incommensurable costs -- but in practice, the constraint "consumed cell must match target color" is so tight that only 1-2 cells (often just 1) are valid at each step. The path is effectively forced.

**Lesson learned**: Sequential consumption with strict color-matching targets creates A8 (forced path) even when the underlying state transformation is rich. The rotation mechanic generates complexity in the STATE SPACE but not in the DECISION SPACE. For CI and decision depth, the branching factor at each step matters more than the theoretical state-space size. A game can have 10^15 possible states but DE=0.6 if only one path through those states satisfies the constraints. Color-matching constraints on a path should allow 3+ valid options per step (e.g., "any color in this SET" rather than "exactly this color").
