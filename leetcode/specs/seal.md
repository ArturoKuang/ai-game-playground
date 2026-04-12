# Seal

## Algorithm Game Spec

1. `game_name`: Seal
2. `algorithm_target`: 1.5 Hash Map
3. `core_insight`: Normalize each word into one reusable mix seal, then group by that seal instead of re-checking letters against every existing family.
4. `one_line_pitch`: Word labels arrive for sorting; stamp each one into a stable seal or waste actions eyeballing shelves one by one.
5. `rules`:
   - One word label is active at a time.
   - The player must file every word into a family shelf, then ship the full order within budget.
   - `Stamp Press` turns the current word into a reusable seal and files it into the shelf with the same seal, creating a new shelf if needed.
   - `Scan Family` checks the current word against one existing shelf at a time, costing an action per check.
   - `Start New Family` files the word without revealing a reusable seal.
6. `core_actions`:
   - Press `Stamp & File` to create or reuse a stable seal for the current word.
   - In scan mode, tap shelves to compare the current word against them one by one.
   - Press `Start New Family` when no scanned shelf matches.
   - Press `Ship Order` after every word is filed.
7. `algorithm_to_mechanic_mapping`:
   - The stamped seal is the normalized hash key for a string.
   - The family shelf is the hash-map bucket for that key.
   - Reusing an existing seal maps to `groups[key].push(word)`.
   - Opening a new sealed shelf maps to creating a new bucket for an unseen key.
8. `why_greedy_fails`: Greedy play scans visible shelves and compares letters by eye because that feels concrete. At higher density, that becomes repeated pairwise work. The stamp spends one action up front to create the stable key, then every later match becomes cheap and reliable.
9. `aha_moment`: "I should stop checking every shelf manually. If each word gets one standard seal, the right family becomes obvious immediately."
10. `difficulty_progression`:
   - Easy: small batch where scanning still works.
   - Medium: several families plus repeated letters, so manual checking burns budget.
   - Hard: tight budget with many near-miss families, so stamping every word becomes necessary.
11. `predicted_failure_mode`: If the stamp feels like a cosmetic sort rather than a reusable key, the game collapses into busywork. The mitigation is to make later auto-filing and budget savings visible.
12. `acceptance_criteria`:
   - The player can describe the winning strategy as "give every word one standard label, then group by that label."
   - Medium and hard should punish repeated shelf-by-shelf comparisons.
   - The post-game bridge should map directly to `#49 Group Anagrams`.
13. `predicted_scorecard`:
   - `skill_depth`: medium-high, because tool choice changes total work across the whole batch.
   - `counterintuitive_moves`: present, because stamping an obviously familiar word still saves future work.
   - `algorithm_alignment`: high, because shelves are literal buckets keyed by normalized seals.
   - `greedy_optimal_gap`: strong, because manual shelf scanning repeats comparisons that stamping avoids.
   - `difficulty_curve`: clear from tolerant easy to budget-tight hard.
   - `insight_inflection`: strongest when the player realizes the seal helps future words, not just the current one.
14. `open_questions_for_engineering`:
   - Does the manual shelf path stay tempting without making the UI feel noisy?
   - Is the budget pressure visible enough that players feel the reuse advantage?

## Play Report

- `rules_clarity`: The two-tool split reads cleanly. Stamp means "make a stable label"; scan means "check shelves one by one."
- `easy_strategy`: Manual shelf checks are still viable, which teaches the baseline flow.
- `medium_strategy`: After a few families appear, scanning starts to feel wasteful and the stamp becomes the natural move.
- `hard_strategy`: Stamping every word is clearly the only budget-safe route.
- `strategy_evolution`: The strategy shifts from local comparison toward global key reuse.
- `plain_english_pattern`: "Give each word one standard mix label, then put matching labels on the same shelf."
- `naive_vs_optimal`: Shelf-by-shelf checking works on small batches but repeats work; a seal turns the whole task into lookup plus append.
- `confusion_points`: None blocking in the current build. The family cards need to be tapped only in scan mode, and the hint text covers that.
- `bug_summary`: No blocking bugs found during blind self-play and TypeScript verification.
- `verdict`: keep

## Decision Memo

- `decision`: keep
- `why`: The game cleanly teaches the reusable-key insight that separates `Group Anagrams` from pairwise anagram checking. Budget pressure makes the grouping-by-key move legible.
- `evidence_used`: blind self-play across all three presets, action-budget review, and `npx tsc --noEmit`.
- `bug_status`: no open blocking bugs
- `algorithm_alignment_judgment`: strong enough to claim `#49 Group Anagrams` directly
- `next_action`: mark `#49` complete in the Blind 75 tracker and stop after this outer-loop pass
- `polish_scope`: add richer seal visuals later if we want stronger feedback on why two near-miss words diverge

## Concept Bridge

This game teaches hash-map grouping with a reusable normalized key. For the Blind 75 tracker, the kept `Seal` game claims `#49 Group Anagrams`.

The moment where you stamp a word into one stable seal and then drop it onto the shelf with the same seal maps directly to computing `key = normalize(str)` and then doing `groups[key].push(str)`. The manual shelf-check path is the weaker instinct: it resembles comparing the current string against existing group members one by one instead of building one reusable key and letting the hash map do the grouping.
