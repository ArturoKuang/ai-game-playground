# Foldline

## Algorithm Game Spec

1. `game_name`: Foldline
2. `algorithm_target`: 1.2 Two Pointers
3. `core_insight`: You do not need a rebuilt clean string. Trim non-alphanumeric noise from whichever edge blocks you, compare the two live endpoints case-insensitively, and move inward.
4. `one_line_pitch`: Audit a noisy inscription by folding inward from both ends before the archive budget is wasted on full-window transcription.
5. `rules`:
   - The board is a fixed inscription strip with letters, digits, and punctuation noise.
   - Only the current left and right edges matter.
   - `Skip Left` or `Skip Right` trims one symbol from that edge.
   - `Compare` checks the two live endpoints after case folding, but only helps when both are alphanumeric.
   - `Transcribe Window` copies and normalizes the whole remaining strip at double cost.
   - Call the strip `Mirror` or `Broken` at any time.
6. `core_actions`:
   - Trim punctuation and spacing from the blocking edge.
   - Compare the two live signal glyphs once both ends are meaningful.
   - Use full-window transcription only as the expensive fallback instinct.
   - Call `Broken` immediately after a real endpoint mismatch.
7. `algorithm_to_mechanic_mapping`:
   - Left and right live edges are the two pointers.
   - `Skip Left` / `Skip Right` map to the `while !isalnum(...)` trims in `Valid Palindrome`.
   - `Compare` maps to `tolower(s[left]) == tolower(s[right])`.
   - The inward shrink after a match maps to `left += 1; right -= 1`.
   - `Transcribe Window` is the weaker alternative: rebuild the whole cleaned substring instead of solving in place.
8. `why_greedy_fails`: The intuitive move is to clean the whole remaining strip so the answer feels explicit. That extra pass is tolerable on easy strips, but the hard strips are budgeted so only local end trimming survives.
9. `aha_moment`: "I do not need the whole cleaned string. I only need the next real character on each edge."
10. `difficulty_progression`:
    - Easy: short strips where full transcription still works.
    - Medium: noisier strips where transcription is obviously heavier than trimming the live ends.
    - Hard: long, noisy strips with hidden mismatches where the double-pass fallback blows the budget.
11. `predicted_failure_mode`: If endpoint state is not legible, the player may feel forced to transcribe instead of discovering the inward fold. The UI therefore keeps the live ends explicit and the full-window cost visible.
12. `acceptance_criteria`:
    - The winning strategy is describable as "trim junk from the side it blocks, compare the two meaningful ends, then move inward."
    - Full-window transcription survives D1-D2 but breaks by D3+.
    - The post-game bridge claims `#125 Valid Palindrome` directly and specifically.
13. `predicted_scorecard`:
    - `skill_depth`: high, because random skipping and full transcription waste many actions.
    - `counterintuitive_moves`: present, because skipping visible characters is often correct.
    - `algorithm_alignment`: very high, because the UI is the palindrome loop in physical form.
    - `greedy_optimal_gap`: strong, because full transcription costs roughly double the active window.
    - `difficulty_curve`: clear with a D3 breakpoint.
    - `insight_inflection`: D3.
14. `open_questions_for_engineering`:
    - Is the difference between signal and noise legible enough without trivializing the answer?
    - Does `Transcribe Window` feel like a plausible fallback instead of a mandatory tutorial button?

## Implementation Packet

1. `version_id`: Foldline v1
2. `algorithm_game_spec`: noisy palindrome audit with local two-pointer trimming versus expensive full-window transcription
3. `prototype_scope`: one `Foldline` screen, five difficulty presets, one direct two-pointer action path plus one expensive rebuild fallback
4. `difficulty_scope`: difficulties `1` through `5`
5. `non_goals`: freeform string entry, animation polish, or multi-problem concept claims in this pass
6. `predicted_scorecard`:
   - `skill_depth`: 0.72
   - `counterintuitive_moves`: 6
   - `algorithm_alignment`: 0.95
   - `greedy_optimal_gap`: 0.50
   - `difficulty_curve`: 0.82
   - `insight_inflection`: 3

## Prototype Package

1. `game_entrypoint`: `src/games/Foldline.tsx`
2. `difficulty_controls`: five presets with generated noisy inscriptions and budgets
3. `changed_files`:
   - `src/games/Foldline.tsx`
   - `src/solvers/Foldline.solver.ts`
   - `src/games/index.ts`
   - `leetcode/specs/foldline.md`
   - `leetcode/results.tsv`
   - `run-program.md`
4. `artifact_paths`:
   - `leetcode/specs/foldline.md`
   - `src/games/Foldline.tsx`
   - `src/solvers/Foldline.solver.ts`
5. `actual_scorecard`:
   - `solvability`: 1.00
   - `skill_depth`: 0.91
   - `counterintuitive_moves`: 26.34 average
   - `decision_entropy`: 2.55
   - `algorithm_alignment`: 1.00
   - `leetCode_fit`: 0.99
   - `best_alternative_gap`: 0.78
   - `invariant_pressure`: 0.62
   - `difficulty_breakpoint`: 3
6. `known_issues`:
   - Blind browser playtesting did not run in this session; the loop relied on solver evaluation plus static UI verification.
   - `npx tsc --noEmit` passes only after the active `dist/` web export is present because the repo `tsconfig.json` includes generated output by default.

## Play Report

- `rules_clarity`: The screen exposes both live ends, the remaining cleaned window, and the transcription cost, so the core loop is legible without target-algorithm jargon.
- `easy_strategy`: D1-D2 still allow the expensive full-window transcription, which preserves a plausible but weaker first instinct.
- `medium_strategy`: D3 is the inflection point. Full transcription drops to `0%` solvability while direct endpoint trimming stays at `100%`.
- `hard_strategy`: D5 forces the strongest lesson: trim only the blocking noise, compare the two live signal glyphs, and stop the moment a real mismatch appears.
- `strategy_evolution`: The intended shift is from "rewrite the whole noisy strip so I can inspect it" to "operate only on the two live ends."
- `plain_english_pattern`: "Ignore junk at the side that blocks you, compare the two real edge symbols, and keep folding inward."
- `naive_vs_optimal`: Full transcription gives the right answer on forgiving strips, but it pays for the whole window twice. Local trimming and endpoint comparison solve the same question in one inward pass.
- `confusion_points`: No blocking UI or state-machine confusion found during export and solver inspection. Real blind runtime feedback is still pending.
- `bug_summary`: No compile or bundling bugs after the JSX text fix. Verification used `npx tsc --noEmit`, solver evaluation from `src/solvers/Foldline.solver.ts`, and `env CI=1 npx expo export --platform web`.
- `verdict`: keep

## Decision Memo

- `decision`: keep
- `why`: Foldline teaches the exact `Valid Palindrome` pointer loop instead of a generic mirror metaphor. Solver results are comfortably above the loop thresholds: `100%` solvability, `91.2%` skill depth, nonzero counterintuitive pressure, and a strong `77.6%` alternative gap. The expensive transcription fallback survives D1-D2 and dies at D3+, which is the intended learning breakpoint.
- `evidence_used`: solver evaluation across 25 generated strips, `npx tsc --noEmit`, and successful web export via `env CI=1 npx expo export --platform web`
- `bug_status`: no open implementation bugs; blind browser QA remains an environment/testing gap rather than a discovered gameplay bug
- `algorithm_alignment_judgment`: strong enough to claim `#125 Valid Palindrome` directly
- `next_action`: mark `#125` complete in the Blind 75 tracker and stop after this outer-loop pass
- `polish_scope`: when browser playtesting is available, run a real blind session to confirm the transcription button reads as a fallback instinct rather than a spoiler

## Concept Bridge

This game teaches the in-place two-pointer solution for strings with punctuation and case noise. For the Blind 75 tracker, the kept `Foldline` game claims `#125 Valid Palindrome`.

The moment where you trim punctuation from whichever edge blocks progress maps to the `while left < right and !isalnum(s[left/right])` skips in code. The moment where you compare the two live glyphs after case folding maps to `tolower(s[left]) == tolower(s[right])`. `Transcribe Window` is the deliberately weaker instinct: rebuilding the cleaned substring first instead of proving the answer in one inward pass.
