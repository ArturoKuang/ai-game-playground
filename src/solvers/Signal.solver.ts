/**
 * Signal Solver v2
 *
 * Deduce a hidden NxN color grid by broadcasting from row/column edges
 * AND guessing cell colors.
 *
 * Broadcasts are DIRECTIONAL: left vs right on the same row reveal different
 * first-of-each-color orderings. This doubles broadcast options and breaks
 * the "all rows then all columns" dominant strategy.
 *
 * Guessing: tap a cell and commit a color.
 *   - Correct: cell revealed for free (no cost)
 *   - Wrong: costs 1 broadcast AND reveals actual color (negative feedback)
 *
 * Budget = broadcasts + wrong guesses. Beat par to win a star.
 *
 * The solver does NOT peek at the hidden grid for guesses. It computes
 * possible colors via constraint propagation and only guesses when the
 * cell is fully constrained (guaranteed correct) or takes calculated risks.
 */

export const GRID_SIZE = 5;

export type Direction = 'N' | 'S' | 'W' | 'E';

export type Move =
  | { type: 'broadcast'; direction: Direction; index: number }
  | { type: 'guess'; row: number; col: number; color: number };

export type RevealEntry = {
  color: number;
  row: number;
  col: number;
};

export type SignalState = {
  hidden: number[][];         // target grid
  known: (number | null)[][]; // player knowledge (null = unknown)
  usedBroadcasts: Set<string>;
  broadcastCount: number;     // total budget spent (broadcasts + wrong guesses)
  reveals: Map<string, RevealEntry[]>;
  guesses: Set<string>;       // "r-c" keys of all guessed cells
  wrongGuesses: Map<string, number>; // "r-c" -> actual color (wrong guess feedback)
  correctGuesses: number;
  wrongGuessCount: number;
  numColors: number;
  par: number;
};

export type Solution = {
  moves: Move[];
  steps: number;              // total cost (broadcasts + wrong guesses)
  cellsDeduced: number;
};

function bcastKey(direction: Direction, index: number): string {
  return `${direction}-${index}`;
}

function cellKey(row: number, col: number): string {
  return `${row}-${col}`;
}

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

function generateGrid(rng: () => number, numColors: number): number[][] {
  const grid: number[][] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    const row: number[] = [];
    for (let c = 0; c < GRID_SIZE; c++) {
      row.push(Math.floor(rng() * numColors));
    }
    grid.push(row);
  }
  return grid;
}

/** Perform a broadcast: returns the first cell of each color from that direction */
export function broadcast(grid: number[][], direction: Direction, index: number): RevealEntry[] {
  const results: RevealEntry[] = [];
  const seenColors = new Set<number>();
  const size = grid.length;

  const cells: { row: number; col: number }[] = [];
  switch (direction) {
    case 'W':
      for (let c = 0; c < size; c++) cells.push({ row: index, col: c });
      break;
    case 'E':
      for (let c = size - 1; c >= 0; c--) cells.push({ row: index, col: c });
      break;
    case 'N':
      for (let r = 0; r < size; r++) cells.push({ row: r, col: index });
      break;
    case 'S':
      for (let r = size - 1; r >= 0; r--) cells.push({ row: r, col: index });
      break;
  }

  for (const { row, col } of cells) {
    const color = grid[row][col];
    if (!seenColors.has(color)) {
      seenColors.add(color);
      results.push({ color, row, col });
    }
  }

  return results;
}

/** Full constraint propagation returning both known cells and possibility sets */
function propagate(state: SignalState): { known: (number | null)[][]; possible: Set<number>[][] } {
  const size = GRID_SIZE;
  const numColors = state.numColors;
  const known = state.known.map(row => [...row]);

  const possible: Set<number>[][] = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => {
      if (known[r][c] !== null) return new Set([known[r][c]!]);
      const s = new Set<number>();
      for (let i = 0; i < numColors; i++) s.add(i);
      return s;
    })
  );

  // Direct reveals from broadcasts
  for (const [, entries] of state.reveals) {
    for (const { color, row, col } of entries) {
      known[row][col] = color;
      possible[row][col] = new Set([color]);
    }
  }

  // Wrong guess feedback: we know the actual color
  for (const [key, actualColor] of state.wrongGuesses) {
    const [rStr, cStr] = key.split('-');
    const r = parseInt(rStr);
    const c = parseInt(cStr);
    known[r][c] = actualColor;
    possible[r][c] = new Set([actualColor]);
  }

  // Ordering constraints from each broadcast
  for (const [key, entries] of state.reveals) {
    const parts = key.split('-');
    const direction = parts[0] as Direction;
    const index = parseInt(parts[1]);

    const cells: { row: number; col: number }[] = [];
    switch (direction) {
      case 'W':
        for (let c = 0; c < size; c++) cells.push({ row: index, col: c });
        break;
      case 'E':
        for (let c = size - 1; c >= 0; c--) cells.push({ row: index, col: c });
        break;
      case 'N':
        for (let r = 0; r < size; r++) cells.push({ row: r, col: index });
        break;
      case 'S':
        for (let r = size - 1; r >= 0; r--) cells.push({ row: r, col: index });
        break;
    }

    // Cells before a revealed entry can't be that color
    for (const entry of entries) {
      const entryIdx = cells.findIndex(c => c.row === entry.row && c.col === entry.col);
      for (let i = 0; i < entryIdx; i++) {
        possible[cells[i].row][cells[i].col].delete(entry.color);
      }
    }

    // Colors not in the broadcast don't exist in this line
    const revealedColors = new Set(entries.map(e => e.color));
    for (let colorIdx = 0; colorIdx < numColors; colorIdx++) {
      if (!revealedColors.has(colorIdx)) {
        for (const cell of cells) {
          possible[cell.row][cell.col].delete(colorIdx);
        }
      }
    }
  }

  // Fixed-point iteration
  let changed = true;
  let iterations = 0;
  while (changed && iterations < 50) {
    changed = false;
    iterations++;

    // Singleton: cell with 1 possibility is known
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (known[r][c] === null && possible[r][c].size === 1) {
          known[r][c] = [...possible[r][c]][0];
          changed = true;
        }
      }
    }

    // Naked single in broadcast lines
    for (const [key, entries] of state.reveals) {
      const parts = key.split('-');
      const direction = parts[0] as Direction;
      const index = parseInt(parts[1]);

      const cells: { row: number; col: number }[] = [];
      switch (direction) {
        case 'W':
        case 'E':
          for (let c = 0; c < size; c++) cells.push({ row: index, col: c });
          break;
        case 'N':
        case 'S':
          for (let r = 0; r < size; r++) cells.push({ row: r, col: index });
          break;
      }

      const revealedColors = new Set(entries.map(e => e.color));
      for (const color of revealedColors) {
        const candidates = cells.filter(
          cell => known[cell.row][cell.col] === null && possible[cell.row][cell.col].has(color)
        );
        const alreadyPlaced = cells.some(cell => known[cell.row][cell.col] === color);
        if (!alreadyPlaced && candidates.length === 1) {
          const { row, col } = candidates[0];
          known[row][col] = color;
          possible[row][col] = new Set([color]);
          changed = true;
        }
      }
    }

    // Sync
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (known[r][c] !== null) {
          possible[r][c] = new Set([known[r][c]!]);
        }
      }
    }
  }

  return { known, possible };
}

function countKnown(known: (number | null)[][]): number {
  let count = 0;
  for (const row of known) {
    for (const cell of row) {
      if (cell !== null) count++;
    }
  }
  return count;
}

/** Get possibility sets for each cell (used by UI for pencil marks) */
export function getPossibleColors(state: SignalState): Set<number>[][] {
  return propagate(state).possible;
}

export function generatePuzzle(seed: number, difficulty: number): SignalState {
  const rng = seededRng(seed);
  const numColors = Math.min(3 + Math.floor((difficulty - 1) / 2), 5);

  let grid: number[][];
  for (let attempt = 0; attempt < 100; attempt++) {
    grid = generateGrid(rng, numColors);
    const colorCounts = new Array(numColors).fill(0);
    for (const row of grid) {
      for (const cell of row) colorCounts[cell]++;
    }
    if (colorCounts.every((c: number) => c >= 1)) break;
  }
  grid = grid!;

  const emptyState: SignalState = {
    hidden: grid,
    known: Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null)),
    usedBroadcasts: new Set(),
    broadcastCount: 0,
    reveals: new Map(),
    guesses: new Set(),
    wrongGuesses: new Map(),
    correctGuesses: 0,
    wrongGuessCount: 0,
    numColors,
    par: 999,
  };

  // Compute par: use broadcast-only optimal + allow some guessing savings
  const broadcastOnlySol = solveBroadcastOnlyOptimal(emptyState);
  const mixedSol = solveMixed(emptyState);
  const bestCost = Math.min(
    broadcastOnlySol ? broadcastOnlySol.steps : 999,
    mixedSol ? mixedSol.steps : 999,
  );
  const optimalCost = bestCost < 999 ? bestCost : GRID_SIZE * 2;

  // Par: generous on Monday, tight on Friday
  const parPadding = Math.max(0, 4 - difficulty);
  const par = optimalCost + parPadding;

  return {
    hidden: grid,
    known: Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null)),
    usedBroadcasts: new Set(),
    broadcastCount: 0,
    reveals: new Map(),
    guesses: new Set(),
    wrongGuesses: new Map(),
    correctGuesses: 0,
    wrongGuessCount: 0,
    numColors,
    par,
  };
}

/* =================================================================
   APPLY MOVE
   ================================================================= */

export function applyMove(state: SignalState, move: Move): SignalState {
  if (move.type === 'broadcast') {
    const key = bcastKey(move.direction, move.index);
    if (state.usedBroadcasts.has(key)) return state;

    const entries = broadcast(state.hidden, move.direction, move.index);
    const newReveals = new Map(state.reveals);
    newReveals.set(key, entries);
    const newUsed = new Set(state.usedBroadcasts);
    newUsed.add(key);

    const newState: SignalState = {
      ...state,
      usedBroadcasts: newUsed,
      broadcastCount: state.broadcastCount + 1,
      reveals: newReveals,
    };
    const { known } = propagate(newState);
    newState.known = known;
    return newState;
  } else {
    // Guess
    const { row, col, color } = move;
    const ck = cellKey(row, col);
    if (state.known[row][col] !== null || state.guesses.has(ck)) return state;

    const actualColor = state.hidden[row][col];
    const isCorrect = color === actualColor;

    const newGuesses = new Set(state.guesses);
    newGuesses.add(ck);
    const newWrongGuesses = new Map(state.wrongGuesses);

    if (isCorrect) {
      const newState: SignalState = {
        ...state,
        guesses: newGuesses,
        correctGuesses: state.correctGuesses + 1,
      };
      const newKnown = state.known.map(r => [...r]);
      newKnown[row][col] = actualColor;
      newState.known = newKnown;
      // Re-propagate
      const { known } = propagate(newState);
      newState.known = known;
      return newState;
    } else {
      const newState: SignalState = {
        ...state,
        guesses: newGuesses,
        wrongGuesses: new Map([...state.wrongGuesses, [ck, actualColor]]),
        wrongGuessCount: state.wrongGuessCount + 1,
        broadcastCount: state.broadcastCount + 1,
      };
      const newKnown = state.known.map(r => [...r]);
      newKnown[row][col] = actualColor;
      newState.known = newKnown;
      const { known } = propagate(newState);
      newState.known = known;
      return newState;
    }
  }
}

export function isGoal(state: SignalState): boolean {
  return countKnown(state.known) === GRID_SIZE * GRID_SIZE;
}

export function heuristic(state: SignalState): number {
  return GRID_SIZE * GRID_SIZE - countKnown(state.known);
}

/* =================================================================
   LEGAL MOVES — for metric computation, includes all possible moves
   ================================================================= */

export function legalMoves(state: SignalState): Move[] {
  const moves: Move[] = [];
  const directions: Direction[] = ['N', 'S', 'W', 'E'];
  for (const direction of directions) {
    for (let index = 0; index < GRID_SIZE; index++) {
      const key = bcastKey(direction, index);
      if (!state.usedBroadcasts.has(key)) {
        moves.push({ type: 'broadcast', direction, index });
      }
    }
  }
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (state.known[r][c] === null && !state.guesses.has(cellKey(r, c))) {
        for (let color = 0; color < state.numColors; color++) {
          moves.push({ type: 'guess', row: r, col: c, color });
        }
      }
    }
  }
  return moves;
}

/** Just broadcast moves */
function legalBroadcasts(state: SignalState): Move[] {
  const moves: Move[] = [];
  const directions: Direction[] = ['N', 'S', 'W', 'E'];
  for (const direction of directions) {
    for (let index = 0; index < GRID_SIZE; index++) {
      const key = bcastKey(direction, index);
      if (!state.usedBroadcasts.has(key)) {
        moves.push({ type: 'broadcast', direction, index });
      }
    }
  }
  return moves;
}

/** Info gain from a broadcast */
function broadcastGain(state: SignalState, move: Move): number {
  const next = applyMove(state, move);
  return countKnown(next.known) - countKnown(state.known);
}

/* =================================================================
   SOLVERS
   ================================================================= */

/** Solve using only broadcasts (greedy with optional lookahead) */
function solveBroadcastOnly(state: SignalState, lookahead: number): Solution | null {
  const moves: Move[] = [];
  let current = cloneState(state);

  while (!isGoal(current)) {
    const available = legalBroadcasts(current);
    if (available.length === 0) return null;

    let bestMove: Move | null = null;
    let bestGain = -1;

    if (lookahead === 0) {
      for (const m of available) {
        const gain = broadcastGain(current, m);
        if (gain > bestGain) { bestGain = gain; bestMove = m; }
      }
    } else {
      for (const m of available) {
        const next = applyMove(current, m);
        let totalGain = countKnown(next.known) - countKnown(current.known);
        if (!isGoal(next)) {
          const nextAvail = legalBroadcasts(next);
          let best2 = 0;
          for (const m2 of nextAvail) {
            const g2 = broadcastGain(next, m2);
            if (g2 > best2) best2 = g2;
          }
          totalGain += best2;
        }
        if (totalGain > bestGain) { bestGain = totalGain; bestMove = m; }
      }
    }

    if (!bestMove || bestGain <= 0) return null;
    current = applyMove(current, bestMove);
    moves.push(bestMove);
  }

  return { moves, steps: moves.length, cellsDeduced: GRID_SIZE * GRID_SIZE };
}

/** Broadcast-only optimal via iterative deepening DFS */
let dfsNodes = 0;
const NODE_LIMIT = 5000;

function solveBroadcastOnlyOptimal(state: SignalState): Solution | null {
  const greedySol = solveBroadcastOnly(state, 1);
  const ub = greedySol ? greedySol.steps : 20;

  for (let maxD = 1; maxD <= ub; maxD++) {
    dfsNodes = 0;
    const res = dfsBroadcast(state, [], maxD);
    if (res) return res;
  }
  return greedySol;
}

function dfsBroadcast(state: SignalState, path: Move[], maxD: number): Solution | null {
  if (isGoal(state)) return { moves: [...path], steps: path.length, cellsDeduced: GRID_SIZE * GRID_SIZE };
  if (path.length >= maxD || dfsNodes > NODE_LIMIT) return null;
  dfsNodes++;

  const remaining = heuristic(state);
  if (remaining > (maxD - path.length) * GRID_SIZE) return null;

  const available = legalBroadcasts(state);
  const scored = available.map(m => ({ m, g: broadcastGain(state, m) }))
    .filter(x => x.g > 0)
    .sort((a, b) => b.g - a.g)
    .slice(0, 4);

  for (const { m } of scored) {
    const next = applyMove(state, m);
    path.push(m);
    const res = dfsBroadcast(next, path, maxD);
    if (res) return res;
    path.pop();
  }
  return null;
}

/**
 * Mixed solver: broadcasts + deduction-based guessing.
 * After each broadcast, make all deducible guesses (cells with exactly 1 possible color).
 * Then strategically guess cells with 2 possible colors (50%+ chance correct).
 */
function solveMixed(state: SignalState): Solution | null {
  const moves: Move[] = [];
  let current = cloneState(state);
  let cost = 0;

  // Helper: make all safe (deduced) guesses
  function makeSafeGuesses() {
    const { possible } = propagate(current);
    let found = true;
    while (found) {
      found = false;
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (current.known[r][c] === null && !current.guesses.has(cellKey(r, c))) {
            if (possible[r][c].size === 1) {
              const color = [...possible[r][c]][0];
              const m: Move = { type: 'guess', row: r, col: c, color };
              current = applyMove(current, m);
              moves.push(m);
              // cost stays the same (correct guess is free)
              found = true;
            }
          }
        }
      }
      if (found) {
        // Re-propagate
        const newP = propagate(current);
        for (let r = 0; r < GRID_SIZE; r++) {
          for (let c = 0; c < GRID_SIZE; c++) {
            if (current.known[r][c] === null && newP.possible[r][c].size === 1) {
              found = true;
            }
          }
        }
      }
    }
  }

  makeSafeGuesses();

  let maxIter = 50;
  while (!isGoal(current) && maxIter-- > 0) {
    // Pick best broadcast
    const available = legalBroadcasts(current);

    // Also consider risky guesses: cells with 2 options (50% correct)
    const { possible } = propagate(current);
    type RiskyGuess = { r: number; c: number; colors: number[]; expectedCost: number };
    const riskyGuesses: RiskyGuess[] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (current.known[r][c] === null && !current.guesses.has(cellKey(r, c))) {
          const opts = [...possible[r][c]];
          if (opts.length === 2) {
            // 50% chance correct (free), 50% wrong (cost 1 but reveals info)
            // Expected cost = 0.5 * 0 + 0.5 * 1 = 0.5
            // But either way we learn the cell, plus propagation cascades
            riskyGuesses.push({ r, c, colors: opts, expectedCost: 0.5 });
          }
        }
      }
    }

    let bestBroadcastGain = 0;
    let bestBroadcast: Move | null = null;
    for (const m of available) {
      const g = broadcastGain(current, m);
      if (g > bestBroadcastGain) { bestBroadcastGain = g; bestBroadcast = m; }
    }

    // Compare: best broadcast (cost 1, gain bestBroadcastGain) vs risky guess (expected cost 0.5, guaranteed 1 cell + propagation)
    let usedRiskyGuess = false;
    if (riskyGuesses.length > 0) {
      // Find the risky guess with best propagation cascade
      let bestRisky: RiskyGuess | null = null;
      let bestRiskyGain = 0;
      for (const rg of riskyGuesses) {
        // Simulate: guess the first option
        const m1: Move = { type: 'guess', row: rg.r, col: rg.c, color: rg.colors[0] };
        const next1 = applyMove(current, m1);
        const gain1 = countKnown(next1.known) - countKnown(current.known);
        const m2: Move = { type: 'guess', row: rg.r, col: rg.c, color: rg.colors[1] };
        const next2 = applyMove(current, m2);
        const gain2 = countKnown(next2.known) - countKnown(current.known);
        const avgGain = (gain1 + gain2) / 2;
        if (avgGain > bestRiskyGain) { bestRiskyGain = avgGain; bestRisky = rg; }
      }

      // If risky guess has better info/cost ratio than broadcast
      if (bestRisky && bestRiskyGain / 0.5 > bestBroadcastGain / 1) {
        // Take the risky guess
        const actual = current.hidden[bestRisky.r][bestRisky.c];
        const color = bestRisky.colors.includes(actual) ? actual : bestRisky.colors[0];
        // Solver doesn't know actual! Pick the first option.
        const guessColor = bestRisky.colors[0];
        const m: Move = { type: 'guess', row: bestRisky.r, col: bestRisky.c, color: guessColor };
        current = applyMove(current, m);
        moves.push(m);
        if (guessColor !== actual) cost++;
        usedRiskyGuess = true;
      }
    }

    if (!usedRiskyGuess) {
      if (!bestBroadcast) {
        // No broadcasts, no risky guesses with 2 options. Try 3-option guesses.
        let found = false;
        for (let r = 0; r < GRID_SIZE && !found; r++) {
          for (let c = 0; c < GRID_SIZE && !found; c++) {
            if (current.known[r][c] === null && !current.guesses.has(cellKey(r, c))) {
              const opts = [...possible[r][c]];
              if (opts.length > 0) {
                const m: Move = { type: 'guess', row: r, col: c, color: opts[0] };
                current = applyMove(current, m);
                moves.push(m);
                const actual = current.hidden[r]?.[c]; // won't work, already applied
                // Check from the state update
                if (current.wrongGuessCount > cost + (state.wrongGuessCount || 0)) cost++;
                found = true;
              }
            }
          }
        }
        if (!found) break;
      } else {
        current = applyMove(current, bestBroadcast);
        moves.push(bestBroadcast);
        cost++;
      }
    }

    makeSafeGuesses();
  }

  if (!isGoal(current)) return null;
  return { moves, steps: current.broadcastCount, cellsDeduced: GRID_SIZE * GRID_SIZE };
}

/** Random solver: random broadcasts + random guesses */
function solveRandom(state: SignalState, rngSeed: number): Solution | null {
  const rng = seededRng(rngSeed);
  const moves: Move[] = [];
  let current = cloneState(state);
  let maxIter = 100;

  while (!isGoal(current) && maxIter-- > 0) {
    const doBroadcast = rng() < 0.5;

    if (doBroadcast) {
      const available = legalBroadcasts(current);
      if (available.length === 0) {
        // Must guess
        const unk = findUnknowns(current);
        if (unk.length === 0) break;
        const pick = unk[Math.floor(rng() * unk.length)];
        const color = Math.floor(rng() * current.numColors);
        const m: Move = { type: 'guess', row: pick.r, col: pick.c, color };
        current = applyMove(current, m);
        moves.push(m);
      } else {
        const m = available[Math.floor(rng() * available.length)];
        current = applyMove(current, m);
        moves.push(m);
      }
    } else {
      const unk = findUnknowns(current);
      if (unk.length === 0) break;
      const pick = unk[Math.floor(rng() * unk.length)];
      const color = Math.floor(rng() * current.numColors);
      const m: Move = { type: 'guess', row: pick.r, col: pick.c, color };
      current = applyMove(current, m);
      moves.push(m);
    }
  }

  if (!isGoal(current)) return null;
  return { moves, steps: current.broadcastCount, cellsDeduced: GRID_SIZE * GRID_SIZE };
}

/** Greedy broadcasts + random guesses for remaining */
function solveGreedyBroadcastRandomGuess(state: SignalState, rngSeed: number): Solution | null {
  const rng = seededRng(rngSeed);
  const moves: Move[] = [];
  let current = cloneState(state);

  // Phase 1: greedy broadcasts until no more useful ones
  while (!isGoal(current)) {
    const available = legalBroadcasts(current);
    let bestMove: Move | null = null;
    let bestGain = 0;
    for (const m of available) {
      const g = broadcastGain(current, m);
      if (g > bestGain) { bestGain = g; bestMove = m; }
    }
    if (!bestMove || bestGain === 0) break;
    current = applyMove(current, bestMove);
    moves.push(bestMove);
  }

  // Phase 2: safe guesses from deduction
  const { possible: poss } = propagate(current);
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (current.known[r][c] === null && !current.guesses.has(cellKey(r, c)) && poss[r][c].size === 1) {
        const color = [...poss[r][c]][0];
        const m: Move = { type: 'guess', row: r, col: c, color };
        current = applyMove(current, m);
        moves.push(m);
      }
    }
  }

  // Phase 3: random guesses for remaining
  let maxIter = 50;
  while (!isGoal(current) && maxIter-- > 0) {
    const unk = findUnknowns(current);
    if (unk.length === 0) break;
    const pick = unk[Math.floor(rng() * unk.length)];
    const color = Math.floor(rng() * current.numColors);
    const m: Move = { type: 'guess', row: pick.r, col: pick.c, color };
    current = applyMove(current, m);
    moves.push(m);
  }

  if (!isGoal(current)) return null;
  return { moves, steps: current.broadcastCount, cellsDeduced: GRID_SIZE * GRID_SIZE };
}

/* =================================================================
   SKILL LEVELS
   ================================================================= */

export function solve(puzzle: SignalState, skillLevel: 1 | 2 | 3 | 4 | 5): Solution | null {
  switch (skillLevel) {
    case 1:
      return solveRandom(puzzle, 42);
    case 2:
      return solveGreedyBroadcastRandomGuess(puzzle, 42);
    case 3:
      return solveBroadcastOnly(puzzle, 1);
    case 4:
      return solveMixed(puzzle);
    case 5: {
      const bcastOpt = solveBroadcastOnlyOptimal(puzzle);
      const mixed = solveMixed(puzzle);
      if (!bcastOpt) return mixed;
      if (!mixed) return bcastOpt;
      return mixed.steps <= bcastOpt.steps ? mixed : bcastOpt;
    }
    default:
      return null;
  }
}

/* =================================================================
   HELPERS
   ================================================================= */

function cloneState(s: SignalState): SignalState {
  return {
    ...s,
    known: s.known.map(r => [...r]),
    usedBroadcasts: new Set(s.usedBroadcasts),
    reveals: new Map(s.reveals),
    guesses: new Set(s.guesses),
    wrongGuesses: new Map(s.wrongGuesses),
  };
}

function findUnknowns(state: SignalState): { r: number; c: number }[] {
  const result: { r: number; c: number }[] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (state.known[r][c] === null && !state.guesses.has(cellKey(r, c))) {
        result.push({ r, c });
      }
    }
  }
  return result;
}

/* =================================================================
   METRICS
   ================================================================= */

export function computeMetrics(seed: number, difficulty: number) {
  const puzzle = generatePuzzle(seed, difficulty);

  const solutions: (Solution | null)[] = [];
  for (let level = 1; level <= 5; level++) {
    solutions.push(solve(puzzle, level as 1 | 2 | 3 | 4 | 5));
  }

  const sol5 = solutions[4];
  const sol1 = solutions[0];
  const sol3 = solutions[2];

  const solvable = sol5 !== null;
  const optimalCost = sol5 ? sol5.steps : 0;
  const randomCost = sol1 ? sol1.steps : 0;

  const skillDepth = randomCost > 0 ? (randomCost - optimalCost) / randomCost : 0;

  let puzzleEntropy = 0;
  let decisionEntropySum = 0;
  let decisionSteps = 0;
  let counterintuitiveCount = 0;
  let drama = 0;

  if (sol5) {
    let state = cloneState(puzzle);
    let prevH = heuristic(state);
    let bestProgress = 0;

    for (let i = 0; i < sol5.moves.length; i++) {
      const move = sol5.moves[i];

      // Count legal broadcast + safe-guess + risky-guess alternatives
      const bcastMoves = legalBroadcasts(state);
      const { possible } = propagate(state);
      let safeGuessCount = 0;
      let riskyGuessCount = 0;
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (state.known[r][c] === null && !state.guesses.has(cellKey(r, c))) {
            if (possible[r][c].size === 1) safeGuessCount++;
            else if (possible[r][c].size === 2) riskyGuessCount++;
          }
        }
      }

      // Meaningful decisions: broadcast choices + risky guess choices
      const meaningfulChoices = bcastMoves.length + riskyGuessCount;
      if (meaningfulChoices > 1) {
        puzzleEntropy += Math.log2(meaningfulChoices);
        decisionSteps++;

        // Shannon entropy across broadcast gains
        const gains = bcastMoves.map(m => broadcastGain(state, m));
        // Add risky guess "gains" (average gain across outcomes)
        for (let r = 0; r < GRID_SIZE; r++) {
          for (let c = 0; c < GRID_SIZE; c++) {
            if (state.known[r][c] === null && !state.guesses.has(cellKey(r, c)) && possible[r][c].size === 2) {
              const opts = [...possible[r][c]];
              const g1 = countKnown(applyMove(state, { type: 'guess', row: r, col: c, color: opts[0] }).known) - countKnown(state.known);
              const g2 = countKnown(applyMove(state, { type: 'guess', row: r, col: c, color: opts[1] }).known) - countKnown(state.known);
              gains.push((g1 + g2) / 2);
            }
          }
        }
        const total = gains.reduce((a, b) => a + Math.max(b, 0.001), 0);
        let se = 0;
        for (const g of gains) {
          const p = Math.max(g, 0.001) / total;
          se -= p * Math.log2(p);
        }
        decisionEntropySum += se;
      }

      const nextState = applyMove(state, move);
      const nextH = heuristic(nextState);

      // Counterintuitive: heuristic worsens
      if (nextH > prevH) {
        counterintuitiveCount++;
      }

      // CI: optimal chose a risky guess when safe broadcast was available
      if (move.type === 'guess' && bcastMoves.length > 0) {
        counterintuitiveCount++;
      }

      // CI: optimal chose a lower-gain broadcast
      if (move.type === 'broadcast' && bcastMoves.length > 1) {
        const bestGain = Math.max(...bcastMoves.map(m => broadcastGain(state, m)));
        const chosenGain = broadcastGain(state, move);
        if (chosenGain < bestGain * 0.8) {
          counterintuitiveCount++;
        }
      }

      const progress = (GRID_SIZE * GRID_SIZE - nextH) / (GRID_SIZE * GRID_SIZE);
      bestProgress = Math.max(bestProgress, progress);

      prevH = nextH;
      state = nextState;
    }

    drama = bestProgress;
  }

  const decisionEntropy = decisionSteps > 0 ? decisionEntropySum / decisionSteps : 0;

  let infoGainRatio = 1;
  if (sol5 && sol1 && sol1.steps > 0) {
    const optInfo = (GRID_SIZE * GRID_SIZE) / Math.max(sol5.steps, 1);
    const rndInfo = (GRID_SIZE * GRID_SIZE) / sol1.steps;
    infoGainRatio = rndInfo > 0 ? optInfo / rndInfo : 1;
  }

  const durationSeconds = sol3 ? sol3.moves.length * 8 : 0;

  return {
    solvable,
    puzzleEntropy,
    skillDepth,
    decisionEntropy,
    counterintuitive: counterintuitiveCount,
    drama,
    durationSeconds,
    infoGainRatio,
    solutionUniqueness: 1,
    optimalCost,
    randomCost,
    par: puzzle.par,
    numColors: puzzle.numColors,
  };
}

export function runMetricsSuite() {
  const seeds = [1001, 1002, 1003, 1004, 1005];
  const difficulties = [1, 2, 3, 4, 5];
  const results = [];
  for (let i = 0; i < 5; i++) {
    results.push(computeMetrics(seeds[i], difficulties[i]));
  }
  return results;
}
