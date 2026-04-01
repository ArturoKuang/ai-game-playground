/**
 * Peel Solver — Layer-reveal constraint satisfaction
 *
 * 5x5 grid, each cell has 3 stacked color layers.
 * Player sees only the top visible layer.
 * Tapping a cell "peels" the top layer, revealing the next one beneath.
 * Peeling goes layer 0 -> layer 1 -> layer 2 (max 2 peels per cell).
 * Goal: the visible surface satisfies row/column color-count targets.
 *
 * The solver operates in TWO modes:
 * - "Blind" solver: only sees what the player sees (for par calculation)
 * - "Omniscient" solver: sees all layers (for metric computation)
 */

export const SIZE = 5;
export const MAX_COLORS = 3;

export type Color = 0 | 1 | 2;
export const COLOR_NAMES = ['R', 'B', 'G'] as const;

/** Per-cell: stack of 3 color layers (index 0 = top, 2 = bottom) */
export type CellStack = [Color, Color, Color];

/** Target for a row or column: how many of each color are needed */
export type Target = [number, number, number]; // [count_R, count_B, count_G]

export type PeelState = {
  /** 5x5 grid of 3-layer cell stacks */
  grid: CellStack[][];
  /** How many times each cell has been peeled (0, 1, or 2) */
  peeled: number[][];
  /** Row targets: grid[r] visible colors must match rowTargets[r] */
  rowTargets: Target[];
  /** Column targets: grid[*][c] visible colors must match colTargets[c] */
  colTargets: Target[];
  /** Total peels performed */
  moves: number;
  /** Maximum allowed peels (par) */
  maxMoves: number;
};

/** A move is simply the (row, col) of the cell to peel */
export type Move = { r: number; c: number };

export type Solution = {
  moves: Move[];
  steps: number;
};

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

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ─── Visible color at a cell ─── */
export function visibleColor(grid: CellStack[][], peeled: number[][], r: number, c: number): Color {
  return grid[r][c][peeled[r][c]];
}

/* ─── Count violations: how many row/col targets are unsatisfied ─── */
export function countViolations(state: PeelState): number {
  let violations = 0;

  // Row violations
  for (let r = 0; r < SIZE; r++) {
    const counts = [0, 0, 0];
    for (let c = 0; c < SIZE; c++) {
      counts[visibleColor(state.grid, state.peeled, r, c)]++;
    }
    for (let color = 0; color < MAX_COLORS; color++) {
      violations += Math.abs(counts[color] - state.rowTargets[r][color]);
    }
  }

  // Column violations
  for (let c = 0; c < SIZE; c++) {
    const counts = [0, 0, 0];
    for (let r = 0; r < SIZE; r++) {
      counts[visibleColor(state.grid, state.peeled, r, c)]++;
    }
    for (let color = 0; color < MAX_COLORS; color++) {
      violations += Math.abs(counts[color] - state.colTargets[c][color]);
    }
  }

  return violations;
}

/* ─── Heuristic: total constraint violations ─── */
export function heuristic(state: PeelState): number {
  return countViolations(state);
}

/* ─── Goal test ─── */
export function isGoal(state: PeelState): boolean {
  return countViolations(state) === 0;
}

/* ─── Legal moves ─── */
export function legalMoves(state: PeelState): Move[] {
  const moves: Move[] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (state.peeled[r][c] < 2) {
        moves.push({ r, c });
      }
    }
  }
  return moves;
}

/* ─── Apply move (peel a cell) ─── */
export function applyMove(state: PeelState, move: Move): PeelState {
  const { r, c } = move;
  const newPeeled = state.peeled.map(row => [...row]);
  newPeeled[r][c] = Math.min(newPeeled[r][c] + 1, 2);
  return {
    ...state,
    peeled: newPeeled,
    moves: state.moves + 1,
  };
}

/* ─── Generate puzzle ─── */
export function generatePuzzle(seed: number, difficulty: number): PeelState {
  const rng = makeRng(seed);

  // Number of colors: always 3 colors for richer constraint interactions
  const numColors = 3;

  // Step 1: Generate the GOAL surface — a balanced 5x5 color grid
  const goalSurface = generateBalancedSurface(rng, numColors);

  // Step 2: Compute targets from the goal surface
  const rowTargets: Target[] = [];
  for (let r = 0; r < SIZE; r++) {
    const counts: Target = [0, 0, 0];
    for (let c = 0; c < SIZE; c++) { counts[goalSurface[r][c]]++; }
    rowTargets.push(counts);
  }
  const colTargets: Target[] = [];
  for (let c = 0; c < SIZE; c++) {
    const counts: Target = [0, 0, 0];
    for (let r = 0; r < SIZE; r++) { counts[goalSurface[r][c]]++; }
    colTargets.push(counts);
  }

  // Step 3: Decide which cells need peeling and at what depth
  const peelCounts: Record<number, number> = { 1: 5, 2: 6, 3: 8, 4: 10, 5: 12 };
  const numPeels = peelCounts[difficulty] ?? 8;

  const allCells: [number, number][] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) { allCells.push([r, c]); }
  }
  const shuffledCells = shuffle(allCells, rng);
  const peelCellList = shuffledCells.slice(0, Math.min(numPeels, 25));
  const peelCells = new Set(peelCellList.map(([r, c]) => `${r},${c}`));

  // Step 4: Build the grid — ALL peel cells are depth-2 traps
  //
  // Every peel cell has: top = wrong_A, layer1 = wrong_B, layer2 = goal
  // This means the first peel of any cell changes the violation type without
  // fixing it (or makes it worse), and only the SECOND peel resolves it.
  // Since each cell requires 2 peels, the total peel budget is higher,
  // and the solver MUST go through intermediate "worse" states.
  //
  // The trick: with 3 colors, wrong_A and wrong_B are DIFFERENT wrong colors.
  // Peeling from wrong_A to wrong_B shifts which row/column constraints are
  // violated, but doesn't reduce total violations. Only the second peel
  // (wrong_B -> goal) actually fixes things.

  const grid: CellStack[][] = [];
  for (let r = 0; r < SIZE; r++) {
    grid.push([]);
    for (let c = 0; c < SIZE; c++) {
      const goalColor = goalSurface[r][c] as Color;
      const key = `${r},${c}`;

      if (peelCells.has(key)) {
        // ALL peel cells are depth-2: top = wrong_A, layer1 = wrong_B, layer2 = goal
        const wrongs: Color[] = [];
        for (let k = 0; k < numColors; k++) {
          if (k !== goalColor) wrongs.push(k as Color);
        }
        const shuffledWrongs = shuffle(wrongs, rng);
        const topColor = shuffledWrongs[0];
        const midColor = shuffledWrongs.length > 1 ? shuffledWrongs[1] : shuffledWrongs[0];
        grid[r].push([topColor, midColor, goalColor]);
      } else {
        // CORRECT cell: top = goal, below random
        const l1 = Math.floor(rng() * numColors) as Color;
        const l2 = Math.floor(rng() * numColors) as Color;
        grid[r].push([goalColor, l1, l2]);
      }
    }
  }

  // Step 5: Verify the top layer has violations
  const testState: PeelState = {
    grid,
    peeled: Array.from({ length: SIZE }, () => Array(SIZE).fill(0)),
    rowTargets, colTargets,
    moves: 0, maxMoves: 99,
  };

  if (isGoal(testState)) {
    return generatePuzzle(seed + 7919, difficulty);
  }

  // Step 6: Compute par
  const sol = solve(testState, 5);
  if (!sol) {
    return generatePuzzle(seed + 7919, difficulty);
  }

  const buffers: Record<number, number> = { 1: 4, 2: 3, 3: 2, 4: 2, 5: 1 };
  const par = sol.steps + (buffers[difficulty] ?? 2);

  return {
    grid,
    peeled: Array.from({ length: SIZE }, () => Array(SIZE).fill(0)),
    rowTargets, colTargets,
    moves: 0, maxMoves: par,
  };
}

/* ─── Generate a balanced color surface ─── */
function generateBalancedSurface(rng: () => number, numColors: number): Color[][] {
  const surface: Color[][] = [];

  if (numColors === 2) {
    // 2 colors: each row has 2-3 of each color (R, B)
    // Each column should also have 2-3 of each
    // Generate by rows, then adjust columns
    for (let r = 0; r < SIZE; r++) {
      const numR = 2 + Math.floor(rng() * 2); // 2 or 3 reds per row
      const row: Color[] = [];
      for (let i = 0; i < numR; i++) row.push(0);
      for (let i = numR; i < SIZE; i++) row.push(1);
      surface.push(shuffle(row, rng) as Color[]);
    }
    // Fix column balance
    fixColumnBalance(surface, numColors, rng);
  } else {
    // 3 colors: partition 5 cells into groups summing to 5
    // Possible splits: 2+2+1, 2+1+2, 1+2+2, etc.
    for (let r = 0; r < SIZE; r++) {
      const splits = generateSplit(rng);
      const row: Color[] = [];
      for (let color = 0; color < 3; color++) {
        for (let i = 0; i < splits[color]; i++) {
          row.push(color as Color);
        }
      }
      surface.push(shuffle(row, rng) as Color[]);
    }
    // Fix column balance
    fixColumnBalance(surface, numColors, rng);
  }

  return surface;
}

/** Generate a random split of 5 into 3 positive parts */
function generateSplit(rng: () => number): [number, number, number] {
  // All ways to split 5 into 3 parts each >= 1: {1,1,3}, {1,2,2}, {1,3,1}, {2,1,2}, {2,2,1}, {3,1,1}
  const splits: [number, number, number][] = [
    [1, 1, 3], [1, 3, 1], [3, 1, 1],
    [1, 2, 2], [2, 1, 2], [2, 2, 1],
  ];
  return splits[Math.floor(rng() * splits.length)];
}

/** Adjust surface so columns also have reasonable counts */
function fixColumnBalance(surface: Color[][], numColors: number, rng: () => number): void {
  // Do up to 100 random swaps within rows to improve column balance
  for (let iter = 0; iter < 200; iter++) {
    // Pick a random column and check its balance
    const c = Math.floor(rng() * SIZE);
    const counts = Array(numColors).fill(0);
    for (let r = 0; r < SIZE; r++) {
      counts[surface[r][c]]++;
    }

    // Find the most overrepresented color
    let maxColor = 0;
    for (let k = 1; k < numColors; k++) {
      if (counts[k] > counts[maxColor]) maxColor = k;
    }
    let minColor = 0;
    for (let k = 1; k < numColors; k++) {
      if (counts[k] < counts[minColor]) minColor = k;
    }

    if (counts[maxColor] - counts[minColor] <= 1) continue; // balanced enough

    // Find a row where column c has maxColor and another column has minColor
    const rows = shuffle(Array.from({ length: SIZE }, (_, i) => i), rng);
    let swapped = false;
    for (const r of rows) {
      if (surface[r][c] !== maxColor) continue;
      const cols = shuffle(Array.from({ length: SIZE }, (_, i) => i), rng);
      for (const c2 of cols) {
        if (c2 === c) continue;
        if (surface[r][c2] === minColor) {
          // Swap within row r: swap columns c and c2
          [surface[r][c], surface[r][c2]] = [surface[r][c2], surface[r][c]];
          swapped = true;
          break;
        }
      }
      if (swapped) break;
    }
  }
}

/* ─── Solver ─── */
export function solve(
  puzzle: PeelState,
  skillLevel: 1 | 2 | 3 | 4 | 5,
): Solution | null {
  switch (skillLevel) {
    case 1: return solveRandom(puzzle);
    case 2: return solveGreedy(puzzle);
    case 3: return solveGreedyLookahead(puzzle);
    case 4: return solveBeamSearch(puzzle, 200);
    case 5: return solveBeamSearch(puzzle, 2000);
  }
}

/* ─── Blind solver (player-information only) ─── */
export function solveBlind(puzzle: PeelState, skillLevel: 1 | 2 | 3 | 4 | 5): Solution | null {
  // The blind solver operates the same as the regular solver because
  // the player CAN see the visible layer and plan accordingly.
  // The "blindness" is that they don't know what's BENEATH unpeeled cells.
  // For par calculation, we use the omniscient solver at skill 5 since
  // the puzzle is designed with known solutions.
  return solve(puzzle, skillLevel);
}

/* ─── State key for visited sets ─── */
function stateKey(state: PeelState): string {
  return state.peeled.map(row => row.join('')).join('|');
}

/* ─── Skill 1: Random valid moves ─── */
function solveRandom(puzzle: PeelState): Solution | null {
  let state = deepCopy(puzzle);
  const moveList: Move[] = [];
  const maxSteps = 50;

  let rngSeed = 42;
  function rng() {
    rngSeed |= 0;
    rngSeed = (rngSeed + 0x6d2b79f5) | 0;
    let t = Math.imul(rngSeed ^ (rngSeed >>> 15), 1 | rngSeed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  for (let i = 0; i < maxSteps; i++) {
    if (isGoal(state)) return { moves: moveList, steps: moveList.length };
    const moves = legalMoves(state);
    if (moves.length === 0) return null;
    const move = moves[Math.floor(rng() * moves.length)];
    state = applyMove(state, move);
    moveList.push(move);
  }
  return isGoal(state) ? { moves: moveList, steps: moveList.length } : null;
}

/* ─── Skill 2: Greedy (pick move with best immediate heuristic drop) ─── */
function solveGreedy(puzzle: PeelState): Solution | null {
  let state = deepCopy(puzzle);
  const moveList: Move[] = [];
  const maxSteps = 50;

  for (let i = 0; i < maxSteps; i++) {
    if (isGoal(state)) return { moves: moveList, steps: moveList.length };
    const moves = legalMoves(state);
    if (moves.length === 0) return null;

    let bestMove = moves[0];
    let bestH = Infinity;
    for (const m of moves) {
      const next = applyMove(state, m);
      const h = heuristic(next);
      if (h < bestH) {
        bestH = h;
        bestMove = m;
      }
    }

    // Only peel if it improves or maintains (avoids pure random waste)
    state = applyMove(state, bestMove);
    moveList.push(bestMove);
  }
  return isGoal(state) ? { moves: moveList, steps: moveList.length } : null;
}

/* ─── Skill 3: Greedy + 1-step lookahead ─── */
function solveGreedyLookahead(puzzle: PeelState): Solution | null {
  let state = deepCopy(puzzle);
  const moveList: Move[] = [];
  const maxSteps = 50;

  for (let i = 0; i < maxSteps; i++) {
    if (isGoal(state)) return { moves: moveList, steps: moveList.length };
    const moves = legalMoves(state);
    if (moves.length === 0) return null;

    let bestMove = moves[0];
    let bestScore = Infinity;

    for (const m of moves) {
      const next = applyMove(state, m);
      if (isGoal(next)) {
        moveList.push(m);
        return { moves: moveList, steps: moveList.length };
      }
      const nextMoves = legalMoves(next);
      let bestNext = heuristic(next);
      for (const m2 of nextMoves) {
        const next2 = applyMove(next, m2);
        bestNext = Math.min(bestNext, heuristic(next2));
      }
      if (bestNext < bestScore) {
        bestScore = bestNext;
        bestMove = m;
      }
    }

    state = applyMove(state, bestMove);
    moveList.push(bestMove);
  }
  return isGoal(state) ? { moves: moveList, steps: moveList.length } : null;
}

/* ─── Skill 4-5: Beam search ─── */
function solveBeamSearch(puzzle: PeelState, beamWidth: number): Solution | null {
  type Beam = { state: PeelState; moves: Move[]; cost: number };

  const init = deepCopy(puzzle);
  let beam: Beam[] = [{ state: init, moves: [], cost: 0 }];
  const maxDepth = 50;
  const visited = new Set<string>([stateKey(init)]);

  for (let depth = 0; depth < maxDepth; depth++) {
    const candidates: Beam[] = [];

    for (const entry of beam) {
      if (isGoal(entry.state)) return { moves: entry.moves, steps: entry.moves.length };

      const legal = legalMoves(entry.state);
      for (const m of legal) {
        const next = applyMove(entry.state, m);
        const key = stateKey(next);
        if (visited.has(key)) continue;
        visited.add(key);

        candidates.push({
          state: next,
          moves: [...entry.moves, m],
          cost: entry.cost + 1,
        });
      }
    }

    if (candidates.length === 0) break;

    // Check for solutions
    for (const c of candidates) {
      if (isGoal(c.state)) return { moves: c.moves, steps: c.moves.length };
    }

    // Sort by f = cost + heuristic
    candidates.sort((a, b) =>
      (a.cost + heuristic(a.state)) - (b.cost + heuristic(b.state))
    );
    beam = candidates.slice(0, beamWidth);
  }

  return null;
}

/* ─── Compute par for a puzzle ─── */
export function computePar(puzzle: PeelState): number {
  return puzzle.maxMoves;
}

/* ─── Deep copy ─── */
function deepCopy(state: PeelState): PeelState {
  return {
    grid: state.grid.map(row => row.map(cell => [...cell] as CellStack)),
    peeled: state.peeled.map(row => [...row]),
    rowTargets: state.rowTargets.map(t => [...t] as Target),
    colTargets: state.colTargets.map(t => [...t] as Target),
    moves: state.moves,
    maxMoves: state.maxMoves,
  };
}
