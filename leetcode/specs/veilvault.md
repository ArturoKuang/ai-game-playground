# Veilvault

## Algorithm Game Spec

1. `game_name`: Veilvault
2. `algorithm_target`: 2.4a Trie / Wildcard Branch Search
3. `core_insight`: Shared openings should still be carved once, but a veiled letter is not one guess. It means "open each child branch from here until one full sealed word survives, and peel back only to the latest veil when a branch dies."
4. `one_line_pitch`: Run an archive vault that files words through shared stems, then settles veiled warrants by opening one wildcard branch at a time before the lamp budget runs out.
5. `rules`:
   - The vault starts at one root gate with no carved stems.
   - `File word` orders trace the word from the root, one letter at a time.
   - If the next needed letter is already carved from the current resting point, `Follow Stem` reuses it.
   - If the next needed letter is missing during a filing order, `Carve Stem` creates exactly that next branch.
   - `Seal Word` is legal only on the final letter of the current filing order.
   - `Veil warrant` treats each `?` rune as any single letter, but only one child branch may be opened per action.
   - When a veiled branch later fails, `Backtrack Veil` reopens only the latest veil checkpoint that still has an untried child branch.
   - `Claim Missing` is legal only after the current path fails and every open veil checkpoint is exhausted.
6. `core_actions`:
   - reuse an existing shared opening stem
   - carve exactly one new branch when the next filing letter is absent
   - seal only true finished words
   - choose one child branch for the current veiled rune
   - backtrack only to the latest still-live veil checkpoint
   - claim absence only after every viable veil branch has been tested
7. `algorithm_to_mechanic_mapping`:
   - The root gate maps to `root`.
   - Each carved letter branch maps to `children[char]`.
   - `Seal Word` maps to the terminal `isEnd` flag on a node.
   - A veiled `?` warrant maps to the wildcard `.` in `search(word)`.
   - Opening one child branch for a veil maps to iterating one trie child inside DFS.
   - `Backtrack Veil` maps to returning from a failed recursive wildcard branch and trying the next child.
   - `Claim Missing` after every veil is exhausted maps to returning `false` only after all wildcard children fail.
8. `why_greedy_fails`: The strongest near miss is the first-branch chase. It trusts the earliest available child under a veil and refuses to reopen sibling branches. That can answer early routes, but medium-plus warrants require exploring another child after the first sealed-looking branch collapses, so the one-guess policy becomes incorrect.
9. `aha_moment`: "The wildcard is not one lucky guess. It is a checkpoint where I may need to try several child stems, and I should only rewind to that checkpoint instead of rebuilding the whole path."
10. `difficulty_progression`:
    - D1: one easy veil introduces the wildcard mark and a false one-letter claim
    - D2: the first wrong wildcard branch reaches a live stem but the wrong seal, forcing one-layer backtracking
    - D3: several sibling branches share one opening, so success and failure warrants both demand disciplined checkpoint use
    - D4: nested veils punish whole-route restarts and reward reopening only the newest still-useful checkpoint
    - D5: dense mixed roots and deep veils make trie reuse plus local wildcard DFS decisively better than flat rescans
11. `predicted_failure_mode`: If the wildcard checkpoints are not legible, the player may either treat `?` as random guessing or overlearn the basic trie filing from Stemvault without internalizing why wildcard search needs branching and local unwind.
12. `acceptance_criteria`:
    - Winning play should be describable as "reuse the shared stem, open one wildcard branch, and backtrack only to the latest veil that still has another option."
    - At least one shipped route must punish claiming missing before all veil branches are exhausted.
    - Solver evaluation must keep `100%` solvability.
    - The post-game bridge must claim Blind 75 `#211 Design Add and Search Words Data Structure` directly and only.
13. `predicted_scorecard`:
    - `skill_depth`: `0.36`
    - `counterintuitive_moves`: `9.0`
    - `algorithm_alignment`: `1.00`
    - `greedy_optimal_gap`: `0.35`
    - `difficulty_curve`: `D3`
    - `insight_inflection`: `D3`
14. `open_questions_for_engineering`:
    - Does the veil-checkpoint panel make local backtracking feel necessary instead of fussy?
    - Do the easy routes preserve the terminal-word seal lesson from Stemvault without swallowing the new wildcard branch lesson?
    - Is the strongest wrong strategy clearly "first branch only" rather than random clicking?

## Implementation Packet

1. `version_id`: Veilvault v1
2. `algorithm_game_spec`: shared-stem archive with insert plus wildcard-search warrants where each `?` opens one child branch and failed branches rewind only to the latest live veil
3. `prototype_scope`: one `Veilvault` screen, five difficulty presets, a visible node-by-depth vault map, sealed-word ledger, live veil-checkpoint panel, mixed filing and wildcard warrant queue, and solver evaluation against a flat shelf-scan baseline
4. `difficulty_scope`: D1 introduces the veil mark, D2 establishes one-layer backtracking, D3 is the first strong payoff for disciplined wildcard branching, and D4-D5 scale nested and multi-root wildcard pressure
5. `non_goals`:
   - no claim that this pass also covers trie-plus-board search for `#212 Word Search II`
   - no delete operation or other dictionary maintenance beyond `addWord`
   - no browser-recorded blind session inside this sandbox
6. `predicted_scorecard`:
   - `solvability`: `1.00`
   - `skill_depth`: `0.36`
   - `counterintuitive_moves`: `9.0`
   - `algorithm_alignment`: `1.00`
   - `greedy_optimal_gap`: `0.35`

## Prototype Package

1. `game_entrypoint`: `src/games/Veilvault.tsx`
2. `difficulty_controls`: five difficulty chips plus `Reset`
3. `changed_files`:
   - `src/solvers/Veilvault.solver.ts`
   - `src/games/Veilvault.tsx`
   - `src/games/index.ts`
   - `leetcode/specs/veilvault.md`
   - `leetcode/curriculum.md`
   - `leetcode/results.tsv`
   - `run-program.md`
4. `artifact_paths`:
   - `src/solvers/Veilvault.solver.ts`
   - `src/games/Veilvault.tsx`
   - `leetcode/specs/veilvault.md`
5. `actual_scorecard`:
   - `solvability`: `100%`
   - `skill_depth`: `40.8%`
   - `counterintuitive_moves`: `7.8`
   - `drama`: `0.75`
   - `decision_entropy`: `1.74`
   - `info_gain_ratio`: `1.71`
   - `algorithm_alignment`: `100%`
   - `leetCode_fit`: `100%`
   - `best_alternative_gap`: `40.8%`
   - `invariant_pressure`: `70.5%`
   - `difficulty_breakpoint`: `D3`
6. `known_issues`:
   - Live blind browser play was not run in this sandbox. The blind report below is based on solver evaluation, direct UI inspection, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`.
   - The action space is intentionally compact between veils. The learning pressure comes from choosing wildcard branches and exhausting them correctly, not from broad freeform movement every turn.

## Blind Play Report

- `rules_clarity`: The queue, vault map, and veil-checkpoint panel make the archive job legible. The main blind risk is whether first-time players understand that `Backtrack Veil` should reopen only the latest relevant checkpoint instead of acting like a global undo.
- `easy_strategy`: D1 should read as "reuse carved stems, and treat `?` like one missing letter that can be any child branch."
- `medium_strategy`: D2-D3 should shift the player from "pick the first possible wildcard branch" to "keep a checkpoint at each veil and reopen only that checkpoint if the branch fails later."
- `hard_strategy`: D4-D5 demand the full pattern: reuse shared stems for filing, branch deliberately on each veil, and claim missing only after every viable wildcard branch is spent.
- `strategy_evolution`: The expected shift is from "a wildcard is one guess" to "a wildcard is a branching checkpoint that may need multiple tries before I can certify the warrant."
- `plain_english_pattern`: "Store the openings once, then when a hidden letter appears, test one branch at a time and back up only to that hidden-letter fork until one full word works."
- `naive_vs_optimal`: The strongest wrong strategy is the first-branch chase or flat shelf scan. Both can survive easy routes, but medium-plus routes either fail correctness or repay the same prefix work over and over.
- `confusion_points`: False warrants where one branch reaches a live stem but not a sealed word are the key teaching risk because they look almost correct until the player learns to reopen the last veil.
- `bug_summary`: No blocking implementation bugs surfaced during solver evaluation, direct UI inspection, typecheck, or web export.
- `verdict`: keep

## Decision Memo

- `decision`: keep
- `why`: Veilvault teaches Blind 75 `#211 Design Add and Search Words Data Structure` directly enough to justify a dedicated kept game. The kept build preserves add-word stem reuse from the earlier trie work, then adds the missing wildcard lesson: one `?` opens a DFS over child branches, and failure should rewind only to the latest live wildcard checkpoint. The shipped evaluation kept `100%` solvability, `40.8%` skill depth, `100%` LeetCode fit, and a clean `D3` breakpoint where local wildcard backtracking becomes necessary.
- `evidence_used`: `node --experimental-strip-types --input-type=module` evaluation from `src/solvers/Veilvault.solver.ts`, direct UI inspection, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`
- `bug_status`: no open implementation bugs
- `algorithm_alignment_judgment`: strong enough to claim Blind 75 `#211` directly because the optimal play now includes both trie reuse and wildcard child-branch DFS with local backtracking
- `next_action`: mark `#211` complete in the Blind 75 tracker and leave the next outer-loop pass for `#212 Word Search II`
- `polish_scope`: if browser-capable blind play becomes available later, confirm that first-time players use the veil-checkpoint panel to backtrack locally instead of treating it as a generic undo stack

## Concept Bridge

This game teaches trie-backed wildcard branch search. For the Blind 75 tracker, the kept `Veilvault` game claims `#211 Design Add and Search Words Data Structure`.

The moment where a veiled rune opens one child branch, then reopens only that checkpoint if the later path dies, maps to the recursive `search` helper that iterates every child when the query contains `.` and returns true as soon as one branch succeeds. The moment where a missing claim stays illegal until every open veil is exhausted maps to returning `false` only after all wildcard children have been tried.
