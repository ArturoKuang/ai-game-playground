# Runepath

## Algorithm Game Spec

1. `game_name`: Runepath
2. `algorithm_target`: 2.3 DFS / Backtracking
3. `core_insight`: Keep one live word trail, step only into orthogonally adjacent matching letters, never reuse a tile on that same trail, and when a promising branch dies, peel back just one letter so the useful prefix stays alive while you try the next branch.
4. `one_line_pitch`: Prove whether a hidden script exists on the slate before the lantern budget burns out.
5. `rules`:
   - The archive reveals one target script and one letter slate.
   - A traced trail must follow the target script in order, one letter per step.
   - Each new step must land on an orthogonally adjacent tile.
   - A tile cannot be reused while it is on the current live trail.
   - `Backtrack` removes only the latest tile from the live trail and marks that dead branch as spent for the current prefix.
   - `Seal Trail` is legal only when the full script already appears on the live trail.
   - `Call Missing` is legal only after every opening and branch has been exhausted.
6. `core_actions`:
   - choose a valid opening tile for the first letter
   - extend the trail into an adjacent matching letter
   - keep the current prefix alive while trying alternate next letters
   - retreat one step when the branch cannot finish the script
   - prove presence or absence before the lantern budget runs out
7. `algorithm_to_mechanic_mapping`:
   - The live trail maps to the DFS recursion stack for the current prefix.
   - Highlighted next tiles map to the legal recursive neighbors whose letters match `word[index]`.
   - A tile glowing on the trail maps to `visited[row][col] = true` for the active recursion path.
   - `Backtrack` maps to unmarking the latest tile and returning to the parent frame so another neighbor can be tried.
   - Spent openings at the root map to trying each board cell as a fresh start for the word search.
   - `Call Missing` maps to returning `false` only after every legal start and branch has failed.
8. `why_greedy_fails`: The strongest near miss is full-reset search. It notices dead ends, but instead of peeling back one letter and preserving the still-useful prefix, it abandons the whole trail and repays the same opening letters from the root. Easy scripts tolerate that waste. Branch-heavy scripts do not.
9. `aha_moment`: "I do not need a brand-new start. I only need to remove the latest wrong letter and try the next branch from the same prefix."
10. `difficulty_progression`:
    - D1: Straightforward scripts make adjacency and one-use tiles legible.
    - D2: Repeated opening letters create the first real branch traps, so local backtracking starts paying for itself.
    - D3: One no-solution script forces the player to feel the full boolean proof instead of only tracing successes.
    - D4: Longer scripts push the player into repeated branch recovery from the same prefix.
    - D5: Dense repeated letters make root resets catastrophic, so only disciplined local unwinding fits the lantern budget.
11. `predicted_failure_mode`: If spent branches are not clearly tied to the current prefix, the game can read like freeform path tracing instead of a constrained DFS stack with visited-state discipline.
12. `acceptance_criteria`:
    - Winning play should be describable as "keep one live trail, try adjacent matches, and peel back one step when the branch dies."
    - At least one shipped route must require proving the script is absent rather than only tracing a present path.
    - Solver evaluation must keep `100%` solvability for the intended route set.
    - The post-game bridge must claim Blind 75 `#79 Word Search` directly and specifically.
13. `predicted_scorecard`:
    - `skill_depth`: `0.40`
    - `counterintuitive_moves`: `4.0`
    - `algorithm_alignment`: `1.00`
    - `greedy_optimal_gap`: `0.24`
    - `difficulty_curve`: `D2`
    - `insight_inflection`: `D2`
14. `open_questions_for_engineering`:
    - Does the board make the current trail and legal next steps readable enough without showing algorithm jargon?
    - Is the difference between a spent local branch and a globally absent script clear enough on the no-solution route?
    - Are root-spent openings visible enough that players understand why `Call Missing` eventually becomes legal?

## Implementation Packet

1. `version_id`: Runepath v1
2. `algorithm_game_spec`: grid script search with adjacent letter steps, one-use trail locking, explicit one-step backtracking, and a final presence-or-absence claim
3. `prototype_scope`: one `Runepath` screen, five difficulty presets, rerollable route sets, highlighted legal next letters, a spent-opening ledger, and solver evaluation against a full-reset baseline
4. `difficulty_scope`: D1 teaches the raw trail rules, D2-D5 increasingly punish root resets, and D3 includes an explicit no-solution proof route
5. `non_goals`:
   - no claim that this pass also covers trie-based `Word Search II`
   - no browser-recorded blind session inside this sandbox
   - no diagonal movement or tile reuse exceptions
6. `predicted_scorecard`:
   - `solvability`: `1.00`
   - `skill_depth`: `0.40`
   - `counterintuitive_moves`: `4.0`
   - `algorithm_alignment`: `1.00`
   - `greedy_optimal_gap`: `0.24`

## Prototype Package

1. `game_entrypoint`: `src/games/Runepath.tsx`
2. `difficulty_controls`: five difficulty chips plus `Reset` and `New Slate`
3. `changed_files`:
   - `src/solvers/Runepath.solver.ts`
   - `src/games/Runepath.tsx`
   - `src/games/index.ts`
   - `leetcode/specs/runepath.md`
   - `leetcode/results.tsv`
   - `run-program.md`
4. `artifact_paths`:
   - `src/solvers/Runepath.solver.ts`
   - `src/games/Runepath.tsx`
   - `leetcode/specs/runepath.md`
5. `actual_scorecard`:
   - `solvability`: `100%`
   - `skill_depth`: `49.3%`
   - `counterintuitive_moves`: `6.8`
   - `drama`: `0.20`
   - `decision_entropy`: `0.83`
   - `info_gain_ratio`: `1.28`
   - `algorithm_alignment`: `100%`
   - `leetCode_fit`: `100%`
   - `best_alternative_gap`: `24.0%`
   - `invariant_pressure`: `20.4%`
   - `difficulty_breakpoint`: `D2`
6. `known_issues`:
   - Live blind browser play was not run in this sandbox. The blind report below is based on solver evaluation, direct UI inspection, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`.
   - The decision space is intentionally narrow on many turns because Word Search is often "one good next step or backtrack." That keeps average decision entropy below `1.0`, but the meaningful tension comes from branch commitment and local unwinding rather than large menu breadth.

## Blind Play Report

- `rules_clarity`: The target script, highlighted next tiles, live trail, and spent-opening ledger make the objective legible. The main blind risk is whether players immediately trust that `Backtrack` is local repair rather than a soft reset button.
- `easy_strategy`: D1 should sound like "tap the next matching adjacent letter and do not step on the same tile twice." The straight scripts keep that readable.
- `medium_strategy`: D2 is where the intended shift should happen. Repeated opening letters create attractive wrong starts, so players who preserve the useful prefix should noticeably outperform players who restart from scratch.
- `hard_strategy`: D4-D5 demand the full rhythm: test an opening, follow matching neighbors, retreat one step when the branch dies, and keep paying only for genuinely new information.
- `strategy_evolution`: The expected shift is from "find another start" to "this prefix still matters, so only the newest letter should come off."
- `plain_english_pattern`: "Keep one live trail for the word. If the next matching neighbor does not work, remove only the last tile and try the next branch from there."
- `naive_vs_optimal`: The strongest wrong strategy is full-reset search. It understands dead ends but discards too much paid-for prefix work, so medium-plus scripts run out of lantern budget.
- `confusion_points`: The absent-script route is the biggest teaching risk because players must believe that exhausted openings are meaningful evidence instead of merely previous mistakes.
- `bug_summary`: No blocking implementation bugs surfaced during solver evaluation, typecheck, direct UI inspection, or web export.
- `verdict`: keep

## Decision Memo

- `decision`: keep
- `why`: Runepath teaches Blind 75 `#79 Word Search` directly enough to justify a dedicated kept game rather than stretching `Stillpath`, whose reuse-and-forward-order shelf logic is a different backtracking shape. The kept build hit `100%` solvability, `100%` LeetCode fit, `49.3%` skill depth, and a clean `D2` breakpoint where full resets stop surviving.
- `evidence_used`: `node --experimental-strip-types --input-type=module` evaluation from `src/solvers/Runepath.solver.ts`, direct UI inspection, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`
- `bug_status`: no open implementation bugs
- `algorithm_alignment_judgment`: strong enough to claim Blind 75 `#79 Word Search` directly
- `next_action`: mark `#79` complete in the Blind 75 tracker and leave the next outer-loop pass for `#208 Implement Trie (Prefix Tree)`
- `polish_scope`: if browser-capable blind play becomes available later, confirm that first-time players infer local backtracking from the spent-opening ledger before they fall into whole-board restart habits

## Concept Bridge

This game teaches grid DFS/backtracking with visited-state discipline. For the Blind 75 tracker, the kept `Runepath` game claims `#79 Word Search`.

The moment where a dead branch removes only the latest rune maps to unwinding one recursion frame and clearing the latest `visited[row][col]` mark before trying the next neighbor. The moment where every spent opening at the root eventually makes `Call Missing` legal maps to the outer loop that tries each board cell as a possible start before returning `false`.
