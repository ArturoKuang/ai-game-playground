# Pulseledger

## Algorithm Game Spec

1. `game_name`: Pulseledger
2. `algorithm_target`: 3.1a Palindrome Center Expansion
3. `core_insight`: Counting palindromic substrings is not about finding one best mirror. Every rune and every seam is a separate heart, and each successful outward layer around that heart adds exactly one more palindrome to the final tally.
4. `one_line_pitch`: Audit a ribbon of runes by harvesting every mirror layer from each heart before brute-force recounts blow the census clock.
5. `rules`:
   - Every rune already contributes one one-rune palindrome to the ledger.
   - Every rune center and every seam between adjacent runes is a legal palindrome heart that may still hide wider mirrors.
   - `Pulse Outward` checks only the next mirrored pair around the selected heart for `1` action.
   - If that pair matches, the selected heart banks exactly one more palindrome and grows by `2`; if it breaks, that heart is exhausted.
   - `Transcribe Center` recounts the whole selected heart from scratch at a large fixed cost and banks every remaining palindrome on that heart at once.
   - The player may seal the ledger only after every live center is exhausted and every hidden mirror has been counted.
6. `core_actions`:
   - select any rune heart or seam heart
   - pulse the next mirrored pair outward
   - transcribe one full heart directly at brute-force cost
   - watch the global ledger count rise
   - seal the ledger once no live center remains
7. `algorithm_to_mechanic_mapping`:
   - Auto-banked rune singles map to each odd center contributing `1` before wider expansion begins.
   - Selecting a rune heart maps to expanding from `(i, i)`.
   - Selecting a seam heart maps to expanding from `(i, i + 1)`.
   - `Pulse Outward` maps to one iteration of `while left >= 0 && right < n && s[left] === s[right]`.
   - Each successful pulse maps to incrementing the palindrome counter by `1` for the newly certified substring.
   - `Transcribe Center` maps to brute-force center recounting from scratch instead of preserving the cheap local expansion loop.
   - `Seal Ledger` maps to returning the final count only after every center has contributed all of its valid expansions.
8. `why_greedy_fails`: The strongest wrong instinct is to bank only the flashiest longest mirror at each heart. D2 proves that one heart can yield several nested palindromes, and D3 introduces seam-only mirrors so odd-only counting undercounts the ledger even when the player spots a dramatic long span.
9. `aha_moment`: "A bigger palindrome is not replacing the smaller one at the same heart. It is one more entry in the ledger, and every heart has to be expanded on its own."
10. `difficulty_progression`:
    - D1: One obvious odd heart adds one wider mirror and makes the base rune count legible.
    - D2: One heart yields several nested odd mirrors, so longest-only counting fails for the first time.
    - D3: A seam heart becomes necessary, so odd-only counting breaks.
    - D4: Several hearts contribute nested mirrors, forcing disciplined local harvesting instead of vibe-based recounts.
    - D5: Deep odd and even hearts both matter, and only systematic center expansion finishes before the budget runs out.
11. `predicted_failure_mode`: If the board reads like "find the biggest mirror again," players will carry over the `Heartspan` lesson and miss that every successful layer is its own counted substring.
12. `acceptance_criteria`:
    - Winning play should be describable as "for every rune and seam, keep expanding while the mirror holds, and add one to the tally for each successful layer."
    - Solver evaluation must keep `100%` solvability across the shipped ribbons.
    - Full-center transcription should survive D1-D2 and break at `D3`.
    - Medium-plus ribbons should punish longest-only counting with nested mirrors at a single heart.
    - Medium-plus ribbons should punish odd-only counting with at least one seam-only mirror.
    - The kept bridge should claim Blind 75 `#647 Palindromic Substrings` directly and should not replace `Heartspan`'s dedicated claim on `#5`.
13. `predicted_scorecard`:
    - `skill_depth`: `0.55`
    - `counterintuitive_moves`: `2.8`
    - `algorithm_alignment`: `1.00`
    - `greedy_optimal_gap`: `0.42`
    - `difficulty_curve`: `D3`
    - `insight_inflection`: `D3`
14. `open_questions_for_engineering`:
    - Does the auto-banked single-rune baseline feel intuitive instead of hidden?
    - Does the ledger framing clearly distinguish "count every layer" from "keep one longest span"?
    - Are seam hearts legible enough before D3 forces them?

## Implementation Packet

1. `version_id`: Pulseledger v1
2. `algorithm_game_spec`: palindrome-count ledger with auto-banked rune singles, rune and seam hearts, one-pair pulse growth, and a costly full-center recount fallback
3. `prototype_scope`: one `Pulseledger` screen, five difficulty presets, rerollable ribbons, solver evaluation against full-center transcription and weaker counting baselines, and a direct Blind 75 concept bridge for `#647`
4. `difficulty_scope`: D1-D2 keep full-center transcription alive, D3 introduces the first seam-only count trap, and D4-D5 require counting nested layers from several hearts before sealing the ledger
5. `non_goals`:
   - no shared claim on `#5 Longest Palindromic Substring`; `Heartspan` remains the dedicated kept game there
   - no browser-recorded blind play session while sandboxed local playtest serving remains unavailable
   - no Manacher compression; this pass teaches plain center expansion directly
6. `predicted_scorecard`:
   - `solvability`: `1.00`
   - `skill_depth`: `0.55`
   - `counterintuitive_moves`: `2.8`
   - `algorithm_alignment`: `1.00`
   - `greedy_optimal_gap`: `0.42`

## Prototype Package

1. `game_entrypoint`: `src/games/Pulseledger.tsx`
2. `difficulty_controls`: five difficulty chips plus center selection, `Pulse Outward`, `Transcribe Center`, `Seal Ledger`, `Reset Ribbon`, and `New Ribbon`
3. `changed_files`:
   - `src/solvers/Pulseledger.solver.ts`
   - `src/games/Pulseledger.tsx`
   - `src/games/index.ts`
   - `leetcode/specs/pulseledger.md`
   - `leetcode/results.tsv`
   - `run-program.md`
4. `artifact_paths`:
   - `src/solvers/Pulseledger.solver.ts`
   - `src/games/Pulseledger.tsx`
   - `leetcode/specs/pulseledger.md`
5. `actual_scorecard`:
   - `solvability`: `100%`
   - `skill_depth`: `49.8%`
   - `counterintuitive_moves`: `2.2`
   - `drama`: `0.76`
   - `decision_entropy`: `1.98`
   - `info_gain_ratio`: `2.09`
   - `algorithm_alignment`: `100%`
   - `leetCode_fit`: `100%`
   - `best_alternative_gap`: `49.8%`
   - `invariant_pressure`: `17.1%`
   - `difficulty_breakpoint`: `D3`
6. `known_issues`:
   - True browser blind playtesting is still blocked in this sandbox because the normal interactive playtest path is unavailable.
   - Later live testing should confirm that the auto-banked single-rune baseline feels natural rather than hidden.

## Blind Play Report

- `rules_clarity`: In source-level blind review, the ledger framing, pending mirror count, and rune-versus-seam cards make the task legible. The biggest remaining blind risk is whether players immediately understand that single runes are pre-counted.
- `easy_strategy`: D1 invites the player to pulse the obvious middle heart and notice that one wider mirror adds one more ledger entry instead of replacing the smaller one.
- `medium_strategy`: D2 shifts the player from "find the biggest mirror" to "one heart can pay out several mirrors." D3 then forces seam hearts into the tally.
- `hard_strategy`: D4-D5 demand disciplined center-by-center harvesting. The player has to settle every live center because any one of them may still hide more counted mirrors.
- `strategy_evolution`: The intended learning shift is from "pick the nicest palindrome" to "every successful layer on every heart is one counted substring, so finish each heart locally and sum them all."
- `plain_english_pattern`: "Start from each letter or gap, grow outward while both sides still match, and add one to the running total every time that growth succeeds."
- `naive_vs_optimal`: The strongest wrong strategies either transcribe full centers from scratch or count only the longest-looking mirror at each heart. Both waste budget or undercount once nested mirrors and seam hearts appear.
- `confusion_points`: Players may initially assume a larger mirror replaces the smaller one at the same heart. The ledger needs to make it obvious that both remain counted.
- `bug_summary`: No blocking implementation bugs surfaced during compiled solver evaluation, `npx tsc --noEmit`, or `env CI=1 npx expo export --platform web`. Browser-based blind play remains outstanding because the sandbox does not expose the normal interactive path.
- `verdict`: keep

## Decision Memo

- `decision`: keep
- `why`: Pulseledger teaches Blind 75 `#647 Palindromic Substrings` directly enough to justify a dedicated kept game. The shipped build keeps `100%` solvability, preserves exact center-expansion counting alignment, breaks full-center recounting at `D3`, and clearly separates count-all play from `Heartspan`'s keep-the-best-span objective.
- `evidence_used`: compiled solver evaluation from `src/solvers/Pulseledger.solver.ts`, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`
- `bug_status`: no open implementation bugs
- `algorithm_alignment_judgment`: strong enough to claim Blind 75 `#647` directly because optimal play requires the real count loop shape: treat every odd and even center independently, expand outward while mirrored pairs match, and increment the global tally once per successful layer
- `next_action`: mark `#647 Palindromic Substrings` complete in the Blind 75 tracker and leave the next outer-loop pass for `#91 Decode Ways`
- `polish_scope`: once interactive playtesting is available again, verify that first-time players naturally distinguish "count every layer" from "keep the best span"

## Concept Bridge

This game teaches center expansion for `Palindromic Substrings`. For the Blind 75 tracker, the kept `Pulseledger` game claims `#647 Palindromic Substrings`.

The moment where every rune begins already banked maps to each odd center contributing the single-character palindrome. The moment where the player chooses a rune heart maps to expanding from `(i, i)`, and the moment where the player chooses a seam heart maps to expanding from `(i, i + 1)`. Each `Pulse Outward` step maps to checking `s[left] === s[right]`, then moving `left -= 1` and `right += 1`, and incrementing the total count by `1` for the newly certified palindrome.
