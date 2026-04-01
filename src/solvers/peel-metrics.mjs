/**
 * Peel v2 Metrics Computation (plain JS)
 * Run: node src/solvers/peel-metrics.mjs
 *
 * CI Enforcement Strategy:
 * Create "conflict rows" -- rows where 2+ peel cells share the same
 * violation-increasing mid color. When one is peeled to its mid layer,
 * it makes peeling the other one even worse. The solver MUST go through
 * a state where violations increase because both cells need to pass
 * through their bad mid layers to reach their goals.
 */

const SIZE = 5;
const MAX_COLORS = 3;

/* ─── RNG ─── */
function makeRng(seed) {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ─── Core functions ─── */
function visibleColor(grid, peeled, r, c) {
  return grid[r][c][peeled[r][c]];
}

function countViolations(state) {
  let violations = 0;
  for (let r = 0; r < SIZE; r++) {
    const counts = [0, 0, 0];
    for (let c = 0; c < SIZE; c++) {
      counts[visibleColor(state.grid, state.peeled, r, c)]++;
    }
    for (let color = 0; color < MAX_COLORS; color++) {
      violations += Math.abs(counts[color] - state.rowTargets[r][color]);
    }
  }
  for (let c = 0; c < SIZE; c++) {
    const counts = [0, 0, 0];
    for (let r = 0; r < SIZE; r++) {
      counts[visibleColor(state.grid, state.peeled, r, c)]++;
    }
    for (let color = 0; color < MAX_COLORS; color++) {
      violations += Math.abs(counts[color] - state.colTargets[c][color]);
    }
  }
  return violations;
}

function heuristic(state) { return countViolations(state); }
function isGoal(state) { return countViolations(state) === 0; }

function legalMoves(state) {
  const moves = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (state.peeled[r][c] < 2) moves.push({ r, c });
    }
  }
  return moves;
}

function applyMove(state, move) {
  const { r, c } = move;
  const newPeeled = state.peeled.map(row => [...row]);
  newPeeled[r][c] = Math.min(newPeeled[r][c] + 1, 2);
  return { ...state, peeled: newPeeled, moves: state.moves + 1 };
}

function deepCopy(state) {
  return {
    grid: state.grid.map(row => row.map(cell => [...cell])),
    peeled: state.peeled.map(row => [...row]),
    rowTargets: state.rowTargets.map(t => [...t]),
    colTargets: state.colTargets.map(t => [...t]),
    moves: state.moves,
    maxMoves: state.maxMoves,
  };
}

function stateKey(state) {
  return state.peeled.map(row => row.join('')).join('|');
}

/* ─── Solvers ─── */
function solveRandom(puzzle) {
  let state = deepCopy(puzzle);
  const moveList = [];
  let rngSeed = 42;
  function rng() {
    rngSeed |= 0;
    rngSeed = (rngSeed + 0x6d2b79f5) | 0;
    let t = Math.imul(rngSeed ^ (rngSeed >>> 15), 1 | rngSeed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  for (let i = 0; i < 50; i++) {
    if (isGoal(state)) return { moves: moveList, steps: moveList.length };
    const moves = legalMoves(state);
    if (moves.length === 0) return null;
    const move = moves[Math.floor(rng() * moves.length)];
    state = applyMove(state, move);
    moveList.push(move);
  }
  return isGoal(state) ? { moves: moveList, steps: moveList.length } : null;
}

function solveGreedy(puzzle) {
  let state = deepCopy(puzzle);
  const moveList = [];
  for (let i = 0; i < 50; i++) {
    if (isGoal(state)) return { moves: moveList, steps: moveList.length };
    const moves = legalMoves(state);
    if (moves.length === 0) return null;
    let bestMove = moves[0];
    let bestH = Infinity;
    for (const m of moves) {
      const h = heuristic(applyMove(state, m));
      if (h < bestH) { bestH = h; bestMove = m; }
    }
    state = applyMove(state, bestMove);
    moveList.push(bestMove);
  }
  return isGoal(state) ? { moves: moveList, steps: moveList.length } : null;
}

function solveGreedyLookahead(puzzle) {
  let state = deepCopy(puzzle);
  const moveList = [];
  for (let i = 0; i < 50; i++) {
    if (isGoal(state)) return { moves: moveList, steps: moveList.length };
    const moves = legalMoves(state);
    if (moves.length === 0) return null;
    let bestMove = moves[0];
    let bestScore = Infinity;
    for (const m of moves) {
      const next = applyMove(state, m);
      if (isGoal(next)) { moveList.push(m); return { moves: moveList, steps: moveList.length }; }
      const nextMoves = legalMoves(next);
      let bestNext = heuristic(next);
      for (const m2 of nextMoves) {
        bestNext = Math.min(bestNext, heuristic(applyMove(next, m2)));
      }
      if (bestNext < bestScore) { bestScore = bestNext; bestMove = m; }
    }
    state = applyMove(state, bestMove);
    moveList.push(bestMove);
  }
  return isGoal(state) ? { moves: moveList, steps: moveList.length } : null;
}

function solveBeamSearch(puzzle, beamWidth) {
  const init = deepCopy(puzzle);
  let beam = [{ state: init, moves: [], cost: 0 }];
  const visited = new Set([stateKey(init)]);

  for (let depth = 0; depth < 50; depth++) {
    const candidates = [];
    for (const entry of beam) {
      if (isGoal(entry.state)) return { moves: entry.moves, steps: entry.moves.length };
      const legal = legalMoves(entry.state);
      for (const m of legal) {
        const next = applyMove(entry.state, m);
        const key = stateKey(next);
        if (visited.has(key)) continue;
        visited.add(key);
        candidates.push({ state: next, moves: [...entry.moves, m], cost: entry.cost + 1 });
      }
    }
    if (candidates.length === 0) break;
    for (const c of candidates) {
      if (isGoal(c.state)) return { moves: c.moves, steps: c.moves.length };
    }
    candidates.sort((a, b) => (a.cost + heuristic(a.state)) - (b.cost + heuristic(b.state)));
    beam = candidates.slice(0, beamWidth);
  }
  return null;
}

function solve(puzzle, skillLevel) {
  switch (skillLevel) {
    case 1: return solveRandom(puzzle);
    case 2: return solveGreedy(puzzle);
    case 3: return solveGreedyLookahead(puzzle);
    case 4: return solveBeamSearch(puzzle, 200);
    case 5: return solveBeamSearch(puzzle, 2000);
  }
}

/* ─── Puzzle generation v2 ─── */
function generateSplit(rng) {
  const splits = [
    [1, 1, 3], [1, 3, 1], [3, 1, 1],
    [1, 2, 2], [2, 1, 2], [2, 2, 1],
  ];
  return splits[Math.floor(rng() * splits.length)];
}

function fixColumnBalance(surface, numColors, rng) {
  for (let iter = 0; iter < 200; iter++) {
    const c = Math.floor(rng() * SIZE);
    const counts = Array(numColors).fill(0);
    for (let r = 0; r < SIZE; r++) counts[surface[r][c]]++;
    let maxColor = 0, minColor = 0;
    for (let k = 1; k < numColors; k++) {
      if (counts[k] > counts[maxColor]) maxColor = k;
      if (counts[k] < counts[minColor]) minColor = k;
    }
    if (counts[maxColor] - counts[minColor] <= 1) continue;
    const rows = shuffle(Array.from({ length: SIZE }, (_, i) => i), rng);
    let swapped = false;
    for (const r of rows) {
      if (surface[r][c] !== maxColor) continue;
      const cols = shuffle(Array.from({ length: SIZE }, (_, i) => i), rng);
      for (const c2 of cols) {
        if (c2 === c) continue;
        if (surface[r][c2] === minColor) {
          [surface[r][c], surface[r][c2]] = [surface[r][c2], surface[r][c]];
          swapped = true;
          break;
        }
      }
      if (swapped) break;
    }
  }
}

function generateBalancedSurface(rng, numColors) {
  const surface = [];
  for (let r = 0; r < SIZE; r++) {
    const splits = generateSplit(rng);
    const row = [];
    for (let color = 0; color < 3; color++) {
      for (let i = 0; i < splits[color]; i++) row.push(color);
    }
    surface.push(shuffle(row, rng));
  }
  fixColumnBalance(surface, numColors, rng);
  return surface;
}

/**
 * Generate puzzle with STRUCTURAL CI enforcement.
 *
 * The approach: build the puzzle backward from the goal, specifically
 * choosing peel cell configurations that create unavoidable violation
 * increases in the optimal solution path.
 *
 * All peel cells are depth-2. Layers are:
 * - top: wrong color A (violates row and/or column)
 * - mid: wrong color B (also violates, but DIFFERENTLY)
 * - bottom: goal color
 *
 * The CI arises because:
 * With 3 colors and 5 cells per row, each peel changes the row's color
 * distribution. When a cell goes from wrong_A to wrong_B:
 * - It removes one instance of wrong_A from the row/col
 * - It adds one instance of wrong_B to the row/col
 * If wrong_A was closer to what the row needed than wrong_B, the row
 * gets worse. We explicitly choose mid colors to ensure this happens.
 *
 * Key: we choose top to be the BETTER wrong color for the row,
 * and mid to be the WORSE wrong color. This way, the first peel
 * (top->mid) necessarily increases row violations.
 */
function generatePuzzle(seed, difficulty) {
  const rng = makeRng(seed);
  const numColors = 3;

  const goalSurface = generateBalancedSurface(rng, numColors);

  const rowTargets = [];
  for (let r = 0; r < SIZE; r++) {
    const counts = [0, 0, 0];
    for (let c = 0; c < SIZE; c++) counts[goalSurface[r][c]]++;
    rowTargets.push(counts);
  }
  const colTargets = [];
  for (let c = 0; c < SIZE; c++) {
    const counts = [0, 0, 0];
    for (let r = 0; r < SIZE; r++) counts[goalSurface[r][c]]++;
    colTargets.push(counts);
  }

  const peelCounts = { 1: 4, 2: 5, 3: 6, 4: 8, 5: 10 };
  const numPeels = peelCounts[difficulty] || 6;

  const allCells = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) allCells.push([r, c]);
  }
  const shuffledCells = shuffle(allCells, rng);
  const peelCellList = shuffledCells.slice(0, Math.min(numPeels, 25));
  const peelCells = new Set(peelCellList.map(([r, c]) => `${r},${c}`));

  // Build grid with CI-maximizing layer arrangement
  const grid = [];
  for (let r = 0; r < SIZE; r++) {
    grid.push([]);
    for (let c = 0; c < SIZE; c++) {
      const goalColor = goalSurface[r][c];
      const key = `${r},${c}`;

      if (peelCells.has(key)) {
        // Get the two wrong colors
        const wrongs = [];
        for (let k = 0; k < numColors; k++) {
          if (k !== goalColor) wrongs.push(k);
        }

        // For CI enforcement: top should be the wrong color that's
        // CLOSER to what the row needs (less bad), and mid should be
        // the one that's FURTHER from what the row needs (more bad).
        // This way peeling top->mid makes things worse.
        //
        // Compute row deficit: for each wrong color, how much does adding
        // it to the row deviate from target?
        const rowCounts = [0, 0, 0];
        for (let cc = 0; cc < SIZE; cc++) {
          if (cc !== c) rowCounts[goalSurface[r][cc]]++;
        }
        // For peeled cells in this row that we already assigned, use their top
        // (approximation: we use goal colors for unprocessed cells)

        // wrongA: adding it to row -> deviation = |rowCounts[wrongA]+1 - rowTargets[r][wrongA]|
        // We want top = less bad, mid = more bad
        const deviations = wrongs.map(w => {
          return Math.abs(rowCounts[w] + 1 - rowTargets[r][w]);
        });

        let topIdx, midIdx;
        if (deviations[0] <= deviations[1]) {
          topIdx = 0; midIdx = 1; // wrongs[0] is less bad -> top; wrongs[1] is more bad -> mid
        } else {
          topIdx = 1; midIdx = 0;
        }

        const top = wrongs[topIdx];
        const mid = wrongs[midIdx];

        grid[r].push([top, mid, goalColor]);
      } else {
        // Correct cell
        let l1;
        do { l1 = Math.floor(rng() * numColors); } while (l1 === goalColor);
        let l2;
        do { l2 = Math.floor(rng() * numColors); } while (l2 === l1);
        grid[r].push([goalColor, l1, l2]);
      }
    }
  }

  const testState = {
    grid, peeled: Array.from({ length: SIZE }, () => Array(SIZE).fill(0)),
    rowTargets, colTargets, moves: 0, maxMoves: 99,
  };

  if (isGoal(testState)) return generatePuzzle(seed + 7919, difficulty);

  const sol = solve(testState, 5);
  if (!sol) return generatePuzzle(seed + 7919, difficulty);

  const buffers = { 1: 4, 2: 3, 3: 2, 4: 2, 5: 1 };
  const par = sol.steps + (buffers[difficulty] || 2);

  return {
    grid, peeled: Array.from({ length: SIZE }, () => Array(SIZE).fill(0)),
    rowTargets, colTargets, moves: 0, maxMoves: par,
  };
}

/* ─── Metrics ─── */
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const SEEDS = [100, 200, 300, 400, 500];
const DIFFICULTIES = [1, 2, 3, 4, 5];

function computeMetrics(seed, difficulty, dayName) {
  const puzzle = generatePuzzle(seed, difficulty);
  const par = puzzle.maxMoves;

  let distinctLayers = true;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const cell = puzzle.grid[r][c];
      if (cell[0] === cell[1] || cell[1] === cell[2]) distinctLayers = false;
    }
  }

  const solutions = {};
  const solveTimes = {};
  for (let level = 1; level <= 5; level++) {
    const start = Date.now();
    solutions[level] = solve(deepCopy(puzzle), level);
    solveTimes[level] = Date.now() - start;
  }

  const sol5 = solutions[5];
  const sol1 = solutions[1];
  const solvable = sol5 !== null;
  const optimalSteps = sol5 ? sol5.steps : 0;

  let puzzleEntropy = 0;
  if (sol5) {
    let state = deepCopy(puzzle);
    for (const move of sol5.moves) {
      const legal = legalMoves(state);
      if (legal.length > 0) puzzleEntropy += Math.log2(legal.length);
      state = applyMove(state, move);
    }
  }

  let skillDepth = 0;
  if (sol1 && sol5 && sol1.steps > 0) {
    skillDepth = (sol1.steps - sol5.steps) / sol1.steps;
  } else if (!sol1 && sol5) {
    skillDepth = 1.0;
  }

  let decisionEntropy = 0;
  if (sol5) {
    let state = deepCopy(puzzle);
    let totalEnt = 0;
    let steps = 0;
    for (const move of sol5.moves) {
      const legal = legalMoves(state);
      if (legal.length > 1) {
        const hVals = legal.map(m => heuristic(applyMove(state, m)));
        const minH = Math.min(...hVals);
        const weights = hVals.map(h => Math.exp(-(h - minH)));
        const sum = weights.reduce((a, b) => a + b, 0);
        const probs = weights.map(w => w / sum);
        let ent = 0;
        for (const p of probs) { if (p > 0) ent -= p * Math.log2(p); }
        totalEnt += ent;
        steps++;
      }
      state = applyMove(state, move);
    }
    decisionEntropy = steps > 0 ? totalEnt / steps : 0;
  }

  let ciMoves = 0;
  if (sol5) {
    let state = deepCopy(puzzle);
    for (const move of sol5.moves) {
      const hBefore = heuristic(state);
      const next = applyMove(state, move);
      if (heuristic(next) > hBefore) ciMoves++;
      state = next;
    }
  }

  let drama = 0;
  const sol3 = solutions[3];
  if (sol3) {
    let state = deepCopy(puzzle);
    const initialH = heuristic(state);
    let maxProgress = 0;
    for (const move of sol3.moves) {
      state = applyMove(state, move);
      const progress = initialH > 0 ? (initialH - heuristic(state)) / initialH : 0;
      maxProgress = Math.max(maxProgress, progress);
    }
    drama = maxProgress;
  }

  const durationMs = solveTimes[3] || 0;

  let infoGainRatio = 1.0;
  if (sol5) {
    let state = deepCopy(puzzle);
    let bestTotal = 0;
    let randomTotal = 0;
    let steps = 0;
    for (const move of sol5.moves) {
      const legal = legalMoves(state);
      if (legal.length > 1) {
        const hVals = legal.map(m => heuristic(applyMove(state, m)));
        const bestH = Math.min(...hVals);
        const avgH = hVals.reduce((a, b) => a + b, 0) / hVals.length;
        if (avgH > 0) { bestTotal += bestH; randomTotal += avgH; steps++; }
      }
      state = applyMove(state, move);
    }
    if (bestTotal > 0 && steps > 0) infoGainRatio = randomTotal / bestTotal;
  }

  let uniqueSolutions = 1;
  if (sol5) {
    const sol4 = solutions[4];
    if (sol4 && sol4.steps !== sol5.steps) uniqueSolutions = 2;
    if (sol3 && sol3.steps > sol5.steps) uniqueSolutions = Math.max(uniqueSolutions, 2);
  }

  return {
    day: dayName, solvable, puzzleEntropy, skillDepth, decisionEntropy,
    ciMoves, drama, durationMs, infoGainRatio, uniqueSolutions,
    optimalSteps, par, distinctLayers,
  };
}

// Run
console.log('=== Peel v2 Metrics (CI-structural) ===\n');

const allMetrics = [];
for (let i = 0; i < 5; i++) {
  const m = computeMetrics(SEEDS[i], DIFFICULTIES[i], DAY_NAMES[i]);
  allMetrics.push(m);
  console.log(`${m.day} (diff=${DIFFICULTIES[i]}, seed=${SEEDS[i]}): CI=${m.ciMoves}, optimal=${m.optimalSteps}, par=${m.par}, PE=${m.puzzleEntropy.toFixed(1)}, DE=${m.decisionEntropy.toFixed(2)}, SD=${(m.skillDepth*100).toFixed(0)}%, DL=${m.distinctLayers}`);
}

// Try many more seeds to find CI rate
console.log('\n--- Scanning seeds for CI > 0 ---');
let totalCI = 0;
let totalPuzzles = 0;
for (let diff = 1; diff <= 5; diff++) {
  let ciCount = 0;
  for (let s = 1; s <= 50; s++) {
    const m = computeMetrics(s * 137, diff, `D${diff}`);
    if (m.ciMoves > 0) ciCount++;
    totalCI += m.ciMoves;
    totalPuzzles++;
  }
  console.log(`Diff ${diff}: ${ciCount}/50 puzzles with CI>0`);
}
console.log(`Overall: ${totalCI} total CI across ${totalPuzzles} puzzles, avg=${(totalCI/totalPuzzles).toFixed(2)}`);

// Summary
const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length;

console.log('\n=== Summary Table ===\n');
console.log('| Metric | Mon | Tue | Wed | Thu | Fri | Avg |');
console.log('|---|---|---|---|---|---|---|');
console.log(`| Solvability | ${allMetrics.map(m => m.solvable ? '100%' : 'FAIL').join(' | ')} | ${allMetrics.every(m => m.solvable) ? '100%' : 'FAIL'} |`);
console.log(`| Puzzle Entropy | ${allMetrics.map(m => m.puzzleEntropy.toFixed(1)).join(' | ')} | ${avg(allMetrics.map(m => m.puzzleEntropy)).toFixed(1)} |`);
console.log(`| Skill-Depth | ${allMetrics.map(m => `${(m.skillDepth*100).toFixed(0)}%`).join(' | ')} | ${(avg(allMetrics.map(m => m.skillDepth))*100).toFixed(0)}% |`);
console.log(`| Decision Entropy | ${allMetrics.map(m => m.decisionEntropy.toFixed(2)).join(' | ')} | ${avg(allMetrics.map(m => m.decisionEntropy)).toFixed(2)} |`);
console.log(`| Counterintuitive | ${allMetrics.map(m => String(m.ciMoves)).join(' | ')} | ${avg(allMetrics.map(m => m.ciMoves)).toFixed(1)} |`);
console.log(`| Drama | ${allMetrics.map(m => m.drama.toFixed(2)).join(' | ')} | ${avg(allMetrics.map(m => m.drama)).toFixed(2)} |`);
console.log(`| Duration | ${allMetrics.map(m => `${m.durationMs}ms`).join(' | ')} | ${avg(allMetrics.map(m => m.durationMs)).toFixed(0)}ms |`);
console.log(`| Info Gain Ratio | ${allMetrics.map(m => m.infoGainRatio.toFixed(2)).join(' | ')} | ${avg(allMetrics.map(m => m.infoGainRatio)).toFixed(2)} |`);
console.log(`| Solution Uniqueness | ${allMetrics.map(m => String(m.uniqueSolutions)).join(' | ')} | ${avg(allMetrics.map(m => m.uniqueSolutions)).toFixed(1)} |`);

const ciTotal = allMetrics.reduce((a, m) => a + m.ciMoves, 0);
const killed = !allMetrics.every(m => m.solvable) || Math.min(...allMetrics.map(m => m.skillDepth)) < 0.1 || ciTotal === 0 || avg(allMetrics.map(m => m.decisionEntropy)) < 1.0 || avg(allMetrics.map(m => m.decisionEntropy)) > 4.5 || Math.min(...allMetrics.map(m => m.puzzleEntropy)) < 5;
console.log(`\n=== OVERALL: ${killed ? 'AUTO-KILLED' : 'PASSED'} ===`);
console.log(`CI total (5 official seeds): ${ciTotal}`);
