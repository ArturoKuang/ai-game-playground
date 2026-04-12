# Backhaul

## Algorithm Game Spec

1. `game_name`: Backhaul
2. `algorithm_target`: 2.7 Linked List Pointer Rewiring
3. `core_insight`: Reversing a linked chain safely is a three-beat loop, not one dramatic flip. Before you swing the live hitch backward, first bank the forward car somewhere safe. Then point the live hitch back toward the anchor, advance both handles, and repeat until no live car remains.
4. `one_line_pitch`: Reverse a freight convoy with one spare clip by saving the next car before you swing the current hitch backward and march the anchor forward.
5. `rules`:
   - A convoy begins linked head-to-tail from left to right.
   - The player sees the current `Anchor`, the `Live Car`, and one `Scout Clip`.
   - `Clip Ahead` stores the live car's forward neighbor, or confirms open dock if the live car is already the tail.
   - `Swing Back` points the live hitch toward the anchor or dock.
   - `March Anchor` promotes the live car into the reversed chain and moves onto the saved car.
   - If the player swings before clipping ahead, the remaining convoy drifts away.
   - Later difficulties tighten the yard timer so redundant clip checks stop fitting.
6. `core_actions`:
   - save the car ahead before touching the current hitch
   - swing the current hitch backward
   - advance the anchor and live handle together
   - repeat until the live handle becomes empty
7. `algorithm_to_mechanic_mapping`:
   - The `Anchor` is `prev`.
   - The `Live Car` is `current`.
   - The `Scout Clip` is `next`.
   - `Clip Ahead` maps to `next = current.next`.
   - `Swing Back` maps to `current.next = prev`.
   - `March Anchor` maps to `prev = current; current = next`.
   - Reaching an empty live handle maps to returning the new head `prev`.
8. `why_greedy_fails`: The tempting wrong move is to flip the current hitch immediately because that looks like the point of the puzzle. But if the forward car was not saved first, the unreversed tail becomes unreachable. The second tempting wrong move is cautious over-checking: re-clip the same forward car for reassurance. That survives only on easy budgets and dies once the timer tightens.
9. `aha_moment`: "I cannot fix the current car first. I have to save where it was going, then turn it around, then walk forward onto the saved car."
10. `difficulty_progression`:
    - D1: Short convoys allow one redundant re-check, so the three-beat rhythm is visible without harsh punishment.
    - D2: Three-car chains still tolerate cautious play, but the repeated clip check already feels wasteful.
    - D3: The spare slack disappears; clip once, swing once, march once becomes mandatory.
    - D4: Longer convoys amplify both failure modes, so panic flips and redundant checks both collapse.
    - D5: Six-car chains with no slack force the exact pointer-rewiring loop end to end.
11. `predicted_failure_mode`: If the UI does not make the saved forward car legible enough, players may misread the puzzle as simple left-facing rewiring and not feel why the spare clip matters.
12. `acceptance_criteria`:
    - The winning pattern is describable as "save next, reverse current, advance both handles."
    - Immediate flips fail for structural reasons, not just arbitrary punishment.
    - Redundant clip checks survive early and then fail cleanly by D3.
    - The post-game bridge can claim Blind 75 `#206 Reverse Linked List` directly and specifically.
13. `predicted_scorecard`:
    - `skill_depth`: `0.45` because cautious re-checking should stay viable on early convoys before medium budgets force the exact ritual.
    - `counterintuitive_moves`: `0.55` because storing the future before fixing the present should feel backwards at first.
    - `algorithm_alignment`: `1.00` because every successful move is one line from the canonical iterative loop.
    - `greedy_optimal_gap`: `0.55` because immediate flips sever the tail and re-checking should become too expensive by medium difficulty.
    - `difficulty_curve`: `D3`.
    - `insight_inflection`: `D3`.
14. `open_questions_for_engineering`:
    - Does the convoy map make the saved forward car legible enough when the scout clip is holding the tail's null edge?
    - Do players read `March Anchor` as a natural handoff rather than ceremonial bookkeeping?
    - Is the D1-D2 slack enough to teach the rhythm without making the puzzle feel solved by button order memorization alone?

## Implementation Packet

1. `version_id`: Backhaul v1
2. `algorithm_game_spec`: convoy relinking game with one spare clip, explicit live/anchor handles, and a budget ladder that kills redundant checks at D3
3. `prototype_scope`: one `Backhaul` screen, five difficulty presets, rerollable fixed convoys, explicit anchor/live/scout summaries, and a convoy map that shows each car's current pointer target
4. `difficulty_scope`: D1-D2 allow cautious extra clip checks, D3 removes the slack, and D4-D5 scale the same invariant onto longer chains
5. `non_goals`:
   - no shared Blind 75 claim for `#21 Merge Two Sorted Lists` in this pass
   - no recursive linked-list teaching in this build
   - no generic pointer-manipulation tutorial beyond iterative reversal
6. `predicted_scorecard`:
   - `solvability`: `1.00`
   - `skill_depth`: `0.45`
   - `counterintuitive_moves`: `0.55`
   - `algorithm_alignment`: `1.00`
   - `greedy_optimal_gap`: `0.55`

## Prototype Package

1. `game_entrypoint`: `src/games/Backhaul.tsx`
2. `difficulty_controls`: five difficulty chips plus `Reset Convoy` and `New Convoy`
3. `changed_files`:
   - `src/games/Backhaul.tsx`
   - `src/solvers/Backhaul.solver.ts`
   - `src/games/index.ts`
   - `leetcode/curriculum.md`
   - `leetcode/specs/backhaul.md`
   - `leetcode/learnings.md`
   - `leetcode/results.tsv`
   - `run-program.md`
4. `artifact_paths`:
   - `leetcode/specs/backhaul.md`
   - `src/games/Backhaul.tsx`
   - `src/solvers/Backhaul.solver.ts`
5. `actual_scorecard`:
   - `solvability`: `100%`
   - `skill_depth`: `66.5%`
   - `counterintuitive_moves`: `71.0%`
   - `drama`: `75.7%`
   - `decision_entropy`: `1.58`
   - `info_gain_ratio`: `1.16`
   - `algorithm_alignment`: `100%`
   - `leetCode_fit`: `99.1%`
   - `best_alternative_gap`: `66.5%`
   - `invariant_pressure`: `66.1%`
   - `difficulty_breakpoint`: `D3`
6. `known_issues`:
   - Live blind browser play was not run in this sandbox. The blind report below is based on solver-driven state walkthroughs, direct UI inspection, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`.

## Blind Play Report

- `rules_clarity`: The three-handle HUD keeps the decision surface tight. The main risk is whether players immediately understand that "Tail" in the scout clip means the null edge was safely saved, not that a real extra car is waiting.
- `easy_strategy`: Early play should feel like a mechanical yard ritual: clip, swing, march. D1-D2 allow one redundant clip check, so cautious players can still recover while learning the loop.
- `medium_strategy`: D3 should force the actual insight. The player has to stop double-checking and trust that one saved forward car is enough.
- `hard_strategy`: D4-D5 demand the full one-pass reversal invariant all the way through: save the next edge, reverse the current edge, then advance both handles together until the live slot empties.
- `strategy_evolution`: The expected shift is from "I am turning cars around one by one" to "I must always protect the unreversed tail before I touch the live hitch."
- `plain_english_pattern`: "Grab where the current car was going, turn it back toward the cars I've already fixed, then move onto the saved car and do the same thing again."
- `naive_vs_optimal`: Immediate flips lose the remaining tail outright. Cautious re-clipping survives the first two ladders but becomes too slow once D3 removes the slack.
- `confusion_points`: The scout clip's `Tail` state is the likeliest place for wording confusion, because it represents a safely stored null edge rather than a visible car.
- `bug_summary`: One implementation bug surfaced during solver verification: tail nodes were initially indistinguishable from "not clipped yet," which caused repeated tail clipping instead of a clean finish. That state bug was fixed by tracking whether the forward edge had already been secured even when it was null.
- `verdict`: keep

## Decision Memo

- `decision`: keep
- `why`: Backhaul teaches the exact iterative reverse-list loop directly enough to justify a dedicated linked-list game. The kept build hit `100%` solvability, `99.1%` LeetCode fit, `66.5%` strongest-alternative gap, and a clean `D3` breakpoint where redundant clip checks stop fitting.
- `evidence_used`: `node --input-type=module` solver evaluation from `src/solvers/Backhaul.solver.ts`, a full D3 scripted walkthrough using the public solver APIs, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`
- `bug_status`: no open implementation bugs
- `algorithm_alignment_judgment`: strong enough to claim `#206 Reverse Linked List` directly
- `next_action`: mark `#206` complete in the Blind 75 tracker and leave the next outer-loop pass for `#21 Merge Two Sorted Lists`
- `polish_scope`: if a live blind browser session becomes available later, validate that the scout clip's `Tail` state reads clearly before considering any copy polish

## Concept Bridge

This game teaches the iterative linked-list reversal solution for `Reverse Linked List`. For the Blind 75 tracker, the kept `Backhaul` game claims `#206 Reverse Linked List`.

The moment where you `Clip Ahead` maps to `next = current.next`. The moment where you `Swing Back` maps to `current.next = prev`. The moment where you `March Anchor` maps to `prev = current; current = next`. Finishing with no live car left maps to returning `prev` as the new head of the reversed list.
