# Hollowbough

## Algorithm Game Spec

1. `game_name`: Hollowbough
2. `algorithm_target`: 2.19 Tree Codec / Null-Marker Preorder
3. `core_insight`: Every visited tree slot must write exactly one ribbon token now. A real branch writes its value and opens two child slots; a hollow hook writes a null marker and closes immediately. To replay that same preorder ribbon, the right child task has to be banked under the left one.
4. `one_line_pitch`: Grow one self-closing grove ribbon that preserves every branch and every hollow hook, then prove the same ribbon can regrow the exact grove.
5. `rules`:
   - The top work slot is the only live place you may stamp next.
   - `Stamp Branch` is legal only when the live slot holds a real branch.
   - `Stamp Hollow` is legal only when the live slot is empty.
   - Every stamped branch opens exactly two child tasks, even when one or both child hooks are hollow.
   - When a branch opens two child tasks, you must bank both before continuing.
   - `Swap Top Pair` can repair a bad child-task order, but it still spends ink.
   - The run wins only when the courier ribbon is complete and the rebuilt grove is fully sealed before the ink budget runs out.
6. `core_actions`:
   - stamp the live branch value or hollow hook onto the courier ribbon
   - bank the right child task under the left one so preorder stays live
   - spend a rescue swap only when a wrong split order has to be repaired
   - watch the rebuilt grove fill in one slot per ribbon token
   - finish only when both the ribbon and the rebuild close with no unresolved hooks
7. `algorithm_to_mechanic_mapping`:
   - The courier ribbon maps to the serialized token stream.
   - A real branch stamp maps to writing `node.val`.
   - A hollow stamp maps to writing a null sentinel such as `#`.
   - The live work slot maps to the current recursive call during serialization or deserialization.
   - Opening two child tasks after a branch stamp maps to recurring into `left` and `right`.
   - Banking the right task under the left task maps to preserving left-before-right execution order on the call stack.
   - The rebuilt grove panel maps to consuming the same preorder token stream during deserialization.
8. `why_greedy_fails`: The tempting near miss is to treat the ribbon like a branch-only trace and bank child tasks in the most obvious visual order. That almost works on forgiving early boards, but medium-plus budgets prove that skipped hollow hooks and repaired split orders both waste the exact information the codec needs to rebuild shape.
9. `aha_moment`: "The empty hooks are part of the message too. If I do not stamp them now, the ribbon stops describing the grove."
10. `difficulty_progression`:
    - D1: Small groves introduce hollow hooks and allow one repaired split order to survive.
    - D2: Wider groves show that hollow hooks are not optional bookkeeping; they are part of the rebuild.
    - D3: Exact budgets remove spare rescue ink and make the right-under-left bank order mandatory on real splits.
    - D4: Deeper ribbons chain multiple branch and hollow decisions together, so the player must trust one self-delimiting preorder script.
    - D5: Hard groves leave no wasted motion. Lose one hollow mark or one split order and the rebuild cannot close in budget.
11. `predicted_failure_mode`: If the rebuilt grove does not update visibly enough after each stamp, the player may read the game as generic tree traversal instead of a round-trip codec where every token is structural.
12. `acceptance_criteria`:
    - The stable winning explanation must mention that hollow hooks need their own ribbon marks.
    - Medium-plus boards must punish rescue swaps strongly enough that the correct child-task order becomes necessary.
    - The post-game bridge should claim Blind 75 `#297 Serialize and Deserialize Binary Tree` directly and specifically.
    - Solver evaluation should show a real breakpoint once swap-recovery loses its spare ink.
13. `predicted_scorecard`:
    - `skill_depth`: `0.42`
    - `counterintuitive_moves`: `6.0`
    - `algorithm_alignment`: `1.00`
    - `greedy_optimal_gap`: `0.35`
    - `difficulty_curve`: `D3`
    - `insight_inflection`: `D3`
14. `open_questions_for_engineering`:
    - Does the rebuilt grove make the value of hollow markers obvious enough on first play?
    - Is the work-stack presentation clear enough that right-under-left reads as necessary structure, not arbitrary ritual?
    - Are the hardest ribbons still readable on mobile once the grove gets deeper?

## Implementation Packet

1. `version_id`: Hollowbough v1
2. `algorithm_game_spec`: null-marker preorder codec with one live slot, courier ribbon stamping, child-task banking, and rebuilt-grove round-trip verification
3. `prototype_scope`: one `Hollowbough` screen, five difficulty presets, rerollable groves, solver evaluation against a swap-recovery baseline, and post-game concept bridge
4. `difficulty_scope`: D1-D2 permit repaired split orders; D3-D5 require exact branch-or-hollow stamping plus correct right-under-left task banking
5. `non_goals`:
   - no claim that this pass covers `#295 Find Median from Data Stream`
   - no attempt to teach BFS codecs or parenthesized text encodings in the same build
   - no live browser automation inside this sandbox if blind browser control remains unavailable
6. `predicted_scorecard`:
   - `solvability`: `1.00`
   - `skill_depth`: `0.42`
   - `counterintuitive_moves`: `6.0`
   - `algorithm_alignment`: `1.00`
   - `greedy_optimal_gap`: `0.35`

## Prototype Package

1. `game_entrypoint`: `src/games/Hollowbough.tsx`
2. `difficulty_controls`: five difficulty chips plus `Reset Grove` and `New Grove`
3. `changed_files`:
   - `src/solvers/Hollowbough.solver.ts`
   - `src/games/Hollowbough.tsx`
   - `src/games/index.ts`
   - `leetcode/specs/hollowbough.md`
   - `leetcode/curriculum.md`
   - `leetcode/learnings.md`
   - `leetcode/results.tsv`
   - `run-program.md`
4. `artifact_paths`:
   - `src/solvers/Hollowbough.solver.ts`
   - `src/games/Hollowbough.tsx`
   - `leetcode/specs/hollowbough.md`
5. `actual_scorecard`:
   - `solvability`: `100%`
   - `skill_depth`: `61.8%`
   - `counterintuitive_moves`: `14.5`
   - `drama`: `0.61`
   - `decision_entropy`: `1.28`
   - `info_gain_ratio`: `0.69`
   - `algorithm_alignment`: `90.5%`
   - `leetCode_fit`: `94.9%`
   - `best_alternative_gap`: `60.5%`
   - `invariant_pressure`: `51.0%`
   - `difficulty_breakpoint`: `D3`
6. `known_issues`:
   - The strongest measured alternative is a split-order recovery policy, so the gap captures ordering waste more strongly than the semantic mistake of omitting hollow hooks altogether.
   - Live blind browser play was not recorded in this sandbox. The blind report below is based on solver evaluation, direct UI inspection, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`.

## Blind Play Report

- `rules_clarity`: The source grove, rebuilt grove, and courier ribbon together make the round-trip goal legible. The main blind risk is whether first-time players immediately trust that empty hooks matter as much as real branches.
- `easy_strategy`: D1 should feel like "stamp what is live right now and keep the left child on top." The player can survive one repaired split and still see that hollow hooks are regular work, not cleanup.
- `medium_strategy`: D2 turns the null-marker lesson visible. The player should start saying that an empty hook still needs its own mark or the rebuild panel stops matching the source.
- `hard_strategy`: D3-D5 demand the full codec ritual: stamp the current slot, bank right under left, seal hollow hooks immediately, and never spend rescue ink unless a mistake already happened.
- `strategy_evolution`: The expected shift is from "copy the visible branches" to "the ribbon is describing slots, not just values, so every empty hook has to be written in order too."
- `plain_english_pattern`: "Write whatever the live slot is right now. If it is a branch, open both child jobs and keep the left one on top next. If it is empty, mark that emptiness and stop that trail."
- `naive_vs_optimal`: The strongest wrong strategy repairs split orders after the fact. It still knows the structure, but medium-plus budgets prove that the rescue path wastes too much ink to be the real codec.
- `confusion_points`: Some players may initially see hollow hooks as decoration because the source grove already shows them. The rebuild panel has to stay prominent so the need for those marks feels concrete.
- `bug_summary`: No blocking implementation bugs surfaced during solver evaluation, direct UI inspection, typecheck, or web export. Browser automation playtesting was not run.
- `verdict`: keep

## Decision Memo

- `decision`: keep
- `why`: Hollowbough teaches the preorder null-marker codec directly enough to justify a dedicated Blind 75 game. The kept build hit `100%` solvability, `94.9%` LeetCode fit, a `60.5%` best-alternative gap, and the intended `D3` breakpoint where swap-recovery runs out of spare ink.
- `evidence_used`: `node --experimental-strip-types --input-type=module` evaluation from `src/solvers/Hollowbough.solver.ts`, direct UI inspection, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`
- `bug_status`: no open implementation bugs
- `algorithm_alignment_judgment`: strong enough to claim Blind 75 `#297 Serialize and Deserialize Binary Tree` directly
- `next_action`: mark `#297` complete in the Blind 75 tracker and leave the next outer-loop pass for `#295 Find Median from Data Stream`
- `polish_scope`: if a browser-capable blind session becomes available later, verify that first-play users understand why hollow hooks need marks without extra onboarding

## Concept Bridge

This game teaches the preorder null-marker round trip behind `Serialize and Deserialize Binary Tree`. For the Blind 75 tracker, the kept `Hollowbough` game claims `#297 Serialize and Deserialize Binary Tree`.

The moment where you stamp a hollow hook instead of skipping it maps to writing a null sentinel during serialization and returning `null` immediately during deserialization. The moment where you bank the right child task under the left one maps to consuming the same preorder token stream so the left subtree rebuilds before the right subtree on the recursive call stack.
