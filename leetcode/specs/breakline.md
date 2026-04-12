# Breakline

## Algorithm Game Spec

1. `game_name`: Breakline
2. `algorithm_target`: 1.1 Binary Search
3. `core_insight`: In a rotated ascending ridge, the tail sentinel tells you which block the middle beacon belongs to. If `mid <= tail`, the right arc is already ordered so the minimum is at or left of `mid`; if `mid > tail`, the high block still reaches `mid`, so the wrap break is to the right.
4. `one_line_pitch`: Hunt the dawn marker in a rotated mountain corridor by reading the middle beacon against the tail sentinel and collapsing the search span before a brute-force sweep burns the alarm budget.
5. `rules`:
   - A fixed ridge line is known to rise steadily except for one wrap break where heights restart from the minimum.
   - The live corridor always exposes its left beacon, middle beacon, and tail sentinel.
   - `Hold Left Arc` keeps towers `left..mid`.
   - `Hold Right Arc` keeps towers `mid + 1..right`.
   - `Line Sweep` inspects every seam in the live corridor at once, but it costs one action per seam.
   - The puzzle ends the moment only one tower remains or a sweep reveals the dawn marker.
6. `core_actions`:
   - compare the middle beacon to the tail sentinel
   - keep the left arc including mid
   - keep the right arc excluding mid
   - optionally burn the full line sweep fallback
7. `algorithm_to_mechanic_mapping`:
   - The live corridor is the current search interval `[left, right]`.
   - The middle beacon is `nums[mid]`.
   - The tail sentinel is `nums[right]`.
   - `Hold Left Arc` maps to `right = mid`.
   - `Hold Right Arc` maps to `left = mid + 1`.
   - `Line Sweep` is the rejected `O(n)` scan for the minimum.
8. `why_greedy_fails`: The tempting wrong rule is to chase whichever endpoint looks lower right now. That works on sorted ridges and some shallow wraps, but it breaks as soon as the tail sentinel looks low while the true minimum already sits at or left of the middle beacon.
9. `aha_moment`: "The lower endpoint can lie. The real question is whether the middle beacon is still in the high block or already in the low block, and the tail sentinel answers that immediately."
10. `difficulty_progression`:
    - D1: Line sweep still fits, and most ridges let endpoint-chasing survive.
    - D2: The first false tails appear, so endpoint-chasing starts cutting away the wrong side.
    - D3-D5: Line sweep dies on budget, and only the true tail-sentinel binary rule reaches the dawn marker in time.
11. `predicted_failure_mode`: If the UI does not keep left, middle, and tail visually distinct, players will default to chasing the lowest visible endpoint or treating the puzzle like a generic "spot the minimum" scan.
12. `acceptance_criteria`:
    - The winning pattern is describable as "compare middle to tail, then keep the only arc that can still contain the wrap break."
    - The strongest wrong baseline survives warmups and then collapses by medium difficulty.
    - The post-game bridge claims `#153 Find Minimum in Rotated Sorted Array` directly and specifically.
13. `predicted_scorecard`:
    - `skill_depth`: `0.58` because endpoint-chasing and line sweep should both look plausible early and then break hard.
    - `counterintuitive_moves`: `1.0` because some winning cuts keep the left arc even while the tail sentinel is visibly lower than the left beacon.
    - `algorithm_alignment`: `1.00` because every correct move is literally one binary-search branch from the canonical solution.
    - `greedy_optimal_gap`: `0.45` because the lower-endpoint heuristic should lose badly once false tails arrive.
    - `difficulty_curve`: `D3` because that is where the sweep safety net disappears and the false-tail trap must carry the lesson.
    - `insight_inflection`: `D3`.
14. `open_questions_for_engineering`:
    - Is the difference between "lower endpoint" and "middle versus tail" legible enough from the live cards alone?
    - Does the expensive sweep fallback feel tempting without replacing the real lesson?
    - Are the counterexamples where the tail is lower but `Hold Left Arc` is still correct obvious enough by D2-D3?

## Implementation Packet

1. `version_id`: Breakline v1
2. `algorithm_game_spec`: rotated ridge minimum hunt with a left-versus-right binary cut and an expensive full-corridor sweep fallback
3. `prototype_scope`: one `Breakline` screen, five difficulty presets, rerollable fixed ridge arrays, and a visible corridor card showing only the live left, middle, and tail values
4. `difficulty_scope`: D1 lets sweep survive, D2 introduces false-tail counterexamples, and D3-D5 require the real rotated-array binary invariant
5. `non_goals`:
   - no second Blind 75 mapping in this pass
   - no claim for `#33 Search in Rotated Sorted Array` yet
   - no generic binary-search teaching beyond the rotated-minimum loop
6. `predicted_scorecard`:
   - `solvability`: `1.00`
   - `skill_depth`: `0.58`
   - `counterintuitive_moves`: `1.0`
   - `algorithm_alignment`: `1.00`
   - `greedy_optimal_gap`: `0.45`

## Prototype Package

1. `game_entrypoint`: `src/games/Breakline.tsx`
2. `difficulty_controls`: five difficulty chips plus `Reset Ridge` and `New Ridge`
3. `changed_files`:
   - `src/games/Breakline.tsx`
   - `src/solvers/Breakline.solver.ts`
   - `src/games/index.ts`
   - `leetcode/specs/breakline.md`
   - `leetcode/curriculum.md`
   - `leetcode/learnings.md`
   - `leetcode/results.tsv`
   - `run-program.md`
4. `artifact_paths`:
   - `leetcode/specs/breakline.md`
   - `src/games/Breakline.tsx`
   - `src/solvers/Breakline.solver.ts`
5. `actual_scorecard`:
   - `solvability`: `100%`
   - `skill_depth`: `44.5%`
   - `counterintuitive_moves`: `0.20`
   - `drama`: `0.56`
   - `decision_entropy`: `1.29`
   - `info_gain_ratio`: `1.99`
   - `algorithm_alignment`: `100%`
   - `leetCode_fit`: `98.2%`
   - `best_alternative_gap`: `44.5%`
   - `invariant_pressure`: `25.8%`
   - `difficulty_breakpoint`: `D3`
6. `known_issues`:
   - `npx tsc --noEmit` initially failed because the repo's default include pattern pointed at a stale missing `dist` bundle; regenerating `dist` via Expo export cleared that environment artifact.
   - A true blind browser play session was not recorded in this sandbox, so the blind report remains a scripted solver-and-UI walkthrough rather than a live session capture.

## Blind Play Report

- `rules_clarity`: The live corridor exposes only the left beacon, middle beacon, and tail sentinel, which keeps the decision surface narrow. The only likely confusion is whether "lower endpoint" matters more than "middle versus tail."
- `easy_strategy`: D1 invites brute-force confidence because line sweep still fits and endpoint-chasing often lands on the correct side by accident.
- `medium_strategy`: D2-D3 force the real insight. The tail sometimes looks lower than the left beacon even though the minimum is already at or left of mid, so lower-endpoint chasing starts losing instantly.
- `hard_strategy`: D4-D5 reduce the corridor with strict binary cuts only. Once sweep is gone, every wrong cut deletes the dawn marker forever.
- `strategy_evolution`: The player should shift from "follow the smaller visible endpoint" to "ask whether the middle is still above the tail."
- `plain_english_pattern`: "Read the middle tower against the tail tower. If the middle is still higher, the break is to the right. Otherwise the break has already arrived by the middle."
- `naive_vs_optimal`: Endpoint-chasing survives on the warmups but fails on the false-tail sets, while line sweep stops fitting once the corridor length grows past the budget.
- `confusion_points`: The main risk is that the player over-trusts the tail's low value instead of treating it as a block marker.
- `bug_summary`: No blocking implementation bugs found in solver logic, TypeScript compile, or Expo web export. A live browser play session was not recorded in this sandbox.
- `verdict`: keep

## Decision Memo

- `decision`: keep
- `why`: Breakline teaches the rotated-array minimum invariant directly enough to claim `#153`. The kept build hit `100%` solvability, `98.2%` LeetCode fit, `44.5%` strongest-alternative gap, and a clean `D3` breakpoint where the false-tail trap becomes mandatory knowledge.
- `evidence_used`: solver evaluation from `src/solvers/Breakline.solver.ts`, scripted blind-style state walkthroughs, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`
- `bug_status`: no open implementation bugs; true blind browser play remains an environmental testing gap
- `algorithm_alignment_judgment`: strong enough to claim `#153 Find Minimum in Rotated Sorted Array` directly
- `next_action`: mark `#153` complete in the Blind 75 tracker and leave the next outer-loop pass for `#33 Search in Rotated Sorted Array`
- `polish_scope`: if later playtesting shows the endpoint trap is still too subtle, strengthen the left/tail comparison card without naming the algorithm

## Concept Bridge

This game teaches the rotated-array binary-search solution for `Find Minimum in Rotated Sorted Array`. For the Blind 75 tracker, the kept `Breakline` game claims `#153 Find Minimum in Rotated Sorted Array`.

The moment where you compare the middle beacon to the tail sentinel maps to checking `nums[mid] <= nums[right]`. `Hold Left Arc` is `right = mid`, because the right side is already ordered and the minimum cannot lie beyond `mid`. `Hold Right Arc` is `left = mid + 1`, because a middle value higher than the tail proves the upper block still reaches `mid`. `Line Sweep` is the discarded linear scan that medium-plus budgets no longer allow.
