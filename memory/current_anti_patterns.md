# Current Anti-Patterns

_Generated from the SQLite memory store._

## Binary penalties create weak efficiency gaps
- Namespace: leetcode
- Type: anti_pattern
- Status: candidate
- Confidence: 0.41
- Scope tags: constraint-satisfaction, cost-design, efficiency-gap
- Why it matters: Grid Lock penalized wrong placement with a lost life (binary), so the efficiency gap was only 14%. Pair Up penalized with wasted flips (cumulative), achieving 65%. The algorithm advantage must create graduated, visible waste to hit the 20% threshold.
- Statement: Games with binary failure penalties (lose a life vs no life) create weaker efficiency gaps than games with cumulative cost penalties (each wasted move adds up). For algorithm games, the wrong strategy must produce ACCUMULATED waste, not occasional catastrophic failure.

## Constraint-satisfaction games struggle to teach hash set membership
- Namespace: leetcode
- Type: anti_pattern
- Status: candidate
- Confidence: 0.38
- Scope tags: algorithm-emergence, constraint-satisfaction, hash-set
- Why it matters: Grid Lock had perfect algorithm alignment (100%) but the efficiency gap was too small because visual scanning partially substitutes for set tracking at small grid sizes. The game needs a mechanic where the hash set IS the tool, not where the hash set IS the answer.
- Statement: Games that ARE the algorithm problem (Grid Lock IS Sudoku validation) often fail because the game mechanic replaces the algorithmic insight with visual pattern matching. The player learns to scan the board, not to maintain mental hash sets.

