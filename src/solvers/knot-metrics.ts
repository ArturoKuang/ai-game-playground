/**
 * Knot Solver Metrics
 *
 * Computes quality metrics for 5 puzzles (Mon-Fri difficulties)
 * at 5 skill levels each.
 */

import {
  generatePuzzle,
  legalMoves,
  applyMove,
  isGoal,
  heuristic,
  solve,
  type KnotState,
} from './Knot.solver';

// Seeds for Mon-Fri
const SEEDS = [1001, 2002, 3003, 4004, 5005];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const DIFFICULTIES = [1, 2, 3, 4, 5];

function computeMetrics(seed: number, difficulty: number, dayLabel: string) {
  const puzzle = generatePuzzle(seed, difficulty);

  // Solve at all 5 skill levels
  const solutions: Record<number, { moves: number[]; steps: number } | null> = {};
  const solveTimes: Record<number, number> = {};

  for (const level of [1, 2, 3, 4, 5] as const) {
    const start = Date.now();
    solutions[level] = solve(puzzle, level);
    solveTimes[level] = Date.now() - start;
  }

  const optSol = solutions[5];
  const solvable = optSol !== null;

  if (!solvable) {
    return {
      day: dayLabel,
      solvable: false,
      puzzleEntropy: '0.0',
      skillDepth: '0%',
      decisionEntropy: '0.0',
      ciMoves: 0,
      drama: '0.0',
      durationS: (solveTimes[3] / 1000).toFixed(2),
      infoGainRatio: '0.0',
      uniqueSolutions: 0,
      optimalSteps: 0,
      par: puzzle.par,
      gridSize: puzzle.size,
      markedCount: puzzle.marked.length,
    };
  }

  // Replay optimal solution to compute metrics
  const optMoves = optSol!.moves;
  let state: KnotState = {
    ...puzzle,
    path: [],
    closed: false,
    marked: puzzle.marked.map((m) => ({ ...m, satisfied: false })),
  };

  let puzzleEntropy = 0;
  let decisionEntropySum = 0;
  let decisionSteps = 0;
  let ciMoves = 0;
  let maxProgressBeforeBacktrack = 0;
  let currentProgress = 0;
  let prevH = heuristic(state);

  const allStepLegalCounts: number[] = [];

  for (let i = 0; i < optMoves.length; i++) {
    const legal = legalMoves(state);
    const numLegal = legal.length;

    if (numLegal > 1) {
      puzzleEntropy += Math.log2(numLegal);

      // Shannon entropy of legal moves (uniform assumption)
      const p = 1 / numLegal;
      const stepEntropy = -numLegal * p * Math.log2(p);
      decisionEntropySum += stepEntropy;
      decisionSteps++;
    }

    allStepLegalCounts.push(numLegal);

    state = applyMove(state, optMoves[i]);
    const newH = heuristic(state);

    // Counterintuitive: heuristic worsens
    if (newH > prevH) {
      ciMoves++;
    }

    // Drama: track progress
    currentProgress = i + 1;
    if (newH >= prevH) {
      // Backtrack detected (heuristic didn't improve)
      maxProgressBeforeBacktrack = Math.max(
        maxProgressBeforeBacktrack,
        currentProgress / optMoves.length,
      );
    }

    prevH = newH;
  }

  const decisionEntropy = decisionSteps > 0 ? decisionEntropySum / decisionSteps : 0;

  // Drama = max progress fraction before a setback
  const drama = maxProgressBeforeBacktrack > 0 ? maxProgressBeforeBacktrack : currentProgress / optMoves.length;

  // Skill depth: (score_level5 - score_level1) / score_level5
  const score1 = solutions[1]?.steps ?? Infinity;
  const score5 = solutions[5]!.steps;
  const skillDepth = score1 === Infinity ? 1.0 : Math.max(0, (score1 - score5) / score1);

  // Info gain ratio: how much better is the best move vs random
  // Replay and compute at each step
  let infoGainSum = 0;
  let infoGainSteps = 0;
  state = {
    ...puzzle,
    path: [],
    closed: false,
    marked: puzzle.marked.map((m) => ({ ...m, satisfied: false })),
  };

  for (let i = 0; i < optMoves.length; i++) {
    const legal = legalMoves(state);
    if (legal.length > 1) {
      const bestH = heuristic(applyMove(state, optMoves[i]));
      let avgH = 0;
      for (const m of legal) {
        avgH += heuristic(applyMove(state, m));
      }
      avgH /= legal.length;

      // Info gain: how much better is the best move
      if (bestH > 0) {
        infoGainSum += avgH / bestH;
      } else {
        infoGainSum += avgH > 0 ? 2.0 : 1.0;
      }
      infoGainSteps++;
    }
    state = applyMove(state, optMoves[i]);
  }

  const infoGainRatio = infoGainSteps > 0 ? infoGainSum / infoGainSteps : 1.0;

  // Solution uniqueness: count distinct solutions at level 5
  // (Approximate: run solver multiple times with randomness)
  const solLengths = new Set<number>();
  for (let trial = 0; trial < 5; trial++) {
    const s = solve(puzzle, 5);
    if (s) solLengths.add(s.steps);
  }

  return {
    day: dayLabel,
    solvable,
    puzzleEntropy: puzzleEntropy.toFixed(1),
    skillDepth: (skillDepth * 100).toFixed(0) + '%',
    decisionEntropy: decisionEntropy.toFixed(2),
    ciMoves,
    drama: drama.toFixed(2),
    durationS: (solveTimes[3] / 1000).toFixed(2),
    infoGainRatio: infoGainRatio.toFixed(2),
    uniqueSolutions: solLengths.size,
    optimalSteps: optSol!.steps,
    par: puzzle.par,
    gridSize: puzzle.size,
    markedCount: puzzle.marked.length,
  };
}

// Run metrics
console.log('=== Knot Solver Metrics ===\n');

const results: any[] = [];

for (let d = 0; d < DIFFICULTIES.length; d++) {
  const difficulty = DIFFICULTIES[d];
  const seed = SEEDS[d];
  const day = DAYS[d];

  console.log(`Computing ${day} (difficulty=${difficulty}, seed=${seed})...`);
  const result = computeMetrics(seed, difficulty, day);
  results.push(result);
  console.log(`  Solvable: ${result.solvable}`);
  console.log(`  Grid: ${result.gridSize}x${result.gridSize}, Marked: ${result.markedCount}`);
  console.log(`  Optimal: ${result.optimalSteps}, Par: ${result.par}`);
  console.log(`  Puzzle Entropy: ${result.puzzleEntropy}`);
  console.log(`  Skill-Depth: ${result.skillDepth}`);
  console.log(`  Decision Entropy: ${result.decisionEntropy}`);
  console.log(`  Counterintuitive: ${result.ciMoves}`);
  console.log(`  Drama: ${result.drama}`);
  console.log(`  Duration (s): ${result.durationS}`);
  console.log(`  Info Gain Ratio: ${result.infoGainRatio}`);
  console.log(`  Solution Uniqueness: ${result.uniqueSolutions}`);
  console.log('');
}

// Summary table
console.log('\n--- Metric Summary Table ---');
const metrics = ['solvable', 'puzzleEntropy', 'skillDepth', 'decisionEntropy', 'ciMoves', 'drama', 'durationS', 'infoGainRatio', 'uniqueSolutions'];
const metricLabels: Record<string, string> = {
  solvable: 'Solvability',
  puzzleEntropy: 'Puzzle Entropy',
  skillDepth: 'Skill-Depth',
  decisionEntropy: 'Decision Entropy',
  ciMoves: 'Counterintuitive',
  drama: 'Drama',
  durationS: 'Duration (s)',
  infoGainRatio: 'Info Gain Ratio',
  uniqueSolutions: 'Solution Uniqueness',
};

console.log(`| Metric | Mon | Tue | Wed | Thu | Fri | Avg |`);
console.log(`|---|---|---|---|---|---|---|`);

for (const metric of metrics) {
  const values = results.map((r: any) => r[metric]);
  let avg: string;
  if (metric === 'solvable') {
    avg = values.every((v: any) => v) ? '100%' : `${(values.filter((v: any) => v).length / values.length * 100).toFixed(0)}%`;
  } else if (metric === 'skillDepth') {
    const nums = values.map((v: string) => parseFloat(v));
    avg = (nums.reduce((a: number, b: number) => a + b, 0) / nums.length).toFixed(0) + '%';
  } else if (typeof values[0] === 'number') {
    const numAvg = values.reduce((a: number, b: number) => a + b, 0) / values.length;
    avg = Number.isInteger(numAvg) ? numAvg.toString() : numAvg.toFixed(2);
  } else {
    const nums = values.map((v: string) => parseFloat(v));
    avg = (nums.reduce((a: number, b: number) => a + b, 0) / nums.length).toFixed(2);
  }

  const label = metricLabels[metric] || metric;
  const displayValues = values.map((v: any) => metric === 'solvable' ? (v ? 'Y' : 'N') : String(v));
  console.log(`| ${label} | ${displayValues.join(' | ')} | ${avg} |`);
}

// Auto-kill check
console.log('\n--- Auto-Kill Check ---');
const allSolvable = results.every((r: any) => r.solvable);
const avgSkillDepth = results.reduce((a: number, r: any) => a + parseFloat(r.skillDepth), 0) / results.length;
const totalCI = results.reduce((a: number, r: any) => a + r.ciMoves, 0);
const avgDecisionEntropy = results.reduce((a: number, r: any) => a + parseFloat(r.decisionEntropy), 0) / results.length;
const avgPuzzleEntropy = results.reduce((a: number, r: any) => a + parseFloat(r.puzzleEntropy), 0) / results.length;

const kills: string[] = [];
if (!allSolvable) kills.push('Solvability < 100%');
if (avgSkillDepth < 10) kills.push(`Skill-Depth ${avgSkillDepth.toFixed(0)}% < 10%`);
if (totalCI === 0) kills.push('CI = 0 across all puzzles');
if (avgDecisionEntropy < 1.0) kills.push(`Decision Entropy ${avgDecisionEntropy.toFixed(2)} < 1.0`);
if (avgDecisionEntropy > 4.5) kills.push(`Decision Entropy ${avgDecisionEntropy.toFixed(2)} > 4.5`);
if (avgPuzzleEntropy < 5) kills.push(`Puzzle Entropy ${avgPuzzleEntropy.toFixed(1)} < 5`);

if (kills.length > 0) {
  console.log(`AUTO-KILLED: ${kills.join(', ')}`);
} else {
  console.log('PASSED all auto-kill checks');
}
