# Tracebough

## Algorithm Game Spec

1. `game_name`: Tracebough
2. `algorithm_target`: 2.17 Tree Reconstruction / Traversal Split Stack
3. `core_insight`: The next preorder crest always roots the current inorder plot. Find that crest in the ledger to split the plot, then bank the right child card first so the left child plot stays on top for the next crest.
4. `one_line_pitch`: Rebuild a grove from two trace ribbons by seating each next parade crest into the live ledger plot and stacking the split child cards in the only order that keeps the reconstruction moving.
5. `rules`:
   - The parade ribbon lists crest arrivals in preorder.
   - The ledger ribbon lists the same grove in inorder.
   - The top work card is the only live plot you may seat into next.
   - `Seat Root` uses the next parade crest on that top plot and fails if the crest does not belong inside the plot's ledger span.
   - When a seated crest splits the plot into both left and right child plots, you must bank both child cards onto the work stack before continuing.
   - `Swap Top Pair` can repair a bad banking order, but it still spends rope.
   - The run wins only when every parade crest is seated before the rope budget runs out.
6. `core_actions`:
   - seat the next preorder crest onto the live inorder plot
   - read the inorder split point to discover the left and right child plots
   - bank the right child card under the left child card so the left plot stays live next
   - spend a repair swap only when a wrong stack order has to be rescued
   - keep unwinding through the stack until no open plots remain
7. `algorithm_to_mechanic_mapping`:
   - The parade ribbon maps to the advancing preorder index.
   - The ledger ribbon maps to the inorder array plus the hash lookup from value to inorder index.
   - The top work card maps to the current recursive call's inorder bounds.
   - `Seat Root` maps to `rootVal = preorder[preIndex++]`.
   - Splitting the live plot at the seated crest maps to `mid = inorderIndex[rootVal]` and the left/right subtree ranges.
   - Banking the right child card before the left child card maps to using a stack or recursion so the left subtree is processed before the right subtree.
   - `Swap Top Pair` maps to a wasteful recovery path where the call stack order was chosen badly and extra bookkeeping is needed to fix it.
8. `why_greedy_fails`: The tempting near miss is to bank the left child card under the right child card because the parade goes left next. That sounds natural but it leaves the right child plot on top, so the next crest no longer fits the live plot. Easy boards leave enough rope for an emergency swap, but medium-plus boards remove that spare repair and force the true stack order.
9. `aha_moment`: "The next crest really does root this whole plot, but if I want the left child next, I have to stash the right child first."
10. `difficulty_progression`:
    - D1: Small groves allow one mistaken banking order to be repaired without losing the run.
    - D2: Wider splits make the stack structure visible, but forgiving rope still lets the repair policy survive.
    - D3: Exact-stack boards remove the spare repair and make the right-under-left banking order mandatory.
    - D4: Deeper groves chain several full splits, so the player must keep the call-stack ritual alive over longer traces.
    - D5: Hard groves leave no wasted motion beyond the exact preorder-plus-inorder reconstruction pattern.
11. `predicted_failure_mode`: If the work-stack cards do not stay visually distinct from the ledger ribbon, the player may treat the game like generic tree filling and miss that the true lesson is stack order, not just value lookup.
12. `acceptance_criteria`:
    - The stable winning explanation must mention that the next preorder crest roots the current inorder plot.
    - Medium-plus boards must punish the left-under-right banking order unless the player spends a recovery swap.
    - The post-game bridge should claim Blind 75 `#105 Construct Binary Tree from Preorder and Inorder Traversal` directly and specifically.
    - Solver evaluation should show a real breakpoint once swap-recovery runs out of rope.
13. `predicted_scorecard`:
    - `skill_depth`: `0.36` because the repair policy should survive Easy before exact-stack boards break it.
    - `counterintuitive_moves`: `2.8` because the key move is banking the right child first even though the left child is processed next.
    - `algorithm_alignment`: `1.00` because the durable route is the exact recursive reconstruction ritual.
    - `greedy_optimal_gap`: `0.30` because the swap-recovery near miss keeps the same information but wastes stack actions.
    - `difficulty_curve`: `D3`
    - `insight_inflection`: `D3`
14. `open_questions_for_engineering`:
    - Does the stack panel make "right under left" feel like a real structural decision rather than arbitrary ceremony?
    - Is the ledger highlight enough to show why the next crest no longer fits after a bad banking order?
    - Can the game stay legible without exposing too much of the final tree placement up front?

## Implementation Packet

1. `version_id`: Tracebough v1
2. `algorithm_game_spec`: Dual-ribbon tree reconstruction with a live work stack, exact preorder seating, inorder plot splits, and rope pressure against stack repair
3. `prototype_scope`: one `Tracebough` screen, five difficulty presets, rerollable groves, solver evaluation against a swap-recovery baseline, and post-game concept bridge
4. `difficulty_scope`: D1-D2 leave repair slack; D3-D5 require exact right-under-left banking at every full split
5. `non_goals`:
   - no claim that this pass covers `#124 Binary Tree Maximum Path Sum`
   - no variant that teaches iterative queue reconstruction or postorder reconstruction
   - no live browser-play capture inside this sandbox if blind automation remains unavailable
6. `predicted_scorecard`:
   - `solvability`: `1.00`
   - `skill_depth`: `0.36`
   - `counterintuitive_moves`: `2.8`
   - `algorithm_alignment`: `1.00`
   - `greedy_optimal_gap`: `0.30`

## Prototype Package

1. `game_entrypoint`: `src/games/Tracebough.tsx`
2. `difficulty_controls`: five difficulty chips plus `Reset Grove` and `New Grove`
3. `changed_files`:
   - `src/solvers/Tracebough.solver.ts`
   - `src/games/Tracebough.tsx`
   - `src/games/index.ts`
   - `leetcode/specs/tracebough.md`
   - `leetcode/curriculum.md`
   - `leetcode/learnings.md`
   - `leetcode/results.tsv`
   - `run-program.md`
4. `artifact_paths`:
   - `src/solvers/Tracebough.solver.ts`
   - `src/games/Tracebough.tsx`
   - `leetcode/specs/tracebough.md`
5. `actual_scorecard`:
   - `solvability`: `100%`
   - `skill_depth`: `39.5%`
   - `counterintuitive_moves`: `3.15`
   - `drama`: `0.69`
   - `decision_entropy`: `0.65`
   - `info_gain_ratio`: `1.00`
   - `algorithm_alignment`: `100%`
   - `leetCode_fit`: `99.0%`
   - `best_alternative_gap`: `39.5%`
   - `invariant_pressure`: `68.9%`
   - `difficulty_breakpoint`: `D3`
6. `known_issues`:
   - The stack mechanic is intentionally low-entropy because the live decision is usually "seat now" or "repair/order now"; that low branching is justified by the exact recursive stack alignment.
   - Live blind browser play was not recorded in this sandbox. The blind report below is based on solver evaluation, direct UI inspection, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`.

## Blind Play Report

- `rules_clarity`: The two ribbons plus the work stack make the reconstruction story legible. The main blind risk is whether a first-time player understands why banking the right child card first is what preserves the left child as the next live plot.
- `easy_strategy`: D1 should feel recoverable. A player can notice that the next parade crest belongs on the current plot and still survive one bad child-card order by spending a swap.
- `medium_strategy`: D2 is the rehearsal zone. The player should start seeing that the swap button is not a clever shortcut, only a repair tax for a bad stack decision.
- `hard_strategy`: D3-D5 demand the full ritual: seat the preorder crest, split the inorder plot, bank right under left, then repeat on the new top card until the stack clears.
- `strategy_evolution`: The expected shift is from "split the plot and fix mistakes later" to "the banking order itself is the recursion, so I should preserve the left child on top before the next crest arrives."
- `plain_english_pattern`: "The next parade crest owns the top plot. Find it in the ledger, split the plot there, and tuck the right child card under the left one so the left side stays next."
- `naive_vs_optimal`: The strongest wrong strategy keeps all the right information but banks child cards in the wrong order and pays for swap repairs. The optimal route uses no repairs because the stack is correct from the moment each split happens.
- `confusion_points`: If the player reads the stack as a history panel instead of live control state, the D3 breakpoint may feel abrupt. The top-card emphasis has to stay strong.
- `bug_summary`: No blocking implementation bugs surfaced during solver evaluation, direct UI inspection, typecheck, or web export. Browser automation playtesting was not run.
- `verdict`: keep

## Decision Memo

- `decision`: keep
- `why`: Tracebough teaches `Construct Binary Tree from Preorder and Inorder Traversal` directly enough to justify a dedicated Blind 75 game. The kept build hit `100%` solvability, `99.0%` LeetCode fit, a `39.5%` best-alternative gap, and the intended `D3` breakpoint where swap-recovery repairs stop fitting inside budget.
- `evidence_used`: `node --experimental-strip-types --input-type=module` evaluation from `src/solvers/Tracebough.solver.ts`, direct UI inspection, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`
- `bug_status`: no open implementation bugs
- `algorithm_alignment_judgment`: strong enough to claim Blind 75 `#105 Construct Binary Tree from Preorder and Inorder Traversal` directly
- `next_action`: mark `#105` complete in the Blind 75 tracker and leave the next outer-loop pass for `#124 Binary Tree Maximum Path Sum`
- `polish_scope`: when a browser-capable blind session is available, verify that the top-card emphasis is enough for first-play comprehension without extra onboarding

## Concept Bridge

This game teaches recursive tree reconstruction from preorder and inorder traversals. For the Blind 75 tracker, the kept `Tracebough` game claims `#105 Construct Binary Tree from Preorder and Inorder Traversal`.

The moment where you seat the next parade crest onto the live ledger plot maps to reading `preorder[preIndex]` as the current root. The moment where you split the ledger at that crest and bank the right child card under the left child card maps to finding the root in `inorder`, recursing into the left subtree first, and preserving the right subtree call for later on the call stack.
