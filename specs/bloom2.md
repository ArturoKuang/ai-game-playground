# Bloom2

## Rules
Place seeds on empty cells of a grid. Seeds grow simultaneously for K generations via a simple rule: an empty cell becomes alive if it has exactly 2-3 live neighbors; a live cell with 0-1 or 4+ neighbors dies. After growth, the living pattern must match the target shape.

## Mechanic Type
Constraint Satisfaction

## Why It Works

### Stare Test
The player sees the target shape and a mostly-empty grid. They must place 3-6 seeds whose EMERGENT GROWTH after K generations produces the target. Predicting even 2 generations of simultaneous cellular automaton growth on a 6x6 grid exceeds human working memory -- each generation updates every cell based on its neighbor count, and the neighbor counts themselves change every generation. For K=3, the player must mentally simulate 3 rounds of parallel cell updates across 36 cells. Even experienced players of Conway's Game of Life cannot reliably predict 3 generations forward for arbitrary seed configurations. The planning problem (reverse cellular automaton -- find seeds that produce a target) is formally undecidable in general and NP-hard for bounded grids.

### Dominant Strategy Test
"Place seeds near target cells" fails because growth is NON-LOCAL: a seed placed 3 cells away from a target region might grow TOWARD it over K generations, while a seed placed directly ON a target cell might die (too few neighbors in generation 1) or overgrow (too many neighbors, destroying part of the target). The B3/S23 rule (birth on 3, survival on 2-3) means growth follows SPECIFIC geometric patterns:
- A single isolated seed dies immediately (0 neighbors)
- Two adjacent seeds: both die (each has only 1 neighbor)
- Three seeds in an L-shape: grow into a stable 2x2 block
- Three seeds in a line: oscillate between horizontal and vertical (blinker)

The player must learn these GROWTH PRIMITIVES and compose them to produce the target. This is like learning chess openings -- pattern knowledge that creates genuine mastery over time. "What seed pattern produces a horizontal bar after 3 generations?" is a question with a non-obvious answer that rewards learning.

### Family Test
Cellular automaton inverse / seed planning. This is NOT:
- Bloom (original: chain reaction optimization -- Bloom2 is constraint satisfaction with emergent growth)
- LightsOut (toggle with coupling -- Bloom2 has irreversible growth with emergent behavior)
- Spill/Surge (chip-firing -- different update rule, different goal)
- Any deduction game (no hidden info -- the challenge is prediction, not deduction)

The defining novelty: the player's actions (placing seeds) undergo EMERGENT TRANSFORMATION before being evaluated against the target. The gap between "what I place" and "what I get" is not random (like dice) or calculable (like arithmetic) -- it's COMPLEX (like cellular automaton evolution). This creates a unique feeling: the player develops INTUITION about growth patterns through play, getting better each day not through learning a technique but through building a VISUAL VOCABULARY of seed-to-pattern mappings.

The closest commercial analog is "growing" puzzles in coding education (place initial conditions, watch simulation, compare to target), but those are typically one-shot challenges. Bloom2 as a daily puzzle creates a long-term skill development arc -- Monday uses simple primitives (2-3 seeds, K=2 generations), Friday composes multiple primitives (5-6 seeds, K=3 generations).

## Predicted Failure Mode
**Most likely death: opacity (player can't develop intuition).** If the growth rule produces chaotic, unpredictable patterns, the player gives up. B3/S23 (Life) has some chaotic behaviors on large grids. CRITICAL MITIGATION: (a) Use small grids (5x5 to 7x7) where boundary effects dampen chaos, (b) K is small (2-3 generations max), (c) Monday puzzles use KNOWN PRIMITIVES (blinker, block, glider) that the player learns as building blocks. The game teaches growth patterns implicitly: Monday's target IS a 2x2 block, and the only seed pattern that produces it is an L-shape. After a week, the player knows "L-shape -> block" and can compose this primitive with others.

**Second risk: trial-and-error dominance.** If the grid is small enough, the player can brute-force by trying random seed placements, running the simulation, and adjusting. With 3 seeds on a 5x5 grid, there are C(25,3) = 2,300 options -- too many for brute force but not impossible with systematic elimination. Mitigation: par is measured in ATTEMPTS (simulations run), not just whether the player finds the answer. Reaching par requires finding the seed pattern in 1-3 attempts, which demands genuine prediction. Also: each simulation costs time (the player watches K generations play out), creating natural friction against brute force.

**Third risk: too hard / unfun.** If the player can't solve even Monday's puzzle, the game fails d1. Mitigation: Monday's puzzle should be solvable with 1-2 obvious seeds and K=2. The target should SUGGEST the seed pattern -- e.g., a 2x2 block target with 3 of 4 cells pre-filled (player adds the 4th seed that triggers the L-shape growth to fill the block). Tuesday introduces the concept of "seeds that aren't in the final pattern" (seeds that die after producing offspring). This progressive revelation teaches the mechanic over a week.

**Anti-pattern proximity: A10 (fully visible) if K is too small.** With K=1, the player can mentally simulate one generation trivially. K must be >= 2 to create genuine planning depth. But K >= 4 is too chaotic for human intuition. Sweet spot: K=2 on Monday, K=3 on Friday.

## Expected Metrics
| Metric | Prediction | Reasoning |
|---|---|---|
| Puzzle Entropy | 15-30 | 5x5-7x7 grid, 3-6 seeds to place. C(25,4) = 12,650 possible 4-seed placements on 5x5. Target constraint prunes heavily, but the pruning is HARD to compute (requires simulating each option). |
| Skill-Depth | 40-70% | Strategic players learn growth primitives and COMPOSE them: "I need a bar in row 3 and a block in the corner. Bar needs a blinker seed (3 in a line); block needs an L-shape seed. Check: do the blinker and L-shape interfere during growth?" Primitive composition is a learnable skill that improves dramatically over time. Random seed placement almost never produces the target. |
| Counterintuitive Moves | 3-6 | "Place a seed HERE, far from the target" -- because it grows TOWARD the target over K generations. Also: "Leave this target cell EMPTY" -- because a neighbor's growth fills it during generation 2. Also: "Place two seeds that will DIE after generation 1" -- because their brief existence creates the neighbor count needed for a birth at the target cell in generation 2. Seeds as sacrificial scaffolding is deeply counterintuitive. |
| Drama | 0.5-0.8 | The player places seeds, presses "grow," and watches K generations unfold. Generation 1 looks nothing like the target (panic). Generation 2 starts to resemble it (hope). Generation 3 either matches perfectly (triumph) or has 1-2 cells wrong (agonizing near-miss). The time-lapse growth animation creates natural dramatic tension -- the player watches their plan unfold and can't intervene. |
| Decision Entropy | 2.5-4.0 | With 3-6 seeds on 25-49 cells, each seed has 10-20 meaningful positions (cells that could contribute to the target after growth). But seed positions INTERACT (two seeds near each other affect each other's growth), so the decision space is genuinely high-dimensional. |
| Info Gain Ratio | 2.5-4.0 | Players who learn growth primitives place correct seeds in 1-2 attempts. Players who guess randomly need 5-10+ attempts. The skill gap is large because primitive knowledge compounds: knowing 5 primitives lets you decompose most targets, while knowing 0 means every puzzle is a coin flip. |

## Player Experience
**Opening (10s):** A mostly-empty 6x6 grid. In the corner, a target shape: a T-shape made of 5 live cells. Text: "Place seeds. They grow for 3 generations. Match the target." You have 4 seed slots. A "Grow" button waits at the bottom. You think: the T-shape has a horizontal bar of 3 and a vertical stem of 3, overlapping at the center. A horizontal line of 3 seeds is a "blinker" that oscillates... after 1 generation, a horizontal blinker becomes vertical. After 2 generations, it's horizontal again. After 3 generations, vertical. That's not a T. You need to COMPOSE: what seed pattern produces a T after 3 generations? You place 3 seeds in an L-shape near the target zone and one isolated seed below it. Press "Grow."

**Middle (1min):** Generation 1 plays out: the L-shape births a cell in its corner, forming a 2x2 block. The isolated seed dies (no neighbors). Not going well. Generation 2: the 2x2 block is stable (each cell has 2-3 neighbors) -- it just sits there. You needed a T, not a block. But wait -- the dead isolated seed left a corpse that doesn't affect anything. The block is nowhere near a T. Attempt 1 failed (shown as a faded ghost of your seeds). Attempts used: 1/3 (par is 3).

You rethink. A T-shape after 3 generations... What if you start with a plus-sign (+)? A cell with 4 neighbors in a cross: center has 4 neighbors (dies in gen 1 -- too many!), arms have 1 neighbor each (die -- too few). The whole thing vanishes. Crosses are unstable. What about placing seeds at the 4 endpoints of the T? Leave the center empty. In generation 1, the center cell has 3 neighbors (seeds at the 3 adjacent T positions) -- it's born! And the "stem" cell below center has 2 neighbors -- it survives? You work it out. You place 4 seeds at the T's endpoints. Press "Grow."

**Ending (20s):** Generation 1: center cell born (3 neighbors from the top-bar seeds and stem). Stem cell... has only 1 neighbor (center). Dies. The top bar's 3 seeds each have 1-2 neighbors: endpoints have 1 (die), center-top has 2 (survives). After gen 1: center alive, center-top alive, everything else dead. Gen 2: center has 1 neighbor (center-top). Dies. Center-top has 1 neighbor (was center). Dies. Everything dead. Attempt 2 failed. 2/3 attempts used.

Last attempt. You stare at the target T-shape. What if the target isn't grown FROM seeds inside it, but grown from seeds OUTSIDE it? Seeds that die while creating the right neighbor counts for the target cells to be born? You place 4 seeds in a diamond pattern around the T's center: one cell above, below, left, right of where the T's center should be. None of these seeds are IN the target. Press "Grow." Generation 1: the center cell has 4 neighbors (too many -- dies or not born). Hmm. The cell ABOVE center has 1 neighbor (top seed). Dies. This isn't working either. But generation 2... the cells between the original seeds have 2 neighbors each from the gen-1 survivors. Something emerges. Generation 3: a T-shape crystallizes from the remnants. Target matched! The seeds were scaffolding that built the structure and then dissolved.

**The aha moment:** "The seeds DON'T HAVE TO BE PART OF THE FINAL SHAPE. They're scaffolding -- temporary structures that create the right conditions for the target to emerge. I place seeds that will DIE, but their brief existence births the cells I actually need."

**The near-miss:** "3 attempts, par was 2. My first attempt used the right general idea (L-shape) but placed it one cell too far left. The growth pattern was correct but offset by 1. If I'd shifted all 3 seeds one cell right, it would have matched on attempt 1."

**Screenshot:** A 6x6 grid showing the final living pattern in green cells, with ghost traces of the original seed positions in lighter green. The target shape overlay confirms the match. Attempts: 3/3. The seed pattern is the share-worthy element -- two players who both solved it can compare their seed placements.

## Difficulty Knobs
1. **Generations K and seed count** (Monday: K=2 generations, 2-3 seeds, target is a simple primitive like a block or blinker; Friday: K=3 generations, 5-6 seeds, target requires composing 2-3 primitives)
2. **Target complexity** (Monday: target is 3-4 cells in a known primitive shape; Friday: target is 8-12 cells requiring multiple interacting growth zones)
3. **Seed constraint** (Monday: some seeds pre-placed, player adds 1-2; Friday: all seeds placed by player, no hints)
4. **Attempt budget** (Monday: 5 attempts to match target; Friday: 2 attempts, requiring strong prediction before pressing "Grow")

---
<!-- BELOW THIS LINE: filled by engineer and playtester, not designer -->

## Solver Metrics

Computed on 5 puzzles (Mon-Fri seeds), each at its matching difficulty (Mon=1, Fri=5).

| Metric | Mon | Tue | Wed | Thu | Fri | Avg |
|---|---|---|---|---|---|---|
| Solvability | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| Puzzle Entropy | 4.5 | 11.0 | 18.5 | 20.9 | 23.7 | 15.7 |
| Skill-Depth | 0% | 100% | 100% | 100% | 100% | 80% |
| Decision Entropy | 4.52 | 4.52 | 5.09 | 5.06 | 5.54 | 4.95 |
| Counterintuitive | 0 | 2 | 3 | 1 | 4 | 2.0 |
| Drama | 0.24 | 0.60 | 0.33 | 0.56 | 0.41 | 0.43 |
| Duration (ms) | 0 | 3 | 27 | 26 | 30 | 17 |
| Info Gain Ratio | 23.0 | 8.0 | 7.2 | 6.0 | 8.2 | 10.5 |
| Solution Uniqueness | 1 | 2 | 10 | 1 | 1 | 3.0 |

**Auto-kill check**: FAILED -- Decision Entropy > 4.5 (avg 4.95)

Decision Entropy is high because Bloom2 is a simultaneous placement game: the player places all seeds at once, and each placement has ~20-40 candidate cells. The per-step entropy (log2 of legal placements at each sequential step) naturally exceeds 4.5 when grids are 5x5 or larger. This is structural to constraint-satisfaction placement games -- the "too many equivalent choices" concern may be mitigated by the fact that the constraint (matching the target after simulation) is extremely tight, but the metric as defined triggers the kill.

**Weakest metric**: Decision Entropy -- 4.95 (exceeds 4.5 threshold; inherent to placement-on-grid mechanic)
**Strongest metric**: Skill-Depth -- 80% (random play almost never finds the solution; strategic understanding of growth primitives is essential)

## Play Report
<!-- Playtester fills this with blind play observations -->

## Decision
<!-- Designer fills this after reviewing metrics + play report -->
<!-- Status: keep / iterate / kill -->
