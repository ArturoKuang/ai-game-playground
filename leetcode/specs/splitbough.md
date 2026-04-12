# Splitbough

## Algorithm Game Spec

1. `game_name`: Splitbough
2. `algorithm_target`: 2.14 BST Split Navigation
3. `core_insight`: In a binary search tree, keep descending only while both targets still lie on the same side of the current branch. The first branch where they split, or where the current branch already matches one target, is the shared fork.
4. `one_line_pitch`: Patrol a search-tree canopy with two target markers, keep both markers alive on one side while you can, and stake the first branch where their routes diverge before the bark budget runs out.
5. `rules`:
   - The grove is a valid binary search tree with one current branch focus and two target values to reunite.
   - `Go Left`, `Go Right`, and `Climb Up` move through the grove one branch at a time.
   - `Claim Shared Fork` wins only at the true lowest branch that sits on both target routes.
   - If you claim the wrong branch or run out of bark budget first, the patrol fails.
6. `core_actions`:
   - compare the two target values against the current branch value
   - keep descending left only when both targets are smaller than the current branch
   - keep descending right only when both targets are larger than the current branch
   - stop and claim once the current branch is the first one where the two routes no longer stay on the same side
   - recover from wrong descents by climbing back up, but only if the budget still allows it
7. `algorithm_to_mechanic_mapping`:
   - The grove is the BST rooted at `root`; the two target medallions are `p` and `q`.
   - `Go Left` maps to the code branch where `p.val < node.val && q.val < node.val`.
   - `Go Right` maps to the code branch where `p.val > node.val && q.val > node.val`.
   - `Claim Shared Fork` maps to the `else return node` split case, including the case where `node` already equals one of the targets.
   - Bark budget pressure maps to the reason the BST ordering matters: you do not trace both routes separately when one shared descent already tells you where the answer must live.
8. `why_greedy_fails`: The strongest near miss is the separate-route trace. It searches down to one target, climbs back, then searches down to the other target before trying to infer the meeting branch from the overlap. That feels natural, especially because it still respects the BST ordering, but D3+ budgets expose how much needless travel it wastes once the player could have stopped at the first split instead.
9. `aha_moment`: "I do not need both full routes. I only need to keep both markers together until they stop sharing a side, then I should stop immediately."
10. `difficulty_progression`:
    - D1: Small canopies make the split rule visible and leave enough slack for route-tracing mistakes.
    - D2: The shared fork moves below the crown and some puzzles end when the current branch already matches one target.
    - D3: Exact budgets punish chasing one target all the way down before thinking about the other.
    - D4: Deeper canopies require multiple same-side descents before the split arrives.
    - D5: Long ladders plus ancestor-target cases force the full rule: keep both together, stop at the first split, do not over-descend.
11. `predicted_failure_mode`: If the targets are too visually obvious on the tree, players may solve by generic path-overlap staring instead of internalizing the BST split test.
12. `acceptance_criteria`:
    - The winning strategy is describable as "keep both targets on the same side until they split, then stop here."
    - The strongest wrong strategy should be separate target tracing with backtracking, not random wandering.
    - D3 should be the first difficulty where the route-tracing near miss reliably stops fitting.
    - The post-game bridge should claim Blind 75 `#235 Lowest Common Ancestor of a Binary Search Tree` directly and specifically.
13. `predicted_scorecard`:
    - `skill_depth`: `0.48` because the separate-route trace should survive Easy before the budget cuts it off on Medium.
    - `counterintuitive_moves`: `2.2` because stopping early at a non-target branch should be the key strategy shift.
    - `algorithm_alignment`: `1.00` because the durable route is the exact BST split rule.
    - `greedy_optimal_gap`: `0.24` because the strongest wrong strategy still finds the answer, but wastes travel.
    - `difficulty_curve`: `D3`
    - `insight_inflection`: `D3`
14. `open_questions_for_engineering`:
    - Can the target medallions stay legible without making the true fork visually trivial?
    - Is the wrong strategy pressure strong enough if the player can climb freely after overshooting?
    - Do ancestor-target cases read as a fair extension of the same split rule instead of a special exception?

## Implementation Packet

1. `version_id`: Splitbough v1
2. `algorithm_game_spec`: BST canopy patrol with one live branch focus, two target values, early-stop fork claiming, and budget pressure against tracing a full route to either target
3. `prototype_scope`: one `Splitbough` screen, five difficulty presets, rerollable BST groves, visible canopy board, current-exit cards, route log, and solver evaluation against target-trace backtracking baselines
4. `difficulty_scope`: D1-D2 still let a separate-route trace survive inside budget; D3-D5 require the exact split-point stop rule
5. `non_goals`:
   - no claim that this pass covers other Blind 75 BST problems directly
   - no live browser-play certification inside this sandbox if Chromium cannot launch
   - no generic binary-tree LCA framing; this build specifically teaches the BST ordering shortcut
6. `predicted_scorecard`:
   - `solvability`: `1.00`
   - `skill_depth`: `0.48`
   - `counterintuitive_moves`: `2.2`
   - `algorithm_alignment`: `1.00`
   - `greedy_optimal_gap`: `0.24`

## Prototype Package

1. `game_entrypoint`: `src/games/Splitbough.tsx`
2. `difficulty_controls`: five difficulty chips plus `Reset Grove` and `New Grove`
3. `changed_files`:
   - `src/games/Splitbough.tsx`
   - `src/solvers/Splitbough.solver.ts`
   - `src/games/index.ts`
   - `leetcode/specs/splitbough.md`
   - `leetcode/curriculum.md`
   - `leetcode/learnings.md`
   - `leetcode/results.tsv`
   - `run-program.md`
4. `artifact_paths`:
   - `leetcode/specs/splitbough.md`
   - `src/games/Splitbough.tsx`
   - `src/solvers/Splitbough.solver.ts`
5. `actual_scorecard`:
   - `solvability`: `100%`
   - `skill_depth`: `36.0%`
   - `counterintuitive_moves`: `1.00`
   - `drama`: `0.68`
   - `decision_entropy`: `1.47`
   - `info_gain_ratio`: `1.87`
   - `algorithm_alignment`: `100%`
   - `leetCode_fit`: `98.75%`
   - `best_alternative_gap`: `73.5%`
   - `invariant_pressure`: `78.5%`
   - `difficulty_breakpoint`: `D3`
6. `known_issues`:
   - Live blind browser play was not available in this sandbox. `node tools/playtest.mjs start splitbough` failed because Chromium could not launch, so the blind report below is based on solver evaluation, direct UI inspection, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`.
   - The `D1` and `D2` boards intentionally allow the target-trace route to survive so the split-stop insight arrives at `D3`. If later live play shows that players still brute-force by staring at the full canopy instead of comparing against the current branch, the visibility treatment will need another pass.

## Blind Play Report

- `rules_clarity`: The board makes the grove, current branch, and two target values readable without code context. The main blind risk is whether a player sees the targets as a route-overlap puzzle rather than realizing they never need both full routes.
- `easy_strategy`: D1 should feel intuitive even to a first-time player. A naive player can chase one target downward, back up once, and still claim the correct fork before the budget runs out.
- `medium_strategy`: D3 is the first real learning edge. The route-trace habit that survives on D1-D2 now overruns the bark budget, so the player has to stop as soon as the current branch is the first one that separates the two target values.
- `hard_strategy`: D4-D5 demand repeated same-side descents before the split arrives. The stable hard-mode pattern is to keep both markers alive together through the canopy and never overshoot into one marker lane.
- `strategy_evolution`: The expected shift is from "find one target, then recover upward" to "I only need the shared descent while both targets still point the same way; the moment they stop, I should claim."
- `plain_english_pattern`: "Keep both markers on the same side while you descend, then stop at the first branch where they no longer share that side."
- `naive_vs_optimal`: The strongest wrong strategy is tracing a full path to one target and then climbing back until the branch seems to cover both markers. The optimal strategy never needs that second half of the trip.
- `confusion_points`: Because the whole BST is visible, some players may initially try to solve by generic visual overlap. The budget pressure is doing the teaching work that converts that instinct into the current-branch comparison rule.
- `bug_summary`: No blocking implementation bugs surfaced during solver evaluation, direct UI inspection, typecheck, or web export. Browser automation playtesting was unavailable because Puppeteer could not launch Chromium in this sandbox.
- `verdict`: keep

## Decision Memo

- `decision`: keep
- `why`: Splitbough teaches `Lowest Common Ancestor of a Binary Search Tree` directly enough to justify a dedicated kept game. The kept build hit `100%` solvability, `98.75%` LeetCode fit, a strong `73.5%` best-alternative gap, and the intended `D3` breakpoint where target-trace backtracking finally stops fitting inside budget.
- `evidence_used`: `node --experimental-strip-types --input-type=module` evaluation from `src/solvers/Splitbough.solver.ts`, direct UI inspection, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`
- `bug_status`: no open implementation bugs
- `algorithm_alignment_judgment`: strong enough to claim Blind 75 `#235 Lowest Common Ancestor of a Binary Search Tree` directly
- `next_action`: mark `#235` complete in the Blind 75 tracker and leave the next outer-loop pass for `#102 Binary Tree Level Order Traversal`
- `polish_scope`: when a browser-capable environment is available, run the blind playtester packet to confirm that the full-canopy presentation does not let players bypass the BST split habit by pure route staring

## Concept Bridge

This game teaches BST split navigation. For the Blind 75 tracker, the kept `Splitbough` game claims `#235 Lowest Common Ancestor of a Binary Search Tree`.

The moment where you keep descending only while both target values still fall on the same side of the current branch maps to the code branches `if (p.val < node.val && q.val < node.val) node = node.left` and `if (p.val > node.val && q.val > node.val) node = node.right`. The moment where you stop at a non-target branch and claim it immediately maps to the `else return node` split case that makes the BST solution faster than tracing both full target routes.
