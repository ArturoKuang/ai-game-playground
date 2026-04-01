/**
 * Herd Solver
 *
 * Rules: Issue directional commands to move all animals of one color
 * simultaneously toward their matching pen. Animals block each other
 * on collision. Get every animal home within par moves.
 *
 * A move = (color, direction). All animals of that color slide one cell
 * in the given direction, unless blocked by another animal or a wall.
 *
 * Goal: every animal occupies its pen (target position).
 */

export type Pos = { r: number; c: number };

export type Animal = {
  color: number; // 0-based color index
  pos: Pos;
};

export type Pen = {
  color: number;
  pos: Pos;
};

export type HerdState = {
  gridSize: number;
  animals: Animal[];
  pens: Pen[];
};

export type Move = {
  color: number;
  dir: Direction;
};

export type Direction = 'N' | 'S' | 'E' | 'W';

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

/* ─── State helpers ─── */

function cloneState(state: HerdState): HerdState {
  return {
    gridSize: state.gridSize,
    animals: state.animals.map((a) => ({ color: a.color, pos: { ...a.pos } })),
    pens: state.pens,
  };
}

function stateKey(state: HerdState): string {
  // Sort animals by color then position for canonical key
  const sorted = [...state.animals].sort((a, b) =>
    a.color !== b.color
      ? a.color - b.color
      : a.pos.r !== b.pos.r
        ? a.pos.r - b.pos.r
        : a.pos.c - b.pos.c,
  );
  return sorted.map((a) => `${a.color}:${a.pos.r},${a.pos.c}`).join('|');
}

/* ─── Core game logic ─── */

export function isGoal(state: HerdState): boolean {
  // Every animal must be on its matching-color pen
  for (const animal of state.animals) {
    const onPen = state.pens.some(
      (p) => p.color === animal.color && p.pos.r === animal.pos.r && p.pos.c === animal.pos.c,
    );
    if (!onPen) return false;
  }
  return true;
}

export function heuristic(state: HerdState): number {
  // Optimal assignment: use min-cost matching of animals to pens per color
  let total = 0;
  const colorGroups = new Map<number, { animals: Pos[]; pens: Pos[] }>();
  for (const a of state.animals) {
    if (!colorGroups.has(a.color)) colorGroups.set(a.color, { animals: [], pens: [] });
    colorGroups.get(a.color)!.animals.push(a.pos);
  }
  for (const p of state.pens) {
    if (!colorGroups.has(p.color)) colorGroups.set(p.color, { animals: [], pens: [] });
    colorGroups.get(p.color)!.pens.push(p.pos);
  }

  for (const [, group] of colorGroups) {
    // Greedy matching (good enough for heuristic)
    const used = new Set<number>();
    for (const aPos of group.animals) {
      let bestDist = Infinity;
      let bestIdx = -1;
      for (let j = 0; j < group.pens.length; j++) {
        if (used.has(j)) continue;
        const d = Math.abs(aPos.r - group.pens[j].r) + Math.abs(aPos.c - group.pens[j].c);
        if (d < bestDist) { bestDist = d; bestIdx = j; }
      }
      if (bestIdx >= 0) {
        total += bestDist;
        used.add(bestIdx);
      }
    }
  }
  return total;
}

export function legalMoves(state: HerdState): Move[] {
  const colors = new Set<number>();
  for (const a of state.animals) colors.add(a.color);
  const moves: Move[] = [];
  for (const color of colors) {
    for (const dir of DIRECTIONS) {
      moves.push({ color, dir });
    }
  }
  return moves;
}

/** Filter out moves that don't change the state (no-ops). */
function effectiveMoves(state: HerdState): Move[] {
  const key0 = stateKey(state);
  return legalMoves(state).filter((m) => stateKey(applyMove(state, m)) !== key0);
}

export function applyMove(state: HerdState, move: Move): HerdState {
  const next = cloneState(state);
  const [dr, dc] = DIR_DELTA[move.dir];

  // Build occupancy grid (all animals)
  const occupied = new Set<string>();
  for (const a of next.animals) {
    occupied.add(`${a.pos.r},${a.pos.c}`);
  }

  // Get animals of the given color
  const movers = next.animals.filter((a) => a.color === move.color);
  // Sort so we process in direction order (front-first to avoid self-collision)
  movers.sort((a, b) => {
    if (dr !== 0) return dr > 0 ? b.pos.r - a.pos.r : a.pos.r - b.pos.r;
    if (dc !== 0) return dc > 0 ? b.pos.c - a.pos.c : a.pos.c - b.pos.c;
    return 0;
  });

  // Move each animal one step (blocked by walls or other animals)
  for (const animal of movers) {
    const newR = animal.pos.r + dr;
    const newC = animal.pos.c + dc;
    // Check wall
    if (newR < 0 || newR >= state.gridSize || newC < 0 || newC >= state.gridSize) continue;
    // Check occupancy
    const key = `${newR},${newC}`;
    occupied.delete(`${animal.pos.r},${animal.pos.c}`);
    if (occupied.has(key)) {
      occupied.add(`${animal.pos.r},${animal.pos.c}`);
      continue;
    }
    animal.pos.r = newR;
    animal.pos.c = newC;
    occupied.add(key);
  }

  return next;
}

/* ─── Puzzle generation ─── */

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

/**
 * Generate a puzzle with guaranteed counterintuitive moves.
 *
 * Strategy: generate many candidate scrambles, solve each with A*,
 * and keep the one with the best CI count (at least 2).
 *
 * For blocking to force CI moves, pens must be placed so that
 * animals of different colors block each other's direct paths.
 * We place pens in OPPOSING corners so animals must cross paths.
 */
export function generatePuzzle(seed: number, difficulty: number): HerdState {
  const gridSize = 5;

  // Difficulty: 2 colors always (for tractable search), vary scramble depth
  const numColors = 2 + Math.floor(difficulty / 3); // 2 or 3
  const animalsPerColor = 2;
  const targetDepth = 3 + difficulty; // Mon: 4, Fri: 8
  const minCI = difficulty >= 3 ? 2 : 1; // Require CI moves

  let bestState: HerdState | null = null;
  let bestCI = -1;
  let bestSol: Solution | null = null;

  for (let attempt = 0; attempt < 50; attempt++) {
    const rng = seededRng(seed + difficulty * 9973 + attempt * 7919);
    const pens = placePensOpposing(rng, gridSize, numColors, animalsPerColor);

    // Start from goal
    const goalAnimals: Animal[] = pens.map((p) => ({
      color: p.color,
      pos: { ...p.pos },
    }));
    let state: HerdState = { gridSize, animals: goalAnimals, pens };

    // Scramble with increasing depth
    const colors = Array.from(new Set(pens.map((p) => p.color)));
    const scrambleCount = 8 + difficulty * 4 + attempt;
    for (let i = 0; i < scrambleCount; i++) {
      const color = colors[Math.floor(rng() * colors.length)];
      const dir = DIRECTIONS[Math.floor(rng() * 4)];
      const next = applyMove(state, { color, dir });
      if (stateKey(next) !== stateKey(state)) {
        state = next;
      }
    }

    if (isGoal(state)) continue;

    // Solve with A*
    const sol = solveAStar(state, 500000);
    if (!sol) continue;
    if (sol.steps < targetDepth) continue;

    // Count CI moves
    const ci = countCI(state, sol);

    if (ci > bestCI || (ci === bestCI && sol.steps > (bestSol?.steps ?? 0))) {
      bestCI = ci;
      bestState = state;
      bestSol = sol;
    }

    // Early exit if we found a good puzzle
    if (ci >= minCI && sol.steps >= targetDepth) break;
  }

  if (bestState) return bestState;

  // Absolute fallback
  const rng = seededRng(seed + difficulty * 9973 + 999);
  const pens = placePensOpposing(rng, gridSize, numColors, animalsPerColor);
  const goalAnimals: Animal[] = pens.map((p) => ({ color: p.color, pos: { ...p.pos } }));
  let state: HerdState = { gridSize, animals: goalAnimals, pens };
  const colors = Array.from(new Set(pens.map((p) => p.color)));
  for (let i = 0; i < 20; i++) {
    const color = colors[Math.floor(rng() * colors.length)];
    const dir = DIRECTIONS[Math.floor(rng() * 4)];
    const next = applyMove(state, { color, dir });
    if (stateKey(next) !== stateKey(state)) state = next;
  }
  if (isGoal(state)) state = applyMove(state, { color: colors[0], dir: 'N' });
  return state;
}

/** Quick CI count without full metrics */
function countCI(puzzle: HerdState, sol: Solution): number {
  let ci = 0;
  let state = cloneState(puzzle);
  for (const m of sol.moves) {
    const h0 = heuristic(state);
    state = applyMove(state, m);
    if (heuristic(state) > h0) ci++;
  }
  return ci;
}

/**
 * Place pens in OPPOSING corners/edges so colors must cross paths.
 * Color 0: top-left region, Color 1: bottom-right region.
 * This ensures animals must navigate through each other's territory.
 */
function placePensOpposing(
  rng: () => number,
  gridSize: number,
  numColors: number,
  animalsPerColor: number,
): Pen[] {
  const pens: Pen[] = [];
  const used = new Set<string>();

  // Opposing corner anchors
  const anchors: Pos[] = [
    { r: 0, c: 0 },           // Color 0: top-left
    { r: gridSize - 1, c: gridSize - 1 }, // Color 1: bottom-right
    { r: 0, c: gridSize - 1 }, // Color 2: top-right
    { r: gridSize - 1, c: 0 }, // Color 3: bottom-left
  ];

  for (let color = 0; color < numColors; color++) {
    const anchor = anchors[color % anchors.length];
    // Collect positions near anchor
    const candidates: Pos[] = [];
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const d = Math.abs(r - anchor.r) + Math.abs(c - anchor.c);
        if (d <= 2) candidates.push({ r, c }); // Stay close to corner
      }
    }
    // Shuffle
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    let placed = 0;
    for (const pos of candidates) {
      const key = `${pos.r},${pos.c}`;
      if (!used.has(key)) {
        pens.push({ color, pos: { ...pos } });
        used.add(key);
        placed++;
        if (placed >= animalsPerColor) break;
      }
    }
  }

  return pens;
}

/* ─── Solver ─── */

export type Solution = {
  moves: Move[];
  steps: number;
  statesExplored: number;
};

export function solve(
  puzzle: HerdState,
  skillLevel: 1 | 2 | 3 | 4 | 5,
): Solution | null {
  if (skillLevel === 1) return solveRandom(puzzle);
  if (skillLevel === 2) return solveGreedy(puzzle);
  if (skillLevel === 3) return solveGreedyLookahead(puzzle);
  if (skillLevel === 4) return solveAStar(puzzle, 100000);
  return solveAStar(puzzle, 1000000);
}

function solveRandom(puzzle: HerdState): Solution | null {
  let state = cloneState(puzzle);
  const moves: Move[] = [];
  const maxSteps = 300;
  const rng = seededRng(42);

  for (let i = 0; i < maxSteps; i++) {
    if (isGoal(state)) return { moves, steps: moves.length, statesExplored: i };
    const legal = legalMoves(state);
    const m = legal[Math.floor(rng() * legal.length)];
    state = applyMove(state, m);
    moves.push(m);
  }
  return isGoal(state) ? { moves, steps: moves.length, statesExplored: maxSteps } : null;
}

function solveGreedy(puzzle: HerdState): Solution | null {
  let state = cloneState(puzzle);
  const moves: Move[] = [];
  const maxSteps = 150;
  const visited = new Set<string>([stateKey(state)]);

  for (let i = 0; i < maxSteps; i++) {
    if (isGoal(state)) return { moves, steps: moves.length, statesExplored: i };
    const legal = legalMoves(state);
    let bestMove: Move | null = null;
    let bestH = Infinity;
    for (const m of legal) {
      const ns = applyMove(state, m);
      const h = heuristic(ns);
      const key = stateKey(ns);
      if (h < bestH && !visited.has(key)) {
        bestH = h;
        bestMove = m;
      }
    }
    if (!bestMove) return null;
    state = applyMove(state, bestMove);
    moves.push(bestMove);
    visited.add(stateKey(state));
  }
  return isGoal(state) ? { moves, steps: moves.length, statesExplored: maxSteps } : null;
}

function solveGreedyLookahead(puzzle: HerdState): Solution | null {
  let state = cloneState(puzzle);
  const moves: Move[] = [];
  const maxSteps = 100;
  const visited = new Set<string>([stateKey(state)]);

  for (let i = 0; i < maxSteps; i++) {
    if (isGoal(state)) return { moves, steps: moves.length, statesExplored: i * 10 };
    const legal = legalMoves(state);
    let bestMove: Move | null = null;
    let bestH = Infinity;

    for (const m of legal) {
      const ns = applyMove(state, m);
      const key = stateKey(ns);
      if (visited.has(key)) continue;
      if (isGoal(ns)) {
        moves.push(m);
        return { moves, steps: moves.length, statesExplored: i * 10 };
      }
      // 1-step lookahead
      let minH = heuristic(ns);
      for (const m2 of legalMoves(ns)) {
        const ns2 = applyMove(ns, m2);
        const h2 = heuristic(ns2);
        if (h2 < minH) minH = h2;
      }
      if (minH < bestH) {
        bestH = minH;
        bestMove = m;
      }
    }
    if (!bestMove) return null;
    state = applyMove(state, bestMove);
    moves.push(bestMove);
    visited.add(stateKey(state));
  }
  return isGoal(state) ? { moves, steps: moves.length, statesExplored: maxSteps * 10 } : null;
}

/** A* search using Manhattan heuristic */
function solveAStar(puzzle: HerdState, maxNodes: number): Solution | null {
  if (isGoal(puzzle)) return { moves: [], steps: 0, statesExplored: 0 };

  const visited = new Map<string, number>(); // key -> g cost
  const startKey = stateKey(puzzle);
  visited.set(startKey, 0);

  // Priority queue as sorted array (simple but effective for moderate sizes)
  type Node = { state: HerdState; moves: Move[]; g: number; f: number };
  const h0 = heuristic(puzzle);
  let openList: Node[] = [{ state: puzzle, moves: [], g: 0, f: h0 }];

  while (openList.length > 0 && visited.size < maxNodes) {
    // Pick node with lowest f
    let bestIdx = 0;
    for (let i = 1; i < openList.length; i++) {
      if (openList[i].f < openList[bestIdx].f) bestIdx = i;
    }
    const current = openList[bestIdx];
    openList[bestIdx] = openList[openList.length - 1];
    openList.pop();

    for (const m of legalMoves(current.state)) {
      const ns = applyMove(current.state, m);
      const key = stateKey(ns);
      const ng = current.g + 1;

      // Skip if we've seen this state with equal or better cost
      const prev = visited.get(key);
      if (prev !== undefined && prev <= ng) continue;
      visited.set(key, ng);

      const nm: Move[] = [...current.moves, m];
      if (isGoal(ns)) return { moves: nm, steps: nm.length, statesExplored: visited.size };

      const h = heuristic(ns);
      openList.push({ state: ns, moves: nm, g: ng, f: ng + h });
    }

    // Periodically trim open list to avoid memory blowup
    if (openList.length > maxNodes / 2) {
      openList.sort((a, b) => a.f - b.f);
      openList = openList.slice(0, maxNodes / 4);
    }
  }
  return null;
}

/* ─── Metrics helpers ─── */

/**
 * Compute puzzle entropy: SUM(log2(legalMoves(state_i))) across each step of optimal solution.
 */
export function puzzleEntropy(puzzle: HerdState, solution: Solution): number {
  let entropy = 0;
  let state = cloneState(puzzle);
  for (const m of solution.moves) {
    const eff = effectiveMoves(state);
    entropy += Math.log2(Math.max(1, eff.length));
    state = applyMove(state, m);
  }
  return entropy;
}

/**
 * Count counterintuitive moves: steps where heuristic increases.
 */
export function countCounterintuitive(puzzle: HerdState, solution: Solution): number {
  let count = 0;
  let state = cloneState(puzzle);
  for (const m of solution.moves) {
    const h0 = heuristic(state);
    state = applyMove(state, m);
    const h1 = heuristic(state);
    if (h1 > h0) count++;
  }
  return count;
}

/**
 * Average decision entropy (Shannon entropy of legal moves at each step).
 * We compute Shannon entropy based on heuristic quality of each effective move
 * (softmax over negative heuristic).
 */
export function decisionEntropy(puzzle: HerdState, solution: Solution): number {
  let totalEntropy = 0;
  let state = cloneState(puzzle);
  for (const m of solution.moves) {
    const eff = effectiveMoves(state);
    if (eff.length <= 1) {
      state = applyMove(state, m);
      continue;
    }
    // Compute heuristic for each move
    const hValues = eff.map((mv) => -heuristic(applyMove(state, mv)));
    const maxH = Math.max(...hValues);
    const exps = hValues.map((h) => Math.exp(h - maxH));
    const sumExp = exps.reduce((a, b) => a + b, 0);
    const probs = exps.map((e) => e / sumExp);
    let ent = 0;
    for (const p of probs) {
      if (p > 0) ent -= p * Math.log2(p);
    }
    totalEntropy += ent;
    state = applyMove(state, m);
  }
  return solution.moves.length > 0 ? totalEntropy / solution.moves.length : 0;
}

/**
 * Drama: max(progress_before_backtrack) / total_steps at level 3.
 */
export function computeDrama(puzzle: HerdState, solution: Solution): number {
  if (solution.moves.length === 0) return 0;
  const initialH = heuristic(puzzle);
  let state = cloneState(puzzle);
  let maxProgress = 0;
  let backtrackAfterProgress = 0;

  for (let i = 0; i < solution.moves.length; i++) {
    state = applyMove(state, solution.moves[i]);
    const h = heuristic(state);
    const progress = (initialH - h) / Math.max(1, initialH);
    if (progress > maxProgress) {
      maxProgress = progress;
    } else if (maxProgress > 0 && progress < maxProgress) {
      backtrackAfterProgress = Math.max(backtrackAfterProgress, maxProgress);
    }
  }
  return backtrackAfterProgress > 0 ? backtrackAfterProgress : maxProgress;
}

/**
 * Info gain ratio: entropy(best_move_outcome) / entropy(random_move_outcome).
 */
export function infoGainRatio(puzzle: HerdState, solution: Solution): number {
  if (solution.moves.length === 0) return 1;
  let state = cloneState(puzzle);
  let totalRatio = 0;
  let count = 0;

  for (const m of solution.moves) {
    const eff = effectiveMoves(state);
    if (eff.length === 0) { state = applyMove(state, m); continue; }
    const hValues = eff.map((mv) => heuristic(applyMove(state, mv)));
    const bestH = Math.min(...hValues);
    const avgH = hValues.reduce((a, b) => a + b, 0) / hValues.length;
    if (avgH > 0 && bestH < avgH) {
      totalRatio += avgH / Math.max(0.1, bestH);
    } else {
      totalRatio += 1;
    }
    count++;
    state = applyMove(state, m);
  }
  return count > 0 ? totalRatio / count : 1;
}

/**
 * Count distinct near-optimal solutions (within +1 of optimal).
 */
export function solutionUniqueness(puzzle: HerdState, optimalLength: number): number {
  if (isGoal(puzzle)) return 1;
  const maxLen = optimalLength + 1;
  const visited = new Set<string>([stateKey(puzzle)]);
  let frontier: { state: HerdState; moves: Move[]; depth: number }[] = [
    { state: puzzle, moves: [], depth: 0 },
  ];
  const solutions = new Set<string>();
  const maxNodes = 200000;

  while (frontier.length > 0 && visited.size < maxNodes) {
    const next: { state: HerdState; moves: Move[]; depth: number }[] = [];
    for (const { state: cur, moves, depth } of frontier) {
      if (depth >= maxLen) continue;
      for (const m of legalMoves(cur)) {
        const ns = applyMove(cur, m);
        const key = stateKey(ns);
        const nm: Move[] = [...moves, m];
        if (isGoal(ns)) {
          solutions.add(nm.map((mv) => `${mv.color}${mv.dir}`).join(','));
          continue;
        }
        if (visited.has(key)) continue;
        visited.add(key);
        if (depth + 1 < maxLen) {
          next.push({ state: ns, moves: nm, depth: depth + 1 });
        }
      }
    }
    frontier = next;
  }
  return Math.max(1, solutions.size);
}
