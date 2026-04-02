# Wave

## Algorithm Target
2.2 BFS
"Explore all neighbors before going deeper = shortest path"

## Rules
Send a wave from the source cell that expands one step at a time. Choose which frontier cells to activate (costs energy). Active cells spread to neighbors next turn. Reach all target cells using minimum total energy.

## Mechanic Type
Optimization

## Algorithm-Mechanic Mapping
- **Algorithm step → Game action**: Each turn, the player sees the wave's frontier (all cells reachable in one more step). They choose which frontier cells to "activate." Active cells become the new frontier next turn. This IS BFS level-by-level expansion — the player decides which nodes to process at each level.
- **Why greedy fails**: Greedy = "activate only the frontier cell closest to the nearest unreached target." This reaches one target quickly but leaves others far behind. Backtracking to distant targets costs extra energy. BFS (activate all frontier cells) reaches ALL targets via shortest paths simultaneously, using less total energy.
- **The aha moment**: "If I activate ALL frontier cells at each step, the wave reaches every target by the shortest possible route. Picking favorites wastes energy because I'll have to re-expand later!"

## Why It Works

### Algorithm Emergence Test
The optimal strategy is to activate ALL frontier cells at each level (BFS). This ensures every target is reached by its shortest path. Selective activation (DFS-like) reaches some targets faster but others much later, increasing total energy. The insight: breadth-first exploration minimizes total cost when you need ALL targets, not just the nearest one.

### Greedy Trap Test
With 3+ targets in different directions, greedy "aim for nearest" reaches target 1 in 3 steps, then must backtrack 5 steps to reach target 2. BFS would reach both in 4 steps total. The energy difference is dramatic at higher difficulties with more targets.

### Stare Test
Grid has obstacles (walls) that create non-obvious shortest paths. The player can see the grid but computing multi-target optimal routes mentally is combinatorially hard. The wave visualization helps them DISCOVER shortest paths through play.

### Transferability Test
- #994 Rotting Oranges: multi-source BFS = this game's multi-target expansion
- #200 Number of Islands: BFS flood fill = wave expansion
- #102 Level Order Traversal: level-by-level processing IS the game mechanic
- #127 Word Ladder: finding shortest transformation = shortest wave path

### Not a Quiz Test
Player sees a terrain map with a source (glowing dot), targets (stars), and obstacles (walls). They control a spreading wave. The interface shows expanding rings of color. It feels like a strategy game about wave propagation, not a graph algorithm exercise.

## Predicted Failure Mode
Risk of A10 — the grid is fully visible, and shortest paths can be computed by counting cells. Mitigation: (1) obstacles create non-obvious routing, (2) energy costs vary by terrain type (some cells cost 2 energy instead of 1), (3) at higher difficulties, waves can only spread through cells of matching color, adding a constraint layer.

## Expected Metrics
| Metric | Prediction | Reasoning |
|---|---|---|
| Puzzle Entropy | 15-25 bits | Many frontier cells to choose from at each level |
| Skill-Depth | 40-60% | BFS vs DFS-like selective activation |
| Counterintuitive Moves | 2-4 per puzzle | Activating a cell far from any target (because it's on a shortest path around an obstacle) |
| Drama | 0.5-0.7 | Energy running low with targets remaining |
| Decision Entropy | 2.5-3.5 bits | 3-12 frontier cells to choose from |
| Info Gain Ratio | 1.5-2.5 | Strategic frontier selection vs random |
| Algorithm Alignment | 70-85% | Full-frontier activation = BFS |
| Greedy-Optimal Gap | 25-40% | BFS reaches all targets more efficiently than greedy DFS |

## Difficulty Progression
- **Level 1-2 (Easy)**: 6×6 grid, 2 targets, no obstacles, generous energy. Any strategy works.
- **Level 3-4 (Medium)**: 8×8 grid, 3 targets, obstacles, energy = 1.5× BFS optimal. Selective activation wastes energy.
- **Level 5 (Hard)**: 10×10 grid, 4+ targets, obstacles + variable energy costs, energy = 1.1× BFS optimal. Only full BFS expansion works.

## Player Experience
Level 1: "I send the wave toward the targets one at a time. Easy." (Confidence)
Level 3: "I aimed for the nearest target first, but now I have to go all the way back for the other two. If I had spread the wave evenly, I'd have reached all of them faster!" (Discovery)
Level 5: "Full wave expansion. Hit every frontier cell. The shortest paths emerge naturally from the expanding ring." (Mastery)

## Difficulty Knobs
- **Grid size**: 6×6 → 10×10
- **Number of targets**: 2 → 5
- **Obstacle density**: 0% → 30%
- **Energy budget ratio**: 3.0 → 1.1
- **Variable terrain costs** (Level 4+): some cells cost 2 energy

---
<!-- BELOW THIS LINE: filled by engineer and playtester -->

## Solver Metrics

## Play Report

## Decision
