# Flipforge

## Algorithm Game Spec

1. `game_name`: Flipforge
2. `algorithm_target`: 3.1c Dual-Extreme Product DP
3. `core_insight`: Do not carry only one running product. Seal both the highest and the lowest product ending at the current position, because the next negative multiplier can flip the prior worst lane into the new best span.
4. `one_line_pitch`: Certify a signed forge strip before the heat budget runs out by keeping the live crown and live shade at every step instead of rescanning every span or trusting a single running best product.
5. `rules`:
   - The strip is a fixed left-to-right row of signed multipliers.
   - At each position, `Start Here` begins a new contiguous span at the current multiplier.
   - `Carry Crown` multiplies the current multiplier by the prior live best product ending one step left.
   - `Flip Shade` multiplies the current multiplier by the prior live worst product ending one step left.
   - The player must seal one `crown` and one `shade` value for every index before moving on.
   - `Scout Index` reveals the true crown-and-shade pair for the current index directly, but it burns a brute-force scout tax.
   - The puzzle is won only when the whole strip is sealed with the true live pair at every index before the action budget expires.
6. `core_actions`:
   - inspect the current signed multiplier and the three candidate lanes
   - choose one lane as the new crown
   - choose one lane as the new shade
   - seal the index and move right
   - scout the current index directly at brute-force cost
7. `algorithm_to_mechanic_mapping`:
   - Index `i` maps to the DP state for subarrays ending at `i`.
   - `Start Here` maps to the raw value `nums[i]`.
   - `Carry Crown` maps to `nums[i] * prevMax`.
   - `Flip Shade` maps to `nums[i] * prevMin`.
   - Sealing the new crown maps to `maxEndingHere = max(nums[i], nums[i] * prevMax, nums[i] * prevMin)`.
   - Sealing the new shade maps to `minEndingHere = min(nums[i], nums[i] * prevMax, nums[i] * prevMin)`.
   - The best crown seen anywhere on the strip maps to the final answer for `Maximum Product Subarray`.
   - `Scout Index` maps to rescanning all candidate spans ending at the current index instead of reusing the rolling pair.
8. `why_greedy_fails`: The strongest wrong instinct is to keep only one running best product. That shortcut works on the warm strips, then fails at `D3` when a negative multiplier must multiply the prior shade to recover the true best span. Harder strips add zero resets, so the player must also know when to restart cleanly instead of extending a dead lane.
9. `aha_moment`: "The ugly negative lane is not junk. The next negative strike might turn it into the winning span."
10. `difficulty_progression`:
    - D1: Short positive strips let the player learn the board while scouting still survives.
    - D2: A negative or zero appears, but the one-lane shortcut still escapes on the shipped strip.
    - D3: The scout tax breaks, and the first real shade-to-crown flip is mandatory.
    - D4: Zero resets and late negative pairs force both restart discipline and dual-lane tracking.
    - D5: Long mixed-sign strips leave no slack for either brute-force scouting or a max-only shortcut.
11. `predicted_failure_mode`: If the UI overemphasizes the current multiplier and underplays the live shade, players will keep treating the shade as disposable debt and never discover the sign-flip recurrence.
12. `acceptance_criteria`:
    - Winning play should be describable as "for each index, keep the best and worst product ending here, because either one might matter on the next negative multiplier."
    - Solver evaluation must keep `100%` solvability across the shipped strip set.
    - The scout fallback should survive `D1-D2` and fail from `D3`.
    - The max-only shortcut should first fail at `D3`.
    - The kept bridge should claim Blind 75 `#152 Maximum Product Subarray` directly and only in this pass.
13. `predicted_scorecard`:
    - `skill_depth`: `0.58`
    - `counterintuitive_moves`: `3.0`
    - `algorithm_alignment`: `1.00`
    - `greedy_optimal_gap`: `0.36`
    - `difficulty_curve`: `D3`
    - `insight_inflection`: `D3`
14. `open_questions_for_engineering`:
    - Does the selected-index card make the live shade feel important enough before `D3` arrives?
    - Does the player read `Start Here` as a real restart lane instead of as a panic button?
    - Is the scout tax expensive enough to model brute-force rescanning without making D1 unreadable?

## Implementation Packet

1. `version_id`: Flipforge v1
2. `algorithm_game_spec`: signed-multiplier strip with one live crown and one live shade per index, direct restart versus extend choices, and a scout fallback that models brute-force rescanning
3. `prototype_scope`: one `Flipforge` screen, five difficulty presets, two handcrafted strips per difficulty, solver evaluation against a max-only shortcut plus a scout-all fallback, and a direct Blind 75 concept bridge for `#152`
4. `difficulty_scope`: D1-D2 preserve a survivable scout route; D3-D5 require the full dual-extreme recurrence and include sign flips or zero resets that punish one-lane tracking
5. `non_goals`:
   - no shared claim on `#139 Word Break` or any later Blind 75 item in this pass
   - no browser-recorded interactive blind session while sandboxed serving remains blocked
   - no attempt to compress the game into a single running best product without the live shade
6. `predicted_scorecard`:
   - `solvability`: `1.00`
   - `skill_depth`: `0.58`
   - `counterintuitive_moves`: `3.0`
   - `algorithm_alignment`: `1.00`
   - `greedy_optimal_gap`: `0.36`

## Prototype Package

1. `game_entrypoint`: `src/games/Flipforge.tsx`
2. `difficulty_controls`: five difficulty chips plus `Start Here`, `Carry Crown`, and `Flip Shade` choice buttons for crown and shade, `Seal Index`, `Scout Index`, `Reset Strip`, and `New Strip`
3. `changed_files`:
   - `src/solvers/Flipforge.solver.ts`
   - `src/games/Flipforge.tsx`
   - `src/games/index.ts`
   - `leetcode/curriculum.md`
   - `leetcode/specs/flipforge.md`
   - `leetcode/results.tsv`
   - `run-program.md`
4. `artifact_paths`:
   - `src/solvers/Flipforge.solver.ts`
   - `src/games/Flipforge.tsx`
   - `leetcode/specs/flipforge.md`
5. `actual_scorecard`:
   - `solvability`: `100%`
   - `skill_depth`: `52.5%`
   - `counterintuitive_moves`: `2.8`
   - `drama`: `0.63`
   - `decision_entropy`: `2.26`
   - `info_gain_ratio`: `2.35`
   - `algorithm_alignment`: `100%`
   - `leetCode_fit`: `100%`
   - `best_alternative_gap`: `89.6%`
   - `invariant_pressure`: `67.8%`
   - `difficulty_breakpoint`: `D3`
6. `known_issues`:
   - Browser-based blind play remains blocked in this sandbox, so the blind play report is still source-level plus solver-backed rather than a captured interactive session.
   - Node emitted a module-type warning when importing the TypeScript solver directly for evaluation, but the solver evaluation, smoke test, and build all completed successfully.

## Blind Play Report

- `rules_clarity`: The strip, the three candidate lanes, and the dual crown-and-shade seal read clearly in static inspection. The main blind risk is whether first-time players intuit that the shade is an asset to preserve rather than a penalty to ignore.
- `easy_strategy`: D1 encourages either scouting the whole strip or simply extending the live crown because every multiplier is positive.
- `medium_strategy`: D2 introduces the idea that the shade exists, but the board still lets the shortcut survive once so the player can understand the controls before the real flip trap lands.
- `hard_strategy`: D3-D5 demand the full pattern: for each index, compare starting fresh against multiplying by the prior crown and prior shade, then keep both extremes alive because the next negative or zero can change which lane matters.
- `strategy_evolution`: The intended shift is from "keep one strong running product" to "every step needs both the best and worst ending-here products, because a negative multiplier can reverse them."
- `plain_english_pattern`: "At every spot, keep the strongest and weakest live span that end right here. When a negative multiplier hits, yesterday’s weakest span might become today’s strongest."
- `naive_vs_optimal`: The strongest wrong strategy carries only one running best product. It feels fine on the warm strips, then fails cleanly at D3 when only the prior shade can create the winning product. The brute-force scout is the other near miss: viable on D1-D2, broken from D3 onward.
- `confusion_points`: The main blind risk is whether `Flip Shade` sounds optional instead of essential. The copy has to keep framing the shade as a live lane, not as damage to avoid.
- `bug_summary`: No blocking implementation bugs surfaced during solver evaluation, `npx tsc --noEmit`, the scripted optimal-path smoke test, or `env CI=1 npx expo export --platform web`. Interactive browser playtesting remains the environment gap.
- `verdict`: keep

## Decision Memo

- `decision`: keep
- `why`: Flipforge teaches Blind 75 `#152 Maximum Product Subarray` directly enough to justify a dedicated kept game. The shipped build keeps `100%` solvability, lands the intended `D3` breakpoint, makes the shade-to-crown flip explicit, and strongly separates the real dual-extreme recurrence from both brute-force scouting and a max-only shortcut.
- `evidence_used`: solver evaluation from `src/solvers/Flipforge.solver.ts`, `npx tsc --noEmit`, a scripted optimal-path state-transition smoke test, and `env CI=1 npx expo export --platform web`
- `bug_status`: no open implementation bugs
- `algorithm_alignment_judgment`: strong enough to claim Blind 75 `#152` directly because optimal play requires the exact recurrence shape: at each index compare `value`, `value * prevMax`, and `value * prevMin`, seal both the new maximum and the new minimum ending-here product, then keep the largest maximum seen anywhere
- `next_action`: mark `#152 Maximum Product Subarray` complete in the Blind 75 tracker and leave the next outer-loop pass for `#139 Word Break`
- `polish_scope`: once interactive playtesting is available again, confirm that first-time players stop discarding the shade lane at D3 without extra coaching

## Concept Bridge

This game teaches the dual-extreme rolling-product recurrence behind `Maximum Product Subarray`. For the Blind 75 tracker, the kept `Flipforge` game claims `#152 Maximum Product Subarray`.

The moment where the player must keep both a `crown` and a `shade` at the current multiplier maps to tracking both `maxEndingHere` and `minEndingHere`. The moment where `Flip Shade` becomes the winning crown maps to multiplying the current negative number by the prior minimum product. `Scout Index` is the weaker alternative: rescanning all spans ending here instead of reusing the live pair.
