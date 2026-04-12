# Spanbough

## Algorithm Game Spec

1. `game_name`: Spanbough
2. `algorithm_target`: 2.18 Tree Recursion / Split Path Gain
3. `core_insight`: Each branch must return only one one-sided gain upward, but it must also test whether both helpful child gains plus the current value create the best complete route seen anywhere in the tree. Harmful child gains count as zero instead of dragging the route down.
4. `one_line_pitch`: Climb a storm-bent canopy of bright and sour branches, certify one live route upward from each branch, and keep a separate record of the strongest full span even when it never reaches the crown.
5. `rules`:
   - A leaf may always seal and send its own value upward.
   - A non-leaf branch may seal only after every existing child branch below it is already sealed.
   - When a branch seals, its upward carry becomes `branch value + max(0, left carry, right carry)`.
   - The same seal also checks a local span of `branch value + max(0, left carry) + max(0, right carry)`.
   - The global best-span tracker keeps the highest local span seen anywhere in the canopy, even if that route never reaches the crown.
   - The run succeeds only when the whole canopy is sealed before the climb budget runs out.
6. `core_actions`:
   - descend to an unfinished child branch
   - certify a leaf so its own value becomes the returned route
   - backtrack after a subtree is finished
   - watch sour child routes clip to zero instead of being forced into the total
   - compare the one-sided upward carry against the two-sided local span at each branch
7. `algorithm_to_mechanic_mapping`:
   - The canopy is the binary tree.
   - Each branch value maps to `node.val`.
   - A sealed child route maps to the recursive gain returned from a child call.
   - Dropping a sour child route to zero maps to `max(0, childGain)`.
   - The branch's upward carry maps to `return node.val + max(0, leftGain, rightGain)`.
   - The local span card maps to `node.val + max(0, leftGain) + max(0, rightGain)`.
   - The best-span tracker maps to the separate global maximum updated at every node.
8. `why_greedy_fails`: The strongest near miss is crown-route fixation. It treats the whole puzzle like a single route that must survive all the way to the crown and pairs that misconception with wasteful crown resets after each seal. Easy boards tolerate it, but medium-plus boards hide the winning span inside a subtree and remove the spare climbs that made resets survivable.
9. `aha_moment`: "A branch can only send one side upward, but it should still test whether both helpful sides make the best route right here. If a child route hurts, I should ignore it completely."
10. `difficulty_progression`:
    - D1: Small canopies make one-sided carry and local span nearly the same.
    - D2: Sour child routes appear, so the player starts seeing that a finished subtree can still count as zero.
    - D3: Exact budgets punish crown resets and medium boards hide the best route below the crown.
    - D4: Deeper canopies chain several split decisions, so the player must keep both invariants alive while unwinding.
    - D5: Hard boards leave no spare motion and demand full trust in subtree returns plus local best-span updates.
11. `predicted_failure_mode`: If the dual readout between `carry up` and `span here` is not legible enough, the game risks collapsing into another generic bottom-up traversal instead of teaching the split between returned gain and global answer.
12. `acceptance_criteria`:
    - The winning explanation must mention that a branch sends only one helpful child route upward.
    - The same explanation must also mention that the best route can bend locally and live entirely below the crown.
    - Medium-plus boards must make sour child routes visibly count as zero rather than mandatory baggage.
    - The post-game bridge should claim Blind 75 `#124 Binary Tree Maximum Path Sum` directly and specifically.
13. `predicted_scorecard`:
    - `skill_depth`: `0.38` because crown-route fixation should survive Easy before D3 exact budgets and hidden subtree winners break it.
    - `counterintuitive_moves`: `3.2` because ignoring a sealed child route and separating local-span tracking from upward carry should both feel non-obvious.
    - `algorithm_alignment`: `1.00` because every durable run follows the same two-answer postorder routine used in code.
    - `greedy_optimal_gap`: `0.14` because the strongest near miss preserves most of the traversal order but wastes resets and misses subtree-local winners.
    - `difficulty_curve`: `D3`.
    - `insight_inflection`: `D3`.
14. `open_questions_for_engineering`:
    - Is the difference between `carry up` and `span here` visually strong enough on first play?
    - Do sour routes read as values that should be dropped, not as debts that must be honored because they were already earned?
    - Does the best-span tracker make subtree-local winners feel concrete enough without extra explanation?

## Implementation Packet

1. `version_id`: Spanbough v1
2. `algorithm_game_spec`: bottom-up canopy span certification with positive-only child contributions, one-sided upward carries, and a separate best-route tracker
3. `prototype_scope`: one `Spanbough` screen, five difficulty presets, rerollable canopies, solver evaluation against a crown-reset baseline, and a concept bridge for Blind 75 `#124`
4. `difficulty_scope`: D1-D2 allow crown-route fixation to survive; D3-D5 require true subtree-local accounting and exact traversal discipline
5. `non_goals`:
   - no claim that this pass covers `#297 Serialize and Deserialize Binary Tree`
   - no attempt to teach diameter or root-to-leaf variants in the same build
   - no live browser-play automation inside this sandbox if blind browser control remains unavailable
6. `predicted_scorecard`:
   - `solvability`: `1.00`
   - `skill_depth`: `0.38`
   - `counterintuitive_moves`: `3.2`
   - `algorithm_alignment`: `1.00`
   - `greedy_optimal_gap`: `0.14`

## Prototype Package

1. `game_entrypoint`: `src/games/Spanbough.tsx`
2. `difficulty_controls`: five difficulty chips plus `Reset Grove` and `New Grove`
3. `changed_files`:
   - `src/solvers/Spanbough.solver.ts`
   - `src/games/Spanbough.tsx`
   - `src/games/index.ts`
   - `leetcode/specs/spanbough.md`
   - `leetcode/curriculum.md`
   - `leetcode/learnings.md`
   - `leetcode/results.tsv`
   - `run-program.md`
4. `artifact_paths`:
   - `src/solvers/Spanbough.solver.ts`
   - `src/games/Spanbough.tsx`
   - `leetcode/specs/spanbough.md`
5. `actual_scorecard`:
   - `solvability`: `100%`
   - `skill_depth`: `50.6%`
   - `counterintuitive_moves`: `5.6`
   - `drama`: `0.42`
   - `decision_entropy`: `2.04`
   - `info_gain_ratio`: `0.60`
   - `algorithm_alignment`: `100%`
   - `leetCode_fit`: `99.0%`
   - `best_alternative_gap`: `12.1%`
   - `invariant_pressure`: `52.3%`
   - `difficulty_breakpoint`: `D3`
6. `known_issues`:
   - The evaluation baseline is a crown-reset recount, so the measured alternative gap captures traversal misuse more strongly than the semantic mistake of assuming the answer must pass through the crown.
   - Live blind browser play was not recorded in this sandbox. The blind report below is based on solver evaluation, direct UI inspection, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`.

## Blind Play Report

- `rules_clarity`: The route cards make the branch arithmetic legible, especially once the player notices that sour child routes collapse to `use 0`. The main blind risk is whether first-time players distinguish `carry up` from `span here` quickly enough.
- `easy_strategy`: D1 should feel like a friendly bottom-up climb. The player can mostly think "seal the leaves, then keep the better side" because the local best route usually still touches the crown.
- `medium_strategy`: D2 starts revealing the deeper lesson. Players should notice that some sealed child routes are real but still not worth carrying, and that the best route can already live off-center.
- `hard_strategy`: D3-D5 demand the full pattern: finish one subtree cleanly, trust the returned child gains, drop harmful gains to zero, and keep watching the local bend score instead of assuming the crown decides the answer.
- `strategy_evolution`: The expected shift is from "I am building one route to the top" to "every branch returns one best side upward, but the strongest complete route might finish right here."
- `plain_english_pattern`: "Seal the lower branches first, ignore any child route that would make things worse, carry only the better side upward, and still check whether both good sides make the strongest route at this branch."
- `naive_vs_optimal`: The strongest wrong strategy is crown-route fixation plus reset traversal. It keeps revisiting the crown and mentally treats the answer like one surviving top route. The optimal route keeps the same postorder rhythm but trusts subtree returns and a separate best-span tracker.
- `confusion_points`: The player may briefly assume that every sealed child route must remain attached because it has already been earned. The `use 0` readout has to stay visible so those sour routes feel intentionally dropped, not forgotten.
- `bug_summary`: No blocking implementation bugs surfaced during solver evaluation, direct UI inspection, typecheck, or web export. Browser automation playtesting was not run.
- `verdict`: keep

## Decision Memo

- `decision`: keep
- `why`: Spanbough teaches the key `Binary Tree Maximum Path Sum` split directly enough to justify a dedicated Blind 75 game: every subtree returns one best one-sided gain upward, while a separate tracker records the best full bend anywhere in the canopy. The kept build hit `100%` solvability, `99.0%` LeetCode fit, a visible `D3` breakpoint, and enough skill depth to survive the keep bar despite a modest measured alternative gap.
- `evidence_used`: `node --experimental-strip-types --input-type=module` evaluation from `src/solvers/Spanbough.solver.ts`, direct UI inspection, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`
- `bug_status`: no open implementation bugs
- `algorithm_alignment_judgment`: strong enough to claim Blind 75 `#124 Binary Tree Maximum Path Sum` directly
- `next_action`: mark `#124` complete in the Blind 75 tracker and leave the next outer-loop pass for `#297 Serialize and Deserialize Binary Tree`
- `polish_scope`: if a browser-capable blind session becomes available later, verify that first-play users understand why `span here` may beat the crown without extra onboarding

## Concept Bridge

This game teaches the postorder two-answer routine behind `Binary Tree Maximum Path Sum`. For the Blind 75 tracker, the kept `Spanbough` game claims `#124 Binary Tree Maximum Path Sum`.

The moment where a sour child route still exists but contributes `use 0` maps to `max(0, childGain)`. The moment where a branch sends up only one child side maps to the recursive return value that may choose only the better child. The moment where the local `span here` total can beat the crown maps to updating the global answer with `node.val + max(0, leftGain) + max(0, rightGain)` at every node.
