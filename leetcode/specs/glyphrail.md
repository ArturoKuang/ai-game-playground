# Glyphrail

## Algorithm Game Spec

1. `game_name`: Glyphrail
2. `algorithm_target`: 3.1b Digit Prefix Decode DP
3. `core_insight`: Do not treat a digit prefix as one choice. Seal each prefix with the sum of every legal incoming lane: the previous prefix if the current digit stands alone, plus the two-back prefix if the last two digits form a legal `10..26` pair.
4. `one_line_pitch`: Certify a cipher ribbon before the relay clock expires by keeping one live decode ledger instead of re-scouting the strip or trusting only one incoming lane.
5. `rules`:
   - The ribbon is a fixed left-to-right digit strip.
   - Prefix `0` begins pre-sealed at exactly `1` route.
   - `Trace Solo` adds the previous prefix count when the current digit is non-zero.
   - `Trace Pair` adds the two-back prefix count when the last two digits form a legal `10..26` pair.
   - `Seal Dead` marks the selected prefix at `0` when both gates are shut.
   - `Scout Prefix` certifies any unresolved prefix directly, but it burns the full brute-force recount tax for that prefix.
   - The puzzle is won only when the final prefix is sealed before the action budget expires.
6. `core_actions`:
   - inspect a digit prefix, its current digit, and its two-digit window
   - trace the solo lane from one prefix back
   - trace the pair lane from two prefixes back
   - mark a dead prefix when no legal lane exists
   - spend a brute-force scout to certify a prefix directly
7. `algorithm_to_mechanic_mapping`:
   - Prefix `i` maps to subproblem `dp[i]`, the number of decodings for the first `i` digits.
   - `Trace Solo` maps to adding `dp[i - 1]` when `s[i - 1] !== '0'`.
   - `Trace Pair` maps to adding `dp[i - 2]` when `10 <= int(s[i - 2:i]) <= 26`.
   - `Seal Dead` maps to `dp[i] = 0` when neither lane is legal.
   - The sealed ribbon maps to left-to-right tabulation over a 1D DP array.
   - `Scout Prefix` maps to naive recursion that recomputes the same prefix counts from scratch.
8. `why_greedy_fails`: The strongest shortcut keeps only one incoming lane. That feels plausible because the board always shows two candidate sources, but medium-plus ribbons need both. D3-D5 also introduce zero gates where the solo lane shuts completely and only a legal pair keeps the ribbon alive. Direct prefix scouting is the other near miss: it survives D1-D2, then breaks cleanly at D3 once the recursion tax outruns budget.
9. `aha_moment`: "A prefix is not a yes-or-no choice. It inherits every legal route that can reach it."
10. `difficulty_progression`:
    - D1: Very short ribbons still allow a direct scout, and a single shared branch point introduces the idea that two legal lanes can both count.
    - D2: The scout survives exactly once, which lets the player contrast brute-force recounting with the cleaner prefix ledger.
    - D3: The scout tax breaks, zeros appear, and some prefixes require both lanes to be added before the count is complete.
    - D4: Longer ribbons mix branch points and shut gates, so one-lane shortcuts keep undercounting the real route total.
    - D5: The hardest strips combine heavy branching with dead-prefix handling, making the full decode ledger the only stable route.
11. `predicted_failure_mode`: If the UI makes the current digit more salient than the two live source counts, players will overfit to "pick one lane" instead of understanding that valid prefixes accumulate routes from every open lane.
12. `acceptance_criteria`:
    - Winning play should be describable as "for each digit prefix, add every legal one-step and two-step route that reaches it, or mark it dead at 0 if both gates are shut."
    - Solver evaluation must keep `100%` solvability across the shipped ribbon set.
    - Direct scouting should survive D1-D2 and break at `D3`.
    - The kept bridge should claim Blind 75 `#91 Decode Ways` directly and only in this pass.
13. `predicted_scorecard`:
    - `skill_depth`: `0.56`
    - `counterintuitive_moves`: `3.0`
    - `algorithm_alignment`: `1.00`
    - `greedy_optimal_gap`: `0.34`
    - `difficulty_curve`: `D3`
    - `insight_inflection`: `D3`
14. `open_questions_for_engineering`:
    - Does the selected-prefix card make "sum both legal lanes" feel like the natural move rather than like bookkeeping?
    - Does `Seal Dead` read as a real decode outcome instead of as a failure state?
    - Does the scout tax feel like brute-force recursion rather than as a generic hint button?

## Implementation Packet

1. `version_id`: Glyphrail v1
2. `algorithm_game_spec`: digit-ribbon decode ledger with explicit solo and pair route tracing, dead-prefix handling, and a scout fallback that models brute-force recounting
3. `prototype_scope`: one `Glyphrail` screen, five difficulty presets, two handcrafted ribbon layouts per difficulty, solver evaluation against a one-lane shortcut plus final-prefix scouting, and a direct Blind 75 concept bridge for `#91`
4. `difficulty_scope`: D1-D2 preserve a survivable scout path; D3-D5 require the full additive prefix recurrence and include zero-gate or dead-prefix cases
5. `non_goals`:
   - no shared claim on `#322 Coin Change` or other 1D DP items in this pass
   - no browser-recorded blind play session while sandboxed interactive serving remains blocked
   - no variable alphabet sizes beyond the standard `1..26` mapping
6. `predicted_scorecard`:
   - `solvability`: `1.00`
   - `skill_depth`: `0.56`
   - `counterintuitive_moves`: `3.0`
   - `algorithm_alignment`: `1.00`
   - `greedy_optimal_gap`: `0.34`

## Prototype Package

1. `game_entrypoint`: `src/games/Glyphrail.tsx`
2. `difficulty_controls`: five difficulty chips plus prefix selection, `Trace Solo`, `Trace Pair`, `Seal Dead`, `Scout Prefix`, `Reset Ribbon`, and `New Ribbon`
3. `changed_files`:
   - `src/solvers/Glyphrail.solver.ts`
   - `src/games/Glyphrail.tsx`
   - `src/games/index.ts`
   - `leetcode/specs/glyphrail.md`
   - `leetcode/curriculum.md`
   - `leetcode/results.tsv`
   - `run-program.md`
4. `artifact_paths`:
   - `src/solvers/Glyphrail.solver.ts`
   - `src/games/Glyphrail.tsx`
   - `leetcode/specs/glyphrail.md`
5. `actual_scorecard`:
   - `solvability`: `100%`
   - `skill_depth`: `60.0%`
   - `counterintuitive_moves`: `3.4`
   - `drama`: `0.65`
   - `decision_entropy`: `1.73`
   - `info_gain_ratio`: `1.81`
   - `algorithm_alignment`: `100%`
   - `leetCode_fit`: `100%`
   - `best_alternative_gap`: `38.9%`
   - `invariant_pressure`: `86.8%`
   - `difficulty_breakpoint`: `D3`
6. `known_issues`:
   - Browser-based blind play could not run in this sandbox because local interactive playtest serving is not available here.
   - Invalid ribbons that die early can still be cheap to scout because brute-force recursion terminates quickly once both gates shut. The kept layouts still teach dead prefixes explicitly, but the primary breakpoint evidence comes from the valid seed-0 ribbons.

## Blind Play Report

- `rules_clarity`: The ribbon, route lanes, and scout tax read cleanly in static inspection. The main remaining blind risk is whether first-time players immediately understand that a sealed prefix is a route count for the whole left substring, not just the current digit.
- `easy_strategy`: D1-D2 invite a direct final scout or a one-lane shortcut because the ribbons are short enough that those habits still feel viable.
- `medium_strategy`: D3 is the turn. The scout tax breaks, zeros show up, and prefixes with two legal lanes force the player to stop treating the board like a single-choice path.
- `hard_strategy`: D4-D5 demand the full prefix ledger. The player has to add every legal lane, keep dead prefixes at `0`, and trust the whole sealed ribbon instead of only one local source.
- `strategy_evolution`: The intended shift is from "pick a lane" or "scout it directly" to "certify every prefix by adding all open lanes from the live ledger."
- `plain_english_pattern`: "For each digit, keep every decoding path that can legally reach this spot: from the previous prefix if this digit can stand alone, and from two prefixes back if the pair is legal."
- `naive_vs_optimal`: The strongest wrong strategy keeps only one incoming lane. It undercounts the medium-plus ribbons because valid prefixes often need both lanes. Direct scouting is the other near miss: safe on D1-D2, broken from D3 onward.
- `confusion_points`: The biggest blind risk is whether `Seal Dead` feels like a real answer instead of a failure screen. The selected-prefix copy has to keep framing `0` as the correct decode count when both gates are shut.
- `bug_summary`: No blocking implementation bugs surfaced during solver evaluation, `npx tsc --noEmit`, or `env CI=1 npx expo export --platform web`. Browser-based blind play remains outstanding because the sandbox blocks the usual interactive route.
- `verdict`: keep

## Decision Memo

- `decision`: keep
- `why`: Glyphrail teaches Blind 75 `#91 Decode Ways` directly enough to justify a dedicated kept game. The shipped build keeps `100%` solvability, lands the intended `D3` breakpoint, exposes why one-lane shortcuts undercount, and makes zero-gate handling visible instead of implicit.
- `evidence_used`: solver evaluation from `src/solvers/Glyphrail.solver.ts`, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`
- `bug_status`: no open implementation bugs
- `algorithm_alignment_judgment`: strong enough to claim Blind 75 `#91` directly because optimal play requires the actual recurrence shape: add `dp[i - 1]` when the current digit is legal alone, add `dp[i - 2]` when the last two digits form a legal pair, and keep `0` when both gates are shut
- `next_action`: mark `#91 Decode Ways` complete in the Blind 75 tracker and leave the next outer-loop pass for `#322 Coin Change`
- `polish_scope`: once interactive playtesting is available again, confirm that first-time players recognize `Seal Dead` as a correct count outcome and abandon one-lane shortcuts at D3 without extra coaching

## Concept Bridge

This game teaches digit-prefix dynamic programming for `Decode Ways`. For the Blind 75 tracker, the kept `Glyphrail` game claims `#91 Decode Ways`.

The moment where `Trace Solo` adds the previous prefix count maps to `dp[i] += dp[i - 1]` when the current digit is non-zero. The moment where `Trace Pair` adds the two-back prefix count maps to `dp[i] += dp[i - 2]` when the last two digits form a legal `10..26` pair. The moment where `Seal Dead` marks a prefix at `0` maps to the case where neither lane is legal. `Scout Prefix` is the weaker alternative: recursively recounting the same prefix instead of reusing the live ledger.
