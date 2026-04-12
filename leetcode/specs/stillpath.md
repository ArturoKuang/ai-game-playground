# Stillpath

## Algorithm Game Spec

1. `game_name`: Stillpath
2. `algorithm_target`: 2.3 DFS / Backtracking
3. `core_insight`: Keep one nondecreasing recipe stack alive, reuse the current herb while it still fits, climb only forward to heavier herbs, and retreat one layer the moment the remaining gap proves the branch is spent.
4. `one_line_pitch`: Bottle every exact blend on a sorted cellar shelf before the audit clock closes.
5. `rules`:
   - The shelf is sorted from lighter herbs to heavier herbs.
   - `Brew Here` adds the live herb to the current recipe and keeps that same herb reusable on this branch.
   - `Skip Heavier` advances to the next stronger herb at the same depth.
   - `Bottle Recipe` is legal only when the current total matches the target exactly.
   - `Backtrack` removes the most recent herb and reopens the next heavier choice from that parent layer.
   - Once the remaining gap is smaller than the live herb, the branch is spent and only retreating can preserve the audit clock.
   - The run ends when every exact recipe is bottled or when the audit clock runs out.
6. `core_actions`:
   - reuse the current herb on the same branch
   - climb forward through heavier herbs without going backward
   - bottle exact totals as completed recipes
   - retreat one layer when a branch overshoots or exhausts
   - keep searching until every valid recipe is logged
7. `algorithm_to_mechanic_mapping`:
   - The current recipe stack maps to the `path` array in Combination Sum.
   - `Brew Here` maps to pushing `candidates[i]` and recursing with the same start index `i`.
   - `Skip Heavier` maps to advancing the loop to `i + 1`.
   - The sorted shelf and remaining-gap check map to the prune condition where larger candidates can be skipped once the current candidate already exceeds the remaining target.
   - `Bottle Recipe` maps to recording a copy of `path` when the running total hits the target.
   - `Backtrack` maps to popping the last candidate before the search continues from the parent frame.
8. `why_greedy_fails`: The strongest near miss is overcommit-without-pruning. It keeps proving dead branches physically even after the remaining gap is already smaller than the live herb. That still looks disciplined, but it burns the budget immediately because the sorted shelf already told the player those heavier pours cannot work.
9. `aha_moment`: "I do not need to restart the whole shelf. I only need to peel off the last herb and continue from the next heavier option."
10. `difficulty_progression`:
    - D1: Small shelves make reuse, bottling, and one-layer retreat legible.
    - D2: More exact blends force the player to keep the current branch alive instead of treating each recipe as a fresh start.
    - D3: The prune becomes visible immediately because dead heavier pours start wasting a meaningful chunk of the clock.
    - D4: Larger totals punish any branch that ignores the sorted remaining-gap clue.
    - D5: Several medium-length recipe trees require deliberate same-index reuse and local unwinding under pressure.
11. `predicted_failure_mode`: If the route log and current shelf marker are too subtle, the game can read like generic arithmetic rather than a live DFS stack with reusable candidates and one-layer retreat.
12. `acceptance_criteria`:
    - Winning players should describe a live stack that keeps one branch open while heavier options are tested in order.
    - The post-game bridge must claim Blind 75 `#39 Combination Sum` directly and specifically.
    - Solver evaluation should show full solvability for the intended route set.
    - The strongest alternative should leak moves because it physically proves overshoot branches that the sorted shelf already made impossible.
13. `predicted_scorecard`:
    - `skill_depth`: `0.45`
    - `counterintuitive_moves`: `8.0`
    - `algorithm_alignment`: `0.95`
    - `greedy_optimal_gap`: `0.30`
    - `difficulty_curve`: `D2`
    - `insight_inflection`: `D2`
14. `open_questions_for_engineering`:
    - Does the shelf cursor read clearly enough that players understand "same herb again" versus "heavier herb now" at a glance?
    - Is the difference between bottling and retreating obvious enough on exact totals?
    - Do the ledger and route log make the backtracking rhythm legible without exposing code jargon?

## Implementation Packet

1. `version_id`: Stillpath v1
2. `algorithm_game_spec`: sorted cellar search with reusable shelf slots, exact-total bottling, one-layer retreat, and a visible remaining-gap prune
3. `prototype_scope`: one `Stillpath` screen, five difficulty presets, rerollable shelves, solver evaluation against an overcommit-without-pruning baseline, and a direct Blind 75 concept bridge for `#39`
4. `difficulty_scope`: D1-D2 teach the stack and reuse rhythm; D3-D5 amplify the sorted-gap prune and local retreat pressure
5. `non_goals`:
   - no claim that this pass also covers `#79 Word Search`
   - no attempt to teach subset/permutation ordering variants in the same build
   - no live browser automation inside this sandbox
6. `predicted_scorecard`:
   - `solvability`: `1.00`
   - `skill_depth`: `0.45`
   - `counterintuitive_moves`: `8.0`
   - `algorithm_alignment`: `0.95`
   - `greedy_optimal_gap`: `0.30`

## Prototype Package

1. `game_entrypoint`: `src/games/Stillpath.tsx`
2. `difficulty_controls`: five difficulty chips plus `Reset Cellar` and `New Shelf`
3. `changed_files`:
   - `src/solvers/Stillpath.solver.ts`
   - `src/games/Stillpath.tsx`
   - `src/games/index.ts`
   - `leetcode/specs/stillpath.md`
   - `leetcode/results.tsv`
   - `run-program.md`
4. `artifact_paths`:
   - `src/solvers/Stillpath.solver.ts`
   - `src/games/Stillpath.tsx`
   - `leetcode/specs/stillpath.md`
5. `actual_scorecard`:
   - `solvability`: `100%`
   - `skill_depth`: `51.5%`
   - `counterintuitive_moves`: `10.55`
   - `drama`: `0.77`
   - `decision_entropy`: `1.01`
   - `info_gain_ratio`: `2.21`
   - `algorithm_alignment`: `99.0%`
   - `leetCode_fit`: `98.5%`
   - `best_alternative_gap`: `51.5%`
   - `invariant_pressure`: `42.2%`
   - `difficulty_breakpoint`: `D1`
6. `known_issues`:
   - Live blind browser play was not run in this sandbox. The blind report below is based on solver evaluation, direct UI inspection, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`.
   - The hardest shelves still ask for many exact pours in one session, so future polish may want one or two stronger visual cues around "spent branch" state before adding more route complexity.

## Blind Play Report

- `rules_clarity`: The shelf, current total, target proof, and bottled ledger make the objective understandable. The main blind risk is whether players immediately notice that backtracking reopens the next heavier choice from the parent layer rather than resetting the whole cellar.
- `easy_strategy`: Early play should sound like "keep using the same herb while it still fits, then try the next stronger one." D1 shelves are short enough that the recipe stack feels concrete rather than abstract.
- `medium_strategy`: D2 should be where players start talking about one branch staying alive. They still need to bottle exact totals, but they stop treating each recipe as a brand-new start.
- `hard_strategy`: D3-D5 demand the full ritual: reuse the current herb, advance only forward, and retreat immediately once the live herb is already too strong for the remaining gap.
- `strategy_evolution`: The expected shift is from "try sums until one lands" to "keep a sorted branch alive, prune dead heavier pours early, and back out just one layer at a time."
- `plain_english_pattern`: "I keep one recipe open, reuse the current ingredient if it still fits, and when it stops fitting I step back one ingredient and continue from the next stronger option."
- `naive_vs_optimal`: The strongest wrong strategy is proving dead overshoots physically. It still feels systematic, but the sorted shelf already told the player those heavier pours could not save the branch.
- `confusion_points`: Players may initially think `Backtrack` means "start over." The cursor highlight and route log are doing the crucial teaching work there.
- `bug_summary`: No blocking implementation bugs surfaced during solver evaluation, typecheck, direct UI inspection, or web export.
- `verdict`: keep

## Decision Memo

- `decision`: keep
- `why`: Stillpath teaches Blind 75 `#39 Combination Sum` directly enough to justify a dedicated kept game. The build hit `100%` solvability, `99.0%` algorithm alignment, `98.5%` LeetCode fit, and a strong `51.5%` gap against the overcommit-without-pruning baseline.
- `evidence_used`: `node --experimental-strip-types --input-type=module` evaluation from `src/solvers/Stillpath.solver.ts`, direct UI inspection, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`
- `bug_status`: no open implementation bugs
- `algorithm_alignment_judgment`: strong enough to claim Blind 75 `#39 Combination Sum` directly
- `next_action`: mark `#39` complete in the Blind 75 tracker and leave the next outer-loop pass for `#79 Word Search`
- `polish_scope`: if browser-capable blind play becomes available later, confirm that first-time players infer "retreat one layer" before they fall back to whole-cellar resets

## Concept Bridge

This game teaches sorted DFS/backtracking for reusable-candidate exact sums. For the Blind 75 tracker, the kept `Stillpath` game claims `#39 Combination Sum`.

The moment where `Brew Here` keeps the same shelf slot alive maps to recursing with the same candidate index so the number can be reused. The moment where `Backtrack` pops only the latest herb and resumes from the next heavier shelf slot maps to `path.pop()` followed by continuing the loop at the parent frame, while the remaining-gap prune maps to stopping once the sorted candidate already exceeds the leftover target.
