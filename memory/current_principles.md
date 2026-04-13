# Current Principles

_Generated from the SQLite memory store._

## Priority scoring by clash-value groups beats sequential reveal
- Namespace: leetcode
- Type: principle
- Status: emerging
- Confidence: 0.77
- Scope tags: hash-set, optimization, solver-design
- Why it matters: Sequential L5 only won 6% of puzzles. Priority scoring raised solvability to 100% and reduced reveals by 30%.
- Statement: L5 solver prioritizes cells in groups with known clash values, finding clashes faster than sequential scanning. Mirrors skilled Sudoku validator behavior.

## Hidden information defeats visual scanning for set membership games
- Namespace: leetcode
- Type: principle
- Status: emerging
- Confidence: 0.76
- Scope tags: efficiency-gap, hash-set, hidden-information
- Why it matters: Grid Lock (killed) had perfect alignment but failed because visual scanning substituted for hash set tracking. Spot Check solves this by hiding frequencies behind energy-gated reveals.
- Statement: When teaching hash set membership, hiding the data forces players to build mental registries rather than visually scanning. The reveal-to-learn mechanic creates cumulative energy costs that produce strong efficiency gaps.

## L2 sector-blind mechanic creates natural difficulty breakpoint
- Namespace: leetcode
- Type: principle
- Status: emerging
- Confidence: 0.73
- Scope tags: difficulty-progression, hash-set, solver-design
- Why it matters: Previous version had L2 doing full scans at all difficulties with minimal 2.9% gap. Sector-blind at D3+ raised gap to 62% win-rate.
- Statement: Making brute-force solver skip sector/box checks at D3+ creates a natural breakpoint where sector-only clashes go undetected, modeling realistic beginner behavior.

## Set complement deduction creates the aha moment for membership games
- Namespace: leetcode
- Type: principle
- Status: emerging
- Confidence: 0.70
- Scope tags: aha-moment, deduction, hash-set
- Why it matters: Strategy evolution from reveal-all to track-and-deduce mirrors Valid Sudoku algorithm progression.
- Statement: When N-1 values in a group of N are known, the last value is deducible without spending a resource. This set complement reasoning IS the key aha moment for hash set membership.

## Asymmetric cost creates natural crossover
- Namespace: leetcode
- Type: principle
- Status: emerging
- Confidence: 0.46
- Scope tags: cost-design, difficulty-progression, prefix-suffix
- Why it matters: The probe vs scan cost structure (1 vs 2 energy) means probing is cheaper for small grids but scanning wins for large ones. This crossover IS the algorithmic insight: brute force works for small n, prefix/suffix wins for large n.
- Statement: When the naive approach costs O(n) and the optimal approach has constant cost but higher per-unit price, setting the per-unit price so the crossover happens at D3 difficulty creates the ideal discovery arc.

## Batch-reveal teaches frequency counting
- Namespace: leetcode
- Type: principle
- Status: candidate
- Confidence: 0.43
- Scope tags: frequency-counting, hash-map
- Why it matters: Players learn to tally by type instead of flipping individually, which is O(k) vs O(n).
- Statement: Tallying one tile reveals ALL tiles of that type, mapping to freq[key]++ for every occurrence.

## Binary trick algorithms need discovery not depth
- Namespace: leetcode
- Type: principle
- Status: candidate
- Confidence: 0.39
- Scope tags: insight-games, prefix-suffix, replay
- Why it matters: Once the player discovers two sweeps solve everything, every puzzle plays the same. Replay comes from difficulty ladder and execution satisfaction, not strategic depth.
- Statement: For algorithms that are a single insight (like prefix/suffix decomposition), design the game around the DISCOVERY moment rather than deep strategic replay. Difficulty progression and tight budgets provide replay motivation.

