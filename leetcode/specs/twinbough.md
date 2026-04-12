# Twinbough

## Algorithm Game Spec

1. `game_name`: Twinbough
2. `algorithm_target`: 2.12 Tree Recursion / Paired Equality
3. `core_insight`: Two binary trees are the same only when every paired branch matches in value and shape. The current pair is safe only after the left child pair and right child pair have already been proven safe too.
4. `one_line_pitch`: Patrol two groves in lockstep under one bark budget and prove they are twins by checking the current pair, finishing both child lanes, and certifying the parent only once.
5. `rules`:
   - `Go Left` and `Go Right` move across both groves at the same path.
   - `Check Pair` immediately exposes a break if one side is empty or the two visible crests differ.
   - A matching branch pair may certify only after every live child lane beneath it is already proven safe.
   - A lane where both child exits are absent counts as already safe.
   - `Climb Up` returns to the parent lane.
   - The run succeeds only when the player proves a break or certifies the crown before the bark budget runs out.
6. `core_actions`:
   - compare the current pair in place
   - descend into the left child pair
   - descend into the right child pair
   - climb back after a child proof is finished
   - certify the current branch pair once both child proofs are already in
7. `algorithm_to_mechanic_mapping`:
   - The two groves are the two input trees.
   - Moving left or right in lockstep maps to the paired recursive calls on `left` and `right`.
   - `Check Pair` exposing `crest vs empty` or `crest vs different crest` maps to the early `false` cases.
   - A branch pair refusing to certify until both child lanes are safe maps to `same(leftA, leftB) && same(rightA, rightB)`.
   - Certifying the crown pair maps to the final `true` return from the root call.
8. `why_greedy_fails`: The strongest near miss is the crown-reset lockstep scan. It still compares the correct paired lanes, but after every local proof it backs out too far before using the child result. That waste is survivable on easy boards and starts missing budgets once the deeper canopies arrive.
9. `aha_moment`: "I do not need to keep restarting from the crown. Once one child lane is proven safe, that child proof still counts when I come back to the parent."
10. `difficulty_progression`:
    - D1: Small twin and broken groves make pairwise comparison obvious and forgiving.
    - D2: Larger asymmetry introduces the first real cost for rechecking from above.
    - D3: Exact budgets remove the spare climbs, so local child proofs need to be reused immediately.
    - D4: Taller canopies make every unnecessary backtrack visible.
    - D5: Deep mixed-shape groves make the full lockstep recursion feel structural rather than cosmetic.
11. `predicted_failure_mode`: If the child-lane cards are unclear, the game risks reading like generic tree inspection instead of recursive pair certification.
12. `acceptance_criteria`:
    - The winning pattern is describable as "compare the current pair, finish the left pair, finish the right pair, then certify the parent."
    - The strongest wrong strategy should still be pairwise and plausible, not random wandering.
    - Medium pressure should expose that restarting from the crown wastes the bark budget.
    - The post-game bridge should claim Blind 75 `#100 Same Tree` directly and no other problem in this pass.
13. `predicted_scorecard`:
    - `skill_depth`: `0.32` because the crown-reset scan should feel close before deeper canopies punish it.
    - `counterintuitive_moves`: `3.5` because reusing a finished child proof is stronger than rechecking from above.
    - `algorithm_alignment`: `1.00` because the only durable winning plan is recursive pairwise equality.
    - `greedy_optimal_gap`: `0.20` because the near miss stays locally correct while wasting movement.
    - `difficulty_curve`: `D2`
    - `insight_inflection`: `D2`
14. `open_questions_for_engineering`:
    - Are the left/right lane cards clear enough that one-missing-side mismatches feel structural instead of arbitrary?
    - Does the log make already-proven child lanes feel reusable?
    - Do the false boards feel like "find the first break" rather than "hunt randomly for a bug"?

## Implementation Packet

1. `version_id`: Twinbough v1
2. `algorithm_game_spec`: side-by-side tree proof game for recursive pair equality with live child-lane certification and bark-budget pressure against crown resets
3. `prototype_scope`: one `Twinbough` screen, five difficulty presets, rerollable grove pairs, side-by-side tree boards, pair window, lane cards, route log, and solver evaluation against a wasteful crown-reset policy
4. `difficulty_scope`: D1 stays forgiving; D2-D5 increasingly punish retreating too far after each child proof
5. `non_goals`:
   - no claim that this pass covers `#572 Subtree of Another Tree`
   - no breadth-first framing; the build is specifically teaching recursive pair equality
   - no hidden-information layer beyond the visible paired tree structure and current lane cards
6. `predicted_scorecard`:
   - `solvability`: `1.00`
   - `skill_depth`: `0.32`
   - `counterintuitive_moves`: `3.5`
   - `algorithm_alignment`: `1.00`
   - `greedy_optimal_gap`: `0.20`

## Prototype Package

1. `game_entrypoint`: `src/games/Twinbough.tsx`
2. `difficulty_controls`: five difficulty chips plus `Reset Grove` and `New Grove`
3. `changed_files`:
   - `src/games/Twinbough.tsx`
   - `src/solvers/Twinbough.solver.ts`
   - `src/games/index.ts`
   - `leetcode/specs/twinbough.md`
   - `leetcode/curriculum.md`
   - `leetcode/learnings.md`
   - `leetcode/results.tsv`
   - `run-program.md`
4. `artifact_paths`:
   - `leetcode/specs/twinbough.md`
   - `src/games/Twinbough.tsx`
   - `src/solvers/Twinbough.solver.ts`
5. `actual_scorecard`:
   - `solvability`: `100%`
   - `skill_depth`: `36.4%`
   - `counterintuitive_moves`: `4.25`
   - `drama`: `0.37`
   - `decision_entropy`: `2.03`
   - `info_gain_ratio`: `1.11`
   - `algorithm_alignment`: `100%`
   - `leetCode_fit`: `98.0%`
   - `best_alternative_gap`: `25.4%`
   - `invariant_pressure`: `81.2%`
   - `difficulty_breakpoint`: `D2`
6. `known_issues`:
   - Live blind browser play was not run in this sandbox. The blind report below is based on solver evaluation, direct UI inspection, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`.
   - The main teaching load sits on the pair window and lane cards. If future live play shows that players still recheck from the crown out of confusion, those cues need strengthening before the rules grow.

## Blind Play Report

- `rules_clarity`: The side-by-side groves and lane cards make the lockstep comparison readable. The only blind risk is whether players immediately grasp that an already-proven child lane still counts when they return to the parent.
- `easy_strategy`: Early runs should feel like "look at both crests together, then walk into the left and right child lanes when they exist." False boards reveal that one missing side or one wrong crest is enough to call the break.
- `medium_strategy`: D2 should surface the first waste pattern: proving one child lane, climbing too far back, then walking the same path again instead of spending the proof immediately.
- `hard_strategy`: D3-D5 demand the full recursive rhythm. Players need to keep one child proof live in mind, finish the sibling lane, and certify the parent without restarting the whole comparison from above.
- `strategy_evolution`: The expected shift is from "keep checking from the crown because that feels safest" to "child proofs persist, so I should stay local and finish the pair I am already inside."
- `plain_english_pattern`: "Compare the two branches you are on. If they match, prove the left pair and right pair, then mark the parent safe once both child pairs are already safe."
- `naive_vs_optimal`: The strongest wrong strategy is the crown-reset scan. It stays pairwise and mostly correct, but it leaks actions by retreating too far after each local proof.
- `confusion_points`: Players may initially think a visible one-missing-side child lane can be judged from the parent without entering it. The current game steers them into that paired lane before the break is formally locked in.
- `bug_summary`: No blocking implementation bugs surfaced during solver evaluation, direct UI inspection, typecheck, or web export.
- `verdict`: keep

## Decision Memo

- `decision`: keep
- `why`: Twinbough teaches the direct recursive equality check for `Same Tree` without an abstraction gap between play and code. The kept build hit `100%` solvability, `98.0%` LeetCode fit, a defensible `25.4%` alternative gap, and a visible near miss where the player still compares the right pairs but wastes steps by backing out too far after each child proof.
- `evidence_used`: `node --experimental-strip-types --input-type=module` evaluation from `src/solvers/Twinbough.solver.ts`, direct UI inspection, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`
- `bug_status`: no open implementation bugs
- `algorithm_alignment_judgment`: strong enough to claim Blind 75 `#100 Same Tree` directly
- `next_action`: mark `#100` complete in the Blind 75 tracker and leave the next outer-loop pass for `#572 Subtree of Another Tree`
- `polish_scope`: if a live blind browser pass becomes available later, validate whether players naturally reuse finished child proofs or still need stronger lane-state emphasis

## Concept Bridge

This game teaches recursive pairwise equality on two binary trees. For the Blind 75 tracker, the kept `Twinbough` game claims `#100 Same Tree`.

The moment where `Check Pair` immediately exposes `crest vs empty` or `crest vs different crest` maps to the early `false` returns. The moment where a branch pair refuses to certify until both child lanes are already safe maps to `same(leftA, leftB) && same(rightA, rightB)`. The moment where the crown pair finally certifies maps to the root call returning `true`.
