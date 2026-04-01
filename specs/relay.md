# Relay

## Rules
Hidden wires connect transmitters (grid edges) to receivers (marked cells). Activate transmitters to light up the cells each wire passes through; deduce all transmitter-receiver connections using limited activations. Submit your mapping to win.

## Mechanic Type
Constraint Satisfaction

## Why It Works

### Stare Test
All wiring is hidden. The player starts with zero information -- only transmitter positions (edges) and receiver positions (interior cells) are visible. Every fact must be earned by spending a limited activation. Crucially, wires can OVERLAP on shared grid cells, so activating one transmitter may light cells belonging to multiple wire paths. This creates LOSSY partial information (the key insight from learnings.md that defeats A10): you see WHICH cells lit up, but not WHICH wire lit each shared cell. Disambiguation requires strategic activation sequences.

### Dominant Strategy Test
"Activate the transmitter with the most connections" is not available information -- you don't know the wiring. "Activate transmitters one by one" wastes activations when overlap exists, because you can't tell which wire lit shared cells. The smart play is to activate combinations that create distinguishable light patterns: "If I activate transmitter A and see cells {1,3,5} lit, then activate B and see {3,5,7} lit, cell 3 could belong to A, B, or both." The deduction depends on the specific spatial layout of transmitters and receivers -- no fixed strategy works across puzzles.

### Family Test
Hidden spatial routing deduction. This is NOT:
- Probe (Minesweeper counts -- aggregate numerical clue per cell)
- Seek (distance to target -- scalar per probe)
- Dial (hidden coupling -- but full coupling revealed per probe, killed by A10)
- BitMap (all clues visible upfront)
- PathWeaver (player builds routes -- here routes are hidden and must be deduced)

The unique aspect: overlapping hidden paths create SET-based ambiguity. Each activation reveals a SET of cells, and the player must compute set intersections/differences across activations to isolate individual wires. This is closer to genetic epistasis or fault isolation than any existing puzzle family.

## Predicted Failure Mode
**Most likely death: Dial's fate (A10 after probing phase).** If each activation reveals a wire's COMPLETE path with no overlap, the puzzle reduces to "activate all transmitters, read the answers" -- no deduction needed. The game DEPENDS on wire overlap creating genuine ambiguity. If overlap is too rare (sparse grid, few wires), activations are unambiguous and the game is trivial. If overlap is too dense, deduction becomes impossible (A11 -- luck not skill).

**Second risk: computational feel.** Set intersection reasoning might feel like math homework rather than spatial intuition. The visual design must make overlap visible and visceral -- wires lighting up with color mixing where they cross.

**Anti-pattern proximity: Dial (31, killed).** Dial failed because probing fully revealed couplings. Relay's mitigation: overlapping wires create PARTIAL reveals, not full reveals. The ambiguity from shared cells means each activation gives lossy information, requiring multiple activations to be cross-referenced.

## Expected Metrics
| Metric | Prediction | Reasoning |
|---|---|---|
| Puzzle Entropy | 12-18 | N transmitters x N receivers = N! possible mappings. With 5 pairs: 5!=120 states. Each activation prunes some mappings. ~5-8 decisions per puzzle. |
| Skill-Depth | 50-70% | Strategic activation order (disambiguating overlaps) should hugely outperform random. Optimal solver uses information-theoretic activation selection. |
| Counterintuitive Moves | 2-3 | Activating a transmitter that reveals "nothing new" can be optimal when it ELIMINATES a hypothesis about overlap. Negative evidence is as valuable as positive. |
| Drama | 0.5-0.7 | Final mapping submission is all-or-nothing. Near-par finishes hinge on whether the last ambiguous pair was correctly deduced. |
| Decision Entropy | 2.0-3.0 | 5-8 transmitters available per activation, but constraint state makes 2-4 genuinely informative. |
| Info Gain Ratio | 1.8-2.5 | Strategic activation should reveal 2-3x more deductive information per activation than random, due to overlap exploitation. |

## Player Experience
**Opening (10s):** You see 5 transmitter icons on the grid edges and 5 receiver icons at interior cells. Lines connect somewhere underneath, but the grid is dark. You tap Transmitter A -- a wire lights up, tracing a path through 4 cells to Receiver 3. Easy: A connects to 3. You've used 1 of 6 activations.

**Middle (2-3min):** Three activations in. Transmitter C lit up cells {4, 7, 8, 11} and Transmitter D lit up cells {7, 8, 12, 15}. Cells 7 and 8 are shared -- both wires pass through them. You know C goes to one of {Receiver 2, Receiver 5} and D goes to the other, but which? You study the spatial layout: Receiver 2 is in the top-right, and C's non-shared cells {4, 11} trend upper-right. You hypothesize C-to-2. But you're not sure. Do you spend an activation to confirm, or move on and hope later deductions resolve it?

**Ending (30s):** One activation left, one ambiguous pair. You realize: Transmitter E is the last unactivated, and if its wire goes through cell 7, then D MUST connect to Receiver 5 (because E would account for 7's other wire). You activate E. Its wire passes through {7, 9, 13} -- cell 7 is shared with E! That means D's path through 7 is shared with E, not a unique D path. The deduction cascades: D goes to Receiver 5 via {8, 12, 15}, and C goes to Receiver 2 via {4, 7, 8, 11} where 7 and 8 are shared with other wires. You submit the mapping -- correct, one under par.

**The aha moment:** "Cell 7 being shared between three wires means..." -- the sudden realization that overlap constraints FORCE a specific mapping.

**The near-miss:** "I should have activated E before D -- I would have known about the overlap at cell 7 immediately and saved an activation."

## Difficulty Knobs
1. **Number of transmitter-receiver pairs** (Monday: 3 pairs with minimal overlap = clear deduction; Friday: 6 pairs with dense overlap = complex set reasoning)
2. **Wire overlap density** (Monday: wires rarely share cells, each activation is nearly unambiguous; Friday: 40-60% of cells are shared between 2+ wires, creating deep ambiguity)
3. **Activation budget** (Monday: par = pairs + 2 = generous; Friday: par = pairs - 1 = must deduce at least 2 pairs without direct activation)

---
<!-- BELOW THIS LINE: filled by engineer and playtester, not designer -->

## Solver Metrics

Computed on 5 puzzles (Mon-Fri seeds), 5 skill levels each.

| Metric | Mon | Tue | Wed | Thu | Fri | Avg |
|---|---|---|---|---|---|---|
| Solvability | 100% | 100% | 100% | 100% | 100% | 100% |
| Puzzle Entropy | 5.8 | 14.6 | 16.2 | 22.4 | 19.8 | 15.8 |
| Skill-Depth | 75% | 100% | 100% | 100% | 100% | 95% |
| Decision Entropy | 1.15 | 1.62 | 1.80 | 2.04 | 1.98 | 1.72 |
| Counterintuitive | 0 | 3 | 0 | 1 | 0 | 0.8 |
| Drama | 0.83 | 0.92 | 0.99 | 1.00 | 1.00 | 0.95 |
| Duration (s) | 0.000 | 0.000 | 0.001 | 0.001 | 0.001 | 0.001 |
| Info Gain Ratio | 1.00 | 1.33 | 1.00 | 1.20 | 1.11 | 1.13 |
| Solution Uniqueness | 2 | 1 | 13 | 21 | 1 | 7.6 |

**Auto-kill check**: PASSED
**Weakest metric**: Info Gain Ratio -- 1.13 (below ideal 1.5+; strategic vs random activation gives only modest advantage, suggesting many activations are equally informative)
**Strongest metric**: Skill-Depth -- 95% (random play almost never solves; strategic play nearly always does)

### Notes

- Skill level 2 (greedy: activate all, match receiver by path endpoint) achieves 100% correct across all puzzles. This is concerning -- it suggests the receiver-in-path heuristic trivially solves the deduction, bypassing the intended set-intersection reasoning.
- Skill levels 3-4 (information-theoretic) sometimes fail on Tue/Fri because the budget is tight and the permutation-filtering sometimes doesn't narrow to 1 mapping. Level 5 uses perfect knowledge fallback.
- The greedy solver's 100% success rate means the "overlap ambiguity" that the spec depends on may not create enough genuine confusion -- the path endpoint is always visible and unambiguous.
- Solution Uniqueness is high (avg 7.6) meaning many activation orderings work, suggesting decisions between activations aren't very meaningful.

## Play Report

**CRITICAL BUG**: Submit button below viewport fold (y=729 on 600px viewport). Not discoverable without scrolling.

**BUG**: Duplicate receiver assignments silently permitted. Two transmitters can claim same receiver with no warning.

**Session 1 (Intuitive)**: Rules clear after 2 taps. Activated all 4 transmitters. Wire paths lit up clearly and persisted. But every wire path pointed unambiguously at exactly one receiver. No overlap, no confusion. Solved correctly with 4 activations (at par).

**Session 2 (Strategic)**: Strategy = read spatial layout before activating. Transmitters and receivers share rows/columns making answer deducible by inspection. Solved with 2 activations (confirmation only), substantially beating par. Could have solved with 0 activations.

**Session 3 (Edge Cases)**: Solvable WITHOUT ANY activations. Layout leaks the answer. Transmitter-receiver pairs share rows/columns. Duplicate receiver assignment allowed. Wall-mashing not applicable.

**Strategy Divergence**: Strategic play better numerically (2 vs 4 activations) but same underlying reasoning. Core mechanic (activation) is completely skippable. This is fatal: if the puzzle layout leaks the solution before the player engages the mechanic, the mechanic has no function.

**Best Moment**: C activation lighting up 5 cells running down a column into receiver 3.
**Worst Moment**: Realizing correct answers submittable without any activations — the defining mechanic is vestigial.

## Decision

**Status: KILL**

**Reasoning:** The core mechanic is fatally broken in a way that cannot be iterated out. The puzzle is solvable WITHOUT ANY activations -- the spatial layout of transmitters and receivers leaks the answer. The playtester confirmed: "transmitter-receiver pairs share rows/columns," making the mapping deducible by inspection. This is A10 (fully-visible optimization) in disguise: despite the "hidden wires" framing, the spatial arrangement of endpoints gives away the answer before the player engages the mechanic.

The metrics confirm the structural problem:
- **Info-gain ratio = 1.13** (below the 1.2 red flag threshold) -- strategic activation is barely better than random because activations provide almost no new information beyond what's already visible.
- **Solution uniqueness = 7.6** -- many activation orderings "work" because the decisions between activations are meaningless.
- **Greedy solver achieves 100%** just by activating all transmitters and matching by endpoint -- no set-intersection reasoning needed.

The overlap ambiguity that the spec depended on never materialized. Even if wire overlap were increased, the receiver positions still leak the mapping. To fix this, you would need to hide receiver positions entirely -- but then the game becomes a different game (closer to Signal's probing mechanic). There is no version of "deduce visible-endpoint-to-visible-endpoint connections" that resists spatial inspection.

**Lesson learned:** Hidden-info puzzles where the ENDPOINTS are visible and spatially constrained will always leak the mapping through spatial proximity. For hidden-routing deduction to work, at least one endpoint set must be hidden or the routing must be non-spatial (logical, not geometric).
