# Signal

## Rules
Deduce the hidden 5x5 color grid by broadcasting from row and column edges; each broadcast reveals the first cell of each color seen from that direction. Identify all 25 cells within a limited number of broadcasts (par).

## Mechanic Type
Constraint Satisfaction

## Why It Works

### Stare Test
The grid is completely hidden at the start. Every piece of information must be earned through an irreversible broadcast action that costs one of your limited moves. The player cannot plan without first acting -- and each broadcast's value depends on what you already know, creating a genuine exploration-vs-exploitation tradeoff. Unlike BitMap (all clues visible upfront), information arrives sequentially and must be cross-referenced spatially.

### Dominant Strategy Test
"Which edge should I broadcast from?" has no one-sentence answer. A row broadcast reveals first-of-each-color going left-to-right, but its information value depends on what columns you've already probed and what you've deduced from intersections. A broadcast that reveals 4 new colors is wasteful if 3 of those were already deducible from cross-referencing. The optimal strategy requires maintaining a mental constraint model and choosing broadcasts that maximally disambiguate -- and that calculation changes with every new piece of info.

### Family Test
Constraint propagation via sequential probing. This is NOT:
- BitMap (all clues visible upfront -- no probing)
- Seek (distance-based, no constraint propagation)
- Probe (Minesweeper-style adjacency counts -- fixed technique)
- Wordle (letter-based, non-spatial)

Signal occupies the "spatial constraint deduction with partial sequential reveals" family. The closest analog is skyscraper puzzles, but the broadcast mechanic (first-of-each-color, not count) creates fundamentally different deduction chains. The key novelty: each broadcast gives STRUCTURED partial information (ordered by distance) rather than aggregate information (counts or distances).

## Predicted Failure Mode
**Most likely death: formulaic deduction (Probe's fate).** If a fixed technique ("broadcast all rows first, then fill in columns") works on every puzzle, the game becomes rote after 3-5 sessions (d5 stalls). The mitigation: color distributions vary per seed, so the optimal broadcast sequence must adapt to what you learn. Some puzzles are row-dominated, others column-dominated, and some require diagonal cross-referencing.

**Second risk: A11 (par unfairness).** If par assumes perfect Bayesian inference that humans can't match, the scoring feels unfair. Mitigation: par should be computed using the same "first-of-each-color" information available to players, not full grid knowledge.

**Anti-pattern proximity: A8 (low branching factor).** If deduction chains are so tight that each broadcast is forced, the game loses decisions. Need enough ambiguity that 2-3 broadcasts are "equally good" at each step.

## Expected Metrics
| Metric | Prediction | Reasoning |
|---|---|---|
| Puzzle Entropy | 15-20 | 25 cells x 4 colors = large state space, but broadcasts prune heavily. ~8-12 broadcasts per puzzle = 8-12 decisions. |
| Skill-Depth | 40-60% | Strategic broadcast selection (cross-referencing rows+cols) should significantly beat random probing. Deduction chains reward careful tracking. |
| Counterintuitive Moves | 2-4 | Broadcasting a "boring" edge (few new colors) can be optimal when it disambiguates existing constraints. Solver will sometimes choose low-info broadcasts that resolve key ambiguities. |
| Drama | 0.5-0.7 | Late-game often hinges on 1-2 ambiguous cells where the last broadcast determines if you beat par or not. |
| Decision Entropy | 2.0-3.0 | At each step, 4 row + 4 column = ~8 unused edges, but constraint state makes 3-5 genuinely competitive. |
| Info Gain Ratio | 1.5-2.0 | Strategic broadcasts should yield ~50-100% more deduced cells per broadcast than random selection. |

## Player Experience
**Opening (10s):** The blank 5x5 grid stares back. You tap the left edge of row 3 -- a broadcast sweeps across, and colored dots appear showing the first red, blue, green, and yellow cells seen from that direction. Immediately you know: "row 3 starts with red, then blue is somewhere before green." You've used 1 of your 8 broadcasts.

**Middle (2-3min):** Three broadcasts in, the grid is a patchwork of confirmed cells and pencil-mark possibilities. You cross-reference: "Row 2's broadcast showed blue first, and column 3's showed blue in row 1 or 2... so blue must be at (2,3)!" The constraint propagation aha hits -- one deduction cascades into three more cells. You're filling in cells without broadcasting, just from logic.

**Ending (30s):** Two broadcasts left, four cells unknown. You could broadcast column 5 to reveal them all -- but that uses both remaining broadcasts and you'd tie par. Instead, you realize: the remaining cells are all constrained by existing info. Blue can't be at (4,5) because row 4 already has a blue. Green must be at (1,5) because every other position in column 5 is eliminated. You fill in the last cells purely from deduction, finishing 2 under par. Screenshot to the group chat: a colored grid with broadcast arrows showing your path to the solution.

**The aha moment:** "I don't need to broadcast -- I can DEDUCE this cell from what I already know." The shift from probing to pure logic is the emotional peak.

**The near-miss:** "If I'd broadcast column 2 instead of row 4, I would have had enough info to deduce the whole bottom-right corner. One wasted broadcast cost me par."

## Difficulty Knobs
1. **Number of colors** (Monday: 3 colors on 5x5 = more cells per color = easier deduction; Friday: 5 colors = each color appears only 5 times = harder to constrain)
2. **Par broadcasts** (Monday: par = grid_size = generous; Friday: par = optimal_broadcasts = tight, requires pure deduction for several cells)
3. **Grid ambiguity** (Monday: color distributions create many forced cells after 2-3 broadcasts; Friday: distributions chosen to maximize remaining ambiguity after each broadcast)

---
<!-- BELOW THIS LINE: filled by engineer and playtester, not designer -->

## Solver Metrics

Computed on 5 puzzles (Mon-Fri seeds 1001-1005), 5 skill levels each.

| Metric | Mon | Tue | Wed | Thu | Fri | Avg |
|---|---|---|---|---|---|---|
| Solvability | 100% | 100% | 100% | 100% | 100% | 100% |
| Puzzle Entropy | 35.8 | 39.3 | 35.8 | 32.2 | 32.2 | 35.1 |
| Skill-Depth | 43.8% | 37.5% | 43.8% | 50.0% | 46.7% | 44.4% |
| Decision Entropy | 3.40 | 2.94 | 3.10 | 3.31 | 3.20 | 3.19 |
| Counterintuitive | 1 | 0 | 0 | 0 | 0 | 0.2 |
| Drama | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.0 |
| Duration (s) | 104 | 144 | 96 | 80 | 80 | 100.8 |
| Info Gain Ratio | 1.78 | 1.60 | 1.78 | 2.00 | 1.88 | 1.81 |
| Solution Uniqueness | 1 | 1 | 1 | 1 | 1 | 1 |

Optimal broadcasts: Mon=9, Tue=10, Wed=9, Thu=8, Fri=8 (avg 8.8).
Random broadcasts: Mon=16, Tue=16, Wed=16, Thu=16, Fri=15 (avg 15.8).
Par: Mon=12, Tue=12, Wed=10, Thu=8, Fri=8.
Colors: Mon/Tue=3, Wed/Thu=4, Fri=5.

**Auto-kill check**: PASSED
- Solvability: 100% (PASS)
- Skill-Depth: 44.4% (PASS, threshold >10%)
- Counterintuitive: 1 total (PASS, threshold >0)
- Decision Entropy: 3.19 (PASS, 1.0-4.5 range)
- Puzzle Entropy: 35.1 (PASS, threshold >5)

**Weakest metric**: Counterintuitive -- 0.2 avg (only 1 across 5 puzzles). The optimal solver rarely chooses a lower-info-gain broadcast, suggesting the greedy approach is usually near-optimal. This means aha moments from "seemingly bad" broadcasts are rare.

**Strongest metric**: Skill-Depth -- 44.4%. Random play uses ~16 broadcasts vs optimal ~9, a 44% gap. Strategic broadcast selection (cross-referencing constraints) clearly outperforms random probing.

## Play Report
<!-- Playtester fills this section with blind play observations -->

## Decision
<!-- Designer fills this after reviewing metrics + play report -->
<!-- Status: keep / iterate / kill -->
<!-- If iterate: what to change and why -->
<!-- If kill: lesson learned for learnings.md -->
