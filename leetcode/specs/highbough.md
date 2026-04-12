# Highbough

## Algorithm Game Spec

1. `game_name`: Highbough
2. `algorithm_target`: 2.11 Tree Recursion / Bottom-Up Height
3. `core_insight`: A branch cannot know its own height until the child branches below it have already reported theirs. Once both child readings exist, the current branch keeps the larger child height and adds one for itself.
4. `one_line_pitch`: Climb an uneven canopy under a tight step budget and certify each branch only after its child readings are sealed from the leaves upward.
5. `rules`:
   - A leaf may always seal at height `1`.
   - A non-leaf branch may seal only after every existing child branch below it is already sealed.
   - When a branch seals, its height becomes `max(left child height, right child height) + 1`.
   - Missing child branches count as height `0`.
   - Movement is limited to `Go Left`, `Go Right`, and `Climb Up`.
   - The run succeeds only when the crown branch is sealed before the climb budget runs out.
6. `core_actions`:
   - descend to an unfinished child branch
   - certify a leaf
   - backtrack after a subtree is finished
   - certify the current branch from the larger child reading plus one
7. `algorithm_to_mechanic_mapping`:
   - The canopy is the binary tree.
   - A sealed leaf at `1` maps to the base case `if (!node) return 0` followed by a leaf returning `1`.
   - A branch refusing to seal before its children are sealed maps to recursive calls that must finish before the current frame can return.
   - Choosing the larger child reading maps directly to `Math.max(leftDepth, rightDepth)`.
   - Adding one at the current branch maps to counting the current node in the final returned height.
8. `why_greedy_fails`: The strongest near miss is the crown-reset recount. It understands that heights must eventually bubble up, but after every seal it climbs all the way back to the crown before heading to the next postorder target. That survives with early slack, then fails once D3 removes the spare climbs.
9. `aha_moment`: "I do not need to keep re-measuring from the top. Once a child branch is sealed, that reading is the subtree answer. I just keep the larger child height and add one here."
10. `difficulty_progression`:
    - D1: Small uneven canopies make the leaf-to-parent relation obvious and still forgive wasteful resets.
    - D2: Larger asymmetry introduces real left-vs-right comparison while spare climbs still hide some inefficiency.
    - D3: Exact budgets make crown-reset recounts fail; bottom-up subtree completion becomes mandatory.
    - D4: Taller branches increase the penalty for abandoning a partially finished subtree.
    - D5: Exact late-game budgets make every certification feel like a recursive return value, not a fresh recount.
11. `predicted_failure_mode`: If the child-reading panel is unclear, the game risks feeling like generic traversal plus arithmetic instead of subtree answers bubbling upward.
12. `acceptance_criteria`:
    - The winning pattern is describable in plain English as "finish child branches first, then seal the parent from the larger child height plus one."
    - The strongest wrong strategy should be a sensible crown-reset recount, not random wandering.
    - D3 should be the first breakpoint where the near miss stops fitting.
    - The post-game bridge should claim Blind 75 `#104 Maximum Depth of Binary Tree` directly and specifically.
13. `predicted_scorecard`:
    - `skill_depth`: `0.40` because the crown-reset recount should look reasonable until exact budgets expose the waste.
    - `counterintuitive_moves`: `3.0` because trusting an already sealed child reading should feel more correct than restarting from the crown.
    - `algorithm_alignment`: `1.00` because every winning route is the bottom-up `max(left, right) + 1` routine.
    - `greedy_optimal_gap`: `0.20` because the near miss stays close on small trees before falling apart.
    - `difficulty_curve`: `D3`.
    - `insight_inflection`: `D3`.
14. `open_questions_for_engineering`:
    - Is the child-reading panel strong enough that players understand when a missing child counts as `0` instead of "unfinished"?
    - Does the route log make bottom-up certification legible enough to feel like recursion rather than bookkeeping?
    - Are D1-D2 generous enough that the crown-reset recount feels tempting before D3 rejects it?

## Implementation Packet

1. `version_id`: Highbough v1
2. `algorithm_game_spec`: bottom-up canopy height certification with leaf base cases, child-reading comparison, and traversal pressure against crown resets
3. `prototype_scope`: one `Highbough` screen, five difficulty presets, rerollable canopy shapes, a live tree board with sealed heights, current child readings, route log, and solver evaluation against a crown-reset recount policy
4. `difficulty_scope`: D1-D2 allow wasteful resets to survive; D3-D5 force subtree-local completion
5. `non_goals`:
   - no claim that this game covers other Blind 75 tree problems in this pass
   - no hidden-information layer beyond visible branch structure and sealed child readings
   - no breadth-first framing; this build is specifically teaching the recursive bottom-up height routine
6. `predicted_scorecard`:
   - `solvability`: `1.00`
   - `skill_depth`: `0.40`
   - `counterintuitive_moves`: `3.0`
   - `algorithm_alignment`: `1.00`
   - `greedy_optimal_gap`: `0.20`

## Prototype Package

1. `game_entrypoint`: `src/games/Highbough.tsx`
2. `difficulty_controls`: five difficulty chips plus `Reset Canopy` and `New Canopy`
3. `changed_files`:
   - `src/games/Highbough.tsx`
   - `src/solvers/Highbough.solver.ts`
   - `src/games/index.ts`
   - `leetcode/specs/highbough.md`
   - `leetcode/curriculum.md`
   - `leetcode/learnings.md`
   - `leetcode/results.tsv`
   - `run-program.md`
4. `artifact_paths`:
   - `leetcode/specs/highbough.md`
   - `src/games/Highbough.tsx`
   - `src/solvers/Highbough.solver.ts`
5. `actual_scorecard`:
   - `solvability`: `100%`
   - `skill_depth`: `60.2%`
   - `counterintuitive_moves`: `3.9`
   - `drama`: `0.47`
   - `decision_entropy`: `2.07`
   - `info_gain_ratio`: `0.58`
   - `algorithm_alignment`: `100%`
   - `leetCode_fit`: `99.0%`
   - `best_alternative_gap`: `23.0%`
   - `invariant_pressure`: `49.3%`
   - `difficulty_breakpoint`: `D3`
6. `known_issues`:
   - Live blind browser play was not run in this sandbox. The blind report below is based on solver evaluation, direct UI inspection, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`.
   - The current teaching load sits heavily on the child-reading panel. If later live play shows that players still recount from the crown out of confusion rather than strategy, the panel needs stronger before/after emphasis rather than more rules.

## Blind Play Report

- `rules_clarity`: The leaf-at-1 rule and the child-reading panel make the local arithmetic readable. The main blind risk is whether players immediately internalize that a missing branch contributes `0` while an existing unfinished branch still blocks sealing.
- `easy_strategy`: Early play should feel like learning the rhythm "go down, seal the leaf, come back up." D1 still lets the player waste steps by running back to the crown after each success.
- `medium_strategy`: D2 should expose that the crown-reset recount is correct but clumsy. Players can still survive it, yet the better route already feels like finishing a subtree before abandoning it.
- `hard_strategy`: D3-D5 demand the full bottom-up routine. Once a child reading is sealed, the player must trust it, finish the sibling side, then certify the parent immediately.
- `strategy_evolution`: The expected shift is from "the crown is the goal, so I should keep returning there" to "every sealed child already is the subtree answer, so I only need the larger one plus one at the parent."
- `plain_english_pattern`: "Seal the leaves first, then whenever both child readings exist, keep the bigger child number and add one on the branch above them."
- `naive_vs_optimal`: The strongest wrong strategy is the crown-reset recount. It follows the right postorder target list but wastes climbs by restarting from the crown after every seal. That survives D1-D2 and then fails from D3 onward.
- `confusion_points`: Players may briefly treat an absent child and an unfinished child as the same thing. The current reading panel is doing most of the work to separate those cases.
- `bug_summary`: No blocking implementation bugs surfaced during solver evaluation, direct UI inspection, typecheck, or web export.
- `verdict`: keep

## Decision Memo

- `decision`: keep
- `why`: Highbough teaches the direct `Maximum Depth of Binary Tree` recurrence with a clean `D3` breakpoint and no abstraction gap between play and code. The kept build hit `100%` solvability, `99.0%` LeetCode fit, `23.0%` strongest-alternative gap, and a visible near miss that fails for the right reason: unnecessary crown resets.
- `evidence_used`: `node --experimental-strip-types --input-type=module` evaluation from `src/solvers/Highbough.solver.ts`, direct UI inspection, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`
- `bug_status`: no open implementation bugs
- `algorithm_alignment_judgment`: strong enough to claim Blind 75 `#104 Maximum Depth of Binary Tree` directly
- `next_action`: mark `#104` complete in the Blind 75 tracker and leave the next outer-loop pass for `#100 Same Tree`
- `polish_scope`: if a live blind browser session becomes available later, validate whether players distinguish absent children from unfinished children without extra prompting

## Concept Bridge

This game teaches the standard bottom-up `Maximum Depth of Binary Tree` routine. For the Blind 75 tracker, the kept `Highbough` game claims `#104 Maximum Depth of Binary Tree`.

The moment where a leaf seals at `1` maps to the base case after null children contribute `0`. The moment where a branch refuses to seal until both child readings exist maps to the recursive calls finishing before the current frame can return. The moment where the branch keeps the larger child reading and adds one maps directly to `return 1 + Math.max(depth(left), depth(right))`.
