# Sort

## Rules
Reverse any contiguous group of 2-4 tokens in a row to sort them by color. Get all same-colored tokens adjacent within par reversals.

## Mechanic Type
Constraint Satisfaction

## Why It Works

### Stare Test
A row of 12 tokens with 3-4 colors. At each step, the player selects a contiguous subsequence of length 2-4 and reverses it. With ~30 possible reversals per step (10 start positions x 3 length choices) and solutions requiring 6-10 reversals, the search tree has 30^6 to 30^10 paths (billions). But the critical complexity is not just tree size -- it is that BOUNDED reversals are a non-trivial permutation group. Unlike adjacent swaps (which can always sort in N*(N-1)/2 steps via bubble sort), bounded reversals create UNREACHABLE intermediate states: some permutations that "look close" to sorted are actually far away because no single reversal of length 2-4 can fix them. The player must route through non-obvious intermediate states to reach the goal. This is the pancake sorting problem (studied in combinatorics), known to be NP-hard for bounded-length reversals. No human can mentally enumerate the optimal path for 10+ tokens.

### Dominant Strategy Test
"Reverse the group that creates the longest same-colored run" fails because a reversal that groups 3 reds might break an existing pair of blues or scatter greens that were conveniently adjacent. The cost of every reversal is INCOMMENSURABLE: whether reversing positions 3-6 is good depends on whether you later plan to reverse positions 5-8 (which overlaps and partially undoes the first reversal) or positions 1-4 (which doesn't overlap but might scatter a color you just grouped). The bounded length constraint (max 4) is crucial: the player cannot simply reverse the entire row to fix everything at once. They must compose small local operations to achieve a global goal, and each local operation has non-local consequences.

"Fix the leftmost out-of-place token" (greedy left-to-right) also fails because moving a token to its correct position via bounded reversal inevitably disrupts 1-3 other tokens that were already placed. The player must balance PROGRESS (grouping one color) against PRESERVATION (not scattering others) -- two objectives that conflict at nearly every step.

### Family Test
Bounded-reversal permutation. This is NOT:
- Adjacent swap sorting (exhausted -- CI=0, all swaps equivalent)
- Row/column rotation (Twist, Drift -- exhausted; rotation is a cyclic permutation, not a reversal)
- IceSlide or any push/slide (single agent on 2D grid, not sequence manipulation)
- DropPop (gravity-based collapse, not sequence reversal)
- Any grid-based game (Sort operates on a 1D sequence, not 2D)

The defining novelty: BOUNDED REVERSAL as the primitive operation. Unlike swaps (CI=0 because any swap makes progress) or rotations (CI=0 because rotation on identical element sets degenerates), reversals of length 2-4 create a rich permutation group where some moves that look like regression are necessary detours. The sequence context changes the meaning of every reversal -- reversing RGBR gives RBGR, which looks similar but has fundamentally different reversal options going forward. The closest commercial analog is pancake sorting puzzles, but those allow unbounded-length reversals (always from one end). Bounding the length and allowing arbitrary position creates a harder, richer puzzle.

## Predicted Failure Mode
**Most likely death: A10 (solvable by staring on easy days).** A row of 6 tokens in 2 colors might be mentally sortable via exhaustive enumeration (small search tree). Mitigation: minimum 10 tokens on all days, with 3+ colors. Monday has 10 tokens / 3 colors (simple), Friday has 14 tokens / 4 colors (complex).

**Second risk: feels like a chore.** Sorting is a common task that doesn't inherently feel "fun." If the game feels like manual labor (methodically moving tokens left), the emotional arc dies. Mitigation: satisfying snap animation on reversals (tokens flip in an arc), chunky sound, and the BOUNDED constraint creates dramatic "I can see the solution but I can't reach it in one move" moments that transform tedium into tension.

**Third risk: Decision Entropy too high (meaningless choices).** With ~30 options per step, the player might feel overwhelmed. Mitigation: highlight "legal" reversal groups on tap (select start position, then choose length 2/3/4), reducing cognitive load. The natural structure of the row (runs of same color) gives visual anchors that make the 30 options feel like ~5-8 meaningful clusters.

**Anti-pattern proximity: A10 (fully visible) and A8 (forced path).** A10 defense is the NP-hard search space -- even for 12 tokens, optimal solutions are non-obvious. A8 defense is the ~30 options per step. The real risk is that HEURISTIC play (greedy grouping) produces NEAR-OPTIMAL results, making the skill gap too small. The generator must verify that greedy-first-color sorting requires 30%+ more moves than optimal on most seeds.

## Expected Metrics
| Metric | Prediction | Reasoning |
|---|---|---|
| Puzzle Entropy | 18-28 | 10-14 tokens, ~30 reversal options per step, 6-10 steps. Huge search tree. Even with pruning, effective state space is enormous. Bounded reversals create a non-trivial group where distant states may be close and vice versa. |
| Skill-Depth | 50-75% | Greedy sorting (fix nearest group) will require 40-60% more moves than optimal. Strategic players who plan 3-4 reversals ahead (looking for "setup" reversals that enable efficient future moves) will dramatically outperform. The bounded-length constraint rewards players who recognize multi-reversal combos. |
| Counterintuitive Moves | 3-6 | "Reverse this already-sorted section" to set up a 2-reversal combo that groups both red AND blue simultaneously. Breaking a good state to enable a better one is the heart of the puzzle. Also: "Reverse length 2 instead of length 4" when the longer reversal would group more tokens now but scatter them for the next move. Length selection is a rich CI source. |
| Drama | 0.5-0.7 | Player gets 3 of 4 color groups sorted, then realizes the last group is interleaved and needs 3+ more reversals when they're at par-1. "So close but the last color is impossible to untangle without undoing something." Near-miss from early greedy play that didn't account for the final color. |
| Decision Entropy | 2.5-3.5 | ~30 options per step, but color grouping constraints naturally prune to ~6-10 meaningful reversals (ones that increase at least one same-color adjacency or set up a future combo). Rich enough for genuine strategy without overwhelming. |
| Info Gain Ratio | 2.0-3.0 | Strategic players who plan multi-reversal sequences will solve in 6-8 moves. Greedy players will take 10-14 moves. The gap is significant because bounded reversals compound -- a good 2-reversal setup saves 3 moves in the endgame. |

## Player Experience
**Opening (5s):** A row of 12 colored tokens: R B G R R B G R B G B G. Three colors, scrambled. You see three reds scattered at positions 1, 4, 5, 8. If you could just grab them... but you can only reverse groups of 2-4. You select positions 4-5-6 (R,R,B) and reverse to get B,R,R -- now three reds are adjacent at positions 4-5-6! Wait, the B at position 3 was already next to a B at position 7... and now you've pushed them apart. The reversal animation was satisfying (tokens flipping in a little arc) but you might have made the blues harder.

**Middle (2min):** Reds are grouped (positions 4-5-6). Blues are scattered: positions 1, 3, 7, 11. Greens at 2, 8, 9, 10, 12. You need to bring blues together and greens together without breaking the reds. You see: reversing positions 7-8-9-10 (B,G,G,G) gives G,G,G,B -- that groups the greens AND moves the blue. But it puts the blue at position 10, far from the other blues. Alternatively, reverse positions 1-2-3 (R,B,G) to get G,B,R... no, that breaks the R. The bounded length means you can't just sweep everything into place. You need a SEQUENCE: first, reverse 8-9 (G,G -> G,G, useless). Actually, reverse 7-8-9 (B,G,G -> G,G,B). Now blues are at 1, 3, 9, 11. Still scattered. Hmm. This needs a different approach entirely -- group greens FIRST using a 3-reversal sequence, then sweep blues.

**Ending (20s):** Greens grouped, reds grouped. Four blues remain: positions 1, 3, 10, 12. Two pairs, each separated by one token. Reverse positions 1-2-3 to slide the first blue pair together. One reversal left before par. Positions 10-11-12: B, G, B. Reverse to get B, B, G -- blues together! All four colors grouped. Made par exactly. The last two reversals were a mirror pattern -- noticing the symmetry was the key.

**The aha moment:** "I need to reverse the WRONG section -- break the greens temporarily -- to move a blue into position. Then the next reversal fixes the greens AND groups the blues. One move that looks like regression sets up a 2-for-1."

**The near-miss:** "11 moves, par was 9. I spent 4 moves fixing blues one at a time when a single 3-reversal setup would have grouped them all. The greedy approach (fix the nearest problem) added 2 moves because each fix created a new problem."

**Screenshot:** The initial scrambled row as colored circles above, the sorted row below, with arrows showing the reversal sequence. Each reversal marked with its move number and an arc connecting the reversed segment.

## Difficulty Knobs
1. **Token count and color count** (Monday: 10 tokens / 3 colors, smaller search space; Friday: 14 tokens / 4 colors, more interleaving and harder grouping)
2. **Initial scramble quality** (Monday: tokens start with 2-3 same-color pairs already adjacent, only 3-4 "breaks" to fix; Friday: fully interleaved, no existing pairs, requiring total reconstruction)
3. **Par calibration** (Monday: par = optimal + 4, very generous; Friday: par = optimal + 1, demands multi-reversal planning and minimal wasted moves)

---
<!-- BELOW THIS LINE: filled by engineer and playtester, not designer -->

## Solver Metrics

Computed on 5 puzzles (Mon-Fri seeds), 5 skill levels each.

| Metric | Mon | Tue | Wed | Thu | Fri | Avg |
|---|---|---|---|---|---|---|
| Solvability | 100% | 100% | 100% | 100% | 100% | 100% |
| Puzzle Entropy | 18.3 | 23.8 | 29.4 | 35.3 | 36.2 | 28.6 |
| Skill-Depth | 97.8% | 66.7% | 66.7% | 66.7% | 66.7% | 72.9% |
| Decision Entropy | 1.84 | 1.77 | 1.70 | 1.69 | 1.70 | 1.74 |
| Counterintuitive | 0 | 0 | 0 | 1 | 0 | 0.2 |
| Drama | 0.50 | 0.50 | 0.57 | 0.57 | 0.63 | 0.55 |
| Duration (s) | 0.005 | 0.003 | 0.003 | 0.003 | 0.004 | 0.004 |
| Info Gain Ratio | 6.88 | 6.07 | 5.24 | 4.92 | 4.87 | 5.60 |
| Solution Uniqueness | 1 | 1 | 3 | 1 | 1 | 1.4 |
| Optimal Steps | 4 | 5 | 6 | 7 | 7 | 5.8 |

**Auto-kill check**: PASSED
**Weakest metric**: Counterintuitive — 0.2 avg (barely above 0; most optimal solutions are monotonically improving, though Thu has 1 CI move)
**Strongest metric**: Skill-Depth — 72.9% (greedy takes 8-66 steps vs optimal 4-7; huge gap between strategic and naive play)

## Play Report

**BUG (minor)**: Palindrome reversals (e.g., YGY→YGY) cost a move. Should be blocked or warned.

**Session 1 (Intuitive)**: Rules clear after 1 tap. Reversal preview (showing "RGB→BGR" on buttons) is exceptionally clear — zero guesswork. First move increased breaks 5→6 (surprise). Found 3-move collapse sequence (breaks 5→4→3→1) via experimentation + undo. Then 3 boring "marching" moves to drag isolated R across board. Solved in 6 (par 5). Win celebration satisfying.

**Session 2 (Strategic)**: Identified optimal 3-move opening immediately. Explored all alternative first moves — only 2 of ~30 reduce breaks. Very narrow correct path. Could NOT find a 5-move solution despite systematic exploration. Same 6-move result as intuitive play.

**Session 3 (Edge Cases)**: Partial dominant strategy (greedy "reduce breaks" is strong but doesn't reach par). Can fail (breaks increase on bad moves). Palindrome no-op wastes moves. Deselect works. Undo clean.

**Strategy Divergence**: Mixed. Strategic found same 3-move sequence as intuitive (with fewer wasted moves). Both sessions = 6 moves. Game has ONE interesting decision (3-move setup) then 3 mechanical "marching" moves with no drama. Breaks=1 endgame is tedious bookkeeping.

**Best Moment**: Move 3 — Breaks dropping 3→1 in one reversal. Board visually collapsed from chaos to "almost done."
**Worst Moment**: Moves 4-5-6, dragging isolated R across the board. Each move kept Breaks=1. Puzzle felt over but required cleanup.

## Decision

**Status: KILL** (mercy kill after first playtest)

**Reason:** One interesting 3-move collapse, then 3 boring "marching" moves of mechanical cleanup. Strategic play produced the SAME result as intuitive (both 6 moves, par 5 unreachable). CI = 0.2 (greedy is near-optimal). Only 2 of ~30 first moves reduce breaks -- path is narrow and forced. Breaks=1 endgame is pure tedium. The emotional arc is one satisfying collapse followed by janitorial bookkeeping.

**Lesson learned:** Bounded-reversal sorting creates dramatic opening collapses but degenerates into tedious endgame marching once Breaks=1 (isolated token). 1D sequence puzzles lack the spatial richness of 2D grids -- with strong heuristic pruning, the effective decision space is too narrow for daily puzzle depth. Sorting puzzles need endgame mechanics AS interesting as the opening, or a scoring system about HOW you sort (efficiency), not WHETHER (completion).
