/**
 * Pane Solver
 *
 * Rules: A row of colored gems. Player controls left and right edges of a
 * selection window. Goal: find the smallest window containing at least one
 * gem of every color, within a movement budget.
 *
 * Moves:
 *   'expand'  = move right edge +1 (costs 1 move)
 *   'shrink'  = move left edge +1 (costs 1 move)
 *   'record'  = record current window as candidate (free, requires all colors)
 *
 * The sliding window algorithm (expand right, shrink left, never move right
 * backward) is optimal and uses exactly 2N edge movements.
 */

/* ─── Types ─── */

export type PaneState = {
  gems: number[];           // array of color indices (0, 1, 2, ...)
  numColors: number;        // total distinct colors
  left: number;             // left edge of window (inclusive)
  right: number;            // right edge of window (inclusive), -1 = not started
  colorCounts: Map<number, number>; // count of each color in current window
  coveredColors: number;    // number of distinct colors in window
  moves: number;            // edge movements used
  budget: number;           // max edge movements
  bestWindow: [number, number] | null; // smallest valid window found so far [left, right]
  difficulty: number;       // 1-5
  validWindowsFound: number; // count of valid windows found during search
};

export type Move = 'expand' | 'shrink' | 'record';

export type Solution = {
  moves: Move[];
  steps: number; // number of edge movements (excludes free 'record' moves)
};

/* ─── Helpers ─── */

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

function cloneState(state: PaneState): PaneState {
  return {
    gems: [...state.gems],
    numColors: state.numColors,
    left: state.left,
    right: state.right,
    colorCounts: new Map(state.colorCounts),
    coveredColors: state.coveredColors,
    moves: state.moves,
    budget: state.budget,
    bestWindow: state.bestWindow ? [...state.bestWindow] as [number, number] : null,
    difficulty: state.difficulty,
    validWindowsFound: state.validWindowsFound,
  };
}

function windowSize(state: PaneState): number {
  if (state.right < 0 || state.right < state.left) return 0;
  return state.right - state.left + 1;
}

function bestWindowSize(state: PaneState): number {
  if (!state.bestWindow) return Infinity;
  return state.bestWindow[1] - state.bestWindow[0] + 1;
}

/** Compute the true minimum window using standard sliding window algorithm */
function computeMinWindow(gems: number[], numColors: number): [number, number] | null {
  const n = gems.length;
  const counts = new Map<number, number>();
  let covered = 0;
  let bestLeft = 0;
  let bestRight = n - 1;
  let bestSize = n + 1;
  let left = 0;

  for (let right = 0; right < n; right++) {
    const c = gems[right];
    const prev = counts.get(c) ?? 0;
    counts.set(c, prev + 1);
    if (prev === 0) covered++;

    while (covered === numColors) {
      const size = right - left + 1;
      if (size < bestSize) {
        bestSize = size;
        bestLeft = left;
        bestRight = right;
      }
      const lc = gems[left];
      const lcount = counts.get(lc)!;
      counts.set(lc, lcount - 1);
      if (lcount - 1 === 0) covered--;
      left++;
    }
  }

  if (bestSize > n) return null;
  return [bestLeft, bestRight];
}

/* ─── Core Game Logic ─── */

export function legalMoves(state: PaneState): Move[] {
  const moves: Move[] = [];
  const n = state.gems.length;

  // Can only act if within budget for edge moves
  if (state.moves < state.budget) {
    // Expand: move right edge +1 (only if right < n-1)
    if (state.right < n - 1) {
      moves.push('expand');
    }

    // Shrink: move left edge +1 (only if left <= right and window exists)
    if (state.right >= 0 && state.left <= state.right) {
      moves.push('shrink');
    }
  }

  // Record: free action, but only if all colors present in window
  if (state.right >= 0 && state.coveredColors === state.numColors) {
    // Only allow record if current window is better than best, or no best yet
    const curSize = windowSize(state);
    const curBest = bestWindowSize(state);
    if (curSize < curBest) {
      moves.push('record');
    }
  }

  return moves;
}

export function applyMove(state: PaneState, move: Move): PaneState {
  const next = cloneState(state);

  if (move === 'expand') {
    next.right++;
    next.moves++;
    // Add the new gem at right to counts
    const c = next.gems[next.right];
    const prev = next.colorCounts.get(c) ?? 0;
    next.colorCounts.set(c, prev + 1);
    if (prev === 0) next.coveredColors++;
  } else if (move === 'shrink') {
    // Remove the gem at left from counts
    const c = next.gems[next.left];
    const cnt = next.colorCounts.get(c)!;
    next.colorCounts.set(c, cnt - 1);
    if (cnt - 1 === 0) next.coveredColors--;
    next.left++;
    next.moves++;
  } else if (move === 'record') {
    // Record current window as best candidate
    const curSize = windowSize(next);
    const curBest = bestWindowSize(next);
    if (curSize < curBest) {
      next.bestWindow = [next.left, next.right];
      next.validWindowsFound++;
    }
  }

  return next;
}

export function isGoal(state: PaneState): boolean {
  if (!state.bestWindow) return false;
  // Check if the recorded best window IS the true minimum window
  const trueMin = computeMinWindow(state.gems, state.numColors);
  if (!trueMin) return false;
  const trueSize = trueMin[1] - trueMin[0] + 1;
  const bestSize = state.bestWindow[1] - state.bestWindow[0] + 1;
  return bestSize === trueSize;
}

export function heuristic(state: PaneState): number {
  // Estimate: how many colors still need to be found in the current window
  const missing = state.numColors - state.coveredColors;
  // Also factor in distance to a valid window
  if (state.bestWindow) {
    const curBest = bestWindowSize(state);
    const trueMin = computeMinWindow(state.gems, state.numColors);
    if (trueMin) {
      const trueSize = trueMin[1] - trueMin[0] + 1;
      return curBest - trueSize; // 0 when optimal
    }
  }
  return missing + (state.right < 0 ? state.numColors : 0);
}

/* ─── Puzzle Generation ─── */

export function generatePuzzle(seed: number, difficulty: number): PaneState {
  const rng = makeRng(seed);

  // Difficulty scaling
  let numGems: number, numColors: number, budgetMultiplier: number;
  switch (difficulty) {
    case 1: numGems = 10; numColors = 3; budgetMultiplier = 4; break;
    case 2: numGems = 14; numColors = 3; budgetMultiplier = 3; break;
    case 3: numGems = 20; numColors = 4; budgetMultiplier = 2; break;
    case 4: numGems = 26; numColors = 5; budgetMultiplier = 1.5; break;
    case 5: numGems = 32; numColors = 6; budgetMultiplier = 1.2; break;
    default: numGems = 10; numColors = 3; budgetMultiplier = 4;
  }

  // Try multiple times to get a good puzzle
  for (let attempt = 0; attempt < 50; attempt++) {
    const gems = generateGems(rng, numGems, numColors);
    const minWindow = computeMinWindow(gems, numColors);
    if (!minWindow) continue;

    const [minL, minR] = minWindow;
    const minSize = minR - minL + 1;

    // Reject trivial puzzles: minimum window shouldn't be at the very edges
    // or span almost the entire array
    if (minL === 0 && minR === numGems - 1) continue;
    if (minSize >= numGems - 1) continue;
    // For harder difficulties, reject if the minimum window is too easy to find
    if (difficulty >= 3 && (minL <= 1 || minR >= numGems - 2)) continue;

    // Ensure the minimum window is unique (only one window of that size)
    let uniqueCount = 0;
    for (let l = 0; l <= numGems - minSize; l++) {
      const r = l + minSize - 1;
      // Check if [l, r] contains all colors
      const counts = new Map<number, number>();
      for (let i = l; i <= r; i++) {
        counts.set(gems[i], (counts.get(gems[i]) ?? 0) + 1);
      }
      if (counts.size === numColors) uniqueCount++;
    }
    // Allow at most 2 minimum windows (for some drama)
    if (uniqueCount === 0 || uniqueCount > 2) continue;

    // Optimal sliding window uses exactly 2N edge movements
    const optimalMoves = 2 * numGems;
    const budget = Math.floor(optimalMoves * budgetMultiplier);

    return {
      gems,
      numColors,
      left: 0,
      right: -1,
      colorCounts: new Map(),
      coveredColors: 0,
      moves: 0,
      budget,
      bestWindow: null,
      difficulty,
      validWindowsFound: 0,
    };
  }

  // Fallback: generate a simple puzzle
  const gems = generateSimpleGems(rng, numGems, numColors);
  const optimalMoves = 2 * numGems;
  const budget = Math.floor(optimalMoves * budgetMultiplier);

  return {
    gems,
    numColors,
    left: 0,
    right: -1,
    colorCounts: new Map(),
    coveredColors: 0,
    moves: 0,
    budget,
    bestWindow: null,
    difficulty,
    validWindowsFound: 0,
  };
}

function generateGems(rng: () => number, numGems: number, numColors: number): number[] {
  const gems: number[] = [];

  // Ensure each color appears at least 2-3 times
  const minPerColor = numGems >= 20 ? 3 : 2;

  // First, place minimum required gems for each color
  const pool: number[] = [];
  for (let c = 0; c < numColors; c++) {
    for (let i = 0; i < minPerColor; i++) {
      pool.push(c);
    }
  }

  // Fill remaining with random colors
  while (pool.length < numGems) {
    pool.push(Math.floor(rng() * numColors));
  }

  // Shuffle using Fisher-Yates
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool;
}

function generateSimpleGems(_rng: () => number, numGems: number, numColors: number): number[] {
  // Simple distribution: repeat colors in order, ensuring each appears enough
  const gems: number[] = [];
  for (let i = 0; i < numGems; i++) {
    gems.push(i % numColors);
  }
  return gems;
}

/* ─── Solvers ─── */

export function solve(
  puzzle: PaneState,
  skillLevel: 1 | 2 | 3 | 4 | 5,
): Solution | null {
  if (skillLevel === 1) return solveRandom(puzzle);
  if (skillLevel === 2) return solveBruteForce(puzzle);
  if (skillLevel === 3) return solveBruteForceEarly(puzzle);
  if (skillLevel === 4) return solveSlidingWindow(puzzle);
  return solveSlidingWindowOptimal(puzzle);
}

/** Level 1: Random expand/shrink */
function solveRandom(puzzle: PaneState): Solution | null {
  let state = cloneState(puzzle);
  state.moves = 0;
  state.bestWindow = null;
  state.validWindowsFound = 0;
  state.left = 0;
  state.right = -1;
  state.colorCounts = new Map();
  state.coveredColors = 0;
  const moveList: Move[] = [];
  const maxIter = state.budget * 3;

  for (let i = 0; i < maxIter && state.moves < state.budget; i++) {
    const legal = legalMoves(state);
    if (legal.length === 0) break;

    // Prefer record if available
    if (legal.includes('record')) {
      state = applyMove(state, 'record');
      moveList.push('record');
      if (isGoal(state)) return { moves: moveList, steps: state.moves };
      continue;
    }

    // Random choice between expand and shrink
    const pick = legal[Math.floor(Math.random() * legal.length)];
    state = applyMove(state, pick);
    moveList.push(pick);
  }

  // Final check
  if (isGoal(state)) return { moves: moveList, steps: state.moves };
  return null;
}

/** Level 2: Brute force -- for each left position, expand right until valid, record */
function solveBruteForce(puzzle: PaneState): Solution | null {
  let state = cloneState(puzzle);
  state.moves = 0;
  state.bestWindow = null;
  state.validWindowsFound = 0;
  state.left = 0;
  state.right = -1;
  state.colorCounts = new Map();
  state.coveredColors = 0;
  const moveList: Move[] = [];
  const n = state.gems.length;

  // For each starting left position
  for (let targetLeft = 0; targetLeft < n && state.moves < state.budget; targetLeft++) {
    // Reset: shrink window completely, then rebuild from targetLeft
    // This is the brute force approach -- for each left, scan right from left

    // First, shrink to empty the window
    while (state.right >= 0 && state.left <= state.right && state.moves < state.budget) {
      state = applyMove(state, 'shrink');
      moveList.push('shrink');
    }

    // Now we need to rebuild: expand right from current position to targetLeft-1, then start expanding
    // Actually for brute force, we restart: set window to start at targetLeft
    // Since we can only move edges forward, we need to expand right edge to get past targetLeft
    // But left edge is already past targetLeft after shrinks...

    // Brute force approach: expand right until all colors found
    while (state.coveredColors < state.numColors && state.right < n - 1 && state.moves < state.budget) {
      state = applyMove(state, 'expand');
      moveList.push('expand');
    }

    // Record if valid
    if (state.coveredColors === state.numColors) {
      const legal = legalMoves(state);
      if (legal.includes('record')) {
        state = applyMove(state, 'record');
        moveList.push('record');
        if (isGoal(state)) return { moves: moveList, steps: state.moves };
      }
    }

    // Shrink left by 1 to try next left position
    if (state.left <= state.right && state.moves < state.budget) {
      state = applyMove(state, 'shrink');
      moveList.push('shrink');
    }
  }

  if (isGoal(state)) return { moves: moveList, steps: state.moves };
  return null;
}

/** Level 3: Brute force + early termination when budget is low */
function solveBruteForceEarly(puzzle: PaneState): Solution | null {
  let state = cloneState(puzzle);
  state.moves = 0;
  state.bestWindow = null;
  state.validWindowsFound = 0;
  state.left = 0;
  state.right = -1;
  state.colorCounts = new Map();
  state.coveredColors = 0;
  const moveList: Move[] = [];
  const n = state.gems.length;

  // Similar to brute force but stops early when budget is running low
  // Expand right until valid, record, shrink left, repeat
  // But when budget < remaining_gems, stop expanding and just shrink

  // Phase 1: expand right until all colors found
  while (state.coveredColors < state.numColors && state.right < n - 1 && state.moves < state.budget) {
    state = applyMove(state, 'expand');
    moveList.push('expand');
  }

  // Phase 2: try to find minimum by shrink + expand
  while (state.moves < state.budget) {
    // Record if valid
    if (state.coveredColors === state.numColors) {
      const legal = legalMoves(state);
      if (legal.includes('record')) {
        state = applyMove(state, 'record');
        moveList.push('record');
        if (isGoal(state)) return { moves: moveList, steps: state.moves };
      }
    }

    // Early termination: if budget is nearly exhausted, stop
    const remaining = state.budget - state.moves;
    if (remaining <= 2) break;

    // Shrink left
    if (state.left <= state.right && state.moves < state.budget) {
      state = applyMove(state, 'shrink');
      moveList.push('shrink');
    } else {
      break;
    }

    // If we lost a color, expand right to recover it
    while (state.coveredColors < state.numColors && state.right < n - 1 && state.moves < state.budget) {
      state = applyMove(state, 'expand');
      moveList.push('expand');
    }

    // If right reached end and still missing colors, we're done
    if (state.right >= n - 1 && state.coveredColors < state.numColors) break;
  }

  // Final record attempt
  if (state.coveredColors === state.numColors) {
    const legal = legalMoves(state);
    if (legal.includes('record')) {
      state = applyMove(state, 'record');
      moveList.push('record');
    }
  }

  if (isGoal(state)) return { moves: moveList, steps: state.moves };
  return null;
}

/**
 * Level 4: Sliding window algorithm
 * Expand right until all colors present. Shrink left until invalid.
 * Record after each valid shrink. Never move right edge backward.
 * Uses exactly 2N edge movements.
 */
function solveSlidingWindow(puzzle: PaneState): Solution | null {
  let state = cloneState(puzzle);
  state.moves = 0;
  state.bestWindow = null;
  state.validWindowsFound = 0;
  state.left = 0;
  state.right = -1;
  state.colorCounts = new Map();
  state.coveredColors = 0;
  const moveList: Move[] = [];
  const n = state.gems.length;

  while (state.right < n - 1 || state.coveredColors === state.numColors) {
    if (state.moves >= state.budget) break;

    if (state.coveredColors < state.numColors) {
      // Expand right
      if (state.right >= n - 1) break;
      state = applyMove(state, 'expand');
      moveList.push('expand');
    } else {
      // Record current valid window
      const legal = legalMoves(state);
      if (legal.includes('record')) {
        state = applyMove(state, 'record');
        moveList.push('record');
        if (isGoal(state)) return { moves: moveList, steps: state.moves };
      }

      // Shrink left to try to find smaller window
      if (state.left <= state.right && state.moves < state.budget) {
        state = applyMove(state, 'shrink');
        moveList.push('shrink');
      } else {
        break;
      }
    }
  }

  // Final record if we have a valid window
  if (state.coveredColors === state.numColors) {
    const legal = legalMoves(state);
    if (legal.includes('record')) {
      state = applyMove(state, 'record');
      moveList.push('record');
    }
  }

  if (isGoal(state)) return { moves: moveList, steps: state.moves };
  return null;
}

/**
 * Level 5: Sliding window with optimal starting direction
 * Analyzes color distribution to decide optimal search direction.
 * Still uses the same monotonic sliding window, but with smarter starting.
 */
function solveSlidingWindowOptimal(puzzle: PaneState): Solution | null {
  // Try both starting from left and from right (reversed), pick the one
  // that uses fewer moves
  const leftResult = solveSlidingWindow(puzzle);

  // Try reversed: reverse gems, solve, un-reverse the result
  const reversed = cloneState(puzzle);
  reversed.gems = [...puzzle.gems].reverse();
  const rightResult = solveSlidingWindow(reversed);

  if (!leftResult && !rightResult) return null;
  if (!leftResult) return rightResult;
  if (!rightResult) return leftResult;
  return leftResult.steps <= rightResult.steps ? leftResult : rightResult;
}
