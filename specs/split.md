# Split

## Rules
Draw lines along grid edges to partition a colored 5x5 grid into regions. Each region must contain exactly one cell of every color.

## Mechanic Type
Constraint Satisfaction

## Why It Works

### Stare Test
The grid is fully visible, but the partition search space is ENORMOUS. A 5x5 grid has 40 internal edges; the player selects a subset to form closed region boundaries. The number of valid partitions of 25 cells into regions of 5 (with 5 colors) is combinatorially explosive -- far beyond mental enumeration. More critically, each boundary segment affects TWO adjacent regions simultaneously. Placing a line between cells A and B separates them into different regions, which constrains what BOTH regions can contain. This dual-region coupling means the player cannot reason about one region in isolation -- every boundary decision propagates constraints to neighbors. The constraint propagation chain across 5 regions exceeds working memory, preventing "solve by staring." This is the same defense mechanism as LightsOut (toggle coupling) applied to boundary placement.

### Dominant Strategy Test
"Draw boundaries around clusters of same-colored cells" fails immediately. The goal is the OPPOSITE: each region needs exactly one of each color, so same-colored cells must be SEPARATED, not grouped. "Separate same-colored cells by drawing between them" sounds better but is not actionable -- there are many ways to separate any pair, and each separation constrains how you can form the rest of the regions. The optimal partition depends on the specific color layout: which colors are adjacent, which are isolated, and how the 5 regions can tile the grid without leaving orphan cells. A line that perfectly separates two reds might force a region that contains two blues, requiring a different approach. The cost of each boundary segment is INCOMMENSURABLE: whether this line helps depends on where you draw the NEXT line, which depends on the regions you haven't yet defined.

### Family Test
Spatial partitioning with per-region composition constraints. This is NOT:
- FloodFill (painting regions with colors -- Split partitions by drawing boundaries)
- PathWeaver (single path routing -- Split creates closed region boundaries)
- Fit (placing shapes to cover cells -- Split draws boundaries, not shapes)
- BitMap (deduction from visible clues -- Split is pure constraint satisfaction through construction)
- Any grid pick/claim game (no scoring, no locking -- pure structural arrangement)

The defining novelty: the player constructs BOUNDARIES, not fills. Each boundary segment simultaneously constrains two regions. The closest commercial analog is "region division" puzzles (Fillomino, Suguru), but those provide numerical clues about region sizes. Split uses color composition as the constraint, which is more visual and more coupled.

## Predicted Failure Mode
**Most likely death: A10 (solvable by staring on easy days).** If Monday's puzzle has only 1-2 possible valid partitions and the colors are positioned so the answer is visually obvious, the game degrades to "trace the obvious boundaries." Mitigation: even Monday must have 3+ valid partitions, with the PAR partition (fewest line segments) requiring non-obvious splits. The generator must verify that the greedy approach (separate nearest same-colored pairs) does NOT produce the optimal partition.

**Second risk: A8 (low branching factor).** If the color distribution is too constrained, most boundary positions are forced -- the player has only 1-2 valid lines to draw at each step, making the experience feel like following a forced path rather than making choices. Mitigation: puzzles should be generated from valid partitions, then the colors should be assigned so that multiple partition strategies are viable.

**Third risk: d1 failure (rules unclear).** "Each region must contain exactly one of each color" is simple in words but the player needs to understand: (a) they're drawing LINES on edges, (b) lines form closed regions, (c) regions are automatically computed from the boundary topology. If the line-drawing interface is confusing, d1 collapses. Mitigation: highlight the region a line would create as the player draws, showing color counts in real-time.

**Anti-pattern proximity: A10.** The full grid is visible. The defense is boundary-coupling (each line affects two regions) and the exponential partition space. If the coupling is too weak (independent regions that can be solved one at a time), the game becomes 5 trivial sub-puzzles. Regions MUST share boundaries so that solving one constrains the others.

## Expected Metrics
| Metric | Prediction | Reasoning |
|---|---|---|
| Puzzle Entropy | 15-25 | 40 internal edges, subset selection for boundaries. Multiple valid partitions per puzzle but par partition is unique or near-unique. 8-15 line segments per solution = 8-15 decisions. |
| Skill-Depth | 40-70% | Strategic players identify which cells MUST be separated (two same-colored adjacent cells) and work outward. Random boundary drawing almost never creates valid regions. The dual-region coupling rewards systematic constraint propagation. |
| Counterintuitive Moves | 2-4 | "Put these two same-colored cells in the SAME region temporarily" -- because the alternative boundary would strand an isolated cell that can't form a complete region. Also: "extend this region AWAY from the color it needs" to route around a blocking constraint. Boundary detours that look wrong but enable downstream solutions. |
| Drama | 0.5-0.7 | 4 of 5 regions valid, but the 5th has two greens. The player must repartition the boundary between regions 4 and 5, which cascades a change to region 3. The "almost done but one region breaks" near-miss is inherent to coupled partitioning. |
| Decision Entropy | 2.5-3.5 | At each step, the player considers ~6-10 possible boundary segments, of which 3-5 are viable (don't immediately create an invalid region). Rich but not overwhelming. |
| Info Gain Ratio | 1.5-2.5 | Strategic players who propagate constraints (if red is here, this region MUST extend there) dramatically outperform random drawers. Manual constraint propagation IS the skill. |

## Player Experience
**Opening (10s):** A 5x5 grid of colored cells -- red, blue, green, yellow, purple. You see 5 red cells scattered across the grid. You know: these 5 must end up in 5 different regions. You tap the edge between two adjacent red cells to draw a line separating them. The two regions on either side light up with color counts: left region has 1 red, 1 blue; right region has 1 red. The line feels like slicing with a knife -- satisfying separation.

**Middle (2-3min):** Three regions are taking shape. Region A (top-left) has {red, blue, green} -- needs yellow and purple. Region B (top-right) has {red, yellow} -- needs blue, green, purple. You need to extend B downward to reach the purple cell at (4,5). But extending B also picks up a second red at (3,5). You can't have two reds in one region. So you draw a line between (3,5) and (4,5), putting (3,5) in a new region C. But now C has only {red} and needs 4 more colors -- is there room? You trace the remaining cells. C could extend left to pick up blue at (3,4), green at (3,3), yellow at (4,4), and purple at (4,3). That works! But wait -- yellow at (4,4) is currently in region D, which also needs a yellow. If you take D's yellow, D breaks. The cascade: to fix C, you steal from D, which forces you to repartition D's boundary with region E...

**Ending (30s):** Final boundary placed. All 5 regions light up green -- each contains exactly one of every color. 12 line segments, par was 13. You beat par because you found a partition that reused a long boundary for two regions instead of drawing separate walls. Screenshot: a 5x5 emoji grid with colored boundary lines showing your partition, each region outlined in a different color.

**The aha moment:** "The two reds at (2,3) and (3,3) look like they need a wall between them, but if I extend region A AROUND both of them and put the wall between (3,3) and (3,4) instead, region A gets exactly one red and the second red joins region C naturally." The non-obvious boundary placement that solves two constraints at once.

**The near-miss:** "I had 4 perfect regions but the 5th had two blues. If I'd drawn the left boundary of region 2 one cell further, the extra blue would have landed in region 3 instead. One line in the wrong place cascaded through everything."

## Difficulty Knobs
1. **Grid size and color count** (Monday: 5x5 with 5 colors, 5 regions of 5 cells each -- clean and structured; Friday: 6x6 with 6 colors, 6 regions of 6 cells each -- more boundary options and tighter coupling)
2. **Color adjacency density** (Monday: same-colored cells are spread apart with 1-2 adjacent same-color pairs, boundaries are more obvious; Friday: 4-5 adjacent same-color pairs requiring creative non-local boundary routing)
3. **Par calculation** (Monday: par = optimal + 4 line segments, generous; Friday: par = optimal + 1, demands efficient boundary sharing between regions)

---
<!-- BELOW THIS LINE: filled by engineer and playtester, not designer -->

## Solver Metrics

Computed on 5 puzzles (Mon-Fri seeds), 5 skill levels each.

| Metric | Mon | Tue | Wed | Thu | Fri | Avg |
|---|---|---|---|---|---|---|
| Solvability | 100% | 100% | 100% | 100% | 100% | 100% |
| Puzzle Entropy | 84.7 | 80.1 | 80.1 | 144.3 | 164.4 | 110.7 |
| Skill-Depth | 5.6% | 0.0% | 5.9% | 100.0% | 0.0% | 22.3% |
| Decision Entropy | 4.83 | 4.94 | 4.95 | 5.38 | 4.98 | 5.0 |
| Counterintuitive | 0 | 0 | 0 | 0 | 0 | 0.0 |
| Drama | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.0 |
| Duration (ms) | 1 | 0 | 0 | 0 | 0 | 0.2 |
| Info Gain Ratio | 1.06 | 1.00 | 1.06 | 1.15 | 1.00 | 1.1 |
| Solution Uniqueness | 4 | 3 | 7 | 1 | 1 | 3.2 |

**Auto-kill check**: FAILED
- **Counterintuitive Moves = 0 across all puzzles**: In a construction puzzle where edges are added incrementally, each correct edge always moves toward the goal. There is no situation where the optimal path requires placing a "wrong" edge first. Greedy play (place any edge that reduces violations) is optimal -- no aha moments are possible.
- **Decision Entropy 5.0 > 4.5**: At any point during solving, ~20-30 of the ~40 internal edges are heuristic-improving. The player faces too many roughly equivalent choices per step, making individual decisions feel meaningless. The free-form construction mechanic inherently creates a flat decision landscape.

**Weakest metric**: Counterintuitive Moves -- 0.0 (greedy is optimal; no forced detours exist in the partition construction mechanic)
**Strongest metric**: Puzzle Entropy -- 110.7 bits (massive combinatorial space from 40 internal edges)

## Play Report
<!-- Playtester fills this with blind play observations -->

## Decision
<!-- Designer fills this after reviewing metrics + play report -->
<!-- Status: keep / iterate / kill -->
