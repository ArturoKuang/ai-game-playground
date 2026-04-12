# Echo Run

1. `game_name`: Echo Run
2. `algorithm_target`: 1.4 Sliding Window
3. `core_insight`: March the right edge through the signal exactly once, keep one contiguous clean band with no repeated glyphs, and when the next glyph echoes inside that band, trim from the left only until the echo is gone instead of restarting the whole scan.
4. `one_line_pitch`: Track a live radio band, keep every glyph inside it unique, and grow the longest clean stretch before full retunes burn the budget.
5. `rules`:
   - The signal arrives left to right, and the incoming glyph is always the next unread slot.
   - `Tune Next` admits the incoming glyph only when it is not already echoing inside the live band.
   - `Drop Left` ejects the oldest glyph from the live band.
   - `Full Retune` clears the whole live band and restarts on the incoming glyph, but it costs several actions.
   - The run wins only if the longest clean band you logged matches the signal's true best span within budget.
6. `core_actions`:
   - inspect the incoming glyph against the current clean band
   - tune the incoming glyph when it is safe
   - trim the left edge until a repeated incoming glyph becomes safe
   - avoid expensive full retunes that restart the whole band
7. `algorithm_to_mechanic_mapping`:
   - The live band maps to the current sliding window substring.
   - `Tune Next` maps to expanding the right pointer by one.
   - `Drop Left` maps to incrementing the left pointer while a duplicate remains inside the window.
   - `Full Retune` maps to the wrong restart-from-scratch instinct of rebuilding a brand-new candidate substring after a repeat.
8. `why_greedy_fails`: The tempting shortcut is to nuke the whole live band whenever an echo arrives. That works on short easy signals, but medium-plus signals place the duplicate far enough from the left edge that restarting throws away too much clean progress and runs out of budget.
9. `aha_moment`: "I should not restart after a repeat. I only need to push the left edge forward until that old copy leaves the band."
10. `difficulty_progression`:
    - D1: Short signals where full retunes still fit, so the player learns the surface rule.
    - D2: Repeats drift into the middle of the live band, making left trimming visibly cheaper than restarting.
    - D3-D5: Repeats hit after long clean runs, and only disciplined left-edge trimming preserves enough budget to finish.
11. `predicted_failure_mode`: If duplicates appear too close to the left edge, full retunes stay accidentally viable and the player never feels why "trim just enough" matters.
12. `acceptance_criteria`:
    - The player can explain the winning pattern as "keep one clean span, and only move the left edge enough to kick out the duplicate."
    - Solver evaluation keeps `100%` solvability and shows a real gap against the reset-on-duplicate baseline.
    - The post-game bridge claims `#3 Longest Substring Without Repeating Characters` directly and specifically.
13. `predicted_scorecard`:
    - `skill_depth`: `0.35` because random or reset-heavy play should waste the budget once repeats land deep in the window.
    - `counterintuitive_moves`: `1.0` because optimal play must repeatedly throw away still-useful early glyphs to preserve the larger band.
    - `algorithm_alignment`: `1.00` because the winning move pattern is exactly right-expand / left-trim sliding window maintenance.
    - `greedy_optimal_gap`: `0.25` because reset-on-duplicate should survive Easy but fail by Medium or Hard.
    - `difficulty_curve`: `D3` because that is where restart habits should first collapse.
    - `insight_inflection`: `D2` because mid-band repeats first make "trim, don't restart" feel better than brute force.
14. `open_questions_for_engineering`:
    - Is the current live band legible enough that players understand which old glyph is causing the echo?
    - Does `Full Retune` feel tempting without obscuring the real left-trim lesson?
    - Are best-span upgrades visible enough that the player notices when preserving a longer band matters?

## Implementation Packet

1. `version_id`: Echo Run v1
2. `algorithm_game_spec`: one-pass signal-band sweep where the player preserves the longest duplicate-free live band by trimming the left edge instead of restarting on repeats
3. `prototype_scope`: one `Echo Run` screen, five difficulty presets, rerollable fixed signals, and a live incoming-glyph warning that shows when an echo blocks `Tune Next`
4. `difficulty_scope`: D1 tolerates full retunes, D2 puts repeats deeper inside the band, and D3-D5 force left-edge trimming because reset costs explode after long clean runs
5. `non_goals`:
   - no direct jump-to-last-seen index visualization
   - no second Blind 75 mapping in this pass
   - no hidden or stochastic signal behavior beyond fixed reroll seeds
6. `predicted_scorecard`:
   - `solvability`: `1.00`
   - `skill_depth`: `0.35`
   - `counterintuitive_moves`: `1.0`
   - `algorithm_alignment`: `1.00`
   - `greedy_optimal_gap`: `0.25`

## Prototype Package

1. `game_entrypoint`: `src/games/EchoRun.tsx`
2. `difficulty_controls`: five difficulty chips plus `Reset Signal` and `New Signal`
3. `changed_files`:
   - `src/games/EchoRun.tsx`
   - `src/solvers/EchoRun.solver.ts`
   - `src/games/index.ts`
   - `leetcode/specs/echorun.md`
   - `leetcode/results.tsv`
   - `run-program.md`
4. `artifact_paths`:
   - `leetcode/specs/echorun.md`
   - `src/games/EchoRun.tsx`
   - `src/solvers/EchoRun.solver.ts`
5. `actual_scorecard`:
   - `solvability`: `100%`
   - `skill_depth`: `62.2%`
   - `counterintuitive_moves`: `3.4`
   - `drama`: `0.53`
   - `decision_entropy`: `1.52`
   - `info_gain_ratio`: `3.10`
   - `algorithm_alignment`: `100%`
   - `best_alternative_gap`: `41.9%`
   - `invariant_pressure`: `35.8%`
   - `difficulty_breakpoint`: `D3`
6. `known_issues`:
   - No blocking implementation bugs found.
   - Blind play remained a scripted local pass rather than a live recorded user session.

## Blind Play Report

- `rules_clarity`: The signal row, incoming glyph, live band, and best-band ledger make the loop readable quickly. The only unusual control is `Full Retune`, but its cost label keeps the tradeoff visible.
- `easy_strategy`: Early instinct is to retune whenever a repeat appears because it feels like the cleanest reset. D1 forgives that often enough to let the player learn the board.
- `medium_strategy`: By D2 the player sees that the repeated glyph is often buried in the middle of the live band, so dropping the oldest few glyphs is cheaper than wiping everything.
- `hard_strategy`: D3+ demands a strict one-pass rhythm: grow right, trim left only until the echo is gone, then grow right again. Full retunes become emergency-only because they destroy too much preserved span and budget.
- `strategy_evolution`: The strategy shifts from "restart on every repeat" to "preserve the current band and only shave off the stale left edge." The best-band ledger makes that preservation visible.
- `plain_english_pattern`: "Keep one clean stretch alive, and when the next symbol repeats, slide the front forward until the old copy falls out."
- `naive_vs_optimal`: On `D3 seed 0`, the reset-on-duplicate baseline spends `22` effective actions against the optimal `9` because restarting after the second `A` throws away the whole `ABCDE` band. On `D4 seed 0`, repeated deep echoes make the reset baseline fail every sample while the left-trim solver still clears all five.
- `confusion_points`: Players may briefly ask why `Drop Left` stays enabled even when the incoming glyph is safe, but that freedom is legible as a self-harming choice rather than a hidden rule.
- `bug_summary`: No blocking bugs found in solver logic, TypeScript compile, or Expo web export.
- `verdict`: keep

## Decision Memo

- `decision`: keep
- `why`: Echo Run teaches the exact longest-unique-substring sliding-window invariant rather than a vague "unique letters" puzzle. The kept build hit `100%` solvability, `62.2%` skill depth, `100%` algorithm alignment, `41.9%` reset-gap, `35.8%` invariant pressure, and a clean `D3` breakpoint where restart habits finally collapse.
- `evidence_used`: solver evaluation from `src/solvers/EchoRun.solver.ts`, scripted blind-style sessions across D2-D4 seeds, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`
- `bug_status`: no open implementation bugs; live human play remains a testing gap rather than a discovered defect
- `algorithm_alignment_judgment`: strong enough to claim `#3 Longest Substring Without Repeating Characters` directly
- `next_action`: mark the Blind 75 tracker item complete and leave the next outer-loop pass for `#424 Longest Repeating Character Replacement`
- `polish_scope`: if future playtesting shows confusion, add a stronger visual tether between the incoming glyph and the matching glyph already inside the band

## Concept Bridge

This game teaches the sliding-window solution for `Longest Substring Without Repeating Characters`. For the Blind 75 tracker, the kept `Echo Run` game claims `#3 Longest Substring Without Repeating Characters`.

The moment where the next glyph stalls because it already exists inside the live band maps to the duplicate check against the current window. The repeated `Drop Left` action maps to advancing `left` while that duplicate remains present, and `Tune Next` maps to admitting `s[right]`, updating the unique window, and then checking whether `right - left + 1` is the new best span.
