/**
 * Slide (8-puzzle / 15-puzzle) Solver
 * Pure game logic — no React, no UI.
 */

export const SIZE = 3;
export const CELLS = SIZE * SIZE;

const DIRS: [number, number][] = [
  [-1, 0], // up
  [0, 1], // right
  [1, 0], // down
  [0, -1], // left
];

export type SlideState = number[]; // tiles[i] = tile number at position i, 0 = empty
export type Move = number; // index of the tile to slide into empty space

export function goalState(): SlideState {
  return [1, 2, 3, 4, 5, 6, 7, 8, 0];
}

export function isGoal(state: SlideState): boolean {
  const g = goalState();
  return state.every((t, i) => t === g[i]);
}

export function heuristic(state: SlideState): number {
  const g = goalState();
  let total = 0;
  for (let i = 0; i < CELLS; i++) {
    if (state[i] === 0) continue;
    const goalIdx = g.indexOf(state[i]);
    const r1 = Math.floor(i / SIZE);
    const c1 = i % SIZE;
    const r2 = Math.floor(goalIdx / SIZE);
    const c2 = goalIdx % SIZE;
    total += Math.abs(r1 - r2) + Math.abs(c1 - c2);
  }
  return total;
}

export function legalMoves(state: SlideState): Move[] {
  const emptyIdx = state.indexOf(0);
  const er = Math.floor(emptyIdx / SIZE);
  const ec = emptyIdx % SIZE;
  const moves: Move[] = [];
  for (const [dr, dc] of DIRS) {
    const nr = er + dr;
    const nc = ec + dc;
    if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) {
      moves.push(nr * SIZE + nc);
    }
  }
  return moves;
}

export function applyMove(state: SlideState, tileIdx: Move): SlideState {
  const next = [...state];
  const emptyIdx = state.indexOf(0);
  next[emptyIdx] = next[tileIdx];
  next[tileIdx] = 0;
  return next;
}

export function generatePuzzle(seed: number, _difficulty: number): SlideState {
  let s = seed;
  function rng() {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Shuffle by making random moves from goal state
  let tiles = goalState();
  const numShuffles = 30 + Math.floor(rng() * 40);
  for (let i = 0; i < numShuffles; i++) {
    const moves = legalMoves(tiles);
    tiles = applyMove(tiles, moves[Math.floor(rng() * moves.length)]);
  }
  return tiles;
}

export type Solution = {
  moves: Move[];
  steps: number;
};

export function solve(
  puzzle: SlideState,
  skillLevel: 1 | 2 | 3 | 4 | 5,
): Solution | null {
  switch (skillLevel) {
    case 1:
      return solveRandom(puzzle, 200);
    case 2:
      return solveGreedy(puzzle, 100);
    case 3:
      return solveGreedy(puzzle, 100); // greedy IS level 3 for this game
    case 4:
    case 5:
      return solveBFS(puzzle, skillLevel === 5 ? 400000 : 100000);
  }
}

function solveRandom(state: SlideState, maxSteps: number): Solution | null {
  let cur = state;
  const moves: Move[] = [];
  for (let i = 0; i < maxSteps; i++) {
    const legal = legalMoves(cur);
    const m = legal[Math.floor(Math.random() * legal.length)];
    cur = applyMove(cur, m);
    moves.push(m);
    if (isGoal(cur)) return { moves, steps: moves.length };
  }
  return null;
}

function solveGreedy(state: SlideState, maxSteps: number): Solution | null {
  let cur = state;
  const moves: Move[] = [];
  const visited = new Set<string>([state.join(',')]);
  for (let i = 0; i < maxSteps; i++) {
    const legal = legalMoves(cur);
    let bestMove = legal[0];
    let bestH = Infinity;
    for (const m of legal) {
      const next = applyMove(cur, m);
      const key = next.join(',');
      if (visited.has(key)) continue;
      const h = heuristic(next);
      if (h < bestH) {
        bestH = h;
        bestMove = m;
      }
    }
    cur = applyMove(cur, bestMove);
    visited.add(cur.join(','));
    moves.push(bestMove);
    if (isGoal(cur)) return { moves, steps: moves.length };
  }
  return null;
}

function solveBFS(state: SlideState, maxNodes: number): Solution | null {
  if (isGoal(state)) return { moves: [], steps: 0 };
  const visited = new Set<string>([state.join(',')]);
  let frontier: { state: SlideState; moves: Move[] }[] = [
    { state, moves: [] },
  ];

  while (frontier.length > 0 && visited.size < maxNodes) {
    const next: { state: SlideState; moves: Move[] }[] = [];
    for (const { state: cur, moves } of frontier) {
      for (const m of legalMoves(cur)) {
        const ns = applyMove(cur, m);
        const key = ns.join(',');
        if (visited.has(key)) continue;
        visited.add(key);
        const nm = [...moves, m];
        if (isGoal(ns)) return { moves: nm, steps: nm.length };
        next.push({ state: ns, moves: nm });
      }
    }
    frontier = next;
  }
  return null;
}
