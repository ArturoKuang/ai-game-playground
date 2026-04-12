# Blind 75 Run Program

Outer control loop for covering the NeetCode Blind 75 with algorithm-teaching puzzle games.

Inner loop: `leetcode/program.md` (the 10-phase design cycle).

---

## Launching

### Autonomous (recommended)

```
/loop "Read run-program.md and execute one outer-loop pass."
```

Claude Code self-paces between passes. Each pass covers one unchecked problem.

### Single pass

Paste this as a prompt:

```
Read run-program.md. Execute one outer-loop pass.
```

---

## One Outer-Loop Pass

Execute these steps in order. Do NOT start a second problem in the same pass.

### 1. Bootstrap (first run only)

```bash
node tools/memory-cli.mjs init
```

Skip if `memory/system.sqlite` already exists.

### 2. Pick the next problem

Scan the Tracker below. Find the **first** `[ ]` entry. If that topic is blocked by unmet prerequisites in `leetcode/curriculum.md`, skip to the next unblocked `[ ]`.

### 3. Check for reuse

If an existing kept game already covers this problem's algorithm, add or update its Concept Bridge and mark the problem `[x]` with the game name. Commit and stop — pass complete.

### 4. Ensure curriculum entry

If the problem's algorithm topic is missing from `leetcode/curriculum.md`, add it before continuing.

### 5. Run one inner-loop cycle

Follow `leetcode/program.md` phases 1-10 for this problem. Use these Claude Code tools:

| Phase | Tool |
|-------|------|
| Design (brainstorm, filter, spec) | Direct — read/write files yourself |
| Build (prototype + solver + metrics) | `Agent` with `isolation: "worktree"` |
| Playtest (blind play) | `Agent` — tell it NOT to read source code |
| QA fix loop | `Agent` with `isolation: "worktree"` for fixes, then another `Agent` for retest |
| Polish (keep only) | `Agent` with `isolation: "worktree"` |

Launch independent agents in **parallel** where possible (e.g. multiple specs → multiple build agents in one message).

### 6. Handle the decision

- **keep** — update `leetcode/curriculum.md` status, register game in `src/games/index.ts`, mark problem `[x]` in tracker below, note game name. Check whether any other unchecked problems in the same category share the same algorithm — if the kept game covers them too, mark those `[x]` and note `(shared)`.
- **iterate** — go back to step 5 with the revised spec. Max 3 iterations per concept.
- **kill** — log to `leetcode/results.tsv` and `leetcode/learnings.md`. Try a **new** concept for the same problem (back to step 5). Give up after 3 killed concepts for one problem — leave it `[ ]` and move on.

### 7. Commit and report

```bash
git add <changed files> && git commit -m "cycle: <GameName> — <algorithm> — <keep|kill>"
```

Report: what was tried, what survived (or didn't), what the next unchecked problem is.

### 8. Stop

One problem per pass. If running under `/loop`, Claude Code schedules the next wake-up automatically.

---

## Goal

Every Blind 75 problem checked off with a kept game or an explicit Concept Bridge to a shared game.

Default: one game per problem.
Exception: a game may cover multiple problems if its Concept Bridge is explicit and defensible per problem.

---

## Hard Rules

- Never mark `[x]` without a kept game or bridge.
- Always use `leetcode/program.md` as the inner loop — do not invent side workflows.
- Playtester stays blind to the target algorithm.
- Obey prerequisite gates in `leetcode/curriculum.md`.
- Memory-first: run retrieval briefs before design or build work.
- Worktree isolation for all engineer `Agent` calls.

---

## Completion

Done when every problem is `[x]` and every reused game has per-problem Concept Bridges.

---

## Tracker

`[ ]` = uncovered | `[x]` = kept game

### Arrays & Hashing

- [ ] `#1 Two Sum` | <https://leetcode.com/problems/two-sum/> | Game:
- [ ] `#217 Contains Duplicate` | <https://leetcode.com/problems/contains-duplicate/> | Game:
- [ ] `#242 Valid Anagram` | <https://leetcode.com/problems/valid-anagram/> | Game:
- [ ] `#49 Group Anagrams` | <https://leetcode.com/problems/group-anagrams/> | Game:
- [ ] `#347 Top K Frequent Elements` | <https://leetcode.com/problems/top-k-frequent-elements/> | Game:
- [ ] `#238 Product of Array Except Self` | <https://leetcode.com/problems/product-of-array-except-self/> | Game:
- [ ] `#36 Valid Sudoku` | <https://leetcode.com/problems/valid-sudoku/> | Game:
- [ ] `#128 Longest Consecutive Sequence` | <https://leetcode.com/problems/longest-consecutive-sequence/> | Game:

### Two Pointers

- [ ] `#125 Valid Palindrome` | <https://leetcode.com/problems/valid-palindrome/> | Game:
- [ ] `#15 3Sum` | <https://leetcode.com/problems/3sum/> | Game:
- [ ] `#11 Container With Most Water` | <https://leetcode.com/problems/container-with-most-water/> | Game:

### Sliding Window

- [ ] `#121 Best Time to Buy and Sell Stock` | <https://leetcode.com/problems/best-time-to-buy-and-sell-stock/> | Game:
- [ ] `#3 Longest Substring Without Repeating Characters` | <https://leetcode.com/problems/longest-substring-without-repeating-characters/> | Game:
- [ ] `#424 Longest Repeating Character Replacement` | <https://leetcode.com/problems/longest-repeating-character-replacement/> | Game:
- [ ] `#76 Minimum Window Substring` | <https://leetcode.com/problems/minimum-window-substring/> | Game:

### Stack

- [ ] `#20 Valid Parentheses` | <https://leetcode.com/problems/valid-parentheses/> | Game:

### Binary Search

- [ ] `#153 Find Minimum in Rotated Sorted Array` | <https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/> | Game:
- [ ] `#33 Search in Rotated Sorted Array` | <https://leetcode.com/problems/search-in-rotated-sorted-array/> | Game:

### Linked List

- [ ] `#206 Reverse Linked List` | <https://leetcode.com/problems/reverse-linked-list/> | Game:
- [ ] `#21 Merge Two Sorted Lists` | <https://leetcode.com/problems/merge-two-sorted-lists/> | Game:
- [ ] `#141 Linked List Cycle` | <https://leetcode.com/problems/linked-list-cycle/> | Game:
- [ ] `#143 Reorder List` | <https://leetcode.com/problems/reorder-list/> | Game:
- [ ] `#19 Remove Nth Node From End of List` | <https://leetcode.com/problems/remove-nth-node-from-end-of-list/> | Game:
- [ ] `#23 Merge k Sorted Lists` | <https://leetcode.com/problems/merge-k-sorted-lists/> | Game:

### Trees

- [ ] `#226 Invert Binary Tree` | <https://leetcode.com/problems/invert-binary-tree/> | Game:
- [ ] `#104 Maximum Depth of Binary Tree` | <https://leetcode.com/problems/maximum-depth-of-binary-tree/> | Game:
- [ ] `#100 Same Tree` | <https://leetcode.com/problems/same-tree/> | Game:
- [ ] `#572 Subtree of Another Tree` | <https://leetcode.com/problems/subtree-of-another-tree/> | Game:
- [ ] `#235 Lowest Common Ancestor of a BST` | <https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-search-tree/> | Game:
- [ ] `#102 Binary Tree Level Order Traversal` | <https://leetcode.com/problems/binary-tree-level-order-traversal/> | Game:
- [ ] `#98 Validate Binary Search Tree` | <https://leetcode.com/problems/validate-binary-search-tree/> | Game:
- [ ] `#230 Kth Smallest Element in a BST` | <https://leetcode.com/problems/kth-smallest-element-in-a-bst/> | Game:
- [ ] `#105 Construct Binary Tree from Preorder and Inorder` | <https://leetcode.com/problems/construct-binary-tree-from-preorder-and-inorder-traversal/> | Game:
- [ ] `#124 Binary Tree Maximum Path Sum` | <https://leetcode.com/problems/binary-tree-maximum-path-sum/> | Game:
- [ ] `#297 Serialize and Deserialize Binary Tree` | <https://leetcode.com/problems/serialize-and-deserialize-binary-tree/> | Game:

### Heap / Priority Queue

- [ ] `#295 Find Median from Data Stream` | <https://leetcode.com/problems/find-median-from-data-stream/> | Game:

### Backtracking

- [ ] `#39 Combination Sum` | <https://leetcode.com/problems/combination-sum/> | Game:
- [ ] `#79 Word Search` | <https://leetcode.com/problems/word-search/> | Game:

### Tries

- [ ] `#208 Implement Trie (Prefix Tree)` | <https://leetcode.com/problems/implement-trie-prefix-tree/> | Game:
- [ ] `#211 Design Add and Search Words Data Structure` | <https://leetcode.com/problems/design-add-and-search-words-data-structure/> | Game:
- [ ] `#212 Word Search II` | <https://leetcode.com/problems/word-search-ii/> | Game:

### Graphs

- [ ] `#200 Number of Islands` | <https://leetcode.com/problems/number-of-islands/> | Game:
- [ ] `#133 Clone Graph` | <https://leetcode.com/problems/clone-graph/> | Game:
- [ ] `#417 Pacific Atlantic Water Flow` | <https://leetcode.com/problems/pacific-atlantic-water-flow/> | Game:
- [ ] `#207 Course Schedule` | <https://leetcode.com/problems/course-schedule/> | Game:
- [ ] `#261 Graph Valid Tree` | <https://leetcode.com/problems/graph-valid-tree/> | Game:
- [ ] `#323 Number of Connected Components` | <https://leetcode.com/problems/number-of-connected-components-in-an-undirected-graph/> | Game:

### Advanced Graphs

- [ ] `#269 Alien Dictionary` | <https://leetcode.com/problems/alien-dictionary/> | Game:

### 1-D Dynamic Programming

- [ ] `#70 Climbing Stairs` | <https://leetcode.com/problems/climbing-stairs/> | Game:
- [ ] `#198 House Robber` | <https://leetcode.com/problems/house-robber/> | Game:
- [ ] `#213 House Robber II` | <https://leetcode.com/problems/house-robber-ii/> | Game:
- [ ] `#5 Longest Palindromic Substring` | <https://leetcode.com/problems/longest-palindromic-substring/> | Game:
- [ ] `#647 Palindromic Substrings` | <https://leetcode.com/problems/palindromic-substrings/> | Game:
- [ ] `#91 Decode Ways` | <https://leetcode.com/problems/decode-ways/> | Game:
- [ ] `#322 Coin Change` | <https://leetcode.com/problems/coin-change/> | Game:
- [ ] `#152 Maximum Product Subarray` | <https://leetcode.com/problems/maximum-product-subarray/> | Game:
- [ ] `#139 Word Break` | <https://leetcode.com/problems/word-break/> | Game:
- [ ] `#300 Longest Increasing Subsequence` | <https://leetcode.com/problems/longest-increasing-subsequence/> | Game:

### 2-D Dynamic Programming

- [ ] `#62 Unique Paths` | <https://leetcode.com/problems/unique-paths/> | Game:
- [ ] `#1143 Longest Common Subsequence` | <https://leetcode.com/problems/longest-common-subsequence/> | Game:

### Greedy

- [ ] `#53 Maximum Subarray` | <https://leetcode.com/problems/maximum-subarray/> | Game:
- [ ] `#55 Jump Game` | <https://leetcode.com/problems/jump-game/> | Game:

### Intervals

- [ ] `#57 Insert Interval` | <https://leetcode.com/problems/insert-interval/> | Game:
- [ ] `#56 Merge Intervals` | <https://leetcode.com/problems/merge-intervals/> | Game:
- [ ] `#435 Non-overlapping Intervals` | <https://leetcode.com/problems/non-overlapping-intervals/> | Game:
- [ ] `#252 Meeting Rooms` | <https://leetcode.com/problems/meeting-rooms/> | Game:
- [ ] `#253 Meeting Rooms II` | <https://leetcode.com/problems/meeting-rooms-ii/> | Game:

### Math & Geometry

- [ ] `#54 Spiral Matrix` | <https://leetcode.com/problems/spiral-matrix/> | Game:
- [ ] `#48 Rotate Image` | <https://leetcode.com/problems/rotate-image/> | Game:
- [ ] `#73 Set Matrix Zeroes` | <https://leetcode.com/problems/set-matrix-zeroes/> | Game:

### Bit Manipulation

- [ ] `#191 Number of 1 Bits` | <https://leetcode.com/problems/number-of-1-bits/> | Game:
- [ ] `#338 Counting Bits` | <https://leetcode.com/problems/counting-bits/> | Game:
- [ ] `#190 Reverse Bits` | <https://leetcode.com/problems/reverse-bits/> | Game:
- [ ] `#268 Missing Number` | <https://leetcode.com/problems/missing-number/> | Game:
- [ ] `#371 Sum of Two Integers` | <https://leetcode.com/problems/sum-of-two-integers/> | Game:
