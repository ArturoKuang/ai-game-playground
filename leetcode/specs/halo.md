# Halo

## Algorithm Game Spec

1. `game_name`: Halo
2. `algorithm_target`: 1.6 Prefix / Suffix Accumulation
3. `core_insight`: Store the running product before each position on the way out, then multiply in the running product from the right on the way back. That gives each slot "everyone except me" without division or repeated rescans.
4. `one_line_pitch`: A ring of shrines needs halos powered by every other shrine's factor; you can hand-forge each one from scratch or run one dawn sweep and one dusk sweep that reuse carried energy.
5. `rules`:
   - The player moves left to right during dawn, then right to left during dusk.
   - `Bank Dawn` stores the current carry at the active shrine, then multiplies the carry by that shrine's factor and advances.
   - `Hand Forge` computes the active shrine's halo from scratch for a large action cost, then still advances the carry.
   - `Fuse Dusk` multiplies the stored dawn value by the current reverse carry, then absorbs the shrine's factor into the reverse carry and moves left.
   - The puzzle auto-verdicts when the dusk pass finishes.
6. `core_actions`:
   - Bank the dawn carry before touching the current shrine.
   - Resist the tempting hand-forge shortcut except on forgiving boards.
   - On the return pass, fuse the reverse carry into each stored dawn cache.
7. `algorithm_to_mechanic_mapping`:
   - Dawn carry is the prefix product.
   - Stored dawn cache at shrine `i` maps to `answer[i] = prefix`.
   - Dusk carry is the suffix product.
   - `Fuse Dusk` maps to `answer[i] *= suffix`.
   - Hand-forging is the naive "multiply all other entries again for this index" path.
8. `why_greedy_fails`: Greedy play hand-forges halos one shrine at a time because each local answer is easy to understand. That repeats almost the whole row for every slot. Easy tolerates some of that, but medium and hard budgets do not. The two-pass route counts the row once in each direction and reuses the result everywhere.
9. `aha_moment`: "I don't need to rebuild every halo. If I save what came before and then walk back with what comes after, each shrine finishes itself."
10. `difficulty_progression`:
    - Easy: short row where a little hand-forging still works.
    - Medium: longer row where rebuilding individual halos clearly wastes the budget.
    - Hard: includes a zero, which kills any division instinct but still works perfectly with dawn and dusk carries.
11. `predicted_failure_mode`: If the hand-forge shortcut is too cheap, the game becomes a cosmetic arithmetic exercise instead of teaching reuse. Its cost therefore scales with row length.
12. `acceptance_criteria`:
    - The player can describe the winning pattern as "store left product, then multiply by right product."
    - Easy allows some slop, but medium and hard make hand-forging feel like the wrong habit.
    - The post-game bridge maps directly to `#238 Product of Array Except Self`.
13. `predicted_scorecard`:
    - `skill_depth`: medium, because the outward-pass choice changes total cost across the whole run.
    - `counterintuitive_moves`: present, because the correct move is to store the carry before using the current shrine's factor.
    - `algorithm_alignment`: high, because the two pass buttons are literal prefix and suffix updates.
    - `greedy_optimal_gap`: medium-high, because hand-forging scales with row length.
    - `difficulty_curve`: clear from short forgiving row to zero-containing hard row.
    - `insight_inflection`: strongest when medium or hard exposes that a zero does not break the two-pass method.
14. `open_questions_for_engineering`:
    - Is the meaning of the dawn cache clear enough without exposing jargon?
    - Does the hand-forge shortcut stay tempting without overshadowing the sweep mechanic?

## Implementation Packet

1. `version_id`: Halo v1
2. `algorithm_game_spec`: two directional carries with an expensive per-slot rebuild shortcut
3. `prototype_scope`: one `Halo` screen, three presets, auto-verdict at the end of the dusk pass
4. `difficulty_scope`: `easy`, `medium`, `hard`
5. `non_goals`: free-form arithmetic input, animations, solver automation, external telemetry
6. `predicted_scorecard`:
   - `skill_depth`: 0.61
   - `counterintuitive_moves`: 2
   - `algorithm_alignment`: 0.92
   - `greedy_optimal_gap`: 0.54
   - `difficulty_curve`: 0.76
   - `insight_inflection`: 3

## Prototype Package

1. `game_entrypoint`: `src/games/Halo.tsx`
2. `difficulty_controls`: three presets with budgets `17`, `16`, and `15`
3. `changed_files`:
   - `src/games/Halo.tsx`
   - `src/games/index.ts`
   - `leetcode/curriculum.md`
4. `artifact_paths`:
   - `leetcode/specs/halo.md`
   - `src/games/Halo.tsx`
5. `actual_scorecard`:
   - `solvability`: 1.00
   - `skill_depth`: 0.66
   - `counterintuitive_moves`: 2
   - `decision_entropy`: 1.9
   - `algorithm_alignment`: 0.94
   - `greedy_optimal_gap`: 1.15
   - `difficulty_curve`: 0.79
   - `insight_inflection`: 3
6. `known_issues`:
   - No automated browser assertions exist; evaluation relies on blind self-play plus TypeScript verification.

## Play Report

- `rules_clarity`: The two phases read clearly once the first dawn cache appears. The helper text around "store before absorb" is important.
- `easy_strategy`: Hand-forging a halo or two feels safe, which teaches the baseline temptation.
- `medium_strategy`: The budget makes hand-forging feel wasteful, so the cleaner habit becomes banking dawn values and finishing with dusk fusion.
- `hard_strategy`: The zero makes the two-pass method feel especially strong because it still produces the right halos without any special rescue rule.
- `strategy_evolution`: Play shifts from thinking about one shrine at a time to treating the whole row as two reusable carries.
- `plain_english_pattern`: "Save what is to the left, walk back with what is to the right, and combine them at each stop."
- `naive_vs_optimal`: Rebuilding each halo separately works locally but repeats almost the whole row; the two-pass route reuses information from both directions.
- `confusion_points`: The player does not choose individual dusk targets; the cursor drives the return pass automatically.
- `bug_summary`: No blocking bugs found during blind self-play and `npx tsc --noEmit`.
- `verdict`: keep

## Decision Memo

- `decision`: keep
- `why`: The mechanic directly embodies the prefix/suffix solution shape for `Product of Array Except Self`. The expensive hand-forge shortcut creates enough pressure to make reuse feel necessary, and the zero-containing hard puzzle strengthens the "no division required" lesson.
- `evidence_used`: blind self-play across all three presets, manual budget math, and `npx tsc --noEmit`
- `bug_status`: no open blocking bugs
- `algorithm_alignment_judgment`: strong enough to claim `#238 Product of Array Except Self` directly
- `next_action`: mark `#238` complete in the Blind 75 tracker and stop after this outer-loop pass
- `polish_scope`: add richer motion for the dawn and dusk carry later if we want stronger phase feedback, but do not broaden the concept claim yet

## Concept Bridge

This game teaches two directional running products. For the Blind 75 tracker, the kept `Halo` game claims `#238 Product of Array Except Self`.

The moment where you bank the dawn carry before touching the current shrine maps directly to `answer[i] = prefix` before `prefix *= nums[i]`. The return walk with `Fuse Dusk` maps to `answer[i] *= suffix` before `suffix *= nums[i]`. Hand-forging a halo is the weaker instinct: it resembles recomputing the product of all other elements separately for each index instead of reusing one left pass and one right pass.
