/**
 * Knot Solver
 *
 * Draw a single closed loop on a grid that passes through every marked cell.
 * Marked cells have hidden directional constraints (entry/exit directions)
 * revealed only when the loop reaches them. Complete the loop within par segments.
 *
 * Key design: puzzles are generated backward from a valid loop. Directional
 * constraints are derived from the loop's actual entry/exit at each marked cell.
 * Hidden constraints create progressive revelation and counterintuitive routing.
 */

/* ─── Types ─── */

/** Direction: 0=up, 1=right, 2=down, 3=left */
export type Dir = 0 | 1 | 2 | 3;

export type Constraint = {
  enter: Dir; // required entry direction (from which direction the cell is entered)
  exit: Dir;  // required exit direction (which direction the cell is exited toward)
};

export type MarkedCell = {
  idx: number;
  constraint: Constraint;
  revealed: boolean; // whether player has reached this cell
  satisfied: boolean;
};

export type KnotState = {
  size: number;
  /** Loop path so far (cell indices in order) */
  path: number[];
  /** Starting cell index (loop must close here) */
  startCell: number;
  /** Marked cells with constraints */
  marked: MarkedCell[];
  /** Set of marked cell indices for quick lookup */
  markedSet: number[];
  /** Number of pre-revealed constraints (difficulty knob) */
  preRevealed: number;
  /** How many discovered constraints survive a full reset (difficulty knob) */
  constraintMemory: number;
  /** Par (optimal + buffer) */
  par: number;
  /** Whether game is complete */
  closed: boolean;
  /** Total segments in optimal solution */
  optimalLength: number;
  /** The solution loop (stored for solver verification) */
  _solutionPath?: number[];
};

export type Move = number; // cell index to extend the loop to

export type Solution = {
  moves: Move[];
  steps: number;
};

/* ─── Helpers ─── */
function idx(r: number, c: number, size: number): number {
  return r * size + c;
}

function rowCol(index: number, size: number): [number, number] {
  return [Math.floor(index / size), index % size];
}

function getAdj(index: number, size: number): number[] {
  const [r, c] = rowCol(index, size);
  const adj: number[] = [];
  if (r > 0) adj.push(idx(r - 1, c, size));   // up
  if (c < size - 1) adj.push(idx(r, c + 1, size));   // right
  if (r < size - 1) adj.push(idx(r + 1, c, size));   // down
  if (c > 0) adj.push(idx(r, c - 1, size));   // left
  return adj;
}

/** Get the direction FROM cell a TO cell b */
function getDir(a: number, b: number, size: number): Dir {
  const [ar, ac] = rowCol(a, size);
  const [br, bc] = rowCol(b, size);
  if (br < ar) return 0; // up
  if (bc > ac) return 1; // right
  if (br > ar) return 2; // down
  return 3; // left
}

/** Get the opposite direction */
function oppositeDir(d: Dir): Dir {
  return ((d + 2) % 4) as Dir;
}

/* ─── PRNG ─── */
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

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ─── Loop Generation ─── */

/**
 * Generate a closed loop on a size x size grid using a random self-avoiding
 * walk that backtracks to find closure.
 */
function generateClosedLoop(
  size: number,
  minLength: number,
  maxLength: number,
  rng: () => number,
): number[] | null {
  const totalCells = size * size;

  for (let attempt = 0; attempt < 500; attempt++) {
    // Pick a start cell not on the edge corners for better closure options
    const startCell = Math.floor(rng() * totalCells);
    const visited = new Set<number>([startCell]);
    const path = [startCell];

    // Build path with backtracking
    let backtrackBudget = 50;

    while (path.length < maxLength) {
      const current = path[path.length - 1];

      // Check if we can close
      if (path.length >= minLength) {
        const startAdj = getAdj(startCell, size);
        if (startAdj.includes(current)) {
          return path;
        }
      }

      const adj = getAdj(current, size).filter((a) => !visited.has(a));

      if (adj.length === 0) {
        // Dead end - backtrack
        if (backtrackBudget <= 0) break;
        backtrackBudget--;
        visited.delete(path.pop()!);
        continue;
      }

      // Heuristic scoring for next move
      const scored = adj.map((a) => {
        const [ar, ac] = rowCol(a, size);
        const [sr, sc] = rowCol(startCell, size);
        const distToStart = Math.abs(ar - sr) + Math.abs(ac - sc);
        const futureAdj = getAdj(a, size).filter(
          (n) => !visited.has(n) || n === startCell,
        ).length;
        return { cell: a, distToStart, futureAdj, score: 0 };
      });

      // Phase-based strategy
      const progressFrac = path.length / maxLength;

      if (progressFrac < 0.5) {
        // Exploration phase: random with slight preference for open areas
        for (const s of scored) s.score = s.futureAdj + rng() * 2;
      } else {
        // Closure phase: prefer moves toward start, penalize dead-end paths
        for (const s of scored) {
          s.score = -s.distToStart * 2 + s.futureAdj + rng();
          // Bonus if adjacent to start
          if (getAdj(s.cell, size).includes(startCell)) s.score += 10;
        }
      }

      scored.sort((a, b) => b.score - a.score);
      const pick = scored[0];
      path.push(pick.cell);
      visited.add(pick.cell);
    }

    // Final check
    if (path.length >= minLength) {
      const current = path[path.length - 1];
      if (getAdj(startCell, size).includes(current)) {
        return path;
      }
    }
  }

  return null;
}

/**
 * Count how many approach directions are "compatible" for a cell on the loop.
 * A cell at a turn (enter from left, exit up) has fewer compatible approaches
 * than a cell on a straight segment (enter from left, exit right).
 *
 * Compatible approaches = number of adjacent grid neighbors from which a loop
 * could theoretically enter this cell AND still exit in the constrained direction.
 * Straight-through = 2 compatible (can enter from either end of the line).
 * Turn = 1-2 compatible (must enter from the specific side).
 */
function constraintTightness(
  cellIdx: number,
  prevCell: number,
  nextCell: number,
  size: number,
): number {
  const enterDir = oppositeDir(getDir(prevCell, cellIdx, size));
  const exitDir = getDir(cellIdx, nextCell, size);

  // If enter and exit are opposite (straight-through), the constraint is loose:
  // many loop shapes can pass through this cell in a straight line.
  // If they form a turn (90 degrees), it's tighter.
  if (oppositeDir(enterDir) === exitDir) {
    return 3; // straight-through: most compatible (loose)
  }
  return 1; // turn: least compatible (tight)
}

/**
 * Select marked cells along a loop path.
 * Skip the first cell (start). Spread them out.
 * On harder difficulties, prefer cells at turns (tighter constraints).
 */
function selectMarkedCells(
  loopPath: number[],
  count: number,
  rng: () => number,
  difficulty: number = 3,
): number[] {
  const candidates = loopPath.slice(1); // skip start
  if (count >= candidates.length) return candidates;

  const size = Math.round(Math.sqrt(loopPath.length * 2)); // approximate grid size
  // Won't use size directly -- pass it through from caller. For now compute per cell.

  // Score each candidate by tightness
  const scored = candidates.map((cellIdx) => {
    const pathPos = loopPath.indexOf(cellIdx);
    const prevCell = pathPos > 0 ? loopPath[pathPos - 1] : loopPath[loopPath.length - 1];
    const nextCell = pathPos < loopPath.length - 1 ? loopPath[pathPos + 1] : loopPath[0];
    // We need the actual grid size, not approximate. We'll fix this from caller.
    return { cellIdx, pathPos, prevCell, nextCell };
  });

  // The actual grid size is needed -- we'll compute it properly in generatePuzzle
  // For now return evenly spread with tightness preference
  const step = Math.max(1, Math.floor(candidates.length / (count + 1)));
  const marked: number[] = [];

  for (let i = step; i < candidates.length && marked.length < count; i += step) {
    marked.push(candidates[i]);
  }

  const remaining = candidates.filter((c) => !marked.includes(c));
  const shuffled = shuffle(remaining, rng);
  while (marked.length < count && shuffled.length > 0) {
    marked.push(shuffled.pop()!);
  }

  return marked.slice(0, count);
}

/**
 * Select marked cells with constraint tightness filtering.
 * On harder difficulties, prefer cells at turns (tight constraints).
 * - difficulty 1-2 (Mon/Tue): allow mix of turns and straights (2 compatible avg)
 * - difficulty 3 (Wed): prefer turns, allow 1-2 straights (1-2 compatible avg)
 * - difficulty 4-5 (Thu/Fri): maximize turns, exactly 1 compatible direction each
 */
function selectMarkedCellsTight(
  loopPath: number[],
  count: number,
  size: number,
  rng: () => number,
  difficulty: number,
): number[] {
  const candidates = loopPath.slice(1); // skip start
  if (count >= candidates.length) return candidates;

  // Score each candidate
  const scored = candidates.map((cellIdx) => {
    const pathPos = loopPath.indexOf(cellIdx);
    const prevCell = pathPos > 0 ? loopPath[pathPos - 1] : loopPath[loopPath.length - 1];
    const nextCell = pathPos < loopPath.length - 1 ? loopPath[pathPos + 1] : loopPath[0];
    const tightness = constraintTightness(cellIdx, prevCell, nextCell, size);
    return { cellIdx, tightness, pathPos };
  });

  // Separate into tight (turns) and loose (straight-through)
  const tight = scored.filter((s) => s.tightness <= 1);
  const loose = scored.filter((s) => s.tightness > 1);

  // Determine how many tight vs loose based on difficulty
  let minTight: number;
  if (difficulty >= 5) {
    minTight = count; // all tight
  } else if (difficulty >= 4) {
    minTight = Math.max(count - 1, Math.ceil(count * 0.8)); // mostly tight
  } else if (difficulty >= 3) {
    minTight = Math.ceil(count * 0.6); // more tight than loose
  } else {
    minTight = Math.ceil(count * 0.4); // some tight
  }
  minTight = Math.min(minTight, tight.length); // can't exceed available

  // Select: spread tight cells evenly along path, then fill with loose
  const sortedTight = shuffle([...tight], rng);
  // Sort by path position for even spacing
  sortedTight.sort((a, b) => a.pathPos - b.pathPos);

  const selected: number[] = [];

  // Pick evenly-spaced tight cells
  if (sortedTight.length > 0 && minTight > 0) {
    const tStep = Math.max(1, Math.floor(sortedTight.length / minTight));
    for (let i = 0; i < sortedTight.length && selected.length < minTight; i += tStep) {
      selected.push(sortedTight[i].cellIdx);
    }
    // Fill remaining tight quota
    const remainTight = sortedTight.filter((s) => !selected.includes(s.cellIdx));
    const shuffledRemain = shuffle(remainTight.map((s) => s.cellIdx), rng);
    while (selected.length < minTight && shuffledRemain.length > 0) {
      selected.push(shuffledRemain.pop()!);
    }
  }

  // Fill remaining count with loose cells (or more tight if not enough loose)
  const remaining = [...shuffle(loose.map((s) => s.cellIdx), rng)];
  const moreTight = sortedTight
    .filter((s) => !selected.includes(s.cellIdx))
    .map((s) => s.cellIdx);
  const fill = [...remaining, ...shuffle(moreTight, rng)];

  while (selected.length < count && fill.length > 0) {
    selected.push(fill.pop()!);
  }

  return selected.slice(0, count);
}

/* ─── Constraint satisfaction check ─── */

/**
 * Check if traversing marked cell `m` with predecessor `prev` and successor `next`
 * satisfies its constraint.
 */
function checkConstraint(
  m: MarkedCell,
  prev: number,
  next: number,
  size: number,
): boolean {
  // Entry: direction the cell is entered FROM
  // prev -> m.idx: the loop goes from prev to m.idx
  // The "enter from" direction = opposite of movement direction
  const moveDir = getDir(prev, m.idx, size);
  const enterFrom = oppositeDir(moveDir);

  // Exit: direction the cell exits TOWARD
  const exitDir = getDir(m.idx, next, size);

  return enterFrom === m.constraint.enter && exitDir === m.constraint.exit;
}

/* ─── Puzzle Generation ─── */
export function generatePuzzle(seed: number, difficulty: number): KnotState {
  const rng = makeRng(seed);

  const size = difficulty <= 2 ? 5 : difficulty <= 4 ? 6 : 7;
  const markedCount = difficulty <= 1 ? 5 : difficulty <= 2 ? 6 : difficulty <= 3 ? 7 : difficulty <= 4 ? 8 : 10;
  const preRevealed = difficulty <= 1 ? 2 : difficulty <= 2 ? 1 : 0;
  // Constraint memory: how many discovered constraints survive a full reset
  // Monday: 1 persists (free hint); Friday: 0 (full amnesia)
  const constraintMemory = difficulty <= 1 ? 1 : 0;
  const parBuffer = difficulty <= 1 ? 4 : difficulty <= 2 ? 3 : difficulty <= 3 ? 2 : difficulty <= 4 ? 2 : 1;

  const minLength = Math.max(markedCount + 3, Math.floor(size * size * 0.35));
  const maxLength = Math.floor(size * size * 0.65);

  let loopPath: number[] | null = null;
  for (let tries = 0; tries < 20; tries++) {
    const tryRng = makeRng(seed + tries * 7919);
    loopPath = generateClosedLoop(size, minLength, maxLength, tryRng);
    if (loopPath && loopPath.length >= markedCount + 2) break;
    loopPath = null;
  }

  // Fallback: build a rectangular loop
  if (!loopPath) {
    loopPath = [];
    const h = Math.min(size - 1, Math.max(3, Math.floor(size * 0.7)));
    const w = Math.min(size - 1, Math.max(3, Math.floor(size * 0.7)));
    // Top edge left to right
    for (let c = 0; c < w; c++) loopPath.push(idx(0, c, size));
    // Right edge top to bottom
    for (let r = 1; r < h; r++) loopPath.push(idx(r, w - 1, size));
    // Bottom edge right to left
    for (let c = w - 2; c >= 0; c--) loopPath.push(idx(h - 1, c, size));
    // Left edge bottom to top
    for (let r = h - 2; r >= 1; r--) loopPath.push(idx(r, 0, size));
  }

  const startCell = loopPath[0];
  const markedIndices = selectMarkedCellsTight(loopPath, markedCount, size, rng, difficulty);

  // Derive constraints from the loop
  const markedCells: MarkedCell[] = markedIndices.map((cellIdx, i) => {
    const pathPos = loopPath!.indexOf(cellIdx);
    const prevCell = pathPos > 0 ? loopPath![pathPos - 1] : loopPath![loopPath!.length - 1];
    const nextCell = pathPos < loopPath!.length - 1 ? loopPath![pathPos + 1] : loopPath![0];

    const moveDir = getDir(prevCell, cellIdx, size);
    const enterFrom = oppositeDir(moveDir);
    const exitDir = getDir(cellIdx, nextCell, size);

    return {
      idx: cellIdx,
      constraint: { enter: enterFrom, exit: exitDir },
      revealed: i < preRevealed,
      satisfied: false,
    };
  });

  return {
    size,
    path: [],
    startCell,
    marked: markedCells,
    markedSet: markedIndices,
    preRevealed,
    constraintMemory,
    par: loopPath.length + parBuffer,
    closed: false,
    optimalLength: loopPath.length,
    _solutionPath: loopPath,
  };
}

/* ─── Game Logic ─── */

export function legalMoves(state: KnotState): Move[] {
  const { size, path, startCell, closed } = state;
  if (closed) return [];

  const pathSet = new Set(path);

  if (path.length === 0) {
    return [startCell];
  }

  const current = path[path.length - 1];
  const adj = getAdj(current, size);
  const moves: Move[] = [];

  for (const a of adj) {
    if (a === startCell && path.length >= 3) {
      const allVisited = state.markedSet.every((m) => pathSet.has(m));
      if (allVisited) {
        moves.push(a);
      }
    } else if (!pathSet.has(a)) {
      moves.push(a);
    }
  }

  return moves;
}

export function applyMove(state: KnotState, move: Move): KnotState {
  const newPath = [...state.path, move];
  const pathSet = new Set(newPath);

  const closed = move === state.startCell && newPath.length > 1;

  const newMarked = state.marked.map((m) => {
    if (!pathSet.has(m.idx)) return { ...m, satisfied: false };

    const pathPos = newPath.indexOf(m.idx);
    const prevCell = pathPos > 0 ? newPath[pathPos - 1] : (closed ? newPath[newPath.length - 2] : -1);
    const nextIdx = pathPos < newPath.length - 1 ? newPath[pathPos + 1] : (closed ? newPath[0] : -1);

    const revealed = m.revealed || m.idx === move;

    if (prevCell < 0 || nextIdx < 0) {
      return { ...m, revealed, satisfied: false };
    }

    const satisfied = checkConstraint(m, prevCell, nextIdx, state.size);
    return { ...m, revealed, satisfied };
  });

  return {
    ...state,
    path: newPath,
    marked: newMarked,
    closed,
  };
}

export function isGoal(state: KnotState): boolean {
  if (!state.closed) return false;

  const pathSet = new Set(state.path);
  for (const m of state.markedSet) {
    if (!pathSet.has(m)) return false;
  }

  // Check all constraints
  for (const m of state.marked) {
    const pathPos = state.path.indexOf(m.idx);
    if (pathPos < 0) return false;

    // For a closed loop, predecessor of first element is last element
    const prevCell = pathPos > 0 ? state.path[pathPos - 1] : state.path[state.path.length - 1];
    // For last element (which is startCell revisited), successor is first real step
    const nextCell = pathPos < state.path.length - 1 ? state.path[pathPos + 1] : state.path[0];

    if (!checkConstraint(m, prevCell, nextCell, state.size)) {
      return false;
    }
  }

  return true;
}

/**
 * Heuristic: lower = closer to goal
 */
export function heuristic(state: KnotState): number {
  const { size, path, startCell, marked, markedSet } = state;

  if (state.closed) {
    let violations = 0;
    for (const m of marked) {
      if (!m.satisfied) violations++;
    }
    return violations * 10;
  }

  const pathSet = new Set(path);
  const current = path.length > 0 ? path[path.length - 1] : startCell;

  let unvisitedMarked = 0;
  let minDistToUnvisited = Infinity;
  for (const mIdx of markedSet) {
    if (!pathSet.has(mIdx)) {
      unvisitedMarked++;
      const [mr, mc] = rowCol(mIdx, size);
      const [cr, cc] = rowCol(current, size);
      const dist = Math.abs(mr - cr) + Math.abs(mc - cc);
      minDistToUnvisited = Math.min(minDistToUnvisited, dist);
    }
  }
  if (minDistToUnvisited === Infinity) minDistToUnvisited = 0;

  const [sr, sc] = rowCol(startCell, size);
  const [cr, cc] = rowCol(current, size);
  const distToStart = Math.abs(sr - cr) + Math.abs(sc - cc);

  let violations = 0;
  for (const m of marked) {
    if (m.revealed && pathSet.has(m.idx) && !m.satisfied) {
      violations++;
    }
  }

  const legal = path.length > 0
    ? getAdj(current, size).filter((a) => !pathSet.has(a) || (a === startCell && path.length >= 3)).length
    : 1;
  const mobilityPenalty = legal === 0 ? 20 : 3 / legal;

  return (
    unvisitedMarked * 8 +
    minDistToUnvisited * 0.5 +
    violations * 5 +
    (unvisitedMarked === 0 ? distToStart * 2 : distToStart * 0.2) +
    mobilityPenalty
  );
}

/* ─── Solver ─── */

export function solve(
  puzzle: KnotState,
  skillLevel: 1 | 2 | 3 | 4 | 5,
): Solution | null {
  switch (skillLevel) {
    case 1:
      return solveRandom(puzzle, 500);
    case 2:
      return solveGreedy(puzzle);
    case 3:
      return solveGreedyLookahead(puzzle);
    case 4:
      return solveDFS(puzzle, 200000);
    case 5:
      return solveExact(puzzle);
  }
}

/** Level 5: Use stored solution path (exact) and also try DFS */
function solveExact(puzzle: KnotState): Solution | null {
  // First: use the stored solution path if available
  if (puzzle._solutionPath && puzzle._solutionPath.length > 0) {
    // Verify the solution path works
    let state: KnotState = {
      ...puzzle,
      path: [],
      closed: false,
      marked: puzzle.marked.map((m) => ({ ...m, satisfied: false })),
    };

    const moves = [...puzzle._solutionPath];
    for (const move of moves) {
      state = applyMove(state, move);
    }
    // Close the loop
    state = applyMove(state, puzzle.startCell);
    if (isGoal(state)) {
      return { moves: [...moves, puzzle.startCell], steps: moves.length + 1 };
    }

    // Try without closing move (maybe it's already in the path)
    state = {
      ...puzzle,
      path: [],
      closed: false,
      marked: puzzle.marked.map((m) => ({ ...m, satisfied: false })),
    };
    for (const move of moves) {
      state = applyMove(state, move);
    }
    if (isGoal(state)) {
      return { moves: [...moves], steps: moves.length };
    }
  }

  // Fallback: DFS with large budget
  return solveDFS(puzzle, 5000000);
}

/** Level 1: Random valid moves */
function solveRandom(puzzle: KnotState, attempts: number): Solution | null {
  let bestSolution: Solution | null = null;

  for (let attempt = 0; attempt < attempts; attempt++) {
    let state: KnotState = {
      ...puzzle,
      path: [],
      closed: false,
      marked: puzzle.marked.map((m) => ({ ...m, satisfied: false })),
    };
    const moves: Move[] = [];

    const maxSteps = puzzle.size * puzzle.size + 5;
    for (let step = 0; step < maxSteps; step++) {
      const legal = legalMoves(state);
      if (legal.length === 0) break;
      const move = legal[Math.floor(Math.random() * legal.length)];
      state = applyMove(state, move);
      moves.push(move);
      if (isGoal(state)) {
        if (!bestSolution || moves.length < bestSolution.steps) {
          bestSolution = { moves: [...moves], steps: moves.length };
        }
        break;
      }
    }
  }
  return bestSolution;
}

/** Level 2: Greedy */
function solveGreedy(puzzle: KnotState): Solution | null {
  let bestSolution: Solution | null = null;

  for (let trial = 0; trial < 50; trial++) {
    let state: KnotState = {
      ...puzzle,
      path: [],
      closed: false,
      marked: puzzle.marked.map((m) => ({ ...m, satisfied: false })),
    };
    const moves: Move[] = [];

    const maxSteps = puzzle.size * puzzle.size + 5;
    for (let step = 0; step < maxSteps; step++) {
      const legal = legalMoves(state);
      if (legal.length === 0) break;

      let bestMove = legal[0];
      let bestH = Infinity;
      for (const m of legal) {
        const h = heuristic(applyMove(state, m));
        if (h < bestH || (h === bestH && Math.random() < 0.3)) {
          bestH = h;
          bestMove = m;
        }
      }

      if (trial > 0 && Math.random() < 0.2 && legal.length > 1) {
        bestMove = legal[Math.floor(Math.random() * legal.length)];
      }

      state = applyMove(state, bestMove);
      moves.push(bestMove);

      if (isGoal(state)) {
        if (!bestSolution || moves.length < bestSolution.steps) {
          bestSolution = { moves: [...moves], steps: moves.length };
        }
        break;
      }
    }
  }
  return bestSolution;
}

/** Level 3: Greedy + 1-step lookahead */
function solveGreedyLookahead(puzzle: KnotState): Solution | null {
  let bestSolution: Solution | null = null;

  for (let trial = 0; trial < 60; trial++) {
    let state: KnotState = {
      ...puzzle,
      path: [],
      closed: false,
      marked: puzzle.marked.map((m) => ({ ...m, satisfied: false })),
    };
    const moves: Move[] = [];

    const maxSteps = puzzle.size * puzzle.size + 5;
    for (let step = 0; step < maxSteps; step++) {
      const legal = legalMoves(state);
      if (legal.length === 0) break;

      let bestMove = legal[0];
      let bestScore = Infinity;

      for (const m of legal) {
        const next = applyMove(state, m);

        if (isGoal(next)) {
          bestMove = m;
          bestScore = -Infinity;
          break;
        }

        let score = heuristic(next);

        const nextLegal = legalMoves(next);
        if (nextLegal.length === 0) {
          score += 1000;
        } else {
          let bestNext = Infinity;
          for (const m2 of nextLegal) {
            const s2 = applyMove(next, m2);
            if (isGoal(s2)) { bestNext = -100; break; }
            bestNext = Math.min(bestNext, heuristic(s2));
          }
          score = (score + bestNext) / 2;
        }

        if (score < bestScore || (score === bestScore && Math.random() < 0.3)) {
          bestScore = score;
          bestMove = m;
        }
      }

      if (trial > 10 && Math.random() < 0.1 && legal.length > 1) {
        bestMove = legal[Math.floor(Math.random() * legal.length)];
      }

      state = applyMove(state, bestMove);
      moves.push(bestMove);

      if (isGoal(state)) {
        if (!bestSolution || moves.length < bestSolution.steps) {
          bestSolution = { moves: [...moves], steps: moves.length };
        }
        break;
      }
    }
  }
  return bestSolution;
}

/** Level 4: DFS with backtracking */
function solveDFS(puzzle: KnotState, maxNodes: number): Solution | null {
  let nodesExplored = 0;
  let bestSolution: Solution | null = null;
  let bestLength = puzzle.size * puzzle.size + 5;

  function dfs(state: KnotState, moves: Move[]): void {
    if (nodesExplored >= maxNodes) return;
    nodesExplored++;

    if (isGoal(state)) {
      if (moves.length < bestLength) {
        bestLength = moves.length;
        bestSolution = { moves: [...moves], steps: moves.length };
      }
      return;
    }

    if (moves.length >= bestLength) return;

    const legal = legalMoves(state);
    if (legal.length === 0) return;

    // Sort by heuristic
    const scored = legal.map((m) => ({
      move: m,
      h: heuristic(applyMove(state, m)),
    }));
    scored.sort((a, b) => a.h - b.h);

    for (const { move } of scored) {
      const next = applyMove(state, move);
      moves.push(move);
      dfs(next, moves);
      moves.pop();
      if (nodesExplored >= maxNodes) return;
    }
  }

  const initState: KnotState = {
    ...puzzle,
    path: [],
    closed: false,
    marked: puzzle.marked.map((m) => ({ ...m, satisfied: false })),
  };

  dfs(initState, []);
  return bestSolution;
}
