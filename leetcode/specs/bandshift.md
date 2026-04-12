# Bandshift

## Algorithm Game Spec

1. `game_name`: Bandshift
2. `algorithm_target`: 1.1 Binary Search
3. `core_insight`: In a rotated ascending band, the middle relay alone does not tell you which side to keep. First check whether `mid` already matches the target. Otherwise identify the half that is still ordered, then keep that half only if the target lies inside its boundary values.
4. `one_line_pitch`: Hunt a target frequency through a rotated relay chain by spotting the still-ordered half and cutting away the other span before a brute-force sweep burns the drift budget.
5. `rules`:
   - A fixed relay chain is ascending except for one rotation point where values wrap back to the low end.
   - The live corridor always exposes its left relay, middle relay, right relay, and the target frequency card.
   - `Lock Mid` seals the search immediately if the middle relay matches the target.
   - `Search Left Span` keeps only relays strictly left of the middle relay.
   - `Search Right Span` keeps only relays strictly right of the middle relay.
   - `Band Sweep` inspects every live relay at once, but it costs one action per relay.
   - Some later puzzles hide no matching relay at all; the search wins only if the corridor is reduced honestly to empty.
6. `core_actions`:
   - compare the middle relay to the target card
   - decide which half is still ordered
   - keep the ordered half only when the target fits inside its bounds
   - optionally burn the full-band sweep fallback
7. `algorithm_to_mechanic_mapping`:
   - The live corridor is the current search interval `[left, right]`.
   - The middle relay is `nums[mid]`.
   - The target card is `target`.
   - `Lock Mid` maps to `if nums[mid] == target: return mid`.
   - `Search Left Span` maps to `right = mid - 1`.
   - `Search Right Span` maps to `left = mid + 1`.
   - An empty corridor maps to `return -1`.
   - `Band Sweep` is the rejected `O(n)` linear scan.
8. `why_greedy_fails`: The tempting wrong rule is ordinary sorted-array binary search: if the target is smaller than `mid`, go left; if larger, go right. Rotation breaks that shortcut. A larger target can hide left of a tiny middle pivot, and a smaller target can hide right of a huge middle pivot.
9. `aha_moment`: "The middle number is not enough. First find the half that is still in order, then ask whether the target could even belong inside that half."
10. `difficulty_progression`:
    - D1: Sweep still fits and some targets line up with plain target-vs-mid intuition.
    - D2: The first magnitude-lie cases appear, so larger-than-mid targets can still force a left cut and smaller-than-mid targets can still force a right cut.
    - D3: Sweep no longer fits, and ordered-half reasoning becomes mandatory.
    - D4: Missing-target cases appear, so the same invariant must survive until the corridor empties.
    - D5: Long bands combine counterintuitive cuts with absent decoys, and only the real rotated-search loop stays reliable.
11. `predicted_failure_mode`: If the UI does not make the ordered half legible enough, players will collapse back to plain target-vs-mid guessing or treat the puzzle like a linear seek with a prettier skin.
12. `acceptance_criteria`:
    - The winning pattern is describable as "check mid, then find the ordered half and keep it only if the target fits."
    - Plain target-vs-mid binary search survives warmups but breaks clearly by medium difficulty.
    - Missing-target bands use the same invariant rather than a second bespoke trick.
    - The post-game bridge claims `#33 Search in Rotated Sorted Array` directly and specifically.
13. `predicted_scorecard`:
    - `skill_depth`: `0.62` because plain target-vs-mid search should feel viable early and then collapse on rotated counterexamples.
    - `counterintuitive_moves`: `0.40` because medium-plus bands should regularly demand cuts that disagree with the raw target-vs-mid comparison.
    - `algorithm_alignment`: `1.00` because every winning move is one branch from the canonical rotated-array search.
    - `greedy_optimal_gap`: `0.60` because sweep and plain target-vs-mid search should both bleed badly once the rotated traps appear.
    - `difficulty_curve`: `D3`.
    - `insight_inflection`: `D3`.
14. `open_questions_for_engineering`:
    - Does `Lock Mid` feel like the natural equality check instead of an extra ceremonial button?
    - Are the missing-target endings readable enough without requiring a separate "declare absent" action?
    - Is the ordered-half cue strong enough that players can see the invariant without any algorithm jargon?

## Implementation Packet

1. `version_id`: Bandshift v1
2. `algorithm_game_spec`: rotated relay-chain target hunt with explicit mid lock, ordered-half cuts, and an expensive full-band sweep fallback
3. `prototype_scope`: one `Bandshift` screen, five difficulty presets, rerollable fixed relay chains, and a visible target card plus live left, middle, and right relay values
4. `difficulty_scope`: D1 teaches the controls, D2 introduces magnitude-lie counterexamples, D3 removes sweep safety, and D4-D5 add missing-target cases under longer budgets
5. `non_goals`:
   - no shared claim for `#153 Find Minimum in Rotated Sorted Array` in this pass
   - no generic binary-search teaching beyond rotated-array target search
   - no separate absent-target declaration action
6. `predicted_scorecard`:
   - `solvability`: `1.00`
   - `skill_depth`: `0.62`
   - `counterintuitive_moves`: `0.40`
   - `algorithm_alignment`: `1.00`
   - `greedy_optimal_gap`: `0.60`

## Prototype Package

1. `game_entrypoint`: `src/games/Bandshift.tsx`
2. `difficulty_controls`: five difficulty chips plus `Reset Band` and `New Band`
3. `changed_files`:
   - `src/games/Bandshift.tsx`
   - `src/solvers/Bandshift.solver.ts`
   - `src/games/index.ts`
   - `leetcode/specs/bandshift.md`
   - `leetcode/learnings.md`
   - `leetcode/results.tsv`
   - `run-program.md`
4. `artifact_paths`:
   - `leetcode/specs/bandshift.md`
   - `src/games/Bandshift.tsx`
   - `src/solvers/Bandshift.solver.ts`
5. `actual_scorecard`:
   - `solvability`: `100%`
   - `skill_depth`: `67.5%`
   - `counterintuitive_moves`: `38.8%`
   - `drama`: `75.8%`
   - `decision_entropy`: `1.66`
   - `info_gain_ratio`: `2.05`
   - `algorithm_alignment`: `100%`
   - `leetCode_fit`: `98.8%`
   - `best_alternative_gap`: `67.5%`
   - `invariant_pressure`: `51.9%`
   - `difficulty_breakpoint`: `D2`
6. `known_issues`:
   - A true blind browser play session was blocked in this sandbox because Puppeteer could not launch Chromium, so the blind report below is based on solver-driven state walkthroughs, UI inspection, TypeScript compile, and Expo web export rather than a recorded live session.

## Blind Play Report

- `rules_clarity`: The target card plus left, middle, and right relay cards keep the decision surface tight. The main teaching risk is whether players notice "ordered half" soon enough instead of staring only at the middle number.
- `easy_strategy`: D1 invites plain target-vs-mid guessing because the sweep still fits and several warmups reward normal binary-search instincts.
- `medium_strategy`: D2 reveals the real trap. A larger target can live left of a tiny middle pivot, and a smaller target can live right of a huge middle pivot, so target-vs-mid alone starts failing.
- `hard_strategy`: D3-D5 demand the full rotated search loop: check mid, identify the ordered half, test the target against that half's bounds, and keep only the span that can still be valid.
- `strategy_evolution`: The player should shift from "bigger goes right, smaller goes left" to "which half is ordered, and can the target fit there?"
- `plain_english_pattern`: "First see if the middle is already the one I need. If not, find the side that still reads in order and only trust it when the target number could actually belong inside it."
- `naive_vs_optimal`: Generic sorted-array binary search survives some warmups but collapses once rotation makes target-vs-mid comparisons lie. Sweep dies as soon as the chain length outgrows the budget.
- `confusion_points`: `Lock Mid` can look like an extra flourish if players expect equality to auto-resolve. Missing-target endings also rely on trusting an empty corridor as a valid finish.
- `bug_summary`: No blocking implementation bugs found in solver logic, TypeScript compile, or Expo web export. Blind browser play remained blocked by the sandboxed Chromium launch failure.
- `verdict`: keep

## Decision Memo

- `decision`: keep
- `why`: Bandshift teaches the missing `#33` invariant directly enough to justify a dedicated kept game rather than stretching Breakline's pivot-only bridge. The kept build hit `100%` solvability, `98.8%` LeetCode fit, `67.5%` strongest-alternative gap, and a reliable medium breakpoint once plain target-vs-mid guessing starts lying.
- `evidence_used`: solver evaluation from `src/solvers/Bandshift.solver.ts`, scripted state walkthroughs across present and absent targets, `npx tsc --noEmit`, `env CI=1 npx expo export --platform web`, and a failed blind browser attempt via `node tools/playtest.mjs start bandshift` that confirmed the current sandbox limitation rather than a gameplay defect
- `bug_status`: no open implementation bugs; live blind browser play remains an environmental testing gap
- `algorithm_alignment_judgment`: strong enough to claim `#33 Search in Rotated Sorted Array` directly
- `next_action`: mark `#33` complete in the Blind 75 tracker and leave the next outer-loop pass for `#206 Reverse Linked List`
- `polish_scope`: if live browser play becomes available later, validate that `Lock Mid` reads as the equality branch rather than redundant ceremony and only then consider minor HUD polish

## Concept Bridge

This game teaches the rotated-array binary-search solution for `Search in Rotated Sorted Array`. For the Blind 75 tracker, the kept `Bandshift` game claims `#33 Search in Rotated Sorted Array`.

The moment where you `Lock Mid` maps to `if nums[mid] == target: return mid`. The moment where you identify the ordered half and keep it only if the target fits inside that half maps to the two rotated-array branch checks: if the left half is ordered, keep it only when `nums[left] <= target < nums[mid]`; otherwise keep the right half. If the right half is ordered, keep it only when `nums[mid] < target <= nums[right]`; otherwise keep the left half. An empty corridor maps to returning `-1`, and `Band Sweep` is the discarded linear scan.
