# Fuse

## Rules
Ignite bombs on a grid to trigger chain reactions. Each bomb has a color and a countdown timer (1-4). When a timer hits 0, the bomb explodes and ignites all adjacent same-colored bombs. Clear all bombs within par ignitions.

## Mechanic Type
Constraint Satisfaction

## Why It Works

### Stare Test
All bomb positions, colors, and timers are visible. But predicting the cascade outcome of an ignition requires simulating a TEMPORAL tree: "I ignite A (timer 3). After 3 ticks, A explodes, igniting B (timer 2) and C (timer 4). After 2 more ticks, B explodes, igniting D (timer 1). After 1 more tick, D explodes..." With 15-20 bombs, cascade trees branch 2-3 times at each explosion, creating a temporal simulation with 5-10 events spread across 4-8 time steps. Simultaneously tracking which bombs are "ticking" at which time step, which explosions trigger which new ignitions, and whether the chain reaches all same-colored neighbors exceeds human working memory (4-7 items). This is the same defense as Herd (combinatorial explosion of visible interactions), applied to temporal sequencing rather than spatial movement.

The key complexity multiplier: the player can ignite MULTIPLE bombs across turns. Bomb A ignited on turn 1 (timer 3) explodes on turn 4. If the player ignites bomb B on turn 2 (timer 2), B also explodes on turn 4. Simultaneous explosions interact -- if A and B are adjacent and same-colored, their explosions might be redundant (wasted ignition) or complementary (together they reach bombs neither could alone). Tracking multiple concurrent countdowns with overlapping explosion windows is the cognitive challenge.

### Dominant Strategy Test
"Ignite the bomb with the longest chain" fails because chain length depends on TIMER ALIGNMENT. Igniting bomb A (timer 3) creates a cascade that reaches bomb X after 5 ticks. But bomb X has timer 1 -- it needs to be ignited soon to reach bombs Y and Z before the player runs out of ignitions. Should the player ignite X directly (spending an ignition) or find a faster cascade path to X? The answer depends on how many ignitions remain, which other bombs need direct ignition, and whether there's a cascade path that reaches X in fewer ticks. The cost of each ignition is INCOMMENSURABLE: whether igniting A is good depends on whether you later need to ignite something A's cascade would have reached, which depends on the cascade timing of everything else.

"Ignite the highest-timer bomb first" also fails. High-timer bombs take longer to explode, which means their cascades arrive LATER. If a low-timer bomb adjacent to a high-timer bomb needs to be cleared before the high-timer detonates, the low-timer must be ignited separately. Timer sequencing is the puzzle, not timer magnitude.

### Family Test
Temporal cascade sequencing. This is NOT:
- ChainPop (spatial aiming at clusters -- Fuse has deterministic cascade trees, not random bubble fields)
- DropPop (gravity-based chain collapse -- Fuse has timer-based temporal chains)
- Bloom (grid growth with chain reactions -- killed because strategy was transparent "tap 4s adjacent to 4s"; Fuse's timers add a temporal dimension that Bloom lacked)
- Any toggle/constraint game (no toggling states -- bombs are consumed)

The defining novelty: TIME as a dimension. The player doesn't just choose WHERE to act but manages WHEN cascades fire and how concurrent countdown timelines interact. The closest commercial analog is Minesweeper-meets-Bomberman, but neither has player-controlled cascade timing as the core mechanic. The temporal planning layer is genuinely new in this portfolio.

## Predicted Failure Mode
**Most likely death: Tumble's fate (A9 -- preview-outcome gap).** If cascade timing is too complex for humans to predict, the game becomes trial-and-error. The player ignites a bomb, watches a cascade they didn't expect, undoes, and tries a different bomb. This is the Tumble death spiral: the gap between "what I planned" and "what happened" exceeds working memory. Mitigation: (a) show a cascade preview when the player taps a bomb (highlight all bombs that would be reached and the order of detonation), (b) keep cascade depth to 2-3 levels on Monday (only 1 cascade branch), scaling to 4-5 on Friday, (c) use STAGGERED animations so the player can follow the cascade step by step after committing.

**Second risk: Bloom's fate (transparent strategy).** If the timer values don't interact meaningfully, the game reduces to "ignite each isolated color cluster from its highest-timer bomb" -- one-sentence strategy. Mitigation: color clusters must OVERLAP spatially (red bombs adjacent to blue bombs adjacent to red bombs), so that the order of ignition affects which bombs are available when. Timer values must be varied within clusters so the cascade PATH through a cluster depends on the entry point.

**Third risk: d1 failure (too many simultaneous concepts).** Bombs + colors + timers + cascades + adjacency + par = 6 interacting systems. If the player can't grok this in 10 seconds, d1 collapses. Mitigation: Monday starts with only 1 color (pure timer sequencing), adding a second color on Tuesday. The color interaction is the "week 2" mechanic that adds depth once timing is internalized.

**Anti-pattern proximity: A9 (cascade unpredictability).** Tumble's chain-pops were unpredictable because gravity reshuffled the board between pops. Fuse's cascades are more predictable because bombs don't move -- the explosion pattern is deterministic from the starting state. But multi-branch cascades with 3+ simultaneous timers may still exceed prediction capacity. The cascade preview (mitigation a) is CRITICAL.

## Expected Metrics
| Metric | Prediction | Reasoning |
|---|---|---|
| Puzzle Entropy | 15-25 | 15-20 bombs with 3-4 colors and timers 1-4. ~4-8 ignitions per puzzle (some manual, some cascaded). Multiple viable ignition orderings create genuine entropy. |
| Skill-Depth | 50-80% | Strategic players identify cascade trees and minimize direct ignitions by finding chain paths. Random ignition almost never clears the board within par because it wastes ignitions on bombs that would have been cascade-reached. |
| Counterintuitive Moves | 3-5 | "Ignite this timer-1 bomb even though it only reaches 1 neighbor" -- because that neighbor has timer 4, and without this nudge, the timer-4 bomb wouldn't detonate until after the player runs out of ignitions. Also: "DON'T ignite this cluster's biggest bomb -- ignite the small one on the edge, because its cascade path covers more of the cluster than starting from the center." Entry-point optimization within clusters is the CI source. |
| Drama | 0.6-0.8 | Two bombs remaining, one ignition left. The player's last cascade is ticking down toward the remaining bombs. Will the cascade reach both? The timer arithmetic creates natural "will it reach?" tension. Near-miss: cascade falls 1 cell short because of a timer mismatch. |
| Decision Entropy | 2.5-3.5 | 15-20 bombs available to ignite, but color clustering and timer constraints reduce viable options to ~5-8 per turn. The temporal dimension adds richness beyond spatial choice alone. |
| Info Gain Ratio | 2.0-3.0 | Strategic players who trace cascade trees will use dramatically fewer ignitions than random players. Timer sequencing is a genuine skill with high payoff. |

## Player Experience
**Opening (10s):** A 5x5 grid of colorful bombs. Red bombs have numbers 1-3, blue bombs have numbers 2-4. You tap a red bomb with timer "3." It starts pulsing -- 3... 2... 1... BOOM. It explodes with a satisfying burst animation, and the adjacent red bomb (timer 2) catches fire. 2... 1... BOOM. That one explodes too, reaching a third red bomb. The chain reaction clears 3 bombs from one tap. You immediately feel it: "I need to find the right STARTING point to chain the most bombs."

**Middle (2-3min):** Five bombs cleared by your first chain. But 4 red bombs remain in a disconnected cluster on the far side. They need a separate ignition. You have 5 ignitions left for 12 remaining bombs. You study the blue cluster: 6 blue bombs forming an L-shape. If you ignite the corner bomb (timer 2), the cascade goes up the L and clears 5 of 6. But the 6th blue bomb is isolated -- needs its own ignition. That's 2 of your 5 remaining ignitions on blue alone, leaving 3 for 4 disconnected reds and 2 greens. Not enough. You look again: the corner blue has timer 2, but the blue next to it has timer 1. If you ignite the timer-1 blue first, it explodes in 1 tick and ignites the corner blue (now timer 2 starts counting). The corner blue explodes 2 ticks later and reaches the 6th blue via a different adjacency path. ONE ignition clears ALL 6 blues. That's the aha: the entry point determines the cascade PATH, and the timer-1 neighbor is the better entry even though it reaches fewer bombs directly.

**Ending (30s):** Last ignition. One green bomb remains, adjacent to a red you haven't cleared. You ignite the red (timer 1) -- it explodes immediately, catching the green (timer 2). The green detonates 2 ticks later. Board clear. 6 ignitions total, par was 7. The cascade animation replays as a compressed "chain summary" on the win screen. Screenshot: a grid showing numbered explosion order with colored burst emoji -- the ignition sequence visualized as a chain reaction diagram.

**The aha moment:** "The timer-1 bomb on the edge is a better starting point than the timer-3 bomb in the center, because the edge bomb's cascade PATH covers more of the cluster even though its DIRECT reach is smaller." Entry-point optimization -- the non-obvious choice that clears 6 bombs instead of 5.

**The near-miss:** "If I'd ignited the blue corner first (timer 2), the cascade would have stopped 1 bomb short. The isolated blue would have needed a separate ignition, and I wouldn't have had enough ignitions for the reds. Entry order is everything."

## Difficulty Knobs
1. **Number of colors and bombs** (Monday: 1 color, 8-10 bombs on a 4x4 grid -- pure timer sequencing, no color interaction; Friday: 3-4 colors, 18-22 bombs on a 5x5 grid -- overlapping color clusters with timer misalignment requiring precise entry-point choices)
2. **Cascade connectivity** (Monday: bombs form 1-2 contiguous same-color clusters, each clearable from any entry point within 1-2 ignitions; Friday: clusters are fragmented with 2-3 "bridge" bombs that connect sub-clusters, requiring the cascade to traverse specific paths to reach all bombs)
3. **Par ignitions** (Monday: par = minimum + 3, generous; Friday: par = minimum + 1, demands finding cascade paths that clear maximum bombs per ignition)

---
<!-- BELOW THIS LINE: filled by engineer and playtester, not designer -->

## Solver Metrics

Computed on 5 puzzles (Mon-Fri seeds), 5 skill levels each.

Two cascade rules were tested:
- **Simple cascade** (transitive propagation through same-color adjacency): every bomb in a connected component clears from any entry point. Result: Skill-Depth = 0%, CI = 0 across all puzzles. Greedy IS optimal because any ignition within a component clears the whole component. Entry point is irrelevant.
- **Directed cascade** (exploding bomb with timer T only ignites neighbors with timer <= T): creates entry-point dependence but makes puzzles unsolvable at difficulty 3+ (solver times out at 500K nodes). Solvable puzzles still show Skill-Depth = 0% because the optimal strategy is always "ignite the highest-timer bomb in each component."

Best results achieved (directed cascade, constructive generation):

| Metric | Mon | Tue | Wed | Thu | Fri | Avg |
|---|---|---|---|---|---|---|
| Solvability | 100% | 100% | FAIL | FAIL | FAIL | FAIL |
| Puzzle Entropy | 6.6 | 12.0 | 0.0 | 0.0 | 0.0 | 3.7 |
| Skill-Depth | 0% | 0% | N/A | N/A | N/A | 0% |
| Decision Entropy | 1.66 | 2.01 | 0.00 | 0.00 | 0.00 | 0.7 |
| Counterintuitive | 0 | 0 | 0 | 0 | 0 | 0.0 |
| Drama | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.0 |
| Duration (ms) | 1 | 1 | 1 | 1 | 2 | 1.2 |
| Info Gain Ratio | 1.42 | 1.33 | 0.00 | 0.00 | 0.00 | 0.6 |
| Solution Uniqueness | 264 | 1080 | 1 | 1 | 1 | 269.4 |

**Auto-kill check**: FAILED
- Solvability < 100%: FAIL (Wed/Thu/Fri unsolvable under directed cascade)
- Skill-Depth < 10%: 0% (greedy matches optimal -- no depth)
- CI Moves = 0 across all puzzles: FAIL (no counterintuitive moves exist)
- Decision Entropy < 1.0: avg 0.73 (too few meaningful choices)
- Puzzle Entropy < 5: avg 3.7 (trivially simple)

**Root cause**: The cascade mechanic is fundamentally non-strategic. Under simple cascade, every bomb in a same-color connected component is reachable from any other bomb in that component, making entry-point selection irrelevant. The number of ignitions required equals the number of same-color connected components, which is a fixed property of the grid -- no sequence of moves can change it. Under directed cascade, the timer-gating creates entry-point dependence but the optimal strategy is trivially "ignite the highest-timer bomb" (one-sentence strategy = Bloom's death). The temporal cascade tree that the spec predicts would create working-memory challenge does not emerge because the cascade outcome is fully determined by the starting bomb and the grid topology -- there is no emergent complexity from timer interactions.

## Play Report
<!-- Playtester fills this with blind play observations -->

## Decision

**Status: KILL**

**Reason:** Multiple fatal thresholds violated: Skill-Depth=0% (random matches optimal), CI=0 (no counterintuitive moves), Decision Entropy=0.73 (path nearly forced), Puzzle Entropy=3.7 (trivially simple), Solvability < 100% on Wed-Fri under directed cascade. The cascade mechanic is fundamentally non-strategic. Under simple cascade, entry point is irrelevant because any bomb in a same-color connected component reaches all others -- the number of required ignitions is a fixed topological property. Under directed cascade, "ignite the highest-timer bomb" is a one-sentence dominant strategy (Bloom's death). The temporal planning depth predicted in the spec does not materialize because cascade outcomes are fully determined by grid topology with no emergent complexity from timer interactions.

**Lesson for learnings.md:** Cascade/chain-reaction mechanics where the outcome is fully determined by the starting state and entry point create zero strategic depth. The player's only decision is "where to start," and if any entry point within a connected component reaches all others (simple cascade) or the optimal entry is always the highest-value node (directed cascade), the decision is trivial. For cascades to create depth, the player must make MULTIPLE interleaved decisions during the cascade (like ChainPop's 3 taps) or the cascade must interact with a SECOND mechanic that creates incommensurable costs (like DropPop's gravity creating new groups after pops).
