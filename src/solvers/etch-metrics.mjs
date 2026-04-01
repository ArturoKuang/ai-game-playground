/**
 * Etch quality metrics computation (plain JS)
 * Run: node src/solvers/etch-metrics.mjs
 */

/* ─── Helpers ─── */
function idx(r, c, size) { return r * size + c; }
function rowCol(index, size) { return [Math.floor(index / size), index % size]; }
function getAdj(index, size) {
  const [r, c] = rowCol(index, size);
  const adj = [];
  if (r > 0) adj.push(idx(r - 1, c, size));
  if (r < size - 1) adj.push(idx(r + 1, c, size));
  if (c > 0) adj.push(idx(r, c - 1, size));
  if (c < size - 1) adj.push(idx(r, c + 1, size));
  return adj;
}

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

/* ─── Puzzle Generation ─── */
function buildSelfAvoidingWalk(size, count, rng) {
  const totalCells = size * size;
  for (let attempt = 0; attempt < 100; attempt++) {
    const visited = new Set();
    const path = [];
    const start = Math.floor(rng() * totalCells);
    path.push(start);
    visited.add(start);

    while (path.length < count) {
      const current = path[path.length - 1];
      const adj = getAdj(current, size).filter(a => !visited.has(a));
      if (adj.length === 0) break;

      const scored = adj.map(a => ({
        cell: a,
        degree: getAdj(a, size).filter(n => !visited.has(n) && n !== current).length,
      }));
      scored.sort((a, b) => a.degree - b.degree);
      const minDegree = scored[0].degree;
      const ties = scored.filter(s => s.degree === minDegree);
      const pick = ties[Math.floor(rng() * ties.length)];
      path.push(pick.cell);
      visited.add(pick.cell);
    }

    if (path.length >= count) return path.slice(0, count);
  }
  return null;
}

function generatePuzzle(seed, difficulty) {
  const rng = makeRng(seed);
  const size = difficulty <= 2 ? 5 : difficulty <= 4 ? 6 : 7;
  const totalCells = size * size;
  const removalFraction = 0.32 + difficulty * 0.03;
  const numRemove = Math.max(6, Math.min(Math.round(totalCells * removalFraction), totalCells - size));

  let removePath = buildSelfAvoidingWalk(size, numRemove, rng);
  if (!removePath) {
    const fallbackCount = Math.max(6, Math.floor(numRemove * 0.7));
    removePath = buildSelfAvoidingWalk(size, fallbackCount, rng);
  }
  if (!removePath) {
    removePath = [];
    const visited = new Set();
    let cur = 0;
    removePath.push(cur);
    visited.add(cur);
    for (let i = 1; i < Math.min(numRemove, totalCells); i++) {
      const adj = getAdj(cur, size).filter(a => !visited.has(a));
      if (adj.length === 0) break;
      cur = adj[0];
      removePath.push(cur);
      visited.add(cur);
    }
  }

  const actualRemove = removePath.length;
  const solvedGrid = new Array(totalCells).fill(1);
  for (const cell of removePath) solvedGrid[cell] = 0;

  const rowTargets = [];
  const colTargets = [];
  for (let r = 0; r < size; r++) {
    let count = 0;
    for (let c = 0; c < size; c++) { if (solvedGrid[idx(r, c, size)] === 1) count++; }
    rowTargets.push(count);
  }
  for (let c = 0; c < size; c++) {
    let count = 0;
    for (let r = 0; r < size; r++) { if (solvedGrid[idx(r, c, size)] === 1) count++; }
    colTargets.push(count);
  }

  return { size, grid: new Array(totalCells).fill(1), rowTargets, colTargets, path: [], toRemove: actualRemove };
}

/* ─── Game Logic ─── */
function legalMoves(state) {
  const { size, grid, path } = state;
  const moves = [];
  if (path.length === 0) {
    for (let i = 0; i < size * size; i++) { if (grid[i] === 1) moves.push(i); }
    return moves;
  }
  const last = path[path.length - 1];
  for (const adj of getAdj(last, size)) {
    if (grid[adj] === 1) moves.push(adj);
  }
  return moves;
}

function applyMove(state, move) {
  const newGrid = [...state.grid];
  newGrid[move] = 0;
  return { ...state, grid: newGrid, path: [...state.path, move] };
}

function isGoal(state) {
  const { size, grid, rowTargets, colTargets, path, toRemove } = state;
  if (path.length !== toRemove) return false;
  for (let r = 0; r < size; r++) {
    let count = 0;
    for (let c = 0; c < size; c++) { if (grid[idx(r, c, size)] === 1) count++; }
    if (count !== rowTargets[r]) return false;
  }
  for (let c = 0; c < size; c++) {
    let count = 0;
    for (let r = 0; r < size; r++) { if (grid[idx(r, c, size)] === 1) count++; }
    if (count !== colTargets[c]) return false;
  }
  return true;
}

function heuristic(state) {
  const { size, grid, rowTargets, colTargets, path, toRemove } = state;
  let excess = 0;
  let damage = 0;
  for (let r = 0; r < size; r++) {
    let count = 0;
    for (let c = 0; c < size; c++) { if (grid[idx(r, c, size)] === 1) count++; }
    const diff = count - rowTargets[r];
    if (diff > 0) excess += diff;
    else if (diff < 0) damage += -diff;
  }
  for (let c = 0; c < size; c++) {
    let count = 0;
    for (let r = 0; r < size; r++) { if (grid[idx(r, c, size)] === 1) count++; }
    const diff = count - colTargets[c];
    if (diff > 0) excess += diff;
    else if (diff < 0) damage += -diff;
  }
  let mobilityPenalty = 0;
  const removalsLeft = toRemove - path.length;
  if (path.length > 0 && removalsLeft > 0) {
    const last = path[path.length - 1];
    const adjPresent = getAdj(last, size).filter(a => grid[a] === 1);
    const numMoves = adjPresent.length;
    if (numMoves === 0) mobilityPenalty = 20;
    else mobilityPenalty = 3 / numMoves;
  }
  return excess + damage * 5 + mobilityPenalty;
}

function removalValue(state, cell) {
  const { size, grid, rowTargets, colTargets } = state;
  const [r, c] = rowCol(cell, size);
  let rowCount = 0;
  for (let cc = 0; cc < size; cc++) { if (grid[idx(r, cc, size)] === 1) rowCount++; }
  let colCount = 0;
  for (let rr = 0; rr < size; rr++) { if (grid[idx(rr, c, size)] === 1) colCount++; }
  const rowExcess = rowCount - rowTargets[r];
  const colExcess = colCount - colTargets[c];
  if (rowExcess > 0 && colExcess > 0) return 4;
  if (rowExcess > 0) return 2;
  if (colExcess > 0) return 1;
  return -2;
}

/* ─── Solvers ─── */
function solveRandom(puzzle, attempts) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    let state = { ...puzzle, grid: [...puzzle.grid], path: [] };
    const moves = [];
    for (let step = 0; step <= puzzle.toRemove; step++) {
      if (isGoal(state)) return { moves, steps: moves.length };
      const legal = legalMoves(state);
      if (legal.length === 0) break;
      const move = legal[Math.floor(Math.random() * legal.length)];
      state = applyMove(state, move);
      moves.push(move);
    }
    if (isGoal(state)) return { moves, steps: moves.length };
  }
  return null;
}

function solveGreedy(puzzle) {
  const { size, rowTargets, colTargets } = puzzle;
  const candidates = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (size - rowTargets[r] > 0 && size - colTargets[c] > 0) {
        candidates.push(idx(r, c, size));
      }
    }
  }
  const starts = candidates.length > 8 ? candidates.slice(0, 8) : candidates.length > 0 ? candidates : [0];

  for (const startCell of starts) {
    let state = { ...puzzle, grid: [...puzzle.grid], path: [] };
    state = applyMove(state, startCell);
    const moves = [startCell];
    for (let step = 1; step < puzzle.toRemove; step++) {
      if (isGoal(state)) return { moves, steps: moves.length };
      const legal = legalMoves(state);
      if (legal.length === 0) break;
      let bestMove = legal[0], bestH = Infinity;
      for (const m of legal) {
        const h = heuristic(applyMove(state, m));
        if (h < bestH) { bestH = h; bestMove = m; }
      }
      state = applyMove(state, bestMove);
      moves.push(bestMove);
    }
    if (isGoal(state)) return { moves, steps: moves.length };
  }
  return null;
}

function solveGreedyLookahead(puzzle) {
  const { size, rowTargets, colTargets } = puzzle;
  const candidates = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (size - rowTargets[r] > 0 && size - colTargets[c] > 0) {
        candidates.push(idx(r, c, size));
      }
    }
  }
  const starts = candidates.length > 10 ? candidates.slice(0, 10) : candidates.length > 0 ? candidates : [0];

  for (const startCell of starts) {
    let state = { ...puzzle, grid: [...puzzle.grid], path: [] };
    state = applyMove(state, startCell);
    const moves = [startCell];
    for (let step = 1; step < puzzle.toRemove; step++) {
      if (isGoal(state)) return { moves, steps: moves.length };
      const legal = legalMoves(state);
      if (legal.length === 0) break;
      let bestMove = legal[0], bestScore = Infinity;
      for (const m of legal) {
        const next = applyMove(state, m);
        let score = heuristic(next);
        const nextLegal = legalMoves(next);
        if (nextLegal.length === 0 && next.path.length < puzzle.toRemove) {
          score += 1000;
        } else if (nextLegal.length > 0) {
          let bestNext = Infinity;
          for (const m2 of nextLegal) bestNext = Math.min(bestNext, heuristic(applyMove(next, m2)));
          score = (score + bestNext) / 2;
        }
        score -= removalValue(state, m) * 0.5;
        if (score < bestScore) { bestScore = score; bestMove = m; }
      }
      state = applyMove(state, bestMove);
      moves.push(bestMove);
    }
    if (isGoal(state)) return { moves, steps: moves.length };
  }
  return null;
}

function solveDFS(puzzle, maxNodes) {
  const { size, rowTargets, colTargets } = puzzle;
  const startScores = [];
  for (let i = 0; i < size * size; i++) {
    const [r, c] = rowCol(i, size);
    const rowNeed = size - rowTargets[r];
    const colNeed = size - colTargets[c];
    if (rowNeed > 0 && colNeed > 0) startScores.push({ cell: i, score: rowNeed + colNeed });
    else if (rowNeed > 0 || colNeed > 0) startScores.push({ cell: i, score: (rowNeed + colNeed) * 0.5 });
  }
  startScores.sort((a, b) => b.score - a.score);

  const maxStarts = Math.min(startScores.length, maxNodes > 100000 ? 20 : 8);
  const nodesPerStart = Math.floor(maxNodes / maxStarts);

  for (let si = 0; si < maxStarts; si++) {
    const startCell = startScores[si].cell;
    let nodesExplored = 0;
    let bestSolution = null;

    const initState = applyMove({ ...puzzle, grid: [...puzzle.grid], path: [] }, startCell);

    function dfs(state, moves) {
      if (nodesExplored > nodesPerStart) return false;
      nodesExplored++;

      if (state.path.length === puzzle.toRemove) {
        if (isGoal(state)) { bestSolution = { moves: [...moves], steps: moves.length }; return true; }
        return false;
      }

      for (let r = 0; r < size; r++) {
        let count = 0;
        for (let c = 0; c < size; c++) { if (state.grid[idx(r, c, size)] === 1) count++; }
        if (count < rowTargets[r]) return false;
      }
      for (let c = 0; c < size; c++) {
        let count = 0;
        for (let r = 0; r < size; r++) { if (state.grid[idx(r, c, size)] === 1) count++; }
        if (count < colTargets[c]) return false;
      }

      const legal = legalMoves(state);
      if (legal.length === 0) return false;

      const scored = legal.map(m => {
        const val = removalValue(state, m);
        const next = applyMove(state, m);
        const futureAdj = getAdj(m, size).filter(a => next.grid[a] === 1).length;
        return { move: m, value: val, futureAdj };
      });
      scored.sort((a, b) => { if (b.value !== a.value) return b.value - a.value; return b.futureAdj - a.futureAdj; });

      for (const { move } of scored) {
        const next = applyMove(state, move);
        moves.push(move);
        if (dfs(next, moves)) return true;
        moves.pop();
      }
      return false;
    }

    if (dfs(initState, [startCell])) return bestSolution;
  }
  return null;
}

function solve(puzzle, skillLevel) {
  switch (skillLevel) {
    case 1: return solveRandom(puzzle, 50);
    case 2: return solveGreedy(puzzle);
    case 3: return solveGreedyLookahead(puzzle);
    case 4: return solveDFS(puzzle, 50000);
    case 5: return solveDFS(puzzle, 2000000);
  }
}

/* ─── Metrics ─── */
const SEEDS = [42001, 42002, 42003, 42004, 42005];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const DIFFICULTIES = [1, 2, 3, 4, 5];

function computeMetrics(seed, difficulty) {
  const puzzle = generatePuzzle(seed, difficulty);

  const solutions = [];
  for (const level of [1, 2, 3, 4, 5]) {
    const sol = solve(puzzle, level);
    solutions.push({ level, sol });
  }

  const sol5 = solutions.find(s => s.level === 5)?.sol;
  const sol1 = solutions.find(s => s.level === 1)?.sol;
  const sol3 = solutions.find(s => s.level === 3)?.sol;

  const solvability = sol5 ? 1 : 0;

  let puzzleEntropy = 0;
  if (sol5) {
    let state = { ...puzzle, grid: [...puzzle.grid], path: [] };
    // First move is the first in the solution
    for (const move of sol5.moves) {
      const legal = legalMoves(state);
      if (legal.length > 1) puzzleEntropy += Math.log2(legal.length);
      state = applyMove(state, move);
    }
  }

  let skillDepth = 0;
  if (sol5 && sol1) {
    // For this game, all solutions are same length (toRemove steps).
    // Skill depth = whether lower levels can solve at all
    skillDepth = 0; // both solved, same steps
  } else if (sol5 && !sol1) {
    skillDepth = 1;
  }
  // Refine: use solve success across levels
  const solvedLevels = solutions.filter(s => s.sol !== null).map(s => s.level);
  const maxSolve = Math.max(...solvedLevels, 0);
  const minSolve = Math.min(...solvedLevels, 6);
  if (maxSolve > 0 && minSolve <= 5) {
    skillDepth = (maxSolve - minSolve) / 5;
  }
  if (sol5 && !sol1) skillDepth = Math.max(skillDepth, 0.8);

  let decisionEntropy = 0;
  if (sol5) {
    let state = { ...puzzle, grid: [...puzzle.grid], path: [] };
    let steps = 0;
    for (const move of sol5.moves) {
      const legal = legalMoves(state);
      if (legal.length > 1) { decisionEntropy += Math.log2(legal.length); steps++; }
      state = applyMove(state, move);
    }
    decisionEntropy = steps > 0 ? decisionEntropy / steps : 0;
  }

  let counterintuitive = 0;
  if (sol5) {
    let state = { ...puzzle, grid: [...puzzle.grid], path: [] };
    for (const move of sol5.moves) {
      const hBefore = heuristic(state);
      const next = applyMove(state, move);
      const hAfter = heuristic(next);
      if (hAfter > hBefore) counterintuitive++;
      state = next;
    }
  }

  let drama = 0;
  if (sol3) {
    let state = { ...puzzle, grid: [...puzzle.grid], path: [] };
    let maxProgress = 0, lastH = heuristic(state), streak = 0;
    for (const move of sol3.moves) {
      state = applyMove(state, move);
      const h = heuristic(state);
      if (h < lastH) { streak++; maxProgress = Math.max(maxProgress, streak); }
      else streak = 0;
      lastH = h;
    }
    drama = sol3.steps > 0 ? maxProgress / sol3.steps : 0;
  }

  let duration = 0;
  { const t0 = Date.now(); solve(puzzle, 3); duration = (Date.now() - t0) / 1000; }

  let infoGainRatio = 1;
  if (sol5) {
    let totalOptimal = 0, totalRandom = 0, count = 0;
    let state = { ...puzzle, grid: [...puzzle.grid], path: [] };
    for (const move of sol5.moves) {
      const legal = legalMoves(state);
      if (legal.length > 1) {
        const optimalH = heuristic(applyMove(state, move));
        let avgH = 0;
        for (const m of legal) avgH += heuristic(applyMove(state, m));
        avgH /= legal.length;
        totalOptimal += optimalH;
        totalRandom += avgH;
        count++;
      }
      state = applyMove(state, move);
    }
    if (count > 0 && totalOptimal > 0) infoGainRatio = totalRandom / totalOptimal;
  }

  let solutionUniqueness = 1;
  if (sol5) {
    const sol4 = solutions.find(s => s.level === 4)?.sol;
    if (sol4 && sol4.steps !== sol5.steps) solutionUniqueness = 2;
    else if (sol4 && sol4.steps === sol5.steps) {
      const same = sol4.moves.every((m, i) => m === sol5.moves[i]);
      if (!same) solutionUniqueness = 2;
    }
  }

  return { solvability, puzzleEntropy, skillDepth, decisionEntropy, counterintuitive, drama, duration, infoGainRatio, solutionUniqueness };
}

// Run
console.log('Etch Quality Metrics');
console.log('====================\n');

const allMetrics = [];

for (let d = 0; d < DIFFICULTIES.length; d++) {
  const diff = DIFFICULTIES[d];
  const day = DAYS[d];
  const seed = SEEDS[d];

  console.log(`--- ${day} (difficulty ${diff}, seed ${seed}) ---`);
  const puzzle = generatePuzzle(seed, diff);
  console.log(`  Grid: ${puzzle.size}x${puzzle.size}, toRemove: ${puzzle.toRemove}`);
  console.log(`  Row targets: [${puzzle.rowTargets.join(', ')}]`);
  console.log(`  Col targets: [${puzzle.colTargets.join(', ')}]`);

  const metrics = computeMetrics(seed, diff);
  allMetrics.push(metrics);

  console.log(`  Solvability: ${metrics.solvability ? 'YES' : 'NO'}`);
  console.log(`  Puzzle Entropy: ${metrics.puzzleEntropy.toFixed(1)} bits`);
  console.log(`  Skill-Depth: ${(metrics.skillDepth * 100).toFixed(1)}%`);
  console.log(`  Decision Entropy: ${metrics.decisionEntropy.toFixed(2)} bits`);
  console.log(`  Counterintuitive: ${metrics.counterintuitive}`);
  console.log(`  Drama: ${metrics.drama.toFixed(2)}`);
  console.log(`  Duration (s): ${metrics.duration.toFixed(3)}`);
  console.log(`  Info Gain Ratio: ${metrics.infoGainRatio.toFixed(2)}`);
  console.log(`  Solution Uniqueness: ${metrics.solutionUniqueness}`);

  console.log('  Skill levels:');
  for (const level of [1, 2, 3, 4, 5]) {
    const sol = solve(puzzle, level);
    console.log(`    L${level}: ${sol ? `${sol.steps} steps` : 'FAILED'}`);
  }
  console.log('');
}

console.log('--- AVERAGES ---');
const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
console.log(`Solvability: ${(avg(allMetrics.map(m => m.solvability)) * 100).toFixed(0)}%`);
console.log(`Puzzle Entropy: ${avg(allMetrics.map(m => m.puzzleEntropy)).toFixed(1)} bits`);
console.log(`Skill-Depth: ${(avg(allMetrics.map(m => m.skillDepth)) * 100).toFixed(1)}%`);
console.log(`Decision Entropy: ${avg(allMetrics.map(m => m.decisionEntropy)).toFixed(2)} bits`);
console.log(`Counterintuitive: ${avg(allMetrics.map(m => m.counterintuitive)).toFixed(1)}`);
console.log(`Drama: ${avg(allMetrics.map(m => m.drama)).toFixed(2)}`);
console.log(`Duration: ${avg(allMetrics.map(m => m.duration)).toFixed(3)}s`);
console.log(`Info Gain Ratio: ${avg(allMetrics.map(m => m.infoGainRatio)).toFixed(2)}`);
console.log(`Solution Uniqueness: ${avg(allMetrics.map(m => m.solutionUniqueness)).toFixed(1)}`);

console.log('\n--- AUTO-KILL CHECK ---');
const avgSolvability = avg(allMetrics.map(m => m.solvability));
const avgSkillDepth = avg(allMetrics.map(m => m.skillDepth));
const avgDE = avg(allMetrics.map(m => m.decisionEntropy));
const avgPE = avg(allMetrics.map(m => m.puzzleEntropy));

const kills = [];
if (avgSolvability < 1) kills.push(`Solvability ${(avgSolvability * 100).toFixed(0)}% < 100%`);
if (avgSkillDepth < 0.1) kills.push(`Skill-Depth ${(avgSkillDepth * 100).toFixed(1)}% < 10%`);
if (allMetrics.every(m => m.counterintuitive === 0)) kills.push('Counterintuitive = 0 on all puzzles');
if (avgDE < 1.0) kills.push(`Decision Entropy ${avgDE.toFixed(2)} < 1.0`);
if (avgDE > 4.5) kills.push(`Decision Entropy ${avgDE.toFixed(2)} > 4.5`);
if (avgPE < 5) kills.push(`Puzzle Entropy ${avgPE.toFixed(1)} < 5`);

if (kills.length > 0) {
  console.log('FAILED:');
  kills.forEach(k => console.log(`  - ${k}`));
} else {
  console.log('PASSED - No auto-kill thresholds hit');
}
