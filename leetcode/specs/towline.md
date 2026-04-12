# Towline

## Algorithm Game Spec

1. `game_name`: Towline
2. `algorithm_target`: 2.9 Fixed-Gap Runner Pointers
3. `core_insight`: Removing the `n`th node from the end in one pass is not a tail recount. Start both hands at a dummy dock, push the scout exactly `n + 1` links ahead, then tow scout and cutter together. When the scout clears open water, the cutter is already parked at the one rope you can legally cut.
4. `one_line_pitch`: Cast one scout `n + 1` links ahead from the dock, tow both hands together until the scout clears, then cut the next rope loose.
5. `rules`:
   - One towline of barges runs from a dummy dock to open water.
   - Each route names which barge to remove from the stern.
   - `Scout Ahead` moves only the scout one rope forward.
   - `Deckhand Ahead` moves only the cutter one rope forward.
   - `Tow Both` is correct only when the scout is exactly `n + 1` links ahead of the cutter, including the dock as real space.
   - `Cut Next` cuts the rope immediately after the cutter, but only once the scout has cleared the stern.
   - Later difficulties remove the spare time that allowed a full stern recount before moving the cutter.
6. `core_actions`:
   - prime the scout to an exact fixed gap from the dock
   - preserve that gap while both hands march together
   - wait for the scout to clear open water
   - cut the rope after the parked predecessor
7. `algorithm_to_mechanic_mapping`:
   - The dock is the dummy node.
   - The scout is `fast`.
   - The cutter is `slow`.
   - `Scout Ahead` during priming maps to advancing `fast` before the shared march.
   - The fixed tow gap maps to `n + 1` links between `fast` and `slow`.
   - `Tow Both` maps to `fast = fast.next; slow = slow.next`.
   - The moment where the scout clears open water maps to `fast == null`.
   - `Cut Next` maps to `slow.next = slow.next.next`.
8. `why_greedy_fails`: Two wrong instincts do the teaching. The first is the slow recount: row the scout all the way to the stern, then walk the cutter forward from the dock by raw distance. D1-D2 still forgive that, but D3 budgets do not. The second is the off-by-one instinct: prime only `n` links because the target is `n` from the end. That parks the cutter one rope too late and cuts the wrong barge.
9. `aha_moment`: "The dock counts. I need one extra link in the scout gap, and after that I should stop counting and just tow both hands together."
10. `difficulty_progression`:
    - D1: Three-barge routes allow a full stern recount, but the fixed-gap tow is already visible.
    - D2: Four-barge routes still permit the recount line exactly, so players can feel the cheaper one-pass route without being forced yet.
    - D3: Exact budgets kill the recount. Only the fixed-gap tow clears the gate.
    - D4: Longer routes amplify the cost of recounting and make the predecessor cut more legible.
    - D5: One route removes the head rope itself, proving that the dock must count as real gap space.
11. `predicted_failure_mode`: If the dock reads like decoration rather than a live starting node, players will prime only `n` links and consistently park the cutter one rope too late.
12. `acceptance_criteria`:
    - The winning pattern is describable as "send the scout one extra link ahead from the dock, tow both together, then cut next when the scout clears."
    - Full stern recounting survives Easy but fails cleanly once D3 removes the slack.
    - Off-by-one priming fails for structural reasons, not arbitrary punishment.
    - The post-game bridge can claim Blind 75 `#19 Remove Nth Node From End of List` directly and specifically.
13. `predicted_scorecard`:
    - `skill_depth`: `0.45` because the recount line should survive early and then die once the budget turns exact.
    - `counterintuitive_moves`: `2.80` because the extra dock-sized gap and the final predecessor cut both run against first instinct.
    - `algorithm_alignment`: `1.00` because the winning line is exactly the standard one-pass dummy-head solution.
    - `greedy_optimal_gap`: `0.50` because the strongest wrong strategy is a slower but temporarily viable full recount.
    - `difficulty_curve`: `D3`.
    - `insight_inflection`: `D3`.
14. `open_questions_for_engineering`:
    - Does the dock card feel like real list space instead of a decorative origin marker?
    - Is the tow-gap summary strong enough that `Tow Both` feels earned instead of magical?
    - Will head-removal routes read as the same invariant instead of a special exception?

## Implementation Packet

1. `version_id`: Towline v1
2. `algorithm_game_spec`: harbor towline game with a dummy dock, a fixed scout/cutter gap, and an exact-budget breakpoint that kills full stern recounts at D3
3. `prototype_scope`: one `Towline` screen, five difficulty presets, rerollable fixed routes, scout/cutter/gap summaries, a visible dock-to-stern towline, and solver evaluation for one-pass tow vs recount and off-by-one baselines
4. `difficulty_scope`: D1-D2 leave budget slack for a full recount, D3-D4 require the exact one-pass tow, and D5 adds a head-removal route that depends on the dock counting as real space
5. `non_goals`:
   - no second Blind 75 claim in this pass
   - no two-pass "count length first" endorsement beyond serving as the measured wrong baseline
   - no recursive linked-list deletion teaching in this build
6. `predicted_scorecard`:
   - `solvability`: `1.00`
   - `skill_depth`: `0.45`
   - `counterintuitive_moves`: `2.80`
   - `algorithm_alignment`: `1.00`
   - `greedy_optimal_gap`: `0.50`

## Prototype Package

1. `game_entrypoint`: `src/games/Towline.tsx`
2. `difficulty_controls`: five difficulty chips plus `Reset Towline` and `New Towline`
3. `changed_files`:
   - `src/games/Towline.tsx`
   - `src/solvers/Towline.solver.ts`
   - `src/games/index.ts`
   - `leetcode/curriculum.md`
   - `leetcode/specs/towline.md`
   - `leetcode/learnings.md`
   - `leetcode/results.tsv`
   - `run-program.md`
4. `artifact_paths`:
   - `leetcode/specs/towline.md`
   - `src/games/Towline.tsx`
   - `src/solvers/Towline.solver.ts`
5. `actual_scorecard`:
   - `solvability`: `100%`
   - `skill_depth`: `63.5%`
   - `counterintuitive_moves`: `3.05`
   - `drama`: `15.1%`
   - `decision_entropy`: `1.00`
   - `info_gain_ratio`: `2.26`
   - `algorithm_alignment`: `100%`
   - `leetCode_fit`: `100%`
   - `best_alternative_gap`: `63.5%`
   - `invariant_pressure`: `100%`
   - `difficulty_breakpoint`: `D3`
6. `known_issues`:
   - Live blind browser play was not run in this sandbox. The blind report below is based on solver evaluation, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`.

## Blind Play Report

- `rules_clarity`: The dock/scout/cutter summaries keep the state readable. The main copy risk is whether players immediately believe that the dock counts as real tow-gap space.
- `easy_strategy`: Early play can succeed by recounting from the stern after the scout reaches open water, but the cheaper one-pass tow already feels cleaner.
- `medium_strategy`: D2 should make the fixed-gap tow feel obviously lighter even before it becomes mandatory.
- `hard_strategy`: D3-D5 demand the exact ritual: scout one extra link from the dock, tow both together, cut next only after the scout clears.
- `strategy_evolution`: The expected shift is from "count the whole towline first" to "carry the right gap once and let the stern certify the cut for me."
- `plain_english_pattern`: "Push one boat one extra rope ahead from the dock, then march both boats together until the lead boat falls off the line."
- `naive_vs_optimal`: The strongest wrong strategy is a full stern recount. It still clears D1-D2, then the exact D3 budget kills it while the one-pass tow remains perfect. The separate off-by-one baseline fails because it forgets the dock step and parks the cutter one rope too late.
- `confusion_points`: The key risk is the dummy dock. If that card reads as decorative, the whole one-extra-step lesson weakens.
- `bug_summary`: No blocking implementation bugs surfaced in solver evaluation, TypeScript compile, or Expo web export.
- `verdict`: keep

## Decision Memo

- `decision`: keep
- `why`: Towline teaches the real one-pass `Remove Nth Node From End of List` invariant instead of generic tail counting. The kept build hit `100%` solvability, `100%` algorithm alignment, `63.5%` strongest-alternative gap, `100%` invariant pressure, and a clean `D3` breakpoint where the full recount line stops fitting.
- `evidence_used`: solver evaluation from `src/solvers/Towline.solver.ts`, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`
- `bug_status`: no open implementation bugs
- `algorithm_alignment_judgment`: strong enough to claim `#19 Remove Nth Node From End of List` directly
- `next_action`: mark `#19` complete in the Blind 75 tracker and leave the next outer-loop pass for `#23 Merge k Sorted Lists`
- `polish_scope`: if a live blind browser session becomes available later, confirm that the dock card unmistakably reads as a real dummy node rather than a decorative start marker

## Concept Bridge

This game teaches the one-pass dummy-head solution for `Remove Nth Node From End of List`. For the Blind 75 tracker, the kept `Towline` game claims `#19 Remove Nth Node From End of List`.

The moment where you `Scout Ahead` exactly `n + 1` times from the dock maps to priming `fast` from `dummy`. The moment where you `Tow Both` maps to `fast = fast.next; slow = slow.next` while preserving the fixed gap. The moment where the scout clears open water maps to `fast == null`, which certifies that `slow` is parked at the predecessor node. The moment where you `Cut Next` maps to `slow.next = slow.next.next`.
