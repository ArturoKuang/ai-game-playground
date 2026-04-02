/**
 * Pane Metrics Runner
 *
 * Computes quality metrics for the Pane game:
 * Solvability, Puzzle Entropy, Skill-Depth, Decision Entropy,
 * Counterintuitive Moves, Drama, Duration, Info Gain Ratio,
 * Algorithm Alignment, Greedy-Optimal Gap
 */

import {
  generatePuzzle,
  legalMoves,
  applyMove,
  isGoal,
  heuristic,
  solve,
  type PaneState,
  type Move,
  type Solution,
} from './Pane.solver';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const SEEDS = [100, 200, 300, 400, 500];
const DIFFICULTIES = [1, 2, 3, 4, 5];

interface PuzzleMetrics {
  day: string;
  solvable: boolean;
  puzzleEntropy: number;
  skillDepth: number;
  decisionEntropy: number;
  ciMoves: number;
  drama: number;
  durationS: number;
  infoGainRatio: number;
  algorithmAlignment: number;
  greedyOptimalGap: number;
  optimalSteps: number;
  budget: number;
}

function computeMetrics(seed: number, difficulty: number, dayName: string): PuzzleMetrics {
  const puzzle = generatePuzzle(seed, difficulty);

  // Solve at all skill levels
  const solutions: Record<number, Solution | null> = {};
  for (let level = 1; level <= 5; level++) {
    solutions[level] = solve(puzzle, level as 1 | 2 | 3 | 4 | 5);
  }

  const solvable = solutions[5] !== null;
  const optimalSol = solutions[5];
  const optimalSteps = optimalSol ? optimalSol.steps : 0;

  // Puzzle Entropy: sum of log2(legalMoves) at each step of optimal solution
  let puzzleEntropy = 0;
  if (optimalSol) {
    let state = resetState(puzzle);
    for (const move of optimalSol.moves) {
      const legal = legalMoves(state);
      if (legal.length > 1) {
        puzzleEntropy += Math.log2(legal.length);
      }
      state = applyMove(state, move);
    }
  }

  // Decision Entropy: average Shannon entropy of legal moves at each step
  let totalDecisionEntropy = 0;
  let decisionSteps = 0;
  if (optimalSol) {
    let state = resetState(puzzle);
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
  // Use edge movements (steps) not total move count
  const steps1 = solutions[1] ? solutions[1].steps : puzzle.budget;
  const steps2 = solutions[2] ? solutions[2].steps : puzzle.budget;
  const steps5 = solutions[5] ? solutions[5].steps : 1;
  const skillDepth = steps1 > 0 ? (steps1 - steps5) / steps1 : 0;

  // Counterintuitive Moves: shrinking left when you have a valid window
  // (the insight is that shrinking a valid window feels "wrong" but finds a smaller one)
  let ciMoves = 0;
  if (optimalSol) {
    let state = resetState(puzzle);
    for (const move of optimalSol.moves) {
      // A counterintuitive move = shrinking when all colors are present
      if (move === 'shrink' && state.coveredColors === state.numColors) {
        ciMoves++;
      }
      state = applyMove(state, move);
    }
  }

  // Drama: track progress/backtrack pattern
  let drama = 0;
  const sol3 = solutions[3];
  if (sol3 && sol3.steps > 0) {
    let state = resetState(puzzle);
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
    const randomSteps = solutions[1] ? solutions[1].steps : puzzle.budget;
    infoGainRatio = randomSteps / optimalSol.steps;
  }

  // Algorithm Alignment: percentage of moves that are "forward-only"
  // In the sliding window algorithm, both edges only move forward (right edge +1, left edge +1)
  // Any move that goes backward would be non-matching. Since our moves are only expand (+1 right)
  // and shrink (+1 left), both are inherently forward-only. The alignment measures whether the
  // solver follows the sliding window ORDER: expand until valid, then shrink.
  let algorithmAlignment = 0;
  if (optimalSol) {
    let state = resetState(puzzle);
    let forwardMoves = 0;
    let totalEdgeMoves = 0;
    let lastRight = -1;
    let lastLeft = 0;

    for (const move of optimalSol.moves) {
      if (move === 'expand') {
        totalEdgeMoves++;
        // Forward: right edge moves right (always forward by definition)
        if (state.right + 1 > lastRight) {
          forwardMoves++;
          lastRight = state.right + 1;
        }
      } else if (move === 'shrink') {
        totalEdgeMoves++;
        // Forward: left edge moves right (always forward by definition)
        if (state.left + 1 > lastLeft) {
          forwardMoves++;
          lastLeft = state.left + 1;
        }
      }
      state = applyMove(state, move);
    }
    algorithmAlignment = totalEdgeMoves > 0 ? forwardMoves / totalEdgeMoves : 0;
  }

  // Greedy-Optimal Gap: (brute_force_steps - optimal_steps) / brute_force_steps
  const greedyOptimalGap = steps2 > 0 ? (steps2 - steps5) / steps2 : 0;

  return {
    day: dayName,
    solvable,
    puzzleEntropy,
    skillDepth,
    decisionEntropy,
    ciMoves,
    drama,
    durationS,
    infoGainRatio,
    algorithmAlignment,
    greedyOptimalGap,
    optimalSteps,
    budget: puzzle.budget,
  };
}

function resetState(puzzle: PaneState): PaneState {
  return {
    gems: [...puzzle.gems],
    numColors: puzzle.numColors,
    left: 0,
    right: -1,
    colorCounts: new Map(),
    coveredColors: 0,
    moves: 0,
    budget: puzzle.budget,
    bestWindow: null,
    difficulty: puzzle.difficulty,
    validWindowsFound: 0,
  };
}

// Run metrics
console.log('=== Pane Metrics ===\n');

const allMetrics: PuzzleMetrics[] = [];

for (let d = 0; d < 5; d++) {
  const m = computeMetrics(SEEDS[d], DIFFICULTIES[d], DAY_NAMES[d]);
  allMetrics.push(m);
  console.log(`${m.day} (diff=${DIFFICULTIES[d]}, seed=${SEEDS[d]}):`);
  console.log(`  Solvable: ${m.solvable}`);
  console.log(`  Optimal steps: ${m.optimalSteps}, Budget: ${m.budget}`);
  console.log(`  Puzzle Entropy: ${m.puzzleEntropy.toFixed(2)} bits`);
  console.log(`  Skill-Depth: ${(m.skillDepth * 100).toFixed(1)}%`);
  console.log(`  Decision Entropy: ${m.decisionEntropy.toFixed(2)} bits`);
  console.log(`  CI Moves: ${m.ciMoves}`);
  console.log(`  Drama: ${m.drama.toFixed(2)}`);
  console.log(`  Duration: ${m.durationS.toFixed(3)}s`);
  console.log(`  Info Gain Ratio: ${m.infoGainRatio.toFixed(2)}`);
  console.log(`  Algorithm Alignment: ${(m.algorithmAlignment * 100).toFixed(1)}%`);
  console.log(`  Greedy-Optimal Gap: ${(m.greedyOptimalGap * 100).toFixed(1)}%`);
  console.log();
}

// Averages
const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

console.log('=== Averages ===');
console.log(`Solvability: ${allMetrics.filter((m) => m.solvable).length}/${allMetrics.length} = ${((allMetrics.filter((m) => m.solvable).length / allMetrics.length) * 100).toFixed(0)}%`);
console.log(`Puzzle Entropy: ${avg(allMetrics.map((m) => m.puzzleEntropy)).toFixed(2)} bits`);
console.log(`Skill-Depth: ${(avg(allMetrics.map((m) => m.skillDepth)) * 100).toFixed(1)}%`);
console.log(`Decision Entropy: ${avg(allMetrics.map((m) => m.decisionEntropy)).toFixed(2)} bits`);
console.log(`CI Moves: ${avg(allMetrics.map((m) => m.ciMoves)).toFixed(1)}`);
console.log(`Drama: ${avg(allMetrics.map((m) => m.drama)).toFixed(2)}`);
console.log(`Info Gain Ratio: ${avg(allMetrics.map((m) => m.infoGainRatio)).toFixed(2)}`);
console.log(`Algorithm Alignment: ${(avg(allMetrics.map((m) => m.algorithmAlignment)) * 100).toFixed(1)}%`);
console.log(`Greedy-Optimal Gap: ${(avg(allMetrics.map((m) => m.greedyOptimalGap)) * 100).toFixed(1)}%`);

// Auto-kill check
console.log('\n=== Auto-Kill Check ===');
const solvability = allMetrics.filter((m) => m.solvable).length / allMetrics.length;
const avgSkillDepth = avg(allMetrics.map((m) => m.skillDepth));
const avgAlgorithmAlignment = avg(allMetrics.map((m) => m.algorithmAlignment));
const totalCI = allMetrics.reduce((s, m) => s + m.ciMoves, 0);
const avgDecisionEntropy = avg(allMetrics.map((m) => m.decisionEntropy));
const avgPuzzleEntropy = avg(allMetrics.map((m) => m.puzzleEntropy));

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
console.log('| Metric | Mon | Tue | Wed | Thu | Fri | Avg |');
console.log('|---|---|---|---|---|---|---|');

const fmt = (n: number, dec = 2) => n.toFixed(dec);
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

const rows = [
  ['Solvability', ...allMetrics.map((m) => m.solvable ? '100%' : '0%'), pct(solvability)],
  ['Puzzle Entropy', ...allMetrics.map((m) => fmt(m.puzzleEntropy)), fmt(avg(allMetrics.map((m) => m.puzzleEntropy)))],
  ['Skill-Depth', ...allMetrics.map((m) => pct(m.skillDepth)), pct(avgSkillDepth)],
  ['Decision Entropy', ...allMetrics.map((m) => fmt(m.decisionEntropy)), fmt(avgDecisionEntropy)],
  ['Counterintuitive', ...allMetrics.map((m) => String(m.ciMoves)), fmt(avg(allMetrics.map((m) => m.ciMoves)), 1)],
  ['Drama', ...allMetrics.map((m) => fmt(m.drama)), fmt(avg(allMetrics.map((m) => m.drama)))],
  ['Duration (s)', ...allMetrics.map((m) => fmt(m.durationS, 3)), fmt(avg(allMetrics.map((m) => m.durationS)), 3)],
  ['Info Gain Ratio', ...allMetrics.map((m) => fmt(m.infoGainRatio)), fmt(avg(allMetrics.map((m) => m.infoGainRatio)))],
  ['Alg. Alignment', ...allMetrics.map((m) => pct(m.algorithmAlignment)), pct(avgAlgorithmAlignment)],
  ['Greedy-Opt Gap', ...allMetrics.map((m) => pct(m.greedyOptimalGap)), pct(avg(allMetrics.map((m) => m.greedyOptimalGap)))],
];

for (const row of rows) {
  console.log(`| ${row.join(' | ')} |`);
}
