/**
 * Fuse Solver — Temporal Cascade Chain Reaction
 *
 * Grid of colored bombs with countdown timers (1-4).
 * Player ignites bombs to trigger chain reactions.
 * Goal: clear all bombs within par ignitions.
 *
 * CASCADE RULE: When a bomb (timer T) explodes, it ignites adjacent
 * same-color bombs whose timer <= T. Higher-timer bombs have bigger blasts.
 * This creates DIRECTED cascade graphs where entry point matters:
 * a timer-4 bomb can cascade to timer-3, timer-2, timer-1 neighbors,
 * but a timer-1 bomb can only clear itself (no cascade to higher-timer neighbors).
 */

/* ─── Types ─── */
export type Bomb = { color: number; timer: number };
export type Cell = Bomb | null;
export type FuseGrid = Cell[][];
export type FuseState = {
  grid: FuseGrid;
  rows: number;
  cols: number;
  ignitionsUsed: number;
  par: number;
};
export type Move = { r: number; c: number };
export type Solution = { moves: Move[]; steps: number };

/* ─── Helpers ─── */
function cloneGrid(grid: FuseGrid): FuseGrid {
  return grid.map((row) => row.map((c) => (c ? { ...c } : null)));
}

function cloneState(s: FuseState): FuseState {
  return {
    grid: cloneGrid(s.grid),
    rows: s.rows,
    cols: s.cols,
    ignitionsUsed: s.ignitionsUsed,
    par: s.par,
  };
}

function bombCount(grid: FuseGrid): number {
  let n = 0;
  for (const row of grid) for (const c of row) if (c) n++;
  return n;
}

function adj4(
  r: number,
  c: number,
  rows: number,
  cols: number,
): [number, number][] {
  const out: [number, number][] = [];
  if (r > 0) out.push([r - 1, c]);
  if (r < rows - 1) out.push([r + 1, c]);
  if (c > 0) out.push([r, c - 1]);
  if (c < cols - 1) out.push([r, c + 1]);
  return out;
}

/**
 * Simulate cascade after igniting bombs.
 * CASCADE RULE: exploding bomb (timer T) ignites adjacent same-color
 * bombs with timer <= T only. This makes entry point strategic.
 */
export function simulateCascade(
  grid: FuseGrid,
  rows: number,
  cols: number,
  igniteTargets: Move[],
): FuseGrid {
  const g = cloneGrid(grid);
  const ticking = new Map<string, { remaining: number; power: number }>();

  for (const { r, c } of igniteTargets) {
    const cell = g[r][c];
    if (!cell) continue;
    const key = `${r},${c}`;
    if (!ticking.has(key)) {
      ticking.set(key, { remaining: cell.timer, power: cell.timer });
    }
  }

  let safety = 200;
  while (ticking.size > 0 && safety-- > 0) {
    let minTicks = Infinity;
    for (const { remaining } of ticking.values()) {
      if (remaining < minTicks) minTicks = remaining;
    }

    const exploding: { r: number; c: number; color: number; power: number }[] = [];
    const newTicking = new Map<string, { remaining: number; power: number }>();
    for (const [key, info] of ticking) {
      const rem = info.remaining - minTicks;
      if (rem <= 0) {
        const [rs, cs] = key.split(',').map(Number);
        const cell = g[rs][cs];
        if (cell) {
          exploding.push({ r: rs, c: cs, color: cell.color, power: info.power });
        }
      } else {
        newTicking.set(key, { remaining: rem, power: info.power });
      }
    }

    for (const { r, c, color, power } of exploding) {
      g[r][c] = null;
      for (const [nr, nc] of adj4(r, c, rows, cols)) {
        const neighbor = g[nr][nc];
        if (neighbor && neighbor.color === color && neighbor.timer <= power) {
          const nkey = `${nr},${nc}`;
          if (!newTicking.has(nkey)) {
            newTicking.set(nkey, {
              remaining: neighbor.timer,
              power: neighbor.timer,
            });
          }
        }
      }
    }

    ticking.clear();
    for (const [k, v] of newTicking) ticking.set(k, v);
  }

  return g;
}

/* ─── Core API ─── */

export function isGoal(state: FuseState): boolean {
  return bombCount(state.grid) === 0;
}

export function legalMoves(state: FuseState): Move[] {
  const moves: Move[] = [];
  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      if (state.grid[r][c]) moves.push({ r, c });
    }
  }
  return moves;
}

export function applyMove(state: FuseState, move: Move): FuseState {
  const newGrid = simulateCascade(state.grid, state.rows, state.cols, [move]);
  return {
    grid: newGrid,
    rows: state.rows,
    cols: state.cols,
    ignitionsUsed: state.ignitionsUsed + 1,
    par: state.par,
  };
}

export function heuristic(state: FuseState): number {
  return bombCount(state.grid);
}

function ignitionYield(
  grid: FuseGrid,
  rows: number,
  cols: number,
  r: number,
  c: number,
): number {
  const before = bombCount(grid);
  const after = bombCount(simulateCascade(grid, rows, cols, [{ r, c }]));
  return before - after;
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

/**
 * Generate a solvable Fuse puzzle by CONSTRUCTION.
 *
 * Strategy: build cascade chains backward from desired solution.
 * 1. Decide number of ignition "roots" (= optimal solution length).
 * 2. Place each root bomb with high timer on the grid.
 * 3. Grow a cascade chain from each root: each step places an adjacent
 *    same-color bomb with timer <= parent's timer.
 * 4. This guarantees that igniting each root clears its entire chain.
 * 5. Add "decoy" bombs (isolated same-color) that tempt greedy but
 *    waste ignitions if you ignite them instead of the root.
 */
export function generatePuzzle(seed: number, difficulty: number): FuseState {
  const rng = makeRng(seed);

  const rows = difficulty <= 2 ? 4 : 5;
  const cols = difficulty <= 2 ? 4 : 5;
  const numColors = difficulty <= 1 ? 2 : difficulty <= 2 ? 2 : difficulty <= 3 ? 3 : 4;

  // Number of optimal ignitions scales with difficulty
  const numRoots = difficulty <= 1 ? 3 : difficulty <= 2 ? 4 : difficulty <= 3 ? 5 : difficulty <= 4 ? 6 : 7;
  // Chain length per root (how many bombs cascade from one ignition)
  const minChain = 2;
  const maxChain = difficulty <= 2 ? 3 : 4;

  const grid: FuseGrid = Array.from({ length: rows }, () =>
    Array(cols).fill(null),
  );

  const occupied = new Set<string>();

  function findEmpty(): [number, number] | null {
    const options: [number, number][] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!occupied.has(`${r},${c}`)) options.push([r, c]);
      }
    }
    if (options.length === 0) return null;
    return options[Math.floor(rng() * options.length)];
  }

  function findEmptyAdjacentTo(r: number, c: number): [number, number] | null {
    const opts = adj4(r, c, rows, cols).filter(
      ([nr, nc]) => !occupied.has(`${nr},${nc}`),
    );
    if (opts.length === 0) return null;
    return opts[Math.floor(rng() * opts.length)];
  }

  // Build chains
  for (let chain = 0; chain < numRoots; chain++) {
    const color = chain % numColors;
    const chainLen = minChain + Math.floor(rng() * (maxChain - minChain + 1));

    // Place root with high timer
    const rootPos = findEmpty();
    if (!rootPos) break;
    const [rr, rc] = rootPos;
    const rootTimer = 3 + Math.floor(rng() * 2); // 3 or 4
    grid[rr][rc] = { color, timer: rootTimer };
    occupied.add(`${rr},${rc}`);

    // Grow chain from root with decreasing timers
    let prevR = rr;
    let prevC = rc;
    let prevTimer = rootTimer;
    for (let step = 1; step < chainLen; step++) {
      const nextPos = findEmptyAdjacentTo(prevR, prevC);
      if (!nextPos) break;
      const [nr, nc] = nextPos;
      // Timer must be <= parent's timer for cascade to work
      const timer = Math.max(1, prevTimer - Math.floor(rng() * 2));
      grid[nr][nc] = { color, timer };
      occupied.add(`${nr},${nc}`);
      prevR = nr;
      prevC = nc;
      prevTimer = timer;
    }
  }

  // Add decoy bombs: same color as existing chains but NOT adjacent
  // to any same-color bomb (so they form isolated components needing
  // separate ignitions -- greedy might waste ignitions on these)
  const totalBombs = bombCount(grid);
  const targetDecoys = Math.max(2, Math.floor(totalBombs * 0.3));
  let decoysPlaced = 0;

  for (let attempt = 0; attempt < 100 && decoysPlaced < targetDecoys; attempt++) {
    const pos = findEmpty();
    if (!pos) break;
    const [dr, dc] = pos;

    // Pick a color
    const color = Math.floor(rng() * numColors);

    // Check that NO adjacent cell has the same color
    const hasSameColorNeighbor = adj4(dr, dc, rows, cols).some(
      ([nr, nc]) => grid[nr][nc] && grid[nr][nc]!.color === color,
    );

    if (!hasSameColorNeighbor) {
      // Decoy bomb: timer 1 (can't cascade to anything anyway)
      grid[dr][dc] = { color, timer: 1 };
      occupied.add(`${dr},${dc}`);
      decoysPlaced++;
    }
  }

  // Solve to find true optimal
  const state: FuseState = { grid, rows, cols, ignitionsUsed: 0, par: 99 };
  const sol = solveExhaustive(state, 500000);
  const optimalIgnitions = sol ? sol.steps : numRoots + decoysPlaced;
  const parBuffer = difficulty <= 1 ? 3 : difficulty <= 3 ? 2 : 1;
  const par = optimalIgnitions + parBuffer;

  return { grid, rows, cols, ignitionsUsed: 0, par };
}

/* ─── Solver implementations ─── */

function gridKey(grid: FuseGrid): string {
  const parts: string[] = [];
  for (const row of grid) {
    for (const cell of row) {
      parts.push(cell ? `${cell.color}:${cell.timer}` : '_');
    }
  }
  return parts.join(',');
}

/** Greedy: always ignite the bomb that clears the most bombs. */
function solveGreedy(state: FuseState): Solution | null {
  let current = cloneState(state);
  const moves: Move[] = [];
  let safety = 50;

  while (!isGoal(current) && safety-- > 0) {
    const legal = legalMoves(current);
    if (legal.length === 0) break;

    let bestMove = legal[0];
    let bestYield = 0;
    for (const m of legal) {
      const y = ignitionYield(current.grid, current.rows, current.cols, m.r, m.c);
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
function solveGreedyLookahead(state: FuseState, depth: number): Solution | null {
  let current = cloneState(state);
  const moves: Move[] = [];
  let safety = 50;

  while (!isGoal(current) && safety-- > 0) {
    const legal = legalMoves(current);
    if (legal.length === 0) break;

    let bestMove = legal[0];
    let bestScore = -Infinity;

    for (const m of legal) {
      const next = applyMove(current, m);
      let score = bombCount(current.grid) - bombCount(next.grid);

      if (depth > 1 && !isGoal(next)) {
        const legal2 = legalMoves(next);
        let bestNext = 0;
        for (const m2 of legal2) {
          const y2 = ignitionYield(next.grid, next.rows, next.cols, m2.r, m2.c);
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
function solveExhaustive(state: FuseState, maxNodes: number): Solution | null {
  const ctx = { best: null as Solution | null, nodes: 0 };

  function dfs(current: FuseState, moves: Move[], depthLimit: number) {
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

    const legal = legalMoves(current);
    if (legal.length === 0) return;

    const scored = legal.map((m) => ({
      move: m,
      yield: ignitionYield(current.grid, current.rows, current.cols, m.r, m.c),
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

  const greedySol = solveGreedy(state);
  const maxDepth = greedySol ? greedySol.steps : 15;

  for (let d = 1; d <= maxDepth; d++) {
    dfs(cloneState(state), [], d);
    if (ctx.best && ctx.best.steps <= d) break;
    if (ctx.nodes >= maxNodes) break;
  }

  return ctx.best;
}

/** Random: pick random legal moves. */
function solveRandom(state: FuseState): Solution | null {
  let current = cloneState(state);
  const moves: Move[] = [];
  let safety = 50;

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

/**
 * Parameterized solver.
 * Level 1: random valid moves
 * Level 2: greedy (best immediate yield)
 * Level 3: greedy + 1-step lookahead
 * Level 4: DFS with moderate budget
 * Level 5: full exhaustive search
 */
export function solve(
  puzzle: FuseState,
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

/* ─── Cascade preview (used by UI) ─── */
export type CascadeEvent = {
  r: number;
  c: number;
  color: number;
  tick: number;
};

/**
 * Preview the cascade from igniting a single bomb.
 * Uses the same directed cascade rule as simulateCascade.
 */
export function previewCascade(
  grid: FuseGrid,
  rows: number,
  cols: number,
  startR: number,
  startC: number,
): CascadeEvent[] {
  const g = cloneGrid(grid);
  const events: CascadeEvent[] = [];
  const ticking = new Map<string, { remaining: number; power: number }>();

  const startCell = g[startR][startC];
  if (!startCell) return events;
  ticking.set(`${startR},${startC}`, {
    remaining: startCell.timer,
    power: startCell.timer,
  });

  let currentTick = 0;
  let safety = 200;
  while (ticking.size > 0 && safety-- > 0) {
    let minTicks = Infinity;
    for (const { remaining } of ticking.values()) {
      if (remaining < minTicks) minTicks = remaining;
    }
    currentTick += minTicks;

    const exploding: { r: number; c: number; color: number; power: number }[] = [];
    const newTicking = new Map<string, { remaining: number; power: number }>();
    for (const [key, info] of ticking) {
      const rem = info.remaining - minTicks;
      if (rem <= 0) {
        const [rs, cs] = key.split(',').map(Number);
        const cell = g[rs][cs];
        if (cell) {
          exploding.push({ r: rs, c: cs, color: cell.color, power: info.power });
          events.push({ r: rs, c: cs, color: cell.color, tick: currentTick });
        }
      } else {
        newTicking.set(key, { remaining: rem, power: info.power });
      }
    }

    for (const { r, c, color, power } of exploding) {
      g[r][c] = null;
      for (const [nr, nc] of adj4(r, c, rows, cols)) {
        const neighbor = g[nr][nc];
        if (neighbor && neighbor.color === color && neighbor.timer <= power) {
          const nkey = `${nr},${nc}`;
          if (!newTicking.has(nkey)) {
            newTicking.set(nkey, {
              remaining: neighbor.timer,
              power: neighbor.timer,
            });
          }
        }
      }
    }

    ticking.clear();
    for (const [k, v] of newTicking) ticking.set(k, v);
  }

  return events;
}
