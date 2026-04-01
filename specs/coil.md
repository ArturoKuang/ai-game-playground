# Coil

## Rules
Tap a spring to release it in its facing direction, pushing everything in its path one cell. Springs pushed into walls gain +1 compression; at compression 5 they auto-release in all 4 directions. Get all springs to target positions within par releases.

## Mechanic Type
Constraint Satisfaction

## Why It Works

### Stare Test
All spring positions, facing directions, and compression levels are visible, but the PUSH CHAIN propagation defeats mental simulation. Releasing spring A (facing right) pushes spring B one cell right. If B is now against a wall, B gains +1 compression. If B was already at compression 4, it hits 5 and auto-releases in all 4 directions, pushing springs C, D, E, and F. Each of those might chain further. On a 6x6 grid with 10 springs, releasing one spring can trigger a cascade affecting 4-8 other springs, each moving to new positions and potentially gaining compression that triggers further auto-releases. Planning 2 releases ahead requires simulating two full cascade trees, each with branching factor 4 at every auto-release node. The exponential cascade tree exceeds working memory for boards with 3+ springs at compression 3-4.

### Dominant Strategy Test
"Release the spring closest to its target position" fails because the push chain disrupts other springs' positions. Releasing spring A to push it closer to its target might push spring B AWAY from B's target. "Avoid auto-releases" fails because some puzzles REQUIRE auto-releases to move springs that can't be reached by direct release chains. "Set up auto-releases first" fails because the auto-release pushes depend on what's in the release path at the time of auto-release, which changes as other springs move. The cost of each release is INCOMMENSURABLE: whether releasing A is good depends on where B, C, and D end up (via push chains), which depends on whether the player plans to use them as intermediaries in FUTURE push chains.

The ordering of releases is deeply non-commutative. Releasing A then B produces a different board than B then A, because A's push chain repositions springs that B's chain interacts with. This is the same CI source as Surge (cascade collateral) but with DIRECTIONAL physics that creates richer positional consequences.

### Family Test
Directional spring physics with compression cascades. This is NOT:
- IceSlide (single agent sliding to a goal -- Coil has MULTIPLE agents that interact)
- Push/slide (pushing blocks into fixed positions -- Coil's springs have INTERNAL STATE that changes through interaction)
- Surge (sandpile cascade to target values -- Coil targets POSITIONS, not values, and uses directional physics)
- Herd (group movement by color -- Coil has individual spring releases, not group commands)
- Sokoban (pushing single blocks -- Coil's springs push EACH OTHER in chains and auto-release)

The defining novelty: game pieces have INTERNAL STATE (compression 1-5) that changes through interaction (wall collisions) and triggers CASCADING BEHAVIOR (auto-release at 5). This creates a two-layer puzzle: the positional layer (where springs end up) and the compression layer (which springs might auto-release, affecting the positional layer). The compression mechanic means pushing a spring into a wall is not just movement -- it's charging a potential cascade that the player must account for in future plans.

**Unoccupied family**: Directional physics with internal state + compression cascades.

## Predicted Failure Mode
**Most likely death: A9 (cascade unpredictability).** If auto-release chains are too deep (3+ levels), players can't predict the final board state. The push-chain cascade tree branches at every auto-release, and two levels of branching already create 16 possible outcomes. MITIGATION: Limit initial compression levels so that auto-releases are 1-deep on Monday (a spring hits 5, releases, but pushed springs don't also hit 5). On Friday, allow 2-deep cascades, but position springs so the second cascade is PREDICTABLE (only one spring is in the auto-release path, reducing branch factor to 1). The cascade must be PREDICTABLE enough for humans, even if the OPTIMAL use of cascades is non-obvious.

**Second risk: A10 on small boards.** With 6 springs and 4 releases, a patient player can enumerate 6^4 = 1,296 release sequences. MITIGATION: Minimum 8 springs on Monday, 12 on Friday. The push chains reduce the effective choice set (not all springs are useful to release at any point), but the interaction effects prevent simple pruning.

**Third risk: unclear cascade visualization.** If the player can't SEE the push chain propagation (which springs get pushed, which gain compression, which auto-release), the game feels like random outcomes. MITIGATION: Show a cascade PREVIEW on long-press -- highlight the push chain path, show compression changes with animated +1 icons, flash any springs that would auto-release. The player sees WHAT will happen but must judge WHETHER it helps their overall plan.

**Anti-pattern proximity: A9 (cascade unpredictability), A7 (auto-play).** Defense against A9: cascade preview + limited cascade depth. Defense against A7: auto-releases are triggered BY player actions and are PREDICTABLE, not random. The player deliberately sets up auto-releases as part of their strategy.

## Expected Metrics
| Metric | Prediction | Reasoning |
|---|---|---|
| Puzzle Entropy | 18-32 | 6x6 grid, 8-12 springs, 5-8 releases needed. Each release triggers a push chain that repositions 1-4 springs. The directional physics + compression state creates ~10^4 reachable board states from any position. Non-commutative release order multiplies the effective state space. |
| Skill-Depth | 45-70% | Strategic players identify "setup sequences" -- releases that position springs as intermediaries for later push chains, and deliberately charge springs to compression 4 so that a final push triggers a useful auto-release. Greedy players (release the spring closest to its target) disrupt other springs' positions and trigger unwanted auto-releases. The gap between "plan 3 releases ahead" and "plan 1 release ahead" should be large. |
| Counterintuitive Moves | 3-5 | "Release this spring AWAY from its target" -- because the push chain repositions two other springs toward THEIR targets, and the released spring will be pushed back toward its target by a later auto-release. Also: "Push this spring INTO a wall (away from target)" -- to charge it to compression 5, so its auto-release pushes 3 other springs into place simultaneously. Deliberate charging for future auto-releases is the core CI source. |
| Drama | 0.5-0.8 | Near-miss: "7 of 8 springs in position. The last spring is one cell off. If I'd pushed spring C into the north wall instead of the east wall, its auto-release would have pushed the last spring south to the target. But I used the north wall push for a different chain, and now there's no way to move the last spring without displacing the others." |
| Decision Entropy | 2.0-3.5 | 8-12 releasable springs per turn, but push-chain analysis prunes to 3-6 meaningful choices (springs whose release produces useful chains). The directional nature focuses attention on springs aligned with targets along cardinal directions. |
| Info Gain Ratio | 2.0-3.5 | Strategic players achieve ~2 springs correctly positioned per release (through push chains). Greedy players achieve ~1 per release and frequently displace previously-correct springs. The push-chain exploitation creates a large skill gap. |

## Player Experience
**Opening (10s):** A 6x6 grid with colorful springs -- coiled symbols with arrow indicators showing facing direction. Some springs are tightly coiled (compression 4, shown in red/orange), others loosely coiled (compression 1-2, shown in blue/green). Below the grid, target positions shown as faint outlines matching each spring's color. Budget: 6 releases. You see a green spring facing right at (2,1), and its target is at (2,4). Three cells to the right, with a yellow spring at (2,3) between them. Releasing green would push it to (2,2) and push yellow from (2,3) to (2,4)... but (2,4) is GREEN's target, not yellow's. You look at yellow's target: (4,3). Pushing yellow right is wrong for yellow. But wait -- there's a wall at (2,6), and if yellow gets pushed to the wall, it gains compression. Yellow is at compression 3. Pushed to wall = compression 4. Then if another spring pushes yellow again... compression 5 = auto-release! Yellow's auto-release from (2,6) would push springs in all 4 directions. You trace the paths. An auto-release at (2,6) would push the red spring at (1,6) upward -- exactly where red needs to go. This is getting interesting.

**Middle (2min):** Three releases in. Green is at its target (2,4). Yellow got pushed to the wall, compression now 4. Red is one cell from target. The northwest corner has three springs in a cluster, none at their targets. You see a setup: releasing the blue spring (facing down) pushes orange into the south wall (compression 3 -> 4), and orange's facing direction is left, toward the cluster. If you then push orange again (compression 4 -> 5), orange auto-releases, sending a push wave left into the cluster, right (off the wall, harmless), up (empty), and down (empty). The leftward push from orange would push purple and cyan one cell each -- purple to its target, cyan one past its target. Almost. You need cyan one cell LEFT of where the auto-release would put it. Could you release cyan left FIRST, then trigger the auto-release? Release cyan left (1 move), then release blue down to charge orange (1 move), then push orange into the wall (1 move), auto-release cascade puts purple in place. That's 3 moves for 3 springs (cyan, purple, orange). Efficient!

**Ending (15s):** Last release. Everything is in position except the charged yellow spring at (2,6) with compression 4. Yellow's target is (4,3) -- far away. But if you release the white spring facing left at (2,8)... wait, that's off-grid. You look at what can push yellow. If you push yellow with a release from (2,7)... there's nothing there. The only way to move yellow is to trigger its auto-release by pushing it to compression 5. Push it into the wall again? Yellow is already at the wall. You need something to push INTO yellow. The teal spring at (3,6) faces up. Releasing teal pushes nothing (empty above). But teal at (3,6) -- if you release teal, it moves up, past (2,6) where yellow sits. Teal pushes yellow up from (2,6) to (1,6). That's not yellow's target. But yellow's compression was 4, and getting pushed... wait, yellow wasn't pushed into a wall, it was pushed into open space. Compression doesn't increase from being pushed -- only from hitting walls. Yellow is now at (1,6), compression 4, still not at target. This is the near-miss moment.

**The aha moment:** "I need to push spring D AWAY from its target into the wall -- not to move D, but to CHARGE it to compression 5. Its auto-release will push three other springs into position simultaneously. One 'wasteful' charge saves three direct releases."

**The near-miss:** "6 releases, par was 6. All springs in position except spring D. I used the wall to charge spring B for an auto-release, but I charged the WRONG wall -- if I'd pushed B into the south wall instead of the east wall, B's auto-release direction would have pushed D into place as a bonus. Same number of moves, one different wall choice."

**Screenshot:** A 6x6 emoji grid showing spring positions with directional arrows and compression indicators (coil tightness). Target outlines shown as dashed borders. Springs at compression 4-5 shown in warning colors. "Coil #42: 6/6 releases. All springs home."

## Difficulty Knobs
1. **Spring count and compression distribution** (Monday: 8 springs, all compression 1-2, no auto-releases needed; Friday: 14 springs, 4+ at compression 3-4, requiring deliberate auto-release chains to solve within budget)
2. **Release budget tightness** (Monday: budget = optimal + 3, room for trial-and-error; Friday: budget = optimal + 1, requiring efficient push chains with no wasted releases)
3. **Grid size and spring density** (Monday: 5x5 grid, springs well-separated, push chains are short and clear; Friday: 7x7 grid, springs clustered, push chains interact and auto-releases have multiple targets in their paths)
4. **Auto-release cascade depth** (Monday: no cascading auto-releases; Friday: 1-2 auto-releases that trigger secondary auto-releases, requiring 2-level cascade planning)

---
<!-- BELOW THIS LINE: filled by engineer and playtester, not designer -->

## Solver Metrics
<!-- Engineer fills this section with raw computed metrics -->

## Play Report
<!-- Playtester fills this section with blind play observations -->

## Decision
<!-- Designer fills this after reviewing metrics + play report -->
<!-- Status: keep / iterate / kill -->
