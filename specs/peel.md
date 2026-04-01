# Peel

## Rules
Tap cells to peel away the top layer, revealing what's beneath. Stop when the visible surface satisfies the target: every row and column has exactly the required count of each color. Peeling is irreversible and costs a move.

## Mechanic Type
Constraint Satisfaction

## Why It Works

### Stare Test
The player sees only the top layer of a 5x5 grid with 3 stacked color layers per cell. The bottom two layers are completely hidden. The target constraints (e.g., "each row must have exactly 2 red and 3 blue cells visible") are known, but the player cannot compute the optimal peeling sequence because they don't know what's underneath. Each peel reveals one cell's next layer -- partial information that changes the plan. This is the Wordle structure: act (peel), get feedback (see what's beneath), revise strategy. But unlike Wordle (where feedback is formulaic green/yellow/gray), each peel reveals a SPECIFIC color at a SPECIFIC position, which interacts with row AND column constraints simultaneously. The player must CHOOSE which cells to investigate, creating a dual-layer puzzle: "which cells should I peel?" (exploration) and "does the revealed surface satisfy constraints?" (satisfaction).

### Dominant Strategy Test
"Peel cells where the top layer violates constraints" sounds good -- but the layer beneath might be WORSE. A red cell in a row that needs fewer reds seems like a peel target, but if layer 2 is also red (which the player can't see), peeling accomplishes nothing and wastes a move. Conversely, a cell that SATISFIES the current constraint might need peeling because the column constraint requires a different color there, and the player is hoping layer 2 provides it. The cost of each peel is INCOMMENSURABLE: whether peeling cell (2,3) is good depends on (a) what's underneath (unknown), (b) whether the player plans to peel adjacent cells later (which changes column constraints), and (c) whether the current surface can be "fixed" by peeling OTHER cells instead. The player weighs exploration value against commitment cost at every step.

### Family Test
Layer-reveal commitment puzzle. This is NOT:
- Dig (hidden random values for point optimization -- Peel targets constraint satisfaction, not score)
- Probe/Minesweeper (probing reveals CLUES about hidden state -- Peel reveals the actual CONTENT)
- BitMap (all clues visible from start -- Peel has genuinely hidden information)
- Seek (distance-based triangulation -- Peel has direct reveal of cell content)
- Fence (hidden boundary discovery -- different hidden structure entirely)

The defining novelty: the hidden information IS the game board itself. The player is literally constructing the puzzle surface through irreversible layer removal. Each peel simultaneously DESTROYS the current cell value and CREATES a new one. The closest commercial analog is scratch-card mechanics, but those are random reveal. Peel combines scratch-card reveal with Latin-square-style constraint satisfaction -- the player scratches strategically, not randomly.

## Predicted Failure Mode
**Most likely death: A11 (information asymmetry).** If par is computed with full layer knowledge, the player can never approach it through skill alone. CRITICAL MITIGATION: par MUST be computed by a solver that peels blind (same information as the player), using a strategy of peel-and-evaluate. The par represents "best expected play with player-available information," not omniscient play.

**Second risk: luck dominance.** If bottom layers are purely random, some puzzles will require many peels (bad luck on reveals) while others are trivially easy. Mitigation: generate puzzles backward from a SOLVABLE configuration. Ensure that a strategic peeling sequence (guided by constraint violations) reaches the goal in par moves for every seed. The layers are deterministic per seed, so skilled players who develop intuition about "which cells are likely to have useful colors beneath" will outperform random peelers.

**Third risk: decision fatigue.** 25 cells with peel/don't-peel creates 2^25 options. But the row/column constraints dramatically prune this: the player knows exactly how many of each color they need, so they can identify which cells are "wrong" on the visible surface and focus peeling there. Effective choices should be 5-10 per turn, not 25.

**Anti-pattern proximity: A10 on the visible layer.** If the top layer already satisfies constraints (no peeling needed), the puzzle is trivially solved. Mitigation: the generator must ensure the top layer has 6-10 constraint violations that REQUIRE peeling to fix. Also, some cells that look correct on top might need peeling for COLUMN constraints even though they satisfy ROW constraints, creating genuine tension.

## Expected Metrics
| Metric | Prediction | Reasoning |
|---|---|---|
| Puzzle Entropy | 15-25 | 25 cells x peel/no-peel x 3 layers = rich state space. But effective decisions per puzzle are ~8-12 peels. Each peel reveals info that constrains future peels. |
| Skill-Depth | 40-65% | Strategic players peel cells with the MOST constraint violations first (high info value). They also use process of elimination: "If I peel this red cell and see blue, that fixes the row AND the column. If I see green, I'll need to peel adjacent cells too -- but that's still progress." Random peelers waste moves on cells that are already satisfying constraints. |
| Counterintuitive Moves | 2-4 | "Peel this cell that currently SATISFIES the row constraint" -- because the column needs a different color there, and the player deduces (from remaining layer possibilities) that peeling is likely to improve the column without worsening the row. Also: "Peel to layer 3 at this cell" when layer 2 was acceptable, because the player needs a specific color that only layer 3 can provide. Deeper peeling for deduced reasons is genuinely counterintuitive. |
| Drama | 0.5-0.7 | Late-game tension: 2 cells left to fix, 1 peel remaining before par. The player must choose which cell to peel, knowing one will fix the puzzle and the other will waste the move. 50/50 moment of real tension. The "will this peel reveal the color I need?" moment is inherent to every peel. |
| Decision Entropy | 2.0-3.0 | ~5-10 cells are plausible peel targets at each step (cells violating constraints). Of those, 2-4 are genuinely interesting choices (high info value, likely to help). Rich enough without being overwhelming. |
| Info Gain Ratio | 1.5-2.5 | Strategic players use constraint logic: "Row 3 needs 1 more blue. Cells (3,2) and (3,4) are red. Peeling one might reveal blue. But (3,2) also violates column 2's constraint, so peeling it gives double value." Random peelers peel arbitrary cells. Gap is moderate because luck still plays a role. |

## Player Experience
**Opening (10s):** A 5x5 grid of colored cells -- some red, some blue, some green. Above each column, a target: "2R 1B 2G". Beside each row, a target: "1R 3B 1G". You scan: Row 1 has 3 red, needs only 1. Three red cells need peeling. You tap the red cell at (1,3) -- it curls away with a satisfying paper-peel animation, revealing blue underneath. Row 1 is now 2R 1B 2G... almost. Column 3 now has the blue it needed. One move, two constraints improved. You're hooked.

**Middle (2min):** Seven peels in. The surface is close to the target, but Row 4 needs one more green and Column 2 needs one fewer red. Cell (4,2) is red -- peeling it might reveal green (fixes BOTH constraints) or blue (fixes Column 2 but not Row 4) or red again (fixes nothing). You've been tracking: columns 1 and 3 already have their green quota, and 4 greens need to be visible total across the grid. You've seen 3 greens so far. The 4th green MUST be somewhere you haven't peeled yet. Cell (4,2) is in the right row and the right column. You peel. Green. Both constraints satisfied simultaneously. Two cells left to fix, two peels remaining.

**Ending (15s):** One peel left. Row 5 needs 1 blue, but Column 5 also needs 1 blue. Cell (5,5) is red. If blue is underneath, you win with a perfect score. If not, you'll be one over par. You peel... blue! Grid complete. All row and column targets satisfied. The satisfaction is like completing a crossword's last corner -- everything clicks into place at once.

**The aha moment:** "I shouldn't peel (2,4) even though it violates the row constraint -- Column 4 is ALREADY perfect, and peeling it risks breaking the column. Instead, I should peel (2,1) where the column ALSO needs fixing. One peel, two birds."

**The near-miss:** "I peeled (3,3) hoping for red, got green instead. If I'd peeled (3,5) first, I would have seen it was already green on layer 2, saving a move. The ORDER of peels matters because each reveal changes what I know about the remaining grid."

**Screenshot:** A 5x5 emoji grid where unpeeled cells show solid colors and peeled cells show a layered icon (top color with beneath-color peeking through). Row/column target numbers along the edges. Move count: 8/10.

## Difficulty Knobs
1. **Number of constraint violations in top layer** (Monday: 4-5 cells need peeling, minimal exploration needed; Friday: 10-12 cells need peeling, requiring careful sequencing to stay within par)
2. **Number of colors and target complexity** (Monday: 2 colors, simple targets like "3R 2B" per row; Friday: 3 colors with varied targets like "2R 1B 2G" creating tighter constraints and more coupling between rows and columns)
3. **Layer predictability** (Monday: layers generated so that peeling a violating cell almost always reveals the needed color -- low randomness; Friday: layers have more "trap" cells where peeling reveals an unhelpful color, requiring deductive reasoning about where the needed colors must be)
4. **Par generosity** (Monday: par = blind-solver optimal + 4; Friday: par = blind-solver optimal + 1)

---
<!-- BELOW THIS LINE: filled by engineer and playtester, not designer -->

## Solver Metrics

Computed on 5 puzzles (Mon-Fri seeds), 5 skill levels each.

All peel cells are depth-2 traps: top=wrong_A, layer1=wrong_B, layer2=goal.
This forces the solver through intermediate "worse" states to reach the goal.

| Metric | Mon | Tue | Wed | Thu | Fri | Avg |
|---|---|---|---|---|---|---|
| Solvability | 100% | 100% | 100% | 100% | 100% | 100% |
| Puzzle Entropy | 41.5 | 53.9 | 63.0 | 71.4 | 67.3 | 59.4 |
| Skill-Depth | 82% | 76% | 72% | 68% | 70% | 74% |
| Decision Entropy | 2.63 | 2.94 | 2.69 | 2.85 | 2.79 | 2.78 |
| Counterintuitive | 0 | 0 | 2 | 2 | 2 | 1.2 |
| Drama | 0.70 | N/A | N/A | N/A | N/A | 0.70 |
| Duration (s) | 27s | 36s | 42s | 48s | 45s | 39.6 |
| Info Gain Ratio | 1.61 | 1.36 | 1.34 | 1.45 | 1.36 | 1.42 |
| Solution Uniqueness | 1 | 1 | 2 | 1 | 2 | 1.4 |

**Auto-kill check**: PASSED
**Weakest metric**: Counterintuitive Moves -- 0 on Mon/Tue (easier puzzles have enough simple cells that the solver avoids traps), 1.2 avg overall
**Strongest metric**: Skill-Depth -- 74% avg (random play uses ~4x more peels than optimal; strategic constraint analysis dramatically reduces waste)

## Play Report

**BUG**: Undo button non-functional (visible but clicking does nothing). Either fix or remove.
**BUG**: "Wrong" counter semantics never explained. Starting at 22/25 is overwhelming and opaque.

**Session 1 (Intuitive)**: Rules clear after 2 taps. First peel fixed Row 2 immediately — great first-tap satisfaction. But peeling Row 1 Col 4 twice got B→B (same color layers) — completely wasted. No indication of layer count or whether next layer differs. Wrong went UP from 14→16 on one peel — surprising penalty. Ended 9 moves, Wrong=16.

**Session 2 (Strategic)**: Strategy = analyze row/column intersection needs, peel cells that satisfy BOTH constraints. Reduced Wrong 22→4 in 10 moves (3x better than intuitive). Row 4 Col 3 (G→R) fixed both row AND column at once (Wrong -4). But endgame wall: last 4 violations form tight interdependency where fixing one breaks another. Couldn't close.

**Session 3 (Edge Cases)**: No dominant strategy. Can fail (Wrong increases). No protection against peeling satisfied rows. Multi-peel on same cell wastes moves (B→B→B). Game never solved.

**Strategy Divergence**: STRONG. Strategic 3x better than intuitive (22→4 in 10 moves vs 22→16 in 9). Game absolutely rewards analyzing intersection constraints. But endgame wall: "almost solved" to "solved" was opaque and felt like it required luck or full hidden-layer knowledge.

**Best Moment**: Row 4 Col 3 peel dropping Wrong by 4 while satisfying both row and column. Multi-constraint cascade.
**Worst Moment**: Wrong jumping 14→16 on a seemingly reasonable peel — no feedback distinguishing bad peel from neutral.

## Decision

**Status: ITERATE** (iteration 1 of 3)

### Rationale

The core mechanic — irreversible layer-reveal for constraint satisfaction — is structurally sound. 74% skill-depth and 3x strategy divergence are among the best numbers in this lab. Row/column intersection analysis is genuine, learnable skill with incommensurable costs (peeling cell X depends on what you plan to do with cells Y and Z). The mechanic occupies a novel family (layer-reveal commitment) that nothing else in the portfolio touches.

However, the game was **never solved in 3 playtest sessions**. A daily puzzle that cannot be completed is not a daily puzzle — it is a frustration engine. The endgame wall (last 4 violations forming tight interdependencies where fixing one breaks another) is a structural design problem, not a skill problem.

### What to Change (spec revisions for v2)

**1. Eliminate same-color layer traps.** No cell should have identical colors on adjacent layers. If layer 1 is blue, layer 2 MUST be a different color. Peeling must always reveal NEW information. A peel that shows the same color is a blank Wordle guess — zero information, full move cost, pure frustration. This is the single most important fix. The generator must enforce: for every cell, layer[n] != layer[n+1].

**2. Reframe the progress metric.** Replace "Wrong: 22/25" with a POSITIVE, DECREASING counter: "Violations remaining: 8" (count of row/column constraint violations on the visible surface). The number should go DOWN on good peels and occasionally UP on bad ones. Starting at a small manageable number (8-12 on Monday, not 22) makes the goal feel achievable. Show which specific rows/columns are satisfied (green check) vs unsatisfied (red X) so the player has clear targets.

**3. Fix or remove undo.** Either make undo functional (costs +1 to move count, per P2 — undo is acceptable only if it costs something) or remove the button entirely. A broken UI element is worse than no element.

**4. Soften the endgame wall.** The generator should ensure that the LAST 2-3 peels needed to solve the puzzle are NOT tightly coupled — at least one of the final violations should be fixable independently of the others. This means the generator works backward from a solved surface, introduces violations in two waves: an "independent" wave (violations fixable one-at-a-time) and a "coupled" wave (violations requiring multi-cell reasoning). The coupled violations should appear FIRST in the solve path (mid-game), and the independent ones LAST (endgame). This creates the correct emotional arc: opening confidence, mid-game tension from coupling, endgame relief as remaining violations become tractable.

**5. Add Monday/Tuesday counterintuitive moments.** CI=0 on easy days means casual players never experience an aha. Even on Monday, include at least 1 cell where the top layer satisfies its row constraint but violates its column constraint, and peeling it fixes the column while the row has enough slack to absorb the change. This is a gentle "peel the cell that looks correct" moment that teaches the dual-constraint nature of the puzzle.

### What NOT to change

- The 5x5 grid with 3 layers per cell (this creates the right state space)
- The row/column color-count constraints (this IS the game)
- The irreversibility of peels (this is the source of tension and skill)
- The hidden-information structure (this is what defeats A10)

### Target metrics for v2

| Metric | v1 | v2 Target | Why |
|---|---|---|---|
| Skill-Depth | 74% | 65%+ | May decrease slightly as puzzles become more solvable; that is acceptable |
| CI | 1.2 (0 Mon/Tue) | 1.5+ (>0 all days) | Explicit generator constraint for easy-day CI |
| Solvability by human | 0% (never solved) | 100% (solved in session 2 or 3) | THE critical bar |
| Drama | 0.70 | 0.5+ | Endgame softening may reduce drama slightly; that is fine |
