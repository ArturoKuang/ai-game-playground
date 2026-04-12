# Boughturn

## Algorithm Game Spec

1. `game_name`: Boughturn
2. `algorithm_target`: 2.10 Tree Recursion / Subtree Mirroring
3. `core_insight`: Inverting a binary tree is not a global reshuffle. At every branch hub, the exact same local job repeats: swap the left and right child boughs, then do that same job to each child subtree before wandering off to some distant frontier.
4. `one_line_pitch`: Mirror a hanging canopy under a strict lantern budget by flipping the current branch hub and finishing one child subtree before crossing to the sibling side.
5. `rules`:
   - Every branching hub may mirror exactly by swapping its two child boughs.
   - Left and right movement always follow the CURRENT branch layout after any swap.
   - `Climb Up` returns to the parent hub.
   - The run succeeds only when every branching hub ends mirrored.
   - Leaf charms cannot be mirrored and only matter as visible proof that whole subtrees really swung.
   - Lantern oil is tight enough at higher difficulties that broad frontier sweeps run dry.
6. `core_actions`:
   - mirror the current hub
   - descend into one child branch
   - backtrack once when that subtree is done
   - cross to the sibling branch only after the first subtree is cleared
7. `algorithm_to_mechanic_mapping`:
   - The canopy is the binary tree.
   - `Mirror Branch` maps to `swap(node.left, node.right)`.
   - `Go Left` and `Go Right` follow the current child pointers after that swap.
   - Clearing one child branch before crossing maps to the two recursive calls on the child subtrees.
   - The leaf ribbon is the visible proof that a whole subtree moved at once rather than one leaf at a time.
8. `why_greedy_fails`: The strongest near miss is a level-order frontier sweep. It still understands that every hub eventually needs a flip, but it keeps bouncing back to the shallowest unfinished hub instead of staying inside one subtree. That survives with slack at D1-D2 and then fails exactly when the lantern budget goes exact at D3.
9. `aha_moment`: "This is the same branch job over and over. Flip the hub I am on, finish that whole side, come back once, then finish the other side."
10. `difficulty_progression`:
    - D1: A short sapling makes the local swap obvious and still forgives one wasteful cross-tree detour.
    - D2: The canopy gets deeper, but there is still enough oil to let the wrong frontier sweep barely survive.
    - D3: The spare climbs disappear; the recursive subtree-clearing route becomes mandatory.
    - D4: A taller arbor increases the penalty for hopping between shallow hubs.
    - D5: Exact fuel on a full canopy makes the ritual feel structural from root to deepest branch.
11. `predicted_failure_mode`: If the leaf ribbon does not make the subtree swing legible, the puzzle risks reading like generic tree traversal instead of recursive inversion.
12. `acceptance_criteria`:
    - The winning pattern is describable in plain English as "flip here, finish one side, backtrack once, finish the other side."
    - The strongest wrong strategy should be a sensible frontier sweep, not random wandering.
    - D3 should be the first exact-budget breakpoint.
    - The post-game bridge should claim Blind 75 `#226 Invert Binary Tree` directly and specifically.
13. `predicted_scorecard`:
    - `skill_depth`: `0.34` because the level-order sweep should still feel plausible before exact budgets force subtree commitment.
    - `counterintuitive_moves`: `4.0` because crossing later than the eye wants should feel strategically important.
    - `algorithm_alignment`: `1.00` because every winning run is the recursive swap-and-descend pattern.
    - `greedy_optimal_gap`: `0.10` because the wrong strategy is close on raw move count even while it misses exact budgets.
    - `difficulty_curve`: `D3`.
    - `insight_inflection`: `D3`.
14. `open_questions_for_engineering`:
    - Is the current focus hub clear enough that players understand where the next swap actually happens?
    - Does the leaf ribbon make subtree movement legible enough to justify the inversion claim, not just generic traversal?
    - Are D1-D2 generous enough that the frontier sweep feels tempting before D3 rejects it?

## Implementation Packet

1. `version_id`: Boughturn v1
2. `algorithm_game_spec`: recursive tree-mirroring canopy with local swaps, left/right traversal, and exact-budget subtree commitment
3. `prototype_scope`: one `Boughturn` screen, five difficulty presets, rerollable leaf-token sets, a live tree board, current/target leaf ribbons, route log, and solver evaluation against a shallow frontier-sweep policy
4. `difficulty_scope`: D1-D2 preserve some slack for frontier hopping; D3-D5 force the recursive route
5. `non_goals`:
   - no attempt to cover a second Blind 75 tree problem in this pass
   - no hidden-information layer beyond visible branch state and leaf-ribbon feedback
   - no claim that breadth-first inversion is wrong in code; this build is specifically teaching the recursive DFS version
6. `predicted_scorecard`:
   - `solvability`: `1.00`
   - `skill_depth`: `0.34`
   - `counterintuitive_moves`: `4.0`
   - `algorithm_alignment`: `1.00`
   - `greedy_optimal_gap`: `0.10`

## Prototype Package

1. `game_entrypoint`: `src/games/Boughturn.tsx`
2. `difficulty_controls`: five difficulty chips plus `Reset Canopy` and `New Canopy`
3. `changed_files`:
   - `src/games/Boughturn.tsx`
   - `src/solvers/Boughturn.solver.ts`
   - `src/games/index.ts`
   - `leetcode/specs/boughturn.md`
   - `leetcode/curriculum.md`
   - `leetcode/learnings.md`
   - `leetcode/results.tsv`
   - `run-program.md`
4. `artifact_paths`:
   - `leetcode/specs/boughturn.md`
   - `src/games/Boughturn.tsx`
   - `src/solvers/Boughturn.solver.ts`
5. `actual_scorecard`:
   - `solvability`: `100%`
   - `skill_depth`: `31.3%`
   - `counterintuitive_moves`: `4.2`
   - `drama`: `0.36`
   - `decision_entropy`: `1.91`
   - `info_gain_ratio`: `0.72`
   - `algorithm_alignment`: `100%`
   - `leetCode_fit`: `98.0%`
   - `best_alternative_gap`: `7.9%`
   - `invariant_pressure`: `58.8%`
   - `difficulty_breakpoint`: `D3`
6. `known_issues`:
   - Live blind browser play was not run in this sandbox. The blind report below is based on solver-driven route checks, direct UI inspection, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`.
   - The leaf ribbon is carrying a lot of explanatory load. If later live play finds that subtree swinging still feels too abstract, this build should add stronger local before/after cues rather than broaden the rules.

## Blind Play Report

- `rules_clarity`: The action set is compact and the focus hub plus exit cards keep the immediate state readable. The main learning burden is understanding that the left/right exits change after a mirror, which is the key moment that makes the recursive mapping visible.
- `easy_strategy`: Early play should feel like "mirror this hub and keep walking." D1 lets a player survive a little unnecessary hopping without losing the thread.
- `medium_strategy`: D2-D3 should produce the real shift. Once the slack is gone, the player learns that jumping back to shallow unfinished hubs costs exactly the oil needed for the last branch.
- `hard_strategy`: D4-D5 demand the full ritual: mirror the current hub, clear one child subtree, climb back once, then clear the sibling subtree.
- `strategy_evolution`: The expected shift is from "flip everything eventually" to "finish one subtree before I cross, because the same branch job repeats everywhere."
- `plain_english_pattern`: "Swap the branch I am standing on, stay in that side until it is done, come back once, then do the other side."
- `naive_vs_optimal`: The strongest wrong strategy is a level-order frontier sweep. It is intelligent enough to flip every necessary hub, but it spends its oil revisiting the spine too often and starts failing exactly at D3.
- `confusion_points`: Players may first read the leaf ribbon as a target-sequence puzzle instead of a proof that whole subtrees moved. The rest of the UI needs to keep that distinction clear.
- `bug_summary`: No blocking implementation bugs surfaced during solver verification, scripted exact-budget runs, typecheck, or web export.
- `verdict`: keep

## Decision Memo

- `decision`: keep
- `why`: Boughturn cleanly teaches the recursive `Invert Binary Tree` pattern with a defensible `D3` breakpoint. The kept build hit `100%` solvability, `31.3%` skill depth, `98.0%` LeetCode fit, and a visible shallow-frontier alternative that starts missing exact budgets once subtree commitment becomes mandatory.
- `evidence_used`: `node --experimental-strip-types --input-type=module` evaluation from `src/solvers/Boughturn.solver.ts`, a scripted D3 exact-budget solve, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`
- `bug_status`: no open implementation bugs
- `algorithm_alignment_judgment`: strong enough to claim Blind 75 `#226 Invert Binary Tree` directly
- `next_action`: mark `#226` complete in the Blind 75 tracker and leave the next outer-loop pass for `#104 Maximum Depth of Binary Tree`
- `polish_scope`: if a live blind browser pass becomes available later, validate whether the leaf ribbon and focus-hub cues are sufficient or whether subtree motion needs stronger visual scaffolding

## Concept Bridge

This game teaches the recursive subtree-swapping pattern for `Invert Binary Tree`. For the Blind 75 tracker, the kept `Boughturn` game claims `#226 Invert Binary Tree`.

The moment where `Mirror Branch` swaps the visible left and right exits maps directly to `swap(node.left, node.right)`. The route discipline of finishing one child canopy before crossing to the sibling side maps to the recursive calls on the two child pointers. The leaf ribbon changing in whole groups is the playable version of an entire subtree moving at once after the local swap.
