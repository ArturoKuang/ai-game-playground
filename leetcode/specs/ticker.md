# Ticker

1. `game_name`: Ticker
2. `algorithm_target`: 1.4 Sliding Window
3. `core_insight`: March the sell day from left to right once, keep the cheapest buy price seen so far as a live anchor, and only compare today against that anchor instead of restarting every possible trade.
4. `one_line_pitch`: Walk a price tape, protect the cheapest bargain you've seen, and log the single best one-shot spread before the bell.
5. `rules`:
   - Day 1 starts as the live buy anchor automatically.
   - Each later day gives exactly one desk action before the tape advances.
   - `Lower Anchor` moves the buy marker onto today if today is the new floor.
   - `Log Today` compares today against the live anchor and keeps the best spread seen so far.
   - `History Scan` brute-forces the seen tape for the current day, but it burns multiple actions.
   - The run only wins if the best logged spread matches the tape's true best trade within the action budget.
6. `core_actions`:
   - inspect today's price against the live anchor
   - either lower the anchor or log today's spread
   - optionally spend extra actions on a full history scan
   - finish the tape with the correct best spread still recorded
7. `algorithm_to_mechanic_mapping`:
   - The live buy anchor maps to the rolling `minPrice`.
   - `Log Today` maps to checking `price - minPrice` and updating `maxProfit`.
   - The advancing tape maps to the single left-to-right pass through the array.
   - `History Scan` maps to the rejected brute-force habit of reconsidering every prior buy day.
8. `why_greedy_fails`: The tempting wrong move is to lock the first decent profit and stop refreshing the buy anchor. When a deeper bargain arrives later, that stale anchor caps every future spread and the final rally no longer reaches the true maximum.
9. `aha_moment`: "I do not need to test every buy day. I only need the cheapest one I have seen so far."
10. `difficulty_progression`:
    - D1: The true floor usually appears early, so the mechanic reads cleanly and one scan still fits.
    - D2: Early green trades become bait, and the first later bargain starts punishing stale anchors.
    - D3-D5: Repeated fake pullbacks and deeper later floors make the rolling minimum mandatory while scans die on budget.
11. `predicted_failure_mode`: Players may cling to the first profitable trade or mistake any down day for a new anchor even when it is still above the real floor.
12. `acceptance_criteria`:
    - The player can explain the winning pattern as "keep the cheapest price seen so far and compare each later day to it."
    - Solver evaluation keeps `100%` solvability, nonzero counterintuitive pressure, and a best-alternative gap above the loop threshold.
    - The post-game bridge claims `#121 Best Time to Buy and Sell Stock` directly and specifically.
13. `predicted_scorecard`:
    - `skill_depth`: `0.35` because medium-plus tapes should punish stale anchors once later bargains appear.
    - `counterintuitive_moves`: `1.0` because some lower-than-yesterday prices should still be wrong anchor resets.
    - `algorithm_alignment`: `1.00` because every winning action is one legal step of the rolling-minimum stock scan.
    - `greedy_optimal_gap`: `0.30` because early-profit lock-in and brute scans should both lose hard by medium difficulty.
    - `difficulty_curve`: `D2` because that is where early green bait should first stop being safe.
    - `insight_inflection`: `D2` because later floors begin arriving after the first profit opportunity.
14. `open_questions_for_engineering`:
    - Is the anchor state legible enough that players notice it should survive across many days?
    - Does `History Scan` feel tempting without stealing the one-pass lesson?
    - Are the winning upgrades visible enough that the player notices the running-best-profit behavior?

## Implementation Packet

1. `version_id`: Ticker v1
2. `algorithm_game_spec`: single-pass stock tape with a live buy anchor and expensive history scans
3. `prototype_scope`: one `Ticker` screen, five difficulty presets, rerollable fixed tapes, and direct feedback when the player lowers the anchor on a non-floor day
4. `difficulty_scope`: D1 keeps one scan alive, D2 introduces later bargains after an early green trade, D3-D5 stack repeated fake pullbacks and kill brute force on budget
5. `non_goals`:
   - no multi-transaction stock mechanic
   - no hidden chart indicators or prediction layer
   - no second Blind 75 mapping in this pass
6. `predicted_scorecard`:
   - `solvability`: `1.00`
   - `skill_depth`: `0.35`
   - `counterintuitive_moves`: `1.0`
   - `algorithm_alignment`: `1.00`
   - `greedy_optimal_gap`: `0.30`

## Prototype Package

1. `game_entrypoint`: `src/games/Ticker.tsx`
2. `difficulty_controls`: five difficulty chips plus `Reset Tape` and `New Tape`
3. `changed_files`:
   - `src/games/Ticker.tsx`
   - `src/solvers/Ticker.solver.ts`
   - `src/games/index.ts`
   - `leetcode/specs/ticker.md`
   - `leetcode/results.tsv`
   - `run-program.md`
4. `artifact_paths`:
   - `leetcode/specs/ticker.md`
   - `src/games/Ticker.tsx`
   - `src/solvers/Ticker.solver.ts`
5. `actual_scorecard`:
   - `solvability`: `100%`
   - `skill_depth`: `33.5%`
   - `counterintuitive_moves`: `1.15`
   - `drama`: `0.99`
   - `decision_entropy`: `2.04`
   - `info_gain_ratio`: `3.78`
   - `algorithm_alignment`: `100%`
   - `best_alternative_gap`: `33.5%`
   - `difficulty_breakpoint`: `D2`
6. `known_issues`:
   - No blocking implementation bugs found.
   - Blind play remained a scripted local pass rather than a live recorded user session.

## Blind Play Report

- `rules_clarity`: The desk metaphor reads cleanly because the tape, anchor, current day, and best logged spread are all visible at once. `History Scan` is obviously the expensive fallback.
- `easy_strategy`: Early instinct is to log any immediate green spread and hope that first bargain keeps paying off. D1 allows that often enough to teach the board.
- `medium_strategy`: By D2 the player notices that a later lower day can arrive after an earlier profit, so the buy anchor has to stay alive and keep dropping when the true floor moves.
- `hard_strategy`: D3+ demands a strict rolling minimum. Fake pullbacks waste anchor moves, and history scans burn too much budget to rescue the run.
- `strategy_evolution`: The strategy shifts from "sell any rise" to "carry the cheapest bargain forward and only compare today against that one." The best-spread chips make the running maximum visible.
- `plain_english_pattern`: "Keep the cheapest day so far marked, then check every later day against that one mark."
- `naive_vs_optimal`: On `D3 seed 0`, the stale-anchor path logged `11` from days `3-7`, but the correct path refreshed the anchor at day `6` and found `12` from days `6-7`. On `D2 seed 0`, lowering the anchor after the first gain turns a `3` into the correct `4`.
- `confusion_points`: The only mild friction is that some down days are still wrong anchor resets because they are not new floors, but that tension is the intended lesson.
- `bug_summary`: No blocking bugs found in solver logic, TypeScript compile, or Expo web export.
- `verdict`: keep

## Decision Memo

- `decision`: keep
- `why`: Ticker teaches the actual one-pass stock-profit invariant rather than a vague market theme. The kept build hits `100%` solvability, `33.5%` skill depth, nonzero counterintuitive pressure, `100%` algorithm alignment, and a `33.5%` best-alternative gap with a `D2` breakpoint where early-profit lock-in stops working.
- `evidence_used`: solver evaluation from `src/solvers/Ticker.solver.ts`, scripted blind-style sessions on D2-D3 tapes, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`
- `bug_status`: no open implementation bugs; live human play remains a testing gap rather than a discovered defect
- `algorithm_alignment_judgment`: strong enough to claim `#121 Best Time to Buy and Sell Stock` directly
- `next_action`: mark the Blind 75 tracker item complete and leave the next outer-loop pass for `#3 Longest Substring Without Repeating Characters`
- `polish_scope`: if future playtesting shows confusion, strengthen the visual cue that an anchor survives across many future sell days

## Concept Bridge

This game teaches the rolling-minimum one-pass solution for `Best Time to Buy and Sell Stock`. For the Blind 75 tracker, the kept `Ticker` game claims `#121 Best Time to Buy and Sell Stock`.

The moment where a cheaper day replaces the live buy anchor maps to `minPrice = Math.min(minPrice, price)`. The moment where every later day is checked against that one anchor and only the best spread is kept maps to `maxProfit = Math.max(maxProfit, price - minPrice)`.
