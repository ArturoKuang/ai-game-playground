# Ledger

## Algorithm Game Spec

1. `game_name`: Ledger
2. `algorithm_target`: 1.5 Hash Map
3. `core_insight`: Net frequency counts are more reliable than chasing pairwise matches.
4. `one_line_pitch`: Two letter crates look nearly identical; balance them through a shared ledger and decide whether their contents truly match.
5. `rules`:
   - Two crates each contain one string of letter tiles.
   - The player must process every tile, then call `Same Mix` or `Different Mix`.
   - The `Ledger Tool` adds left-crate letters and subtracts right-crate letters from a shared count board.
   - The `Pair Tool` manually removes one matching pair across the center line, but only handles that single pair.
6. `core_actions`:
   - Tap a tile with the `Ledger Tool` to record its count contribution.
   - Tap one tile and then a matching tile on the other side with the `Pair Tool` to cancel a single pair.
   - Call the final verdict once both crates are processed.
7. `algorithm_to_mechanic_mapping`:
   - A ledger bin is a hash-map entry keyed by character.
   - Left tiles increment counts; right tiles decrement counts.
   - Balanced ledger state means every frequency count returned to zero.
8. `why_greedy_fails`: A greedy player starts with manual pairing because it feels concrete, but repeated letters and near-miss strings make pair chasing brittle. The ledger keeps the full multiset state instead of losing track of how many times a letter has appeared.
9. `aha_moment`: "I should stop hunting pairs and just keep one running balance for each letter. If every balance returns to zero, the crates match."
10. `difficulty_progression`:
   - Easy: short strings where both tools work.
   - Medium: repeated letters where pairing becomes noisy.
   - Hard: near-anagram strings where a single leftover count decides the puzzle.
11. `predicted_failure_mode`: The prototype could feel too deterministic if the player never tries the pair tool. The fix is to keep the pair tool visible so the wrong first instinct is available and comparable.
12. `acceptance_criteria`:
   - The player can explain the winning strategy as "keep running counts per letter."
   - Medium and hard should make manual pairing feel less trustworthy than the ledger.
   - The post-game bridge should map directly to `#242 Valid Anagram`.
13. `predicted_scorecard`:
   - `skill_depth`: medium-high, because tool choice changes reliability under repetition.
   - `counterintuitive_moves`: present, because adding an unmatched tile to the ledger is correct.
   - `algorithm_alignment`: high, because the ledger bins are literal per-letter counts.
   - `greedy_optimal_gap`: moderate, because pair chasing stays possible but degrades under repeats.
   - `difficulty_curve`: clear across short match, repeated match, and near miss.
   - `insight_inflection`: strongest on medium when repeated letters stop being mentally manageable.
14. `open_questions_for_engineering`:
   - Does the pair tool create enough temptation without overpowering the ledger?
   - Is the hard puzzle close enough to a real near-anagram without feeling unfair?

## Play Report

- `rules_clarity`: The tool split reads cleanly. Players can understand "record into ledger" versus "cancel one pair."
- `easy_strategy`: Manual pairing feels natural first.
- `medium_strategy`: Repeated letters push the player toward the ledger because pairing stops feeling trustworthy.
- `hard_strategy`: The ledger reveals the single leftover difference cleanly.
- `strategy_evolution`: The optimal strategy shifts from local pair hunting to full-balance tracking.
- `plain_english_pattern`: "Count what each side owes instead of matching letters one by one."
- `naive_vs_optimal`: Pair chasing is intuitive but fragile; the ledger is steady and complete.
- `confusion_points`: The player must process all tiles before calling the verdict; the message text reinforces this.
- `bug_summary`: No blocking gameplay bugs remained after implementation review and web smoke test.
- `verdict`: keep

## Decision Memo

- `decision`: keep
- `why`: The core mechanic directly embodies frequency balancing, and the hard near-miss case makes the leftover-count insight legible.
- `evidence_used`: playable web smoke test, manual interaction across all three difficulty presets, and direct concept-bridge fit to `#242`.
- `bug_status`: no open blocking bugs
- `algorithm_alignment_judgment`: strong enough to claim `Valid Anagram` directly
- `next_action`: mark `#242` complete in the Blind 75 tracker and stop after this outer-loop pass
- `polish_scope`: add more preset crates later if we want to stretch the same game toward `#49 Group Anagrams`, but do not claim that coverage yet

## Concept Bridge

This game teaches Hash Map frequency balancing. For the Blind 75 tracker, the kept `Ledger` game claims `#242 Valid Anagram`.

The moment where you tap a left tile to add `+1` and a right tile to add `-1` to the same ledger bin maps directly to `count[c] += 1` for the first string and `count[c] -= 1` for the second. When every ledger bin returns to zero, that maps to the code check that every character frequency matches exactly across both strings. Manual pair-chasing is the tempting but weaker alternative: it resembles scanning for matching letters one by one instead of maintaining a reusable frequency map.
