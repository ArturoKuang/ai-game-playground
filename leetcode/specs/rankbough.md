# Rankbough

## Algorithm Game Spec

1. `game_name`: Rankbough
2. `algorithm_target`: 2.16 BST Inorder Rank Traversal
3. `core_insight`: In a binary search tree, the next smallest branch is always the leftmost unpaid branch on the current return lane. Ring it, then open its right spur only when that spur becomes due. Stop the count the moment the kth visit lands.
4. `one_line_pitch`: Harvest a search-tree orchard in true ripening order, keep the live return lane instead of resetting to the crown, and stop exactly when the kth bloom lands before the dew runs out.
5. `rules`:
   - The grove is a valid binary search tree whose unrevealed branches open only when you walk onto them.
   - `Go Left`, `Go Right`, and `Climb Up` move one branch at a time.
   - `Ring Bloom` is only correct when the current branch is the earliest bloom still unpaid by the whole orchard.
   - Every successful ring adds one bloom to the ribbon count.
   - The run ends in victory the moment the ribbon count reaches `k`.
   - Wasted motion still spends dew, so crown resets and loose wandering can lose even when the bloom order stays logically recoverable.
6. `core_actions`:
   - descend toward the leftmost unpaid branch
   - ring the current branch only when it is truly next in order
   - climb back through the live return lane after a left-side bloom is finished
   - open a right spur only after its parent bloom has been paid
   - stop immediately when the kth bloom lands instead of restarting another full search
7. `algorithm_to_mechanic_mapping`:
   - The grove is the BST rooted at `root`.
   - The harvest ribbon count maps to the running inorder visit count.
   - `Ring Bloom` maps to visiting the current node in inorder order.
   - The return lane maps to the recursive or iterative unwind that still remembers which ancestors are next.
   - `Go Right` after a successful ring maps to opening `node.right` before chasing that subtree's leftmost branch.
   - The auto-finish on bloom `k` maps to `if (count === k) return node.val`.
8. `why_greedy_fails`: The strongest near miss is the crown-reset recount. It rings the correct branch, but then climbs all the way back to the crown and searches downward again for the next bloom instead of using the live return lane that is already in hand. That feels safe on the first boards because the orchard is small, but once the medium boards tighten the dew budget, the repeated resets burn too much travel.
9. `aha_moment`: "I already know where the next smallest branch comes from. I should unwind from where I am, not restart from the top."
10. `difficulty_progression`:
    - D1: Small groves let a wasteful crown reset survive so the bloom order itself is readable first.
    - D2: The live return lane becomes a real cost saver and the first medium boards begin punishing resets.
    - D3: Exact-dew boards require the player to keep the current unwind alive instead of restarting from the crown.
    - D4: Deeper groves push the kth bloom farther down the order, so several unwind-and-open-right cycles must chain together cleanly.
    - D5: Hard groves leave no spare dew beyond the exact inorder rank ritual.
11. `predicted_failure_mode`: If the player can read too many values before moving, the puzzle risks collapsing into a pure sorting-by-inspection task instead of teaching the live return lane and stop-at-k habit.
12. `acceptance_criteria`:
    - The stable winning explanation must mention keeping the live return lane after each bloom instead of searching from the crown again.
    - D1 should allow a crown-reset recount to survive at least some boards so the medium break feels earned.
    - Medium-plus boards should punish wasted resets even when the bloom order remains correct.
    - The post-game bridge should claim Blind 75 `#230 Kth Smallest Element in a BST` directly and specifically.
13. `predicted_scorecard`:
    - `skill_depth`: `0.42` because the crown-reset recount should stay tempting on Easy before the budget break appears on Medium.
    - `counterintuitive_moves`: `2.4` because the key shift is climbing only as far as the live unwind demands instead of all the way to the crown.
    - `algorithm_alignment`: `1.00` because the durable route is the exact inorder-rank visitation pattern with an early stop.
    - `greedy_optimal_gap`: `0.28` because the strongest wrong strategy is still logically correct but wastes substantial travel.
    - `difficulty_curve`: `D2`
    - `insight_inflection`: `D2`
14. `open_questions_for_engineering`:
    - Are hidden unrevealed values enough to stop full-tree sorting by inspection without making the orchard feel arbitrary?
    - Does the return-lane UI make the unwind feel like retained structure rather than decorative history?
    - Is the crown-reset near miss still plausible to a blind player once the medium boards start failing it?

## Implementation Packet

1. `version_id`: Rankbough v1
2. `algorithm_game_spec`: BST orchard harvest with hidden unrevealed branch values, one live current branch, a visible return lane, exact bloom counting, and dew pressure against crown resets
3. `prototype_scope`: one `Rankbough` screen, five difficulty presets, rerollable BST groves, harvest ribbon, return-lane display, solver evaluation against a crown-reset baseline, and post-game concept bridge
4. `difficulty_scope`: D1 keeps enough slack for a crown reset to survive; D2-D5 increasingly require staying on the live unwind and stopping exactly at bloom `k`
5. `non_goals`:
   - no claim that this pass covers `#105 Construct Binary Tree from Preorder and Inorder Traversal`
   - no subtree-size augmentation or order-statistics tree teaching
   - no live browser-play certification inside this sandbox if blind automation remains unavailable
6. `predicted_scorecard`:
   - `solvability`: `1.00`
   - `skill_depth`: `0.42`
   - `counterintuitive_moves`: `2.4`
   - `algorithm_alignment`: `1.00`
   - `greedy_optimal_gap`: `0.28`

## Prototype Package

1. `game_entrypoint`: `src/games/Rankbough.tsx`
2. `difficulty_controls`: five difficulty chips plus `Reset Grove` and `New Grove`
3. `changed_files`:
   - `src/games/Rankbough.tsx`
   - `src/solvers/Rankbough.solver.ts`
   - `src/games/index.ts`
   - `leetcode/specs/rankbough.md`
   - `leetcode/curriculum.md`
   - `leetcode/learnings.md`
   - `leetcode/results.tsv`
   - `run-program.md`
4. `artifact_paths`:
   - `leetcode/specs/rankbough.md`
   - `src/games/Rankbough.tsx`
   - `src/solvers/Rankbough.solver.ts`
5. `actual_scorecard`:
   - `solvability`: `100%`
   - `skill_depth`: `46.7%`
   - `counterintuitive_moves`: `2.65`
   - `drama`: `0.76`
   - `decision_entropy`: `1.57`
   - `info_gain_ratio`: `1.17`
   - `algorithm_alignment`: `100%`
   - `leetCode_fit`: `99.0%`
   - `best_alternative_gap`: `46.7%`
   - `invariant_pressure`: `76.6%`
   - `difficulty_breakpoint`: `D2`
6. `known_issues`:
   - Live blind browser play was not recorded in this sandbox. The blind report below is based on solver evaluation, direct UI inspection, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`.
   - The first medium breakpoint arrives at `D2`, not `D3`, because half of the crown-reset baseline catalog already overruns the dew budget there.

## Blind Play Report

- `rules_clarity`: The harvest ribbon and return lane make the objective legible, and hidden unrevealed values stop pure sort-by-inspection play. The main blind risk is whether a first-time player immediately trusts that the next bloom comes from the current unwind instead of from a fresh crown search.
- `easy_strategy`: D1 should feel readable. A player can chase the leftmost branch, ring it, and even waste a crown reset or two without immediately losing the dew budget.
- `medium_strategy`: D2 is the first real shift. The player now feels that a correct bloom is not enough; the route to the next bloom also matters, so the live return lane starts beating the restart habit.
- `hard_strategy`: D3-D5 require chaining the full ritual: leftmost unpaid branch, ring it, unwind just far enough, then open the next right spur that actually became due.
- `strategy_evolution`: The expected shift is from "search from the top for each next bloom" to "the next bloom is already somewhere on my current unwind, so I should not throw that path away."
- `plain_english_pattern`: "Keep walking to the next smallest branch from where you already are. Use the path back up, open a right branch only when it becomes due, and stop the moment the kth bloom lands."
- `naive_vs_optimal`: The strongest wrong strategy still gets the order right, but it keeps restarting from the crown after every bloom. The optimal strategy keeps the return lane alive, which is exactly why it survives the tighter dew budgets.
- `confusion_points`: If the player treats the return lane as flavor instead of structure, the medium failure can feel abrupt. The UI has to keep signaling that the lane is saved work.
- `bug_summary`: No blocking implementation bugs surfaced during solver evaluation, direct UI inspection, typecheck, or web export. Browser automation playtesting was not run.
- `verdict`: keep

## Decision Memo

- `decision`: keep
- `why`: Rankbough teaches `Kth Smallest Element in a BST` directly enough to justify a dedicated kept game. The kept build hit `100%` solvability, `99.0%` LeetCode fit, `76.6%` invariant pressure, and a meaningful `46.7%` crown-reset gap while keeping the mechanic aligned with inorder rank counting.
- `evidence_used`: `node --experimental-strip-types --input-type=module` evaluation from `src/solvers/Rankbough.solver.ts`, direct UI inspection, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`
- `bug_status`: no open implementation bugs
- `algorithm_alignment_judgment`: strong enough to claim Blind 75 `#230 Kth Smallest Element in a BST` directly
- `next_action`: mark `#230` complete in the Blind 75 tracker and leave the next outer-loop pass for `#105 Construct Binary Tree from Preorder and Inorder Traversal`
- `polish_scope`: when a browser-capable blind session is available, confirm that the return-lane panel is enough for first-play comprehension without extra onboarding

## Concept Bridge

This game teaches BST inorder rank traversal. For the Blind 75 tracker, the kept `Rankbough` game claims `#230 Kth Smallest Element in a BST`.

The moment where you keep the current unwind alive instead of resetting to the crown maps to the inorder traversal stack or call stack that already knows which ancestor comes next. The moment where the run ends exactly on bloom `k` maps to incrementing the inorder visit count and returning the current node value as soon as `count === k`.
