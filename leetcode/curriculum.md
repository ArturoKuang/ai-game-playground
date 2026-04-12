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
| 1.1 | **Binary Search** | Halving search space | "Always cut the remaining space in half — don't scan linearly" | keep (Breakline) |
| 1.2 | **Two Pointers** | Converging pointers on sorted data | "Two ends converging is O(n), not O(n^2)" | keep (Pinch) |
| 1.3 | **Stack** | LIFO ordering / matching | "Most-recent-first processing solves nested structure problems" | keep (Claspline) |
| 1.4 | **Sliding Window** | Variable-width window maintenance | "Expand right, shrink left — never restart from scratch" | keep (Pane) |
| 1.5 | **Hash Map** | O(1) lookup / frequency counting | "Trade space for time — precompute to avoid re-scanning" | keep (Tag) |
| 1.6 | **Prefix / Suffix Accumulation** | Two directional running passes | "Store everything before me, then everything after me, and combine them without redoing the whole row" | keep (Halo) |
| 1.7 | **Scoped Hash Registries** | Row/column/box constraint tracking with keyed registries | "When one item belongs to several overlapping groups, file it into every group once so duplicates surface immediately" | keep (Ward) |

## Tier 2: Data Structure Intuition

Prerequisites: at least 2 Tier 1 games kept.

| # | Topic | Algorithm Concept | Core Insight to Teach | Prereqs | Status |
|---|---|---|---|---|---|
| 2.1 | **Heap / Priority Queue** | Efficient min/max extraction | "Always know the best option without sorting everything" | 1.5 | keep (Crownline) |
| 2.2 | **BFS** | Level-by-level exploration | "Explore all neighbors before going deeper = shortest path" | — | keep (Chorusbough) |
| 2.3 | **DFS / Backtracking** | Depth-first with pruning | "Go deep, fail fast, undo, try next — don't enumerate everything" | — | keep (Delve) |
| 2.3a | **Grid Flood Fill / Component Counting** | Sweep a grid, count fresh land once, then mark the whole orthogonally connected patch before continuing | "When you first touch unclaimed land, that is one island. Consume the whole coast now so none of it can be counted again later." | 2.2, 2.3 | keep (Islemark) |
| 2.3b | **Graph Clone / Memoized Traversal** | Graph DFS/BFS with an old-to-new node registry that forges one clone per original node and reuses it on every revisit | "The first time you touch a beacon, forge and file its echo immediately. Every later edge that reaches that same beacon must close onto the stored echo instead of starting a second copy." | 1.5, 2.3 | keep (Echoforge) |
| 2.3c | **Reverse Reachability / Dual-Border Flood Fill** | Run one reverse uphill flood from each target border, then keep only the cells both floods can reach | "Do not test every spring separately. Start at each ocean edge and climb only into equal-or-higher land; the cells touched by both reverse tides are exactly the ones that can drain to both seas." | 2.2, 2.3, 2.3a | keep (Crosstide) |
| 2.4 | **Trie** | Prefix tree / shared prefixes | "Shared beginnings mean shared computation" | 1.5 | keep (Stemvault) |
| 2.4a | **Trie / Wildcard Branch Search** | Trie-backed wildcard lookup with per-branch DFS | "A masked letter is every child branch from here, one at a time, until one full word works or they all fail" | 2.3, 2.4 | keep (Veilvault) |
| 2.4b | **Trie / Board Prefix Pruning** | Grid DFS guided by trie prefixes and early dead-prefix cuts | "On a letter board, only trails that still match some stored opening deserve another step; the moment a prefix dies, cut that branch immediately and keep searching elsewhere" | 2.3, 2.4 | keep (Stemweave) |
| 2.5 | **Monotonic Stack** | Maintaining sorted invariant | "The stack always knows the 'next greater' answer" | 1.3 | todo |
| 2.6 | **Frequency Buckets / Top-K Counts** | Count once, then read the fullest groups first | "A running count turns 'most frequent' into a visible ranking instead of repeated rescans" | 1.5 | keep (Roost) |
| 2.7 | **Linked List Pointer Rewiring** | One-pass node reversal and splice-safe pointer updates | "Before you break the live link, save where it was going; then point it backward and advance all handles together" | — | keep (Backhaul) |
| 2.8 | **Runner Pointers** | Fast/slow pursuit on a one-way chain | "If a faster traveler ever catches a slower one on the same one-way route, the path loops; if the faster traveler escapes, it doesn't" | 1.2, 2.7 | keep (Wakeline) |
| 2.9 | **Fixed-Gap Runner Pointers** | Dummy-head lead/lag gap for one-pass predecessor positioning | "Send one runner one extra step ahead from the dock, then march both together until the lead runner falls off; the trailer is now parked at the cut point" | 2.7, 2.8 | keep (Towline) |
| 2.10 | **Tree Recursion / Subtree Mirroring** | Recursive binary-tree transforms with one local action repeated on both children | "At each branch hub, do the local swap now, then repeat the same job on each child subtree before you wander elsewhere" | 2.3 | keep (Boughturn) |
| 2.11 | **Tree Recursion / Bottom-Up Height** | Recursive subtree aggregation where each branch returns one numeric answer upward | "A branch only knows its height after its child branches report theirs; keep the larger child height and add one on the way back up" | 2.3 | keep (Highbough) |
| 2.12 | **Tree Recursion / Paired Equality** | Recursive lockstep comparison of two subtrees | "Compare the two branches you are standing on, then prove the left pair and right pair before you certify that the parent pair truly matches" | 2.3 | keep (Twinbough) |
| 2.13 | **Tree Recursion / Subtree Search** | Recursive search that first tests the current node as a full candidate, then recurses into child subtrees only if that local candidate fails | "First ask whether the whole target fits right here. If it does not, the same search still has to continue inside the left branch and right branch before this branch is ruled out" | 2.12 | keep (Graftguard) |
| 2.14 | **BST Split Navigation** | Directed descent in a binary search tree until the first node where two targets stop lying on the same side | "If both targets are smaller, keep left. If both are larger, keep right. The first branch where they split is the shared fork." | 1.1 | keep (Splitbough) |
| 2.15 | **BST Bounds Propagation** | Recursive validity checks with inherited lower and upper bounds | "A branch is legal only inside every ancestor gate it inherited; when you go left, tighten the ceiling to the current branch, and when you go right, raise the floor." | 2.3, 2.14 | keep (Charterbough) |
| 2.16 | **BST Inorder Rank Traversal** | Sorted in-order visitation in a binary search tree with an early stop at the kth visit | "The next smallest branch is the leftmost unpaid branch on the live return lane. Ring it, then open its right spur only when that spur becomes due." | 2.3, 2.14 | keep (Rankbough) |
| 2.17 | **Tree Reconstruction / Traversal Split Stack** | Recursive binary-tree reconstruction where preorder supplies the current root and inorder boundaries split the live subtree | "The next preorder crest roots the current plot. Find it in the inorder ledger, then bank the right child card first so the left child plot stays on top for the next crest." | 1.5, 2.3 | keep (Tracebough) |
| 2.18 | **Tree Recursion / Split Path Gain** | Postorder tree aggregation with a one-sided return value and a separate best path seen anywhere | "A branch may carry only one helpful child route upward, but it should still test whether both helpful sides together make the best route in the whole canopy." | 2.3, 2.11 | keep (Spanbough) |
| 2.19 | **Tree Codec / Null-Marker Preorder** | Recursive binary-tree serialization where every visited slot writes either a branch value or an empty marker, and decoding consumes that same preorder stream to rebuild the shape | "A branch and an empty hook both need marks in the ribbon. Handle the current slot first; if it is real, open its left and right child slots, and if it is empty, stop that trail immediately." | 2.3, 2.17 | keep (Hollowbough) |

## Tier 3: Algorithm Patterns

Prerequisites: at least 2 Tier 2 games kept.

| # | Topic | Algorithm Concept | Core Insight to Teach | Prereqs | Status |
|---|---|---|---|---|---|
| 3.1 | **1D Dynamic Programming** | Overlapping subproblems + optimal substructure | "Break big problems into small ones, reuse answers" | — | keep (Steploom, Nightledger, Loopledger, Glyphrail) |
| 3.1a | **Palindrome Center Expansion** | Treat every rune and seam as a candidate heart, grow outward while mirrored pairs match, and keep the longest certified span | "A palindrome is defined by its center. Test each odd and even center locally instead of rescanning whole substrings." | 1.2 | keep (Heartspan) |
| 3.1b | **Digit Prefix Decode DP** | Keep a left-to-right decode ledger where each new digit prefix inherits all legal routes from one back, two back, or neither depending on `0` and `10..26` gates | "A digit prefix is worth every decoding lane that can legally reach it. A non-zero digit extends the previous prefix, a legal `10..26` pair extends the two-back prefix, and `0` survives only inside a valid pair." | 3.1 | keep (Glyphrail) |
| 3.1c | **Dual-Extreme Product DP** | Keep the highest and lowest product ending at each position because a negative multiplier can flip them on the next step | "A strong product and a disastrous product must both stay live at every position. The next negative multiplier may turn the disaster into the best span on the board." | 3.1 | keep (Flipforge) |
| 3.1d | **Word-Break Prefix Reachability DP** | Keep a left-to-right reachability ledger where prefix `i` is live if some earlier live cut `j` plus one listed word spans `s[j:i]` exactly | "Do not trust the nearest-looking seam. An endpoint is live only when one earlier live cut can launch a listed word into it, and dead prefixes must be sealed explicitly when every splice starts from a dead cut." | 3.1 | keep (Spellsplice) |
| 3.1e | **Increasing-Subsequence Endpoint DP** | Keep the best rising subsequence length ending at each position by comparing every earlier lower value and inheriting the strongest earlier badge plus one | "A tall marker does not care about the nearest lower marker. It cares about whichever earlier lower marker already ends the strongest rise, because only that best predecessor deserves to hand off into the new crest." | 3.1 | keep (Crestchain) |
| 3.2 | **Greedy** | Local optimality = global optimality (when it works) | "Sometimes the obvious choice IS correct — know when" | — | todo |
| 3.3 | **Topological Sort** | Dependency ordering in DAGs | "Process dependencies before dependents" | 2.2 | keep (Syllabind) |
| 3.4 | **Union-Find** | Connected component tracking | "Who belongs with whom? Merge groups, not elements" | — | keep (Rootbond) |
| 3.5 | **Binary Search on Answer** | Monotonic predicate search | "If you can check a guess, binary search the answer space" | 1.1 | todo |

## Tier 4: Advanced

Prerequisites: at least 2 Tier 3 games kept.

| # | Topic | Algorithm Concept | Core Insight to Teach | Prereqs | Status |
|---|---|---|---|---|---|
| 4.1 | **2D Dynamic Programming** | Grid/sequence DP with two dimensions | "Two sequences = 2D table. Fill cell by cell." | 3.1 | keep (Waygrid) |
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
| Binary Search | #704 Binary Search, #153 Find Minimum in Rotated Sorted Array, #33 Search in Rotated Sorted Array, #875 Koko Eating Bananas |
| Two Pointers | #167 Two Sum II, #15 3Sum, #11 Container With Most Water, #42 Trapping Rain Water |
| Stack | #20 Valid Parentheses, #155 Min Stack, #739 Daily Temperatures, #84 Largest Rectangle |
| Sliding Window | #3 Longest Substring, #424 Longest Repeating Replacement, #76 Minimum Window Substring |
| Hash Map | #1 Two Sum, #49 Group Anagrams, #128 Longest Consecutive |
| Prefix / Suffix Accumulation | #238 Product of Array Except Self |
| Scoped Hash Registries | #36 Valid Sudoku |
| Heap | #23 Merge k Sorted Lists, #215 Kth Largest, #621 Task Scheduler, #295 Find Median from Data Stream |
| BFS | #200 Number of Islands, #102 Level Order Traversal, #994 Rotting Oranges |
| DFS/Backtracking | #78 Subsets, #39 Combination Sum, #46 Permutations, #51 N-Queens |
| Grid Flood Fill / Component Counting | #200 Number of Islands, #733 Flood Fill, #695 Max Area of Island |
| Graph Clone / Memoized Traversal | #133 Clone Graph |
| Reverse Reachability / Dual-Border Flood Fill | #417 Pacific Atlantic Water Flow |
| Monotonic Stack | #739 Daily Temperatures, #496 Next Greater Element, #85 Maximal Rectangle |
| Trie / Wildcard Branch Search | #211 Design Add and Search Words Data Structure |
| Trie / Board Prefix Pruning | #212 Word Search II |
| Frequency Buckets / Top-K Counts | #347 Top K Frequent Elements |
| Linked List Pointer Rewiring | #206 Reverse Linked List, #21 Merge Two Sorted Lists, #143 Reorder List |
| Runner Pointers | #141 Linked List Cycle, #142 Linked List Cycle II, #876 Middle of the Linked List, #287 Find the Duplicate Number |
| Fixed-Gap Runner Pointers | #19 Remove Nth Node From End of List |
| Tree Recursion / Subtree Mirroring | #226 Invert Binary Tree |
| Tree Recursion / Bottom-Up Height | #104 Maximum Depth of Binary Tree |
| Tree Recursion / Paired Equality | #100 Same Tree |
| Tree Recursion / Subtree Search | #572 Subtree of Another Tree |
| BST Split Navigation | #235 Lowest Common Ancestor of a Binary Search Tree |
| BST Bounds Propagation | #98 Validate Binary Search Tree |
| BST Inorder Rank Traversal | #230 Kth Smallest Element in a BST, #94 Binary Tree Inorder Traversal |
| Tree Reconstruction / Traversal Split Stack | #105 Construct Binary Tree from Preorder and Inorder Traversal |
| Tree Recursion / Split Path Gain | #124 Binary Tree Maximum Path Sum |
| Tree Codec / Null-Marker Preorder | #297 Serialize and Deserialize Binary Tree |
| 1D DP | #70 Climbing Stairs, #198 House Robber, #213 House Robber II, #322 Coin Change, #300 LIS |
| Dual-Extreme Product DP | #152 Maximum Product Subarray |
| Digit Prefix Decode DP | #91 Decode Ways |
| Word-Break Prefix Reachability DP | #139 Word Break |
| Increasing-Subsequence Endpoint DP | #300 Longest Increasing Subsequence |
| Palindrome Center Expansion | #5 Longest Palindromic Substring, #647 Palindromic Substrings |
| Greedy | #53 Maximum Subarray, #55 Jump Game, #134 Gas Station, #763 Partition Labels |
| Topological Sort | #207 Course Schedule, #210 Course Schedule II, #269 Alien Dictionary |
| Union-Find | #261 Graph Valid Tree, #323 Connected Components |
| 2D DP | #62 Unique Paths, #1143 LCS, #72 Edit Distance, #97 Interleaving String |
| Dijkstra | #743 Network Delay, #787 Cheapest Flights, #1514 Path with Maximum Probability |
| Intervals | #56 Merge Intervals, #57 Insert Interval, #435 Non-Overlapping Intervals |
