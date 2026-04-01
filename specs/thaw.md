# Thaw

## Rules
Spend heat taps to melt ice cells in a cross pattern (+shape). Melted cells become water, which conducts heat -- future taps near water melt a larger area. Melt all ice within a heat budget.

## Mechanic Type
Constraint Satisfaction

## Why It Works

### Stare Test
All ice positions are visible, but the CONDUCTION AMPLIFICATION creates an exponential planning problem. Each tap melts ice in a cross pattern (center + 4 orthogonal neighbors). But water cells conduct: if any cell in the cross is already water, the melt propagates THROUGH the water to the next ice cell in that direction. As more cells melt, each subsequent tap's effective area GROWS based on the water topology. Planning the optimal tap sequence requires simulating the water topology after each tap, which changes the effective area of ALL future taps. On a 6x6 grid with 20 ice cells and 8 heat taps, the player must find a sequence where early taps create water "bridges" that amplify later taps. The branching factor is 20+ positions per tap (any ice cell), and the amplification effect means two different tap sequences starting at the same cell can produce wildly different water topologies by tap 4.

### Dominant Strategy Test
"Melt the cell with the most ice neighbors" fails because it doesn't account for conduction. A cell surrounded by ice melts only 5 cells (center + 4 neighbors). But a cell adjacent to existing water, with water extending in one direction and ice in the other three, melts 5 + the conduction chain -- potentially 8-10 cells from a single tap. Whether tapping cell A (high ice density) or cell B (near water, lower density) is better depends on whether the player PLANS to tap near A's water puddle in the future (making A's melt useful as a bridge) or near B's puddle (making B the better bridge). The value of creating water at any position is determined by future taps that DON'T EXIST YET.

"Build a water bridge from one side to the other, then tap along the bridge" is a reasonable high-level strategy, but WHERE to build the bridge depends on the ice distribution, and there are typically 3-5 viable bridge routes with different costs and different amplification profiles for subsequent cleanup taps. The bridge choice IS the puzzle.

### Family Test
Resource-constrained melting with conduction amplification. This is NOT:
- LightsOut (self-inverse toggle -- melting is irreversible; conduction AMPLIFIES rather than toggles)
- FloodFill (region painting from a corner -- Thaw has free placement, cross pattern, and conduction propagation)
- IceSlide (sliding on ice -- Thaw DESTROYS ice, doesn't slide on it)
- Any chain reaction game (the player controls EVERY tap -- no auto-cascades, just amplified reach)

The defining novelty: the player's actions RESHAPE the tool they're using. Early taps create water that changes the SHAPE and POWER of later taps. It's like a strategy game where building infrastructure (water bridges) amplifies future actions, but you have a strict budget that doesn't allow both infrastructure AND direct assault. The conduction mechanic creates INCOMMENSURABLE costs: spending a tap to build a water bridge costs 1 heat now but might save 3 heat later, depending on where the player plans to tap in the future.

The closest analog is "go" (the board game) where placing stones creates influence that affects the value of future placements. But Thaw is much simpler: 6-10 taps on a grid, with a clear win condition (all ice melted).

## Predicted Failure Mode
**Most likely death: LightsOut variant (A4).** If conduction is too weak (e.g., only propagates 1 cell through water), the game degenerates to "LightsOut with a budget" -- tap in a cross pattern, each tap melts 5 cells, budget = ceil(ice_count / 5). CRITICAL MITIGATION: conduction must propagate INDEFINITELY through connected water -- a tap on one end of a water bridge melts ice at the other end. This makes water topology the CENTRAL puzzle, not a marginal bonus.

**Second risk: A10 on small boards.** If the board has 12 ice cells and 4 taps, a patient player can enumerate all C(20, 4) = 4845 tap sequences (or fewer after pruning). Mitigation: minimum 6x6 grid with 18+ ice cells and 6+ taps on easy days.

**Third risk: monotonic improvement (CI=0).** If every tap melts more ice than the last (due to growing water network), the game is monotonically improving and CI=0. MITIGATION: the target is "melt ALL ice," and some ice cells are in isolated clusters disconnected from the main water network. The player must "waste" a tap on an isolated cluster (low melt count) to connect it to the network, enabling efficient future taps. This tap LOOKS wasteful (melting only 3 cells when the average is 7) but IS optimal because it creates a bridge. This is the CI source: "tap this isolated cell even though it melts fewer cells than alternatives, because the bridge it creates amplifies future taps."

**Anti-pattern proximity: A10 (fully visible), A4 (LightsOut variant).** Defense against A10 is the conduction amplification creating exponential branching in the tap-sequence space. Defense against A4 is the conduction mechanic fundamentally changing the gameplay from "pattern matching" to "infrastructure planning."

## Expected Metrics
| Metric | Prediction | Reasoning |
|---|---|---|
| Puzzle Entropy | 18-30 | 6x6 grid, ~20 ice cells, 6-10 heat taps. Effective branching ~8-12 meaningful tap positions per turn (after pruning cells too far from water). Sequence matters because water topology changes. |
| Skill-Depth | 50-75% | Strategic players identify "bridge taps" -- positions that connect ice clusters through water, amplifying future taps. They plan a 2-3 tap lookahead for conduction routes. Greedy players (melt most ice NOW) waste taps on dense clusters when a bridge tap would melt more total across the sequence. |
| Counterintuitive Moves | 2-5 | "Tap this isolated cell that only melts 3 ice (when average is 7)" -- because it creates a water bridge connecting two clusters, making the NEXT tap melt 12 cells through conduction. Also: "Tap the edge of a cluster instead of the center" -- because edge taps extend the water network toward the next cluster, while center taps create water surrounded by more water (no conduction value). Bridge-building vs. direct-assault tradeoff at every tap. |
| Drama | 0.5-0.7 | Near-miss: 2 ice cells remain in a disconnected pocket, 1 tap left. If the player had built a water bridge toward the pocket earlier, the conduction would reach both cells. Instead, the tap only melts 1 of 2. "One bridge tap 3 moves ago would have saved me." The budget pressure creates drama throughout. |
| Decision Entropy | 2.5-3.5 | 8-12 meaningful tap positions per turn (ice cells adjacent to or near water, plus isolated cluster starts). Rich comparison space without being overwhelming. |
| Info Gain Ratio | 2.0-3.5 | Strategic players achieve ~3 ice cells melted per tap (through conduction chains). Greedy players achieve ~2 per tap (no bridge planning). Large gap due to exponential amplification of good bridge placement. |

## Player Experience
**Opening (10s):** A 6x6 grid. Ice blocks (blue crystals) fill most of the grid, with a few empty cells (already water -- shown as rippling blue). Heat budget: 8 taps. Ice count: 22. Each tap melts in a cross pattern, and water conducts heat. You look for the best starting position. A cell in the center adjacent to the existing water pool looks promising -- tapping it would melt 5 cells AND connect to the water pool, creating a larger conduction area. You tap. Five cells melt with a satisfying crystalline-to-liquid animation. The water pool grows. The cross pattern pulses outward, and where it hits existing water, the melt extends further -- one arm of the cross melts 3 cells through the water bridge instead of 1. Eight cells total from one tap. Powerful. 7 taps remaining, 14 ice left.

**Middle (2min):** Four taps in, 9 ice remaining, 4 taps left. The main water network covers the center and southeast. But there's a pocket of 4 ice cells in the northwest corner, completely disconnected from the water. Tapping the nearest water-adjacent cell to the pocket (3,2) would only melt the 1-2 ice cells there -- the cross pattern hits water in three directions (already melted) and ice in one (the pocket). You'd need 2 more taps to clear the pocket afterward. Total: 3 taps for 4 ice. But if you tap (2,3) first -- an ice cell between the pocket and the water -- it melts 4 cells AND creates a water bridge TO the pocket. Then the NEXT tap at (1,3) conducts through the bridge and melts the entire pocket in one shot. 2 taps for 8 ice. The bridge tap melts fewer cells immediately (4 vs. the 6 you'd get tapping the dense southeast cluster) but saves a tap overall. You build the bridge.

**Ending (15s):** One tap left, 3 ice cells remaining. They're in an L-shape: (5,1), (6,1), (6,2). The water network extends to (4,1) and (6,3). If you tap (5,1), the cross pattern melts (5,1) directly, conducts through (4,1) water to... nothing north (already melted). Conducts south to (6,1) -- yes! And east to (5,2), which is water, conducting to... (5,3), already water. So tapping (5,1) melts 2 ice cells: (5,1) and (6,1). But (6,2) remains. One ice cell left. If you'd built a bridge at (6,2) earlier... You tap (6,1) instead. Cross melts (6,1), conducts north through water to nothing, south off-grid, west off-grid, east to (6,2) -- it's ice! Conducting through (6,1) water reaches (6,2). Three cells melted. All ice gone. The grid transforms into a shimmering water surface. Budget 0. Perfect clear.

**The aha moment:** "I shouldn't tap the dense cluster first -- I should spend one tap building a water bridge to that isolated pocket. The bridge makes my next tap reach 4 more cells through conduction. One 'wasteful' bridge tap saves two direct taps later."

**The near-miss:** "8 taps, budget was 8. I cleared all ice but only because the L-shaped pocket had a lucky conduction path. If (6,2) had been one cell further from the water, I'd have needed 9 taps. Building the northwest bridge one cell closer to the pocket would have created a conduction path to (6,2) as well."

**Screenshot:** A 6x6 emoji grid. Water cells shown as blue droplets, melted cells shown as steam wisps, remaining ice shown as crystals. The water network's shape tells the story of the player's tap sequence -- each bridge visible as a path through the grid. Heat budget used: 8/8.

## Difficulty Knobs
1. **Ice density and cluster isolation** (Monday: 15 ice cells in 1-2 connected clusters, minimal bridging needed; Friday: 24 ice cells in 4-5 disconnected clusters, requiring 3+ bridge taps to connect them efficiently)
2. **Heat budget tightness** (Monday: budget = optimal + 3, room for 3 wasted taps; Friday: budget = optimal + 1, requires near-perfect bridge planning)
3. **Grid size** (Monday: 5x5, manageable mental simulation; Friday: 7x7, conduction chains span 5-6 cells and are hard to predict)
4. **Initial water placement** (Monday: water pool in center provides starting conduction network; Friday: water in corner or scattered, requiring the player to BUILD the initial network from scratch)

---
<!-- BELOW THIS LINE: filled by engineer and playtester, not designer -->

## Solver Metrics

Computed on 5 puzzles (Mon-Fri seeds), 5 skill levels each.

**Mechanic implemented**: Conduction Wave -- tapping an ice cell melts it, then a wave propagates through the PRE-EXISTING water network adjacent to the tapped cell, melting all ice cells bordering that network. Newly created water does NOT conduct for the current tap, only for future taps. This creates bridge-building incentive: melting an ice cell between two water pools connects them, amplifying future taps.

| Metric | Mon | Tue | Wed | Thu | Fri | Avg |
|---|---|---|---|---|---|---|
| Solvability | 100% | 100% | 100% | 100% | 100% | 100% |
| Puzzle Entropy | 8.1 | 6.8 | 10.8 | 21.5 | 13.8 | 12.2 |
| Skill-Depth | 40% | 40% | 0% | 29% | 20% | 26% |
| Decision Entropy | 2.69 | 3.42 | 3.61 | 4.30 | 3.45 | 3.49 |
| Counterintuitive | 0 | 0 | 0 | 1 | 0 | 0.2 |
| Drama | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| Duration (ms) | 2 | 1 | 5 | 8 | 7 | 5 |
| Info Gain Ratio | 1.67 | 1.67 | 1.00 | 1.40 | 1.25 | 1.40 |
| Solution Uniqueness | 1 | 1 | 1 | 1 | 1 | 1 |

**Auto-kill check**: PASSED
**Weakest metric**: Counterintuitive Moves -- 0.2 avg (only 1 CI move on Thu). The conduction wave mechanic creates some depth but greedy play nearly matches optimal on most puzzles. Bridge-building scenarios exist but are rare with current puzzle generation.
**Strongest metric**: Skill-Depth -- 26% avg. Random play takes 40-50% more taps than optimal, showing that strategic pool-adjacent tapping matters. Decision Entropy at 3.49 is healthy -- enough meaningful choices per step without being overwhelming.

## Play Report
<!-- Playtester fills this with blind play observations -->

## Decision
<!-- Designer fills this after reviewing metrics + play report -->
<!-- Status: keep / iterate / kill -->
