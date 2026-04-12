# Crestchain

## Algorithm Game Spec

1. `game_name`: Crestchain
2. `algorithm_target`: 3.1e Increasing-Subsequence Endpoint DP
3. `core_insight`: Do not trust one live trail or the nearest lower marker. Each position needs its own best rising badge, which is either `1` or `one more than the strongest earlier lower badge`.
4. `one_line_pitch`: Certify a ridge of height markers before the audit clock runs out by sealing the best rising chain ending at every marker instead of guessing from the nearest lower stone or scouting every crest directly.
5. `rules`:
   - The ridge is a fixed left-to-right row of height markers.
   - Every marker must be sealed exactly once with its best rising badge.
   - `Start Solo` seals the selected marker at rise length `1`.
   - `Inherit From Anchor` is legal only from an earlier marker with a lower height that is already sealed.
   - Inheriting from an anchor seals the selected marker at `anchor_badge + 1`.
   - `Scout Marker` reveals the true badge directly, but burns the full direct-search tax for that marker.
   - The puzzle is won only when every marker is sealed with the true badge before the action budget expires.
6. `core_actions`:
   - inspect one marker and its earlier lower anchors
   - start a new solo rise at `1`
   - inherit from one sealed earlier lower marker
   - scout a marker directly at brute-force cost
   - reset or reroll the ridge
7. `algorithm_to_mechanic_mapping`:
   - Marker `i` maps to subproblem `dp[i]`, the LIS length ending exactly at position `i`.
   - `Start Solo` maps to the base candidate `1`.
   - Each earlier lower anchor `j` maps to a valid predecessor with `nums[j] < nums[i]`.
   - Inheriting from anchor `j` maps to the candidate `dp[j] + 1`.
   - Comparing all earlier lower anchors maps to taking `max(dp[j] + 1)` over every valid `j`.
   - The crowned ridge length maps to `max(dp)`.
   - `Scout Marker` maps to recomputing the endpoint answer directly instead of reusing the live ledger.
8. `why_greedy_fails`: The strongest wrong instinct is to trust the nearest earlier lower marker. That shortcut feels clean on warm boards, then breaks at `D3` when a very low late marker sits close to the finish but carries a weak badge, while an older lower marker farther back carries the only rise long enough to keep the crest alive. Direct scouting is the other near miss: manageable on short ridges, impossible once the scout taxes stack up.
9. `aha_moment`: "This marker does not want the closest lower marker. It wants the earlier lower marker that already ends the strongest rise."
10. `difficulty_progression`:
    - D1: Short ridges let the player read the badge idea directly, and the nearest lower anchor still behaves.
    - D2: More anchors appear, but the shortcut still survives, which lets the full ledger habit settle in gently.
    - D3: The first false summit arrives, and the nearest-lower shortcut breaks.
    - D4: Multiple late low anchors become traps, so the player must compare every earlier lower badge.
    - D5: Long ridges make both brute-force scouting and nearest-lower handoffs collapse; only the full endpoint ledger survives.
11. `predicted_failure_mode`: If the UI over-emphasizes raw heights and under-emphasizes the already sealed rise badges, players will keep reading "lower and closer" instead of "lower and strongest."
12. `acceptance_criteria`:
    - Winning play should be describable as "for each position, compare every earlier lower badge, keep the strongest one plus one, or start at 1 if none exist."
    - Solver evaluation must keep `100%` solvability across the shipped ridge set.
    - The nearest-lower shortcut should stay exact on D1-D2 and fail from `D3`.
    - The scout-all fallback should exceed budget from `D2`, while still leaving room for a few direct rescues on the warm boards.
    - The kept bridge should claim Blind 75 `#300 Longest Increasing Subsequence` directly and only in this pass.
13. `predicted_scorecard`:
    - `skill_depth`: `0.50`
    - `counterintuitive_moves`: `2.0`
    - `algorithm_alignment`: `1.00`
    - `greedy_optimal_gap`: `0.18`
    - `difficulty_curve`: `D3`
    - `insight_inflection`: `D3`
14. `open_questions_for_engineering`:
    - Do players read the sealed rise badges before they read the raw heights?
    - Is `Start Solo` legible as a true base candidate rather than a consolation move?
    - Are the anchor cards readable enough when several earlier lower options are live at once?

## Implementation Packet

1. `version_id`: Crestchain v1
2. `algorithm_game_spec`: ridge-marker endpoint ledger where each marker either starts at `1` or inherits the strongest earlier lower rise badge plus one, with a direct-scout fallback and a D3 false-summit trap
3. `prototype_scope`: one `Crestchain` screen, five difficulty presets, two handcrafted ridge layouts per difficulty, solver evaluation against the nearest-lower shortcut plus direct scouting, and a direct Blind 75 concept bridge for `#300`
4. `difficulty_scope`: D1-D2 preserve warm-board readability while the nearest-lower shortcut still works; D3-D5 force full earlier-lower comparison and punish weak late anchors
5. `non_goals`:
   - no patience-sorting or binary-search-tail mechanic in this pass
   - no shared claim on later greedy or 2D-DP Blind 75 items
   - no browser-recorded blind session while sandboxed local playtesting remains blocked
6. `predicted_scorecard`:
   - `solvability`: `1.00`
   - `skill_depth`: `0.50`
   - `counterintuitive_moves`: `2.0`
   - `algorithm_alignment`: `1.00`
   - `greedy_optimal_gap`: `0.18`

## Prototype Package

1. `game_entrypoint`: `src/games/Crestchain.tsx`
2. `difficulty_controls`: five difficulty chips plus marker selection, anchor buttons for earlier lower markers, `Start Solo`, `Scout Marker`, `Reset Ridge`, and `New Ridge`
3. `changed_files`:
   - `src/solvers/Crestchain.solver.ts`
   - `src/games/Crestchain.tsx`
   - `src/games/index.ts`
   - `leetcode/curriculum.md`
   - `leetcode/specs/crestchain.md`
   - `leetcode/results.tsv`
   - `run-program.md`
4. `artifact_paths`:
   - `src/solvers/Crestchain.solver.ts`
   - `src/games/Crestchain.tsx`
   - `leetcode/specs/crestchain.md`
5. `actual_scorecard`:
   - `solvability`: `100%`
   - `skill_depth`: `47.2%`
   - `counterintuitive_moves`: `1.3`
   - `drama`: `0.75`
   - `decision_entropy`: `1.08`
   - `info_gain_ratio`: `4.18`
   - `algorithm_alignment`: `100%`
   - `leetCode_fit`: `100%`
   - `best_alternative_gap`: `16.8%`
   - `invariant_pressure`: `37.5%`
   - `difficulty_breakpoint`: `D3`
6. `known_issues`:
   - Browser-based blind play remains blocked in this sandbox, so the blind play report is source-level plus solver-backed rather than a captured interactive session.
   - The nearest-lower shortcut gap is modest because the warm boards intentionally let that shortcut survive before the D3 false-summit trap appears.

## Blind Play Report

- `rules_clarity`: The row of height markers, the solo base action, the earlier-lower anchors, and the expensive scout fallback all read cleanly in source-level blind review. The main blind risk is whether first-time players notice the sealed rise badges quickly enough to stop trusting raw height and proximity.
- `easy_strategy`: D1 encourages reading each marker as either a solo start or one more than a lower earlier badge. The nearest-lower anchor still works, so the mechanic feels natural before it gets strict.
- `medium_strategy`: D2 keeps the same rhythm but introduces enough anchor choices that the player can feel why every marker needs its own stored badge.
- `hard_strategy`: D3-D5 require the full endpoint pattern: for each marker, compare every earlier lower sealed badge, inherit from the strongest one, and never hand the crest off through a weak late anchor just because it is nearby.
- `strategy_evolution`: The intended shift is from "pick the closest lower marker" to "pick the earlier lower marker with the strongest already certified rise."
- `plain_english_pattern`: "Every marker keeps the best climb that ends exactly there. Start at 1 if nothing lower came before, otherwise look backward at every lower marker and take one more than the strongest badge you find."
- `naive_vs_optimal`: The strongest wrong strategy takes the nearest earlier lower marker. It feels right on D1-D2, then fails from D3 onward when a tiny late marker sits close to the finish but carries a much weaker badge than an older lower anchor. Direct scouting is the other near miss: fine for occasional rescues, hopeless if used as the whole plan.
- `confusion_points`: The likely confusion point is `Start Solo`, which is mathematically correct but can look weak compared with any visible lower anchor. The selected-marker copy needs to keep framing it as the true base candidate rather than as a fallback hint.
- `bug_summary`: No blocking implementation bugs surfaced during solver evaluation, `npx tsc --noEmit`, an optimal-path state-transition smoke test across both ridge seeds for every difficulty, or `env CI=1 npx expo export --platform web`.
- `verdict`: keep

## Decision Memo

- `decision`: keep
- `why`: Crestchain teaches Blind 75 `#300 Longest Increasing Subsequence` directly enough to justify a dedicated kept game. The shipped build keeps `100%` solvability, hits the intended `D3` breakpoint, preserves exact endpoint-DP alignment, and makes the defining comparison legible: the chosen predecessor is not the nearest lower marker, but the earlier lower marker with the strongest sealed badge.
- `evidence_used`: solver evaluation from `src/solvers/Crestchain.solver.ts`, `npx tsc --noEmit`, an optimal-path state-transition smoke test across both ridge seeds for every difficulty, and `env CI=1 npx expo export --platform web`
- `bug_status`: no open implementation bugs
- `algorithm_alignment_judgment`: strong enough to claim Blind 75 `#300` directly because optimal play requires the exact recurrence shape: for each position `i`, keep `1` as the base candidate, inspect every earlier `j < i` with `nums[j] < nums[i]`, and seal `dp[i]` as the strongest valid predecessor badge plus one before crowning `max(dp)`
- `next_action`: mark `#300 Longest Increasing Subsequence` complete in the Blind 75 tracker and leave the next outer-loop pass for `#62 Unique Paths`
- `polish_scope`: once interactive playtesting is available again, confirm that first-time players stop trusting the nearest lower anchor at D3 without any extra explanatory copy

## Concept Bridge

This game teaches endpoint-based 1D dynamic programming for `Longest Increasing Subsequence`. For the Blind 75 tracker, the kept `Crestchain` game claims `#300 Longest Increasing Subsequence`.

The moment where a marker inherits from the strongest earlier lower badge maps to `dp[i] = 1 + max(dp[j])` over all earlier `j` with `nums[j] < nums[i]`. The moment where the crowned ridge length comes from the best sealed badge anywhere on the row maps to the final `max(dp)` scan.
