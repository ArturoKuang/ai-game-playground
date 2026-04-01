/**
 * Sort — Bounded-Reversal Sorting Solver
 *
 * A row of N tokens with C colors. Player selects a contiguous subsequence
 * of length 2-4 and reverses it. Goal: group all same-colored tokens adjacent.
 *
 * Move = { start: number, length: 2|3|4 }
 * State = number[] where each value is a color index (0..C-1)
 */

export type SortState = number[];

export type Move = {
  start: number;
  length: 2 | 3 | 4;
};

export type Solution = {
  moves: Move[];
  steps: number;
  statesVisited: number;
};

/* ─── Helpers ─── */

function stateKey(state: SortState): string {
  return state.join(',');
}

/** Count the number of "breaks" — adjacent positions with different colors */
export function countBreaks(state: SortState): number {
  let breaks = 0;
  for (let i = 0; i < state.length - 1; i++) {
    if (state[i] !== state[i + 1]) breaks++;
  }
  return breaks;
}

/** Minimum possible breaks: numColors - 1 (each color group boundary) */
export function minBreaks(state: SortState): number {
  const colorSet = new Set(state);
  return colorSet.size - 1;
}

/** Goal: all same-colored tokens are grouped (breaks === numColors - 1) */
export function isGoal(state: SortState): boolean {
  return countBreaks(state) === minBreaks(state);
}

/**
 * Heuristic: excess breaks above minimum.
 * Each reversal can fix at most 2 excess breaks, so excessBreaks/2 is admissible.
 * We return the raw excess break count (lower = closer to goal).
 */
export function heuristic(state: SortState): number {
  return countBreaks(state) - minBreaks(state);
}

/** All legal moves for a given state (reverse any contiguous group of 2-4) */
export function legalMoves(state: SortState): Move[] {
  const moves: Move[] = [];
  const n = state.length;
  for (let len = 2; len <= 4; len++) {
    for (let start = 0; start <= n - len; start++) {
      moves.push({ start, length: len as 2 | 3 | 4 });
    }
  }
  return moves;
}

/** Apply a reversal move to the state */
export function applyMove(state: SortState, move: Move): SortState {
  const next = [...state];
  const { start, length } = move;
  for (let i = 0; i < Math.floor(length / 2); i++) {
    const tmp = next[start + i];
    next[start + i] = next[start + length - 1 - i];
    next[start + length - 1 - i] = tmp;
  }
  return next;
}

/* ─── Puzzle Generation ─── */

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

/**
 * Generate a puzzle by starting from a grouped (sorted) state
 * and applying random reversals to scramble it.
 *
 * Difficulty 1: 10 tokens, 3 colors, moderate scramble
 * Difficulty 5: 14 tokens, 4 colors, heavy scramble
 */
export function generatePuzzle(seed: number, difficulty: number): SortState {
  const rng = makeRng(seed);

  const tokenCount = Math.round(10 + (difficulty - 1) * 1); // 10-14
  const colorCount = difficulty <= 2 ? 3 : 4;

  // Build a "sorted" state: colors grouped together
  const sorted: number[] = [];
  const basePerColor = Math.floor(tokenCount / colorCount);
  const remainder = tokenCount - basePerColor * colorCount;
  for (let c = 0; c < colorCount; c++) {
    const count = basePerColor + (c < remainder ? 1 : 0);
    for (let i = 0; i < count; i++) {
      sorted.push(c);
    }
  }

  // Scramble with random reversals — heavy scramble for good puzzles
  const scrambleMoves = 40 + difficulty * 20; // 60 to 140
  let state = [...sorted];
  for (let i = 0; i < scrambleMoves; i++) {
    const moves = legalMoves(state);
    const m = moves[Math.floor(rng() * moves.length)];
    state = applyMove(state, m);
  }

  // Ensure the puzzle isn't already solved
  let attempts = 0;
  while (isGoal(state) && attempts < 100) {
    const moves = legalMoves(state);
    state = applyMove(state, moves[Math.floor(rng() * moves.length)]);
    attempts++;
  }

  // Ensure minimum difficulty: at least (difficulty + 2) excess breaks
  const minExcess = Math.min(difficulty + 2, tokenCount - new Set(state).size);
  attempts = 0;
  while (heuristic(state) < minExcess && attempts < 200) {
    const moves = legalMoves(state);
    state = applyMove(state, moves[Math.floor(rng() * moves.length)]);
    attempts++;
  }

  return state;
}

/** Get difficulty parameters for display */
export function getDifficultyParams(difficulty: number) {
  const tokenCount = Math.round(10 + (difficulty - 1) * 1);
  const colorCount = difficulty <= 2 ? 3 : 4;
  return { tokenCount, colorCount };
}

/* ─── Solver ─── */

/**
 * Skill levels control search budget:
 * 1: random valid moves (no search)
 * 2: greedy (pick move that reduces breaks most)
 * 3: greedy + 1-step lookahead
 * 4: BFS with limited budget
 * 5: BFS with full budget
 */
export function solve(
  puzzle: SortState,
  skillLevel: 1 | 2 | 3 | 4 | 5,
): Solution | null {
  if (isGoal(puzzle)) return { moves: [], steps: 0, statesVisited: 0 };

  switch (skillLevel) {
    case 1:
      return solveRandom(puzzle, 500);
    case 2:
      return solveGreedy(puzzle, 100);
    case 3:
      return solveGreedyLookahead(puzzle, 100);
    case 4:
      return solveBFS(puzzle, 500000);
    case 5:
      return solveBFS(puzzle, 5000000);
  }
}

/** Skill level 1: pick random valid moves */
function solveRandom(puzzle: SortState, maxSteps: number): Solution | null {
  let state = [...puzzle];
  const moveList: Move[] = [];

  // Use seeded RNG for reproducibility
  let s = 42;
  function rng() {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  for (let i = 0; i < maxSteps; i++) {
    const moves = legalMoves(state);
    const m = moves[Math.floor(rng() * moves.length)];
    state = applyMove(state, m);
    moveList.push(m);
    if (isGoal(state)) {
      return { moves: moveList, steps: moveList.length, statesVisited: i + 1 };
    }
  }
  return null;
}

/** Skill level 2: greedy — pick move that minimizes heuristic */
function solveGreedy(puzzle: SortState, maxSteps: number): Solution | null {
  let state = [...puzzle];
  const moveList: Move[] = [];
  let visited = 0;
  const seen = new Set<string>([stateKey(state)]);

  for (let i = 0; i < maxSteps; i++) {
    const moves = legalMoves(state);
    let bestMove: Move | null = null;
    let bestH = Infinity;

    for (const m of moves) {
      const next = applyMove(state, m);
      visited++;
      const h = heuristic(next);
      const key = stateKey(next);
      if (h < bestH && !seen.has(key)) {
        bestH = h;
        bestMove = m;
      }
    }

    if (!bestMove) return null;
    state = applyMove(state, bestMove);
    moveList.push(bestMove);
    seen.add(stateKey(state));
    if (isGoal(state)) {
      return { moves: moveList, steps: moveList.length, statesVisited: visited };
    }
  }
  return null;
}

/** Skill level 3: greedy + 1-step lookahead */
function solveGreedyLookahead(
  puzzle: SortState,
  maxSteps: number,
): Solution | null {
  let state = [...puzzle];
  const moveList: Move[] = [];
  let visited = 0;
  const seen = new Set<string>([stateKey(state)]);

  for (let i = 0; i < maxSteps; i++) {
    const moves = legalMoves(state);
    let bestMove: Move | null = null;
    let bestScore = Infinity;

    for (const m of moves) {
      const next = applyMove(state, m);
      visited++;
      const key = stateKey(next);
      if (seen.has(key)) continue;

      // Look ahead one more step
      const nextMoves = legalMoves(next);
      let minFutureH = heuristic(next);
      for (const m2 of nextMoves) {
        const next2 = applyMove(next, m2);
        visited++;
        const h2 = heuristic(next2);
        if (h2 < minFutureH) minFutureH = h2;
      }

      if (minFutureH < bestScore) {
        bestScore = minFutureH;
        bestMove = m;
      }
    }

    if (!bestMove) return null;
    state = applyMove(state, bestMove);
    moveList.push(bestMove);
    seen.add(stateKey(state));
    if (isGoal(state)) {
      return { moves: moveList, steps: moveList.length, statesVisited: visited };
    }
  }
  return null;
}

/** Skill levels 4-5: BFS with node budget */
function solveBFS(puzzle: SortState, maxNodes: number): Solution | null {
  if (isGoal(puzzle)) return { moves: [], steps: 0, statesVisited: 0 };

  const visited = new Set<string>([stateKey(puzzle)]);
  let frontier: { state: SortState; moves: Move[] }[] = [
    { state: puzzle, moves: [] },
  ];

  while (frontier.length > 0 && visited.size < maxNodes) {
    const next: { state: SortState; moves: Move[] }[] = [];
    for (const { state: cur, moves } of frontier) {
      for (const m of legalMoves(cur)) {
        const ns = applyMove(cur, m);
        const key = stateKey(ns);
        if (visited.has(key)) continue;
        visited.add(key);
        const nm: Move[] = [...moves, m];
        if (isGoal(ns)) {
          return { moves: nm, steps: nm.length, statesVisited: visited.size };
        }
        next.push({ state: ns, moves: nm });
      }
    }
    frontier = next;
  }
  return null;
}

/* ─── Color palette ─── */
export const TOKEN_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12'];
export const TOKEN_LABELS = ['R', 'B', 'G', 'Y'];
