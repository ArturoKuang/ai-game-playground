/**
 * Crate Metrics Runner
 *
 * Computes quality metrics for the Crate game:
 * Solvability, Puzzle Entropy, Skill-Depth, Decision Entropy,
 * Counterintuitive Moves, Drama, Info Gain Ratio, Algorithm Alignment
 *
 * Run: npx tsx src/solvers/crate-metrics.ts
 */

import {
  generatePuzzle,
  legalMoves,
  applyMove,
  isGoal,
  heuristic,
  solve,
  type CrateState,
  type Move,
  type Solution,
} from './Crate.solver';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const SEEDS = [100, 200, 300, 400, 500];
const DIFFICULTIES = [1, 2, 3, 4, 5];
const SKILL_LEVELS: (1 | 2 | 3 | 4 | 5)[] = [1, 2, 3, 4, 5];

interface PuzzleMetrics {
  day: string;
  difficulty: number;
  seed: number;
  solvable: boolean;
  puzzleEntropy: number;
  skillDepth: number;
  decisionEntropy: number;
  ciMoves: number;
  drama: number;
  durationS: number;
  infoGainRatio: number;
  uniqueSolutions: number;
  optimalSteps: number;
  budget: number;
  algorithmAlignment: number;
  greedyOptimalGap: number;
}

function computeMetrics(seed: number, difficulty: number, dayName: string): PuzzleMetrics {
  const puzzle = generatePuzzle(seed, difficulty);

  // Solve at all skill levels
  const solutions: Record<number, Solution | null> = {};
  for (const level of SKILL_LEVELS) {
    solutions[level] = solve(puzzle, level);
  }

  const solvable = solutions[5] !== null;
  const optimalSol = solutions[5];
  const optimalSteps = optimalSol ? optimalSol.steps : 0;

  // Puzzle Entropy: sum of log2(legalMoves) at each step of optimal solution
  let puzzleEntropy = 0;
  if (optimalSol) {
    let state = cloneForReplay(puzzle);
    for (const move of optimalSol.moves) {
      const legal = legalMoves(state);
      if (legal.length > 1) {
        puzzleEntropy += Math.log2(legal.length);
      }
      state = applyMove(state, move);
    }
  }

  // Decision Entropy: average log2(legal moves) per step
  let totalDecisionEntropy = 0;
  let decisionSteps = 0;
  if (optimalSol) {
    let state = cloneForReplay(puzzle);
    for (const move of optimalSol.moves) {
      const legal = legalMoves(state);
      if (legal.length > 0) {
        totalDecisionEntropy += Math.log2(legal.length);
        decisionSteps++;
      }
      state = applyMove(state, move);
    }
  }
  const decisionEntropy = decisionSteps > 0 ? totalDecisionEntropy / decisionSteps : 0;

  // Skill-Depth: (steps_level1 - steps_level5) / steps_level1
  const steps1 = solutions[1] ? solutions[1].steps : 200;
  const steps5 = solutions[5] ? solutions[5].steps : 1;
  const skillDepth = steps1 > 0 ? (steps1 - steps5) / steps1 : 0;

  // Counterintuitive Moves: steps where heuristic(next) > heuristic(current) in optimal
  let ciMoves = 0;
  if (optimalSol) {
    let state = cloneForReplay(puzzle);
    for (const move of optimalSol.moves) {
      const hBefore = heuristic(state);
      state = applyMove(state, move);
      const hAfter = heuristic(state);
      if (hAfter > hBefore) ciMoves++;
    }
  }

  // Drama: max progress before backtrack at level 3
  let drama = 0;
  const sol3 = solutions[3];
  if (sol3 && sol3.steps > 0) {
    let state = cloneForReplay(puzzle);
    const initialH = heuristic(state);
    let maxProgress = 0;
    let maxProgressBeforeBacktrack = 0;

    for (const move of sol3.moves) {
      state = applyMove(state, move);
      const h = heuristic(state);
      const progress = initialH > 0 ? (initialH - h) / initialH : 0;
      if (progress > maxProgress) {
        maxProgress = progress;
      } else if (progress < maxProgress) {
        maxProgressBeforeBacktrack = Math.max(maxProgressBeforeBacktrack, maxProgress);
      }
    }
    drama = maxProgressBeforeBacktrack > 0
      ? maxProgressBeforeBacktrack
      : maxProgress > 0 ? maxProgress * 0.5 : 0;
  }

  // Duration: time to solve at level 3
  const t0 = Date.now();
  solve(puzzle, 3);
  const durationS = (Date.now() - t0) / 1000;

  // Info Gain Ratio: random steps / optimal steps
  let infoGainRatio = 1;
  if (optimalSol && optimalSol.steps > 0) {
    const randomSteps = solutions[1] ? solutions[1].steps : 200;
    infoGainRatio = randomSteps / optimalSol.steps;
  }

  // Solution Uniqueness
  let uniqueSolutions = optimalSol ? 1 : 0;
  if (optimalSol) {
    const sol4 = solutions[4];
    if (sol4 && sol4.steps <= optimalSol.steps + 1) {
      const sol4Key = sol4.moves.join(',');
      const sol5Key = optimalSol.moves.join(',');
      if (sol4Key !== sol5Key) uniqueSolutions++;
    }
    const sol2 = solutions[2];
    if (sol2 && sol2.steps <= optimalSol.steps + 2) {
      uniqueSolutions++;
    }
  }

  // Algorithm Alignment: (push + pop) / total_moves in optimal solution
  let algorithmAlignment = 0;
  if (optimalSol && optimalSol.moves.length > 0) {
    const pushPopCount = optimalSol.moves.filter(m => m === 'push' || m === 'pop').length;
    algorithmAlignment = pushPopCount / optimalSol.moves.length;
  }

  // Greedy-Optimal Gap: (greedy_steps - optimal_steps) / optimal_steps
  let greedyOptimalGap = 0;
  if (optimalSol && solutions[2]) {
    greedyOptimalGap = (solutions[2].steps - optimalSol.steps) / optimalSol.steps;
  } else if (optimalSol && !solutions[2]) {
    // Greedy couldn't solve it at all
    greedyOptimalGap = 1.0;
  }

  return {
    day: dayName,
    difficulty,
    seed,
    solvable,
    puzzleEntropy,
    skillDepth,
    decisionEntropy,
    ciMoves,
    drama,
    durationS,
    infoGainRatio,
    uniqueSolutions,
    optimalSteps,
    budget: puzzle.budget,
    algorithmAlignment,
    greedyOptimalGap,
  };
}

function cloneForReplay(puzzle: CrateState): CrateState {
  return {
    conveyor: [...puzzle.conveyor],
    stack: [],
    truck: [],
    nextRequired: 1,
    totalCrates: puzzle.totalCrates,
    stackCapacity: puzzle.stackCapacity,
    visibleCount: puzzle.visibleCount,
    moves: 0,
    budget: puzzle.budget,
    difficulty: puzzle.difficulty,
    discardPile: [],
  };
}

// Run metrics: 5 difficulties x 5 seeds
console.log('=== Crate Metrics ===\n');

const allMetrics: PuzzleMetrics[] = [];

for (let di = 0; di < DIFFICULTIES.length; di++) {
  for (let si = 0; si < SEEDS.length; si++) {
    const diff = DIFFICULTIES[di];
    const seed = SEEDS[si] + di * 1000; // vary seeds across difficulties
    const dayName = `D${diff}S${si + 1}`;
    const m = computeMetrics(seed, diff, dayName);
    allMetrics.push(m);
  }
}

// Print per-difficulty summary
console.log('Per-difficulty averages:\n');
for (const diff of DIFFICULTIES) {
  const subset = allMetrics.filter(m => m.difficulty === diff);
  const solvableCount = subset.filter(m => m.solvable).length;
  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  console.log(`Difficulty ${diff}:`);
  console.log(`  Solvability: ${solvableCount}/${subset.length} = ${((solvableCount / subset.length) * 100).toFixed(0)}%`);
  console.log(`  Optimal steps: ${avg(subset.map(m => m.optimalSteps)).toFixed(1)}, Budget: ${avg(subset.map(m => m.budget)).toFixed(1)}`);
  console.log(`  Puzzle Entropy: ${avg(subset.map(m => m.puzzleEntropy)).toFixed(2)} bits`);
  console.log(`  Skill-Depth: ${(avg(subset.map(m => m.skillDepth)) * 100).toFixed(1)}%`);
  console.log(`  Decision Entropy: ${avg(subset.map(m => m.decisionEntropy)).toFixed(2)} bits`);
  console.log(`  CI Moves: ${avg(subset.map(m => m.ciMoves)).toFixed(1)}`);
  console.log(`  Drama: ${avg(subset.map(m => m.drama)).toFixed(2)}`);
  console.log(`  Info Gain Ratio: ${avg(subset.map(m => m.infoGainRatio)).toFixed(2)}`);
  console.log(`  Algorithm Alignment: ${(avg(subset.map(m => m.algorithmAlignment)) * 100).toFixed(1)}%`);
  console.log(`  Greedy-Optimal Gap: ${(avg(subset.map(m => m.greedyOptimalGap)) * 100).toFixed(1)}%`);
  console.log();
}

// Overall averages
const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

console.log('=== Overall Averages ===');
const solvability = allMetrics.filter(m => m.solvable).length / allMetrics.length;
const avgSkillDepth = avg(allMetrics.map(m => m.skillDepth));
const avgDecisionEntropy = avg(allMetrics.map(m => m.decisionEntropy));
const avgPuzzleEntropy = avg(allMetrics.map(m => m.puzzleEntropy));
const avgAlgorithmAlignment = avg(allMetrics.map(m => m.algorithmAlignment));
const totalCI = allMetrics.reduce((s, m) => s + m.ciMoves, 0);

console.log(`Solvability: ${allMetrics.filter(m => m.solvable).length}/${allMetrics.length} = ${(solvability * 100).toFixed(0)}%`);
console.log(`Puzzle Entropy: ${avgPuzzleEntropy.toFixed(2)} bits`);
console.log(`Skill-Depth: ${(avgSkillDepth * 100).toFixed(1)}%`);
console.log(`Decision Entropy: ${avgDecisionEntropy.toFixed(2)} bits`);
console.log(`CI Moves (total): ${totalCI}`);
console.log(`Drama: ${avg(allMetrics.map(m => m.drama)).toFixed(2)}`);
console.log(`Info Gain Ratio: ${avg(allMetrics.map(m => m.infoGainRatio)).toFixed(2)}`);
console.log(`Algorithm Alignment: ${(avgAlgorithmAlignment * 100).toFixed(1)}%`);
console.log(`Greedy-Optimal Gap: ${(avg(allMetrics.map(m => m.greedyOptimalGap)) * 100).toFixed(1)}%`);

// Auto-kill check
console.log('\n=== Auto-Kill Check ===');

let killed = false;
let killReason = '';

if (solvability < 1) {
  killed = true;
  killReason = `Solvability ${(solvability * 100).toFixed(0)}% < 100%`;
}
if (avgSkillDepth < 0.1) {
  killed = true;
  killReason += (killReason ? '; ' : '') + `Skill-Depth ${(avgSkillDepth * 100).toFixed(1)}% < 10%`;
}
if (avgAlgorithmAlignment < 0.5) {
  killed = true;
  killReason += (killReason ? '; ' : '') + `Algorithm Alignment ${(avgAlgorithmAlignment * 100).toFixed(1)}% < 50%`;
}

if (killed) {
  console.log(`AUTO-KILLED: ${killReason}`);
} else {
  console.log('PASSED - all thresholds cleared');
}

// Output table for spec
console.log('\n=== Spec Table ===');
console.log('| Metric | D1 | D2 | D3 | D4 | D5 | Avg |');
console.log('|---|---|---|---|---|---|---|');

const fmt = (n: number, dec = 2) => n.toFixed(dec);
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

for (const diff of DIFFICULTIES) {
  const subset = allMetrics.filter(m => m.difficulty === diff);
}

const diffAvgs = DIFFICULTIES.map(d => {
  const s = allMetrics.filter(m => m.difficulty === d);
  return {
    solvability: s.filter(m => m.solvable).length / s.length,
    puzzleEntropy: avg(s.map(m => m.puzzleEntropy)),
    skillDepth: avg(s.map(m => m.skillDepth)),
    decisionEntropy: avg(s.map(m => m.decisionEntropy)),
    ciMoves: avg(s.map(m => m.ciMoves)),
    drama: avg(s.map(m => m.drama)),
    infoGainRatio: avg(s.map(m => m.infoGainRatio)),
    algorithmAlignment: avg(s.map(m => m.algorithmAlignment)),
    greedyOptimalGap: avg(s.map(m => m.greedyOptimalGap)),
    optimalSteps: avg(s.map(m => m.optimalSteps)),
  };
});

const rows = [
  ['Solvability', ...diffAvgs.map(d => pct(d.solvability)), pct(solvability)],
  ['Puzzle Entropy', ...diffAvgs.map(d => fmt(d.puzzleEntropy)), fmt(avgPuzzleEntropy)],
  ['Skill-Depth', ...diffAvgs.map(d => pct(d.skillDepth)), pct(avgSkillDepth)],
  ['Decision Entropy', ...diffAvgs.map(d => fmt(d.decisionEntropy)), fmt(avgDecisionEntropy)],
  ['CI Moves', ...diffAvgs.map(d => fmt(d.ciMoves, 1)), fmt(avg(allMetrics.map(m => m.ciMoves)), 1)],
  ['Drama', ...diffAvgs.map(d => fmt(d.drama)), fmt(avg(allMetrics.map(m => m.drama)))],
  ['Info Gain Ratio', ...diffAvgs.map(d => fmt(d.infoGainRatio)), fmt(avg(allMetrics.map(m => m.infoGainRatio)))],
  ['Algorithm Alignment', ...diffAvgs.map(d => pct(d.algorithmAlignment)), pct(avgAlgorithmAlignment)],
  ['Greedy-Optimal Gap', ...diffAvgs.map(d => pct(d.greedyOptimalGap)), pct(avg(allMetrics.map(m => m.greedyOptimalGap)))],
  ['Optimal Steps', ...diffAvgs.map(d => fmt(d.optimalSteps, 1)), fmt(avg(allMetrics.map(m => m.optimalSteps)), 1)],
];

for (const row of rows) {
  console.log(`| ${row.join(' | ')} |`);
}
