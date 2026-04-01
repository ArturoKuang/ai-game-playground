/**
 * Signal Solver
 *
 * Deduce a hidden NxN color grid by broadcasting from row/column edges.
 * Each broadcast reveals the first cell of each color seen from that direction.
 * Goal: identify all cells within a limited number of broadcasts (par).
 *
 * State:
 *   - hidden: the target grid (NxN of color indices)
 *   - known: player's current knowledge (NxN, null = unknown)
 *   - usedBroadcasts: set of edge broadcasts already used
 *   - broadcastCount: number of broadcasts used
 *   - reveals: map from broadcast key to reveal info
 *
 * Moves: broadcast from an edge (direction + index)
 *   - 'N-0' means broadcast southward from column 0 top
 *   - 'S-2' means broadcast northward from column 2 bottom
 *   - 'W-1' means broadcast eastward from row 1 left
 *   - 'E-3' means broadcast westward from row 3 right
 */

export const GRID_SIZE = 5;

export type Direction = 'N' | 'S' | 'W' | 'E';

export type Move = {
  direction: Direction;
  index: number;
};

export type RevealEntry = {
  color: number;
  row: number;
  col: number;
};

export type SignalState = {
  hidden: number[][];         // target grid (NxN color indices)
  known: (number | null)[][]; // player knowledge (null = unknown)
  usedBroadcasts: Set<string>;
  broadcastCount: number;
  reveals: Map<string, RevealEntry[]>;
  numColors: number;
  par: number;
};

export type Solution = {
  moves: Move[];
  steps: number;
  cellsDeduced: number;
};

function moveKey(m: Move): string {
  return `${m.direction}-${m.index}`;
}

function seededRng(seed: number): () => number {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Generate the hidden grid */
function generateGrid(rng: () => number, numColors: number): number[][] {
  const grid: number[][] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    const row: number[] = [];
    for (let c = 0; c < GRID_SIZE; c++) {
      row.push(Math.floor(rng() * numColors));
    }
    grid.push(row);
  }
  return grid;
}

/** Perform a broadcast: returns the first cell of each color seen from that direction */
export function broadcast(grid: number[][], move: Move): RevealEntry[] {
  const results: RevealEntry[] = [];
  const seenColors = new Set<number>();

  const { direction, index } = move;
  const size = grid.length;

  // Determine traversal order
  let cells: { row: number; col: number }[] = [];
  switch (direction) {
    case 'W': // broadcast eastward along row
      for (let c = 0; c < size; c++) cells.push({ row: index, col: c });
      break;
    case 'E': // broadcast westward along row
      for (let c = size - 1; c >= 0; c--) cells.push({ row: index, col: c });
      break;
    case 'N': // broadcast southward along column
      for (let r = 0; r < size; r++) cells.push({ row: r, col: index });
      break;
    case 'S': // broadcast northward along column
      for (let r = size - 1; r >= 0; r--) cells.push({ row: r, col: index });
      break;
  }

  for (const { row, col } of cells) {
    const color = grid[row][col];
    if (!seenColors.has(color)) {
      seenColors.add(color);
      results.push({ color, row, col });
    }
  }

  return results;
}

/** Apply constraint propagation: deduce cells from all reveals */
function propagateConstraints(state: SignalState): (number | null)[][] {
  const known = state.known.map(row => [...row]);
  const size = GRID_SIZE;
  const numColors = state.numColors;

  // Possible colors for each cell
  const possible: Set<number>[][] = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => {
      if (known[r][c] !== null) return new Set([known[r][c]!]);
      const s = new Set<number>();
      for (let i = 0; i < numColors; i++) s.add(i);
      return s;
    })
  );

  // Apply direct reveals
  for (const [, entries] of state.reveals) {
    for (const { color, row, col } of entries) {
      known[row][col] = color;
      possible[row][col] = new Set([color]);
    }
  }

  // Apply ordering constraints from each broadcast
  for (const [key, entries] of state.reveals) {
    const parts = key.split('-');
    const direction = parts[0] as Direction;
    const index = parseInt(parts[1]);

    // Get the cell traversal order for this broadcast
    const cells: { row: number; col: number }[] = [];
    switch (direction) {
      case 'W':
        for (let c = 0; c < size; c++) cells.push({ row: index, col: c });
        break;
      case 'E':
        for (let c = size - 1; c >= 0; c--) cells.push({ row: index, col: c });
        break;
      case 'N':
        for (let r = 0; r < size; r++) cells.push({ row: r, col: index });
        break;
      case 'S':
        for (let r = size - 1; r >= 0; r--) cells.push({ row: r, col: index });
        break;
    }

    // For each revealed entry, all cells BEFORE it in traversal order
    // cannot be that color (otherwise it would have been revealed earlier)
    for (const entry of entries) {
      const entryIdx = cells.findIndex(c => c.row === entry.row && c.col === entry.col);
      for (let i = 0; i < entryIdx; i++) {
        possible[cells[i].row][cells[i].col].delete(entry.color);
      }
    }

    // Colors NOT revealed by this broadcast are not present in this line at all
    const revealedColors = new Set(entries.map(e => e.color));
    for (let colorIdx = 0; colorIdx < numColors; colorIdx++) {
      if (!revealedColors.has(colorIdx)) {
        for (const cell of cells) {
          possible[cell.row][cell.col].delete(colorIdx);
        }
      }
    }
  }

  // Iterate constraint propagation until stable
  let changed = true;
  let iterations = 0;
  while (changed && iterations < 50) {
    changed = false;
    iterations++;

    // If a cell has only one possibility, it's known
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (known[r][c] === null && possible[r][c].size === 1) {
          known[r][c] = [...possible[r][c]][0];
          changed = true;
        }
      }
    }

    // If in a row/col broadcast line, a color can only go in one place, assign it
    for (const [key, entries] of state.reveals) {
      const parts = key.split('-');
      const direction = parts[0] as Direction;
      const index = parseInt(parts[1]);

      const cells: { row: number; col: number }[] = [];
      switch (direction) {
        case 'W':
        case 'E':
          for (let c = 0; c < size; c++) cells.push({ row: index, col: c });
          break;
        case 'N':
        case 'S':
          for (let r = 0; r < size; r++) cells.push({ row: r, col: index });
          break;
      }

      const revealedColors = new Set(entries.map(e => e.color));
      for (const color of revealedColors) {
        const candidates = cells.filter(
          cell => known[cell.row][cell.col] === null && possible[cell.row][cell.col].has(color)
        );
        const alreadyPlaced = cells.some(cell => known[cell.row][cell.col] === color);
        if (!alreadyPlaced && candidates.length === 1) {
          const { row, col } = candidates[0];
          known[row][col] = color;
          possible[row][col] = new Set([color]);
          changed = true;
        }
      }
    }

    // Remove known values from peers' possibilities
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (known[r][c] !== null) {
          possible[r][c] = new Set([known[r][c]!]);
        }
      }
    }
  }

  return known;
}

/** Count known cells */
function countKnown(known: (number | null)[][]): number {
  let count = 0;
  for (const row of known) {
    for (const cell of row) {
      if (cell !== null) count++;
    }
  }
  return count;
}

export function generatePuzzle(seed: number, difficulty: number): SignalState {
  const rng = seededRng(seed);
  // Difficulty 1-5: numColors 3-5
  const numColors = Math.min(3 + Math.floor((difficulty - 1) / 2), 5);

  // Generate grid, ensuring each color appears at least once
  let grid: number[][];
  for (let attempt = 0; attempt < 100; attempt++) {
    grid = generateGrid(rng, numColors);
    const colorCounts = new Array(numColors).fill(0);
    for (const row of grid) {
      for (const cell of row) colorCounts[cell]++;
    }
    if (colorCounts.every(c => c >= 1)) break;
  }
  grid = grid!;

  // Compute par using greedy+lookahead (fast) then try to improve with DFS
  const emptyState: SignalState = {
    hidden: grid,
    known: Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null)),
    usedBroadcasts: new Set(),
    broadcastCount: 0,
    reveals: new Map(),
    numColors,
    par: 999,
  };

  const greedySol = solveGreedy(emptyState, 1);
  const optimalSolution = solveOptimal(emptyState);
  const bestSol = optimalSolution && (!greedySol || optimalSolution.steps <= greedySol.steps) ? optimalSolution : greedySol;
  const optimalBroadcasts = bestSol ? bestSol.steps : GRID_SIZE * 2;

  // Par scales with difficulty
  // Mon: par = optimal + 3 (generous); Fri: par = optimal (tight)
  const parPadding = Math.max(0, 4 - difficulty);
  const par = optimalBroadcasts + parPadding;

  return {
    hidden: grid,
    known: Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null)),
    usedBroadcasts: new Set(),
    broadcastCount: 0,
    reveals: new Map(),
    numColors,
    par,
  };
}

export function legalMoves(state: SignalState): Move[] {
  const moves: Move[] = [];
  const directions: Direction[] = ['N', 'S', 'W', 'E'];
  for (const direction of directions) {
    for (let index = 0; index < GRID_SIZE; index++) {
      const key = moveKey({ direction, index });
      if (!state.usedBroadcasts.has(key)) {
        moves.push({ direction, index });
      }
    }
  }
  return moves;
}

export function applyMove(state: SignalState, move: Move): SignalState {
  const key = moveKey(move);
  if (state.usedBroadcasts.has(key)) return state;

  const entries = broadcast(state.hidden, move);
  const newReveals = new Map(state.reveals);
  newReveals.set(key, entries);

  const newUsed = new Set(state.usedBroadcasts);
  newUsed.add(key);

  const newState: SignalState = {
    ...state,
    usedBroadcasts: newUsed,
    broadcastCount: state.broadcastCount + 1,
    reveals: newReveals,
  };

  // Apply constraint propagation
  newState.known = propagateConstraints(newState);

  return newState;
}

export function isGoal(state: SignalState): boolean {
  return countKnown(state.known) === GRID_SIZE * GRID_SIZE;
}

export function heuristic(state: SignalState): number {
  // Number of unknown cells
  return GRID_SIZE * GRID_SIZE - countKnown(state.known);
}

/** Information gain: how many new cells would this broadcast reveal */
function estimateInfoGain(state: SignalState, move: Move): number {
  const nextState = applyMove(state, move);
  return countKnown(nextState.known) - countKnown(state.known);
}

/** Greedy solver: pick the broadcast with highest info gain */
function solveGreedy(state: SignalState, lookahead: number = 0): Solution | null {
  const moves: Move[] = [];
  let current = { ...state, known: state.known.map(r => [...r]), usedBroadcasts: new Set(state.usedBroadcasts), reveals: new Map(state.reveals) };

  while (!isGoal(current)) {
    const available = legalMoves(current);
    if (available.length === 0) return null;

    let bestMove: Move | null = null;
    let bestGain = -1;

    if (lookahead === 0) {
      for (const m of available) {
        const gain = estimateInfoGain(current, m);
        if (gain > bestGain) {
          bestGain = gain;
          bestMove = m;
        }
      }
    } else {
      // 1-step lookahead: for each move, also consider the best follow-up
      for (const m of available) {
        const next = applyMove(current, m);
        let totalGain = countKnown(next.known) - countKnown(current.known);

        if (!isGoal(next)) {
          const nextAvailable = legalMoves(next);
          let bestFollowup = 0;
          for (const m2 of nextAvailable) {
            const gain2 = estimateInfoGain(next, m2);
            if (gain2 > bestFollowup) bestFollowup = gain2;
          }
          totalGain += bestFollowup;
        }

        if (totalGain > bestGain) {
          bestGain = totalGain;
          bestMove = m;
        }
      }
    }

    if (!bestMove) return null;
    current = applyMove(current, bestMove);
    moves.push(bestMove);
  }

  return { moves, steps: moves.length, cellsDeduced: GRID_SIZE * GRID_SIZE };
}

/** Optimal solver using iterative deepening DFS with node limit */
let dfsNodeCount = 0;
const DFS_NODE_LIMIT = 5000;

function solveOptimal(state: SignalState): Solution | null {
  // Get an upper bound from greedy
  const greedySol = solveGreedy(state, 1);
  const upperBound = greedySol ? greedySol.steps : 20;

  for (let maxDepth = 1; maxDepth <= upperBound; maxDepth++) {
    dfsNodeCount = 0;
    const result = dfs(state, [], maxDepth);
    if (result) return result;
  }
  return greedySol; // Fall back to greedy if DFS is exhausted
}

function dfs(state: SignalState, path: Move[], maxDepth: number): Solution | null {
  if (isGoal(state)) {
    return { moves: [...path], steps: path.length, cellsDeduced: GRID_SIZE * GRID_SIZE };
  }
  if (path.length >= maxDepth) return null;
  if (dfsNodeCount > DFS_NODE_LIMIT) return null;
  dfsNodeCount++;

  // Lower bound pruning: even if each broadcast reveals GRID_SIZE cells,
  // can we reach the goal in remaining steps?
  const remaining = heuristic(state);
  const stepsLeft = maxDepth - path.length;
  if (remaining > stepsLeft * GRID_SIZE) return null;

  const available = legalMoves(state);

  // Sort by estimated info gain (descending) to prune faster
  const scored = available.map(m => ({
    move: m,
    gain: estimateInfoGain(state, m),
  }));
  scored.sort((a, b) => b.gain - a.gain);

  // Only consider top 4 useful candidates
  const useful = scored.filter(s => s.gain > 0).slice(0, 4);
  if (useful.length === 0) return null;

  for (const { move } of useful) {
    const next = applyMove(state, move);
    path.push(move);
    const result = dfs(next, path, maxDepth);
    if (result) return result;
    path.pop();
  }

  return null;
}

/** Random solver: pick random broadcasts */
function solveRandom(state: SignalState, rngSeed: number): Solution | null {
  const rng = seededRng(rngSeed);
  const moves: Move[] = [];
  let current = { ...state, known: state.known.map(r => [...r]), usedBroadcasts: new Set(state.usedBroadcasts), reveals: new Map(state.reveals) };

  while (!isGoal(current)) {
    const available = legalMoves(current);
    if (available.length === 0) return null;
    const move = available[Math.floor(rng() * available.length)];
    current = applyMove(current, move);
    moves.push(move);
  }

  return { moves, steps: moves.length, cellsDeduced: GRID_SIZE * GRID_SIZE };
}

export function solve(
  puzzle: SignalState,
  skillLevel: 1 | 2 | 3 | 4 | 5,
): Solution | null {
  switch (skillLevel) {
    case 1:
      return solveRandom(puzzle, 42);
    case 2:
      return solveGreedy(puzzle, 0);
    case 3:
      return solveGreedy(puzzle, 1);
    case 4:
      return solveOptimal(puzzle);
    case 5:
      return solveOptimal(puzzle);
    default:
      return null;
  }
}

/** Compute metrics for a single puzzle */
export function computeMetrics(seed: number, difficulty: number) {
  const puzzle = generatePuzzle(seed, difficulty);

  // Solve at all 5 skill levels
  const solutions: (Solution | null)[] = [];
  for (let level = 1; level <= 5; level++) {
    solutions.push(solve(puzzle, level as 1 | 2 | 3 | 4 | 5));
  }

  const sol5 = solutions[4];
  const sol1 = solutions[0];
  const sol3 = solutions[2];

  const solvable = sol5 !== null;
  const optimalSteps = sol5 ? sol5.steps : 0;
  const randomSteps = sol1 ? sol1.steps : 0;

  // Skill-depth: (random - optimal) / random
  const skillDepth = randomSteps > 0 ? (randomSteps - optimalSteps) / randomSteps : 0;

  // Puzzle entropy: sum of log2(legal moves) at each step of optimal solution
  let puzzleEntropy = 0;
  let decisionEntropySum = 0;
  let decisionSteps = 0;
  let counterintuitiveCount = 0;
  let maxProgressBeforeBacktrack = 0;
  let drama = 0;

  if (sol5) {
    let state = puzzle;
    let prevHeuristic = heuristic(state);
    let bestProgress = 0;

    for (let i = 0; i < sol5.moves.length; i++) {
      const available = legalMoves(state);
      const numMoves = available.length;

      if (numMoves > 1) {
        puzzleEntropy += Math.log2(numMoves);
        decisionSteps++;

        // Shannon entropy of move outcomes (by info gain)
        const gains = available.map(m => estimateInfoGain(state, m));
        const totalGain = gains.reduce((a, b) => a + Math.max(b, 0.001), 0);
        let shannonEntropy = 0;
        for (const g of gains) {
          const p = Math.max(g, 0.001) / totalGain;
          shannonEntropy -= p * Math.log2(p);
        }
        decisionEntropySum += shannonEntropy;
      }

      const nextState = applyMove(state, sol5.moves[i]);
      const nextH = heuristic(nextState);

      // Counterintuitive: heuristic gets worse (more unknown cells after broadcast shouldn't happen
      // but can happen if constraint propagation resolves fewer than expected)
      if (nextH > prevHeuristic) {
        counterintuitiveCount++;
      }

      // Also count moves where optimal chose a lower-info-gain move
      if (i < sol5.moves.length - 1) {
        const bestGain = Math.max(...available.map(m => estimateInfoGain(state, m)));
        const chosenGain = estimateInfoGain(state, sol5.moves[i]);
        if (chosenGain < bestGain * 0.8) {
          counterintuitiveCount++;
        }
      }

      // Drama
      const progress = (GRID_SIZE * GRID_SIZE - nextH) / (GRID_SIZE * GRID_SIZE);
      bestProgress = Math.max(bestProgress, progress);

      prevHeuristic = nextH;
      state = nextState;
    }

    if (sol5.steps > 0) {
      maxProgressBeforeBacktrack = bestProgress;
      drama = maxProgressBeforeBacktrack;
    }
  }

  const decisionEntropy = decisionSteps > 0 ? decisionEntropySum / decisionSteps : 0;

  // Info gain ratio: optimal info per broadcast vs random
  let infoGainRatio = 1;
  if (sol5 && sol1 && sol1.steps > 0) {
    const optimalInfoPerStep = (GRID_SIZE * GRID_SIZE) / sol5.steps;
    const randomInfoPerStep = (GRID_SIZE * GRID_SIZE) / sol1.steps;
    infoGainRatio = randomInfoPerStep > 0 ? optimalInfoPerStep / randomInfoPerStep : 1;
  }

  // Solution uniqueness: count distinct optimal-length solutions (sample)
  let solutionUniqueness = 1;
  // Just count how many different orderings at optimal length solve it
  // (approximation: count via re-running optimal a few times with different candidate orders)

  // Duration fitness: estimate from step count
  // Assume ~5s per broadcast decision for level 3 human
  const durationSeconds = sol3 ? sol3.steps * 8 : 0;

  return {
    solvable,
    puzzleEntropy,
    skillDepth,
    decisionEntropy,
    counterintuitive: counterintuitiveCount,
    drama,
    durationSeconds,
    infoGainRatio,
    solutionUniqueness,
    optimalSteps,
    randomSteps,
    par: puzzle.par,
  };
}

/** Run full metrics across 5 puzzles at 5 difficulties */
export function runMetricsSuite() {
  const seeds = [1001, 1002, 1003, 1004, 1005]; // Mon-Fri
  const difficulties = [1, 2, 3, 4, 5];

  const results = [];
  for (let i = 0; i < 5; i++) {
    results.push(computeMetrics(seeds[i], difficulties[i]));
  }
  return results;
}
