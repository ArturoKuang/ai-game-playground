# Wakeline

## Algorithm Game Spec

1. `game_name`: Wakeline
2. `algorithm_target`: 2.8 Runner Pointers
3. `core_insight`: You do not need breadcrumbs to certify whether a one-way chain loops. Launch one patrol boat that advances one hop per pulse and a second that advances two. If the faster boat reaches open water, the chain ends. If it ever catches the slower boat, the tail must curl back into a loop.
4. `one_line_pitch`: Patrol a buoy chain with a drifter and a faster cutter until escape proves open water or collision proves a loop.
5. `rules`:
   - Every buoy points to exactly one next buoy, except the hidden tail hook may drain to open water or curl back to an earlier buoy.
   - `Wake Pulse` advances the drifter one buoy and the cutter two buoys.
   - `Drop Flare` marks the drifter's current buoy, but costs one action.
   - If the cutter reaches open water, the route is certified clear immediately.
   - If the cutter lands on the drifter, the route is certified as a loop immediately.
   - Later difficulties cap fuel tightly enough that flare-heavy patrols fail before the chase resolves.
6. `core_actions`:
   - move the drifter one hop
   - move the cutter two hops on the same chain
   - observe whether the cutter escapes or collides
   - resist spending fuel on unnecessary breadcrumb flares
7. `algorithm_to_mechanic_mapping`:
   - The drifter is `slow`.
   - The cutter is `fast`.
   - `Wake Pulse` maps to `slow = slow.next` and `fast = fast.next.next`.
   - Cutter escape maps to `fast == null` or `fast.next == null`, which proves there is no cycle.
   - Cutter collision maps to `slow == fast`, which proves a cycle exists.
   - `Drop Flare` is the tempting visited-set alternative, not the target invariant.
8. `why_greedy_fails`: The safe-looking plan is to drop a flare on every buoy before pulsing again. That mirrors the instinct to store visited nodes, but medium-plus fuel caps make those breadcrumbs too expensive. The stronger invariant is that the two-speed chase already answers the yes/no question for free.
9. `aha_moment`: "I do not need to remember every buoy. If the faster boat can escape, the chain ends. If it ever catches the slower one, the tail must loop back."
10. `difficulty_progression`:
    - D1: Short harbor checks let flare-heavy play survive, so the wake pattern can be noticed without pressure.
    - D2: Longer canals still tolerate the safe plan, but the fuel waste becomes visible.
    - D3: The budget becomes exact and flare-heavy patrols now fail.
    - D4: Longer prefixes punish every wasted breadcrumb.
    - D5: Only the pure wake pulse fits reliably from start to finish.
11. `predicted_failure_mode`: If the hidden tail hook is revealed too early, the board collapses into simple visual inspection instead of chase-based certification.
12. `acceptance_criteria`:
    - The winning pattern is describable as "move one boat by one and the other by two until the fast one escapes or collides."
    - Flare-heavy play survives on Easy and fails by D3.
    - The post-game bridge can claim Blind 75 `#141 Linked List Cycle` directly and specifically.
    - The board keeps the tail hook hidden until a patrol boat actually reaches the tail.
13. `predicted_scorecard`:
    - `skill_depth`: `0.42` because flare-happy play should stay alive on D1-D2 before the D3 fuel cap kills it.
    - `counterintuitive_moves`: `0.60` because the hard lesson is refusing to mark visited buoys.
    - `algorithm_alignment`: `1.00` because every winning move is the fast/slow pointer pulse.
    - `greedy_optimal_gap`: `0.45` because breadcrumb play should be viable early and collapse once fuel tightens.
    - `difficulty_curve`: `D3`.
    - `insight_inflection`: `D3`.
14. `open_questions_for_engineering`:
    - Does the hidden tail hook stay opaque enough that players do not solve by inspection?
    - Does `Drop Flare` read as a fair but inferior safety blanket rather than a trap button?
    - Is the cutter/drifter framing legible enough that players can narrate the plain-English invariant after play?

## Implementation Packet

1. `version_id`: Wakeline v1
2. `algorithm_game_spec`: two patrol boats on a one-way buoy chain, with exact-budget medium levels that force fast/slow chase instead of breadcrumb marking
3. `prototype_scope`: one `Wakeline` screen, five difficulty presets, rerollable fixed channels, hidden tail-hook reveal, wake log, and solver evaluation for optimal vs flare-heavy patrol
4. `difficulty_scope`: D1-D2 allow breadcrumb play to survive, D3 makes it fail, and D4-D5 extend the same invariant across longer prefixes
5. `non_goals`:
   - no shared Blind 75 claim for `#142 Linked List Cycle II` in this pass
   - no pointer-reset teaching for locating the cycle entry
   - no shared claim for `#876 Middle of the Linked List`
6. `predicted_scorecard`:
   - `solvability`: `1.00`
   - `skill_depth`: `0.42`
   - `counterintuitive_moves`: `0.60`
   - `algorithm_alignment`: `1.00`
   - `greedy_optimal_gap`: `0.45`

## Prototype Package

1. `game_entrypoint`: `src/games/Wakeline.tsx`
2. `difficulty_controls`: five difficulty chips plus `Reset Patrol` and `New Channel`
3. `changed_files`:
   - `src/games/Wakeline.tsx`
   - `src/solvers/Wakeline.solver.ts`
   - `src/games/index.ts`
   - `leetcode/curriculum.md`
   - `leetcode/specs/wakeline.md`
   - `leetcode/learnings.md`
   - `leetcode/results.tsv`
   - `run-program.md`
4. `artifact_paths`:
   - `leetcode/specs/wakeline.md`
   - `src/games/Wakeline.tsx`
   - `src/solvers/Wakeline.solver.ts`
5. `actual_scorecard`:
   - `solvability`: `100%`
   - `skill_depth`: `47.3%`
   - `counterintuitive_moves`: `4.24`
   - `drama`: `38.2%`
   - `decision_entropy`: `1.00`
   - `info_gain_ratio`: `3.00`
   - `algorithm_alignment`: `100%`
   - `leetCode_fit`: `100%`
   - `best_alternative_gap`: `72.0%`
   - `invariant_pressure`: `72.6%`
   - `difficulty_breakpoint`: `D3`
6. `known_issues`:
   - Live blind browser play was not run in this sandbox. The blind report below is based on solver-driven state walkthroughs, direct UI inspection, `npx tsc --noEmit`, `node --experimental-strip-types --input-type=module -e "import { evaluateWakeline } from './src/solvers/Wakeline.solver.ts'; console.log(JSON.stringify(evaluateWakeline(), null, 2));"`, and `env CI=1 npx expo export --platform web`.

## Blind Play Report

- `rules_clarity`: The drifter/cutter split is compact and readable. The main comprehension risk is whether players initially believe the flare button is mandatory because the tail hook begins hidden.
- `easy_strategy`: Early play should feel cautious: drop flares, pulse the boats, and watch for the tail hook reveal.
- `medium_strategy`: By D2 the player should start noticing that the flares are not doing the real work. The verdict still comes from escape or collision.
- `hard_strategy`: D3-D5 demand the plain wake invariant: pulse the drifter once and the cutter twice until the channel certifies itself. Breadcrumbs are dead weight.
- `strategy_evolution`: The expected shift is from "I should mark every buoy so I do not get lost" to "the faster boat already tells me whether the chain drains out or loops back."
- `plain_english_pattern`: "One boat drifts, the other races. If the fast one gets out, the path ends. If it catches the slow one, the path circles."
- `naive_vs_optimal`: Flare-heavy patrol survives on D1-D2 and then fails at D3 when the extra breadcrumb action burns too much fuel. The wake pulse alone still clears every puzzle.
- `confusion_points`: The only likely confusion point is emotional: some players may interpret `Drop Flare` as required bookkeeping rather than optional safety behavior.
- `bug_summary`: No blocking implementation bugs surfaced during solver evaluation, direct UI inspection, typecheck, or web export.
- `verdict`: keep

## Decision Memo

- `decision`: keep
- `why`: Wakeline teaches Floyd's fast/slow pointer detection directly enough to justify a dedicated runner-pointer game. The kept build hit `100%` solvability, `100%` LeetCode fit, `72.0%` strongest-alternative gap, `72.6%` invariant pressure, and a clean `D3` breakpoint where flare-heavy play stops fitting.
- `evidence_used`: `node --experimental-strip-types --input-type=module -e "import { evaluateWakeline } from './src/solvers/Wakeline.solver.ts'; console.log(JSON.stringify(evaluateWakeline(), null, 2));"`, direct UI inspection, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`
- `bug_status`: no open implementation bugs
- `algorithm_alignment_judgment`: strong enough to claim `#141 Linked List Cycle` directly
- `next_action`: mark `#141` complete in the Blind 75 tracker and leave the next outer-loop pass for `#143 Reorder List`
- `polish_scope`: if live blind browser testing becomes available later, validate that players read `Drop Flare` as optional insurance rather than mandatory bookkeeping

## Concept Bridge

This game teaches Floyd's fast/slow pointer solution for `Linked List Cycle`. For the Blind 75 tracker, the kept `Wakeline` game claims `#141 Linked List Cycle`.

The moment where you `Wake Pulse` maps to `slow = slow.next` and `fast = fast.next.next`. The moment where the cutter reaches open water maps to the `fast == null || fast.next == null` branch that proves there is no cycle. The moment where the cutter lands on the drifter maps to `slow == fast`, which proves the linked list loops. The broader transfer to `#142 Linked List Cycle II` is plausible, but this pass does not claim it.
