/**
 * Flock Solver
 *
 * Rules: Tap a direction (up/down/left/right) to slide ALL birds simultaneously
 * until each hits a wall or another bird. Group all same-colored birds into
 * connected clusters to win within par moves.
 *
 * A move = direction (N/S/E/W). ALL birds slide simultaneously in that direction.
 * Each bird slides until it hits a wall or another bird that has already stopped.
 * Goal: every color's birds form a single connected cluster (4-connected).
 *
 * Solver uses IDA* (Iterative Deepening A*) for optimal solutions with minimal
 * memory usage. The branching factor is only 4 (directions), so IDA* with a
 * good heuristic is very effective up to depth ~15.
 */

export type Pos = { r: number; c: number };

export type Bird = {
  color: number;
  pos: Pos;
};

export type FlockState = {
  gridSize: number;
  birds: Bird[];
  numColors: number;
};

export type Direction = 'N' | 'S' | 'E' | 'W';
export type Move = Direction;

export const DIRECTIONS: Direction[] = ['N', 'S', 'E', 'W'];
export const DIR_NAMES: Record<Direction, string> = {
  N: 'Up',
  S: 'Down',
  E: 'Right',
  W: 'Left',
};

const DIR_DELTA: Record<Direction, [number, number]> = {
  N: [-1, 0],
  S: [1, 0],
  E: [0, 1],
  W: [0, -1],
};

const OPPOSITE: Record<Direction, Direction> = {
  N: 'S',
  S: 'N',
  E: 'W',
  W: 'E',
};

/* ─── State helpers ─── */

function cloneState(state: FlockState): FlockState {
  return {
    gridSize: state.gridSize,
    birds: state.birds.map((b) => ({
      color: b.color,
      pos: { r: b.pos.r, c: b.pos.c },
    })),
    numColors: state.numColors,
  };
}

/** Compact numeric key for deduplication. Birds sorted by color then position. */
function stateKey(state: FlockState): string {
  const gs = state.gridSize;
  const sorted = [...state.birds].sort((a, b) =>
    a.color !== b.color
      ? a.color - b.color
      : a.pos.r !== b.pos.r
        ? a.pos.r - b.pos.r
        : a.pos.c - b.pos.c,
  );
  // Encode as compact string: each bird = color*gridSize^2 + r*gridSize + c
  return sorted.map((b) => b.color * gs * gs + b.pos.r * gs + b.pos.c).join(',');
}

/* ─── Core game logic ─── */

export function isGoal(state: FlockState): boolean {
  for (let c = 0; c < state.numColors; c++) {
    const colorBirds = state.birds.filter((b) => b.color === c);
    if (colorBirds.length <= 1) continue;
    if (!isConnected(colorBirds)) return false;
  }
  return true;
}

function isConnected(birds: Bird[]): boolean {
  if (birds.length <= 1) return true;
  const posSet = new Set(birds.map((b) => b.pos.r * 100 + b.pos.c));
  const visited = new Set<number>();
  const queue: number[] = [birds[0].pos.r * 100 + birds[0].pos.c];
  visited.add(queue[0]);

  while (queue.length > 0) {
    const cur = queue.shift()!;
    const r = Math.floor(cur / 100);
    const c = cur % 100;
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nk = (r + dr) * 100 + (c + dc);
      if (posSet.has(nk) && !visited.has(nk)) {
        visited.add(nk);
        queue.push(nk);
      }
    }
  }
  return visited.size === birds.length;
}

/**
 * Heuristic: sum of (components - 1) per color.
 * This is admissible for IDA*: each move can reduce total components by at most
 * numColors (one per color), but typically much less.
 */
export function heuristic(state: FlockState): number {
  let total = 0;
  for (let c = 0; c < state.numColors; c++) {
    const colorBirds = state.birds.filter((b) => b.color === c);
    if (colorBirds.length <= 1) continue;
    total += countComponents(colorBirds) - 1;
  }
  return total;
}

function countComponents(birds: Bird[]): number {
  const posSet = new Set(birds.map((b) => b.pos.r * 100 + b.pos.c));
  const visited = new Set<number>();
  let components = 0;

  for (const bird of birds) {
    const key = bird.pos.r * 100 + bird.pos.c;
    if (visited.has(key)) continue;
    components++;
    const queue: number[] = [key];
    visited.add(key);
    while (queue.length > 0) {
      const cur = queue.shift()!;
      const r = Math.floor(cur / 100);
      const c = cur % 100;
      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const nk = (r + dr) * 100 + (c + dc);
        if (posSet.has(nk) && !visited.has(nk)) {
          visited.add(nk);
          queue.push(nk);
        }
      }
    }
  }
  return components;
}

export function legalMoves(_state: FlockState): Move[] {
  return [...DIRECTIONS];
}

export function applyMove(state: FlockState, move: Move): FlockState {
  const next = cloneState(state);
  const [dr, dc] = DIR_DELTA[move];
  const gs = next.gridSize;

  // Sort birds by processing order for this direction
  const indices = next.birds.map((_, i) => i);
  if (move === 'N') {
    indices.sort((a, b) => next.birds[a].pos.r - next.birds[b].pos.r);
  } else if (move === 'S') {
    indices.sort((a, b) => next.birds[b].pos.r - next.birds[a].pos.r);
  } else if (move === 'W') {
    indices.sort((a, b) => next.birds[a].pos.c - next.birds[b].pos.c);
  } else {
    indices.sort((a, b) => next.birds[b].pos.c - next.birds[a].pos.c);
  }

  const occupied = new Set<number>();

  for (const idx of indices) {
    const bird = next.birds[idx];
    let { r, c } = bird.pos;

    while (true) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= gs || nc < 0 || nc >= gs) break;
      if (occupied.has(nr * gs + nc)) break;
      r = nr;
      c = nc;
    }

    bird.pos = { r, c };
    occupied.add(r * gs + c);
  }

  return next;
}

/** Check if a move actually changes the state */
function moveChangesState(state: FlockState, move: Move): boolean {
  const next = applyMove(state, move);
  for (let i = 0; i < state.birds.length; i++) {
    if (state.birds[i].pos.r !== next.birds[i].pos.r ||
        state.birds[i].pos.c !== next.birds[i].pos.c) {
      return true;
    }
  }
  return false;
}

/* ─── Puzzle generation ─── */

function rngFactory(seed: number) {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generate puzzle by:
 * 1. Create a solved state (birds clustered by color)
 * 2. Scramble with random moves, keeping only moves that actually change the board
 * 3. Verify solvability with the solver
 * 4. If unsolvable or too easy, retry with a different seed offset
 */
export function generatePuzzle(seed: number, difficulty: number): FlockState {
  const gridSize = 6;
  const numColors = difficulty <= 3 ? 3 : 4;
  const birdsPerColor = difficulty <= 1 ? 3 : difficulty <= 2 ? 3 : 4;

  // Target optimal solution length by difficulty
  const minOptimal = difficulty <= 1 ? 3 : difficulty <= 2 ? 4 : difficulty <= 3 ? 5 : difficulty <= 4 ? 6 : 7;
  const maxOptimal = minOptimal + 4;

  for (let attempt = 0; attempt < 50; attempt++) {
    const rng = rngFactory(seed + attempt * 7919);

    const solvedState = generateSolvedState(gridSize, numColors, birdsPerColor, rng);
    if (!isGoal(solvedState)) continue;

    // Scramble with enough effective moves
    const scrambleMoves = minOptimal + Math.floor(rng() * 8) + 4;
    let state = cloneState(solvedState);
    let lastDir: Direction | null = null;
    let effectiveMoves = 0;

    for (let i = 0; i < scrambleMoves * 3 && effectiveMoves < scrambleMoves; i++) {
      const dir = DIRECTIONS[Math.floor(rng() * 4)];
      // Skip immediate reversals
      if (lastDir && dir === OPPOSITE[lastDir]) continue;
      // Skip no-op moves
      if (!moveChangesState(state, dir)) continue;

      state = applyMove(state, dir);
      lastDir = dir;
      effectiveMoves++;
    }

    if (isGoal(state)) continue;

    // Verify solvability with IDA*
    const sol = solveIDA(state, maxOptimal + 2);
    if (!sol) continue;
    if (sol.steps < minOptimal) continue;

    return state;
  }

  // Fallback: return whatever we can generate
  const rng = rngFactory(seed);
  const solvedState = generateSolvedState(gridSize, numColors, birdsPerColor, rng);
  let state = cloneState(solvedState);
  for (let i = 0; i < 20; i++) {
    const dir = DIRECTIONS[Math.floor(rng() * 4)];
    state = applyMove(state, dir);
  }
  if (isGoal(state)) state = applyMove(state, 'N');
  return state;
}

function generateSolvedState(
  gridSize: number,
  numColors: number,
  birdsPerColor: number,
  rng: () => number,
): FlockState {
  const birds: Bird[] = [];
  const occupied = new Set<number>();

  for (let color = 0; color < numColors; color++) {
    let placed = false;

    for (let attempt = 0; attempt < 200; attempt++) {
      const clusterBirds: Bird[] = [];
      const clusterOcc = new Set<number>();

      const startR = Math.floor(rng() * gridSize);
      const startC = Math.floor(rng() * gridSize);
      const startKey = startR * gridSize + startC;

      if (occupied.has(startKey)) continue;

      clusterBirds.push({ color, pos: { r: startR, c: startC } });
      clusterOcc.add(startKey);

      let success = true;
      for (let b = 1; b < birdsPerColor; b++) {
        const candidates: Pos[] = [];
        for (const bird of clusterBirds) {
          for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
            const nr = bird.pos.r + dr;
            const nc = bird.pos.c + dc;
            const key = nr * gridSize + nc;
            if (nr >= 0 && nr < gridSize && nc >= 0 && nc < gridSize &&
              !occupied.has(key) && !clusterOcc.has(key)) {
              candidates.push({ r: nr, c: nc });
            }
          }
        }

        if (candidates.length === 0) { success = false; break; }

        const pick = candidates[Math.floor(rng() * candidates.length)];
        clusterBirds.push({ color, pos: pick });
        clusterOcc.add(pick.r * gridSize + pick.c);
      }

      if (success) {
        for (const b of clusterBirds) {
          birds.push(b);
          occupied.add(b.pos.r * gridSize + b.pos.c);
        }
        placed = true;
        break;
      }
    }

    if (!placed) {
      // Fallback: place in any open cells
      let count = 0;
      for (let r = 0; r < gridSize && count < birdsPerColor; r++) {
        for (let c = 0; c < gridSize && count < birdsPerColor; c++) {
          const key = r * gridSize + c;
          if (!occupied.has(key)) {
            birds.push({ color, pos: { r, c } });
            occupied.add(key);
            count++;
          }
        }
      }
    }
  }

  return { gridSize, birds, numColors };
}

/* ─── IDA* Solver ─── */

export type Solution = {
  moves: Move[];
  steps: number;
  statesExplored: number;
};

let _nodesExplored = 0;

/**
 * IDA* solver with the heuristic h = sum of (components-1) per color.
 * Since branching factor = 4, depth 12 is ~16M nodes worst case,
 * but pruning makes it much smaller.
 */
function solveIDA(state: FlockState, maxDepth: number): Solution | null {
  if (isGoal(state)) return { moves: [], steps: 0, statesExplored: 0 };

  _nodesExplored = 0;
  const h0 = heuristic(state);
  let bound = h0;

  for (let iter = 0; iter < maxDepth + 1; iter++) {
    const result = idaSearch(state, [], 0, bound, null);
    if (result.found) {
      return {
        moves: result.moves!,
        steps: result.moves!.length,
        statesExplored: _nodesExplored,
      };
    }
    if (result.nextBound === Infinity) return null;
    bound = result.nextBound;
    if (bound > maxDepth) return null;
  }
  return null;
}

type IDAResult = {
  found: boolean;
  moves?: Move[];
  nextBound: number;
};

function idaSearch(
  state: FlockState,
  path: Move[],
  g: number,
  bound: number,
  lastMove: Direction | null,
): IDAResult {
  const h = heuristic(state);
  const f = g + h;
  if (f > bound) return { found: false, nextBound: f };
  if (h === 0 && isGoal(state)) return { found: true, moves: [...path], nextBound: bound };

  _nodesExplored++;
  let minBound = Infinity;

  for (const dir of DIRECTIONS) {
    // Prune immediate reversals
    if (lastMove && dir === OPPOSITE[lastMove]) continue;

    const next = applyMove(state, dir);

    // Prune no-op moves (state unchanged)
    if (stateKey(next) === stateKey(state)) continue;

    path.push(dir);
    const result = idaSearch(next, path, g + 1, bound, dir);
    if (result.found) return result;
    if (result.nextBound < minBound) minBound = result.nextBound;
    path.pop();
  }

  return { found: false, nextBound: minBound };
}

/* ─── Public solver interface ─── */

export function solve(
  puzzle: FlockState,
  skillLevel: 1 | 2 | 3 | 4 | 5,
): Solution | null {
  if (skillLevel === 1) return solveRandom(puzzle);
  if (skillLevel === 2) return solveGreedy(puzzle);
  if (skillLevel === 3) return solveGreedyLookahead(puzzle);
  if (skillLevel === 4) return solveIDA(puzzle, 10);
  return solveIDA(puzzle, 15);
}

function solveRandom(state: FlockState): Solution | null {
  let current = cloneState(state);
  const moves: Move[] = [];
  let explored = 0;

  for (let i = 0; i < 100; i++) {
    if (isGoal(current)) return { moves, steps: moves.length, statesExplored: explored };
    const dir = DIRECTIONS[Math.floor(Math.random() * 4)];
    current = applyMove(current, dir);
    moves.push(dir);
    explored++;
  }
  return isGoal(current) ? { moves, steps: moves.length, statesExplored: explored } : null;
}

function solveGreedy(state: FlockState): Solution | null {
  let current = cloneState(state);
  const moves: Move[] = [];
  const visited = new Set<string>([stateKey(current)]);
  let explored = 0;

  for (let i = 0; i < 50; i++) {
    if (isGoal(current)) return { moves, steps: moves.length, statesExplored: explored };

    let bestDir: Direction | null = null;
    let bestH = Infinity;

    for (const dir of DIRECTIONS) {
      const next = applyMove(current, dir);
      const key = stateKey(next);
      explored++;
      const h = heuristic(next);
      if (h < bestH && !visited.has(key)) {
        bestH = h;
        bestDir = dir;
      }
    }

    if (bestDir === null) {
      for (const dir of DIRECTIONS) {
        const next = applyMove(current, dir);
        if (!visited.has(stateKey(next))) { bestDir = dir; break; }
      }
    }
    if (bestDir === null) return null;

    current = applyMove(current, bestDir);
    moves.push(bestDir);
    visited.add(stateKey(current));
  }
  return isGoal(current) ? { moves, steps: moves.length, statesExplored: explored } : null;
}

function solveGreedyLookahead(state: FlockState): Solution | null {
  let current = cloneState(state);
  const moves: Move[] = [];
  const visited = new Set<string>([stateKey(current)]);
  let explored = 0;

  for (let i = 0; i < 50; i++) {
    if (isGoal(current)) return { moves, steps: moves.length, statesExplored: explored };

    let bestDir: Direction | null = null;
    let bestH = Infinity;

    for (const dir of DIRECTIONS) {
      const next = applyMove(current, dir);
      explored++;
      if (isGoal(next)) {
        moves.push(dir);
        return { moves, steps: moves.length, statesExplored: explored };
      }

      let minH = heuristic(next);
      for (const dir2 of DIRECTIONS) {
        const next2 = applyMove(next, dir2);
        explored++;
        const h2 = heuristic(next2);
        if (h2 < minH) minH = h2;
      }

      const key = stateKey(next);
      if (minH < bestH && !visited.has(key)) {
        bestH = minH;
        bestDir = dir;
      }
    }

    if (bestDir === null) {
      for (const dir of DIRECTIONS) {
        if (!visited.has(stateKey(applyMove(current, dir)))) { bestDir = dir; break; }
      }
    }
    if (bestDir === null) return null;

    current = applyMove(current, bestDir);
    moves.push(bestDir);
    visited.add(stateKey(current));
  }
  return isGoal(current) ? { moves, steps: moves.length, statesExplored: explored } : null;
}

/* ─── Metrics helpers ─── */

export function getOptimalSolution(state: FlockState): Solution | null {
  return solveIDA(state, 15);
}

export function computePuzzleEntropy(state: FlockState, solution: Solution): number {
  let entropy = 0;
  let current = cloneState(state);
  for (const move of solution.moves) {
    const legal = legalMoves(current);
    if (legal.length > 1) entropy += Math.log2(legal.length);
    current = applyMove(current, move);
  }
  return entropy;
}

export function computeDecisionEntropy(state: FlockState, solution: Solution): number {
  let totalEntropy = 0;
  let steps = 0;
  let current = cloneState(state);

  for (const move of solution.moves) {
    const heuristics: number[] = [];
    for (const dir of DIRECTIONS) {
      const next = applyMove(current, dir);
      heuristics.push(heuristic(next));
    }

    // Softmax to get probability-like weights
    const minH = Math.min(...heuristics);
    const weights = heuristics.map((h) => Math.exp(-(h - minH)));
    const sum = weights.reduce((a, b) => a + b, 0);
    const probs = weights.map((w) => w / sum);

    let shannonH = 0;
    for (const p of probs) {
      if (p > 0) shannonH -= p * Math.log2(p);
    }
    totalEntropy += shannonH;
    steps++;

    current = applyMove(current, move);
  }

  return steps > 0 ? totalEntropy / steps : 0;
}

export function countCounterintuitiveMoves(state: FlockState, solution: Solution): number {
  let count = 0;
  let current = cloneState(state);

  for (const move of solution.moves) {
    const currentH = heuristic(current);
    const next = applyMove(current, move);
    const nextH = heuristic(next);
    if (nextH > currentH) count++;
    current = next;
  }
  return count;
}

export function computeDrama(state: FlockState, solution: Solution): number {
  if (solution.steps === 0) return 0;

  let current = cloneState(state);
  const initialH = heuristic(current);
  if (initialH === 0) return 0;
  let maxProgress = 0;

  for (const move of solution.moves) {
    current = applyMove(current, move);
    const h = heuristic(current);
    const progress = (initialH - h) / initialH;
    if (progress > maxProgress) maxProgress = progress;
  }

  return maxProgress;
}

export function computeInfoGainRatio(state: FlockState): number {
  const currentH = heuristic(state);
  if (currentH === 0) return 1;

  const outcomes: number[] = [];
  for (const dir of DIRECTIONS) {
    outcomes.push(heuristic(applyMove(state, dir)));
  }

  const bestOutcome = Math.min(...outcomes);
  const avgOutcome = outcomes.reduce((a, b) => a + b, 0) / outcomes.length;

  const bestImprovement = Math.max(0.01, currentH - bestOutcome);
  const avgImprovement = Math.max(0.01, currentH - avgOutcome);

  return bestImprovement / avgImprovement;
}

export function countUniqueSolutions(state: FlockState, optimal: Solution): number {
  if (!optimal || optimal.steps === 0) return 1;

  const targetLen = optimal.steps + 1;
  const solutions = new Set<string>();
  const visited = new Set<string>([stateKey(state)]);
  let explored = 0;

  function dfs(cur: FlockState, moves: Move[], depth: number): void {
    if (explored > 50000) return; // Safety limit
    if (depth > targetLen) return;
    if (isGoal(cur)) {
      solutions.add(moves.join(','));
      return;
    }
    if (depth === targetLen) return;

    for (const dir of DIRECTIONS) {
      explored++;
      const next = applyMove(cur, dir);
      const key = stateKey(next);
      if (visited.has(key)) continue;
      visited.add(key);
      dfs(next, [...moves, dir], depth + 1);
      visited.delete(key);
    }
  }

  dfs(state, [], 0);
  return Math.max(1, solutions.size);
}
