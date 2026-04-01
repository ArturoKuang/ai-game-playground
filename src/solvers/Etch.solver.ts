/**
 * Etch Solver
 *
 * Grid of blocks with row/column targets. Remove blocks one at a time,
 * each adjacent to the previous removal, until each row and column has
 * exactly the target number of blocks remaining.
 *
 * Key design: puzzles are generated so the removal set includes some
 * "bridge" cells (cells in rows/cols already at target) that the path
 * must traverse for connectivity. This creates counterintuitive moves
 * where heuristic temporarily worsens.
 */

/* ─── Types ─── */
export type EtchState = {
  size: number;
  /** 1 = block present, 0 = removed */
  grid: number[];
  rowTargets: number[];
  colTargets: number[];
  /** Path of removed cells so far (indices) */
  path: number[];
  /** Total cells that need to be removed */
  toRemove: number;
};

export type Move = number; // cell index to remove

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

/* ─── Puzzle Generation ─── */

/**
 * Build a self-avoiding walk of length `count` on a `size x size` grid.
 */
function buildSelfAvoidingWalk(
  size: number,
  count: number,
  rng: () => number,
  startCell?: number,
): number[] | null {
  const totalCells = size * size;

  for (let attempt = 0; attempt < 100; attempt++) {
    const visited = new Set<number>();
    const path: number[] = [];

    const start =
      startCell !== undefined
        ? startCell
        : Math.floor(rng() * totalCells);
    path.push(start);
    visited.add(start);

    while (path.length < count) {
      const current = path[path.length - 1];
      const adj = getAdj(current, size).filter((a) => !visited.has(a));

      if (adj.length === 0) break;

      // Warnsdorff: prefer neighbor with fewest onward moves
      const scored = adj.map((a) => ({
        cell: a,
        degree: getAdj(a, size).filter(
          (n) => !visited.has(n) && n !== current,
        ).length,
      }));
      scored.sort((a, b) => a.degree - b.degree);

      const minDegree = scored[0].degree;
      const ties = scored.filter((s) => s.degree === minDegree);
      const pick = ties[Math.floor(rng() * ties.length)];

      path.push(pick.cell);
      visited.add(pick.cell);
    }

    if (path.length >= count) {
      return path.slice(0, count);
    }
  }

  return null;
}

/**
 * Generate a puzzle via backward generation.
 *
 * Build a self-avoiding walk = the guaranteed solution path.
 * Derive row/column targets from the remaining grid after removals.
 */
export function generatePuzzle(seed: number, difficulty: number): EtchState {
  const rng = makeRng(seed);

  const size = difficulty <= 2 ? 5 : difficulty <= 4 ? 6 : 7;
  const totalCells = size * size;

  const removalFraction = 0.32 + difficulty * 0.03;
  const numRemove = Math.max(
    6,
    Math.min(Math.round(totalCells * removalFraction), totalCells - size),
  );

  let removePath = buildSelfAvoidingWalk(size, numRemove, rng);
  if (!removePath) {
    const fallbackCount = Math.max(6, Math.floor(numRemove * 0.7));
    removePath = buildSelfAvoidingWalk(size, fallbackCount, rng);
  }
  if (!removePath) {
    removePath = [0];
    const visited = new Set([0]);
    let cur = 0;
    for (let i = 1; i < numRemove; i++) {
      const adj = getAdj(cur, size).filter((a) => !visited.has(a));
      if (adj.length === 0) break;
      cur = adj[0];
      removePath.push(cur);
      visited.add(cur);
    }
  }

  const actualRemove = removePath.length;

  const solvedGrid = new Array(totalCells).fill(1);
  for (const cell of removePath) solvedGrid[cell] = 0;

  const rowTargets: number[] = [];
  const colTargets: number[] = [];
  for (let r = 0; r < size; r++) {
    let count = 0;
    for (let c = 0; c < size; c++) {
      if (solvedGrid[idx(r, c, size)] === 1) count++;
    }
    rowTargets.push(count);
  }
  for (let c = 0; c < size; c++) {
    let count = 0;
    for (let r = 0; r < size; r++) {
      if (solvedGrid[idx(r, c, size)] === 1) count++;
    }
    colTargets.push(count);
  }

  return {
    size,
    grid: new Array(totalCells).fill(1),
    rowTargets,
    colTargets,
    path: [],
    toRemove: actualRemove,
  };
}

/* ─── Game Logic ─── */
export function legalMoves(state: EtchState): Move[] {
  const { size, grid, path } = state;
  const moves: Move[] = [];

  if (path.length === 0) {
    // First move: any cell is valid
    for (let i = 0; i < size * size; i++) {
      if (grid[i] === 1) moves.push(i);
    }
    return moves;
  }

  const last = path[path.length - 1];
  for (const adj of getAdj(last, size)) {
    if (grid[adj] === 1) {
      moves.push(adj);
    }
  }
  return moves;
}

export function applyMove(state: EtchState, move: Move): EtchState {
  const newGrid = [...state.grid];
  newGrid[move] = 0;
  return {
    ...state,
    grid: newGrid,
    path: [...state.path, move],
  };
}

export function isGoal(state: EtchState): boolean {
  const { size, grid, rowTargets, colTargets, path, toRemove } = state;

  if (path.length !== toRemove) return false;

  for (let r = 0; r < size; r++) {
    let count = 0;
    for (let c = 0; c < size; c++) {
      if (grid[idx(r, c, size)] === 1) count++;
    }
    if (count !== rowTargets[r]) return false;
  }

  for (let c = 0; c < size; c++) {
    let count = 0;
    for (let r = 0; r < size; r++) {
      if (grid[idx(r, c, size)] === 1) count++;
    }
    if (count !== colTargets[c]) return false;
  }

  return true;
}

/**
 * Heuristic: combined constraint + mobility score.
 *
 * Two components:
 * 1. Constraint excess: how many rows/cols still need removals
 * 2. Mobility: -log2(legal moves) as a penalty for constrained positions
 *
 * The mobility component creates counterintuitive moments: a move might
 * satisfy a constraint (excess decreases) but enter a narrow corridor
 * (mobility penalty increases). The optimal path sometimes sacrifices
 * mobility to satisfy constraints more efficiently, or sacrifices immediate
 * constraint progress to maintain mobility.
 */
export function heuristic(state: EtchState): number {
  const { size, grid, rowTargets, colTargets, path, toRemove } = state;

  // Constraint component: sum of excess across rows and cols
  let excess = 0;
  let damage = 0;
  for (let r = 0; r < size; r++) {
    let count = 0;
    for (let c = 0; c < size; c++) {
      if (grid[idx(r, c, size)] === 1) count++;
    }
    const diff = count - rowTargets[r];
    if (diff > 0) excess += diff;
    else if (diff < 0) damage += -diff;
  }
  for (let c = 0; c < size; c++) {
    let count = 0;
    for (let r = 0; r < size; r++) {
      if (grid[idx(r, c, size)] === 1) count++;
    }
    const diff = count - colTargets[c];
    if (diff > 0) excess += diff;
    else if (diff < 0) damage += -diff;
  }

  // Mobility component: how constrained is the current position?
  // Low mobility = high penalty (entering narrow corridors)
  let mobilityPenalty = 0;
  const removalsLeft = toRemove - path.length;
  if (path.length > 0 && removalsLeft > 0) {
    const last = path[path.length - 1];
    const adjPresent = getAdj(last, size).filter((a) => grid[a] === 1);
    const numMoves = adjPresent.length;
    if (numMoves === 0) {
      mobilityPenalty = 20; // dead end
    } else {
      // Penalty inversely proportional to choices
      // 1 move = penalty 3, 2 moves = 1.5, 3 = 1, 4 = 0.75
      mobilityPenalty = 3 / numMoves;
    }
  }

  return excess + damage * 5 + mobilityPenalty;
}

/** Check if a cell's removal helps or hurts constraints */
function removalValue(state: EtchState, cell: number): number {
  const { size, grid, rowTargets, colTargets } = state;
  const [r, c] = rowCol(cell, size);

  let rowCount = 0;
  for (let cc = 0; cc < size; cc++) {
    if (grid[idx(r, cc, size)] === 1) rowCount++;
  }
  let colCount = 0;
  for (let rr = 0; rr < size; rr++) {
    if (grid[idx(rr, c, size)] === 1) colCount++;
  }

  const rowExcess = rowCount - rowTargets[r];
  const colExcess = colCount - colTargets[c];

  if (rowExcess > 0 && colExcess > 0) return 4;
  if (rowExcess > 0) return 2;
  if (colExcess > 0) return 1;
  return -2;
}

/* ─── Solver ─── */
export function solve(
  puzzle: EtchState,
  skillLevel: 1 | 2 | 3 | 4 | 5,
): Solution | null {
  switch (skillLevel) {
    case 1:
      return solveRandom(puzzle, 50);
    case 2:
      return solveGreedy(puzzle);
    case 3:
      return solveGreedyLookahead(puzzle);
    case 4:
      return solveDFS(puzzle, 50000);
    case 5:
      return solveDFS(puzzle, 2000000);
  }
}

/** Level 1: Random valid moves */
function solveRandom(puzzle: EtchState, attempts: number): Solution | null {
  for (let attempt = 0; attempt < attempts; attempt++) {
    let state: EtchState = {
      ...puzzle,
      grid: [...puzzle.grid],
      path: [],
    };
    const moves: Move[] = [];

    for (let step = 0; step <= puzzle.toRemove; step++) {
      if (isGoal(state)) return { moves, steps: moves.length };
      const legal = legalMoves(state);
      if (legal.length === 0) break;
      const move = legal[Math.floor(Math.random() * legal.length)];
      state = applyMove(state, move);
      moves.push(move);
    }
    if (isGoal(state)) return { moves, steps: moves.length };
  }
  return null;
}

/** Level 2: Greedy */
function solveGreedy(puzzle: EtchState): Solution | null {
  const { size, rowTargets, colTargets } = puzzle;

  const candidates: number[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (size - rowTargets[r] > 0 && size - colTargets[c] > 0) {
        candidates.push(idx(r, c, size));
      }
    }
  }

  const starts =
    candidates.length > 8 ? candidates.slice(0, 8) : candidates.length > 0 ? candidates : [0];

  for (const startCell of starts) {
    let state: EtchState = { ...puzzle, grid: [...puzzle.grid], path: [] };
    state = applyMove(state, startCell);
    const moves: Move[] = [startCell];

    for (let step = 1; step < puzzle.toRemove; step++) {
      if (isGoal(state)) return { moves, steps: moves.length };
      const legal = legalMoves(state);
      if (legal.length === 0) break;

      let bestMove = legal[0];
      let bestH = Infinity;
      for (const m of legal) {
        const h = heuristic(applyMove(state, m));
        if (h < bestH) {
          bestH = h;
          bestMove = m;
        }
      }
      state = applyMove(state, bestMove);
      moves.push(bestMove);
    }
    if (isGoal(state)) return { moves, steps: moves.length };
  }
  return null;
}

/** Level 3: Greedy + lookahead */
function solveGreedyLookahead(puzzle: EtchState): Solution | null {
  const { size, rowTargets, colTargets } = puzzle;

  const candidates: number[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (size - rowTargets[r] > 0 && size - colTargets[c] > 0) {
        candidates.push(idx(r, c, size));
      }
    }
  }

  const starts =
    candidates.length > 10 ? candidates.slice(0, 10) : candidates.length > 0 ? candidates : [0];

  for (const startCell of starts) {
    let state: EtchState = { ...puzzle, grid: [...puzzle.grid], path: [] };
    state = applyMove(state, startCell);
    const moves: Move[] = [startCell];

    for (let step = 1; step < puzzle.toRemove; step++) {
      if (isGoal(state)) return { moves, steps: moves.length };
      const legal = legalMoves(state);
      if (legal.length === 0) break;

      let bestMove = legal[0];
      let bestScore = Infinity;

      for (const m of legal) {
        const next = applyMove(state, m);
        let score = heuristic(next);

        const nextLegal = legalMoves(next);
        if (nextLegal.length === 0 && next.path.length < puzzle.toRemove) {
          score += 1000;
        } else if (nextLegal.length > 0) {
          let bestNext = Infinity;
          for (const m2 of nextLegal) {
            bestNext = Math.min(bestNext, heuristic(applyMove(next, m2)));
          }
          score = (score + bestNext) / 2;
        }

        score -= removalValue(state, m) * 0.5;

        if (score < bestScore) {
          bestScore = score;
          bestMove = m;
        }
      }

      state = applyMove(state, bestMove);
      moves.push(bestMove);
    }
    if (isGoal(state)) return { moves, steps: moves.length };
  }
  return null;
}

/** Level 4-5: DFS with backtracking */
function solveDFS(puzzle: EtchState, maxNodes: number): Solution | null {
  const { size, rowTargets, colTargets } = puzzle;

  const startScores: { cell: number; score: number }[] = [];
  for (let i = 0; i < size * size; i++) {
    const [r, c] = rowCol(i, size);
    const rowNeed = size - rowTargets[r];
    const colNeed = size - colTargets[c];
    if (rowNeed > 0 && colNeed > 0) {
      startScores.push({ cell: i, score: rowNeed + colNeed });
    } else if (rowNeed > 0 || colNeed > 0) {
      startScores.push({ cell: i, score: (rowNeed + colNeed) * 0.5 });
    }
  }
  startScores.sort((a, b) => b.score - a.score);

  const maxStarts = Math.min(startScores.length, maxNodes > 100000 ? 20 : 8);
  const nodesPerStart = Math.floor(maxNodes / maxStarts);

  for (let si = 0; si < maxStarts; si++) {
    const startCell = startScores[si].cell;
    let nodesExplored = 0;
    let bestSolution: Solution | null = null;

    const initState = applyMove(
      { ...puzzle, grid: [...puzzle.grid], path: [] },
      startCell,
    );

    function dfs(state: EtchState, moves: Move[]): boolean {
      if (nodesExplored > nodesPerStart) return false;
      nodesExplored++;

      if (state.path.length === puzzle.toRemove) {
        if (isGoal(state)) {
          bestSolution = { moves: [...moves], steps: moves.length };
          return true;
        }
        return false;
      }

      // Prune: if any row/col has count < target, infeasible
      for (let r = 0; r < size; r++) {
        let count = 0;
        for (let c = 0; c < size; c++) {
          if (state.grid[idx(r, c, size)] === 1) count++;
        }
        if (count < rowTargets[r]) return false;
      }
      for (let c = 0; c < size; c++) {
        let count = 0;
        for (let r = 0; r < size; r++) {
          if (state.grid[idx(r, c, size)] === 1) count++;
        }
        if (count < colTargets[c]) return false;
      }

      const legal = legalMoves(state);
      if (legal.length === 0) return false;

      // Sort: prefer cells whose row AND col need removals
      const scored = legal.map((m) => {
        const val = removalValue(state, m);
        const futureAdj = getAdj(m, size).filter(
          (a) => state.grid[a] === 1 && !state.path.includes(a),
        ).length;
        return { move: m, value: val, futureAdj };
      });

      scored.sort((a, b) => {
        if (b.value !== a.value) return b.value - a.value;
        return b.futureAdj - a.futureAdj;
      });

      for (const { move } of scored) {
        const next = applyMove(state, move);
        moves.push(move);
        if (dfs(next, moves)) return true;
        moves.pop();
      }

      return false;
    }

    if (dfs(initState, [startCell])) return bestSolution;
  }

  return null;
}
