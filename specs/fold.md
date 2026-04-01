# Fold

## Rules
Fold a 4x4 colored grid along row or column lines, stacking cells on top of each other. Clear the board by creating stacks where all layers share the same color -- mismatched stacks are frozen (unfoldable). Eliminate all cells in the fewest folds.

## Mechanic Type
Constraint Satisfaction

## Why It Works

### Stare Test
A 4x4 grid has 6 fold lines (3 horizontal, 3 vertical), each foldable in 2 directions (left-over-right or right-over-left), giving ~12 options per fold. A puzzle requiring 4-6 folds has a search tree of 12^4 to 12^6 (20,000 to 3 million) paths. More critically, each fold TRANSFORMS the board shape irreversibly: a horizontal fold at row 2 collapses the 4x4 into a 4x2 with 2-layer stacks, changing the available fold lines and the color overlaps for ALL subsequent folds. The player cannot mentally simulate even 3 folds ahead because the board geometry changes at each step -- it is not "which of 12 options is best?" but "what does the board even LOOK like after 2 folds, and what are my options THEN?" The spatial transformation of folding (rotation + overlay) is notoriously hard for human visualization -- origami designers struggle with 3-fold sequences on paper, let alone mentally. This is the same defense as Herd (combinatorial explosion of visible interactions) but applied to spatial transformation rather than agent movement.

### Dominant Strategy Test
"Fold the line that creates the most color matches" fails because a fold that matches 4 cells might leave the remaining board in a shape where no further fold can match anything. The cost of each fold is INCOMMENSURABLE: whether folding horizontally at row 2 is good depends on whether you later plan to fold vertically at column 1, which depends on what colors overlap after the first fold, which you cannot easily compute without doing it. A fold that creates 2 matches but leaves a cleanly foldable 2x4 remnant is better than a fold that creates 3 matches but leaves an L-shape with no viable next fold. Shape management (keeping the remnant foldable) competes with color matching (maximizing same-color overlaps) -- two incommensurable objectives per decision.

### Family Test
Spatial folding / overlay puzzle. This is NOT:
- FloodFill (painting regions -- Fold physically transforms grid geometry)
- Fit (placing shapes -- Fold reduces existing shapes by overlapping)
- Any toggle/constraint (no state flipping -- permanent geometric transformation)
- Any routing/pathing (no paths -- spatial overlap)
- Split (boundary construction -- Fold is boundary COLLAPSE)

The defining novelty: the grid geometry CHANGES with every action. No existing game in the portfolio transforms the board's shape -- they all operate on a fixed grid. Fold's board starts as 4x4 and might become 4x2, then 2x2, then 1x2 as folds proceed. Each fold is a physical transformation (rotation + stack + merge), creating a puzzle where the TOPOLOGY of available moves evolves per action. The closest commercial analogs are "paper folding" brain teasers and Fold-It puzzles, but those are single-solution spatial reasoning -- Fold adds the multi-step sequential decision layer with color constraints.

## Predicted Failure Mode
**Most likely death: d1 failure (spatial visualization too hard).** Folding is inherently 3D reasoning compressed into 2D. If the player cannot intuit what happens when they fold row 2 leftward, the game becomes guessing. Mitigation: show a LIVE PREVIEW of the fold as the player drags (cells slide and stack in real-time before committing). Also: early puzzles should use symmetric color patterns where the "right" fold is visually obvious (fold the two matching halves together).

**Second risk: A10 on easy days.** A 4x4 grid solvable in 2 folds has ~144 options (12x12). A careful player might enumerate. Mitigation: even 2-fold puzzles should have 3+ fold sequences that PARTIALLY clear, with the optimal (fewest remaining frozen stacks) requiring a non-obvious fold direction. Monday should need 3 folds minimum.

**Third risk: too few viable folds mid-puzzle.** After 2 folds, the board might be 2x2 with only 2 fold options -- path becomes forced (A8). Mitigation: generate puzzles by working BACKWARD from a flat state, adding folds that create solvable scrambled states. Ensure that at the 2-fold-remaining point, at least 2 genuinely different approaches exist.

**Anti-pattern proximity: A10 (fully visible).** Defense is the spatial transformation complexity -- the board changes shape, which changes the option space, which changes the board, recursively. If the transformation is too simple (always symmetric), the game becomes tractable. Folds MUST create asymmetric intermediate states where the next fold's effect is non-obvious.

## Expected Metrics
| Metric | Prediction | Reasoning |
|---|---|---|
| Puzzle Entropy | 15-25 | 6 fold lines x 2 directions = 12 options/step. 3-6 folds per puzzle. Board shape changes prune some options but create others. Effective tree depth is 3-6 with branching 4-8. |
| Skill-Depth | 50-70% | Spatial reasoning heavily rewards planning. Random folding almost never clears (mismatched stacks are frozen). Strategic players who visualize 2 folds ahead will dramatically outperform. |
| Counterintuitive Moves | 2-4 | "Fold AWAY from the matching pair to set up a 2-fold clearing sequence." The immediate fold that matches the most cells might create a frozen stack that blocks the optimal continuation. Deliberate delay-matching is the core CI pattern. |
| Drama | 0.5-0.7 | Late game: 2x2 remnant, one frozen stack from a mid-game mistake. "If only I'd folded column 2 first, that stack would have matched." Near-miss from fold order is visceral because you can SEE the mistake layer. |
| Decision Entropy | 2.5-3.0 | ~12 fold options per step, constraints (frozen stacks, board shape) prune to 4-8 viable. Rich choice space without overwhelming. |
| Info Gain Ratio | 1.8-2.5 | Strategic players who preview fold consequences will solve in 3-4 folds. Random folders will hit frozen stacks and fail. The preview (P1) enables comparison but doesn't solve the multi-step planning. |

## Player Experience
**Opening (5s):** A 4x4 grid of colored cells -- red, blue, green, yellow in a scrambled pattern. A dotted line appears between rows 2 and 3, hinting "fold here." You drag upward -- the bottom two rows flip up and land on top of the top rows. Where colors match, the cells glow and merge with a satisfying pop. Where they mismatch, the stack freezes with a subtle lock icon. You made 3 matches and 1 frozen stack. The grid is now 2x4 with some cells doubled.

**Middle (1-2min):** The 2x4 board has 3 fold options. You see a column fold that would match 2 more cells but it would stack a green onto the frozen red-blue stack, making it permanently unfixable. Instead, you fold the other column -- it only matches 1 cell, but it keeps the frozen stack accessible for a later fold that could fix it. This is the core tension: greedy matching vs. board management.

**Ending (15s):** Down to a 2x2. One frozen stack (red over blue from your first fold). The remaining fold either fixes it (if you fold diagonally... wait, only row/column folds are allowed) or locks it further. You see it: folding the top row down puts the red cell over the frozen stack -- but the red matches the red ON TOP of the frozen stack, clearing the red layer and leaving just the blue. One more fold resolves the blue. Puzzle clear! 5 folds, par was 4. That first fold was too greedy.

**The aha moment:** "The fold that matches the MOST cells right now isn't the best fold. I need to fold in a way that keeps the board in a shape where FUTURE folds can reach the remaining cells."

**The near-miss:** "I had 3 cells cleared by fold 2, ahead of pace. But the frozen stack from fold 1 cascaded -- by fold 4 it blocked everything. If I'd matched 2 instead of 3 on fold 1, the board shape would have been clean."

**Screenshot:** A sequence of shrinking grids: 4x4 -> 2x4 -> 2x2 -> 1x1, with color-coded layers showing where matches happened and where stacks froze. The grid compression tells the story.

## Difficulty Knobs
1. **Color count** (Monday: 2 colors on 4x4, folds almost always match something; Friday: 4 colors, mismatches are frequent and frozen stacks cascade)
2. **Optimal fold count** (Monday: 3-fold solution, generous par of 5; Friday: 6-fold solution, par of 7 -- deeper planning horizon required)
3. **Color distribution symmetry** (Monday: colors placed in roughly symmetric patterns so obvious folds work; Friday: asymmetric distribution where the obvious fold creates the most frozen stacks)

---
<!-- BELOW THIS LINE: filled by engineer and playtester, not designer -->

## Solver Metrics

Computed on 5 puzzles (Mon-Fri seeds), 5 skill levels each.

| Metric | Mon | Tue | Wed | Thu | Fri | Avg |
|---|---|---|---|---|---|---|
| Solvability | 100% | 100% | 100% | 100% | 100% | 100% |
| Puzzle Entropy | 9.5 | 9.5 | 9.5 | 9.5 | 9.5 | 9.5 |
| Skill-Depth | 100% | 100% | 100% | 100% | 100% | 100% |
| Decision Entropy | 3.16 | 3.16 | 3.16 | 3.16 | 3.16 | 3.16 |
| Counterintuitive | 0 | 0 | 0 | 0 | 0 | 0 |
| Drama | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| Duration (ms) | 0 | 0 | 0 | 0 | 0 | 0 |
| Info Gain Ratio | 1.32 | 1.65 | 1.31 | 1.56 | 1.40 | 1.45 |
| Solution Uniqueness | 1 | 1 | 1 | 1 | 1 | 1.0 |

**Auto-kill check**: FAILED (Counterintuitive = 0 across all puzzles)

**Root cause**: The folding mechanic is structurally monotonic. Each fold either clears cells (reducing active count) or creates frozen stacks (permanent damage). Since frozen stacks are irreversible, the optimal solution NEVER creates them, which means the heuristic strictly decreases along the optimal path. There is no mechanism for a "sacrifice now, gain later" move because:
1. Frozen stacks cannot be repaired or unfrozen
2. Every fold in the optimal path only matches (clears) cells
3. No fold needs to make the board temporarily "worse" to enable a better future fold

This makes greedy play near-optimal: always pick the fold that clears the most cells. The "shape management" tension described in the spec (greedy matching vs. board geometry) does not materialize because the fold sequence's color constraints ensure all overlaps match in the intended solution.

**Potential fix**: If frozen stacks could be RESOLVED (e.g., folding a matching-color layer onto a frozen stack clears it), this would create the sacrifice/recovery dynamic needed for counterintuitive moves. But this changes the core mechanic significantly.

**Weakest metric**: Counterintuitive -- 0 (greedy play is near-optimal; no aha moments)
**Strongest metric**: Skill-Depth -- 100% (random play cannot solve; strategic play always can)

## Play Report
<!-- Playtester fills this section with blind play observations -->

## Decision

**Status: KILL** (auto-kill, CI = 0 across all puzzles, Drama = 0.00)

**Reason:** Folding is structurally monotonic -- optimal solutions NEVER create frozen stacks, so greedy "fold for max matches" is near-optimal. The predicted "shape management vs. color matching" tension does not materialize. CI = 0, Drama = 0.00. Frozen stacks are irreversible damage, so the optimal path simply avoids them, eliminating any sacrifice-now-gain-later dynamic.

**Lesson learned:** Irreversible damage mechanics (frozen stacks, permanent penalties) are structurally incompatible with counterintuitive play. If the penalty is permanent, the optimal path always avoids it, making greedy play near-optimal. For CI > 0, the "bad" state must be RECOVERABLE -- the player must be able to make things temporarily worse knowing they can fix it later. Permanent damage = monotonic optimization = CI = 0.
