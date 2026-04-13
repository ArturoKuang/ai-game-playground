# Algorithm Game Design Learnings

This file is auto-generated from the SQLite memory store. Do not edit manually.
Run `node tools/memory-cli.js render` to regenerate.

> **Rule: Never add a learning without evidence. Never keep a learning that contradicts newer evidence.**

---

## How to Use This File

1. **Before designing**: Read the relevant section for the algorithm family you're targeting.
2. **After each cycle**: Learnings are auto-recorded via `record-decision --learnings` and rendered here.

---

## Proven Patterns

- **Priority scoring by clash-value groups beats sequential reveal** (emerging, confidence 0.77) — L5 solver prioritizes cells in groups with known clash values, finding clashes faster than sequential scanning. Mirrors skilled Sudoku validator behavior. (Evidence: Spot Check v1, keep; spot-check v2, keep)

- **Hidden information defeats visual scanning for set membership games** (emerging, confidence 0.76) — When teaching hash set membership, hiding the data forces players to build mental registries rather than visually scanning. The reveal-to-learn mechanic creates cumulative energy costs that produce strong efficiency gaps. (Evidence: Spot Check v1, keep; spot-check v1, keep)

- **L2 sector-blind mechanic creates natural difficulty breakpoint** (emerging, confidence 0.73) — Making brute-force solver skip sector/box checks at D3+ creates a natural breakpoint where sector-only clashes go undetected, modeling realistic beginner behavior. (Evidence: Spot Check v1, keep; spot-check v2, keep)

- **Set complement deduction creates the aha moment for membership games** (emerging, confidence 0.70) — When N-1 values in a group of N are known, the last value is deducible without spending a resource. This set complement reasoning IS the key aha moment for hash set membership. (Evidence: Spot Check v1, keep; spot-check v1, keep)

- **Asymmetric cost creates natural crossover** (emerging, confidence 0.46) — When the naive approach costs O(n) and the optimal approach has constant cost but higher per-unit price, setting the per-unit price so the crossover happens at D3 difficulty creates the ideal discovery arc. (Evidence: power-line v1, keep)

- **Batch-reveal teaches frequency counting** (candidate, confidence 0.43) — Tallying one tile reveals ALL tiles of that type, mapping to freq[key]++ for every occurrence. (Evidence: Tally v1, iterate)

- **Binary trick algorithms need discovery not depth** (candidate, confidence 0.39) — For algorithms that are a single insight (like prefix/suffix decomposition), design the game around the DISCOVERY moment rather than deep strategic replay. Difficulty progression and tight budgets provide replay motivation. (Evidence: power-line v1, keep)

---

## Anti-Patterns

- **Binary penalties create weak efficiency gaps** (emerging, confidence 0.45) — Games with binary failure penalties (lose a life vs no life) create weaker efficiency gaps than games with cumulative cost penalties (each wasted move adds up). For algorithm games, the wrong strategy must produce ACCUMULATED waste, not occasional catastrophic failure. (Evidence: grid-lock v1, kill)

- **Constraint-satisfaction games struggle to teach hash set membership** (candidate, confidence 0.42) — Games that ARE the algorithm problem (Grid Lock IS Sudoku validation) often fail because the game mechanic replaces the algorithmic insight with visual pattern matching. The player learns to scan the board, not to maintain mental hash sets. (Evidence: grid-lock v1, kill)

---

## Algorithm-Specific Notes

### hash-set
- **[USE]** Priority scoring by clash-value groups beats sequential reveal: L5 solver prioritizes cells in groups with known clash values, finding clashes faster than sequential scanning. Mirrors skilled Sudoku validator behavior. — _Why: Sequential L5 only won 6% of puzzles. Priority scoring raised solvability to 100% and reduced reveals by 30%._
- **[USE]** Hidden information defeats visual scanning for set membership games: When teaching hash set membership, hiding the data forces players to build mental registries rather than visually scanning. The reveal-to-learn mechanic creates cumulative energy costs that produce strong efficiency gaps. — _Why: Grid Lock (killed) had perfect alignment but failed because visual scanning substituted for hash set tracking. Spot Check solves this by hiding frequencies behind energy-gated reveals._
- **[USE]** L2 sector-blind mechanic creates natural difficulty breakpoint: Making brute-force solver skip sector/box checks at D3+ creates a natural breakpoint where sector-only clashes go undetected, modeling realistic beginner behavior. — _Why: Previous version had L2 doing full scans at all difficulties with minimal 2.9% gap. Sector-blind at D3+ raised gap to 62% win-rate._
- **[USE]** Set complement deduction creates the aha moment for membership games: When N-1 values in a group of N are known, the last value is deducible without spending a resource. This set complement reasoning IS the key aha moment for hash set membership. — _Why: Strategy evolution from reveal-all to track-and-deduce mirrors Valid Sudoku algorithm progression._
- **[AVOID]** Constraint-satisfaction games struggle to teach hash set membership: Games that ARE the algorithm problem (Grid Lock IS Sudoku validation) often fail because the game mechanic replaces the algorithmic insight with visual pattern matching. The player learns to scan the board, not to maintain mental hash sets. — _Why: Grid Lock had perfect algorithm alignment (100%) but the efficiency gap was too small because visual scanning partially substitutes for set tracking at small grid sizes. The game needs a mechanic where the hash set IS the tool, not where the hash set IS the answer._

### optimization
- **[USE]** Priority scoring by clash-value groups beats sequential reveal: L5 solver prioritizes cells in groups with known clash values, finding clashes faster than sequential scanning. Mirrors skilled Sudoku validator behavior. — _Why: Sequential L5 only won 6% of puzzles. Priority scoring raised solvability to 100% and reduced reveals by 30%._

### solver-design
- **[USE]** Priority scoring by clash-value groups beats sequential reveal: L5 solver prioritizes cells in groups with known clash values, finding clashes faster than sequential scanning. Mirrors skilled Sudoku validator behavior. — _Why: Sequential L5 only won 6% of puzzles. Priority scoring raised solvability to 100% and reduced reveals by 30%._
- **[USE]** L2 sector-blind mechanic creates natural difficulty breakpoint: Making brute-force solver skip sector/box checks at D3+ creates a natural breakpoint where sector-only clashes go undetected, modeling realistic beginner behavior. — _Why: Previous version had L2 doing full scans at all difficulties with minimal 2.9% gap. Sector-blind at D3+ raised gap to 62% win-rate._

### efficiency-gap
- **[USE]** Hidden information defeats visual scanning for set membership games: When teaching hash set membership, hiding the data forces players to build mental registries rather than visually scanning. The reveal-to-learn mechanic creates cumulative energy costs that produce strong efficiency gaps. — _Why: Grid Lock (killed) had perfect alignment but failed because visual scanning substituted for hash set tracking. Spot Check solves this by hiding frequencies behind energy-gated reveals._
- **[AVOID]** Binary penalties create weak efficiency gaps: Games with binary failure penalties (lose a life vs no life) create weaker efficiency gaps than games with cumulative cost penalties (each wasted move adds up). For algorithm games, the wrong strategy must produce ACCUMULATED waste, not occasional catastrophic failure. — _Why: Grid Lock penalized wrong placement with a lost life (binary), so the efficiency gap was only 14%. Pair Up penalized with wasted flips (cumulative), achieving 65%. The algorithm advantage must create graduated, visible waste to hit the 20% threshold._

### hidden-information
- **[USE]** Hidden information defeats visual scanning for set membership games: When teaching hash set membership, hiding the data forces players to build mental registries rather than visually scanning. The reveal-to-learn mechanic creates cumulative energy costs that produce strong efficiency gaps. — _Why: Grid Lock (killed) had perfect alignment but failed because visual scanning substituted for hash set tracking. Spot Check solves this by hiding frequencies behind energy-gated reveals._

### difficulty-progression
- **[USE]** L2 sector-blind mechanic creates natural difficulty breakpoint: Making brute-force solver skip sector/box checks at D3+ creates a natural breakpoint where sector-only clashes go undetected, modeling realistic beginner behavior. — _Why: Previous version had L2 doing full scans at all difficulties with minimal 2.9% gap. Sector-blind at D3+ raised gap to 62% win-rate._
- **[USE]** Asymmetric cost creates natural crossover: When the naive approach costs O(n) and the optimal approach has constant cost but higher per-unit price, setting the per-unit price so the crossover happens at D3 difficulty creates the ideal discovery arc. — _Why: The probe vs scan cost structure (1 vs 2 energy) means probing is cheaper for small grids but scanning wins for large ones. This crossover IS the algorithmic insight: brute force works for small n, prefix/suffix wins for large n._

### aha-moment
- **[USE]** Set complement deduction creates the aha moment for membership games: When N-1 values in a group of N are known, the last value is deducible without spending a resource. This set complement reasoning IS the key aha moment for hash set membership. — _Why: Strategy evolution from reveal-all to track-and-deduce mirrors Valid Sudoku algorithm progression._

### deduction
- **[USE]** Set complement deduction creates the aha moment for membership games: When N-1 values in a group of N are known, the last value is deducible without spending a resource. This set complement reasoning IS the key aha moment for hash set membership. — _Why: Strategy evolution from reveal-all to track-and-deduce mirrors Valid Sudoku algorithm progression._

### cost-design
- **[USE]** Asymmetric cost creates natural crossover: When the naive approach costs O(n) and the optimal approach has constant cost but higher per-unit price, setting the per-unit price so the crossover happens at D3 difficulty creates the ideal discovery arc. — _Why: The probe vs scan cost structure (1 vs 2 energy) means probing is cheaper for small grids but scanning wins for large ones. This crossover IS the algorithmic insight: brute force works for small n, prefix/suffix wins for large n._
- **[AVOID]** Binary penalties create weak efficiency gaps: Games with binary failure penalties (lose a life vs no life) create weaker efficiency gaps than games with cumulative cost penalties (each wasted move adds up). For algorithm games, the wrong strategy must produce ACCUMULATED waste, not occasional catastrophic failure. — _Why: Grid Lock penalized wrong placement with a lost life (binary), so the efficiency gap was only 14%. Pair Up penalized with wasted flips (cumulative), achieving 65%. The algorithm advantage must create graduated, visible waste to hit the 20% threshold._

### prefix-suffix
- **[USE]** Asymmetric cost creates natural crossover: When the naive approach costs O(n) and the optimal approach has constant cost but higher per-unit price, setting the per-unit price so the crossover happens at D3 difficulty creates the ideal discovery arc. — _Why: The probe vs scan cost structure (1 vs 2 energy) means probing is cheaper for small grids but scanning wins for large ones. This crossover IS the algorithmic insight: brute force works for small n, prefix/suffix wins for large n._
- **[USE]** Binary trick algorithms need discovery not depth: For algorithms that are a single insight (like prefix/suffix decomposition), design the game around the DISCOVERY moment rather than deep strategic replay. Difficulty progression and tight budgets provide replay motivation. — _Why: Once the player discovers two sweeps solve everything, every puzzle plays the same. Replay comes from difficulty ladder and execution satisfaction, not strategic depth._

### frequency-counting
- **[USE]** Batch-reveal teaches frequency counting: Tallying one tile reveals ALL tiles of that type, mapping to freq[key]++ for every occurrence. — _Why: Players learn to tally by type instead of flipping individually, which is O(k) vs O(n)._

### hash-map
- **[USE]** Batch-reveal teaches frequency counting: Tallying one tile reveals ALL tiles of that type, mapping to freq[key]++ for every occurrence. — _Why: Players learn to tally by type instead of flipping individually, which is O(k) vs O(n)._

### insight-games
- **[USE]** Binary trick algorithms need discovery not depth: For algorithms that are a single insight (like prefix/suffix decomposition), design the game around the DISCOVERY moment rather than deep strategic replay. Difficulty progression and tight budgets provide replay motivation. — _Why: Once the player discovers two sweeps solve everything, every puzzle plays the same. Replay comes from difficulty ladder and execution satisfaction, not strategic depth._

### replay
- **[USE]** Binary trick algorithms need discovery not depth: For algorithms that are a single insight (like prefix/suffix decomposition), design the game around the DISCOVERY moment rather than deep strategic replay. Difficulty progression and tight budgets provide replay motivation. — _Why: Once the player discovers two sweeps solve everything, every puzzle plays the same. Replay comes from difficulty ladder and execution satisfaction, not strategic depth._

### constraint-satisfaction
- **[AVOID]** Binary penalties create weak efficiency gaps: Games with binary failure penalties (lose a life vs no life) create weaker efficiency gaps than games with cumulative cost penalties (each wasted move adds up). For algorithm games, the wrong strategy must produce ACCUMULATED waste, not occasional catastrophic failure. — _Why: Grid Lock penalized wrong placement with a lost life (binary), so the efficiency gap was only 14%. Pair Up penalized with wasted flips (cumulative), achieving 65%. The algorithm advantage must create graduated, visible waste to hit the 20% threshold._
- **[AVOID]** Constraint-satisfaction games struggle to teach hash set membership: Games that ARE the algorithm problem (Grid Lock IS Sudoku validation) often fail because the game mechanic replaces the algorithmic insight with visual pattern matching. The player learns to scan the board, not to maintain mental hash sets. — _Why: Grid Lock had perfect algorithm alignment (100%) but the efficiency gap was too small because visual scanning partially substitutes for set tracking at small grid sizes. The game needs a mechanic where the hash set IS the tool, not where the hash set IS the answer._

### algorithm-emergence
- **[AVOID]** Constraint-satisfaction games struggle to teach hash set membership: Games that ARE the algorithm problem (Grid Lock IS Sudoku validation) often fail because the game mechanic replaces the algorithmic insight with visual pattern matching. The player learns to scan the board, not to maintain mental hash sets. — _Why: Grid Lock had perfect algorithm alignment (100%) but the efficiency gap was too small because visual scanning partially substitutes for set tracking at small grid sizes. The game needs a mechanic where the hash set IS the tool, not where the hash set IS the answer._

---

## Changelog

_Generated from principle_evidence table. See memory/system.sqlite for full history._
