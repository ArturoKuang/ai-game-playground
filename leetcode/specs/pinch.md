# Pinch

## Algorithm Target
1.2 Two Pointers
"Two ends converging is O(n), not O(n²)"

## Rules
A sorted row of numbered tiles with two cursors at opposite ends. Move either cursor inward to find all pairs that sum to the target number, using fewer moves than the budget allows.

## Mechanic Type
Optimization

## Algorithm-Mechanic Mapping
- **Algorithm step → Game action**: Player looks at the sum of the two cursor values. If sum < target, move the left cursor right (increase sum). If sum > target, move the right cursor left (decrease sum). If sum = target, collect the pair and move both inward. This IS the two-pointer algorithm.
- **Why greedy fails**: Greedy = "fix left cursor, scan right cursor through all remaining tiles" to find each pair. This is O(n) per pair = O(n²) total moves. With a tight move budget, this exhausts moves before finding all pairs. Two-pointer convergence finds all pairs in exactly n moves.
- **The aha moment**: "If the sum is too small, I need a bigger number — which is always to the RIGHT of my left cursor. If too big, I need a smaller number — always to the LEFT of my right cursor." This inward convergence is the two-pointer insight.

## Why It Works

### Algorithm Emergence Test
On a sorted array, the optimal pair-finding strategy is: compare endpoints, adjust the pointer whose movement brings the sum closer to target. This is literally the two-pointer algorithm for Two Sum II.

### Greedy Trap Test
Greedy: "move left cursor right until I find a pair, then keep going." This works for the first pair but wastes moves re-scanning. At Level 3+, the move budget is tight enough that this fails — you need the convergence approach to find all pairs in one pass.

### Stare Test
With 20+ tiles, mentally computing all pair sums is infeasible. The player must act (move cursors) to explore. Cross-row constraints between multiple target sums (at higher difficulties) prevent pre-planning.

### Transferability Test
Directly maps to:
- #167 Two Sum II: exact same mechanic — sorted array, find pair with target sum
- #11 Container With Most Water: "move the shorter wall inward" = "move the pointer that helps"
- #15 3Sum: multi-target extension teaches the 3Sum reduction to 2Sum

### Not a Quiz Test
The player sees colored tiles with numbers, two sliders, and a target sum. They think "which end do I squeeze?" — not "two pointers." The interface feels like a physical slider puzzle.

## Predicted Failure Mode
Risk of A10 — sorted numbers are fully visible, patient player could mentally compute all pairs. Mitigation: (1) move budget forces efficiency, (2) at higher difficulties, tiles have hidden bonus values revealed only when a cursor passes over them, adding information-gathering to the convergence. (3) Multiple target sums per puzzle create interleaving decisions.

## Expected Metrics
| Metric | Prediction | Reasoning |
|---|---|---|
| Puzzle Entropy | 12-18 bits | At each step: move left, move right, or collect = 2-3 choices with strategic weight |
| Skill-Depth | 40-60% | Two-pointer convergence is strictly better than fix-and-scan; cross-target optimization adds depth |
| Counterintuitive Moves | 1-2 per puzzle | Sometimes you must move PAST a potential pair to find a better target combination |
| Drama | 0.5-0.6 | Move budget pressure + "will I find the last pair in time?" |
| Decision Entropy | 1.5-2.5 bits | 2-3 choices per step, meaningfully different |
| Info Gain Ratio | 1.8-2.5 | Moving the "right" pointer eliminates more possibilities than random |
| Algorithm Alignment | 85-95% | Each move that follows sum-comparison logic = algorithm match |
| Greedy-Optimal Gap | 25-40% | Fix-and-scan uses ~2x the moves of convergence |

## Difficulty Progression
- **Level 1-2 (Easy)**: 8 tiles, 1 target sum, generous move budget (2× optimal). Even scanning works.
- **Level 3-4 (Medium)**: 16 tiles, 2-3 target sums, move budget = 1.3× optimal. Scanning runs out of moves. Players discover convergence.
- **Level 5 (Hard)**: 24 tiles, 4 target sums, some tiles have hidden bonus multipliers revealed on cursor pass, move budget = 1.1× optimal. Only two-pointer convergence with strategic target ordering fits within budget.

## Player Experience
Level 1: "I just slide both ends toward each other and look for matches. Simple!" (Confidence)
Level 3: "I keep running out of moves. If I just scan from the left, I waste too many moves on non-matches. Maybe I should check BOTH ends?" (Discovery)
Level 5: "I need to use the sum to decide which end to move. Too small → move left. Too big → move right. Match → collect and move both. And I need to pick the right target order." (Mastery)

## Difficulty Knobs
- **Array size**: 8 → 24 tiles
- **Number of target sums**: 1 → 4
- **Move budget ratio** (moves / optimal): 2.0 → 1.1
- **Hidden bonuses** (Level 4+): tiles reveal multiplier values when cursor passes

---
<!-- BELOW THIS LINE: filled by engineer and playtester -->

## Solver Metrics

Run: `npx tsx src/solvers/pinch-metrics.ts`

| Metric | Mon | Tue | Wed | Thu | Fri | Avg |
|---|---|---|---|---|---|---|
| Solvability | 100% | 100% | 100% | 100% | 100% | 100.0 |
| Puzzle Entropy | 4.6 | 5.6 | 13.6 | 17.8 | 20.8 | 12.5 |
| Skill-Depth | 0.0% | 44.4% | 30.0% | 23.8% | 13.0% | 22.2% |
| Decision Entropy | 1.15 | 1.12 | 1.04 | 1.11 | 1.09 | 1.1 |
| Counterintuitive | 0 | 1 | 0 | 1 | 0 | 0.4 |
| Drama | 1.00 | 1.00 | 0.64 | 0.69 | 1.00 | 0.9 |
| Info Gain Ratio | 2.55 | 2.73 | 1.69 | 2.39 | 1.94 | 2.3 |
| Algorithm Alignment | 100% | 100% | 100% | 100% | 100% | 100.0% |
| Greedy-Optimal Gap | 0% | 80% | 43% | 31% | 15% | 33.8% |
| Optimal Moves | 4 | 5 | 14 | 16 | 20 | 11.8 |
| Budget | 8 | 8 | 19 | 20 | 22 | 15.4 |

### Auto-Kill Check: PASSED

- Solvability: 100% (threshold: 100%)
- Skill-Depth: 22.2% (threshold: >10%)
- Algorithm Alignment: 100% (threshold: >50%)
- Counterintuitive Moves: 2 total (threshold: >0)
- Decision Entropy: 1.1 (threshold: 1.0-4.5)
- Puzzle Entropy: 12.5 (threshold: >5)

### Solver Skill Levels

| Skill | Strategy | Mon | Tue | Wed | Thu | Fri |
|---|---|---|---|---|---|---|
| 1 | Random (collect when possible) | 4 | 5 | 14 | FAIL | FAIL |
| 2 | Greedy (move further cursor) | 4 | FAIL | FAIL | FAIL | FAIL |
| 3 | BFS (optimal search) | 4 | 5 | 14 | 16 | 20 |
| 4 | Two-pointer (opportunistic) | 4 | 5 | 14 | 16 | 20 |
| 5 | Two-pointer (optimal ordering) | 4 | 5 | 14 | 16 | 20 |

### Key Observations

- **Algorithm alignment is 100%**: Every non-collect move in the optimal solution follows the two-pointer logic (sum < target -> move left, sum > target -> move right).
- **Greedy-optimal gap averages 33.8%**: Non-optimal strategies use significantly more moves, validating that two-pointer is genuinely better.
- **Skill gradient works**: Levels 1-2 fail at higher difficulties where budgets are tight, while Levels 3-5 consistently solve. This creates the discovery pressure described in the spec.
- **Low decision entropy (1.1 bits)**: Each step has ~2 meaningful choices (left or right), which matches the two-pointer binary decision.

## Play Report

Playtest skipped — browser harness not available in this session. Metrics-only evaluation.

## Decision

**KEEP (conditional)** — Algorithm Alignment is perfect (100%) — every solver move follows the two-pointer convergence pattern. Greedy-Optimal Gap of 33.8% validates that two-pointer IS meaningfully better than brute-force. However, Skill-Depth (22.2%) and Decision Entropy (1.1) are below ideal targets. The two-pointer algorithm is inherently binary (move left or right based on sum comparison), which structurally caps Decision Entropy near 1 bit. CI is low (0.4) because the algorithm's logic is intuitive once understood. The game TEACHES the algorithm well but may lack replayability. Polish pass should add: (1) multi-target sequencing decisions, (2) optional skip mechanic for advanced players.

**Concept Bridge**: This game teaches Two Pointers on sorted data. On LeetCode, this appears in: #167 Two Sum II, #11 Container With Most Water, #15 3Sum. The moment where you decide "move left or right based on sum" IS the two-pointer decision.
