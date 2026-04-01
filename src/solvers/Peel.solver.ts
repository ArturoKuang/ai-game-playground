/**
 * Peel Solver v2 — Layer-reveal constraint satisfaction
 *
 * 5x5 grid, each cell has 3 stacked color layers.
 * Player sees only the top visible layer.
 * Tapping a cell "peels" the top layer, revealing the next one beneath.
 * Peeling goes layer 0 -> layer 1 -> layer 2 (max 2 peels per cell).
 * Goal: the visible surface satisfies row/column color-count targets.
 *
 * v2 changes:
 * - No same-color adjacent layers (layer[n] != layer[n+1])
 * - Violations counter instead of raw "Wrong" count
 * - Endgame softening: last 2-3 peels are independently fixable
 * - Mon/Tue guaranteed counterintuitive moments
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

/* ─── Count violations: sum of absolute deviations per color per row/col ─── */
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

/* ─── Count unsatisfied rows + columns (for player-facing "violations remaining") ─── */
export function countUnsatisfiedLines(state: PeelState): number {
  let count = 0;

  // Rows
  for (let r = 0; r < SIZE; r++) {
    const counts = [0, 0, 0];
    for (let c = 0; c < SIZE; c++) {
      counts[visibleColor(state.grid, state.peeled, r, c)]++;
    }
    let satisfied = true;
    for (let color = 0; color < MAX_COLORS; color++) {
      if (counts[color] !== state.rowTargets[r][color]) { satisfied = false; break; }
    }
    if (!satisfied) count++;
  }

  // Columns
  for (let c = 0; c < SIZE; c++) {
    const counts = [0, 0, 0];
    for (let r = 0; r < SIZE; r++) {
      counts[visibleColor(state.grid, state.peeled, r, c)]++;
    }
    let satisfied = true;
    for (let color = 0; color < MAX_COLORS; color++) {
      if (counts[color] !== state.colTargets[c][color]) { satisfied = false; break; }
    }
    if (!satisfied) count++;
  }

  return count;
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

  // Step 3: Decide which cells need peeling
  // We split cells into "independent" (fixable alone) and "coupled" (interacts with others)
  const peelCounts: Record<number, number> = { 1: 5, 2: 6, 3: 8, 4: 10, 5: 12 };
  const numPeels = peelCounts[difficulty] ?? 8;

  const allCells: [number, number][] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) { allCells.push([r, c]); }
  }
  const shuffledCells = shuffle(allCells, rng);

  // Split into coupled (majority, placed first in solve path) and independent (last 2-3)
  const numIndependent = Math.min(3, Math.max(2, Math.floor(numPeels * 0.25)));
  const numCoupled = numPeels - numIndependent;

  const peelCellList = shuffledCells.slice(0, Math.min(numPeels, 25));
  const coupledCells = peelCellList.slice(0, numCoupled);
  const independentCells = peelCellList.slice(numCoupled);

  const peelCells = new Set(peelCellList.map(([r, c]) => `${r},${c}`));
  const independentSet = new Set(independentCells.map(([r, c]) => `${r},${c}`));

  // Step 4: For Mon/Tue, ensure at least 1 counterintuitive cell
  // A CI cell: top satisfies its row constraint but violates its column constraint
  // Peeling it fixes the column while the row has enough slack
  let ciCell: [number, number] | null = null;
  if (difficulty <= 2 && coupledCells.length > 0) {
    ciCell = coupledCells[0]; // designate first coupled cell as CI cell
  }

  // Step 5: Build the grid with distinct adjacent layers
  //
  // v2: layer[n] != layer[n+1] for all cells.
  // Peel cells: depth-1 (single peel to fix) for independent cells,
  //             depth-2 (two peels) for coupled cells.
  // This creates: coupled cells need 2 peels (intermediate state is still wrong),
  //               independent cells need 1 peel (endgame is tractable).

  const grid: CellStack[][] = [];
  for (let r = 0; r < SIZE; r++) {
    grid.push([]);
    for (let c = 0; c < SIZE; c++) {
      const goalColor = goalSurface[r][c] as Color;
      const key = `${r},${c}`;

      if (peelCells.has(key)) {
        if (independentSet.has(key)) {
          // Independent cell: depth-1 peel (top = wrong, layer1 = goal, layer2 = different)
          // v2: all layers distinct from their neighbors
          const wrongColors: Color[] = [];
          for (let k = 0; k < numColors; k++) {
            if (k !== goalColor) wrongColors.push(k as Color);
          }
          const topColor = wrongColors[Math.floor(rng() * wrongColors.length)];
          // layer2 must differ from layer1 (goalColor)
          const layer2Options: Color[] = [];
          for (let k = 0; k < numColors; k++) {
            if (k !== goalColor) layer2Options.push(k as Color);
          }
          const layer2 = layer2Options[Math.floor(rng() * layer2Options.length)];
          grid[r].push([topColor, goalColor, layer2]);
        } else if (ciCell && key === `${ciCell[0]},${ciCell[1]}`) {
          // Counterintuitive cell: top color satisfies row but violates column
          // We pick a top color that matches what the row needs but the column doesn't
          // Still needs to be different from goalColor for it to be a peel target
          const wrongColors: Color[] = [];
          for (let k = 0; k < numColors; k++) {
            if (k !== goalColor) wrongColors.push(k as Color);
          }
          // For CI: pick a top color that's different from goal
          // The CI effect comes from the fact that the row already has enough of goalColor
          // from other cells, so peeling this "correct-looking" cell is counterintuitive
          const topColor = wrongColors[Math.floor(rng() * wrongColors.length)];
          // mid must differ from top, layer2 (goal) must differ from mid
          const midOptions: Color[] = [];
          for (let k = 0; k < numColors; k++) {
            if (k !== topColor && k !== goalColor) midOptions.push(k as Color);
          }
          const midColor = midOptions.length > 0
            ? midOptions[Math.floor(rng() * midOptions.length)]
            : (((topColor + 1) % numColors) as Color);
          grid[r].push([topColor, midColor, goalColor]);
        } else {
          // Coupled cell: depth-2 (top = wrong_A, layer1 = wrong_B, layer2 = goal)
          // v2: layer[n] != layer[n+1]
          const wrongs: Color[] = [];
          for (let k = 0; k < numColors; k++) {
            if (k !== goalColor) wrongs.push(k as Color);
          }
          // With 3 colors, there are exactly 2 wrong colors.
          // Arrange them so top != mid != goal (and top != mid is guaranteed since they're different wrongs)
          const shuffledWrongs = shuffle(wrongs, rng);
          const topColor = shuffledWrongs[0];
          const midColor = shuffledWrongs[1];
          // Verify: topColor != midColor (guaranteed since they're 2 different wrongs)
          // midColor != goalColor (guaranteed since midColor is wrong)
          grid[r].push([topColor, midColor, goalColor]);
        }
      } else {
        // Correct cell: top = goal, layers below must be distinct from neighbors
        // v2: layer[0] != layer[1] and layer[1] != layer[2]
        let l1: Color;
        do {
          l1 = Math.floor(rng() * numColors) as Color;
        } while (l1 === goalColor);
        let l2: Color;
        do {
          l2 = Math.floor(rng() * numColors) as Color;
        } while (l2 === l1);
        grid[r].push([goalColor, l1, l2]);
      }
    }
  }

  // Step 6: Verify the top layer has violations
  const testState: PeelState = {
    grid,
    peeled: Array.from({ length: SIZE }, () => Array(SIZE).fill(0)),
    rowTargets, colTargets,
    moves: 0, maxMoves: 99,
  };

  if (isGoal(testState)) {
    return generatePuzzle(seed + 7919, difficulty);
  }

  // Step 7: Compute par using the solver
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
    for (let r = 0; r < SIZE; r++) {
      const numR = 2 + Math.floor(rng() * 2);
      const row: Color[] = [];
      for (let i = 0; i < numR; i++) row.push(0);
      for (let i = numR; i < SIZE; i++) row.push(1);
      surface.push(shuffle(row, rng) as Color[]);
    }
    fixColumnBalance(surface, numColors, rng);
  } else {
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
    fixColumnBalance(surface, numColors, rng);
  }

  return surface;
}

/** Generate a random split of 5 into 3 positive parts */
function generateSplit(rng: () => number): [number, number, number] {
  const splits: [number, number, number][] = [
    [1, 1, 3], [1, 3, 1], [3, 1, 1],
    [1, 2, 2], [2, 1, 2], [2, 2, 1],
  ];
  return splits[Math.floor(rng() * splits.length)];
}

/** Adjust surface so columns also have reasonable counts */
function fixColumnBalance(surface: Color[][], numColors: number, rng: () => number): void {
  for (let iter = 0; iter < 200; iter++) {
    const c = Math.floor(rng() * SIZE);
    const counts = Array(numColors).fill(0);
    for (let r = 0; r < SIZE; r++) {
      counts[surface[r][c]]++;
    }

    let maxColor = 0;
    for (let k = 1; k < numColors; k++) {
      if (counts[k] > counts[maxColor]) maxColor = k;
    }
    let minColor = 0;
    for (let k = 1; k < numColors; k++) {
      if (counts[k] < counts[minColor]) minColor = k;
    }

    if (counts[maxColor] - counts[minColor] <= 1) continue;

    const rows = shuffle(Array.from({ length: SIZE }, (_, i) => i), rng);
    let swapped = false;
    for (const r of rows) {
      if (surface[r][c] !== maxColor) continue;
      const cols = shuffle(Array.from({ length: SIZE }, (_, i) => i), rng);
      for (const c2 of cols) {
        if (c2 === c) continue;
        if (surface[r][c2] === minColor) {
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
