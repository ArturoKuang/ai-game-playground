# Engineer Brief

_Generated from the SQLite memory store on 2026-04-14T04:18:26.997Z._

Task: Build and measure sliding window prototype

Engineer brief with 1 ranked memory items plus metric thresholds and implementation warnings.

## Thresholds
- Solvability must stay at 100%.
- Structural Fit: board→input, moves→operations, win→goal — all three must be yes.
- Efficiency Gap must be ≥ 20% (L5 vs L2). Below 15% is an auto-kill.
- Wasted Work Ratio must be ≥ 30% (L2 extra moves vs L5 at D3). Below 20% is an auto-kill.
- Difficulty Breakpoint must land at D3-D4. D1 or D5/never is an auto-kill.
- Difficulty Scaling must be monotonic (L2 win rate D1→D5). Non-monotonic is an auto-kill.
- Decision Density must be > 60%. Below 40% is an auto-kill.

## Priority scoring by clash-value groups beats sequential reveal
- Source: principle
- Rank: 0.66
- Feedback: unknown
- Status: emerging
- Confidence: 0.75
- Tags: hash-set, optimization, solver-design
- Statement: L5 solver prioritizes cells in groups with known clash values, finding clashes faster than sequential scanning. Mirrors skilled Sudoku validator behavior.

