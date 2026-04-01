# Seed

## Rules
Plant colored seeds on empty cells, then they grow: each empty cell becomes the color held by the majority of its neighbors. Match the target pattern after growth. You have a limited seed budget.

## Mechanic Type
Constraint Satisfaction

## Why It Works

### Stare Test
The target pattern and all empty cells are visible, but the MAJORITY RULE creates non-linear interactions that defeat pre-planning. Planting red at (2,3) flips empty cell (2,4) to red IF (2,4) has more red neighbors than any other color. But (2,4) also borders (1,4), (3,4), and (2,5) -- if the player plants blue at (3,4), the majority at (2,4) depends on all four neighbors, including cells that might ALSO be affected by the growth step. The growth step is simultaneous: ALL empty cells evaluate their neighbors at once and flip. This means the effect of planting at position A depends on what the player plants at positions B, C, and D, because those plantings change the neighbor counts for the empty cells BETWEEN them. The planning problem is "design initial conditions for a parallel automaton" -- a problem that is NP-hard in general and beyond mental simulation for grids larger than 3x3.

### Dominant Strategy Test
"Plant seeds where the target has that color" seems obvious but is wildly wasteful. On a 5x5 grid where the target has 15 colored cells and the budget is 8 seeds, the player CANNOT directly plant every target cell. They must plant strategically so that the growth step fills in the remaining 7 cells. "Plant next to the most empty cells" fails because the growth DIRECTION matters -- planting red near 4 empty cells might flip all 4 to red, but if only 2 of those should be red (target), the other 2 are now wrong. "Plant at target cells that border the most same-color target cells" is better but ignores the majority rule's interaction: the growth step considers ALL neighbors, including seeds planted for OTHER colors. Whether planting red at (2,3) is good depends on whether the player ALSO plants blue at (1,3) -- which might flip the empty cell at (1,4) from red to blue (breaking a target) or from empty to blue (achieving a target).

Each seed's value is INCOMMENSURABLE: it contributes to the majority calculation at 2-4 neighboring empty cells, and its contribution can be constructive (pushing toward target) or destructive (overriding another color) depending on every other seed's position. The player must reason about the ENSEMBLE of placements, not individual seeds.

### Family Test
Placement with emergent automaton evaluation. This is NOT:
- FloodFill (painting from a fixed corner with no growth step)
- Claim (picking cells for points with locking -- no growth evaluation)
- Bloom (chain reaction from tapping existing values -- Seed has a separate plant-then-grow two-phase structure)
- Any deduction game (the hidden element is NOT information but EMERGENT BEHAVIOR -- the player knows the rules but can't easily predict the outcome)
- Surge (cascade to target values -- Surge adds values and cascades; Seed uses a majority-vote growth rule that is fundamentally different from additive cascading)

The defining novelty: the two-phase structure (plant, then grow) with a PARALLEL evaluation rule. This creates a "design the initial conditions" puzzle where the evaluation function is simple (majority vote) but the emergent behavior is complex and non-local. The closest academic analog is influence maximization in social networks (plant "seeds" to maximize spread), but Seed targets a SPECIFIC pattern, not maximum coverage. The closest commercial analog is perhaps Conway's Game of Life puzzles ("design an initial state that evolves to target X"), but with a much simpler rule (majority vote vs. birth/death) and a constructive goal (match a pattern) rather than generative exploration.

**Unoccupied family**: Placement with parallel growth evaluation (initial-conditions design).

## Predicted Failure Mode
**Most likely death: growth step is too opaque (A9).** If the majority rule produces surprising outcomes that the player can't predict, the game feels random. A player who plants 3 red seeds around an empty cell expects it to flip red -- but if there are 4 blue seeds nearby (planted for other reasons), the cell flips blue. The interaction effects might be too complex for human reasoning. MITIGATION: Highlight the "influence zone" of each seed during placement -- show which empty cells it would affect and what their CURRENT majority would be. Update this preview live as the player places seeds. The player sees the predicted growth outcome before committing. This is P1 (pre-commitment visibility) applied to the growth step.

**Second risk: growth step trivializes the puzzle (CI=0).** If the growth step is so generous that almost any reasonable placement achieves the target, skill-depth collapses. "Plant seeds roughly where the target has that color" might be sufficient if the growth step does most of the work. MITIGATION: Set the seed budget to ~50-60% of target colored cells, so the player MUST rely on growth to fill the remaining 40-50%. The budget forces EFFICIENT planting where each seed influences multiple cells. This tightness ensures that greedy placement wastes seeds on cells that growth could have filled, while strategic placement maximizes growth reach.

**Third risk: computational feel.** If the player is mentally running the majority-vote rule on each empty cell, the game feels like arithmetic homework (count neighbors of each color). MITIGATION: The preview (P1) does the counting FOR the player. The player's job is to judge WHERE to place seeds, not to compute the growth outcome. The preview transforms the game from "compute growth" to "design placement that makes the preview match the target" -- a spatial reasoning task, not a counting task.

**Anti-pattern proximity: A9 (growth outcome unpredictable), A10 (fully visible).** Defense against A9: live growth preview updates during placement. Defense against A10: the combinatorial explosion of placement positions (C(17, 8) = 24,310 for 8 seeds on 17 empty cells on a 5x5 grid) defeats enumeration even with full visibility. The nonlinear majority rule means the preview must be recalculated for each placement combination -- the player can't independently evaluate seeds.

## Expected Metrics
| Metric | Prediction | Reasoning |
|---|---|---|
| Puzzle Entropy | 20-35 | 5x5 grid with 17 empty cells, 8 seed budget. C(17,8) x 3 colors^8 is enormous, heavily pruned by target constraints and majority rule. Effective state space ~10^5 after constraint propagation. The growth step adds a non-linear evaluation that prevents decomposition into independent sub-problems. |
| Skill-Depth | 50-75% | Strategic players identify "influence choke points" -- cells where one seed can flip 3-4 empty cells via majority. They plan seed clusters that create self-reinforcing growth (mutual majority support). Greedy players (plant on the target cell) waste seeds on cells that growth would fill, running out of budget before covering isolated regions. The budget constraint amplifies the skill gap. |
| Counterintuitive Moves | 2-5 | "Plant red HERE, not on the red target cell" -- because HERE is adjacent to 3 empty cells that need to be red, and the growth step will flip them all if this seed creates a red majority. Planting directly on the target wastes a seed (that cell is already "correct" before growth). Also: "Plant blue BETWEEN two red target zones" -- because the blue seed prevents red growth from bleeding into the wrong area, acting as a firewall. Defensive planting (limiting growth spread) is counterintuitive when the goal is to GROW color. |
| Drama | 0.5-0.7 | The growth step is a single dramatic moment: all empty cells flip simultaneously. The player watches their carefully planned layout GROW -- some cells flip as hoped, others don't. The near-miss: "If I'd placed one more red seed on the east side, the majority would have tipped to red for those 3 cells. I'm 2 cells off target." The all-at-once evaluation creates a natural dramatic climax. |
| Decision Entropy | 2.5-3.5 | 17 empty cells, but target constraints + majority rule prune to ~6-10 meaningful placement positions per seed. Of those, 3-5 are genuinely interesting (different influence profiles). Tight enough for comparison without being overwhelming. |
| Info Gain Ratio | 2.0-3.0 | Strategic players achieve ~2.5 target cells per seed (1 direct + 1.5 via growth). Greedy players achieve ~1.2 per seed (mostly direct, minimal growth exploitation). The growth-leverage gap creates a strong info gain ratio. |

## Player Experience
**Opening (10s):** A 5x5 grid. Some cells already have colors (pre-placed, immovable -- the "landscape"). Many cells are empty (gray). Below, the target: the same grid with a colorful pattern. Seed tray: 8 seeds (3 red, 3 blue, 2 green). You compare: the target has 14 colored cells but you only have 8 seeds. You need growth to fill the other 6. You look for a cluster: the southeast corner needs 4 red cells in a 2x2 block. If you plant 2 red seeds on the diagonal, each borders 2 empty cells. After growth, each empty cell has 2 red neighbors + whatever other colors are nearby. If no other colors border them, majority = red. Both cells flip red. 2 seeds, 4 cells covered. You plant.

**Middle (2min):** Five seeds placed. The live preview shows the projected growth: 10 of 14 target cells are correct (green checkmarks on the preview). Four cells are wrong -- 2 empty cells in the north are showing as blue in the preview but the target wants them red. You have 3 seeds left (1 red, 1 blue, 1 green). You need the red seed to create red majority for those 2 northern cells. You hover it over (1,2) -- the preview updates: (1,1) flips to red (was empty, now has 2 red neighbors vs 1 blue), but (1,3) stays blue (still has 3 blue neighbors vs 2 red). You need more red influence at (1,3). But you only have 1 red seed. You try (1,4) instead -- preview updates: (1,3) flips to red (now 2 red vs 2 blue -- tie! Ties stay empty). Still not enough. You try (0,3) -- off-grid. You reconsider: maybe you can REMOVE a blue seed from nearby and replant it elsewhere, weakening blue's influence at (1,3). You pick up the blue seed at (2,3) and try (4,1) instead. Preview: (1,3) now has 2 red vs 1 blue neighbors. Majority red! It flips. The one blue repositioning fixed two cells.

**Ending (15s):** All 8 seeds placed. The preview shows 13 of 14 target cells correct. One cell off: (3,3) is showing green in preview but target wants blue. You've used all seeds. You stare at the preview, trying different positions for your last green seed. If you move green from (4,4) to (3,4), the preview for (3,3) changes: now (3,3) has 2 blue and 1 green neighbor instead of 1 blue and 2 green. Majority blue. (3,3) flips to blue. But moving green from (4,4) breaks the southeast corner -- (4,4) was providing green majority for (4,5). You check: (4,5) has 2 green neighbors even without (4,4). Still majority green. Safe to move. You commit. Growth animation plays: cells pulse and transform in a wave from the center outward. All 14 target cells match. Perfect seed placement.

**The aha moment:** "I shouldn't plant red ON the red target cells -- I should plant red BETWEEN them. One seed at the intersection of 4 empty cells creates a red majority for all 4. Plant in the gaps, not on the targets."

**The near-miss:** "8 seeds, target was 14 cells. Growth filled 6 cells, but one grew the wrong color -- blue instead of red at (1,3). If I'd planted my red seed one cell north, the majority would have tipped to red. The growth preview showed it, but I committed before checking the north column."

**Screenshot:** A 5x5 emoji grid showing planted seeds as large circles and growth cells as small circles. Seed cells vs growth cells tells the story: "I only planted 8 but grew 14." Color distribution visible at a glance. "Seed #42: 8 seeds, 14/14 target. Par: 8."

## Difficulty Knobs
1. **Seed budget relative to target size** (Monday: budget = 70% of target cells, growth only needs to fill 30%, generous margin for inefficient placement; Friday: budget = 45% of target cells, growth must fill 55%, requiring maximum growth exploitation with no wasted seeds)
2. **Color count and target complexity** (Monday: 2 colors, clear spatial separation, growth is predictable; Friday: 3 colors with interleaved targets, growth boundaries are contested, defensive planting needed to prevent color bleeding)
3. **Pre-placed landscape cells** (Monday: 3-4 fixed cells that help establish color regions, reducing growth ambiguity; Friday: 1-2 fixed cells or none, forcing the player to build influence from scratch)
4. **Grid size** (Monday: 4x4, manageable influence zones; Friday: 6x6, longer-range growth interactions and harder to predict cascading majority effects)

---
<!-- BELOW THIS LINE: filled by engineer and playtester, not designer -->

## Solver Metrics
<!-- Engineer fills this section with raw computed metrics -->

## Play Report
<!-- Playtester fills this section with blind play observations -->

## Decision
<!-- Designer fills this after reviewing metrics + play report -->
<!-- Status: keep / iterate / kill -->
