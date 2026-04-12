# Truce

## Algorithm Game Spec

1. `game_name`: Truce
2. `algorithm_target`: 1.2 Two Pointers
3. `core_insight`: Sort the roster once, lock one envoy as the anchor, then move the inner left or right envoy strictly from the sign of the current three-way sum. A valid trio does not end the anchor; you keep squeezing until that anchor is exhausted.
4. `one_line_pitch`: Broker zero-balance treaties by fixing one envoy and squeezing the two inner envoys until every unique accord is cataloged.
5. `rules`:
   - The envoy roster is already sorted from most negative to most positive.
   - One envoy is the active anchor.
   - `Raise Left` moves the inner left envoy one step right.
   - `Lower Right` moves the inner right envoy one step left.
   - `Claim Accord` works only when anchor + left + right equals `0`.
   - `Advance Anchor` jumps to the next distinct anchor value and resets the inner sweep.
   - `Full Audit` brute-forces every remaining trio at a large action cost.
   - `Finish Catalog` succeeds only if every unique zero-balance trio has been logged.
6. `core_actions`:
   - Read the sign of the live trio sum.
   - Move the left envoy when the sum is too small.
   - Move the right envoy when the sum is too large.
   - Claim a valid trio without abandoning the current anchor.
   - Use `Full Audit` only as the weaker fallback instinct.
7. `algorithm_to_mechanic_mapping`:
   - The anchor chip maps to `nums[i]` in the sorted `3Sum` loop.
   - `Raise Left` maps to `left += 1` when the total is below zero.
   - `Lower Right` maps to `right -= 1` when the total is above zero.
   - `Claim Accord` maps to pushing one unique triplet when the sum hits zero.
   - The post-claim auto-skip over repeated inner values maps to duplicate skipping after a hit.
   - `Advance Anchor` maps to moving `i` to the next distinct value instead of revisiting duplicate anchors.
8. `why_greedy_fails`: The tempting shortcut is "I found one valid trio for this anchor, so move on." That works on the easy rosters, but medium and hard puzzles hide multiple distinct accords under the same anchor. Another intuitive fallback is `Full Audit`, which always works logically but burns too much budget at D3+.
9. `aha_moment`: "A hit is not the end of the anchor. Keep the anchor fixed and keep squeezing the inner pair until the window truly dies."
10. `difficulty_progression`:
    - Easy: each productive anchor hides only one valid trio, so the shortcut still survives.
    - Medium: duplicate values appear, but brute force is still barely plausible.
    - Hard: one anchor can support multiple trios, so abandoning it early misses real accords.
11. `predicted_failure_mode`: Players may treat each valid trio as a finished anchor and never discover that one anchor can hide multiple answers. The UI therefore keeps the anchor visibly locked after each hit and repeats the "keep the same anchor alive" message.
12. `acceptance_criteria`:
    - The optimal strategy is describable as "fix one number, then squeeze the inner pair based on whether the total is too low or too high."
    - The single-hit-per-anchor shortcut survives D1-D2 and breaks at D3+.
    - The post-game bridge claims `#15 3Sum` directly and specifically.
13. `predicted_scorecard`:
    - `skill_depth`: high, because full audit and premature anchor jumps both waste the budget.
    - `counterintuitive_moves`: present, because the right move after success is often "do not change the anchor."
    - `algorithm_alignment`: very high, because every legal action is the sorted `3Sum` loop in physical form.
    - `greedy_optimal_gap`: strong, because both shortcuts collapse once one anchor hides multiple answers.
    - `difficulty_curve`: clear with a D3 breakpoint.
    - `insight_inflection`: D3.
14. `open_questions_for_engineering`:
    - Is the distinction between anchor movement and inner sweep legible enough at a glance?
    - Does `Full Audit` read as a plausible human fallback instead of a spoiler button?

## Implementation Packet

1. `version_id`: Truce v1
2. `algorithm_game_spec`: fixed-anchor zero-balance treaty catalog with sign-driven inner sweeps and a costly brute-force audit fallback
3. `prototype_scope`: one `Truce` screen, five difficulty presets, rerollable sorted rosters, and one explicit shortcut failure mode where the player leaves an anchor after the first hit
4. `difficulty_scope`: difficulties `1` through `5`
5. `non_goals`: alternate targets beyond zero, browser automation, or multi-problem concept claims in this pass
6. `predicted_scorecard`:
   - `skill_depth`: 0.68
   - `counterintuitive_moves`: 3
   - `algorithm_alignment`: 0.95
   - `greedy_optimal_gap`: 0.35
   - `difficulty_curve`: 0.84
   - `insight_inflection`: 3

## Prototype Package

1. `game_entrypoint`: `src/games/Truce.tsx`
2. `difficulty_controls`: five presets plus rerolled sorted envoy rosters per difficulty
3. `changed_files`:
   - `src/games/Truce.tsx`
   - `src/solvers/Truce.solver.ts`
   - `src/games/index.ts`
   - `leetcode/specs/truce.md`
   - `leetcode/results.tsv`
   - `run-program.md`
4. `artifact_paths`:
   - `leetcode/specs/truce.md`
   - `src/games/Truce.tsx`
   - `src/solvers/Truce.solver.ts`
5. `actual_scorecard`:
   - `solvability`: 1.00
   - `skill_depth`: 0.75
   - `counterintuitive_moves`: 2.56 average
   - `decision_entropy`: 2.25
   - `algorithm_alignment`: 1.00
   - `leetCode_fit`: 1.00
   - `best_alternative_gap`: 0.42
   - `invariant_pressure`: 0.65
   - `difficulty_breakpoint`: 3
6. `known_issues`:
   - Blind browser playtesting did not run in this session; evaluation used solver metrics, TypeScript verification, and Expo web export.
   - `Full Audit` is intentionally strong as a correctness fallback on D1-D2. Real blind feedback is still needed to confirm players interpret it as a weaker instinct rather than the main mechanic.

## Play Report

- `rules_clarity`: The board exposes a fixed anchor, a live left envoy, a live right envoy, and the current sum, so the sign-driven sweep is readable without algorithm vocabulary.
- `easy_strategy`: D1-D2 allow either `Full Audit` or a one-hit-per-anchor shortcut, which preserves the plausible first instinct.
- `medium_strategy`: D3 is the first true breakpoint. Jumping anchors after the first hit misses treaties, while the fixed-anchor sweep remains fully solvable.
- `hard_strategy`: D4-D5 require the exact loop: hold the anchor still, move the inner pair only by sign, and continue the same anchor after each valid trio until the window collapses.
- `strategy_evolution`: The intended shift is from "each anchor only needs one treaty" to "a successful anchor can still hide more."
- `plain_english_pattern`: "Lock one number, then pinch the other two inward until the total hits zero, and keep doing that before you move the locked one."
- `naive_vs_optimal`: `Full Audit` checks every remaining trio and works only on forgiving rosters. The subtler failure mode is more important: finding one valid trio and abandoning the anchor early. The kept build makes that shortcut collapse at D3+.
- `confusion_points`: No compile or bundling bugs surfaced. Blind runtime feedback is still pending.
- `bug_summary`: No blocking implementation bugs found. Verification used solver evaluation from `src/solvers/Truce.solver.ts`, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`.
- `verdict`: keep

## Decision Memo

- `decision`: keep
- `why`: Truce teaches the specific Blind 75 `3Sum` loop rather than a generic pair-sum metaphor. Solver results clear the thresholds cleanly: `100%` solvability, `75.0%` skill depth, `100%` algorithm alignment, a `42.2%` best-alternative gap, and a sharp D3 breakpoint where "leave the anchor after the first hit" stops working.
- `evidence_used`: solver evaluation across 25 generated rosters, `npx tsc --noEmit`, and successful web export via `env CI=1 npx expo export --platform web`
- `bug_status`: no open implementation bugs; blind browser QA remains an environment/testing gap rather than a discovered gameplay bug
- `algorithm_alignment_judgment`: strong enough to claim `#15 3Sum` directly
- `next_action`: mark `#15` complete in the Blind 75 tracker and stop after this outer-loop pass
- `polish_scope`: when browser playtesting is available, confirm that players independently discover the "same anchor can hold multiple treaties" lesson before seeing the bridge

## Concept Bridge

This game teaches the sorted `3Sum` pattern with one fixed anchor and a two-pointer inner sweep. For the Blind 75 tracker, the kept `Truce` game claims `#15 3Sum`.

The moment where you lock one envoy and read the sign of the current trio maps to fixing `nums[i]` and comparing `nums[i] + nums[left] + nums[right]` against zero. The moment where a valid accord does not end the anchor maps to staying inside the same `while (left < right)` loop after one hit, recording the triplet, skipping duplicates, and continuing the inner sweep until that anchor is truly exhausted.
