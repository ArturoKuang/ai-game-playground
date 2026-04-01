/**
 * Compute quality metrics for Fuse solver.
 * 5 puzzles (Mon-Fri seeds), 5 skill levels each.
 */

/* ─── Helpers ─── */
function cloneGrid(grid) {
  return grid.map((row) => row.map((c) => (c ? { ...c } : null)));
}
function cloneState(s) {
  return { grid: cloneGrid(s.grid), rows: s.rows, cols: s.cols, ignitionsUsed: s.ignitionsUsed, par: s.par };
}
function bombCount(grid) {
  let n = 0;
  for (const row of grid) for (const c of row) if (c) n++;
  return n;
}
function adj4(r, c, rows, cols) {
  const out = [];
  if (r > 0) out.push([r - 1, c]);
  if (r < rows - 1) out.push([r + 1, c]);
  if (c > 0) out.push([r, c - 1]);
  if (c < cols - 1) out.push([r, c + 1]);
  return out;
}

/* CASCADE: exploding bomb (timer T) ignites adjacent same-color with timer <= T */
function simulateCascade(grid, rows, cols, igniteTargets) {
  const g = cloneGrid(grid);
  const ticking = new Map();
  for (const { r, c } of igniteTargets) {
    const cell = g[r][c];
    if (!cell) continue;
    const key = `${r},${c}`;
    if (!ticking.has(key)) ticking.set(key, { remaining: cell.timer, power: cell.timer });
  }
  let safety = 200;
  while (ticking.size > 0 && safety-- > 0) {
    let minTicks = Infinity;
    for (const { remaining } of ticking.values()) if (remaining < minTicks) minTicks = remaining;
    const exploding = [];
    const newTicking = new Map();
    for (const [key, info] of ticking) {
      const rem = info.remaining - minTicks;
      if (rem <= 0) {
        const [rs, cs] = key.split(',').map(Number);
        const cell = g[rs][cs];
        if (cell) exploding.push({ r: rs, c: cs, color: cell.color, power: info.power });
      } else {
        newTicking.set(key, { remaining: rem, power: info.power });
      }
    }
    for (const { r, c, color, power } of exploding) {
      g[r][c] = null;
      for (const [nr, nc] of adj4(r, c, rows, cols)) {
        const neighbor = g[nr][nc];
        if (neighbor && neighbor.color === color && neighbor.timer <= power) {
          const nkey = `${nr},${nc}`;
          if (!newTicking.has(nkey)) {
            newTicking.set(nkey, { remaining: neighbor.timer, power: neighbor.timer });
          }
        }
      }
    }
    ticking.clear();
    for (const [k, v] of newTicking) ticking.set(k, v);
  }
  return g;
}

function isGoal(state) { return bombCount(state.grid) === 0; }

function legalMoves(state) {
  const moves = [];
  for (let r = 0; r < state.rows; r++)
    for (let c = 0; c < state.cols; c++)
      if (state.grid[r][c]) moves.push({ r, c });
  return moves;
}

function applyMove(state, move) {
  const newGrid = simulateCascade(state.grid, state.rows, state.cols, [move]);
  return { grid: newGrid, rows: state.rows, cols: state.cols, ignitionsUsed: state.ignitionsUsed + 1, par: state.par };
}

function heuristic(state) { return bombCount(state.grid); }

function ignitionYield(grid, rows, cols, r, c) {
  const before = bombCount(grid);
  const after = bombCount(simulateCascade(grid, rows, cols, [{ r, c }]));
  return before - after;
}

function gridKey(grid) {
  const parts = [];
  for (const row of grid)
    for (const cell of row)
      parts.push(cell ? `${cell.color}:${cell.timer}` : '_');
  return parts.join(',');
}

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

/* ─── Constructive Puzzle Generation ─── */
function generatePuzzle(seed, difficulty) {
  const rng = makeRng(seed);
  const rows = difficulty <= 2 ? 4 : 5;
  const cols = difficulty <= 2 ? 4 : 5;
  const numColors = difficulty <= 1 ? 2 : difficulty <= 2 ? 2 : difficulty <= 3 ? 3 : 4;
  const numRoots = difficulty <= 1 ? 3 : difficulty <= 2 ? 4 : difficulty <= 3 ? 5 : difficulty <= 4 ? 6 : 7;
  const minChain = 2;
  const maxChain = difficulty <= 2 ? 3 : 4;

  const grid = Array.from({ length: rows }, () => Array(cols).fill(null));
  const occupied = new Set();

  function findEmpty() {
    const options = [];
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        if (!occupied.has(`${r},${c}`)) options.push([r, c]);
    if (options.length === 0) return null;
    return options[Math.floor(rng() * options.length)];
  }

  function findEmptyAdjacentTo(r, c) {
    const opts = adj4(r, c, rows, cols).filter(([nr, nc]) => !occupied.has(`${nr},${nc}`));
    if (opts.length === 0) return null;
    return opts[Math.floor(rng() * opts.length)];
  }

  for (let chain = 0; chain < numRoots; chain++) {
    const color = chain % numColors;
    const chainLen = minChain + Math.floor(rng() * (maxChain - minChain + 1));
    const rootPos = findEmpty();
    if (!rootPos) break;
    const [rr, rc] = rootPos;
    const rootTimer = 3 + Math.floor(rng() * 2);
    grid[rr][rc] = { color, timer: rootTimer };
    occupied.add(`${rr},${rc}`);

    let prevR = rr, prevC = rc, prevTimer = rootTimer;
    for (let step = 1; step < chainLen; step++) {
      const nextPos = findEmptyAdjacentTo(prevR, prevC);
      if (!nextPos) break;
      const [nr, nc] = nextPos;
      const timer = Math.max(1, prevTimer - Math.floor(rng() * 2));
      grid[nr][nc] = { color, timer };
      occupied.add(`${nr},${nc}`);
      prevR = nr; prevC = nc; prevTimer = timer;
    }
  }

  // Add decoy bombs (isolated, timer 1, won't cascade from roots)
  const totalBombs = bombCount(grid);
  const targetDecoys = Math.max(2, Math.floor(totalBombs * 0.3));
  let decoysPlaced = 0;
  for (let attempt = 0; attempt < 100 && decoysPlaced < targetDecoys; attempt++) {
    const pos = findEmpty();
    if (!pos) break;
    const [dr, dc] = pos;
    const color = Math.floor(rng() * numColors);
    const hasSameColorNeighbor = adj4(dr, dc, rows, cols).some(
      ([nr, nc]) => grid[nr][nc] && grid[nr][nc].color === color
    );
    if (!hasSameColorNeighbor) {
      grid[dr][dc] = { color, timer: 1 };
      occupied.add(`${dr},${dc}`);
      decoysPlaced++;
    }
  }

  const state = { grid, rows, cols, ignitionsUsed: 0, par: 99 };
  const sol = solveExhaustive(state, 500000);
  const optimalIgnitions = sol ? sol.steps : numRoots + decoysPlaced;
  const parBuffer = difficulty <= 1 ? 3 : difficulty <= 3 ? 2 : 1;
  const par = optimalIgnitions + parBuffer;
  return { grid, rows, cols, ignitionsUsed: 0, par };
}

/* ─── Solvers ─── */
function solveGreedy(state) {
  let current = cloneState(state);
  const moves = [];
  let safety = 50;
  while (!isGoal(current) && safety-- > 0) {
    const legal = legalMoves(current);
    if (legal.length === 0) break;
    let bestMove = legal[0], bestYield = 0;
    for (const m of legal) {
      const y = ignitionYield(current.grid, current.rows, current.cols, m.r, m.c);
      if (y > bestYield) { bestYield = y; bestMove = m; }
    }
    moves.push(bestMove);
    current = applyMove(current, bestMove);
  }
  if (isGoal(current)) return { moves, steps: moves.length };
  return null;
}

function solveGreedyLookahead(state, depth) {
  let current = cloneState(state);
  const moves = [];
  let safety = 50;
  while (!isGoal(current) && safety-- > 0) {
    const legal = legalMoves(current);
    if (legal.length === 0) break;
    let bestMove = legal[0], bestScore = -Infinity;
    for (const m of legal) {
      const next = applyMove(current, m);
      let score = bombCount(current.grid) - bombCount(next.grid);
      if (depth > 1 && !isGoal(next)) {
        const legal2 = legalMoves(next);
        let bestNext = 0;
        for (const m2 of legal2) {
          const y2 = ignitionYield(next.grid, next.rows, next.cols, m2.r, m2.c);
          if (y2 > bestNext) bestNext = y2;
        }
        score += bestNext * 0.5;
      }
      if (score > bestScore) { bestScore = score; bestMove = m; }
    }
    moves.push(bestMove);
    current = applyMove(current, bestMove);
  }
  if (isGoal(current)) return { moves, steps: moves.length };
  return null;
}

function solveExhaustive(state, maxNodes) {
  const ctx = { best: null, nodes: 0 };
  function dfs(current, moves, depthLimit) {
    if (ctx.nodes >= maxNodes) return;
    ctx.nodes++;
    if (isGoal(current)) {
      if (!ctx.best || moves.length < ctx.best.steps)
        ctx.best = { moves: [...moves], steps: moves.length };
      return;
    }
    if (moves.length >= depthLimit) return;
    if (ctx.best && moves.length >= ctx.best.steps - 1) return;
    const legal = legalMoves(current);
    if (legal.length === 0) return;
    const scored = legal.map((m) => ({
      move: m, yield: ignitionYield(current.grid, current.rows, current.cols, m.r, m.c)
    }));
    scored.sort((a, b) => b.yield - a.yield);
    const seenOutcomes = new Set();
    for (const { move } of scored) {
      const next = applyMove(current, move);
      const key = gridKey(next.grid);
      if (seenOutcomes.has(key)) continue;
      seenOutcomes.add(key);
      moves.push(move);
      dfs(next, moves, depthLimit);
      moves.pop();
    }
  }
  const greedySol = solveGreedy(state);
  const maxDepth = greedySol ? greedySol.steps : 15;
  for (let d = 1; d <= maxDepth; d++) {
    dfs(cloneState(state), [], d);
    if (ctx.best && ctx.best.steps <= d) break;
    if (ctx.nodes >= maxNodes) break;
  }
  return ctx.best;
}

function solveRandom(state) {
  let current = cloneState(state);
  const moves = [];
  let safety = 50;
  while (!isGoal(current) && safety-- > 0) {
    const legal = legalMoves(current);
    if (legal.length === 0) break;
    const move = legal[Math.floor(Math.random() * legal.length)];
    moves.push(move);
    current = applyMove(current, move);
  }
  if (isGoal(current)) return { moves, steps: moves.length };
  return null;
}

function solve(puzzle, skillLevel) {
  switch (skillLevel) {
    case 1: return solveRandom(puzzle);
    case 2: return solveGreedy(puzzle);
    case 3: return solveGreedyLookahead(puzzle, 2);
    case 4: return solveExhaustive(puzzle, 50000);
    case 5: return solveExhaustive(puzzle, 2000000);
  }
}

/* ─── Metrics Computation ─── */
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const SEEDS = [42001, 42002, 42003, 42004, 42005];
const DIFFICULTIES = [1, 2, 3, 4, 5];

function computeMetrics() {
  const results = [];

  for (let dayIdx = 0; dayIdx < 5; dayIdx++) {
    const seed = SEEDS[dayIdx];
    const diff = DIFFICULTIES[dayIdx];
    const day = DAYS[dayIdx];

    console.log(`\n=== ${day} (seed=${seed}, difficulty=${diff}) ===`);
    const puzzle = generatePuzzle(seed, diff);
    console.log(`  Grid: ${puzzle.rows}x${puzzle.cols}, Bombs: ${bombCount(puzzle.grid)}, Par: ${puzzle.par}`);

    const solutions = {};
    for (let sl = 1; sl <= 5; sl++) {
      if (sl === 1) {
        let bestRandom = null;
        for (let trial = 0; trial < 10; trial++) {
          const sol = solve(puzzle, 1);
          if (sol && (!bestRandom || sol.steps < bestRandom.steps)) bestRandom = sol;
        }
        solutions[sl] = bestRandom;
      } else {
        solutions[sl] = solve(puzzle, sl);
      }
      const sol = solutions[sl];
      console.log(`  Skill ${sl}: ${sol ? `${sol.steps} ignitions` : 'FAILED'}`);
    }

    const solvable = solutions[5] !== null;
    const s5 = solutions[5] ? solutions[5].steps : null;
    const s1 = solutions[1] ? solutions[1].steps : null;
    let skillDepth = null;
    if (s5 && s1) skillDepth = (s1 - s5) / s1;

    let puzzleEntropy = 0;
    if (solutions[5]) {
      let st = cloneState(puzzle);
      for (const move of solutions[5].moves) {
        const numMoves = legalMoves(st).length;
        if (numMoves > 1) puzzleEntropy += Math.log2(numMoves);
        st = applyMove(st, move);
      }
    }

    let decisionEntropy = 0;
    if (solutions[5]) {
      let st = cloneState(puzzle);
      let steps = 0;
      for (const move of solutions[5].moves) {
        const legal = legalMoves(st);
        if (legal.length > 1) decisionEntropy += Math.log2(legal.length);
        steps++;
        st = applyMove(st, move);
      }
      decisionEntropy = steps > 0 ? decisionEntropy / steps : 0;
    }

    let ciMoves = 0;
    if (solutions[5]) {
      let st = cloneState(puzzle);
      for (const move of solutions[5].moves) {
        const legal = legalMoves(st);
        let maxYield = 0;
        for (const m of legal) {
          const y = ignitionYield(st.grid, st.rows, st.cols, m.r, m.c);
          if (y > maxYield) maxYield = y;
        }
        const chosenYield = ignitionYield(st.grid, st.rows, st.cols, move.r, move.c);
        if (chosenYield < maxYield) ciMoves++;
        st = applyMove(st, move);
      }
    }

    let drama = 0;
    if (solutions[3]) {
      let st = cloneState(puzzle);
      const totalBombs = bombCount(puzzle.grid);
      let maxProgress = 0;
      for (const move of solutions[3].moves) {
        st = applyMove(st, move);
        const cleared = totalBombs - bombCount(st.grid);
        maxProgress = Math.max(maxProgress, cleared / totalBombs);
      }
      drama = maxProgress;
    }

    let durationMs = 0;
    { const t0 = Date.now(); solve(puzzle, 3); durationMs = Date.now() - t0; }

    let infoGainRatio = 0;
    if (solutions[5]) {
      let st = cloneState(puzzle);
      let ratioSum = 0, steps = 0;
      for (const move of solutions[5].moves) {
        const legal = legalMoves(st);
        const chosenYield = ignitionYield(st.grid, st.rows, st.cols, move.r, move.c);
        let avgYield = 0;
        for (const m of legal) avgYield += ignitionYield(st.grid, st.rows, st.cols, m.r, m.c);
        avgYield /= legal.length;
        if (avgYield > 0) ratioSum += chosenYield / avgYield;
        steps++;
        st = applyMove(st, move);
      }
      infoGainRatio = steps > 0 ? ratioSum / steps : 0;
    }

    let solutionUniqueness = 1;
    if (solutions[5]) {
      const optSteps = solutions[5].steps;
      const distinctSolutions = new Set();
      distinctSolutions.add(solutions[5].moves.map(m => `${m.r},${m.c}`).join(';'));
      const ctx2 = { nodes: 0 };
      function dfs2(current, moves, depthLimit) {
        if (ctx2.nodes >= 10000) return;
        ctx2.nodes++;
        if (isGoal(current)) {
          if (moves.length <= optSteps + 1) {
            distinctSolutions.add(moves.map(m => `${m.r},${m.c}`).join(';'));
          }
          return;
        }
        if (moves.length >= depthLimit) return;
        const legal = legalMoves(current);
        const seenOutcomes = new Set();
        for (const m of legal) {
          const next = applyMove(current, m);
          const key = gridKey(next.grid);
          if (seenOutcomes.has(key)) continue;
          seenOutcomes.add(key);
          moves.push(m);
          dfs2(next, moves, depthLimit);
          moves.pop();
        }
      }
      dfs2(cloneState(puzzle), [], optSteps + 1);
      solutionUniqueness = distinctSolutions.size;
    }

    results.push({
      day, solvable,
      puzzleEntropy: puzzleEntropy.toFixed(1),
      skillDepth: skillDepth !== null ? (skillDepth * 100).toFixed(0) + '%' : 'N/A',
      decisionEntropy: decisionEntropy.toFixed(2),
      ciMoves, drama: drama.toFixed(2),
      durationMs, infoGainRatio: infoGainRatio.toFixed(2),
      solutionUniqueness,
      optimalSteps: s5, randomSteps: s1, par: puzzle.par,
    });
  }

  console.log('\n\n============ SOLVER METRICS SUMMARY ============\n');
  console.log('| Metric | Mon | Tue | Wed | Thu | Fri | Avg |');
  console.log('|---|---|---|---|---|---|---|');

  const metrics = [
    { name: 'Solvability', key: 'solvable', fmt: v => v ? '100%' : 'FAIL' },
    { name: 'Puzzle Entropy', key: 'puzzleEntropy', fmt: v => v },
    { name: 'Skill-Depth', key: 'skillDepth', fmt: v => v },
    { name: 'Decision Entropy', key: 'decisionEntropy', fmt: v => v },
    { name: 'Counterintuitive', key: 'ciMoves', fmt: v => String(v) },
    { name: 'Drama', key: 'drama', fmt: v => v },
    { name: 'Duration (ms)', key: 'durationMs', fmt: v => String(v) },
    { name: 'Info Gain Ratio', key: 'infoGainRatio', fmt: v => v },
    { name: 'Solution Uniqueness', key: 'solutionUniqueness', fmt: v => String(v) },
  ];

  for (const m of metrics) {
    const vals = results.map(r => m.fmt(r[m.key]));
    const numVals = results.map(r => {
      const v = r[m.key];
      if (typeof v === 'boolean') return v ? 100 : 0;
      if (typeof v === 'string') return parseFloat(v) || 0;
      return v;
    });
    let avg = (numVals.reduce((a, b) => a + b, 0) / numVals.length).toFixed(1);
    if (m.key === 'solvable') avg = numVals.every(v => v === 100) ? '100%' : 'FAIL';
    if (m.key === 'skillDepth') avg = (numVals.reduce((a, b) => a + b, 0) / numVals.length).toFixed(0) + '%';
    console.log(`| ${m.name} | ${vals.join(' | ')} | ${avg} |`);
  }

  console.log('\n============ AUTO-KILL CHECKS ============\n');
  const allSolvable = results.every(r => r.solvable);
  const avgSkillDepth = results.reduce((sum, r) => sum + (parseFloat(r.skillDepth) || 0), 0) / results.length;
  const totalCI = results.reduce((sum, r) => sum + r.ciMoves, 0);
  const avgDecEnt = results.reduce((sum, r) => sum + parseFloat(r.decisionEntropy), 0) / results.length;
  const avgPuzzleEnt = results.reduce((sum, r) => sum + parseFloat(r.puzzleEntropy), 0) / results.length;

  const checks = [
    { name: 'Solvability < 100%', pass: allSolvable, value: allSolvable ? '100%' : 'FAIL' },
    { name: 'Skill-Depth < 10%', pass: avgSkillDepth >= 10, value: avgSkillDepth.toFixed(0) + '%' },
    { name: 'CI Moves = 0 (all puzzles)', pass: totalCI > 0, value: `${totalCI} total` },
    { name: 'Decision Entropy < 1.0', pass: avgDecEnt >= 1.0, value: avgDecEnt.toFixed(2) },
    { name: 'Decision Entropy > 4.5', pass: avgDecEnt <= 4.5, value: avgDecEnt.toFixed(2) },
    { name: 'Puzzle Entropy < 5', pass: avgPuzzleEnt >= 5, value: avgPuzzleEnt.toFixed(1) },
  ];

  let killed = false;
  for (const check of checks) {
    const status = check.pass ? 'PASS' : 'FAIL (AUTO-KILL)';
    console.log(`  ${check.name}: ${check.value} -- ${status}`);
    if (!check.pass) killed = true;
  }
  console.log(`\n  OVERALL: ${killed ? 'AUTO-KILLED' : 'PASSED'}`);

  console.log('\n============ PUZZLE DETAILS ============\n');
  for (const r of results) {
    console.log(`  ${r.day}: optimal=${r.optimalSteps} ign, random=${r.randomSteps} ign, par=${r.par}`);
  }
}

computeMetrics();
