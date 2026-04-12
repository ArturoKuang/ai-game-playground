# Current Anti-Patterns

_Generated from the SQLite memory store._

## Do not frame merge-list play as fair alternation between sources
- Namespace: leetcode
- Type: anti_pattern
- Status: candidate
- Confidence: 0.13
- Scope tags: blind-75, linked-list, merge-two-sorted-lists
- Why it matters: Alternation encourages the wrong mental model and makes failure feel arbitrary instead of structurally tied to sorted-order violations.
- Statement: A merge-list prototype should not reward taking turns between sources, because the target algorithm compares only the two live heads and may drain the same source repeatedly.

## Do Not Put The True Floor Before The First Profit On Most Stock Tapes
- Namespace: leetcode
- Type: anti_pattern
- Status: candidate
- Confidence: 0.12
- Scope tags: blind-75, max-profit, rolling-minimum, sliding-window, stock
- Why it matters: That tape shape makes naive anchor-lock strategies look smarter than they are and hides why the buy anchor must keep refreshing.
- Statement: A stock-profit prototype under-teaches the rolling minimum if most puzzles reveal the global minimum before any profitable sale opportunity.

## Do Not Make Every Off-Color Pennant Illegal In Character Replacement Games
- Namespace: leetcode
- Type: anti_pattern
- Status: candidate
- Confidence: 0.08
- Scope tags: blind-75, character-replacement, max-frequency, sliding-window
- Why it matters: That turns the game back into a duplicate-free or exact-run puzzle and erases the reason to track the majority count inside the window.
- Statement: A character-replacement prototype under-teaches the target algorithm if every mismatch is immediately blocked or punished before the repair budget actually overflows.

