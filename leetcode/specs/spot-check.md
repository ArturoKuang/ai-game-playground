# Spot Check

"## Algorithm Target
1.5 Hash Set Membership
Validate that no duplicates exist within each row, column, and sector.

"## Rules
Scan a grid of hidden radio towers. Reveal towers to learn their frequencies, then flag all cells that clash (same frequency in the same row, column, or sector) before energy runs out.

"## Mechanic Type
Constraint Satisfaction

"## Algorithm-Mechanic Mapping
- **Algorithm step -> Game action**: Maintaining a mental set of seen frequencies per row/column/sector IS set.has(value). Flagging a clash IS detecting a duplicate.
- **Why the strongest plausible wrong strategy fails**: Brute-force revealing every cell exhausts the energy budget at D3+.
- **The aha moment**: Realizing you do not need to reveal a cell if you already know its group has N-1 values revealed.

"## Why It Works

### Algorithm Emergence Test
Optimal play requires maintaining three sets (per row, per column, per sector) of seen values and checking membership before spending energy on a reveal.

### Wrong Strategy Trap Test
At D3+, L2 (brute-force) skips sector checks, missing sector-only clashes. Win rate drops from 100% to 38% at D3.

### Stare Test
All values are hidden. The player cannot visually scan for duplicates.

### Transferability Test
- **LC #36 Valid Sudoku**: Direct mapping.
- **LC #128 Longest Consecutive Sequence**: Same set.has() membership check pattern.

### Not a Quiz Test
The game feels like a detective/scanner puzzle, not implement a hash set.

"## Predicted Failure Mode
If energy budgets are too generous, brute-force works at all difficulties and the efficiency gap collapses.

"## Solver Metrics
- Solvability: 100% (both L2 and L5 at D1-D2)
- L2 breakpoint: D3 (38% solvability)
- L5 solvability: 100% all difficulties
- Efficiency gap (win-rate): 62% at D3
- Algorithm alignment: 100%

"## Decision
**KEEP** -- Win-rate efficiency gap of 62% at D3 justifies keep.