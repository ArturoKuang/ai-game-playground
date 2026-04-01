/**
 * Split Solver
 *
 * Draw lines on grid edges to partition a colored grid into regions.
 * Each region must contain exactly one cell of every color.
 *
 * For a 5x5 grid with 5 colors: 5 regions of 5 cells each.
 * For a 6x6 grid with 6 colors: 6 regions of 6 cells each.
 *
 * State: grid of colors + set of active edges (boundary segments).
 * Edges are between adjacent cells (horizontal or vertical).
 */

/* ─── Types ─── */

export type Edge = {
  /** Encoded as "r1,c1-r2,c2" where (r1,c1) < (r2,c2) lexicographically */
  id: string;
  r1: number;
  c1: number;
  r2: number;
  c2: number;
  orientation: 'h' | 'v'; // horizontal = between vertically adjacent cells, vertical = between horizontally adjacent cells
};

export type SplitState = {
  size: number;
  colors: number; // number of distinct colors
  grid: number[][]; // grid[r][c] = color index 0..colors-1
  edges: Set<string>; // set of active edge IDs
};

export type Move = {
  edgeId: string;
  toggle: 'add' | 'remove';
};

export type Solution = {
  moves: Move[];
  steps: number;
  edges: Set<string>;
};

/* ─── Edge Utilities ─── */

export function edgeId(r1: number, c1: number, r2: number, c2: number): string {
  // Canonical order: smaller (r,c) first
  if (r1 < r2 || (r1 === r2 && c1 < c2)) return `${r1},${c1}-${r2},${c2}`;
  return `${r2},${c2}-${r1},${c1}`;
}

export function allEdges(size: number): Edge[] {
  const edges: Edge[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      // Right neighbor
      if (c + 1 < size) {
        edges.push({
          id: edgeId(r, c, r, c + 1),
          r1: r, c1: c, r2: r, c2: c + 1,
          orientation: 'v',
        });
      }
      // Bottom neighbor
      if (r + 1 < size) {
        edges.push({
          id: edgeId(r, c, r + 1, c),
          r1: r, c1: c, r2: r + 1, c2: c,
          orientation: 'h',
        });
      }
    }
  }
  return edges;
}

/* ─── Region Detection ─── */

/**
 * Find connected regions given the grid and active edges.
 * Two adjacent cells are in the same region if there is NO edge between them.
 */
export function findRegions(state: SplitState): number[][] {
  const { size, edges } = state;
  const visited = Array.from({ length: size }, () => Array(size).fill(false));
  const regions: number[][] = [];

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (visited[r][c]) continue;
      // BFS from this cell
      const region: number[] = [];
      const queue: [number, number][] = [[r, c]];
      visited[r][c] = true;
      while (queue.length > 0) {
        const [cr, cc] = queue.shift()!;
        region.push(cr * size + cc);
        // Check 4 neighbors
        const neighbors: [number, number][] = [
          [cr - 1, cc], [cr + 1, cc], [cr, cc - 1], [cr, cc + 1],
        ];
        for (const [nr, nc] of neighbors) {
          if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
          if (visited[nr][nc]) continue;
          // Check if there's an edge between (cr,cc) and (nr,nc)
          const eid = edgeId(cr, cc, nr, nc);
          if (edges.has(eid)) continue; // blocked by edge
          visited[nr][nc] = true;
          queue.push([nr, nc]);
        }
      }
      regions.push(region);
    }
  }
  return regions;
}

/* ─── Goal Check ─── */

export function isGoal(state: SplitState): boolean {
  const { size, colors, grid } = state;
  const regions = findRegions(state);
  const expectedRegionSize = size * size / colors;

  // Must have exactly `colors` regions
  if (regions.length !== colors) return false;

  for (const region of regions) {
    // Each region must have exactly expectedRegionSize cells
    if (region.length !== expectedRegionSize) return false;
    // Each region must contain exactly one of each color
    const colorCount = new Array(colors).fill(0);
    for (const cellIdx of region) {
      const r = Math.floor(cellIdx / size);
      const c = cellIdx % size;
      colorCount[grid[r][c]]++;
    }
    for (let i = 0; i < colors; i++) {
      if (colorCount[i] !== 1) return false;
    }
  }
  return true;
}

/* ─── Heuristic ─── */

/**
 * How far from goal: measure quality of current partition.
 * Lower = closer to goal. 0 = solved.
 *
 * Penalties:
 * - Wrong number of regions (should be exactly `colors`)
 * - Region size != expected (too big or too small)
 * - Duplicate colors in a region
 * - Missing colors in a region (colors not yet represented)
 *
 * This heuristic penalizes BOTH excess AND missing colors so that splitting
 * a "complete" region into two incomplete halves increases the heuristic
 * (counterintuitive move).
 */
export function heuristic(state: SplitState): number {
  const { size, colors, grid } = state;
  const regions = findRegions(state);
  const expectedRegionSize = size * size / colors;

  let score = 0;

  // Penalty for wrong number of regions
  score += Math.abs(regions.length - colors) * 3;

  for (const region of regions) {
    // Size violation
    const sizeDiff = Math.abs(region.length - expectedRegionSize);
    score += sizeDiff;

    // Color composition
    const colorCount = new Array(colors).fill(0);
    for (const cellIdx of region) {
      const r = Math.floor(cellIdx / size);
      const c = cellIdx % size;
      colorCount[grid[r][c]]++;
    }

    // Duplicates: each extra copy is bad
    for (let i = 0; i < colors; i++) {
      if (colorCount[i] > 1) score += (colorCount[i] - 1) * 2;
    }

    // Missing colors: each absent color is bad (but only for complete-sized regions)
    // This makes splitting a "good" region temporarily increase the heuristic
    if (region.length >= expectedRegionSize) {
      for (let i = 0; i < colors; i++) {
        if (colorCount[i] === 0) score += 1;
      }
    }
  }
  return score;
}

/* ─── Legal Moves ─── */

export function legalMoves(state: SplitState): Move[] {
  const { size, edges } = state;
  const moves: Move[] = [];
  const allE = allEdges(size);
  for (const e of allE) {
    if (edges.has(e.id)) {
      moves.push({ edgeId: e.id, toggle: 'remove' });
    } else {
      moves.push({ edgeId: e.id, toggle: 'add' });
    }
  }
  return moves;
}

/* ─── Apply Move ─── */

export function applyMove(state: SplitState, move: Move): SplitState {
  const newEdges = new Set(state.edges);
  if (move.toggle === 'add') {
    newEdges.add(move.edgeId);
  } else {
    newEdges.delete(move.edgeId);
  }
  return { ...state, edges: newEdges };
}

/* ─── Puzzle Generation ─── */

/**
 * Generate a puzzle by creating a valid partition first, then extracting the grid.
 * This guarantees solvability.
 */
export function generatePuzzle(seed: number, difficulty: number): SplitState {
  let s = seed;
  function rng() {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Monday: 5x5 with 5 colors; Friday: 6x6 with 6 colors
  const size = difficulty >= 4 ? 6 : 5;
  const colors = size;
  const regionSize = size; // each region has `size` cells
  const totalCells = size * size;

  // Step 1: Generate a random valid partition of the grid into `colors` contiguous regions
  // each of size `regionSize`.
  let grid: number[][] | null = null;
  let solutionEdges: Set<string> | null = null;

  for (let attempt = 0; attempt < 50; attempt++) {
    const result = generateValidPartition(size, colors, regionSize, rng);
    if (result) {
      grid = result.grid;
      solutionEdges = result.edges;
      break;
    }
  }

  if (!grid || !solutionEdges) {
    // Fallback: simple stripe partition
    grid = Array.from({ length: size }, (_, r) =>
      Array.from({ length: size }, (_, c) => c % colors),
    );
    solutionEdges = new Set<string>();
  }

  // Step 2: Add more same-color adjacencies based on difficulty
  // (handled by the generator already since we shuffle colors within regions)

  return {
    size,
    colors,
    grid,
    edges: new Set<string>(), // start with no edges drawn
  };
}

/**
 * Generate a valid partition by growing regions from random seeds.
 * Returns the grid coloring and the boundary edges.
 */
function generateValidPartition(
  size: number,
  colors: number,
  regionSize: number,
  rng: () => number,
): { grid: number[][]; edges: Set<string> } | null {
  const totalCells = size * size;
  const regionMap = new Array(totalCells).fill(-1);

  // Place region seeds
  const seeds: number[] = [];
  const used = new Set<number>();

  for (let i = 0; i < colors; i++) {
    let attempts = 0;
    while (attempts < 100) {
      const cell = Math.floor(rng() * totalCells);
      if (!used.has(cell)) {
        seeds.push(cell);
        used.add(cell);
        regionMap[cell] = i;
        break;
      }
      attempts++;
    }
    if (seeds.length <= i) return null;
  }

  // Grow regions simultaneously using BFS
  const frontiers: number[][] = seeds.map((s) => [s]);
  const regionSizes = new Array(colors).fill(1);

  let changed = true;
  while (changed) {
    changed = false;
    // Shuffle region order to avoid bias
    const order = Array.from({ length: colors }, (_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }

    for (const ri of order) {
      if (regionSizes[ri] >= regionSize) continue;
      const newFrontier: number[] = [];
      // Shuffle frontier
      const f = [...frontiers[ri]];
      for (let i = f.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [f[i], f[j]] = [f[j], f[i]];
      }

      for (const cell of f) {
        const r = Math.floor(cell / size);
        const c = cell % size;
        const neighbors: number[] = [];
        if (r > 0) neighbors.push((r - 1) * size + c);
        if (r < size - 1) neighbors.push((r + 1) * size + c);
        if (c > 0) neighbors.push(r * size + (c - 1));
        if (c < size - 1) neighbors.push(r * size + (c + 1));

        // Shuffle neighbors
        for (let i = neighbors.length - 1; i > 0; i--) {
          const j = Math.floor(rng() * (i + 1));
          [neighbors[i], neighbors[j]] = [neighbors[j], neighbors[i]];
        }

        for (const nb of neighbors) {
          if (regionMap[nb] === -1 && regionSizes[ri] < regionSize) {
            regionMap[nb] = ri;
            regionSizes[ri]++;
            newFrontier.push(nb);
            changed = true;
          }
        }
        if (regionSizes[ri] < regionSize) {
          newFrontier.push(cell); // keep in frontier
        }
      }
      frontiers[ri] = newFrontier;
    }
  }

  // Check all cells assigned and all regions have correct size
  for (let i = 0; i < totalCells; i++) {
    if (regionMap[i] === -1) return null;
  }
  for (let i = 0; i < colors; i++) {
    if (regionSizes[i] !== regionSize) return null;
  }

  // Assign colors: each region gets one of each color.
  // Create a color permutation per region so that each region has colors 0..colors-1
  const grid = Array.from({ length: size }, () => new Array(size).fill(0));

  for (let ri = 0; ri < colors; ri++) {
    // Collect cells in this region
    const cells: number[] = [];
    for (let i = 0; i < totalCells; i++) {
      if (regionMap[i] === ri) cells.push(i);
    }

    // Shuffle the color assignment for this region
    const perm = Array.from({ length: colors }, (_, i) => i);
    for (let i = perm.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [perm[i], perm[j]] = [perm[j], perm[i]];
    }

    for (let k = 0; k < cells.length; k++) {
      const r = Math.floor(cells[k] / size);
      const c = cells[k] % size;
      grid[r][c] = perm[k];
    }
  }

  // Compute boundary edges (edges between cells in different regions)
  const edges = new Set<string>();
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = r * size + c;
      if (c + 1 < size) {
        const right = r * size + (c + 1);
        if (regionMap[cell] !== regionMap[right]) {
          edges.add(edgeId(r, c, r, c + 1));
        }
      }
      if (r + 1 < size) {
        const below = (r + 1) * size + c;
        if (regionMap[cell] !== regionMap[below]) {
          edges.add(edgeId(r, c, r + 1, c));
        }
      }
    }
  }

  return { grid, edges };
}

/* ─── Solver ─── */

export function getCellNeighbors(cell: number, size: number): number[] {
  const r = Math.floor(cell / size);
  const c = cell % size;
  const nb: number[] = [];
  if (r > 0) nb.push((r - 1) * size + c);
  if (r < size - 1) nb.push((r + 1) * size + c);
  if (c > 0) nb.push(r * size + (c - 1));
  if (c < size - 1) nb.push(r * size + (c + 1));
  return nb;
}

/**
 * Solve by finding the correct partition of cells into regions.
 *
 * Skill levels:
 *   L1: random greedy (10 attempts, no backtracking)
 *   L2: greedy (most-constrained heuristic, 50 attempts)
 *   L3-5: backtracking with increasing budgets
 */
export function solve(
  puzzle: SplitState,
  skillLevel: 1 | 2 | 3 | 4 | 5,
): Solution | null {
  // Level 1-2: use greedy approach (multiple random attempts)
  if (skillLevel <= 2) {
    const attempts = skillLevel === 1 ? 10 : 50;
    let best: Solution | null = null;
    for (let i = 0; i < attempts; i++) {
      const sol = solveGreedy(puzzle, skillLevel === 1, i * 7919 + 1);
      if (sol && (!best || sol.steps < best.steps)) {
        best = sol;
      }
    }
    return best;
  }

  const { size, colors, grid } = puzzle;
  const regionSize = size;
  const totalCells = size * size;

  const maxIterations =
    skillLevel === 3 ? 100000
    : skillLevel === 4 ? 1000000
    : 10000000;

  const regionMap = new Array(totalCells).fill(-1);
  let iterations = 0;
  const foundResult: { regionMap: number[] }[] = [];

  function cellColor(cell: number): number {
    return grid[Math.floor(cell / size)][cell % size];
  }

  /**
   * Try to grow region `ri` starting from `seedCell`.
   * The region must end up with exactly `regionSize` cells, one of each color.
   * We grow by adding adjacent unassigned cells.
   */
  function growRegion(
    ri: number,
    cells: number[],
    colorsUsed: Set<number>,
  ): boolean {
    iterations++;
    if (iterations > maxIterations) return false;

    if (cells.length === regionSize) {
      // Region is complete. Move on to the next region.
      return buildNextRegion(ri + 1);
    }

    // Find candidate cells: unassigned, adjacent to current region, color not in region
    const candidateSet = new Set<number>();
    for (const c of cells) {
      for (const nb of getCellNeighbors(c, size)) {
        if (regionMap[nb] === -1 && !colorsUsed.has(cellColor(nb))) {
          candidateSet.add(nb);
        }
      }
    }

    const candidates = [...candidateSet];
    if (candidates.length === 0) return false;

    // Sort candidates: prefer cells with fewer unassigned neighbors (more constrained first)
    candidates.sort((a, b) => {
      const aNb = getCellNeighbors(a, size).filter(n => regionMap[n] === -1).length;
      const bNb = getCellNeighbors(b, size).filter(n => regionMap[n] === -1).length;
      return aNb - bNb;
    });

    for (const cell of candidates) {
      const color = cellColor(cell);
      regionMap[cell] = ri;
      colorsUsed.add(color);
      cells.push(cell);

      // Check: don't create unreachable islands of unassigned cells
      if (noIsolatedIslands(cells, ri)) {
        if (growRegion(ri, cells, colorsUsed)) return true;
      }

      cells.pop();
      colorsUsed.delete(color);
      regionMap[cell] = -1;
    }

    return false;
  }

  /**
   * Check that no isolated island of unassigned cells is too small
   * to form any region.
   */
  function noIsolatedIslands(currentRegionCells: number[], currentRi: number): boolean {
    const visited = new Set<number>();
    for (let i = 0; i < totalCells; i++) {
      if (regionMap[i] !== -1 || visited.has(i)) continue;
      // BFS to find connected component
      const component: number[] = [];
      const queue = [i];
      visited.add(i);
      while (queue.length > 0) {
        const cur = queue.shift()!;
        component.push(cur);
        for (const nb of getCellNeighbors(cur, size)) {
          if (regionMap[nb] === -1 && !visited.has(nb)) {
            visited.add(nb);
            queue.push(nb);
          }
        }
      }
      // Each component must be at least regionSize, or border an incomplete region
      if (component.length < regionSize) {
        // Check if it borders the current growing region (which could absorb some)
        let bordersGrowing = false;
        for (const cell of component) {
          for (const nb of getCellNeighbors(cell, size)) {
            if (regionMap[nb] === currentRi) {
              bordersGrowing = true;
              break;
            }
          }
          if (bordersGrowing) break;
        }
        if (!bordersGrowing && component.length < regionSize) return false;
      }
    }
    return true;
  }

  /**
   * Start building region `ri`. Pick a seed cell (first unassigned cell).
   */
  function buildNextRegion(ri: number): boolean {
    if (ri >= colors) {
      // All regions built!
      // Verify no unassigned cells remain
      for (let i = 0; i < totalCells; i++) {
        if (regionMap[i] === -1) return false;
      }
      foundResult[0] = { regionMap: [...regionMap] };
      return true;
    }

    // Pick seed: first unassigned cell (deterministic)
    let seed = -1;
    for (let i = 0; i < totalCells; i++) {
      if (regionMap[i] === -1) {
        seed = i;
        break;
      }
    }
    if (seed === -1) return false;

    const color = cellColor(seed);
    regionMap[seed] = ri;
    const cells = [seed];
    const colorsUsed = new Set<number>([color]);

    const ok = growRegion(ri, cells, colorsUsed);

    if (!ok) {
      // Undo
      for (const c of cells) regionMap[c] = -1;
    }
    return ok;
  }

  buildNextRegion(0);

  if (foundResult.length > 0) {
    const edges = computeEdges(foundResult[0].regionMap, size);
    const moves: Move[] = [];
    for (const eid of edges) {
      moves.push({ edgeId: eid, toggle: 'add' });
    }
    return { moves, steps: moves.length, edges };
  }

  return null;
}

/**
 * Greedy solver for lower skill levels.
 * Tries to grow regions without backtracking (or with limited backtracking).
 */
export function solveGreedy(
  puzzle: SplitState,
  randomize: boolean,
  rngSeed: number,
): Solution | null {
  const { size, colors, grid } = puzzle;
  const regionSize = size;
  const totalCells = size * size;
  const regionMap = new Array(totalCells).fill(-1);

  let s = rngSeed;
  function rng() {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function cellColor(cell: number): number {
    return grid[Math.floor(cell / size)][cell % size];
  }

  for (let ri = 0; ri < colors; ri++) {
    // Find seed: first unassigned
    let seed = -1;
    for (let i = 0; i < totalCells; i++) {
      if (regionMap[i] === -1) { seed = i; break; }
    }
    if (seed === -1) break;

    regionMap[seed] = ri;
    const colorsUsed = new Set([cellColor(seed)]);
    const regionCells = [seed];

    // Grow greedily
    while (regionCells.length < regionSize) {
      const candidates: number[] = [];
      for (const c of regionCells) {
        for (const nb of getCellNeighbors(c, size)) {
          if (regionMap[nb] === -1 && !colorsUsed.has(cellColor(nb))) {
            candidates.push(nb);
          }
        }
      }
      // Deduplicate
      const unique = [...new Set(candidates)];
      if (unique.length === 0) break; // stuck

      let pick: number;
      if (randomize) {
        pick = unique[Math.floor(rng() * unique.length)];
      } else {
        // Greedy: pick the most constrained cell (fewest unassigned neighbors)
        unique.sort((a, b) => {
          const aNb = getCellNeighbors(a, size).filter(n => regionMap[n] === -1).length;
          const bNb = getCellNeighbors(b, size).filter(n => regionMap[n] === -1).length;
          return aNb - bNb;
        });
        pick = unique[0];
      }

      regionMap[pick] = ri;
      colorsUsed.add(cellColor(pick));
      regionCells.push(pick);
    }

    if (regionCells.length !== regionSize) return null; // couldn't complete region
  }

  // Verify all cells assigned
  for (let i = 0; i < totalCells; i++) {
    if (regionMap[i] === -1) return null;
  }

  // Verify all regions have one of each color
  for (let ri = 0; ri < colors; ri++) {
    const colorCount = new Array(colors).fill(0);
    for (let i = 0; i < totalCells; i++) {
      if (regionMap[i] === ri) colorCount[cellColor(i)]++;
    }
    for (let c = 0; c < colors; c++) {
      if (colorCount[c] !== 1) return null;
    }
  }

  const edges = computeEdges(regionMap, size);
  const moves: Move[] = [];
  for (const eid of edges) {
    moves.push({ edgeId: eid, toggle: 'add' });
  }
  return { moves, steps: moves.length, edges };
}

function computeEdges(regionMap: number[], size: number): Set<string> {
  const edges = new Set<string>();
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = r * size + c;
      if (c + 1 < size) {
        const right = r * size + (c + 1);
        if (regionMap[cell] !== regionMap[right]) {
          edges.add(edgeId(r, c, r, c + 1));
        }
      }
      if (r + 1 < size) {
        const below = (r + 1) * size + c;
        if (regionMap[cell] !== regionMap[below]) {
          edges.add(edgeId(r, c, r + 1, c));
        }
      }
    }
  }
  return edges;
}

/* ─── Metric helpers ─── */

export function puzzleEntropy(state: SplitState): number {
  // Sum of log2(legal meaningful moves) at each step of optimal solution
  const all = allEdges(state.size);
  // For edge-toggle games, entropy comes from the number of edges that could be toggled
  // at each decision point
  const edgeCount = all.length;
  // Each step the player chooses 1 of edgeCount edges (minus already placed)
  // Approximation: log2(remaining choices) summed over solution steps
  const sol = solve(state, 5);
  if (!sol) return 0;
  let entropy = 0;
  const placed = new Set<string>();
  for (const move of sol.moves) {
    const remaining = edgeCount - placed.size;
    if (remaining > 0) entropy += Math.log2(remaining);
    placed.add(move.edgeId);
  }
  return entropy;
}
