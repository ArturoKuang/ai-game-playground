# Delve

## Algorithm Target
2.3 DFS / Backtracking
"Go deep, fail fast, undo, try next — don't enumerate everything"

## Rules
Explore a partially-hidden dungeon to find the exit. Rooms reveal as you enter them. Some doors need keys. Limited steps. Backtrack to branch points when stuck.

## Mechanic Type
Constraint Satisfaction

## Algorithm-Mechanic Mapping
- **Algorithm step → Game action**: The player enters a room (DFS push). If it's a dead end or locked door, they backtrack to the previous junction (DFS pop/backtrack). They choose which unexplored branch to try next. This IS depth-first search with backtracking.
- **Why greedy fails**: Greedy = "always go forward, never backtrack voluntarily." Gets stuck in long dead-end branches, wasting steps. DFS with EARLY PRUNING (recognize dead ends fast, backtrack immediately) uses fewer steps. The pruning insight: if a path requires a key you don't have, don't explore further — turn back now.
- **The aha moment**: "I should go as deep as I can, but the moment I hit a dead end, I need to go BACK to the last fork and try a different path. And if I can see that a path needs a key I don't have, I shouldn't even enter — prune it!"

## Why It Works

### Algorithm Emergence Test
The player's optimal strategy is: enter a room (push), check branches, go deep into one. If dead end: backtrack (pop) to last junction, try next branch. If locked: note key requirement, backtrack, search for key elsewhere. This IS depth-first search with pruning. The backtrack decision IS the "pop" operation.

### Greedy Trap Test
Greedy "always go forward" commits to the first path and only backtracks when physically stuck. This wastes steps in long dead-end branches. Optimal: peek into a room (reveals doors), count exits. If only one unexplored exit leads to a key-locked area and you don't have the key, prune immediately. This pruning saves 30-50% of steps at Hard difficulty.

### Stare Test
The dungeon is HIDDEN — rooms reveal only when entered. The player can see the room they're in and its exits, but not what's beyond. This makes pre-planning impossible and forces iterative exploration. At higher difficulties, the dungeon is larger with more branches, making mental mapping infeasible.

### Transferability Test
- #78 Subsets: explore all combinations = explore all dungeon branches
- #39 Combination Sum: prune when sum exceeds target = prune when key is missing
- #46 Permutations: try each option at each level = try each branch at each junction
- #51 N-Queens: constraint checking before placing = checking key requirements before entering

### Not a Quiz Test
Player sees a dungeon map that reveals as they explore. They think about rooms, keys, doors, and escape — not "DFS." The interface shows torch-lit corridors and fog of war.

## Predicted Failure Mode
Risk: exploration games can feel random (A1) if the dungeon is too large or too branchy. Mitigation: (1) dungeons are small enough to mentally track (5-8 junctions), (2) key requirements create LOGICAL pruning (not random dead ends), (3) step count gives urgency. Also risk of being too close to existing maze games (A4).

## Expected Metrics
| Metric | Prediction | Reasoning |
|---|---|---|
| Puzzle Entropy | 15-22 bits | Each junction has 2-4 branches to choose from |
| Skill-Depth | 45-65% | Pruning + early backtracking vs exhaustive exploration |
| Counterintuitive Moves | 3-5 per puzzle | Voluntarily backtracking from a "promising" path to try another |
| Drama | 0.6-0.8 | Steps running out while searching for the exit |
| Decision Entropy | 2.0-3.0 bits | 2-4 branch choices at each junction |
| Info Gain Ratio | 2.0-3.0 | Strategic branch selection (check key requirements first) vs random |
| Algorithm Alignment | 75-90% | Each explore/backtrack maps to DFS push/pop |
| Greedy-Optimal Gap | 25-45% | Pruning saves 30-50% of steps |

## Difficulty Progression
- **Level 1-2 (Easy)**: 5 rooms, 2 junctions, 0 locked doors, generous steps. Any exploration order works.
- **Level 3-4 (Medium)**: 10 rooms, 4 junctions, 2 locked doors (keys hidden in dead-end branches), steps = 1.3× optimal. Random exploration wastes steps. Players learn to backtrack early.
- **Level 5 (Hard)**: 15 rooms, 6 junctions, 4 locked doors, step budget = 1.1× optimal. Only DFS with strategic pruning fits within budget.

## Player Experience
Level 1: "I just wander around and find the exit. Easy." (Confidence)
Level 3: "I went down a long path that was a dead end! I should've turned back at the fork when I saw it needed a key I didn't have." (Learn pruning)
Level 5: "At each fork: peek → check requirements → prune impossible paths → go deep on the best branch → backtrack immediately if stuck." (DFS mastery)

## Difficulty Knobs
- **Room count**: 5 → 15
- **Junction count**: 2 → 6
- **Locked doors**: 0 → 4
- **Step budget ratio**: 3.0 → 1.1
- **Visibility** (how far ahead you can see): 2 rooms → 1 room

---
<!-- BELOW THIS LINE: filled by engineer and playtester -->

## Solver Metrics

## Play Report

## Decision
