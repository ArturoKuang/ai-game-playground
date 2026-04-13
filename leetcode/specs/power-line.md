# Power Line

## Algorithm Target
1.4 Prefix/Suffix Products
"Scan from both ends to compute every element's complement without division"

## Rules
A row of hidden power cells. Fire scanning beams from either end to reveal cumulative power readings, or probe cells directly to learn their bypass power. Determine every cell's bypass power (the product of all other cells) before running out of energy.

## Mechanic Type
Optimization

## Algorithm-Mechanic Mapping
- **Algorithm step -> Game action**: Scan Left = build prefix product array. Scan Right = build suffix product array. Auto-derive = multiply prefix[i] * suffix[i] to get bypass power.
- **Why greedy fails**: Probing each cell individually costs N energy (1 per cell). At D3+ the budget is only 5, so probing 6+ cells is impossible. Only the two-scan approach (4 energy) fits.
- **The aha moment**: "If I scan both directions, every cell auto-computes for free! Two scans cover everything at once."

## Why It Works

### Algorithm Emergence Test
Optimal: scan left (2 energy) + scan right (2 energy) = 4 energy. All N bypass values auto-derive from prefix[i] * suffix[i]. This IS the prefix/suffix product algorithm.

### Greedy Trap Test
At D1 (3 cells, 6 energy), probing all 3 cells works fine (3 energy). At D3 (6 cells, 5 energy), probing needs 6 energy but budget is only 5. The player must discover scanning.

### Stare Test
Cell values are hidden -- player can't pre-compute bypass values mentally. Must use the game's scan/probe mechanics.

### Transferability Test
- 238 Product of Array Except Self: exact same algorithm
- Prefix sum / prefix product patterns in general

### Not a Quiz Test
Player sees power cells, scanning beams, and energy meters. The interface feels like a sci-fi diagnostic tool, not a coding exercise.

## Predicted Failure Mode
Risk: the optimal strategy (two scans) might be too obvious. Mitigation: tight energy budgets at D3+ force the player to discover it through failure.

## Difficulty Progression
- **Level 1-2 (Easy)**: 3-4 cells, generous budget (5-6 energy). Probing works.
- **Level 3-4 (Medium)**: 6-7 cells, tight budget (5 energy). Probing fails, scanning required.
- **Level 5 (Hard)**: 9 cells, minimal budget (4 energy). Only two scans work.

## Player Experience
Level 1: "I'll just probe each cell. Easy!" (Confidence)
Level 3: "I can't probe all 6 -- only 5 energy! But scanning reveals those prefix numbers above... and when I scan both ways, everything auto-fills!" (Discovery)
Level 5: "4 energy, 9 cells. Two scans, done. I AM the algorithm." (Mastery)

## Difficulty Knobs
- **Cell count**: 3 -> 9
- **Value range**: 2-4 -> 1-4
- **Energy budget**: 6 -> 4

---

## Solver Metrics

**Win Rates (Difficulty x Skill Level):**

| D\L | L1 | L2 | L3 | L4 | L5 |
|-----|----|----|----|----|-----|
| D1  | 100% | 100% | 100% | 100% | 100% |
| D2  | 100% | 100% | 100% | 100% | 100% |
| D3  | 100% | 0% | 100% | 100% | 100% |
| D4  | 100% | 0% | 100% | 100% | 100% |
| D5  | 100% | 0% | 100% | 100% | 100% |

**Energy Usage at D3:**
- L1: avg energy = 5.0
- L2: FAILED (no solutions -- needs 6 energy, budget is 5)
- L3: avg energy = 5.0
- L4: avg energy = 4.0
- L5: avg energy = 4.0

**Efficiency Gap at D3:** infinite (L2 fails completely, L5 uses 4.0 avg)

**Algorithm Alignment (L5):** 100% -- all L5 solutions use exactly 2 scans, 0 probes (optimal prefix/suffix strategy)

**L5 Solvability:** 100% (25/25 seeds solved)

**L2 Win Rate Monotonic Decrease:** D1=100%, D2=100%, D3=0%, D4=0%, D5=0% -- monotonic: YES

**Breakpoint:** D3 (where probe-all strategy first fails due to energy constraint)

**Decision Density at D3:** 100% (every action is a choice between scan/probe)

## Concept Bridge

This game teaches **Prefix/Suffix Products**. On LeetCode, this pattern appears in:
- **#238 Product of Array Except Self**: Scanning left then right mirrors building prefix and suffix product arrays. Each cell bypass power is prefix x suffix -- the exact O(n) solution that avoids division.

The moment in the game where you scan left and see cumulative products appear above each cell maps to the moment in code where you build `prefix[i] = prefix[i-1] * nums[i-1]`. When both scans complete and all bypass values auto-derive, that is `result[i] = prefix[i] * suffix[i]`.

## Decision
**KEEP** — Algorithm Gate passes (100% alignment, breakpoint at D3, infinite efficiency gap, monotonic scaling). Energy budget creates clean discovery arc from probing to scanning.
