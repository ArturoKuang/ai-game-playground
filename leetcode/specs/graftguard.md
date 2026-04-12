# Graftguard

## Algorithm Game Spec

1. `game_name`: Graftguard
2. `algorithm_target`: 2.13 Tree Recursion / Subtree Search
3. `core_insight`: A host branch is not clear just because the whole pattern fails there. First test whether the full pattern fits at the current branch. If it does not, the same search must continue inside the left host branch and right host branch before the current branch can be ruled out.
4. `one_line_pitch`: Patrol a host grove under a bark budget, test whether the target sprig can graft onto the current branch, and clear each branch only after both child searches come back empty.
5. `rules`:
   - `Probe Here` tests whether the full pattern sprig can start at the current host branch.
   - If the current host crest cannot even start the pattern crown, the local probe fails immediately.
   - When a candidate can start the pattern, `Check Pair` compares the candidate subtree and pattern subtree in lockstep until they match fully or break.
   - A host branch may `Clear Branch` only after its local probe has failed and both child host branches beneath it are already cleared.
   - `Go Left`, `Go Right`, and `Climb Up` move through the host grove in search mode and through paired lanes in audit mode.
   - The run succeeds by proving one full graft match or by clearing the crown branch before the bark budget runs out.
6. `core_actions`:
   - test whether the current host branch can start the pattern
   - descend into a candidate audit only when the current crest can plausibly match
   - compare host and pattern lanes in lockstep during the audit
   - continue searching left and right host branches after a failed local candidate
   - clear the current host branch only after both child searches are already done
7. `algorithm_to_mechanic_mapping`:
   - The host grove is `root`; the pattern sprig is `subRoot`.
   - `Probe Here` maps to asking whether `sameTree(node, subRoot)` could start at the current node.
   - The audit mode reuses the direct paired-equality check on the candidate subtree and pattern subtree.
   - Returning from a failed candidate back into host search maps to the `|| isSubtree(node.left, subRoot) || isSubtree(node.right, subRoot)` continuation.
   - `Clear Branch` maps to returning `false` only after the current node and both child subtree searches have already failed.
8. `why_greedy_fails`: The strongest near miss is the crown-reset sweep. It understands that every branch still needs a local probe, but after each failed candidate it drifts back to the crown before choosing the next branch. That keeps the same logic while wasting movement, so Easy survives it and D2+ exposes the leak.
9. `aha_moment`: "Failing here does not clear the whole branch. I still have to search the left child and right child before I can rule this branch out."
10. `difficulty_progression`:
    - D1: Small host groves make the local `probe -> children -> clear` rhythm legible and forgiving.
    - D2: Near-miss candidate roots appear, so failed local probes no longer mean the answer is nearby or absent.
    - D3: Exact budgets punish returning to the crown after every failed candidate.
    - D4: Deep repeated candidate roots make branch-local continuation feel structural instead of cosmetic.
    - D5: Several almost-matching grafts force the full search ritual: test here, audit when plausible, then recurse left and right before clearing.
11. `predicted_failure_mode`: If the search-vs-audit mode switch is muddy, the game can read like generic tree wandering instead of a local match test followed by recursive subtree search.
12. `acceptance_criteria`:
    - The winning pattern is describable as "test this branch here; if it fails, search left and right; clear this branch only after both sides are done."
    - The strongest wrong strategy should still be subtree search, but with wasteful root resets rather than nonsense wandering.
    - D2 should be the first difficulty where the root-reset near miss reliably stops fitting.
    - The post-game bridge should claim Blind 75 `#572 Subtree of Another Tree` directly and specifically.
13. `predicted_scorecard`:
    - `skill_depth`: `0.45` because the root-reset sweep should still survive Easy before D2 budgets start punishing it.
    - `counterintuitive_moves`: `2.5` because "failing here does not clear the whole branch" should be the first real strategy shift.
    - `algorithm_alignment`: `1.00` because the durable route is the direct subtree-search recursion.
    - `greedy_optimal_gap`: `0.18` because the near miss uses the same logic but wastes travel.
    - `difficulty_curve`: `D2`
    - `insight_inflection`: `D2`
14. `open_questions_for_engineering`:
    - Is the mode switch between host search and candidate audit clear enough without overexplaining the algorithm?
    - Do cleared host branches feel persistent enough that players stop rechecking them?
    - Are the near-miss candidate roots convincing enough that the paired audit feels necessary rather than decorative?

## Implementation Packet

1. `version_id`: Graftguard v1
2. `algorithm_game_spec`: host-tree subtree search with explicit local candidate probes, paired audit mode for plausible candidates, and branch-clear pressure against root resets
3. `prototype_scope`: one `Graftguard` screen, five difficulty presets, rerollable host/pattern groves, search-mode and audit-mode panels, host and pattern tree boards, route log, and solver evaluation against a root-reset search baseline
4. `difficulty_scope`: D1 keeps the branch ritual readable; D2-D5 increasingly punish resetting to the crown after every failed candidate
5. `non_goals`:
   - no claim that this pass covers other Blind 75 tree problems directly
   - no blind browser-play certification inside this sandbox
   - no breadth-first framing; this build is specifically a recursive subtree-search game
6. `predicted_scorecard`:
   - `solvability`: `1.00`
   - `skill_depth`: `0.45`
   - `counterintuitive_moves`: `2.5`
   - `algorithm_alignment`: `1.00`
   - `greedy_optimal_gap`: `0.18`

## Prototype Package

1. `game_entrypoint`: `src/games/Graftguard.tsx`
2. `difficulty_controls`: five difficulty chips plus `Reset Grove` and `New Grove`
3. `changed_files`:
   - `src/games/Graftguard.tsx`
   - `src/solvers/Graftguard.solver.ts`
   - `src/games/index.ts`
   - `leetcode/specs/graftguard.md`
   - `leetcode/curriculum.md`
   - `leetcode/learnings.md`
   - `leetcode/results.tsv`
   - `run-program.md`
4. `artifact_paths`:
   - `leetcode/specs/graftguard.md`
   - `src/games/Graftguard.tsx`
   - `src/solvers/Graftguard.solver.ts`
5. `actual_scorecard`:
   - `solvability`: `100%`
   - `skill_depth`: `52.6%`
   - `counterintuitive_moves`: `2.88`
   - `drama`: `0.80`
   - `decision_entropy`: `2.00`
   - `info_gain_ratio`: `0.13`
   - `algorithm_alignment`: `100%`
   - `leetCode_fit`: `99.0%`
   - `best_alternative_gap`: `19.9%`
   - `invariant_pressure`: `35.2%`
   - `difficulty_breakpoint`: `D2`
6. `known_issues`:
   - Live blind browser play was not run in this sandbox. `node tools/playtest.mjs start graftguard` failed because Chromium could not launch here, so the blind report below is based on solver evaluation, direct UI inspection, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`.
   - The current teaching load sits on the search-mode clear logic and the audit-mode pair window. If later live play shows that players still think a failed local probe clears the whole branch, those cues need strengthening before new rules are added.

## Blind Play Report

- `rules_clarity`: The host tree, pattern tree, and current-branch card make the two-phase structure legible. The main blind risk is whether players immediately understand that a failed local candidate does not clear the entire host branch yet.
- `easy_strategy`: D1 should teach the plain rhythm: probe the current branch, then search children only when the local candidate fails. The host branches are small enough that the clear rule feels understandable rather than bureaucratic.
- `medium_strategy`: D2 should be the first real learning edge because several host crests can plausibly start the pattern. Players who keep bouncing back to the crown after each failed candidate should start leaking budget there.
- `hard_strategy`: D3-D5 demand the full recursive ritual. The player needs to keep branch-local context alive: test here, finish the child searches, then clear here once both children are already ruled out.
- `strategy_evolution`: The expected shift is from "a failed match here means move somewhere else from the crown" to "a failed match here only settles the local candidate; I still owe the left and right subtree search before this branch is clear."
- `plain_english_pattern`: "At each branch, first ask whether the whole target fits right here. If not, search the left side and right side before you cross this branch off."
- `naive_vs_optimal`: The strongest wrong strategy is the crown-reset sweep. It uses the right local probe, but it keeps re-entering the search from the top instead of finishing the current branch while the evidence is local.
- `confusion_points`: Players may initially overread a failed local audit as "this branch is impossible everywhere below too." The clear button and child-status cards are doing the crucial teaching work there.
- `bug_summary`: No blocking implementation bugs surfaced during solver evaluation, direct UI inspection, typecheck, or web export. Browser automation playtesting was unavailable because Puppeteer could not launch Chromium in this sandbox.
- `verdict`: keep

## Decision Memo

- `decision`: keep
- `why`: Graftguard teaches `Subtree of Another Tree` directly enough to justify a dedicated kept game instead of stretching `Twinbough` beyond its brief. The kept build hit `100%` solvability, `99.0%` LeetCode fit, a `D2` breakpoint, and a meaningful `19.9%` strongest-alternative gap centered on wasteful crown resets after failed local probes.
- `evidence_used`: `node --experimental-strip-types --input-type=module` evaluation from `src/solvers/Graftguard.solver.ts`, direct UI inspection, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`
- `bug_status`: no open implementation bugs
- `algorithm_alignment_judgment`: strong enough to claim Blind 75 `#572 Subtree of Another Tree` directly
- `next_action`: mark `#572` complete in the Blind 75 tracker and leave the next outer-loop pass for `#235 Lowest Common Ancestor of a Binary Search Tree`
- `polish_scope`: when a browser-capable environment is available, run the blind playtester packet to confirm that the search-vs-audit mode split is self-explanatory

## Concept Bridge

This game teaches recursive subtree search on binary trees. For the Blind 75 tracker, the kept `Graftguard` game claims `#572 Subtree of Another Tree`.

The moment where `Probe Here` fails locally but the branch still cannot clear yet maps to `sameTree(node, subRoot)` being false while the recursive search must still continue into `node.left` and `node.right`. The moment where `Clear Branch` only becomes legal after both child searches are already cleared maps to returning `false` from the current subtree only after both child recursive calls failed too.
