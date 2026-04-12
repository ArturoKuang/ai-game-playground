# Mintpath

## Algorithm Game Spec

1. `game_name`: Mintpath
2. `algorithm_target`: 3.1 1D Dynamic Programming
3. `core_insight`: Do not lock onto the largest coin first. Seal each amount from `1..target` by testing every denomination that can step back to a reachable smaller amount, adding one coin, and keeping only the cheapest certified route.
4. `one_line_pitch`: Certify an exact toll ledger before the mint clock runs out by sealing every amount from smaller sealed totals instead of repeatedly scouting the full change tree or trusting the biggest coin.
5. `rules`:
   - Amount `0` begins pre-sealed at exactly `0` coins.
   - Each puzzle exposes one fixed rack of coin denominations and one target amount.
   - Any higher amount may be sealed with `Mint <coin>` only if the smaller amount `amount - coin` is already sealed with a reachable coin count.
   - `Mint <coin>` seals the selected amount at `sealed[amount - coin] + 1`.
   - `Seal Blocked` is legal only when no denomination can reach the selected amount from any sealed predecessor.
   - `Scout Amount` certifies any unresolved amount directly, but it burns the full brute-force scout tax for that amount.
   - The puzzle is won only when the target amount is sealed at the true minimum coin count, or correctly sealed as blocked when no exact change exists, before the action budget expires.
6. `core_actions`:
   - inspect one amount and the denomination rack
   - mint the amount from a reachable predecessor plus one coin
   - compare several reachable coin lanes and keep the cheapest
   - seal an amount as blocked when no denomination lane survives
   - scout an amount directly at brute-force cost
7. `algorithm_to_mechanic_mapping`:
   - Amount `i` maps to subproblem `dp[i]`, the fewest coins needed to make `i`.
   - Each `Mint <coin>` action maps to candidate transition `dp[i - coin] + 1`.
   - Comparing every live denomination lane maps to iterating through all coins for the current amount.
   - Sealing an amount at the cheapest live lane maps to `dp[i] = min(dp[i], dp[i - coin] + 1)`.
   - `Seal Blocked` maps to leaving the state unreachable and returning `-1` when no denomination can reach the target.
   - `Scout Amount` maps to naive recursive exploration of the full change tree without a reusable 1D ledger.
8. `why_greedy_fails`: The strongest wrong instinct is "take the largest coin that fits." D1-D2 let that feel safe often enough to teach the board, but D3-D4 include totals such as `6` with rack `[1, 3, 4]` or `8` with rack `[1, 4, 6]` where the biggest coin produces a worse predecessor chain than a smaller denomination. D5 adds blocked targets, so largest-coin instinct also fails by pretending a solution exists when the exact total is actually unreachable.
9. `aha_moment`: "The current amount is not about the biggest coin. It is about which earlier sealed amount plus one coin gives the cheapest total here."
10. `difficulty_progression`:
    - D1: Very short racks still allow a direct scout, and largest-coin instinct does not get punished yet.
    - D2: The scout survives exactly once, which makes the amount ledger feel cleaner before it becomes mandatory.
    - D3: The scout tax breaks, and the first largest-coin trap appears.
    - D4: Several amounts now require a smaller denomination because it lands on a stronger predecessor.
    - D5: The rack introduces blocked totals, so the ledger must preserve unreachable states instead of forcing a fake coin count.
11. `predicted_failure_mode`: If the UI highlights denomination size more strongly than predecessor counts, players will overfit to "take the biggest coin" and miss that the real comparison is between fully accumulated predecessor totals.
12. `acceptance_criteria`:
    - Winning play should be describable as "for each amount, test every reachable denomination lane from smaller sealed amounts and keep the cheapest total."
    - Solver evaluation must keep `100%` solvability across the shipped rack set.
    - Direct scouting should survive D1-D2 and fail at `D3`.
    - Medium-plus racks must punish the largest-coin shortcut.
    - At least one hard rack must require correctly sealing the target as blocked.
    - The kept bridge should claim Blind 75 `#322 Coin Change` directly and only in this pass.
13. `predicted_scorecard`:
    - `skill_depth`: `0.52`
    - `counterintuitive_moves`: `2.0`
    - `algorithm_alignment`: `1.00`
    - `greedy_optimal_gap`: `0.32`
    - `difficulty_curve`: `D3`
    - `insight_inflection`: `D3`
14. `open_questions_for_engineering`:
    - Does the selected-amount card make predecessor totals feel more important than raw denomination size?
    - Does `Seal Blocked` read as a correct DP answer instead of a failure state?
    - Does the scout tax feel like brute-force recursion rather than as a hint button?

## Implementation Packet

1. `version_id`: Mintpath v1
2. `algorithm_game_spec`: exact-change amount ledger with one pre-sealed base amount, denomination actions that add one coin from smaller reachable amounts, explicit blocked-state sealing, and a brute-force scout fallback
3. `prototype_scope`: one `Mintpath` screen, five difficulty presets, two rack layouts per difficulty, solver evaluation against a largest-coin shortcut plus final-amount scouting, and a direct Blind 75 concept bridge for `#322`
4. `difficulty_scope`: D1-D2 preserve a survivable scout route; D3-D4 require the true minimum-over-coins recurrence; D5 adds impossible totals that must stay blocked
5. `non_goals`:
   - no shared claim on `#152 Maximum Product Subarray` or other remaining 1D DP items in this pass
   - no browser-recorded blind session while sandboxed interactive playtest serving remains unavailable
   - no attempt to compress the full coin rack into one greedy denomination order
6. `predicted_scorecard`:
   - `solvability`: `1.00`
   - `skill_depth`: `0.52`
   - `counterintuitive_moves`: `2.0`
   - `algorithm_alignment`: `1.00`
   - `greedy_optimal_gap`: `0.32`

## Prototype Package

1. `game_entrypoint`: `src/games/Mintpath.tsx`
2. `difficulty_controls`: five difficulty chips plus amount selection, one `Mint <coin>` button per denomination, `Seal Blocked`, `Scout Amount`, `Reset Rack`, and `New Rack`
3. `changed_files`:
   - `src/solvers/Mintpath.solver.ts`
   - `src/games/Mintpath.tsx`
   - `src/games/index.ts`
   - `leetcode/specs/mintpath.md`
   - `leetcode/results.tsv`
   - `run-program.md`
4. `artifact_paths`:
   - `src/solvers/Mintpath.solver.ts`
   - `src/games/Mintpath.tsx`
   - `leetcode/specs/mintpath.md`
5. `actual_scorecard`:
   - `solvability`: `100%`
   - `skill_depth`: `43.5%`
   - `counterintuitive_moves`: `0.4`
   - `drama`: `0.60`
   - `decision_entropy`: `2.23`
   - `info_gain_ratio`: `2.70`
   - `algorithm_alignment`: `100%`
   - `leetCode_fit`: `100%`
   - `best_alternative_gap`: `40.0%`
   - `invariant_pressure`: `31.1%`
   - `difficulty_breakpoint`: `D3`
6. `known_issues`:
   - True browser blind playtesting is still blocked in this sandbox because local interactive playtest serving is unavailable here.
   - D5 impossible racks make the brute-force scout terminate quickly once every branch dies, so the strongest breakpoint evidence comes from the D3-D4 largest-coin traps rather than from the impossible rack alone.

## Blind Play Report

- `rules_clarity`: In source-level blind review, the rack, amount ledger, and base seal at amount `0` read clearly. The main blind risk is whether first-time players instantly understand that a sealed amount stores the best answer for the whole amount, not just the last coin taken.
- `easy_strategy`: D1-D2 invite either scouting the target directly or grabbing the biggest coin that fits. Those habits survive long enough to teach the board.
- `medium_strategy`: D3 is the real shift. The scout tax breaks, and the largest coin starts overpaying because a smaller coin can land on a much stronger predecessor amount.
- `hard_strategy`: D4-D5 demand the full recurrence: for every amount, compare every reachable denomination lane, keep the cheapest predecessor-plus-one route, and preserve blocked amounts when no lane survives.
- `strategy_evolution`: The intended learning shift is from "use the biggest coin" to "the current amount depends on which earlier sealed amount gives the cheapest total after adding one coin."
- `plain_english_pattern`: "For each total, look backward through every coin size that can reach it, add one coin to that earlier sealed total, and keep the cheapest result. If none can reach it, mark the amount impossible."
- `naive_vs_optimal`: The strongest wrong strategy is to take the largest coin that fits the amount. It feels natural, then loses on D3-D4 when a smaller coin reaches a much better predecessor. Direct target scouting is the other near miss: safe on the short racks, broken from D3 onward.
- `confusion_points`: The likely confusion point is `Seal Blocked`; the copy has to keep framing it as a correct ledger answer, not as an error or surrender button.
- `bug_summary`: No blocking implementation bugs surfaced during solver evaluation, `npx tsc --noEmit`, the scripted optimal-path smoke test, or `env CI=1 npx expo export --platform web`. Browser-based blind play remains outstanding because the sandbox blocks the usual interactive route.
- `verdict`: keep

## Decision Memo

- `decision`: keep
- `why`: Mintpath teaches Blind 75 `#322 Coin Change` directly enough to justify a dedicated kept game. The shipped build keeps `100%` solvability, lands the intended `D3` breakpoint, exposes a clear failure mode for the largest-coin shortcut, and makes impossible totals explicit instead of hiding them behind failed play.
- `evidence_used`: solver evaluation from `src/solvers/Mintpath.solver.ts`, `npx tsc --noEmit`, a scripted optimal-path state-transition smoke test, and `env CI=1 npx expo export --platform web`
- `bug_status`: no open implementation bugs
- `algorithm_alignment_judgment`: strong enough to claim Blind 75 `#322` directly because optimal play requires the real DP solution shape: iterate amounts from `1..target`, evaluate every denomination transition `dp[i - coin] + 1`, keep the minimum reachable count, and preserve unreachable amounts as blocked
- `next_action`: mark `#322 Coin Change` complete in the Blind 75 tracker and leave the next outer-loop pass for `#152 Maximum Product Subarray`
- `polish_scope`: once interactive playtesting is available again, confirm that first-time players abandon largest-coin instinct at D3 and read `Seal Blocked` as a correct answer without extra coaching

## Concept Bridge

This game teaches the minimum-coin 1D dynamic-programming recurrence behind `Coin Change`. For the Blind 75 tracker, the kept `Mintpath` game claims `#322 Coin Change`.

The moment where `Mint <coin>` seals amount `i` from amount `i - coin` maps to candidate transition `dp[i - coin] + 1`. The moment where the player must compare every reachable denomination lane before sealing an amount maps to taking the minimum across all coins. The moment where `Seal Blocked` is correct maps to the unreachable state that returns `-1` when no denomination can build the target amount.
