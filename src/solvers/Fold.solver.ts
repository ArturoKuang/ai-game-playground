/**
 * Fold Solver
 *
 * Rules: Fold a colored grid along row or column lines, stacking cells on top
 * of each other. Clear the board by creating stacks where all layers share
 * the same color. Mismatched stacks are frozen (unfoldable). Eliminate all
 * cells in the fewest folds.
 *
 * A Move = { axis: 'row' | 'col', line: number, direction: -1 | 1 }
 *   axis 'row', line L: fold along the horizontal line between row L-1 and L
 *     direction -1 = fold bottom half upward onto top
 *     direction  1 = fold top half downward onto bottom
 *   axis 'col', line L: fold along the vertical line between col L-1 and L
 *     direction -1 = fold right half leftward onto left
 *     direction  1 = fold left half rightward onto right
 *
 * Each cell is a stack of colors (number[]). When folding, the folded side's
 * cells overlay onto the target side. If a resulting stack has all the same
 * color, it "clears" (matches). If mixed colors, it "freezes" (stays and
 * cannot be further matched, but can receive more layers).
 *
 * Goal: all cells are cleared (empty).
 */

/* ─── Types ─── */

export type Cell = {
  colors: number[];   // stack of colors, bottom to top
  frozen: boolean;    // true if mismatched layers exist
  cleared: boolean;   // true if all layers matched and cell is done
};

export type FoldState = {
  rows: number;
  cols: number;
  grid: (Cell | null)[][]; // null = empty/out-of-bounds after folds
};

export type Move = {
  axis: 'row' | 'col';
  line: number;       // 1-based fold line (between line-1 and line)
  direction: -1 | 1;  // which half folds onto which
};

export type Solution = {
  moves: Move[];
  steps: number;
};

/* ─── Constants ─── */
const COLOR_NAMES = ['R', 'B', 'G', 'Y']; // for debugging / keys

/* ─── State Helpers ─── */

function cloneCell(c: Cell | null): Cell | null {
  if (!c) return null;
  return { colors: [...c.colors], frozen: c.frozen, cleared: c.cleared };
}

function cloneState(state: FoldState): FoldState {
  return {
    rows: state.rows,
    cols: state.cols,
    grid: state.grid.map(row => row.map(cloneCell)),
  };
}

function stateKey(state: FoldState): string {
  const parts: string[] = [];
  parts.push(`${state.rows}x${state.cols}`);
  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      const cell = state.grid[r]?.[c];
      if (!cell || cell.cleared) {
        parts.push('_');
      } else {
        parts.push((cell.frozen ? 'F' : '') + cell.colors.join(''));
      }
    }
  }
  return parts.join('|');
}

/* ─── Core Game Logic ─── */

export function isGoal(state: FoldState): boolean {
  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      const cell = state.grid[r]?.[c];
      if (cell && !cell.cleared) return false;
    }
  }
  return true;
}

export function heuristic(state: FoldState): number {
  // Composite heuristic:
  // - Base: count of active (non-cleared) cells
  // - Penalty: frozen cells (permanent damage, count extra)
  // - Penalty: cells that have NO color-match partner on the other side
  //   of any available fold line (stranded cells)
  //
  // The "stranded" penalty creates counterintuitive situations: a fold might
  // clear 2 cells but strand 3 others (no matching partner reachable), while
  // a different fold clears 0 cells but keeps all cells matchable for future folds.
  // This means the optimal path may choose a fold that clears FEWER cells
  // (increasing short-term heuristic) because it preserves matchability.
  let active = 0;
  let frozen = 0;
  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      const cell = state.grid[r]?.[c];
      if (cell && !cell.cleared) {
        active++;
        if (cell.frozen) frozen++;
      }
    }
  }

  // Count stranded cells: cells whose color doesn't appear on the other side
  // of ANY fold line
  let stranded = 0;
  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      const cell = state.grid[r]?.[c];
      if (!cell || cell.cleared || cell.frozen) continue;
      const color = cell.colors[cell.colors.length - 1];
      let hasPartner = false;

      // Check each fold line
      for (let line = 1; line < state.rows && !hasPartner; line++) {
        // For this row fold line, where would (r,c) overlap?
        if (r < line) {
          // Cell is in top half; partner is at row line + (line-1-r)
          const partnerR = line + (line - 1 - r);
          if (partnerR < state.rows) {
            const pc = state.grid[partnerR]?.[c];
            if (pc && !pc.cleared && pc.colors[pc.colors.length - 1] === color) {
              hasPartner = true;
            }
          }
        } else {
          // Cell is in bottom half; partner is at row line - 1 - (r - line)
          const partnerR = line - 1 - (r - line);
          if (partnerR >= 0) {
            const pc = state.grid[partnerR]?.[c];
            if (pc && !pc.cleared && pc.colors[pc.colors.length - 1] === color) {
              hasPartner = true;
            }
          }
        }
      }
      for (let line = 1; line < state.cols && !hasPartner; line++) {
        if (c < line) {
          const partnerC = line + (line - 1 - c);
          if (partnerC < state.cols) {
            const pc = state.grid[r]?.[partnerC];
            if (pc && !pc.cleared && pc.colors[pc.colors.length - 1] === color) {
              hasPartner = true;
            }
          }
        } else {
          const partnerC = line - 1 - (c - line);
          if (partnerC >= 0) {
            const pc = state.grid[r]?.[partnerC];
            if (pc && !pc.cleared && pc.colors[pc.colors.length - 1] === color) {
              hasPartner = true;
            }
          }
        }
      }
      if (!hasPartner) stranded++;
    }
  }

  return active + frozen * 3 + stranded;
}

/**
 * After a fold, merge the folded-over cells onto the target cells.
 * Returns a new state with the fold applied.
 */
export function applyMove(state: FoldState, move: Move): FoldState {
  const next = cloneState(state);
  const { axis, line, direction } = move;

  if (axis === 'row') {
    // Fold along horizontal line between row (line-1) and row (line)
    // direction -1: fold bottom half (rows line..rows-1) up onto top half
    // direction  1: fold top half (rows 0..line-1) down onto bottom half
    if (direction === -1) {
      // Bottom folds up: row `line + k` maps onto row `line - 1 - k`
      const bottomStart = line;
      const bottomEnd = next.rows - 1;
      const topStart = line - 1;
      for (let k = 0; k <= bottomEnd - bottomStart && topStart - k >= 0; k++) {
        const srcRow = bottomStart + k;
        const tgtRow = topStart - k;
        for (let c = 0; c < next.cols; c++) {
          mergeCell(next, tgtRow, c, srcRow, c);
        }
      }
      // New grid dimensions: keep only the top portion up to max needed
      const newRows = line; // rows 0..line-1
      // Handle case where bottom is longer than top - those cells are lost (can't fold onto nothing)
      next.rows = newRows;
      next.grid = next.grid.slice(0, newRows);
    } else {
      // Top folds down: row `line - 1 - k` maps onto row `line + k`
      const topEnd = line - 1;
      const bottomStart = line;
      const bottomEnd = next.rows - 1;
      for (let k = 0; k <= topEnd && bottomStart + k <= bottomEnd; k++) {
        const srcRow = topEnd - k;
        const tgtRow = bottomStart + k;
        for (let c = 0; c < next.cols; c++) {
          mergeCell(next, tgtRow, c, srcRow, c);
        }
      }
      const newRows = next.rows - line;
      next.rows = newRows;
      next.grid = next.grid.slice(line);
    }
  } else {
    // Fold along vertical line between col (line-1) and col (line)
    if (direction === -1) {
      // Right folds left: col `line + k` maps onto col `line - 1 - k`
      const rightStart = line;
      const rightEnd = next.cols - 1;
      const leftEnd = line - 1;
      for (let r = 0; r < next.rows; r++) {
        for (let k = 0; k <= rightEnd - rightStart && leftEnd - k >= 0; k++) {
          const srcCol = rightStart + k;
          const tgtCol = leftEnd - k;
          mergeCell(next, r, tgtCol, r, srcCol);
        }
      }
      next.cols = line;
      for (let r = 0; r < next.rows; r++) {
        next.grid[r] = next.grid[r].slice(0, line);
      }
    } else {
      // Left folds right: col `line - 1 - k` maps onto col `line + k`
      const leftEnd = line - 1;
      const rightStart = line;
      const rightEnd = next.cols - 1;
      for (let r = 0; r < next.rows; r++) {
        for (let k = 0; k <= leftEnd && rightStart + k <= rightEnd; k++) {
          const srcCol = leftEnd - k;
          const tgtCol = rightStart + k;
          mergeCell(next, r, tgtCol, r, srcCol);
        }
      }
      next.cols = next.cols - line;
      for (let r = 0; r < next.rows; r++) {
        next.grid[r] = next.grid[r].slice(line);
      }
    }
  }

  // Check for newly matched stacks
  checkClears(next);

  return next;
}

/**
 * Merge source cell onto target cell.
 * Source cell becomes null after merge.
 */
function mergeCell(
  state: FoldState,
  tgtR: number, tgtC: number,
  srcR: number, srcC: number,
): void {
  const src = state.grid[srcR]?.[srcC];
  if (!src || src.cleared) {
    return; // nothing to merge
  }

  const tgt = state.grid[tgtR]?.[tgtC];
  if (!tgt || tgt.cleared) {
    // Target is empty, just move the source there
    state.grid[tgtR][tgtC] = { colors: [...src.colors], frozen: src.frozen, cleared: false };
  } else {
    // Stack source on top of target
    tgt.colors = [...tgt.colors, ...src.colors];
    // If either was frozen, or the new combined stack has mismatched colors, it's frozen
    if (tgt.frozen || src.frozen) {
      tgt.frozen = true;
    }
  }

  // Clear source
  state.grid[srcR][srcC] = { colors: [], frozen: false, cleared: true };
}

/**
 * Check all cells: if a non-cleared cell has all same-color layers, clear it.
 * If it has mixed colors, freeze it.
 */
function checkClears(state: FoldState): void {
  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      const cell = state.grid[r]?.[c];
      if (!cell || cell.cleared || cell.colors.length === 0) continue;

      const allSame = cell.colors.every(co => co === cell.colors[0]);
      if (allSame && cell.colors.length >= 2) {
        // Matched! Clear this cell
        cell.cleared = true;
        cell.frozen = false;
        cell.colors = [];
      } else if (!allSame) {
        cell.frozen = true;
      }
    }
  }
}

export function legalMoves(state: FoldState): Move[] {
  const moves: Move[] = [];
  // Row folds: line from 1 to rows-1
  for (let line = 1; line < state.rows; line++) {
    // Check if there are any non-cleared cells on both sides
    if (hasCellsInRowRange(state, 0, line - 1) && hasCellsInRowRange(state, line, state.rows - 1)) {
      moves.push({ axis: 'row', line, direction: -1 }); // bottom up
      moves.push({ axis: 'row', line, direction: 1 });  // top down
    }
  }
  // Col folds: line from 1 to cols-1
  for (let line = 1; line < state.cols; line++) {
    if (hasCellsInColRange(state, 0, line - 1) && hasCellsInColRange(state, line, state.cols - 1)) {
      moves.push({ axis: 'col', line, direction: -1 }); // right left
      moves.push({ axis: 'col', line, direction: 1 });  // left right
    }
  }
  return moves;
}

function hasCellsInRowRange(state: FoldState, from: number, to: number): boolean {
  for (let r = from; r <= to; r++) {
    for (let c = 0; c < state.cols; c++) {
      const cell = state.grid[r]?.[c];
      if (cell && !cell.cleared) return true;
    }
  }
  return false;
}

function hasCellsInColRange(state: FoldState, from: number, to: number): boolean {
  for (let r = 0; r < state.rows; r++) {
    for (let c = from; c <= to; c++) {
      const cell = state.grid[r]?.[c];
      if (cell && !cell.cleared) return true;
    }
  }
  return false;
}

/* ─── Puzzle Generation ─── */

/**
 * Generate a puzzle by working BACKWARD from a solved state.
 *
 * Strategy: simulate a sequence of folds on a 4x4 grid, record the fold
 * sequence, then construct a color grid such that executing those folds
 * in order clears the board. The key insight is that we need colors to match
 * when they overlap at each fold step.
 *
 * We do this by:
 * 1. Pick a target fold sequence (3-6 folds)
 * 2. Trace which cells overlap at each fold step
 * 3. Assign colors to cells such that overlapping cells at each fold match
 * 4. Ensure non-solution folds create mismatches (frozen stacks)
 * 5. Validate via solver
 */
export function generatePuzzle(seed: number, difficulty: number): FoldState {
  let s = seed;
  function rng() {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Number of colors based on difficulty
  const numColors = Math.min(2 + Math.floor(difficulty * 0.6), 4);
  const GRID = 4;

  // Target fold count: Mon=3, Fri=5-6
  const targetFolds = 2 + difficulty; // 3,4,5,6,7

  for (let attempt = 0; attempt < 300; attempt++) {
    const state = buildFromFoldSequence(rng, GRID, numColors, targetFolds);
    if (!state) continue;

    // Validate: solver should find solution with correct depth
    const sol = solveFull(state, 300000);
    if (sol && sol.steps >= Math.max(2, targetFolds - 2) && sol.steps <= targetFolds + 2) {
      // Also check that greedy doesn't trivially solve it
      const greedySol = solveGreedyInternal(state, 20);
      const optSteps = sol.steps;
      // Greedy should either fail or be worse than optimal
      if (!greedySol || greedySol.steps > optSteps) {
        return state;
      }
      // If greedy is close to optimal, still accept sometimes for easy puzzles
      if (difficulty <= 2 && greedySol.steps <= optSteps + 1) {
        return state;
      }
    }
  }

  // Fallback: generate via random grids with solver validation
  for (let attempt = 0; attempt < 500; attempt++) {
    const state = generateRandomGrid(rng, GRID, numColors);
    const sol = solveFull(state, 300000);
    if (sol && sol.steps >= 2 && sol.steps <= targetFolds + 2) {
      return state;
    }
  }

  // Final fallback: simple symmetric
  return generateSymmetric(rng, GRID, numColors);
}

/**
 * Build a puzzle by choosing a fold sequence and constructing matching colors.
 * Returns null if the sequence doesn't produce a valid puzzle.
 */
function buildFromFoldSequence(
  rng: () => number,
  size: number,
  numColors: number,
  targetFolds: number,
): FoldState | null {
  // Step 1: generate a random fold sequence
  const folds: Move[] = [];
  let rows = size;
  let cols = size;

  for (let f = 0; f < targetFolds; f++) {
    const possibleFolds: Move[] = [];
    // Row folds
    for (let line = 1; line < rows; line++) {
      possibleFolds.push({ axis: 'row', line, direction: -1 });
      possibleFolds.push({ axis: 'row', line, direction: 1 });
    }
    // Col folds
    for (let line = 1; line < cols; line++) {
      possibleFolds.push({ axis: 'col', line, direction: -1 });
      possibleFolds.push({ axis: 'col', line, direction: 1 });
    }

    if (possibleFolds.length === 0) break;

    const fold = possibleFolds[Math.floor(rng() * possibleFolds.length)];
    folds.push(fold);

    // Update dimensions
    if (fold.axis === 'row') {
      rows = fold.direction === -1 ? fold.line : rows - fold.line;
    } else {
      cols = fold.direction === -1 ? fold.line : cols - fold.line;
    }

    if (rows <= 0 || cols <= 0) break;
  }

  if (folds.length < 2) return null;

  // Step 2: assign colors to cells using union-find for fold-matching constraints.
  // Cells that overlap when the intended fold is applied must share the same color.
  // We trace the fold sequence forward to build equivalence classes.

  // Track which original (r,c) cells map to each other via folds
  type CellId = string;
  const cellId = (r: number, c: number): CellId => `${r},${c}`;

  // Union-find for cell grouping
  const parent: Record<CellId, CellId> = {};

  function find(x: CellId): CellId {
    if (!parent[x]) parent[x] = x;
    if (parent[x] !== x) parent[x] = find(parent[x]);
    return parent[x];
  }

  function union(a: CellId, b: CellId) {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  }

  // Initialize all cells
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      parent[cellId(r, c)] = cellId(r, c);
    }
  }

  // For each fold, determine which original cells overlap.
  // We need to track cell positions through folds.
  // Start: each position (r,c) contains origin cell (r,c).
  // After each fold, track where origin cells end up.

  // Current mapping: position -> list of original cell ids at that position
  let posMap: Map<string, CellId[]> = new Map();
  let curRows = size;
  let curCols = size;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      posMap.set(`${r},${c}`, [cellId(r, c)]);
    }
  }

  for (const fold of folds) {
    const newPosMap: Map<string, CellId[]> = new Map();

    if (fold.axis === 'row') {
      if (fold.direction === -1) {
        // Bottom folds up: row fold.line+k -> row fold.line-1-k
        // Keep rows 0..fold.line-1
        for (let r = 0; r < fold.line; r++) {
          for (let c = 0; c < curCols; c++) {
            const key = `${r},${c}`;
            newPosMap.set(key, [...(posMap.get(key) || [])]);
          }
        }
        // Fold bottom onto top
        const bottomStart = fold.line;
        const bottomEnd = curRows - 1;
        for (let k = 0; k <= bottomEnd - bottomStart && fold.line - 1 - k >= 0; k++) {
          const srcRow = bottomStart + k;
          const tgtRow = fold.line - 1 - k;
          for (let c = 0; c < curCols; c++) {
            const srcKey = `${srcRow},${c}`;
            const tgtKey = `${tgtRow},${c}`;
            const srcCells = posMap.get(srcKey) || [];
            const existing = newPosMap.get(tgtKey) || [];
            // All cells at this position must match - union them
            for (const cell of srcCells) {
              for (const ex of existing) {
                union(cell, ex);
              }
            }
            newPosMap.set(tgtKey, [...existing, ...srcCells]);
          }
        }
        curRows = fold.line;
      } else {
        // Top folds down: row fold.line-1-k -> row fold.line+k
        // Keep rows fold.line..curRows-1, reindex to 0-based
        for (let r = fold.line; r < curRows; r++) {
          for (let c = 0; c < curCols; c++) {
            const srcKey = `${r},${c}`;
            const newKey = `${r - fold.line},${c}`;
            newPosMap.set(newKey, [...(posMap.get(srcKey) || [])]);
          }
        }
        // Fold top onto bottom
        const topEnd = fold.line - 1;
        const newRows = curRows - fold.line;
        for (let k = 0; k <= topEnd && k < newRows; k++) {
          const srcRow = topEnd - k;
          const tgtRow = k; // after reindex
          for (let c = 0; c < curCols; c++) {
            const srcKey = `${srcRow},${c}`;
            const tgtKey = `${tgtRow},${c}`;
            const srcCells = posMap.get(srcKey) || [];
            const existing = newPosMap.get(tgtKey) || [];
            for (const cell of srcCells) {
              for (const ex of existing) {
                union(cell, ex);
              }
            }
            newPosMap.set(tgtKey, [...existing, ...srcCells]);
          }
        }
        curRows = newRows;
      }
    } else {
      if (fold.direction === -1) {
        // Right folds left: col fold.line+k -> col fold.line-1-k
        for (let r = 0; r < curRows; r++) {
          for (let c = 0; c < fold.line; c++) {
            const key = `${r},${c}`;
            newPosMap.set(key, [...(posMap.get(key) || [])]);
          }
        }
        const rightStart = fold.line;
        const rightEnd = curCols - 1;
        for (let r = 0; r < curRows; r++) {
          for (let k = 0; k <= rightEnd - rightStart && fold.line - 1 - k >= 0; k++) {
            const srcCol = rightStart + k;
            const tgtCol = fold.line - 1 - k;
            const srcKey = `${r},${srcCol}`;
            const tgtKey = `${r},${tgtCol}`;
            const srcCells = posMap.get(srcKey) || [];
            const existing = newPosMap.get(tgtKey) || [];
            for (const cell of srcCells) {
              for (const ex of existing) {
                union(cell, ex);
              }
            }
            newPosMap.set(tgtKey, [...existing, ...srcCells]);
          }
        }
        curCols = fold.line;
      } else {
        // Left folds right: col fold.line-1-k -> col fold.line+k
        for (let r = 0; r < curRows; r++) {
          for (let c = fold.line; c < curCols; c++) {
            const srcKey = `${r},${c}`;
            const newKey = `${r},${c - fold.line}`;
            newPosMap.set(newKey, [...(posMap.get(srcKey) || [])]);
          }
        }
        const leftEnd = fold.line - 1;
        const newCols = curCols - fold.line;
        for (let r = 0; r < curRows; r++) {
          for (let k = 0; k <= leftEnd && k < newCols; k++) {
            const srcCol = leftEnd - k;
            const tgtCol = k;
            const srcKey = `${r},${srcCol}`;
            const tgtKey = `${r},${tgtCol}`;
            const srcCells = posMap.get(srcKey) || [];
            const existing = newPosMap.get(tgtKey) || [];
            for (const cell of srcCells) {
              for (const ex of existing) {
                union(cell, ex);
              }
            }
            newPosMap.set(tgtKey, [...existing, ...srcCells]);
          }
        }
        curCols = newCols;
      }
    }

    posMap = newPosMap;
  }

  // Check that all cells ended up grouped (board fully cleared)
  // Every remaining position should have 2+ cells (all same color = cleared)
  let allCleared = true;
  for (const [, cells] of posMap) {
    if (cells.length < 2) {
      // Single cell left = not cleared by fold sequence
      allCleared = false;
    }
  }

  // Group cells by their union-find root
  const groups: Map<CellId, CellId[]> = new Map();
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const id = cellId(r, c);
      const root = find(id);
      if (!groups.has(root)) groups.set(root, []);
      groups.get(root)!.push(id);
    }
  }

  // Assign colors: each group gets one color
  // For harder puzzles, ensure groups overlap in confusing ways
  const groupList = [...groups.values()].filter(g => g.length >= 2);
  if (groupList.length === 0) return null;

  // Assign random colors to groups, ensuring we use numColors colors
  const groupColors: Map<CellId, number> = new Map();
  let colorIdx = 0;
  for (const group of groupList) {
    const color = colorIdx % numColors;
    colorIdx++;
    for (const id of group) {
      groupColors.set(id, color);
    }
  }
  // Assign remaining ungrouped cells random colors that DON'T match their neighbors
  // (to create potential mismatches on wrong folds)
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const id = cellId(r, c);
      if (!groupColors.has(id)) {
        groupColors.set(id, Math.floor(rng() * numColors));
      }
    }
  }

  // Shuffle group color assignments to add variety
  // Reassign colors randomly while keeping groups consistent
  const rootColorMap: Map<CellId, number> = new Map();
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const id = cellId(r, c);
      const root = find(id);
      if (!rootColorMap.has(root)) {
        rootColorMap.set(root, Math.floor(rng() * numColors));
      }
      groupColors.set(id, rootColorMap.get(root)!);
    }
  }

  // Build grid
  const grid: (Cell | null)[][] = [];
  for (let r = 0; r < size; r++) {
    grid[r] = [];
    for (let c = 0; c < size; c++) {
      const color = groupColors.get(cellId(r, c)) ?? 0;
      grid[r][c] = { colors: [color], frozen: false, cleared: false };
    }
  }

  // Now perturb some colors to create non-obvious paths.
  // Change a few cells' colors so that the "obvious" fold creates frozen stacks.
  // The intended solution still works because the changed cells' groups are intact.
  const perturbCount = Math.floor(rng() * 3) + 1;
  for (let p = 0; p < perturbCount; p++) {
    const r1 = Math.floor(rng() * size);
    const c1 = Math.floor(rng() * size);
    const id1 = cellId(r1, c1);
    const root1 = find(id1);
    // Find another cell in the SAME group and change BOTH to a different color
    // This keeps the group consistent but changes the color
    const newColor = Math.floor(rng() * numColors);
    // Set all cells in this group to the new color
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (find(cellId(r, c)) === root1) {
          grid[r][c] = { colors: [newColor], frozen: false, cleared: false };
        }
      }
    }
  }

  // Verify: the fold sequence should actually clear this grid
  let testState: FoldState = { rows: size, cols: size, grid: grid.map(row => row.map(c => c ? { colors: [...c.colors], frozen: c.frozen, cleared: c.cleared } : null)) };
  for (const fold of folds) {
    testState = applyMove(testState, fold);
    if (isGoal(testState)) break;
  }

  if (!isGoal(testState)) {
    // The constructed sequence doesn't actually clear - skip
    return null;
  }

  return { rows: size, cols: size, grid };
}

function generateRandomGrid(
  rng: () => number,
  size: number,
  numColors: number,
): FoldState {
  const grid: (Cell | null)[][] = [];
  for (let r = 0; r < size; r++) {
    grid[r] = [];
    for (let c = 0; c < size; c++) {
      grid[r][c] = { colors: [Math.floor(rng() * numColors)], frozen: false, cleared: false };
    }
  }
  return { rows: size, cols: size, grid };
}

function generateSymmetric(
  rng: () => number,
  size: number,
  numColors: number,
): FoldState {
  const grid: (Cell | null)[][] = [];
  for (let r = 0; r < size; r++) {
    grid[r] = [];
    for (let c = 0; c < size; c++) {
      grid[r][c] = null;
    }
  }
  const halfR = size / 2;
  const halfC = size / 2;
  for (let r = 0; r < halfR; r++) {
    for (let c = 0; c < halfC; c++) {
      const color = Math.floor(rng() * numColors);
      grid[r][c] = { colors: [color], frozen: false, cleared: false };
      grid[r][size - 1 - c] = { colors: [color], frozen: false, cleared: false };
      grid[size - 1 - r][c] = { colors: [color], frozen: false, cleared: false };
      grid[size - 1 - r][size - 1 - c] = { colors: [color], frozen: false, cleared: false };
    }
  }
  return { rows: size, cols: size, grid };
}

/** Internal greedy for generation validation */
function solveGreedyInternal(state: FoldState, maxSteps: number): Solution | null {
  let current = cloneState(state);
  const moves: Move[] = [];
  for (let step = 0; step < maxSteps; step++) {
    if (isGoal(current)) return { moves, steps: moves.length };
    const legal = legalMoves(current);
    if (legal.length === 0) break;
    let bestMove = legal[0];
    let bestH = Infinity;
    for (const m of legal) {
      const ns = applyMove(current, m);
      const h = heuristic(ns);
      if (h < bestH) { bestH = h; bestMove = m; }
    }
    current = applyMove(current, bestMove);
    moves.push(bestMove);
    if (isGoal(current)) return { moves, steps: moves.length };
  }
  return null;
}

/* ─── Solver ─── */

function solveFull(state: FoldState, maxNodes: number): Solution | null {
  if (isGoal(state)) return { moves: [], steps: 0 };

  const visited = new Set<string>([stateKey(state)]);
  let frontier: { state: FoldState; moves: Move[] }[] = [
    { state, moves: [] },
  ];

  while (frontier.length > 0 && visited.size < maxNodes) {
    const next: { state: FoldState; moves: Move[] }[] = [];
    for (const { state: cur, moves } of frontier) {
      for (const m of legalMoves(cur)) {
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

/**
 * A* search with heuristic
 */
function solveAStar(state: FoldState, maxNodes: number): Solution | null {
  if (isGoal(state)) return { moves: [], steps: 0 };

  const visited = new Set<string>([stateKey(state)]);

  // Priority queue (simple array sorted by f = g + h)
  let openList: { state: FoldState; moves: Move[]; g: number; f: number }[] = [
    { state, moves: [], g: 0, f: heuristic(state) },
  ];

  while (openList.length > 0 && visited.size < maxNodes) {
    // Pick lowest f
    openList.sort((a, b) => a.f - b.f);
    const current = openList.shift()!;

    for (const m of legalMoves(current.state)) {
      const ns = applyMove(current.state, m);
      const key = stateKey(ns);
      if (visited.has(key)) continue;
      visited.add(key);
      const nm: Move[] = [...current.moves, m];
      if (isGoal(ns)) return { moves: nm, steps: nm.length };
      const g = current.g + 1;
      const h = heuristic(ns);
      openList.push({ state: ns, moves: nm, g, f: g + h });
    }
  }
  return null;
}

export function solve(
  puzzle: FoldState,
  skillLevel: 1 | 2 | 3 | 4 | 5,
): Solution | null {
  switch (skillLevel) {
    case 1:
      return solveRandom(puzzle, 50);
    case 2:
      return solveGreedy(puzzle, 20);
    case 3:
      return solveGreedyLookahead(puzzle, 15);
    case 4:
      return solveAStar(puzzle, 50000);
    case 5:
      return solveFull(puzzle, 500000);
    default:
      return null;
  }
}

function solveRandom(state: FoldState, maxSteps: number): Solution | null {
  let current = cloneState(state);
  const moves: Move[] = [];

  for (let step = 0; step < maxSteps; step++) {
    const legal = legalMoves(current);
    if (legal.length === 0) break;
    const m = legal[Math.floor(Math.random() * legal.length)];
    current = applyMove(current, m);
    moves.push(m);
    if (isGoal(current)) return { moves, steps: moves.length };
  }
  return null;
}

function solveGreedy(state: FoldState, maxSteps: number): Solution | null {
  let current = cloneState(state);
  const moves: Move[] = [];

  for (let step = 0; step < maxSteps; step++) {
    if (isGoal(current)) return { moves, steps: moves.length };
    const legal = legalMoves(current);
    if (legal.length === 0) break;

    // Pick the move that minimizes heuristic
    let bestMove = legal[0];
    let bestH = Infinity;
    for (const m of legal) {
      const ns = applyMove(current, m);
      const h = heuristic(ns);
      if (h < bestH) {
        bestH = h;
        bestMove = m;
      }
    }
    current = applyMove(current, bestMove);
    moves.push(bestMove);
    if (isGoal(current)) return { moves, steps: moves.length };
  }
  return null;
}

function solveGreedyLookahead(state: FoldState, maxSteps: number): Solution | null {
  let current = cloneState(state);
  const moves: Move[] = [];

  for (let step = 0; step < maxSteps; step++) {
    if (isGoal(current)) return { moves, steps: moves.length };
    const legal = legalMoves(current);
    if (legal.length === 0) break;

    // 1-step lookahead: for each move, check min heuristic of next move
    let bestMove = legal[0];
    let bestH = Infinity;
    for (const m of legal) {
      const ns = applyMove(current, m);
      if (isGoal(ns)) {
        current = ns;
        moves.push(m);
        return { moves, steps: moves.length };
      }
      const nextLegal = legalMoves(ns);
      let minNext = heuristic(ns);
      for (const m2 of nextLegal) {
        const ns2 = applyMove(ns, m2);
        const h2 = heuristic(ns2);
        if (h2 < minNext) minNext = h2;
      }
      if (minNext < bestH) {
        bestH = minNext;
        bestMove = m;
      }
    }
    current = applyMove(current, bestMove);
    moves.push(bestMove);
    if (isGoal(current)) return { moves, steps: moves.length };
  }
  return null;
}

/* ─── Metric Helpers ─── */

export function countActiveCells(state: FoldState): number {
  let count = 0;
  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      const cell = state.grid[r]?.[c];
      if (cell && !cell.cleared) count++;
    }
  }
  return count;
}

export function countFrozenCells(state: FoldState): number {
  let count = 0;
  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      const cell = state.grid[r]?.[c];
      if (cell && !cell.cleared && cell.frozen) count++;
    }
  }
  return count;
}
