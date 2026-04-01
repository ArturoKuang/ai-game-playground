/**
 * Herd Metrics Computation
 * Run: npx tsx src/solvers/herd-metrics.ts
 */

import {
  generatePuzzle,
  solve,
  isGoal,
  heuristic,
  legalMoves,
  applyMove,
  puzzleEntropy,
  countCounterintuitive,
  decisionEntropy,
  computeDrama,
  infoGainRatio,
  solutionUniqueness,
  type HerdState,
  type Solution,
} from './Herd.solver';

// 5 seeds for Mon-Fri
const SEEDS = [10001, 10002, 10003, 10004, 10005];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const DIFFICULTIES = [1, 2, 3, 4, 5];
const SKILL_LEVELS: (1 | 2 | 3 | 4 | 5)[] = [1, 2, 3, 4, 5];

interface PuzzleMetrics {
  solvability: boolean;
  puzzleEntropy: number;
  skillDepth: number;
  decisionEntropy: number;
  counterintuitive: number;
  drama: number;
  duration: number;
  infoGainRatio: number;
  solutionUniqueness: number;
  optimalLength: number;
  level1Length: number | null;
  level3Length: number | null;
  level5Length: number | null;
}

function computeMetrics(seed: number, difficulty: number): PuzzleMetrics {
  const puzzle = generatePuzzle(seed, difficulty);

  // Solve at all skill levels
  const solutions: (Solution | null)[] = [];
  const startTimes: number[] = [];
  const endTimes: number[] = [];

  for (const level of SKILL_LEVELS) {
    const t0 = Date.now();
    const sol = solve(puzzle, level);
    const t1 = Date.now();
    solutions.push(sol);
    startTimes.push(t0);
    endTimes.push(t1);
  }

  const sol5 = solutions[4]; // skill level 5
  const sol1 = solutions[0]; // skill level 1
  const sol3 = solutions[2]; // skill level 3

  const solvability = sol5 !== null;

  if (!solvability || !sol5) {
    return {
      solvability: false,
      puzzleEntropy: 0,
      skillDepth: 0,
      decisionEntropy: 0,
      counterintuitive: 0,
      drama: 0,
      duration: 0,
      infoGainRatio: 0,
      solutionUniqueness: 0,
      optimalLength: 0,
      level1Length: sol1 ? sol1.steps : null,
      level3Length: sol3 ? sol3.steps : null,
      level5Length: null,
    };
  }

  // Skill depth: (score_level5 - score_level1) / score_level5
  // Using solution length as score (lower is better, so invert)
  const l5 = sol5.steps;
  const l1 = sol1 ? sol1.steps : 200; // If L1 can't solve, use max
  const skillDepth = l5 > 0 ? (l1 - l5) / l1 : 0;

  // Duration proxy at level 3
  const duration3 = endTimes[2] - startTimes[2];

  // Compute using optimal solution (level 5)
  const pe = puzzleEntropy(puzzle, sol5);
  const ci = countCounterintuitive(puzzle, sol5);
  const de = decisionEntropy(puzzle, sol5);
  const drama = sol3 ? computeDrama(puzzle, sol3) : computeDrama(puzzle, sol5);
  const igr = infoGainRatio(puzzle, sol5);
  const su = solutionUniqueness(puzzle, sol5.steps);

  return {
    solvability: true,
    puzzleEntropy: pe,
    skillDepth: Math.max(0, skillDepth),
    decisionEntropy: de,
    counterintuitive: ci,
    drama,
    duration: duration3 / 1000, // seconds
    infoGainRatio: igr,
    solutionUniqueness: su,
    optimalLength: l5,
    level1Length: sol1 ? sol1.steps : null,
    level3Length: sol3 ? sol3.steps : null,
    level5Length: l5,
  };
}

// Run metrics
console.log('=== HERD SOLVER METRICS ===\n');

const allMetrics: PuzzleMetrics[] = [];

for (let i = 0; i < 5; i++) {
  const seed = SEEDS[i];
  const difficulty = DIFFICULTIES[i];
  console.log(`\n--- ${DAYS[i]} (seed=${seed}, difficulty=${difficulty}) ---`);

  const m = computeMetrics(seed, difficulty);
  allMetrics.push(m);

  console.log(`  Solvability: ${m.solvability}`);
  console.log(`  Optimal solution: ${m.optimalLength} moves`);
  console.log(`  L1: ${m.level1Length ?? 'FAIL'}, L3: ${m.level3Length ?? 'FAIL'}, L5: ${m.level5Length ?? 'FAIL'}`);
  console.log(`  Puzzle Entropy: ${m.puzzleEntropy.toFixed(2)}`);
  console.log(`  Skill-Depth: ${(m.skillDepth * 100).toFixed(1)}%`);
  console.log(`  Decision Entropy: ${m.decisionEntropy.toFixed(2)}`);
  console.log(`  Counterintuitive: ${m.counterintuitive}`);
  console.log(`  Drama: ${m.drama.toFixed(2)}`);
  console.log(`  Duration: ${m.duration.toFixed(2)}s`);
  console.log(`  Info Gain Ratio: ${m.infoGainRatio.toFixed(2)}`);
  console.log(`  Solution Uniqueness: ${m.solutionUniqueness}`);
}

// Averages
console.log('\n\n=== AVERAGES ===');
const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

const solvable = allMetrics.filter((m) => m.solvability);
console.log(`Solvability: ${solvable.length}/${allMetrics.length} (${(solvable.length / allMetrics.length * 100).toFixed(0)}%)`);
console.log(`Puzzle Entropy: ${avg(solvable.map((m) => m.puzzleEntropy)).toFixed(2)}`);
console.log(`Skill-Depth: ${(avg(solvable.map((m) => m.skillDepth)) * 100).toFixed(1)}%`);
console.log(`Decision Entropy: ${avg(solvable.map((m) => m.decisionEntropy)).toFixed(2)}`);
console.log(`Counterintuitive: ${avg(solvable.map((m) => m.counterintuitive)).toFixed(1)}`);
console.log(`Drama: ${avg(solvable.map((m) => m.drama)).toFixed(2)}`);
console.log(`Duration: ${avg(solvable.map((m) => m.duration)).toFixed(2)}s`);
console.log(`Info Gain Ratio: ${avg(solvable.map((m) => m.infoGainRatio)).toFixed(2)}`);
console.log(`Solution Uniqueness: ${avg(solvable.map((m) => m.solutionUniqueness)).toFixed(1)}`);

// Auto-kill checks
console.log('\n=== AUTO-KILL CHECKS ===');
const solvabilityRate = solvable.length / allMetrics.length;
const avgSkillDepth = avg(solvable.map((m) => m.skillDepth));
const avgCI = avg(solvable.map((m) => m.counterintuitive));
const totalCI = solvable.reduce((a, m) => a + m.counterintuitive, 0);
const avgDE = avg(solvable.map((m) => m.decisionEntropy));
const avgPE = avg(solvable.map((m) => m.puzzleEntropy));

const checks = [
  { name: 'Solvability < 100%', failed: solvabilityRate < 1, value: `${(solvabilityRate * 100).toFixed(0)}%` },
  { name: 'Skill-Depth < 10%', failed: avgSkillDepth < 0.1, value: `${(avgSkillDepth * 100).toFixed(1)}%` },
  { name: 'CI = 0 across all', failed: totalCI === 0, value: `${totalCI} total` },
  { name: 'Decision Entropy < 1.0', failed: avgDE < 1.0, value: `${avgDE.toFixed(2)}` },
  { name: 'Decision Entropy > 4.5', failed: avgDE > 4.5, value: `${avgDE.toFixed(2)}` },
  { name: 'Puzzle Entropy < 5', failed: avgPE < 5, value: `${avgPE.toFixed(2)}` },
];

let killed = false;
for (const check of checks) {
  const status = check.failed ? 'FAILED' : 'PASSED';
  console.log(`  ${status}: ${check.name} (${check.value})`);
  if (check.failed) killed = true;
}

console.log(`\nFinal verdict: ${killed ? 'AUTO-KILLED' : 'PASSED'}`);
