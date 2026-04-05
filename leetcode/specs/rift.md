# Rift

## Algorithm Target
1.1 Binary Search
"Always cut the remaining space in half — don't scan linearly"

## Rules
Drop seismic probes onto a grid to find the hidden fault line dividing stable and unstable terrain. Trace the entire fault line using fewer probes than the budget allows.

## Mechanic Type
Constraint Satisfaction

## Algorithm-Mechanic Mapping
- **Algorithm step → Game action**: Each probe reveals "stable" or "unstable." To find the fault boundary in a row, the player should probe the middle of the unknown range, then recurse into the half that contains the boundary — this IS binary search.
- **Why greedy fails**: Greedy = probe near the last boundary result (linear scan along the edge). On a grid with a jagged fault line, this wastes probes on rows where the boundary shifts significantly. Binary search per row uses ceil(log2(cols)) probes; linear scan uses up to cols/2.
- **The aha moment**: "Wait — if I always probe the middle of what I haven't checked, I find the boundary in way fewer probes!" This is the binary search insight.

## Why It Works

### Algorithm Emergence Test
The optimal strategy for each row is: probe the middle column of the remaining unknown range. If result is "stable," the fault is to the right; if "unstable," the fault is to the left. Recurse. This IS binary search on a sorted boolean array.

### Greedy Trap Test
Greedy approach: "probe adjacent to the last known boundary point." This is linear scan along the fault line. On a 16-column grid, greedy needs up to 8 probes per row; binary search needs 4. At Difficulty 5 with a tight probe budget, greedy runs out of probes before tracing the full fault.

### Stare Test
The fault line is completely hidden. The player sees only their probe results. No amount of staring reveals where the boundary is — they must act to gain information.

### Transferability Test
Directly maps to:
- #704 Binary Search: finding a value in a sorted array = finding the boundary in a row
- #875 Koko Eating Bananas: binary search on a monotonic predicate ("can I eat all bananas at speed K?") = "is this column stable or unstable?"
- #33 Search in Rotated Sorted Array: the 2D fault line with row-to-row shifts teaches searching in partially-sorted structures

### Not a Quiz Test
The player thinks about terrain, probes, fault lines, and geology. The words "binary search" never appear. The interface shows a terrain grid with probe markers — it feels like a discovery/exploration game.

## Predicted Failure Mode
Risk of feeling repetitive — if each row is an independent binary search, the game becomes "do binary search N times." Mitigation: the fault line is continuous, so results from adjacent rows constrain each other. Smart players learn to USE cross-row information (the fault can't jump more than 1-2 columns between rows), reducing total probes. This adds a layer BEYOND pure binary search.

## Expected Metrics
| Metric | Prediction | Reasoning |
|---|---|---|
| Puzzle Entropy | 15-20 bits | Each probe has 8-16 column choices × multiple rows |
| Skill-Depth | 50-70% | Binary search uses ~log2(n) probes vs linear's ~n/2; cross-row inference adds more depth |
| Counterintuitive Moves | 2-3 per puzzle | Sometimes the globally optimal probe is in a row you haven't started yet (not the "obvious" next row) |
| Drama | 0.5-0.7 | Running low on probes with rows left to trace creates tension |
| Decision Entropy | 2.0-3.0 bits | 8-16 column choices per probe, but only 1-3 are strategically distinct |
| Info Gain Ratio | 2.0-3.0 | Middle probe eliminates half; edge probe eliminates very little |
| Algorithm Alignment | 80-90% | Each move that bisects = algorithm match |
| Greedy-Optimal Gap | 30-50% | Linear scan uses 2-3x the probes of bisection |

## Difficulty Progression
- **Level 1-2 (Easy)**: 6×4 grid, smooth fault line (max 1 column shift per row), generous probe budget (3× optimal). Binary search barely needed — even random probing works.
- **Level 3-4 (Medium)**: 10×8 grid, jagged fault line (up to 2 column shifts), probe budget = 1.5× optimal. Linear scanning starts running out of probes. Players discover bisection.
- **Level 5 (Hard)**: 16×12 grid, erratic fault line, probe budget = 1.1× optimal. Only binary search + cross-row inference fits within budget.

## Player Experience
Level 1: "Oh, I just click around and find the line. Easy." (Confidence)
Level 3: "Hmm, I'm running out of probes. I keep clicking next to my last result but the line jumped. Maybe I should check the middle first?" (Discovery)
Level 5: "I need exactly the right number of probes. Always check the middle of what's left. And I can use nearby rows to narrow my starting range." (Mastery + aha)

## Difficulty Knobs
- **Grid size** (cols × rows): 6×4 → 16×12
- **Fault jaggedness** (max column shift per row): 1 → 3
- **Probe budget ratio** (probes / optimal): 3.0 → 1.1

---
<!-- BELOW THIS LINE: filled by engineer and playtester -->

## Solver Metrics

Run: `npx tsx src/solvers/rift-metrics.ts`

### Summary (averaged across 5 seeds per difficulty)

| Metric | Diff 1 | Diff 2 | Diff 3 | Diff 4 | Diff 5 | Avg |
|---|---|---|---|---|---|---|
| Solvability | 100% | 100% | 100% | 100% | 100% | 100% |
| Puzzle Entropy | 35.4 | 60.9 | 102.4 | 137.1 | 186.6 | 104.5 |
| Skill-Depth | 53.9% | 65.6% | 57.9% | 51.0% | 37.8% | 53.2% |
| Decision Entropy | 3.34 | 3.85 | 4.19 | 4.51 | 4.76 | 4.13 |
| Counterintuitive | 1.8 | 0.2 | 2.8 | 2.8 | 3.6 | 2.2 |
| Drama | 0.88 | 0.58 | 0.68 | 0.79 | 0.91 | 0.77 |
| Info Gain Ratio | 3.87 | 6.81 | 3.46 | 4.33 | 5.06 | 4.71 |
| Alg Alignment | 100.0% | 81.3% | 76.0% | 67.7% | 65.7% | 78.1% |
| Greedy-Opt Gap | 21.9% | 43.6% | 42.9% | 44.9% | 37.8% | 38.2% |
| Optimal Probes | 11 | 16 | 24 | 30 | 39 | 24 |
| Budget | 36 | 36 | 48 | 52 | 53 | 45 |

### Difficulty Curve

| Diff | Grid | Optimal | Budget | Slack | Skill-Depth | Alg-Align |
|---|---|---|---|---|---|---|
| 1 | 4x6 | 11 | 36 | 71% | 53.9% | 100.0% |
| 2 | 6x8 | 16 | 36 | 56% | 65.6% | 81.3% |
| 3 | 8x10 | 24 | 48 | 49% | 57.9% | 76.0% |
| 4 | 10x12 | 30 | 52 | 42% | 51.0% | 67.7% |
| 5 | 12x16 | 39 | 53 | 26% | 37.8% | 65.7% |

### Insight Inflection (Linear Scan Failure Rate)

| Diff | Linear Fails |
|---|---|
| 1 | 0/5 |
| 2 | 2/5 |
| 3 | 3/5 |
| 4 | 3/5 |
| 5 | 5/5 |

### Auto-Kill Check: PASSED

## Play Report

Playtest skipped — browser harness not available in this session. Metrics-only evaluation.

## Decision

**KEEP** — All standard and algorithm-specific metrics pass thresholds. Binary search emerges naturally: linear scan fails at Difficulty 2+ (40% failure rate), completely fails at Difficulty 5. Algorithm alignment averages 78.1%. Greedy-optimal gap of 38.2% demonstrates clear superiority of bisection. Cross-row inference adds depth beyond basic binary search. The game's hidden-information mechanic (probes reveal stability) prevents A10 (stare test passes). Difficulty curve is monotonic and well-tuned.

**Concept Bridge**: This game teaches binary search. On LeetCode, this appears in: #704 Binary Search, #875 Koko Eating Bananas, #33 Search in Rotated Sorted Array. The moment in the game where you probe the middle of the unknown range maps to the moment in code where you compute `mid = (lo + hi) / 2`.
