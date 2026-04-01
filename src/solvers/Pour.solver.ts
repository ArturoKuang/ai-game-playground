/**
 * Pour Solver
 *
 * Rules: A row of glasses with different capacities. Each holds
 * colored liquid as stacked layers. Pour liquid from one glass to
 * an adjacent glass -- the top layer pours first, limited by the
 * receiver's remaining capacity. Reach the target distribution
 * of colors across glasses within par pours.
 *
 * A move = { from, to } where |from - to| === 1 (adjacent only).
 * Goal: current glass contents match target configuration.
 */

/* ─── Types ─── */

/** A single layer of colored liquid in a glass */
export type Layer = {
  color: number; // 0-based color index
  amount: number; // units of this color
};

/** A glass with capacity and stacked layers (bottom to top) */
export type Glass = {
  capacity: number;
  layers: Layer[]; // bottom-first; last element = top
};

export type PourState = {
  glasses: Glass[];
  target: Glass[];
  movesUsed: number;
  par: number;
};

export type Move = {
  from: number;
  to: number;
};

export type Solution = {
  moves: Move[];
  steps: number;
};

/* ─── Helpers ─── */

function cloneGlass(g: Glass): Glass {
  return {
    capacity: g.capacity,
    layers: g.layers.map((l) => ({ ...l })),
  };
}

function cloneState(state: PourState): PourState {
  return {
    glasses: state.glasses.map(cloneGlass),
    target: state.target,
    movesUsed: state.movesUsed,
    par: state.par,
  };
}

/** Total liquid in a glass */
function glassTotal(g: Glass): number {
  let t = 0;
  for (const l of g.layers) t += l.amount;
  return t;
}

/** Remaining capacity */
function glassRemaining(g: Glass): number {
  return g.capacity - glassTotal(g);
}

/** Normalize layers: merge adjacent same-color layers, remove zero layers */
function normalizeLayers(layers: Layer[]): Layer[] {
  const result: Layer[] = [];
  for (const l of layers) {
    if (l.amount <= 0) continue;
    if (result.length > 0 && result[result.length - 1].color === l.color) {
      result[result.length - 1].amount += l.amount;
    } else {
      result.push({ color: l.color, amount: l.amount });
    }
  }
  return result;
}

/** Canonical string key for glass contents (for state dedup) */
function glassKey(g: Glass): string {
  return g.layers.map((l) => `${l.color}:${l.amount}`).join(',');
}

function stateKey(state: PourState): string {
  return state.glasses.map(glassKey).join('|');
}

/* ─── Core game logic ─── */

export function isGoal(state: PourState): boolean {
  for (let i = 0; i < state.glasses.length; i++) {
    const cur = state.glasses[i];
    const tgt = state.target[i];
    const cl = cur.layers;
    const tl = tgt.layers;
    if (cl.length !== tl.length) return false;
    for (let j = 0; j < cl.length; j++) {
      if (cl[j].color !== tl[j].color || cl[j].amount !== tl[j].amount) return false;
    }
  }
  return true;
}

export function heuristic(state: PourState): number {
  // Count how many glasses don't match their target
  let wrong = 0;
  for (let i = 0; i < state.glasses.length; i++) {
    const cur = state.glasses[i];
    const tgt = state.target[i];
    if (glassKey(cur) !== glassKey(tgt)) wrong++;
  }
  return wrong;
}

/** Detailed heuristic: sum of layer mismatches across all glasses */
function detailedHeuristic(state: PourState): number {
  let cost = 0;
  for (let i = 0; i < state.glasses.length; i++) {
    const cur = state.glasses[i];
    const tgt = state.target[i];
    // Compare layer by layer
    const maxLen = Math.max(cur.layers.length, tgt.layers.length);
    for (let j = 0; j < maxLen; j++) {
      const cl = cur.layers[j];
      const tl = tgt.layers[j];
      if (!cl && tl) {
        cost += tl.amount;
      } else if (cl && !tl) {
        cost += cl.amount;
      } else if (cl && tl) {
        if (cl.color !== tl.color) {
          cost += cl.amount + tl.amount;
        } else {
          cost += Math.abs(cl.amount - tl.amount);
        }
      }
    }
  }
  return cost;
}

export function legalMoves(state: PourState): Move[] {
  const moves: Move[] = [];
  const n = state.glasses.length;
  for (let i = 0; i < n; i++) {
    // Can pour from glass i if it has liquid
    if (state.glasses[i].layers.length === 0) continue;
    // Pour left
    if (i > 0 && glassRemaining(state.glasses[i - 1]) > 0) {
      moves.push({ from: i, to: i - 1 });
    }
    // Pour right
    if (i < n - 1 && glassRemaining(state.glasses[i + 1]) > 0) {
      moves.push({ from: i, to: i + 1 });
    }
  }
  return moves;
}

export function applyMove(state: PourState, move: Move): PourState {
  const next = cloneState(state);
  const src = next.glasses[move.from];
  const dst = next.glasses[move.to];

  if (src.layers.length === 0) return next;

  const remaining = glassRemaining(dst);
  if (remaining <= 0) return next;

  // Pour top layer from src to dst
  const topLayer = src.layers[src.layers.length - 1];
  const pourAmount = Math.min(topLayer.amount, remaining);

  // Remove from source
  topLayer.amount -= pourAmount;
  if (topLayer.amount <= 0) {
    src.layers.pop();
  }

  // Add to destination (on top)
  if (dst.layers.length > 0 && dst.layers[dst.layers.length - 1].color === topLayer.color) {
    dst.layers[dst.layers.length - 1].amount += pourAmount;
  } else {
    dst.layers.push({ color: topLayer.color, amount: pourAmount });
  }

  // Normalize
  src.layers = normalizeLayers(src.layers);
  dst.layers = normalizeLayers(dst.layers);

  next.movesUsed++;
  return next;
}

/* ─── Puzzle Generation ─── */

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

export function generatePuzzle(seed: number, difficulty: number): PourState {
  const rng = makeRng(seed);

  // Difficulty scaling
  const numGlasses = difficulty <= 2 ? 5 : 6;
  const numColors = difficulty <= 2 ? 2 : 3;
  const maxLayersPerGlass = difficulty <= 2 ? 2 : difficulty <= 4 ? 3 : 4;
  const scramblePours = 4 + difficulty * 2; // 6..14
  const parSlack = difficulty <= 2 ? 3 : difficulty <= 4 ? 2 : 1;

  // Try multiple attempts to find a solvable puzzle
  for (let attempt = 0; attempt < 20; attempt++) {
    const result = tryGeneratePuzzle(
      rng, numGlasses, numColors, maxLayersPerGlass, scramblePours, parSlack,
    );
    if (result) return result;
  }

  // Fallback: very simple puzzle (guaranteed solvable)
  return generateFallbackPuzzle(rng, numGlasses, numColors, parSlack);
}

function tryGeneratePuzzle(
  rng: () => number,
  numGlasses: number,
  numColors: number,
  maxLayersPerGlass: number,
  scramblePours: number,
  parSlack: number,
): PourState | null {
  // Generate capacities
  const capacities: number[] = [];
  for (let i = 0; i < numGlasses; i++) {
    capacities.push(3 + Math.floor(rng() * 4)); // 3-6
  }

  // Create a target state with random liquid distribution
  const targetGlasses: Glass[] = capacities.map((cap) => ({
    capacity: cap,
    layers: [],
  }));

  // Distribute liquid: total liquid = sum of (capacity * fillRatio)
  // Use 50-65% fill to ensure enough spare capacity for interesting puzzles
  const totalCapacity = capacities.reduce((a, b) => a + b, 0);
  const totalLiquid = Math.floor(totalCapacity * (0.45 + rng() * 0.2));

  // Distribute totalLiquid among colors
  const colorAmounts: number[] = [];
  let remaining = totalLiquid;
  for (let c = 0; c < numColors - 1; c++) {
    const share = Math.max(2, Math.floor(remaining / (numColors - c) * (0.6 + rng() * 0.8)));
    const clamped = Math.min(share, remaining - (numColors - c - 1) * 2);
    colorAmounts.push(clamped);
    remaining -= clamped;
  }
  colorAmounts.push(Math.max(2, remaining));

  // Place liquid into target glasses as layers
  const colorPools = [...colorAmounts];
  for (let i = 0; i < numGlasses; i++) {
    const cap = capacities[i];
    let filled = 0;
    const numLayers = Math.min(maxLayersPerGlass, 1 + Math.floor(rng() * maxLayersPerGlass));

    for (let l = 0; l < numLayers && filled < cap; l++) {
      const available = colorPools.map((amt, idx) => ({ amt, idx })).filter((x) => x.amt > 0);
      if (available.length === 0) break;

      const pick = available[Math.floor(rng() * available.length)];
      const maxForLayer = Math.min(cap - filled, pick.amt, 1 + Math.floor(rng() * 3));
      if (maxForLayer <= 0) break;

      // Don't place same color as last layer
      if (targetGlasses[i].layers.length > 0 &&
          targetGlasses[i].layers[targetGlasses[i].layers.length - 1].color === pick.idx) {
        const others = available.filter((x) => x.idx !== pick.idx && x.amt > 0);
        if (others.length > 0) {
          const other = others[Math.floor(rng() * others.length)];
          const amt = Math.min(cap - filled, other.amt, 1 + Math.floor(rng() * 3));
          if (amt > 0) {
            targetGlasses[i].layers.push({ color: other.idx, amount: amt });
            colorPools[other.idx] -= amt;
            filled += amt;
          }
          continue;
        }
      }

      targetGlasses[i].layers.push({ color: pick.idx, amount: maxForLayer });
      colorPools[pick.idx] -= maxForLayer;
      filled += maxForLayer;
    }
  }

  // Distribute any remaining liquid
  for (let c = 0; c < numColors; c++) {
    while (colorPools[c] > 0) {
      const candidates = targetGlasses
        .map((g, i) => ({ g, i, rem: glassRemaining(g) }))
        .filter((x) => x.rem > 0);
      if (candidates.length === 0) break;

      const pick = candidates[Math.floor(rng() * candidates.length)];
      const amt = Math.min(colorPools[c], pick.rem);
      if (amt <= 0) break;

      const layers = pick.g.layers;
      if (layers.length > 0 && layers[layers.length - 1].color === c) {
        layers[layers.length - 1].amount += amt;
      } else {
        layers.push({ color: c, amount: amt });
      }
      colorPools[c] -= amt;
    }
  }

  // Normalize target layers
  for (const g of targetGlasses) {
    g.layers = normalizeLayers(g.layers);
  }

  // Scramble by applying random pours from target to get start state
  let currentState: PourState = {
    glasses: targetGlasses.map(cloneGlass),
    target: targetGlasses,
    movesUsed: 0,
    par: 0,
  };

  let lastFrom = -1;
  let totalScrambles = 0;
  const visited = new Set<string>([stateKey(currentState)]);

  for (let i = 0; i < scramblePours * 5 && totalScrambles < scramblePours; i++) {
    const moves = legalMoves(currentState);
    if (moves.length === 0) break;

    // Filter: don't immediately undo, and prefer unvisited states
    const filtered = moves.filter((m) => m.from !== lastFrom || moves.length <= 2);
    const pool = filtered.length > 0 ? filtered : moves;
    const pick = pool[Math.floor(rng() * pool.length)];

    const next = applyMove(currentState, pick);
    const key = stateKey(next);
    if (key !== stateKey(currentState) && !visited.has(key)) {
      visited.add(key);
      currentState = next;
      lastFrom = pick.to;
      totalScrambles++;
    }
  }

  // Make sure we're not already at goal
  if (isGoal(currentState)) {
    const moves = legalMoves(currentState);
    if (moves.length > 0) {
      currentState = applyMove(currentState, moves[Math.floor(rng() * moves.length)]);
    }
  }

  // Verify solvability with BFS
  const optSol = solveBFS(currentState, 500000);
  if (!optSol) return null; // unsolvable, try again

  const par = optSol.steps + parSlack;

  return {
    glasses: currentState.glasses,
    target: targetGlasses,
    movesUsed: 0,
    par,
  };
}

/** Fallback: simple 2-color puzzle guaranteed solvable */
function generateFallbackPuzzle(
  rng: () => number,
  numGlasses: number,
  numColors: number,
  parSlack: number,
): PourState {
  // Simple target: alternate colors in glasses, with generous spare capacity
  const capacities = Array.from({ length: numGlasses }, () => 4);
  const targetGlasses: Glass[] = capacities.map((cap, i) => ({
    capacity: cap,
    layers: i < numGlasses - 1
      ? [{ color: i % numColors, amount: 2 }]
      : [], // last glass empty for staging
  }));

  // Scramble with just 3-4 pours (guaranteed short solution)
  let currentState: PourState = {
    glasses: targetGlasses.map(cloneGlass),
    target: targetGlasses,
    movesUsed: 0,
    par: 0,
  };

  for (let i = 0; i < 4; i++) {
    const moves = legalMoves(currentState);
    if (moves.length === 0) break;
    const pick = moves[Math.floor(rng() * moves.length)];
    const next = applyMove(currentState, pick);
    if (!isGoal(next)) {
      currentState = next;
    }
  }

  if (isGoal(currentState)) {
    const moves = legalMoves(currentState);
    if (moves.length > 0) {
      currentState = applyMove(currentState, moves[0]);
    }
  }

  const optSol = solveBFS(currentState, 500000);
  const par = (optSol ? optSol.steps : 4) + parSlack;

  return {
    glasses: currentState.glasses,
    target: targetGlasses,
    movesUsed: 0,
    par,
  };
}

/* ─── Solver ─── */

export function solve(
  puzzle: PourState,
  skillLevel: 1 | 2 | 3 | 4 | 5,
): Solution | null {
  if (skillLevel === 1) return solveRandom(puzzle);
  if (skillLevel === 2) return solveGreedy(puzzle);
  if (skillLevel === 3) return solveGreedyLookahead(puzzle);
  if (skillLevel === 4) return solveBFS(puzzle, 100000);
  return solveBFS(puzzle, 1000000);
}

/** Level 1: Random valid moves */
function solveRandom(puzzle: PourState): Solution | null {
  let state = cloneState(puzzle);
  state.movesUsed = 0;
  const moves: Move[] = [];
  const maxSteps = 200;

  for (let i = 0; i < maxSteps; i++) {
    if (isGoal(state)) return { moves, steps: moves.length };
    const legal = legalMoves(state);
    if (legal.length === 0) break;
    const pick = legal[Math.floor(Math.random() * legal.length)];
    state = applyMove(state, pick);
    moves.push(pick);
  }
  if (isGoal(state)) return { moves, steps: moves.length };
  return null;
}

/** Level 2: Greedy -- pick the move with best immediate heuristic */
function solveGreedy(puzzle: PourState): Solution | null {
  let state = cloneState(puzzle);
  state.movesUsed = 0;
  const moves: Move[] = [];
  const visited = new Set<string>([stateKey(state)]);
  const maxSteps = 100;

  for (let i = 0; i < maxSteps; i++) {
    if (isGoal(state)) return { moves, steps: moves.length };
    const legal = legalMoves(state);
    if (legal.length === 0) break;

    let bestMove = legal[0];
    let bestH = Infinity;
    for (const m of legal) {
      const next = applyMove(state, m);
      const h = detailedHeuristic(next);
      if (h < bestH && !visited.has(stateKey(next))) {
        bestH = h;
        bestMove = m;
      }
    }

    state = applyMove(state, bestMove);
    visited.add(stateKey(state));
    moves.push(bestMove);
  }
  if (isGoal(state)) return { moves, steps: moves.length };
  return null;
}

/** Level 3: Greedy with 1-step lookahead */
function solveGreedyLookahead(puzzle: PourState): Solution | null {
  let state = cloneState(puzzle);
  state.movesUsed = 0;
  const moves: Move[] = [];
  const visited = new Set<string>([stateKey(state)]);
  const maxSteps = 100;

  for (let i = 0; i < maxSteps; i++) {
    if (isGoal(state)) return { moves, steps: moves.length };
    const legal = legalMoves(state);
    if (legal.length === 0) break;

    let bestMove = legal[0];
    let bestScore = Infinity;

    for (const m of legal) {
      const next = applyMove(state, m);
      if (isGoal(next)) {
        state = next;
        moves.push(m);
        return { moves, steps: moves.length };
      }

      // Look ahead one more step
      const nextMoves = legalMoves(next);
      let minH = detailedHeuristic(next);
      for (const m2 of nextMoves) {
        const next2 = applyMove(next, m2);
        const h2 = detailedHeuristic(next2);
        if (h2 < minH) minH = h2;
      }

      if (minH < bestScore && !visited.has(stateKey(next))) {
        bestScore = minH;
        bestMove = m;
      }
    }

    state = applyMove(state, bestMove);
    visited.add(stateKey(state));
    moves.push(bestMove);
  }
  if (isGoal(state)) return { moves, steps: moves.length };
  return null;
}

/** Levels 4-5: BFS with node limit */
function solveBFS(state: PourState, maxNodes: number): Solution | null {
  if (isGoal(state)) return { moves: [], steps: 0 };

  const visited = new Set<string>([stateKey(state)]);
  let frontier: { state: PourState; moves: Move[] }[] = [
    { state, moves: [] },
  ];

  while (frontier.length > 0 && visited.size < maxNodes) {
    const next: { state: PourState; moves: Move[] }[] = [];
    for (const { state: cur, moves } of frontier) {
      for (const m of legalMoves(cur)) {
        const ns = applyMove(cur, m);
        const key = stateKey(ns);
        if (visited.has(key)) continue;
        visited.add(key);
        const nm: Move[] = [...moves, m];
        if (isGoal(ns)) return { moves: nm, steps: nm.length };
        next.push({ state: ns, moves: nm });
      }
    }
    frontier = next;
  }
  return null;
}
