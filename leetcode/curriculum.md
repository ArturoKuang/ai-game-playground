# Algorithm Curriculum — Topic Map & Progression

This file defines the algorithm topics to turn into games, their dependencies, and the core insight each game must teach. The designer reads this to pick the next topic; the engineer reads it to validate that the solver's optimal strategy matches the target algorithm.

---

## How to Use This File

1. **Pick the next unlocked topic** (all prerequisites are `done` or `keep`).
2. Design a game whose optimal strategy IS the algorithm — not a quiz about it.
3. After keep/kill, update the Status column.

---

## Tier 1: Foundations

These have no prerequisites. Start here.

| # | Topic | Algorithm Concept | Core Insight to Teach | Status |
|---|---|---|---|---|
| 1.1 | **Binary Search** | Halving search space | "Always cut the remaining space in half — don't scan linearly" | keep (Rift) |
| 1.2 | **Two Pointers** | Converging pointers on sorted data | "Two ends converging is O(n), not O(n^2)" | keep (Pinch) |
| 1.3 | **Stack** | LIFO ordering / matching | "Most-recent-first processing solves nested structure problems" | todo |
| 1.4 | **Sliding Window** | Variable-width window maintenance | "Expand right, shrink left — never restart from scratch" | keep (Pane) |
| 1.5 | **Hash Map** | O(1) lookup / frequency counting | "Trade space for time — precompute to avoid re-scanning" | keep (Tag) |

## Tier 2: Data Structure Intuition

Prerequisites: at least 2 Tier 1 games kept.

| # | Topic | Algorithm Concept | Core Insight to Teach | Prereqs | Status |
|---|---|---|---|---|---|
| 2.1 | **Heap / Priority Queue** | Efficient min/max extraction | "Always know the best option without sorting everything" | 1.5 | todo |
| 2.2 | **BFS** | Level-by-level exploration | "Explore all neighbors before going deeper = shortest path" | — | todo |
| 2.3 | **DFS / Backtracking** | Depth-first with pruning | "Go deep, fail fast, undo, try next — don't enumerate everything" | — | keep (Delve) |
| 2.4 | **Trie** | Prefix tree / shared prefixes | "Shared beginnings mean shared computation" | 1.5 | todo |
| 2.5 | **Monotonic Stack** | Maintaining sorted invariant | "The stack always knows the 'next greater' answer" | 1.3 | todo |

## Tier 3: Algorithm Patterns

Prerequisites: at least 2 Tier 2 games kept.

| # | Topic | Algorithm Concept | Core Insight to Teach | Prereqs | Status |
|---|---|---|---|---|---|
| 3.1 | **1D Dynamic Programming** | Overlapping subproblems + optimal substructure | "Break big problems into small ones, reuse answers" | — | todo |
| 3.2 | **Greedy** | Local optimality = global optimality (when it works) | "Sometimes the obvious choice IS correct — know when" | — | todo |
| 3.3 | **Topological Sort** | Dependency ordering in DAGs | "Process dependencies before dependents" | 2.2 | todo |
| 3.4 | **Union-Find** | Connected component tracking | "Who belongs with whom? Merge groups, not elements" | — | todo |
| 3.5 | **Binary Search on Answer** | Monotonic predicate search | "If you can check a guess, binary search the answer space" | 1.1 | todo |

## Tier 4: Advanced

Prerequisites: at least 2 Tier 3 games kept.

| # | Topic | Algorithm Concept | Core Insight to Teach | Prereqs | Status |
|---|---|---|---|---|---|
| 4.1 | **2D Dynamic Programming** | Grid/sequence DP with two dimensions | "Two sequences = 2D table. Fill cell by cell." | 3.1 | todo |
| 4.2 | **Dijkstra / Weighted Shortest Path** | Greedy + priority queue on graphs | "Always expand the cheapest frontier node" | 2.1, 2.2 | todo |
| 4.3 | **Interval Scheduling** | Sorting + greedy on intervals | "Sort by end time, greedily pick non-overlapping" | 3.2 | todo |
| 4.4 | **Divide & Conquer** | Recursive halving + merge | "Solve halves independently, combine in O(n)" | 1.1 | todo |
| 4.5 | **Bit Manipulation** | Binary representation tricks | "Numbers are just bit patterns — flip, mask, shift" | — | todo |

---

## Design Constraints for Algorithm Games

These are IN ADDITION to the standard puzzle game constraints in `../learnings.md`.

### C1: The Algorithm Must Emerge From Play

The player should discover the algorithm by playing optimally — not be told about it. After mastering the game, a player should be able to say "oh, that's binary search!" or "I was basically doing BFS!" The game mechanic IS the algorithm.

**Test**: Describe the optimal strategy in plain English. Does it sound like the algorithm? If someone who knows the algorithm would say "that's just [algorithm name]", the game succeeds.

### C2: Greedy Must Fail (Where Appropriate)

For topics where the naive approach is suboptimal (DP, backtracking, certain graph problems), the game MUST have puzzles where greedy play loses. The gap between greedy and optimal is where learning happens.

**Exception**: For topics where greedy IS the algorithm (Greedy, Interval Scheduling), greedy should succeed but the game should teach WHEN and WHY it works — by contrasting with scenarios where a different greedy heuristic fails.

### C3: Progressive Revelation Over Difficulty Levels

- **Level 1-2 (Easy)**: The algorithm concept is nearly obvious. Small inputs. Player succeeds with basic reasoning.
- **Level 3-4 (Medium)**: Naive approach starts failing. Player must think more carefully. The algorithm pattern becomes necessary.
- **Level 5 (Hard)**: Only the algorithm works efficiently. Player who hasn't internalized the concept will struggle or fail.

This mirrors LeetCode Easy → Medium → Hard progression within a single game.

### C4: Concept Bridges

After a game is KEPT, add a `## Concept Bridge` section to the spec:
- "This game teaches X. On LeetCode, X appears in: [problem list]"
- "The moment in the game where you [game action] maps to the moment in code where you [code pattern]"

This is NOT shown to the player during gameplay — it's a post-game insight card.

### C5: No Code, No Jargon

The game never mentions "algorithm", "binary search", "dynamic programming", etc. The player learns the INTUITION, not the vocabulary. Vocabulary comes from the concept bridge AFTER mastery.

---

## LeetCode Problem Mapping

For each topic, reference problems that the game's insight directly helps solve:

| Topic | Key LeetCode Problems |
|---|---|
| Binary Search | #704 Binary Search, #33 Search in Rotated Sorted Array, #875 Koko Eating Bananas |
| Two Pointers | #167 Two Sum II, #15 3Sum, #11 Container With Most Water, #42 Trapping Rain Water |
| Stack | #20 Valid Parentheses, #155 Min Stack, #739 Daily Temperatures, #84 Largest Rectangle |
| Sliding Window | #3 Longest Substring, #424 Longest Repeating Replacement, #76 Minimum Window Substring |
| Hash Map | #1 Two Sum, #49 Group Anagrams, #347 Top K Frequent, #128 Longest Consecutive |
| Heap | #215 Kth Largest, #621 Task Scheduler, #295 Find Median from Data Stream |
| BFS | #200 Number of Islands, #102 Level Order Traversal, #994 Rotting Oranges |
| DFS/Backtracking | #78 Subsets, #39 Combination Sum, #46 Permutations, #51 N-Queens |
| Monotonic Stack | #739 Daily Temperatures, #496 Next Greater Element, #85 Maximal Rectangle |
| 1D DP | #70 Climbing Stairs, #198 House Robber, #322 Coin Change, #300 LIS |
| Greedy | #53 Maximum Subarray, #55 Jump Game, #134 Gas Station, #763 Partition Labels |
| Topological Sort | #207 Course Schedule, #210 Course Schedule II, #269 Alien Dictionary |
| Union-Find | #128 Longest Consecutive, #200 Number of Islands, #323 Connected Components |
| 2D DP | #62 Unique Paths, #1143 LCS, #72 Edit Distance, #97 Interleaving String |
| Dijkstra | #743 Network Delay, #787 Cheapest Flights, #1514 Path with Maximum Probability |
| Intervals | #56 Merge Intervals, #57 Insert Interval, #435 Non-Overlapping Intervals |
