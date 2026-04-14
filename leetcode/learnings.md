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

- **Priority scoring by clash-value groups beats sequential reveal** (emerging, confidence 0.75) — L5 solver prioritizes cells in groups with known clash values, finding clashes faster than sequential scanning. Mirrors skilled Sudoku validator behavior. (Evidence: Spot Check v1, keep; spot-check v2, keep)

- **Hidden information defeats visual scanning for set membership games** (emerging, confidence 0.74) — When teaching hash set membership, hiding the data forces players to build mental registries rather than visually scanning. The reveal-to-learn mechanic creates cumulative energy costs that produce strong efficiency gaps. (Evidence: Spot Check v1, keep; spot-check v1, keep)

- **L2 sector-blind mechanic creates natural difficulty breakpoint** (emerging, confidence 0.71) — Making brute-force solver skip sector/box checks at D3+ creates a natural breakpoint where sector-only clashes go undetected, modeling realistic beginner behavior. (Evidence: Spot Check v1, keep; spot-check v2, keep)

- **Set complement deduction creates the aha moment for membership games** (emerging, confidence 0.68) — When N-1 values in a group of N are known, the last value is deducible without spending a resource. This set complement reasoning IS the key aha moment for hash set membership. (Evidence: Spot Check v1, keep; spot-check v1, keep)

- **Tighter budgets at D4-D5 ensure monotonic L2 decline** (emerging, confidence 0.56) — When teaching two-pointer convergence, D4 and D5 budgets must be calibrated so sequential reveal (L2) cannot complete enough rounds. Budget should be roughly (rounds * tilesPerRow * 0.6) to keep L5 at 100% solvability while forcing L2 below 20%. (Evidence: Reflect v1, keep)

- **Non-palindrome early exit is the core efficiency driver for two-pointer games** (emerging, confidence 0.55) — In palindrome detection games, the efficiency gap between two-pointer (L5) and sequential (L2) comes almost entirely from non-palindrome rounds where early mismatch detection saves reveals. Palindrome rounds require similar effort from both strategies. (Evidence: Reflect v1, keep)

- **Shared budget across rounds creates natural two-pointer pressure** (emerging, confidence 0.52) — When a reveal/action budget is shared across multiple classification rounds, budget pressure at D3+ forces players to discover early-exit strategies (like two-pointer short-circuiting) rather than exhaustive scanning. The crossover happens naturally when total required reveals exceeds budget. (Evidence: reflect v1, keep)

- **Noise tiles map directly to skip-non-alphanumeric in palindrome algorithms** (emerging, confidence 0.51) — Adding visually distinct noise tiles that must be skipped during palindrome checking directly models the skip-non-alphanumeric step in Valid Palindrome. This creates a second strategy shift at D3+ and deepens the two-pointer teaching beyond simple pair comparison. (Evidence: reflect v1, keep)

- **Classification games with hidden information pass the Stare Test naturally** (emerging, confidence 0.50) — Games where the player must classify hidden sequences (reveal-then-decide) inherently pass the Stare Test because no amount of visual inspection reveals hidden information. This makes them ideal vehicles for teaching pointer-based algorithms where information access order matters. (Evidence: reflect v1, keep)

- **Asymmetric cost creates natural crossover** (candidate, confidence 0.44) — When the naive approach costs O(n) and the optimal approach has constant cost but higher per-unit price, setting the per-unit price so the crossover happens at D3 difficulty creates the ideal discovery arc. (Evidence: power-line v1, keep)

- **Batch-reveal teaches frequency counting** (candidate, confidence 0.39) — Tallying one tile reveals ALL tiles of that type, mapping to freq[key]++ for every occurrence. (Evidence: Tally v1, iterate)

- **Binary trick algorithms need discovery not depth** (candidate, confidence 0.37) — For algorithms that are a single insight (like prefix/suffix decomposition), design the game around the DISCOVERY moment rather than deep strategic replay. Difficulty progression and tight budgets provide replay motivation. (Evidence: power-line v1, keep)

---

## Anti-Patterns

- **Binary penalties create weak efficiency gaps** (candidate, confidence 0.41) — Games with binary failure penalties (lose a life vs no life) create weaker efficiency gaps than games with cumulative cost penalties (each wasted move adds up). For algorithm games, the wrong strategy must produce ACCUMULATED waste, not occasional catastrophic failure. (Evidence: grid-lock v1, kill)

- **Constraint-satisfaction games struggle to teach hash set membership** (candidate, confidence 0.38) — Games that ARE the algorithm problem (Grid Lock IS Sudoku validation) often fail because the game mechanic replaces the algorithmic insight with visual pattern matching. The player learns to scan the board, not to maintain mental hash sets. (Evidence: grid-lock v1, kill)

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
- **[USE]** Non-palindrome early exit is the core efficiency driver for two-pointer games: In palindrome detection games, the efficiency gap between two-pointer (L5) and sequential (L2) comes almost entirely from non-palindrome rounds where early mismatch detection saves reveals. Palindrome rounds require similar effort from both strategies. — _Why: L5 saves ~6 reveals per non-palindrome round via early exit (2 vs 8 reveals). This differential drives the 26% efficiency gap. Without sufficient non-palindrome rounds, the gap would be minimal._
- **[USE]** Shared budget across rounds creates natural two-pointer pressure: When a reveal/action budget is shared across multiple classification rounds, budget pressure at D3+ forces players to discover early-exit strategies (like two-pointer short-circuiting) rather than exhaustive scanning. The crossover happens naturally when total required reveals exceeds budget. — _Why: The shared budget is what makes the two-pointer approach necessary rather than optional. Without budget pressure, sequential reveal works fine. The budget creates the learning moment._
- **[AVOID]** Binary penalties create weak efficiency gaps: Games with binary failure penalties (lose a life vs no life) create weaker efficiency gaps than games with cumulative cost penalties (each wasted move adds up). For algorithm games, the wrong strategy must produce ACCUMULATED waste, not occasional catastrophic failure. — _Why: Grid Lock penalized wrong placement with a lost life (binary), so the efficiency gap was only 14%. Pair Up penalized with wasted flips (cumulative), achieving 65%. The algorithm advantage must create graduated, visible waste to hit the 20% threshold._

### hidden-information
- **[USE]** Hidden information defeats visual scanning for set membership games: When teaching hash set membership, hiding the data forces players to build mental registries rather than visually scanning. The reveal-to-learn mechanic creates cumulative energy costs that produce strong efficiency gaps. — _Why: Grid Lock (killed) had perfect alignment but failed because visual scanning substituted for hash set tracking. Spot Check solves this by hiding frequencies behind energy-gated reveals._
- **[USE]** Classification games with hidden information pass the Stare Test naturally: Games where the player must classify hidden sequences (reveal-then-decide) inherently pass the Stare Test because no amount of visual inspection reveals hidden information. This makes them ideal vehicles for teaching pointer-based algorithms where information access order matters. — _Why: Previous games like Grid Lock failed because visible information allowed visual scanning to substitute for algorithmic thinking. Hidden-information classification games avoid this failure mode entirely._

### difficulty-progression
- **[USE]** L2 sector-blind mechanic creates natural difficulty breakpoint: Making brute-force solver skip sector/box checks at D3+ creates a natural breakpoint where sector-only clashes go undetected, modeling realistic beginner behavior. — _Why: Previous version had L2 doing full scans at all difficulties with minimal 2.9% gap. Sector-blind at D3+ raised gap to 62% win-rate._
- **[USE]** Tighter budgets at D4-D5 ensure monotonic L2 decline: When teaching two-pointer convergence, D4 and D5 budgets must be calibrated so sequential reveal (L2) cannot complete enough rounds. Budget should be roughly (rounds * tilesPerRow * 0.6) to keep L5 at 100% solvability while forcing L2 below 20%. — _Why: Initial D4/D5 budgets of 32 and 50 allowed L2 to win 60% at D4 by completing 3+ rounds. Tightening to 28 and 44 made L2 win rates monotonically decline to 20% and 0%._
- **[USE]** Shared budget across rounds creates natural two-pointer pressure: When a reveal/action budget is shared across multiple classification rounds, budget pressure at D3+ forces players to discover early-exit strategies (like two-pointer short-circuiting) rather than exhaustive scanning. The crossover happens naturally when total required reveals exceeds budget. — _Why: The shared budget is what makes the two-pointer approach necessary rather than optional. Without budget pressure, sequential reveal works fine. The budget creates the learning moment._
- **[USE]** Noise tiles map directly to skip-non-alphanumeric in palindrome algorithms: Adding visually distinct noise tiles that must be skipped during palindrome checking directly models the skip-non-alphanumeric step in Valid Palindrome. This creates a second strategy shift at D3+ and deepens the two-pointer teaching beyond simple pair comparison. — _Why: Without noise tiles, the game only teaches basic two-pointer convergence. With them, it also teaches pointer advancement past irrelevant data, which is the key complexity in LC #125._
- **[USE]** Asymmetric cost creates natural crossover: When the naive approach costs O(n) and the optimal approach has constant cost but higher per-unit price, setting the per-unit price so the crossover happens at D3 difficulty creates the ideal discovery arc. — _Why: The probe vs scan cost structure (1 vs 2 energy) means probing is cheaper for small grids but scanning wins for large ones. This crossover IS the algorithmic insight: brute force works for small n, prefix/suffix wins for large n._

### aha-moment
- **[USE]** Set complement deduction creates the aha moment for membership games: When N-1 values in a group of N are known, the last value is deducible without spending a resource. This set complement reasoning IS the key aha moment for hash set membership. — _Why: Strategy evolution from reveal-all to track-and-deduce mirrors Valid Sudoku algorithm progression._

### deduction
- **[USE]** Set complement deduction creates the aha moment for membership games: When N-1 values in a group of N are known, the last value is deducible without spending a resource. This set complement reasoning IS the key aha moment for hash set membership. — _Why: Strategy evolution from reveal-all to track-and-deduce mirrors Valid Sudoku algorithm progression._

### budget-design
- **[USE]** Tighter budgets at D4-D5 ensure monotonic L2 decline: When teaching two-pointer convergence, D4 and D5 budgets must be calibrated so sequential reveal (L2) cannot complete enough rounds. Budget should be roughly (rounds * tilesPerRow * 0.6) to keep L5 at 100% solvability while forcing L2 below 20%. — _Why: Initial D4/D5 budgets of 32 and 50 allowed L2 to win 60% at D4 by completing 3+ rounds. Tightening to 28 and 44 made L2 win rates monotonically decline to 20% and 0%._
- **[USE]** Shared budget across rounds creates natural two-pointer pressure: When a reveal/action budget is shared across multiple classification rounds, budget pressure at D3+ forces players to discover early-exit strategies (like two-pointer short-circuiting) rather than exhaustive scanning. The crossover happens naturally when total required reveals exceeds budget. — _Why: The shared budget is what makes the two-pointer approach necessary rather than optional. Without budget pressure, sequential reveal works fine. The budget creates the learning moment._

### two-pointers
- **[USE]** Tighter budgets at D4-D5 ensure monotonic L2 decline: When teaching two-pointer convergence, D4 and D5 budgets must be calibrated so sequential reveal (L2) cannot complete enough rounds. Budget should be roughly (rounds * tilesPerRow * 0.6) to keep L5 at 100% solvability while forcing L2 below 20%. — _Why: Initial D4/D5 budgets of 32 and 50 allowed L2 to win 60% at D4 by completing 3+ rounds. Tightening to 28 and 44 made L2 win rates monotonically decline to 20% and 0%._
- **[USE]** Non-palindrome early exit is the core efficiency driver for two-pointer games: In palindrome detection games, the efficiency gap between two-pointer (L5) and sequential (L2) comes almost entirely from non-palindrome rounds where early mismatch detection saves reveals. Palindrome rounds require similar effort from both strategies. — _Why: L5 saves ~6 reveals per non-palindrome round via early exit (2 vs 8 reveals). This differential drives the 26% efficiency gap. Without sufficient non-palindrome rounds, the gap would be minimal._
- **[USE]** Shared budget across rounds creates natural two-pointer pressure: When a reveal/action budget is shared across multiple classification rounds, budget pressure at D3+ forces players to discover early-exit strategies (like two-pointer short-circuiting) rather than exhaustive scanning. The crossover happens naturally when total required reveals exceeds budget. — _Why: The shared budget is what makes the two-pointer approach necessary rather than optional. Without budget pressure, sequential reveal works fine. The budget creates the learning moment._
- **[USE]** Noise tiles map directly to skip-non-alphanumeric in palindrome algorithms: Adding visually distinct noise tiles that must be skipped during palindrome checking directly models the skip-non-alphanumeric step in Valid Palindrome. This creates a second strategy shift at D3+ and deepens the two-pointer teaching beyond simple pair comparison. — _Why: Without noise tiles, the game only teaches basic two-pointer convergence. With them, it also teaches pointer advancement past irrelevant data, which is the key complexity in LC #125._
- **[USE]** Classification games with hidden information pass the Stare Test naturally: Games where the player must classify hidden sequences (reveal-then-decide) inherently pass the Stare Test because no amount of visual inspection reveals hidden information. This makes them ideal vehicles for teaching pointer-based algorithms where information access order matters. — _Why: Previous games like Grid Lock failed because visible information allowed visual scanning to substitute for algorithmic thinking. Hidden-information classification games avoid this failure mode entirely._

### palindrome
- **[USE]** Non-palindrome early exit is the core efficiency driver for two-pointer games: In palindrome detection games, the efficiency gap between two-pointer (L5) and sequential (L2) comes almost entirely from non-palindrome rounds where early mismatch detection saves reveals. Palindrome rounds require similar effort from both strategies. — _Why: L5 saves ~6 reveals per non-palindrome round via early exit (2 vs 8 reveals). This differential drives the 26% efficiency gap. Without sufficient non-palindrome rounds, the gap would be minimal._
- **[USE]** Noise tiles map directly to skip-non-alphanumeric in palindrome algorithms: Adding visually distinct noise tiles that must be skipped during palindrome checking directly models the skip-non-alphanumeric step in Valid Palindrome. This creates a second strategy shift at D3+ and deepens the two-pointer teaching beyond simple pair comparison. — _Why: Without noise tiles, the game only teaches basic two-pointer convergence. With them, it also teaches pointer advancement past irrelevant data, which is the key complexity in LC #125._

### mechanic-mapping
- **[USE]** Noise tiles map directly to skip-non-alphanumeric in palindrome algorithms: Adding visually distinct noise tiles that must be skipped during palindrome checking directly models the skip-non-alphanumeric step in Valid Palindrome. This creates a second strategy shift at D3+ and deepens the two-pointer teaching beyond simple pair comparison. — _Why: Without noise tiles, the game only teaches basic two-pointer convergence. With them, it also teaches pointer advancement past irrelevant data, which is the key complexity in LC #125._

### game-design
- **[USE]** Classification games with hidden information pass the Stare Test naturally: Games where the player must classify hidden sequences (reveal-then-decide) inherently pass the Stare Test because no amount of visual inspection reveals hidden information. This makes them ideal vehicles for teaching pointer-based algorithms where information access order matters. — _Why: Previous games like Grid Lock failed because visible information allowed visual scanning to substitute for algorithmic thinking. Hidden-information classification games avoid this failure mode entirely._

### stare-test
- **[USE]** Classification games with hidden information pass the Stare Test naturally: Games where the player must classify hidden sequences (reveal-then-decide) inherently pass the Stare Test because no amount of visual inspection reveals hidden information. This makes them ideal vehicles for teaching pointer-based algorithms where information access order matters. — _Why: Previous games like Grid Lock failed because visible information allowed visual scanning to substitute for algorithmic thinking. Hidden-information classification games avoid this failure mode entirely._

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
