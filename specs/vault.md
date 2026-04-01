# Vault

## Rules
Unlock all cells on a 4x5 grid. Each cell has a visible lock type (one of 4 colors). You have a rotating key ring of 8 keys. The key at the top of the ring unlocks the cell you tap (if it matches). After each unlock, the ring rotates forward by 1. Unlock all cells within par moves.

## Mechanic Type
Constraint Satisfaction

## Why It Works

### Stare Test
All lock types and all 8 keys on the ring are visible. But the ring ROTATES after each unlock, changing which key is active next. To plan 4 unlocks ahead, the player must track the ring state through 4 rotations while also choosing which cells to unlock at each step. With 8 keys on the ring and 20 cells (4 lock types, ~5 cells per type), the planning problem is: "Given ring state S, which of the ~5 matching cells should I unlock now, knowing that my choice determines which key is active for the NEXT unlock, which determines which cells are available THEN?" This creates a tree of depth 20 with branching factor ~5 at each level. Even planning 4 steps ahead requires evaluating 5^4 = 625 paths through ring states crossed with spatial positions. The ring state is simple (which key is on top), but the INTERACTION between ring state and grid position creates combinatorial explosion.

The key insight: the ring contains 8 keys but the grid has 4 lock types. So the ring has 2 keys of each type, but they appear at different positions. After using a red key at position 1, the next red key might not come around for 3-4 more rotations. If the player needs to unlock 5 red cells, they must space their red unlocks to coincide with red keys on the ring. But spacing red unlocks means interspersing blue/green/yellow unlocks between them, and THOSE must also align with their respective ring positions. The player is solving a multi-resource scheduling problem where the resource supply (ring) is fixed and cyclic.

### Dominant Strategy Test
"Unlock whatever matches the current key" is the greedy strategy. It fails because: (a) there might be 5 red cells and the current key is red -- which red cell should be unlocked first? If the player unlocks the red cell in the top-left, the ring advances, and the next key might be blue. But there's only ONE blue cell remaining near the current position, and it's surrounded by yellow cells that the player will need to reach later. Unlocking it now creates a long backtracking path. (b) Skipping a match can be beneficial: if the current key is red but the player SKIPS it (does not unlock), the ring still advances... wait, no. The ring only advances on successful unlocks. So the player CAN'T skip -- they must unlock to advance. This means the KEY SEQUENCE IS FIXED: keys 1, 2, 3, 4, 5, 6, 7, 8, 1, 2, ... always in that order. The ONLY decision is WHICH matching cell to unlock at each step.

This is actually stronger than "it depends on the board." The fixed key sequence means the player knows exactly which key types will appear for the next 20 unlocks. The puzzle is: given this fixed sequence of key types, assign each unlock to a specific cell (of matching type) such that the spatial path between consecutive unlocks is efficient AND all cells get unlocked. This is a constrained assignment problem where the cost is path length and the constraint is type matching. The incommensurable cost: unlocking cell A (red, top-left) at step 1 means the next unlock (blue, step 2) must start from the top-left. If the nearest blue cell is in the bottom-right, step 2 costs many moves. But if the player had unlocked cell B (red, center) at step 1 instead, the nearest blue cell might be adjacent. However, choosing B at step 1 means A must be unlocked at a LATER red key (step 5), and by then the player's position might be far from A. The cost of each choice depends on the entire future assignment.

### Family Test
Sequencing with a rotating resource constraint. This is NOT:
- Loop (ring rotation of tiles on the board -- Vault rotates the KEY supply, not the board)
- Chain (sequential consumption with rotation side effects -- Chain rotated CELL COLORS; Vault has a fixed key ring that determines which cell TYPES can be acted on)
- PathWeaver (routing without resource constraints)
- Any deduction game (no hidden information -- all keys and locks are visible)
- Sort (1D ordering -- Vault is 2D spatial with resource scheduling)

The defining novelty: the player is solving a 2D SPATIAL problem (path through grid) constrained by a 1D CYCLIC SEQUENCE (key ring). The two structures interact: the spatial position determines which cells are reachable, and the ring position determines which cells are unlockable. Neither structure alone is complex, but their product creates rich decision space. The closest analog is a factory scheduling problem where machines (keys) process jobs (cells) in a fixed cyclic order, and job locations create travel-time costs.

**Unoccupied family**: Cyclic-resource-constrained spatial sequencing.

## Predicted Failure Mode
**Most likely death: path optimization is A10.** If the grid is small enough (4x5 = 20 cells), a patient player might mentally compute the optimal assignment by working through the fixed key sequence. With ~5 cells per lock type and 8 keys in the ring (2 per type), each key step has ~5 choices. But the path cost between consecutive unlocks adds a spatial dimension that complicates mental optimization. MITIGATION: the spatial path cost is NOT just "distance" -- the player must physically traverse the grid, and intermediate cells might block efficient routing. On tighter boards with obstacles (walls, pre-unlocked cells that block movement), the routing problem defeats static analysis.

**Second risk: the fixed ring removes player agency.** If the key sequence is fixed (1, 2, 3, ..., 8, 1, 2, ...), the player's ONLY decision is spatial assignment. This might feel like "the game tells me which color to unlock, I just pick where." MITIGATION: introduce a SKIP mechanic -- the player can choose to advance the ring WITHOUT unlocking (costing a move but changing the key sequence alignment). This adds a second decision axis: "should I skip this key to get a better key alignment for the next 3 unlocks?" Skipping costs a move (counted toward par), creating a genuine tradeoff between using a suboptimal key now vs. spending a move to realign the ring.

**Third risk: the puzzle feels like busywork.** If most unlocks are obvious (only one matching cell is nearby), the game is a forced march through a predetermined sequence. MITIGATION: ensure the generator places multiple matching cells in different spatial clusters, creating genuine "which cluster should I visit now?" decisions. Each key step should have 2-4 reachable matching cells to choose from.

**Anti-pattern proximity: A10 (fully visible) and A8 (low branching).** Defense against A10: the ring x spatial product space is too large for mental simulation beyond 3-4 steps. Defense against A8: 4 lock types with ~5 cells each ensures 3-5 choices per key step, well above the 2.5 floor.

## Expected Metrics
| Metric | Prediction | Reasoning |
|---|---|---|
| Puzzle Entropy | 18-30 | 20 cells, each key step has ~5 matching cells. With the skip mechanic, effective branching is 5-6 per step. Over 20-24 steps (20 unlocks + 0-4 skips), total decision info is ~35-45 bits before constraint pruning. Spatial proximity prunes to ~3 meaningful choices per step. |
| Skill-Depth | 40-65% | Strategic players look ahead 3-4 key steps: "If I unlock red-A now, the next key is blue, and the nearest blue cell to A is B. But if I unlock red-C instead, the nearest blue is D, which is also near a yellow cell I'll need at step 4." This multi-step lookahead with spatial+ring constraints rewards planning. Greedy players (nearest matching cell) get stranded far from later matches. |
| Counterintuitive Moves | 2-4 | "Unlock the FARTHER matching cell" -- because it positions you near a cluster of cells matching the NEXT 3 key types. Also: "SKIP this key" -- spending a move to realign the ring so the next 3 keys match nearby cells instead of distant ones. Spending a move to gain 2 moves is counterintuitive. |
| Drama | 0.5-0.7 | Near-miss: "I unlocked all cells but used 24 moves, par was 22. If I'd skipped at step 5 (realigning the ring to match the northeast cluster), I would have saved 3 moves on the subsequent unlocks." The ring alignment creates "what if" moments throughout. |
| Decision Entropy | 2.0-3.5 | Each key step: 3-5 reachable matching cells + skip option = 4-6 choices. After spatial pruning (distant cells are clearly worse), 2-4 genuinely competitive options. Healthy range. |
| Info Gain Ratio | 1.8-2.5 | Strategic players complete in ~21 moves (near-par). Greedy players take ~26 moves (suboptimal spatial routing). The gap comes from multi-step ring-aware planning vs. myopic nearest-cell selection. |

## Player Experience
**Opening (10s):** A 4x5 grid of colorful locked cells -- reds, blues, greens, yellows, each showing a padlock icon in their color. On the right, a vertical ring of 8 keys: R, B, G, Y, R, B, G, Y (two of each, interleaved). The top key glows: Red. You scan for red cells. Five red cells scattered across the grid. You're at the top-left. Two red cells are nearby (top row), three are distant (bottom half). You tap the nearest red cell -- it unlocks with a key-turning animation and a satisfying click. The key ring rotates: next key is Blue. You look for blue cells near your position.

**Middle (2min):** Eight cells unlocked. The ring is at position 9 (back to the start: Red again). You've cleared most of the top half but the bottom has 8 locked cells in a dense cluster -- 2R, 2B, 2G, 2Y. The ring sequence for the next 8 unlocks is R, B, G, Y, R, B, G, Y. Perfect -- one of each in the cluster. But the cluster has 2 reds, and the ring has 2 red keys (positions 9 and 13). You need to unlock one red at step 9 and one at step 13. Between them, you'll unlock B (step 10), G (step 11), Y (step 12). The spatial arrangement of the cluster matters: the two red cells are on opposite sides. If you unlock red-left at step 9, you traverse left-to-right through B, G, Y, ending on the right side -- far from red-right for step 13. If you unlock red-right first, you traverse right-to-left, ending near red-left. Which traversal direction minimizes total moves? You trace both paths mentally. Right-to-left saves 2 moves because the B and G cells are adjacent in that direction. You unlock red-right.

**Ending (15s):** Two cells left: one green (bottom corner) and one yellow (center). Ring: G, Y. Green is next. You tap the green cell -- click. Ring advances to Yellow. The yellow cell is 3 steps away. You walk there and tap. Final click. All 20 cells glow gold. The ring fades out. "Vault #42: 22 moves. Par: 22. Perfect!" The entire grid does a cascading unlock animation, locks flying off cells in a wave from top-left to bottom-right.

**The aha moment:** "I should skip this red key -- there are no red cells nearby, and the NEXT key is blue, which matches the three blue cells right next to me. Spending 1 move on a skip saves 4 moves of backtracking to a distant red cell. The skip is expensive now but the ring realignment pays off immediately."

**The near-miss:** "23 moves, par was 22. At step 6, I unlocked green-A instead of green-B. Green-B was one cell farther, but it's adjacent to a yellow cell that I needed at step 7. Instead, I had to walk 3 cells to reach yellow. One different green choice and I'd have made par."

**Screenshot:** A 4x5 grid showing the unlock order as numbered cells (1-20). The path between consecutive numbers shows the traversal route. Key ring shown as a sidebar with used keys grayed out. "Vault #42: 22/22 moves. Par: 22."

## Difficulty Knobs
1. **Key ring composition** (Monday: ring has 3 of each lock type -- generous matching, skip rarely needed; Friday: ring has exactly 2 of each type with wildcards removed -- tight matching, 1-2 strategic skips needed for par)
2. **Grid density and lock distribution** (Monday: 4x4 grid, 16 cells, even spatial distribution of lock types -- nearby matches always available; Friday: 4x6 grid, 24 cells, lock types clustered in corners -- matching cells are far apart, forcing long traversals or strategic skips)
3. **Obstacles** (Monday: no walls, free traversal; Friday: 2-3 walls that block direct paths, forcing detours that make spatial routing decisions more impactful)
4. **Par tightness** (Monday: par = optimal + 4; Friday: par = optimal + 1)

---
<!-- BELOW THIS LINE: filled by engineer and playtester, not designer -->

## Solver Metrics

Computed on 5 puzzles (Mon-Fri seeds 10001-10005), 5 skill levels each.
Scoring: total cost = unlocks + skips + manhattan travel distance.

| Metric | Mon | Tue | Wed | Thu | Fri | Avg |
|---|---|---|---|---|---|---|
| Solvability | 100% | 100% | 100% | 100% | 100% | 100% |
| Puzzle Entropy | 20.9 | 32.5 | 32.5 | 51.0 | 38.7 | 35.1 |
| Skill-Depth | 22.0% | 32.3% | 33.8% | 32.9% | 29.9% | 30.2% |
| Decision Entropy | 1.49 | 1.71 | 1.81 | 1.96 | 1.93 | 1.78 |
| Counterintuitive | 0 | 0 | 2 | 1 | 2 | 1.0 |
| Drama | 0.52 | 0.52 | 0.48 | 1.00 | 1.00 | 0.70 |
| Duration (s) | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| Info Gain Ratio | 1.41 | 1.22 | 1.35 | 1.69 | 1.53 | 1.44 |
| Solution Uniqueness | 1 | 1 | 1 | 1 | 1 | 1.0 |

Grid sizes: Mon=3x4, Tue=3x5, Wed=4x4, Thu=4x5, Fri=4x5.
Ring sizes: Mon=16, Tue=17, Wed=18, Thu=23, Fri=24.
Optimal costs: Mon=32, Tue=42, Wed=43, Thu=51, Fri=54.
Pars: Mon=38, Tue=46, Wed=46, Thu=53, Fri=56.

**Auto-kill check**: PASSED
**Weakest metric**: Decision Entropy (Mon) -- 1.49, close to the 1.0 floor; Monday has fewer cells and less branching.
**Strongest metric**: Puzzle Entropy -- avg 35.1 bits, very healthy decision space from spatial+ring interaction.

## Play Report
<!-- Playtester fills this section with blind play observations -->

## Decision
<!-- Designer fills this after reviewing metrics + play report -->
<!-- Status: keep / iterate / kill -->
