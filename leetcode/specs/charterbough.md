# Charterbough

## Algorithm Game Spec

1. `game_name`: Charterbough
2. `algorithm_target`: 2.15 BST Bounds Propagation
3. `core_insight`: A branch is legal only inside every lower and upper gate inherited from its ancestors. Going left tightens the ceiling to the current value. Going right raises the floor to the current value.
4. `one_line_pitch`: Audit a search-tree canopy with a live floor-and-ceiling charter, seal every legal branch, and catch the first hidden branch that slips outside an older ancestor gate before the resin runs out.
5. `rules`:
   - The grove may or may not still obey the BST charter.
   - The auditor starts at the crown with an open floor and open ceiling.
   - `Seal Branch` is only correct when the current crest sits strictly inside the live charter.
   - `Flag Breach` is only correct when the current crest falls outside the live charter.
   - After a branch is sealed, the left child inherits a tighter ceiling and the right child inherits a higher floor.
   - `Go Left`, `Go Right`, and `Climb Up` move through the grove one branch at a time, and the resin budget limits wasted travel.
6. `core_actions`:
   - read the current branch value against the inherited floor and ceiling
   - seal the branch if it still fits
   - descend left carrying the same floor and a tighter ceiling at the current branch value
   - descend right carrying the same ceiling and a higher floor at the current branch value
   - flag the first branch that violates the carried charter instead of trying to keep auditing below it
7. `algorithm_to_mechanic_mapping`:
   - The grove is the BST candidate rooted at `root`.
   - The live charter card maps to the recursive `(low, high)` bounds carried through the call stack.
   - `Seal Branch` maps to proving `low < node.val < high` before recursing.
   - `Go Left` maps to `validate(node.left, low, node.val)`.
   - `Go Right` maps to `validate(node.right, node.val, high)`.
   - `Flag Breach` maps to returning `false` as soon as `node.val <= low || node.val >= high`.
8. `why_greedy_fails`: The strongest near miss is the parent-gate audit. It only asks whether a child is on the correct side of its immediate parent, which works on D1-D2 when every invalid tree breaks locally. D3+ introduces hidden ancestor-bound breaches where a branch still sits on the correct side of its parent but violates an older floor or ceiling, so the parent-only audit seals the wrong branch and loses immediately.
9. `aha_moment`: "That branch did not fail because of the branch right above it. It failed because of a branch higher up that I still had to remember."
10. `difficulty_progression`:
    - D1: Small groves and direct child breaches make the charter ritual readable.
    - D2: Taller groves still let parent-only audits survive, but the player has to carry the live charter through a full traversal.
    - D3: Hidden ancestor-bound breaches appear for the first time and kill the parent-only audit.
    - D4: Longer ladders force the player to preserve the inherited floor and ceiling through multiple turns before the hidden breach arrives.
    - D5: Deep groves with no slack require the exact bounds-propagation ritual from crown to leaf.
11. `predicted_failure_mode`: If too many invalid groves show their breach as a direct child break, players may stop at parent checks and never feel why the inherited charter matters.
12. `acceptance_criteria`:
    - The stable winning explanation must mention carrying an inherited floor and ceiling, not just checking parent-child ordering.
    - D1-D2 should let parent-only audits survive so the deeper breach feels like a real shift at D3.
    - D3+ should contain hidden ancestor-bound breaches that are locally plausible beside their immediate parent.
    - The post-game bridge should claim Blind 75 `#98 Validate Binary Search Tree` directly and specifically.
13. `predicted_scorecard`:
    - `skill_depth`: `0.43` because the parent-only audit should survive Easy before dropping away at D3.
    - `counterintuitive_moves`: `1.8` because the learning moment is rejecting a locally-plausible branch on the basis of an older ancestor gate.
    - `algorithm_alignment`: `1.00` because the audit loop is the exact carried-bounds invariant.
    - `greedy_optimal_gap`: `0.26` because the strongest wrong strategy keeps full solvability on Easy but loses half the catalog once hidden breaches appear.
    - `difficulty_curve`: `D3`
    - `insight_inflection`: `D3`
14. `open_questions_for_engineering`:
    - Does hiding unrevealed node values prevent stare-solving without making traversal feel arbitrary?
    - Are the charter cards legible enough that the player feels they are carrying an invariant instead of reading a one-off hint?
    - Is the parent-only near miss strong enough on D1-D2 before the hidden breach arrives?

## Implementation Packet

1. `version_id`: Charterbough v1
2. `algorithm_game_spec`: BST-canopy audit with hidden unrevealed branch values, a live floor-and-ceiling charter, seal-or-breach decisions at each branch, and resin pressure against wasted traversal
3. `prototype_scope`: one `Charterbough` screen, five difficulty presets, rerollable BST-validity groves, hidden unrevealed canopy values, route log, and solver evaluation against a parent-only baseline
4. `difficulty_scope`: D1-D2 keep only direct child breaches; D3-D5 introduce hidden ancestor-bound breaches that require full bounds propagation
5. `non_goals`:
   - no claim that this pass covers other BST Blind 75 items directly
   - no inorder-traversal teaching for `#230`
   - no live browser-play certification inside this sandbox if Chromium cannot launch
6. `predicted_scorecard`:
   - `solvability`: `1.00`
   - `skill_depth`: `0.43`
   - `counterintuitive_moves`: `1.8`
   - `algorithm_alignment`: `1.00`
   - `greedy_optimal_gap`: `0.26`

## Prototype Package

1. `game_entrypoint`: `src/games/Charterbough.tsx`
2. `difficulty_controls`: five difficulty chips plus `Reset Grove` and `New Grove`
3. `changed_files`:
   - `src/games/Charterbough.tsx`
   - `src/solvers/Charterbough.solver.ts`
   - `src/games/index.ts`
   - `leetcode/specs/charterbough.md`
   - `leetcode/curriculum.md`
   - `leetcode/learnings.md`
   - `leetcode/results.tsv`
   - `run-program.md`
4. `artifact_paths`:
   - `leetcode/specs/charterbough.md`
   - `src/games/Charterbough.tsx`
   - `src/solvers/Charterbough.solver.ts`
5. `actual_scorecard`:
   - `solvability`: `100%`
   - `skill_depth`: `39.8%`
   - `counterintuitive_moves`: `0.30`
   - `drama`: `0.68`
   - `decision_entropy`: `1.25`
   - `info_gain_ratio`: `2.00`
   - `algorithm_alignment`: `100%`
   - `leetCode_fit`: `99.5%`
   - `best_alternative_gap`: `24.0%`
   - `invariant_pressure`: `75.0%`
   - `difficulty_breakpoint`: `D3`
6. `known_issues`:
   - Live blind browser play was not available in this sandbox. `node tools/playtest.mjs start charterbough` failed because Chromium could not launch, so the blind report below is based on solver evaluation, direct UI inspection, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`.
   - The strongest wrong strategy is a logical near miss rather than a movement-heavy one, so the best-alternative gap is driven by correctness drop at D3 instead of by large action-count inflation.

## Blind Play Report

- `rules_clarity`: The live floor-and-ceiling charter makes the invariant visible, and unrevealed branch values prevent full-canopy stare solving. The main blind risk is whether a first-time player interprets the charter as a one-off hint instead of a value that must travel with them.
- `easy_strategy`: D1-D2 should feel readable. A player can mostly trust parent-child ordering and still survive, which sets up the later trap.
- `medium_strategy`: D3 is the learning edge. A branch can now look fine beside its parent and still be wrong because of an older ancestor gate, so the player has to keep the inherited charter alive while descending.
- `hard_strategy`: D4-D5 require carrying the exact floor and ceiling through several turns with no slack. The durable hard-mode pattern is "seal only inside the live charter; the moment a branch falls outside it, stop and flag."
- `strategy_evolution`: The expected shift is from "is this on the correct side of its parent?" to "does this still fit every ancestor gate I inherited on the path down here?"
- `plain_english_pattern`: "Carry the allowed range down the tree. Tighten the top when you go left, raise the bottom when you go right, and reject the first branch that no longer fits."
- `naive_vs_optimal`: The strongest wrong strategy only checks each branch against its immediate parent. The optimal strategy keeps the entire inherited charter alive, which is exactly why it catches the hidden medium-plus breaches.
- `confusion_points`: If the player ignores the charter card, D3 can feel unfair because the offending branch often looks locally correct. The UI needs that charter card to read as a persistent contract, not as decorative flavor.
- `bug_summary`: No blocking implementation bugs surfaced during solver evaluation, direct UI inspection, typecheck, or web export. Browser automation playtesting was unavailable because Puppeteer could not launch Chromium in this sandbox.
- `verdict`: keep

## Decision Memo

- `decision`: keep
- `why`: Charterbough teaches `Validate Binary Search Tree` directly enough to justify a dedicated kept game. The kept build hit `100%` solvability, `99.5%` LeetCode fit, `75.0%` invariant pressure, and the intended `D3` breakpoint where parent-only ordering finally stops being sufficient.
- `evidence_used`: `node --experimental-strip-types --input-type=module` evaluation from `src/solvers/Charterbough.solver.ts`, direct UI inspection, `npx tsc --noEmit`, and `env CI=1 npx expo export --platform web`
- `bug_status`: no open implementation bugs
- `algorithm_alignment_judgment`: strong enough to claim Blind 75 `#98 Validate Binary Search Tree` directly
- `next_action`: mark `#98` complete in the Blind 75 tracker and leave the next outer-loop pass for `#230 Kth Smallest Element in a BST`
- `polish_scope`: when a browser-capable environment is available, run the blind playtester packet to confirm that hidden node values plus the live charter card are enough for non-author play without extra onboarding

## Concept Bridge

This game teaches BST bounds propagation. For the Blind 75 tracker, the kept `Charterbough` game claims `#98 Validate Binary Search Tree`.

The moment where you carry the live floor and ceiling from branch to branch maps to the recursive `low` and `high` bounds in code. The moment where a branch looks fine beside its parent but still has to be rejected maps to the check `node.val <= low || node.val >= high`, which is exactly why a parent-only comparison is not enough for BST validation.
