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

## Play Report
<!-- Playtester fills this section with blind play observations -->

## Decision
<!-- Designer fills this after reviewing metrics + play report -->
<!-- Status: keep / iterate / kill -->
<!-- If iterate: what to change and why -->
<!-- If kill: lesson learned for learnings.md -->
