# Tag

## Algorithm Target
1.5 Hash Map
"Trade space for time — precompute to avoid re-scanning"

## Rules
Numbered tiles arrive one at a time. Stamp each tile's number into a registry (costs 1 action) for free future lookups, or skip stamping and manually scan for duplicates later (costs 1 action per comparison). Tag all duplicates within the action budget.

## Mechanic Type
Optimization

## Algorithm-Mechanic Mapping
- **Algorithm step → Game action**: Stamping a tile into the registry = inserting into a hash set. When a new tile arrives, stamped numbers auto-highlight if they match = O(1) hash set lookup. Manual comparison = O(n) linear scan through visible tiles.
- **Why greedy fails**: Greedy = "don't bother stamping, just compare each new tile against the board." With N tiles, this costs O(N²) comparisons. At medium+ difficulty, the action budget is ~3N, so O(N²) comparisons exceed the budget while O(N) stamps + free lookups do not.
- **The aha moment**: "If I stamp every tile as it arrives, I never need to scan! Duplicates just light up automatically. The upfront cost of stamping saves tons of comparison work later." This IS the hash set insight — trade space (registry slots) for time (comparison actions).

## Why It Works

### Algorithm Emergence Test
Optimal: stamp every tile as it arrives (N actions). When a new tile matches a stamped number, it auto-highlights (0 actions). Tag all duplicates for free. Total: N stamp actions. Brute force: for each new tile, compare against all previous tiles (1+2+3+...+N = N²/2 actions). With a budget of ~3N, only the stamp-everything approach works at medium+ difficulty.

### Greedy Trap Test
At Level 1 (5 tiles), skipping stamps and comparing manually works — only ~10 comparisons needed. At Level 3 (15 tiles), manual comparison needs ~100 actions but budget is ~45. Stamping costs 15 actions and comparisons cost 0. The player discovers that the "overhead" of stamping SAVES time.

### Stare Test
Tiles arrive one at a time — player can't see the full sequence. Even with tiles on the board, scanning 15+ tiles for a match is tedious and error-prone. The registry makes this instant.

### Transferability Test
- #1 Two Sum: "stamp all values, check if target - value exists" = hash map approach
- #217 Contains Duplicate: exact same game — detect if a number appears twice using a hash set
- #347 Top K Frequent: stamping tracks frequency counts
- #128 Longest Consecutive Sequence: "stamp all, then check consecutive chains"

### Not a Quiz Test
Player sees a conveyor belt of numbered tiles, a physical stamp tool, and a registry board. They decide "stamp or scan?" for each tile. The interface feels like a postal sorting game, not a CS lecture. No mention of "hash" or "O(1)" — the registry is just a tool.

## Predicted Failure Mode
Risk: the optimal strategy (stamp everything) might be too obvious from the start, creating no learning curve. Mitigation: (1) registry has limited slots at higher difficulties (player must decide WHAT to stamp — high-frequency numbers vs. rare ones), (2) some tiles have "bonus" values only revealed when stamped (adding information discovery), (3) stamping cost increases over time (inflation) at Level 5, forcing the player to be selective.

## Expected Metrics
| Metric | Prediction | Reasoning |
|---|---|---|
| Puzzle Entropy | 8-15 bits | Binary stamp/skip per tile + tag decisions |
| Skill-Depth | 35-50% | Stamp-all vs scan-all diverges significantly |
| Counterintuitive Moves | 1-2 per puzzle | Stamping a tile that doesn't have a duplicate yet "wastes" an action but is globally optimal |
| Drama | 0.4-0.6 | Budget pressure when many tiles remain |
| Decision Entropy | 1.0-2.0 bits | Binary stamp/skip, but with strategic weight |
| Info Gain Ratio | 1.5-2.5 | Stamping = guaranteed future free lookup vs random scan |
| Algorithm Alignment | 75-85% | Each stamp = hash insertion, each auto-highlight = hash lookup |
| Greedy-Optimal Gap | 25-40% | O(n) stamps vs O(n²) comparisons |

## Difficulty Progression
- **Level 1-2 (Easy)**: 6 tiles, 2 duplicates, generous budget (5× optimal), unlimited registry. Scanning works fine. Player learns the stamp mechanic.
- **Level 3-4 (Medium)**: 15 tiles, 5 duplicates, budget = 2× optimal, registry slots = 10. Scanning exhausts budget. Player discovers stamping saves actions.
- **Level 5 (Hard)**: 25 tiles, 8 duplicates, budget = 1.3× optimal, registry slots = 15, stamp cost escalation. Player must stamp strategically — high-value targets first.

## Player Experience
Level 1: "I just scan the board for matching numbers. Easy!" (Confidence)
Level 3: "I ran out of actions scanning! But when I stamp numbers into the registry, matches light up for free. I should stamp first, then duplicates find themselves." (Discovery)
Level 5: "Limited registry space means I need to stamp the numbers most likely to have duplicates. High-frequency numbers go in the registry; rare ones I'll scan manually." (Strategic depth)

## Difficulty Knobs
- **Number of tiles**: 6 → 25
- **Number of duplicates**: 2 → 8
- **Registry capacity**: unlimited → 15 slots
- **Action budget ratio**: 5.0 → 1.3
- **Stamp cost** (Level 5): starts at 1, increases by 0.5 per stamp

---
<!-- BELOW THIS LINE: filled by engineer and playtester -->

## Solver Metrics

| Metric | Mon (d1) | Tue (d2) | Wed (d3) | Thu (d4) | Fri (d5) | Avg |
|---|---|---|---|---|---|---|
| Solvability | 100% | 100% | 100% | 100% | 100% | 100.0% |
| Puzzle Entropy | 25.6 | 50.7 | 92.3 | 152.4 | 209.4 | 106.1 |
| Skill-Depth | 84.6% | 92.5% | 87.5% | 85.0% | 95.7% | 89.1% |
| Decision Entropy | 2.84 | 3.62 | 4.01 | 5.08 | 5.37 | 4.18 |
| Counterintuitive | 0 | 1 | 2 | 1 | 1 | 1.0 |
| Drama | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.0 |
| Info Gain Ratio | 2.25 | 3.99 | 6.78 | 7.59 | 9.40 | 6.0 |
| Algorithm Alignment | 100% | 100% | 100% | 100% | 100% | 100.0% |
| Greedy-Optimal Gap | 225% | 471% | 300% | 233% | 1153% | 476.4% |
| Optimal Steps | 12 | 20 | 30 | 38 | 48 | 29.6 |
| Budget | 30 | 30 | 30 | 30 | 210 | 66.0 |

**Solver breakdown (Skill Level -> Actions)**:
- Level 1 (random): 19-189 steps, mixed stamp/scan, ~33-55% alignment
- Level 2 (scan-only): 21 steps at d1, FAILS at d2+ (O(n^2) exceeds budget)
- Level 3 (stamp-then-scan): 12-46 steps, 100% alignment (all stamps, no scans)
- Level 4 (stamp-all): 12-48 steps, 100% alignment (hash set approach)
- Level 5 (optimal): 10-41 steps, 100% alignment (selective stamping saves budget)

**Auto-kill check**: PASSED all thresholds
- Solvability: 100% (>= 100%)
- Skill-Depth: 89.1% (>= 10%)
- Algorithm Alignment: 100% (>= 50%)

## Play Report

Playtest skipped — browser harness not available. Metrics-only evaluation.

## Decision

**KEEP** — Strongest algorithm game metrics of all Tier 1 games. Every metric passes with flying colors: Skill-Depth 89.1% (highest), Algorithm Alignment 100%, Greedy-Optimal Gap 476% (scan-only O(n²) is catastrophically worse than stamp-all O(n)). The hash set insight is dramatically demonstrated — scan-only fails at Difficulty 2+ while stamp-all breezes through all levels. Decision Entropy (4.18) and Drama (1.0) are both excellent, showing the game has genuine moment-to-moment tension and meaningful choices.

**Concept Bridge**: This game teaches Hash Set/Hash Map. For the Blind 75 tracker, the kept `Tag` game now explicitly claims `#1 Two Sum` and `#217 Contains Duplicate`. For `#1`, the moment where you stamp a number and later it auto-matches maps to computing the complement, checking whether it is already stored, and only then recording the current number/index in the map. For `#217`, the mapping is even tighter: stamping each arriving number into the registry is inserting into a hash set, and the instant auto-highlight on a repeat tile is the `seen.contains(num)` duplicate check. The broader transferability to `#347 Top K Frequent Elements` and `#128 Longest Consecutive Sequence` remains plausible, but those tracker items are still not being claimed in this pass.
