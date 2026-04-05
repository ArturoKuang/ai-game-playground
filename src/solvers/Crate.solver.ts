/**
 * Crate Solver
 *
 * Rules: Crates arrive on a conveyor belt in random order (numbered 1..N).
 * Player has a staging stack with limited capacity. Push crates from conveyor
 * onto the stack, pop from the stack to load the truck. The truck must be
 * loaded in order: 1, 2, 3, ..., N. Discard option pops top of stack to
 * discard pile at a cost of 2 moves. Complete within move budget.
 *
 * Moves:
 *   'push'    = take next crate from conveyor, push to stack (1 move)
 *   'pop'     = pop top of stack to truck if it matches nextRequired (1 move)
 *   'discard' = pop top of stack to discard pile (2 moves)
 */

/* ─── Types ─── */

export type CrateState = {
  conveyor: number[];      // incoming crates (front = next to arrive)
  stack: number[];         // staging area (LIFO, top = last element)
  truck: number[];         // loaded crates (must be loaded 1,2,3,...,n in order)
  nextRequired: number;    // next crate the truck needs
  totalCrates: number;     // total crates to load
  stackCapacity: number;   // max stack size
  visibleCount: number;    // how many upcoming crates are visible
  moves: number;           // moves used
  budget: number;          // max moves
  difficulty: number;      // 1-5
  discardPile: number[];   // discarded crates
};

export type Move = 'push' | 'pop' | 'discard';

export type Solution = {
  moves: Move[];
  steps: number;
};

/* ─── Helpers ─── */

function makeRng(seed: number): () => number {
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

function cloneState(state: CrateState): CrateState {
  return {
    conveyor: [...state.conveyor],
    stack: [...state.stack],
    truck: [...state.truck],
    nextRequired: state.nextRequired,
    totalCrates: state.totalCrates,
    stackCapacity: state.stackCapacity,
    visibleCount: state.visibleCount,
    moves: state.moves,
    budget: state.budget,
    difficulty: state.difficulty,
    discardPile: [...state.discardPile],
  };
}

/* ─── Difficulty Parameters ─── */

export function getDifficultyParams(difficulty: number) {
  switch (difficulty) {
    case 1: return { totalCrates: 6, stackCapacity: 5, visibleCount: 3, budgetMultiplier: 2.0 };
    case 2: return { totalCrates: 8, stackCapacity: 4, visibleCount: 3, budgetMultiplier: 1.7 };
    case 3: return { totalCrates: 10, stackCapacity: 4, visibleCount: 2, budgetMultiplier: 1.4 };
    case 4: return { totalCrates: 12, stackCapacity: 3, visibleCount: 2, budgetMultiplier: 1.2 };
    case 5: return { totalCrates: 15, stackCapacity: 3, visibleCount: 1, budgetMultiplier: 1.1 };
    default: return { totalCrates: 8, stackCapacity: 4, visibleCount: 3, budgetMultiplier: 1.7 };
  }
}

/* ─── Core Game Logic ─── */

export function legalMoves(state: CrateState): Move[] {
  const moves: Move[] = [];

  // Push: can take from conveyor if stack is not full and conveyor is not empty
  if (state.conveyor.length > 0 && state.stack.length < state.stackCapacity) {
    moves.push('push');
  }

  // Pop: can pop from stack if top matches nextRequired
  if (state.stack.length > 0 && state.stack[state.stack.length - 1] === state.nextRequired) {
    moves.push('pop');
  }

  // Discard: can pop top of stack to discard pile (costs 2 moves)
  if (state.stack.length > 0 && state.stack[state.stack.length - 1] !== state.nextRequired) {
    if (state.moves + 2 <= state.budget) {
      moves.push('discard');
    }
  }

  return moves;
}

export function applyMove(state: CrateState, move: Move): CrateState {
  const next = cloneState(state);

  switch (move) {
    case 'push': {
      if (next.conveyor.length === 0 || next.stack.length >= next.stackCapacity) return next;
      const crate = next.conveyor.shift()!;
      next.stack.push(crate);
      next.moves += 1;
      break;
    }
    case 'pop': {
      if (next.stack.length === 0) return next;
      const top = next.stack[next.stack.length - 1];
      if (top !== next.nextRequired) return next;
      next.stack.pop();
      next.truck.push(top);
      next.nextRequired += 1;
      next.moves += 1;
      break;
    }
    case 'discard': {
      if (next.stack.length === 0) return next;
      const top = next.stack.pop()!;
      next.discardPile.push(top);
      next.moves += 2;
      break;
    }
  }

  return next;
}

export function isGoal(state: CrateState): boolean {
  return state.nextRequired > state.totalCrates;
}

export function heuristic(state: CrateState): number {
  // Remaining crates to load + penalty for blocking items on stack
  const remaining = state.totalCrates - state.truck.length;
  // Count items on stack that are below the needed item (blocking)
  let blockingPenalty = 0;
  const needed = state.nextRequired;
  for (let i = state.stack.length - 1; i >= 0; i--) {
    if (state.stack[i] !== needed + (state.stack.length - 1 - i)) {
      blockingPenalty += 0.5;
    }
  }
  return remaining + blockingPenalty;
}

/* ─── Optimal Solver (backtracking DFS with mutable state) ─── */

/**
 * Finds optimal (minimum move cost) solution using backtracking DFS.
 * Uses mutable arrays for speed; restores state on backtrack.
 * Key insight: always pop when top matches (provably optimal for stack sort).
 */
function solveOptimalDFS(
  fullConveyor: number[],
  stackCapacity: number,
  totalCrates: number,
): Solution | null {
  // Get greedy upper bound first
  const greedyResult = greedySimulate(fullConveyor, stackCapacity, totalCrates);
  let bestCost = greedyResult.cost;
  let bestMoves: Move[] = [...greedyResult.moves];

  // Mutable working arrays
  const stack: number[] = [];
  const moveList: Move[] = [];
  let convIdx = 0;
  let nextReq = 1;
  let cost = 0;

  function dfs(): void {
    // Auto-pop: always pop when top matches (provably optimal)
    let popCount = 0;
    while (stack.length > 0 && stack[stack.length - 1] === nextReq) {
      stack.pop();
      nextReq++;
      cost++;
      moveList.push('pop');
      popCount++;
    }

    // Goal check
    if (nextReq > totalCrates) {
      if (cost < bestCost) {
        bestCost = cost;
        bestMoves = [...moveList];
      }
      // Undo pops
      for (let i = 0; i < popCount; i++) {
        moveList.pop();
        nextReq--;
        cost--;
        stack.push(nextReq);
      }
      return;
    }

    // Lower bound: each remaining crate needs at least push+pop = 2 moves
    // Crates on stack that we'll eventually pop need 1 move each
    const loaded = nextReq - 1;
    const remaining = totalCrates - loaded;
    const onStackNeeded = stack.filter(v => v >= nextReq).length;
    const stillToPush = remaining - onStackNeeded;
    const minRemaining = stillToPush + remaining; // push each + pop each
    if (cost + minRemaining >= bestCost) {
      // Undo pops
      for (let i = 0; i < popCount; i++) {
        moveList.pop();
        nextReq--;
        cost--;
        stack.push(nextReq);
      }
      return;
    }

    // Try push
    if (convIdx < fullConveyor.length && stack.length < stackCapacity) {
      const crate = fullConveyor[convIdx];
      stack.push(crate);
      convIdx++;
      cost++;
      moveList.push('push');
      dfs();
      moveList.pop();
      cost--;
      convIdx--;
      stack.pop();
    }

    // Try discard (only if stack is non-empty and top doesn't match)
    if (stack.length > 0 && stack[stack.length - 1] !== nextReq) {
      const discarded = stack.pop()!;
      cost += 2;
      moveList.push('discard');
      dfs();
      moveList.pop();
      cost -= 2;
      stack.push(discarded);
    }

    // Undo auto-pops
    for (let i = 0; i < popCount; i++) {
      moveList.pop();
      nextReq--;
      cost--;
      stack.push(nextReq);
    }
  }

  dfs();

  return bestMoves.length > 0 ? { moves: bestMoves, steps: bestCost } : null;
}

/** Simple greedy simulation to compute upper bound */
function greedySimulate(
  conveyor: number[],
  stackCapacity: number,
  totalCrates: number,
): { cost: number; moves: Move[] } {
  let convIdx = 0;
  const stack: number[] = [];
  let nextReq = 1;
  let cost = 0;
  const moves: Move[] = [];
  const maxIter = totalCrates * 10;

  for (let i = 0; i < maxIter; i++) {
    if (nextReq > totalCrates) break;

    // Pop if top matches
    if (stack.length > 0 && stack[stack.length - 1] === nextReq) {
      stack.pop();
      nextReq++;
      cost++;
      moves.push('pop');
      continue;
    }

    // Push if possible
    if (convIdx < conveyor.length && stack.length < stackCapacity) {
      stack.push(conveyor[convIdx]);
      convIdx++;
      cost++;
      moves.push('push');
      continue;
    }

    // Discard if stuck
    if (stack.length > 0) {
      stack.pop();
      cost += 2;
      moves.push('discard');
      continue;
    }

    break;
  }

  return { cost, moves };
}

/* ─── Puzzle Generation ─── */

export function generatePuzzle(seed: number, difficulty: number): CrateState {
  const rng = makeRng(seed);
  const params = getDifficultyParams(difficulty);

  // Generate shuffled sequence
  const sequence = Array.from({ length: params.totalCrates }, (_, i) => i + 1);
  const conveyor = shuffle(sequence, rng);

  // Compute optimal moves
  const optimalSol = solveOptimalDFS(conveyor, params.stackCapacity, params.totalCrates);
  const optimalMoves = optimalSol ? optimalSol.steps : params.totalCrates * 3;
  const budget = Math.ceil(optimalMoves * params.budgetMultiplier);

  return {
    conveyor,
    stack: [],
    truck: [],
    nextRequired: 1,
    totalCrates: params.totalCrates,
    stackCapacity: params.stackCapacity,
    visibleCount: params.visibleCount,
    moves: 0,
    budget,
    difficulty,
    discardPile: [],
  };
}

/* ─── Player Solvers ─── */

/** Level 1: Random valid moves */
function solveRandom(puzzle: CrateState): Solution | null {
  let state = cloneState(puzzle);
  state.moves = 0;
  const moves: Move[] = [];
  const maxIter = 500;

  for (let i = 0; i < maxIter; i++) {
    if (isGoal(state)) return { moves, steps: state.moves };
    const legal = legalMoves(state);
    if (legal.length === 0) break;
    const pick = legal[Math.floor(Math.random() * legal.length)];
    state = applyMove(state, pick);
    moves.push(pick);
  }
  if (isGoal(state)) return { moves, steps: state.moves };
  return null;
}

/** Level 2: Greedy -- always pop if top matches, otherwise push. Never discard. */
function solveGreedy(puzzle: CrateState): Solution | null {
  let state = cloneState(puzzle);
  state.moves = 0;
  state.budget = 99999;
  const moves: Move[] = [];
  const maxIter = 500;

  for (let i = 0; i < maxIter; i++) {
    if (isGoal(state)) return { moves, steps: state.moves };
    const legal = legalMoves(state);
    if (legal.length === 0) break;

    if (legal.includes('pop')) {
      state = applyMove(state, 'pop');
      moves.push('pop');
    } else if (legal.includes('push')) {
      state = applyMove(state, 'push');
      moves.push('push');
    } else {
      break; // stuck
    }
  }
  if (isGoal(state)) return { moves, steps: state.moves };
  return null;
}

/** Level 3: Greedy + discard when stuck */
function solveGreedyWithDiscard(puzzle: CrateState): Solution | null {
  let state = cloneState(puzzle);
  state.moves = 0;
  state.budget = 99999;
  const moves: Move[] = [];
  const maxIter = 500;

  for (let i = 0; i < maxIter; i++) {
    if (isGoal(state)) return { moves, steps: state.moves };
    const legal = legalMoves(state);
    if (legal.length === 0) break;

    if (legal.includes('pop')) {
      state = applyMove(state, 'pop');
      moves.push('pop');
    } else if (legal.includes('push')) {
      state = applyMove(state, 'push');
      moves.push('push');
    } else if (legal.includes('discard')) {
      state = applyMove(state, 'discard');
      moves.push('discard');
    } else {
      break;
    }
  }
  if (isGoal(state)) return { moves, steps: state.moves };
  return null;
}

/** Level 4: Lookahead with visible conveyor planning */
function solveLookahead(puzzle: CrateState): Solution | null {
  let state = cloneState(puzzle);
  state.moves = 0;
  state.budget = 99999;
  const moves: Move[] = [];
  const maxIter = 500;

  for (let i = 0; i < maxIter; i++) {
    if (isGoal(state)) return { moves, steps: state.moves };
    const legal = legalMoves(state);
    if (legal.length === 0) break;

    // Always pop if possible
    if (legal.includes('pop')) {
      state = applyMove(state, 'pop');
      moves.push('pop');
      continue;
    }

    const needed = state.nextRequired;

    if (legal.includes('push')) {
      const nextCrate = state.conveyor[0];

      // If next crate is needed, push immediately
      if (nextCrate === needed) {
        state = applyMove(state, 'push');
        moves.push('push');
        continue;
      }

      // Check if stack is nearly full and we should discard
      if (state.stack.length >= state.stackCapacity - 1 && legal.includes('discard')) {
        // Look at visible conveyor to see if needed crate is coming
        const visible = state.conveyor.slice(0, Math.min(state.visibleCount, state.conveyor.length));
        const neededIdx = visible.indexOf(needed);
        if (neededIdx >= 0 && neededIdx <= state.visibleCount) {
          // Needed crate is coming soon. Discard top to make room.
          state = applyMove(state, 'discard');
          moves.push('discard');
          continue;
        }
      }

      state = applyMove(state, 'push');
      moves.push('push');
    } else if (legal.includes('discard')) {
      state = applyMove(state, 'discard');
      moves.push('discard');
    } else {
      break;
    }
  }
  if (isGoal(state)) return { moves, steps: state.moves };
  return null;
}

/** Level 5: Optimal -- full knowledge of sequence */
function solveOptimal(puzzle: CrateState): Solution | null {
  return solveOptimalDFS(puzzle.conveyor, puzzle.stackCapacity, puzzle.totalCrates);
}

export function solve(
  puzzle: CrateState,
  skillLevel: 1 | 2 | 3 | 4 | 5,
): Solution | null {
  switch (skillLevel) {
    case 1: return solveRandom(puzzle);
    case 2: return solveGreedy(puzzle);
    case 3: return solveGreedyWithDiscard(puzzle);
    case 4: return solveLookahead(puzzle);
    case 5: return solveOptimal(puzzle);
  }
}
