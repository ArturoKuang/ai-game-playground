# Spellsplice

## Algorithm Game Spec

1. `game_name`: Spellsplice
2. `algorithm_target`: 3.1d Word-Break Prefix Reachability DP
3. `core_insight`: Do not trust the nearest-looking seam. A prefix is live only if some earlier live cut plus one listed word reaches it exactly, and dead prefixes must be sealed explicitly when every listed splice starts from a dead cut.
4. `one_line_pitch`: Certify a letter ribbon before the scout budget runs out by keeping a left-to-right cut ledger, where each endpoint is live only when one earlier live cut can launch a listed word into it.
5. `rules`:
   - The ribbon is a fixed left-to-right word strip.
   - The lexicon is a fixed bank of listed words for the current puzzle.
   - Each endpoint must be sealed exactly once as `live` or `dead`.
   - A `listed splice` is any bank word that ends at the selected endpoint.
   - Choosing a listed splice seals the endpoint `live` only if that splice starts from an earlier cut that is already sealed `live`.
   - `Seal Dead` is legal only when every listed splice into the endpoint starts from a cut already sealed `dead`, or when no listed splice ends there at all.
   - `Scout Endpoint` reveals the true answer directly, but burns a brute-force cut-check tax.
   - The puzzle is won only when the whole prefix ledger is sealed before the action budget expires.
6. `core_actions`:
   - inspect one endpoint and the listed splices that can end there
   - choose one splice whose starting cut is already live
   - seal an endpoint dead when every listed splice launches from a dead cut
   - scout an endpoint directly at tax cost
   - reset or reroll the ribbon
7. `algorithm_to_mechanic_mapping`:
   - Endpoint `i` maps to prefix state `dp[i]`.
   - Origin cut `0` maps to `dp[0] = true`.
   - A listed splice from cut `j` with word `s[j:i]` maps to checking dictionary membership for that substring.
   - Requiring the starting cut to already be live maps to the condition `dp[j]`.
   - Sealing an endpoint live through one splice maps to `dp[i] = true` once any valid `j` works.
   - `Seal Dead` maps to `dp[i] = false` after exhausting every split `j`.
   - `Scout Endpoint` maps to brute-force rescanning splits for that prefix instead of reusing the ledger.
8. `why_greedy_fails`: The strongest wrong instinct is to trust the latest-looking seam and ignore older matching cuts. That shortcut feels natural on warm ribbons, then fails at `D3` when the nearest listed splice starts from a dead prefix while a longer word from farther back is the only legal bridge. Direct scouting is the other near miss: it survives the small boards, then breaks once every endpoint needs its own cut search.
9. `aha_moment`: "This endpoint is not live because a word fits here. It is live only if the word starts from a cut that was already proven live."
10. `difficulty_progression`:
    - D1: Short ribbons teach live versus dead endpoints while full scouting still survives.
    - D2: Slightly longer ribbons make left-to-right sealing cleaner than restarting from the front.
    - D3: The first false seam appears, and the latest-cut shortcut breaks.
    - D4: Longer ribbons mix dead prefixes and overlapping end seams, so the full ledger becomes mandatory.
    - D5: Hard ribbons keep stacking dead-looking late seams near the finish, leaving no slack for brute-force scouting.
11. `predicted_failure_mode`: If the UI makes the word bank more salient than the live/dead state of the earlier cut posts, players will overvalue "a word fits here" and miss the real dependency on prior reachable prefixes.
12. `acceptance_criteria`:
    - Winning play should be describable as "for each endpoint, check whether any earlier live cut plus one listed word reaches it; otherwise seal it dead."
    - Solver evaluation must keep `100%` solvability across the shipped ribbon set.
    - The scout-all fallback should survive `D1-D2` and fail from `D3`.
    - The latest-cut shortcut should first fail at `D3`.
    - The kept bridge should claim Blind 75 `#139 Word Break` directly and only in this pass.
13. `predicted_scorecard`:
    - `skill_depth`: `0.54`
    - `counterintuitive_moves`: `3.0`
    - `algorithm_alignment`: `1.00`
    - `greedy_optimal_gap`: `0.30`
    - `difficulty_curve`: `D3`
    - `insight_inflection`: `D3`
14. `open_questions_for_engineering`:
    - Do players read the earlier cut state first, or do they tunnel on the visible matching word?
    - Are the live, dead, and unresolved seam states distinct enough before the D3 trap arrives?
    - Is the scout tax large enough to model rescanning without making D1 unreadable?

## Implementation Packet

1. `version_id`: Spellsplice v1
2. `algorithm_game_spec`: endpoint ledger on a letter ribbon where each prefix is sealed from one earlier live cut plus a listed word, with explicit dead-prefix sealing and a scout fallback
3. `prototype_scope`: one `Spellsplice` screen, five difficulty presets, two handcrafted ribbons per difficulty, solver evaluation against a latest-cut shortcut plus a scout-all fallback, and a direct Blind 75 concept bridge for `#139`
4. `difficulty_scope`: D1-D2 preserve a survivable scout route; D3-D5 require the full reachability recurrence and include dead late seams that punish trusting the nearest matching suffix
5. `non_goals`:
   - no shared claim on `#300 Longest Increasing Subsequence` or any later Blind 75 item in this pass
   - no browser-recorded interactive blind session while sandboxed serving remains blocked
   - no attempt to teach trie search, wildcard branching, or counting all segmentations in this pass
6. `predicted_scorecard`:
   - `solvability`: `1.00`
   - `skill_depth`: `0.54`
   - `counterintuitive_moves`: `3.0`
   - `algorithm_alignment`: `1.00`
   - `greedy_optimal_gap`: `0.30`

## Prototype Package

1. `game_entrypoint`: `src/games/Spellsplice.tsx`
2. `difficulty_controls`: five difficulty chips plus endpoint selection, listed splice buttons, `Seal Dead`, `Scout Endpoint`, `Reset Ribbon`, and `New Ribbon`
3. `changed_files`:
   - `src/solvers/Spellsplice.solver.ts`
   - `src/games/Spellsplice.tsx`
   - `src/games/index.ts`
   - `leetcode/curriculum.md`
   - `leetcode/specs/spellsplice.md`
   - `leetcode/results.tsv`
   - `run-program.md`
4. `artifact_paths`:
   - `src/solvers/Spellsplice.solver.ts`
   - `src/games/Spellsplice.tsx`
   - `leetcode/specs/spellsplice.md`
5. `actual_scorecard`:
   - `solvability`: `100%`
   - `skill_depth`: `52.0%`
   - `counterintuitive_moves`: `5.4`
   - `drama`: `0.60`
   - `decision_entropy`: `2.05`
   - `info_gain_ratio`: `1.69`
   - `algorithm_alignment`: `100%`
   - `leetCode_fit`: `100%`
   - `best_alternative_gap`: `13.7%`
   - `invariant_pressure`: `59.6%`
   - `difficulty_breakpoint`: `D3`
6. `known_issues`:
   - Browser-based blind play remains blocked in this sandbox, so the blind play report is still source-level plus solver-backed rather than a captured interactive session.
   - The measured alternative gap is modest because the latest-cut shortcut often classifies many early prefixes correctly before failing the key D3-plus dead-seam boards.

## Blind Play Report

- `rules_clarity`: The ribbon, lexicon, and live/dead cut-state requirement read clearly in static inspection. The main blind risk is whether players first notice the status of the earlier cut instead of overvaluing the fact that a word fits the endpoint.
- `easy_strategy`: D1 encourages checking whether any listed word can land on the endpoint and whether the cut behind it is already live.
- `medium_strategy`: D2 still lets scouting survive once, but the cleaner pattern is already to march the cut ledger left to right instead of restarting from the origin every time.
- `hard_strategy`: D3-D5 require the full pattern: for each endpoint, scan the listed end-seams, keep the endpoint live only if one of them launches from an earlier live cut, and otherwise seal the endpoint dead explicitly.
- `strategy_evolution`: The intended shift is from "a word fits here" to "a word fits here and it starts from a cut that was already proven live."
- `plain_english_pattern`: "Every cut point has to inherit life from an older live cut plus one exact word span. If every matching span starts from dead ground, this endpoint dies too."
- `naive_vs_optimal`: The strongest wrong strategy checks only the nearest-looking end seam. It feels clean on D1-D2, then fails at D3 when the closest matching suffix starts from a dead prefix and only the longer bridge from farther back keeps the ribbon alive. Direct endpoint scouting is the other near miss: good enough on warm boards, broken once the per-endpoint search tax stacks up.
- `confusion_points`: The blind risk is mostly visual. If the cut-state label is too subtle, players may think the game is about spotting words rather than proving reachable starts.
- `bug_summary`: No blocking implementation bugs surfaced during solver evaluation, `npx tsc --noEmit`, a scripted optimal-path state-transition smoke test across both ribbon seeds for every difficulty, or `env CI=1 npx expo export --platform web`.
- `verdict`: keep

## Decision Memo

- `decision`: keep
- `why`: Spellsplice teaches Blind 75 `#139 Word Break` directly enough to justify a dedicated kept game. The shipped build keeps `100%` solvability, lands the intended `D3` breakpoint, preserves exact prefix-reachability alignment, and makes dead-prefix propagation explicit instead of burying it inside substring guesses. The measured alternative gap is modest, but the real recurrence remains the only stable way through the D3-plus false-seam boards.
- `evidence_used`: solver evaluation from `src/solvers/Spellsplice.solver.ts`, `npx tsc --noEmit`, a scripted optimal-path state-transition smoke test across both ribbon seeds for every difficulty, and `env CI=1 npx expo export --platform web`
- `bug_status`: no open implementation bugs
- `algorithm_alignment_judgment`: strong enough to claim Blind 75 `#139` directly because optimal play requires the exact solution shape: for each endpoint `i`, scan prior cuts `j`, keep the endpoint live if any `dp[j]` is true and `s[j:i]` is in the bank, and seal it dead only after every candidate split fails
- `next_action`: mark `#139 Word Break` complete in the Blind 75 tracker and leave the next outer-loop pass for `#300 Longest Increasing Subsequence`
- `polish_scope`: once interactive playtesting is available again, verify that first-time players stop trusting the nearest suffix seam at D3 without extra coaching

## Concept Bridge

This game teaches left-to-right prefix reachability for `Word Break`. For the Blind 75 tracker, the kept `Spellsplice` game claims `#139 Word Break`.

The moment where the player certifies an endpoint only after matching a listed word to an earlier live cut maps to checking whether some split `j` satisfies both `dp[j]` and `s[j:i] in wordDict`. The moment where the player seals an endpoint dead only after every listed splice starts from dead ground maps to finishing the inner split scan without finding any valid predecessor.
