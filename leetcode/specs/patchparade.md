# Patch Parade

1. `game_name`: Patch Parade
2. `algorithm_target`: 1.4 Sliding Window
3. `core_insight`: Keep one live banner moving left to right, allow a few off-emblem pennants to stay inside it, and only trim the left edge when the banner length minus the lead emblem count would exceed the patch budget `k`.
4. `one_line_pitch`: Sweep a parade route, carry the longest banner that could still be repainted into one emblem, and avoid wasting actions on full rehangs.
5. `rules`:
   - The parade row arrives left to right, and the incoming pennant is always the next unread slot.
   - `Hang Next` admits the incoming pennant only when the projected repaint debt stays within the crew limit.
   - `Trim Left` removes the oldest pennant from the live banner.
   - `Full Rehang` clears the whole live banner and restarts on the incoming pennant, but it costs several actions.
   - The run wins only if the longest patchable banner you logged matches the route's true best span within budget.
6. `core_actions`:
   - inspect the incoming pennant against the live banner's lead emblem and repair debt
   - hang an off-emblem pennant when the majority still keeps the banner affordable
   - trim the left edge only after the next pennant would overflow the patch budget
   - avoid expensive full rehangs that throw away a still-valuable majority
7. `algorithm_to_mechanic_mapping`:
   - The live banner maps to the current sliding-window substring.
   - The lead ledger maps to the frequency table inside the window, especially the current `max_frequency`.
   - Repair debt maps to `window_length - max_frequency`.
   - `Hang Next` maps to expanding the right pointer when that projected debt is still `<= k`.
   - `Trim Left` maps to incrementing the left pointer only after the next expansion would make the window invalid.
   - `Full Rehang` maps to the wrong restart instinct of clearing the whole window instead of preserving the dominant character count.
8. `why_greedy_fails`: The tempting shortcut is to keep the banner perfectly uniform or to reset as soon as a new stray would overflow the limit. That works on short easy rows, but medium-plus rows hide a strong majority under several scattered strays, so exact-run play and panic resets burn too much progress.
9. `aha_moment`: "I do not need a perfectly clean banner. I can keep a few wrong pennants as long as the dominant emblem still makes the whole stretch affordable."
10. `difficulty_progression`:
    - D1: One patch permit and short rows let the player see that a single stray can still belong in the banner.
    - D2: One-permit rows become long enough that exact-run habits start missing better stretches.
    - D3: Two permits first make "carry the messier majority" essential instead of optional.
    - D4-D5: Strong majorities with three or four scattered strays force precise left trims instead of purity chasing or full resets.
11. `predicted_failure_mode`: If the current leader count is hidden or the rows do not build a strong enough majority, the player will either mimic `Echo Run` and trim on every mismatch or treat the patch budget as cosmetic.
12. `acceptance_criteria`:
    - The player can explain the winning pattern as "let a few wrong pennants stay if the dominant emblem still covers them."
    - Solver evaluation keeps `100%` solvability and shows a real gap against a reset-on-overflow baseline.
    - The post-game bridge claims `#424 Longest Repeating Character Replacement` directly and specifically.
13. `predicted_scorecard`:
    - `skill_depth`: `0.38` because exact-run instincts should leave longer patchable banners on the table by medium difficulty.
    - `counterintuitive_moves`: `1.8` because optimal play repeatedly hangs visibly wrong pennants instead of cleaning them immediately.
    - `algorithm_alignment`: `1.00` because the winning loop is exactly maintain `window_size - max_frequency <= k`.
    - `greedy_optimal_gap`: `0.28` because reset-heavy play should survive Easy but collapse once three scattered strays appear.
    - `difficulty_curve`: `D3` because that is where refusing to spend patch budget should stop working.
    - `insight_inflection`: `D2` because that is where "near-uniform is still valid" should first become legible.
14. `open_questions_for_engineering`:
    - Is the lead-emblem ledger readable enough that the player understands why an off-emblem pennant can still be safe?
    - Does `Full Rehang` feel tempting without overshadowing the left-trim lesson?
    - Are the milestone chips visible enough that players notice when tolerating a messy banner produced a longer best span?

## Implementation Packet

1. `version_id`: Patch Parade v1
2. `algorithm_game_spec`: one-pass parade-banner sweep where the player preserves the longest substring that can be converted into one repeating emblem with at most `k` repaint permits
3. `prototype_scope`: one `Patch Parade` screen, five difficulty presets, rerollable fixed routes, a visible lead-count ledger, and a projected repair-debt warning for the incoming pennant
4. `difficulty_scope`: D1-D2 teach that one stray can belong, D3 introduces unavoidable two-permit windows, and D4-D5 force trim-only-on-overflow discipline
5. `non_goals`:
   - no second Blind 75 mapping in this pass
   - no explicit code-jargon explanation during gameplay
   - no hidden or stochastic parade behavior beyond fixed reroll seeds
6. `predicted_scorecard`:
   - `solvability`: `1.00`
   - `skill_depth`: `0.38`
   - `counterintuitive_moves`: `1.8`
   - `algorithm_alignment`: `1.00`
   - `greedy_optimal_gap`: `0.28`

## Prototype Package

1. `game_entrypoint`: `src/games/PatchParade.tsx`
2. `difficulty_controls`: five difficulty chips plus `Reset Route` and `New Route`
3. `changed_files`:
   - `src/games/PatchParade.tsx`
   - `src/solvers/PatchParade.solver.ts`
   - `src/games/index.ts`
   - `leetcode/specs/patchparade.md`
   - `leetcode/results.tsv`
   - `run-program.md`
4. `artifact_paths`:
   - `leetcode/specs/patchparade.md`
   - `src/games/PatchParade.tsx`
   - `src/solvers/PatchParade.solver.ts`
5. `actual_scorecard`:
   - `solvability`: `100%`
   - `skill_depth`: `63.1%`
   - `counterintuitive_moves`: `2.96`
   - `drama`: `0.53`
   - `decision_entropy`: `1.38`
   - `info_gain_ratio`: `2.68`
   - `algorithm_alignment`: `100%`
   - `best_alternative_gap`: `33.7%`
   - `invariant_pressure`: `37.2%`
   - `difficulty_breakpoint`: `D3`
6. `known_issues`:
   - No blocking implementation bugs surfaced in TypeScript compile or Expo web export.
   - The blind Puppeteer harness could not launch a browser in this sandbox, so no UI-only playtest session was captured this pass.

## Blind Play Report

- `rules_clarity`: Direct blind UI interaction was blocked by the sandboxed browser launch failure, but the exported build keeps the live banner, lead emblem, repair debt, and action labels explicit on screen.
- `easy_strategy`: Inferred first instinct is to chase exact runs or treat every mismatch as suspect, because the objective says "one emblem" before the lead-count ledger makes the tolerance visible.
- `medium_strategy`: D2 is where the player should first notice that one wrong pennant can remain inside the best banner if the majority still dominates.
- `hard_strategy`: D3-D5 demand the exact loop: keep expanding while the projected repair debt fits, then trim from the left only until the next pennant becomes affordable again.
- `strategy_evolution`: The intended shift is from "keep the banner pure" to "protect the dominant emblem count and spend the patch budget deliberately."
- `plain_english_pattern`: "A messy banner can still be right if most of it already matches the same emblem."
- `naive_vs_optimal`: On the measured solver set, reset-on-overflow stays perfect on D1 and barely survives D2, then drops to `0%` solvability from D3 onward while the optimal sweep remains `100%`.
- `confusion_points`: Without a live blind session, the main remaining risk is whether players immediately understand that the lead ledger matters more than the current edge colors.
- `bug_summary`: No code or render defects found. Blind harness launch failed because Puppeteer could not start Chrome under the current sandbox.
- `verdict`: keep, with a blind-play coverage gap noted

## Decision Memo

- `decision`: keep
- `why`: Patch Parade teaches the exact `Longest Repeating Character Replacement` window invariant instead of a generic substring metaphor. The kept build hit `100%` solvability, `63.1%` skill depth, `100%` algorithm alignment, `33.7%` reset-gap, `37.2%` invariant pressure, and a clean `D3` breakpoint.
- `evidence_used`: solver evaluation from `src/solvers/PatchParade.solver.ts`, `npx tsc --noEmit`, `env CI=1 npx expo export --platform web`, and a failed but documented blind-harness launch attempt through `tools/playtest.mjs`
- `bug_status`: no open implementation bugs; blind harness coverage remains an environment/testing gap rather than a game defect
- `algorithm_alignment_judgment`: strong enough to claim `#424 Longest Repeating Character Replacement` directly
- `next_action`: mark `#424` complete in the Blind 75 tracker and leave the next outer-loop pass for `#76 Minimum Window Substring`
- `polish_scope`: if later blind play shows confusion, strengthen the visual tie between the highlighted lead emblem and the projected repair debt after hanging the next pennant

## Concept Bridge

This game teaches the sliding-window solution for `Longest Repeating Character Replacement`. For the Blind 75 tracker, the kept `Patch Parade` game claims `#424 Longest Repeating Character Replacement`.

The moment where an off-emblem incoming pennant is still allowed into the banner maps to keeping a window valid while `window_length - max_frequency <= k`. The moment where the next pennant would overflow the repair debt maps to the shrink step that advances `left` until the window becomes valid again.
