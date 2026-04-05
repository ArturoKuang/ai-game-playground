/**
 * Rift Solver
 *
 * A 2D terrain grid with a hidden fault line (monotonic curve). Player drops
 * seismic probes to find the fault boundary. Each probe reveals "stable" or
 * "unstable." Goal: trace the entire fault line within a probe budget.
 *
 * Algorithm target: Binary Search — each probe that bisects the unknown range
 * finds the boundary in ceil(log2(cols)) probes instead of linear scan.
 */

import { seededRandom } from '../utils/seed';

/* ─── Types ─── */

export type RiftState = {
  rows: number;
  cols: number;
  faultLine: number[]; // faultLine[row] = column index of boundary (hidden from player)
  probes: Map<string, boolean>; // "row,col" -> true=stable, false=unstable
  budget: number; // remaining probes
  difficulty: number; // 1-5
  traced: boolean[]; // traced[row] = whether fault boundary found for this row
};

export type Move = { row: number; col: number };

export type Solution = {
  moves: Move[];
  steps: number; // total probes used
};

/* ─── Difficulty configs ─── */

type DiffConfig = {
  rows: number;
  cols: number;
  maxShift: number;
  budgetMultiplier: number;
};

const DIFF_CONFIGS: Record<number, DiffConfig> = {
  1: { rows: 4, cols: 6, maxShift: 1, budgetMultiplier: 3.0 },
  2: { rows: 6, cols: 8, maxShift: 1, budgetMultiplier: 2.0 },
  3: { rows: 8, cols: 10, maxShift: 2, budgetMultiplier: 1.5 },
  4: { rows: 10, cols: 12, maxShift: 2, budgetMultiplier: 1.3 },
  5: { rows: 12, cols: 16, maxShift: 3, budgetMultiplier: 1.1 },
};

/* ─── Helpers ─── */

function probeKey(row: number, col: number): string {
  return `${row},${col}`;
}

/** Compute optimal probes needed per row (binary search) */
function optimalProbesPerRow(cols: number): number {
  return Math.ceil(Math.log2(cols));
}

/** Check if a row is traced: adjacent probes with different stability exist */
function isRowTraced(
  row: number,
  cols: number,
  faultLine: number[],
  probes: Map<string, boolean>,
): boolean {
  const boundary = faultLine[row];
  // Boundary is between col boundary-1 (stable) and col boundary (unstable)
  // A row is traced when we've probed both sides of the boundary
  // i.e., we have a stable probe and an unstable probe that are adjacent
  // OR we know the boundary is at col 0 (all unstable) or col cols (all stable)

  // Check for adjacent probes straddling the boundary
  for (let c = 0; c < cols - 1; c++) {
    const k1 = probeKey(row, c);
    const k2 = probeKey(row, c + 1);
    if (probes.has(k1) && probes.has(k2)) {
      const v1 = probes.get(k1)!;
      const v2 = probes.get(k2)!;
      if (v1 !== v2) return true; // boundary found between c and c+1
    }
  }

  // Edge cases: if boundary is at 0 (all unstable) and we probed col 0 as unstable
  if (boundary === 0) {
    const k = probeKey(row, 0);
    if (probes.has(k) && !probes.get(k)!) return true;
  }
  // If boundary is at cols (all stable) and we probed col cols-1 as stable
  if (boundary >= cols) {
    const k = probeKey(row, cols - 1);
    if (probes.has(k) && probes.get(k)!) return true;
  }

  return false;
}

/** Update traced array based on current probes */
function updateTraced(state: RiftState): boolean[] {
  return state.traced.map((_, row) =>
    isRowTraced(row, state.cols, state.faultLine, state.probes),
  );
}

/* ─── Core API ─── */

export function generatePuzzle(seed: number, difficulty: number): RiftState {
  const rng = seededRandom(seed);
  const config = DIFF_CONFIGS[difficulty] || DIFF_CONFIGS[3];
  const { rows, cols, maxShift, budgetMultiplier } = config;

  // Generate monotonic-ish fault line
  const faultLine: number[] = [];
  // Start at a random column in the middle third
  let col = Math.floor(cols / 3 + rng() * (cols / 3));
  for (let r = 0; r < rows; r++) {
    faultLine.push(col);
    // Shift for next row
    const shift = Math.floor(rng() * (maxShift * 2 + 1)) - maxShift;
    col = Math.max(1, Math.min(cols - 1, col + shift)); // Keep boundary within grid (1 to cols-1)
  }

  // Compute budget: optimal probes * multiplier
  const optimalTotal = rows * optimalProbesPerRow(cols);
  const budget = Math.ceil(optimalTotal * budgetMultiplier);

  return {
    rows,
    cols,
    faultLine,
    probes: new Map(),
    budget,
    difficulty,
    traced: new Array(rows).fill(false),
  };
}

export function legalMoves(state: RiftState): Move[] {
  if (state.budget <= 0) return [];
  const moves: Move[] = [];
  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      if (!state.probes.has(probeKey(r, c))) {
        moves.push({ row: r, col: c });
      }
    }
  }
  return moves;
}

export function applyMove(state: RiftState, move: Move): RiftState {
  const key = probeKey(move.row, move.col);
  if (state.probes.has(key) || state.budget <= 0) return state;

  const newProbes = new Map(state.probes);
  // Stable if column < faultLine[row], unstable if >= faultLine[row]
  const isStable = move.col < state.faultLine[move.row];
  newProbes.set(key, isStable);

  const newState: RiftState = {
    ...state,
    probes: newProbes,
    budget: state.budget - 1,
    traced: [...state.traced],
  };

  // Update traced for the affected row
  newState.traced = updateTraced(newState);

  return newState;
}

export function isGoal(state: RiftState): boolean {
  return state.traced.every((t) => t);
}

/**
 * Heuristic: budget pressure = estimated probes still needed minus remaining budget.
 *
 * estimatedNeeded = sum over untraced rows of ceil(log2(unknownRange + 1))
 * budgetPressure = estimatedNeeded - budget
 *
 * A probe that narrows a range reduces estimatedNeeded by ~1 and budget by 1 -> neutral.
 * A probe that lands in an uninformative spot (e.g., probing stable terrain far from
 * the boundary) wastes budget without reducing estimatedNeeded much -> heuristic INCREASES.
 * This creates counterintuitive moves: sometimes the globally optimal probe bisects an
 * unexpected row, but a greedy player would probe the row they're already working on.
 *
 * Higher = worse (more pressure), goal is to reach 0 untraced rows.
 */
export function heuristic(state: RiftState): number {
  let estimatedNeeded = 0;
  let untracedRows = 0;
  for (let r = 0; r < state.rows; r++) {
    if (state.traced[r]) continue;
    untracedRows++;
    // Compute unknown range for this row
    let lo = 0;
    let hi = state.cols - 1;
    let hasProbe = false;
    for (let c = 0; c < state.cols; c++) {
      const key = probeKey(r, c);
      if (state.probes.has(key)) {
        hasProbe = true;
        const isStable = state.probes.get(key)!;
        if (isStable) {
          lo = Math.max(lo, c + 1);
        } else {
          hi = Math.min(hi, c);
        }
      }
    }
    const unknownRange = Math.max(0, hi - lo + 1);
    if (unknownRange <= 0) {
      // Boundary pinpointed but not yet traced — need 1 adjacent probe
      estimatedNeeded += 1;
    } else if (!hasProbe) {
      // No probes in this row yet — need full binary search
      estimatedNeeded += Math.ceil(Math.log2(state.cols)) + 1;
    } else {
      estimatedNeeded += Math.ceil(Math.log2(unknownRange + 1));
    }
  }
  // Budget pressure: positive means we need more probes than budget allows
  // Scale untraced rows heavily to ensure completion is rewarded
  return estimatedNeeded + untracedRows * 3 - state.budget * 0.5;
}

/* ─── Solver ─── */

/**
 * Solver at multiple skill levels:
 * 1: Random valid probe
 * 2: Linear scan along edge (greedy)
 * 3: Greedy + use adjacent row results as starting guess
 * 4: Binary search per row (independent)
 * 5: Binary search per row + cross-row inference
 */
export function solve(
  puzzle: RiftState,
  skillLevel: 1 | 2 | 3 | 4 | 5,
): Solution | null {
  // Clone state
  let state: RiftState = {
    ...puzzle,
    probes: new Map(puzzle.probes),
    traced: [...puzzle.traced],
    budget: puzzle.budget,
  };

  const moves: Move[] = [];

  switch (skillLevel) {
    case 1:
      return solveRandom(state, moves);
    case 2:
      return solveLinearScan(state, moves);
    case 3:
      return solveGreedyAdjacent(state, moves);
    case 4:
      return solveBinarySearch(state, moves, false);
    case 5:
      return solveBinarySearch(state, moves, true);
    default:
      return null;
  }
}

function doProbe(state: RiftState, move: Move, moves: Move[]): RiftState {
  moves.push(move);
  return applyMove(state, move);
}

/** Level 1: Random probes until solved or budget exhausted */
function solveRandom(state: RiftState, moves: Move[]): Solution | null {
  const rng = seededRandom(42);
  while (!isGoal(state) && state.budget > 0) {
    const legal = legalMoves(state);
    if (legal.length === 0) break;
    const idx = Math.floor(rng() * legal.length);
    state = doProbe(state, legal[idx], moves);
  }
  return isGoal(state) ? { moves, steps: moves.length } : null;
}

/** Level 2: Linear scan — for each untraced row, scan from left to right */
function solveLinearScan(state: RiftState, moves: Move[]): Solution | null {
  for (let r = 0; r < state.rows; r++) {
    if (state.traced[r]) continue;
    // Scan from left to right until we find the boundary
    for (let c = 0; c < state.cols; c++) {
      if (state.budget <= 0) break;
      if (state.probes.has(probeKey(r, c))) continue;
      state = doProbe(state, { row: r, col: c }, moves);
      if (state.traced[r]) break;
    }
  }
  return isGoal(state) ? { moves, steps: moves.length } : null;
}

/** Level 3: Greedy + adjacent row inference — start near last known boundary */
function solveGreedyAdjacent(state: RiftState, moves: Move[]): Solution | null {
  let lastBoundaryGuess = Math.floor(state.cols / 2);

  for (let r = 0; r < state.rows; r++) {
    if (state.traced[r]) continue;

    // Start scanning from the last known boundary position
    let c = lastBoundaryGuess;
    // First probe the guess
    if (!state.probes.has(probeKey(r, c)) && state.budget > 0) {
      state = doProbe(state, { row: r, col: c }, moves);
    }

    if (state.traced[r]) {
      lastBoundaryGuess = findBoundaryFromProbes(r, state);
      continue;
    }

    // Determine which direction to scan
    const guessResult = state.probes.get(probeKey(r, c));
    if (guessResult === true) {
      // Stable — scan right to find boundary
      for (let cc = c + 1; cc < state.cols && state.budget > 0; cc++) {
        if (state.probes.has(probeKey(r, cc))) continue;
        state = doProbe(state, { row: r, col: cc }, moves);
        if (state.traced[r]) break;
      }
    } else {
      // Unstable — scan left to find boundary
      for (let cc = c - 1; cc >= 0 && state.budget > 0; cc--) {
        if (state.probes.has(probeKey(r, cc))) continue;
        state = doProbe(state, { row: r, col: cc }, moves);
        if (state.traced[r]) break;
      }
    }

    if (state.traced[r]) {
      lastBoundaryGuess = findBoundaryFromProbes(r, state);
    }
  }
  return isGoal(state) ? { moves, steps: moves.length } : null;
}

/** Find the boundary column from probes in a traced row */
function findBoundaryFromProbes(row: number, state: RiftState): number {
  for (let c = 0; c < state.cols - 1; c++) {
    const k1 = probeKey(row, c);
    const k2 = probeKey(row, c + 1);
    if (state.probes.has(k1) && state.probes.has(k2)) {
      const v1 = state.probes.get(k1)!;
      const v2 = state.probes.get(k2)!;
      if (v1 !== v2) return c + 1; // boundary is at c+1
    }
  }
  return Math.floor(state.cols / 2);
}

/**
 * Level 4-5: Binary search per row.
 * Level 5 adds cross-row inference to narrow initial search range.
 */
function solveBinarySearch(
  state: RiftState,
  moves: Move[],
  crossRowInference: boolean,
): Solution | null {
  const config = DIFF_CONFIGS[state.difficulty] || DIFF_CONFIGS[3];
  const maxShift = config.maxShift;
  const knownBoundaries: (number | null)[] = new Array(state.rows).fill(null);

  for (let r = 0; r < state.rows; r++) {
    if (state.traced[r]) {
      knownBoundaries[r] = findBoundaryFromProbes(r, state);
      continue;
    }

    // Determine search range
    let lo = 0;
    let hi = state.cols - 1;

    if (crossRowInference) {
      // Use adjacent rows' known boundaries to narrow search range
      // Check previous rows
      for (let pr = r - 1; pr >= 0; pr--) {
        if (knownBoundaries[pr] !== null) {
          const dist = r - pr;
          const minBound = knownBoundaries[pr]! - dist * maxShift;
          const maxBound = knownBoundaries[pr]! + dist * maxShift;
          lo = Math.max(lo, minBound - 1);
          hi = Math.min(hi, maxBound + 1);
          break;
        }
      }
      // Check subsequent rows (already solved ones, if processing out of order)
      for (let nr = r + 1; nr < state.rows; nr++) {
        if (knownBoundaries[nr] !== null) {
          const dist = nr - r;
          const minBound = knownBoundaries[nr]! - dist * maxShift;
          const maxBound = knownBoundaries[nr]! + dist * maxShift;
          lo = Math.max(lo, minBound - 1);
          hi = Math.min(hi, maxBound + 1);
          break;
        }
      }
      lo = Math.max(0, lo);
      hi = Math.min(state.cols - 1, hi);
    }

    // Binary search within [lo, hi] to find the boundary
    while (lo <= hi && state.budget > 0 && !state.traced[r]) {
      const mid = Math.floor((lo + hi) / 2);
      if (!state.probes.has(probeKey(r, mid))) {
        state = doProbe(state, { row: r, col: mid }, moves);
      }

      if (state.traced[r]) break;

      const midResult = state.probes.get(probeKey(r, mid));
      if (midResult === true) {
        // Stable — boundary is to the right
        lo = mid + 1;
      } else {
        // Unstable — boundary is to the left or here
        hi = mid - 1;
      }
    }

    // If still not traced after binary search converged, probe the boundary neighbors
    if (!state.traced[r] && state.budget > 0) {
      // Try probing lo and lo-1 (the converged boundary area)
      for (const c of [lo, lo - 1, hi, hi + 1]) {
        if (c >= 0 && c < state.cols && !state.probes.has(probeKey(r, c)) && state.budget > 0) {
          state = doProbe(state, { row: r, col: c }, moves);
          if (state.traced[r]) break;
        }
      }
    }

    if (state.traced[r]) {
      knownBoundaries[r] = findBoundaryFromProbes(r, state);
    }
  }

  return isGoal(state) ? { moves, steps: moves.length } : null;
}

/* ─── Algorithm Alignment ─── */

/**
 * Compute what fraction of moves bisect the unknown range (match binary search).
 * A move "bisects" if it's within 1 cell of the midpoint of the remaining unknown range for that row.
 */
export function computeAlgorithmAlignment(
  puzzle: RiftState,
  moves: Move[],
): number {
  if (moves.length === 0) return 0;

  let matchingMoves = 0;
  // Track unknown range per row
  const ranges: Map<number, { lo: number; hi: number }> = new Map();

  for (const move of moves) {
    const { row, col } = move;
    if (!ranges.has(row)) {
      ranges.set(row, { lo: 0, hi: puzzle.cols - 1 });
    }
    const range = ranges.get(row)!;
    const mid = Math.floor((range.lo + range.hi) / 2);

    // Check if this move bisects (within 1 of midpoint)
    if (Math.abs(col - mid) <= 1) {
      matchingMoves++;
    }

    // Update range based on result
    const isStable = col < puzzle.faultLine[row];
    if (isStable) {
      range.lo = Math.max(range.lo, col + 1);
    } else {
      range.hi = Math.min(range.hi, col - 1);
    }
  }

  return matchingMoves / moves.length;
}
