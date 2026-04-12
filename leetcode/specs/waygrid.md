# Waygrid

## Algorithm Game Spec

1. `game_name`: Waygrid
2. `algorithm_target`: 4.1 2D Dynamic Programming
3. `core_insight`: Do not recount routes plaza by plaza. Keep a full top-left ledger where every interior plaza is exactly north plus west, and the southeast gate count appears as the last sealed cell.
4. `one_line_pitch`: Certify a city-route ledger before customs closes the manifest, using one cheap north-plus-west merge per interior plaza instead of paying direct survey taxes over and over.
5. `rules`:
   - Every plaza on the top row and west column begins pre-sealed at exactly `1` route.
   - Any interior plaza may be sealed in one action only after the plaza directly north and directly west are already sealed.
   - `Survey Plaza` may certify any unresolved interior plaza directly, but it burns that plaza's full recount tax.
   - The puzzle is won only when the full plaza ledger is sealed before the action budget expires.
6. `core_actions`:
   - inspect one plaza, its feeder counts, and its survey tax
   - merge one ready interior plaza from the north and west feeders
   - choose when to stop trusting cheap direct surveys
   - keep the whole growing top-left ledger alive instead of recomputing routes
7. `algorithm_to_mechanic_mapping`:
   - Plaza `(r, c)` maps to subproblem `dp[r][c]`.
   - The pre-sealed top row and west column map to the base cases where every border cell has exactly `1` route.
   - `Merge North + West` maps to `dp[r][c] = dp[r - 1][c] + dp[r][c - 1]`.
   - The full sealed city chart maps to a 2D DP table filled from the top-left corner outward.
   - `Survey Plaza` maps to naive recursion or direct recomputation that refuses to reuse the already solved table.
8. `why_greedy_fails`: The strongest near miss is a "cheap-survey" habit: direct-certify every plaza whose tax still looks small, then merge only after the direct checks become uncomfortable. That survives D1-D2, but D3-D5 break it because even modest direct surveys now overrun the audit clock while disciplined north-plus-west merges still finish the whole table.
9. `aha_moment`: "Every interior plaza is just the north routes plus the west routes. I only need to know those feeder counts once."
10. `difficulty_progression`:
    - D1: Tiny ledgers still allow several direct surveys, so the DP habit feels like a cleaner shortcut rather than a requirement.
    - D2: The direct-survey instinct still clears the board, but the cost gap is now obvious and the ledger shape becomes legible.
    - D3: The cheap-survey instinct finally breaks on budget, so only the full 2D table survives.
    - D4: The grid is wide enough that any return to direct surveying wastes too much clock.
    - D5: Only disciplined top-left tabulation reaches the gate before customs closes the manifest.
11. `predicted_failure_mode`: If the board does not make north and west feeders visually central, players will read the game as arbitrary arithmetic on a grid instead of as route reuse.
12. `acceptance_criteria`:
    - Winning play should be describable as "fill the top-left route ledger so every interior cell becomes north plus west."
    - Solver evaluation must keep `100%` solvability across the shipped grids.
    - The cheap-survey baseline should survive D1-D2 and break at D3.
    - The kept bridge should claim Blind 75 `#62 Unique Paths` directly and only in this pass.
13. `predicted_scorecard`:
    - `skill_depth`: `0.55`
    - `counterintuitive_moves`: `2.0`
    - `algorithm_alignment`: `1.00`
    - `greedy_optimal_gap`: `0.35`
    - `difficulty_curve`: `D3`
    - `insight_inflection`: `D3`
14. `open_questions_for_engineering`:
    - Do players read the north and west feeder cards before they reach for the survey button?
    - Does requiring the full ledger still feel aligned with Unique Paths rather than like arbitrary bookkeeping?
    - Is the survey tax legible as "recounting from scratch" instead of as a generic penalty?

## Implementation Packet

1. `version_id`: Waygrid v1
2. `algorithm_game_spec`: city-plaza route ledger with border base cases, one-action north-plus-west merges, and an expensive direct-survey fallback that mirrors no-tabulation recomputation
3. `prototype_scope`: one `Waygrid` screen, five difficulty presets, two grid shapes per difficulty, solver evaluation against a cheap-survey baseline, and a direct Blind 75 concept bridge for `#62`
4. `difficulty_scope`: D1-D2 preserve the direct-survey habit as a viable but wasteful shortcut; D3 is the intended break; D4-D5 widen the gap between 2D tabulation and repeated direct recounting
5. `non_goals`:
   - no obstacle cells or shared claim on `#63 Unique Paths II`
   - no shared claim on `#1143 Longest Common Subsequence` in this pass
   - no browser-captured blind session while the local Puppeteer harness lacks a runnable Chrome/Chromium binary
6. `predicted_scorecard`:
   - `solvability`: `1.00`
   - `skill_depth`: `0.55`
   - `counterintuitive_moves`: `2.0`
   - `algorithm_alignment`: `1.00`
   - `greedy_optimal_gap`: `0.35`

## Prototype Package

1. `game_entrypoint`: `src/games/Waygrid.tsx`
2. `difficulty_controls`: five difficulty chips plus plaza selection, `Merge North + West`, `Survey Plaza`, `Reset Grid`, and `New Grid`
3. `changed_files`:
   - `src/solvers/Waygrid.solver.ts`
   - `src/games/Waygrid.tsx`
   - `src/games/index.ts`
   - `leetcode/specs/waygrid.md`
   - `leetcode/curriculum.md`
   - `leetcode/results.tsv`
   - `run-program.md`
4. `artifact_paths`:
   - `src/solvers/Waygrid.solver.ts`
   - `src/games/Waygrid.tsx`
   - `leetcode/specs/waygrid.md`
5. `actual_scorecard`:
   - `solvability`: `100%`
   - `skill_depth`: `64.0%`
   - `counterintuitive_moves`: `2.2`
   - `drama`: `1.00`
   - `decision_entropy`: `1.27`
   - `info_gain_ratio`: `16.09`
   - `algorithm_alignment`: `100%`
   - `leetCode_fit`: `94%`
   - `best_alternative_gap`: `44.7%`
   - `invariant_pressure`: `65.5%`
   - `difficulty_breakpoint`: `D3`
6. `known_issues`:
   - Browser-driven blind play is blocked in this environment because `node tools/playtest.mjs start waygrid` cannot launch Puppeteer's browser process and no system Chrome/Chromium binary is available.
   - The D1-D2 boards intentionally leave a large efficiency gap even while the cheap-survey baseline still succeeds; the true teaching inflection is survival-versus-failure at D3.

## Blind Play Report

- `rules_clarity`: The screen copy, border-base cases, feeder cards, and survey tax read clearly in source-level review, but a true browser-blind session is still blocked by the missing local Chrome/Chromium runtime for the playtest harness.
- `easy_strategy`: D1-D2 invite a very plausible "survey the cheap plazas first" instinct because the tax still fits, so the player can get away with direct checks before the ledger feels mandatory.
- `medium_strategy`: D3 is the inflection point. The same cheap-survey habit overruns the budget, so the player has to trust the feeder counts and fill the interior ledger systematically.
- `hard_strategy`: D4-D5 demand disciplined table building. Every interior plaza must be treated as north plus west, and any fallback to direct surveys burns too much clock.
- `strategy_evolution`: The intended shift is from "direct-check the cells that still look affordable" to "stop recomputing and fill the whole top-left ledger from feeder counts."
- `plain_english_pattern`: "Keep the route total for each plaza once, and every new interior plaza is just the route total from above plus the route total from the left."
- `naive_vs_optimal`: The strongest wrong strategy is direct-checking inexpensive plazas. It works while the grid is small, then collapses once those direct checks no longer fit; the optimal play seals every interior plaza from already certified feeders.
- `confusion_points`: The main remaining blind risk is whether first-time players interpret the requirement to seal the full ledger as aligned with the final gate objective rather than as extra bookkeeping.
- `bug_summary`: No blocking implementation bugs surfaced during solver evaluation, `npx tsc --noEmit`, an optimal-path state-transition smoke test across five seeds for every difficulty, or `env CI=1 npx expo export --platform web`. The browser playtest itself is blocked by missing local browser runtime, not by an application crash.
- `verdict`: keep

## Decision Memo

- `decision`: keep
- `why`: Waygrid teaches Blind 75 `#62 Unique Paths` directly enough to justify a dedicated kept game. The build keeps `100%` solvability, preserves a strong 2D-DP mapping, and hits the intended `D3` breakpoint where cheap direct surveys stop fitting while one-action north-plus-west merges still finish the full ledger.
- `evidence_used`: `node --input-type=module` evaluation from `src/solvers/Waygrid.solver.ts`, `npx tsc --noEmit`, an optimal-path state-transition smoke test across five seeds for every difficulty, `env CI=1 npx expo export --platform web`, and a failed-but-diagnostic `node tools/playtest.mjs start waygrid` browser-launch attempt
- `bug_status`: no open implementation bugs
- `algorithm_alignment_judgment`: strong enough to claim Blind 75 `#62` directly because optimal play requires the exact table recurrence shape: border base cases plus one full top-left fill where each interior cell reuses the north and west answers that were already certified
- `next_action`: mark `#62 Unique Paths` complete in the Blind 75 tracker and leave the next outer-loop pass for `#1143 Longest Common Subsequence`
- `polish_scope`: once browser playtesting is available again, confirm that first-time players abandon the cheap-survey habit at D3 without extra explanatory copy

## Concept Bridge

This game teaches 2D dynamic programming for `Unique Paths`. For the Blind 75 tracker, the kept `Waygrid` game claims `#62 Unique Paths`.

The moment where a plaza seals from the certified north and west feeders maps to `dp[r][c] = dp[r - 1][c] + dp[r][c - 1]`. The moment where the top row and west column begin pre-sealed at `1` maps to the border base cases. The moment where direct surveys become too expensive maps to why recomputing route counts recursively is the wrong shape once the grid grows.
