/**
 * Bloom2 Solver
 *
 * Cellular automaton inverse puzzle:
 * Place seeds on a grid. Seeds grow for K generations using rule B23/S23
 * (birth on 2-3 neighbors, survival on 2-3 neighbors).
 * After K generations, the living pattern must match the target shape.
 *
 * Puzzle generation works backwards: start with a target, find seed
 * placements that produce it after K generations.
 */

/* ─── Types ─── */
export type Grid = boolean[][];
export type Pos = { r: number; c: number };
export type Bloom2State = {
  rows: number;
  cols: number;
  seeds: Pos[];           // current seed placements by player
  maxSeeds: number;       // how many seeds the player can place
  target: Grid;           // target pattern to match after K generations
  generations: number;    // K — how many generations to simulate
  prePlaced: Pos[];       // seeds already placed (hints for easy puzzles)
  attemptBudget: number;  // max attempts allowed
  attemptsUsed: number;   // how many times the player has pressed "Grow"
  _solutionSeeds?: Pos[]; // hidden: the known solution (for solver/metrics only)
};

export type Move = Pos; // place or remove a seed at (r,c)

export type Solution = {
  seeds: Pos[];
  steps: number; // number of seeds placed
};

/* ─── Grid Utilities ─── */
export function emptyGrid(rows: number, cols: number): Grid {
  return Array.from({ length: rows }, () => Array(cols).fill(false));
}

function cloneGrid(g: Grid): Grid {
  return g.map(r => [...r]);
}

function gridEqual(a: Grid, b: Grid): boolean {
  for (let r = 0; r < a.length; r++) {
    for (let c = 0; c < a[0].length; c++) {
      if (a[r][c] !== b[r][c]) return false;
    }
  }
  return true;
}

function countNeighbors(grid: Grid, r: number, c: number): number {
  const rows = grid.length;
  const cols = grid[0].length;
  let count = 0;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc]) {
        count++;
      }
    }
  }
  return count;
}

/** Advance grid one generation using B23/S23 rule */
export function stepGeneration(grid: Grid): Grid {
  const rows = grid.length;
  const cols = grid[0].length;
  const next = emptyGrid(rows, cols);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const n = countNeighbors(grid, r, c);
      if (grid[r][c]) {
        next[r][c] = n === 2 || n === 3;
      } else {
        next[r][c] = n === 2 || n === 3;
      }
    }
  }
  return next;
}

/** Run K generations from a seed grid */
export function simulate(seedGrid: Grid, generations: number): Grid {
  let grid = cloneGrid(seedGrid);
  for (let g = 0; g < generations; g++) {
    grid = stepGeneration(grid);
  }
  return grid;
}

/** Build grid from seed positions */
export function seedsToGrid(seeds: Pos[], prePlaced: Pos[], rows: number, cols: number): Grid {
  const grid = emptyGrid(rows, cols);
  for (const p of prePlaced) grid[p.r][p.c] = true;
  for (const p of seeds) grid[p.r][p.c] = true;
  return grid;
}

/** Count live cells in grid */
function liveCellCount(grid: Grid): number {
  let count = 0;
  for (const row of grid) for (const cell of row) if (cell) count++;
  return count;
}

/** Get all live cell positions */
function liveCells(grid: Grid): Pos[] {
  const cells: Pos[] = [];
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[0].length; c++) {
      if (grid[r][c]) cells.push({ r, c });
    }
  }
  return cells;
}

/* ─── Heuristic ─── */
export function heuristic(state: Bloom2State): number {
  const seedGrid = seedsToGrid(state.seeds, state.prePlaced, state.rows, state.cols);
  const result = simulate(seedGrid, state.generations);
  let wrong = 0;
  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      if (result[r][c] !== state.target[r][c]) wrong++;
    }
  }
  return wrong;
}

export function isGoal(state: Bloom2State): boolean {
  if (state.seeds.length + state.prePlaced.length === 0) return false;
  const seedGrid = seedsToGrid(state.seeds, state.prePlaced, state.rows, state.cols);
  const result = simulate(seedGrid, state.generations);
  return gridEqual(result, state.target);
}

/* ─── Legal Moves ─── */
export function legalMoves(state: Bloom2State): Move[] {
  const moves: Move[] = [];
  const occupied = new Set<string>();
  for (const p of state.seeds) occupied.add(`${p.r},${p.c}`);
  for (const p of state.prePlaced) occupied.add(`${p.r},${p.c}`);

  if (state.seeds.length < state.maxSeeds) {
    for (let r = 0; r < state.rows; r++) {
      for (let c = 0; c < state.cols; c++) {
        if (!occupied.has(`${r},${c}`)) {
          moves.push({ r, c });
        }
      }
    }
  }
  for (const p of state.seeds) {
    moves.push({ r: p.r, c: p.c });
  }
  return moves;
}

export function applyMove(state: Bloom2State, move: Move): Bloom2State {
  const key = `${move.r},${move.c}`;
  const preKeys = new Set(state.prePlaced.map(p => `${p.r},${p.c}`));
  if (preKeys.has(key)) return state;

  const idx = state.seeds.findIndex(p => p.r === move.r && p.c === move.c);
  let newSeeds: Pos[];
  if (idx >= 0) {
    newSeeds = [...state.seeds];
    newSeeds.splice(idx, 1);
  } else if (state.seeds.length < state.maxSeeds) {
    newSeeds = [...state.seeds, { r: move.r, c: move.c }];
  } else {
    return state;
  }
  return { ...state, seeds: newSeeds };
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

/* ─── Puzzle Generation ─── */
export function generatePuzzle(seed: number, difficulty: number): Bloom2State {
  const rng = makeRng(seed);

  // Difficulty scaling
  const rows = difficulty <= 2 ? 5 : difficulty <= 4 ? 6 : 7;
  const cols = rows;
  const generations = difficulty <= 2 ? 2 : 3;
  const numSeeds = Math.min(2 + difficulty, 6); // 3,4,5,6,6
  const prePlacedCount = Math.max(0, 3 - difficulty); // 2,1,0,0,0
  const attemptBudget = Math.max(2, 6 - difficulty); // 5,4,3,2,2

  for (let attempt = 0; attempt < 200; attempt++) {
    const totalSeeds = numSeeds;
    const allSeeds: Pos[] = [];
    const used = new Set<string>();

    for (let i = 0; i < totalSeeds; i++) {
      for (let retry = 0; retry < 50; retry++) {
        const r = Math.floor(rng() * rows);
        const c = Math.floor(rng() * cols);
        const key = `${r},${c}`;
        if (!used.has(key)) {
          used.add(key);
          allSeeds.push({ r, c });
          break;
        }
      }
    }
    if (allSeeds.length < totalSeeds) continue;

    const seedGrid = emptyGrid(rows, cols);
    for (const p of allSeeds) seedGrid[p.r][p.c] = true;
    const target = simulate(seedGrid, generations);

    const targetCount = liveCellCount(target);
    const totalCells = rows * cols;
    if (targetCount < 3 || targetCount > totalCells * 0.7) continue;

    // Split seeds into pre-placed and player-placed
    const shuffled = [...allSeeds];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const prePlaced = shuffled.slice(0, prePlacedCount);
    const playerSeeds = shuffled.slice(prePlacedCount);

    return {
      rows,
      cols,
      seeds: [],
      maxSeeds: playerSeeds.length,
      target,
      generations,
      prePlaced,
      attemptBudget,
      attemptsUsed: 0,
      _solutionSeeds: playerSeeds, // store known answer for solver/metrics
    };
  }

  // Fallback: simple puzzle
  const target = emptyGrid(rows, cols);
  const cr = Math.floor(rows / 2);
  const cc = Math.floor(cols / 2);
  target[cr][cc] = true;
  target[cr][cc + 1] = true;
  target[cr + 1][cc] = true;
  target[cr + 1][cc + 1] = true;

  return {
    rows,
    cols,
    seeds: [],
    maxSeeds: numSeeds,
    target,
    generations,
    prePlaced: [],
    attemptBudget,
    attemptsUsed: 0,
  };
}

/* ─── Solver ─── */

/**
 * Compute the "influence zone" — cells within manhattan distance `radius`
 * of any target live cell. Seeds outside this zone cannot affect the target
 * after K generations (each generation extends influence by 1 cell).
 */
function getInfluenceZone(target: Grid, rows: number, cols: number, generations: number): Set<string> {
  const zone = new Set<string>();
  const radius = generations + 1; // seeds can influence target cells up to K+1 away
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (target[r][c]) {
        // Mark all cells within Chebyshev distance radius
        for (let dr = -radius; dr <= radius; dr++) {
          for (let dc = -radius; dc <= radius; dc++) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
              zone.add(`${nr},${nc}`);
            }
          }
        }
      }
    }
  }
  return zone;
}

export function solve(
  puzzle: Bloom2State,
  skillLevel: 1 | 2 | 3 | 4 | 5,
): Solution | null {
  const maxAttempts =
    skillLevel === 1 ? 50 :
    skillLevel === 2 ? 500 :
    skillLevel === 3 ? 5000 :
    skillLevel === 4 ? 100000 :
    2000000;

  const { rows, cols, maxSeeds, target, generations, prePlaced } = puzzle;

  // Build list of candidate cells, filtered by influence zone
  const preSet = new Set(prePlaced.map(p => `${p.r},${p.c}`));
  const influenceZone = getInfluenceZone(target, rows, cols, generations);
  const candidates: Pos[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const key = `${r},${c}`;
      if (!preSet.has(key) && influenceZone.has(key)) {
        candidates.push({ r, c });
      }
    }
  }

  // For skill levels 1-2, use random sampling
  if (skillLevel <= 2) {
    const rng = makeRng(42 + skillLevel);
    for (let i = 0; i < maxAttempts; i++) {
      const seeds: Pos[] = [];
      const used = new Set<string>();
      for (let s = 0; s < maxSeeds; s++) {
        const idx = Math.floor(rng() * candidates.length);
        const p = candidates[idx];
        const key = `${p.r},${p.c}`;
        if (!used.has(key)) {
          used.add(key);
          seeds.push(p);
        }
      }
      if (seeds.length !== maxSeeds) continue;
      const seedGrid = seedsToGrid(seeds, prePlaced, rows, cols);
      const result = simulate(seedGrid, generations);
      if (gridEqual(result, target)) {
        return { seeds, steps: seeds.length };
      }
    }
    return null;
  }

  // For skill levels 3-5, use combinatorial search with pruning
  // Sort candidates: closer to target cells first
  const targetCells = liveCells(target);
  candidates.sort((a, b) => {
    const distA = Math.min(...targetCells.map(t =>
      Math.max(Math.abs(t.r - a.r), Math.abs(t.c - a.c))));
    const distB = Math.min(...targetCells.map(t =>
      Math.max(Math.abs(t.r - b.r), Math.abs(t.c - b.c))));
    return distA - distB;
  });

  let attempts = 0;
  let bestSolution: Solution | null = null;

  function search(chosen: Pos[], startIdx: number): boolean {
    if (attempts >= maxAttempts) return false;

    if (chosen.length === maxSeeds) {
      attempts++;
      const seedGrid = seedsToGrid(chosen, prePlaced, rows, cols);
      const result = simulate(seedGrid, generations);
      if (gridEqual(result, target)) {
        bestSolution = { seeds: [...chosen], steps: chosen.length };
        return true;
      }
      return false;
    }

    // Pruning: if we have enough seeds placed (>= half), simulate partial
    // and check if the result is "compatible" with the target
    if (skillLevel >= 4 && chosen.length >= Math.ceil(maxSeeds / 2) && chosen.length >= 2) {
      const partialGrid = seedsToGrid(chosen, prePlaced, rows, cols);
      const partialResult = simulate(partialGrid, generations);
      // Count cells that are alive in partial result but dead in target
      // If too many "extra" cells, prune
      let extraCells = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (partialResult[r][c] && !target[r][c]) extraCells++;
        }
      }
      // Allow some extra cells (remaining seeds might "fix" things by
      // changing neighbor counts), but too many is hopeless
      if (extraCells > targetCells.length) return false;
    }

    const remaining = maxSeeds - chosen.length;
    for (let i = startIdx; i <= candidates.length - remaining; i++) {
      if (attempts >= maxAttempts) return false;
      chosen.push(candidates[i]);
      if (search(chosen, i + 1)) return true;
      chosen.pop();
    }
    return false;
  }

  search([], 0);
  return bestSolution;
}

/**
 * Find ALL solutions (for uniqueness metric).
 */
export function findAllSolutions(
  puzzle: Bloom2State,
  maxSolutions: number = 10,
  maxAttempts: number = 200000,
): Solution[] {
  const { rows, cols, maxSeeds, target, generations, prePlaced } = puzzle;
  const preSet = new Set(prePlaced.map(p => `${p.r},${p.c}`));
  const influenceZone = getInfluenceZone(target, rows, cols, generations);
  const candidates: Pos[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const key = `${r},${c}`;
      if (!preSet.has(key) && influenceZone.has(key)) {
        candidates.push({ r, c });
      }
    }
  }

  const solutions: Solution[] = [];
  let attempts = 0;

  function search(chosen: Pos[], startIdx: number): void {
    if (attempts >= maxAttempts || solutions.length >= maxSolutions) return;

    if (chosen.length === maxSeeds) {
      attempts++;
      const seedGrid = seedsToGrid(chosen, prePlaced, rows, cols);
      const result = simulate(seedGrid, generations);
      if (gridEqual(result, target)) {
        solutions.push({ seeds: [...chosen], steps: chosen.length });
      }
      return;
    }

    const remaining = maxSeeds - chosen.length;
    for (let i = startIdx; i <= candidates.length - remaining; i++) {
      if (attempts >= maxAttempts || solutions.length >= maxSolutions) return;
      chosen.push(candidates[i]);
      search(chosen, i + 1);
      chosen.pop();
    }
  }

  search([], 0);
  return solutions;
}
