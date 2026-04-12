# Midmoor

## Algorithm Game Spec

1. `game_name`: Midmoor
2. `algorithm_target`: 2.1 Heap / Priority Queue
3. `core_insight`: Keep the lower half of the stream under one exposed max crown, keep the upper half under one exposed min crown, and ferry only the exposed crown across when the two halves drift out of balance. The median always lives on those crowns.
4. `one_line_pitch`: Moor a rising stream into two tide docks and keep the live centerline stable before the watch budget runs out.
5. `rules`:
   - Only one new buoy arrives at a time, and the next buoy does not appear until the harbor is settled again.
   - `Berth Lower` adds the live buoy to the deep dock, which keeps its largest buoy exposed as the crown.
   - `Berth Upper` adds the live buoy to the sky dock, which keeps its smallest buoy exposed as the crown.
   - `Ferry Deep Crown Up` moves the exposed deep crown into the sky dock.
   - `Ferry Sky Crown Down` moves the exposed sky crown into the deep dock.
   - A settled harbor must keep every deep-dock buoy less than or equal to every sky-dock buoy, and the dock sizes may differ by at most one.
   - The median seals only when the harbor is settled after the current arrival.
6. `core_actions`:
   - berth the live buoy into the deep or sky dock
   - read the exposed crowns as the current centerline
   - ferry one exposed crown across when the split breaks
   - seal one new median only after the docks settle again
   - finish the whole stream before the tide ledger closes
7. `algorithm_to_mechanic_mapping`:
   - The deep dock maps to the max-heap for the lower half of the stream.
   - The sky dock maps to the min-heap for the upper half of the stream.
   - The exposed dock crowns map to the heap roots returned by `peek()`.
   - `Berth Lower` and `Berth Upper` map to `addNum(num)` pushing into one heap.
   - The crown ferries map to the rebalance pop-and-push steps that restore the size invariant.
   - The median ledger maps to `findMedian()` reading either one crown or the average of both crowns.
8. `why_greedy_fails`: The tempting near miss is to treat the problem as pure size balancing and always berth into the shorter dock first. That looks tidy on easy tides, but medium-plus streams place low values high and high values low unless the player respects the live split line. Recovering from that with crown ferries burns the exact slack that disappears at D3.
9. `aha_moment`: "The median is not buried somewhere in the whole harbor. It is always sitting on the exposed crowns if the two halves stay legal."
10. `difficulty_progression`:
    - D1: Short practice tides let players feel that the crowns define the centerline without punishing drift.
    - D2: Longer tides still allow rescue ferries, so balance-first habits remain plausible.
    - D3: Exact budgets remove slack and force correct side placement before rebalancing.
    - D4: Alternating high and low arrivals make wrong-side berths trigger multi-ferry repairs that immediately miss budget.
    - D5: Long storm ledgers leave no spare motion; only the true dual-heap split survives.
11. `predicted_failure_mode`: If the dock crowns are not visually prominent enough, the game can read like generic bucket sorting instead of a live median maintained by two priority structures.
12. `acceptance_criteria`:
    - Winning players should describe two halves that stay centered around the live middle, not generic sorting.
    - D3 must be the first clear breakpoint where balance-first play stops fitting inside budget.
    - The post-game bridge should claim Blind 75 `#295 Find Median from Data Stream` directly and specifically.
    - Solver evaluation should show 100% solvability with a measurable gap against the balance-first alternative.
13. `predicted_scorecard`:
    - `skill_depth`: `0.38`
    - `counterintuitive_moves`: `2.5`
    - `algorithm_alignment`: `0.95`
    - `greedy_optimal_gap`: `0.25`
    - `difficulty_curve`: `D3`
    - `insight_inflection`: `D3`
14. `open_questions_for_engineering`:
    - Do the two docks read clearly enough as distinct lower and upper halves instead of two generic storage bins?
    - Is the crown ferry language concrete enough that rebalance steps feel structural rather than arbitrary?
    - Does the median ledger make the reward for settling after each arrival legible on first play?

## Implementation Packet

1. `version_id`: Midmoor v1
2. `algorithm_game_spec`: dual-harbor median stream with one live arrival, two crowned docks, crown-ferry rebalancing, and a median ledger that seals after every settled arrival
3. `prototype_scope`: one `Midmoor` screen, five difficulty presets, rerollable tide streams, solver evaluation against a balance-first alternative, and a direct Blind 75 concept bridge for `#295`
4. `difficulty_scope`: D1-D2 include rescue slack; D3-D5 require exact lower/upper placement plus minimal crown ferries
5. `non_goals`:
   - no shared Blind 75 claim for `#23 Merge k Sorted Lists` in this pass
   - no attempt to teach heap maintenance internals like sift-up and sift-down as a separate puzzle
   - no live browser automation inside this sandbox if blind browser control remains unavailable
6. `predicted_scorecard`:
   - `solvability`: `1.00`
   - `skill_depth`: `0.38`
   - `counterintuitive_moves`: `2.5`
   - `algorithm_alignment`: `0.95`
   - `greedy_optimal_gap`: `0.25`

## Prototype Package

1. `game_entrypoint`: `src/games/Midmoor.tsx`
2. `difficulty_controls`: five difficulty chips plus `Reset Harbor` and `New Tide`
3. `changed_files`:
   - `src/solvers/Midmoor.solver.ts`
   - `src/games/Midmoor.tsx`
   - `src/games/index.ts`
   - `leetcode/specs/midmoor.md`
   - `leetcode/learnings.md`
   - `leetcode/results.tsv`
   - `run-program.md`
4. `artifact_paths`:
   - `src/solvers/Midmoor.solver.ts`
   - `src/games/Midmoor.tsx`
   - `leetcode/specs/midmoor.md`
5. `actual_scorecard`:
   - `solvability`: `100%`
   - `skill_depth`: `42.0%`
   - `counterintuitive_moves`: `2.7`
   - `drama`: `0.44`
   - `decision_entropy`: `1.00`
   - `info_gain_ratio`: `1.35`
   - `algorithm_alignment`: `97.0%`
   - `leetCode_fit`: `96.5%`
   - `best_alternative_gap`: `28.2%`
   - `invariant_pressure`: `100%`
   - `difficulty_breakpoint`: `D3`
6. `known_issues`:
   - The game abstracts away heap-internal sift mechanics and teaches only the exposed-root behavior plus rebalance invariant.
   - Live blind browser play was not recorded in this sandbox. The blind report below is based on solver evaluation, direct UI inspection, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`.

## Blind Play Report

- `rules_clarity`: The stream, two docks, and median ledger make the objective legible quickly. The key onboarding risk is whether first-time players immediately understand that the deep dock is about value range, not just current size.
- `easy_strategy`: Early play should feel like "keep smaller buoys low and larger buoys high." D1-D2 allow enough rescue ferries that the player can recover while noticing that the crowns define the centerline.
- `medium_strategy`: On D2 the player should start saying that the exposed deep crown is the highest low buoy and the exposed sky crown is the lowest high buoy, so the split line matters more than raw dock size.
- `hard_strategy`: D3-D5 demand the full ritual: berth by the live split, then ferry only the exposed crown if one side grows too heavy. Any wrong-side berth turns into an expensive recovery chain immediately.
- `strategy_evolution`: The expected shift is from "keep the docks evenly filled" to "keep the two halves legal by value first, then rebalance sizes with the exposed crown only."
- `plain_english_pattern`: "Everything below the middle lives in one dock, everything above it lives in the other, and the median is always sitting on the dock crowns if I keep them balanced."
- `naive_vs_optimal`: The strongest wrong strategy is balance-first mooring. It feels clean because the dock counts stay even, but medium-plus tides prove that even counts are useless if the wrong values crossed the split and now need rescue ferries.
- `confusion_points`: Some players may initially trust dock size more than dock value, so the crown labels and median ledger need to stay visible together.
- `bug_summary`: No blocking implementation bugs surfaced during solver evaluation, direct UI inspection, typecheck, or web export. Browser automation playtesting was not run.
- `verdict`: keep

## Decision Memo

- `decision`: keep
- `why`: Midmoor teaches the dual-heap median-stream routine directly enough to justify a dedicated Blind 75 game. The kept build hit `100%` solvability, `97.0%` algorithm alignment, `96.5%` LeetCode fit, a clear `D3` breakpoint, and a `28.2%` best-alternative gap against the strongest balance-first near miss.
- `evidence_used`: `node --experimental-strip-types --input-type=module` evaluation from `src/solvers/Midmoor.solver.ts`, direct UI inspection, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`
- `bug_status`: no open implementation bugs
- `algorithm_alignment_judgment`: strong enough to claim Blind 75 `#295 Find Median from Data Stream` directly
- `next_action`: mark `#295` complete in the Blind 75 tracker and leave the next outer-loop pass for `#39 Combination Sum`
- `polish_scope`: if browser-capable blind play becomes available later, verify whether first-time players infer the lower-half versus upper-half split before they fall back to dock-size heuristics

## Concept Bridge

This game teaches the two-heap split behind `Find Median from Data Stream`. For the Blind 75 tracker, the kept `Midmoor` game claims `#295 Find Median from Data Stream`.

The moment where you keep every lower-half buoy under the deep crown and every upper-half buoy under the sky crown maps to maintaining a max-heap and a min-heap around the stream median. The moment where you ferry one exposed crown across to re-center the harbor maps to popping from the larger heap and pushing into the other heap so `findMedian()` can read the answer directly from the roots.
