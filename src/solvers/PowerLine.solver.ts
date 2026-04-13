/**
 * PowerLine Solver -- Prefix/Suffix Products (#238 Product of Array Except Self)
 */

export type PowerLineState = {
  cells: number[];
  cellCount: number;
  prefix: (number | null)[];
  suffix: (number | null)[];
  bypass: (number | null)[];
  probed: boolean[];
  scannedLeft: boolean;
  scannedRight: boolean;
  energy: number;
  energyBudget: number;
  energyUsed: number;
  difficulty: number;
  moveHistory: Move[];
};

export type Move =
  | { type: 'scan-left' }
  | { type: 'scan-right' }
  | { type: 'probe'; index: number };

export type Solution = {
  moves: Move[];
  steps: number;
  energyUsed: number;
  scanCount: number;
  probeCount: number;
  algorithmAligned: number;
  totalActions: number;
};

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

type DiffConfig = { cellCount: number; minVal: number; maxVal: number; energyBudget: number };

function getDiffConfig(difficulty: number): DiffConfig {
  switch (difficulty) {
    case 1: return { cellCount: 3, minVal: 2, maxVal: 4, energyBudget: 6 };
    case 2: return { cellCount: 4, minVal: 2, maxVal: 4, energyBudget: 5 };
    case 3: return { cellCount: 6, minVal: 2, maxVal: 5, energyBudget: 5 };
    case 4: return { cellCount: 7, minVal: 2, maxVal: 5, energyBudget: 5 };
    case 5: return { cellCount: 9, minVal: 1, maxVal: 4, energyBudget: 4 };
    default: return { cellCount: 3, minVal: 2, maxVal: 4, energyBudget: 6 };
  }
}

export function generatePuzzle(seed: number, difficulty: number): PowerLineState {
  const rng = makeRng(seed);
  const c = getDiffConfig(difficulty);
  const cells: number[] = [];
  for (let i = 0; i < c.cellCount; i++) {
    cells.push(Math.floor(rng() * (c.maxVal - c.minVal + 1)) + c.minVal);
  }
  return {
    cells, cellCount: c.cellCount,
    prefix: new Array(c.cellCount).fill(null),
    suffix: new Array(c.cellCount).fill(null),
    bypass: new Array(c.cellCount).fill(null),
    probed: new Array(c.cellCount).fill(false),
    scannedLeft: false, scannedRight: false,
    energy: c.energyBudget, energyBudget: c.energyBudget,
    energyUsed: 0, difficulty, moveHistory: [],
  };
}

function computePrefixArray(cells: number[]): number[] {
  const n = cells.length;
  const prefix = new Array(n);
  prefix[0] = 1;
  for (let i = 1; i < n; i++) prefix[i] = prefix[i - 1] * cells[i - 1];
  return prefix;
}

function computeSuffixArray(cells: number[]): number[] {
  const n = cells.length;
  const suffix = new Array(n);
  suffix[n - 1] = 1;
  for (let i = n - 2; i >= 0; i--) suffix[i] = suffix[i + 1] * cells[i + 1];
  return suffix;
}

function computeBypassValue(cells: number[], index: number): number {
  let product = 1;
  for (let i = 0; i < cells.length; i++) {
    if (i !== index) product *= cells[i];
  }
  return product;
}

export function legalMoves(state: PowerLineState): Move[] {
  const moves: Move[] = [];
  if (state.energy >= 2 && !state.scannedLeft) moves.push({ type: 'scan-left' });
  if (state.energy >= 2 && !state.scannedRight) moves.push({ type: 'scan-right' });
  if (state.energy >= 1) {
    for (let i = 0; i < state.cellCount; i++) {
      if (!state.probed[i] && state.bypass[i] === null) {
        moves.push({ type: 'probe', index: i });
      }
    }
  }
  return moves;
}

export function applyMove(state: PowerLineState, move: Move): PowerLineState {
  const next: PowerLineState = {
    ...state,
    prefix: [...state.prefix],
    suffix: [...state.suffix],
    bypass: [...state.bypass],
    probed: [...state.probed],
    moveHistory: [...state.moveHistory, move],
  };

  switch (move.type) {
    case 'scan-left': {
      if (next.scannedLeft || next.energy < 2) break;
      next.scannedLeft = true;
      next.energy -= 2;
      next.energyUsed += 2;
      const pv = computePrefixArray(next.cells);
      for (let i = 0; i < next.cellCount; i++) next.prefix[i] = pv[i];
      break;
    }
    case 'scan-right': {
      if (next.scannedRight || next.energy < 2) break;
      next.scannedRight = true;
      next.energy -= 2;
      next.energyUsed += 2;
      const sv = computeSuffixArray(next.cells);
      for (let i = 0; i < next.cellCount; i++) next.suffix[i] = sv[i];
      break;
    }
    case 'probe': {
      const idx = move.index;
      if (idx < 0 || idx >= next.cellCount) break;
      if (next.probed[idx] || next.bypass[idx] !== null) break;
      if (next.energy < 1) break;
      next.probed[idx] = true;
      next.energy -= 1;
      next.energyUsed += 1;
      next.bypass[idx] = computeBypassValue(next.cells, idx);
      break;
    }
  }

  // Auto-derive bypass from prefix * suffix
  for (let i = 0; i < next.cellCount; i++) {
    if (next.bypass[i] === null && next.prefix[i] !== null && next.suffix[i] !== null) {
      next.bypass[i] = next.prefix[i]! * next.suffix[i]!;
    }
  }

  return next;
}

export function isGoal(state: PowerLineState): boolean {
  return state.bypass.every(b => b !== null);
}

export function solve(
  puzzle: PowerLineState,
  skillLevel: 1 | 2 | 3 | 4 | 5,
): Solution | null {
  switch (skillLevel) {
    case 1: return solveRandom(puzzle);
    case 2: return solveProbeAll(puzzle);
    case 3: return solveSingleSweepProbe(puzzle);
    case 4: return solveTwoSweepsLate(puzzle);
    case 5: return solveOptimal(puzzle);
  }
}

function cloneState(s: PowerLineState): PowerLineState {
  return {
    ...s,
    prefix: [...s.prefix],
    suffix: [...s.suffix],
    bypass: [...s.bypass],
    probed: [...s.probed],
    moveHistory: [...s.moveHistory],
  };
}

function makeSolution(
  moves: Move[], energyUsed: number, scanCount: number, probeCount: number,
): Solution {
  return {
    moves, steps: moves.length, energyUsed, scanCount, probeCount,
    algorithmAligned: scanCount, totalActions: moves.length,
  };
}

/** Level 1: Random -- random actions until budget exhausted. */
function solveRandom(puzzle: PowerLineState): Solution | null {
  for (let attempt = 0; attempt < 200; attempt++) {
    const rng = makeRng(42 + attempt * 97);
    let state = cloneState(puzzle);
    const moveList: Move[] = [];
    let scans = 0, probes = 0;
    for (let step = 0; step < 100; step++) {
      if (isGoal(state)) break;
      const legal = legalMoves(state);
      if (legal.length === 0) break;
      const m = legal[Math.floor(rng() * legal.length)];
      moveList.push(m);
      if (m.type === 'scan-left' || m.type === 'scan-right') scans++;
      if (m.type === 'probe') probes++;
      state = applyMove(state, m);
    }
    if (isGoal(state)) return makeSolution(moveList, state.energyUsed, scans, probes);
  }
  return null;
}

/** Level 2: Probe All -- probes each cell one by one. Costs N energy. */
function solveProbeAll(puzzle: PowerLineState): Solution | null {
  let state = cloneState(puzzle);
  const moveList: Move[] = [];
  let scans = 0, probes = 0;
  for (let i = 0; i < state.cellCount; i++) {
    if (isGoal(state)) break;
    if (state.bypass[i] !== null) continue;
    if (state.energy < 1) break;
    const m: Move = { type: 'probe', index: i };
    moveList.push(m);
    probes++;
    state = applyMove(state, m);
  }
  if (isGoal(state)) return makeSolution(moveList, state.energyUsed, scans, probes);
  return null;
}

/** Level 3: Single Sweep + Probe -- sweeps one direction, then probes remaining. */
function solveSingleSweepProbe(puzzle: PowerLineState): Solution | null {
  let state = cloneState(puzzle);
  const moveList: Move[] = [];
  let scans = 0, probes = 0;
  if (state.energy >= 2) {
    const m: Move = { type: 'scan-left' };
    moveList.push(m); scans++;
    state = applyMove(state, m);
  }
  for (let i = 0; i < state.cellCount; i++) {
    if (isGoal(state)) break;
    if (state.bypass[i] !== null) continue;
    if (state.energy < 1) break;
    const m: Move = { type: 'probe', index: i };
    moveList.push(m); probes++;
    state = applyMove(state, m);
  }
  if (isGoal(state)) return makeSolution(moveList, state.energyUsed, scans, probes);
  return null;
}

/** Level 4: Two Sweeps Late -- probes some cells first, then sweeps. */
function solveTwoSweepsLate(puzzle: PowerLineState): Solution | null {
  let state = cloneState(puzzle);
  const moveList: Move[] = [];
  let scans = 0, probes = 0;
  if (state.energy >= 1 && state.cellCount > 0 && state.bypass[0] === null) {
    const m: Move = { type: 'probe', index: 0 };
    moveList.push(m); probes++;
    state = applyMove(state, m);
  }
  if (state.energy >= 2 && !state.scannedLeft) {
    const m: Move = { type: 'scan-left' };
    moveList.push(m); scans++;
    state = applyMove(state, m);
  }
  if (state.energy >= 2 && !state.scannedRight) {
    const m: Move = { type: 'scan-right' };
    moveList.push(m); scans++;
    state = applyMove(state, m);
  }
  for (let i = 0; i < state.cellCount; i++) {
    if (isGoal(state)) break;
    if (state.bypass[i] !== null) continue;
    if (state.energy < 1) break;
    const m: Move = { type: 'probe', index: i };
    moveList.push(m); probes++;
    state = applyMove(state, m);
  }
  if (isGoal(state)) return makeSolution(moveList, state.energyUsed, scans, probes);
  return null;
}

/** Level 5: Optimal -- Prefix/Suffix -- scan left, scan right.
 * All bypass values auto-derive. Costs exactly 4. */
function solveOptimal(puzzle: PowerLineState): Solution | null {
  let state = cloneState(puzzle);
  const moveList: Move[] = [];
  let scans = 0;
  const probes = 0;
  if (state.energy >= 2) {
    const m: Move = { type: 'scan-left' };
    moveList.push(m); scans++;
    state = applyMove(state, m);
  }
  if (state.energy >= 2) {
    const m: Move = { type: 'scan-right' };
    moveList.push(m); scans++;
    state = applyMove(state, m);
  }
  if (isGoal(state)) return makeSolution(moveList, state.energyUsed, scans, probes);
  return null;
}
