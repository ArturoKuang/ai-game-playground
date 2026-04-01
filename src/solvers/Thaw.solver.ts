/**
 * Thaw Solver — Conduction-Amplified Ice Melting
 *
 * Grid of ice/water/empty cells. Player spends heat taps to melt ice
 * in a cross (+) pattern. Water conducts: if an arm of the cross hits
 * water, the melt propagates through connected water to the next ice
 * cell in that direction. Goal: melt all ice within a heat budget.
 *
 * The conduction mechanic means water topology is the central puzzle:
 * early taps create "bridges" that amplify later taps.
 */

/* ─── Types ─── */
export const EMPTY = 0;
export const ICE = 1;
export const WATER = 2;

export type CellType = typeof EMPTY | typeof ICE | typeof WATER;
export type ThawGrid = CellType[][];
export type ThawState = {
  grid: ThawGrid;
  rows: number;
  cols: number;
  heatUsed: number;
  heatBudget: number;
};
export type Move = { r: number; c: number };
export type Solution = { moves: Move[]; steps: number };

/* ─── Helpers ─── */
function cloneGrid(grid: ThawGrid): ThawGrid {
  return grid.map((row) => [...row]);
}

function cloneState(s: ThawState): ThawState {
  return {
    grid: cloneGrid(s.grid),
    rows: s.rows,
    cols: s.cols,
    heatUsed: s.heatUsed,
    heatBudget: s.heatBudget,
  };
}

function iceCount(grid: ThawGrid): number {
  let n = 0;
  for (const row of grid) for (const c of row) if (c === ICE) n++;
  return n;
}

/* ─── RNG ─── */
function makeRng(seed: number) {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ─── Directions for cross pattern ─── */
const DIRS: [number, number][] = [
  [-1, 0], // up
  [1, 0],  // down
  [0, -1], // left
  [0, 1],  // right
];

/**
 * Simulate melting from a tap at (r, c).
 *
 * CONDUCTION WAVE mechanic:
 * 1. Check the PRE-EXISTING water network connected to the tapped cell's
 *    neighbors (before the tap). Record which water cells are reachable.
 * 2. Melt the center cell (becomes water).
 * 3. For every ice cell orthogonally adjacent to ANY cell in the
 *    pre-existing water network, melt it too.
 *
 * Key: the wave only uses EXISTING water, not newly created water.
 * This creates the bridge-building incentive:
 * - Tap A (isolated from water): melts only 1 cell (center).
 *   But the new water at A might connect two pools for future taps.
 * - Tap B (adjacent to big water pool): melts center + all ice
 *   bordering the pool. High immediate yield.
 *
 * Counterintuitive: sometimes Tap A (1 cell melted) is better than
 * Tap B (5 cells melted) because Tap A creates a bridge that makes
 * the NEXT tap melt 12 cells instead of 5.
 *
 * Returns a new grid with the melt applied, plus count of cells melted.
 */
export function simulateMelt(
  grid: ThawGrid,
  rows: number,
  cols: number,
  tapR: number,
  tapC: number,
): { newGrid: ThawGrid; melted: number } {
  const g = cloneGrid(grid);
  let melted = 0;

  // The tapped cell must be ice
  if (g[tapR][tapC] !== ICE) return { newGrid: g, melted: 0 };

  // Step 1: Find the pre-existing water network connected to tapped cell's neighbors
  const waterNetwork = new Set<string>();
  for (const [dr, dc] of DIRS) {
    const nr = tapR + dr;
    const nc = tapC + dc;
    if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
    if (grid[nr][nc] === WATER && !waterNetwork.has(`${nr},${nc}`)) {
      // BFS to find all connected water from this neighbor
      const queue: [number, number][] = [[nr, nc]];
      waterNetwork.add(`${nr},${nc}`);
      while (queue.length > 0) {
        const [wr, wc] = queue.shift()!;
        for (const [ddr, ddc] of DIRS) {
          const nnr = wr + ddr;
          const nnc = wc + ddc;
          if (nnr < 0 || nnr >= rows || nnc < 0 || nnc >= cols) continue;
          const key = `${nnr},${nnc}`;
          if (!waterNetwork.has(key) && grid[nnr][nnc] === WATER) {
            waterNetwork.add(key);
            queue.push([nnr, nnc]);
          }
        }
      }
    }
  }

  // Step 2: Melt center
  g[tapR][tapC] = WATER;
  melted++;

  // Step 3: Melt all ice adjacent to the water network
  const toMelt = new Set<string>();
  for (const wkey of waterNetwork) {
    const [wr, wc] = wkey.split(',').map(Number);
    for (const [dr, dc] of DIRS) {
      const ir = wr + dr;
      const ic = wc + dc;
      if (ir < 0 || ir >= rows || ic < 0 || ic >= cols) continue;
      const ikey = `${ir},${ic}`;
      if (grid[ir][ic] === ICE && !toMelt.has(ikey)) {
        toMelt.add(ikey);
      }
    }
  }

  for (const mkey of toMelt) {
    const [mr, mc] = mkey.split(',').map(Number);
    g[mr][mc] = WATER;
    melted++;
  }

  return { newGrid: g, melted };
}

/**
 * Preview which cells a tap would melt (for UI).
 * Uses the same flood-melt logic as simulateMelt.
 */
export function previewMelt(
  grid: ThawGrid,
  rows: number,
  cols: number,
  tapR: number,
  tapC: number,
): Move[] {
  if (grid[tapR][tapC] !== ICE) return [];

  const { newGrid } = simulateMelt(grid, rows, cols, tapR, tapC);

  // Find all cells that changed from ICE to WATER
  const targets: Move[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === ICE && newGrid[r][c] === WATER) {
        targets.push({ r, c });
      }
    }
  }
  return targets;
}

/* ─── Core API ─── */

export function isGoal(state: ThawState): boolean {
  return iceCount(state.grid) === 0;
}

export function legalMoves(state: ThawState): Move[] {
  if (state.heatUsed >= state.heatBudget) return [];
  const moves: Move[] = [];
  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      if (state.grid[r][c] === ICE) moves.push({ r, c });
    }
  }
  return moves;
}

export function applyMove(state: ThawState, move: Move): ThawState {
  const { newGrid, melted: _melted } = simulateMelt(
    state.grid,
    state.rows,
    state.cols,
    move.r,
    move.c,
  );
  return {
    grid: newGrid,
    rows: state.rows,
    cols: state.cols,
    heatUsed: state.heatUsed + 1,
    heatBudget: state.heatBudget,
  };
}

export function heuristic(state: ThawState): number {
  return iceCount(state.grid);
}

function meltYield(
  grid: ThawGrid,
  rows: number,
  cols: number,
  r: number,
  c: number,
): number {
  const { melted } = simulateMelt(grid, rows, cols, r, c);
  return melted;
}

/* ─── Grid key for dedup ─── */
function gridKey(grid: ThawGrid): string {
  return grid.map((row) => row.join('')).join('|');
}

/* ─── Puzzle Generation ─── */

/**
 * Generate a solvable Thaw puzzle optimized for the conduction wave mechanic.
 *
 * Layout: ice-filled grid with 2-4 small water pools separated by
 * 1-2 ice cells. Optimal play requires "bridging" pools by melting
 * the ice between them (low immediate yield but creates a larger
 * connected water network that amplifies future taps).
 *
 * Construction:
 * 1. Fill grid with ice.
 * 2. Place water pools in distinct regions.
 * 3. Ensure pools are separated by thin ice walls (1-2 cells).
 * 4. Verify solvability and compute optimal.
 */
export function generatePuzzle(seed: number, difficulty: number): ThawState {
  const rng = makeRng(seed);

  const rows = difficulty <= 2 ? 5 : difficulty <= 3 ? 6 : 7;
  const cols = rows;

  // Start with all ice
  const grid: ThawGrid = Array.from({ length: rows }, () =>
    Array(cols).fill(ICE),
  );

  // Place water pools in grid quadrants/regions
  // More pools + smaller size = more bridge-building opportunities
  const numPools =
    difficulty <= 1 ? 3 :
    difficulty <= 2 ? 3 :
    difficulty <= 3 ? 4 :
    difficulty <= 4 ? 4 : 5;

  const poolSize =
    difficulty <= 1 ? 2 :
    difficulty <= 2 ? 2 :
    difficulty <= 3 ? 2 :
    difficulty <= 4 ? 2 : 2;

  // Define pool seed positions in different regions
  const regionCenters: [number, number][] = [
    [1, 1],                           // top-left
    [1, cols - 2],                     // top-right
    [rows - 2, 1],                     // bottom-left
    [rows - 2, cols - 2],              // bottom-right
    [Math.floor(rows / 2), Math.floor(cols / 2)], // center
  ];

  // Shuffle and pick
  for (let i = regionCenters.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [regionCenters[i], regionCenters[j]] = [regionCenters[j], regionCenters[i]];
  }

  // Grow water pools
  for (let p = 0; p < numPools && p < regionCenters.length; p++) {
    const [sr, sc] = regionCenters[p];
    const queue: [number, number][] = [[sr, sc]];
    let placed = 0;
    const visited = new Set<string>();
    visited.add(`${sr},${sc}`);

    while (queue.length > 0 && placed < poolSize) {
      const idx = Math.floor(rng() * queue.length);
      const [r, c] = queue[idx];
      queue.splice(idx, 1);

      if (r >= 0 && r < rows && c >= 0 && c < cols && grid[r][c] === ICE) {
        grid[r][c] = WATER;
        placed++;

        for (const [dr, dc] of DIRS) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
            const key = `${nr},${nc}`;
            if (!visited.has(key)) {
              visited.add(key);
              if (rng() < 0.7) queue.push([nr, nc]);
            }
          }
        }
      }
    }
  }

  // Add some empty cells on harder difficulties (block propagation)
  if (difficulty >= 3) {
    const emptyCount = difficulty <= 3 ? 2 : difficulty <= 4 ? 4 : 6;
    for (let e = 0; e < emptyCount; e++) {
      for (let attempt = 0; attempt < 30; attempt++) {
        const r = Math.floor(rng() * rows);
        const c = Math.floor(rng() * cols);
        if (grid[r][c] === ICE) {
          grid[r][c] = EMPTY;
          break;
        }
      }
    }
  }

  // Solve to find optimal solution length
  const totalIce = iceCount(grid);
  const state: ThawState = { grid, rows, cols, heatUsed: 0, heatBudget: 99 };
  const sol = solveExhaustive(state, 500000);
  const optimalTaps = sol ? sol.steps : Math.ceil(totalIce / 4);

  // Budget: optimal + buffer
  const buffer =
    difficulty <= 1 ? 3 :
    difficulty <= 2 ? 2 :
    difficulty <= 3 ? 2 :
    difficulty <= 4 ? 1 : 1;
  const heatBudget = optimalTaps + buffer;

  return { grid, rows, cols, heatUsed: 0, heatBudget };
}

/* ─── Solver implementations ─── */

/** Random: pick random ice cells to tap. */
function solveRandom(state: ThawState): Solution | null {
  let current = cloneState(state);
  const moves: Move[] = [];
  let safety = 100;

  while (!isGoal(current) && safety-- > 0) {
    const legal = legalMoves(current);
    if (legal.length === 0) break;
    const move = legal[Math.floor(Math.random() * legal.length)];
    moves.push(move);
    current = applyMove(current, move);
  }

  if (isGoal(current)) return { moves, steps: moves.length };
  return null;
}

/** Greedy: always tap the ice cell that melts the most cells. */
function solveGreedy(state: ThawState): Solution | null {
  let current = cloneState(state);
  const moves: Move[] = [];
  let safety = 100;

  while (!isGoal(current) && safety-- > 0) {
    const legal = legalMoves(current);
    if (legal.length === 0) break;

    let bestMove = legal[0];
    let bestYield = 0;
    for (const m of legal) {
      const y = meltYield(current.grid, current.rows, current.cols, m.r, m.c);
      if (y > bestYield) {
        bestYield = y;
        bestMove = m;
      }
    }

    moves.push(bestMove);
    current = applyMove(current, bestMove);
  }

  if (isGoal(current)) return { moves, steps: moves.length };
  return null;
}

/** Greedy with N-step lookahead. */
function solveGreedyLookahead(state: ThawState, depth: number): Solution | null {
  let current = cloneState(state);
  const moves: Move[] = [];
  let safety = 100;

  while (!isGoal(current) && safety-- > 0) {
    const legal = legalMoves(current);
    if (legal.length === 0) break;

    let bestMove = legal[0];
    let bestScore = -Infinity;

    for (const m of legal) {
      const next = applyMove(current, m);
      let score = iceCount(current.grid) - iceCount(next.grid);

      if (depth > 1 && !isGoal(next)) {
        const legal2 = legalMoves(next);
        let bestNext = 0;
        for (const m2 of legal2) {
          const y2 = meltYield(next.grid, next.rows, next.cols, m2.r, m2.c);
          if (y2 > bestNext) bestNext = y2;
        }
        score += bestNext * 0.5;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMove = m;
      }
    }

    moves.push(bestMove);
    current = applyMove(current, bestMove);
  }

  if (isGoal(current)) return { moves, steps: moves.length };
  return null;
}

/** Exhaustive DFS with iterative deepening. */
function solveExhaustive(state: ThawState, maxNodes: number): Solution | null {
  const ctx = { best: null as Solution | null, nodes: 0 };

  function dfs(current: ThawState, moves: Move[], depthLimit: number) {
    if (ctx.nodes >= maxNodes) return;
    ctx.nodes++;

    if (isGoal(current)) {
      if (!ctx.best || moves.length < ctx.best.steps) {
        ctx.best = { moves: [...moves], steps: moves.length };
      }
      return;
    }

    if (moves.length >= depthLimit) return;
    if (ctx.best && moves.length >= ctx.best.steps - 1) return;

    // Budget check: if we've used all heat, can't continue
    if (current.heatUsed >= current.heatBudget) return;

    const legal = legalMoves(current);
    if (legal.length === 0) return;

    // Lower bound: remaining ice / max possible melt per tap
    // Each tap melts at most 5 cells (center + 4 arms), so at least ceil(remaining/5) more taps
    const remaining = iceCount(current.grid);
    const minTapsNeeded = Math.ceil(remaining / (1 + 2 * Math.max(current.rows, current.cols)));
    if (moves.length + minTapsNeeded > depthLimit) return;
    if (ctx.best && moves.length + minTapsNeeded >= ctx.best.steps) return;

    // Sort by yield descending for better pruning
    const scored = legal.map((m) => ({
      move: m,
      yield: meltYield(current.grid, current.rows, current.cols, m.r, m.c),
    }));
    scored.sort((a, b) => b.yield - a.yield);

    const seenOutcomes = new Set<string>();

    for (const { move } of scored) {
      const next = applyMove(current, move);
      const key = gridKey(next.grid);
      if (seenOutcomes.has(key)) continue;
      seenOutcomes.add(key);

      moves.push(move);
      dfs(next, moves, depthLimit);
      moves.pop();
    }
  }

  // Get an upper bound from greedy solution
  const greedySol = solveGreedy(cloneState(state));
  const maxDepth = greedySol ? greedySol.steps : 20;

  for (let d = 1; d <= maxDepth; d++) {
    dfs(cloneState(state), [], d);
    if (ctx.best && ctx.best.steps <= d) break;
    if (ctx.nodes >= maxNodes) break;
  }

  return ctx.best;
}

/**
 * Parameterized solver.
 * Level 1: random valid moves
 * Level 2: greedy (best immediate yield)
 * Level 3: greedy + 1-step lookahead
 * Level 4: DFS with moderate budget
 * Level 5: full exhaustive search
 */
export function solve(
  puzzle: ThawState,
  skillLevel: 1 | 2 | 3 | 4 | 5,
): Solution | null {
  switch (skillLevel) {
    case 1:
      return solveRandom(puzzle);
    case 2:
      return solveGreedy(puzzle);
    case 3:
      return solveGreedyLookahead(puzzle, 2);
    case 4:
      return solveExhaustive(puzzle, 50000);
    case 5:
      return solveExhaustive(puzzle, 2000000);
  }
}
