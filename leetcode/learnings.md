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

### Two Pointers
- **VALIDATED (Pinch, keep)**: Sorted tile array with two cursors. Algorithm alignment is perfect (100%) — every move follows sum-comparison logic. However, the algorithm is inherently binary (move left or right), capping Decision Entropy at ~1 bit. Games teaching binary-decision algorithms will always have low DE — compensate with multi-target sequencing or secondary objectives.

### Stack
- **KILLED (Crate)**: Conveyor belt stack-sorting. Fatal: DE=0.47 (most steps have only 1 valid move), Drama=0.02 (truck loading never regresses). The sequential conveyor creates FORCED paths — push is the only option until overflow. Stack games need SELECTION (choose what to push from multiple options) not SEQUENCING (push the next item). The LIFO insight should create decisions every step, not just at overflow crises. Consider: a game where the player manages multiple stacks or where popping has strategic consequences beyond just matching the required order.

### Sliding Window
- **VALIDATED (Pane, keep)**: Color gem row with window edges. Highest skill-depth (66.9%) of all algorithm games. The sliding window's "never restart from scratch" insight creates massive efficiency gain (56.3% greedy-optimal gap). Like Two Pointers, the algorithm is binary (expand/shrink) so DE caps at ~1 bit. KEY: the teaching moment is when brute-force restarts exhaust the budget at medium difficulty.

### Hash Map
- **VALIDATED (Tag, keep)**: Registry stamping for duplicate detection. STRONGEST algorithm game: skill-depth 89.1%, greedy-gap 476%. The "stamp now for free lookups later" insight is viscerally demonstrated. Key success factors: (1) the action budget makes the O(n) vs O(n²) difference FELT, not abstract, (2) the registry visualization IS the hash set, (3) scan-only fails dramatically at medium+ difficulty. This game proves that the best algorithm games make the efficiency gap PAINFUL at medium and IMPOSSIBLE at hard.

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
