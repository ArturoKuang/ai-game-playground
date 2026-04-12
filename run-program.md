# Blind 75 Run Program

This document is the outer control loop for the Blind 75 effort.

Use `leetcode/program.md` as the inner execution loop for each cycle. Do not use the root `program.md` for this work.

## Goal

Keep running `leetcode/program.md` until every NeetCode Blind 75 problem below is covered by a kept game.

Default standard: one kept game per problem.

Allowed exception: a single kept game may cover multiple Blind 75 problems if the `Concept Bridge` is explicit, specific, and defensible. Do not stretch a weak mapping just to check a box.

## Repeat Loop

1. Read this file and `leetcode/program.md`.
2. Find the first Blind 75 problem below that is still unchecked.
3. Open the linked LeetCode problem and read the statement if needed.
4. Map the problem to its algorithm/topic.
5. If that topic is missing from `leetcode/curriculum.md`, add it before starting the cycle.
6. If an existing kept game already teaches this problem well, add or update the concept bridge and mark the problem complete.
7. Otherwise run one full cycle from `leetcode/program.md` for this problem.
8. Do not stop at one attempt if the concept is killed. Start another cycle for the same problem until you get a kept game or a clearly better shared game that covers it.
9. After each kept result, update this file:
   - mark the problem complete
   - note the kept game name
   - note any multi-problem coverage you are claiming
10. Repeat until all 75 problems are complete.

## Hard Rules

- Never mark a problem complete without a kept game or an explicit bridge to an existing kept game.
- Always prefer `leetcode/program.md` over inventing a side workflow.
- Keep the playtester blind, per `leetcode/program.md`.
- If a problem is premium or inaccessible on LeetCode, still keep its official link here and use the best available statement access you have.
- Obey prerequisite gates in `leetcode/curriculum.md` when they matter. If the next listed problem is blocked by missing prerequisite topics, work the next unblocked problem and come back later.

## Completion Criteria

The Blind 75 effort is done only when:

- every problem below is checked
- every checked problem points to a kept game
- every reused game has an explicit concept bridge for each problem it claims to cover

## Tracker

Legend:

- `[ ]` not yet covered
- `[x]` covered by a kept game

### Arrays & Hashing

- [x] `#1 Two Sum`  | <https://leetcode.com/problems/two-sum/> | Game: Tag (shared with `#217`)
- [x] `#217 Contains Duplicate`  | <https://leetcode.com/problems/contains-duplicate/> | Game: Tag (shared with `#1`)
- [x] `#242 Valid Anagram`  | <https://leetcode.com/problems/valid-anagram/> | Game: Ledger
- [x] `#49 Group Anagrams`  | <https://leetcode.com/problems/group-anagrams/> | Game: Seal
- [x] `#347 Top K Frequent Elements`  | <https://leetcode.com/problems/top-k-frequent-elements/> | Game: Roost
- [x] `#238 Product of Array Except Self`  | <https://leetcode.com/problems/product-of-array-except-self/> | Game: Halo
- [x] `#36 Valid Sudoku`  | <https://leetcode.com/problems/valid-sudoku/> | Game: Ward
- [x] `#128 Longest Consecutive Sequence`  | <https://leetcode.com/problems/longest-consecutive-sequence/> | Game: Trailhead

### Two Pointers

- [x] `#125 Valid Palindrome`  | <https://leetcode.com/problems/valid-palindrome/> | Game: Foldline
- [x] `#15 3Sum`  | <https://leetcode.com/problems/3sum/> | Game: Truce
- [x] `#11 Container With Most Water`  | <https://leetcode.com/problems/container-with-most-water/> | Game: Tidewall

### Sliding Window

- [x] `#121 Best Time to Buy and Sell Stock`  | <https://leetcode.com/problems/best-time-to-buy-and-sell-stock/> | Game: Ticker
- [x] `#3 Longest Substring Without Repeating Characters`  | <https://leetcode.com/problems/longest-substring-without-repeating-characters/> | Game: Echo Run
- [x] `#424 Longest Repeating Character Replacement`  | <https://leetcode.com/problems/longest-repeating-character-replacement/> | Game: Patch Parade
- [x] `#76 Minimum Window Substring`  | <https://leetcode.com/problems/minimum-window-substring/> | Game: Manifest

### Stack

- [x] `#20 Valid Parentheses`  | <https://leetcode.com/problems/valid-parentheses/> | Game: Claspline

### Binary Search

- [x] `#153 Find Minimum in Rotated Sorted Array`  | <https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/> | Game: Breakline
- [x] `#33 Search in Rotated Sorted Array`  | <https://leetcode.com/problems/search-in-rotated-sorted-array/> | Game: Bandshift

### Linked List

- [x] `#206 Reverse Linked List`  | <https://leetcode.com/problems/reverse-linked-list/> | Game: Backhaul
- [x] `#21 Merge Two Sorted Lists`  | <https://leetcode.com/problems/merge-two-sorted-lists/> | Game: Mainline
- [x] `#141 Linked List Cycle`  | <https://leetcode.com/problems/linked-list-cycle/> | Game: Wakeline
- [x] `#143 Reorder List`  | <https://leetcode.com/problems/reorder-list/> | Game: Lacehook
- [x] `#19 Remove Nth Node From End of List`  | <https://leetcode.com/problems/remove-nth-node-from-end-of-list/> | Game: Towline
- [x] `#23 Merge k Sorted Lists`  | <https://leetcode.com/problems/merge-k-sorted-lists/> | Game: Crownline

### Trees

- [x] `#226 Invert Binary Tree`  | <https://leetcode.com/problems/invert-binary-tree/> | Game: Boughturn
- [x] `#104 Maximum Depth of Binary Tree`  | <https://leetcode.com/problems/maximum-depth-of-binary-tree/> | Game: Highbough
- [x] `#100 Same Tree`  | <https://leetcode.com/problems/same-tree/> | Game: Twinbough
- [x] `#572 Subtree of Another Tree`  | <https://leetcode.com/problems/subtree-of-another-tree/> | Game: Graftguard
- [x] `#235 Lowest Common Ancestor of a Binary Search Tree`  | <https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-search-tree/> | Game: Splitbough
- [x] `#102 Binary Tree Level Order Traversal`  | <https://leetcode.com/problems/binary-tree-level-order-traversal/> | Game: Chorusbough
- [x] `#98 Validate Binary Search Tree`  | <https://leetcode.com/problems/validate-binary-search-tree/> | Game: Charterbough
- [x] `#230 Kth Smallest Element in a BST`  | <https://leetcode.com/problems/kth-smallest-element-in-a-bst/> | Game: Rankbough
- [x] `#105 Construct Binary Tree from Preorder and Inorder Traversal`  | <https://leetcode.com/problems/construct-binary-tree-from-preorder-and-inorder-traversal/> | Game: Tracebough
- [x] `#124 Binary Tree Maximum Path Sum`  | <https://leetcode.com/problems/binary-tree-maximum-path-sum/> | Game: Spanbough
- [x] `#297 Serialize and Deserialize Binary Tree`  | <https://leetcode.com/problems/serialize-and-deserialize-binary-tree/> | Game: Hollowbough

### Heap / Priority Queue

- [x] `#295 Find Median from Data Stream`  | <https://leetcode.com/problems/find-median-from-data-stream/> | Game: Midmoor

### Backtracking

- [x] `#39 Combination Sum`  | <https://leetcode.com/problems/combination-sum/> | Game: Stillpath
- [x] `#79 Word Search`  | <https://leetcode.com/problems/word-search/> | Game: Runepath

### Tries

- [x] `#208 Implement Trie (Prefix Tree)`  | <https://leetcode.com/problems/implement-trie-prefix-tree/> | Game: Stemvault
- [x] `#211 Design Add and Search Words Data Structure`  | <https://leetcode.com/problems/design-add-and-search-words-data-structure/> | Game: Veilvault
- [x] `#212 Word Search II`  | <https://leetcode.com/problems/word-search-ii/> | Game: Stemweave

### Graphs

- [x] `#200 Number of Islands`  | <https://leetcode.com/problems/number-of-islands/> | Game: Islemark
- [x] `#133 Clone Graph`  | <https://leetcode.com/problems/clone-graph/> | Game: Echoforge
- [x] `#417 Pacific Atlantic Water Flow`  | <https://leetcode.com/problems/pacific-atlantic-water-flow/> | Game: Crosstide
- [x] `#207 Course Schedule`  | <https://leetcode.com/problems/course-schedule/> | Game: Syllabind
- [x] `#261 Graph Valid Tree`  | <https://leetcode.com/problems/graph-valid-tree/> | Game: Rootbond (shared with `#323`)
- [x] `#323 Number of Connected Components in an Undirected Graph`  | <https://leetcode.com/problems/number-of-connected-components-in-an-undirected-graph/> | Game: Rootbond (shared with `#261`)

### Advanced Graphs

- [x] `#269 Alien Dictionary`  | <https://leetcode.com/problems/alien-dictionary/> | Game: Lexiforge

### 1-D Dynamic Programming

- [x] `#70 Climbing Stairs`  | <https://leetcode.com/problems/climbing-stairs/> | Game: Steploom
- [x] `#198 House Robber`  | <https://leetcode.com/problems/house-robber/> | Game: Nightledger
- [x] `#213 House Robber II`  | <https://leetcode.com/problems/house-robber-ii/> | Game: Loopledger
- [x] `#5 Longest Palindromic Substring`  | <https://leetcode.com/problems/longest-palindromic-substring/> | Game: Heartspan
- [x] `#647 Palindromic Substrings`  | <https://leetcode.com/problems/palindromic-substrings/> | Game: Pulseledger
- [x] `#91 Decode Ways`  | <https://leetcode.com/problems/decode-ways/> | Game: Glyphrail
- [x] `#322 Coin Change`  | <https://leetcode.com/problems/coin-change/> | Game: Mintpath
- [x] `#152 Maximum Product Subarray`  | <https://leetcode.com/problems/maximum-product-subarray/> | Game: Flipforge
- [x] `#139 Word Break`  | <https://leetcode.com/problems/word-break/> | Game: Spellsplice
- [x] `#300 Longest Increasing Subsequence`  | <https://leetcode.com/problems/longest-increasing-subsequence/> | Game: Crestchain

### 2-D Dynamic Programming

- [x] `#62 Unique Paths`  | <https://leetcode.com/problems/unique-paths/> | Game: Waygrid
- [ ] `#1143 Longest Common Subsequence`  | <https://leetcode.com/problems/longest-common-subsequence/> | Game:

### Greedy

- [ ] `#53 Maximum Subarray`  | <https://leetcode.com/problems/maximum-subarray/> | Game:
- [ ] `#55 Jump Game`  | <https://leetcode.com/problems/jump-game/> | Game:

### Intervals

- [ ] `#57 Insert Interval`  | <https://leetcode.com/problems/insert-interval/> | Game:
- [ ] `#56 Merge Intervals`  | <https://leetcode.com/problems/merge-intervals/> | Game:
- [ ] `#435 Non-overlapping Intervals`  | <https://leetcode.com/problems/non-overlapping-intervals/> | Game:
- [ ] `#252 Meeting Rooms`  | <https://leetcode.com/problems/meeting-rooms/> | Game:
- [ ] `#253 Meeting Rooms II`  | <https://leetcode.com/problems/meeting-rooms-ii/> | Game:

### Math & Geometry

- [ ] `#54 Spiral Matrix`  | <https://leetcode.com/problems/spiral-matrix/> | Game:
- [ ] `#48 Rotate Image`  | <https://leetcode.com/problems/rotate-image/> | Game:
- [ ] `#73 Set Matrix Zeroes`  | <https://leetcode.com/problems/set-matrix-zeroes/> | Game:

### Bit Manipulation

- [ ] `#191 Number of 1 Bits`  | <https://leetcode.com/problems/number-of-1-bits/> | Game:
- [ ] `#338 Counting Bits`  | <https://leetcode.com/problems/counting-bits/> | Game:
- [ ] `#190 Reverse Bits`  | <https://leetcode.com/problems/reverse-bits/> | Game:
- [ ] `#268 Missing Number`  | <https://leetcode.com/problems/missing-number/> | Game:
- [ ] `#371 Sum of Two Integers`  | <https://leetcode.com/problems/sum-of-two-integers/> | Game:
