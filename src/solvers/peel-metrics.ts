/**
 * Peel v2 Metrics Computation
 * Run with: npx ts-node src/solvers/peel-metrics.ts
 */

import {
  SIZE,
  generatePuzzle,
  solve,
  legalMoves,
  applyMove,
  isGoal,
  heuristic,
  countViolations,
  type PeelState,
  type Move,
  type Solution,
} from './Peel.solver';

function deepCopy(state: PeelState): PeelState {
  return {
    grid: state.grid.map(row => row.map(cell => [...cell] as [0|1|2, 0|1|2, 0|1|2])),
    peeled: state.peeled.map(row => [...row]),
    rowTargets: state.rowTargets.map(t => [...t] as [number, number, number]),
    colTargets: state.colTargets.map(t => [...t] as [number, number, number]),
    moves: state.moves,
    maxMoves: state.maxMoves,
  };
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const SEEDS = [100, 200, 300, 400, 500];
const DIFFICULTIES = [1, 2, 3, 4, 5];

interface DayMetrics {
  day: string;
  solvable: boolean;
  puzzleEntropy: number;
  skillDepth: number;
  decisionEntropy: number;
  ciMoves: number;
  drama: number;
  durationMs: number;
  infoGainRatio: number;
  uniqueSolutions: number;
  optimalSteps: number;
  par: number;
  distinctLayers: boolean;
}

function computeMetrics(seed: number, difficulty: number, dayName: string): DayMetrics {
  const puzzle = generatePuzzle(seed, difficulty);
  const par = puzzle.maxMoves;

  // Verify distinct layers
  let distinctLayers = true;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const cell = puzzle.grid[r][c];
      if (cell[0] === cell[1] || cell[1] === cell[2]) {
        distinctLayers = false;
      }
    }
  }

  // Solve at all 5 skill levels
  const solutions: Record<number, Solution | null> = {};
  const solveTimes: Record<number, number> = {};

  for (let level = 1; level <= 5; level++) {
    const start = Date.now();
    solutions[level] = solve(deepCopy(puzzle), level as 1|2|3|4|5);
    solveTimes[level] = Date.now() - start;
  }

  const sol5 = solutions[5];
  const sol1 = solutions[1];
  const solvable = sol5 !== null;

  // Optimal steps
  const optimalSteps = sol5 ? sol5.steps : 0;

  // Puzzle Entropy: sum of log2(legalMoves) at each step of optimal solution
  let puzzleEntropy = 0;
  if (sol5) {
    let state = deepCopy(puzzle);
    for (const move of sol5.moves) {
      const legal = legalMoves(state);
      if (legal.length > 0) {
        puzzleEntropy += Math.log2(legal.length);
      }
      state = applyMove(state, move);
    }
  }

  // Skill-Depth: (steps_level1 - steps_level5) / steps_level1
  let skillDepth = 0;
  if (sol1 && sol5 && sol1.steps > 0) {
    skillDepth = (sol1.steps - sol5.steps) / sol1.steps;
  } else if (!sol1 && sol5) {
    skillDepth = 1.0; // random can't solve it, optimal can
  }

  // Decision Entropy: avg Shannon entropy of legal moves at each step (optimal path)
  let decisionEntropy = 0;
  if (sol5) {
    let state = deepCopy(puzzle);
    let totalEnt = 0;
    let steps = 0;
    for (const move of sol5.moves) {
      const legal = legalMoves(state);
      if (legal.length > 1) {
        // Compute heuristic for each legal move, convert to probability distribution
        const hVals = legal.map(m => heuristic(applyMove(state, m)));
        const minH = Math.min(...hVals);
        const weights = hVals.map(h => Math.exp(-(h - minH)));
        const sum = weights.reduce((a, b) => a + b, 0);
        const probs = weights.map(w => w / sum);
        let ent = 0;
        for (const p of probs) {
          if (p > 0) ent -= p * Math.log2(p);
        }
        totalEnt += ent;
        steps++;
      }
      state = applyMove(state, move);
    }
    decisionEntropy = steps > 0 ? totalEnt / steps : 0;
  }

  // Counterintuitive Moves: steps where heuristic(next) > heuristic(current) in optimal
  let ciMoves = 0;
  if (sol5) {
    let state = deepCopy(puzzle);
    for (const move of sol5.moves) {
      const hBefore = heuristic(state);
      const next = applyMove(state, move);
      const hAfter = heuristic(next);
      if (hAfter > hBefore) {
        ciMoves++;
      }
      state = next;
    }
  }

  // Drama: max progress before backtrack at level 3
  let drama = 0;
  const sol3 = solutions[3];
  if (sol3) {
    let state = deepCopy(puzzle);
    const initialH = heuristic(state);
    let maxProgress = 0;
    for (const move of sol3.moves) {
      state = applyMove(state, move);
      const h = heuristic(state);
      const progress = (initialH - h) / initialH;
      maxProgress = Math.max(maxProgress, progress);
    }
    drama = maxProgress;
  }

  // Duration: solver time at level 3
  const durationMs = solveTimes[3] || 0;

  // Info Gain Ratio: compare best move vs random move entropy
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
        if (avgH > 0) {
          bestTotal += bestH;
          randomTotal += avgH;
          steps++;
        }
      }
      state = applyMove(state, move);
    }
    if (bestTotal > 0 && steps > 0) {
      infoGainRatio = randomTotal / bestTotal;
    }
  }

  // Solution Uniqueness: try multiple beam widths
  let uniqueSolutions = 1;
  if (sol5) {
    const sol4 = solutions[4];
    if (sol4 && sol4.steps !== sol5.steps) {
      uniqueSolutions = 2;
    }
    // Also check if sol3 differs
    if (sol3 && sol3.steps === sol5.steps) {
      // Same optimal length via different method -> likely unique
    } else if (sol3 && sol3.steps > sol5.steps) {
      uniqueSolutions = Math.max(uniqueSolutions, 2);
    }
  }

  return {
    day: dayName,
    solvable,
    puzzleEntropy,
    skillDepth,
    decisionEntropy,
    ciMoves,
    drama,
    durationMs,
    infoGainRatio,
    uniqueSolutions,
    optimalSteps,
    par,
    distinctLayers,
  };
}

// Run metrics
console.log('=== Peel v2 Metrics ===\n');

const allMetrics: DayMetrics[] = [];
for (let i = 0; i < 5; i++) {
  const m = computeMetrics(SEEDS[i], DIFFICULTIES[i], DAY_NAMES[i]);
  allMetrics.push(m);
  console.log(`${m.day} (diff=${DIFFICULTIES[i]}, seed=${SEEDS[i]}):`);
  console.log(`  Solvable: ${m.solvable}`);
  console.log(`  Optimal steps: ${m.optimalSteps}, Par: ${m.par}`);
  console.log(`  Puzzle Entropy: ${m.puzzleEntropy.toFixed(1)}`);
  console.log(`  Skill-Depth: ${(m.skillDepth * 100).toFixed(0)}%`);
  console.log(`  Decision Entropy: ${m.decisionEntropy.toFixed(2)}`);
  console.log(`  CI Moves: ${m.ciMoves}`);
  console.log(`  Drama: ${m.drama.toFixed(2)}`);
  console.log(`  Duration: ${m.durationMs}ms`);
  console.log(`  Info Gain Ratio: ${m.infoGainRatio.toFixed(2)}`);
  console.log(`  Unique Solutions: ${m.uniqueSolutions}`);
  console.log(`  Distinct Layers: ${m.distinctLayers}`);
  console.log();
}

// Summary
console.log('\n=== Summary Table ===\n');
console.log('| Metric | Mon | Tue | Wed | Thu | Fri | Avg |');
console.log('|---|---|---|---|---|---|---|');

const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

const solvRow = allMetrics.map(m => m.solvable ? '100%' : 'FAIL');
console.log(`| Solvability | ${solvRow.join(' | ')} | ${allMetrics.every(m => m.solvable) ? '100%' : 'FAIL'} |`);

const peRow = allMetrics.map(m => m.puzzleEntropy.toFixed(1));
console.log(`| Puzzle Entropy | ${peRow.join(' | ')} | ${avg(allMetrics.map(m => m.puzzleEntropy)).toFixed(1)} |`);

const sdRow = allMetrics.map(m => `${(m.skillDepth * 100).toFixed(0)}%`);
console.log(`| Skill-Depth | ${sdRow.join(' | ')} | ${(avg(allMetrics.map(m => m.skillDepth)) * 100).toFixed(0)}% |`);

const deRow = allMetrics.map(m => m.decisionEntropy.toFixed(2));
console.log(`| Decision Entropy | ${deRow.join(' | ')} | ${avg(allMetrics.map(m => m.decisionEntropy)).toFixed(2)} |`);

const ciRow = allMetrics.map(m => String(m.ciMoves));
console.log(`| Counterintuitive | ${ciRow.join(' | ')} | ${avg(allMetrics.map(m => m.ciMoves)).toFixed(1)} |`);

const drRow = allMetrics.map(m => m.drama.toFixed(2));
console.log(`| Drama | ${drRow.join(' | ')} | ${avg(allMetrics.map(m => m.drama)).toFixed(2)} |`);

const durRow = allMetrics.map(m => `${m.durationMs}ms`);
console.log(`| Duration | ${durRow.join(' | ')} | ${avg(allMetrics.map(m => m.durationMs)).toFixed(0)}ms |`);

const igrRow = allMetrics.map(m => m.infoGainRatio.toFixed(2));
console.log(`| Info Gain Ratio | ${igrRow.join(' | ')} | ${avg(allMetrics.map(m => m.infoGainRatio)).toFixed(2)} |`);

const usRow = allMetrics.map(m => String(m.uniqueSolutions));
console.log(`| Solution Uniqueness | ${usRow.join(' | ')} | ${avg(allMetrics.map(m => m.uniqueSolutions)).toFixed(1)} |`);

// Auto-kill checks
console.log('\n=== Auto-Kill Checks ===\n');
const solvability = allMetrics.every(m => m.solvable);
const skillDepthMin = Math.min(...allMetrics.map(m => m.skillDepth));
const ciMin = Math.min(...allMetrics.map(m => m.ciMoves));
const ciTotal = allMetrics.reduce((a, m) => a + m.ciMoves, 0);
const deAvg = avg(allMetrics.map(m => m.decisionEntropy));
const peMin = Math.min(...allMetrics.map(m => m.puzzleEntropy));

console.log(`Solvability: ${solvability ? 'PASS (100%)' : 'FAIL'}`);
console.log(`Skill-Depth min: ${(skillDepthMin * 100).toFixed(0)}% ${skillDepthMin >= 0.1 ? 'PASS' : 'FAIL (< 10%)'}`);
console.log(`CI moves total: ${ciTotal} ${ciTotal > 0 ? 'PASS' : 'FAIL (= 0 across all puzzles)'}`);
console.log(`CI per day: ${allMetrics.map(m => `${m.day}=${m.ciMoves}`).join(', ')}`);
console.log(`Decision Entropy avg: ${deAvg.toFixed(2)} ${deAvg >= 1.0 && deAvg <= 4.5 ? 'PASS' : 'FAIL'}`);
console.log(`Puzzle Entropy min: ${peMin.toFixed(1)} ${peMin >= 5 ? 'PASS' : 'FAIL (< 5)'}`);

const allDistinct = allMetrics.every(m => m.distinctLayers);
console.log(`\nDistinct adjacent layers: ${allDistinct ? 'ALL PASS' : 'SOME FAIL'}`);

const killed = !solvability || skillDepthMin < 0.1 || ciTotal === 0 || deAvg < 1.0 || deAvg > 4.5 || peMin < 5;
console.log(`\n=== OVERALL: ${killed ? 'AUTO-KILLED' : 'PASSED'} ===`);
