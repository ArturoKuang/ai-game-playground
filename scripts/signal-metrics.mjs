/**
 * Signal metrics runner (optimized)
 * Runs the solver at all skill levels against 5 puzzles to compute quality metrics.
 */

const GRID_SIZE = 5;
const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;

function seededRng(seed) {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateGrid(rng, numColors) {
  const grid = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    const row = [];
    for (let c = 0; c < GRID_SIZE; c++) {
      row.push(Math.floor(rng() * numColors));
    }
    grid.push(row);
  }
  return grid;
}

function broadcast(grid, move) {
  const results = [];
  const seenColors = new Set();
  const { direction, index } = move;
  const size = grid.length;
  let cells = [];

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

function propagateConstraints(state) {
  const known = state.known.map(row => [...row]);
  const size = GRID_SIZE;
  const numColors = state.numColors;

  const possible = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => {
      if (known[r][c] !== null) return new Set([known[r][c]]);
      const s = new Set();
      for (let i = 0; i < numColors; i++) s.add(i);
      return s;
    })
  );

  for (const [, entries] of state.reveals) {
    for (const { color, row, col } of entries) {
      known[row][col] = color;
      possible[row][col] = new Set([color]);
    }
  }

  for (const [key, entries] of state.reveals) {
    const parts = key.split('-');
    const direction = parts[0];
    const index = parseInt(parts[1]);

    const cells = [];
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

    for (const entry of entries) {
      const entryIdx = cells.findIndex(c => c.row === entry.row && c.col === entry.col);
      for (let i = 0; i < entryIdx; i++) {
        possible[cells[i].row][cells[i].col].delete(entry.color);
      }
    }

    const revealedColors = new Set(entries.map(e => e.color));
    for (let colorIdx = 0; colorIdx < numColors; colorIdx++) {
      if (!revealedColors.has(colorIdx)) {
        for (const cell of cells) {
          possible[cell.row][cell.col].delete(colorIdx);
        }
      }
    }
  }

  let changed = true;
  let iterations = 0;
  while (changed && iterations < 50) {
    changed = false;
    iterations++;

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (known[r][c] === null && possible[r][c].size === 1) {
          known[r][c] = [...possible[r][c]][0];
          changed = true;
        }
      }
    }

    for (const [key, entries] of state.reveals) {
      const parts = key.split('-');
      const direction = parts[0];
      const index = parseInt(parts[1]);

      const cells = [];
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

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (known[r][c] !== null) {
          possible[r][c] = new Set([known[r][c]]);
        }
      }
    }
  }

  return known;
}

function countKnown(known) {
  let count = 0;
  for (const row of known) {
    for (const cell of row) {
      if (cell !== null) count++;
    }
  }
  return count;
}

function moveKey(m) {
  return `${m.direction}-${m.index}`;
}

function legalMoves(state) {
  const moves = [];
  const directions = ['N', 'S', 'W', 'E'];
  for (const direction of directions) {
    for (let index = 0; index < GRID_SIZE; index++) {
      const key = moveKey({ direction, index });
      if (!state.usedBroadcasts.has(key)) {
        moves.push({ direction, index });
      }
    }
  }
  return moves;
}

function applyMoveState(state, move) {
  const key = moveKey(move);
  if (state.usedBroadcasts.has(key)) return state;

  const entries = broadcast(state.hidden, move);
  const newReveals = new Map(state.reveals);
  newReveals.set(key, entries);

  const newUsed = new Set(state.usedBroadcasts);
  newUsed.add(key);

  const newState = {
    ...state,
    usedBroadcasts: newUsed,
    broadcastCount: state.broadcastCount + 1,
    reveals: newReveals,
  };

  newState.known = propagateConstraints(newState);
  return newState;
}

function isGoal(state) {
  return countKnown(state.known) === TOTAL_CELLS;
}

function heuristic(state) {
  return TOTAL_CELLS - countKnown(state.known);
}

// Cache info gains for a given state
function computeAllInfoGains(state) {
  const available = legalMoves(state);
  const currentKnown = countKnown(state.known);
  return available.map(m => {
    const nextState = applyMoveState(state, m);
    return { move: m, gain: countKnown(nextState.known) - currentKnown, nextState };
  });
}

function solveGreedy(state, lookahead = 0) {
  const moves = [];
  let current = cloneState(state);

  while (!isGoal(current)) {
    const available = legalMoves(current);
    if (available.length === 0) return null;

    let bestMove = null;
    let bestGain = -1;

    if (lookahead === 0) {
      const gains = computeAllInfoGains(current);
      for (const { move, gain } of gains) {
        if (gain > bestGain) {
          bestGain = gain;
          bestMove = move;
        }
      }
    } else {
      const gains = computeAllInfoGains(current);
      for (const { move, gain, nextState } of gains) {
        let totalGain = gain;
        if (!isGoal(nextState)) {
          const nextGains = computeAllInfoGains(nextState);
          let bestFollowup = 0;
          for (const { gain: g2 } of nextGains) {
            if (g2 > bestFollowup) bestFollowup = g2;
          }
          totalGain += bestFollowup;
        }
        if (totalGain > bestGain) {
          bestGain = totalGain;
          bestMove = move;
        }
      }
    }

    if (!bestMove) return null;
    current = applyMoveState(current, bestMove);
    moves.push(bestMove);
  }

  return { moves, steps: moves.length, cellsDeduced: TOTAL_CELLS };
}

function cloneState(state) {
  return {
    ...state,
    known: state.known.map(r => [...r]),
    usedBroadcasts: new Set(state.usedBroadcasts),
    reveals: new Map(state.reveals),
  };
}

// Optimized DFS with aggressive pruning and timeout
let dfsNodeCount = 0;
const DFS_NODE_LIMIT = 5000;

function solveOptimal(state) {
  // First get an upper bound from greedy
  const greedySol = solveGreedy(state, 1);
  const upperBound = greedySol ? greedySol.steps : 20;

  for (let maxDepth = 1; maxDepth <= upperBound; maxDepth++) {
    dfsNodeCount = 0;
    const result = dfs(state, [], maxDepth);
    if (result) return result;
    // If we exhausted the search at this depth, try next
  }
  return greedySol; // Fall back to greedy
}

function dfs(state, path, maxDepth) {
  if (isGoal(state)) {
    return { moves: [...path], steps: path.length, cellsDeduced: TOTAL_CELLS };
  }
  if (path.length >= maxDepth) return null;
  if (dfsNodeCount > DFS_NODE_LIMIT) return null;
  dfsNodeCount++;

  // Lower bound: even if each broadcast reveals max possible new cells,
  // can we reach the goal in remaining steps?
  const remaining = heuristic(state);
  const stepsLeft = maxDepth - path.length;
  // Best case: each broadcast reveals GRID_SIZE new cells (very generous)
  if (remaining > stepsLeft * GRID_SIZE) return null;

  const gains = computeAllInfoGains(state);
  // Sort by gain descending
  gains.sort((a, b) => b.gain - a.gain);

  // Only consider top 4 candidates that gain something
  const useful = gains.filter(g => g.gain > 0).slice(0, 4);
  if (useful.length === 0) return null;

  for (const { move, nextState } of useful) {
    path.push(move);
    const result = dfs(nextState, path, maxDepth);
    if (result) return result;
    path.pop();
  }

  return null;
}

function solveRandom(state, rngSeed) {
  const rng = seededRng(rngSeed);
  const moves = [];
  let current = cloneState(state);

  while (!isGoal(current)) {
    const available = legalMoves(current);
    if (available.length === 0) return null;
    const move = available[Math.floor(rng() * available.length)];
    current = applyMoveState(current, move);
    moves.push(move);
  }

  return { moves, steps: moves.length, cellsDeduced: TOTAL_CELLS };
}

function solve(puzzle, skillLevel) {
  switch (skillLevel) {
    case 1: return solveRandom(puzzle, 42);
    case 2: return solveGreedy(puzzle, 0);
    case 3: return solveGreedy(puzzle, 1);
    case 4: return solveOptimal(puzzle);
    case 5: return solveOptimal(puzzle);
    default: return null;
  }
}

function generatePuzzle(seed, difficulty) {
  const rng = seededRng(seed);
  const numColors = Math.min(3 + Math.floor((difficulty - 1) / 2), 5);

  let grid;
  for (let attempt = 0; attempt < 100; attempt++) {
    grid = generateGrid(rng, numColors);
    const colorCounts = new Array(numColors).fill(0);
    for (const row of grid) {
      for (const cell of row) colorCounts[cell]++;
    }
    if (colorCounts.every(c => c >= 1)) break;
  }

  const emptyState = {
    hidden: grid,
    known: Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null)),
    usedBroadcasts: new Set(),
    broadcastCount: 0,
    reveals: new Map(),
    numColors,
    par: 999,
  };

  // Use greedy+lookahead for par computation (fast, near-optimal)
  const greedySol = solveGreedy(emptyState, 1);
  // Then try to improve with limited DFS
  const optSol = solveOptimal(emptyState);
  const bestSol = optSol && (!greedySol || optSol.steps <= greedySol.steps) ? optSol : greedySol;
  const optimalBroadcasts = bestSol ? bestSol.steps : GRID_SIZE * 2;

  const parPadding = Math.max(0, 4 - difficulty);
  const par = optimalBroadcasts + parPadding;

  return {
    hidden: grid,
    known: Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null)),
    usedBroadcasts: new Set(),
    broadcastCount: 0,
    reveals: new Map(),
    numColors,
    par,
  };
}

// --- Main ---
console.log('Signal Solver Metrics');
console.log('=====================\n');

const seeds = [1001, 1002, 1003, 1004, 1005];
const difficulties = [1, 2, 3, 4, 5];
const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

const allResults = [];

for (let i = 0; i < 5; i++) {
  const seed = seeds[i];
  const diff = difficulties[i];
  console.log(`\n--- ${dayNames[i]} (seed=${seed}, difficulty=${diff}) ---`);

  const t0gen = performance.now();
  const puzzle = generatePuzzle(seed, diff);
  console.log(`  Generated in ${(performance.now() - t0gen).toFixed(0)}ms`);
  console.log(`  Grid (${puzzle.numColors} colors):`);
  for (const row of puzzle.hidden) {
    console.log(`    ${row.join(' ')}`);
  }
  console.log(`  Par: ${puzzle.par}`);

  const solutions = [];
  for (let level = 1; level <= 5; level++) {
    const t0 = performance.now();
    const sol = solve(puzzle, level);
    const elapsed = performance.now() - t0;
    solutions.push({ sol, elapsed });
    console.log(`  Level ${level}: ${sol ? sol.steps + ' broadcasts' : 'FAILED'} (${elapsed.toFixed(0)}ms)`);
  }

  const sol5 = solutions[4].sol;
  const sol1 = solutions[0].sol;
  const sol3 = solutions[2].sol;

  const solvable = sol5 !== null;
  const optimalSteps = sol5 ? sol5.steps : 0;
  const randomSteps = sol1 ? sol1.steps : 0;
  const skillDepth = randomSteps > 0 ? (randomSteps - optimalSteps) / randomSteps : 0;

  let puzzleEntropy = 0;
  let decisionEntropySum = 0;
  let decisionSteps = 0;
  let counterintuitiveCount = 0;
  let dramaVal = 0;

  if (sol5) {
    let state = cloneState(puzzle);
    let prevH = heuristic(state);

    for (let step = 0; step < sol5.moves.length; step++) {
      const available = legalMoves(state);
      const numMoves = available.length;

      if (numMoves > 1) {
        puzzleEntropy += Math.log2(numMoves);
        decisionSteps++;

        const gains = computeAllInfoGains(state);
        const gainValues = gains.map(g => g.gain);
        const totalGain = gainValues.reduce((a, b) => a + Math.max(b, 0.001), 0);
        let shannonEntropy = 0;
        for (const g of gainValues) {
          const p = Math.max(g, 0.001) / totalGain;
          shannonEntropy -= p * Math.log2(p);
        }
        decisionEntropySum += shannonEntropy;
      }

      const nextState = applyMoveState(state, sol5.moves[step]);
      const nextH = heuristic(nextState);

      if (nextH > prevH) {
        counterintuitiveCount++;
      }

      // Check if optimal chose a lower-gain move
      if (step < sol5.moves.length - 1) {
        const gains = computeAllInfoGains(state);
        const bestGain = Math.max(...gains.map(g => g.gain));
        const chosenKey = moveKey(sol5.moves[step]);
        const chosenEntry = gains.find(g => moveKey(g.move) === chosenKey);
        const chosenGain = chosenEntry ? chosenEntry.gain : 0;
        if (chosenGain < bestGain * 0.8 && bestGain > 0) {
          counterintuitiveCount++;
        }
      }

      const progress = (TOTAL_CELLS - nextH) / TOTAL_CELLS;
      dramaVal = Math.max(dramaVal, progress);

      prevH = nextH;
      state = nextState;
    }
  }

  const decisionEntropy = decisionSteps > 0 ? decisionEntropySum / decisionSteps : 0;

  let infoGainRatio = 1;
  if (sol5 && sol1 && sol1.steps > 0) {
    const optInfoPerStep = TOTAL_CELLS / sol5.steps;
    const randInfoPerStep = TOTAL_CELLS / sol1.steps;
    infoGainRatio = randInfoPerStep > 0 ? optInfoPerStep / randInfoPerStep : 1;
  }

  const durationSeconds = sol3 ? sol3.steps * 8 : 0;

  // Solution uniqueness
  let uniqueSolutions = 1;
  if (sol5) {
    const optLen = sol5.steps;
    const greedySol0 = solveGreedy(puzzle, 0);
    if (greedySol0 && greedySol0.steps === optLen) {
      const sameSeq = greedySol0.moves.every((m, i) =>
        m.direction === sol5.moves[i].direction && m.index === sol5.moves[i].index
      );
      if (!sameSeq) uniqueSolutions = 2;
    }
    const greedySol1 = solveGreedy(puzzle, 1);
    if (greedySol1 && greedySol1.steps === optLen) {
      const sameSeq = greedySol1.moves.every((m, i) =>
        m.direction === sol5.moves[i].direction && m.index === sol5.moves[i].index
      );
      if (!sameSeq) uniqueSolutions = Math.max(uniqueSolutions, 2);
    }
    // Also try random solves to estimate
    for (let rs = 100; rs < 110; rs++) {
      const rSol = solveRandom(puzzle, rs);
      if (rSol && rSol.steps === optLen) {
        uniqueSolutions = Math.max(uniqueSolutions, 3);
        break;
      }
    }
  }

  const metrics = {
    solvable,
    puzzleEntropy: puzzleEntropy.toFixed(1),
    skillDepth: (skillDepth * 100).toFixed(1) + '%',
    decisionEntropy: decisionEntropy.toFixed(2),
    counterintuitive: counterintuitiveCount,
    drama: dramaVal.toFixed(2),
    durationSeconds,
    infoGainRatio: infoGainRatio.toFixed(2),
    solutionUniqueness: uniqueSolutions,
    optimalSteps,
    randomSteps,
    par: puzzle.par,
  };

  allResults.push(metrics);

  console.log(`  Metrics:`);
  console.log(`    Solvable: ${metrics.solvable}`);
  console.log(`    Puzzle Entropy: ${metrics.puzzleEntropy} bits`);
  console.log(`    Skill-Depth: ${metrics.skillDepth}`);
  console.log(`    Decision Entropy: ${metrics.decisionEntropy} bits`);
  console.log(`    Counterintuitive: ${metrics.counterintuitive}`);
  console.log(`    Drama: ${metrics.drama}`);
  console.log(`    Duration (s): ${metrics.durationSeconds}`);
  console.log(`    Info Gain Ratio: ${metrics.infoGainRatio}`);
  console.log(`    Solution Uniqueness: ${metrics.solutionUniqueness}`);
  console.log(`    Optimal: ${metrics.optimalSteps}, Random: ${metrics.randomSteps}, Par: ${metrics.par}`);
}

// Summary
console.log('\n\n=== SUMMARY TABLE ===\n');
console.log('| Metric | Mon | Tue | Wed | Thu | Fri | Avg |');
console.log('|---|---|---|---|---|---|---|');

const metricNames = ['solvable', 'puzzleEntropy', 'skillDepth', 'decisionEntropy', 'counterintuitive', 'drama', 'durationSeconds', 'infoGainRatio', 'solutionUniqueness'];
const displayNames = ['Solvability', 'Puzzle Entropy', 'Skill-Depth', 'Decision Entropy', 'Counterintuitive', 'Drama', 'Duration (s)', 'Info Gain Ratio', 'Solution Uniqueness'];

for (let m = 0; m < metricNames.length; m++) {
  const key = metricNames[m];
  const values = allResults.map(r => r[key]);
  let avg;
  if (key === 'solvable') {
    avg = values.every(v => v) ? '100%' : 'FAIL';
  } else if (typeof values[0] === 'string') {
    const nums = values.map(v => parseFloat(v));
    avg = (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1);
  } else {
    avg = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
  }
  console.log(`| ${displayNames[m]} | ${values.join(' | ')} | ${avg} |`);
}

// Auto-kill checks
console.log('\n=== AUTO-KILL CHECK ===\n');

const allSolvable = allResults.every(r => r.solvable);
const avgSkillDepth = allResults.reduce((a, r) => a + parseFloat(r.skillDepth), 0) / 5;
const totalCI = allResults.reduce((a, r) => a + r.counterintuitive, 0);
const avgDE = allResults.reduce((a, r) => a + parseFloat(r.decisionEntropy), 0) / 5;
const avgPE = allResults.reduce((a, r) => a + parseFloat(r.puzzleEntropy), 0) / 5;

const checks = [];
checks.push({ name: 'Solvability < 100%', fail: !allSolvable, val: allSolvable ? '100%' : 'FAIL' });
checks.push({ name: 'Skill-Depth < 10%', fail: avgSkillDepth < 10, val: avgSkillDepth.toFixed(1) + '%' });
checks.push({ name: 'Counterintuitive = 0', fail: totalCI === 0, val: String(totalCI) });
checks.push({ name: 'Decision Entropy < 1.0', fail: avgDE < 1.0, val: avgDE.toFixed(2) });
checks.push({ name: 'Decision Entropy > 4.5', fail: avgDE > 4.5, val: avgDE.toFixed(2) });
checks.push({ name: 'Puzzle Entropy < 5', fail: avgPE < 5, val: avgPE.toFixed(1) });

for (const c of checks) {
  console.log(`${c.fail ? 'FAIL' : 'PASS'}: ${c.name} (actual: ${c.val})`);
}

const killed = checks.some(c => c.fail);
console.log(`\nResult: ${killed ? 'AUTO-KILLED' : 'PASSED'}`);
if (killed) {
  const failures = checks.filter(c => c.fail);
  console.log(`Reason: ${failures.map(f => f.name).join(', ')}`);
}
