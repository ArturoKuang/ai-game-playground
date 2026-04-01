# Herd

## Rules
Issue directional commands to move all animals of one color simultaneously toward their matching pen. Animals block each other on collision. Get every animal home within par moves.

## Mechanic Type
Constraint Satisfaction

## Why It Works

### Stare Test
All positions are visible, but the state space explodes with concurrent agents. With 3 colors x 3 animals each = 9 agents on a 5x5 grid, even planning 3 moves ahead requires simulating 4 directions x 3 colors = 12 options per move, creating 12^3 = 1,728 possible 3-move sequences, each with 9 agents colliding and blocking in different ways. Human working memory caps at ~4-7 objects; tracking 9 agents with collision physics across 3+ moves exceeds mental simulation capacity. The game passes the stare test not through hidden information but through COMBINATORIAL EXPLOSION of visible interactions -- the same reason chess passes despite full visibility.

### Dominant Strategy Test
"Move the most blocked color first" sounds reasonable but fails immediately. Moving red animals left might clear a path for blue, but it also pushes red into green's path, creating a new blockage. The cost of every move is INCOMMENSURABLE: whether moving red-left is good depends on whether you later plan to move green-up or green-right, which depends on whether blue is blocking green's upward path, which depends on where red ends up. This is genuine recursive cost dependency -- the core design principle from learnings.md.

### Family Test
Multi-agent constrained movement. This is NOT:
- IceSlide (single agent sliding on ice to a goal)
- PathWeaver (single path through a grid)
- Push/slide family (single block pushing)
- Loop (ring rotation -- no agents, just permutation)

The defining feature is CONCURRENT agents with mutual blocking. Each command moves an entire GROUP simultaneously, and the interactions between groups create the puzzle's depth. The closest commercial analog is "Toad and Frog" puzzles or the Rush Hour family, but those move individual pieces. Herd's group-movement-with-collision is a distinct mechanical family.

## Predicted Failure Mode
**Most likely death: A10 on easy days.** Monday with 2 colors x 2 animals = 4 agents might be mentally simulable for careful players. Mitigation: even Monday must have at least one blocking interaction that requires a non-obvious "move away from the pen first" sequence. Minimum 2 colors x 2 animals with at least one interlock.

**Second risk: d1 failure (too complex).** "Move all animals of one color in one direction" is a compound action. Players might not immediately grasp that ALL same-color animals move simultaneously, or that collision stops movement. The rule is simple in words but the consequences are visually complex.

**Third risk: difficulty cliff.** Monday (2 colors) might be trivially easy while Friday (4 colors) might be impossibly hard. The difficulty curve must be smooth, scaling agents and blocking density gradually.

**Anti-pattern proximity: A10 (fully visible).** The game is fully visible, which is normally fatal. But like chess and Sokoban, the combinatorial explosion of agent interactions prevents mental computation beyond 2-3 moves. This ONLY works if the puzzle requires 4+ move solutions where blocking creates mandatory detours.

## Expected Metrics
| Metric | Prediction | Reasoning |
|---|---|---|
| Puzzle Entropy | 15-22 | 9-12 agents x 25 positions x blocking interactions. Effective state space is huge. ~5-10 moves per puzzle = 5-10 decisions. |
| Skill-Depth | 50-80% | Multi-agent planning rewards deep thinking. Random move selection almost never solves; strategic sequencing (unblock before herd) is essential. Sokoban-family puzzles typically have very high skill depth. |
| Counterintuitive Moves | 3-5 | "Move red AWAY from the red pen" to unblock green, then move green, then move red home. Detour moves are the heart of the puzzle. Every interesting solution requires at least one "wrong direction" move. |
| Drama | 0.6-0.8 | High drama: player gets 8 of 9 animals home, but the last one is blocked and requires undoing progress. Near-miss scenarios are inherent to the blocking mechanic. |
| Decision Entropy | 2.5-3.5 | 3-4 colors x 4 directions = 12-16 options per move, but blocking constraints make ~4-8 genuinely useful. |
| Info Gain Ratio | 2.0-3.0 | Strategic players will dramatically outperform random movers. The game is deterministic with full info -- skill is purely planning depth. |

## Player Experience
**Opening (10s):** A cheerful 5x5 grid. Three red foxes, three blue birds, three green frogs, each near but not at their matching colored pens on the grid edges. You tap the red arrow pointing left -- all three foxes scoot left simultaneously. Two reach the red pen; one bonks into a blue bird and stops short. Immediately you understand: "I need to move blue out of the way first."

**Middle (2-3min):** You move blue birds up to clear the path for the stuck red fox. But now a blue bird is blocking a green frog's path to the green pen. You see the cascade: to get green home, you need blue to move. But blue's current position is perfect for the blue pen. If you move blue to help green, you'll need to move blue BACK afterward. You're three moves into a planning chain, weighing: "Is there a sequence that avoids this triangle of blockages entirely?"

**Ending (30s):** Two animals left. One green frog needs to go right, but a red fox (already home) is in the way. Moving red would pull all red foxes out of their pen. You realize: the frog can go UP first (into an empty lane), then RIGHT, then DOWN into the green pen -- a 3-move detour around the parked foxes. You execute the sequence, last frog hops home, celebration burst. One over par -- that initial red-before-blue was the mistake. Screenshot: an emoji grid showing animal paths as colored arrows, final positions matching pens.

**The aha moment:** "I can't move blue without also moving THIS blue -- so I need green to go AROUND instead." The moment you see the multi-agent constraint and find the detour.

**The near-miss:** "If I'd started with green instead of red, the blocking pattern would have been simpler. The opening move determines everything."

## Difficulty Knobs
1. **Number of colors/species** (Monday: 2 colors x 2 animals = 4 agents, simple blocking; Friday: 4 colors x 3 animals = 12 agents, complex cascading blocks)
2. **Blocking density** (Monday: animals start near their pens with 1 interlock; Friday: animals start far from pens with 3-4 interlocking blocking chains)
3. **Par moves** (Monday: par = 2x optimal for generous margin; Friday: par = optimal + 1, demanding precise sequencing)

---
<!-- BELOW THIS LINE: filled by engineer and playtester, not designer -->

## Solver Metrics

Computed on 5 puzzles (Mon-Fri seeds), 5 skill levels each.

| Metric | Mon | Tue | Wed | Thu | Fri | Avg |
|---|---|---|---|---|---|---|
| Solvability | 100% | 100% | 100% | 100% | 100% | 100% |
| Puzzle Entropy | 28.21 | 30.91 | 18.62 | 25.07 | 46.30 | 29.82 |
| Skill-Depth | 95.0% | 94.5% | 97.0% | 96.0% | 93.0% | 95.1% |
| Decision Entropy | 1.78 | 1.57 | 1.68 | 1.86 | 2.00 | 1.78 |
| Counterintuitive | 2 | 3 | 2 | 2 | 3 | 2.4 |
| Drama | 0.10 | 0.55 | 1.00 | 0.86 | 0.64 | 0.63 |
| Duration (s) | 0.01 | 0.00 | 0.01 | 0.00 | 0.01 | 0.01 |
| Info Gain Ratio | 3.76 | 4.54 | 6.80 | 6.53 | 3.41 | 5.01 |
| Solution Uniqueness | 7 | 4 | 4 | 10 | 1 | 5.2 |

Optimal solution lengths: Mon=10, Tue=11, Wed=6, Thu=8, Fri=14.
Grid: 5x5. Mon-Tue: 2 colors x 2 animals (4 agents). Wed-Fri: 3 colors x 2 animals (6 agents).
L1 (random) fails all puzzles. L3 (greedy+lookahead) solves Thu only (16 moves vs 8 optimal). L5 (A*) solves all.

**Auto-kill check**: PASSED
**Weakest metric**: Drama Mon = 0.10 (nearly monotonic progress on easiest puzzle; other days 0.55-1.00)
**Strongest metric**: Skill-Depth = 95.1% (random play almost never solves; strategic sequencing essential)

## Play Report
<!-- Playtester fills this section with blind play observations -->

## Decision
<!-- Designer fills this after reviewing metrics + play report -->
<!-- Status: keep / iterate / kill -->
<!-- If iterate: what to change and why -->
<!-- If kill: lesson learned for learnings.md -->
