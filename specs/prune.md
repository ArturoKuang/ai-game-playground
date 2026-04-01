# Prune

## Rules
Remove leaf nodes from a number tree one at a time. Each removed leaf subtracts its value from its parent. Get the root to exactly zero.

## Mechanic Type
Constraint Satisfaction

## Why It Works

### Stare Test
The tree has 10-15 nodes with values 1-9. At each step, only leaf nodes (1-connection nodes) are removable. Removing a leaf subtracts its value from its parent, which CHANGES the parent's value for all future operations. The cascading arithmetic is the key: removing leaf A (value 3) from parent P (value 7) makes P become 4. Now removing leaf B (value 4) from P makes P become 0 -- perfect. But if you'd removed B first, P would become 3, then removing A makes P become 0 too. HOWEVER, the order matters when P has 3+ children and P itself needs to become a specific value so that when P eventually becomes a leaf and gets subtracted from P's parent, the cascade reaches the root correctly. Tracking 4-5 cascading subtractions across a tree with 3 levels of depth requires holding 8-10 intermediate values in working memory simultaneously while simulating different orderings. This exceeds human working memory capacity for all but the simplest trees.

The tree structure adds a dimension that flat sequences lack: pruning the LEFT subtree first vs the RIGHT subtree first produces different intermediate values at every internal node, and those differences cascade upward to the root. The player must reason about SUBTREE ORDER, not just individual leaf order.

### Dominant Strategy Test
"Remove the largest leaf first" fails completely. A large leaf (value 8) might be the ONLY value that can bring its parent to exactly the number needed for a later cascade. Removing it early might overshoot the parent, making the root-zeroing impossible. "Remove leaves whose parent is closest to zero" also fails: a parent near zero might need to INCREASE before decreasing (by removing a negative-cascade child from another branch first). The cost of removing any leaf is INCOMMENSURABLE: whether removing leaf A now is good depends on what value A's parent needs to be when it eventually becomes a leaf, which depends on what the grandparent needs, which depends on the entire remaining tree. This is genuinely recursive cost dependency.

### Family Test
Tree elimination / cascading arithmetic. This is NOT:
- DropPop (chain collapse on a grid -- Prune is tree-structured, not grid-based)
- Any toggle game (no state cycling -- values change monotonically via subtraction)
- Any spatial puzzle (tree topology, not grid geometry)
- Any routing puzzle (no paths to find -- elimination order is the puzzle)
- Any deduction puzzle (all values visible -- the challenge is SEQUENCING, not DISCOVERING)
- Bloom/Fuse (cascade = automatic chain reaction; Prune's cascade is player-controlled, one removal at a time)

The defining novelty: the puzzle operates on a TREE, not a grid. Trees are rare in casual puzzle games (most use grids or linear sequences). The tree structure creates natural hierarchical planning -- the player must think in SUBTREES, planning bottom-up but reasoning top-down. The closest analog is "countdown" arithmetic games, but those operate on flat sequences. Prune's tree adds the subtree-ordering dimension that creates exponential branching in the decision space.

## Predicted Failure Mode
**Most likely death: A10 (solvable by staring) on small trees.** A tree with 6 nodes and 3 leaves might be mentally tractable. If Monday's puzzle can be solved by trying 3! = 6 orderings mentally, the game is A10. Mitigation: even Monday must have 5+ leaves and at least one "the obvious order overshoots the root" trap. The generator must verify that greedy removal (biggest leaf first) does NOT solve the puzzle.

**Second risk: unsolvability.** Not all number assignments have a valid pruning order that zeros the root. The generator MUST work backward from a solved state (start with root=0, add children whose values sum correctly, recurse). P7 is critical.

**Third risk: arithmetic aversion.** Some players hate mental math. If the game feels like a worksheet, d2 collapses. Mitigation: show live subtraction previews when hovering over a leaf ("removing this 3 changes parent from 7 to 4"), and use small numbers (1-6 on Monday, 1-9 on Friday). The SPATIAL tree layout should make this feel like gardening/pruning, not calculation.

**Anti-pattern proximity: A10 (fully visible).** The defense is cascading arithmetic across tree depth. A tree with 3 levels and 10 nodes has ~3000+ distinct pruning orderings -- well beyond mental enumeration. The cascade means each removal changes 2-3 future values, making lookahead expensive. But if the tree is too shallow (2 levels), the cascade disappears and it becomes a simple partition problem.

## Expected Metrics
| Metric | Prediction | Reasoning |
|---|---|---|
| Puzzle Entropy | 12-20 | 5-8 leaves initially, reducing by 1 per step. ~8-12 removals total. Tree structure creates branching: at each step, 3-6 removable leaves. Effective search tree is deep enough for genuine exploration. |
| Skill-Depth | 40-65% | Strategic players plan subtree-by-subtree, ensuring each internal node reaches the right value before becoming a leaf. Random removal almost never zeros the root. The gap between "I understand subtraction" and "I plan 3 levels deep" is where skill lives. |
| Counterintuitive Moves | 2-4 | "Remove the small leaf (value 1) first, even though the big leaf (value 7) looks more urgent." Removing the small leaf adjusts the parent to a value that makes the next subtraction cascade correctly. Also: "Remove from the RIGHT subtree first even though the LEFT subtree looks more broken" -- subtree ordering is the deep CI. |
| Drama | 0.5-0.7 | Root value changes with every removal at the top level. Player watches root approach zero, then a bad removal pushes it away. "I'm at root=2, one removal from victory, but if I remove this 5 the root goes to -3." The root is a live progress indicator that creates tension. |
| Decision Entropy | 1.8-2.8 | 3-6 removable leaves at each step. Some are clearly wrong (would make parent negative when it needs to stay positive), pruning to 2-4 genuine choices. Slightly lower than Fold due to tree structure naturally constraining options. |
| Info Gain Ratio | 1.8-2.5 | Strategic players who plan subtree cascades will solve consistently. Random players will accidentally overshoot parents and fail. The arithmetic is fully visible but the SEQUENCING skill is real. |

## Player Experience
**Opening (5s):** A tree with a root node (value 12) branches into three children (5, 4, 3). Each child has 2-3 leaves with small numbers. The leaves glow softly -- "these are my options." You tap leaf "2" hanging off the child "5." It detaches with a satisfying snip animation. The parent "5" smoothly animates to "3" (5-2=3). The root doesn't change yet -- it only changes when its DIRECT children change. Clear and immediate.

**Middle (2min):** You've pruned the left subtree down to a single child with value 3. The root needs that 3 to eventually subtract down, but first you need the middle subtree to become a 5 (so 12 - 3 - 5 - 4 = 0, using the right subtree's 4). The middle child is currently 7 with two leaves: 3 and 1. Removing the 3 gives 4, removing the 1 gives 6. Neither is 5. But wait -- if you remove the 1 first (7-1=6), then the 3 (6-3=3), the middle child becomes 3, not 5. Bad. If you remove the 3 first (7-3=4), then the 1 (4-1=3). Also 3. Hmm. You look at the right subtree -- maybe IT needs to become 5, not the middle. Rethinking the entire plan.

**Ending (20s):** The tree is down to 3 leaves and the root shows "4." Two of the leaves are children of the root (values 1 and 3). Removing the 3 first makes root 1, then removing the 1 makes root 0. Done! But if you'd removed the 1 first, root becomes 3, and the remaining 3 makes root 0 too. Wait -- either works. The REAL decision was 5 moves ago, when you chose which subtree to prune first. That's the aha: the late game is easy, the decisions that matter happened in the middle.

**The aha moment:** "I need to prune the RIGHT subtree first, not the left, because the right subtree's children can ONLY sum to 4, and the root needs exactly 4 subtracted from the right side to leave 3 for the left subtree to handle."

**The near-miss:** "Root is at 1, one leaf left with value 2. Off by one. Three moves ago I removed a 2 instead of a 1 from the middle branch. That single decision cascaded through the whole tree."

**Screenshot:** The tree skeleton with pruned branches faded, remaining nodes showing their current values, root at 0 with a crown emoji. Each pruned leaf marked with the order it was removed: (1), (2), (3)...

## Difficulty Knobs
1. **Tree size and depth** (Monday: 8 nodes, depth 2, ~5 removals needed; Friday: 15 nodes, depth 3-4, ~12 removals with deeper cascading dependencies)
2. **Value range** (Monday: values 1-4, small arithmetic easy to verify; Friday: values 1-9, larger numbers make cascade computation harder and create more near-miss scenarios)
3. **Branching factor** (Monday: binary tree, max 2 children per node = limited choices; Friday: ternary tree, 3 children per node = more leaves to choose between at each step)

---
<!-- BELOW THIS LINE: filled by engineer and playtester, not designer -->

## Solver Metrics

Computed on 5 puzzles (Mon-Fri seeds), 5 skill levels each.

| Metric | Mon | Tue | Wed | Thu | Fri | Avg |
|---|---|---|---|---|---|---|
| Solvability | 100% | 100% | 100% | 0% | 0% | 60% |
| Puzzle Entropy | 6.2 | 6.2 | 14.3 | 0.0 | 0.0 | 5.3 |
| Skill-Depth | 0% | 0% | 0% | 0% | 0% | 0% |
| Decision Entropy | 1.54 | 1.54 | 2.04 | 0.00 | 0.00 | 1.0 |
| Counterintuitive | 0 | 0 | 0 | 0 | 0 | 0 |
| Drama | 0.30 | 0.30 | 0.30 | 0.30 | 0.30 | 0.3 |
| Duration (ms) | 0 | 0 | 0 | 0 | 0 | 0 |
| Info Gain Ratio | 1.00 | 1.00 | 1.00 | 0.00 | 0.00 | 0.6 |
| Solution Uniqueness | 10 | 10 | 0 | 0 | 0 | 4.0 |

**Auto-kill check**: FAILED (3 fatal thresholds)
- Solvability < 100%: DFS solver exhausts node budget on trees with 13+ nodes. The solvability failure on Thu/Fri is a solver budget issue, NOT unsolvable puzzles -- greedy and random solve them fine. However, the deeper problem below makes this moot.
- Skill-Depth < 10%: 0% across all puzzles. Random play solves exactly as efficiently as exhaustive search. Every valid bottom-up removal order produces the same result.
- Counterintuitive Moves = 0: No move ever increases the heuristic. Every move is equally good.

**Root cause**: Subtraction is commutative. Removing children A then B from parent P gives `P - A - B`, which equals `P - B - A`. This means removal ORDER among siblings never matters. Since the only constraint is "remove children before parent" (leaf-only removal rule), ANY valid topological ordering from leaves to root is a solution. The puzzle has zero strategic depth -- it's a click-through with no wrong answers.

**Weakest metric**: Skill-Depth -- 0% (the game cannot distinguish random from expert play because all orderings are equivalent)
**Strongest metric**: Decision Entropy -- 1.0 (there ARE multiple legal moves at each step, they just all lead to the same outcome)

## Play Report
<!-- Playtester fills this section with blind play observations -->

## Decision

**Status: KILL** (auto-kill, Skill-Depth = 0%, CI = 0, Info Gain Ratio = 1.0)

**Reason:** Subtraction is commutative. Removing children A then B gives P - A - B = P - B - A. ANY valid bottom-up traversal solves the puzzle. Random play is indistinguishable from expert play. The most complete auto-kill in the portfolio: zero strategic depth by mathematical necessity.

**Lesson learned:** Subtraction (and all commutative operations) makes removal ORDER among siblings irrelevant on trees. For tree elimination puzzles to have depth, the operation must be NON-COMMUTATIVE (division, modular arithmetic, or value-dependent operations). Always verify that the core operation creates ORDER-DEPENDENT outcomes before building.
