# Tidewall

1. `game_name`: Tidewall
2. `algorithm_target`: 1.2 Two Pointers
3. `core_insight`: A basin's capacity is `min(leftWall, rightWall) * width`. Width always shrinks, so the only discard that can still unlock a larger basin is the current shorter wall.
4. `one_line_pitch`: Sweep a storm-battered shoreline, log the biggest tide haul seen, and resist the urge to chase the prettier wall.
5. `rules`:
   - The outermost live walls start active and their basin is logged automatically.
   - `Step Left` releases the left wall and exposes the next wall inward.
   - `Step Right` releases the right wall and exposes the next wall inward.
   - `Harbor Survey` instantly reveals the best remaining basin but costs a full shoreline's worth of actions.
   - `Finish Sweep` only wins if the best logged haul matches the true harbor maximum and the sweep is actually complete.
6. `core_actions`:
   - compare the live basin's cap height and width
   - move one shoreline inward
   - optionally burn the survey fallback
   - finish only after the shoreline is exhausted or surveyed
7. `algorithm_to_mechanic_mapping`:
   - The active left and right walls map to the classic `left` and `right` pointers.
   - The auto-logged `best haul` card maps to the running `maxArea`.
   - The `cap height` card is `min(height[left], height[right])`.
   - Releasing the limiting wall maps to the proof step that only the shorter wall can be safely discarded.
8. `why_greedy_fails`: Chasing the taller wall or the next immediately larger-looking basin burns width while the same smaller wall still caps the waterline. The player feels that mistake because the best interior pair disappears forever.
9. `aha_moment`: "The shorter wall is the bottleneck. If I move the taller wall, I only lose width and keep the same cap."
10. `difficulty_progression`:
    - D1: Harbor Survey still fits, and most simple shorelines are forgiving.
    - D2: One wrong pointer rule starts missing the best basin even though survey still survives.
    - D3-D5: Survey dies on budget, and only the true limiting-wall sweep keeps the maximum.
11. `predicted_failure_mode`: Players may overvalue visible height and move the taller wall, or optimize for the next basin instead of the surviving search space.
12. `acceptance_criteria`:
    - The player can describe the winning pattern as "keep the best seen and move the lower wall."
    - Solver evaluation keeps `100%` solvability and a meaningful shortcut gap.
    - The post-game bridge claims `#11 Container With Most Water` directly and specifically.
13. `predicted_scorecard`:
    - `skill_depth`: `0.60` because the wrong-pointer heuristic should survive warmups and collapse by medium difficulty.
    - `counterintuitive_moves`: `1.0` because some winning steps should look immediately worse than the tempting alternative.
    - `algorithm_alignment`: `1.00` because every real action is one legal container sweep step.
    - `greedy_optimal_gap`: `0.40` because taller-wall chase and full survey should both lose significant efficiency.
    - `difficulty_curve`: `D2` because the first real trap should arrive before survey dies completely.
    - `insight_inflection`: `D2` because that is where "move the prettier wall" should stop working reliably.
14. `open_questions_for_engineering`:
    - Is the limiting wall legible enough from the board and status text alone?
    - Does the survey fallback feel tempting without stealing the main lesson?
    - Are the best-haul updates visible enough that players notice the running max behavior?

## Implementation Packet

1. `version_id`: Tidewall v1
2. `algorithm_game_spec`: shoreline max-basin sweep with an expensive full-harbor survey fallback
3. `prototype_scope`: one `Tidewall` screen, five difficulty presets, rerollable fixed shoreline blueprints, and direct feedback when the player moves the freer wall instead of the limiting wall
4. `difficulty_scope`: D1 allows survey, D2 makes pointer mistakes costly, D3-D5 remove the brute-force safety net
5. `non_goals`:
   - no animation-heavy water simulation
   - no second Blind 75 mapping in this pass
   - no hidden arithmetic or random generator outside the fixed shoreline presets
6. `predicted_scorecard`:
   - `solvability`: `1.00`
   - `skill_depth`: `0.60`
   - `counterintuitive_moves`: `1.0`
   - `algorithm_alignment`: `1.00`
   - `greedy_optimal_gap`: `0.40`

## Prototype Package

1. `game_entrypoint`: `src/games/Tidewall.tsx`
2. `difficulty_controls`: five difficulty chips plus `Reset Same Shoreline` and `New Shoreline`
3. `changed_files`:
   - `src/games/Tidewall.tsx`
   - `src/solvers/Tidewall.solver.ts`
   - `src/games/index.ts`
   - `leetcode/specs/tidewall.md`
   - `leetcode/results.tsv`
   - `run-program.md`
4. `artifact_paths`:
   - `leetcode/specs/tidewall.md`
   - `src/games/Tidewall.tsx`
   - `src/solvers/Tidewall.solver.ts`
5. `actual_scorecard`:
   - `solvability`: `100%`
   - `skill_depth`: `72.0%`
   - `counterintuitive_moves`: `1.24`
   - `drama`: `0.91`
   - `decision_entropy`: `1.58`
   - `info_gain_ratio`: `3.66`
   - `algorithm_alignment`: `100%`
   - `best_alternative_gap`: `44.9%`
   - `difficulty_breakpoint`: `D2`
6. `known_issues`:
   - No blocking implementation bugs found.
   - Blind browser play remained a manual/scripted local pass rather than a live recorded UI session.

## Blind Play Report

- `rules_clarity`: The rules read cleanly because the board exposes height, width, cap, and best haul without jargon. `Harbor Survey` is legible as the expensive fallback.
- `easy_strategy`: Early instinct is "keep the widest pair alive" or "chase the tallest wall." D1 still forgives that often enough to teach by contrast.
- `medium_strategy`: By D2 the player notices that the lower wall keeps capping the basin even after the prettier side moves, so the freer-wall chase starts feeling wasteful.
- `hard_strategy`: D3+ requires a strict limiting-wall sweep. Survey no longer fits, and next-basin greed leaves the winning interior pair unseen.
- `strategy_evolution`: The strategy shifts from height-chasing to bottleneck-chasing. The best-haul history makes the running-max role visible.
- `plain_english_pattern`: "Keep the best basin you've seen, and each time move the side that is holding the water level down."
- `naive_vs_optimal`: Taller-wall chase and immediate-next-basin chase both fail on the scripted blind session. On `D3 seed 1`, the wrong-side sweep logged `18` while the real harbor held `28`.
- `confusion_points`: The only mild friction is that `Finish Sweep` can lose early even when the current best looks strong, but that is the intended proof pressure rather than a bug.
- `bug_summary`: No blocking bugs found in solver logic, TypeScript compile, or Expo web export.
- `verdict`: keep

## Decision Memo

- `decision`: keep
- `why`: Tidewall teaches the actual `Container With Most Water` invariant instead of generic two-pointer motion. The kept build hits `100%` solvability, `72.0%` skill depth, `100%` algorithm alignment, a `44.9%` best-alternative gap, and a `D2` breakpoint where moving the prettier wall stops being reliable.
- `evidence_used`: solver evaluation from `src/solvers/Tidewall.solver.ts`, scripted blind-style sessions through solver state transitions, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`
- `bug_status`: no open implementation bugs; live browser play remains a testing gap rather than a discovered defect
- `algorithm_alignment_judgment`: strong enough to claim `#11 Container With Most Water` directly
- `next_action`: mark the Blind 75 tracker item complete and leave the next outer-loop pass for the first unchecked Sliding Window problem
- `polish_scope`: if future playtesting shows confusion, add a stronger visual cue for the limiting wall without naming the algorithm

## Concept Bridge

This game teaches the max-area two-pointer sweep for `Container With Most Water`. For the Blind 75 tracker, the kept `Tidewall` game claims `#11 Container With Most Water`.

The moment where the lower wall visibly caps the basin maps to `Math.min(height[left], height[right]) * (right - left)`. The moment where moving the taller wall wastes width while the same lower wall still limits the basin maps to the code proof that only the shorter side can be discarded, which is why the standard loop moves `left` when `height[left] <= height[right]` and otherwise moves `right`.
