# Heartspan

## Algorithm Game Spec

1. `game_name`: Heartspan
2. `algorithm_target`: 3.1a Palindrome Center Expansion
3. `core_insight`: The longest palindrome is not found by rescanning whole windows. Every rune and every seam is a candidate heart; grow that heart outward one mirrored pair at a time and keep the longest certified span.
4. `one_line_pitch`: Audit a ribbon of runes by pulsing each promising heart outward and crown the longest mirror before full transcriptions consume the clock.
5. `rules`:
   - Every rune center and every seam between adjacent runes is a legal palindrome heart.
   - `Pulse Outward` checks only the next mirrored pair around the selected heart for `1` action.
   - If that pair matches, the selected span grows by `2`; if it breaks, that heart is exhausted.
   - `Transcribe Full Span` certifies the whole selected heart directly, but it pays a large fixed recount cost from scratch.
   - The player may crown the current best span only when no unresolved heart can still possibly beat its length.
6. `core_actions`:
   - select any rune heart or seam heart
   - pulse the next mirrored pair outward
   - transcribe one full heart directly at brute-force cost
   - track the best certified span so far
   - crown the best span once every remaining threat is cleared
7. `algorithm_to_mechanic_mapping`:
   - Selecting a rune heart maps to calling expansion on `(i, i)`
   - Selecting a seam heart maps to calling expansion on `(i, i + 1)`
   - `Pulse Outward` maps to the loop `while left >= 0 && right < n && s[left] === s[right]`
   - Growing one live mirror maps to `left -= 1; right += 1` after a successful pair
   - Keeping the best certified span maps to updating the global longest substring after each center expansion
   - `Transcribe Full Span` maps to recomputing a center from scratch instead of reusing the cheap local pair checks already exposed by the board
8. `why_greedy_fails`: The strongest wrong instinct is to trust the flashiest early odd palindrome and never inspect seam hearts. D1-D2 let direct transcription survive, but D3 introduces an even-length winner and D4-D5 add deeper off-center traps where only disciplined center checks can rule out every longer threat.
9. `aha_moment`: "The mirror lives at one heart. I only need to grow outward from that heart, then compare that finished span against the best heart so far."
10. `difficulty_progression`:
    - D1: One obvious odd heart teaches the pulse mechanic, and full transcription still fits.
    - D2: A longer odd winner still allows brute-force transcription, but pairwise expansion is visibly cheaper.
    - D3: The winning mirror sits on a seam, so odd-only intuition fails for the first time.
    - D4: Several deep hearts remain threatening until they are exhausted, so the player must use possible-length bounds instead of vibes.
    - D5: An early flashy odd mirror loses to a deeper even seam, and only patient center expansion reaches the crown in budget.
11. `predicted_failure_mode`: If the board does not make seam hearts feel as real as rune hearts, players will read the puzzle as odd-only mirror hunting and miss the transferable center-expansion lesson.
12. `acceptance_criteria`:
    - Winning play should be describable as "test each threatening rune or seam as a center and grow outward while the mirror holds."
    - Solver evaluation must keep `100%` solvability across the shipped ribbons.
    - Full-center transcription should still survive D1-D2 and break at `D3`.
    - Medium-plus ribbons should punish odd-only scanning with at least one even-length winner.
    - The kept bridge should claim Blind 75 `#5 Longest Palindromic Substring` directly and should not claim `#647` in this pass.
13. `predicted_scorecard`:
    - `skill_depth`: `0.55`
    - `counterintuitive_moves`: `2.4`
    - `algorithm_alignment`: `1.00`
    - `greedy_optimal_gap`: `0.36`
    - `difficulty_curve`: `D3`
    - `insight_inflection`: `D3`
14. `open_questions_for_engineering`:
    - Is the distinction between rune hearts and seam hearts legible on first read?
    - Does the threat count make the final crown condition feel earned instead of arbitrary?
    - Do players read `Transcribe Full Span` as a brute-force fallback rather than as the intended action loop?

## Implementation Packet

1. `version_id`: Heartspan v1
2. `algorithm_game_spec`: center-expansion ribbon with odd and even hearts, one-pair pulse growth, threat-based crowning, and a costly direct transcription fallback
3. `prototype_scope`: one `Heartspan` screen, five difficulty presets, rerollable ribbons, solver evaluation against full-center transcription and odd-only scanning, and a direct Blind 75 concept bridge for `#5`
4. `difficulty_scope`: D1-D2 keep full transcription alive, D3 introduces the first seam winner, and D4-D5 require exhausting multiple threatening hearts before the crown is safe
5. `non_goals`:
   - no shared claim on `#647 Palindromic Substrings` in this pass
   - no browser-recorded blind play session while sandboxed local playtest serving remains unavailable
   - no Manacher-style radius compression; this pass teaches center expansion directly
6. `predicted_scorecard`:
   - `solvability`: `1.00`
   - `skill_depth`: `0.55`
   - `counterintuitive_moves`: `2.4`
   - `algorithm_alignment`: `1.00`
   - `greedy_optimal_gap`: `0.36`

## Prototype Package

1. `game_entrypoint`: `src/games/Heartspan.tsx`
2. `difficulty_controls`: five difficulty chips plus center selection, `Pulse Outward`, `Transcribe Full Span`, `Crown Best Span`, `Reset Ribbon`, and `New Ribbon`
3. `changed_files`:
   - `src/solvers/Heartspan.solver.ts`
   - `src/games/Heartspan.tsx`
   - `src/games/index.ts`
   - `leetcode/specs/heartspan.md`
   - `leetcode/curriculum.md`
   - `leetcode/results.tsv`
   - `run-program.md`
4. `artifact_paths`:
   - `src/solvers/Heartspan.solver.ts`
   - `src/games/Heartspan.tsx`
   - `leetcode/specs/heartspan.md`
5. `actual_scorecard`:
   - `solvability`: `100%`
   - `skill_depth`: `74.4%`
   - `counterintuitive_moves`: `3.8`
   - `drama`: `0.75`
   - `decision_entropy`: `2.42`
   - `info_gain_ratio`: `4.27`
   - `algorithm_alignment`: `100%`
   - `leetCode_fit`: `100%`
   - `best_alternative_gap`: `74.4%`
   - `invariant_pressure`: `41.1%`
   - `difficulty_breakpoint`: `D3`
6. `known_issues`:
   - True browser blind playtesting is still blocked in this sandbox because the usual local interactive playtest path is unavailable.
   - The center grid grows dense on D4-D5, so later live testing should confirm that players still understand seam hearts without extra tutorial copy.

## Blind Play Report

- `rules_clarity`: In source-level blind review, the ribbon, threat count, and rune-versus-seam cards make the rules legible. The main remaining blind risk is whether seam hearts feel equally important before D3 proves it.
- `easy_strategy`: D1-D2 invite the lazy route of transcribing the loudest-looking center directly. That survives long enough to teach the board before becoming too expensive.
- `medium_strategy`: D3 is the real shift. The player has to treat a seam as a real heart and start trusting pairwise growth instead of full-center recounts.
- `hard_strategy`: D4-D5 demand two layers of discipline: grow one heart locally, then keep exhausting any other heart whose ceiling can still beat the current best span.
- `strategy_evolution`: The intended learning shift is from "look for a nice-looking palindrome" to "every palindrome candidate is local to one heart, so certify threatening hearts one at a time and keep the longest finished one."
- `plain_english_pattern`: "Pick a letter or gap as the center, grow outward while both sides match, and keep the longest center that finishes best."
- `naive_vs_optimal`: The strongest wrong strategy keeps retranscribing whole centers and over-trusts odd hearts. That feels fine early, then fails once a seam winner appears and the recount tax breaks budget.
- `confusion_points`: The remaining confusion point is whether the player sees the threat count as an upper-bound hint or as arbitrary gating. The center ceilings are doing crucial teaching work.
- `bug_summary`: No blocking implementation bugs surfaced during solver evaluation, `npx tsc --noEmit`, or `env CI=1 npx expo export --platform web`. Browser-based blind play remains outstanding because the sandbox does not expose the normal interactive path.
- `verdict`: keep

## Decision Memo

- `decision`: keep
- `why`: Heartspan teaches Blind 75 `#5 Longest Palindromic Substring` directly enough to justify a dedicated kept game. The shipped build keeps `100%` solvability, lands the intended `D3` breakpoint, preserves exact center-expansion alignment, and shows a large measured gap against full-center transcription.
- `evidence_used`: `node --input-type=module` evaluation from `src/solvers/Heartspan.solver.ts`, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`
- `bug_status`: no open implementation bugs
- `algorithm_alignment_judgment`: strong enough to claim Blind 75 `#5` directly because optimal play requires the real solution shape: test odd and even centers, expand outward while mirrored pairs match, and keep the longest finished span
- `next_action`: mark `#5 Longest Palindromic Substring` complete in the Blind 75 tracker and leave the next outer-loop pass for `#647 Palindromic Substrings`
- `polish_scope`: once interactive playtesting is available again, confirm that first-time players naturally respect seam hearts before D3 forces the issue

## Concept Bridge

This game teaches center expansion for `Longest Palindromic Substring`. For the Blind 75 tracker, the kept `Heartspan` game claims `#5 Longest Palindromic Substring`.

The moment where the player chooses a rune heart maps to expanding from `(i, i)`, and the moment where the player chooses a seam heart maps to expanding from `(i, i + 1)`. Each `Pulse Outward` step maps to checking `s[left] === s[right]` and then moving `left -= 1` and `right += 1`. The moment where the player crowns the best certified mirror maps to keeping the longest substring returned by any center expansion.
