# Ferry

## Rules
Swap colored tokens along edges of a graph to get every token to its matching colored node. Each swap exchanges the two tokens on an edge's endpoints. Solve within par swaps.

## Mechanic Type
Constraint Satisfaction

## Why It Works

### Stare Test
The game board is a graph of 8-10 nodes connected by 10-14 edges, with each node holding a colored token that needs to reach a specific destination node. All positions and connections are visible. But the state space makes pre-planning impossible: with 10 tokens in 10 positions, there are 10! = 3.6M possible arrangements, and each swap changes 2 positions simultaneously. Planning even 4 swaps ahead requires evaluating 12^4 = 20,736 paths (12 edges per turn), each producing a different board state. More critically, the GRAPH TOPOLOGY creates bottleneck nodes -- nodes with only 2 edges that serve as mandatory waypoints for multiple tokens. Two tokens that both need to pass through the same bottleneck create a scheduling conflict that requires looking far ahead to resolve. The combinatorial explosion of token interactions across a constrained graph exceeds human working memory for 8+ tokens.

### Dominant Strategy Test
"Swap the token that's farthest from its goal toward its goal" fails because: (a) the swap also MOVES the other token on that edge, potentially displacing one that was already close to home, and (b) the graph topology means "toward goal" might require going through a bottleneck that's currently occupied by a token that itself needs to move. Whether swapping tokens A and B on edge (X,Y) is good depends on where token B needs to go (which depends on future swaps), whether node Y will be needed as a waypoint for token C (which depends on C's routing plan), and whether the bottleneck between X and B's goal will be clear when B needs it (which depends on D and E's movements). This is genuine recursive cost dependency across multiple agents sharing a constrained network.

"Fix the bottleneck first" also fails because there are typically 2-3 bottlenecks, and fixing one might require routing tokens through another, creating a circular dependency. The order in which bottlenecks are cleared determines the total solution length.

### Family Test
Token permutation on a constrained graph. This is NOT:
- Sort (bounded reversal on a 1D sequence -- Ferry operates on a 2D graph with arbitrary topology)
- Loop (ring rotation -- Ferry uses pairwise edge swaps, not cyclic rotation)
- IceSlide (single agent movement -- Ferry has 8-10 agents all needing to move simultaneously)
- Herd (group movement of same-color agents -- Ferry moves individual tokens via edge swaps)
- Adjacent swap sorting (killed: CI=0 on a LINE -- Ferry's graph topology creates CI through bottlenecks)

The defining novelty: the GRAPH TOPOLOGY is the puzzle's secret weapon. On a line, adjacent swaps are always monotonically improving (every swap can move a token closer to its goal). On a graph with bottleneck nodes (degree-2 nodes connecting clusters), tokens must sometimes move AWAY from their goal to clear a bottleneck for another token, or route through a longer path because the short path is blocked. The topology creates the non-monotonicity that produces CI. Each puzzle has a different graph topology, so the strategy changes completely between puzzles.

The closest commercial analog is the 15-puzzle (sliding tiles on a grid), but Ferry differs in three ways: (1) arbitrary graph topology vs. fixed grid, (2) edge swaps vs. sliding into empty space (no blank tile), (3) the graph topology varies per puzzle, creating variety that the 15-puzzle's fixed grid cannot.

## Predicted Failure Mode
**Most likely death: A10 on simple graphs.** A path graph (linear chain) reduces to adjacent-swap sorting (CI=0, killed). A complete graph (every node connected to every other) trivializes routing (any token can reach any node in 1 swap). The graph must have a specific sweet spot: PARTIAL connectivity with 2-3 bottleneck nodes that force routing conflicts. If the graph generator doesn't reliably produce bottleneck topologies, the game degenerates.

**Second risk: d1 failure (graph is confusing).** Players who've never seen a graph puzzle might not understand "swap along edges." The visual must be crystal clear: nodes are large circles with colored tokens inside, edges are visible lines, and the player taps two connected nodes to swap. A drag gesture (drag token along edge) would be even more intuitive.

**Third risk: feeling like work.** Routing tokens through a graph might feel like a logistics problem rather than a puzzle. Mitigation: use a visual metaphor (ferries carrying colored cargo between islands, with bridges as edges). The satisfying moments are when a multi-swap sequence routes 3 tokens home simultaneously through a shared bottleneck -- the "aha" of efficient routing.

**Anti-pattern proximity: A10 (fully visible).** Defense is the combinatorial explosion of 10 tokens on a graph with 12+ edges. Even with full visibility, the interaction between token positions and graph topology creates a planning horizon beyond human working memory. But this ONLY works if the graph has enough tokens and bottlenecks. Minimum: 8 tokens, 2 bottleneck nodes, solutions requiring 6+ swaps.

## Expected Metrics
| Metric | Prediction | Reasoning |
|---|---|---|
| Puzzle Entropy | 18-30 | 10 tokens x 10 positions = 10! states. ~12 swappable edges per turn. 6-10 swap solutions. Effective branching factor after pruning: ~5-8 useful swaps per step. Rich state space. |
| Skill-Depth | 50-80% | Greedy swapping (move farthest token toward goal) produces 2-3x more swaps than optimal because it creates cascading displacement. Strategic players who plan bottleneck routing sequences will dramatically outperform. The 15-puzzle has very high skill depth for the same structural reason. |
| Counterintuitive Moves | 3-6 | "Move RED away from its goal" to clear the bottleneck for BLUE, which then clears the path for GREEN, which finally lets RED route home. Bottleneck-clearing moves are inherently counterintuitive: the player must sacrifice short-term progress for long-term routing efficiency. Also: "Swap two tokens that are both in wrong positions" when one could have been swapped toward its goal -- because the swap positions them to enable a 2-swap routing of a third token. |
| Drama | 0.5-0.7 | Near-miss: 7 of 8 tokens home, but the last token is on the wrong side of a bottleneck with 1 swap remaining. "If I'd routed yellow through the north bridge instead of south, I'd have space now." Tight endgames are inherent to the constrained graph. |
| Decision Entropy | 2.5-3.5 | ~12 possible swaps per turn, but graph structure and token positions prune to ~5-8 meaningful ones (swaps that move at least one token toward its goal or clear a bottleneck). |
| Info Gain Ratio | 2.0-3.5 | Strategic players who identify bottleneck dependencies early and plan multi-swap sequences will solve in 6-8 swaps. Greedy players will take 12-18 swaps. Large gap due to cascading displacement effects of naive play. |

## Player Experience
**Opening (10s):** A cheerful map of 8 islands, connected by bridges. Each island has a colored ferry docked at it (red, blue, green, yellow, and duplicates). Each island also has a colored flag showing which ferry belongs there. Red ferry is at the blue-flagged island; blue ferry is at the red-flagged island. Simple: swap them! You tap the bridge between them and the ferries slide past each other with a satisfying boat animation. Two home, six to go. But now you see: the green ferry needs to reach the northwest island, and the only bridge there passes through a small island that currently has the yellow ferry... which needs to go southeast. They can't both use that bridge at the same time.

**Middle (2min):** Five ferries home. Three left: green (northwest-bound), yellow (southeast-bound), and purple (east-bound). The small island connecting northwest and southeast is the bottleneck. Green and yellow both need to pass through it. If you route green through first, yellow can't get past until green clears. If you route yellow first, same problem with green. The insight: route PURPLE east first (through a different bridge), which clears the eastern island for yellow to temporarily park, freeing the bottleneck for green. Then yellow goes through the bottleneck. Three swaps for three ferries, but the order is everything.

**Ending (15s):** Last ferry needs one swap to reach home. But the bridge you need is between two ferries that are both already home -- swapping them would displace one. You look again: there's an alternative 2-swap route through the central island. You execute: swap with central, then swap to goal. Two swaps instead of one, but both ferries stay home. Par reached. The "long way around" that preserves earlier progress.

**The aha moment:** "I need to move green AWAY from its goal -- back through the south bridge -- so that yellow can pass through the bottleneck. Then green routes home via the north bridge instead. The detour costs 2 extra swaps but saves 4 by avoiding the traffic jam."

**The near-miss:** "8 swaps, par was 7. I routed blue directly through the bottleneck instead of around it, which displaced yellow and cost me an extra swap to fix. The shortcut was a trap."

**Screenshot:** An island map with colored ferry icons at each node, showing bridges as connecting lines. Completed ferries have a checkmark. The map topology is different each day -- that's the share-worthy visual.

## Difficulty Knobs
1. **Token count and graph complexity** (Monday: 6 tokens on 8 nodes with 1 bottleneck, clear routing; Friday: 10 tokens on 12 nodes with 3 bottlenecks, cascading routing dependencies)
2. **Bottleneck density** (Monday: 1 degree-2 node creating a single routing conflict; Friday: 3 degree-2 nodes creating interdependent routing conflicts that require sequenced resolution)
3. **Scramble distance from solved state** (Monday: 3-4 swaps from solved, solutions are short; Friday: 8-10 swaps from solved, requiring long multi-step plans)
4. **Par generosity** (Monday: par = optimal + 4; Friday: par = optimal + 1)

---
<!-- BELOW THIS LINE: filled by engineer and playtester, not designer -->

## Solver Metrics

Computed on 5 puzzles (Mon-Fri seeds), 5 skill levels each.

| Metric | Mon | Tue | Wed | Thu | Fri | Avg |
|---|---|---|---|---|---|---|
| Solvability | 100% | 100% | 100% | 100% | 100% | 100% |
| Puzzle Entropy | 20.7 | 24.0 | 39.3 | 50.7 | 31.7 | 33.3 |
| Skill-Depth | 0.0% | 0.0% | 22.2% | 0.0% | 0.0% | 4.4% |
| Decision Entropy | 2.58 | 3.00 | 2.81 | 3.17 | 3.17 | 2.95 |
| Counterintuitive | 0 | 0 | 0 | 0 | 0 | 0.0 |
| Drama | 0.60 | 0.60 | 0.60 | 0.60 | 0.60 | 0.60 |
| Duration (s) | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| Info Gain Ratio | 1.96 | 2.18 | 1.65 | 1.66 | 2.10 | 1.91 |
| Solution Uniqueness | 1 | 1 | 1 | 1 | 1 | 1.0 |

**Auto-kill check**: FAILED
- Skill-Depth 4.4% < 10%: Greedy solver with distance heuristic matches optimal on 4/5 puzzles.
- Counterintuitive Moves = 0 across all puzzles: Edge swaps on constrained graphs never require moving tokens away from their goals. The sum-of-shortest-paths heuristic is a nearly perfect guide, making greedy play equivalent to optimal play.

**Weakest metric**: Counterintuitive Moves -- 0.0 avg (greedy IS optimal; no aha moments possible)
**Strongest metric**: Puzzle Entropy -- 33.3 avg (large state space with many legal moves per turn)

**Root cause**: The spec predicted this failure mode ("Most likely death: A10 on simple graphs"). Edge swaps move two tokens simultaneously, and the distance heuristic accurately captures the net benefit of each swap. Even with bottleneck nodes creating constrained routing, greedy play (swap the pair that most reduces total displacement) is nearly always optimal. The bottleneck topology creates longer paths but not situations where a token must move FURTHER from its goal. The mechanic lacks the recursive cost dependency the spec theorized -- in practice, the pairwise swap decomposition means each swap's value is locally evaluable.

## Play Report
<!-- Playtester fills this section with blind play observations -->

## Decision
<!-- Designer fills this after reviewing metrics + play report -->
<!-- Status: keep / iterate / kill -->
<!-- If iterate: what to change and why -->
<!-- If kill: lesson learned for learnings.md -->
