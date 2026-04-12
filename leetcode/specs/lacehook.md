# Lacehook

## Algorithm Game Spec

1. `game_name`: Lacehook
2. `algorithm_target`: 2.7 Linked List Pointer Rewiring, using a runner-pointer midpoint chase as the setup for the reorder splice
3. `core_insight`: Reordering a linked list is not "grab the ends somehow." First, the true cut appears only when a fast runner can no longer move two hops while a guide moves one. Then the back half must be reversed without dropping its future edge. Only then can the far lantern be spliced after each front lead in a strict alternating braid.
4. `one_line_pitch`: Pace a guide and a sprinter to the true midpoint, reverse the back strand with one spare pin, then lace the far hooks back into the front strand.
5. `rules`:
   - One lantern garland begins linked left to right.
   - During `Midpoint`, `Pace Split` moves the guide one lantern and the sprinter two.
   - `Seal Split` is correct only once the sprinter has no full two-hop lane left.
   - During `Reverse Tail`, `Clip Tail` stores the next back lantern, `Flip Tail` swings the live tail backward, and `March Tail` advances the reversed anchor and live handle together.
   - During `Lace`, `Hook Back` splices the current far lantern after the current front lead, and `March Pair` advances both handles to the next front/back pair.
   - The braid is complete when the far strand is exhausted and the garland now hangs in first-last-second-second-last order.
6. `core_actions`:
   - pace slow/fast until the true cut is forced
   - protect the next back lantern before reversing the live one
   - advance the reversed anchor and live handle together
   - splice one reversed back lantern after each front lead
7. `algorithm_to_mechanic_mapping`:
   - The guide is `slow`.
   - The sprinter is `fast`.
   - `Pace Split` maps to `slow = slow.next; fast = fast.next.next`.
   - `Seal Split` maps to cutting after `slow` once `fast.next == null || fast.next.next == null`.
   - The reversed-tail anchor is `prev`.
   - The live tail lantern is `second`.
   - The spare pin is `next`.
   - `Clip Tail` maps to `next = second.next`.
   - `Flip Tail` maps to `second.next = prev`.
   - `March Tail` maps to `prev = second; second = next`.
   - `Hook Back` maps to `first.next = second; second.next = temp1`.
   - `March Pair` maps to `first = temp1; second = temp2`.
8. `why_greedy_fails`: Two wrong instincts do the teaching. The first is cutting as soon as the guide feels "roughly central"; that fails because the far strand comes out the wrong size. The second is nervous reverse play: re-clipping a tail lantern that is already secured. That survives on the first two ladders, but D3 removes the spare beat and exposes that the real cadence is cut exactly once, then clip-flip-march exactly once per back node.
9. `aha_moment`: "I cannot braid from the ends directly. I have to let the fast runner certify the cut, reverse the back safely, and only then feed the far lanterns back after each front lead."
10. `difficulty_progression`:
    - D1: Four lanterns reveal the whole ritual with one spare reverse beat.
    - D2: Odd length leaves a center front lantern parked in place, plus one spare reverse beat.
    - D3: Exact budget; midpoint guessing and redundant reverse checks now fail.
    - D4: Longer odd garlands make the leftover center lead explicit.
    - D5: Eight lanterns with no spare motions require the full split-reverse-lace loop end to end.
11. `predicted_failure_mode`: If the lace phase reads like decorative alternation instead of an in-place splice after the current front lead, players may treat it as a generic end-picking puzzle.
12. `acceptance_criteria`:
    - The winning pattern is describable as "pace to the true cut, reverse the back safely, then splice one far lantern after each front lead."
    - Early cuts fail for structural reasons, not arbitrary penalties.
    - One redundant reverse re-clip survives early and then fails cleanly at D3.
    - The post-game bridge can claim Blind 75 `#143 Reorder List` directly and specifically.
13. `predicted_scorecard`:
    - `skill_depth`: `0.55` because the near miss should survive the slack ladders and collapse once D3 removes the spare beat.
    - `counterintuitive_moves`: `0.32` because both the midpoint stop condition and the far-hook splice should feel less obvious than "just alternate ends."
    - `algorithm_alignment`: `1.00` because every successful phase corresponds to one segment of the standard in-place reorder routine.
    - `greedy_optimal_gap`: `0.55` because early cutting fails immediately and cautious reverse play should time out by medium difficulty.
    - `difficulty_curve`: `D3`.
    - `insight_inflection`: `D3`.
14. `open_questions_for_engineering`:
    - Is the lace phase legible enough that `Hook Back` feels like a splice after the current lead rather than a free alternation power?
    - Does the guide/sprinter panel make the midpoint stop condition feel earned instead of ceremonial?
    - Is the spare-pin copy clear enough that players understand why a null/open tail still counts as "secured"?

## Implementation Packet

1. `version_id`: Lacehook v1
2. `algorithm_game_spec`: festival garland reorder game with midpoint chase, safe tail reversal, and a final front/far splice phase
3. `prototype_scope`: one `Lacehook` screen, five difficulty presets, rerollable fixed garlands, stage-aware controls, a visible braid output row, and solver evaluation for optimal vs near-miss reorder play
4. `difficulty_scope`: D1-D2 keep one spare reverse re-clip, while D3-D5 require the exact split-reverse-lace cadence
5. `non_goals`:
   - no second Blind 75 claim in this pass
   - no claim for `#19 Remove Nth Node From End of List`
   - no recursive linked-list teaching in this build
6. `predicted_scorecard`:
   - `solvability`: `1.00`
   - `skill_depth`: `0.55`
   - `counterintuitive_moves`: `0.32`
   - `algorithm_alignment`: `1.00`
   - `greedy_optimal_gap`: `0.55`

## Prototype Package

1. `game_entrypoint`: `src/games/Lacehook.tsx`
2. `difficulty_controls`: five difficulty chips plus `Reset Garland` and `New Garland`
3. `changed_files`:
   - `src/games/Lacehook.tsx`
   - `src/solvers/Lacehook.solver.ts`
   - `src/games/index.ts`
   - `leetcode/specs/lacehook.md`
   - `leetcode/learnings.md`
   - `leetcode/results.tsv`
   - `run-program.md`
4. `artifact_paths`:
   - `leetcode/specs/lacehook.md`
   - `src/games/Lacehook.tsx`
   - `src/solvers/Lacehook.solver.ts`
5. `actual_scorecard`:
   - `solvability`: `100%`
   - `skill_depth`: `61.4%`
   - `counterintuitive_moves`: `32.5%`
   - `drama`: `74.9%`
   - `decision_entropy`: `2.75`
   - `info_gain_ratio`: `0.83`
   - `algorithm_alignment`: `100%`
   - `leetCode_fit`: `99.2%`
   - `best_alternative_gap`: `61.4%`
   - `invariant_pressure`: `50.6%`
   - `difficulty_breakpoint`: `D3`
6. `known_issues`:
   - Live blind browser play was not run in this sandbox. The blind report below is based on solver evaluation, direct UI inspection, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`.

## Blind Play Report

- `rules_clarity`: The stage-aware control groups keep the ritual readable. The copy risk is whether players immediately understand that `Seal Split` is gated by the sprinter's last full two-hop lane, not by visual symmetry alone.
- `easy_strategy`: Early play should feel like learning three linked chores in sequence: chase the midpoint, reverse the tail safely, then lace the far lantern after the current lead.
- `medium_strategy`: D2 should reveal that one spare reverse re-clip is merely comfort, not structure. D3 then hardens that into the actual invariant.
- `hard_strategy`: D4-D5 demand the full routine with no spare beats: exact cut, exact reverse cadence, exact lace cadence.
- `strategy_evolution`: The expected shift is from "I should alternate from both ends" to "I must prepare the back strand first, then feed it back into the front one hook at a time."
- `plain_english_pattern`: "Walk one marker slowly and one quickly until the quick one runs out of runway, cut there, flip the back strand around safely, then keep hanging one far lantern after each front lantern."
- `naive_vs_optimal`: Early cuts leave the back strand the wrong size and fail immediately. The stronger near miss uses the correct cut but spends one redundant reverse re-clip; that survives D1-D2 and then times out at D3+.
- `confusion_points`: The likeliest confusion is the lace phase: players may briefly read `Hook Back` as decorative alternation rather than the real in-place splice after the current front lead.
- `bug_summary`: No blocking implementation bugs surfaced during solver evaluation, direct UI inspection, typecheck, or web export.
- `verdict`: keep

## Decision Memo

- `decision`: keep
- `why`: Lacehook teaches the full `Reorder List` routine directly enough to justify a dedicated Blind 75 game. The kept build hit `100%` solvability, `99.2%` LeetCode fit, `61.4%` strongest-alternative gap, and a clean `D3` breakpoint where the spare reverse beat disappears.
- `evidence_used`: `node --input-type=module` evaluation from `src/solvers/Lacehook.solver.ts`, direct UI inspection, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`
- `bug_status`: no open implementation bugs
- `algorithm_alignment_judgment`: strong enough to claim `#143 Reorder List` directly
- `next_action`: mark `#143` complete in the Blind 75 tracker and leave the next outer-loop pass for `#19 Remove Nth Node From End of List`
- `polish_scope`: if a live blind browser session becomes available later, validate that the lace-phase copy does not read like decorative alternation

## Concept Bridge

This game teaches the standard in-place `Reorder List` routine. For the Blind 75 tracker, the kept `Lacehook` game claims `#143 Reorder List`.

The moment where you `Pace Split` maps to `slow = slow.next; fast = fast.next.next` until the fast runner cannot take a full double hop. The moment where you `Seal Split` maps to cutting after `slow`. The `Clip Tail -> Flip Tail -> March Tail` loop maps to reversing the second half with `next`, `second.next = prev`, then `prev = second; second = next`. The moment where you `Hook Back` and `March Pair` maps to splicing the reversed back node after the current front node, then advancing both handles to the next pair.
