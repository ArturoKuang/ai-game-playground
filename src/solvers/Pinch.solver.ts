/**
 * Pinch Solver — Two Pointers
 *
 * A sorted row of numbered tiles with two cursors at opposite ends.
 * Player moves cursors inward to find pairs summing to target values,
 * within a move budget. The two-pointer convergence algorithm is optimal.
 *
 * Move = 'left' | 'right' | 'collect'
 *   'left'    = move left cursor right (+1), skipping dead tiles
 *   'right'   = move right cursor left (-1), skipping dead tiles
 *   'collect' = collect current pair if it matches an unfound target
 *
 * After collecting, the pair tiles become "dead" and cursors auto-advance
 * inward past them (this auto-advance is free, not counted as moves).
 */

/* ─── Types ─── */

export type PinchState = {
  tiles: number[];           // sorted array of values (never mutated)
  dead: boolean[];           // which tiles have been collected
  left: number;              // left cursor index
  right: number;             // right cursor index
  targets: number[];         // target sums to find
  found: number[];           // target sums already found
  moves: number;             // moves used
  budget: number;            // max moves allowed
  difficulty: number;        // 1-5
  collected: [number, number][]; // collected pairs [leftVal, rightVal]
};

export type Move = 'left' | 'right' | 'collect';

export type Solution = {
  moves: Move[];
  steps: number;
  algorithmAligned: number; // count of moves that follow two-pointer logic
  totalNonCollect: number;  // total non-collect moves
};

/* ─── PRNG ─── */

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

/* ─── Difficulty Config ─── */

type DiffConfig = {
  tileCount: number;
  targetCount: number;
  budgetMultiplier: number;
};

function getDiffConfig(difficulty: number): DiffConfig {
  switch (difficulty) {
    case 1: return { tileCount: 8, targetCount: 1, budgetMultiplier: 2.0 };
    case 2: return { tileCount: 12, targetCount: 1, budgetMultiplier: 1.5 };
    case 3: return { tileCount: 16, targetCount: 2, budgetMultiplier: 1.3 };
    case 4: return { tileCount: 20, targetCount: 3, budgetMultiplier: 1.2 };
    case 5: return { tileCount: 24, targetCount: 4, budgetMultiplier: 1.1 };
    default: return { tileCount: 8, targetCount: 1, budgetMultiplier: 2.0 };
  }
}

/* ─── Helpers ─── */

/** Find next live tile index moving right from idx (exclusive). Returns -1 if none. */
function nextLiveRight(dead: boolean[], from: number): number {
  for (let i = from + 1; i < dead.length; i++) {
    if (!dead[i]) return i;
  }
  return -1;
}

/** Find next live tile index moving left from idx (exclusive). Returns -1 if none. */
function nextLiveLeft(dead: boolean[], from: number): number {
  for (let i = from - 1; i >= 0; i--) {
    if (!dead[i]) return i;
  }
  return -1;
}

/* ─── Puzzle Generation ─── */

/**
 * Generate a puzzle with guaranteed target-sum pairs in a sorted array.
 *
 * Strategy:
 * 1. Pick target sums by choosing pairs (a, b) with a + b = target
 * 2. Fill remaining slots with "safe" numbers (no unintended target pairs)
 * 3. Sort, compute optimal cost, set budget
 *
 * For reliability with many targets, we use a wide number range and
 * carefully pick pairs in non-overlapping ranges.
 */
export function generatePuzzle(seed: number, difficulty: number): PinchState {
  const rng = makeRng(seed);
  const config = getDiffConfig(difficulty);
  const { tileCount, targetCount, budgetMultiplier } = config;

  for (let attempt = 0; attempt < 500; attempt++) {
    const pairValues: Array<[number, number]> = [];
    const targets: number[] = [];
    const usedNumbers = new Set<number>();
    const targetSet = new Set<number>();

    // Generate pairs with well-separated values to minimize conflicts
    let pairFailed = false;
    for (let t = 0; t < targetCount; t++) {
      let a = 0, b = 0, target = 0;
      let tries = 0;
      // Use wider ranges for more targets
      const maxVal = 30 + targetCount * 10;
      do {
        a = Math.floor(rng() * maxVal) + 1;
        b = Math.floor(rng() * maxVal) + 1;
        if (a === b) { tries++; continue; }
        if (a > b) { const tmp = a; a = b; b = tmp; }
        target = a + b;
        tries++;
      } while (
        (usedNumbers.has(a) || usedNumbers.has(b) || targetSet.has(target)) &&
        tries < 500
      );

      if (tries >= 500) { pairFailed = true; break; }

      pairValues.push([a, b]);
      targets.push(target);
      targetSet.add(target);
      usedNumbers.add(a);
      usedNumbers.add(b);
    }

    if (pairFailed || targets.length < targetCount) continue;

    // Fill remaining slots with safe numbers
    const fillCount = tileCount - pairValues.length * 2;
    const fillers: number[] = [];
    const maxFillVal = 30 + targetCount * 15;
    let fillTries = 0;

    while (fillers.length < fillCount && fillTries < 5000) {
      const v = Math.floor(rng() * maxFillVal) + 1;
      fillTries++;
      if (usedNumbers.has(v)) continue;

      // Check v doesn't form unintended target-sum pairs
      let safe = true;
      const allExisting = [...Array.from(usedNumbers), ...fillers];
      for (const existing of allExisting) {
        if (targetSet.has(v + existing)) {
          // Only safe if this is one of our intended pairs
          const isPair = pairValues.some(
            ([pa, pb]) => (pa === v && pb === existing) || (pa === existing && pb === v)
          );
          if (!isPair) { safe = false; break; }
        }
      }
      if (safe) {
        fillers.push(v);
        usedNumbers.add(v);
      }
    }

    if (fillers.length < fillCount) continue;

    // Build sorted tile array
    const tiles: number[] = [];
    for (const [a, b] of pairValues) tiles.push(a, b);
    tiles.push(...fillers);
    tiles.sort((x, y) => x - y);

    // Verify: for each target, exactly one pair in tiles sums to it
    let valid = true;
    for (const target of targets) {
      let pairCount = 0;
      const tileSet = new Set(tiles);
      for (let i = 0; i < tiles.length; i++) {
        const complement = target - tiles[i];
        if (complement !== tiles[i] && tiles.indexOf(complement) > i) {
          pairCount++;
        }
      }
      if (pairCount < 1) { valid = false; break; }
    }
    if (!valid) continue;

    // Compute optimal cost using two-pointer
    const dead = new Array(tiles.length).fill(false) as boolean[];
    const optimalMoves = computeOptimalCost(tiles, dead, targets);
    if (optimalMoves === null) continue;

    const budget = Math.max(optimalMoves + 1, Math.ceil(optimalMoves * budgetMultiplier));

    return {
      tiles,
      dead: new Array(tiles.length).fill(false) as boolean[],
      left: 0,
      right: tiles.length - 1,
      targets: [...targets],
      found: [],
      moves: 0,
      budget,
      difficulty,
      collected: [],
    };
  }

  // Fallback: known-good simple puzzle
  const tiles = [1, 3, 5, 7, 9, 11, 13, 15];
  return {
    tiles,
    dead: new Array(8).fill(false) as boolean[],
    left: 0,
    right: tiles.length - 1,
    targets: [16],
    found: [],
    moves: 0,
    budget: 14,
    difficulty,
    collected: [],
  };
}

/**
 * Compute optimal cost by trying all target orderings with two-pointer.
 */
function computeOptimalCost(
  tiles: number[],
  dead: boolean[],
  targets: number[],
): number | null {
  if (targets.length === 0) return 0;
  const perms = permutations(targets);
  let best = Infinity;

  for (const perm of perms) {
    const cost = simTwoPointer(tiles, [...dead], perm);
    if (cost !== null && cost < best) best = cost;
  }

  return best === Infinity ? null : best;
}

/**
 * Simulate two-pointer for a target ordering.
 */
function simTwoPointer(
  tiles: number[],
  dead: boolean[],
  targetOrder: number[],
): number | null {
  let left = 0;
  let right = tiles.length - 1;
  while (left < tiles.length && dead[left]) left++;
  while (right >= 0 && dead[right]) right--;
  let totalMoves = 0;

  for (const target of targetOrder) {
    if (left >= right || left < 0 || right >= tiles.length) return null;

    let found = false;
    let safety = 0;
    while (left < right && safety < tiles.length * 2) {
      safety++;
      const sum = tiles[left] + tiles[right];
      if (sum === target) {
        totalMoves++;
        dead[left] = true;
        dead[right] = true;
        // Auto-advance past dead
        while (left < tiles.length && dead[left]) left++;
        while (right >= 0 && dead[right]) right--;
        found = true;
        break;
      } else if (sum < target) {
        totalMoves++;
        const nl = nextLiveRight(dead, left);
        if (nl === -1 || nl >= right) return null;
        left = nl;
      } else {
        totalMoves++;
        const nr = nextLiveLeft(dead, right);
        if (nr === -1 || nr <= left) return null;
        right = nr;
      }
    }
    if (!found) return null;
  }

  return totalMoves;
}

/** Generate all permutations (small arrays only, max 4! = 24) */
function permutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [[...arr]];
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const perm of permutations(rest)) {
      result.push([arr[i], ...perm]);
    }
  }
  return result;
}

/* ─── Game Logic ─── */

/** Returns legal moves from current state */
export function legalMoves(state: PinchState): Move[] {
  if (state.moves >= state.budget) return [];
  if (state.found.length === state.targets.length) return [];
  if (state.left < 0 || state.right < 0 || state.left >= state.right) return [];

  const moves: Move[] = [];

  // Can move left cursor right if there's a live tile to move to
  const nl = nextLiveRight(state.dead, state.left);
  if (nl !== -1 && nl < state.right) {
    moves.push('left');
  }

  // Can move right cursor left if there's a live tile to move to
  const nr = nextLiveLeft(state.dead, state.right);
  if (nr !== -1 && nr > state.left) {
    moves.push('right');
  }

  // Can collect if current pair sums to an unfound target
  if (!state.dead[state.left] && !state.dead[state.right]) {
    const sum = state.tiles[state.left] + state.tiles[state.right];
    const remainingTargets = state.targets.filter(t => !state.found.includes(t));
    if (remainingTargets.includes(sum)) {
      moves.push('collect');
    }
  }

  return moves;
}

/** Apply a move to the state, returning a new state */
export function applyMove(state: PinchState, move: Move): PinchState {
  const next: PinchState = {
    ...state,
    dead: [...state.dead],
    found: [...state.found],
    collected: [...state.collected],
  };

  switch (move) {
    case 'left': {
      const nl = nextLiveRight(state.dead, state.left);
      if (nl !== -1 && nl < state.right) {
        next.left = nl;
        next.moves = state.moves + 1;
      }
      break;
    }
    case 'right': {
      const nr = nextLiveLeft(state.dead, state.right);
      if (nr !== -1 && nr > state.left) {
        next.right = nr;
        next.moves = state.moves + 1;
      }
      break;
    }
    case 'collect': {
      const sum = state.tiles[state.left] + state.tiles[state.right];
      const remainingTargets = state.targets.filter(t => !state.found.includes(t));
      if (remainingTargets.includes(sum)) {
        next.found.push(sum);
        next.collected.push([state.tiles[state.left], state.tiles[state.right]]);
        next.dead[state.left] = true;
        next.dead[state.right] = true;
        next.moves = state.moves + 1;
        // Auto-advance cursors past dead tiles
        let newLeft = state.left;
        let newRight = state.right;
        while (newLeft < state.tiles.length && next.dead[newLeft]) newLeft++;
        while (newRight >= 0 && next.dead[newRight]) newRight--;
        next.left = newLeft < state.tiles.length ? newLeft : state.tiles.length;
        next.right = newRight >= 0 ? newRight : -1;
      }
      break;
    }
  }

  return next;
}

/** Check if the puzzle is solved */
export function isGoal(state: PinchState): boolean {
  return state.found.length === state.targets.length;
}

/**
 * Heuristic: estimates distance to goal.
 * Considers remaining targets and how close the current sum is to any target.
 * Intentionally non-monotonic: moving toward one target can move away from another,
 * creating counterintuitive moments.
 */
export function heuristic(state: PinchState): number {
  const remaining = state.targets.filter(t => !state.found.includes(t));
  if (remaining.length === 0) return 0;

  // Base: number of unfound targets (each needs ~N moves)
  let h = remaining.length * 5;

  // Sum-distance: how far is current sum from closest remaining target?
  if (state.left >= 0 && state.right >= 0 &&
      state.left < state.tiles.length && state.right < state.tiles.length &&
      !state.dead[state.left] && !state.dead[state.right]) {
    const sum = state.tiles[state.left] + state.tiles[state.right];
    // Distance to each remaining target
    for (const t of remaining) {
      h += Math.abs(sum - t) * 0.3;
    }
  }

  // Cursor range penalty: wider range means more work ahead
  const range = Math.max(0, state.right - state.left);
  h += range * 0.05;

  return h;
}

/* ─── Solvers ─── */

export function solve(
  puzzle: PinchState,
  skillLevel: 1 | 2 | 3 | 4 | 5,
): Solution | null {
  switch (skillLevel) {
    case 1: return solveRandom(puzzle);
    case 2: return solveGreedyScan(puzzle);
    case 3: return solveBFS(puzzle);
    case 4: return solveTwoPointer(puzzle);
    case 5: return solveTwoPointerOptimal(puzzle);
  }
}

/** Check alignment: does this move match the two-pointer decision for the closest target? */
function checkAlignment(state: PinchState, move: Move): boolean {
  if (move === 'collect') return false;
  const sum = state.tiles[state.left] + state.tiles[state.right];
  const remaining = state.targets.filter(t => !state.found.includes(t));
  if (remaining.length === 0) return false;
  const closest = remaining.reduce((a, b) =>
    Math.abs(a - sum) < Math.abs(b - sum) ? a : b
  );
  return (sum < closest && move === 'left') || (sum > closest && move === 'right');
}

function cloneState(s: PinchState): PinchState {
  return {
    ...s,
    dead: [...s.dead],
    found: [...s.found],
    collected: [...s.collected],
  };
}

/** Level 1: Random valid moves (many attempts, always collect when possible) */
function solveRandom(puzzle: PinchState): Solution | null {
  for (let attempt = 0; attempt < 200; attempt++) {
    const rng = makeRng(42 + attempt * 97);
    let state = cloneState(puzzle);
    const moveList: Move[] = [];
    let aligned = 0;
    let nonCollect = 0;

    for (let i = 0; i < puzzle.budget; i++) {
      if (isGoal(state)) break;
      const legal = legalMoves(state);
      if (legal.length === 0) break;

      // Always collect if possible
      const move = legal.includes('collect')
        ? 'collect'
        : legal[Math.floor(rng() * legal.length)];

      if (move !== 'collect') {
        nonCollect++;
        if (checkAlignment(state, move)) aligned++;
      }
      moveList.push(move);
      state = applyMove(state, move);
    }

    if (isGoal(state)) {
      return { moves: moveList, steps: moveList.length, algorithmAligned: aligned, totalNonCollect: nonCollect };
    }
  }
  return null;
}

/**
 * Level 2: Greedy "move the further cursor" strategy.
 * Always moves whichever cursor is further from the center of the remaining
 * range. This is a simple heuristic that converges but doesn't use sum
 * comparison, so it wastes moves compared to two-pointer.
 * Opportunistically collects any matching pair.
 */
function solveGreedyScan(puzzle: PinchState): Solution | null {
  let state = cloneState(puzzle);
  const moveList: Move[] = [];
  let aligned = 0;
  let nonCollect = 0;

  let safety = 0;
  while (!isGoal(state) && state.moves < state.budget && safety < state.budget * 3) {
    safety++;
    const legal = legalMoves(state);
    if (legal.length === 0) break;

    // Always collect if possible
    if (legal.includes('collect')) {
      moveList.push('collect');
      state = applyMove(state, 'collect');
      continue;
    }

    // Move whichever cursor has more room to move inward
    // (roughly: move from the side that's further from center)
    const leftDist = state.left; // how far left is from start
    const rightDist = state.tiles.length - 1 - state.right; // how far right is from end
    // Cursor closer to its respective end has more room to move
    // Move the one with less distance traveled (more room)
    const preferRight = leftDist >= rightDist;
    const preferred: Move = preferRight ? 'right' : 'left';
    const fallback: Move = preferRight ? 'left' : 'right';

    if (legal.includes(preferred)) {
      moveList.push(preferred);
      nonCollect++;
      if (checkAlignment(state, preferred)) aligned++;
      state = applyMove(state, preferred);
    } else if (legal.includes(fallback)) {
      moveList.push(fallback);
      nonCollect++;
      if (checkAlignment(state, fallback)) aligned++;
      state = applyMove(state, fallback);
    }
  }

  if (!isGoal(state)) return null;
  return { moves: moveList, steps: moveList.length, algorithmAligned: aligned, totalNonCollect: nonCollect };
}

/**
 * Level 3: BFS solver — finds shortest solution.
 */
function solveBFS(puzzle: PinchState): Solution | null {
  type QueueItem = {
    state: PinchState;
    moves: Move[];
    aligned: number;
    nonCollect: number;
  };

  const stateKey = (s: PinchState) =>
    `${s.left},${s.right},${s.found.slice().sort().join(':')}`;

  const queue: QueueItem[] = [{
    state: cloneState(puzzle),
    moves: [],
    aligned: 0,
    nonCollect: 0,
  }];
  const visited = new Set<string>();
  visited.add(stateKey(queue[0].state));

  while (queue.length > 0) {
    const item = queue.shift()!;
    const { state, moves, aligned: al, nonCollect: nc } = item;

    if (isGoal(state)) {
      return { moves, steps: moves.length, algorithmAligned: al, totalNonCollect: nc };
    }

    if (state.moves >= state.budget) continue;

    const legal = legalMoves(state);
    for (const move of legal) {
      const next = applyMove(state, move);
      const key = stateKey(next);
      if (visited.has(key)) continue;
      visited.add(key);

      let newAligned = al;
      let newNonCollect = nc;
      if (move !== 'collect') {
        newNonCollect++;
        if (checkAlignment(state, move)) newAligned++;
      }

      queue.push({
        state: next,
        moves: [...moves, move],
        aligned: newAligned,
        nonCollect: newNonCollect,
      });
    }

    if (visited.size > 100000) break;
  }

  return null;
}

/**
 * Level 4: Opportunistic two-pointer.
 * Uses sum comparison to decide direction, but is opportunistic: always
 * collects any matching pair regardless of which target it was searching for.
 * Picks the closest remaining target to guide direction decisions.
 */
function solveTwoPointer(puzzle: PinchState): Solution | null {
  let state = cloneState(puzzle);
  const moveList: Move[] = [];
  let aligned = 0;
  let nonCollect = 0;

  let safety = 0;
  while (!isGoal(state) && state.moves < state.budget && safety < state.budget * 2) {
    safety++;
    const legal = legalMoves(state);
    if (legal.length === 0) break;

    // Always collect if possible (opportunistic)
    if (legal.includes('collect')) {
      moveList.push('collect');
      state = applyMove(state, 'collect');
      continue;
    }

    // Use sum comparison with closest remaining target to decide direction
    const sum = state.tiles[state.left] + state.tiles[state.right];
    const remaining = state.targets.filter(t => !state.found.includes(t));
    if (remaining.length === 0) break;

    // Target closest to current sum guides movement
    const closestTarget = remaining.reduce((a, b) =>
      Math.abs(a - sum) < Math.abs(b - sum) ? a : b
    );

    if (sum < closestTarget) {
      if (legal.includes('left')) {
        moveList.push('left');
        nonCollect++;
        aligned++;
        state = applyMove(state, 'left');
      } else if (legal.includes('right')) {
        moveList.push('right');
        nonCollect++;
        state = applyMove(state, 'right');
      }
    } else {
      if (legal.includes('right')) {
        moveList.push('right');
        nonCollect++;
        aligned++;
        state = applyMove(state, 'right');
      } else if (legal.includes('left')) {
        moveList.push('left');
        nonCollect++;
        state = applyMove(state, 'left');
      }
    }
  }

  if (!isGoal(state)) return null;
  return { moves: moveList, steps: moveList.length, algorithmAligned: aligned, totalNonCollect: nonCollect };
}

/**
 * Level 5: Optimal two-pointer with all target orderings.
 * Tries all permutations, uses two-pointer convergence with opportunistic
 * collection. Picks the ordering yielding fewest total moves.
 */
function solveTwoPointerOptimal(puzzle: PinchState): Solution | null {
  const remainingTargets = puzzle.targets.filter(t => !puzzle.found.includes(t));
  const perms = permutations(remainingTargets);

  let bestSolution: Solution | null = null;

  for (const perm of perms) {
    let state = cloneState(puzzle);
    const moveList: Move[] = [];
    let aligned = 0;
    let nonCollect = 0;
    let failed = false;
    let targetIdx = 0;

    let safety = 0;
    while (!isGoal(state) && state.moves < state.budget &&
           state.left >= 0 && state.right >= 0 && state.left < state.right &&
           safety < state.tiles.length * 3) {
      safety++;
      const legal = legalMoves(state);
      if (legal.length === 0) { failed = true; break; }

      // Opportunistic: always collect if possible
      if (legal.includes('collect')) {
        moveList.push('collect');
        state = applyMove(state, 'collect');
        // Advance targetIdx past any found targets
        while (targetIdx < perm.length && state.found.includes(perm[targetIdx])) {
          targetIdx++;
        }
        continue;
      }

      // Use the current perm target to guide direction
      if (targetIdx >= perm.length) { failed = true; break; }
      const target = perm[targetIdx];
      const sum = state.tiles[state.left] + state.tiles[state.right];

      if (sum < target) {
        if (!legal.includes('left')) { failed = true; break; }
        moveList.push('left');
        nonCollect++;
        aligned++;
        state = applyMove(state, 'left');
      } else {
        if (!legal.includes('right')) { failed = true; break; }
        moveList.push('right');
        nonCollect++;
        aligned++;
        state = applyMove(state, 'right');
      }
    }

    if (!failed && isGoal(state)) {
      const sol: Solution = {
        moves: moveList,
        steps: moveList.length,
        algorithmAligned: aligned,
        totalNonCollect: nonCollect,
      };
      if (!bestSolution || sol.steps < bestSolution.steps) {
        bestSolution = sol;
      }
    }
  }

  return bestSolution;
}
