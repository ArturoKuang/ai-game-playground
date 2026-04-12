# Claspline

## Algorithm Game Spec

1. `game_name`: Claspline
2. `algorithm_target`: 1.3 Stack
3. `core_insight`: When a closing clasp arrives, only the most recently opened clasp is still reachable. Stow every opener on one live pile, release only the top when it matches, and flag the route broken the moment a closer collides with the wrong top or an empty pile.
4. `one_line_pitch`: Certify a ceremonial clasp route by piling open seals in a vault and proving each closer fits only the live top seal.
5. `rules`:
   - A fixed route of clasp halves arrives left to right.
   - An opening half must be `Stowed` on the vault pile.
   - A closing half can only be handled by `Latching Top`.
   - If a closing half meets the wrong top seal or an empty vault, the route is broken and should be flagged immediately.
   - After the last token, the route is safe only if the vault is empty.
6. `core_actions`:
   - `Stow` the incoming opener onto the top of the vault.
   - `Latch Top` when the incoming closer matches the current vault top.
   - `Flag Fault` the moment a closer is impossible or the route ends with leftover open seals.
   - `Mark Clear` only after the full route is consumed and the vault is empty.
7. `algorithm_to_mechanic_mapping`:
   - The vault pile is the stack.
   - `Stow` maps to `stack.push(open)`.
   - `Latch Top` maps to checking `stack[stack.length - 1]` and then `stack.pop()`.
   - `Flag Fault` maps to the early `return false` when the stack is empty or the top opener does not match the closer.
   - `Mark Clear` maps to the final `stack.length === 0` check after the full pass.
8. `why_greedy_fails`: The tempting wrong idea is "the right opener exists somewhere in the pile, so this closer is probably fine" or "the counts still balance." That survives shallow easy routes, but the first crossed route like `([)]` proves burial matters more than counts: a matching opener deeper in the pile does not save the line.
9. `aha_moment`: "It is not enough for the right opener to exist somewhere below. The closer only cares about the one that was opened last."
10. `difficulty_progression`:
    - Easy: one-family and shallow mixed-family routes where counts and stack order still agree.
    - Medium: crossed routes and early burial mismatches where count-based thinking breaks.
    - Hard: long nested routes with several near-matches, empty-stack traps, and leftover-open endings.
11. `predicted_failure_mode`: If the vault top is not visually dominant, the player may still reason by family counts instead of burial. The UI therefore needs a strong top marker and explicit "incoming versus top" comparison.
12. `acceptance_criteria`:
    - The winning pattern is describable as "pile every opener, compare each closer to the live top, and fail immediately on burial mismatch."
    - The strongest wrong baseline works on Easy but clearly breaks by D3.
    - The post-game bridge claims `#20 Valid Parentheses` directly and specifically.
13. `predicted_scorecard`:
    - `skill_depth`: high, because random or count-only play should mis-handle crossed routes quickly.
    - `counterintuitive_moves`: present, because the player must sometimes flag fault even though the correct opener exists deeper in the pile.
    - `algorithm_alignment`: very high, because the core loop is literally push, compare top, pop, or fail.
    - `greedy_optimal_gap`: strong, because count-matching and FIFO intuitions should collapse on crossed routes.
    - `difficulty_curve`: clear with a D3 breakpoint.
    - `insight_inflection`: D3.
14. `open_questions_for_engineering`:
    - Do always-available action buttons feel fair, or should the UI rely more on state copy to signal what is correct?
    - Is the difference between "matching by family" and "matching the live top" obvious enough by the first crossed route?

## Implementation Packet

1. `version_id`: Claspline v1
2. `algorithm_game_spec`: ceremonial clasp-route certification where the player handles a fixed stream left to right and learns that only the most recently opened seal is still reachable when a closer arrives
3. `prototype_scope`: one `Claspline` screen, five difficulty presets, fixed reroll seeds, a visible live vault pile, and direct certify/fault actions
4. `difficulty_scope`: D1-D2 stay shallow enough for count-matching intuition to survive, D3 introduces crossed routes, and D4-D5 extend the same burial pressure across longer nested strings
5. `non_goals`:
   - no second Blind 75 claim in this pass
   - no hidden information or timer pressure beyond the route itself
   - no attempt to teach broader monotonic-stack variants yet
6. `predicted_scorecard`:
   - `solvability`: `1.00`
   - `skill_depth`: `0.74`
   - `counterintuitive_moves`: `3.0`
   - `algorithm_alignment`: `0.96`
   - `greedy_optimal_gap`: `0.38`
   - `difficulty_curve`: `D3`

## Prototype Package

1. `game_entrypoint`: `src/games/Claspline.tsx`
2. `difficulty_controls`: five difficulty chips plus `Reset Route` and `New Route`
3. `changed_files`:
   - `src/games/Claspline.tsx`
   - `src/solvers/Claspline.solver.ts`
   - `src/games/index.ts`
   - `leetcode/specs/claspline.md`
   - `leetcode/curriculum.md`
   - `leetcode/learnings.md`
   - `leetcode/results.tsv`
   - `run-program.md`
4. `artifact_paths`:
   - `leetcode/specs/claspline.md`
   - `src/games/Claspline.tsx`
   - `src/solvers/Claspline.solver.ts`
5. `actual_scorecard`:
   - `solvability`: `100%`
   - `skill_depth`: `100%`
   - `counterintuitive_moves`: `0.24`
   - `drama`: `0.55`
   - `decision_entropy`: `1.52`
   - `info_gain_ratio`: `2.89`
   - `algorithm_alignment`: `100%`
   - `leetCode_fit`: `93.8%`
   - `best_alternative_gap`: `24.0%`
   - `invariant_pressure`: `76.0%`
   - `difficulty_breakpoint`: `D3`
6. `known_issues`:
   - `node tools/playtest.mjs start claspline` could not launch Puppeteer's browser process inside this sandbox, so a true blind browser session is still a testing gap.
   - `skill_depth` saturates at `100%` because the action set is deliberately punitive and random play almost never survives long enough to certify a route.

## Play Report

- `rules_clarity`: The route strip, incoming seal, vault top, and pile depth make the core loop legible, but this is an inferred UI judgment rather than a recorded blind human session because the browser harness could not launch here.
- `easy_strategy`: D1-D2 reward the first obvious habit: pile openers and clear the top when the matching closer shows up.
- `medium_strategy`: D3 is the real shift. Crossed routes like `([)]` and `{[}]` punish count-matching and force the player to care about burial instead of family totals.
- `hard_strategy`: D4-D5 keep the same lesson but stretch it across much longer routes, where one late crossed closer or leftover opener can invalidate an otherwise tidy-looking line.
- `strategy_evolution`: The intended shift is from "the right opener exists somewhere in the pile" to "only the live top counts."
- `plain_english_pattern`: "Keep one live pile of open seals, and every closer must fit the newest seal still on top."
- `naive_vs_optimal`: On the solver set, the count-matching baseline stays perfect on D1-D2, then drops to `60%` accuracy from D3 onward because a deeper matching opener no longer saves the route.
- `confusion_points`: The main remaining risk is fairness perception around always-available wrong action buttons. The copy tries to offset that by repeating exactly when each action is valid.
- `bug_summary`: No compile or export defects surfaced. The blind-play gap is environmental: Puppeteer failed before a browser could open.
- `verdict`: keep, with live blind browser play still worth adding later

## Decision Memo

- `decision`: keep
- `why`: Claspline now clears the Stack thresholds directly enough to claim `#20`. It hit `100%` solvability, `93.8%` LeetCode fit, `24.0%` strongest-alternative gap, `76.0%` invariant pressure, and a clean `D3` breakpoint where count-matching first stops being reliable.
- `evidence_used`: solver evaluation from `src/solvers/Claspline.solver.ts`, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`
- `bug_status`: no open implementation bugs; true blind browser QA is still blocked by Puppeteer launch failure in the sandbox
- `algorithm_alignment_judgment`: strong enough to claim `#20 Valid Parentheses` directly
- `next_action`: mark `#20` complete in the Blind 75 tracker and leave the next outer-loop pass for `#153 Find Minimum in Rotated Sorted Array`
- `polish_scope`: if later blind play shows the always-available wrong buttons feel unfair, preserve the same move space but make the incoming-versus-top comparison even more visually dominant

## Concept Bridge

This game teaches the stack solution for `Valid Parentheses`. For the Blind 75 tracker, the kept `Claspline` game claims `#20 Valid Parentheses`.

The moment where you `Stow` an opener onto the live vault maps to `stack.push(ch)` in code. The moment where a closer must fit only the live top maps to checking `stack[stack.length - 1]` before `pop()`. When a closer arrives and the top seal is wrong, `Flag Fault` is the early `return false` that proves buried matches do not count. The final `Mark Clear` maps to the ending check that the stack is empty after the full scan.
