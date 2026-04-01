# Stake

## Rules
Place one stake in each colored region on a grid. Each stake radiates influence in 4 cardinal directions until blocked by another stake or the grid edge. Every cell in each region must be covered by that region's stake's influence. Place all stakes so every region is fully covered.

## Mechanic Type
Constraint Satisfaction

## Why It Works

### Stare Test
All regions, their shapes, and the grid layout are visible. But the MUTUAL BLOCKING between stakes defeats pre-planning. Each stake radiates influence north, south, east, and west until hitting another stake (which blocks further influence in that direction) or the grid edge. Placing a stake for region A at position (2,3) radiates influence along row 2 and column 3. But if region B's stake is at (2,7), it BLOCKS A's eastward influence -- any cells in region A east of column 7 are NOT covered. Whether position (2,3) works for A depends on where B's stake is, which depends on where C's stake is (if C blocks B), and so on.

This creates CIRCULAR DEPENDENCIES: A's coverage depends on B's position, B's coverage depends on C's position, C's coverage depends on A's position. The player cannot solve one region at a time -- they must solve ALL regions simultaneously, because each stake's influence reach depends on every other stake's position. With 6-8 regions, the constraint graph is dense and circular, defeating sequential analysis.

On a 7x7 grid with 7 regions and 7 stakes, each stake has ~4-8 candidate positions within its region. The product space is 4^7 to 8^7 = 16,384 to 2,097,152 configurations. But the mutual-blocking constraint means most configurations fail -- only a few (1-5) are valid solutions. The player must find a valid assignment through constraint reasoning, not enumeration.

### Dominant Strategy Test
"Place each stake in the center of its region" fails because: (a) Regions are irregular shapes (L-shapes, T-shapes, long rectangles). The center of an L-shaped region doesn't cover both arms. (b) Even if a central position covers the region IN ISOLATION, other stakes' blocking might cut off part of the influence. A stake at (3,3) covers all of row 3 and column 3 -- but if another stake is at (3,6), the eastward influence from (3,3) stops at column 5. If region A extends east to column 8, cells (3,7) and (3,8) are uncovered.

"Place stakes at the position that covers the most region cells" is greedy but fails because: (a) The "most covering" position for A might block B's ONLY viable position. If A's optimal is (3,3) and B's region is long and horizontal on row 3, B's stake must also be on row 3 -- but A's stake blocks B's west-east coverage. B might need to be at (3,1) to cover its western cells, but then B blocks A's westward coverage. The greedy placement for A creates an unsolvable constraint for B. (b) The player must find a GLOBALLY consistent assignment, not locally optimal individual placements.

The incommensurable cost: placing A's stake at position P1 vs P2 changes B's constraint (which positions work for B), which changes C's constraint, which changes D's constraint. The cost of choosing P1 over P2 is the SET OF SOLUTIONS IT ELIMINATES for all other regions, which the player can't evaluate without solving the entire remaining puzzle.

### Family Test
Mutual-exclusion influence-blocking placement. This is NOT:
- Claim (territory with locking -- Claim locks NEIGHBORS, not cardinal-direction influence; Claim is optimization, Stake is constraint satisfaction)
- Star (no-touch star placement -- Star's constraints are LOCAL adjacency, Stake's constraints are LONG-RANGE influence blocking; Star died because constraints were too weak)
- BitMap (deduction from clues -- no hidden information in Stake)
- LightsOut (toggle with coupling -- Stake is placement, not toggling)
- Any routing game (no path construction)

The defining novelty: LONG-RANGE INFLUENCE that is DYNAMICALLY BLOCKED by other placements. Each stake's coverage is not a fixed shape -- it depends on every other stake's position. This creates a constraint satisfaction puzzle where the CONSTRAINTS THEMSELVES are determined by the solution, not given in advance. The closest analog is "Laser" (place mirrors to direct a laser beam), but Stake's influence is BIDIRECTIONAL (radiates in all 4 directions simultaneously) and the blocking is by OTHER solution elements (not pre-placed obstacles).

The closest puzzle family is "Light Up" (Akari) -- place light bulbs that illuminate rows/columns until hitting walls. But Akari has FIXED walls that determine coverage, while Stake has MOVABLE blockers (the other stakes). This makes Stake strictly harder: the "walls" are part of the solution, not part of the puzzle input. The circular dependency between stakes is the mechanic that Akari lacks.

**Unoccupied family**: Mutual-exclusion long-range influence placement with dynamic blocking.

## Predicted Failure Mode
**Most likely death: A10 (fully visible, solvable by staring).** All regions and the grid are visible. A patient player might use constraint propagation to solve the puzzle mentally: "Region A is a long horizontal strip on row 2. The stake must be on row 2 to cover the row. But column placement matters for blocking. Region B is on row 2 AND row 3. If B's stake is on row 2, it blocks A's influence. So B's stake must be on row 3. Now B's column coverage depends on..." This sequential reasoning might solve the puzzle before the player touches the screen. MITIGATION: (a) Enough regions (6+) that the circular dependency graph is too complex for mental constraint propagation. (b) Regions with multiple viable stake positions (3-5 per region) so the branching factor at each propagation step is high. (c) Some regions that share rows AND columns with 3+ other regions, creating dense blocking interactions.

**Second risk: too easy (few valid positions per region).** If most regions have only 1-2 positions where a stake could possibly cover all region cells, the puzzle self-solves through elimination. MITIGATION: regions should be designed with 3-6 candidate positions, and the mutual blocking should be what prunes most of them. The difficulty comes from blocking interactions, not from region geometry.

**Third risk: feels like a logic puzzle, not a game.** If the player is just reasoning about constraints without any tactile satisfaction, the experience is cerebral and cold. MITIGATION: (a) The influence visualization must be DRAMATIC -- when a stake is placed, beams of light radiate in 4 directions, visibly stopping when they hit another stake. The player SEES the coverage in real time. (b) When coverage is complete (all cells in a region are illuminated), the region glows with a satisfying pulse. (c) When a stake blocks another stake's coverage, the blocked cells visibly dim, creating immediate feedback about the conflict.

**Anti-pattern proximity: A10 (fully visible), A4 (Akari clone).** Defense against A10: circular dependencies between 6+ stakes create constraint graphs too dense for mental propagation. Unlike Akari (where walls are fixed and coverage is independent), Stake's dynamic blocking means solving one region CHANGES the constraints for all others. Defense against A4: dynamic blocking (not fixed walls), regions (not numbered cells), and the requirement that EVERY cell in each region be covered (not just illumination targets) differentiate Stake from Akari.

## Expected Metrics
| Metric | Prediction | Reasoning |
|---|---|---|
| Puzzle Entropy | 12-22 | 7 regions, 3-6 candidate positions per region. Product space: 3^7 to 6^7 = 2,187 to 279,936. Constraint pruning to 1-5 valid solutions. Total information: ~12 bits (tightly constrained, 3 candidates) to ~22 bits (loosely constrained, 6 candidates). |
| Skill-Depth | 40-65% | Strategic players use constraint propagation: start with the most constrained region (fewest candidates), place its stake, observe how it blocks other regions, then propagate. This Sudoku-like technique dramatically outperforms trial-and-error. But the circular dependencies mean pure propagation sometimes fails -- the player must BACKTRACK, trying a different position for a previously-placed stake. The skill is knowing WHEN to backtrack (recognizing an impossible constraint state) vs. pushing forward. |
| Counterintuitive Moves | 2-4 | "Place this stake at the EDGE of its region, not the center" -- because the center position blocks a critical stake in the adjacent region. The edge position covers fewer cells directly but avoids the blocking conflict, allowing the other stake to extend its influence THROUGH the uncovered cells (which are covered by the first stake's column influence instead of row influence). Also: "Remove a correctly-placed stake and move it" -- when a later placement reveals that the first stake's position creates an impossible blocking conflict for a distant region. Sacrificing a known-good placement to fix a global constraint. |
| Drama | 0.5-0.7 | Near-miss: 6 of 7 stakes placed, all regions fully covered. The last region (an L-shape in the corner) has two candidate positions. Position A covers the L-shape but blocks the stake in region 3, uncovering 2 cells in region 3. Position B covers the L-shape without blocking, but doesn't reach the far end of the L. Neither works. The player must move the region 3 stake to a different position (which requires moving the region 5 stake too). The cascade of readjustments creates drama. |
| Decision Entropy | 2.0-3.0 | Each placement: 3-6 candidate positions per region. After constraint propagation (eliminating positions that obviously block critical neighbors), 2-3 genuinely interesting candidates remain. Tight enough for meaningful comparison. |
| Info Gain Ratio | 1.8-2.5 | Strategic players (constraint propagation + informed backtracking) solve in ~8-10 placements (7 regions + 1-3 readjustments). Trial-and-error players make 12-18 placements (many wrong placements requiring removal). The gap is driven by propagation skill and early conflict detection. |

## Player Experience
**Opening (10s):** A 7x7 grid divided into 7 colored regions. Each region is an irregular shape (3-6 cells). A tray of 7 stakes below, one matching each region's color. You pick up the red stake. Red region: a horizontal strip on row 2, spanning columns 1-5. The stake must be IN the red region. You place it at (2,3) -- the center. Four beams of light shoot out: north to (0,3), south to (6,3), east to (2,7), west to (2,0). All 5 red cells are in row 2, between columns 1 and 5. The east beam covers (2,4) and (2,5). The west beam covers (2,2) and (2,1). All red cells are illuminated. Red region: covered! The cells glow warmly.

**Middle (2min):** Four stakes placed. Red, blue, green, and yellow regions all covered. You pick up the orange stake. Orange region: an L-shape spanning (4,2), (4,3), (5,3), (6,3). Placing at (5,3) would radiate north through (4,3) -- but wait, the green stake is at (3,3). Green blocks orange's northward beam at row 3. So (4,3) -- the north arm of the orange L -- would NOT be covered by a stake at (5,3). The green stake is in the way.

You try (4,3) instead. Northward beam hits green at (3,3) -- stops. But the orange L doesn't extend north past (4,3), so that's fine. Southward beam: (5,3), (6,3) -- both orange cells. East beam: (4,4), (4,5)... not orange cells, but the beam still goes. West beam: (4,2) -- orange cell! Covered. And (4,1), (4,0) -- not orange but the beam passes through. All 4 orange cells covered: (4,2) via west beam, (4,3) direct, (5,3) via south beam, (6,3) via south beam. Orange region: covered!

But placing orange at (4,3) affects purple. Purple's stake was going to use row 4 for east-west coverage. Orange at (4,3) blocks purple's westward beam. Purple's region includes (4,1). You check: purple's stake at (3,1) covers (4,1) via south beam... but the south beam from (3,1) goes to (4,1), (5,1), (6,1). (4,1) is purple. Covered! Purple still works. You exhale.

**Ending (15s):** One stake left: white. White region: scattered cells at (1,6), (2,6), (3,6), (5,6). All in column 6. A vertical strip. Place at (3,6). North beam: (2,6), (1,6). South beam: (4,6)... not white. (5,6) -- white! But the beam must pass through (4,6) to reach (5,6). Is (4,6) blocked? Is there a stake in column 6 between (3,6) and (5,6)? No stakes there. The beam reaches (5,6). All white cells covered: (1,6) via north, (2,6) via north, (3,6) direct, (5,6) via south. White region: covered!

All 7 regions glow. The beams crisscross the grid in a beautiful light pattern. Celebration burst! "Stake #42: 7 placements, 0 readjustments. Par: 7. Perfect!"

**The aha moment:** "I can't place this stake in the center of the region -- the adjacent region's stake would block my beam. But if I shift one cell east, my beam goes AROUND the blocker and still covers my entire region through column influence instead of row influence. The blocking forces me to find creative angles."

**The near-miss:** "9 placements (2 readjustments), par was 8 (1 readjustment allowed). I placed blue at (1,4) which blocked orange's north beam. Had to remove blue, move it to (1,5), then re-place orange. If I'd anticipated the blocking conflict, I'd have placed blue at (1,5) from the start."

**Screenshot:** A 7x7 grid with colored regions and stake positions marked. Influence beams shown as directional arrows from each stake. "Stake #42: 7 placements. Par: 7."

## Difficulty Knobs
1. **Region count and shape complexity** (Monday: 5 regions, mostly rectangular, 3-4 cells each, few blocking conflicts; Friday: 8 regions, irregular shapes (L, T, Z), 3-6 cells each, dense blocking interactions requiring 2-3 readjustments)
2. **Grid size** (Monday: 5x5, short influence beams, few cross-region interactions; Friday: 8x8, long beams that cross multiple regions, creating cascade blocking)
3. **Blocking density** (Monday: regions mostly occupy different rows/columns, minimal stake-to-stake blocking; Friday: 3-4 regions share key rows/columns, creating mutual exclusion where only 1-2 ordering of placements avoids cascade conflicts)
4. **Par tightness** (Monday: par = regions + 2 readjustments, generous; Friday: par = regions + 0-1 readjustments, requiring near-perfect constraint analysis before placing)

---
<!-- BELOW THIS LINE: filled by engineer and playtester, not designer -->

## Solver Metrics
<!-- Engineer fills this section with raw computed metrics -->

## Play Report
<!-- Playtester fills this section with blind play observations -->

## Decision
<!-- Designer fills this after reviewing metrics + play report -->
<!-- Status: keep / iterate / kill -->
