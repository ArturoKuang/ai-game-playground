# Sift

## Rules
Swap tiles on a 5x5 grid to form a double Latin square -- no repeated shape OR color in any row or column. Some swap positions are secretly locked; failed swaps cost a move and reveal the lock.

## Mechanic Type
Constraint Satisfaction

## Why It Works

### Stare Test
The double Latin square constraints are visible, and the player can reason about which tiles need to move. But the HIDDEN LOCKS prevent pre-planning. You cannot compute an optimal swap sequence because you do not know which positions will refuse your swap. Every swap attempt is simultaneously a move AND a probe -- you either make progress (successful swap) or gain information (discovered lock). The player MUST ACT to make progress, and the information revealed through failed swaps changes the plan. This is the Wordle pattern: act, get feedback, revise strategy.

### Dominant Strategy Test
"Swap the most out-of-place tile" depends entirely on which swap targets are available, which you do not know. "Always try the closest valid swap" might work once, but when it fails (locked position), you've spent a move and must reroute. The optimal strategy requires balancing: (a) swaps that fix the most constraint violations if they succeed, (b) swaps that reveal the most useful lock information if they fail, and (c) routing around already-discovered locks. This tradeoff changes with every new piece of information -- no fixed strategy works across puzzles.

### Family Test
Constraint satisfaction with hidden action restrictions. This is NOT:
- Prism (single Latin square + auto-deduction -- killed because auto-deduce removed agency)
- BitMap (all clues visible, no hidden info)
- Seek/Probe (hidden object location -- Sift's hidden element is action AVAILABILITY, not object position)
- Any sorting puzzle (hidden locks make this a hybrid deduction + arrangement game)

The defining novelty: the hidden information is not about WHAT to do (the constraints are visible) but about WHERE you CAN do it. This creates a unique dual-layer puzzle: a visible constraint satisfaction layer (Latin square) and a hidden deduction layer (lock map). The player solves both simultaneously -- each failed swap reveals a lock that changes the arrangement strategy.

## Predicted Failure Mode
**Most likely death: A11 (information asymmetry).** Par computed with full lock knowledge but player starts with no lock knowledge. If locks are too numerous (>30% of positions), the player wastes too many moves on discovery and par feels unachievable. Mitigation: par must be computed based on the SAME information available to players (zero lock knowledge at start), using a solver that discovers locks through failed swaps just like the player does.

**Second risk: A8 (low branching factor).** If too many positions are locked, the player has 1-2 valid swap targets per tile, making the path forced. Mitigation: lock density should be 15-25% of positions -- enough to create routing challenges but not so many that options collapse.

**Third risk: frustration from repeated failures.** If a player's first 3 swaps all fail (bad luck), the opening experience is "nothing works." Mitigation: ensure at least 2 of the 4 corner tiles are unlocked, giving the player guaranteed early success while locks affect mid-board routing.

**Anti-pattern proximity: A10 on the arrangement layer.** The Latin square constraint is fully visible and solvable by staring. The game depends ENTIRELY on the hidden locks creating genuine uncertainty. If locks are too sparse, the game degrades to a pure Latin square (Prism's fate). Lock density must be calibrated to create 3+ "rerouting moments" per puzzle.

## Expected Metrics
| Metric | Prediction | Reasoning |
|---|---|---|
| Puzzle Entropy | 15-22 | 25 positions x 5 colors x 5 shapes = large arrangement space. Hidden locks add an information dimension. ~8-15 swap attempts per puzzle (some fail). |
| Skill-Depth | 40-60% | Strategic players probe systematically (try high-value swaps first, using failures to map locks). Random swappers waste moves on locked positions. The dual-layer puzzle (arrangement + deduction) rewards players who track lock info. |
| Counterintuitive Moves | 2-4 | "Swap tile A to position X even though position Y is better for the Latin square" -- because position Y is likely locked based on previous failures. Also: intentionally attempting a swap you expect will fail, purely to reveal a lock that disambiguates the remaining arrangement. Probing moves that sacrifice progress for information are genuinely counterintuitive. |
| Drama | 0.5-0.7 | Late-game often has 2-3 tiles remaining with 1 known lock blocking the obvious solution. The player must find an alternative arrangement that routes around the lock. The "will this last swap work or am I locked out?" tension is inherent. |
| Decision Entropy | 2.5-3.5 | ~25 possible swaps per turn (any two tiles), but Latin square constraints reduce viable options to ~5-8. Lock knowledge further prunes. Rich but not overwhelming. |
| Info Gain Ratio | 1.5-2.5 | Strategic players conserve moves by deducing lock patterns from spatial clues (locks tend to cluster). Random players waste 30-50% of moves on locked positions. |

## Player Experience
**Opening (10s):** A 5x5 grid of tiles, each with a shape (circle, square, triangle, star, diamond) and a color (red, blue, green, yellow, purple). Row 1 has two red circles -- needs fixing. You tap the first red circle, then tap the blue star in row 3 to swap them. Click -- they swap with a satisfying slide animation. Row 1 is closer to correct. You try another swap: move the green triangle to column 4. CLUNK -- the tile shakes and bounces back. A small lock icon fades in on that position. You've discovered a locked position. It cost you a move, but now you know: column 4, row 2 is locked. Route around it.

**Middle (2-3min):** Six moves in. You've mapped 3 locks (shown as subtle lock overlays on the grid). The Latin square is taking shape -- rows 1-3 are clean, but row 4 has a duplicate color. The obvious fix is to swap the purple star from (4,2) to (4,5), but (4,5) is locked. Alternative: swap it to (4,3), which works for row 4's color constraint but creates a shape duplicate in column 3. Unless... you first swap the triangle from (4,3) to (5,3) -- that frees (4,3) for the star without breaking column 3. But is (5,3) locked? You haven't tried it. The decision: take the known-safe 2-swap route that uses an extra move, or risk the 1-swap shortcut that might bounce.

**Ending (30s):** Two tiles left to place. One known lock blocks the direct swap. You see the alternative: a 3-tile rotation -- swap A to B, B to C, C to A's original position. Two swaps instead of one, but all positions are known-unlocked from earlier probes. You execute. Both swaps click. Grid complete -- every row and column has unique shapes and colors. 11 moves, par was 12. The lock at (4,5) forced the creative routing. Screenshot: a grid of emoji shapes with lock icons marking the hidden barriers you discovered.

**The aha moment:** "That failed swap at (4,5) wasn't wasted -- it told me I need to route the purple star through (4,3) via the triangle, and the triangle through (5,3). The lock SHAPED my solution."

**The near-miss:** "If I'd probed (5,3) earlier instead of (2,4), I would have known it was safe and saved 2 moves. The order I discover locks determines my efficiency."

## Difficulty Knobs
1. **Lock density** (Monday: 3-4 locks on 25 positions = 12-16%, minimal rerouting needed; Friday: 7-8 locks = 28-32%, multiple critical paths blocked, requiring creative multi-swap routing)
2. **Initial disorder** (Monday: grid starts with 3-4 tiles out of place, most rows/columns already Latin; Friday: grid starts with 8-10 tiles scrambled, requiring full reconstruction around locks)
3. **Par calculation** (Monday: par = lock-aware optimal + 4, generous for discovery; Friday: par = lock-aware optimal + 1, demands efficient probing and minimal wasted swaps)

---
<!-- BELOW THIS LINE: filled by engineer and playtester, not designer -->

## Solver Metrics

Computed on 5 puzzles (Mon-Fri seeds), 5 skill levels each.

| Metric | Mon | Tue | Wed | Thu | Fri | Avg |
|---|---|---|---|---|---|---|
| Solvability | 100% | 100% | 100% | 100% | 100% | 100% |
| Puzzle Entropy | 31.2 | 38.4 | 67.4 | 80.9 | 93.7 | 62.3 |
| Skill-Depth | 100% | 100% | 100% | 100% | 100% | 100% |
| Decision Entropy | 2.67 | 2.92 | 2.91 | 2.85 | 2.85 | 2.84 |
| Counterintuitive | 0 | 0 | 0 | 1 | 0 | 0.2 |
| Drama | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| Duration (ms) | 88 | 110 | N/A | N/A | N/A | ~99 |
| Info Gain Ratio | 2.04 | 1.77 | 1.50 | 1.46 | 1.39 | 1.63 |
| Solution Uniqueness | 1 | 2 | 1 | 2 | 2 | 1.6 |

### Solve steps by skill level

| Day | L1 | L2 | L3 | L4 | L5 |
|---|---|---|---|---|---|
| Mon | FAIL | 4 | 4 | 4 | 4 |
| Tue | FAIL | 6 | 6 | 5 | 5 |
| Wed | FAIL | FAIL | FAIL | 9 | 9 |
| Thu | FAIL | FAIL | FAIL | 22 | 11 |
| Fri | FAIL | FAIL | FAIL | 28 | 20 |

Lock density: Mon 12%, Tue 16%, Wed 20%, Thu 24%, Fri 28%.

**Auto-kill check**: PASSED
**Weakest metric**: Counterintuitive Moves -- 1 total across all puzzles (barely passes threshold of >=1). The double Latin square constraint landscape allows most optimal solutions to monotonically reduce violations. The hidden locks create routing challenges but rarely force heuristic-worsening moves in the optimal path.
**Strongest metric**: Skill-Depth -- 100% (random play cannot solve any puzzle; strategic play solves all). Decision Entropy 2.84 is solidly in the good range, indicating meaningful choices at each step.

## Solver Metrics (v2)

Computed on 5 puzzles (Mon-Fri seeds), 5 skill levels each. CI measured from greedy solver (L2) path which represents typical player experience (hits locks, must reroute). Other metrics from lock-naive solver path.

| Metric | Mon | Tue | Wed | Thu | Fri | Avg |
|---|---|---|---|---|---|---|
| Solvability | 100% | 100% | 100% | 100% | 100% | 100% |
| Puzzle Entropy | 55.6 | 24.5 | 32.6 | 40.8 | 73.3 | 45.4 |
| Skill-Depth | 100% | 100% | 100% | 100% | 100% | 100% |
| Decision Entropy | 2.68 | 2.72 | 2.65 | 2.43 | 2.32 | 2.55 |
| Counterintuitive | 3 | 0 | 0 | 0 | 0 | 0.6 |
| Drama | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| Duration (ms) | 5 | 2 | 3 | 4 | 6 | 4 |
| Info Gain Ratio | 14.27 | 26.26 | 18.93 | 14.88 | 8.47 | 16.56 |
| Solution Uniqueness | 1 | 2 | 1 | 1 | 3 | 1.6 |

### Solve steps by skill level (v2)

| Day | L1 | L2 | L3 | L4 | L5 |
|---|---|---|---|---|---|
| Mon | FAIL | 7 | FAIL | 2 | 2 |
| Tue | FAIL | 3 | 4 | 3 | 3 |
| Wed | FAIL | 4 | 4 | 4 | 4 |
| Thu | FAIL | 5 | 5 | 5 | 5 |
| Fri | FAIL | 9 | 8 | 7 | 7 |

### Par calibration (v2)

Par = lock-naive solver optimal + buffer (Mon +3, Fri +2).

| Day | Naive Steps | Par | Lock Density | Initial Violations |
|---|---|---|---|---|
| Mon | 2 | 5 | 12% | 6 |
| Tue | 3 | 6 | 16% | 15 |
| Wed | 4 | 6 | 20% | 14 |
| Thu | 5 | 7 | 24% | 15 |
| Fri | 7 | 9 | 28% | 23 |

### v2 changes implemented

1. **Interior lock placement**: Locks placed in rows 1-3, cols 1-3 (0-indexed) to create routing detours while keeping corners unlocked for early success.
2. **Controlled disorder**: Monday targets 3 tiles out of place (1 cycle), Friday targets 10 (multiple cycles + swaps). Disorder scales via cycle count.
3. **Lock-naive par**: Par computed using a solver that starts with zero lock knowledge and discovers locks through failed swaps, matching player information. Buffer: Mon +3, Fri +2.
4. **UX fixes**: Selection indicator upgraded to 4px cyan border with shadow glow. Pressable component handles both touch and mouse events natively.

**Auto-kill check**: PASSED
**Weakest metric**: Counterintuitive Moves -- 3 total, concentrated on Monday (greedy solver hits locks and must reroute). Tue-Fri greedy solver finds smooth paths. The double Latin square constraint landscape remains fundamentally smooth for strategic players; CI depends on the player attempting greedy swaps that happen to hit interior locks.
**Strongest metric**: Skill-Depth -- 100% (random play cannot solve any puzzle; strategic play solves all). Decision Entropy 2.55 is solidly in the good range. Par calibration now realistic: Mon par 5 (naive 2 + buffer 3), Fri par 9 (naive 7 + buffer 2).

## Play Report

**BUG (minor)**: Game requires touch events, not mouse clicks. Desktop browser without touch emulation silently ignores clicks.
**BUG (minor)**: Selection indicator (tile border highlight) too subtle — missed for 2 full sessions.

**Session 1 (Intuitive)**: Rules clear after 2-3 taps. "Swap tiles so no shape or color repeats" is straightforward. First swap dropped Conflicts 23→20, felt great. But subsequent moves oscillated 19-24 with no steady improvement. Discovered locked tiles on move 5 — genuine surprise ("trap springing"). Ended 10 moves / 24 conflicts (WORSE than start). Game felt overwhelming.

**Session 2 (Strategic)**: Strategy = map board first, find swaps that fix row AND column constraints simultaneously. Reached 17 conflicts in 8 moves (at par), solving Row 1 entirely. But couldn't get below 17 — fixing one row breaks columns. Patch-break-repatch cycle. Lock mechanic adds real cognitive load.

**Session 3 (Edge Cases)**: No dominant strategy. Greedy does not converge. Can fail meaningfully (conflicts increase). Tapping same tile twice = deselect (no move cost). Lock reveal costs inconsistent (sometimes 0, sometimes 1 move). Neither session solved the puzzle.

**Strategy Divergence**: Strategic play DRAMATICALLY better than intuitive (17 conflicts in 8 moves vs 24 in 10). Planning which swaps fix multiple constraints is genuine skill. But neither approach solved the puzzle — gap between "somewhat strategic" and "optimal" seems very large. Par 8 from 23 conflicts requires near-perfect play. May be too hard for casual players.

**Best Moment**: Session 2 move 7 — swapping tiles dropped conflicts cleanly from 20→17. Strategy paying off.
**Worst Moment**: Session 1 ending at 24 conflicts (worse than start) after 10 moves of trying. No feedback that play was wrong.

## Decision

**Status: ITERATE (iteration 1 of 3)**

**Reason:** The dual-layer mechanic (visible Latin square + hidden locks) is structurally novel and creates genuine surprise. Skill-Depth 100% and Decision Entropy 2.84 are excellent. Strategic play dramatically outperforms intuitive (17 conflicts in 8 moves vs 24 in 10). But two problems must be fixed:

**Problem 1: Par is unachievable.** Neither playtest session solved the puzzle. The player ended at 17 conflicts after 8 moves (at par) but could not reach 0. Par must be calibrated so that a strategic human player can actually WIN, not just improve. The experience of "I played well but still lost" kills retention. Monday par should allow 30-40% wasted moves (failed lock probes). Friday can be tight.

**Problem 2: CI is too low (1.0).** The double Latin square constraint landscape is too smooth -- optimal solutions monotonically reduce violations. The game needs situations where the player must INCREASE conflicts temporarily to route around a lock cluster. Possible fix: increase lock density in the CENTER of the grid (not edges) so that obvious swaps are blocked and the player must take detour swaps that temporarily worsen the board. The aha should be: "I need to make this row WORSE so I can unlock a path to fix two rows at once."

**What the game should feel like after iteration:** The player should be able to solve Monday in 6-8 moves with 1-2 lock discoveries. Friday should take 12-15 moves with 4-5 lock discoveries and at least 2 moments where the "obvious" swap is blocked and the player must find a creative reroute. Every session should end with the puzzle SOLVED (0 conflicts), not abandoned at a plateau.

**Specific spec changes:**
1. Reduce initial disorder on Monday (2-3 tiles out of place, not 4+). Keep Friday at 8-10.
2. Recompute par using a lock-naive solver that discovers locks through failed swaps (matching player information). Add generous buffer: par = lock-naive optimal + 3 on Monday, + 2 on Friday.
3. Place locks preferentially in grid interior (rows 2-4, columns 2-4) to create routing detours without blocking corner-first strategies that give early success.
4. Fix bugs: selection indicator too subtle (use thick colored border), ensure mouse click works on desktop (not just touch events).
<<<<<<< HEAD
=======

## Play Report (v2)

**CRITICAL BUG**: Lock toast ("Locked! That position cannot be swapped.") never auto-dismisses. Persists indefinitely and blocks ALL tile interaction. Game softlocked after any lock encounter. Reproducible 100%.

**BUG (minor)**: Swapping two identical tiles (same color + shape) is permitted, costs a move, reduces nothing. No feedback.

**Session 1 (Intuitive)**: Rules immediately clear. Selection indicator (cyan ring) now visible and satisfying. First good swap (r1c2↔r5c4) dropped conflicts 18→15 — genuine aha. But internal swap within row raised conflicts 18→19 (row fixes create column conflicts). Discovered lock at r3c4 — dramatic padlock icon + toast. Game then froze. After restart, reached 7 moves with all rows solved but all columns broken (12 conflicts). Did not solve.

**Session 2 (Strategic)**: Strategy = identify locks as anchors, plan swaps satisfying both axes. Discovered second lock at r2c3. Toast bug froze game at move 3. Strategic analysis revealed: row-by-row solving provably fails (12 column conflicts remain). True solution requires global constraint propagation. Cut short by bug.

**Session 3 (Edge Cases)**: No dominant strategy. Greedy fails. Can fail meaningfully. Deselect (tap same tile twice) works correctly (no move cost). Lock reveals cost inconsistently. Game frozen by toast bug in every session.

**Strategy Divergence**: Strategic play qualitatively different from intuitive — analyzing constraints across both axes vs reactive swapping. Strategic revealed genuine depth (competing row/column constraints, locks as anchors). But toast bug prevented completing any strategic session. CANNOT determine if puzzle is solvable in practice.

**Best Moment**: First good swap dropping conflicts 18→15 while solving Row 1 completely.
**Worst Moment**: Toast freeze at move 3 of strategic session, losing all progress and blocking further play.

## Decision (v2)

**Status: ITERATE (iteration 2 of 3)**

**Reason:** The dual-layer mechanic remains structurally promising. Skill-Depth 100%, Decision Entropy 2.55, and Info Gain Ratio 16.56 are all excellent. CI improved from 0.2 to 0.6, showing the interior lock placement is moving in the right direction. The playtester confirmed genuine strategic depth -- competing row/column constraints create qualitatively different play from intuitive swapping, and lock discovery as strategic anchoring is a novel feel. However, two blockers prevent KEEP:

**Problem 1: CRITICAL BUG -- toast softlock.** The lock discovery toast never auto-dismisses and blocks ALL tile interaction, making the game unplayable after any lock encounter. This is a showstopper that prevented either playtest session from completing the puzzle. The toast must auto-dismiss after 1-2 seconds or be replaced with a non-blocking visual indicator (e.g., the padlock icon fading in on the locked cell is sufficient feedback without any overlay toast).

**Problem 2: CI still low (0.6).** The greedy solver finds smooth paths on Tue-Fri. The constraint landscape needs more situations where the player must temporarily INCREASE conflicts to route around lock clusters. The interior lock placement from v2 is correct in principle but needs to be denser or more strategically placed so that the "obvious" swap is blocked more often, forcing creative reroutes that worsen one axis to fix another.

**Problem 3: Identical-tile swap.** Swapping two tiles with the same color AND shape is permitted, costs a move, and accomplishes nothing. This should be blocked with a shake animation and no move cost.

**What the game should feel like after this iteration:** The player discovers 2-3 locks per session, each one creating a genuine "well, now what?" rerouting moment. The toast bug is gone -- lock discovery is communicated through the padlock icon appearing on the cell with a brief bounce animation, not a blocking overlay. Monday is solvable in 5-7 moves. Friday requires 9-12 moves with at least 2 moments where the greedy swap is blocked and the player must find a creative multi-swap reroute that temporarily worsens one constraint to satisfy another.

**Specific spec changes for v3:**
1. Replace the lock toast with a non-blocking visual indicator (padlock icon fade-in + cell shake). No overlay, no modal, no toast.
2. Block identical-tile swaps (same color + same shape) with a shake animation and no move cost.
3. Increase lock density slightly on Wed-Fri (Wed: 24%, Thu: 28%, Fri: 32%) to force more rerouting moments and push CI higher. Keep Mon-Tue unchanged.
4. Place at least one lock adjacent to the highest-violation tile on each puzzle, ensuring the "obvious first swap" is blocked and the player must find an alternative entry point. This is the primary CI driver.

## Solver Metrics (v3)

Computed on 5 puzzles (Mon-Fri seeds), 5 skill levels each. CI measured from greedy solver (L2) path which represents typical player experience (hits locks, must reroute). Other metrics from lock-naive solver path.

| Metric | Mon | Tue | Wed | Thu | Fri | Avg |
|---|---|---|---|---|---|---|
| Solvability | 100% | 100% | 100% | 100% | 100% | 100% |
| Puzzle Entropy | 55.6 | 24.5 | 32.6 | 49.0 | 57.0 | 43.7 |
| Skill-Depth | 100% | 100% | 100% | 100% | 100% | 100% |
| Decision Entropy | 2.66 | 2.72 | 2.52 | 2.33 | 2.16 | 2.48 |
| Counterintuitive | 3 | 0 | 0 | 0 | 0 | 0.6 |
| Drama | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| Duration (ms) | 4 | 2 | 2 | 4 | 4 | 3 |
| Info Gain Ratio | 14.26 | 26.26 | 18.12 | 11.91 | 10.16 | 16.14 |
| Solution Uniqueness | 1 | 2 | 1 | 1 | 1 | 1.2 |

### Solve steps by skill level (v3)

| Day | L1 | L2 | L3 | L4 | L5 |
|---|---|---|---|---|---|
| Mon | FAIL | 7 | FAIL | 2 | 2 |
| Tue | FAIL | 3 | 4 | 3 | 3 |
| Wed | FAIL | FAIL | FAIL | 4 | 4 |
| Thu | FAIL | FAIL | FAIL | 6 | 6 |
| Fri | FAIL | FAIL | FAIL | 7 | 7 |

### Par calibration (v3)

Par = lock-naive solver optimal + buffer (Mon +3, Fri +2).

| Day | Naive Steps | Par | Lock Density | Initial Violations |
|---|---|---|---|---|
| Mon | 2 | 5 | 12% | 6 |
| Tue | 3 | 6 | 16% | 15 |
| Wed | 4 | 6 | 24% | 14 |
| Thu | 6 | 8 | 28% | 19 |
| Fri | 7 | 9 | 32% | 21 |

### v3 changes implemented

1. **Toast bug fixed**: Removed blocking toast/feedbackBar entirely. Lock discovery now communicated via inline padlock icon fade-in animation (400ms) + cell shake (250ms). No overlay, no modal, no toast. Game is never blocked.
2. **Identical-tile swap blocked**: Swapping two tiles with same color AND shape now triggers shake animation on both tiles with zero move cost. Handled in both UI (Sift.tsx handleTap) and solver (legalMoves already excluded these in v2).
3. **Increased lock density Wed-Fri**: Wed 24% (6 locks), Thu 28% (7 locks), Fri 32% (8 locks). Mon 12% and Tue 16% unchanged. Solvability verified via beam search (width 2000) with fallback regeneration.
4. **Adjacent lock to highest-violation tile**: On each puzzle, at least one lock is placed adjacent to the tile with the most row/column violations. This is achieved by relocating an existing lock (never adding extra). Ensures the "obvious first swap" is blocked.

**Auto-kill check**: PASSED
**Weakest metric**: Counterintuitive Moves -- 3 total, all on Monday (greedy solver hits locks and must reroute). Tue-Fri greedy solver finds smooth paths despite increased lock density. The double Latin square constraint landscape remains fundamentally smooth; CI depends on greedy solver hitting locks that force reroutes. CI avg = 0.6, which passes auto-kill (>0) but falls short of the designer's aspirational target of >= 1.0.
**Strongest metric**: Skill-Depth 100% (random play cannot solve; strategic play solves all). Info Gain Ratio 16.14 indicates huge strategic advantage. Decision Entropy 2.48 in good range. Solvability 100% including Friday at 32% lock density (with fallback regeneration).
>>>>>>> 9f0bf98 (iterate: Sift v3 — toast fix + identical swap block + lock density)
