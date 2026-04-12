# Islemark

## Algorithm Game Spec

1. `game_name`: Islemark
2. `algorithm_target`: 2.3a Grid Flood Fill / Component Counting
3. `core_insight`: When the sweep hits land that has not already been claimed by an earlier chart, that cell starts exactly one island. Count it once, then consume the full orthogonally connected coast before counting again.
4. `one_line_pitch`: Sweep a storm map from the top-left, launch exactly one survey boat per fresh island root, and let the tide chart every connected shore before the count closes.
5. `rules`:
   - The map is fully visible from the start.
   - The sweep cursor advances in row-major order from the top-left to the bottom-right.
   - `Pass Cell` skips the current cell and moves the sweep forward.
   - `Launch Boat` spends one island count at the current cell.
   - A launch on fresh land charts the entire orthogonally connected island immediately.
   - A launch on water or on coastline already charted from an earlier root is wasted.
   - `Claim Count` is legal only after the sweep reaches the end of the grid.
6. `core_actions`:
   - inspect the current sweep cell
   - decide whether that cell is the first unseen land of a new island
   - launch once on fresh land
   - trust the automatic charting wave to consume the whole connected coast
   - pass charted coast and water without counting them again
7. `algorithm_to_mechanic_mapping`:
   - The storm map is the input grid.
   - The sweep cursor is the outer row/column scan.
   - `Launch Boat` on fresh land maps to `islands += 1`.
   - The automatic charting wave maps to BFS or DFS marking every connected land cell as visited.
   - Passing later land that is already charted maps to skipping cells whose component was already consumed by an earlier flood fill.
8. `why_greedy_fails`: The strongest near miss is the edge-only heuristic. It treats land as a new island whenever no land sits directly above or left, but D3-D5 boards include wraparound bridges that reach the current cell from below or from the right. That local shortcut overcounts islands that an earlier flood fill should have already consumed.
9. `aha_moment`: "I do not count land when I see land. I count only the first fresh land of a still-unclaimed coast, because the launch itself should wipe out the whole island."
10. `difficulty_progression`:
    - D1: Clear gaps make the sweep rhythm easy to learn.
    - D2: Diagonal near-touches force the player to respect orthogonal adjacency only.
    - D3: Wraparound coastlines create visible land that still must be passed because an earlier launch already reached it.
    - D4: Thin channels and enclosed water make surface shape unreliable.
    - D5: Dense bridges and loops require the full "fresh root once, then consume everything" rule.
11. `predicted_failure_mode`: If the charted coast tint is too subtle, players may continue treating later shoreline as a fresh island even after the earlier launch should have killed that whole component.
12. `acceptance_criteria`:
    - Winning play should be describable as "launch once on each fresh island root, then pass everything that wave already consumed."
    - Solver evaluation must keep `100%` solvability across all shipped boards.
    - The strongest near miss should overcount on D3-D5 because it ignores wraparound connectivity.
    - The post-game bridge should claim Blind 75 `#200 Number of Islands` directly and only.
13. `predicted_scorecard`:
    - `skill_depth`: `0.34`
    - `counterintuitive_moves`: `2.0`
    - `algorithm_alignment`: `1.00`
    - `greedy_optimal_gap`: `0.34`
    - `difficulty_curve`: `D3`
    - `insight_inflection`: `D3`
14. `open_questions_for_engineering`:
    - Is the sweep cursor legible enough that row-major scan feels structural rather than decorative?
    - Is the charted-coast tint strong enough that passing visible land can feel correct instead of confusing?
    - Are D3-D5 wraparound bridges obvious in hindsight without being obvious in advance?

## Implementation Packet

1. `version_id`: Islemark v1
2. `algorithm_game_spec`: row-major island sweep with one launch per fresh root and automatic orthogonal coast charting
3. `prototype_scope`: one `Islemark` screen, five difficulty presets, fixed boards, launch history, charted-coast visualization, and solver evaluation against an edge-only local heuristic
4. `difficulty_scope`: D1 teaches the basic count-once sweep, D2 introduces diagonal traps, and D3-D5 punish local root heuristics with wraparound bridges and dense channels
5. `non_goals`:
   - no union-find framing in this pass
   - no hidden board information or fog-of-war
   - no claim that this build directly covers `#417` or other graph problems beyond component counting
6. `predicted_scorecard`:
   - `solvability`: `1.00`
   - `skill_depth`: `0.34`
   - `counterintuitive_moves`: `2.0`
   - `algorithm_alignment`: `1.00`
   - `greedy_optimal_gap`: `0.34`

## Prototype Package

1. `game_entrypoint`: `src/games/Islemark.tsx`
2. `difficulty_controls`: five difficulty chips plus `Reset Sweep`
3. `changed_files`:
   - `src/solvers/Islemark.solver.ts`
   - `src/games/Islemark.tsx`
   - `src/games/index.ts`
   - `leetcode/specs/islemark.md`
   - `leetcode/curriculum.md`
   - `leetcode/results.tsv`
   - `run-program.md`
4. `artifact_paths`:
   - `src/solvers/Islemark.solver.ts`
   - `src/games/Islemark.tsx`
   - `leetcode/specs/islemark.md`
5. `actual_scorecard`:
   - `solvability`: `100%`
   - `skill_depth`: `48.3%`
   - `counterintuitive_moves`: `11.2`
   - `drama`: `0.67`
   - `decision_entropy`: `1.00`
   - `info_gain_ratio`: `1.93`
   - `algorithm_alignment`: `100%`
   - `leetCode_fit`: `100%`
   - `best_alternative_gap`: `48.3%`
   - `invariant_pressure`: `100%`
   - `difficulty_breakpoint`: `D3`
6. `known_issues`:
   - Live blind browser play is still unavailable in this sandbox, so the blind report below is grounded in solver evaluation, direct UI inspection, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`.

## Blind Play Report

- `rules_clarity`: The row-major sweep plus the charted-coast tint make the job readable. The main blind risk is whether players immediately trust that visible land can still be dead because an earlier launch already consumed that whole island.
- `easy_strategy`: D1 should read as "launch on new land, let the tide spread, and pass water." The basic count-once rhythm appears quickly.
- `medium_strategy`: D2 teaches that diagonals do not merge islands, so players stop counting near-touches as one coast.
- `hard_strategy`: D3-D5 demand the full component rule. Players have to pass visible land that only looks fresh if they ignore the earlier wraparound bridge that already charted it.
- `strategy_evolution`: The expected shift is from "count each separate-looking blob" to "count only truly fresh land, because one launch kills the entire connected component."
- `plain_english_pattern`: "As I sweep the map, I launch exactly once when I hit a coastline that has not already turned green, and that launch claims every shore tile connected to it."
- `naive_vs_optimal`: The strongest wrong strategy is the edge-only shortcut that launches whenever a land cell lacks land directly above or left. It survives easy boards and then overcounts wraparound islands that were already claimed from an earlier root.
- `confusion_points`: The hardest teaching moment is the first later land tile that should be passed even though it still looks isolated by local neighborhood alone.
- `bug_summary`: No blocking implementation bugs surfaced during solver evaluation, direct UI inspection, `npx tsc --noEmit`, or `env CI=1 npx expo export --platform web`.
- `verdict`: keep

## Decision Memo

- `decision`: keep
- `why`: Islemark teaches Blind 75 `#200 Number of Islands` directly enough to justify a dedicated kept game. The kept build turns the outer scan plus inner flood fill into one readable loop, keeps `100%` solvability, hits a `48.3%` strongest-alternative gap against the edge-only shortcut, and lands the intended `D3` breakpoint where local root heuristics stop working.
- `evidence_used`: `node --experimental-strip-types --input-type=module` evaluation from `src/solvers/Islemark.solver.ts`, direct UI inspection, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`
- `bug_status`: no open implementation bugs
- `algorithm_alignment_judgment`: strong enough to claim Blind 75 `#200` directly because optimal play now requires both parts of the real solution: counting only fresh land and consuming the whole connected component immediately
- `next_action`: mark `#200` complete in the Blind 75 tracker and leave the next outer-loop pass for `#133 Clone Graph`
- `polish_scope`: if later browser play is available, validate that new players understand why some later land cells are already dead before the cursor reaches them

## Concept Bridge

This game teaches grid flood fill for connected-component counting. For the Blind 75 tracker, the kept `Islemark` game claims `#200 Number of Islands`.

The moment where a launch on fresh land increments the count maps to the `if grid[r][c] == '1' and not visited` branch that adds one island. The moment where the whole coastline turns charted at once maps to the BFS or DFS that marks every orthogonally connected land cell visited before the outer scan keeps moving.
