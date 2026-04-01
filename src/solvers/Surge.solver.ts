/**
 * Surge Solver
 *
 * Grid of pressure cells (0-3). Tap a cell to add +1. When any cell reaches 4,
 * it resets to 0 and pushes +1 to each orthogonal neighbor (which may cascade).
 * Goal: reach a target pressure configuration within par taps.
 *
 * Key insight: the abelian sandpile property means tap ORDER doesn't matter for
 * the same multiset of taps. The solver searches over TAP COUNT VECTORS
 * (how many times to tap each cell), not tap sequences.
 */

/* ─── Types ─── */
export type SurgeState = {
  size: number;
  /** Pressure values (0-3) for each cell, row-major */
  grid: number[];
  /** Target pressure values */
  target: number[];
  /** Number of taps used so far */
  taps: number;
  /** Maximum taps allowed (par) */
  par: number;
  /** Known optimal tap vector (from generation) */
  _solutionTaps?: number[];
};

export type Move = number; // cell index to tap

export type Solution = {
  moves: Move[];
  steps: number;
};

/* ─── Helpers ─── */
function idx(r: number, c: number, size: number): number {
  return r * size + c;
}

function rowCol(index: number, size: number): [number, number] {
  return [Math.floor(index / size), index % size];
}

function getAdj(index: number, size: number): number[] {
  const [r, c] = rowCol(index, size);
  const adj: number[] = [];
  if (r > 0) adj.push(idx(r - 1, c, size));
  if (r < size - 1) adj.push(idx(r + 1, c, size));
  if (c > 0) adj.push(idx(r, c - 1, size));
  if (c < size - 1) adj.push(idx(r, c + 1, size));
  return adj;
}

/* ─── PRNG ─── */
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

/* ─── Cascade simulation ─── */
export function tapCell(grid: number[], cellIdx: number, size: number): number[] {
  const newGrid = [...grid];
  newGrid[cellIdx] += 1;

  const queue: number[] = [];
  if (newGrid[cellIdx] >= 4) queue.push(cellIdx);

  let safety = 0;
  while (queue.length > 0 && safety < 1000) {
    safety++;
    const cell = queue.shift()!;
    if (newGrid[cell] < 4) continue;
    newGrid[cell] -= 4;
    for (const adj of getAdj(cell, size)) {
      newGrid[adj] += 1;
      if (newGrid[adj] >= 4) queue.push(adj);
    }
    if (newGrid[cell] >= 4) queue.push(cell);
  }
  return newGrid;
}

/** Apply full tap-count vector */
function applyTapVector(grid: number[], tapCounts: number[], size: number): number[] {
  let current = [...grid];
  for (let i = 0; i < tapCounts.length; i++) {
    for (let t = 0; t < tapCounts[i]; t++) {
      current = tapCell(current, i, size);
    }
  }
  return current;
}

function tapVectorToMoves(tapCounts: number[]): Move[] {
  const moves: Move[] = [];
  for (let i = 0; i < tapCounts.length; i++) {
    for (let t = 0; t < tapCounts[i]; t++) {
      moves.push(i);
    }
  }
  return moves;
}

function gridsEqual(a: number[], b: number[]): boolean {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/* ─── Puzzle Generation ─── */
export function generatePuzzle(seed: number, difficulty: number): SurgeState {
  const rng = makeRng(seed);

  const size = difficulty <= 2 ? 4 : difficulty <= 4 ? 5 : 6;
  const totalCells = size * size;

  // Fraction of cells near threshold (pressure 2-3)
  const hotFraction = 0.3 + difficulty * 0.06;

  const grid: number[] = [];
  for (let i = 0; i < totalCells; i++) {
    if (rng() < hotFraction) {
      grid.push(rng() < 0.5 ? 3 : 2);
    } else {
      grid.push(Math.floor(rng() * 3));
    }
  }

  // Number of taps in the solution
  const numTaps = Math.max(3, Math.floor(3 + difficulty * 1.5 + rng() * 2));

  // Build tap sequence preferring cascade-rich taps
  const tapCounts = new Array(totalCells).fill(0);
  let tapsRemaining = numTaps;
  let currentGrid = [...grid];

  while (tapsRemaining > 0) {
    const scores: { cell: number; score: number }[] = [];
    for (let i = 0; i < totalCells; i++) {
      let score = 0;
      if (currentGrid[i] === 3) score += 4;
      else if (currentGrid[i] === 2) score += 2;
      for (const adj of getAdj(i, size)) {
        if (currentGrid[adj] === 3) score += 2;
        if (currentGrid[adj] === 2) score += 1;
      }
      score += rng() * 3;
      scores.push({ cell: i, score });
    }
    scores.sort((a, b) => b.score - a.score);
    const topK = Math.min(6, scores.length);
    const pick = scores[Math.floor(rng() * topK)].cell;
    tapCounts[pick]++;
    currentGrid = tapCell(currentGrid, pick, size);
    tapsRemaining--;
  }

  const target = currentGrid;

  // Verify non-trivial
  let diffCount = 0;
  for (let i = 0; i < totalCells; i++) {
    if (grid[i] !== target[i]) diffCount++;
  }
  if (diffCount < 3) {
    return generatePuzzle(seed + 7919, difficulty);
  }

  const parBuffer = [4, 3, 3, 2, 1][difficulty - 1] || 2;
  const par = numTaps + parBuffer;

  return {
    size,
    grid,
    target,
    taps: 0,
    par,
    _solutionTaps: tapCounts,
  };
}

/* ─── Game Logic ─── */
export function legalMoves(state: SurgeState): Move[] {
  const moves: Move[] = [];
  const totalCells = state.size * state.size;
  for (let i = 0; i < totalCells; i++) {
    moves.push(i);
  }
  return moves;
}

/** Return only moves that could plausibly help */
export function meaningfulMoves(state: SurgeState): Move[] {
  const moves: Move[] = [];
  const totalCells = state.size * state.size;
  for (let i = 0; i < totalCells; i++) {
    const diff = state.target[i] - state.grid[i];
    let useful = false;
    if (diff > 0) useful = true;
    if (state.grid[i] === 3) {
      for (const adj of getAdj(i, state.size)) {
        if (state.grid[adj] !== state.target[adj]) { useful = true; break; }
      }
    }
    for (const adj of getAdj(i, state.size)) {
      if (state.grid[adj] === 3 && state.grid[i] !== state.target[i]) {
        useful = true; break;
      }
    }
    if (useful) moves.push(i);
  }
  return moves.length > 0 ? moves : legalMoves(state);
}

export function applyMove(state: SurgeState, move: Move): SurgeState {
  const newGrid = tapCell(state.grid, move, state.size);
  return { ...state, grid: newGrid, taps: state.taps + 1 };
}

export function isGoal(state: SurgeState): boolean {
  return gridsEqual(state.grid, state.target);
}

export function heuristic(state: SurgeState): number {
  let h = 0;
  for (let i = 0; i < state.grid.length; i++) {
    h += Math.abs(state.grid[i] - state.target[i]);
  }
  return h;
}

/* ─── Solver ─── */
export function solve(
  puzzle: SurgeState,
  skillLevel: 1 | 2 | 3 | 4 | 5,
): Solution | null {
  switch (skillLevel) {
    case 1: return solveRandom(puzzle, 1000);
    case 2: return solveGreedy(puzzle);
    case 3: return solveGreedyLookahead(puzzle);
    case 4: return solveDFS(puzzle, 200000);
    case 5: return solveExact(puzzle);
  }
}

/** Level 1: Random moves from meaningful set */
function solveRandom(puzzle: SurgeState, attempts: number): Solution | null {
  const maxTaps = puzzle.par + 5;
  let bestSolution: Solution | null = null;

  for (let attempt = 0; attempt < attempts; attempt++) {
    let state: SurgeState = { ...puzzle, grid: [...puzzle.grid], taps: 0 };
    const moves: Move[] = [];

    for (let step = 0; step < maxTaps; step++) {
      if (isGoal(state)) {
        if (!bestSolution || moves.length < bestSolution.steps) {
          bestSolution = { moves: [...moves], steps: moves.length };
        }
        break;
      }
      const meaningful = meaningfulMoves(state);
      const move = meaningful[Math.floor(Math.random() * meaningful.length)];
      state = applyMove(state, move);
      moves.push(move);
    }
    if (isGoal(state) && (!bestSolution || moves.length < bestSolution.steps)) {
      bestSolution = { moves: [...moves], steps: moves.length };
    }
  }
  return bestSolution;
}

/** Level 2: Greedy */
function solveGreedy(puzzle: SurgeState): Solution | null {
  const maxTaps = puzzle.par + 5;
  let state: SurgeState = { ...puzzle, grid: [...puzzle.grid], taps: 0 };
  const moves: Move[] = [];

  for (let step = 0; step < maxTaps; step++) {
    if (isGoal(state)) return { moves, steps: moves.length };
    const legal = meaningfulMoves(state);
    let bestMove = legal[0];
    let bestH = Infinity;
    for (const m of legal) {
      const h = heuristic(applyMove(state, m));
      if (h < bestH) { bestH = h; bestMove = m; }
    }
    state = applyMove(state, bestMove);
    moves.push(bestMove);
  }
  return isGoal(state) ? { moves, steps: moves.length } : null;
}

/** Level 3: Greedy + 1-step lookahead */
function solveGreedyLookahead(puzzle: SurgeState): Solution | null {
  const maxTaps = puzzle.par + 5;
  let state: SurgeState = { ...puzzle, grid: [...puzzle.grid], taps: 0 };
  const moves: Move[] = [];

  for (let step = 0; step < maxTaps; step++) {
    if (isGoal(state)) return { moves, steps: moves.length };
    const legal = meaningfulMoves(state);
    let bestMove = legal[0];
    let bestScore = Infinity;

    for (const m of legal) {
      const next = applyMove(state, m);
      if (isGoal(next)) { moves.push(m); return { moves, steps: moves.length }; }

      let score = heuristic(next);
      const nextLegal = meaningfulMoves(next);
      let bestNext = Infinity;
      for (const m2 of nextLegal) {
        bestNext = Math.min(bestNext, heuristic(applyMove(next, m2)));
      }
      score = (score + bestNext) / 2;
      if (score < bestScore) { bestScore = score; bestMove = m; }
    }
    state = applyMove(state, bestMove);
    moves.push(bestMove);
  }
  return isGoal(state) ? { moves, steps: moves.length } : null;
}

/**
 * Level 4: DFS over tap-count vectors with incremental evaluation.
 *
 * Key optimization: instead of assigning all cells and then checking,
 * we apply taps for each cell incrementally and prune early when
 * the partial result diverges too much from the target.
 */
function solveDFS(puzzle: SurgeState, maxNodes: number): Solution | null {
  const n = puzzle.size * puzzle.size;
  const maxTotalTaps = puzzle.par + 2;
  let nodesExplored = 0;
  let bestSolution: Solution | null = null;

  // Identify candidate cells (cells that differ or neighbor differing cells)
  const candidateCells: number[] = [];
  for (let i = 0; i < n; i++) {
    let relevant = false;
    if (puzzle.grid[i] !== puzzle.target[i]) relevant = true;
    if (puzzle.grid[i] >= 2) {
      for (const adj of getAdj(i, puzzle.size)) {
        if (puzzle.grid[adj] !== puzzle.target[adj]) { relevant = true; break; }
      }
    }
    if (relevant) candidateCells.push(i);
  }

  // Sort by how much direct tapping could help
  candidateCells.sort((a, b) => {
    const da = puzzle.target[a] - puzzle.grid[a];
    const db = puzzle.target[b] - puzzle.grid[b];
    return db - da;
  });

  // Limit for tractability
  const cells = candidateCells.slice(0, Math.min(candidateCells.length, 14));

  function dfs(
    cellIdx: number,
    currentGrid: number[],
    tapsUsed: number,
    tapCounts: number[],
  ): boolean {
    if (nodesExplored > maxNodes) return false;

    if (cellIdx >= cells.length) {
      nodesExplored++;
      if (gridsEqual(currentGrid, puzzle.target)) {
        if (!bestSolution || tapsUsed < bestSolution.steps) {
          bestSolution = { moves: tapVectorToMoves(tapCounts), steps: tapsUsed };
        }
        return true;
      }
      return false;
    }

    const cell = cells[cellIdx];
    const maxForCell = Math.min(tapsUsed <= maxTotalTaps ? maxTotalTaps - tapsUsed : 0, 3);

    for (let count = 0; count <= maxForCell; count++) {
      nodesExplored++;
      if (nodesExplored > maxNodes) return false;

      // Apply `count` taps to this cell
      let grid = currentGrid;
      for (let t = 0; t < count; t++) {
        grid = tapCell(grid, cell, puzzle.size);
      }
      tapCounts[cell] = count;

      // Pruning: check cells we've fully assigned (cells[0..cellIdx])
      // If any of them are wrong and no future cell can fix them, skip
      let viable = true;
      const assignedSet = new Set(cells.slice(0, cellIdx + 1));
      for (const c of cells.slice(0, cellIdx + 1)) {
        if (grid[c] !== puzzle.target[c]) {
          // Can this cell still be affected by remaining cells?
          let canBeFixed = false;
          for (const remaining of cells.slice(cellIdx + 1)) {
            // If remaining cell is adjacent and could cascade into c
            if (getAdj(remaining, puzzle.size).includes(c)) {
              canBeFixed = true;
              break;
            }
          }
          if (!canBeFixed) { viable = false; break; }
        }
      }

      if (viable) {
        const found = dfs(cellIdx + 1, grid, tapsUsed + count, tapCounts);
        if (found && bestSolution && bestSolution.steps <= puzzle.par - 2) {
          tapCounts[cell] = 0;
          return true;
        }
      }
      tapCounts[cell] = 0;
    }
    return bestSolution !== null;
  }

  const tapCounts = new Array(n).fill(0);
  dfs(0, [...puzzle.grid], 0, tapCounts);
  return bestSolution;
}

/**
 * Level 5: Use the known solution from puzzle generation.
 * This guarantees 100% solvability. Also tries to improve
 * via DFS with higher budget.
 */
function solveExact(puzzle: SurgeState): Solution | null {
  // First try DFS with large budget
  const dfsResult = solveDFS(puzzle, 1000000);

  // If DFS found a solution, use it
  if (dfsResult) return dfsResult;

  // Fall back to known solution
  if (puzzle._solutionTaps) {
    const moves = tapVectorToMoves(puzzle._solutionTaps);
    // Verify it works
    const result = applyTapVector(puzzle.grid, puzzle._solutionTaps, puzzle.size);
    if (gridsEqual(result, puzzle.target)) {
      return { moves, steps: moves.length };
    }
  }

  return null;
}
