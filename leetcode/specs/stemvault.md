# Stemvault

## Algorithm Game Spec

1. `game_name`: Stemvault
2. `algorithm_target`: 2.4 Trie
3. `core_insight`: Shared beginnings should be carved once and reused. A finished word needs its own end seal, but a stem warrant succeeds as soon as the whole path exists.
4. `one_line_pitch`: Run an archive vault that files word orders through shared stems, then settles word and stem warrants before the lamp budget runs out.
5. `rules`:
   - The vault starts at one root gate with no carved stems.
   - `File word` orders must trace the word from the root, one letter at a time.
   - If the next needed letter is already carved from the current resting point, `Follow Stem` reuses it.
   - If the next needed letter is missing, `Carve Stem` creates exactly that next branch.
   - `Seal Word` is legal only on the final letter of the current filing order.
   - `Word warrant` succeeds only if the whole trail exists and the resting point is sealed as a finished word.
   - `Stem warrant` succeeds as soon as the whole trail exists, even if that resting point is not a finished word.
   - If a needed next letter has no carved branch, `Claim Missing` is immediately legal.
6. `core_actions`:
   - reuse an existing shared opening stem
   - carve exactly one new branch when the next letter is absent
   - seal only true finished words
   - distinguish an existing stem from a stored complete word
   - settle missing warrants the moment a dead branch is exposed
7. `algorithm_to_mechanic_mapping`:
   - The root gate maps to `root`.
   - Each carved letter branch maps to `children[char]`.
   - Reusing a shared opening stem maps to traversing an existing child pointer instead of rebuilding the prefix.
   - `Seal Word` maps to setting the terminal flag on the current node.
   - `Word warrant` maps to `search(word)`.
   - `Stem warrant` maps to `startsWith(prefix)`.
   - `Claim Missing` from a dead branch maps to returning `false` the first time a needed child pointer is absent.
8. `why_greedy_fails`: The strongest near miss is the loose shelf policy. It keeps whole words in a flat list and rescans them one warrant at a time. That can still answer easy orders, but medium-plus queues repay the same shared prefix work repeatedly and lose badly to one carved stem map.
9. `aha_moment`: "I do not need a fresh copy of every opening. I need one shared path for the opening letters, and only the endings decide whether I have a full word or just a stem."
10. `difficulty_progression`:
    - D1: two short filings share one opening and introduce the difference between a stem and a finished word
    - D2: one word continues through another, so the end seal becomes non-optional
    - D3: several words reuse the same opening corridor and mixed warrants start punishing loose shelf rescans
    - D4: one trunk fans into multiple endings, forcing faster branch trust and exact-vs-stem discipline
    - D5: dense shared openings and long mixed warrants make the archive map decisively better than line-by-line shelf work
11. `predicted_failure_mode`: If the vault does not make the shared opening corridor visually legible, the player may experience the puzzle as generic word bookkeeping instead of a reusable branching structure with terminal-state discipline.
12. `acceptance_criteria`:
    - Winning play should be describable as "reuse the same opening stem, carve only missing branches, and seal only true word endings."
    - At least one shipped route must punish confusing a live stem with a finished word.
    - Solver evaluation must keep `100%` solvability.
    - The post-game bridge must claim Blind 75 `#208 Implement Trie (Prefix Tree)` directly and only.
13. `predicted_scorecard`:
    - `skill_depth`: `0.34`
    - `counterintuitive_moves`: `8.0`
    - `algorithm_alignment`: `1.00`
    - `greedy_optimal_gap`: `0.30`
    - `difficulty_curve`: `D3`
    - `insight_inflection`: `D3`
14. `open_questions_for_engineering`:
    - Does the vault map make shared openings feel like one reusable path rather than several separate words?
    - Is the difference between a finished word seal and a mere live stem obvious enough on the early false search routes?
    - Do mixed word and stem warrants create enough pressure to justify the structure without turning the screen into admin work?

## Implementation Packet

1. `version_id`: Stemvault v1
2. `algorithm_game_spec`: shared-stem archive with insert, exact-word warrant, and stem-warrant flows on one visible branching vault
3. `prototype_scope`: one `Stemvault` screen, five difficulty presets, a visible node-by-depth vault map, sealed-word ledger, mixed filing and warrant queue, and solver evaluation against a flat shelf-scan baseline
4. `difficulty_scope`: D1-D2 establish the stem-versus-word distinction, D3 is the first strong payoff for shared stems, and D4-D5 scale the branching and query pressure
5. `non_goals`:
   - no wildcard search for `#211 Design Add and Search Words Data Structure`
   - no board traversal for `#212 Word Search II`
   - no browser-recorded blind session inside this sandbox
6. `predicted_scorecard`:
   - `solvability`: `1.00`
   - `skill_depth`: `0.34`
   - `counterintuitive_moves`: `8.0`
   - `algorithm_alignment`: `1.00`
   - `greedy_optimal_gap`: `0.30`

## Prototype Package

1. `game_entrypoint`: `src/games/Stemvault.tsx`
2. `difficulty_controls`: five difficulty chips plus `Reset`
3. `changed_files`:
   - `src/solvers/Stemvault.solver.ts`
   - `src/games/Stemvault.tsx`
   - `src/games/index.ts`
   - `leetcode/specs/stemvault.md`
   - `leetcode/curriculum.md`
   - `leetcode/results.tsv`
   - `run-program.md`
4. `artifact_paths`:
   - `src/solvers/Stemvault.solver.ts`
   - `src/games/Stemvault.tsx`
   - `leetcode/specs/stemvault.md`
5. `actual_scorecard`:
   - `solvability`: `100%`
   - `skill_depth`: `40.1%`
   - `counterintuitive_moves`: `11.6`
   - `drama`: `0.88`
   - `decision_entropy`: `1.51`
   - `info_gain_ratio`: `1.71`
   - `algorithm_alignment`: `100%`
   - `leetCode_fit`: `100%`
   - `best_alternative_gap`: `40.1%`
   - `invariant_pressure`: `97.6%`
   - `difficulty_breakpoint`: `D3`
6. `known_issues`:
   - Live blind browser play was not run in this sandbox. The blind report below is based on solver evaluation, direct UI inspection, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`.
   - The action space is intentionally compact because each order usually has one strongest next vault action. The learning pressure comes from exact-vs-stem judgment and branch reuse, not wide branching menus every turn.

## Blind Play Report

- `rules_clarity`: The queue, root cursor, and sealed-word ledger make the archive job legible. The main blind risk is whether first-time players immediately understand that a live stem is weaker than a sealed word.
- `easy_strategy`: D1 should read as "build the letters from the root and only seal the last one." The first two filings make the reused opening visible quickly.
- `medium_strategy`: D2-D3 should shift the player from "store words separately" to "keep one shared opening and only branch when the next letter changes."
- `hard_strategy`: D4-D5 demand the full pattern: trust the shared opening stem, branch late, and judge word warrants by the seal instead of by path existence alone.
- `strategy_evolution`: The expected shift is from "I already reached the letters, so the word must exist" to "the path and the finish seal answer different questions."
- `plain_english_pattern`: "Carve each opening once, keep reusing it, and only ask whether the final resting point is sealed when the order is for a whole word."
- `naive_vs_optimal`: The strongest wrong strategy is the loose shelf scan. It can still answer the queue, but every new warrant pays again for prefixes the vault already learned once.
- `confusion_points`: Exact-word false cases like `SU` after filing `SUN` and `SUNG` are the key teaching risk because the path exists but the word should still fail.
- `bug_summary`: No blocking implementation bugs surfaced during solver evaluation, direct UI inspection, typecheck, or web export.
- `verdict`: keep

## Decision Memo

- `decision`: keep
- `why`: Stemvault teaches Blind 75 `#208 Implement Trie (Prefix Tree)` directly enough to justify a dedicated kept game. The kept build preserves insert, exact-word search, and stem search on one visible structure, with `100%` solvability, `40.1%` skill depth, `100%` LeetCode fit, and a clean `D3` breakpoint where the flat shelf alternative starts paying visibly more for reused openings.
- `evidence_used`: `node --experimental-strip-types --input-type=module` evaluation from `src/solvers/Stemvault.solver.ts`, direct UI inspection, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`
- `bug_status`: no open implementation bugs
- `algorithm_alignment_judgment`: strong enough to claim Blind 75 `#208` directly, but not strong enough yet to stretch into wildcard trie search or board-word lookup
- `next_action`: mark `#208` complete in the Blind 75 tracker and leave the next outer-loop pass for `#211 Design Add and Search Words Data Structure`
- `polish_scope`: if browser-capable blind play becomes available later, confirm that first-time players infer the terminal-word seal before they over-trust mere path existence

## Concept Bridge

This game teaches trie construction and lookup with explicit terminal-word state. For the Blind 75 tracker, the kept `Stemvault` game claims `#208 Implement Trie (Prefix Tree)`.

The moment where several filings reuse one carved opening stem maps to traversing existing trie child pointers from the root instead of rebuilding the same prefix work. The moment where a stem warrant succeeds but a word warrant still fails maps to the difference between path existence and a terminal `isEnd` flag at the final node.
