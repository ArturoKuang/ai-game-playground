# Manifest

1. `game_name`: Manifest
2. `algorithm_target`: 1.4 Sliding Window
3. `core_insight`: Sweep the right edge forward until the live satchel covers every required manifest stamp, bank that valid cover, and then keep shaving the left edge while the cover still holds so the minimum valid span emerges without restarting.
4. `one_line_pitch`: Work a cargo belt, keep the smallest contiguous satchel that satisfies a manifest, and avoid wasting actions on full repacks.
5. `rules`:
   - The cargo belt arrives left to right, and the incoming crate is always the next unread slot.
   - `Load Next` adds the incoming crate to the live satchel.
   - `Drop Left` removes the oldest crate from the satchel front.
   - `Full Repack` clears the whole live satchel and restarts on the incoming crate, but it costs several actions.
   - The run wins only if the shortest valid satchel you logged matches the route's true minimum cover within budget.
6. `core_actions`:
   - inspect the manifest ledger and the incoming crate
   - load forward while the satchel is still missing required stamps
   - once the manifest is covered, shave the left edge immediately and keep banking shorter valid covers
   - avoid expensive full repacks that throw away a paid-for suffix
7. `algorithm_to_mechanic_mapping`:
   - The live satchel maps to the current sliding-window substring.
   - The manifest ledger maps to the required frequency table for `t`.
   - `Load Next` maps to expanding the right pointer while the window is still missing required counts.
   - Banking a valid satchel maps to recording a candidate answer when the current window satisfies all requirements.
   - `Drop Left` maps to decrementing `s[left]` and advancing `left` inside the `while (window covers need)` shrink loop.
   - `Full Repack` maps to the wrong restart-from-scratch instinct of throwing away the current suffix instead of preserving it.
8. `why_greedy_fails`: The tempting shortcut is to treat the first full cover as good enough or to restart after every valid cover. That works on short easy belts, but medium-plus belts hide shorter covers inside a bloated first success, and the only way to reach them is to keep sliding the same satchel instead of rebuilding from scratch.
9. `aha_moment`: "The moment the manifest is covered, the job flips. I should stop growing and keep trimming the left edge until the cover breaks."
10. `difficulty_progression`:
    - D1: Single-copy manifests where the first valid cover is near the answer, but one left shave can still improve it.
    - D2: Junk freight bloats the first cover, so players must shrink instead of locking the first success.
    - D3: Duplicate manifest stamps first appear, making count coverage matter rather than set membership.
    - D4-D5: The left edge is often a critical required stamp, so players must bank the current cover, drop that critical edge anyway, and rebuild from the preserved suffix to reach the true minimum.
11. `predicted_failure_mode`: If the ledger does not make missing counts clear, players will either mimic `Echo Run` and chase uniqueness or freeze on the first valid cover because they cannot see why breaking a valid satchel is sometimes correct.
12. `acceptance_criteria`:
    - The player can explain the winning pattern as "load until all required stamps are inside, then keep trimming the left edge until the cover breaks."
    - Solver evaluation keeps `100%` solvability and shows a real gap against a restart-on-cover baseline.
    - The post-game bridge claims `#76 Minimum Window Substring` directly and specifically.
13. `predicted_scorecard`:
    - `skill_depth`: `0.35` because first-cover and restart habits should survive Easy but fall apart once shorter inner covers appear.
    - `counterintuitive_moves`: `2.0` because optimal play repeatedly drops required cargo from a still-valid satchel to hunt a smaller future cover.
    - `algorithm_alignment`: `1.00` because the winning rhythm is exactly expand-until-covered, then shrink-while-covered.
    - `greedy_optimal_gap`: `0.26` because restart-on-cover should stay viable on Easy but break by medium difficulty.
    - `difficulty_curve`: `D3` because that is where duplicate requirements and critical-edge trims should become essential.
    - `insight_inflection`: `D2` because that is where the player should first realize the first valid cover is not sacred.
14. `open_questions_for_engineering`:
    - Is the manifest ledger readable enough that duplicate requirements feel explicit instead of hidden bookkeeping?
    - Does `Full Repack` feel tempting without overpowering the left-shave lesson?
    - Are the logged shorter covers visible enough that players notice the repeated "valid, smaller, still valid, smaller" rhythm?

## Implementation Packet

1. `version_id`: Manifest v1
2. `algorithm_game_spec`: one-pass cargo-belt sweep where the player preserves the shortest substring that covers all required manifest counts by banking a valid cover and then shaving the left edge until that cover breaks
3. `prototype_scope`: one `Manifest` screen, five difficulty presets, rerollable fixed routes, a visible manifest ledger, and a warning card that flips from "missing" to "covered" once the satchel satisfies the manifest
4. `difficulty_scope`: D1-D2 teach that the first valid cover is not sacred, D3 introduces duplicate requirements, and D4-D5 force critical-edge drops that temporarily break coverage
5. `non_goals`:
   - no second Blind 75 mapping in this pass
   - no explicit code-jargon explanation during gameplay
   - no hidden or stochastic cargo behavior beyond fixed reroll seeds
6. `predicted_scorecard`:
   - `solvability`: `1.00`
   - `skill_depth`: `0.35`
   - `counterintuitive_moves`: `2.0`
   - `algorithm_alignment`: `1.00`
   - `greedy_optimal_gap`: `0.26`

## Prototype Package

1. `game_entrypoint`: `src/games/Manifest.tsx`
2. `difficulty_controls`: five difficulty chips plus `Reset Route` and `New Route`
3. `changed_files`:
   - `src/games/Manifest.tsx`
   - `src/solvers/Manifest.solver.ts`
   - `src/games/index.ts`
   - `leetcode/specs/manifest.md`
   - `leetcode/results.tsv`
   - `run-program.md`
4. `artifact_paths`:
   - `leetcode/specs/manifest.md`
   - `src/games/Manifest.tsx`
   - `src/solvers/Manifest.solver.ts`
5. `actual_scorecard`:
   - `solvability`: `100%`
   - `skill_depth`: `60.0%`
   - `counterintuitive_moves`: `5.32`
   - `drama`: `0.21`
   - `decision_entropy`: `1.38`
   - `info_gain_ratio`: `2.45`
   - `algorithm_alignment`: `100%`
   - `best_alternative_gap`: `28.9%`
   - `invariant_pressure`: `24.7%`
   - `difficulty_breakpoint`: `D2`
6. `known_issues`:
   - No blocking implementation bugs surfaced in TypeScript compile or Expo web export.
   - A live blind UI playtest was not captured in this sandbox, so the blind report below is based on the shipped UI, solver behavior, and the verified build rather than a recorded human session.

## Blind Play Report

- `rules_clarity`: The cargo belt, manifest ledger, incoming crate, and best-cover ledger make the loop legible. The only unusual choice is dropping a critical left edge after a valid cover, and the warning card now explains that state transition directly.
- `easy_strategy`: Early instinct is to celebrate the first valid cover and either keep it or repack immediately for a fresh start.
- `medium_strategy`: D2 is where the player should first notice that a valid satchel is only an intermediate result; the real gain comes from shaving junk freight off the front.
- `hard_strategy`: D3-D5 demand the exact loop: load until every required count is present, bank the cover, then keep dropping left even when the next drop will break coverage and force a rebuild from the preserved suffix.
- `strategy_evolution`: The intended shift is from "find any valid satchel" to "treat validity as permission to shrink, not permission to stop."
- `plain_english_pattern`: "Once the manifest is filled, keep trimming the front until one more trim would make it incomplete."
- `naive_vs_optimal`: On the measured solver set, restart-on-cover stays perfect on D1, but by D3 it drops to `20%` solvability while the optimal sweep remains `100%`, because repacks throw away the suffix that already contains most of the next answer.
- `confusion_points`: The biggest remaining teaching risk is whether players immediately believe that dropping a required crate from a valid satchel can still be the right move. The warning copy and milestone chips are the current mitigation.
- `bug_summary`: No code or render defects found. The blind-play gap is an environment limitation rather than a discovered gameplay defect.
- `verdict`: keep, with blind-session coverage still worth adding later

## Decision Memo

- `decision`: keep
- `why`: Manifest teaches the exact `Minimum Window Substring` rhythm instead of a generic substring metaphor. The kept build hit `100%` solvability, `59.97%` skill depth, `100%` algorithm alignment, `28.9%` restart-gap, `24.7%` invariant pressure, and a clear `D2` breakpoint where first-cover and repack instincts stop being competitive.
- `evidence_used`: solver evaluation from `src/solvers/Manifest.solver.ts`, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`
- `bug_status`: no open implementation bugs; live blind-session coverage remains a testing gap rather than a game defect
- `algorithm_alignment_judgment`: strong enough to claim `#76 Minimum Window Substring` directly
- `next_action`: mark `#76` complete in the Blind 75 tracker and leave the next outer-loop pass for `#20 Valid Parentheses`
- `polish_scope`: if later blind play shows hesitation around critical-edge drops, strengthen the visual emphasis that a valid cover has already been banked before the left edge is sacrificed

## Concept Bridge

This game teaches the sliding-window solution for `Minimum Window Substring`. For the Blind 75 tracker, the kept `Manifest` game claims `#76 Minimum Window Substring`.

The moment where the satchel first covers every required stamp maps to the code branch where the current window satisfies all counts from `t` and becomes a candidate answer. The repeated `Drop Left` action after that point maps to the `while (window covers need)` loop that records the best span, decrements `s[left]`, and advances `left` until the cover breaks.
