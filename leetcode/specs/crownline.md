# Crownline

## Algorithm Game Spec

1. `game_name`: Crownline
2. `algorithm_target`: 2.1 Heap / Priority Queue
3. `core_insight`: Merging many sorted linked chains is not repeated pairwise merging and not constant full rescans. Keep exactly one live head from each non-empty chain on a min-ordered crown ladder, always dispatch the crowned smallest head onto the outbound tail, then refill only that same lane and restore the ladder through the smaller child.
4. `one_line_pitch`: Dispatch one sorted outbound rail from many sorted sidings by keeping one live head per lane on a crown ladder and always sending the crowned cheapest car next.
5. `rules`:
   - Every siding is already sorted from front to back.
   - The crown ladder may hold only one live head from each non-empty siding.
   - `Dispatch Crown` sends the crowned smallest live head onto the outbound rail.
   - After a dispatch, only the lane that just moved can refill the crown slot.
   - If the replacement breaks the crown order, the player must repair it with `Swap Left` and `Swap Right`.
   - A swap is legal only when the chosen child is lower than the marked repair slot.
   - Later difficulties remove the spare swaps that once tolerated repairing through the wrong child first.
6. `core_actions`:
   - read the current crowned head and the two children beneath the repair slot
   - dispatch the crowned smallest live head
   - refill only the just-used lane
   - sift the dropped replacement through the smaller child until the ladder is ordered again
7. `algorithm_to_mechanic_mapping`:
   - The crown ladder is the min-heap of active list heads.
   - The outbound rail tail is the merged linked list tail.
   - `Dispatch Crown` maps to `node = heap.pop(); tail.next = node; tail = tail.next`.
   - The automatic refill from the same siding maps to `if (node.next) heap.push(node.next)`.
   - `Swap Left` and `Swap Right` are the playable sift-down steps that restore the heap after replacement.
   - Emptying a siding and pulling the last live head up to the crown maps to the usual heap root replacement when no next node exists.
8. `why_greedy_fails`: The strongest near miss is not random guessing. It still knows the root must be repaired, but it repairs by habit, favoring one side of the fork instead of comparing both children and choosing the smaller one. That survives easy slack and then dies exactly when the heap invariant becomes tight.
9. `aha_moment`: "I do not need to compare every lane from scratch. I only need one live head per lane, the crowned smallest one next, and the smaller child whenever the replacement drops out of order."
10. `difficulty_progression`:
    - D1: Three lanes make the crown rhythm legible while side-biased repairs still fit under the horn.
    - D2: Four lanes increase repair forks, but the best wrong repair policy still survives with wasted swaps.
    - D3: The spare swaps disappear; the smaller-child choice becomes mandatory.
    - D4: Five lanes force repeated refills and make crown discipline feel structural.
    - D5: Longer sidings demand the full heap-maintenance ritual from start to finish.
11. `predicted_failure_mode`: If the marked repair slot is not visually strong enough, the puzzle can read like a generic sorting chore instead of one live min-heap that only changes along the popped lane.
12. `acceptance_criteria`:
    - The winning pattern is describable as "keep one live head per lane, send the crown, refill that lane, and repair through the smaller child."
    - The strongest wrong policy should still feel intelligent and survive D1-D2 before failing by D3.
    - The player should feel that only one lane changes after each dispatch.
    - The post-game bridge can claim Blind 75 `#23 Merge k Sorted Lists` directly and specifically.
13. `predicted_scorecard`:
    - `skill_depth`: `0.52` because the side-biased repair policy should survive easy budgets and then break sharply once the horn goes exact.
    - `counterintuitive_moves`: `6.0` because repeated dispatches from the same lane and smaller-child repairs should both feel non-obvious.
    - `algorithm_alignment`: `1.00` because every successful loop is the heap-backed k-way merge.
    - `greedy_optimal_gap`: `0.55` because the best wrong repair heuristic should spend several extra swaps before medium budgets reject it.
    - `difficulty_curve`: `D3`.
    - `insight_inflection`: `D3`.
14. `open_questions_for_engineering`:
    - Does the marked repair slot make the sift-down obligation readable enough on mobile without feeling like a tutorial overlay?
    - Are the D1-D2 horn budgets generous enough that the wrong-side repair can survive without collapsing the concept too early?
    - Does the automatic refill from the dispatched lane stay visible enough that players connect it to "only one list changes"?

## Implementation Packet

1. `version_id`: Crownline v1
2. `algorithm_game_spec`: multi-lane sorted dispatch game with one live head per lane on a repairable crown ladder
3. `prototype_scope`: one `Crownline` screen, five difficulty presets, rerollable fixed yards, crown/repair summaries, lane state chips, a heap-ladder board, and solver evaluation against side-biased repair policies
4. `difficulty_scope`: D1-D2 allow the strongest wrong repair policy to survive, while D3-D5 require the true smaller-child sift
5. `non_goals`:
   - no second Blind 75 claim in this pass
   - no attempt to teach divide-and-conquer merge-k in this build
   - no median-stream claim for `#295` in this pass
6. `predicted_scorecard`:
   - `solvability`: `1.00`
   - `skill_depth`: `0.52`
   - `counterintuitive_moves`: `6.0`
   - `algorithm_alignment`: `1.00`
   - `greedy_optimal_gap`: `0.55`

## Prototype Package

1. `game_entrypoint`: `src/games/Crownline.tsx`
2. `difficulty_controls`: five difficulty chips plus `Reset Yard` and `New Yard`
3. `changed_files`:
   - `src/games/Crownline.tsx`
   - `src/solvers/Crownline.solver.ts`
   - `src/games/index.ts`
   - `leetcode/specs/crownline.md`
   - `leetcode/curriculum.md`
   - `leetcode/results.tsv`
   - `run-program.md`
4. `artifact_paths`:
   - `leetcode/specs/crownline.md`
   - `src/games/Crownline.tsx`
   - `src/solvers/Crownline.solver.ts`
5. `actual_scorecard`:
   - `solvability`: `100%`
   - `skill_depth`: `66.9%`
   - `counterintuitive_moves`: `11.8`
   - `drama`: `0.16`
   - `decision_entropy`: `1.43`
   - `info_gain_ratio`: `0.55`
   - `algorithm_alignment`: `100%`
   - `leetCode_fit`: `99.0%`
   - `best_alternative_gap`: `66.9%`
   - `invariant_pressure`: `66.9%`
   - `difficulty_breakpoint`: `D3`
6. `known_issues`:
   - Live blind browser play was not run in this sandbox. The blind report below is based on solver-driven state walkthroughs, direct UI inspection, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`.
   - D5 is still a long yard. It teaches the invariant cleanly, but later polish could explore shortening hard-mode move counts without blurring the heap maintenance rhythm.

## Blind Play Report

- `rules_clarity`: The crown, repair slot, and lane-head chips keep the local state readable. The key copy burden is making "repair the marked slot through the lower child" feel like normal yard work rather than a hidden algorithm lesson.
- `easy_strategy`: Early play should feel like a simple loop: send the crown, watch one lane refill, and keep the crown on top. D1-D2 allow a player to get away with a few side habits while still noticing the cleaner smaller-child repair.
- `medium_strategy`: D3 is where the lesson hardens. Once the horn budget goes exact, a repair that follows the wrong child leaves just enough wasted motion to miss the finish.
- `hard_strategy`: D4-D5 demand the full invariant: one live head per lane, only one lane changes after each dispatch, and the repair slot must always trade with the lower child until the ladder is ordered again.
- `strategy_evolution`: The expected shift is from "I am re-sorting a bunch of rows" to "I am maintaining one live ranking of current row heads, and only the row I just used can change."
- `plain_english_pattern`: "Keep one front car from every lane on the ladder, send the top one, replace it from that same lane, and keep sliding the dropped one under the lower child until the top is honest again."
- `naive_vs_optimal`: The strongest wrong strategy is side-biased repair, not random play. It still tries to fix the ladder, but it refuses to compare both children at a fork. That wastes enough swaps that D3 becomes the break point.
- `confusion_points`: The likely confusion point is whether a refill from the dispatched lane happened automatically or because the player chose it. The lane chips and crew log are carrying that explanation.
- `bug_summary`: No blocking implementation bugs surfaced during solver verification, scripted D3 walkthroughs, typecheck, or web export.
- `verdict`: keep

## Decision Memo

- `decision`: keep
- `why`: Crownline teaches the heap-backed k-way merge loop directly enough to justify a dedicated Blind 75 game for `Merge k Sorted Lists`. The kept build hit `100%` solvability, `99.0%` LeetCode fit, a `66.9%` strongest-alternative gap, and a clean `D3` breakpoint where side-biased repair stops fitting under the horn.
- `evidence_used`: `node --experimental-strip-types --input-type=module` evaluation from `src/solvers/Crownline.solver.ts`, a full D3 scripted walkthrough using the public solver APIs, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`
- `bug_status`: no open implementation bugs
- `algorithm_alignment_judgment`: strong enough to claim `#23 Merge k Sorted Lists` directly
- `next_action`: mark `#23` complete in the Blind 75 tracker and leave the next outer-loop pass for `#226 Invert Binary Tree`
- `polish_scope`: if a live blind browser session becomes available later, validate that the automatic lane refill reads clearly and consider trimming hard-yard move counts without losing the D3 breakpoint

## Concept Bridge

This game teaches the heap-backed `Merge k Sorted Lists` loop. For the Blind 75 tracker, the kept `Crownline` game claims `#23 Merge k Sorted Lists`.

The crowned ladder head maps to `heap.pop()`. The outbound rail append maps to `tail.next = node; tail = tail.next`. The automatic refill from the same siding maps to `if (node.next) heap.push(node.next)`. The `Swap Left` and `Swap Right` repair actions are the playable sift-down steps that restore the min-heap after the replacement node drops into the crown slot. The broader transfer to `#295 Find Median from Data Stream` is plausible because both rely on priority-queue thinking, but this pass does not claim it.
