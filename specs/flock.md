# Flock

## Rules
Tap a direction (up/down/left/right) to slide ALL birds simultaneously until each hits a wall or another bird. Group all same-colored birds into connected clusters to win within par moves.

## Mechanic Type
Constraint Satisfaction

## Why It Works

### Stare Test
All positions are visible, but 12-16 birds sliding simultaneously with collision physics creates combinatorial explosion that defeats mental simulation. With 4 directions per move and ~6-10 moves needed, a 6-move look-ahead requires evaluating 4^6 = 4,096 sequences, each involving 12+ birds with pairwise collision resolution. Human working memory caps at 4-7 objects; tracking 12 birds with collision across 3+ moves is well beyond mental simulation capacity. This is the same reason Sokoban and chess pass the stare test despite full visibility -- not hidden info, but COMBINATORIAL EXPLOSION of interactions.

### Dominant Strategy Test
"Move toward the biggest cluster" fails immediately. Moving right groups the red birds but scatters the blues that were already adjacent. The cost of every move is INCOMMENSURABLE: whether moving right is good depends on whether you later plan to move up (which would re-scatter reds) or down (which might collect greens). Moving right first then up gives a fundamentally different board than up first then right, because collision order and stopping positions depend on the full multi-body physics at each step. Each move affects ALL birds simultaneously -- there's no way to help one color without potentially disrupting another.

### Family Test
Global-direction simultaneous-agent grouping. This is NOT:
- IceSlide (single agent, goal is reach-target, not grouping)
- Herd (per-color directional commands -- Flock has ONE command for ALL birds)
- 2048 (merge + spawn + optimization -- Flock has grouping constraint satisfaction, no merging, no spawning, no score)
- Loop (ring rotation -- no agents)
- Push/slide (single block -- Flock moves everything)

The defining feature: ONE input moves EVERY piece, and the goal is constraint satisfaction (all same-colored adjacent) not optimization. The closest analog is the "ice floor" puzzle family (Sokoban on ice), but applied to multi-agent clustering rather than single-agent navigation. The interaction between colors creates the depth -- you cannot help one color without affecting all others.

## Predicted Failure Mode
**Most likely death: accidental solves on easy days (too few birds).** Monday with 2 colors x 3 birds = 6 birds might cluster in 2-3 random moves. Mitigation: even Monday must have birds positioned so that naive directional moves scatter at least one color while grouping another. Minimum 3 colors on all days.

**Second risk: stalemate oscillation.** If grouping red requires right-then-up but grouping blue requires up-then-right, the player might oscillate without progress. Mitigation: the solver must verify that all seeds have monotonically-progressing solutions (each move brings at least one color closer to clustered).

**Third risk: A10 on small boards.** A 5x5 grid with 6 birds might be mentally tractable for strong solvers. Mitigation: use 6x6 grid and minimum 10 birds to ensure collision interactions exceed working memory.

**Anti-pattern proximity: A10 (fully visible).** The defense is combinatorial explosion from simultaneous multi-body movement. If the puzzles end up having short solutions (2-3 moves), staring will work and the game is dead. Solutions MUST be 5+ moves with counterintuitive intermediate states.

## Expected Metrics
| Metric | Prediction | Reasoning |
|---|---|---|
| Puzzle Entropy | 18-25 | 10-16 birds x 36 grid positions x collision interactions. 4 options per move x 6-10 moves = genuine search depth. |
| Skill-Depth | 60-80% | Multi-body collision planning rewards deep thinking. Random directions almost never cluster all colors; strategic sequencing (group blues first because they're closest, then fix reds) is essential. |
| Counterintuitive Moves | 2-4 | "Move LEFT to group the reds even though reds need to go RIGHT" -- because left-then-right creates different collision stops than just right. Detour moves through intermediate scattering states are the heart of the puzzle. CI comes from non-commutative collision physics: right-then-up != up-then-right. |
| Drama | 0.5-0.7 | 2 of 3 colors clustered, one move from winning, but the last move scatters one of the solved colors. Near-miss inherent to the all-move-together mechanic. |
| Decision Entropy | 1.5-2.0 | 4 directions per move, but typically 1-2 are clearly bad (scatter everything) and 2-3 are viable with different tradeoffs. |
| Info Gain Ratio | 2.0-3.0 | Strategic players should dramatically outperform random movers. Collision physics reward careful sequencing. |

## Player Experience
**Opening (5s):** A colorful 6x6 grid. Red birds, blue birds, green birds -- scattered across the board. You see the goal: cluster each color. You swipe RIGHT. All 12 birds slide right simultaneously, bonking into walls and each other. Three red birds collide into a cluster against the right wall. But the blues, which were almost touching, get separated by a red bird that slid between them. Immediately you feel it: "Every move helps AND hurts."

**Middle (2-3min):** Three moves in. Reds are clustered (right wall), greens are close (two groups of 2, one gap between them). Blues are scattered -- one in each corner. You need to move UP to merge the green groups, but that will pull two red birds off the cluster (they'll slide up away from the others). You stare at the board. Wait -- if you move LEFT first, the lone blue on the right slides left into the blue pair on row 3. That gives you a blue triplet. Then UP merges greens without breaking blues (they're already against the top wall). But LEFT un-clusters the reds... unless that red bird stops against the green bird in column 2. You trace the collision: yes! The red stops early because of the green blocker. LEFT is safe for reds AND groups a blue. This is the aha.

**Ending (30s):** One color left ungrouped. You see it: one move does it. You swipe DOWN -- all the green birds slide together, the last one clicks into place against a wall. All three colors clustered. Done in 7 moves, par was 8. Screenshot: a 6x6 emoji grid showing birds in their final clustered positions with colored arrows showing your move sequence. 

**The aha moment:** "LEFT looks like it breaks the reds, but the green bird acts as a wall that stops the red in exactly the right place." Using one color's positions as collision barriers for another color.

**The near-miss:** "If I'd gone UP before LEFT, the green blocker would have moved away and the red would have slid all the way to the wall, breaking the cluster. Move ORDER is everything."

## Difficulty Knobs
1. **Number of colors and birds** (Monday: 3 colors x 3 birds on 6x6 = 9 agents with moderate collision density; Friday: 4 colors x 3-4 birds on 6x6 = 12-16 agents with dense collisions and complex interaction chains)
2. **Initial scatter quality** (Monday: birds start near-clustered with 1-2 colors already adjacent, requiring only 2-3 "fix" moves with 1 detour; Friday: birds start maximally scattered with interleaved colors requiring 4-5 counterintuitive intermediate states)
3. **Par moves** (Monday: par = optimal + 3, generous margin; Friday: par = optimal + 1, demands near-perfect sequencing)

---
<!-- BELOW THIS LINE: filled by engineer and playtester, not designer -->

## Solver Metrics

Computed on 5 puzzles (Mon-Fri seeds), 5 skill levels each. Solver: IDA* with admissible heuristic (sum of components-1 per color).

| Metric | Mon | Tue | Wed | Thu | Fri | Avg |
|---|---|---|---|---|---|---|
| Solvability | 5/5 | 5/5 | 5/5 | 4/5 | 4/5 | 100% (L5) |
| Optimal Steps | 7 | 5 | 7 | 10 | 9 | 7.6 |
| Puzzle Entropy | 14.0 | 10.0 | 14.0 | 20.0 | 18.0 | 15.2 |
| Skill-Depth | 91.4% | 87.8% | 86.5% | 86.5% | 88.9% | 88.2% |
| Decision Entropy | 1.82 | 1.40 | 1.58 | 1.73 | 1.72 | 1.65 |
| Counterintuitive | 3 | 1 | 1 | 4 | 4 | 2.6 |
| Drama | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| Duration (s) | 0.001 | 0.001 | 0.001 | 0.002 | 0.001 | 0.001 |
| Info Gain Ratio | 1.52 | 2.93 | 16.14 | 12.10 | 13.33 | 9.21 |
| Solution Uniqueness | 2 | 1 | 1 | 1 | 1 | 1.2 |

Skill scores by level (moves to solve):
- Mon: L1=81, L2=8, L3=8, L4=7, L5=7
- Tue: L1=41, L2=5, L3=18, L4=5, L5=5
- Wed: L1=52, L2=7, L3=7, L4=7, L5=7
- Thu: L1=74, L2=10, L3=10, L4=fail, L5=10
- Fri: L1=81, L2=9, L3=9, L4=fail, L5=9

**Auto-kill check**: PASSED
**Weakest metric**: Decision Entropy -- 1.65 (good range 1.5-3.5, barely in range; some moves have a clearly dominant direction)
**Strongest metric**: Skill-Depth -- 88.2% (random play uses ~10x more moves than optimal; strategic sequencing is essential)

## Play Report
<!-- Playtester fills this section with blind play observations -->

## Decision
<!-- Designer fills this after reviewing metrics + play report -->
<!-- Status: keep / iterate / kill -->
<!-- If iterate: what to change and why -->
<!-- If kill: lesson learned for learnings.md -->
