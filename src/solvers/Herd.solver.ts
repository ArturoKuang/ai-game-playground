/**
 * Herd Solver
 *
 * Rules: Issue directional commands to move all animals of one color
 * simultaneously toward their matching pen. Animals block each other
 * on collision. Get every animal home within par moves.
 *
 * A move = (color, direction). All animals of that color slide one cell
 * in the given direction, unless blocked by another animal or a wall.
 * Animals that have reached their matching pen are LOCKED and no longer
 * respond to movement commands.
 *
 * Goal: every animal occupies its pen (target position).
 */

export type Pos = { r: number; c: number };

export type Animal = {
  color: number; // 0-based color index
  pos: Pos;
  locked?: boolean; // true when sitting on matching pen
};

export type Pen = {
  color: number;
  pos: Pos;
};

export type HerdState = {
  gridSize: number;
  animals: Animal[];
  pens: Pen[];
  walls?: Pos[]; // impassable cells (Wed-Fri puzzles)
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
    animals: state.animals.map((a) => ({
      color: a.color,
      pos: { ...a.pos },
      locked: a.locked,
    })),
    pens: state.pens,
    walls: state.walls,
  };
}

function stateKey(state: HerdState): string {
  // Sort animals by color then position for canonical key
  // Walls are static so don't need to be in the key (same puzzle = same walls)
  const sorted = [...state.animals].sort((a, b) =>
    a.color !== b.color
      ? a.color - b.color
      : a.pos.r !== b.pos.r
        ? a.pos.r - b.pos.r
        : a.pos.c - b.pos.c,
  );
  return sorted.map((a) => `${a.color}:${a.pos.r},${a.pos.c}${a.locked ? 'L' : ''}`).join('|');
}

/** Update locked flags on all animals based on pen positions */
function updateLocks(state: HerdState): void {
  for (const animal of state.animals) {
    animal.locked = state.pens.some(
      (p) => p.color === animal.color && p.pos.r === animal.pos.r && p.pos.c === animal.pos.c,
    );
  }
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
  // Locked animals contribute 0 distance
  let total = 0;
  const colorGroups = new Map<number, { animals: Pos[]; pens: Pos[] }>();
  for (const a of state.animals) {
    if (a.locked) continue; // already home
    if (!colorGroups.has(a.color)) colorGroups.set(a.color, { animals: [], pens: [] });
    colorGroups.get(a.color)!.animals.push(a.pos);
  }
  for (const p of state.pens) {
    // Only count pens that don't already have a locked animal on them
    const hasLocked = state.animals.some(
      (a) => a.locked && a.color === p.color && a.pos.r === p.pos.r && a.pos.c === p.pos.c,
    );
    if (hasLocked) continue;
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
  for (const a of state.animals) {
    if (!a.locked) colors.add(a.color); // only colors with unlocked animals
  }
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

/**
 * Apply a move. Locked animals (on their matching pen) do NOT move
 * and act as obstacles.
 * Returns { state, moved } where moved indicates if any animal actually moved.
 */
export function applyMoveWithInfo(state: HerdState, move: Move): { state: HerdState; moved: boolean } {
  const next = cloneState(state);
  const [dr, dc] = DIR_DELTA[move.dir];

  // Build occupancy grid (all animals including locked ones)
  const occupied = new Set<string>();
  for (const a of next.animals) {
    occupied.add(`${a.pos.r},${a.pos.c}`);
  }

  // Build wall set for fast lookup
  const wallSet = new Set<string>();
  if (next.walls) {
    for (const w of next.walls) wallSet.add(`${w.r},${w.c}`);
  }

  // Get UNLOCKED animals of the given color
  const movers = next.animals.filter((a) => a.color === move.color && !a.locked);
  // Sort so we process in direction order (front-first to avoid self-collision)
  movers.sort((a, b) => {
    if (dr !== 0) return dr > 0 ? b.pos.r - a.pos.r : a.pos.r - b.pos.r;
    if (dc !== 0) return dc > 0 ? b.pos.c - a.pos.c : a.pos.c - b.pos.c;
    return 0;
  });

  let anyMoved = false;

  // Move each animal one step (blocked by grid edges, walls, or other animals)
  for (const animal of movers) {
    const newR = animal.pos.r + dr;
    const newC = animal.pos.c + dc;
    // Check grid boundary
    if (newR < 0 || newR >= state.gridSize || newC < 0 || newC >= state.gridSize) continue;
    const key = `${newR},${newC}`;
    // Check wall
    if (wallSet.has(key)) continue;
    // Check occupancy
    occupied.delete(`${animal.pos.r},${animal.pos.c}`);
    if (occupied.has(key)) {
      occupied.add(`${animal.pos.r},${animal.pos.c}`);
      continue;
    }
    animal.pos.r = newR;
    animal.pos.c = newC;
    occupied.add(key);
    anyMoved = true;
  }

  // Update lock status after movement
  updateLocks(next);

  return { state: next, moved: anyMoved };
}

export function applyMove(state: HerdState, move: Move): HerdState {
  return applyMoveWithInfo(state, move).state;
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
 *
 * With lock-in-pen mechanic, scrambling from goal no longer works
 * (locked animals wouldn't move). Instead we:
 * 1. Place pens in opposing corners
 * 2. Randomly place animals (not on their pens)
 * 3. Solve with A* to verify solvability
 * 4. Pick the best puzzle by CI count and target depth
 */
/**
 * Place 2-3 internal walls for Wed-Fri puzzles.
 * Walls are placed on empty cells to create bottlenecks that force detour moves.
 *
 * Strategy: use predefined wall patterns that create effective corridors.
 * These patterns are designed to bisect the grid, forcing animals to
 * go around them (classic Sokoban detour).
 */
function placeWalls(
  rng: () => number,
  gridSize: number,
  difficulty: number,
  penPositions: Set<string>,
): Pos[] {
  if (difficulty <= 2) return []; // Mon-Tue: no walls

  // Predefined wall patterns that create effective bottlenecks on 5x5 grid.
  // Each pattern creates a barrier that forces detours.
  const patterns2: Pos[][] = [
    // Horizontal barrier in middle
    [{ r: 2, c: 1 }, { r: 2, c: 2 }],
    [{ r: 2, c: 2 }, { r: 2, c: 3 }],
    // Vertical barrier in middle
    [{ r: 1, c: 2 }, { r: 2, c: 2 }],
    [{ r: 2, c: 2 }, { r: 3, c: 2 }],
    // L-shaped corners
    [{ r: 2, c: 2 }, { r: 2, c: 3 }],
    [{ r: 2, c: 1 }, { r: 3, c: 1 }],
    [{ r: 1, c: 3 }, { r: 2, c: 3 }],
    // Diagonal barrier
    [{ r: 1, c: 2 }, { r: 2, c: 3 }],
    [{ r: 2, c: 1 }, { r: 3, c: 2 }],
    [{ r: 1, c: 1 }, { r: 2, c: 2 }],
    [{ r: 2, c: 2 }, { r: 3, c: 3 }],
  ];

  const patterns3: Pos[][] = [
    // Horizontal wall spanning middle
    [{ r: 2, c: 1 }, { r: 2, c: 2 }, { r: 2, c: 3 }],
    // Vertical wall spanning middle
    [{ r: 1, c: 2 }, { r: 2, c: 2 }, { r: 3, c: 2 }],
    // L-shape barriers
    [{ r: 2, c: 2 }, { r: 2, c: 3 }, { r: 3, c: 2 }],
    [{ r: 2, c: 1 }, { r: 2, c: 2 }, { r: 1, c: 2 }],
    [{ r: 1, c: 2 }, { r: 2, c: 2 }, { r: 2, c: 3 }],
    [{ r: 2, c: 2 }, { r: 3, c: 2 }, { r: 2, c: 1 }],
    // T-shape
    [{ r: 2, c: 1 }, { r: 2, c: 2 }, { r: 3, c: 2 }],
    [{ r: 1, c: 2 }, { r: 2, c: 2 }, { r: 2, c: 1 }],
    // Staggered
    [{ r: 1, c: 1 }, { r: 2, c: 2 }, { r: 3, c: 3 }],
    [{ r: 1, c: 3 }, { r: 2, c: 2 }, { r: 3, c: 1 }],
    // Off-center barriers
    [{ r: 1, c: 1 }, { r: 1, c: 2 }, { r: 2, c: 2 }],
    [{ r: 3, c: 2 }, { r: 3, c: 3 }, { r: 2, c: 3 }],
  ];

  const numWalls = difficulty <= 3 ? 2 : 3;
  const patterns = numWalls === 2 ? patterns2 : patterns3;

  // Filter patterns that don't overlap with pen positions
  const valid = patterns.filter(p =>
    p.every(w => !penPositions.has(`${w.r},${w.c}`))
  );

  if (valid.length === 0) {
    // Fallback: random interior walls
    const candidates: Pos[] = [];
    for (let r = 1; r < gridSize - 1; r++) {
      for (let c = 1; c < gridSize - 1; c++) {
        if (!penPositions.has(`${r},${c}`)) candidates.push({ r, c });
      }
    }
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    return candidates.slice(0, numWalls);
  }

  // Pick a random valid pattern
  const idx = Math.floor(rng() * valid.length);
  return valid[idx].map(w => ({ ...w }));
}

/**
 * Place walls AFTER animals are placed, specifically on cells that lie
 * on the Manhattan path between an animal and its pen. This guarantees
 * the wall forces a detour, which creates counterintuitive moves.
 */
function placeWallsStrategic(
  rng: () => number,
  gridSize: number,
  difficulty: number,
  animals: Animal[],
  pens: Pen[],
  occupiedPos: Set<string>,
  penPosSet: Set<string>,
): Pos[] {
  if (difficulty <= 2) return []; // Mon-Tue: no walls

  const numWalls = difficulty <= 3 ? 2 : 3;

  // Find cells on Manhattan paths between animals and their closest pens
  const pathCells = new Map<string, number>(); // key -> count of paths through it
  for (const animal of animals) {
    const ownPens = pens.filter(p => p.color === animal.color);
    for (const pen of ownPens) {
      // Enumerate cells in the Manhattan rectangle between animal and pen
      const minR = Math.min(animal.pos.r, pen.pos.r);
      const maxR = Math.max(animal.pos.r, pen.pos.r);
      const minC = Math.min(animal.pos.c, pen.pos.c);
      const maxC = Math.max(animal.pos.c, pen.pos.c);
      for (let r = minR; r <= maxR; r++) {
        for (let c = minC; c <= maxC; c++) {
          const key = `${r},${c}`;
          // Don't place walls on occupied cells, pens, or edges
          if (occupiedPos.has(key)) continue;
          if (penPosSet.has(key)) continue;
          if (r === animal.pos.r && c === animal.pos.c) continue;
          // Prefer interior cells
          if (r === 0 || r === gridSize - 1 || c === 0 || c === gridSize - 1) continue;
          pathCells.set(key, (pathCells.get(key) || 0) + 1);
        }
      }
    }
  }

  // Sort by how many animal-pen paths they block (more = more impactful)
  const candidates = Array.from(pathCells.entries())
    .sort((a, b) => b[1] - a[1]);

  // Shuffle within score tiers for variety
  const walls: Pos[] = [];
  const usedRows = new Set<number>();
  const usedCols = new Set<number>();

  // Take from top candidates with some randomness
  const pool = candidates.slice(0, Math.min(12, candidates.length));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  // Re-sort so higher-count cells still preferred
  pool.sort((a, b) => b[1] - a[1]);

  for (const [key] of pool) {
    if (walls.length >= numWalls) break;
    const [rStr, cStr] = key.split(',');
    const r = parseInt(rStr);
    const c = parseInt(cStr);
    // Avoid clustering all walls in the same row/col (spread them out)
    if (walls.length > 0 && usedRows.has(r) && usedCols.has(c)) continue;
    walls.push({ r, c });
    usedRows.add(r);
    usedCols.add(c);
  }

  // If we couldn't find enough strategic walls, fall back to pattern-based
  if (walls.length < numWalls) {
    const patternWalls = placeWalls(rng, gridSize, difficulty, penPosSet);
    for (const w of patternWalls) {
      if (walls.length >= numWalls) break;
      const key = `${w.r},${w.c}`;
      if (!occupiedPos.has(key) && !penPosSet.has(key)) {
        walls.push(w);
      }
    }
  }

  return walls;
}

export function generatePuzzle(seed: number, difficulty: number): HerdState {
  const gridSize = 5;

  // Difficulty scaling
  const numColors = difficulty <= 2 ? 2 : 3;
  const animalsPerColor = 2;
  // Target depth: Mon=4-8, Tue=5-9, Wed=7-14, Thu=8-14, Fri=10-16
  const minDepth = difficulty <= 1 ? 4 : difficulty <= 2 ? 5 : difficulty <= 3 ? 7 : difficulty <= 4 ? 8 : 10;
  const maxDepth = difficulty <= 1 ? 8 : difficulty <= 2 ? 9 : difficulty <= 3 ? 14 : difficulty <= 4 ? 14 : 16;

  let bestState: HerdState | null = null;
  let bestCI = -1;
  let bestScore = -Infinity;

  const maxAttempts = difficulty <= 2 ? 200 : 120;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const rng = seededRng(seed + difficulty * 9973 + attempt * 7919);
    const pens = placePensOpposing(rng, gridSize, numColors, animalsPerColor, difficulty);

    const penPositions = new Map<string, number>();
    const penPosSet = new Set<string>();
    for (const p of pens) {
      penPositions.set(`${p.pos.r},${p.pos.c}`, p.color);
      penPosSet.add(`${p.pos.r},${p.pos.c}`);
    }

    // Collect all grid cells, shuffle them (walls placed AFTER animals for strategic blocking)
    const allCells: Pos[] = [];
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        allCells.push({ r, c });
      }
    }
    for (let i = allCells.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [allCells[i], allCells[j]] = [allCells[j], allCells[i]];
    }

    // Place animals first (before walls)
    const animals: Animal[] = [];
    const usedPos = new Set<string>();

    for (let color = 0; color < numColors; color++) {
      let placed = 0;
      const ownPens = pens.filter((p) => p.color === color);

      const scored: { pos: Pos; score: number }[] = [];
      for (const pos of allCells) {
        const key = `${pos.r},${pos.c}`;
        if (usedPos.has(key)) continue;
        if (penPositions.get(key) === color) continue;

        const distOwn = Math.min(...ownPens.map((p) =>
          Math.abs(pos.r - p.pos.r) + Math.abs(pos.c - p.pos.c)));
        const otherPenBonus = penPositions.has(key) && penPositions.get(key) !== color ? 5 : 0;
        const score = distOwn + otherPenBonus;
        scored.push({ pos, score });
      }

      scored.sort((a, b) => b.score - a.score);
      const topN = Math.min(8, scored.length);
      const candidates = scored.slice(0, topN);
      for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
      }

      for (const { pos } of candidates) {
        const key = `${pos.r},${pos.c}`;
        if (usedPos.has(key)) continue;
        animals.push({ color, pos: { ...pos }, locked: false });
        usedPos.add(key);
        placed++;
        if (placed >= animalsPerColor) break;
      }

      if (placed < animalsPerColor) {
        for (const pos of allCells) {
          if (placed >= animalsPerColor) break;
          const key = `${pos.r},${pos.c}`;
          if (usedPos.has(key) || penPositions.get(key) === color) continue;
          animals.push({ color, pos: { ...pos }, locked: false });
          usedPos.add(key);
          placed++;
        }
      }
    }

    // Now place walls STRATEGICALLY: on cells that lie on Manhattan paths
    // between animals and their pens. This guarantees the wall forces a detour.
    const wallRng = seededRng(seed + difficulty * 3571 + attempt * 1213);
    const walls = placeWallsStrategic(wallRng, gridSize, difficulty, animals, pens, usedPos, penPosSet);
    const wallSet = new Set<string>();
    for (const w of walls) wallSet.add(`${w.r},${w.c}`);

    const state: HerdState = { gridSize, animals, pens, walls: walls.length > 0 ? walls : undefined };
    updateLocks(state);

    if (isGoal(state)) continue;

    // Solve with A*
    const genLimit = difficulty <= 2 ? 20000 : 50000;
    const sol = solveAStar(state, genLimit);
    if (!sol) continue;
    if (sol.steps < minDepth || sol.steps > maxDepth) continue;

    // Count CI moves
    const ci = countCI(state, sol);

    // Score: CI moves weighted heavily, then closeness to target depth
    const depthTarget = (minDepth + maxDepth) / 2;
    const depthPenalty = Math.abs(sol.steps - depthTarget);
    const score = ci * 20 - depthPenalty;

    if (score > bestScore) {
      bestCI = ci;
      bestState = state;
      bestScore = score;
    }

    // Early exit if we found a puzzle with CI >= 2 in range
    if (ci >= 2 && sol.steps >= minDepth && sol.steps <= maxDepth) break;
  }

  if (bestState) return bestState;

  // Last resort fallback: scramble from goal
  const rng = seededRng(seed + difficulty * 9973 + 999);
  const pens = placePensOpposing(rng, gridSize, numColors, animalsPerColor, difficulty);
  const penPosSet = new Set<string>();
  for (const p of pens) penPosSet.add(`${p.pos.r},${p.pos.c}`);
  const goalAnimals: Animal[] = pens.map((p) => ({
    color: p.color,
    pos: { ...p.pos },
    locked: false,
  }));
  // For fallback, use pattern-based walls
  const wallRng = seededRng(seed + difficulty * 3571 + 999);
  const walls = placeWalls(wallRng, gridSize, difficulty, penPosSet);
  let state: HerdState = { gridSize, animals: goalAnimals, pens, walls: walls.length > 0 ? walls : undefined };
  const colors = Array.from(new Set(pens.map((p) => p.color)));
  for (let i = 0; i < 30 + difficulty * 10; i++) {
    const color = colors[Math.floor(rng() * colors.length)];
    const dir = DIRECTIONS[Math.floor(rng() * 4)];
    const next = applyMoveRaw(state, { color, dir });
    if (stateKey(next) !== stateKey(state)) state = next;
  }
  updateLocks(state);
  if (isGoal(state)) {
    state = applyMoveRaw(state, { color: colors[0], dir: 'N' });
    updateLocks(state);
  }
  return state;
}

/** Raw movement without lock logic (for scrambling from goal) */
function applyMoveRaw(state: HerdState, move: Move): HerdState {
  const next = cloneState(state);
  const [dr, dc] = DIR_DELTA[move.dir];
  const occupied = new Set<string>();
  for (const a of next.animals) occupied.add(`${a.pos.r},${a.pos.c}`);
  const wallSet = new Set<string>();
  if (next.walls) {
    for (const w of next.walls) wallSet.add(`${w.r},${w.c}`);
  }
  const movers = next.animals.filter((a) => a.color === move.color);
  movers.sort((a, b) => {
    if (dr !== 0) return dr > 0 ? b.pos.r - a.pos.r : a.pos.r - b.pos.r;
    if (dc !== 0) return dc > 0 ? b.pos.c - a.pos.c : a.pos.c - b.pos.c;
    return 0;
  });
  for (const animal of movers) {
    const newR = animal.pos.r + dr;
    const newC = animal.pos.c + dc;
    if (newR < 0 || newR >= state.gridSize || newC < 0 || newC >= state.gridSize) continue;
    const key = `${newR},${newC}`;
    if (wallSet.has(key)) continue;
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
 * Place pens to create interesting puzzles.
 *
 * For CI moves to occur, pens of the SAME color should be separated
 * enough that animals can't reach all pens via the same sequence of moves.
 * This forces "move one animal into pen, but the other moves away" situations.
 *
 * Different colors' pens should overlap in territory to create inter-color blocking.
 */
function placePensOpposing(
  rng: () => number,
  gridSize: number,
  numColors: number,
  animalsPerColor: number,
  difficulty: number = 3,
): Pen[] {
  const pens: Pen[] = [];
  const used = new Set<string>();

  if (numColors === 2 && animalsPerColor === 2) {
    // 2 colors, 2 pens each = 4 pens
    // Easy days: pens close together but same-color pens separated by 2-3 cells
    // Hard days: pens further apart, same-color pens on opposite sides

    // Separation between same-color pens scales with difficulty
    const sep = Math.min(gridSize - 1, 2 + Math.floor(rng() * (difficulty <= 2 ? 2 : 3)));

    // Generate pen layouts based on difficulty
    const layouts: Pos[][] = [];

    if (difficulty <= 2) {
      // Easy: pens in adjacent corners/edges, same-color separation = 2-3
      layouts.push(
        // Color 0: top-left region; Color 1: top-right region (close, manageable)
        [{ r: 0, c: 0 }, { r: 2, c: 0 }, { r: 0, c: gridSize - 1 }, { r: 2, c: gridSize - 1 }],
        // Color 0: left column spread; Color 1: right column spread
        [{ r: 0, c: 0 }, { r: 3, c: 0 }, { r: 0, c: gridSize - 1 }, { r: 3, c: gridSize - 1 }],
        // Color 0: top row spread; Color 1: bottom row spread
        [{ r: 0, c: 0 }, { r: 0, c: 3 }, { r: gridSize - 1, c: 0 }, { r: gridSize - 1, c: 3 }],
        // Color 0: center-ish; Color 1: edges
        [{ r: 1, c: 1 }, { r: 3, c: 1 }, { r: 1, c: 3 }, { r: 3, c: 3 }],
      );
    } else {
      // Hard: opposing corner placement for maximum complexity
      layouts.push(
        [{ r: 0, c: 0 }, { r: gridSize - 1, c: gridSize - 1 }, { r: 0, c: gridSize - 1 }, { r: gridSize - 1, c: 0 }],
        [{ r: 0, c: 0 }, { r: 0, c: gridSize - 1 }, { r: gridSize - 1, c: 0 }, { r: gridSize - 1, c: gridSize - 1 }],
        [{ r: 0, c: 2 }, { r: gridSize - 1, c: 2 }, { r: 2, c: 0 }, { r: 2, c: gridSize - 1 }],
      );
    }

    const layoutIdx = Math.floor(rng() * layouts.length);
    const layout = layouts[layoutIdx];

    // Add slight random offset to avoid identical puzzles
    for (let i = 0; i < 4; i++) {
      const color = i < animalsPerColor ? 0 : 1;
      let pos = layout[i];
      // Try small offsets
      const offsets = [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 1, c: 0 }, { r: 0, c: -1 }, { r: -1, c: 0 }];
      for (let j = offsets.length - 1; j > 0; j--) {
        const k = Math.floor(rng() * (j + 1));
        [offsets[j], offsets[k]] = [offsets[k], offsets[j]];
      }
      for (const off of offsets) {
        const nr = pos.r + off.r;
        const nc = pos.c + off.c;
        if (nr >= 0 && nr < gridSize && nc >= 0 && nc < gridSize) {
          const key = `${nr},${nc}`;
          if (!used.has(key)) {
            pens.push({ color, pos: { r: nr, c: nc } });
            used.add(key);
            break;
          }
        }
      }
    }
  } else {
    // 3+ colors: use opposing corner anchors (original approach)
    const anchors: Pos[] = [
      { r: 0, c: 0 },
      { r: gridSize - 1, c: gridSize - 1 },
      { r: 0, c: gridSize - 1 },
      { r: gridSize - 1, c: 0 },
    ];

    for (let color = 0; color < numColors; color++) {
      const anchor = anchors[color % anchors.length];
      const candidates: Pos[] = [];
      for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
          const d = Math.abs(r - anchor.r) + Math.abs(c - anchor.c);
          if (d <= 2) candidates.push({ r, c });
        }
      }
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
    if (legal.length === 0) return null;
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
