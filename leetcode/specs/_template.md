# <Game Name>

## Algorithm Target
<Topic # from curriculum.md, e.g. "1.1 Binary Search">
<Core insight in one sentence>

## Rules
<2 sentences max.>

## Mechanic Family
<One of: hidden-reveal | visible-sort | route-trace | match-pair | constraint-satisfy | stack-match | classify-sequence | window-scan | graph-explore. This becomes the `mechanic:<family>` tag.>

<If the same family is in the last 2 keeps (check `memory/portfolio_review.md`), explain why repeating it teaches a genuinely different insight — otherwise pick a different family.>

## Mechanic Type
<Constraint Satisfaction | Optimization | Hybrid>

## Algorithm-Mechanic Mapping
- **Algorithm step -> Game action**: <what the player does that IS the algorithm>
- **Why the strongest plausible wrong strategy fails**: <specific configuration where the player's most likely wrong approach loses>
- **The aha moment**: <the realization that maps to understanding the algorithm>

## Why It Works

### Algorithm Emergence Test
<Why optimal play IS the algorithm.>

### Wrong Strategy Trap Test
<Why the strongest plausible wrong approach fails, or why greedy IS correct for this topic.>

### Stare Test
<Why the player can't pre-plan.>

### Transferability Test
<Which LeetCode problems this builds intuition for.>

### Not a Quiz Test
<Why this feels like a puzzle, not a coding exercise.>

## Solver Strategies

_Engineer runs `node tools/memory-cli.js check-solver-diff --spec <this-file>` before building._
_This section MUST declare L2 and L5 as structurally different strategies — not the same algorithm with different heuristics._

### L2 (Wrong Strategy)
- Name: <slug — distinct from L5>
- Approach: <one-line description>
- Information access: <how it reads the board>
- Termination: <when it stops>

### L5 (Optimal Strategy)
- Name: <slug — distinct from L2>
- Approach: <one-line description>
- Information access: <how it reads the board>
- Termination: <when it stops>
- Algorithm keyword: <comma-separated, e.g. "two-pointer, early-exit, convergence">

### Structural Differences
- <diff 1 — behavioral, not tuning>
- <diff 2>
- <diff 3>

## Predicted Failure Mode
<Most likely death. Which anti-pattern.>

## Expected Metrics

### Algorithm Gate
| Gate | Prediction | Reasoning |
|---|---|---|
| Structural Fit (board→input, moves→ops, win→goal) | | |
| Difficulty Breakpoint | | |
| Efficiency Gap (L5 vs L2) | | |
| Wasted Work Ratio (L2 extra moves at D3) | | |
| Difficulty Scaling (L2 monotonic decline) | | |
| Algorithm Alignment (L5 moves match target, ≥ 90%) | | |

### Fun Gate
| Gate | Prediction | Reasoning |
|---|---|---|
| Comprehension Speed | | |
| Decision Density | | |
| Replay Pull | | |
| Best Moment Intensity | | |

## Difficulty Progression
- **Level 1-2 (Easy)**: <small input, wrong strategy still works>
- **Level 3-4 (Medium)**: <wrong strategy starts failing, target approach becomes necessary>
- **Level 5 (Hard)**: <only target algorithm strategy is efficient>

## Player Experience
<Emotional arc across difficulty levels. The aha moment.>

## Difficulty Knobs
<2+ linked parameters.>

## Game Feel

### Accent Color
<hex code + name, e.g. "#7bdff2 — arctic blue">

### Signature Animation
<Describe the ONE moment where the algorithm's effect is most visible.
What triggers it, what the player sees, why it feels good.>

### Player Description
<Three parts: what it is, how to play, what it teaches.>

---
<!-- BELOW THIS LINE: filled by engineer and playtester -->

## Solver Metrics

## Play Report

## Transfer Probe

_Filled after KEEP decision. Playtester is given a fresh LeetCode problem in the same family and reports whether the game's intuition transferred._

- LeetCode problem:
- Outcome: transfer | partial | no_transfer
- Notes:

## Decision
