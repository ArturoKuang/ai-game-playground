# Nest

## Algorithm Target
1.3 Stack
"Most-recent-first processing solves nested structure problems"

## Rules
A sequence of colored brackets. Select matching bracket pairs to score points. Inner (nested) pairs must be matched before outer pairs. Deeper nesting scores more. Match all brackets within the move budget.

## Mechanic Type
Optimization

## Algorithm-Mechanic Mapping
- **Algorithm step → Game action**: The player scans the sequence and selects a matching pair (opening and closing bracket of the same color). The constraint: only the INNERMOST unmatched pair can be matched first. This IS the stack's LIFO property — the last opened bracket must be closed first.
- **Why greedy fails**: Greedy = "match the first visible pair." But when multiple valid pairs exist, choosing which to match first affects the nesting depth of subsequent matches. A shallow early match can reduce the depth multiplier for remaining pairs. Optimal requires planning the matching ORDER to maximize total score.
- **The aha moment**: "The innermost pair must go first! I can't match the outer brackets until the inner ones are resolved. That's why the order matters — last in, first out!"

## Why It Works

### Algorithm Emergence Test
The player maintains a mental stack: scan left to right, "push" openers, "pop" when a closer matches the top opener. The constraint that only innermost pairs can match IS the stack invariant. Optimal play requires understanding LIFO ordering to maximize depth multipliers.

### Greedy Trap Test
With multi-color brackets, some sequences have multiple valid matching orders. Greedy "match first available" ignores depth multipliers. Example: `( [ ] ( ) )` — matching `[]` first (depth 1) then `()` (depth 1) then `()` (depth 0) scores 1+1+0=2. But matching inner `()` first (depth 2) then `[]` (depth 1) then `()` (depth 0) scores 2+1+0=3. Optimal requires LIFO-aware ordering.

### Stare Test
With 20+ brackets and 4+ colors, the number of valid matching orders grows combinatorially. Mental simulation of all orderings exceeds working memory. The player must use the LIFO constraint as a heuristic to prune the search space.

### Transferability Test
- #20 Valid Parentheses: the core mechanic IS this problem
- #155 Min Stack: awareness of stack contents while making decisions
- #84 Largest Rectangle in Histogram: stack-based processing of nested intervals

### Not a Quiz Test
Player sees colorful brackets and thinks about matching colors and maximizing scores — not "stack operations." The interface uses visual nesting with indentation and color coding.

## Predicted Failure Mode
Risk: might feel too much like "doing homework" (matching brackets). Mitigation: gamified with score multipliers, color combos, and time pressure. The visual design should emphasize NESTING as a spatial concept (indented layers) not a textual one (bracket characters).

## Expected Metrics
| Metric | Prediction | Reasoning |
|---|---|---|
| Puzzle Entropy | 12-20 bits | Multiple valid matching orders at each step |
| Skill-Depth | 40-60% | Optimal ordering significantly outscores greedy |
| Counterintuitive Moves | 2-3 per puzzle | Sometimes matching a deeper pair first reduces immediate score but enables higher total |
| Drama | 0.5-0.7 | Score multipliers create tension around matching order |
| Decision Entropy | 2.0-3.0 bits | 3-8 valid pairs to choose from at each step |
| Info Gain Ratio | 1.5-2.5 | Strategic ordering vs random selection |
| Algorithm Alignment | 70-85% | Innermost-first matches = stack pops |
| Greedy-Optimal Gap | 20-35% | Ordered matching vs first-available |

## Difficulty Progression
- **Level 1-2 (Easy)**: 6 brackets, 2 colors, 1 valid matching order. The LIFO constraint is obvious.
- **Level 3-4 (Medium)**: 12 brackets, 3 colors, multiple valid orderings. Greedy matching leaves points on the table. 
- **Level 5 (Hard)**: 20 brackets, 4 colors, depth multiplier × color combo bonuses. Only optimal LIFO ordering maximizes score.

## Player Experience
Level 1: "Match the pairs from inside out. Simple!" (Learn the mechanic)
Level 3: "There are multiple pairs I can match. Which order gives the best score?" (Discover ordering matters)
Level 5: "I need to plan 5 matches ahead. The depth multiplier means inner matches are worth more, so I should close inner pairs before outer ones whenever possible." (Stack mastery)

## Difficulty Knobs
- **Bracket count**: 6 → 20
- **Color count**: 2 → 4
- **Depth multiplier**: 1× → 2× (higher = more reward for deep matches)
- **Move budget ratio**: 2.0 → 1.1

---
<!-- BELOW THIS LINE: filled by engineer and playtester -->

## Solver Metrics

## Play Report

## Decision
