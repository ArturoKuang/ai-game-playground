/**
 * Vault Solver
 *
 * Rules: Unlock all cells on a grid. Each cell has a lock type (one of 4 colors).
 * You have a rotating key ring. The key at the top of the ring determines which
 * lock type you can unlock. After each unlock, the ring rotates forward by 1.
 * You can also SKIP (advance the ring without unlocking, costing 1 move).
 *
 * SCORING: Total moves = unlocks + skips + travel distance.
 * Each unlock costs 1 + manhattan_distance(current_pos, target_cell).
 * Each skip costs 1 (no movement).
 * This makes spatial routing a core strategic element.
 *
 * Goal: all cells unlocked. Score = total cost. Par = optimal + padding.
 */

export type Pos = { r: number; c: number };

export type Cell = {
  lockType: number; // 0-3 (color index)
  unlocked: boolean;
  pos: Pos;
};

export type VaultState = {
  rows: number;
  cols: number;
  cells: Cell[];
  ringKeys: number[]; // key types in order (ring of keys)
  ringPos: number; // current key position in the ring
  cost: number; // total cost used (actions + travel)
  par: number; // par for this puzzle
  playerPos: Pos; // current player position on grid
};

export type Move =
  | { type: 'unlock'; cellIndex: number }
  | { type: 'skip' };

export type Solution = {
  moves: Move[];
  steps: number; // total cost
};

/* ─── Constants ─── */
const LOCK_COLORS = 4;

/* ─── Helpers ─── */
function rngFactory(seed: number): () => number {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function manhattan(a: Pos, b: Pos): number {
  return Math.abs(a.r - b.r) + Math.abs(a.c - b.c);
}

function cloneState(state: VaultState): VaultState {
  return {
    rows: state.rows,
    cols: state.cols,
    cells: state.cells.map((c) => ({
      lockType: c.lockType,
      unlocked: c.unlocked,
      pos: { ...c.pos },
    })),
    ringKeys: [...state.ringKeys],
    ringPos: state.ringPos,
    cost: state.cost,
    par: state.par,
    playerPos: { ...state.playerPos },
  };
}

function stateKey(state: VaultState): string {
  const unlocked = state.cells.map((c) => (c.unlocked ? '1' : '0')).join('');
  return `${state.ringPos}|${unlocked}|${state.playerPos.r},${state.playerPos.c}`;
}

/** Cost of a move: unlock = 1 + travel distance; skip = 1 */
function moveCost(state: VaultState, move: Move): number {
  if (move.type === 'skip') return 1;
  const cell = state.cells[move.cellIndex];
  return 1 + manhattan(state.playerPos, cell.pos);
}

/* ─── Core game logic ─── */

export function generatePuzzle(seed: number, difficulty: number): VaultState {
  const rng = rngFactory(seed);

  // Scale grid size with difficulty
  let rows: number, cols: number;
  if (difficulty <= 1) {
    rows = 3; cols = 4; // 12 cells
  } else if (difficulty <= 2) {
    rows = 3; cols = 5; // 15 cells
  } else if (difficulty <= 3) {
    rows = 4; cols = 4; // 16 cells
  } else if (difficulty <= 4) {
    rows = 4; cols = 5; // 20 cells
  } else {
    rows = 4; cols = 5; // 20 cells (same grid, tighter ring)
  }

  const totalCells = rows * cols;

  // Generate lock types with intentional clustering for spatial tension
  // Instead of uniform random, cluster same-type locks in different quadrants
  const lockTypes: number[] = new Array(totalCells);

  // First, create a pool of lock types
  const pool: number[] = [];
  const perType = Math.floor(totalCells / LOCK_COLORS);
  const remainder = totalCells % LOCK_COLORS;
  for (let t = 0; t < LOCK_COLORS; t++) {
    const count = perType + (t < remainder ? 1 : 0);
    for (let j = 0; j < count; j++) {
      pool.push(t);
    }
  }

  // Shuffle to get base randomness
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  // For higher difficulties, cluster lock types into spatial regions
  // This forces longer travel when matching cells are far apart
  if (difficulty >= 3) {
    // Assign types with regional bias
    const midR = Math.floor(rows / 2);
    const midC = Math.floor(cols / 2);
    const quadrants: number[][] = [[], [], [], []];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const q = (r < midR ? 0 : 2) + (c < midC ? 0 : 1);
        quadrants[q].push(r * cols + c);
      }
    }

    // Bias each quadrant toward a different lock type
    const typeOrder = [0, 1, 2, 3];
    for (let i = typeOrder.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [typeOrder[i], typeOrder[j]] = [typeOrder[j], typeOrder[i]];
    }

    let poolIdx = 0;
    // Place biased cells first
    for (let q = 0; q < 4; q++) {
      const biasType = typeOrder[q];
      const cells = quadrants[q];
      // 60% of cells in this quadrant get the bias type
      const biasCount = Math.floor(cells.length * 0.6);
      for (let i = 0; i < cells.length; i++) {
        if (i < biasCount) {
          lockTypes[cells[i]] = biasType;
        } else {
          lockTypes[cells[i]] = pool[poolIdx % pool.length];
          poolIdx++;
        }
      }
    }
  } else {
    // Simple shuffle for easy puzzles
    for (let i = 0; i < totalCells; i++) {
      lockTypes[i] = pool[i];
    }
  }

  // Create cells
  const cells: Cell[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      cells.push({
        lockType: lockTypes[idx],
        unlocked: false,
        pos: { r, c },
      });
    }
  }

  // Generate key ring
  // Ring has exactly enough keys to unlock all cells, but the TYPE distribution
  // is intentionally mismatched with the cell distribution to force skips
  // Count cells per type
  const cellsPerType: number[] = [0, 0, 0, 0];
  for (const c of cells) cellsPerType[c.lockType]++;

  const ringKeys: number[] = [];

  if (difficulty <= 2) {
    // Easy: ring matches cell distribution exactly (+ a few extras)
    for (let t = 0; t < LOCK_COLORS; t++) {
      for (let j = 0; j < cellsPerType[t]; j++) {
        ringKeys.push(t);
      }
    }
    // Add 2-4 extra keys for cushion
    const extras = difficulty <= 1 ? 4 : 2;
    for (let i = 0; i < extras; i++) {
      ringKeys.push(Math.floor(rng() * LOCK_COLORS));
    }
  } else {
    // Hard: ring has cells-per-type keys but also includes "wild" extras
    // that don't match any remaining type, forcing skips
    for (let t = 0; t < LOCK_COLORS; t++) {
      for (let j = 0; j < cellsPerType[t]; j++) {
        ringKeys.push(t);
      }
    }
    // Add some deliberately unhelpful keys to force skip decisions
    const extraSkips = difficulty <= 3 ? 2 : difficulty <= 4 ? 3 : 4;
    for (let i = 0; i < extraSkips; i++) {
      // Find the type with the LEAST cells remaining
      const minType = cellsPerType.indexOf(Math.min(...cellsPerType));
      ringKeys.push(minType);
    }
  }

  // Shuffle ring keys
  for (let i = ringKeys.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [ringKeys[i], ringKeys[j]] = [ringKeys[j], ringKeys[i]];
  }

  // Player starts at top-left
  const playerPos: Pos = { r: 0, c: 0 };

  // Temporary high par
  const state: VaultState = {
    rows,
    cols,
    cells,
    ringKeys,
    ringPos: 0,
    cost: 0,
    par: totalCells * 5,
    playerPos,
  };

  // Solve to get par - use level 4 for speed, fall back to level 3
  const sol = solveWithBudget(state, 200000);
  const optimalCost = sol ? sol.steps : (solveGreedyLookahead(state)?.steps ?? totalCells * 2);

  // Par based on difficulty
  const parPadding = difficulty <= 1 ? 6 : difficulty <= 2 ? 4 : difficulty <= 3 ? 3 : 2;
  state.par = optimalCost + parPadding;

  return state;
}

export function legalMoves(state: VaultState): Move[] {
  const moves: Move[] = [];
  const currentKey = state.ringKeys[state.ringPos % state.ringKeys.length];

  // Can unlock any locked cell that matches the current key type
  for (let i = 0; i < state.cells.length; i++) {
    const cell = state.cells[i];
    if (!cell.unlocked && cell.lockType === currentKey) {
      moves.push({ type: 'unlock', cellIndex: i });
    }
  }

  // Can always skip (advance ring without unlocking)
  moves.push({ type: 'skip' });

  return moves;
}

export function applyMove(state: VaultState, move: Move): VaultState {
  const next = cloneState(state);
  const cost = moveCost(state, move);

  if (move.type === 'unlock') {
    const cell = next.cells[move.cellIndex];
    cell.unlocked = true;
    next.playerPos = { ...cell.pos };
  }
  // Both unlock and skip advance the ring
  next.ringPos = (next.ringPos + 1) % next.ringKeys.length;
  next.cost += cost;

  return next;
}

export function isGoal(state: VaultState): boolean {
  return state.cells.every((c) => c.unlocked);
}

export function heuristic(state: VaultState): number {
  // Lower bound on remaining cost
  let locked = 0;
  let minDist = 0;
  let positions: Pos[] = [];
  for (const cell of state.cells) {
    if (!cell.unlocked) {
      locked++;
      positions.push(cell.pos);
    }
  }

  if (locked === 0) return 0;

  // Each remaining cell needs at least 1 cost to unlock
  // Plus travel: estimate using nearest-neighbor tour from current position
  let currentPos = state.playerPos;
  const remaining = [...positions];
  let travelCost = 0;
  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = manhattan(currentPos, remaining[0]);
    for (let i = 1; i < remaining.length; i++) {
      const d = manhattan(currentPos, remaining[i]);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    travelCost += bestDist;
    currentPos = remaining[bestIdx];
    remaining.splice(bestIdx, 1);
  }

  // Estimate skips: count keys in ring that won't match any remaining cell
  const remainingByType = [0, 0, 0, 0];
  for (const cell of state.cells) {
    if (!cell.unlocked) remainingByType[cell.lockType]++;
  }

  let skips = 0;
  const tempRemaining = [...remainingByType];
  let pos = state.ringPos;
  let unlocks = 0;
  const target = locked;
  let safety = locked + state.ringKeys.length * 3;
  while (unlocks < target && safety > 0) {
    safety--;
    const keyType = state.ringKeys[pos % state.ringKeys.length];
    if (tempRemaining[keyType] > 0) {
      tempRemaining[keyType]--;
      unlocks++;
    } else {
      skips++;
    }
    pos = (pos + 1) % state.ringKeys.length;
  }

  return locked + travelCost + skips;
}

/* ─── Min-Heap ─── */
class MinHeap<T> {
  private data: T[] = [];
  constructor(private key: (item: T) => number) {}

  get length() { return this.data.length; }

  push(item: T) {
    this.data.push(item);
    this.bubbleUp(this.data.length - 1);
  }

  pop(): T | undefined {
    if (this.data.length === 0) return undefined;
    const top = this.data[0];
    const last = this.data.pop()!;
    if (this.data.length > 0) {
      this.data[0] = last;
      this.sinkDown(0);
    }
    return top;
  }

  private bubbleUp(i: number) {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.key(this.data[i]) < this.key(this.data[parent])) {
        [this.data[i], this.data[parent]] = [this.data[parent], this.data[i]];
        i = parent;
      } else break;
    }
  }

  private sinkDown(i: number) {
    const n = this.data.length;
    while (true) {
      let smallest = i;
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      if (left < n && this.key(this.data[left]) < this.key(this.data[smallest])) smallest = left;
      if (right < n && this.key(this.data[right]) < this.key(this.data[smallest])) smallest = right;
      if (smallest !== i) {
        [this.data[i], this.data[smallest]] = [this.data[smallest], this.data[i]];
        i = smallest;
      } else break;
    }
  }
}

/* ─── Solver ─── */

type SearchNode = {
  state: VaultState;
  moves: Move[];
  cost: number;
  priority: number;
};

function solveWithBudget(puzzle: VaultState, maxNodes: number): Solution | null {
  if (isGoal(puzzle)) return { moves: [], steps: 0 };

  const visited = new Map<string, number>();
  const startKey = stateKey(puzzle);
  visited.set(startKey, 0);

  const frontier = new MinHeap<SearchNode>((n) => n.priority);
  frontier.push({
    state: puzzle,
    moves: [],
    cost: 0,
    priority: heuristic(puzzle),
  });

  let nodes = 0;

  while (frontier.length > 0 && nodes < maxNodes) {
    const current = frontier.pop()!;
    nodes++;

    // Skip if we've found a better path to this state
    const curKey = stateKey(current.state);
    const bestCost = visited.get(curKey);
    if (bestCost !== undefined && bestCost < current.cost) continue;

    const legal = legalMoves(current.state);
    for (const m of legal) {
      const mc = moveCost(current.state, m);
      const ns = applyMove(current.state, m);
      const key = stateKey(ns);
      const cost = current.cost + mc;

      const prev = visited.get(key);
      if (prev !== undefined && prev <= cost) continue;
      visited.set(key, cost);

      const newMoves = [...current.moves, m];

      if (isGoal(ns)) {
        return { moves: newMoves, steps: cost };
      }

      if (cost > puzzle.par * 2) continue;

      const h = heuristic(ns);
      frontier.push({
        state: ns,
        moves: newMoves,
        cost,
        priority: cost + h,
      });
    }
  }

  return null;
}

export function solve(
  puzzle: VaultState,
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
      return solveWithBudget(puzzle, 50000);
    case 5:
      return solveWithBudget(puzzle, 200000);
  }
}

/** Level 1: random valid moves (pick any matching cell, no spatial awareness) */
function solveRandom(puzzle: VaultState): Solution | null {
  let state = cloneState(puzzle);
  const moves: Move[] = [];
  let totalCost = 0;
  const maxSteps = puzzle.cells.length * 6;

  let rngState = puzzle.ringPos + 42;
  function quickRng() {
    rngState = (rngState * 1664525 + 1013904223) & 0x7fffffff;
    return rngState / 0x7fffffff;
  }

  for (let step = 0; step < maxSteps; step++) {
    if (isGoal(state)) return { moves, steps: totalCost };

    const legal = legalMoves(state);
    const unlocks = legal.filter((m) => m.type === 'unlock');

    let chosen: Move;
    if (unlocks.length > 0) {
      // Random: pick any matching cell (ignores distance)
      chosen = unlocks[Math.floor(quickRng() * unlocks.length)];
    } else {
      chosen = { type: 'skip' };
    }

    totalCost += moveCost(state, chosen);
    state = applyMove(state, chosen);
    moves.push(chosen);
  }

  return isGoal(state) ? { moves, steps: totalCost } : null;
}

/** Level 2: greedy - unlock nearest matching cell (locally optimal) */
function solveGreedy(puzzle: VaultState): Solution | null {
  let state = cloneState(puzzle);
  const moves: Move[] = [];
  let totalCost = 0;
  const maxSteps = puzzle.cells.length * 6;

  for (let step = 0; step < maxSteps; step++) {
    if (isGoal(state)) return { moves, steps: totalCost };

    const legal = legalMoves(state);
    const unlocks = legal.filter((m) => m.type === 'unlock');

    if (unlocks.length > 0) {
      // Greedy: pick nearest matching cell
      let best = unlocks[0];
      let bestDist = Infinity;
      for (const m of unlocks) {
        if (m.type === 'unlock') {
          const cell = state.cells[m.cellIndex];
          const dist = manhattan(state.playerPos, cell.pos);
          if (dist < bestDist) {
            bestDist = dist;
            best = m;
          }
        }
      }
      totalCost += moveCost(state, best);
      state = applyMove(state, best);
      moves.push(best);
    } else {
      const skip: Move = { type: 'skip' };
      totalCost += 1;
      state = applyMove(state, skip);
      moves.push(skip);
    }
  }

  return isGoal(state) ? { moves, steps: totalCost } : null;
}

/** Level 3: greedy + 1-step lookahead (considers next key too) */
function solveGreedyLookahead(puzzle: VaultState): Solution | null {
  let state = cloneState(puzzle);
  const moves: Move[] = [];
  let totalCost = 0;
  const maxSteps = puzzle.cells.length * 6;

  for (let step = 0; step < maxSteps; step++) {
    if (isGoal(state)) return { moves, steps: totalCost };

    const legal = legalMoves(state);

    let bestMove = legal[0];
    let bestScore = Infinity;

    for (const m of legal) {
      const mc = moveCost(state, m);
      const ns = applyMove(state, m);

      if (isGoal(ns)) {
        totalCost += mc;
        state = ns;
        moves.push(m);
        return { moves, steps: totalCost };
      }

      const h1 = heuristic(ns);

      // Look ahead one more step
      const legal2 = legalMoves(ns);
      let bestH2 = Infinity;
      for (const m2 of legal2) {
        const ns2 = applyMove(ns, m2);
        const h2 = heuristic(ns2);
        if (h2 < bestH2) bestH2 = h2;
      }

      const score = mc + h1 * 0.8 + bestH2 * 0.2;
      if (score < bestScore) {
        bestScore = score;
        bestMove = m;
      }
    }

    totalCost += moveCost(state, bestMove);
    state = applyMove(state, bestMove);
    moves.push(bestMove);
  }

  return isGoal(state) ? { moves, steps: totalCost } : null;
}
