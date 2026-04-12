# Nightledger

## Algorithm Game Spec

1. `game_name`: Nightledger
2. `algorithm_target`: 3.1 1D Dynamic Programming
3. `core_insight`: Do not decide from the current stash alone. For each house prefix, seal the better of carrying the previous best haul forward or raiding this house plus the sealed total from two houses back.
4. `one_line_pitch`: Certify the best quiet haul for a whole street before sunrise by keeping one live prefix ledger instead of trusting local stash hunches or brute-forcing the whole block.
5. `rules`:
   - Houses arrive in a fixed row, each with one visible stash value.
   - Any house prefix may be sealed by `Carry Forward` if the previous prefix is already sealed.
   - Any house prefix may be sealed by `Raid This House` if the two-back prefix is already sealed, adding the current stash to that two-back total.
   - `Scout Prefix` may certify any unresolved prefix directly, but it burns the full brute-force scout tax for that prefix.
   - The puzzle is won only when the final house prefix is sealed with the true maximum quiet haul before the action budget expires.
6. `core_actions`:
   - inspect one house and its three candidate routes
   - carry the previous best total forward
   - raid the current house and combine it with the two-back ledger
   - scout a prefix directly at brute-force cost
7. `algorithm_to_mechanic_mapping`:
   - House `i` maps to subproblem `dp[i]`, the best haul through prefix `0..i`.
   - `Carry Forward` maps to candidate `dp[i - 1]`.
   - `Raid This House` maps to candidate `nums[i] + dp[i - 2]`.
   - Sealing the house prefix maps to `dp[i] = max(dp[i - 1], nums[i] + dp[i - 2])`.
   - `Scout Prefix` maps to naive recursion that recomputes the whole prefix instead of reusing the ledger.
8. `why_greedy_fails`: The strongest wrong instinct compares only neighboring stash values and keeps whichever local door looks richer. That works on easy blocks and even feels plausible on D2, but D3-D5 include smaller current houses whose stash plus the sealed two-back total beats the carry route. Direct prefix scouting is another near miss: it stays viable on D1-D2, then dies cleanly once the scout tax crosses the medium budget.
9. `aha_moment`: "The current house does not compete with the previous house. It competes with the whole best total I already sealed for the previous prefix."
10. `difficulty_progression`:
    - D1: A short porch block still allows a direct final scout, and the local richer-door instinct does not get punished yet.
    - D2: The direct scout survives exactly once, which makes the live ledger feel like a cleaner habit instead of a hard requirement.
    - D3: Smaller-current-house traps arrive and the scout tax finally breaks, forcing the real carry-versus-raid recurrence.
    - D4: Several local stash hunches now fail, so the player must trust the whole prefix ledger.
    - D5: The block is long enough that both brute-force scouting and repeated local comparisons collapse; only disciplined prefix sealing survives.
11. `predicted_failure_mode`: If the UI highlights raw stash values more strongly than the sealed prefix totals, players will overfit to local richer-door comparisons and miss that the real comparison is between two accumulated routes.
12. `acceptance_criteria`:
    - Winning play should be describable as "for each house, compare carrying the previous best total against taking this house plus the best total from two houses back."
    - Solver evaluation must keep `100%` solvability across the shipped block set.
    - Direct scouting should survive D1-D2 and break at `D3`.
    - The kept bridge should claim Blind 75 `#198 House Robber` directly and should not claim `#213 House Robber II` in this pass.
13. `predicted_scorecard`:
    - `skill_depth`: `0.54`
    - `counterintuitive_moves`: `1.0`
    - `algorithm_alignment`: `1.00`
    - `greedy_optimal_gap`: `0.16`
    - `difficulty_curve`: `D3`
    - `insight_inflection`: `D3`
14. `open_questions_for_engineering`:
    - Does the selected-house copy make the prefix totals feel more important than the raw stash values?
    - Is `Scout Prefix` legible as brute-force recomputation rather than as a generic hint button?
    - Does allowing `Carry Forward` on the first house still read clearly as "the empty street total is 0" instead of as a rules bug?

## Implementation Packet

1. `version_id`: Nightledger v1
2. `algorithm_game_spec`: house-row prefix ledger with explicit carry-versus-raid sealing, one brute-force scout fallback, and a D3 breakpoint where direct scouting and local stash comparison both stop being safe
3. `prototype_scope`: one `Nightledger` screen, five difficulty presets, two handcrafted block layouts per difficulty, solver evaluation against local stash comparison plus final-prefix scouting, and a direct Blind 75 concept bridge for `#198`
4. `difficulty_scope`: D1-D2 preserve a survivable brute-force scout path; D3-D5 require the true prefix recurrence and include smaller-current-house traps
5. `non_goals`:
   - no claim on `#213 House Robber II` in this pass
   - no circular-street split mechanic
   - no browser-recorded blind session while sandboxed local playtest serving remains blocked
6. `predicted_scorecard`:
   - `solvability`: `1.00`
   - `skill_depth`: `0.54`
   - `counterintuitive_moves`: `1.0`
   - `algorithm_alignment`: `1.00`
   - `greedy_optimal_gap`: `0.16`

## Prototype Package

1. `game_entrypoint`: `src/games/Nightledger.tsx`
2. `difficulty_controls`: five difficulty chips plus house selection, `Carry Forward`, `Raid This House`, `Scout Prefix`, `Reset Block`, and `New Block`
3. `changed_files`:
   - `src/solvers/Nightledger.solver.ts`
   - `src/games/Nightledger.tsx`
   - `src/games/index.ts`
   - `leetcode/specs/nightledger.md`
   - `leetcode/curriculum.md`
   - `leetcode/results.tsv`
   - `run-program.md`
4. `artifact_paths`:
   - `src/solvers/Nightledger.solver.ts`
   - `src/games/Nightledger.tsx`
   - `leetcode/specs/nightledger.md`
5. `actual_scorecard`:
   - `solvability`: `100%`
   - `skill_depth`: `51.1%`
   - `counterintuitive_moves`: `0.8`
   - `drama`: `0.59`
   - `decision_entropy`: `1.11`
   - `info_gain_ratio`: `2.71`
   - `algorithm_alignment`: `100%`
   - `leetCode_fit`: `100%`
   - `best_alternative_gap`: `15.5%`
   - `invariant_pressure`: `38.7%`
   - `difficulty_breakpoint`: `D3`
6. `known_issues`:
   - True browser blind playtesting is still blocked in this sandbox because local interactive playtest serving is not available here.
   - `Carry Forward` on house one is mathematically valid but emotionally odd; the selected-house copy has to keep the empty-street total visible so this does not read like a rules bug.

## Blind Play Report

- `rules_clarity`: The row of houses, the two cheap recurrence actions, and the expensive scout fallback all read clearly in source-level blind review. The main blind risk is whether first-time players immediately understand that the ledger value on a house represents the whole best prefix, not just that house.
- `easy_strategy`: On D1-D2 the most intuitive move is still "scout the final block once" or "take whichever nearby house looks richer." Those approaches survive long enough to teach the board.
- `medium_strategy`: D3 is the real shift. A smaller current house can now still be the right raid because it pairs with a strong two-back ledger, and the final scout tax no longer fits.
- `hard_strategy`: D4-D5 demand the full recurrence: for every house, compare the carry route against the raid-plus-two-back route and seal the stronger total immediately.
- `strategy_evolution`: The expected learning shift is from local stash hunches and brute-force scouting to one disciplined prefix ledger where every new decision compares two accumulated routes, not two raw houses.
- `plain_english_pattern`: "At each house, compare keeping the best total so far against taking this house plus the best total from two houses back, then write down whichever total is bigger."
- `naive_vs_optimal`: The strongest wrong strategy compares only neighboring stash values, which misses medium-plus cases where a smaller current house still wins through the two-back total. The brute-force scout is the other near miss: safe on early blocks, impossible after D3.
- `confusion_points`: The likely confusion point is the very first house, where carrying forward a total of `0` is legal but obviously weak. The UI copy has to keep framing that as "leave the whole street untouched so far" rather than as a puzzle exploit.
- `bug_summary`: No blocking implementation bugs surfaced during solver evaluation, `npx tsc --noEmit`, or `env CI=1 npx expo export --platform web`. Browser-based blind play remains outstanding because the sandbox does not expose the normal interactive playtest path.
- `verdict`: keep

## Decision Memo

- `decision`: keep
- `why`: Nightledger teaches Blind 75 `#198 House Robber` directly enough to justify a dedicated kept game. The shipped build keeps `100%` solvability, hits the intended `D3` breakpoint, preserves direct algorithm alignment, and exposes a meaningful medium-plus alternative gap once brute-force scouting no longer fits.
- `evidence_used`: solver evaluation from `src/solvers/Nightledger.solver.ts`, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`
- `bug_status`: no open implementation bugs
- `algorithm_alignment_judgment`: strong enough to claim Blind 75 `#198` directly because optimal play requires the exact prefix recurrence shape: compare the carry route `dp[i - 1]` against the raid route `nums[i] + dp[i - 2]`, then seal only the larger total
- `next_action`: mark `#198 House Robber` complete in the Blind 75 tracker and leave `#213 House Robber II` as the next unchecked outer-loop item
- `polish_scope`: once interactive playtesting is available again, confirm that first-time players abandon local stash comparison at D3 without needing extra explanatory copy

## Concept Bridge

This game teaches the 1D dynamic-programming recurrence behind `House Robber`. For the Blind 75 tracker, the kept `Nightledger` game claims `#198 House Robber`.

The moment where `Carry Forward` seals the selected house prefix maps to keeping `dp[i - 1]`. The moment where `Raid This House` seals the selected prefix from the current stash plus the sealed two-back total maps to `nums[i] + dp[i - 2]`. The moment where the player must choose between those two totals at every prefix maps to `dp[i] = max(dp[i - 1], nums[i] + dp[i - 2])`. `Scout Prefix` is the deliberately weaker route: recomputing the answer for a prefix directly instead of reusing the live ledger.
