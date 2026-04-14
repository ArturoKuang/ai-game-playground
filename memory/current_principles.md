# Current Principles

_Generated from the SQLite memory store._

## Priority scoring by clash-value groups beats sequential reveal
- Namespace: leetcode
- Type: principle
- Status: emerging
- Confidence: 0.75
- Scope tags: hash-set, optimization, solver-design
- Why it matters: Sequential L5 only won 6% of puzzles. Priority scoring raised solvability to 100% and reduced reveals by 30%.
- Statement: L5 solver prioritizes cells in groups with known clash values, finding clashes faster than sequential scanning. Mirrors skilled Sudoku validator behavior.

## Hidden information defeats visual scanning for set membership games
- Namespace: leetcode
- Type: principle
- Status: emerging
- Confidence: 0.74
- Scope tags: efficiency-gap, hash-set, hidden-information
- Why it matters: Grid Lock (killed) had perfect alignment but failed because visual scanning substituted for hash set tracking. Spot Check solves this by hiding frequencies behind energy-gated reveals.
- Statement: When teaching hash set membership, hiding the data forces players to build mental registries rather than visually scanning. The reveal-to-learn mechanic creates cumulative energy costs that produce strong efficiency gaps.

## L2 sector-blind mechanic creates natural difficulty breakpoint
- Namespace: leetcode
- Type: principle
- Status: emerging
- Confidence: 0.71
- Scope tags: difficulty-progression, hash-set, solver-design
- Why it matters: Previous version had L2 doing full scans at all difficulties with minimal 2.9% gap. Sector-blind at D3+ raised gap to 62% win-rate.
- Statement: Making brute-force solver skip sector/box checks at D3+ creates a natural breakpoint where sector-only clashes go undetected, modeling realistic beginner behavior.

## Set complement deduction creates the aha moment for membership games
- Namespace: leetcode
- Type: principle
- Status: emerging
- Confidence: 0.68
- Scope tags: aha-moment, deduction, hash-set
- Why it matters: Strategy evolution from reveal-all to track-and-deduce mirrors Valid Sudoku algorithm progression.
- Statement: When N-1 values in a group of N are known, the last value is deducible without spending a resource. This set complement reasoning IS the key aha moment for hash set membership.

## Tighter budgets at D4-D5 ensure monotonic L2 decline
- Namespace: leetcode
- Type: principle
- Status: emerging
- Confidence: 0.56
- Scope tags: budget-design, difficulty-progression, two-pointers
- Why it matters: Initial D4/D5 budgets of 32 and 50 allowed L2 to win 60% at D4 by completing 3+ rounds. Tightening to 28 and 44 made L2 win rates monotonically decline to 20% and 0%.
- Statement: When teaching two-pointer convergence, D4 and D5 budgets must be calibrated so sequential reveal (L2) cannot complete enough rounds. Budget should be roughly (rounds * tilesPerRow * 0.6) to keep L5 at 100% solvability while forcing L2 below 20%.

## Non-palindrome early exit is the core efficiency driver for two-pointer games
- Namespace: leetcode
- Type: principle
- Status: emerging
- Confidence: 0.55
- Scope tags: efficiency-gap, palindrome, two-pointers
- Why it matters: L5 saves ~6 reveals per non-palindrome round via early exit (2 vs 8 reveals). This differential drives the 26% efficiency gap. Without sufficient non-palindrome rounds, the gap would be minimal.
- Statement: In palindrome detection games, the efficiency gap between two-pointer (L5) and sequential (L2) comes almost entirely from non-palindrome rounds where early mismatch detection saves reveals. Palindrome rounds require similar effort from both strategies.

## Shared budget across rounds creates natural two-pointer pressure
- Namespace: leetcode
- Type: principle
- Status: emerging
- Confidence: 0.52
- Scope tags: budget-design, difficulty-progression, efficiency-gap, two-pointers
- Why it matters: The shared budget is what makes the two-pointer approach necessary rather than optional. Without budget pressure, sequential reveal works fine. The budget creates the learning moment.
- Statement: When a reveal/action budget is shared across multiple classification rounds, budget pressure at D3+ forces players to discover early-exit strategies (like two-pointer short-circuiting) rather than exhaustive scanning. The crossover happens naturally when total required reveals exceeds budget.

## Noise tiles map directly to skip-non-alphanumeric in palindrome algorithms
- Namespace: leetcode
- Type: principle
- Status: emerging
- Confidence: 0.51
- Scope tags: difficulty-progression, mechanic-mapping, palindrome, two-pointers
- Why it matters: Without noise tiles, the game only teaches basic two-pointer convergence. With them, it also teaches pointer advancement past irrelevant data, which is the key complexity in LC #125.
- Statement: Adding visually distinct noise tiles that must be skipped during palindrome checking directly models the skip-non-alphanumeric step in Valid Palindrome. This creates a second strategy shift at D3+ and deepens the two-pointer teaching beyond simple pair comparison.

## Classification games with hidden information pass the Stare Test naturally
- Namespace: leetcode
- Type: principle
- Status: emerging
- Confidence: 0.50
- Scope tags: game-design, hidden-information, stare-test, two-pointers
- Why it matters: Previous games like Grid Lock failed because visible information allowed visual scanning to substitute for algorithmic thinking. Hidden-information classification games avoid this failure mode entirely.
- Statement: Games where the player must classify hidden sequences (reveal-then-decide) inherently pass the Stare Test because no amount of visual inspection reveals hidden information. This makes them ideal vehicles for teaching pointer-based algorithms where information access order matters.

## Asymmetric cost creates natural crossover
- Namespace: leetcode
- Type: principle
- Status: candidate
- Confidence: 0.44
- Scope tags: cost-design, difficulty-progression, prefix-suffix
- Why it matters: The probe vs scan cost structure (1 vs 2 energy) means probing is cheaper for small grids but scanning wins for large ones. This crossover IS the algorithmic insight: brute force works for small n, prefix/suffix wins for large n.
- Statement: When the naive approach costs O(n) and the optimal approach has constant cost but higher per-unit price, setting the per-unit price so the crossover happens at D3 difficulty creates the ideal discovery arc.

## Batch-reveal teaches frequency counting
- Namespace: leetcode
- Type: principle
- Status: candidate
- Confidence: 0.39
- Scope tags: frequency-counting, hash-map
- Why it matters: Players learn to tally by type instead of flipping individually, which is O(k) vs O(n).
- Statement: Tallying one tile reveals ALL tiles of that type, mapping to freq[key]++ for every occurrence.

## Binary trick algorithms need discovery not depth
- Namespace: leetcode
- Type: principle
- Status: candidate
- Confidence: 0.37
- Scope tags: insight-games, prefix-suffix, replay
- Why it matters: Once the player discovers two sweeps solve everything, every puzzle plays the same. Replay comes from difficulty ladder and execution satisfaction, not strategic depth.
- Statement: For algorithms that are a single insight (like prefix/suffix decomposition), design the game around the DISCOVERY moment rather than deep strategic replay. Difficulty progression and tight budgets provide replay motivation.

