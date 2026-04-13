/**
 * SpotCheck Solver -- Hash Set Membership (Valid Sudoku #36)
 *
 * Theme: Radio tower frequency clash detection on a grid.
 * Player reveals cells to discover frequencies, flags cells that clash
 * (same value in same row, column, or sector).
 *
 * L5 (optimal): Maintains hash sets per row/col/sector. Detects clashes
 * instantly on reveal. Skips cells that can be deduced as safe.
 * L2 (brute force): Reveals ALL cells, then scans for duplicates.
 * L1 (random): Reveals randomly, occasionally flags.
 */

export type CellState = 'hidden' | 'revealed' | 'flagged';

export type Cell = {
  id: number; row: number; col: number; sector: number; value: number; state: CellState;
};

export type GameState = {
  cells: Cell[]; gridSize: number; sectorRows: number; sectorCols: number;
  clashCount: number; clashesFound: number; energyUsed: number; energyBudget: number;
  wrongFlags: number; difficulty: number; clashCellIds: number[];
};

export type Move =
  | { type: 'reveal'; cellId: number }
  | { type: 'flag'; cellId: number }
  | { type: 'unflag'; cellId: number };

export type Solution = {
  moves: Move[]; revealCount: number; flagCount: number; wrongFlagCount: number;
  energyUsed: number; won: boolean; setInformedMoves: number;
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

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type DiffConfig = {
  gridSize: number; sectorRows: number; sectorCols: number;
  clashSwaps: number; energyBudget: number;
};

function getDiffConfig(difficulty: number): DiffConfig {
  switch (difficulty) {
    case 1: return { gridSize: 4, sectorRows: 2, sectorCols: 2, clashSwaps: 1, energyBudget: 16 };
    case 2: return { gridSize: 4, sectorRows: 2, sectorCols: 2, clashSwaps: 2, energyBudget: 16 };
    case 3: return { gridSize: 6, sectorRows: 2, sectorCols: 3, clashSwaps: 2, energyBudget: 36 };
    case 4: return { gridSize: 6, sectorRows: 2, sectorCols: 3, clashSwaps: 3, energyBudget: 36 };
    case 5: return { gridSize: 6, sectorRows: 2, sectorCols: 3, clashSwaps: 4, energyBudget: 36 };
    default: return { gridSize: 4, sectorRows: 2, sectorCols: 2, clashSwaps: 1, energyBudget: 16 };
  }
}

function computeSector(row: number, col: number, gridSize: number, sectorRows: number, sectorCols: number): number {
  return Math.floor(row / sectorRows) * (gridSize / sectorCols) + Math.floor(col / sectorCols);
}

function generateLatinSquare(n: number, sectorRows: number, sectorCols: number, rng: () => number): number[][] {
  let grid: number[][];
  if (n === 4) { grid = [[1,2,3,4],[3,4,1,2],[2,1,4,3],[4,3,2,1]]; }
  else { grid = [[1,2,3,4,5,6],[4,5,6,1,2,3],[2,3,1,5,6,4],[5,6,4,2,3,1],[3,1,2,6,4,5],[6,4,5,3,1,2]]; }
  const numBands = n / sectorRows;
  for (let band = 0; band < numBands; band++) {
    const sr = band * sectorRows;
    const br: number[][] = [];
    for (let r = 0; r < sectorRows; r++) br.push(grid[sr + r]);
    const s2 = shuffle(br, rng);
    for (let r = 0; r < sectorRows; r++) grid[sr + r] = s2[r];
  }
  const ncb = n / sectorCols;
  for (let band = 0; band < ncb; band++) {
    const sc = band * sectorCols;
    const ci: number[] = [];
    for (let c = 0; c < sectorCols; c++) ci.push(sc + c);
    const sci = shuffle(ci, rng);
    const tmp = grid.map(r => [...r]);
    for (let r = 0; r < n; r++) for (let c = 0; c < sectorCols; c++) grid[r][sc + c] = tmp[r][sci[c]];
  }
  const bo = shuffle(Array.from({ length: numBands }, (_, i) => i), rng);
  const bg: number[][] = [];
  for (const b of bo) for (let r = 0; r < sectorRows; r++) bg.push(grid[b * sectorRows + r]);
  const cbo = shuffle(Array.from({ length: ncb }, (_, i) => i), rng);
  const fg: number[][] = bg.map(row => { const nr: number[] = []; for (const b of cbo) for (let c = 0; c < sectorCols; c++) nr.push(row[b * sectorCols + c]); return nr; });
  const perm = shuffle(Array.from({ length: n }, (_, i) => i + 1), rng);
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) fg[r][c] = perm[fg[r][c] - 1];
  return fg;
}

function validateGrid(grid: number[][], n: number, sectorRows: number, sectorCols: number): boolean {
  for (let r = 0; r < n; r++) { const s = new Set<number>(); for (let c = 0; c < n; c++) { if (s.has(grid[r][c])) return false; s.add(grid[r][c]); } }
  for (let c = 0; c < n; c++) { const s = new Set<number>(); for (let r = 0; r < n; r++) { if (s.has(grid[r][c])) return false; s.add(grid[r][c]); } }
  for (let sr = 0; sr < n / sectorRows; sr++) for (let sc = 0; sc < n / sectorCols; sc++) {
    const s = new Set<number>();
    for (let r = sr * sectorRows; r < (sr + 1) * sectorRows; r++) for (let c = sc * sectorCols; c < (sc + 1) * sectorCols; c++) { if (s.has(grid[r][c])) return false; s.add(grid[r][c]); }
  }
  return true;
}

function findAllClashCells(grid: number[][], n: number, sectorRows: number, sectorCols: number): Set<number> {
  const cc = new Set<number>();
  for (let r = 0; r < n; r++) {
    const m = new Map<number, number[]>();
    for (let c = 0; c < n; c++) { const v = grid[r][c]; if (!m.has(v)) m.set(v, []); m.get(v)!.push(c); }
    for (const [, cols] of m) if (cols.length > 1) for (const c of cols) cc.add(r * n + c);
  }
  for (let c = 0; c < n; c++) {
    const m = new Map<number, number[]>();
    for (let r = 0; r < n; r++) { const v = grid[r][c]; if (!m.has(v)) m.set(v, []); m.get(v)!.push(r); }
    for (const [, rows] of m) if (rows.length > 1) for (const r of rows) cc.add(r * n + c);
  }
  for (let sr = 0; sr < n / sectorRows; sr++) for (let sc = 0; sc < n / sectorCols; sc++) {
    const m = new Map<number, number[]>();
    for (let r = sr * sectorRows; r < (sr + 1) * sectorRows; r++)
      for (let c = sc * sectorCols; c < (sc + 1) * sectorCols; c++) {
        const v = grid[r][c]; const idx = r * n + c;
        if (!m.has(v)) m.set(v, []); m.get(v)!.push(idx);
      }
    for (const [, idxs] of m) if (idxs.length > 1) for (const idx of idxs) cc.add(idx);
  }
  return cc;
}

function introduceClashes(grid: number[][], n: number, target: number, rng: () => number): number[][] {
  const result = grid.map(r => [...r]);
  const modified = new Set<number>();
  let introduced = 0;
  for (let att = 0; att < target * 500 && introduced < target; att++) {
    const r1 = Math.floor(rng() * n), c1 = Math.floor(rng() * n);
    if (modified.has(r1 * n + c1)) continue;
    const srcVal = result[r1][c1];
    const useRow = rng() < 0.5;
    let r2, c2;
    if (useRow) { c2 = Math.floor(rng() * n); if (c2 === c1) continue; r2 = r1; }
    else { r2 = Math.floor(rng() * n); if (r2 === r1) continue; c2 = c1; }
    if (modified.has(r2 * n + c2) || result[r2][c2] === srcVal) continue;
    result[r2][c2] = srcVal;
    modified.add(r2 * n + c2);
    introduced++;
  }
  return result;
}

export function generatePuzzle(seed: number, difficulty: number): GameState {
  const rng = makeRng(seed);
  const cfg = getDiffConfig(difficulty);
  const n = cfg.gridSize, sR = cfg.sectorRows, sC = cfg.sectorCols;
  const swaps = cfg.clashSwaps, eB = cfg.energyBudget;
  for (let att = 0; att < 200; att++) {
    const base = generateLatinSquare(n, sR, sC, rng);
    if (!validateGrid(base, n, sR, sC)) continue;
    const pg = introduceClashes(base, n, swaps, rng);
    const cc = findAllClashCells(pg, n, sR, sC);
    if (cc.size < 2) continue;
    const cells: Cell[] = [];
    let id = 0;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      cells.push({ id, row: r, col: c, sector: computeSector(r, c, n, sR, sC), value: pg[r][c], state: 'hidden' });
      id++;
    }
    const cci = Array.from(cc).sort((a, b) => a - b);
    return {
      cells, gridSize: n, sectorRows: sR, sectorCols: sC,
      clashCount: cci.length, clashesFound: 0,
      energyUsed: 0, energyBudget: eB,
      wrongFlags: 0, difficulty, clashCellIds: cci,
    };
  }
  const fb = [[1,2,3,4],[3,4,1,2],[2,1,4,3],[4,3,2,1]];
  fb[0][1] = 1;
  const cells: Cell[] = []; let id = 0;
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
    cells.push({ id, row: r, col: c, sector: computeSector(r, c, 4, 2, 2), value: fb[r][c], state: 'hidden' });
    id++;
  }
  return { cells, gridSize: 4, sectorRows: 2, sectorCols: 2, clashCount: 2, clashesFound: 0, energyUsed: 0, energyBudget: 16, wrongFlags: 0, difficulty, clashCellIds: [0, 1] };
}

export function applyMove(state: GameState, move: Move): GameState {
  const next: GameState = { ...state, cells: state.cells.map(c => ({ ...c })), clashCellIds: state.clashCellIds };
  switch (move.type) {
    case 'reveal': {
      const cell = next.cells.find(c => c.id === move.cellId);
      if (!cell || cell.state !== 'hidden') break;
      cell.state = 'revealed';
      next.energyUsed += 1;
      break;
    }
    case 'flag': {
      const cell = next.cells.find(c => c.id === move.cellId);
      if (!cell || cell.state !== 'revealed') break;
      if (next.clashCellIds.includes(cell.id)) {
        cell.state = 'flagged';
        next.clashesFound += 1;
      } else {
        cell.state = 'flagged';
        next.wrongFlags += 1;
        next.energyUsed += 2;
      }
      break;
    }
    case 'unflag': {
      const cell = next.cells.find(c => c.id === move.cellId);
      if (!cell || cell.state !== 'flagged') break;
      if (next.clashCellIds.includes(cell.id)) {
        cell.state = 'revealed';
        next.clashesFound -= 1;
      } else {
        cell.state = 'revealed';
        next.wrongFlags -= 1;
      }
      break;
    }
  }
  return next;
}

export function isGoal(state: GameState): boolean {
  return state.clashesFound === state.clashCount && state.energyUsed <= state.energyBudget;
}
export function energyRemaining(state: GameState): number {
  return state.energyBudget - state.energyUsed;
}
export function isGameOver(state: GameState): boolean {
  return isGoal(state) || state.energyUsed >= state.energyBudget;
}

function cloneState(s: GameState): GameState {
  return { ...s, cells: s.cells.map(c => ({ ...c })), clashCellIds: [...s.clashCellIds] };
}

function hasVisibleClash(cells: Cell[], cell: Cell): boolean {
  if (cell.state === 'hidden') return false;
  for (const other of cells) {
    if (other.id === cell.id || other.state === 'hidden') continue;
    if (other.value !== cell.value) continue;
    if (other.row === cell.row || other.col === cell.col || other.sector === cell.sector) return true;
  }
  return false;
}

function findVisibleClashes(cells: Cell[]): Set<number> {
  const cl = new Set<number>();
  for (const cell of cells)
    if (cell.state !== 'hidden' && hasVisibleClash(cells, cell)) cl.add(cell.id);
  return cl;
}

export function solveL5(puzzle: GameState): Solution {
  let state = cloneState(puzzle);
  const moves: Move[] = [];
  let revealCount = 0, flagCount = 0, wrongFlagCount = 0, setInformedMoves = 0;
  const n = state.gridSize;
  const flaggedCells = new Set<number>();

  const rowSeen = new Map<number, Map<number, number[]>>();
  const colSeen = new Map<number, Map<number, number[]>>();
  const secSeen = new Map<number, Map<number, number[]>>();
  for (let i = 0; i < n; i++) { rowSeen.set(i, new Map()); colSeen.set(i, new Map()); }
  const numSectors = (n / state.sectorRows) * (n / state.sectorCols);
  for (let i = 0; i < numSectors; i++) secSeen.set(i, new Map());
  const known = new Set<number>();

  // Track which groups have confirmed clashes (duplicate values)
  const clashRows = new Set<number>();
  const clashCols = new Set<number>();
  const clashSecs = new Set<number>();

  function addToSets(cid: number, value: number) {
    const cell = state.cells[cid];
    const groups: [Map<number, Map<number, number[]>>, number, Set<number>][] = [
      [rowSeen, cell.row, clashRows], [colSeen, cell.col, clashCols], [secSeen, cell.sector, clashSecs],
    ];
    for (const [gm, k, clashSet] of groups) {
      const m = gm.get(k)!;
      if (!m.has(value)) m.set(value, []);
      const ids = m.get(value)!;
      ids.push(cid);
      if (ids.length > 1) clashSet.add(k);
    }
    known.add(cid);
  }

  function flagClashes() {
    for (const gm of [rowSeen, colSeen, secSeen]) {
      for (const [, vm] of gm) {
        for (const [, ids] of vm) {
          if (ids.length <= 1) continue;
          for (const id of ids) {
            if (flaggedCells.has(id)) continue;
            const cell = state.cells[id];
            if (cell.state === 'revealed') {
              moves.push({ type: 'flag', cellId: id });
              state = applyMove(state, { type: 'flag', cellId: id });
              flaggedCells.add(id);
              flagCount++;
              setInformedMoves++;
              if (!state.clashCellIds.includes(id)) wrongFlagCount++;
            }
          }
        }
      }
    }
  }

  function pickNextCell(): number {
    // Priority: cells in groups with known clash values get a score boost
    let bestId = -1, bestScore = -1;
    for (let cid = 0; cid < n * n; cid++) {
      if (known.has(cid)) continue;
      const cell = state.cells[cid];
      if (cell.state !== 'hidden') continue;
      let score = 0;
      if (clashRows.has(cell.row)) score += 3;
      if (clashCols.has(cell.col)) score += 3;
      if (clashSecs.has(cell.sector)) score += 3;
      // Tiebreak: prefer cells where more of the group is known (closer to deduction)
      const rowKnown = state.cells.filter(c => c.row === cell.row && known.has(c.id)).length;
      const colKnown = state.cells.filter(c => c.col === cell.col && known.has(c.id)).length;
      const secKnown = state.cells.filter(c => c.sector === cell.sector && known.has(c.id)).length;
      score += (rowKnown + colKnown + secKnown) * 0.1;
      if (score > bestScore) { bestScore = score; bestId = cid; }
    }
    return bestId;
  }

  // Initial pass: reveal cells in priority order
  while (!isGoal(state) && state.energyUsed < state.energyBudget) {
    const cid = pickNextCell();
    if (cid === -1) break;
    const cell = state.cells[cid];
    moves.push({ type: 'reveal', cellId: cid });
    state = applyMove(state, { type: 'reveal', cellId: cid });
    revealCount++;
    setInformedMoves++;
    addToSets(cid, cell.value);
    flagClashes();
  }

  return {
    moves, revealCount, flagCount, wrongFlagCount,
    energyUsed: state.energyUsed, won: isGoal(state), setInformedMoves,
  };
}

function findVisibleClashesL2(cells: Cell[], difficulty: number): Set<number> {
  // At D3+, L2 skips sector checks (models player who forgets sub-boxes)
  const checkSectors = difficulty < 3;
  const cl = new Set<number>();
  for (const cell of cells) {
    if (cell.state === 'hidden') continue;
    for (const other of cells) {
      if (other.id === cell.id || other.state === 'hidden') continue;
      if (other.value !== cell.value) continue;
      if (other.row === cell.row || other.col === cell.col || (checkSectors && other.sector === cell.sector)) {
        cl.add(cell.id);
        cl.add(other.id);
      }
    }
  }
  return cl;
}

export function solveL2(puzzle: GameState): Solution {
  let state = cloneState(puzzle);
  const moves: Move[] = [];
  let revealCount = 0, flagCount = 0, wrongFlagCount = 0;
  for (const cell of state.cells) {
    if (state.energyUsed >= state.energyBudget) break;
    if (cell.state !== 'hidden') continue;
    moves.push({ type: 'reveal', cellId: cell.id });
    state = applyMove(state, { type: 'reveal', cellId: cell.id });
    revealCount++;
  }
  const vc = findVisibleClashesL2(state.cells, state.difficulty);
  for (const cid of vc) {
    const cell = state.cells.find(c => c.id === cid);
    if (!cell || cell.state !== 'revealed') continue;
    moves.push({ type: 'flag', cellId: cid });
    state = applyMove(state, { type: 'flag', cellId: cid });
    flagCount++;
    if (!state.clashCellIds.includes(cid)) wrongFlagCount++;
  }
  return {
    moves, revealCount, flagCount, wrongFlagCount,
    energyUsed: state.energyUsed, won: isGoal(state), setInformedMoves: 0,
  };
}

export function solveL1(puzzle: GameState): Solution {
  const rng = makeRng(12345);
  let state = cloneState(puzzle);
  const moves: Move[] = [];
  let revealCount = 0, flagCount = 0, wrongFlagCount = 0;
  for (let step = 0; step < 200; step++) {
    if (isGoal(state) || state.energyUsed >= state.energyBudget) break;
    const hidden = state.cells.filter(c => c.state === 'hidden');
    if (hidden.length === 0) break;
    const target = hidden[Math.floor(rng() * hidden.length)];
    moves.push({ type: 'reveal', cellId: target.id });
    state = applyMove(state, { type: 'reveal', cellId: target.id });
    revealCount++;
    if (rng() < 0.3) {
      const cl = findVisibleClashes(state.cells);
      for (const cid of cl) {
        const cell = state.cells.find(c => c.id === cid);
        if (!cell || cell.state !== 'revealed') continue;
        moves.push({ type: 'flag', cellId: cid });
        state = applyMove(state, { type: 'flag', cellId: cid });
        flagCount++;
        if (!state.clashCellIds.includes(cid)) wrongFlagCount++;
      }
    }
  }
  return {
    moves, revealCount, flagCount, wrongFlagCount,
    energyUsed: state.energyUsed, won: isGoal(state), setInformedMoves: 0,
  };
}

export function legalMoves(state: GameState): Move[] {
  const moves: Move[] = [];
  if (state.energyUsed < state.energyBudget) {
    for (const cell of state.cells)
      if (cell.state === 'hidden') moves.push({ type: 'reveal', cellId: cell.id });
  }
  for (const cell of state.cells) {
    if (cell.state === 'revealed') moves.push({ type: 'flag', cellId: cell.id });
    if (cell.state === 'flagged') moves.push({ type: 'unflag', cellId: cell.id });
  }
  return moves;
}

export function heuristic(state: GameState): number {
  return state.clashCount - state.clashesFound;
}

export type MetricsReport = {
  difficulties: Array<{
    difficulty: number; avgL5Reveals: number; avgL2Reveals: number;
    efficiencyGap: number; wastedWorkRatio: number;
    l2WinRate: number; l5WinRate: number;
    algorithmAlignment: number; decisionDensity: number;
    solvability: number; avgClashCount: number;
  }>;
  overall: {
    efficiencyGapD3: number; wastedWorkRatioD3: number;
    difficultyScaling: number[];
    avgAlgorithmAlignment: number; avgDecisionDensity: number;
    solvability: number;
  };
};

export function computeMetrics(seedBase: number): MetricsReport {
  const N = 50;
  const diffs = [1, 2, 3, 4, 5];
  const dr: MetricsReport['difficulties'] = [];
  for (const diff of diffs) {
    let tL5R = 0, tL2R = 0, l2W = 0, l5W = 0, tA = 0, tDD = 0, sol = 0, tCC = 0;
    for (let i = 0; i < N; i++) {
      const seed = seedBase + diff * 1000 + i;
      const puzzle = generatePuzzle(seed, diff);
      tCC += puzzle.clashCount;
      const l5 = solveL5(puzzle);
      const l2 = solveL2(generatePuzzle(seed, diff));
      tL5R += l5.revealCount;
      tL2R += l2.revealCount;
      if (l5.won) { l5W++; sol++; }
      if (l2.won) l2W++;
      const tM = l5.moves.length;
      tA += tM > 0 ? Math.min(1, l5.setInformedMoves / tM) : 1;
      let dp = 0, rp = 0;
      let sim = cloneState(puzzle);
      for (const move of l5.moves) {
        if (move.type === 'reveal') {
          rp++;
          if (sim.cells.filter(c => c.state === 'hidden').length > 1) dp++;
        }
        sim = applyMove(sim, move);
      }
      tDD += rp > 0 ? dp / rp : 0;
    }
    dr.push({
      difficulty: diff,
      avgL5Reveals: tL5R / N, avgL2Reveals: tL2R / N,
      efficiencyGap: tL2R > 0 ? (tL2R - tL5R) / tL2R : 0,
      wastedWorkRatio: tL5R > 0 ? (tL2R - tL5R) / tL5R : 0,
      l2WinRate: l2W / N, l5WinRate: l5W / N,
      algorithmAlignment: tA / N, decisionDensity: tDD / N,
      solvability: sol / N, avgClashCount: tCC / N,
    });
  }
  const d3 = dr.find(d => d.difficulty === 3)!;
  return {
    difficulties: dr,
    overall: {
      efficiencyGapD3: d3.efficiencyGap,
      wastedWorkRatioD3: d3.wastedWorkRatio,
      difficultyScaling: dr.map(d => d.l5WinRate),
      avgAlgorithmAlignment: dr.reduce((a, d) => a + d.algorithmAlignment, 0) / dr.length,
      avgDecisionDensity: dr.reduce((a, d) => a + d.decisionDensity, 0) / dr.length,
      solvability: dr.reduce((a, d) => a + d.solvability, 0) / dr.length,
    },
  };
}
