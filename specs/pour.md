# Pour

## Rules
A row of 6 glasses with different capacities. Each holds colored liquid (2-3 colors). Pour liquid from one glass to an adjacent glass -- liquid transfers up to the receiving glass's remaining capacity (top layer pours first). Reach the target distribution of colors across glasses within par pours.

## Mechanic Type
Constraint Satisfaction

## Why It Works

### Stare Test
All glass capacities, current liquid levels, and colors are visible. But MULTI-COMMODITY capacity constraints defeat pre-planning. Each glass holds a stack of colored layers. Pouring from glass A to glass B transfers the TOP layer of A into B. If B has remaining capacity 2 and A's top layer is 3 units of red, only 2 units transfer -- 1 unit stays in A. Now A's top layer is 1 red (reduced), and B has 2 red on top of whatever was already there. The stranded 1 unit in A cannot be removed until B (or another neighbor) has capacity. Whether to pour A->B now (partially) or wait until B empties depends on the player's plan for BOTH A and B across future pours. The capacity constraint creates BOTTLENECK ANALYSIS: glasses in the middle of the row act as chokepoints that must be emptied and refilled in the right order to let liquid flow from one end to the other.

On a row of 6 glasses with 3 colors and capacities 3-6, the state space is the product of all possible liquid distributions -- roughly 10^8 states. The capacity constraint means most pours are PARTIAL (limited by receiver capacity), creating fractional intermediate states that are hard to predict mentally. Planning 3 pours ahead requires simulating 3 partial transfers with potentially different top-layer colors at each step. This exceeds working memory for 5+ glasses.

### Dominant Strategy Test
"Pour toward the target positions" fails because of bottleneck glasses. If the target wants all red liquid in glass 6 (rightmost), the player must pour red from glass 1 (leftmost) through glasses 2, 3, 4, and 5. But glasses 2-5 have their OWN liquid that must go somewhere. Pouring red into glass 2 requires space in glass 2, which means glass 2's current liquid must be poured somewhere first. If glass 2 contains blue liquid and the target wants blue in glass 1, the player must pour blue LEFT before pouring red RIGHT. The ordering becomes: pour blue 2->1, then pour red 1... wait, glass 1 just received blue. Now glass 1 has blue on top and red below. Pouring from glass 1 pours BLUE (top layer), not red. To pour red right, the player must first pour blue OUT of glass 1 (but where? Glass 2 is now empty...).

The layer stacking creates ORDER DEPENDENCY: the color you want to move might be BURIED under another color. To access it, you must first move the covering color elsewhere. But moving the covering color might require moving a THIRD color first. This creates a recursive unstacking problem where each pour's value depends on the entire future sequence.

"Always pour the top layer toward its target direction" fails because sometimes the player must pour a layer AWAY from its target to uncover a different layer that needs to move first. The counterintuitive move is: "Pour this red liquid LEFT (away from its target on the right) to uncover the blue liquid beneath it, which needs to go left. Then pour blue left, then pour red back right." The sacrifice (moving red away temporarily) enables the productive move (freeing blue).

### Family Test
Multi-commodity capacity-constrained flow on a line graph. This is NOT:
- IceSlide (push/slide on a 2D grid -- Pour is 1D liquid transfer with capacity constraints)
- FloodFill (region painting -- no capacity, no liquid physics)
- Claim (territory with locking -- no capacity, no stacking)
- Sort (1D ordering of elements -- Sort has unbounded swaps, Pour has capacity-limited partial transfers with multi-layer stacking)
- Any cascade game (no automatic effects -- every pour is player-initiated)

The defining novelty: the STACKING of colored layers within each glass. Most liquid puzzles (water sort, water jug) have homogeneous liquid or single-color vessels. Pour has HETEROGENEOUS stacks where the transfer order is constrained (top layer first), creating a Tower-of-Hanoi-like unstacking dynamic overlaid on the capacity constraint. The capacity limit means the player can't just freely rearrange -- intermediate storage is scarce.

The closest commercial analog is "Water Sort Puzzle" (pour homogeneous liquid between tubes until each tube is one color). But Water Sort has unlimited tubes with fixed capacity and homogeneous layers. Pour has a LINE of glasses (adjacency constraint), variable capacities, and mixed-color layers where the goal is a SPECIFIC distribution (not just sorted colors). The adjacency constraint (only pour to neighbors) means liquid must traverse intermediate glasses, creating the bottleneck dynamic that Water Sort lacks.

**Unoccupied family**: Multi-commodity capacity-constrained linear flow with layer stacking.

## Predicted Failure Mode
**Most likely death: feels like Water Sort (A4 clone).** If the player experience is "pour liquid to sort by color," it's Water Sort with extra steps. CRITICAL MITIGATION: the target is NOT "each glass has one color." The target is a SPECIFIC configuration (e.g., glass 1 has 2 red + 1 blue, glass 3 has 3 green). The goal is ARRANGEMENT, not sorting. This fundamentally changes the puzzle from "group by color" (Water Sort) to "achieve a specific multi-color distribution" (constraint satisfaction).

**Second risk: too many pours needed (tedious).** If the optimal solution is 20+ pours on a row of 6 glasses, the endgame becomes rote liquid-shuttling. MITIGATION: (a) limit glass count to 5-6, (b) start with a state that's 4-8 pours from the target, (c) use capacity constraints to ensure short solutions exist (tight capacities prevent long detour sequences).

**Third risk: A10 on small puzzles.** With 4 glasses and 2 colors, a patient player can enumerate states. MITIGATION: 6 glasses with 3 colors and capacities 3-6 creates a state space large enough (~10^6 reachable states) to defeat mental enumeration. Monday uses 5 glasses, 2 colors, par 6. Friday uses 6 glasses, 3 colors, par 12.

**Fourth risk: stacking is confusing.** If the player doesn't understand that pouring transfers the TOP layer, they'll be confused when red pours instead of the blue they wanted. MITIGATION: the glass visualization must clearly show LAYERS as distinct colored bands stacked vertically. The pouring animation should show the top layer flowing. A "pour preview" (P1) shows which color and how many units will transfer before the player commits.

**Anti-pattern proximity: A4 (Water Sort), A10 (small state space).** Defense against A4: specific multi-color target configuration (not sorting), adjacency constraint (not free-pour), variable capacities (not uniform). Defense against A10: 6 glasses x 3 colors x variable capacities creates sufficient state space complexity.

## Expected Metrics
| Metric | Prediction | Reasoning |
|---|---|---|
| Puzzle Entropy | 15-28 | 6 glasses, each pour has 2 directions (left or right from each glass = up to 10 pour options, minus capacity-blocked ones). Effective 4-8 meaningful pours per step over 6-12 step solutions = 15-28 bits total. |
| Skill-Depth | 45-70% | Strategic players identify the bottleneck glass and plan the unstacking sequence: "I need to empty glass 3 before I can pour red through it. Glass 3's blue goes left to glass 2 (which has capacity). Then red flows from glass 4 through glass 3 to glass 2... wait, glass 2 is now full of blue. I need glass 1 to absorb the blue." This multi-step bottleneck planning is the primary skill. Greedy players pour toward targets and get stuck when bottleneck glasses overflow. |
| Counterintuitive Moves | 3-5 | "Pour red LEFT (away from its target on the right)" -- to uncover blue beneath it that needs to go left. The sacrifice-to-unstack dynamic generates CI at nearly every unstacking step. Also: "Pour INTO a glass that's already correct" -- temporarily disrupting a correct glass to use its capacity as intermediate storage, then restoring it later. Violating a satisfied constraint to enable progress elsewhere is deeply counterintuitive. |
| Drama | 0.5-0.7 | Near-miss: "11 pours, par was 10. If I'd poured blue left at step 3 instead of step 5, glass 4 would have had capacity for the red transfer at step 6, avoiding the 2-pour detour through glass 5." The capacity constraints create "traffic jam" moments where one suboptimal pour cascades into 2-3 extra corrective pours. |
| Decision Entropy | 2.0-3.0 | Each step: 6 glasses x 2 directions = 12 possible pours, minus blocked (full receiver, empty source) = 4-8 legal pours. After strategic pruning (pours in the wrong direction, pours that don't advance toward target), 2-4 genuinely interesting options. |
| Info Gain Ratio | 2.0-3.0 | Strategic players complete in near-par pours through bottleneck planning. Greedy players overshoot by 30-50% due to capacity-blocked detours. The gap is driven by intermediate-storage management skill. |

## Player Experience
**Opening (10s):** Six tall glasses in a row. Each is a slim column showing colored liquid layers stacked vertically. Glass 1 (capacity 4): 2 red, 1 blue (red on top). Glass 2 (capacity 3): 3 green (full). Glass 3 (capacity 5): 2 blue, 1 red. Glass 4 (capacity 3): empty. Glass 5 (capacity 4): 2 green, 2 red. Glass 6 (capacity 5): 3 blue. Below, the target: Glass 1 should have 3 blue. Glass 2 should have 2 red, 1 green. Glass 6 should have 2 green, 1 red. You compare: glass 1 has red on top (needs blue). Glass 6 has all blue (needs green and red). Lots of liquid needs to move. You notice glass 4 is EMPTY -- it's the only spare capacity. That's your staging area.

You tap glass 5 and swipe right to glass 6... wait, glass 6 is capacity 5 with 3 blue. Room for 2 more. Glass 5's top layer is green (2 units). You pour: green flows from glass 5 into glass 6 with a satisfying liquid animation, filling glass 6 to capacity 5 (3 blue + 2 green). Glass 5 now has just 2 red. The pour preview showed this before you committed. One pour done, 11 remaining for par.

**Middle (2min):** Five pours in. You've moved most of the green to the right side and most of the blue to the left. But glass 3 has blue UNDER red -- you need the blue in glass 1 (target: 3 blue), but the red is on top. You can't pour blue without first pouring red somewhere. Glass 4 is empty (capacity 3) -- you pour red from glass 3 into glass 4. Now glass 3 has just 2 blue. Pour blue from glass 3 to glass 2... glass 2 is full (3 green, capacity 3). No room. You need to empty glass 2 first. Pour green from glass 2 to glass 5 (capacity 4, currently has 2 red -- room for 2). Green flows left-to-right over glasses. Now glass 2 is empty. Pour blue from glass 3 to glass 2 (capacity 3, now empty -- room for 3). Two blue units pour. Then pour from glass 2 to glass 1. But glass 1 has 1 blue and capacity 4 -- room for 3 more. The 2 blue from glass 2 flows left to glass 1. Glass 1 now has 3 blue. Target achieved for glass 1!

**Ending (15s):** Three glasses remain unsolved. Glass 4 has 1 red (from the unstacking earlier). Glass 5 has 2 red + 2 green. Glass 6 has 3 blue + 2 green. Target: glass 4 should be empty, glass 5 should have 3 red, glass 6 should have 2 green + 1 red. You need to move 1 red from glass 4 to glass 5 (glass 5 has capacity 4, currently 4 -- FULL). Glass 5 is full. You must first pour FROM glass 5. Pour green from glass 5 to glass 6 -- glass 6 is full (5/5). Dead end? Glass 3 is empty (you cleaned it out earlier). Pour green from glass 5 to glass 3 (capacity 5, empty -- plenty of room). 2 green flows right to left. Glass 5 now has 2 red, room for 2 more. Pour red from glass 4 to glass 5. 1 red flows right. Glass 5 now has 3 red. Target! Last step: pour green from glass 3 to glass 6... glass 6 is full. Hmm. Glass 6 needs 2 green + 1 red but currently has 3 blue + 2 green. The 3 blue need to go somewhere. This will take more pours. Tension builds.

**The aha moment:** "I need to pour this red AWAY from its target glass to uncover the blue underneath. Once the blue is free, I can pour it across to glass 1 in two pours. Then I pour the red back. Moving backward to go forward -- that's the key to this puzzle."

**The near-miss:** "13 pours, par was 11. I used glass 4 as temporary storage for red when I should have used glass 3 (which was already partially empty). Using glass 4 meant I had to pour red twice (into and out of glass 4) instead of once through glass 3. Two wasted pours from picking the wrong staging glass."

**Screenshot:** Six glasses shown as emoji columns of colored blocks. Target shown below for comparison. Arrows between glasses show the pour sequence. "Pour #42: 11 pours. Par: 11. Perfect!"

## Difficulty Knobs
1. **Glass count and color count** (Monday: 5 glasses, 2 colors, simple unstacking with ample spare capacity; Friday: 6 glasses, 3 colors, tight capacity requiring multi-step unstacking and intermediate storage management)
2. **Spare capacity** (Monday: 2 empty glasses providing generous staging; Friday: 1 empty glass or no completely empty glass -- player must create space by pouring to partially-full glasses)
3. **Layer depth** (Monday: 2 layers per glass max, quick unstacking; Friday: 3-4 layers per glass, requiring 2-3 intermediate pours to access bottom layers)
4. **Par tightness** (Monday: par = optimal + 3, room for 3 inefficient pours; Friday: par = optimal + 1, requires near-perfect bottleneck management)

---
<!-- BELOW THIS LINE: filled by engineer and playtester, not designer -->

## Solver Metrics

Computed on 5 puzzles (Mon-Fri seeds), 5 skill levels each.

| Metric | Mon | Tue | Wed | Thu | Fri | Avg |
|---|---|---|---|---|---|---|
| Solvability | 100% | 100% | 100% | 100% | 100% | 100.0% |
| Puzzle Entropy | 23.98 | 10.49 | 15.81 | 30.17 | 17.97 | 19.69 |
| Skill-Depth | 93.5% | 98.0% | 97.0% | 94.0% | 96.5% | 95.8% |
| Decision Entropy | 1.84 | 2.62 | 2.64 | 2.51 | 2.57 | 2.44 |
| Counterintuitive | 2 | 1 | 1 | 3 | 1 | 1.6 |
| Drama | 0.60 | 0.50 | 0.00 | 0.00 | 0.00 | 0.22 |
| Duration (s) | 0.000 | 0.000 | 0.001 | 0.002 | 0.001 | 0.001 |
| Info Gain Ratio | 15.38 | 50.00 | 33.33 | 16.67 | 28.57 | 28.79 |
| Solution Uniqueness | 1 | 1 | 1 | 1 | 1 | 1.0 |

**Auto-kill check**: PASSED
**Weakest metric**: Drama -- 0.22 (below ideal 0.5 range; greedy lookahead rarely backtracks because the heuristic is relatively smooth along optimal paths)
**Strongest metric**: Skill-Depth -- 95.8% (random play averages 200 steps vs optimal 4-13; the capacity bottleneck and layer stacking heavily reward strategic planning over random exploration)

## Play Report
<!-- Playtester fills this section with blind play observations -->

## Decision
<!-- Designer fills this after reviewing metrics + play report -->
<!-- Status: keep / iterate / kill -->
