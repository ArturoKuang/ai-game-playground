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
} from '../src/solvers/Flock.solver.ts';

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
  console.log(`  Birds: ${puzzle.birds.length}, Colors: ${puzzle.numColors}, H: ${heuristic(puzzle)}`);

  const solutions: (Solution | null)[] = [];
  const solvability: boolean[] = [];
  const skillScores: (number | null)[] = [];

  for (const sl of [1, 2, 3, 4, 5] as const) {
    let sol: Solution | null = null;
    if (sl === 1) {
      for (let attempt = 0; attempt < 20; attempt++) {
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

  const optimal = solutions[4];
  if (!optimal) {
    console.log('  UNSOLVABLE at L5!');
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

  const level3Sol = solutions[2];
  const drama = level3Sol ? computeDrama(puzzle, level3Sol) : 0;

  const t0 = Date.now();
  solve(puzzle, 3);
  const durationS = (Date.now() - t0) / 1000;

  let totalIGR = 0;
  let igrSteps = 0;
  let current: FlockState = {
    ...puzzle,
    birds: puzzle.birds.map((b) => ({ ...b, pos: { ...b.pos } })),
  };
  for (const move of optimal.moves) {
    const igr = computeInfoGainRatio(current);
    totalIGR += igr;
    igrSteps++;
    current = applyMove(current, move);
  }
  const infoGainRatio = igrSteps > 0 ? totalIGR / igrSteps : 1;

  const score5 = skillScores[4] ?? 0;
  const score1 = skillScores[0] ?? score5 * 3;
  const skillDepth = score1 > 0 ? ((score1 - score5) / score1) * 100 : 0;

  let solutionUniqueness = 1;
  if (optimal.steps <= 8) {
    solutionUniqueness = countUniqueSolutions(puzzle, optimal);
  }

  console.log(`  Solvability: ${solvability.map((s, i) => `L${i + 1}=${s ? 'Y' : 'N'}`).join(', ')}`);
  console.log(`  Optimal steps: ${optimal.steps}`);
  console.log(`  Skill scores: ${skillScores.map((s, i) => `L${i + 1}=${s ?? 'fail'}`).join(', ')}`);
  console.log(`  Puzzle Entropy: ${puzzleEntropy.toFixed(1)} bits`);
  console.log(`  Skill-Depth: ${skillDepth.toFixed(1)}%`);
  console.log(`  Decision Entropy: ${decisionEntropy.toFixed(2)} bits`);
  console.log(`  Counterintuitive: ${counterintuitive}`);
  console.log(`  Drama: ${drama.toFixed(2)}`);
  console.log(`  Duration (L3): ${durationS.toFixed(3)}s`);
  console.log(`  Info Gain Ratio: ${infoGainRatio.toFixed(2)}`);
  console.log(`  Solution Uniqueness: ${solutionUniqueness}`);

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

console.log('\n=== FLOCK SOLVER METRICS ===\n');

const allMetrics: PuzzleMetrics[] = [];

for (let d = 0; d < 5; d++) {
  const seed = SEEDS[d];
  const difficulty = DIFFICULTIES[d];
  console.log(`\n--- ${DAY_NAMES[d]} (seed=${seed}, difficulty=${difficulty}) ---`);
  const metrics = computeMetricsForPuzzle(seed, difficulty);
  allMetrics.push(metrics);
}

console.log('\n\n=== AGGREGATE METRICS ===\n');
const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

const solvL5 = allMetrics.filter((m) => m.solvability[4]).length;
console.log(`Solvability (L5): ${solvL5}/5 = ${((solvL5 / 5) * 100).toFixed(0)}%`);

const pe = allMetrics.map((m) => m.puzzleEntropy);
console.log(`Puzzle Entropy: ${pe.map((v) => v.toFixed(1)).join(', ')} | Avg: ${avg(pe).toFixed(1)}`);

const sd = allMetrics.map((m) => m.skillDepth);
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

console.log(`Optimal steps: ${allMetrics.map((m) => m.optimalSteps).join(', ')}`);

// Auto-kill check
console.log('\n\n=== AUTO-KILL CHECK ===\n');
let killed = false;
let killReason = '';

if (solvL5 < 5) {
  killed = true;
  killReason = `Solvability < 100% (${((solvL5 / 5) * 100).toFixed(0)}%)`;
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

// Identify weakest and strongest
const metrics = [
  { name: 'Solvability', val: (solvL5 / 5) * 100, lo: 100, hi: 100 },
  { name: 'Puzzle Entropy', val: avg(pe), lo: 10, hi: 25 },
  { name: 'Skill-Depth', val: avg(sd), lo: 30, hi: 100 },
  { name: 'Decision Entropy', val: avg(de), lo: 1.5, hi: 3.5 },
  { name: 'Counterintuitive', val: avg(ci), lo: 2, hi: 10 },
  { name: 'Drama', val: avg(dr), lo: 0.5, hi: 1.0 },
  { name: 'Info Gain Ratio', val: avg(igr), lo: 1.5, hi: 10 },
];

function distFromGood(m: { val: number; lo: number; hi: number }) {
  if (m.val >= m.lo && m.val <= m.hi) return 0;
  return m.val < m.lo ? (m.lo - m.val) / m.lo : (m.val - m.hi) / m.hi;
}

const sorted = [...metrics].sort((a, b) => distFromGood(b) - distFromGood(a));
console.log(`\nWeakest: ${sorted[0].name} = ${sorted[0].val.toFixed(1)} (good: ${sorted[0].lo}-${sorted[0].hi})`);
console.log(`Strongest: ${sorted[sorted.length - 1].name} = ${sorted[sorted.length - 1].val.toFixed(1)} (good: ${sorted[sorted.length - 1].lo}-${sorted[sorted.length - 1].hi})`);
