/**
 * Sift Solver — Double Latin Square with Hidden Locks
 *
 * 5x5 grid of tiles, each with a shape (0-4) and a color (0-4).
 * Goal: no repeated shape OR color in any row or column (double Latin square).
 * Some swap positions are secretly locked; failed swaps cost a move and reveal the lock.
 *
 * v3 changes:
 * - Increased lock density Wed-Fri (Wed 24%, Thu 28%, Fri 32%)
 * - At least one lock placed adjacent to the highest-violation tile
 * - Identical-tile swaps blocked in legalMoves (was already in v2)
 */

export const SIZE = 5;
export const NUM_SHAPES = 5;
export const NUM_COLORS = 5;

export type Tile = { shape: number; color: number };
export type SiftState = {
  grid: Tile[][];          // SIZE x SIZE grid
  locks: boolean[][];      // true = position is locked (hidden from player initially)
  knownLocks: boolean[][]; // locks discovered by player (revealed through failed swaps)
  moves: number;           // total moves taken (successful swaps + failed attempts)
  maxMoves: number;        // par / move limit
};

export type Move = {
  r1: number; c1: number;
  r2: number; c2: number;
};

export type Solution = {
  moves: Move[];
  steps: number;
  failedSwaps: number;
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

/* ─── Shuffle (Fisher-Yates) ─── */
function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ─── Generate a valid Latin square ─── */
function generateLatinSquare(rng: () => number): number[][] {
  const base = [0, 1, 2, 3, 4];
  const firstRow = shuffle(base, rng);
  const rows: number[][] = [firstRow];
  const shifts = shuffle([1, 2, 3, 4], rng);
  for (const shift of shifts) {
    rows.push(firstRow.map((v) => (v + shift) % SIZE));
  }
  const colOrder = shuffle(base, rng);
  const rowOrder = shuffle([0, 1, 2, 3, 4], rng);
  return rowOrder.map((ri) => colOrder.map((ci) => rows[ri][ci]));
}

/* ─── Count violations ─── */
export function countViolations(grid: Tile[][]): number {
  let violations = 0;
  for (let r = 0; r < SIZE; r++) {
    const shapes = new Set<number>();
    const colors = new Set<number>();
    for (let c = 0; c < SIZE; c++) {
      shapes.add(grid[r][c].shape);
      colors.add(grid[r][c].color);
    }
    violations += (SIZE - shapes.size) + (SIZE - colors.size);
  }
  for (let c = 0; c < SIZE; c++) {
    const shapes = new Set<number>();
    const colors = new Set<number>();
    for (let r = 0; r < SIZE; r++) {
      shapes.add(grid[r][c].shape);
      colors.add(grid[r][c].color);
    }
    violations += (SIZE - shapes.size) + (SIZE - colors.size);
  }
  return violations;
}

/* ─── Count violations for a single cell ─── */
function cellViolations(grid: Tile[][], r: number, c: number): number {
  const tile = grid[r][c];
  let v = 0;
  for (let cc = 0; cc < SIZE; cc++) {
    if (cc === c) continue;
    if (grid[r][cc].shape === tile.shape) v++;
    if (grid[r][cc].color === tile.color) v++;
  }
  for (let rr = 0; rr < SIZE; rr++) {
    if (rr === r) continue;
    if (grid[rr][c].shape === tile.shape) v++;
    if (grid[rr][c].color === tile.color) v++;
  }
  return v;
}

/* ─── Heuristic: violations ─── */
export function heuristic(state: SiftState): number {
  return countViolations(state.grid);
}

/* ─── Goal test ─── */
export function isGoal(state: SiftState): boolean {
  return countViolations(state.grid) === 0;
}

/* ─── Legal moves ─── */
export function legalMoves(state: SiftState): Move[] {
  const moves: Move[] = [];
  for (let r1 = 0; r1 < SIZE; r1++) {
    for (let c1 = 0; c1 < SIZE; c1++) {
      if (state.knownLocks[r1][c1]) continue;
      for (let r2 = r1; r2 < SIZE; r2++) {
        const c2Start = r2 === r1 ? c1 + 1 : 0;
        for (let c2 = c2Start; c2 < SIZE; c2++) {
          if (state.knownLocks[r2][c2]) continue;
          const t1 = state.grid[r1][c1];
          const t2 = state.grid[r2][c2];
          // v2+: Block identical-tile swaps (same color + same shape)
          if (t1.shape === t2.shape && t1.color === t2.color) continue;
          moves.push({ r1, c1, r2, c2 });
        }
      }
    }
  }
  return moves;
}

/* ─── Apply move ─── */
export function applyMove(state: SiftState, move: Move): SiftState {
  const { r1, c1, r2, c2 } = move;
  const newGrid = state.grid.map((row) => row.map((t) => ({ ...t })));
  const newKnownLocks = state.knownLocks.map((row) => [...row]);

  if (state.locks[r1][c1] || state.locks[r2][c2]) {
    if (state.locks[r1][c1]) newKnownLocks[r1][c1] = true;
    if (state.locks[r2][c2]) newKnownLocks[r2][c2] = true;
    return {
      ...state,
      knownLocks: newKnownLocks,
      moves: state.moves + 1,
    };
  }

  const tmp = newGrid[r1][c1];
  newGrid[r1][c1] = newGrid[r2][c2];
  newGrid[r2][c2] = tmp;

  return {
    ...state,
    grid: newGrid,
    knownLocks: newKnownLocks,
    moves: state.moves + 1,
  };
}

/* ─── Count tiles out of place vs goal ─── */
function countOutOfPlace(grid: Tile[][], goalGrid: Tile[][]): number {
  let count = 0;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r][c].shape !== goalGrid[r][c].shape || grid[r][c].color !== goalGrid[r][c].color) {
        count++;
      }
    }
  }
  return count;
}

/* ─── Generate puzzle ─── */
export function generatePuzzle(seed: number, difficulty: number): SiftState {
  const rng = makeRng(seed);

  // Generate the goal state: valid double Latin square
  const shapeSquare = generateLatinSquare(rng);
  const colorSquare = generateLatinSquare(rng);

  const goalGrid: Tile[][] = [];
  for (let r = 0; r < SIZE; r++) {
    goalGrid.push([]);
    for (let c = 0; c < SIZE; c++) {
      goalGrid[r].push({ shape: shapeSquare[r][c], color: colorSquare[r][c] });
    }
  }

  // v3: Lock density — Mon 12%, Tue 16%, Wed 24%, Thu 28%, Fri 32%
  // Mon (diff 1): 3 locks, Tue (diff 2): 4 locks, Wed (diff 3): 6 locks, Thu (diff 4): 7 locks, Fri (diff 5): 8 locks
  const lockCounts: Record<number, number> = { 1: 3, 2: 4, 3: 6, 4: 7, 5: 8 };
  const numLocks = lockCounts[difficulty] ?? (2 + difficulty);

  const locks: boolean[][] = Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () => false)
  );

  // v2: Place locks preferentially in grid interior (rows 1-3, cols 1-3 in 0-indexed)
  // This creates routing detours without blocking corner-first strategies
  const interiorPositions: [number, number][] = [];
  const edgePositions: [number, number][] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (r >= 1 && r <= 3 && c >= 1 && c <= 3) {
        interiorPositions.push([r, c]);
      } else {
        edgePositions.push([r, c]);
      }
    }
  }

  const shuffledInterior = shuffle(interiorPositions, rng);
  const shuffledEdge = shuffle(edgePositions, rng);

  // Place as many locks as possible in interior first
  let placed = 0;
  for (const [r, c] of shuffledInterior) {
    if (placed >= numLocks) break;
    locks[r][c] = true;
    placed++;
  }
  // Overflow to edges if needed (for Fri: 8 locks, 9 interior slots available)
  for (const [r, c] of shuffledEdge) {
    if (placed >= numLocks) break;
    locks[r][c] = true;
    placed++;
  }

  // Get unlocked positions (computed BEFORE scrambling)
  const unlocked: [number, number][] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (!locks[r][c]) unlocked.push([r, c]);
    }
  }

  // v2: Target tiles-out-of-place based on difficulty
  // Monday (diff 1): 2-3 tiles, Friday (diff 5): 8-10
  const targetDisorder = difficulty <= 1 ? 3 : (difficulty <= 2 ? 4 : (difficulty <= 3 ? 6 : (difficulty <= 4 ? 8 : 10)));

  const grid: Tile[][] = goalGrid.map((row) => row.map((t) => ({ ...t })));

  // Scramble using cycle permutations among unlocked positions
  // A 3-cycle (A->B->C->A) displaces 3 tiles and requires 2 swaps to undo
  const shuffledUnlocked = shuffle(unlocked, rng);
  let displaced = 0;

  // Apply 3-cycles until we reach target disorder
  let posIdx = 0;
  while (displaced < targetDisorder && posIdx + 2 < shuffledUnlocked.length) {
    const p0 = shuffledUnlocked[posIdx];
    const p1 = shuffledUnlocked[posIdx + 1];
    const p2 = shuffledUnlocked[posIdx + 2];

    // Apply 3-cycle: rotate tiles p0 -> p1 -> p2 -> p0
    const tmp = { ...grid[p0[0]][p0[1]] };
    grid[p0[0]][p0[1]] = { ...grid[p2[0]][p2[1]] };
    grid[p2[0]][p2[1]] = { ...grid[p1[0]][p1[1]] };
    grid[p1[0]][p1[1]] = tmp;

    posIdx += 3;
    displaced = countOutOfPlace(grid, goalGrid);
  }

  // If we haven't reached target (unlikely for higher difficulties), add simple swaps
  const remaining = shuffledUnlocked.slice(posIdx);
  let swapIdx = 0;
  while (displaced < targetDisorder && swapIdx + 1 < remaining.length) {
    const p1 = remaining[swapIdx];
    const p2 = remaining[swapIdx + 1];
    const tmp = { ...grid[p1[0]][p1[1]] };
    grid[p1[0]][p1[1]] = { ...grid[p2[0]][p2[1]] };
    grid[p2[0]][p2[1]] = tmp;
    swapIdx += 2;
    displaced = countOutOfPlace(grid, goalGrid);
  }

  // Verify the puzzle isn't already solved
  if (countViolations(grid) === 0) {
    // Force disorder by doing one swap
    if (unlocked.length >= 2) {
      const [p1, p2] = shuffle(unlocked, rng);
      const tmp = grid[p1[0]][p1[1]];
      grid[p1[0]][p1[1]] = grid[p2[0]][p2[1]];
      grid[p2[0]][p2[1]] = tmp;
    }
  }

  // v3: Ensure at least one lock is adjacent to the highest-violation tile
  // This forces the "obvious first swap" to be blocked, creating a rerouting moment.
  // IMPORTANT: We only RELOCATE an existing lock — never add new ones (to preserve lock count).
  let maxViolTile: [number, number] = [0, 0];
  let maxViol = -1;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const v = cellViolations(grid, r, c);
      if (v > maxViol) {
        maxViol = v;
        maxViolTile = [r, c];
      }
    }
  }

  // Check if any adjacent cell is already locked (or the tile itself is locked)
  const [mr, mc] = maxViolTile;
  const adjacents: [number, number][] = [];
  for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    const nr = mr + dr;
    const nc = mc + dc;
    if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) {
      adjacents.push([nr, nc]);
    }
  }

  const hasAdjacentLock = locks[mr][mc] || adjacents.some(([ar, ac]) => locks[ar][ac]);
  if (!hasAdjacentLock && adjacents.length > 0) {
    // Pick an adjacent that's currently unlocked to place a lock via relocation
    const candidates = adjacents.filter(([ar, ac]) => !locks[ar][ac]);
    if (candidates.length > 0) {
      const [lr, lc] = candidates[Math.floor(rng() * candidates.length)];

      // Find a non-adjacent lock to relocate (so total lock count stays the same)
      let relocated = false;
      for (let r = SIZE - 1; r >= 0 && !relocated; r--) {
        for (let c = SIZE - 1; c >= 0 && !relocated; c--) {
          if (locks[r][c]) {
            // Don't relocate a lock that's already adjacent to max-viol tile
            const isAdjToMax = (r === mr && c === mc) ||
              adjacents.some(([ar, ac]) => ar === r && ac === c);
            // Also don't relocate to the same position
            if (!isAdjToMax && !(r === lr && c === lc)) {
              locks[r][c] = false;
              locks[lr][lc] = true;
              relocated = true;
            }
          }
        }
      }
      // If couldn't relocate (all locks already adjacent — very unlikely), skip.
      // Do NOT add extra locks — that would push total above target and risk unsolvability.
    }
  }

  const maxMoves = 10 + difficulty * 5; // fallback; par will be computed in UI

  // v3: Solvability check — verify puzzle can be solved by L5 beam search.
  // If not, return a simplified version (remove the adjacent-lock constraint).
  const testState: SiftState = {
    grid: grid.map((row) => row.map((t) => ({ ...t }))),
    locks: locks.map((row) => [...row]),
    knownLocks: Array.from({ length: SIZE }, () =>
      Array.from({ length: SIZE }, () => false)
    ),
    moves: 0,
    maxMoves,
  };

  const testSol = solveBeamSearchExport(testState, 2000);
  if (!testSol) {
    // Solvability failed — remove the adjacent-lock relocation by regenerating
    // with a slightly modified seed to get a different lock arrangement
    return generatePuzzleFallback(seed + 7919, difficulty);
  }

  return {
    grid,
    locks,
    knownLocks: Array.from({ length: SIZE }, () =>
      Array.from({ length: SIZE }, () => false)
    ),
    moves: 0,
    maxMoves,
  };
}

/* ─── Fallback puzzle generator (no adjacent-lock constraint) ─── */
function generatePuzzleFallback(seed: number, difficulty: number): SiftState {
  const rng = makeRng(seed);

  const shapeSquare = generateLatinSquare(rng);
  const colorSquare = generateLatinSquare(rng);

  const goalGrid: Tile[][] = [];
  for (let r = 0; r < SIZE; r++) {
    goalGrid.push([]);
    for (let c = 0; c < SIZE; c++) {
      goalGrid[r].push({ shape: shapeSquare[r][c], color: colorSquare[r][c] });
    }
  }

  const lockCounts: Record<number, number> = { 1: 3, 2: 4, 3: 6, 4: 7, 5: 8 };
  const numLocks = lockCounts[difficulty] ?? (2 + difficulty);

  const locks: boolean[][] = Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () => false)
  );

  const interiorPositions: [number, number][] = [];
  const edgePositions: [number, number][] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (r >= 1 && r <= 3 && c >= 1 && c <= 3) {
        interiorPositions.push([r, c]);
      } else {
        edgePositions.push([r, c]);
      }
    }
  }

  const shuffledInterior = shuffle(interiorPositions, rng);
  const shuffledEdge = shuffle(edgePositions, rng);

  let placed = 0;
  for (const [r, c] of shuffledInterior) {
    if (placed >= numLocks) break;
    locks[r][c] = true;
    placed++;
  }
  for (const [r, c] of shuffledEdge) {
    if (placed >= numLocks) break;
    locks[r][c] = true;
    placed++;
  }

  const unlocked: [number, number][] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (!locks[r][c]) unlocked.push([r, c]);
    }
  }

  const targetDisorder = difficulty <= 1 ? 3 : (difficulty <= 2 ? 4 : (difficulty <= 3 ? 6 : (difficulty <= 4 ? 8 : 10)));
  const grid: Tile[][] = goalGrid.map((row) => row.map((t) => ({ ...t })));
  const shuffledUnlocked = shuffle(unlocked, rng);
  let displaced = 0;

  let posIdx = 0;
  while (displaced < targetDisorder && posIdx + 2 < shuffledUnlocked.length) {
    const p0 = shuffledUnlocked[posIdx];
    const p1 = shuffledUnlocked[posIdx + 1];
    const p2 = shuffledUnlocked[posIdx + 2];
    const tmp = { ...grid[p0[0]][p0[1]] };
    grid[p0[0]][p0[1]] = { ...grid[p2[0]][p2[1]] };
    grid[p2[0]][p2[1]] = { ...grid[p1[0]][p1[1]] };
    grid[p1[0]][p1[1]] = tmp;
    posIdx += 3;
    displaced = countOutOfPlace(grid, goalGrid);
  }

  const remaining = shuffledUnlocked.slice(posIdx);
  let swapIdx = 0;
  while (displaced < targetDisorder && swapIdx + 1 < remaining.length) {
    const p1 = remaining[swapIdx];
    const p2 = remaining[swapIdx + 1];
    const tmp = { ...grid[p1[0]][p1[1]] };
    grid[p1[0]][p1[1]] = { ...grid[p2[0]][p2[1]] };
    grid[p2[0]][p2[1]] = tmp;
    swapIdx += 2;
    displaced = countOutOfPlace(grid, goalGrid);
  }

  if (countViolations(grid) === 0) {
    if (unlocked.length >= 2) {
      const [p1, p2] = shuffle(unlocked, rng);
      const tmp = grid[p1[0]][p1[1]];
      grid[p1[0]][p1[1]] = grid[p2[0]][p2[1]];
      grid[p2[0]][p2[1]] = tmp;
    }
  }

  const maxMoves = 10 + difficulty * 5;

  return {
    grid,
    locks,
    knownLocks: Array.from({ length: SIZE }, () =>
      Array.from({ length: SIZE }, () => false)
    ),
    moves: 0,
    maxMoves,
  };
}

/* ─── State key ─── */
function stateKey(state: SiftState): string {
  const gridKey = state.grid
    .map((row) => row.map((t) => `${t.shape}${t.color}`).join(''))
    .join('|');
  const lockKey = state.knownLocks
    .map((row) => row.map((v) => (v ? '1' : '0')).join(''))
    .join('');
  return `${gridKey}:${lockKey}`;
}

/* ─── Lock-naive solver (v2) ───
 * Simulates player knowledge: starts with no lock knowledge,
 * discovers locks through failed swap attempts (just like a player).
 * Used for par calculation to match player information asymmetry.
 */
export function solveLockNaive(puzzle: SiftState, beamWidth: number = 500): Solution | null {
  type Beam = { state: SiftState; moves: Move[]; failedSwaps: number; cost: number };

  const init = deepCopy(puzzle);
  // Start with zero lock knowledge (player perspective)
  init.knownLocks = Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () => false)
  );

  let beam: Beam[] = [{ state: init, moves: [], failedSwaps: 0, cost: 0 }];
  const maxDepth = 40;
  const visited = new Set<string>([stateKey(init)]);

  for (let depth = 0; depth < maxDepth; depth++) {
    const candidates: Beam[] = [];

    for (const entry of beam) {
      if (isGoal(entry.state)) return { moves: entry.moves, steps: entry.moves.length, failedSwaps: entry.failedSwaps };

      const legal = legalMoves(entry.state);
      const scored = legal.map((m) => {
        const next = applyMove(entry.state, m);
        const h = heuristic(next);
        const wasFailed = entry.state.locks[m.r1][m.c1] || entry.state.locks[m.r2][m.c2];
        return { m, next, h, wasFailed };
      });
      scored.sort((a, b) => a.h - b.h);

      const perEntry = Math.max(3, Math.ceil(beamWidth / Math.max(beam.length, 1)));
      for (const { m, next, wasFailed } of scored.slice(0, perEntry)) {
        const key = stateKey(next);
        if (visited.has(key)) continue;
        visited.add(key);

        candidates.push({
          state: next,
          moves: [...entry.moves, m],
          failedSwaps: entry.failedSwaps + (wasFailed ? 1 : 0),
          cost: entry.cost + 1,
        });
      }
    }

    if (candidates.length === 0) break;

    for (const c of candidates) {
      if (isGoal(c.state)) return { moves: c.moves, steps: c.moves.length, failedSwaps: c.failedSwaps };
    }

    // Score by f = cost + heuristic
    candidates.sort((a, b) => (a.cost + heuristic(a.state)) - (b.cost + heuristic(b.state)));
    beam = candidates.slice(0, beamWidth);
  }

  return null;
}

/* ─── Compute par (v2+) ───
 * Par = lock-naive solver optimal + buffer
 * Buffer: Monday (diff 1) = +3, graduating to Friday (diff 5) = +2
 */
export function computePar(puzzle: SiftState, difficulty: number): number {
  const naiveSol = solveLockNaive(puzzle, 500);
  if (!naiveSol) {
    // Fallback: use full-knowledge solver with generous buffer
    const fullSol = solve(puzzle, 5);
    if (!fullSol) return 10 + difficulty * 5;
    return fullSol.steps + 5;
  }
  // Buffer decreases with difficulty: +3 on Mon, +2 on Fri
  const buffer = difficulty <= 1 ? 3 : (difficulty <= 2 ? 3 : (difficulty <= 3 ? 2 : (difficulty <= 4 ? 2 : 2)));
  return naiveSol.steps + buffer;
}

/* ─── Solver ─── */
export function solve(
  puzzle: SiftState,
  skillLevel: 1 | 2 | 3 | 4 | 5,
): Solution | null {
  switch (skillLevel) {
    case 1:
      return solveRandom(puzzle);
    case 2:
      return solveGreedy(puzzle);
    case 3:
      return solveGreedyLookahead(puzzle);
    case 4:
      return solveBeamSearch(puzzle, 100);
    case 5:
      return solveBeamSearch(puzzle, 1000);
  }
}

/* ─── Skill 1: Random valid moves ─── */
function solveRandom(puzzle: SiftState): Solution | null {
  let state = deepCopy(puzzle);
  const moveList: Move[] = [];
  let failedSwaps = 0;
  const maxSteps = 300;

  let rngSeed = 12345;
  function rng() {
    rngSeed |= 0;
    rngSeed = (rngSeed + 0x6d2b79f5) | 0;
    let t = Math.imul(rngSeed ^ (rngSeed >>> 15), 1 | rngSeed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  for (let i = 0; i < maxSteps; i++) {
    if (isGoal(state)) return { moves: moveList, steps: moveList.length, failedSwaps };
    const moves = legalMoves(state);
    if (moves.length === 0) return null;
    const move = moves[Math.floor(rng() * moves.length)];
    const wasFailed = state.locks[move.r1][move.c1] || state.locks[move.r2][move.c2];
    state = applyMove(state, move);
    if (wasFailed) failedSwaps++;
    moveList.push(move);
  }
  return isGoal(state) ? { moves: moveList, steps: moveList.length, failedSwaps } : null;
}

/* ─── Skill 2: Greedy ─── */
function solveGreedy(puzzle: SiftState): Solution | null {
  let state = deepCopy(puzzle);
  const moveList: Move[] = [];
  let failedSwaps = 0;
  const maxSteps = 100;

  for (let i = 0; i < maxSteps; i++) {
    if (isGoal(state)) return { moves: moveList, steps: moveList.length, failedSwaps };
    const moves = legalMoves(state);
    if (moves.length === 0) return null;

    let bestMove = moves[0];
    let bestScore = Infinity;
    for (const m of moves) {
      const next = applyMove(state, m);
      const h = heuristic(next);
      if (h < bestScore) {
        bestScore = h;
        bestMove = m;
      }
    }

    const wasFailed = state.locks[bestMove.r1][bestMove.c1] || state.locks[bestMove.r2][bestMove.c2];
    state = applyMove(state, bestMove);
    if (wasFailed) failedSwaps++;
    moveList.push(bestMove);
  }
  return isGoal(state) ? { moves: moveList, steps: moveList.length, failedSwaps } : null;
}

/* ─── Skill 3: Greedy with 1-step lookahead ─── */
function solveGreedyLookahead(puzzle: SiftState): Solution | null {
  let state = deepCopy(puzzle);
  const moveList: Move[] = [];
  let failedSwaps = 0;
  const maxSteps = 80;

  for (let i = 0; i < maxSteps; i++) {
    if (isGoal(state)) return { moves: moveList, steps: moveList.length, failedSwaps };
    const moves = legalMoves(state);
    if (moves.length === 0) return null;

    let bestMove = moves[0];
    let bestScore = Infinity;

    for (const m of moves) {
      const next = applyMove(state, m);
      if (isGoal(next)) {
        moveList.push(m);
        return { moves: moveList, steps: moveList.length, failedSwaps };
      }
      const nextMoves = legalMoves(next);
      let bestNext = heuristic(next);
      for (const m2 of nextMoves.slice(0, 30)) {
        const next2 = applyMove(next, m2);
        bestNext = Math.min(bestNext, heuristic(next2));
      }
      if (bestNext < bestScore) {
        bestScore = bestNext;
        bestMove = m;
      }
    }

    const wasFailed = state.locks[bestMove.r1][bestMove.c1] || state.locks[bestMove.r2][bestMove.c2];
    state = applyMove(state, bestMove);
    if (wasFailed) failedSwaps++;
    moveList.push(bestMove);
  }
  return isGoal(state) ? { moves: moveList, steps: moveList.length, failedSwaps } : null;
}

/* ─── Exported beam search for solvability checks ─── */
export function solveBeamSearchExport(puzzle: SiftState, beamWidth: number): Solution | null {
  return solveBeamSearch(puzzle, beamWidth);
}

/* ─── Skill 4-5: Beam search with A* flavor ─── */
function solveBeamSearch(puzzle: SiftState, beamWidth: number): Solution | null {
  type Beam = { state: SiftState; moves: Move[]; failedSwaps: number; cost: number };

  const init = deepCopy(puzzle);
  let beam: Beam[] = [{ state: init, moves: [], failedSwaps: 0, cost: 0 }];
  const maxDepth = 50;
  const visited = new Set<string>([stateKey(init)]);

  for (let depth = 0; depth < maxDepth; depth++) {
    const candidates: Beam[] = [];

    for (const entry of beam) {
      if (isGoal(entry.state)) return { moves: entry.moves, steps: entry.moves.length, failedSwaps: entry.failedSwaps };

      const legal = legalMoves(entry.state);
      const scored = legal.map((m) => {
        const next = applyMove(entry.state, m);
        const h = heuristic(next);
        const wasFailed = entry.state.locks[m.r1][m.c1] || entry.state.locks[m.r2][m.c2];
        return { m, next, h, wasFailed };
      });
      scored.sort((a, b) => a.h - b.h);

      const perEntry = Math.max(3, Math.ceil(beamWidth / Math.max(beam.length, 1)));
      for (const { m, next, wasFailed } of scored.slice(0, perEntry)) {
        const key = stateKey(next);
        if (visited.has(key)) continue;
        visited.add(key);

        candidates.push({
          state: next,
          moves: [...entry.moves, m],
          failedSwaps: entry.failedSwaps + (wasFailed ? 1 : 0),
          cost: entry.cost + 1,
        });
      }
    }

    if (candidates.length === 0) break;

    for (const c of candidates) {
      if (isGoal(c.state)) return { moves: c.moves, steps: c.moves.length, failedSwaps: c.failedSwaps };
    }

    // Score by f = cost + heuristic
    candidates.sort((a, b) => (a.cost + heuristic(a.state)) - (b.cost + heuristic(b.state)));
    beam = candidates.slice(0, beamWidth);
  }

  return null;
}

/* ─── Deep copy ─── */
function deepCopy(state: SiftState): SiftState {
  return {
    grid: state.grid.map((row) => row.map((t) => ({ ...t }))),
    locks: state.locks.map((row) => [...row]),
    knownLocks: state.knownLocks.map((row) => [...row]),
    moves: state.moves,
    maxMoves: state.maxMoves,
  };
}
