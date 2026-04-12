# Chorusbough

## Algorithm Game Spec

1. `game_name`: Chorusbough
2. `algorithm_target`: 2.2 BFS
3. `core_insight`: In level-order traversal, the branches already waiting in the live frontier all belong to the current level. When one of them reveals children, those children must wait in the next frontier until the whole current level is finished.
4. `one_line_pitch`: Conduct a hidden canopy chorus by ringing the live rail from the front, shelving fresh children in the next rail, and filing one chorus sheet per tree level before the beat budget runs out.
5. `rules`:
   - The crown branch starts alone in the live rail.
   - The live rail always sings from the front.
   - When a branch sings, any existing left child and right child join the back of the next rail in that order.
   - The next chorus may open only after the live rail is empty.
   - Each completed chorus sheet records exactly one tree level.
   - The run succeeds only when the whole canopy is filed level by level before the beat budget runs out.
6. `core_actions`:
   - ring the front branch in the live rail
   - let fresh children queue behind the current chorus instead of following them immediately
   - advance to the next chorus only after the live rail is empty
   - keep filing chorus sheets until the canopy is exhausted
7. `algorithm_to_mechanic_mapping`:
   - The canopy is the binary tree.
   - The live rail is the current BFS frontier.
   - The next rail is the queue tail that accumulates the next level's nodes.
   - `Advance Wave` maps to moving from one level boundary to the next after exactly the current frontier has been processed.
   - Each chorus sheet maps to one nested list in the level-order output.
8. `why_greedy_fails`: The strongest near miss is the premature-dive sweep. As soon as the first child appears, the player tries to follow that fresh child and force a rail swap instead of finishing the rest of the current level. That works on narrow early canopies and then starts overrunning the budget once wider frontiers appear.
9. `aha_moment`: "A child that just appeared is not next. It belongs to the next chorus, so I need to finish everyone already waiting at this depth before I swap rails."
10. `difficulty_progression`:
    - D1: Narrow canopies make the front-of-rail rule readable and forgive a few premature swaps.
    - D2: Small sibling groups introduce the first real temptation to chase a newly revealed child instead of the rest of the live rail.
    - D3: Exact budgets make premature dives collapse; full frontier discipline becomes mandatory.
    - D4: Wider levels make the queue feel structural, not cosmetic.
    - D5: Deep mixed canopies require the full level-order ritual from crown to last leaf.
11. `predicted_failure_mode`: If the two rails are not visually distinct enough, the game risks reading like generic tree tapping instead of a frontier queue with a strict level boundary.
12. `acceptance_criteria`:
    - The winning pattern is describable as "finish the live rail from the front, let children wait in the next rail, then swap rails."
    - The strongest wrong strategy should be a plausible premature child dive, not random tapping.
    - D3 should be the first difficulty where the near miss stops fitting.
    - The post-game bridge should claim Blind 75 `#102 Binary Tree Level Order Traversal` directly and specifically.
13. `predicted_scorecard`:
    - `skill_depth`: `0.42` because early narrow trees should still let premature wave swaps survive before wider levels punish them.
    - `counterintuitive_moves`: `3.0` because leaving a fresh child untouched should feel strange at first.
    - `algorithm_alignment`: `1.00` because the durable route is the direct BFS frontier routine.
    - `greedy_optimal_gap`: `0.20` because the strongest near miss keeps the same information but wastes actions by crossing the level boundary too soon.
    - `difficulty_curve`: `D3`
    - `insight_inflection`: `D3`
14. `open_questions_for_engineering`:
    - Are the live and next rails distinct enough that players feel the boundary without extra jargon?
    - Does the canopy stay hidden enough that the player cannot solve by visual depth grouping alone?
    - Do the early narrow trees teach the rhythm without making the game feel automatic?

## Implementation Packet

1. `version_id`: Chorusbough v1
2. `algorithm_game_spec`: hidden-canopy frontier queue with a live rail, a next rail, chorus sheets, and budget pressure against premature child dives
3. `prototype_scope`: one `Chorusbough` screen, five difficulty presets, rerollable canopy shapes, hidden/discovered tree view, live and next queue rails, filed chorus sheets, route log, and solver evaluation against a premature-dive baseline
4. `difficulty_scope`: D1-D2 allow some narrow-canopy waste; D3-D5 require exact level-order frontier discipline
5. `non_goals`:
   - no claim that this pass covers other Blind 75 BFS problems directly
   - no live browser blind-play certification inside this sandbox
   - no DFS framing; this build is specifically teaching queue-based level-order traversal
6. `predicted_scorecard`:
   - `solvability`: `1.00`
   - `skill_depth`: `0.42`
   - `counterintuitive_moves`: `3.0`
   - `algorithm_alignment`: `1.00`
   - `greedy_optimal_gap`: `0.20`

## Prototype Package

1. `game_entrypoint`: `src/games/Chorusbough.tsx`
2. `difficulty_controls`: five difficulty chips plus `Reset Grove` and `New Grove`
3. `changed_files`:
   - `src/games/Chorusbough.tsx`
   - `src/solvers/Chorusbough.solver.ts`
   - `src/games/index.ts`
   - `leetcode/specs/chorusbough.md`
   - `leetcode/curriculum.md`
   - `leetcode/learnings.md`
   - `leetcode/results.tsv`
   - `run-program.md`
4. `artifact_paths`:
   - `leetcode/specs/chorusbough.md`
   - `src/games/Chorusbough.tsx`
   - `src/solvers/Chorusbough.solver.ts`
5. `actual_scorecard`:
   - `solvability`: `100%`
   - `skill_depth`: `71.0%`
   - `counterintuitive_moves`: `2.85`
   - `drama`: `0.50`
   - `decision_entropy`: `2.71`
   - `info_gain_ratio`: `1.74`
   - `algorithm_alignment`: `100%`
   - `leetCode_fit`: `99.0%`
   - `best_alternative_gap`: `24.2%`
   - `invariant_pressure`: `52.2%`
   - `difficulty_breakpoint`: `D3`
6. `known_issues`:
   - Live blind browser play was not available in this sandbox. The blind report below is based on solver evaluation, UI/component review, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`.
   - The teaching load sits heavily on the distinction between the live rail and the next rail. If later blind play shows that players still treat fresh children as immediate targets, the rail contrast should be strengthened before adding more rules.

## Blind Play Report

- `rules_clarity`: The queue rails and filed chorus sheets make the level-order goal legible. The main blind risk is whether the player immediately understands that a newly revealed child is visible now but still belongs to the next chorus.
- `easy_strategy`: Early runs should feel like "ring the front branch and keep going." Narrow canopies let a player survive a few premature swaps without losing the thread.
- `medium_strategy`: D2 starts to expose the temptation to follow the first fresh child instead of the rest of the current level. The queue boundary begins to matter here.
- `hard_strategy`: D3-D5 demand the full BFS rhythm. The player has to leave attractive fresh children waiting behind while finishing every branch already in the live rail.
- `strategy_evolution`: The expected shift is from "follow the newest branch because it is in front of me" to "all branches already waiting at this depth must finish before any child gets to sing."
- `plain_english_pattern`: "Take the next branch from the front, let its children wait in the next line, and only open that next line when the current one is empty."
- `naive_vs_optimal`: The strongest wrong strategy is the premature-dive sweep. It keeps trying to follow the first child that appears and to swap waves too early, leaking beats every time the current level still has siblings waiting.
- `confusion_points`: If the rails are read as two equal queues instead of "now" versus "later," the main insight gets diluted. The current styling is doing the critical teaching work there.
- `bug_summary`: No blocking implementation bugs surfaced during solver evaluation, typecheck, or web export.
- `verdict`: keep

## Decision Memo

- `decision`: keep
- `why`: Chorusbough teaches `Binary Tree Level Order Traversal` directly enough to justify a dedicated kept game for the BFS topic. The kept build hit `100%` solvability, `99.0%` LeetCode fit, a `24.2%` strongest-alternative gap, and the intended `D3` breakpoint where premature child dives stop fitting inside budget.
- `evidence_used`: `node --experimental-strip-types --input-type=module` evaluation from `src/solvers/Chorusbough.solver.ts`, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`
- `bug_status`: no open implementation bugs
- `algorithm_alignment_judgment`: strong enough to claim Blind 75 `#102 Binary Tree Level Order Traversal` directly
- `next_action`: mark `#102` complete in the Blind 75 tracker and leave the next outer-loop pass for `#98 Validate Binary Search Tree`
- `polish_scope`: when a browser-capable environment is available, run the blind playtester packet to confirm that the live-versus-next rail split is self-explanatory

## Concept Bridge

This game teaches queue-based level-order traversal on a binary tree. For the Blind 75 tracker, the kept `Chorusbough` game claims `#102 Binary Tree Level Order Traversal`.

The moment where the front branch in the live rail sings maps to popping the next node from the queue. The moment where its children join the next rail maps to pushing `left` and `right` children to the queue tail. The moment where a chorus sheet closes only after the live rail is empty maps to processing exactly one level before appending that row to the answer.
