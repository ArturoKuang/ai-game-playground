# Mainline

## Algorithm Game Spec

1. `game_name`: Mainline
2. `algorithm_target`: 2.7 Linked List Pointer Rewiring
3. `core_insight`: Merging two sorted linked chains is not a fresh sort. Keep one live departure tail, compare only the two visible head cars, couple the smaller head onto the tail, advance only that source, and stop comparing entirely once one siding empties because the untouched remainder is already in order.
4. `one_line_pitch`: Dispatch one sorted train from two sorted sidings by coupling the smaller live head onto a single tail and stitching the untouched remainder in one splice.
5. `rules`:
   - Two sidings arrive already sorted from front to back.
   - The player controls one departure tail that starts at a dummy dock.
   - `Couple Left` appends the left live head to the departure tail.
   - `Couple Right` appends the right live head to the departure tail.
   - If both sidings still have live heads, coupling the larger head fails immediately.
   - `Latch Remainder` is legal only after one siding empties and stitches the untouched chain onto the tail in one move.
   - Later difficulties remove the spare action that allowed the leftover chain to be coupled one car at a time.
6. `core_actions`:
   - compare only the two live head cars
   - couple the smaller head onto the departure tail
   - advance only the source that just fed the tail
   - stitch the untouched remainder once one siding is empty
7. `algorithm_to_mechanic_mapping`:
   - The departure rail tail is `tail`.
   - The left siding head is `list1`.
   - The right siding head is `list2`.
   - `Couple Left` maps to `tail.next = list1; list1 = list1.next; tail = tail.next`.
   - `Couple Right` maps to `tail.next = list2; list2 = list2.next; tail = tail.next`.
   - `Latch Remainder` maps to `tail.next = list1 ?? list2`.
   - The dummy dock maps to the standard dummy head used in the iterative merge.
8. `why_greedy_fails`: Two tempting mistakes drive the teaching. The first is "fair" alternation between sidings, which fails because sorted merge cares only about the smaller live head, not turn-taking. The second is the near miss: keep coupling the leftover chain one car at a time even after one siding empties. That still works on forgiving budgets but dies as soon as the splice move becomes mandatory.
9. `aha_moment`: "I do not need to inspect whole lists or reshuffle anything. I only need the two front cars, one output tail, and then one final stitch when a side runs out."
10. `difficulty_progression`:
    - D1: Tiny sidings teach the live-head comparison without remainder pressure.
    - D2: One side clears early, but there is still enough slack to finish the leftover chain one car at a time.
    - D3: The budget becomes exact, so the one-shot remainder splice is now required.
    - D4: Longer leftovers make the splice rule more visible and punish individual recoupling.
    - D5: Large sidings with no slack force the full merge invariant from start to finish.
11. `predicted_failure_mode`: If the departure tail is not legible enough, players may read the puzzle as generic number sorting instead of node-by-node rewiring onto one live output chain.
12. `acceptance_criteria`:
    - The winning pattern is describable as "compare the two heads, couple the smaller one, advance that side, then stitch the remainder."
    - Alternating sides fails for structural sorted-order reasons, not arbitrary penalties.
    - Coupling the leftover chain one car at a time survives early and then fails cleanly by D3.
    - The post-game bridge can claim Blind 75 `#21 Merge Two Sorted Lists` directly and specifically.
13. `predicted_scorecard`:
    - `skill_depth`: `0.42` because the strongest near miss should survive easy budgets before D3 forces the one-shot splice.
    - `counterintuitive_moves`: `0.38` because staying on the same siding repeatedly and then stopping comparison entirely for the remainder should both feel non-obvious.
    - `algorithm_alignment`: `1.00` because every successful move matches a line from the standard iterative merge.
    - `greedy_optimal_gap`: `0.45` because fair alternation breaks sorted order and leftover drip-coupling should become too slow by medium difficulty.
    - `difficulty_curve`: `D3`.
    - `insight_inflection`: `D3`.
14. `open_questions_for_engineering`:
    - Does the departure-tail summary keep the linked-list framing visible enough that this does not read as plain sorting?
    - Does the `Latch Remainder` label feel like a structural splice instead of a cheat button?
    - Are D1-D2 generous enough to reveal the leftover-chain shortcut before D3 hardens it into a requirement?

## Implementation Packet

1. `version_id`: Mainline v1
2. `algorithm_game_spec`: two sorted rail sidings feeding one departure tail, with exact-budget midgame levels that require a one-shot remainder splice
3. `prototype_scope`: one `Mainline` screen, five difficulty presets, rerollable fixed siding layouts, explicit head/tail summaries, departure-rail history, and solver evaluation for optimal vs near-miss merge policies
4. `difficulty_scope`: D1 teaches the head comparison, D2 reveals the splice shortcut without requiring it, and D3-D5 require `Latch Remainder` for a kept result
5. `non_goals`:
   - no second Blind 75 claim in this pass
   - no heap-based merge for `#23 Merge k Sorted Lists`
   - no recursive merge teaching in this build
6. `predicted_scorecard`:
   - `solvability`: `1.00`
   - `skill_depth`: `0.42`
   - `counterintuitive_moves`: `0.38`
   - `algorithm_alignment`: `1.00`
   - `greedy_optimal_gap`: `0.45`

## Prototype Package

1. `game_entrypoint`: `src/games/Mainline.tsx`
2. `difficulty_controls`: five difficulty chips plus `Reset Yard` and `New Yard`
3. `changed_files`:
   - `src/games/Mainline.tsx`
   - `src/solvers/Mainline.solver.ts`
   - `src/games/index.ts`
   - `leetcode/specs/mainline.md`
   - `leetcode/results.tsv`
   - `run-program.md`
4. `artifact_paths`:
   - `leetcode/specs/mainline.md`
   - `src/games/Mainline.tsx`
   - `src/solvers/Mainline.solver.ts`
5. `actual_scorecard`:
   - `solvability`: `100%`
   - `skill_depth`: `63.3%`
   - `counterintuitive_moves`: `45.2%`
   - `drama`: `73.9%`
   - `decision_entropy`: `1.51`
   - `info_gain_ratio`: `1.08`
   - `algorithm_alignment`: `100%`
   - `leetCode_fit`: `99.1%`
   - `best_alternative_gap`: `63.3%`
   - `invariant_pressure`: `52.3%`
   - `difficulty_breakpoint`: `D3`
6. `known_issues`:
   - Live blind browser play was not run in this sandbox. The blind report below is based on solver-driven state walkthroughs, direct UI inspection, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`.

## Blind Play Report

- `rules_clarity`: The left head, right head, and departure tail cards keep the merge state readable. The main copy risk is whether players instantly understand that `Latch Remainder` is the standard finish rather than a bonus shortcut.
- `easy_strategy`: Early play should feel like choosing whichever front car is smaller and attaching it to the output chain. D1 is simple enough that the linked-list tail can be learned without budget panic.
- `medium_strategy`: D2 should expose the key transfer: once one siding is empty, continuing car by car is legal but clumsy. D3 then hardens that observation into the actual required finish.
- `hard_strategy`: D4-D5 demand the full invariant: compare only the two live heads, stay on the same side as long as it keeps winning, and stop comparing once only one untouched chain remains.
- `strategy_evolution`: The expected shift is from "I am sorting two rows of numbers" to "I am extending one live chain from two already-sorted heads, and the leftover chain is already safe to splice whole."
- `plain_english_pattern`: "Keep one output tail, always take the smaller front car, move that lane forward, and once the other lane is empty just hook the rest on at once."
- `naive_vs_optimal`: Fair alternation fails immediately on sorted-order violations. The stronger near miss compares heads correctly but still burns extra actions by coupling the leftover chain one car at a time after a siding empties.
- `confusion_points`: The likely confusion point is emotional rather than mechanical: some players may hesitate to use `Latch Remainder` because it feels like skipping work even though it is the real linked-list splice.
- `bug_summary`: No blocking implementation bugs surfaced during solver verification, scripted D3 walkthroughs, typecheck, or web export.
- `verdict`: keep

## Decision Memo

- `decision`: keep
- `why`: Mainline teaches the exact iterative merge-two-sorted-lists loop directly enough to justify a dedicated linked-list game. The kept build hit `100%` solvability, `99.1%` LeetCode fit, `63.3%` strongest-alternative gap, and a clean `D3` breakpoint where one-by-one leftover coupling stops fitting.
- `evidence_used`: `node --input-type=module` evaluation from `src/solvers/Mainline.solver.ts`, a full D3 scripted walkthrough using the public solver APIs, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`
- `bug_status`: no open implementation bugs
- `algorithm_alignment_judgment`: strong enough to claim `#21 Merge Two Sorted Lists` directly
- `next_action`: mark `#21` complete in the Blind 75 tracker and leave the next outer-loop pass for `#141 Linked List Cycle`
- `polish_scope`: if a live blind browser session becomes available later, validate that `Latch Remainder` reads as a normal splice action rather than a special power-up

## Concept Bridge

This game teaches the iterative merge loop for `Merge Two Sorted Lists`. For the Blind 75 tracker, the kept `Mainline` game claims `#21 Merge Two Sorted Lists`.

The moment where you `Couple Left` maps to `tail.next = list1; list1 = list1.next; tail = tail.next`. The moment where you `Couple Right` maps to `tail.next = list2; list2 = list2.next; tail = tail.next`. The moment where you `Latch Remainder` maps to `tail.next = list1 ?? list2` once one source pointer is null. The broader transfer to `#23 Merge k Sorted Lists` is plausible, but this pass does not claim it.
