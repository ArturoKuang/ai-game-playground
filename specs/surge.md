# Surge

## Rules
Tap cells on a grid to add +1 pressure. When any cell reaches 4, it resets to 0 and pushes +1 to each orthogonal neighbor (which may cascade). Reach the target pressure configuration within par taps.

## Mechanic Type
Constraint Satisfaction

## Why It Works

### Stare Test
All pressure values are visible, but cascade prediction on a grid of 5x5 cells near threshold (pressure 2-3) is beyond human mental simulation. A single tap can trigger a chain reaction affecting 5-15 cells across multiple cascade waves. Even planning 2 taps ahead requires simulating 25 possible first-tap positions, each potentially triggering different cascade topologies that reshape the board before the second tap. The cascade topology depends on the CURRENT pressure distribution, which changes with each tap AND each cascade step. The interaction between taps and cascades creates a planning horizon that exceeds working memory for boards with 10+ cells at pressure 2-3.

### Dominant Strategy Test
"Tap the cell farthest from its target value" fails because cascading neighbors change THEIR values too. Tapping cell (2,3) to raise it from 1 to 2 is simple, but if neighbor (2,4) is at pressure 3, the cascade from a DIFFERENT tap at (2,4) later would push (2,3) from 2 to 3 -- overshooting the target. Whether tapping (2,3) directly is good depends on whether the player ALSO plans to trigger cascades through (2,3) via neighbors. The cost of each tap is incommensurable: the same cell might be reached by direct tapping OR by cascade collateral from neighbors, and the optimal path depends on which cells the player intends to cascade in the future. "Fix cascadeable cells last" also fails because cascade ORDER matters -- two cells at pressure 3 that share a neighbor create a race condition where cascading one pushes the other to 4, triggering a secondary cascade that may overshoot targets.

### Family Test
Chip-firing / sandpile puzzle to a target configuration. This is NOT:
- Spill (sandpile to CLEAR the board -- Surge targets a SPECIFIC configuration, not emptiness)
- LightsOut (self-inverse toggle -- Surge's +1 is NOT self-inverse; pressing a cell twice gives +2, not +0)
- Bloom (chain reaction optimization -- Surge is constraint satisfaction, reaching an exact target state)
- Fuse (cascade ignition -- Fuse seeks maximum chain; Surge seeks specific values)

The defining novelty: the chip-firing mechanic creates COLLATERAL DAMAGE that is neither self-inverse (like LightsOut) nor monotonic (like Fold/Etch). A cascade both RAISES nearby cells (toward their targets or past them) and RESETS the source (away from its pre-cascade value). This tension between cascade benefit (push neighbors toward targets) and cascade cost (reset source to 0, possibly overshoot neighbors) creates genuine incommensurable decisions. The closest mathematical structure is the abelian sandpile group, which has proven deep combinatorial properties (order matters for intermediate states even though the final state is order-independent for identical firing sequences).

Key insight from Spill's failure: Spill died because cascades rarely triggered on 4x4 boards (cells far from threshold). Surge solves this by starting cells AT or NEAR threshold (pressure 2-3), making cascades the EXPECTED mode of play, not a rare bonus. The generator ensures 40-60% of cells start at pressure 3, so nearly every tap risks triggering a cascade.

## Predicted Failure Mode
**Most likely death: A10 on small boards.** If the cascade topology is predictable on 4x4, players can compute the full cascade result before tapping. The abelian property of chip-firing means the FINAL state is independent of tap order (for the same set of taps), which could make the puzzle computationally tractable -- the player only needs to determine WHICH cells to tap, not the ORDER. Mitigation: make boards large enough (5x5+) that the set-selection problem is NP-hard (chip-firing reachability on general graphs is computationally hard). Also: include cells that cascade MULTIPLE TIMES in a single chain (pressure pushed to 4+ by multiple neighbors), creating non-obvious cascade depth.

**Second risk: abelian property kills CI.** If tap order truly doesn't matter (abelian), then CI=0 by definition (no "wrong" order to avoid). CRITICAL MITIGATION: the abelian property holds for the SAME SET of taps, but the target configuration constrains WHICH cells get tapped. The CI comes from the set-selection problem: "should I tap cell A (which cascades and overshoots B) or tap B directly (which wastes a tap but avoids the cascade overshoot)?" The decision is about which cells to INCLUDE in the tap set, not about ordering.

**Third risk: cascades feel chaotic.** If the player can't predict cascades at all, the game feels like random outcomes (luck, not skill). Mitigation: show a cascade PREVIEW animation -- when the player hovers/long-presses a cell, show which cells would cascade (highlight cells that would reach 4). The player sees the cascade topology but must judge whether the resulting pressures match targets.

**Anti-pattern proximity: A10 (fully visible) and A9 (cascade unpredictability).** The cascade preview addresses A9. The computational hardness of set-selection addresses A10. But if both defenses fail, the game dies.

## Expected Metrics
| Metric | Prediction | Reasoning |
|---|---|---|
| Puzzle Entropy | 20-35 | 5x5 grid, ~8-12 cells to tap. Each tap position triggers different cascade topology. Effective branching: select a SUBSET of 25 cells to tap -- C(25,10) = 3.2M subsets, heavily pruned by target constraints. |
| Skill-Depth | 40-70% | Strategic players identify cascade chains that simultaneously move multiple cells toward targets. They avoid taps that overshoot neighbors past their targets. Greedy players (tap the cell most below target) trigger cascades that overshoot and require corrective taps. |
| Counterintuitive Moves | 2-5 | "Don't tap this cell that's below target -- let it be raised by a neighbor's cascade instead." Also: "Tap this cell that's ALREADY at target to trigger a cascade that fixes 3 neighbors, even though the source resets to 0 (requiring a later corrective tap)." Sacrifice the source cell's correct value to fix multiple neighbors. |
| Drama | 0.5-0.8 | Near-miss: 23 of 25 cells correct, but fixing the last 2 requires a cascade that overshoots a 3rd cell. "If I'd cascaded from the east instead of the west, all 3 would be correct." Tight endgames where cascade paths matter. |
| Decision Entropy | 2.0-3.5 | 25 cells to choose from, but target constraints + cascade analysis prune to 3-8 meaningful choices per tap. Dense enough for genuine comparison, not overwhelming. |
| Info Gain Ratio | 2.0-3.0 | Strategic players use cascade chains to achieve 2-3 target corrections per tap. Greedy players achieve ~1 correction per tap and waste taps on cascade overshoot correction. |

## Player Experience
**Opening (10s):** A 5x5 grid of numbered pressure cells (0-3). Most show 2 or 3. Below the grid, a target: the same grid shape with different numbers. The difference is small -- 6-8 cells need to change. You tap a cell showing 2 (target: 3). It pulses from 2 to 3 with a satisfying pressure-wave animation. One cell fixed. But the cell above it was at 3, and your tap's +1 pushed it to... wait, you only tapped the cell below. Reading the rules: +1 only applies to the tapped cell. Cascades only happen at 4. You look for cells at 3 that border cells needing +1. There's a cluster in the southeast corner -- cell (4,4) is at 3, and its neighbors (3,4), (4,3), and (4,5) all need +1. If you tap (4,4), it goes to 4, cascades: resets to 0, pushes +1 to all four neighbors. Three of four neighbors get exactly the +1 they need. But (4,4) itself resets to 0, and its target is 2. You'll need to tap it twice more later. Is triggering the cascade worth 1 tap to fix 3 cells but requiring 2 corrective taps? Net: 3 taps for 4 fixes (3 neighbors + eventually the source). Yes. You trigger the cascade.

**Middle (2min):** The cascade rippled: (4,4) reset to 0 (target: 2), three neighbors fixed, but (5,4) was already at 3 and got pushed to 4 -- triggering a SECONDARY cascade! (5,4) resets to 0, pushes +1 to its neighbors. (5,3) goes from 2 to 3 (target: 3 -- fixed!). But (5,5) goes from 1 to 2 (target: 1 -- overshot!). You didn't see that coming. Now you have one extra cell to fix. The secondary cascade was a trap. Next time, you'd need to consider the cascade DEPTH, not just the first wave. You look at the northwest corner: 3 cells need fixing but none are near threshold. You'll need direct taps there -- no cascade shortcuts. 4 taps for 3 fixes (one cell needs +2). The efficient play is clear.

**Ending (15s):** Two cells left. (4,4) needs to go from 0 to 2 (two direct taps). (5,5) needs to go from 2 to 1... but you can't decrease pressure! The target says 1, the cell shows 2. You overshot it with the secondary cascade. Looking at the target grid again... the only way to DECREASE is to trigger a cascade from (5,5): push it to 4 (2 more taps), cascade resets it to 0, then tap once to get to 1. That's 3 taps for one cell. Expensive. But there's no other way. Total: 2 + 3 = 5 taps remaining. Par is 12 total and you're at 8. 8 + 5 = 13. One over par. The secondary cascade cost you the par. "If I'd tapped (5,4) down to 2 FIRST before triggering (4,4)'s cascade..."

**The aha moment:** "I need to trigger (3,2)'s cascade to fix its 3 neighbors, but that will overshoot (2,2). So I should tap (2,2) AWAY from its target first -- push it down to 1 -- so that the cascade's +1 brings it to exactly 2. Pre-positioning a cell to RECEIVE a cascade correctly is the key insight."

**The near-miss:** "12 taps, par was 11. The southeast cascade chain would have fixed 5 cells in 2 taps, but I triggered it from the wrong cell and got a secondary cascade that overshot (5,5). One different tap, and I'd have made par."

**Screenshot:** A 5x5 emoji grid showing pressure levels as colored circles (empty/quarter/half/three-quarter/full). Cascade chains visible as arrow trails between cells. The grid itself IS the daily share -- same topology, different numbers each day.

## Difficulty Knobs
1. **Grid size and cascade density** (Monday: 4x4 grid with 30% of cells at pressure 3, cascades are short and rare; Friday: 6x6 grid with 60% at pressure 3, multi-wave cascades are the norm and require deep planning)
2. **Target distance from initial state** (Monday: 4-6 cells differ from target, requiring 6-8 taps; Friday: 10-14 cells differ, requiring 12-18 taps with mandatory cascade exploitation to stay within par)
3. **Cascade chain depth** (Monday: no cell triggers a secondary cascade; Friday: 2-3 cells are positioned to create cascade chains of depth 2-3, where secondary/tertiary cascades are part of the optimal solution)
4. **Par generosity** (Monday: par = optimal + 4; Friday: par = optimal + 1)

---
<!-- BELOW THIS LINE: filled by engineer and playtester, not designer -->

## Solver Metrics

Computed on 5 puzzles (Mon-Fri seeds), 5 skill levels each.

| Metric | Mon | Tue | Wed | Thu | Fri | Avg |
|---|---|---|---|---|---|---|
| Solvability | 100% | 100% | 100% | 100% | 100% | 100% |
| Puzzle Entropy | 20.0 | 22.1 | 34.9 | 35.7 | 53.1 | 33.2 |
| Skill-Depth | 0.0% | 57.1% | 47.1% | 43.8% | 35.3% | 36.7% |
| Decision Entropy | 4.00 | 3.68 | 3.88 | 3.96 | 4.83 | 4.07 |
| Counterintuitive | 3 | 3 | 3 | 4 | 4 | 3.4 |
| Drama | 0.20 | 1.00 | 0.56 | 0.78 | 0.27 | 0.56 |
| Duration (s) | 0.00 | 0.00 | 0.00 | 0.00 | 0.01 | 0.00 |
| Info Gain Ratio | 1.18 | 1.65 | 1.63 | 2.01 | 2.20 | 1.73 |
| Solution Uniqueness | 1 | 1 | 1 | 1 | 1 | 1.0 |

Grid sizes: Mon/Tue 4x4, Wed/Thu 5x5, Fri 6x6. Optimal taps: 5/6/9/9/11.

**Auto-kill check**: PASSED
**Weakest metric**: Decision Entropy -- 4.07 avg (Fri=4.83 exceeds 4.5 ceiling on largest grid; too many plausible taps on 6x6). Mon skill-depth=0% because random stumbled onto the 5-tap solution on the smallest grid.
**Strongest metric**: Counterintuitive Moves -- 3.4 avg (3-4 per puzzle). Cascade overshoot creates genuine "tap away from target to pre-position for cascade" moments. Info Gain Ratio 1.73 confirms strategic play yields ~73% more progress per tap than random.

## Play Report
<!-- Playtester fills this with blind play observations -->

## Decision
<!-- Designer fills this after reviewing metrics + play report -->
<!-- Status: keep / iterate / kill -->
