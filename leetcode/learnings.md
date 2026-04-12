# Algorithm Game Design Learnings

This file tracks what works and what fails when turning algorithm concepts into puzzle games. Read this before every design cycle. Update after every kill or keep.

> **Rule: Never add a learning without evidence. Never keep a learning that contradicts newer evidence.**

---

## How to Use This File

1. **Before designing**: Read the relevant section for the algorithm family you're targeting.
2. **After each cycle**: Update with new insights. Be specific — cite the game name and what happened.

---

## Seed Knowledge (Pre-Experiment Hypotheses)

These are informed hypotheses based on the puzzle lab's 40+ experiments and general game design principles. They have NOT been validated for algorithm games specifically. Update with evidence as experiments run.

### H1: Algorithms That Involve Search Are Naturally Gamifiable

**Hypothesis**: Algorithms that search a space (Binary Search, BFS, DFS, Backtracking) map naturally to exploration mechanics. The player IS the search algorithm — their decisions about where to look next ARE the algorithm.

**Expected evidence**: Binary Search and BFS/DFS games should have high Algorithm Alignment scores because the game action literally IS the algorithm step.

**Risk**: Search games might be too transparent (A10) if the search space is fully visible.

### H2: DP Is the Hardest to Gamify But Highest Value

**Hypothesis**: Dynamic programming is hard to turn into a game because (a) the insight is about REUSE of computation, which is abstract, and (b) the "aha" is recognizing overlapping subproblems, which requires meta-cognition about your own problem-solving process.

**Expected approach**: Make subproblems VISIBLE as game objects. When the player solves subproblem A and later encounters the same subproblem, the game should make the connection tangible (glow, auto-fill, score bonus). The player should FEEL the efficiency of reuse.

**Risk**: If subproblems are auto-solved, the player loses agency (A7). The player must choose to RECOGNIZE and APPLY the reuse, not have it done for them.

### H3: Greedy Traps Are the Core Teaching Mechanism

**Hypothesis**: The most educational moment in an algorithm game is when the player's naive/greedy approach fails and they must find a better strategy. This maps directly to the puzzle lab's "counterintuitive moves" metric — the moment where the heuristic gets worse before getting better.

**For algorithm games**: A high Greedy-Optimal Gap IS the learning. If greedy works, there's nothing to learn. The gap should be highest at Medium difficulty (where the player transitions from "this is easy" to "wait, my approach doesn't work").

### H4: The Algorithm Must Be the ONLY Efficient Strategy

**Hypothesis**: If a player can succeed with a non-algorithmic approach (guess-and-check, exhaustive enumeration on small inputs), the algorithm insight won't emerge. The game must be designed so that at higher difficulties, only the algorithm works efficiently.

**Implementation**: Level 1-2 should be solvable by any approach (including brute force). Level 3-4 should make brute force tedious. Level 5 should make brute force practically impossible within the move/time limit.

### H5: Visual State Representation Is Critical

**Hypothesis**: The game's visual representation of state should map to the algorithm's data structure. A Binary Search game should show a sorted range. A Stack game should show a vertical LIFO structure. A BFS game should show expanding frontiers. When the player looks at the screen, they should be looking at the data structure.

**Risk**: Literal data structure visualization might feel too "educational" (violates the "Not a Quiz" test). The visual mapping should be metaphorical — a stack could be a tower of blocks, a heap could be a tournament bracket.

---

## Proven Patterns

### PP1: Hidden Information Defeats A10 for Search Algorithms

**What**: For algorithms that search a space (Binary Search, BFS, DFS), hide the target state. The player must ACT (probe, explore, traverse) to gain information. This naturally defeats the Stare Test (A10) because there's nothing to pre-compute.

**Evidence**: Rift (Binary Search) scored 78.1% algorithm alignment and 53.2% skill-depth with a completely hidden fault line. The player's probes reveal stability, making each action genuinely informative. If the fault line were visible, the game would be trivially solvable by inspection.

### PP2: Budget Constraints Create Algorithm Pressure

**What**: Give the player a limited action budget calibrated to the optimal algorithm's cost. Greedy/brute-force approaches should BARELY work at Easy and completely fail at Hard. The budget ratio (budget / optimal) should decrease from ~3× at Easy to ~1.1× at Hard.

**Evidence**: Rift's linear scan fails at Difficulty 2+ (40% failure rate) and 100% at Difficulty 5. With budget = 1.1× optimal, only binary search fits. The budget IS the teaching mechanism — it forces the player to discover efficiency.

### PP4: Binary Algorithms Cap Decision Entropy at ~1 Bit — This Is Expected

**What**: Algorithms with binary decisions (Two Pointers: move left/right; Sliding Window: expand/shrink; Binary Search: go left/right of midpoint) inherently produce Decision Entropy near 1.0 bit. This is NOT a design flaw — it's the algorithm's structure.

**Evidence**: Pinch (Two Pointers) DE=1.1, Pane (Sliding Window) DE=0.96. Both have excellent metrics otherwise (skill-depth 22-67%, alignment 100%, gap 34-56%).

**Implication**: The auto-kill threshold of DE < 1.0 should be relaxed to DE < 0.9 for binary-decision algorithm games. The low DE is compensated by high algorithm alignment and greedy-optimal gap.

### PP3: Cross-Element Inference Adds Depth Beyond the Base Algorithm

**What**: When the game has spatial or structural relationships between elements (adjacent rows, neighboring cells), allowing information from one element to constrain another adds strategic depth BEYOND the base algorithm. The player discovers that "I can use what I learned here to narrow my search there."

**Evidence**: Rift's Level 5 solver uses cross-row inference (adjacent rows' fault line can't shift more than maxShift columns). This reduces probes by ~15% beyond independent binary search per row, creating a mastery tier above the base algorithm.

---

## Anti-Patterns

### AA1: Literal Algorithm Simulation

**What it looks like**: The game IS the algorithm — the player steps through binary search, ticking boxes. "Click the middle element. Now click the middle of the remaining half."

**Why it fails**: This is a quiz, not a game. The player follows instructions rather than discovering the insight. Violates the "Not a Quiz" test.

**How it should work instead**: The player faces a PROBLEM that binary search solves. They discover bisection as a strategy, not as a mechanic. The game never says "divide in half" — the player realizes it's optimal.

### AA2: Algorithm Visible in UI Labels

**What it looks like**: Buttons labeled "Push to Stack" or difficulty levels named "O(n)" or "O(n log n)".

**Why it fails**: Breaks immersion. The game should feel like a puzzle, not a CS lecture. Algorithm jargon makes non-programmers bounce and makes programmers feel quizzed.

### AA3: Single-Difficulty Games

**What it looks like**: One difficulty level where the algorithm is either obvious or required from the start.

**Why it fails**: No learning curve. The power of algorithm games is the TRANSITION from "my simple approach works" (Easy) to "I need a better approach" (Medium) to "only this specific approach works" (Hard). Without that progression, there's no aha moment.

---

## Algorithm-Specific Notes

*(Will be populated per-algorithm as experiments run)*

### Binary Search
- **VALIDATED (Rift, keep)**: Hidden fault line on 2D grid with probe budget. Binary search per row + cross-row inference. The 2D spatial structure adds richness beyond 1D binary search. Key: the probe budget must scale with difficulty to create the inflection point where linear scan fails.
- **VALIDATED (Breakline, keep)**: Rotated-array minimum becomes teachable when the player reads the middle value against a trustworthy tail sentinel instead of chasing the lowest visible endpoint. Breakline showed that a "false tail" is the right trap: medium-plus ridges can end on a low-looking tail even while the true minimum already sits at or left of mid, so endpoint-chasing dies and the `mid` versus `right` invariant becomes necessary.
- **VALIDATED (Bandshift, keep)**: Rotated-array target search needs magnitude lies across the pivot, not just a visible rotation. Bandshift worked once medium-plus bands forced the player to stop using plain target-vs-mid binary search and instead ask which half is still ordered, then whether the target can actually fit inside that half's bounds. Missing-target cases still teach the same invariant as long as the corridor can empty honestly.

### Two Pointers
- **VALIDATED (Pinch, keep)**: Sorted tile array with two cursors. Algorithm alignment is perfect (100%) — every move follows sum-comparison logic. However, the algorithm is inherently binary (move left or right), capping Decision Entropy at ~1 bit. Games teaching binary-decision algorithms will always have low DE — compensate with multi-target sequencing or secondary objectives.

### Stack
- **KILLED (Crate)**: Conveyor belt stack-sorting. Fatal: DE=0.47, Drama=0.02. Forced sequential input with no choice.
- **KILLED (Nest)**: Bracket matching with depth scoring. Fatal: Greedy-gap=4.6%. The matching ORDER barely affects score — depth scoring doesn't create enough differentiation. TWO Stack games killed now. Stack is HARD to gamify because: (1) sequential processing creates forced paths (Crate), (2) bracket matching is deterministic (Nest). The remaining hope: a game where LIFO creates STRATEGIC consequences (what's buried becomes inaccessible), not just ORDERING constraints.
- **VALIDATED (Claspline, keep)**: Valid Parentheses becomes teachable when the game turns the stack into a live certification surface instead of a passive scoring layer. The transferable lesson is not "matching families exist somewhere" but "only the live top is reachable"; crossed routes like `([)]` create the exact burial trap that count-matching misses, giving Stack a real D3 breakpoint with `24.0%` strongest-alternative gap and `76.0%` invariant pressure.

### Sliding Window
- **VALIDATED (Pane, keep)**: Color gem row with window edges. Highest skill-depth (66.9%) of all algorithm games. The sliding window's "never restart from scratch" insight creates massive efficiency gain (56.3% greedy-optimal gap). Like Two Pointers, the algorithm is binary (expand/shrink) so DE caps at ~1 bit. KEY: the teaching moment is when brute-force restarts exhaust the budget at medium difficulty.

### Hash Map
- **VALIDATED (Tag, keep)**: Registry stamping for duplicate detection. STRONGEST algorithm game: skill-depth 89.1%, greedy-gap 476%. The "stamp now for free lookups later" insight is viscerally demonstrated. Key success factors: (1) the action budget makes the O(n) vs O(n²) difference FELT, not abstract, (2) the registry visualization IS the hash set, (3) scan-only fails dramatically at medium+ difficulty. This game proves that the best algorithm games make the efficiency gap PAINFUL at medium and IMPOSSIBLE at hard.
- **VALIDATED (Trailhead, keep)**: Longest Consecutive becomes teachable when the set pass is only the setup, not the full lesson. Trailhead shows the missing second invariant: once the markers are registered, only values with no predecessor deserve a survey. The strongest wrong strategy is not "fail to store values" but "start from every value anyway," and that rescan strategy stays alive on Easy before collapsing at D3. For consecutive-run problems, the transferable insight is "heads only," not generic hash-set membership.

### Heap / Priority Queue
- **VALIDATED (Midmoor, keep)**: Find Median from Data Stream becomes teachable when the player maintains two visible priority docks around one live split instead of one generic balancing pool. Midmoor worked because D1-D2 still let balance-first mooring survive, then D3 exact budgets exposed the real invariant: the deep dock must keep the lower half under a max crown, the sky dock must keep the upper half under a min crown, and only the exposed crown may cross sides when rebalancing. The transferable lesson is not just "use two heaps"; it is "the median always sits on the roots if the two halves stay legal and within one item of each other."

### Scoped Hash Registries
- **VALIDATED (Ward, keep)**: Sudoku-style validation becomes teachable when one object visibly belongs to several overlapping registries at once. The transferable insight is not generic "use a hash map" but "file the same value into every scope that constrains it." Ward showed perfect LeetCode fit, a D3 breakpoint, and strong invariant pressure because a chamber-only breach defeats the row-and-column-only baseline.

### Linked List Pointer Rewiring
- **VALIDATED (Backhaul, keep)**: Reverse Linked List becomes teachable when the game makes the "save next before breaking current" dependency physical. Backhaul worked once the player had exactly one spare clip: panic flips sever the unreversed tail immediately, while cautious double-checks survive only on Easy before D3 budgets force the exact `next -> reverse -> advance` rhythm. The transferable lesson is not "flip links leftward" but "protect the unreversed remainder before you mutate the live edge."
- **VALIDATED (Lacehook, keep)**: Reorder List becomes teachable only when midpoint discovery, safe tail reversal, and the final alternating splice stay fused into one uninterrupted ritual. Lacehook worked because the guide/sprinter chase makes early cuts visibly wrong, the spare pin preserves the back strand during reversal, and the lace phase turns "take the far node next" into the concrete `first.next = second; second.next = temp1` splice. The transferable lesson is not generic end-picking; it is "cut only when fast runs out, reverse the tail safely, then feed one far node back after each front lead."

### Runner Pointers
- **VALIDATED (Wakeline, keep)**: Linked List Cycle becomes teachable when the board offers a visible breadcrumb option but medium-plus budgets prove that breadcrumbing is unnecessary overhead. Wakeline worked because the tail hook stayed hidden until reached, so the player could not solve by inspection; instead the drifter/cutter chase made the true invariant legible: fast escapes means no loop, fast catches slow means loop.

### Fixed-Gap Runner Pointers
- **VALIDATED (Towline, keep)**: Remove Nth Node From End of List becomes teachable when the dummy node is a physical dock and the lead/lag spacing stays visible as one locked towline gap. Towline worked because D1-D2 still allowed a full stern recount, so the faster one-pass route could feel cleaner before D3 made it mandatory. The transferable lesson is not "count from the tail somehow" but "the dock counts as the extra step; when the lead runner falls off, the trailer is already parked at the predecessor rope."

### Tree Recursion / Subtree Mirroring
- **VALIDATED (Boughturn, keep)**: Invert Binary Tree becomes teachable when the local swap visibly changes which child branch hangs on the left and right, but the real pressure comes from traversal order. Boughturn worked because every hub still needs the same local action, yet D3-D5 budgets punish frontier hopping and reward the recursive ritual: mirror the current hub, finish one child subtree, backtrack once, then finish the sibling subtree. The transferable lesson is not just "swap every branch somewhere"; it is "the same branch job repeats at every node, so stay inside one subtree until that repeated job is done."

### Tree Recursion / Bottom-Up Height
- **VALIDATED (Highbough, keep)**: Maximum Depth of Binary Tree becomes teachable when each branch may certify only after the child branches below it have already produced their readings. Highbough worked because leaves visibly anchor the base case at `1`, missing children quietly contribute `0`, and D3 exact budgets punish the tempting crown-reset recount that keeps re-measuring from the top. The transferable lesson is not "count how tall the whole tree looks"; it is "every subtree already returns one height answer, so keep the larger child answer and add one on the way back up."

### Tree Recursion / Paired Equality
- **VALIDATED (Twinbough, keep)**: Same Tree becomes teachable when the player compares two branch positions in lockstep and may certify the parent only after both child lanes are already proven safe. Twinbough worked because false boards make `node vs empty` and `crest vs different crest` breaks concrete, while deeper budgets punish the tempting crown-reset scan that keeps walking back out after every local proof. The transferable lesson is not "the two trees sort of look alike"; it is "the current pair is true only if the current values match and both child pairs already came back true."

### Tree Recursion / Subtree Search
- **VALIDATED (Graftguard, keep)**: Subtree of Another Tree becomes teachable only when the game separates "the pattern fails right here" from "this whole branch is clear." Graftguard worked because the player must first test whether the full pattern can start at the current host branch, then continue the same search into the left and right child branches before the current branch may clear. The transferable lesson is not generic tree scanning; it is "a failed local candidate does not end the recursion, it only hands the job to the child subtrees."

### BST Split Navigation
- **VALIDATED (Splitbough, keep)**: Lowest Common Ancestor of a Binary Search Tree becomes teachable when the player carries two target markers together and treats the current branch as a split test instead of tracing both full routes. Splitbough worked because D1-D2 still let a one-target overshoot survive, while D3 exact budgets finally punished the extra descent and made the early stop at the first shared fork feel necessary. The transferable lesson is not "find both paths and compare them"; it is "while both targets still fall on the same side, keep descending there, and the first branch where that stops being true is already the answer."

### BST Bounds Propagation
- **VALIDATED (Charterbough, keep)**: Validate Binary Search Tree becomes teachable when the player carries a live lower-and-upper charter through the grove and unrevealed branch values stop full-canopy stare solving. Charterbough worked because D1-D2 still let a parent-only audit survive, then D3 introduced hidden ancestor-bound breaches where a branch sat on the correct side of its parent but still violated an older floor or ceiling. The transferable lesson is not "every child sits on the correct side of its parent"; it is "every branch must still fit every ancestor gate you inherited on the path down."

### BST Inorder Rank Traversal
- **VALIDATED (Rankbough, keep)**: Kth Smallest Element in a BST becomes teachable when the player keeps a live return lane instead of restarting from the crown after every confirmed bloom. Rankbough worked because the grove hides unrevealed values, harvests fail immediately if a smaller unpaid branch still exists, and medium-plus budgets punish the crown-reset recount even though that near miss still feels logically safe on early boards. The transferable lesson is not "search the tree again for each rank"; it is "the next smallest branch is the leftmost unpaid branch on the current unwind, so count visits in inorder order and stop as soon as the kth visit lands."

### Tree Reconstruction / Traversal Split Stack
- **VALIDATED (Tracebough, keep)**: Construct Binary Tree from Preorder and Inorder Traversal becomes teachable when the game turns recursion order into a visible work-stack discipline. Tracebough worked because the player first feels the obvious but wrong instinct to bank the left child card first, then D3 exact-stack boards prove that the right child card has to be stashed underneath so the left child plot stays live for the next preorder crest. The transferable lesson is not just "find the root in inorder"; it is "the next preorder value roots the current plot, and the stack must preserve left-before-right after every split."

### Tree Recursion / Split Path Gain
- **VALIDATED (Spanbough, keep)**: Binary Tree Maximum Path Sum becomes teachable when the game keeps two different subtree answers visible at once: the one-sided gain a branch may return upward, and the best complete span that may bend locally and never reach the crown. Spanbough worked because negative child routes are visibly clipped to zero, medium-plus canopies hide the winning span inside a subtree, and D3 budgets still punish crown-reset traversal. The transferable lesson is not "the answer must pass through the root"; it is "return only one helpful child gain upward, but update a separate global best with both helpful sides at the current branch."

### Tree Codec / Null-Marker Preorder
- **VALIDATED (Hollowbough, keep)**: Serialize and Deserialize Binary Tree becomes teachable when the game treats every visited tree slot as one required ribbon mark, not just every real branch. Hollowbough worked because the rebuilt grove makes hollow hooks visibly structural, while D3 exact budgets punish rescue swaps and force the true preorder discipline: stamp the live slot now, bank the right child task first so the left stays live next, and never skip an empty hook. The transferable lesson is not "write down the branch values somehow"; it is "the codec describes slots, so real branches and null hooks both need tokens in the same preorder order."

### BFS
- **VALIDATED (Chorusbough, keep)**: Binary Tree Level Order Traversal becomes teachable when the player works with two visibly different frontiers: one rail for the current level and one rail for children that must wait. Chorusbough worked because fresh child nodes appear soon enough to tempt a premature dive, but D3 budgets punish that instinct and force the true invariant: finish the entire live frontier from the front, then swap in the next frontier as one new level. The transferable lesson is not generic tree visiting; it is "children revealed now still belong later, so queue them at the back and do not cross the level boundary early."

### Dynamic Programming
- *(pending first experiment)*

---

## Cross-References to Puzzle Lab Learnings

The following puzzle lab learnings (`../learnings.md`) are ESPECIALLY relevant to algorithm games:

| Pattern | Why It Matters for Algorithm Games |
|---|---|
| **P1 (Pre-Commitment Info)** | Show what each move does BEFORE committing — lets the player compare approaches (greedy vs. optimal) |
| **P2 (No Fail-Safes)** | If the player can undo freely, they'll brute-force instead of discovering the algorithm |
| **A10 (Fully-Visible Optimization)** | Many algorithms solve fully-visible problems — must add hidden info or exponential state space |
| **Incommensurable Cost** | Current move's value depends on future plan — this IS why DP/greedy-traps work |
| **P7 (Guaranteed Solvability)** | Every difficulty level must be solvable — broken puzzles destroy trust |

---

## Changelog

| Date | Entry | Evidence |
|------|-------|---------|
| 2026-04-01 | Initial creation — seed hypotheses from puzzle lab experience | No direct evidence yet |
