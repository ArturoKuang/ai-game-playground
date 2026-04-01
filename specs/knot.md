# Knot

## Rules
Draw a single closed loop on a grid that passes through every marked cell. Some cells have hidden directional constraints (entry/exit directions) revealed only when the loop reaches them. Complete the loop within par segments.

## Mechanic Type
Constraint Satisfaction

## Why It Works

### Stare Test
The marked cells (which the loop must pass through) are all visible, and the grid structure is known. But the DIRECTIONAL CONSTRAINTS are hidden -- revealed only when the player's loop reaches a marked cell. The player sees "loop must pass through cell (3,2)" but does NOT know that (3,2) requires entering from the left and exiting upward until the loop actually arrives. This means the player cannot pre-plan the entire route. They commit to a partial loop, discover a directional constraint that may conflict with their current trajectory, and must adapt in real time. This is the Wordle structure: act (extend the loop), get feedback (discover directional constraint), revise strategy (reroute).

The hidden directional constraints create PROGRESSIVE REVELATION. After the loop passes through 3 of 8 marked cells, the player knows 3 directional constraints and can use them to reason about the remaining 5 (e.g., "if cell (3,2) requires entering from the left, then the loop must approach from the left side, which means it can't also be passing through (3,1) in that segment"). But the remaining 5 constraints are still unknown, so the player is reasoning under PARTIAL information -- the classic structure that defeats A10.

The state space is also rich: on a 6x6 grid with 8 marked cells, the number of Hamiltonian-like loops passing through all marked cells is enormous. The directional constraints prune this dramatically, but the player only discovers the pruning AS they build. The effective planning horizon is 2-3 cells ahead, because directional constraints at the next marked cell might invalidate any longer plan.

### Dominant Strategy Test
"Connect the nearest marked cell" fails because directional constraints might force the loop to approach from a specific direction, requiring a detour AWAY from the cell before entering it correctly. A marked cell at (3,4) with a "must enter from below" constraint means the loop must come from (4,4), not (3,3) or (2,4) -- even if those are closer to the previous cell. The player must DISCOVER this by reaching the cell, then potentially backtrack (using undo at move cost) or plan a route that approaches from the correct direction.

"Explore marked cells closest to the grid edge first" fails because edge cells constrain the loop's overall shape -- committing to an edge route early might make it impossible to reach interior cells from the required direction. "Explore interior cells first" fails because interior cells have more possible entry/exit directions, making their constraints less informative early.

The incommensurable cost: extending the loop toward cell A (revealing A's constraint) might force a reroute that makes reaching cell B from B's required direction impossible. Whether to explore A or B first depends on their (hidden) constraints -- a genuine information-value tradeoff.

### Family Test
Loop drawing with hidden directional constraints. This is NOT:
- PathWeaver (open path, no loop; no hidden constraints)
- Slitherlink/Walls (boundary loop with numeric edge clues -- Knot has a through-cell loop with hidden directional constraints)
- Coil (spring pushing -- completely different mechanic)
- Loop (ring rotation -- different interaction type entirely)
- Any deduction game (Knot has spatial construction, not just inference)

The defining novelty is the COMBINATION of spatial construction (drawing a loop on a grid, which is tactile and satisfying) with hidden information revealed through construction (directional constraints appear as the loop reaches cells). The loop must be CLOSED (return to start), creating a global constraint that interacts with local directional constraints. The player is simultaneously a BUILDER (constructing a loop) and a DETECTIVE (discovering constraints).

**Unoccupied family**: Loop/network drawing with hidden constraints and progressive revelation.

## Predicted Failure Mode
**Most likely death: hidden constraints feel arbitrary.** If the directional constraints don't "make sense" -- if they feel randomly assigned rather than part of a coherent structure -- the player will feel that the game is punishing them for not being psychic. MITIGATION: the directional constraints must be GENERATED from a valid solution. The generator first draws a valid loop, then assigns directional constraints based on that loop's actual entry/exit at each cell. This guarantees solvability AND makes the constraints feel "fair" in retrospect ("of course the loop enters from the left there -- that's the only way to also reach cell (4,3) from below"). Additionally, the FIRST marked cell the player reaches should have a "generous" constraint (one that's compatible with multiple approach directions) to avoid instant frustration.

**Second risk: backtracking feels punishing.** If the player extends the loop 6 cells, hits a directional constraint that invalidates the route, and must undo all 6 cells, the game is frustrating, not fun. MITIGATION: (a) Undo is available but costs +1 to move count (P2 -- undo with cost preserves tension). (b) The generator ensures that no directional constraint requires undoing more than 3 segments to reroute. (c) Show a "warning glow" when the loop is heading toward a marked cell from an incompatible direction -- not revealing the constraint, but hinting "you might want to reconsider your approach angle." This is partial information (P1) that reduces frustration without trivializing the puzzle.

**Third risk: the loop closure constraint is too hard.** The loop must return to its starting cell after passing through all marked cells. On larger grids, finding ANY Hamiltonian-like loop is hard. MITIGATION: the loop does NOT need to visit every cell -- only the MARKED cells. The remaining cells are empty corridor. With 8 marked cells on a 6x6 grid (36 cells), the loop uses ~18-22 cells (about 50-60% of the grid), leaving ample routing space. The generator validates that multiple valid loops exist (not just one), so the player has flexibility.

**Anti-pattern proximity: A10 (if constraints were all visible).** The hidden constraints are the specific defense against A10. Without hidden info, this would be a Slitherlink variant (A4 + A10). With hidden info, each loop extension is a genuine decision under uncertainty.

## Expected Metrics
| Metric | Prediction | Reasoning |
|---|---|---|
| Puzzle Entropy | 15-28 | 6x6 grid, 6-10 marked cells, loop must pass through all. With hidden directional constraints, the effective state space is pruned progressively as constraints are revealed. Each puzzle has 3-8 valid loops given all constraints, but the player discovers constraints incrementally. Entropy measures the total information in the decision sequence. |
| Skill-Depth | 45-70% | Strategic players reason about approach angles: "Cell (3,4) is surrounded by 3 already-visited cells, so it can only be entered from the 4th direction. I should leave that direction open by routing my loop accordingly." They plan 2-3 cells ahead, anticipating likely constraints based on grid geometry. Greedy players (nearest cell first) hit more conflicts and waste more undo moves. |
| Counterintuitive Moves | 2-4 | "Extend the loop AWAY from the nearest marked cell" -- to approach a different marked cell from the correct direction (just discovered), which then enables reaching the first marked cell from a compatible angle. Also: "Loop through empty corridor instead of directly connecting two adjacent marked cells" -- because the directional constraints at both cells are incompatible with a direct connection. Detour routing is the core CI source. |
| Drama | 0.5-0.7 | Near-miss: "Loop passed through 7 of 8 marked cells, but the last cell requires entering from below, and the loop's current endpoint is ABOVE the cell. Closing the loop through the cell requires a 5-cell detour that conflicts with closing the loop back to start." The tension between reaching the last cell and closing the loop creates natural drama. |
| Decision Entropy | 2.0-3.5 | At each extension step, the player has 2-4 viable next cells (adjacent, not yet visited). After revealing a directional constraint, some options are eliminated, leaving 2-3 genuine choices. Rich enough for comparison without being overwhelming. |
| Info Gain Ratio | 2.0-3.0 | Strategic players use revealed constraints to infer likely constraints at unreached cells: "This cell enters from the left, so the loop must be coming from the west side of the grid here. The next marked cell to the northwest probably requires entering from below (since the loop will be heading north)." This inference reduces wasted exploration. |

## Player Experience
**Opening (10s):** A 6x6 grid with 8 marked cells (glowing dots). A starting cell in the bottom-left corner is highlighted -- this is where the loop begins and must end. You tap (1,0) -- the cell adjacent to the start. The loop extends, shown as a thick colored line. You head north toward the nearest marked cell at (3,0). You reach (3,0) -- the cell reveals its constraint with a brief animation: an arrow showing "enter from below, exit right." Perfect -- you entered from below (coming from (2,0)). The constraint is satisfied, and the cell glows gold. The loop must now exit to the right. You extend to (3,1).

**Middle (2min):** Five marked cells passed. The loop has formed an S-shape across the grid. Two marked cells remain: (1,4) and (4,5). You're currently at (3,3). The nearest is (1,4) -- two cells up and one right. You extend the loop upward: (2,3), (1,3), (1,4). Constraint revealed: "enter from the right, exit upward." But you entered from the LEFT (coming from (1,3)). Conflict! The cell flashes red. You need to approach (1,4) from the RIGHT side -- from (1,5). You undo 3 segments (3 moves added to count, per P2 cost). Now at (3,3) again. You route the loop RIGHT first: (3,4), (3,5), (2,5), (1,5), (1,4). This time you enter from the right. Constraint satisfied! The detour cost 3 extra segments but 0 undos. You exit upward from (1,4) to (0,4). One marked cell left: (4,5). You need to loop down to (4,5) and then back to the start at (0,0).

**Ending (15s):** The loop is at (0,4). You need to reach (4,5) -- far south. Route: (0,5), (1,5)... wait, (1,5) is already part of the loop. Can't revisit. You go (0,5), then down the east edge: (1,5) is blocked. No -- you route through the interior: (0,4), (0,3), (0,2), (0,1), (0,0)... but that closes the loop without reaching (4,5). Stuck. You undo back to (0,4) and rethink. The loop must somehow reach (4,5) from the north side of the grid. You see it: route through the center: (0,4), (0,5), (1,5), (2,5) -- wait, (1,5) is already in the loop from the detour. The S-shape used (1,5). This is the near-miss moment: the earlier detour to approach (1,4) from the right used the cells you now need. If you'd found a different route to (1,4) that avoided (1,5) and (2,5), the south path would be open. One routing decision in the middle determined the endgame.

**The aha moment:** "I shouldn't rush to the nearest marked cell -- I need to think about HOW I approach it, because the approach direction is constrained. Going east first opens the south corridor for later, even though it's away from the immediate target."

**The near-miss:** "22 segments, par was 20. The detour at cell (1,4) used 3 extra segments AND blocked the corridor I needed for cell (4,5). If I'd routed through row 2 instead of row 1 for the approach, I'd have saved the segments AND kept the corridor open."

**Screenshot:** A 6x6 grid showing the completed loop as a thick colored path weaving through marked cells (gold dots). Directional arrows visible at each marked cell. Loop segments colored by order (cool-to-warm gradient). "Knot #42: 20 segments, 8/8 cells. Par: 20."

## Difficulty Knobs
1. **Marked cell count and grid size** (Monday: 5 marked cells on 5x5, short loop with simple routing; Friday: 10 marked cells on 7x7, long loop requiring careful corridor management)
2. **Directional constraint tightness** (Monday: each marked cell has 3 compatible approach directions, generous routing; Friday: each marked cell has only 1-2 compatible directions, forcing specific approaches with minimal flexibility)
3. **Hidden vs. revealed constraints** (Monday: 2 of 5 directional constraints are pre-revealed, reducing uncertainty; Friday: all constraints hidden, maximum discovery-through-play)
4. **Par generosity** (Monday: par = optimal + 4, room for 2 undos and a detour; Friday: par = optimal + 1, requiring near-perfect routing with minimal backtracking)

---
<!-- BELOW THIS LINE: filled by engineer and playtester, not designer -->

## Solver Metrics (v2 — colored borders, reset wipes constraints)

Computed on 5 puzzles (Mon-Fri seeds), 5 skill levels each.

| Metric | Mon | Tue | Wed | Thu | Fri | Avg |
|---|---|---|---|---|---|---|
| Solvability | Y | Y | Y | Y | Y | 100% |
| Puzzle Entropy | 14.7 | 11.2 | 20.3 | 21.0 | 26.8 | 18.80 |
| Skill-Depth | 100% | 100% | 100% | 100% | 100% | 100% |
| Decision Entropy | 1.47 | 1.24 | 1.45 | 1.50 | 1.34 | 1.40 |
| Counterintuitive | 0 | 1 | 2 | 2 | 4 | 1.80 |
| Drama | 1.00 | 0.18 | 0.73 | 0.67 | 0.70 | 0.66 |
| Duration (s) | 0.01 | 0.01 | 0.01 | 0.01 | 0.02 | 0.01 |
| Info Gain Ratio | 1.63 | 1.44 | 1.31 | 1.29 | 1.19 | 1.37 |
| Solution Uniqueness | 1 | 1 | 1 | 1 | 1 | 1 |

**Auto-kill check**: PASSED
**Weakest metric**: Decision Entropy -- 1.40 avg (low end of good range; constraint-guided routing narrows choices at each step, but stays above 1.0 threshold)
**Strongest metric**: Skill-Depth -- 100% avg (random play never finds solution; strategic play always does. Reset-wipes-constraints further increases skill-depth since probe-then-plan exploit is blocked)

## Play Report

```
BLIND PLAY REPORT
=================
Game: Knot
Commit: 26f3f39

BUGS FOUND:
- None. All interactions worked correctly. No console errors (only standard React dev warnings).

SESSION 1 — INTUITIVE PLAY:
Rules clarity: The written instructions ("Draw a loop through all marked cells. Constraints reveal on arrival.") gave me the high-level goal within seconds. However, the MEANING of the directional constraints (the arrow symbols like "↑→") took approximately 8-10 taps and multiple resets before I truly understood them. I initially thought the arrows described the direction of travel, but through trial and error I discovered they describe which WALLS of the cell the path passes through.

My first attempt was catastrophic: I traced the entire right edge of the grid going clockwise around the perimeter, reaching 12 segments and 0/7 cells visited. My second attempt went straight down through the center and hit the first purple dot with a constraint violation. My third attempt tried approaching purple dots from different angles. Each time, hitting a red constraint cell felt like useful information. The undo and reset buttons worked well and I used them frequently. The core loop of explore -> discover constraint -> undo -> reroute is the game's central pleasure and it works well.

SESSION 2 — STRATEGIC PLAY:
Strategy found: Map out which walls each purple dot's constraint requires, then construct a single path that satisfies all constraints simultaneously — essentially working backward from the constraints.
Strategy helped: Yes, dramatically. Session 1 was all fumbling; Session 2 produced a clean 13-segment solve (under par of 15) on the first attempt after planning.

I spent time before touching the board planning a complete path that would satisfy all known constraints. The key insight was realizing that the seven purple dots with their constraints essentially define a fixed sub-path. Once I identified this mandatory chain, the only remaining question was how to connect the ends — which was trivially a straight line up and a single step right. The strategic approach was VASTLY more efficient. Every single constraint turned green on first contact. The satisfaction of watching each constraint light up green as I followed my planned path was the best moment of the entire playtest. The game strongly rewards planning over intuition.

SESSION 3 — EDGE CASES:
Dominant strategy: No dominant strategy exists — each puzzle has unique constraint placements that require puzzle-specific reasoning. However, there IS a systematic approach: probe each purple dot to reveal its constraint, record them, then construct a path satisfying all constraints simultaneously.
Can fail: Yes — constraint violations prevent winning.
Exploits found: The constraint information persists after undo/reset within the same page load (revealed constraints stay visible even after resetting). This means you can systematically reveal ALL constraints by probing each dot, then reset and plan a perfect path. This may be intentional design. One minor observation: the game allows going arbitrarily over par with no penalty.

EXPERIENCE SUMMARY:
Confusion points: (1) The arrow constraint notation (↑→, ←↓, etc.) is not explained. Had to discover meaning through experimentation. (2) Red constraint cells — unclear whether "permanently violated" or "not yet determined." (3) Whether loop needed to ONLY pass through purple dots or could use empty cells.
Surprise moments: (1) First constraint reveal — seeing "↑→" appear was a genuine "oh!" moment. (2) Green validation when correctly matching a constraint was very satisfying. (3) Realizing all constraints chain together to force a specific sub-path was an aha moment.
Boring moments: (1) Session 1, tracing perimeter for 12 moves with 0/7 cells visited. (2) After solving, completed board is static with no replay option.
Best moment: Session 2, watching all seven constraint cells light up green in sequence as I executed my pre-planned path.
Worst moment: Session 1, reaching 12 segments on the perimeter with 0/7 purple dots visited.

STRATEGY DIVERGENCE:
The divergence between intuitive and strategic play is ENORMOUS and is the game's greatest strength. Session 1 was characterized by blind exploration, constant constraint violations, multiple resets, and never completing the puzzle. Session 2 produced a flawless 13-segment solve on the very first try. The game fundamentally rewards the learning loop: probe -> discover -> remember -> plan -> execute. Strategic planning produces dramatically better outcomes.
```

## Decision

**Status: ITERATE (1 of 3)**

**Metrics assessment**: Strong profile. Entropy=18.8 (LightsOut-tier), skill-depth=70% (excellent), CI=1.8 (matches Loop), drama=0.66 (solid tension arc), IGR=1.37 (strategic play pays off). DE=1.40 is the weakest metric -- low end of acceptable but above the 1.0 red flag threshold. Overall this is one of the strongest metric profiles we have seen.

**Play report assessment**: The playtester confirmed enormous strategy divergence (the game's greatest strength), genuine aha moments, and no bugs. Two concerns:

1. **Arrow constraint notation confusing** (took 8-10 taps to understand). The playtester initially misread the arrows as direction-of-travel rather than wall-entry/exit constraints. This is a d1 (clarity) issue -- the notation is text-based and abstract. The fix is visual, not mechanical: replace arrow text with visual wall indicators (highlighted cell edges showing which walls the path passes through, like colored borders on the entry/exit sides). The player should SEE the constraint, not READ it.

2. **Probe-then-reset exploit**: The playtester discovered that constraints persist after undo/reset. This means a player can systematically probe every marked cell to reveal ALL constraints, then reset and plan a perfect path with full information. This collapses the game into A10 after the probing phase -- exactly the failure mode the hidden constraints were designed to prevent. This MUST be fixed: constraints must be wiped on reset. Each playthrough must be genuine progressive discovery. Undo should preserve already-revealed constraints (you earned that info by reaching the cell), but full reset must wipe them.

**What to change (spec revisions)**:

### Rules (revised)
Draw a single closed loop on a grid that passes through every marked cell. Some cells have hidden directional constraints (entry/exit walls) revealed only when the loop reaches them. Constraints are shown as highlighted cell borders, not arrow text. Full reset clears all discovered constraints.

### Constraint Display (new)
Replace arrow notation (e.g., "up-arrow right-arrow") with colored cell borders: the entry wall glows blue, the exit wall glows gold. The player sees WHICH SIDES of the cell the path must pass through, not an abstract symbol. This leverages spatial reasoning (the player is already thinking about directions while routing the loop) rather than symbol decoding.

### Reset Behavior (revised)
- **Undo** (retract last segment): preserves all discovered constraints. The player earned this information by reaching the cell.
- **Full reset** (clear entire loop): wipes ALL discovered constraints. The player must re-discover them. This prevents the probe-all-then-plan exploit and preserves progressive revelation as the core gameplay loop.
- **Cost**: undo still costs +1 to move count. Reset has no direct cost but loses all discovered information.

### Difficulty Knobs (revised)
Keep all 4 existing knobs. Add a 5th:
5. **Constraint memory** (Monday: 1 previously-discovered constraint persists through reset, giving a free hint; Friday: no constraints persist, full amnesia on reset)

## v2 Play Report

```
BLIND PLAY REPORT (v2)
======================
Game: Knot
Commit: 3997d7f

BUGS FOUND:
- Grid cells do not respond to standard mouse click events. Only touch events (touchscreen.tap) work. Desktop browser users clicking with a mouse may experience the same issue.
- Undo and Reset buttons positioned below visible viewport on smaller screen heights (800x600).

SESSION 1 — INTUITIVE PLAY:
Rules clarity: Took 5-6 taps to understand basic interaction. Initial confusion: mouse clicks did nothing, game appeared broken. Once touch-tap on green start cell activated the path, mechanics became clearer. Built path going left, down entire left column, right across bottom, up right column. Every purple cell showed red X (constraint violation). Hit dead end at 15 segments. The constraint borders (blue=entry, gold=exit) were hard to parse — too subtle to determine which side was blue vs gold. Session 1 was frustrating: never got close to winning.

SESSION 2 — STRATEGIC PLAY:
Strategy found: Plan a compact rectangular loop visiting all marked cells with minimal wasted segments.
Strategy helped: Yes, dramatically. Won on first try (13 segments, under par of 15).
Planned compact loop before first tap. 6/7 constraints showed green immediately. Cell (2,4) showed X during building but flipped to green when loop closed (exit direction retroactively satisfied). Win celebration with stars was satisfying. Planning loop shape in advance was the decisive factor.

SESSION 3 — EDGE CASES:
Dominant strategy: Partially — tightest possible loop around marked cells works well, but direction matters. Same loop reversed (counterclockwise vs clockwise) failed completely.
Can fail: Yes, meaningfully. Wasteful paths create dead ends. Reversed direction causes violations.
Exploits found: None. Constraint system prevents brute-force.

EXPERIENCE SUMMARY:
Confusion points: Mouse clicks don't work. Blue/gold borders too subtle. "Constraints reveal on arrival" unclear initially.
Surprise moments: Loop closing retroactively fixing a constraint. Reversed loop failing proved direction matters.
Boring moments: Early exploration when nothing responded. Walking through empty cells with no feedback.
Best moment: Closing loop in Session 2, all 7 constraints green, under par.
Worst moment: First 5 minutes when mouse clicks did nothing — would cause real players to abandon.

STRATEGY DIVERGENCE:
Strategic play dramatically outperformed intuitive play. Key insight: loop must be as compact as possible, traversed in right direction. However, constraint satisfaction felt passive — the "right" compact loop happened to satisfy all constraints without deliberate constraint reasoning. Never needed to read blue/gold borders. Game rewards topological planning more than constraint reasoning on this difficulty. Harder puzzles might require actual constraint analysis.
```

## v2 Decision

**Status: ITERATE (2 of 3) -- final shot**

### Metrics assessment

The numbers are genuinely excellent. Entropy=18.8 puts Knot in LightsOut territory. Skill-depth=100% is the best possible -- random play never solves the puzzle, strategic play always does. CI=1.8 matches Loop (our best kept game by this metric). Drama=0.66 is solid. DE=1.40 and IGR=1.37 both clear their respective thresholds. This is one of the strongest metric profiles in the entire results.tsv -- stronger than Seek, Probe, Fence, or Bloom ever achieved.

For comparison against the kept games:
- Loop: entropy=17.6, CI=1.8, skillDepth=100% -- Knot matches or beats every dimension
- Herd: entropy=28.27, CI=1.2, skillDepth=97.1% -- Knot trades some entropy for higher CI
- Claim: ~18-22 entropy range -- Knot is competitive

The metrics say: this game works mechanically.

### Play report assessment

Two problems, one structural and one cosmetic:

1. **CRITICAL BUG: Mouse clicks don't work.** Only touch events fire. This is a web compatibility showstopper -- desktop users (the majority of daily puzzle players) literally cannot play. This is an implementation bug, not a design flaw, so it doesn't count against the mechanic. But it MUST be fixed.

2. **Constraint borders (blue/gold) still too subtle.** v1 had unreadable arrow notation. v2 replaced it with colored borders. The playtester reports they're still hard to distinguish. However -- and this is the critical observation -- the playtester WON WITHOUT EVER READING THE BORDERS. The compact-loop strategy satisfied constraints passively.

3. **Constraints are vestigial on easy puzzles.** This is the most important finding. The playtester's compact loop strategy satisfied all 7 constraints without deliberate constraint reasoning. The topology did all the work. On the current Monday difficulty, the directional constraints are decorative -- they don't force the player to think differently than they would without them.

This is NOT a fatal flaw. It means the difficulty knobs aren't tuned aggressively enough on the easy end. Monday's constraints are too generous (too many compatible approach directions), so any reasonable loop shape satisfies them. The constraints only become load-bearing when they're TIGHT -- when a cell demands a specific entry direction that conflicts with the natural loop shape.

### What to change for v3

**Fix 1: Mouse input (bug fix).** Click events must work identically to touch events. This is a blocking bug for desktop play.

**Fix 2: Constraint visibility -- use shape, not just color.** Blue/gold borders failed twice. Color-only encoding doesn't work during active spatial reasoning when the player is focused on routing. Replace with: entry side gets a solid triangle/arrow pointing INTO the cell, exit side gets a solid triangle/arrow pointing OUT of the cell. Use shape + color together (entry = blue inward arrow, exit = gold outward arrow). The directional shape is redundant with the color, so even if color is hard to distinguish, the arrow direction tells the story.

**Fix 3: Tighten constraints so they're load-bearing.** The core design revision: constraints must force the player to deviate from the "obvious" compact loop. On the current settings, most constraints are compatible with multiple approach directions, making them passively satisfiable. Tighten:
- Monday: each marked cell has 2 compatible approach directions (was 3). The compact loop still works but the player must think about direction (clockwise vs counterclockwise matters).
- Wednesday: each marked cell has 1-2 compatible approach directions. Some cells will force detours away from the compact shape.
- Friday: each marked cell has exactly 1 compatible approach direction. The loop shape is fully determined by constraints -- the puzzle is figuring out what shape that is through progressive discovery.

This ensures the constraint system is the actual challenge, not a decorative overlay on topology. The playtester noted that clockwise vs counterclockwise matters -- tighter constraints amplify this effect and create genuine constraint reasoning, not passive satisfaction.

**Fix 4: Walking through empty cells needs feedback.** The playtester flagged "walking through empty cells with no feedback" as boring. Each segment extension should have a brief visual pulse (the line grows with a slight overshoot-and-settle animation). The path itself is the primary visual element -- it needs to feel alive.

### Success criteria for v3

If v3 fixes the mouse bug AND the playtester reports having to actively reason about constraints (not just passively satisfy them), this is a KEEP. The metrics are already there. The mechanic is structurally sound. What's missing is (a) basic input working on desktop and (b) constraints that actually constrain.

## Solver Metrics (v3 — mouse input fix, arrow constraints, tighter generation, segment animation)

Computed on 5 puzzles (Mon-Fri seeds), 5 skill levels each.

| Metric | Mon | Tue | Wed | Thu | Fri | Avg |
|---|---|---|---|---|---|---|
| Solvability | Y | Y | Y | Y | Y | 100% |
| Puzzle Entropy | 14.7 | 11.2 | 20.3 | 21.0 | 26.8 | 18.80 |
| Skill-Depth | 100% | 100% | 100% | 100% | 100% | 100% |
| Decision Entropy | 1.47 | 1.24 | 1.45 | 1.50 | 1.34 | 1.40 |
| Counterintuitive | 2 | 0 | 0 | 1 | 2 | 1.00 |
| Drama | 0.27 | 1.00 | 1.00 | 0.13 | 0.70 | 0.62 |
| Duration (s) | 0.01 | 0.01 | 0.01 | 0.01 | 0.02 | 0.01 |
| Info Gain Ratio | 1.34 | 1.30 | 1.33 | 1.21 | 1.20 | 1.28 |
| Solution Uniqueness | 1 | 1 | 1 | 1 | 1 | 1 |

Constraint tightness (v3 improvement):
- Mon: 5/5 tight (turns), 0 loose (straight-through)
- Tue: 6/6 tight, 0 loose
- Wed: 7/7 tight, 0 loose
- Thu: 5/8 tight, 3 loose
- Fri: 10/10 tight, 0 loose

**Auto-kill check**: PASSED
**Weakest metric**: Decision Entropy -- 1.40 avg (low end but above 1.0 threshold; constraint-guided routing narrows choices)
**Strongest metric**: Skill-Depth -- 100% avg (random play never finds solution; strategic play always does)
**v2 -> v3 changes**: Constraint tightness dramatically improved (most cells now at turns, not straight-throughs). CI slightly decreased (1.8 -> 1.0 avg) due to tighter constraints making the optimal path more forced, but still above 0 threshold. Arrow+color constraint indicators replace border-only encoding. Mouse clicks now work via web-compatible Pressable. Segment extension pulse animation added.
