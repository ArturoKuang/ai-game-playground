# Rootbond

## Algorithm Game Spec

1. `game_name`: Rootbond
2. `algorithm_target`: 3.4 Union-Find
3. `core_insight`: Do not judge a rope by whether the endpoint camps already look busy. Judge it by the live clan crest at each endpoint. If the crests differ, bind and merge the whole clans. If the crests already match, that rope only closes a loop inside one realm.
4. `one_line_pitch`: Audit a realm charter one rope at a time, merging different clans and flagging same-crest loop ropes before you certify one clean crown.
5. `rules`:
   - Every camp starts with its own crest.
   - One proposed rope is audited at a time in a fixed queue.
   - `Bind Charter` is legal only when the two endpoint camps still show different crests.
   - Binding a legal rope merges the full clans behind those two crests into one shared crest.
   - `Flag Loop` is legal only when the two endpoint camps already share one crest.
   - The charter may be certified only after every rope is resolved.
   - `Certify Tree` is correct only when the full charter leaves exactly one realm and no loop rope was flagged.
   - `Reject Charter` is correct whenever the charter leaves several realms or exposed any loop rope.
6. `core_actions`:
   - inspect the live crest on each endpoint camp
   - bind a rope when it joins two different clans
   - watch the merged crest propagate across the whole joined realm
   - flag a rope when both endpoints already sit inside the same realm
   - certify or reject the charter after the rope queue ends
7. `algorithm_to_mechanic_mapping`:
   - Each camp card maps to one graph node.
   - The live crest on a camp maps to its current union-find representative.
   - `Bind Charter` maps to `union(a, b)` when `find(a) != find(b)`.
   - Crest propagation across a whole realm maps to the merged connected component after union.
   - `Flag Loop` maps to detecting `find(a) == find(b)`, which proves that edge would create a cycle.
   - The `Realms Left` counter maps to the current connected-component count.
   - `Certify Tree` maps to the final `components == 1` and `edges == n - 1` validation for an undirected graph.
8. `why_greedy_fails`: The strongest near miss is endpoint guard. It treats any rope between two already-busy camps as suspicious and flags it, even when those camps still belong to different realms. That shortcut survives tutorial trees, but D4-D5 valid charters require ropes that join already-grown clans, so local rope scars are not enough; only the live clan crests tell the truth.
9. `aha_moment`: "A camp having ropes already does not mean this rope is bad. The only question is whether the two camps still belong to different realms right now."
10. `difficulty_progression`:
    - D1: Simple trees make legal clan merges obvious.
    - D2: Valid charters join camps that already carry rope scars, so busyness and loop-ness split apart.
    - D3: The first false crown appears when a rope closes a loop inside one realm while another realm still survives elsewhere.
    - D4: Larger charters mix grown-clan merges with hidden loop ropes.
    - D5: Long charters require trust in the live component picture rather than local edge memory.
11. `predicted_failure_mode`: If the crest propagation is not legible enough, players may overfit to endpoint degree or direct-pair memory instead of reading full clan membership.
12. `acceptance_criteria`:
    - Winning play should be describable as "bind only different crests, flag same-crest ropes, then certify only one realm."
    - Solver evaluation must keep `100%` solvability across shipped charter sets.
    - The strongest alternative should fail once valid charters begin merging already-grown clans.
    - The kept bridge should claim Blind 75 `#261 Graph Valid Tree` directly, and any later shared claim on `#323 Number of Connected Components in an Undirected Graph` must name the component counter explicitly.
13. `predicted_scorecard`:
    - `skill_depth`: `0.41`
    - `counterintuitive_moves`: `2.0`
    - `algorithm_alignment`: `1.00`
    - `greedy_optimal_gap`: `0.28`
    - `difficulty_curve`: `D3`
    - `insight_inflection`: `D3`
14. `open_questions_for_engineering`:
    - Is the crest propagation legible enough on mobile once several camps share the same realm?
    - Does the rope queue feel concrete enough that players understand they are auditing one fixed graph rather than building a custom one?
    - Does the final reject call read as a proof about the whole charter instead of a surrender button?

## Implementation Packet

1. `version_id`: Rootbond v1
2. `algorithm_game_spec`: one-rope-at-a-time charter audit with visible clan crests, whole-realm merges on legal ropes, and loop flags on same-crest ropes
3. `prototype_scope`: one `Rootbond` screen, five difficulty presets, fixed charter queues, solver evaluation against endpoint-guard and count-only alternatives, and a direct Blind 75 concept bridge
4. `difficulty_scope`: D1 teaches basic legal merges, D2 adds valid joins between already-busy camps, D3 introduces false crowns, and D4-D5 require full trust in live realm membership
5. `non_goals`:
   - no path-compression or union-by-rank jargon in the player-facing experience
   - no separate counting-only variant for `#323 Number of Connected Components in an Undirected Graph`; any shared claim must come from the existing realm counter and union decisions
   - no browser-recorded blind session inside this sandbox
6. `predicted_scorecard`:
   - `solvability`: `1.00`
   - `skill_depth`: `0.41`
   - `counterintuitive_moves`: `2.0`
   - `algorithm_alignment`: `1.00`
   - `greedy_optimal_gap`: `0.28`

## Prototype Package

1. `game_entrypoint`: `src/games/Rootbond.tsx`
2. `difficulty_controls`: five difficulty chips plus `Bind Charter`, `Flag Loop`, `Certify Tree`, `Reject Charter`, `Reset Audit`, and `New Charter`
3. `changed_files`:
   - `src/solvers/Rootbond.solver.ts`
   - `src/games/Rootbond.tsx`
   - `src/games/index.ts`
   - `leetcode/specs/rootbond.md`
   - `leetcode/curriculum.md`
   - `leetcode/results.tsv`
   - `run-program.md`
4. `artifact_paths`:
   - `src/solvers/Rootbond.solver.ts`
   - `src/games/Rootbond.tsx`
   - `leetcode/specs/rootbond.md`
5. `actual_scorecard`:
   - `solvability`: `100%`
   - `skill_depth`: `44.8%`
   - `counterintuitive_moves`: `1.6`
   - `drama`: `0.56`
   - `decision_entropy`: `1.00`
   - `info_gain_ratio`: `1.91`
   - `algorithm_alignment`: `100%`
   - `leetCode_fit`: `100%`
   - `best_alternative_gap`: `40.0%`
   - `invariant_pressure`: `20.0%`
   - `difficulty_breakpoint`: `D4`
6. `known_issues`:
   - Live blind browser play was not run in this sandbox. The blind report below is based on solver evaluation, direct UI inspection, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`.
   - D1-D3 still allow the strongest alternative to survive. The real separation happens once valid charters start joining already-grown clans in D4 and D5.

## Blind Play Report

- `rules_clarity`: The current rope queue plus the live crest badge on every camp make the local audit readable. The main blind risk is whether players trust crest identity over the more vivid "this camp already has ropes" instinct.
- `easy_strategy`: D1 should read as "keep merging camps whose crests are still different."
- `medium_strategy`: D2-D3 should shift players from endpoint caution to clan reasoning. The player has to notice that a busy camp can still legally bind if its crest differs from the other endpoint.
- `hard_strategy`: D4-D5 demand the full union-find intuition: keep reading realm membership after every merge, flag only same-crest ropes, and reject the whole charter if one clean realm never emerges.
- `strategy_evolution`: The expected shift is from "avoid ropes on already-busy camps" to "ignore local scars and track full realm identity through the crest system."
- `plain_english_pattern`: "Every camp belongs to a realm right now. If a rope joins two different realms, take it and merge them. If it stays inside one realm, it is a loop. At the end, one realm means tree; anything else means reject."
- `naive_vs_optimal`: The strongest wrong strategy is endpoint guard. It flags too many ropes once camps look busy, so it breaks valid late-game merges between already-grown realms.
- `confusion_points`: The most fragile teaching point is the final reject call on hybrid false-crown boards. Players must read it as a proof about the full charter rather than a reaction to the most recent rope alone.
- `bug_summary`: No blocking implementation bugs surfaced during solver evaluation, `npx tsc --noEmit`, or `env CI=1 npx expo export --platform web`.
- `verdict`: keep

## Decision Memo

- `decision`: keep
- `why`: Rootbond teaches union-find strongly enough to cover Blind 75 `#261 Graph Valid Tree` directly and `#323 Number of Connected Components in an Undirected Graph` through the same live realm counter. The build keeps `100%` solvability, reaches `100%` algorithm alignment and LeetCode fit, and records a `40.0%` strongest-alternative gap once valid charters require merges between already-grown realms.
- `evidence_used`: `node --experimental-strip-types --input-type=module` evaluation from `src/solvers/Rootbond.solver.ts`, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`
- `bug_status`: no open implementation bugs
- `algorithm_alignment_judgment`: strong enough to claim Blind 75 `#261` directly because optimal play requires the actual solution shape: union different components, detect same-component cycle edges, and reject any charter that never collapses to one component. The same play also exposes `#323`, because the live `Realms Left` counter is the connected-component count after each union and at the end of the rope queue.
- `next_action`: mark `#323 Number of Connected Components in an Undirected Graph` complete in the Blind 75 tracker via the shared `Rootbond` bridge, then move the next outer-loop pass to `#269 Alien Dictionary`
- `polish_scope`: when a browser-capable blind play environment is available, confirm that first-time players rely on crest identity instead of endpoint degree

## Concept Bridge

This game teaches union-find through live realm tracking. For the Blind 75 tracker, the kept `Rootbond` game claims `#261 Graph Valid Tree` and `#323 Number of Connected Components in an Undirected Graph`.

The moment where the live crest on each camp changes after a legal bind maps to `union(a, b)` merging two connected components. The `Realms Left` counter is the direct bridge to `#323`: it is the current connected-component count after each processed edge, and the final displayed value is exactly what that problem asks you to return.

The moment where a same-crest rope must be flagged maps to the `find(a) == find(b)` cycle check for `#261`. The moment where the final charter is certified only if one realm remains maps to the connectivity half of tree validation after all edges are processed.
