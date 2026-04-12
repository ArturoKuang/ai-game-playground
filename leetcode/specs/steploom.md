# Steploom

## Algorithm Game Spec

1. `game_name`: Steploom
2. `algorithm_target`: 3.1 1D Dynamic Programming
3. `core_insight`: Do not keep recounting every possible climb to the summit. Seal each stair once from the two sealed stairs beneath it, and the summit count appears as the last ledger entry.
4. `one_line_pitch`: Certify a staircase route ledger from the bottom up before the scout tax for direct recounts consumes the audit clock.
5. `rules`:
   - Stairs `0` and `1` begin pre-sealed with exactly `1` route each.
   - Any higher stair may be sealed in one action if the two stairs beneath it are already sealed.
   - `Scout Routes` may certify any unresolved stair directly, but it burns the full recount cost for that stair.
   - The puzzle is won only when the summit stair is sealed before the action budget runs out.
6. `core_actions`:
   - inspect an unresolved stair and its scout tax
   - seal the next needed stair from the two sealed stairs beneath it
   - reuse the growing ribbon of certified counts
   - avoid direct recounts once the staircase length grows
7. `algorithm_to_mechanic_mapping`:
   - Each stair index maps to one subproblem `ways[i]`.
   - The pre-sealed base stairs map to `dp[0] = 1` and `dp[1] = 1`.
   - `Weave From Two` maps to `dp[i] = dp[i - 1] + dp[i - 2]`.
   - The left-to-right sealed ribbon maps to tabulation over a 1D DP array.
   - `Scout Routes` maps to naive recursion that recomputes the same subproblems from scratch.
8. `why_greedy_fails`: The strongest near miss is repeated route scouting. It certifies each stair by recounting all paths directly, which still survives D1-D2 because the staircase is short, but D3-D5 break it cleanly when the cumulative scout tax outgrows the budget while the bottom-up ribbon still costs one action per new stair.
9. `aha_moment`: "I do not need to rediscover every climb. Once the two lower stairs are sealed, the next stair is just those two route counts combined."
10. `difficulty_progression`:
    - D1: A short porch rise still lets direct scouting survive, but the ribbon is already visibly cheaper.
    - D2: The brute-force scout path still fits exactly, which makes the DP route feel like a speedup instead of a requirement.
    - D3: The scout path finally breaks on budget, forcing the full left-to-right recurrence.
    - D4: Recounting even one medium stair is now ruinous, so the player must trust the whole sealed ribbon.
    - D5: The longest staircase exposes why every solved subproblem must stay available instead of being recomputed.
11. `predicted_failure_mode`: If the staircase ribbon does not make already sealed counts feel reusable, the game will collapse into "pay the scout tax on whatever stair I care about" instead of teaching bottom-up reuse.
12. `acceptance_criteria`:
    - Winning play should be describable as "seal each stair once from the two lower sealed stairs."
    - Solver evaluation must keep `100%` solvability across the shipped stair set.
    - The repeated-scout baseline should survive the first two difficulties and break at `D3`.
    - The kept bridge should claim Blind 75 `#70 Climbing Stairs` directly and only in this pass.
13. `predicted_scorecard`:
    - `skill_depth`: `0.58`
    - `counterintuitive_moves`: `3.0`
    - `algorithm_alignment`: `1.00`
    - `greedy_optimal_gap`: `0.45`
    - `difficulty_curve`: `D3`
    - `insight_inflection`: `D3`
14. `open_questions_for_engineering`:
    - Does the scout tax read as "recounting from scratch" instead of arbitrary punishment?
    - Is the sealed ribbon legible enough that the player trusts it as a reusable ledger?
    - Does the summit objective stay clear even though the optimal play certifies many lower stairs first?

## Implementation Packet

1. `version_id`: Steploom v1
2. `algorithm_game_spec`: staircase route-ledger game with base seals, left-to-right two-stair weaving, and an expensive direct recount action as the no-memo alternative
3. `prototype_scope`: one `Steploom` screen, five difficulty presets, fixed staircase heights, solver evaluation against repeated no-memo scouting, and a direct Blind 75 concept bridge for `#70`
4. `difficulty_scope`: D1-D2 allow brute-force recounting to survive, D3 is the intended break, and D4-D5 widen the budget gap between tabulation and repeated direct recursion
5. `non_goals`:
   - no shared claim on `#198 House Robber` or other 1D DP items in this pass
   - no browser-recorded blind play session while sandbox port binding remains blocked
   - no variable step sizes beyond the standard one-step or two-step climb
6. `predicted_scorecard`:
   - `solvability`: `1.00`
   - `skill_depth`: `0.58`
   - `counterintuitive_moves`: `3.0`
   - `algorithm_alignment`: `1.00`
   - `greedy_optimal_gap`: `0.45`

## Prototype Package

1. `game_entrypoint`: `src/games/Steploom.tsx`
2. `difficulty_controls`: five difficulty chips plus stair selection, `Weave From Two`, `Scout Routes`, `Reset Stair`, and `New Stair`
3. `changed_files`:
   - `src/solvers/Steploom.solver.ts`
   - `src/games/Steploom.tsx`
   - `src/games/index.ts`
   - `leetcode/specs/steploom.md`
   - `leetcode/curriculum.md`
   - `leetcode/results.tsv`
   - `run-program.md`
4. `artifact_paths`:
   - `src/solvers/Steploom.solver.ts`
   - `src/games/Steploom.tsx`
   - `leetcode/specs/steploom.md`
5. `actual_scorecard`:
   - `solvability`: `100%`
   - `skill_depth`: `90.1%`
   - `counterintuitive_moves`: `4.0`
   - `drama`: `0.77`
   - `decision_entropy`: `1.35`
   - `info_gain_ratio`: `2.31`
   - `algorithm_alignment`: `100%`
   - `leetCode_fit`: `100%`
   - `best_alternative_gap`: `90.1%`
   - `invariant_pressure`: `73.4%`
   - `difficulty_breakpoint`: `D3`
6. `known_issues`:
   - Browser-based blind play could not run in this sandbox because local port binding for a test server is denied with `PermissionError: [Errno 1] Operation not permitted`.
   - The staircase choices intentionally compress toward one optimal order on harder levels; the learning pressure comes from recognizing why that order exists, not from discovering many equally good permutations.

## Blind Play Report

- `rules_clarity`: The board, scout tax, and pre-sealed base stairs read cleanly in static inspection, but a true blind browser session is still outstanding because the sandbox will not allow a local server bind for `tools/playtest.mjs`.
- `easy_strategy`: D1-D2 invite a naive "just scout the next stair" habit because the budget still allows it, so the player can succeed before the DP ribbon feels necessary.
- `medium_strategy`: D3 is the real inflection point. The scout tax now breaks budget, so the player must start treating lower solved stairs as reusable route counts rather than disposable bookkeeping.
- `hard_strategy`: D4-D5 demand strict left-to-right sealing. Any return to direct recounts burns too much clock, so the only stable plan is to certify each stair once from the two beneath it.
- `strategy_evolution`: The intended shift is from direct route recounting to one persistent ledger where every solved stair immediately reduces the next stair to one cheap combination.
- `plain_english_pattern`: "Keep the number of ways for every lower stair, then build the next stair from the last two counts instead of re-counting every path to it."
- `naive_vs_optimal`: The strongest wrong strategy is repeated direct scouting. It works on short staircases, but it collapses once the scout tax compounds; the optimal play banks each solved stair and never pays to rediscover it.
- `confusion_points`: The remaining blind risk is whether first-time players interpret the scout tax as the cost of recursion rather than as a generic penalty button.
- `bug_summary`: No blocking implementation bugs surfaced during solver evaluation, `npx tsc --noEmit`, or `env CI=1 npx expo export --platform web`. Browser playtesting is blocked by sandbox port permissions rather than by app crashes.
- `verdict`: keep

## Decision Memo

- `decision`: keep
- `why`: Steploom teaches Blind 75 `#70 Climbing Stairs` directly enough to justify a dedicated kept game. The shipped build turns 1D DP tabulation into explicit play, keeps `100%` solvability, lands the intended `D3` breakpoint where repeated no-memo scouting breaks, and preserves a very large measured gap between bottom-up reuse and direct recounting.
- `evidence_used`: `node --input-type=module` evaluation from `src/solvers/Steploom.solver.ts`, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`
- `bug_status`: no open implementation bugs
- `algorithm_alignment_judgment`: strong enough to claim Blind 75 `#70` directly because optimal play requires the actual recurrence shape: base cases plus one left-to-right pass where each stair reuses the two previous answers
- `next_action`: mark `#70` complete in the Blind 75 tracker and leave the next outer-loop pass for `#198 House Robber`
- `polish_scope`: once browser playtesting is possible again, confirm that first-time players naturally read `Scout Routes` as "recompute recursively" and abandon it at `D3`

## Concept Bridge

This game teaches 1D dynamic programming for `Climbing Stairs`. For the Blind 75 tracker, the kept `Steploom` game claims `#70 Climbing Stairs`.

The moment where stairs `0` and `1` begin pre-sealed maps to the base cases `dp[0] = 1` and `dp[1] = 1`. The moment where `Weave From Two` seals stair `i` from the two lower seals maps to `dp[i] = dp[i - 1] + dp[i - 2]`. The moment where direct scouting becomes too expensive maps to why naive recursion without memoization is the wrong shape for this problem.
