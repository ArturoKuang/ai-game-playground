/**
 * Flock Solver Metrics
 *
 * Compute quality metrics across 5 puzzles (Mon-Fri seeds) at 5 skill levels.
 */

import {
  generatePuzzle,
  solve,
  isGoal,
  heuristic,
  legalMoves,
  applyMove,
  computePuzzleEntropy,
  computeDecisionEntropy,
  countCounterintuitiveMoves,
  computeDrama,
  computeInfoGainRatio,
  countUniqueSolutions,
  type FlockState,
  type Solution,
  type Move,
} from '../src/solvers/Flock.solver';

// Seeds for Mon-Fri (using consistent seed values)
const SEEDS = [1001, 1002, 1003, 1004, 1005];
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const DIFFICULTIES = [1, 2, 3, 4, 5];

type PuzzleMetrics = {
  solvability: boolean[];
  puzzleEntropy: number;
  skillDepth: number;
  decisionEntropy: number;
  counterintuitive: number;
  drama: number;
  durationS: number;
  infoGainRatio: number;
  solutionUniqueness: number;
  optimalSteps: number;
  skillScores: (number | null)[];
};

function computeMetricsForPuzzle(seed: number, difficulty: number): PuzzleMetrics {
  const puzzle = generatePuzzle(seed, difficulty);

  // Solve at all 5 skill levels
  const solutions: (Solution | null)[] = [];
  const solvability: boolean[] = [];
  const skillScores: (number | null)[] = [];

  for (const sl of [1, 2, 3, 4, 5] as const) {
    // Run multiple random attempts for level 1
    let sol: Solution | null = null;
    if (sl === 1) {
      for (let attempt = 0; attempt < 10; attempt++) {
        sol = solve(puzzle, sl);
        if (sol) break;
      }
    } else {
      sol = solve(puzzle, sl);
    }
    solutions.push(sol);
    solvability.push(sol !== null);
    skillScores.push(sol ? sol.steps : null);
  }

  // Use optimal solution (level 5) for most metrics
  const optimal = solutions[4];
  if (!optimal) {
    return {
      solvability,
      puzzleEntropy: 0,
      skillDepth: 0,
      decisionEntropy: 0,
      counterintuitive: 0,
      drama: 0,
      durationS: 0,
      infoGainRatio: 1,
      solutionUniqueness: 0,
      optimalSteps: 0,
      skillScores,
    };
  }

  const puzzleEntropy = computePuzzleEntropy(puzzle, optimal);
  const decisionEntropy = computeDecisionEntropy(puzzle, optimal);
  const counterintuitive = countCounterintuitiveMoves(puzzle, optimal);

  // Drama: use level 3 solution
  const level3Sol = solutions[2];
  const drama = level3Sol ? computeDrama(puzzle, level3Sol) : 0;

  // Duration: measure solver time at level 3
  const t0 = Date.now();
  solve(puzzle, 3);
  const durationS = (Date.now() - t0) / 1000;

  // Info gain ratio at each step, average
  let totalIGR = 0;
  let igrSteps = 0;
  let current = { ...puzzle, birds: puzzle.birds.map(b => ({ ...b, pos: { ...b.pos } })) };
  for (const move of optimal.moves) {
    const igr = computeInfoGainRatio(current);
    totalIGR += igr;
    igrSteps++;
    current = applyMove(current, move);
  }
  const infoGainRatio = igrSteps > 0 ? totalIGR / igrSteps : 1;

  // Skill depth: (score_level5 - score_level1) / score_level5
  const score5 = skillScores[4] ?? 0;
  const score1 = skillScores[0] ?? (score5 * 3); // If random fails, assume 3x par
  const skillDepth = score5 > 0 ? (score1 - score5) / score1 : 0;

  // Solution uniqueness (limit search to avoid timeout)
  let solutionUniqueness = 1;
  if (optimal.steps <= 8) {
    solutionUniqueness = countUniqueSolutions(puzzle, optimal);
  }

  return {
    solvability,
    puzzleEntropy,
    skillDepth,
    decisionEntropy,
    counterintuitive,
    drama,
    durationS,
    infoGainRatio,
    solutionUniqueness,
    optimalSteps: optimal.steps,
    skillScores,
  };
}

// Run metrics
console.log('\n=== FLOCK SOLVER METRICS ===\n');

const allMetrics: PuzzleMetrics[] = [];

for (let d = 0; d < 5; d++) {
  const seed = SEEDS[d];
  const difficulty = DIFFICULTIES[d];
  console.log(`\n--- ${DAY_NAMES[d]} (seed=${seed}, difficulty=${difficulty}) ---`);

  const metrics = computeMetricsForPuzzle(seed, difficulty);
  allMetrics.push(metrics);

  console.log(`  Solvability: ${metrics.solvability.map((s, i) => `L${i + 1}=${s ? 'Y' : 'N'}`).join(', ')}`);
  console.log(`  Optimal steps: ${metrics.optimalSteps}`);
  console.log(`  Skill scores: ${metrics.skillScores.map((s, i) => `L${i + 1}=${s ?? 'fail'}`).join(', ')}`);
  console.log(`  Puzzle Entropy: ${metrics.puzzleEntropy.toFixed(1)} bits`);
  console.log(`  Skill-Depth: ${(metrics.skillDepth * 100).toFixed(1)}%`);
  console.log(`  Decision Entropy: ${metrics.decisionEntropy.toFixed(2)} bits`);
  console.log(`  Counterintuitive: ${metrics.counterintuitive}`);
  console.log(`  Drama: ${metrics.drama.toFixed(2)}`);
  console.log(`  Duration (L3): ${metrics.durationS.toFixed(3)}s`);
  console.log(`  Info Gain Ratio: ${metrics.infoGainRatio.toFixed(2)}`);
  console.log(`  Solution Uniqueness: ${metrics.solutionUniqueness}`);
}

// Aggregate
console.log('\n\n=== AGGREGATE METRICS ===\n');

const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

const solvL5 = allMetrics.filter((m) => m.solvability[4]).length;
console.log(`Solvability (L5): ${solvL5}/5 = ${(solvL5 / 5 * 100).toFixed(0)}%`);

const pe = allMetrics.map((m) => m.puzzleEntropy);
console.log(`Puzzle Entropy: ${pe.map((v) => v.toFixed(1)).join(', ')} | Avg: ${avg(pe).toFixed(1)}`);

const sd = allMetrics.map((m) => m.skillDepth * 100);
console.log(`Skill-Depth: ${sd.map((v) => v.toFixed(1) + '%').join(', ')} | Avg: ${avg(sd).toFixed(1)}%`);

const de = allMetrics.map((m) => m.decisionEntropy);
console.log(`Decision Entropy: ${de.map((v) => v.toFixed(2)).join(', ')} | Avg: ${avg(de).toFixed(2)}`);

const ci = allMetrics.map((m) => m.counterintuitive);
console.log(`Counterintuitive: ${ci.join(', ')} | Avg: ${avg(ci).toFixed(1)}`);

const dr = allMetrics.map((m) => m.drama);
console.log(`Drama: ${dr.map((v) => v.toFixed(2)).join(', ')} | Avg: ${avg(dr).toFixed(2)}`);

const dur = allMetrics.map((m) => m.durationS);
console.log(`Duration (s): ${dur.map((v) => v.toFixed(3)).join(', ')} | Avg: ${avg(dur).toFixed(3)}`);

const igr = allMetrics.map((m) => m.infoGainRatio);
console.log(`Info Gain Ratio: ${igr.map((v) => v.toFixed(2)).join(', ')} | Avg: ${avg(igr).toFixed(2)}`);

const su = allMetrics.map((m) => m.solutionUniqueness);
console.log(`Solution Uniqueness: ${su.join(', ')} | Avg: ${avg(su).toFixed(1)}`);

// Auto-kill check
console.log('\n\n=== AUTO-KILL CHECK ===\n');
let killed = false;
let killReason = '';

if (solvL5 < 5) {
  killed = true;
  killReason = `Solvability < 100% (${(solvL5 / 5 * 100).toFixed(0)}%)`;
}

if (avg(sd) < 10) {
  killed = true;
  killReason = `Skill-Depth < 10% (${avg(sd).toFixed(1)}%)`;
}

if (ci.every((c) => c === 0)) {
  killed = true;
  killReason = 'Counterintuitive Moves = 0 across all puzzles';
}

if (avg(de) < 1.0) {
  killed = true;
  killReason = `Decision Entropy < 1.0 (${avg(de).toFixed(2)})`;
}

if (avg(de) > 4.5) {
  killed = true;
  killReason = `Decision Entropy > 4.5 (${avg(de).toFixed(2)})`;
}

if (avg(pe) < 5) {
  killed = true;
  killReason = `Puzzle Entropy < 5 (${avg(pe).toFixed(1)})`;
}

if (killed) {
  console.log(`KILLED: ${killReason}`);
} else {
  console.log('PASSED - all thresholds cleared');
}

// Weakest and strongest metrics
const metricValues = [
  { name: 'Solvability', value: solvL5 / 5 * 100, good: [100, 100] },
  { name: 'Puzzle Entropy', value: avg(pe), good: [10, 25] },
  { name: 'Skill-Depth', value: avg(sd), good: [30, 100] },
  { name: 'Decision Entropy', value: avg(de), good: [1.5, 3.5] },
  { name: 'Counterintuitive', value: avg(ci), good: [2, 10] },
  { name: 'Drama', value: avg(dr), good: [0.5, 1.0] },
  { name: 'Info Gain Ratio', value: avg(igr), good: [1.5, 10] },
];

// Score each metric: distance from "good" range center
let weakest = metricValues[0];
let strongest = metricValues[0];

for (const m of metricValues) {
  const mid = (m.good[0] + m.good[1]) / 2;
  const range = m.good[1] - m.good[0];
  const normalized = range > 0 ? Math.abs(m.value - mid) / range : 0;
  const weakNorm = range > 0 ? Math.abs(weakest.value - (weakest.good[0] + weakest.good[1]) / 2) / (weakest.good[1] - weakest.good[0]) : 0;
  const strongNorm = range > 0 ? Math.abs(strongest.value - (strongest.good[0] + strongest.good[1]) / 2) / (strongest.good[1] - strongest.good[0]) : 0;

  if (normalized > weakNorm) weakest = m;
  if (normalized < strongNorm || (m.value >= m.good[0] && m.value <= m.good[1])) strongest = m;
}

console.log(`\nWeakest metric: ${weakest.name} = ${weakest.value.toFixed(1)} (good range: ${weakest.good[0]}-${weakest.good[1]})`);
console.log(`Strongest metric: ${strongest.name} = ${strongest.value.toFixed(1)} (good range: ${strongest.good[0]}-${strongest.good[1]})`);
