# Loopledger

## Algorithm Game Spec

1. `game_name`: Loopledger
2. `algorithm_target`: 3.1 1D Dynamic Programming
3. `core_insight`: A circular street is not one ledger. Break it into the only two legal lines, certify the best haul for each line with the House Robber recurrence, then keep the larger finished line total.
4. `one_line_pitch`: Split an alarmed house ring into its two legal quiet cuts, keep a live haul ledger for each cut, and crown the better finished cut before sunrise.
5. `rules`:
   - Houses sit on a ring, so House `1` and House `n` share one alarm and cannot both be robbed.
   - The player may work on either legal cut at any time:
     - `Skip First` excludes House `1` and certifies Houses `2..n`
     - `Skip Last` excludes House `n` and certifies Houses `1..n-1`
   - Inside either cut, any prefix may be sealed by `Carry Forward` if the previous prefix in that cut is already sealed.
   - Inside either cut, any prefix may be sealed by `Raid This House` if the two-back prefix in that cut is already sealed.
   - `Scout Prefix` certifies one prefix directly but burns the full brute-force scout tax for that prefix.
   - The puzzle is won only when both legal cuts are sealed correctly and the player can crown the larger final cut total within budget.
6. `core_actions`:
   - switch between the two legal cuts
   - inspect one selected house prefix inside the active cut
   - carry the previous cut total forward
   - raid the current house and combine it with the sealed two-back cut total
   - scout a prefix directly at brute-force cost
7. `algorithm_to_mechanic_mapping`:
   - `Skip First` maps to solving `rob(nums.slice(1))`
   - `Skip Last` maps to solving `rob(nums.slice(0, -1))`
   - Each house prefix inside either cut maps to `dp[i]`, the best haul through that linear prefix
   - `Carry Forward` maps to candidate `dp[i - 1]`
   - `Raid This House` maps to candidate `nums[i] + dp[i - 2]`
   - Sealing each cut prefix maps to `dp[i] = max(dp[i - 1], nums[i] + dp[i - 2])`
   - Crowning the ring from the two finished cuts maps to `max(rob(nums.slice(1)), rob(nums.slice(0, -1)))`
   - `Scout Prefix` maps to naive recursion that recomputes one cut prefix instead of reusing the ledger
8. `why_greedy_fails`: The strongest wrong instinct is "throw out the smaller endpoint and solve only that cut." D1-D2 let that hunch survive often enough to feel plausible, but D3-D5 include loops where excluding the slightly larger endpoint preserves a much stronger interior chain. The other near miss is scouting both final cut totals directly; it works early and then dies once both scout taxes no longer fit.
9. `aha_moment`: "The circle is the problem. I have to solve both legal straight streets first, and only then compare them."
10. `difficulty_progression`:
    - D1: A short porch loop still allows brute-force scouting of both cut totals once.
    - D2: The dual-ledger split is clearer, but scouting both cuts is still barely survivable.
    - D3: Scout taxes finally break, and endpoint-cut guesses start losing.
    - D4: The better cut may exclude the slightly larger endpoint, so the split itself must be reasoned through.
    - D5: Only disciplined dual-ledger play survives; shortcut cut guesses and scout taxes both collapse.
11. `predicted_failure_mode`: If the UI makes the two cuts feel like cosmetic tabs instead of two necessary legal cases, players will overfit to picking one cut by endpoint value and never internalize the required final comparison.
12. `acceptance_criteria`:
    - Winning play should be describable as "solve the two legal cuts separately, then keep the larger result."
    - Solver evaluation must keep `100%` solvability across the shipped loop set.
    - Brute-force scouting of both cuts should survive D1-D2 and fail at `D3`.
    - Medium-plus loops should punish the wrong endpoint-exclusion heuristic.
    - The kept bridge should claim Blind 75 `#213 House Robber II` directly.
13. `predicted_scorecard`:
    - `skill_depth`: `0.56`
    - `counterintuitive_moves`: `2.0`
    - `algorithm_alignment`: `1.00`
    - `greedy_optimal_gap`: `0.18`
    - `difficulty_curve`: `D3`
    - `insight_inflection`: `D3`
14. `open_questions_for_engineering`:
    - Does the ring alarm make it obvious that one straight-street ledger is insufficient?
    - Is the active-cut state legible enough that players do not confuse the two cut ledgers?
    - Do the hard endpoint traps feel fair in hindsight instead of arbitrary?

## Implementation Packet

1. `version_id`: Loopledger v1
2. `algorithm_game_spec`: alarmed ring with two legal cut ledgers, explicit carry-versus-raid sealing inside each cut, and a final crown decision that keeps the larger finished cut total
3. `prototype_scope`: one `Loopledger` screen, five difficulty presets, rerollable ring layouts, dual cut cards, solver evaluation against endpoint-cut heuristics plus scout-both fallback, and a direct Blind 75 concept bridge for `#213`
4. `difficulty_scope`: D1-D2 preserve a survivable scout-both route; D3-D5 require the true two-cut split and the linear recurrence inside each cut
5. `non_goals`:
   - no shared claim on `#198 House Robber`, which remains covered by `Nightledger`
   - no browser-recorded blind session while sandboxed interactive playtest serving remains unavailable
   - no attempt to collapse the two-cut logic into one merged ledger view
6. `predicted_scorecard`:
   - `solvability`: `1.00`
   - `skill_depth`: `0.56`
   - `counterintuitive_moves`: `2.0`
   - `algorithm_alignment`: `1.00`
   - `greedy_optimal_gap`: `0.18`

## Prototype Package

1. `game_entrypoint`: `src/games/Loopledger.tsx`
2. `difficulty_controls`: five difficulty chips plus cut switching, house selection, `Carry Forward`, `Raid This House`, `Scout Prefix`, `Reset Loop`, and `New Loop`
3. `changed_files`:
   - `src/solvers/Loopledger.solver.ts`
   - `src/games/Loopledger.tsx`
   - `src/games/index.ts`
   - `leetcode/specs/loopledger.md`
   - `leetcode/curriculum.md`
   - `leetcode/results.tsv`
   - `run-program.md`
4. `artifact_paths`:
   - `src/solvers/Loopledger.solver.ts`
   - `src/games/Loopledger.tsx`
   - `leetcode/specs/loopledger.md`
5. `actual_scorecard`:
   - `solvability`: `100%`
   - `skill_depth`: `53.4%`
   - `counterintuitive_moves`: `2.2`
   - `drama`: `0.62`
   - `decision_entropy`: `1.48`
   - `info_gain_ratio`: `2.74`
   - `algorithm_alignment`: `100%`
   - `leetCode_fit`: `100%`
   - `best_alternative_gap`: `21.5%`
   - `invariant_pressure`: `53.0%`
   - `difficulty_breakpoint`: `D3`
6. `known_issues`:
   - True browser blind playtesting is still blocked in this sandbox because local interactive playtest serving is not available here.
   - The two-cut layout depends on active-card emphasis; if later live testing shows cut confusion, the lane treatment should be strengthened before adding more rules.

## Blind Play Report

- `rules_clarity`: In source-level blind review, the alarmed ring plus the two cut cards make the split legible. The main blind risk is whether first-time players read the two cut ledgers as mandatory cases rather than as optional views.
- `easy_strategy`: D1-D2 still invite scouting both final cuts or excluding the smaller endpoint by instinct. Those routes survive long enough to teach the board.
- `medium_strategy`: D3 is the real shift. Players must keep both cut ledgers because the wrong endpoint exclusion now loses and the scout-both route no longer fits.
- `hard_strategy`: D4-D5 demand the full pattern: finish both legal cuts with carry-versus-raid sealing, then compare the two completed cut totals.
- `strategy_evolution`: The expected learning shift is from "pick one plausible cut" to "the ring forces two straight-street problems, and each one still needs the House Robber ledger."
- `plain_english_pattern`: "Solve the street twice, once without the first house and once without the last, then keep the larger result."
- `naive_vs_optimal`: The strongest wrong strategy excludes the smaller endpoint and solves only that one cut. It feels sensible, then loses once the better result comes from preserving the opposite cut. Directly scouting both cuts is the other near miss: safe early, impossible after D3.
- `confusion_points`: The likely confusion point is whether both cut cards are required or whether one is just a hint. The active-cut copy and final crown language are doing the crucial teaching work.
- `bug_summary`: No blocking implementation bugs surfaced during solver evaluation, `npx tsc --noEmit`, or `env CI=1 npx expo export --platform web`. Browser-based blind play remains outstanding because the sandbox does not expose the normal interactive playtest path.
- `verdict`: keep

## Decision Memo

- `decision`: keep
- `why`: Loopledger teaches Blind 75 `#213 House Robber II` directly enough to justify a dedicated kept game. The shipped build keeps `100%` solvability, hits the intended `D3` breakpoint, preserves direct algorithm alignment, and shows a meaningful gap against the endpoint-exclusion shortcut on the medium-plus loops.
- `evidence_used`: solver evaluation from `src/solvers/Loopledger.solver.ts`, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`
- `bug_status`: no open implementation bugs
- `algorithm_alignment_judgment`: strong enough to claim Blind 75 `#213` directly because optimal play requires both parts of the real solution shape: split the ring into `nums[1:]` and `nums[:-1]`, solve each with the House Robber recurrence, then keep the larger final total
- `next_action`: mark `#213 House Robber II` complete in the Blind 75 tracker and leave the next outer-loop pass for `#5 Longest Palindromic Substring`
- `polish_scope`: once interactive playtesting is available again, confirm that first-time players read both cut cards as required cases and not as optional hints

## Concept Bridge

This game teaches the circular-street extension of `House Robber`. For the Blind 75 tracker, the kept `Loopledger` game claims `#213 House Robber II`.

The moment where the player must certify both `Skip First` and `Skip Last` before crowning the ring maps to `max(rob(nums.slice(1)), rob(nums.slice(0, -1)))`. Inside either cut, the moment where `Carry Forward` keeps the prior cut total maps to `dp[i - 1]`, and the moment where `Raid This House` combines the current stash with the sealed two-back cut total maps to `nums[i] + dp[i - 2]`. Sealing each cut prefix chooses `dp[i] = max(dp[i - 1], nums[i] + dp[i - 2])`.
