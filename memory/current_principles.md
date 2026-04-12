# Current Principles

_Generated from the SQLite memory store._

## LIS games need a visible endpoint badge ledger and false late-anchor traps
- Namespace: leetcode
- Type: principle
- Status: emerging
- Confidence: 0.53
- Scope tags: 1d-dp, blind-75, lis, subsequence
- Why it matters: Without endpoint badges and false late-anchor traps, play collapses into following one live chain or trusting the nearest lower value, missing the defining max-over-earlier-lower recurrence.
- Statement: A Longest Increasing Subsequence game teaches the real DP only when each position visibly keeps the best subsequence length ending there, players must compare every earlier lower badge instead of one global trail or the nearest lower anchor, and medium-plus boards punish weak late anchors that are close but not strong.

## Maximum Product Subarray games need a visible crown-and-shade ledger
- Namespace: leetcode
- Type: principle
- Status: emerging
- Confidence: 0.52
- Scope tags: 1d-dp, blind-75, max-product-subarray, sign-flips
- Why it matters: Without a live worst-product lane, play collapses into carrying one running best product and misses the defining sign-flip recurrence.
- Statement: A Maximum Product Subarray game teaches the real recurrence only when each position visibly preserves both the highest and lowest product ending there, because the next negative multiplier may flip the prior worst lane into the new best span.

## Unique Paths games need visible north-plus-west feeders and a budgeted anti-recount trap
- Namespace: leetcode
- Type: principle
- Status: emerging
- Confidence: 0.50
- Scope tags: 2d-dp, grid, route-counting, unique-paths
- Why it matters: Without visible north-plus-west feeders, the grid collapses into arbitrary arithmetic. Without a warm-board recount trap, the player never feels why a full 2D table is worth keeping.
- Statement: A Unique Paths game teaches the real 2D DP only when the player sees the north and west feeder counts explicitly, border cells read as base cases, and a limited direct-recount action survives easy boards before failing at the medium breakpoint.

## Word Break games need a visible live-cut ledger and explicit dead prefixes
- Namespace: leetcode
- Type: principle
- Status: emerging
- Confidence: 0.48
- Scope tags: 1d-dp, blind-75, prefix-reachability, string-dp, word-break
- Why it matters: Without live-cut state and explicit dead prefixes, play collapses into spotting words or trusting the nearest suffix seam instead of internalizing the actual prefix-reachability recurrence.
- Statement: A Word Break game teaches the real DP only when each endpoint visibly depends on an earlier live cut plus one exact listed span, and endpoints with no live launching cut can be sealed explicitly as dead.

## Longest-Palindrome Games Need Visible Odd And Even Hearts
- Namespace: leetcode
- Type: principle
- Status: candidate
- Confidence: 0.45
- Scope tags: blind-75, center-expansion, longest-palindromic-substring, palindrome
- Why it matters: If seam hearts feel secondary, players overfit to odd palindromes and miss the real center-expansion transfer.
- Statement: To teach Longest Palindromic Substring directly, the board must expose both rune-centered and seam-centered hearts, grow one heart outward pair by pair, and include medium-plus ribbons where the winning span is even-length so odd-only scanning fails.

## Coin Change games need a visible amount ledger with blocked totals and largest-coin traps
- Namespace: leetcode
- Type: principle
- Status: candidate
- Confidence: 0.43
- Scope tags: 1d-dp, blind-75, coin-change, dynamic-programming
- Why it matters: Without a live amount ledger, explicit blocked states, and concrete largest-coin traps, play collapses into greedy denomination picking or brute-force scouting instead of the true min-over-coins recurrence.
- Statement: A Coin Change game teaches the real minimum-coin DP only when each amount visibly tests every denomination against already sealed smaller amounts, blocked totals can be certified explicitly, and medium-plus racks punish the instinct to take the largest coin that fits.

## Decode Ways games need additive prefix lanes and explicit dead prefixes
- Namespace: leetcode
- Type: principle
- Status: candidate
- Confidence: 0.43
- Scope tags: 1d-dp, blind-75, decode-ways, string-dp
- Why it matters: Without additive prefix lanes and explicit dead prefixes, play collapses into picking one lane or memorizing special zero cases instead of internalizing the actual recurrence.
- Statement: A Decode Ways game teaches the real 1D DP transfer only when each digit prefix visibly collects every legal incoming lane from one back and two back, and prefixes with no legal lane can be sealed explicitly at 0 instead of being hidden as generic failure.

## Palindrome-counting games need a visible per-heart ledger, not just a best-span crown
- Namespace: leetcode
- Type: principle
- Status: candidate
- Confidence: 0.40
- Scope tags: blind-75, center-expansion, counting, palindrome, substring
- Why it matters: Without an explicit per-heart ledger, players overfit the longest-palindrome objective and miss that every successful layer is its own counted substring.
- Statement: To teach Palindromic Substrings directly, the game should pre-bank single runes, expose both rune and seam hearts, and increment one shared ledger once per successful outward layer so larger mirrors do not replace smaller ones at the same center.

## House Robber II games need twin legal-cut ledgers before the carry-versus-raid recurrence can transfer
- Namespace: leetcode
- Type: principle
- Status: candidate
- Confidence: 0.39
- Scope tags: 1d-dp, blind-75, circular-street, dynamic-programming, house-robber-ii
- Why it matters: If the ring split is hidden or optional, players overfit to picking one endpoint exclusion by gut feel and never internalize why the circular case reduces to two straight-street DP passes.
- Statement: A House Robber II game teaches the real solution only when the first-last conflict is made concrete enough that players must solve both legal linear cuts, and each cut still exposes the carry-versus-raid recurrence before the final max decision.

## Climbing Stairs games need a visible reusable stair ribbon that breaks direct recounting at medium length
- Namespace: leetcode
- Type: principle
- Status: candidate
- Confidence: 0.39
- Scope tags: 1d-dp, blind-75, climbing-stairs, dynamic-programming
- Why it matters: Without a reusable stair ribbon and a concrete medium-length breakpoint, play collapses into brute-force recounting and never forces the player to internalize overlapping subproblems.
- Statement: A Climbing Stairs game teaches the real 1D DP loop only when lower stair counts remain visibly reusable, each new stair can be certified from the two sealed stairs beneath it, and direct route recounting stays viable on short rises before breaking at medium length.

## Topological sort games need a full ready rail and an explicit empty-queue deadlock proof
- Namespace: leetcode
- Type: principle
- Status: candidate
- Confidence: 0.38
- Scope tags: blind-75, course-schedule, graphs, topological-sort
- Why it matters: Without a complete ready rail, play collapses into local chain following and premature deadlock guesses instead of Kahn-style indegree peeling.
- Statement: A Course Schedule game teaches the real topological-sort invariant only when every zero-indegree course stays visible in one ready rail, each cleared course visibly peels prerequisite seals from its dependents, and the player must call deadlock only after that rail empties while courses still remain.

## House Robber games need a visible prefix ledger where smaller current stashes can still win through the two-back total
- Namespace: leetcode
- Type: principle
- Status: candidate
- Confidence: 0.38
- Scope tags: 1d-dp, blind-75, dynamic-programming, house-robber
- Why it matters: Without visible prefix totals and smaller-current-house traps, players overfit to choosing the richer adjacent door and never internalize the take-or-skip dynamic-programming recurrence.
- Statement: A House Robber game teaches the real recurrence only when each house prefix visibly compares a carry-forward total against the current stash plus a sealed two-back total, and medium-plus blocks include smaller-current-house traps that punish local stash comparison.

## Clone Graph games need a visible old-to-new registry for non-parent revisits
- Namespace: leetcode
- Type: principle
- Status: candidate
- Confidence: 0.36
- Scope tags: blind-75, clone-graph, dfs, graph, hash-map
- Why it matters: Without a visible registry, play overfits to local parent memory and misses the memoization step that prevents duplicate graph nodes on cycles and shared junctions.
- Statement: A Clone Graph game teaches the real solution only when the player visibly forges and files one clone on first arrival, then reuses that stored clone whenever a later route reaches the same original node from any side.

## Alien Dictionary games need adjacent shelf clues that stop at the first split and flag prefix breaches before rune peeling
- Namespace: leetcode
- Type: principle
- Status: candidate
- Confidence: 0.36
- Scope tags: alien-dictionary, blind-75, graphs, lexicographic-order, prefix-invalidity, topological-sort
- Why it matters: Without the first-split stop and the explicit prefix-breach guard, play collapses into over-harvesting later mismatches or treating invalid shelves as harmless, which misses the core graph-construction step before topological sorting.
- Statement: An Alien Dictionary game teaches the real solution only when the player reads adjacent words only, each pair yields at most one rule from the first differing letter, any longer word before its own prefix is explicitly rejected, and only then does zero-indegree peeling decide the alphabet.

## Word Search games need visible local backtracking and one-use trail locks
- Namespace: leetcode
- Type: principle
- Status: candidate
- Confidence: 0.34
- Scope tags: backtracking, blind-75, dfs, grid, word-search
- Why it matters: Without a visible live trail plus local unwinding, play collapses into blind restart hunting and misses the visited-state discipline that makes Word Search work.
- Statement: A Word Search game teaches the real DFS only when the current letter trail stays visible, tiles lock only the active trail, and dead branches are recovered by peeling back one letter instead of restarting from the board root.

## Pacific Atlantic games need full border-seeded reverse floods
- Namespace: leetcode
- Type: principle
- Status: candidate
- Confidence: 0.34
- Scope tags: bfs, blind-75, dfs, grid, multi-source, pacific-atlantic-water-flow, reverse-reachability
- Why it matters: Without full border seeding plus reverse uphill expansion, play collapses into per-cell drainage guessing or single-edge shortcuts and misses the real dual-reachability pattern.
- Statement: A Pacific Atlantic Water Flow game teaches the real solution only when both oceans start from their full borders, each tide expands only into equal-or-higher neighbors, and the answer emerges as the overlap of the two completed reverse maps.

## Word Search II games need visible shared stems and bank-without-reset pressure
- Namespace: leetcode
- Type: principle
- Status: candidate
- Confidence: 0.33
- Scope tags: blind-75, dfs, prefix-pruning, trie, word-search-ii
- Why it matters: Without visible shared stems plus bank-without-reset pressure, play collapses into generic single-word tracing or root restarts and misses the extra idea that differentiates Word Search II from plain Word Search.
- Statement: A Word Search II game teaches the real trie-pruned board DFS only when the player sees the shared prefix structure, banks shorter words without collapsing the live board trail, and prunes the branch immediately once no listed continuation survives.

## Combination Sum games need a visible forward-only shelf and one-layer retreat
- Namespace: leetcode
- Type: principle
- Status: candidate
- Confidence: 0.32
- Scope tags: backtracking, blind-75, combination-sum, dfs, pruning
- Why it matters: Without a visible same-index reuse plus forward-only continuation rule, play collapses into generic arithmetic or brute-force restarting and misses the path-push/path-pop structure of the real solver.
- Statement: A Combination Sum game teaches the real backtracking only when reusable candidates stay on a sorted forward-only shelf, the active recipe path remains visible, and retreating one layer reopens only the next heavier candidate instead of resetting the whole search.

## Wildcard trie games need visible branch checkpoints and local rewind
- Namespace: leetcode
- Type: principle
- Status: candidate
- Confidence: 0.32
- Scope tags: blind-75, design-add-and-search-words-data-structure, dfs, trie, wildcard
- Why it matters: Without explicit local rewind, wildcard search feels like random guessing or generic undo rather than the DFS over trie children used in WordDictionary search.
- Statement: A wildcard trie game teaches the real search only when each wildcard is a visible branch checkpoint, the player explores one child at a time, and failure rewinds only to the latest still-live wildcard instead of restarting from the root.

## Graph Valid Tree games need live clan crests that merge whole realms and expose same-crest ropes as loops
- Namespace: leetcode
- Type: principle
- Status: candidate
- Confidence: 0.31
- Scope tags: blind-75, graph-valid-tree, graphs, union-find
- Why it matters: Without visible realm identity, play collapses into endpoint-degree guesswork or edge-count shortcuts and misses the connected-component invariant that makes union-find useful here.
- Statement: A Graph Valid Tree game teaches the real solution only when every camp carries a live clan crest, binding a legal rope visibly merges whole realms under one crest, and a same-crest rope is explicitly flagged as a loop instead of treated as a harmless extra edge.

## Number of Islands games need one visible full-component kill per fresh root
- Namespace: leetcode
- Type: principle
- Status: candidate
- Confidence: 0.30
- Scope tags: bfs, blind-75, connected-components, dfs, flood-fill, grid, number-of-islands
- Why it matters: Without a visible full-component kill, play collapses into surface blob counting and misses the visited-set role of BFS or DFS.
- Statement: A Number of Islands game teaches the real solution only when one action on fresh land visibly kills the whole orthogonally connected component, so later land from that coast must be passed rather than counted again.

## Preorder-plus-inorder reconstruction games need visible stack-order pressure
- Namespace: leetcode
- Type: principle
- Status: candidate
- Confidence: 0.30
- Scope tags: blind-75, construct-binary-tree-from-preorder-and-inorder-traversal, inorder, preorder, tree
- Why it matters: Without explicit pressure on the stack order, the play teaches value lookup and splitting but not the left-before-right recursive structure that actually builds the tree.
- Statement: A Construct Binary Tree from Preorder and Inorder Traversal game teaches the real reconstruction only when the next preorder item visibly roots the live inorder span and medium-plus boards punish banking child work in the wrong stack order.

## Trie games need explicit terminal-word seals on shared stems
- Namespace: leetcode
- Type: principle
- Status: candidate
- Confidence: 0.28
- Scope tags: blind-75, implement-trie, prefix-tree, trie
- Why it matters: Without explicit terminal-word pressure, players overlearn path existence and miss the exact distinction between search and startsWith.
- Statement: A trie game only teaches the real structure when shared openings are visibly reused and the player must separately certify whether the final node is a finished word or only a live prefix.

## Tree codec games must make null hooks first-class tokens
- Namespace: leetcode
- Type: principle
- Status: candidate
- Confidence: 0.28
- Scope tags: blind-75, codec, null-marker, preorder, serialize-and-deserialize-binary-tree, tree
- Why it matters: If the game hides or defers null markers, play collapses into branch-only preorder copying instead of a self-delimiting round trip.
- Statement: A Serialize and Deserialize Binary Tree game only teaches the true codec when empty child hooks consume the same token budget as real branches, so the player feels that null markers are structural rather than optional cleanup.

## Median-stream games need two visible priority fronts around one live split
- Namespace: leetcode
- Type: principle
- Status: candidate
- Confidence: 0.26
- Scope tags: blind-75, data-stream, heap, median, priority-queue
- Why it matters: If the game only rewards equal bucket sizes, play collapses into generic balancing and misses the root-based invariant that makes the median available in O(1).
- Statement: A Find Median from Data Stream game teaches the true dual-heap routine only when the lower half and upper half stay visible as separate priority fronts, so players read the median from the exposed roots and use rebalance moves only to restore the split after each insertion.

## Maximum-path-sum games need split upward-vs-local accounting
- Namespace: leetcode
- Type: principle
- Status: candidate
- Confidence: 0.26
- Scope tags: binary-tree-maximum-path-sum, blind-75, recursion, tree
- Why it matters: Without a visible split between returned gain and local best path, play collapses into maximum-depth or root-to-leaf thinking instead of the real two-answer recurrence.
- Statement: A Binary Tree Maximum Path Sum game teaches the true recursion only when each branch exposes both answers at once: the one-sided gain it may return upward and the separate best complete path that may bend locally and never reach the root.

## BST LCA games need early-stop split pressure
- Namespace: leetcode
- Type: principle
- Status: candidate
- Confidence: 0.24
- Scope tags: blind-75, bst, lowest-common-ancestor, tree
- Why it matters: Without early-stop pressure, the play collapses into generic path overlap or full-route tracing instead of the BST split invariant.
- Statement: A BST lowest-common-ancestor game teaches the real shortcut only when players can feel that tracing a full route to either target is unnecessary. The mechanic must reward stopping at the first branch where the two targets stop sharing one side.

## BST validation games need hidden ancestor-bound breaches
- Namespace: leetcode
- Type: principle
- Status: candidate
- Confidence: 0.23
- Scope tags: blind-75, bst, tree, validation
- Why it matters: Without hidden ancestor-bound breaches, play collapses into parent-child checks instead of full bounds propagation.
- Statement: A BST validation game only teaches carried lower and upper bounds when medium-plus boards include branches that are locally valid beside their parent but violate an older ancestor gate.

## Maximum-depth games need child readings that lock in as subtree answers
- Namespace: leetcode
- Type: principle
- Status: candidate
- Confidence: 0.23
- Scope tags: blind-75, bottom-up-height, maximum-depth, tree
- Why it matters: If the optimal play keeps re-measuring from the crown, the experience teaches generic traversal instead of bottom-up subtree returns.
- Statement: A Maximum Depth of Binary Tree game teaches the real recurrence only when each branch may certify after its child readings exist, and those child readings persist as the subtree answers instead of being re-counted from the root.

## Heap-merge games need one live head per lane and a visible repair slot
- Namespace: leetcode
- Type: principle
- Status: candidate
- Confidence: 0.23
- Scope tags: blind-75, heap, linked-list, merge-k-sorted-lists, priority-queue
- Why it matters: Without the one-head-per-lane invariant, the puzzle turns into generic rescanning or repeated pairwise merges and stops teaching why the heap loop is cheaper.
- Statement: A Merge k Sorted Lists game teaches the heap-backed loop when players maintain exactly one live head from each non-empty lane on a visible min-ordered structure and repair only the disturbed slot after each dispatch.

## BST inorder-rank games need live return-lane pressure
- Namespace: leetcode
- Type: principle
- Status: candidate
- Confidence: 0.23
- Scope tags: blind-75, bst, inorder, kth-smallest, tree
- Why it matters: Without pressure against crown resets, the play teaches generic repeated searching rather than inorder counting with an early stop.
- Statement: A Kth Smallest in BST game teaches inorder rank traversal only when the next-smallest branch is recovered from the current unwind and medium-plus boards punish restarting from the root after each confirmed visit.

## BFS games need a visible now-vs-later frontier split
- Namespace: leetcode
- Type: principle
- Status: candidate
- Confidence: 0.22
- Scope tags: bfs, blind-75, level-order, queue
- Why it matters: Level-order traversal only becomes transferable when the player sees that fresh children can be visible now while still being queued for a later wave.
- Statement: When a BFS game makes the current frontier and the next frontier visibly distinct, the player can feel why newly revealed nodes belong later instead of diving immediately.

## Same-tree games need persistent child proofs and explicit node-vs-empty breaks
- Namespace: leetcode
- Type: principle
- Status: candidate
- Confidence: 0.22
- Scope tags: blind-75, pairwise-equality, recursion, same-tree, tree
- Why it matters: Without persistent child proofs the play collapses into repeated crown resets or loose visual similarity checks instead of the real recursive invariant.
- Statement: A Same Tree game teaches recursive pairwise equality when players compare one paired lane at a time, see node-vs-empty breaks directly, and may certify a parent only after both child lanes are already proven safe.

## Remove-nth games need a real dummy dock plus an early recount baseline
- Namespace: leetcode
- Type: principle
- Status: candidate
- Confidence: 0.21
- Scope tags: blind-75, fixed-gap-runner-pointers, linked-list, remove-nth-node-from-end
- Why it matters: Without a real dock, players miss the extra step that parks the trailer at the predecessor. Without an initially viable recount baseline, the one-pass lead/lag gap feels ceremonial instead of necessary.
- Statement: A Remove Nth Node From End of List game teaches the one-pass solution only when the dummy node is a physical starting dock and Easy budgets still allow a slower full recount before medium budgets force the fixed-gap tow.

## Subtree-search games must separate local candidate failure from branch clearance
- Namespace: leetcode
- Type: principle
- Status: candidate
- Confidence: 0.19
- Scope tags: blind-75, recursion, subtree-of-another-tree, subtree-search, tree
- Why it matters: Otherwise the player learns generic candidate spotting or paired equality, not subtree search with recursive continuation.
- Statement: A Subtree of Another Tree game only teaches the true recursion when a failed local candidate does not end the job; the player must still search the left and right child branches before the current branch can be ruled out.

## Cycle-detection games need a visible breadcrumb decoy plus a hidden tail hook
- Namespace: leetcode
- Type: principle
- Status: candidate
- Confidence: 0.19
- Scope tags: blind-75, linked-list, linked-list-cycle, runner-pointers
- Why it matters: Without the breadcrumb decoy there is no felt contrast against the visited-set instinct, and without the hidden tail hook the board collapses into a static inspection puzzle.
- Statement: A Linked List Cycle game teaches the fast/slow pointer invariant when players can spend actions on visible breadcrumbs, but the tail hook itself stays hidden until reached so the chase, not inspection, certifies the structure.

## Stack Games Need Burial Traps, Not Generic Matching
- Namespace: leetcode
- Type: principle
- Status: candidate
- Confidence: 0.18
- Scope tags: blind-75, lifo, nested-structure, stack, valid-parentheses
- Why it matters: Without a real burial trap, bracket themes collapse into generic matching or counting and the stack invariant never becomes necessary.
- Statement: A stack prototype teaches nested-structure validation only when crossed routes make a deeper matching opener irrelevant; the player must feel that burial, not family counts, determines whether the next closer can legally resolve.

## Minimum-Window Games Need Critical Left Edges After First Cover
- Namespace: leetcode
- Type: principle
- Status: candidate
- Confidence: 0.18
- Scope tags: blind-75, minimum-window, sliding-window, substring
- Why it matters: If every shrink is obviously spare, players only learn cleanup. The real transfer is feeling that a valid cover is permission to keep shrinking, even when the next trim will temporarily break coverage.
- Statement: To teach Minimum Window Substring directly, medium-plus routes must present a valid cover whose left edge is sometimes critical, so the player has to bank the current answer and still drop that edge to reopen the search.

## Reorder-list games need the midpoint chase, reverse token, and weave splice in one uninterrupted ritual
- Namespace: leetcode
- Type: principle
- Status: candidate
- Confidence: 0.18
- Scope tags: blind-75, linked-list, pointer-rewiring, reorder-list, runner-pointers
- Why it matters: If any one stage is abstracted away, the experience collapses into generic end-picking or generic reversal and under-teaches the full in-place routine.
- Statement: A Reorder List game teaches the real invariant only when the midpoint stop condition, safe second-half reversal, and final front/back splice are all playable in sequence inside the same run.

## Reverse-list games need a physical safe token for the unreversed tail
- Namespace: leetcode
- Type: principle
- Status: candidate
- Confidence: 0.16
- Scope tags: blind-75, linked-list, pointer-rewiring, reverse-linked-list
- Why it matters: Without a visible safe token for the future edge, players read the puzzle as simple left-facing rewiring instead of pointer preservation.
- Statement: A Reverse Linked List game teaches the real invariant only when the unreversed tail must be protected by an explicit saved-next token before the live edge can be reversed.

## Rotated-Target Search Games Need Ordered-Half Range Traps
- Namespace: leetcode
- Type: principle
- Status: candidate
- Confidence: 0.16
- Scope tags: binary-search, blind-75, rotated-array, target-search
- Why it matters: Without these magnitude-lie counterexamples, rotated search collapses into ordinary binary search or pivot-spotting and never teaches the actual branch logic.
- Statement: To teach Search in Rotated Sorted Array directly, medium-plus puzzles must create cases where target-versus-mid points the wrong way, forcing the player to identify the ordered half first and only then test whether the target fits inside that half's bounds.

## Merge-list games need one live output tail and a one-shot remainder splice
- Namespace: leetcode
- Type: principle
- Status: candidate
- Confidence: 0.14
- Scope tags: blind-75, linked-list, merge-two-sorted-lists, pointer-rewiring
- Why it matters: Without a live output tail and final splice, the experience reads like generic sorting instead of linked-list rewiring.
- Statement: A Merge Two Sorted Lists game teaches the real iterative invariant only when players extend one visible output tail from the smaller live head and later stitch the untouched remainder in one move.

## Benchmark merge-list games against a stepwise leftover policy
- Namespace: leetcode
- Type: procedure
- Status: candidate
- Confidence: 0.13
- Scope tags: blind-75, evaluation, linked-list, merge-two-sorted-lists
- Why it matters: That near miss isolates whether the game truly teaches the final linked-list splice rather than only the head comparison.
- Statement: When evaluating a merge-list game, compare the optimal policy against a near miss that merges correctly but keeps coupling the leftover chain one car at a time instead of stitching it wholesale.

## Rotated-Minimum Games Need False Tails
- Namespace: leetcode
- Type: principle
- Status: candidate
- Confidence: 0.13
- Scope tags: binary-search, blind-75, minimum, pivot, rotated-array
- Why it matters: Without false-tail counterexamples, rotated-minimum games collapse into generic endpoint chasing or brute-force scanning and the specific `nums[mid]` versus `nums[right]` invariant never becomes necessary.
- Statement: To teach Find Minimum in Rotated Sorted Array directly, medium-plus ridges should sometimes end on a lower-looking tail even while the true minimum already sits at or left of mid, so the player learns to compare the middle value to the tail sentinel rather than chase the smaller endpoint.

## Stock Games Need A Later Bargain After The First Green Day
- Namespace: leetcode
- Type: principle
- Status: candidate
- Confidence: 0.13
- Scope tags: blind-75, max-profit, rolling-minimum, sliding-window, stock
- Why it matters: If the true floor appears before the first profit on most tapes, stale-anchor strategies stay accidentally correct and skill depth collapses.
- Statement: To teach Best Time to Buy and Sell Stock rather than a first-rise heuristic, medium-plus tapes should offer an early profitable sale before the true minimum arrives later.

## Overlapping Constraint Problems Need Overlapping Registries
- Namespace: leetcode
- Type: principle
- Status: candidate
- Confidence: 0.11
- Scope tags: constraint-buckets, hash-map, scoped-registries, valid-sudoku
- Why it matters: This is the transferable insight behind Valid Sudoku and similar multi-scope validation problems.
- Statement: When each board element belongs to several overlapping constraint scopes, the teachable move is to file it into every scope once so duplicate evidence becomes reusable.

## 3Sum Games Need A Sticky Anchor
- Namespace: leetcode
- Type: principle
- Status: candidate
- Confidence: 0.11
- Scope tags: 3sum, two-pointers, ui-mechanics
- Why it matters: If a hit immediately ends the anchor, players only learn to find one pair around a number, not the full sorted 3Sum loop.
- Statement: To teach 3Sum rather than generic pair search, the game must keep one anchor fixed after a valid trio and force the player to continue the inner sweep until that anchor is exhausted.

## Head-Gated Set Scans Teach Longest Consecutive
- Namespace: leetcode
- Type: principle
- Status: candidate
- Confidence: 0.11
- Scope tags: hash-set, longest-consecutive, trailhead, ui-mechanics
- Why it matters: This is the decisive invariant behind Longest Consecutive Sequence and the reason a generic hash-set game is not enough.
- Statement: For consecutive-run problems, the teachable insight is not just storing values in a set. The real transfer appears when only values with no predecessor are allowed to start a run, so every chain is walked exactly once.

## Character Replacement Window Games Need A Visible Majority Ledger
- Namespace: leetcode
- Type: principle
- Status: candidate
- Confidence: 0.11
- Scope tags: blind-75, character-replacement, max-frequency, sliding-window
- Why it matters: If the majority count is invisible, players default to duplicate-avoidance or exact-run heuristics and miss the `window_size - max_frequency <= k` insight.
- Statement: To teach Longest Repeating Character Replacement directly, the player must see that the dominant symbol count, not local edge purity, determines whether the current window can survive.

## Substring Window Games Need Deep Echoes Inside The Live Band
- Namespace: leetcode
- Type: principle
- Status: candidate
- Confidence: 0.10
- Scope tags: blind-75, sliding-window, substring, unique-characters
- Why it matters: If repeats arrive too close to the front, the reset shortcut stays viable and the player never feels why the left pointer should move only enough to evict the old copy.
- Statement: To teach Longest Substring Without Repeating Characters rather than restart-on-repeat, medium-plus signals should repeat glyphs after a long clean band so sliding the left edge feels cheaper than clearing everything.

## Live Endpoints Beat Rebuilt Copies For Noisy Palindromes
- Namespace: leetcode
- Type: principle
- Status: candidate
- Confidence: 0.10
- Scope tags: palindrome, string-normalization, two-pointers, ui-mechanics
- Why it matters: This preserves the exact loop structure of Valid Palindrome instead of teaching a preprocessing-heavy workaround.
- Statement: For palindrome checks with punctuation and case noise, the teachable mechanic is to operate only on the two live endpoints and trim blockers in place; rebuilding the whole cleaned string hides the two-pointer insight.

## Reusable Seal Makes Grouping Teachable
- Namespace: leetcode
- Type: principle
- Status: candidate
- Confidence: 0.10
- Scope tags: anagram, grouping, hash-map, signature, ui-mechanics
- Why it matters: This maps directly to Group Anagrams, where each string is normalized once and pushed into the hash-map bucket for that key.
- Statement: For group-anagram tasks, a visible normalized seal per word makes the reusable-key insight concrete: one seal identifies the bucket, and later words reuse that same bucket instead of rechecking letters against every group.

## Shared Ledger Makes Frequency Equality Teachable
- Namespace: leetcode
- Type: principle
- Status: candidate
- Confidence: 0.09
- Scope tags: anagram, frequency-count, hash-map, ui-mechanics
- Why it matters: The player can transfer the balance-to-zero insight directly to per-character count maps used in Valid Anagram.
- Statement: For anagram-style problems, a visible shared ledger with +1 updates for the first string and -1 updates for the second string makes repeated-letter mismatches legible without exposing code jargon.

## Container Games Need A Visible Bottleneck
- Namespace: leetcode
- Type: principle
- Status: candidate
- Confidence: 0.07
- Scope tags: bottleneck, container-with-most-water, two-pointers, ui-mechanics
- Why it matters: This is the decisive invariant behind Blind 75 #11 and the difference between a dedicated transfer game and a vague two-pointer metaphor.
- Statement: For Container With Most Water style tasks, the teachable move is not generic two-pointer squeezing. The player must see that the shorter wall is the live bottleneck, so moving the taller wall only throws away width while preserving the same cap.

## Two Directional Carries Make All-Other Products Teachable
- Namespace: leetcode
- Type: principle
- Status: candidate
- Confidence: 0.06
- Scope tags: array, prefix-suffix, product-except-self, ui-mechanics
- Why it matters: The player can map the outward bank step to prefix storage and the return fuse step to suffix multiplication, which is the core transfer needed for LeetCode #238.
- Statement: For Product of Array Except Self style tasks, a visible outward carry plus a visible return carry makes the reusable left-product/right-product structure legible without exposing code jargon.

## Visible Towers Make Top-K Frequency Teachable
- Namespace: leetcode
- Type: principle
- Status: candidate
- Confidence: 0.05
- Scope tags: frequency-buckets, hash-map, ranking, top-k, ui-mechanics
- Why it matters: Top K Frequent Elements is not just duplicate detection; the player needs both one-pass counts and a highest-first readout.
- Statement: For top-K frequency tasks, a live tower per key plus an expensive loose-overflow cleanup makes the reusable counting pass feel necessary before ranking.

