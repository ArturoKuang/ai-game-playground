# Echoforge

## Algorithm Game Spec

1. `game_name`: Echoforge
2. `algorithm_target`: 2.3b Graph Clone / Memoized Traversal
3. `core_insight`: The first time the traversal reaches an original beacon, it must forge that beacon's echo immediately and file the pairing. Every later edge that reaches the same original beacon must reuse the stored echo instead of creating a duplicate.
4. `one_line_pitch`: Walk a graph vault, forge exactly one echo per beacon, and close every later wire onto the stored echo before sealing the mirror hall.
5. `rules`:
   - The full original graph is visible from the start.
   - The run begins at one highlighted root beacon.
   - `Forge Echo` creates the one stored mirror for the current beacon.
   - `Descend` moves into an adjacent beacon that does not yet have a stored echo.
   - `Link Existing` is used when an open wire reaches a beacon whose echo already exists.
   - `Return` is legal only when the current beacon has no open wires left.
   - `Seal Copy` is legal only when every original beacon has exactly one echo and every original wire has been mirrored.
6. `core_actions`:
   - inspect the current beacon and its open wires
   - forge the beacon's echo the first time it is reached
   - descend into fresh neighbors to extend the traversal
   - reuse a stored echo when a loop or shared junction reaches an already mirrored beacon
   - return only after the current beacon is fully resolved
7. `algorithm_to_mechanic_mapping`:
   - The original vault graph is the input adjacency list.
   - The traversal trail is the DFS or BFS frontier path.
   - `Forge Echo` maps to creating `copy = new Node(val)` and writing `copies.set(node, copy)` before exploring neighbors.
   - `Link Existing` maps to the memo lookup branch `if (copies.has(node)) return copies.get(node)`.
   - The mirror hall wiring maps to pushing cloned neighbors into the current clone's adjacency list.
   - `Return` maps to unwinding after the current node's neighbors have all been handled.
8. `why_greedy_fails`: The strongest near miss is parent-only reuse. It remembers the echo you just came from, so tree-shaped boards still look safe, but loops and shared junctions eventually revisit an older beacon from a different route. Without a full old-to-new registry, that revisit feels fresh and the clone hall forks into duplicates.
9. `aha_moment`: "Seeing the beacon again does not mean forge again. I already paid for that beacon once, so this wire must close onto the stored echo."
10. `difficulty_progression`:
    - D1: A simple chain teaches the base forge-descend-return rhythm.
    - D2: The first loop forces explicit reuse of an older echo.
    - D3: A shared far junction punishes duplicate forging from two parents.
    - D4: Multiple crosslinks make local memory unreliable.
    - D5: Two loops sharing one hinge require a stable registry for the whole traversal.
11. `predicted_failure_mode`: If the mirror hall does not clearly show that one echo can receive links from multiple routes, players may misread the task as generic depth-first traversal and miss the one-clone-per-original invariant.
12. `acceptance_criteria`:
    - Winning play should be describable as "forge a beacon once, then reuse that stored echo on every revisit."
    - Solver evaluation must keep `100%` solvability across shipped graphs.
    - The strongest near miss should survive D1 and then fail once loops and shared junctions appear.
    - The post-game bridge should claim Blind 75 `#133 Clone Graph` directly and only.
13. `predicted_scorecard`:
    - `skill_depth`: `0.44`
    - `counterintuitive_moves`: `3.0`
    - `algorithm_alignment`: `1.00`
    - `greedy_optimal_gap`: `0.44`
    - `difficulty_curve`: `D2`
    - `insight_inflection`: `D2`
14. `open_questions_for_engineering`:
    - Does the mirror hall make stored-echo reuse legible enough on the first loop?
    - Are shared-junction boards readable without drawn graph lines, or do the node cards and wire ledgers carry enough structure?
    - Is the return rule clear enough that the game feels like "finish this beacon's wires before backing out" instead of arbitrary gating?

## Implementation Packet

1. `version_id`: Echoforge v1
2. `algorithm_game_spec`: graph traversal with one stored echo per original beacon, explicit reuse on revisits, and return gating only after all current wires are resolved
3. `prototype_scope`: one `Echoforge` screen, five difficulty presets, fixed graph blueprints, mirror hall registry, open-wire ledger, and solver evaluation against a parent-only reuse alternative
4. `difficulty_scope`: D1 teaches the base clone rhythm, D2 introduces the first loop, D3 adds a shared cloned junction, and D4-D5 compound the revisit pressure with crosslinks and twin loops
5. `non_goals`:
   - no claim that this pass also covers `#207 Course Schedule`, `#261 Graph Valid Tree`, or other graph problems with different invariants
   - no browser-recorded blind session inside this sandbox
   - no requirement that the player learn a specific DFS versus BFS ordering, only the one-clone-per-node memo rule plus traversal completion
6. `predicted_scorecard`:
   - `solvability`: `1.00`
   - `skill_depth`: `0.44`
   - `counterintuitive_moves`: `3.0`
   - `algorithm_alignment`: `1.00`
   - `greedy_optimal_gap`: `0.44`

## Prototype Package

1. `game_entrypoint`: `src/games/Echoforge.tsx`
2. `difficulty_controls`: five difficulty chips plus `Reset Hall` and `New Graph`
3. `changed_files`:
   - `src/solvers/Echoforge.solver.ts`
   - `src/games/Echoforge.tsx`
   - `src/games/index.ts`
   - `leetcode/specs/echoforge.md`
   - `leetcode/curriculum.md`
   - `leetcode/results.tsv`
   - `run-program.md`
4. `artifact_paths`:
   - `src/solvers/Echoforge.solver.ts`
   - `src/games/Echoforge.tsx`
   - `leetcode/specs/echoforge.md`
5. `actual_scorecard`:
   - `solvability`: `100%`
   - `skill_depth`: `80.0%`
   - `counterintuitive_moves`: `4.4`
   - `drama`: `0.85`
   - `decision_entropy`: `1.41`
   - `info_gain_ratio`: `1.82`
   - `algorithm_alignment`: `100%`
   - `leetCode_fit`: `100%`
   - `best_alternative_gap`: `80.0%`
   - `invariant_pressure`: `100%`
   - `difficulty_breakpoint`: `D2`
6. `known_issues`:
   - Live blind browser play is still unavailable in this sandbox, so the blind report below is grounded in solver evaluation, direct UI inspection, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`.
   - The current board uses node cards and wire pills instead of drawn graph geometry. That keeps the state legible in React Native but should be revisited later if a more spatial graph presentation becomes useful.

## Blind Play Report

- `rules_clarity`: The root beacon, open-wire buttons, and mirror hall registry make the clone job readable. The main blind risk is whether new players immediately trust that a previously seen beacon reached from a new route should still close onto the old echo.
- `easy_strategy`: D1 should read as "forge here, go deeper, finish the end, then walk back out." The chain keeps the base traversal rhythm obvious.
- `medium_strategy`: D2 is the first real transfer point. Players have to stop treating a looped-back beacon as fresh and instead reuse the stored echo.
- `hard_strategy`: D4-D5 demand a real registry mindset. Local memory of the immediate parent is no longer enough once several routes can reach the same beacon.
- `strategy_evolution`: The expected shift is from "copy what I see next" to "copy each beacon once, then route every later wire into that stored copy."
- `plain_english_pattern`: "Whenever I reach a beacon for the first time, I forge and file its echo. After that, every route back to that beacon must hook into the same stored echo."
- `naive_vs_optimal`: The strongest wrong strategy is parent-only reuse. It survives the chain board, then breaks as soon as a loop or shared junction revisits an older beacon from a non-parent route.
- `confusion_points`: The hardest teaching moment is the first board where a beacon already has an echo even though the current path has not touched it recently.
- `bug_summary`: No blocking implementation bugs surfaced during solver evaluation, direct UI inspection, `npx tsc --noEmit`, or `env CI=1 npx expo export --platform web`.
- `verdict`: keep

## Decision Memo

- `decision`: keep
- `why`: Echoforge teaches Blind 75 `#133 Clone Graph` directly enough to justify a dedicated kept game. The kept build turns graph traversal plus memoized clone reuse into one visible loop, keeps `100%` solvability, lands an `80.0%` strongest-alternative gap against parent-only reuse, and breaks that near miss cleanly at `D2` when the first cycle appears.
- `evidence_used`: `node --experimental-strip-types --input-type=module` evaluation from `src/solvers/Echoforge.solver.ts`, direct UI inspection, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`
- `bug_status`: no open implementation bugs
- `algorithm_alignment_judgment`: strong enough to claim Blind 75 `#133 Clone Graph` directly because optimal play requires both key ideas from the real solution: traversing the graph and memoizing exactly one clone per original node for all revisits
- `next_action`: mark `#133` complete in the Blind 75 tracker and leave the next outer-loop pass for `#417 Pacific Atlantic Water Flow`
- `polish_scope`: if later browser play is available, validate that first-time players infer "stored echo reuse" from the mirror hall before they overfit to immediate-parent memory

## Concept Bridge

This game teaches graph cloning with memoized traversal. For the Blind 75 tracker, the kept `Echoforge` game claims `#133 Clone Graph`.

The moment where you forge a beacon's echo the first time you arrive maps to creating the clone node and storing it in `oldToNew`. The moment where a later loop closes onto an older echo instead of minting another one maps to the `if (oldToNew.has(node)) return oldToNew.get(node)` branch that prevents duplicate copies and correctly reuses neighbors.
