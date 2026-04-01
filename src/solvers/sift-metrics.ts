/**
 * Sift v3 — Quality Metrics Computation
 * Run: npx ts-node src/solvers/sift-metrics.ts
 */

import {
  SIZE,
  generatePuzzle,
  legalMoves,
  applyMove,
  isGoal,
  heuristic,
  solve,
  solveLockNaive,
  computePar,
  countViolations,
  type SiftState,
  type Move,
  type Solution,
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error .ts extension needed for node --experimental-strip-types ESM resolution
} from './Sift.solver.ts';

/* ─── Seed helpers (matching the game) ─── */
function makeSeed(day: number): number {
  const dateStr = `2026-${2}-${day}`;
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash * 31 + dateStr.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/* ─── Metric types ─── */
type DayMetrics = {
  day: string;
  difficulty: number;
  solvability: boolean[];
  solveSteps: (number | null)[];
  puzzleEntropy: number;
  skillDepth: number;
  decisionEntropy: number;
  counterintuitive: number;
  drama: number;
  durationMs: number;
  infoGainRatio: number;
  solutionUniqueness: number;
  par: number;
  naiveSteps: number | null;
  lockDensity: number;
  tilesOutOfPlace: number;
};

/* ─── Shannon entropy helper ─── */
function shannonEntropy(counts: number[]): number {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  let ent = 0;
  for (const c of counts) {
    if (c > 0) {
      const p = c / total;
      ent -= p * Math.log2(p);
    }
  }
  return ent;
}

/* ─── Compute metrics for one puzzle ─── */
function computeDayMetrics(dayLabel: string, seed: number, difficulty: number): DayMetrics {
  const puzzle = generatePuzzle(seed, difficulty);

  // Count lock density
  let lockCount = 0;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (puzzle.locks[r][c]) lockCount++;
    }
  }

  // Count tiles out of place (we need the goal grid - regenerate it)
  // We can't easily get the goal grid from the puzzle, so count violations as proxy
  const initialViolations = countViolations(puzzle.grid);

  // Solve at all 5 skill levels
  const solutions: (Solution | null)[] = [];
  const solvability: boolean[] = [];
  const solveSteps: (number | null)[] = [];

  for (let level = 1; level <= 5; level++) {
    const sol = solve(puzzle, level as 1 | 2 | 3 | 4 | 5);
    solutions.push(sol);
    solvability.push(sol !== null);
    solveSteps.push(sol ? sol.steps : null);
  }

  // Lock-naive solver for par
  const naiveSol = solveLockNaive(puzzle, 500);
  const par = computePar(puzzle, difficulty);

  // Use greedy solver (L2) for CI/drama metrics (matches player experience best)
  // The greedy solver picks the "obvious best" move, hits locks, and must reroute
  // This is more representative than beam search which can avoid locks via exploration
  const metricSol = solutions[1] || naiveSol || solutions[4]; // L2 greedy, then naive, then L5

  // Puzzle Entropy: sum of log2(legalMoves) at each step of solution
  let puzzleEntropy = 0;
  let decisionEntropySum = 0;
  let decisionSteps = 0;
  let counterintuitive = 0;
  let maxProgress = 0;
  let dramaScore = 0;
  let infoGainSum = 0;
  let infoGainCount = 0;
  let durationMs = 0;

  if (metricSol) {
    // Replay solution step by step
    let state = deepCopy(puzzle);
    // Start with zero lock knowledge (player perspective)
    state.knownLocks = Array.from({ length: SIZE }, () =>
      Array.from({ length: SIZE }, () => false)
    );
    let prevH = heuristic(state);

    const startTime = Date.now();

    for (let i = 0; i < metricSol.moves.length; i++) {
      const moves = legalMoves(state);
      const numMoves = moves.length;

      if (numMoves > 0) {
        puzzleEntropy += Math.log2(numMoves);
        decisionSteps++;

        // Decision entropy: Shannon entropy over heuristic improvements
        const heuristics = moves.map(m => heuristic(applyMove(state, m)));
        // Bin heuristic values
        const bins = new Map<number, number>();
        for (const h of heuristics) {
          bins.set(h, (bins.get(h) || 0) + 1);
        }
        const counts = Array.from(bins.values());
        decisionEntropySum += shannonEntropy(counts);

        // Info gain: best move heuristic vs average
        const bestH = Math.min(...heuristics);
        const avgH = heuristics.reduce((a, b) => a + b, 0) / heuristics.length;
        if (avgH > 0 && bestH < avgH) {
          infoGainSum += avgH / Math.max(bestH, 0.1);
          infoGainCount++;
        }
      }

      state = applyMove(state, metricSol.moves[i]);
      const curH = heuristic(state);

      // Counterintuitive: heuristic worsens (violations increase)
      if (curH > prevH) {
        counterintuitive++;
      }
      // Also count failed swaps as counterintuitive (player expected improvement, got nothing)
      const m = metricSol.moves[i];
      const wasFailed = puzzle.locks[m.r1][m.c1] || puzzle.locks[m.r2][m.c2];
      if (wasFailed && curH === prevH) {
        // Failed swap: no grid change but move wasted. This IS counterintuitive
        // from the player perspective -- they expected a beneficial swap.
        counterintuitive++;
      }

      // Drama: track progress
      const initH = heuristic(puzzle);
      const progress = initH > 0 ? 1 - curH / initH : 1;
      maxProgress = Math.max(maxProgress, progress);

      prevH = curH;
    }

    durationMs = Date.now() - startTime;

    dramaScore = metricSol.moves.length > 0 ? maxProgress : 0;
  }

  // Skill depth: (worst_steps - best_steps) / worst_steps
  const validSteps = solveSteps.filter((s): s is number => s !== null);
  const failedLevels = solveSteps.filter(s => s === null).length;
  let skillDepth = 0;
  if (validSteps.length >= 2) {
    const worst = Math.max(...validSteps);
    const best = Math.min(...validSteps);
    skillDepth = worst > 0 ? (worst - best) / worst : 0;
  }
  // If some levels fail and others succeed, that's maximum skill depth
  if (failedLevels > 0 && validSteps.length > 0) {
    skillDepth = 1.0;
  }

  // Solution uniqueness: count distinct solution lengths within +2 of optimal
  const optLen = solutions[4] ? solutions[4].steps : Infinity;
  const nearOptimal = validSteps.filter(s => s <= optLen + 2);
  const uniqueLengths = new Set(nearOptimal);

  return {
    day: dayLabel,
    difficulty,
    solvability,
    solveSteps,
    puzzleEntropy,
    skillDepth,
    decisionEntropy: decisionSteps > 0 ? decisionEntropySum / decisionSteps : 0,
    counterintuitive,
    drama: dramaScore,
    durationMs,
    infoGainRatio: infoGainCount > 0 ? infoGainSum / infoGainCount : 1.0,
    solutionUniqueness: uniqueLengths.size,
    par,
    naiveSteps: naiveSol ? naiveSol.steps : null,
    lockDensity: lockCount / (SIZE * SIZE),
    tilesOutOfPlace: initialViolations, // using violations as proxy
  };
}

/* ─── Deep copy ─── */
function deepCopy(state: SiftState): SiftState {
  return {
    grid: state.grid.map(row => row.map(t => ({ ...t }))),
    locks: state.locks.map(row => [...row]),
    knownLocks: state.knownLocks.map(row => [...row]),
    moves: state.moves,
    maxMoves: state.maxMoves,
  };
}

/* ─── Main ─── */
function main() {
  const days = [
    { label: 'Mon', seed: makeSeed(2), difficulty: 1 },
    { label: 'Tue', seed: makeSeed(3), difficulty: 2 },
    { label: 'Wed', seed: makeSeed(4), difficulty: 3 },
    { label: 'Thu', seed: makeSeed(5), difficulty: 4 },
    { label: 'Fri', seed: makeSeed(6), difficulty: 5 },
  ];

  const results: DayMetrics[] = [];

  for (const d of days) {
    console.log(`Computing ${d.label} (difficulty ${d.difficulty})...`);
    const metrics = computeDayMetrics(d.label, d.seed, d.difficulty);
    results.push(metrics);
  }

  // Print summary table
  console.log('\n=== SOLVER METRICS (v3) ===\n');

  console.log('| Metric | Mon | Tue | Wed | Thu | Fri | Avg |');
  console.log('|---|---|---|---|---|---|---|');

  // Solvability
  const solvRow = results.map(r => r.solvability[4] ? '100%' : 'FAIL');
  const solvAvg = results.filter(r => r.solvability[4]).length / results.length * 100;
  console.log(`| Solvability | ${solvRow.join(' | ')} | ${solvAvg.toFixed(0)}% |`);

  // Puzzle Entropy
  const peRow = results.map(r => r.puzzleEntropy.toFixed(1));
  const peAvg = results.reduce((a, r) => a + r.puzzleEntropy, 0) / results.length;
  console.log(`| Puzzle Entropy | ${peRow.join(' | ')} | ${peAvg.toFixed(1)} |`);

  // Skill-Depth
  const sdRow = results.map(r => (r.skillDepth * 100).toFixed(0) + '%');
  const sdAvg = results.reduce((a, r) => a + r.skillDepth, 0) / results.length * 100;
  console.log(`| Skill-Depth | ${sdRow.join(' | ')} | ${sdAvg.toFixed(0)}% |`);

  // Decision Entropy
  const deRow = results.map(r => r.decisionEntropy.toFixed(2));
  const deAvg = results.reduce((a, r) => a + r.decisionEntropy, 0) / results.length;
  console.log(`| Decision Entropy | ${deRow.join(' | ')} | ${deAvg.toFixed(2)} |`);

  // Counterintuitive
  const ciRow = results.map(r => r.counterintuitive.toString());
  const ciAvg = results.reduce((a, r) => a + r.counterintuitive, 0) / results.length;
  console.log(`| Counterintuitive | ${ciRow.join(' | ')} | ${ciAvg.toFixed(1)} |`);

  // Drama
  const drRow = results.map(r => r.drama.toFixed(2));
  const drAvg = results.reduce((a, r) => a + r.drama, 0) / results.length;
  console.log(`| Drama | ${drRow.join(' | ')} | ${drAvg.toFixed(2)} |`);

  // Duration
  const durRow = results.map(r => r.durationMs.toString());
  const durAvg = results.reduce((a, r) => a + r.durationMs, 0) / results.length;
  console.log(`| Duration (ms) | ${durRow.join(' | ')} | ${durAvg.toFixed(0)} |`);

  // Info Gain Ratio
  const igRow = results.map(r => r.infoGainRatio.toFixed(2));
  const igAvg = results.reduce((a, r) => a + r.infoGainRatio, 0) / results.length;
  console.log(`| Info Gain Ratio | ${igRow.join(' | ')} | ${igAvg.toFixed(2)} |`);

  // Solution Uniqueness
  const suRow = results.map(r => r.solutionUniqueness.toString());
  const suAvg = results.reduce((a, r) => a + r.solutionUniqueness, 0) / results.length;
  console.log(`| Solution Uniqueness | ${suRow.join(' | ')} | ${suAvg.toFixed(1)} |`);

  // Solve steps by skill level
  console.log('\n### Solve steps by skill level (v3)\n');
  console.log('| Day | L1 | L2 | L3 | L4 | L5 |');
  console.log('|---|---|---|---|---|---|');
  for (const r of results) {
    const row = r.solveSteps.map(s => s === null ? 'FAIL' : s.toString());
    console.log(`| ${r.day} | ${row.join(' | ')} |`);
  }

  // Par and lock info
  console.log('\n### Par calibration (v3)\n');
  console.log('| Day | Naive Steps | Par (naive+buffer) | Lock Density | Initial Violations |');
  console.log('|---|---|---|---|---|');
  for (const r of results) {
    console.log(`| ${r.day} | ${r.naiveSteps ?? 'FAIL'} | ${r.par} | ${(r.lockDensity * 100).toFixed(0)}% | ${r.tilesOutOfPlace} |`);
  }

  // Auto-kill checks
  console.log('\n=== AUTO-KILL CHECKS ===\n');

  const allSolvable = results.every(r => r.solvability[4]);
  console.log(`Solvability (L5): ${allSolvable ? 'PASS (100%)' : 'FAIL'}`);

  const avgSkillDepth = results.reduce((a, r) => a + r.skillDepth, 0) / results.length;
  console.log(`Skill-Depth: ${avgSkillDepth >= 0.1 ? 'PASS' : 'FAIL'} (${(avgSkillDepth * 100).toFixed(0)}%, threshold >= 10%)`);

  const totalCI = results.reduce((a, r) => a + r.counterintuitive, 0);
  console.log(`Counterintuitive Moves: ${totalCI > 0 ? 'PASS' : 'FAIL'} (${totalCI} total, threshold > 0)`);

  const avgDE = results.reduce((a, r) => a + r.decisionEntropy, 0) / results.length;
  console.log(`Decision Entropy: ${avgDE >= 1.0 && avgDE <= 4.5 ? 'PASS' : 'FAIL'} (${avgDE.toFixed(2)}, range 1.0-4.5)`);

  const avgPE = results.reduce((a, r) => a + r.puzzleEntropy, 0) / results.length;
  console.log(`Puzzle Entropy: ${avgPE >= 5 ? 'PASS' : 'FAIL'} (${avgPE.toFixed(1)}, threshold >= 5)`);

  const allPass = allSolvable && avgSkillDepth >= 0.1 && totalCI > 0 && avgDE >= 1.0 && avgDE <= 4.5 && avgPE >= 5;
  console.log(`\n**Overall: ${allPass ? 'PASSED' : 'FAILED'}**`);
}

main();
