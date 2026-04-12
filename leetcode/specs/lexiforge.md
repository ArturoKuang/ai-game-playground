# Lexiforge

## Algorithm Game Spec

1. `game_name`: Lexiforge
2. `algorithm_target`: 3.3 Topological Sort
3. `core_insight`: Do not invent alien letter rules from the whole shelf at once. Compare each adjacent word pair, stop at the first differing rune to forge one precedence edge, reject any longer word that comes before its own prefix, then peel the zero-seal rune rail until the alphabet finishes or the rail proves a cycle.
4. `one_line_pitch`: Read a sorted alien shelf, forge one rune rule from each neighboring split, and peel the zero-seal rail into a valid alphabet.
5. `rules`:
   - Only adjacent words on the shelf may be compared.
   - Each adjacent pair yields at most one rune rule: the first differing rune decides it.
   - If one word is only a shorter prefix of the next, that pair adds no rune rule.
   - If a longer word appears before its own prefix, the shelf is invalid immediately.
   - After every shelf pair is read, only zero-seal runes may be placed on the ready rail.
   - Placing a ready rune removes one incoming seal from every rune that depended on it.
   - `Declare Invalid` is correct only when a longer-before-prefix breach has been exposed.
   - `Call Cycle` is correct only when every shelf pair is read, the ready rail is empty, and runes still remain.
   - `Seal Alphabet` is correct only when every rune has been placed.
6. `core_actions`:
   - inspect one adjacent word pair
   - stop at the first split and forge one rune rule
   - recognize when a shared-prefix pair adds no rule
   - declare the shelf invalid if a longer word stands before its prefix
   - place one ready zero-seal rune
   - peel outgoing seals from dependent runes
   - call a cycle if the ready rail dries up too early
7. `algorithm_to_mechanic_mapping`:
   - Each shelf word maps to one input string in sorted alien order.
   - Inspecting neighboring words maps to the adjacent-word comparison loop.
   - The first split in a pair maps to the first differing character that creates one directed edge.
   - A shared-prefix pair with no split maps to the "no edge, continue" case.
   - `Declare Invalid` maps to the longer-word-before-prefix rejection case.
   - The rune ledger maps to the discovered graph edges between alien letters.
   - The ready rail maps to the queue of zero-indegree letters in Kahn's algorithm.
   - Placing a ready rune maps to popping one zero-indegree node and decrementing indegrees on outgoing edges.
   - `Call Cycle` maps to the empty-queue proof that remaining letters are cyclic.
8. `why_greedy_fails`: The strongest near miss compares the right adjacent pairs but records every differing position as a rule and forgets the prefix-breach rejection. That shortcut survives the gentle shelf, but D2 and D5 turn the extra late-position mismatches into false edges, while D3 proves that no amount of rune peeling can rescue a longer word before its own prefix.
9. `aha_moment`: "I only get one clue per neighboring pair, and it is the first place they split. After that I can just peel every letter whose blockers are gone."
10. `difficulty_progression`:
    - D1: A short prefix pair introduces the idea that some adjacent comparisons add no new edge.
    - D2: Buried late mismatches punish players who keep reading past the first split.
    - D3: A prefix breach teaches that some shelves are invalid before topological peeling starts.
    - D4: The ready rail empties early, proving the discovered rune rules loop.
    - D5: Several ready rune families coexist, so the player must trust the whole zero-seal frontier instead of one vivid chain.
11. `predicted_failure_mode`: If the shelf comparison step is not explicit enough, players will either read too far into one pair or treat prefix cases as harmless no-edge pairs.
12. `acceptance_criteria`:
    - Winning play should be describable as "read adjacent pairs, stop at the first split, reject prefix breaches, then peel zero-seal runes."
    - Solver evaluation must keep `100%` solvability across the shipped shelves.
    - The strongest near miss should fail once later-position mismatches and prefix breaches matter.
    - The kept bridge should claim Blind 75 `#269 Alien Dictionary` directly and only.
13. `predicted_scorecard`:
    - `skill_depth`: `0.46`
    - `counterintuitive_moves`: `3.0`
    - `algorithm_alignment`: `1.00`
    - `greedy_optimal_gap`: `0.42`
    - `difficulty_curve`: `D2`
    - `insight_inflection`: `D2`
14. `open_questions_for_engineering`:
    - Is the "first split only" rule legible enough when long shared prefixes make later mismatches visually tempting?
    - Does the invalid-prefix state feel like a proof step instead of a generic fail state?
    - Is the zero-seal rune rail obvious enough once several unconstrained runes are ready at once?

## Implementation Packet

1. `version_id`: Lexiforge v1
2. `algorithm_game_spec`: adjacent alien-word comparison with first-split-only edge discovery, explicit prefix-breach rejection, and rune-order peeling through a zero-seal rail
3. `prototype_scope`: one `Lexiforge` screen, five difficulty presets, fixed alien shelves, solver evaluation against an all-differences near miss, and a direct Blind 75 concept bridge
4. `difficulty_scope`: D1 teaches no-edge prefix pairs, D2 introduces buried late mismatches, D3 introduces prefix invalidity, D4 proves a cycle from an empty rail, and D5 mixes many simultaneous ready rune families with misleading late mismatches
5. `non_goals`:
   - no claim that this pass also covers `#207 Course Schedule`; that bridge remains owned by `Syllabind`
   - no browser-recorded blind session inside this sandbox
   - no player-facing jargon about indegrees, DAGs, or topological sort during play
6. `predicted_scorecard`:
   - `solvability`: `1.00`
   - `skill_depth`: `0.46`
   - `counterintuitive_moves`: `3.0`
   - `algorithm_alignment`: `1.00`
   - `greedy_optimal_gap`: `0.42`

## Prototype Package

1. `game_entrypoint`: `src/games/Lexiforge.tsx`
2. `difficulty_controls`: five difficulty chips plus per-pair `Inspect` actions, ready-rune `Place` actions, `Declare Invalid`, `Call Cycle`, `Seal Alphabet`, `Reset Shelf`, and `New Shelf`
3. `changed_files`:
   - `src/solvers/Lexiforge.solver.ts`
   - `src/games/Lexiforge.tsx`
   - `src/games/index.ts`
   - `leetcode/specs/lexiforge.md`
   - `leetcode/results.tsv`
   - `run-program.md`
4. `artifact_paths`:
   - `src/solvers/Lexiforge.solver.ts`
   - `src/games/Lexiforge.tsx`
   - `leetcode/specs/lexiforge.md`
5. `actual_scorecard`:
   - `solvability`: `100%`
   - `skill_depth`: `76.6%`
   - `counterintuitive_moves`: `4.2`
   - `drama`: `0.74`
   - `decision_entropy`: `1.44`
   - `info_gain_ratio`: `1.55`
   - `algorithm_alignment`: `100%`
   - `leetCode_fit`: `100%`
   - `best_alternative_gap`: `60.0%`
   - `invariant_pressure`: `97.0%`
   - `difficulty_breakpoint`: `D2`
6. `known_issues`:
   - Live blind browser play was not run in this sandbox. The blind report below is based on solver evaluation, direct UI inspection, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`.
   - D1 and D4 still allow the strongest alternative to survive. The real teaching separation happens once buried late splits or prefix breaches matter.

## Blind Play Report

- `rules_clarity`: The shelf pairs, rule ledger, and rune rail make the two phases readable. The main blind risk is whether players stop at the first split or keep mentally harvesting later mismatches from the same pair.
- `easy_strategy`: D1 should read as "compare the next neighboring pair, add a rule only if they actually split, then place the only ready rune."
- `medium_strategy`: D2-D3 should force the real transfer. The player has to stop at the first split, ignore later mismatches, and recognize that a longer word before its own prefix ends the puzzle immediately.
- `hard_strategy`: D4-D5 require the full graph view. The player must trust the complete zero-seal rail after all shelf clues are forged, not one locally vivid rune chain.
- `strategy_evolution`: The expected shift is from "read every mismatch I can see" to "extract one edge per adjacent pair, then peel zero-indegree runes."
- `plain_english_pattern`: "Check each neighboring pair, take only the first place they differ, reject a word that comes before its own prefix, then keep placing any rune that no other rune still blocks."
- `naive_vs_optimal`: The strongest wrong strategy is all-differences harvesting. It invents extra edges from later mismatches and misses the dedicated prefix-breach rejection.
- `confusion_points`: The most fragile teaching point is the invalid-prefix action. It has to read like a proof about the shelf order, not like a panic button.
- `bug_summary`: No blocking implementation bugs surfaced during solver evaluation, `npx tsc --noEmit`, or `env CI=1 npx expo export --platform web`.
- `verdict`: keep

## Decision Memo

- `decision`: keep
- `why`: Lexiforge teaches Blind 75 `#269 Alien Dictionary` directly enough to justify a dedicated kept game. The build keeps `100%` solvability, reaches `100%` algorithm alignment and LeetCode fit, and records a `60.0%` strongest-alternative gap once players must stop at the first split and reject prefix breaches instead of over-harvesting mismatches.
- `evidence_used`: `node --experimental-strip-types --input-type=module` evaluation from `src/solvers/Lexiforge.solver.ts`, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`
- `bug_status`: no open implementation bugs
- `algorithm_alignment_judgment`: strong enough to claim Blind 75 `#269` directly because optimal play requires the actual solution shape: adjacent-word edge discovery with a first-difference stop, explicit longer-before-prefix rejection, and zero-indegree peeling over the discovered rune graph
- `next_action`: mark `#269 Alien Dictionary` complete in the Blind 75 tracker, then move the next outer-loop pass to `#70 Climbing Stairs`
- `polish_scope`: when a browser-capable blind play environment is available, confirm that first-time players stop at the first split without post-hoc prompting

## Concept Bridge

This game teaches Alien Dictionary through adjacent shelf comparison plus zero-indegree rune peeling. For the Blind 75 tracker, the kept `Lexiforge` game claims `#269 Alien Dictionary`.

The moment where one neighboring word pair yields exactly one rune rule maps to the adjacent-word loop that stops at the first differing character. The moment where a longer word before its own prefix is rejected maps to the invalid-prefix guard clause. The moment where the ready rail holds every zero-seal rune maps to Kahn's queue of zero-indegree letters, and peeling that rail into an alphabet maps to producing the alien letter order or proving that the remaining rune rules cycle.
