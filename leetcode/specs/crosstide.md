# Crosstide

## Algorithm Game Spec

1. `game_name`: Crosstide
2. `algorithm_target`: 2.3c Reverse Reachability / Dual-Border Flood Fill
3. `core_insight`: Do not test each interior basin by pouring water outward. Start one reverse tide from the Pacific border and one from the Atlantic border, let each tide climb only into equal-or-higher neighbors, and keep only the cells both tides can still reach.
4. `one_line_pitch`: Raise two inland tides from opposite coasts and chart only the basins both seas can still stain.
5. `rules`:
   - The full height grid is visible from the start.
   - Pacific border cells on the top and left start pre-wet for Pacific.
   - Atlantic border cells on the bottom and right start pre-wet for Atlantic.
   - The player chooses one tide at a time.
   - A tide may expand only from one of its already wet cells into an orthogonally adjacent cell of equal or greater height.
   - A newly wet cell may belong to Pacific, Atlantic, or both if both tides later reach it.
   - `Seal Chart` ends the run and checks whether both reverse tide maps are complete.
6. `core_actions`:
   - choose Pacific or Atlantic as the active tide
   - inspect the live frontier for that tide
   - wet one equal-or-higher adjacent basin from that frontier
   - switch tides when the other shore has more useful frontier pressure
   - seal only after both reachability maps feel complete
7. `algorithm_to_mechanic_mapping`:
   - The height grid maps to the `heights` matrix.
   - Pacific and Atlantic border seeds map to the two multi-source DFS or BFS start sets.
   - Wetting one new basin for one tide maps to visiting a neighbor in the reverse graph when `heights[next] >= heights[current]`.
   - Keeping Pacific and Atlantic stains separate maps to maintaining two visited sets.
   - A basin stained by both seas maps to the intersection of those two visited sets.
   - `Seal Chart` maps to returning every coordinate present in both reachability maps.
8. `why_greedy_fails`: The strongest near miss is partial-shore scouting. It starts from only one obvious edge lane or rejects flat shelves as dead. That shortcut survives the easiest board, but medium and higher boards contain equal-height shelves and alternate harbor entries that only the full multi-source reverse flood can capture.
9. `aha_moment`: "I am not proving each basin from the inside. I am letting each sea climb inward from every shore and keeping only the cells both maps stain."
10. `difficulty_progression`:
    - D1: One rising spine makes the reverse rule legible immediately.
    - D2: Flat shelves teach that equal heights still carry the reverse tide.
    - D3: The classic crosscurrent board makes the two oceans meet along different interior routes.
    - D4: Side harbors and wide shelves punish one-edge scouting.
    - D5: A larger harbor net forces the full top/left and bottom/right multi-source mindset.
11. `predicted_failure_mode`: If the active tide and legal frontier are not legible, players may misread the task as forward drainage from each basin instead of reverse reachability from the coasts.
12. `acceptance_criteria`:
    - Winning play should be describable as "run two reverse floods from the borders and keep only the overlap."
    - Solver evaluation must keep `100%` solvability across the shipped difficulty set.
    - The strongest near miss should fail once flat shelves and alternate border entries matter.
    - The post-game bridge should claim Blind 75 `#417 Pacific Atlantic Water Flow` directly and only.
13. `predicted_scorecard`:
    - `skill_depth`: `0.44`
    - `counterintuitive_moves`: `7.0`
    - `algorithm_alignment`: `1.00`
    - `greedy_optimal_gap`: `0.40`
    - `difficulty_curve`: `D2`
    - `insight_inflection`: `D2`
14. `open_questions_for_engineering`:
    - Is the selected-tide frontier obvious enough that players always know which cells are legal for Pacific versus Atlantic?
    - Do dual-stained cells read as an intersection payoff rather than a third independent state?
    - Does the larger D5 board stay readable on mobile without flattening the tide colors?

## Implementation Packet

1. `version_id`: Crosstide v1
2. `algorithm_game_spec`: dual reverse border floods on a height grid with one Pacific map, one Atlantic map, and a final overlap claim
3. `prototype_scope`: one `Crosstide` screen, five fixed difficulty boards, tide selection controls, live frontier highlighting, solver evaluation against partial-shore alternatives, and a direct Blind 75 concept bridge
4. `difficulty_scope`: D1 teaches the reverse climb rule, D2 adds flat shelves, D3 adds separate interior meetups, and D4-D5 require the full multi-source border interpretation
5. `non_goals`:
   - no claim that this pass also covers generic flood fill or `#200 Number of Islands`
   - no browser-recorded blind session inside this sandbox
   - no diagonal flow, weighted terrain, or animated water simulation in this pass
6. `predicted_scorecard`:
   - `solvability`: `1.00`
   - `skill_depth`: `0.44`
   - `counterintuitive_moves`: `7.0`
   - `algorithm_alignment`: `1.00`
   - `greedy_optimal_gap`: `0.40`

## Prototype Package

1. `game_entrypoint`: `src/games/Crosstide.tsx`
2. `difficulty_controls`: five difficulty chips plus Pacific/Atlantic tide toggles, `Seal Chart`, `Reset Map`, and `New Map`
3. `changed_files`:
   - `src/solvers/Crosstide.solver.ts`
   - `src/games/Crosstide.tsx`
   - `src/games/index.ts`
   - `leetcode/specs/crosstide.md`
   - `leetcode/curriculum.md`
   - `leetcode/results.tsv`
   - `run-program.md`
4. `artifact_paths`:
   - `src/solvers/Crosstide.solver.ts`
   - `src/games/Crosstide.tsx`
   - `leetcode/specs/crosstide.md`
5. `actual_scorecard`:
   - `solvability`: `100%`
   - `skill_depth`: `82.2%`
   - `counterintuitive_moves`: `10.6`
   - `drama`: `0.78`
   - `decision_entropy`: `2.12`
   - `info_gain_ratio`: `2.69`
   - `algorithm_alignment`: `100%`
   - `leetCode_fit`: `100%`
   - `best_alternative_gap`: `65.5%`
   - `invariant_pressure`: `100%`
   - `difficulty_breakpoint`: `D2`
6. `known_issues`:
   - Live blind browser play was not run in this sandbox. The blind report below is based on solver evaluation, direct UI inspection, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`.
   - Because the mechanic is a visible reachability build, many legal move orders still solve the board once the player internalizes the reverse-climb invariant. The teaching pressure comes from selecting the correct frontier rule, not from one narrow action sequence.

## Blind Play Report

- `rules_clarity`: The border stains, tide toggles, and highlighted frontier make the reverse-flood job readable. The main blind risk is whether first-time players immediately understand that the oceans are climbing inward, not flowing downhill out from the chosen basin.
- `easy_strategy`: D1 should read as "keep growing the ocean from the shore into taller land." That establishes the reverse-reachability frame quickly.
- `medium_strategy`: D2 is the first real transfer moment. The player has to trust that equal-height shelves still carry the tide, even when a strict climb instinct says otherwise.
- `hard_strategy`: D4-D5 demand the full multi-source rule. The player must keep all relevant shore entries alive instead of overfitting to one obvious border lane.
- `strategy_evolution`: The expected shift is from "guess whether a basin drains to both seas" to "build both sea maps directly from the coasts and read the overlap."
- `plain_english_pattern`: "Let each sea creep inward only through equal-or-higher neighboring land, finish both coast maps, and keep only the basins touched by both."
- `naive_vs_optimal`: The strongest wrong strategy is partial-shore scouting, which either ignores flat shelves or treats one border lane as the whole sea. It survives easy terrain and then misses real overlap cells once alternate harbors matter.
- `confusion_points`: The most fragile teaching point is the first flat shelf that should stay live for a tide even though the height does not increase.
- `bug_summary`: No blocking implementation bugs surfaced during solver evaluation, direct UI inspection, `npx tsc --noEmit`, or `env CI=1 npx expo export --platform web`.
- `verdict`: keep

## Decision Memo

- `decision`: keep
- `why`: Crosstide teaches Blind 75 `#417 Pacific Atlantic Water Flow` directly enough to justify a dedicated kept game. The kept build turns the reverse-border insight into explicit play, keeps `100%` solvability, reaches `100%` algorithm alignment and LeetCode fit, and records a `65.5%` strongest-alternative gap against partial-shore shortcuts that skip flat shelves or alternate border sources.
- `evidence_used`: `node --experimental-strip-types --input-type=module` evaluation from `src/solvers/Crosstide.solver.ts`, direct UI inspection, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`
- `bug_status`: no open implementation bugs
- `algorithm_alignment_judgment`: strong enough to claim Blind 75 `#417` directly because optimal play requires the real solution shape: two border-seeded reverse floods plus an overlap readout
- `next_action`: mark `#417` complete in the Blind 75 tracker and leave the next outer-loop pass for `#207 Course Schedule`
- `polish_scope`: if browser-capable blind play becomes available later, confirm that first-time players infer the reverse-climb rule before they fall back to forward drainage intuition

## Concept Bridge

This game teaches reverse reachability with dual border floods. For the Blind 75 tracker, the kept `Crosstide` game claims `#417 Pacific Atlantic Water Flow`.

The moment where Pacific or Atlantic can wet only an equal-or-higher adjacent basin maps to traversing a reverse edge when `heights[next] >= heights[current]`. The moment where a basin turns into a shared green payoff maps to intersecting the Pacific-visited and Atlantic-visited sets before returning the answer coordinates.
