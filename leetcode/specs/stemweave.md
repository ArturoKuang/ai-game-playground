# Stemweave

## Algorithm Game Spec

1. `game_name`: Stemweave
2. `algorithm_target`: 2.4b Trie / Board Prefix Pruning
3. `core_insight`: On a shared letter board, a live trail should continue only while it still matches some stored opening in the trie. When a shorter listed word appears, bank it immediately without collapsing the trail, because that same stem may still grow into a longer listed word.
4. `one_line_pitch`: Harvest every listed seal from one letter canopy before the lantern budget breaks by weaving only through live shared stems.
5. `rules`:
   - The canopy shows one board and one ledger of listed words.
   - A live trail starts on any tile whose letter opens at least one listed word.
   - Each new step must land on an orthogonally adjacent tile that is not already on the live trail.
   - Only trails that still match some live shared stem in the ledger may continue.
   - `Bank Word` is legal only when the current trail spells one listed word that has not been banked yet.
   - Banking a word does not collapse the trail; the player may keep weaving if longer listed words still share that stem.
   - `Backtrack` removes only the newest tile and marks that branch spent for the current shorter stem.
   - `Claim Complete` is legal only after every listed word has been banked.
6. `core_actions`:
   - choose a root tile that opens a listed word
   - extend the trail only through adjacent letters that keep the trie stem alive
   - bank a shorter word without dropping the current trail
   - backtrack one tile when the current branch no longer matches any listed continuation
   - sweep remaining roots only after the current stem family is exhausted
7. `algorithm_to_mechanic_mapping`:
   - The shared stem map maps to the trie built from the word list.
   - Lit next tiles map to neighboring board cells whose letters are children of the current trie node.
   - `Bank Word` maps to recording a hit when the current trie node stores a full word.
   - Banking without dropping the trail maps to continuing DFS after adding one found word, because deeper children may still produce longer words.
   - `Backtrack` maps to unwinding one DFS frame and clearing the latest board visit mark when the current prefix has no remaining live child branch.
   - Spent root starts map to the outer loop that tries each board cell only while it still opens some unspent trie branch.
8. `why_greedy_fails`: The strongest near miss is the root reset. It banks the first word it sees, then clears the whole trail and pays for the same prefix again. That can survive tiny routes, but the shared-stem boards in medium and higher difficulties hide longer words behind already-paid prefixes, so reset play either overruns budget or strands those longer seals entirely.
9. `aha_moment`: "Finding one word does not mean this trail is done. If the shared stem is still live, I should bank the word and keep weaving from here."
10. `difficulty_progression`:
    - D1: A short prefix produces an immediate shorter-word and longer-word pair, making "bank without reset" legible right away.
    - D2: One shared stem branches into sibling endings, so the player must bank the short seal and then choose the correct extension.
    - D3: The same stem family now yields multiple banked words before the player backtracks into another branch.
    - D4: Several root starts matter, so the player must finish one prefix family cheaply before moving to the next root.
    - D5: Dense boards mix several shared stems, forcing the player to trust trie-guided pruning instead of wandering through the board by surface adjacency alone.
11. `predicted_failure_mode`: If the stem map does not clearly show that a shorter word can still have live children, players may treat `Bank Word` like an exit button instead of a ledger action that preserves the DFS trail.
12. `acceptance_criteria`:
    - Winning play should be describable as "keep one live board trail only while it still matches a listed stem, bank words without collapsing that trail, and prune only the dead branch."
    - At least one shipped route must punish resetting after the first found word on a shared prefix.
    - Solver evaluation must keep `100%` solvability across the shipped difficulty set.
    - The post-game bridge must claim Blind 75 `#212 Word Search II` directly and only.
13. `predicted_scorecard`:
    - `skill_depth`: `0.38`
    - `counterintuitive_moves`: `8.0`
    - `algorithm_alignment`: `1.00`
    - `greedy_optimal_gap`: `0.35`
    - `difficulty_curve`: `D2`
    - `insight_inflection`: `D2`
14. `open_questions_for_engineering`:
    - Is the stem map legible enough that players understand why some adjacent letters are dark even though they are physically reachable on the board?
    - Does `Bank Word` feel like a ledger action rather than a reset or exit action?
    - Are spent root starts visible enough that the player understands the outer-loop sweep over the whole board?

## Implementation Packet

1. `version_id`: Stemweave v1
2. `algorithm_game_spec`: board word harvest with a visible shared-stem trie, explicit bank-without-reset behavior, and one-step branch pruning on dead prefixes
3. `prototype_scope`: one `Stemweave` screen, five fixed difficulty boards, a visible shared-stem map, a word ledger, a local branch-pruning history, and solver evaluation against a reset-after-word alternative
4. `difficulty_scope`: D1 teaches bank-without-reset, D2-D3 teach sibling shared-stem branching, and D4-D5 add multi-root sweep pressure and denser shared-prefix pruning
5. `non_goals`:
   - no claim that this pass covers graph flood fill or generic DFS beyond trie-guided board search
   - no browser-recorded blind session inside this sandbox
   - no diagonal movement, tile reuse, or hidden dictionary updates during play
6. `predicted_scorecard`:
   - `solvability`: `1.00`
   - `skill_depth`: `0.38`
   - `counterintuitive_moves`: `8.0`
   - `algorithm_alignment`: `1.00`
   - `greedy_optimal_gap`: `0.35`

## Prototype Package

1. `game_entrypoint`: `src/games/Stemweave.tsx`
2. `difficulty_controls`: five difficulty chips plus `Reset Search`
3. `changed_files`:
   - `src/solvers/Stemweave.solver.ts`
   - `src/games/Stemweave.tsx`
   - `src/games/index.ts`
   - `leetcode/specs/stemweave.md`
   - `leetcode/curriculum.md`
   - `leetcode/results.tsv`
   - `run-program.md`
4. `artifact_paths`:
   - `src/solvers/Stemweave.solver.ts`
   - `src/games/Stemweave.tsx`
   - `leetcode/specs/stemweave.md`
5. `actual_scorecard`:
   - `solvability`: `100%`
   - `skill_depth`: `45.8%`
   - `counterintuitive_moves`: `9.4`
   - `drama`: `1.00`
   - `decision_entropy`: `0.80`
   - `info_gain_ratio`: `1.26`
   - `algorithm_alignment`: `100%`
   - `leetCode_fit`: `100%`
   - `best_alternative_gap`: `45.8%`
   - `invariant_pressure`: `97.2%`
   - `difficulty_breakpoint`: `D1`
6. `known_issues`:
   - Live blind browser play was not run in this sandbox. The blind report below is based on solver evaluation, direct UI inspection, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`.
   - Decision entropy stays below `1.0` because the intended lesson is not broad option menus. The pressure comes from recognizing when to bank a short word without resetting and when to prune a dead shared stem.

## Blind Play Report

- `rules_clarity`: The board, word ledger, and shared-stem map make the job legible. The main blind risk is whether first-time players realize that a lit short word may still want one more extension before they leave the stem family.
- `easy_strategy`: D1 should read as "trace the obvious word, bank it, and notice that the trail can keep going because the same stem still supports a longer listed word."
- `medium_strategy`: D2-D3 should shift the player from "bank and restart" to "bank, continue while the trie stays live, then peel back one step to harvest the sibling ending."
- `hard_strategy`: D4-D5 demand the full pattern: finish one shared stem family cheaply, prune dead branches locally, and move to the next root only after the current family is truly exhausted.
- `strategy_evolution`: The expected shift is from "a found word ends the run" to "a found word is just one seal on a still-live stem."
- `plain_english_pattern`: "Follow only board trails that still match some listed opening, bank each finished word as it appears, and back up only when the current trail no longer fits any listed continuation."
- `naive_vs_optimal`: The strongest wrong strategy is root reset after each banked word. It throws away paid-for prefixes and either misses longer shared-stem words or spends too much budget rebuilding them.
- `confusion_points`: The most fragile teaching moment is the first shorter-word hit on a still-live stem, because the player has to trust that banking the word should not collapse the trail.
- `bug_summary`: No blocking implementation bugs surfaced during solver evaluation, direct UI inspection, `npx tsc --noEmit`, or `env CI=1 npx expo export --platform web`.
- `verdict`: keep

## Decision Memo

- `decision`: keep
- `why`: Stemweave teaches Blind 75 `#212 Word Search II` directly enough to justify a dedicated kept game. The kept build combines visible trie stems with board-local DFS, preserves the key "bank without reset" behavior for shared prefixes, and shows why dead prefixes should be cut immediately. The shipped evaluation kept `100%` solvability, `100%` LeetCode fit, `100%` algorithm alignment, and a `45.8%` strongest-alternative gap against the reset-after-word baseline.
- `evidence_used`: `node --experimental-strip-types --input-type=module` evaluation from `src/solvers/Stemweave.solver.ts`, direct UI inspection, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`
- `bug_status`: no open implementation bugs
- `algorithm_alignment_judgment`: strong enough to claim Blind 75 `#212 Word Search II` directly because optimal play now requires trie-guided board pruning plus continuing after a shorter word on the same live stem
- `next_action`: mark `#212` complete in the Blind 75 tracker and leave the next outer-loop pass for `#200 Number of Islands`
- `polish_scope`: if browser-capable blind play becomes available later, confirm that new players bank short words without treating that action as a reset

## Concept Bridge

This game teaches trie-guided board DFS with prefix pruning. For the Blind 75 tracker, the kept `Stemweave` game claims `#212 Word Search II`.

The moment where a dead trail forces a one-step prune maps to returning immediately when the current board path no longer exists as a trie prefix. The moment where a short word is banked but the trail stays alive maps to adding one found word when a trie node is terminal and then continuing DFS because longer words may still extend from that same node.
