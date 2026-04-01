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

## Solver Metrics (v1)

<details><summary>v1 metrics (pre-iteration)</summary>

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

</details>

## Solver Metrics (v2 -- iteration 1)

Computed on 5 puzzles (Mon-Fri seeds 1001-1005), 5 skill levels each.
Changes: cell-guessing, directional broadcasts, wrong-guess feedback.

| Metric | Mon | Tue | Wed | Thu | Fri | Avg |
|---|---|---|---|---|---|---|
| Solvability | 100% | 100% | 100% | 100% | 100% | 100% |
| Puzzle Entropy | 40.1 | 40.6 | 36.9 | 32.2 | 32.5 | 36.5 |
| Skill-Depth | 57.1% | 58.8% | 63.2% | 52.9% | 61.9% | 58.8% |
| Decision Entropy | 3.38 | 3.23 | 3.43 | 3.31 | 3.26 | 3.32 |
| Counterintuitive | 1 | 3 | 2 | 0 | 1 | 1.4 |
| Drama | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| Duration (s) | 104 | 144 | 96 | 80 | 80 | 100.8 |
| Info Gain Ratio | 2.33 | 2.43 | 2.71 | 2.13 | 2.63 | 2.45 |
| Solution Uniqueness | 1 | 1 | 1 | 1 | 1 | 1.0 |

Optimal cost: Mon=9, Tue=7, Wed=7, Thu=8, Fri=8 (avg 7.8).
Random cost: Mon=21, Tue=17, Wed=19, Thu=17, Fri=21 (avg 19.0).
Par: Mon=12, Tue=9, Wed=8, Thu=8, Fri=8.
Colors: Mon/Tue=3, Wed/Thu=4, Fri=5.

**Auto-kill check**: PASSED
- Solvability: 100% (PASS)
- Skill-Depth: 58.8% (PASS, threshold >10%)
- Counterintuitive: 7 total (PASS, threshold >0)
- Decision Entropy: 3.32 (PASS, range 1.0-4.5)
- Puzzle Entropy: 36.5 (PASS, threshold >5)

**Weakest metric**: Counterintuitive -- 1.4 avg (7 total across 5 puzzles). Thu puzzle has 0 CI moves. Improved from v1 (0.2 avg, 1 total) thanks to the guess-vs-broadcast tradeoff creating situations where the optimal solver chooses a risky guess over a safe broadcast.

**Strongest metric**: Skill-Depth -- 58.8% (up from 44.4% in v1). The broadcast+guess action space gives strategic players a much larger advantage over random play. Random play wastes budget on wrong guesses; strategic play uses deduction to guess correctly for free.

**v1 -> v2 comparison**:
- Skill-Depth: 44.4% -> 58.8% (+14.4pp) -- guess mechanic rewards deduction
- Counterintuitive: 0.2 -> 1.4 (+1.2) -- risky guesses create aha moments
- Info Gain Ratio: 1.81 -> 2.45 (+0.64) -- correct guesses are free, amplifying skilled play
- Puzzle Entropy: 35.1 -> 36.5 (+1.4) -- more meaningful choices per step
- Completion mechanic: now functional (tap cells to guess, win when all 25 known)

## Play Report

**CRITICAL BUG**: No completion mechanic. Game has no Submit/Guess button; grid cells are not clickable. After gathering info, no way to submit answer or trigger win state. 3 sessions, 10-11 broadcasts each (17-22/25 cells known), no win condition ever triggered.

**Session 1 (Intuitive)**: Broadcast mechanic understood after ~2 taps. Each broadcast reveals first cell of each color from that direction. After 11 broadcasts (at par), 5 "?" cells remained with no way to interact. First-tap satisfaction high (3 cells revealed immediately). Late broadcasts felt unrewarding (fewer new cells).

**Session 2 (Strategic)**: Strategy = broadcast all 5 rows first, then all 5 columns. Produced 22/25 in 10 broadcasts vs 20/25 in 11 (intuitive). Cross-referencing rows+columns is genuinely strategic. Same dead-end: 3 unknowns, no submission.

**Session 3 (Edge Cases)**: Duplicate taps on used arrows silently ignored (correct but no feedback). Dominant strategy exists: "all rows then all columns." Grid cells entirely non-interactive.

**Strategy Divergence**: Strategic play measurably better (22/25 in 10 vs 20/25 in 11). Real but modest. Moot because game never resolves. The deduction puzzle is engaging during reveal phase but has no payoff.

**Best Moment**: Broadcasting row 1 from the right, lighting up 4 remaining cells simultaneously in green.
**Worst Moment**: Reaching par with 5 unknowns and no way to complete the puzzle.

## Decision

**Status: ITERATE (iteration 1 of 3)**

**Reasoning:** The deduction mechanic is structurally sound -- skill-depth of 44% proves strategic broadcast selection outperforms random, and the playtester confirmed cross-referencing rows+columns is "genuinely strategic." Entropy at 35.1 is healthy. The critical bug (no completion mechanic) is an implementation gap, not a design flaw. However, two design-level issues must be addressed:

1. **Counterintuitive moves = 0.2 avg (near-zero).** Greedy "pick the broadcast that reveals the most new cells" is near-optimal. This means there are almost no aha moments where a "boring" broadcast is secretly the best choice. The deduction chains are too shallow -- the game rewards information gathering but not information REASONING.

2. **Dominant strategy found by playtester:** "Broadcast all rows first, then all columns" works on every puzzle. This is a one-sentence strategy -- fails Litmus Test 1.

**What to change:**

1. **Add cell-guessing as the core action, not just broadcasting.** After each broadcast, the player should be able to TAP cells to commit guesses ("I think this cell is blue"). Correct guesses earn points; wrong guesses cost a broadcast. This creates the missing completion mechanic AND adds risk-reward: guess early with partial info (risky but efficient) vs. gather more info first (safe but costs broadcasts). The game becomes: broadcast to gather info, then guess to score, with wrong guesses eating your broadcast budget.

2. **Break the "all rows then all columns" dominant strategy.** Make broadcasts DIRECTIONAL and ASYMMETRIC: a row broadcast from the LEFT reveals different info than from the RIGHT (first-of-each-color from each direction). This doubles the broadcast options and makes the "broadcast all rows" strategy suboptimal because you must choose WHICH direction for each row.

3. **Increase constraint coupling to drive CI up.** When a player commits a wrong guess, reveal which color that cell actually is (partial negative feedback, like Wordle's yellow). This creates a new information channel that rewards bold guessing -- a counterintuitive "guess wrong on purpose" strategy where the penalty (lost broadcast) is worth the info gained.

**Target metrics for iteration 2:** CI >= 2, info-gain-ratio >= 1.5, no single dominant strategy across all puzzles. The game should FEEL like Wordle's guess-and-feedback loop applied to a spatial grid.
