/**
 * Loop (Intersecting Ring Rotation) Solver
 *
 * Two overlapping circular loops sharing 2 cells.
 * Loop A: [0,1,2,3,4,5]  Loop B: [2,6,7,8,9,5]
 * Shared positions: 2 and 5
 *
 * 4 moves: rotate A clockwise, A counter-clockwise, B clockwise, B counter-clockwise
 * Goal: tiles 0-9 each in position 0-9
 *
 * Full state space: 10! = 3,628,800 (all permutations reachable)
 * Max solution depth: 22
 */

export const TOTAL = 10;
export const LOOP_A = [0, 1, 2, 3, 4, 5];
export const LOOP_B = [2, 6, 7, 8, 9, 5];

export type LoopState = number[];
export type Move = 0 | 1 | 2 | 3; // 0=ACW, 1=ACCW, 2=BCW, 3=BCCW

export const MOVE_NAMES = ['A\u21bb', 'A\u21ba', 'B\u21bb', 'B\u21ba'];

export function goalState(): LoopState {
  return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
}

export function isGoal(state: LoopState): boolean {
  return state.every((v, i) => v === i);
}

export function heuristic(state: LoopState): number {
  let wrong = 0;
  for (let i = 0; i < TOTAL; i++) {
    if (state[i] !== i) wrong++;
  }
  return wrong;
}

export function legalMoves(): Move[] {
  return [0, 1, 2, 3];
}

export function applyMove(state: LoopState, move: Move): LoopState {
  const next = [...state];
  const loop = move < 2 ? LOOP_A : LOOP_B;
  const cw = move % 2 === 0;

  if (cw) {
    const last = next[loop[loop.length - 1]];
    for (let i = loop.length - 1; i > 0; i--) {
      next[loop[i]] = next[loop[i - 1]];
    }
    next[loop[0]] = last;
  } else {
    const first = next[loop[0]];
    for (let i = 0; i < loop.length - 1; i++) {
      next[loop[i]] = next[loop[i + 1]];
    }
    next[loop[loop.length - 1]] = first;
  }
  return next;
}

function stateKey(state: LoopState): string {
  return state.join(',');
}

export function generatePuzzle(seed: number, difficulty: number): LoopState {
  let s = seed;
  function rng() {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Scramble: more moves = harder. Mon par~4, Fri par~10
  const scrambleMoves = 8 + difficulty * 6; // diff 1→14, diff 5→38
  let state = goalState();
  for (let i = 0; i < scrambleMoves; i++) {
    state = applyMove(state, Math.floor(rng() * 4) as Move);
  }
  if (isGoal(state)) state = applyMove(state, 0);
  return state;
}

export type Solution = {
  moves: Move[];
  steps: number;
};

export function solve(
  puzzle: LoopState,
  skillLevel: 1 | 2 | 3 | 4 | 5,
): Solution | null {
  const maxNodes =
    skillLevel === 1
      ? 100
      : skillLevel === 2
        ? 1000
        : skillLevel === 3
          ? 10000
          : skillLevel === 4
            ? 200000
            : 2000000;
  return solveBFS(puzzle, maxNodes);
}

function solveBFS(state: LoopState, maxNodes: number): Solution | null {
  if (isGoal(state)) return { moves: [], steps: 0 };
  const visited = new Set<string>([stateKey(state)]);
  let frontier: { state: LoopState; moves: Move[] }[] = [
    { state, moves: [] },
  ];

  while (frontier.length > 0 && visited.size < maxNodes) {
    const next: { state: LoopState; moves: Move[] }[] = [];
    for (const { state: cur, moves } of frontier) {
      for (const m of legalMoves()) {
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
