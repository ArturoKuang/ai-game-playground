# Syllabind

## Algorithm Game Spec

1. `game_name`: Syllabind
2. `algorithm_target`: 3.3 Topological Sort
3. `core_insight`: Do not stare at the whole prerequisite web and guess whether it works. Keep a live rail of courses whose unmet prerequisite count is zero, clear one, peel one seal from each dependent, and if that ready rail empties before the catalog does, the leftover courses are trapped in a cycle.
4. `one_line_pitch`: Peel prerequisite seals from a course catalog until every course clears or the ready rail proves a deadlock.
5. `rules`:
   - The full course catalog and every prerequisite link are visible from the start.
   - A course may be taught only when its unmet prerequisite count is zero.
   - Teaching a course clears it permanently and removes one prerequisite seal from each dependent course.
   - The ready rail always shows every currently teachable course.
   - `Call Deadlock` is correct only when the ready rail is empty while uncleared courses remain.
   - `Seal Schedule` is correct only when every course is already cleared.
6. `core_actions`:
   - inspect the ready rail
   - teach one zero-seal course
   - watch dependent seal counts drop
   - keep peeling every newly ready course
   - call deadlock if the ready rail dries up before the catalog is done
7. `algorithm_to_mechanic_mapping`:
   - Each course card maps to one graph node.
   - Each prerequisite seal maps to one incoming edge that still contributes to the node's indegree.
   - The ready rail maps to the queue of zero-indegree nodes.
   - Teaching one course maps to popping one zero-indegree node from the queue.
   - Peeling seals from dependents maps to decrementing indegrees on outgoing edges.
   - `Call Deadlock` maps to the queue-empty check that proves a cycle when unvisited nodes remain.
8. `why_greedy_fails`: The strongest near miss is local chain-following. It keeps teaching only the newest unlocks and calls a deadlock as soon as that one chain stops producing fresh courses. That shortcut survives the single-source tutorial board, but D2 immediately breaks it with multiple simultaneous sources, and D3-D5 break it again by requiring an explicit empty-ready-rail cycle call only after every peelable course is gone.
9. `aha_moment`: "I do not need to guess the whole order. I just keep clearing every course whose seals are already gone, and if that queue ever runs empty too soon, the rest must loop."
10. `difficulty_progression`:
    - D1: A single-source chain makes the seal-peeling loop obvious.
    - D2: Several sources and a shared join punish one-lane chain following.
    - D3: The first leftover cycle teaches the empty-ready-rail deadlock test.
    - D4: A deeper knot hides the cycle until several clean peel waves have already passed.
    - D5: A larger dean-cycle catalog forces full trust in the live indegree counts rather than visual guessing.
11. `predicted_failure_mode`: If the ready rail is not treated as the whole frontier, players may follow one fresh unlock chain and call deadlock while other zero-seal courses are still waiting.
12. `acceptance_criteria`:
    - Winning play should be describable as "keep clearing zero-seal courses and call deadlock only when none remain."
    - Solver evaluation must keep `100%` solvability across the shipped catalog set.
    - The strongest near miss should fail once multiple ready sources matter.
    - The kept bridge should claim Blind 75 `#207 Course Schedule` directly and only.
13. `predicted_scorecard`:
    - `skill_depth`: `0.43`
    - `counterintuitive_moves`: `3.0`
    - `algorithm_alignment`: `1.00`
    - `greedy_optimal_gap`: `0.45`
    - `difficulty_curve`: `D2`
    - `insight_inflection`: `D2`
14. `open_questions_for_engineering`:
    - Does the ready rail feel obviously complete enough that players trust it over one vivid local chain?
    - Are unmet prerequisite counts legible enough on mobile when several locked courses stack together?
    - Does the deadlock button read as a proof step rather than a surrender button?

## Implementation Packet

1. `version_id`: Syllabind v1
2. `algorithm_game_spec`: course catalog peeling with visible unmet-seal counts, a live ready rail, and an explicit deadlock call when the zero-seal frontier disappears early
3. `prototype_scope`: one `Syllabind` screen, five difficulty presets, fixed prerequisite catalogs, solver evaluation against a local chain-following near miss, and a direct Blind 75 concept bridge
4. `difficulty_scope`: D1 teaches the zero-seal peel loop, D2 adds several simultaneous sources, D3 introduces the first deadlock proof, and D4-D5 hide deeper cycles behind multiple clean unlock waves
5. `non_goals`:
   - no alien alphabet edge-discovery layer in this pass
   - no browser-recorded blind session inside this sandbox
   - no claim that this pass also covers `#269 Alien Dictionary` or union-find graph problems
6. `predicted_scorecard`:
   - `solvability`: `1.00`
   - `skill_depth`: `0.43`
   - `counterintuitive_moves`: `3.0`
   - `algorithm_alignment`: `1.00`
   - `greedy_optimal_gap`: `0.45`

## Prototype Package

1. `game_entrypoint`: `src/games/Syllabind.tsx`
2. `difficulty_controls`: five difficulty chips plus `Teach` actions for every ready course, `Call Deadlock`, `Seal Schedule`, `Reset Catalog`, and `New Catalog`
3. `changed_files`:
   - `src/solvers/Syllabind.solver.ts`
   - `src/games/Syllabind.tsx`
   - `src/games/index.ts`
   - `leetcode/specs/syllabind.md`
   - `leetcode/curriculum.md`
   - `leetcode/results.tsv`
   - `run-program.md`
4. `artifact_paths`:
   - `src/solvers/Syllabind.solver.ts`
   - `src/games/Syllabind.tsx`
   - `leetcode/specs/syllabind.md`
5. `actual_scorecard`:
   - `solvability`: `100%`
   - `skill_depth`: `73.0%`
   - `counterintuitive_moves`: `3.7`
   - `drama`: `0.86`
   - `decision_entropy`: `1.42`
   - `info_gain_ratio`: `1.30`
   - `algorithm_alignment`: `100%`
   - `leetCode_fit`: `100%`
   - `best_alternative_gap`: `80.0%`
   - `invariant_pressure`: `100%`
   - `difficulty_breakpoint`: `D2`
6. `known_issues`:
   - Live blind browser play was not run in this sandbox. The blind report below is based on solver evaluation, direct UI inspection of the rendered component structure, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`.
   - The mechanic intentionally leaves order choice inside the current ready rail unconstrained. The teaching pressure comes from maintaining the full zero-indegree frontier and recognizing the empty-ready-rail cycle proof, not from one exact topological order.

## Blind Play Report

- `rules_clarity`: The ready rail and unmet-seal counts make the legal move rule readable. The main blind risk is whether players trust the whole ready rail as the frontier instead of overfitting to one just-unlocked chain.
- `easy_strategy`: D1 should read as "teach the only course whose seals are gone, then keep following the newly opened course."
- `medium_strategy`: D2 is the real transfer moment. The player has to treat several zero-seal sources as one shared rail rather than declaring deadlock when one chosen chain dries up.
- `hard_strategy`: D3-D5 demand the full deadlock proof. The player must keep peeling every available zero-seal course, then recognize that an empty rail with courses left means the remaining knot is cyclic.
- `strategy_evolution`: The expected shift is from "guess an order by eye" to "maintain the queue of zero-seal courses and let the counts prove whether the catalog is finishable."
- `plain_english_pattern`: "Keep teaching whichever courses already have no unmet prerequisites, remove their locks from later courses, and if that ready line ever empties before the catalog does, the leftovers are stuck in a loop."
- `naive_vs_optimal`: The strongest wrong strategy is local chain-following. It handles the tutorial chain, then fails as soon as multiple sources or leftover cycles require the whole ready rail rather than one branch.
- `confusion_points`: The most fragile teaching point is the deadlock button. It has to read as a proof that no zero-seal course remains, not as a guess or surrender.
- `bug_summary`: No blocking implementation bugs surfaced during solver evaluation, `npx tsc --noEmit`, or `env CI=1 npx expo export --platform web`.
- `verdict`: keep

## Decision Memo

- `decision`: keep
- `why`: Syllabind teaches Blind 75 `#207 Course Schedule` directly enough to justify a dedicated kept game. The kept build turns Kahn-style zero-indegree peeling plus early-empty-queue cycle detection into explicit play, keeps `100%` solvability, hits `73.0%` average skill depth, and records an `80.0%` strongest-alternative gap against local chain-following that stops tracking the full ready rail.
- `evidence_used`: `node --experimental-strip-types --input-type=module` evaluation from `src/solvers/Syllabind.solver.ts`, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`
- `bug_status`: no open implementation bugs
- `algorithm_alignment_judgment`: strong enough to claim Blind 75 `#207` directly because optimal play requires the actual solution shape: repeated zero-indegree removal plus an explicit empty-queue cycle proof
- `next_action`: mark `#207` complete in the Blind 75 tracker and leave the next outer-loop pass for `#261 Graph Valid Tree`
- `polish_scope`: when a browser-capable blind play environment is available, confirm that first-time players interpret `Call Deadlock` as a proof step rather than a bail-out

## Concept Bridge

This game teaches topological sorting by indegree peeling. For the Blind 75 tracker, the kept `Syllabind` game claims `#207 Course Schedule`.

The moment where the ready rail holds every zero-seal course maps to the queue of zero-indegree nodes. The moment where teaching one course peels seals from its dependents maps to decrementing indegrees on outgoing edges. The moment where `Call Deadlock` is correct only after the ready rail empties with courses left maps to the `visitedCount < numCourses` cycle check after Kahn's queue runs dry.
