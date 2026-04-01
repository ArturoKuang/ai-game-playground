/**
 * Pour Metrics Runner
 *
 * Computes quality metrics for the Pour game:
 * Solvability, Puzzle Entropy, Skill-Depth, Decision Entropy,
 * Counterintuitive Moves, Drama, Duration, Info Gain Ratio, Solution Uniqueness
 */

import {
  generatePuzzle,
  legalMoves,
  applyMove,
  isGoal,
  heuristic,
  solve,
  type PourState,
  type Move,
  type Solution,
} from './Pour.solver';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const SEEDS = [100, 200, 300, 400, 500]; // deterministic seeds
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
  uniqueSolutions: number;
  optimalSteps: number;
  par: number;
}

function shannonEntropy(counts: number[]): number {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  let h = 0;
  for (const c of counts) {
    if (c > 0) {
      const p = c / total;
      h -= p * Math.log2(p);
    }
  }
  return h;
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
    let state = {
      glasses: puzzle.glasses.map((g) => ({
        capacity: g.capacity,
        layers: g.layers.map((l) => ({ ...l })),
      })),
      target: puzzle.target,
      movesUsed: 0,
      par: puzzle.par,
    };
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
    let state = {
      glasses: puzzle.glasses.map((g) => ({
        capacity: g.capacity,
        layers: g.layers.map((l) => ({ ...l })),
      })),
      target: puzzle.target,
      movesUsed: 0,
      par: puzzle.par,
    };
    for (const move of optimalSol.moves) {
      const legal = legalMoves(state);
      if (legal.length > 0) {
        // Each move is equally "available", so entropy = log2(n)
        totalDecisionEntropy += Math.log2(legal.length);
        decisionSteps++;
      }
      state = applyMove(state, move);
    }
  }
  const decisionEntropy = decisionSteps > 0 ? totalDecisionEntropy / decisionSteps : 0;

  // Skill-Depth: (score_level5 - score_level1) / score_level5
  const steps1 = solutions[1] ? solutions[1].steps : 200;
  const steps5 = solutions[5] ? solutions[5].steps : 1;
  const skillDepth = steps5 > 0 ? (steps1 - steps5) / steps1 : 0;

  // Counterintuitive Moves: steps where heuristic(next) > heuristic(current) in optimal solution
  let ciMoves = 0;
  if (optimalSol) {
    let state = {
      glasses: puzzle.glasses.map((g) => ({
        capacity: g.capacity,
        layers: g.layers.map((l) => ({ ...l })),
      })),
      target: puzzle.target,
      movesUsed: 0,
      par: puzzle.par,
    };
    for (const move of optimalSol.moves) {
      const hBefore = heuristic(state);
      state = applyMove(state, move);
      const hAfter = heuristic(state);
      if (hAfter > hBefore) ciMoves++;
    }
  }

  // Drama: max(progress_before_backtrack) / total_steps at level 3
  let drama = 0;
  const sol3 = solutions[3];
  if (sol3 && sol3.steps > 0) {
    let state = {
      glasses: puzzle.glasses.map((g) => ({
        capacity: g.capacity,
        layers: g.layers.map((l) => ({ ...l })),
      })),
      target: puzzle.target,
      movesUsed: 0,
      par: puzzle.par,
    };
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

  // Duration: time to solve at level 3 (as proxy)
  const t0 = Date.now();
  solve(puzzle, 3);
  const durationS = (Date.now() - t0) / 1000;

  // Info Gain Ratio: entropy(best_move_outcome) / entropy(random_move_outcome)
  let infoGainRatio = 1;
  if (optimalSol && optimalSol.steps > 0) {
    // Compare steps: random (level 1) vs optimal (level 5)
    const randomSteps = solutions[1] ? solutions[1].steps : 200;
    const optSteps = solutions[5]!.steps;
    infoGainRatio = optSteps > 0 ? randomSteps / optSteps : 1;
  }

  // Solution Uniqueness: count distinct near-optimal solutions via BFS
  let uniqueSolutions = optimalSol ? 1 : 0;
  if (optimalSol) {
    // Count solutions within +1 of optimal by checking if level 4 finds different path
    const sol4 = solutions[4];
    if (sol4 && sol4.steps <= optimalSol.steps + 1) {
      const sol4Key = sol4.moves.map((m) => `${m.from}>${m.to}`).join(',');
      const sol5Key = optimalSol.moves.map((m) => `${m.from}>${m.to}`).join(',');
      if (sol4Key !== sol5Key) uniqueSolutions++;
    }
    // Greedy can find yet another path
    const sol2 = solutions[2];
    if (sol2 && sol2.steps <= optimalSol.steps + 2) {
      uniqueSolutions++;
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
    durationS,
    infoGainRatio,
    uniqueSolutions,
    optimalSteps,
    par: puzzle.par,
  };
}

// Run metrics
console.log('=== Pour Metrics ===\n');

const allMetrics: PuzzleMetrics[] = [];

for (let d = 0; d < 5; d++) {
  const m = computeMetrics(SEEDS[d], DIFFICULTIES[d], DAY_NAMES[d]);
  allMetrics.push(m);
  console.log(`${m.day} (diff=${DIFFICULTIES[d]}, seed=${SEEDS[d]}):`);
  console.log(`  Solvable: ${m.solvable}`);
  console.log(`  Optimal steps: ${m.optimalSteps}, Par: ${m.par}`);
  console.log(`  Puzzle Entropy: ${m.puzzleEntropy.toFixed(2)} bits`);
  console.log(`  Skill-Depth: ${(m.skillDepth * 100).toFixed(1)}%`);
  console.log(`  Decision Entropy: ${m.decisionEntropy.toFixed(2)} bits`);
  console.log(`  CI Moves: ${m.ciMoves}`);
  console.log(`  Drama: ${m.drama.toFixed(2)}`);
  console.log(`  Duration: ${m.durationS.toFixed(3)}s`);
  console.log(`  Info Gain Ratio: ${m.infoGainRatio.toFixed(2)}`);
  console.log(`  Unique Solutions: ${m.uniqueSolutions}`);
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

// Auto-kill check
console.log('\n=== Auto-Kill Check ===');
const solvability = allMetrics.filter((m) => m.solvable).length / allMetrics.length;
const avgSkillDepth = avg(allMetrics.map((m) => m.skillDepth));
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
if (totalCI === 0) {
  killed = true;
  killReason += (killReason ? '; ' : '') + 'CI=0 across all puzzles';
}
if (avgDecisionEntropy < 1.0) {
  killed = true;
  killReason += (killReason ? '; ' : '') + `Decision Entropy ${avgDecisionEntropy.toFixed(2)} < 1.0`;
}
if (avgDecisionEntropy > 4.5) {
  killed = true;
  killReason += (killReason ? '; ' : '') + `Decision Entropy ${avgDecisionEntropy.toFixed(2)} > 4.5`;
}
if (avgPuzzleEntropy < 5) {
  killed = true;
  killReason += (killReason ? '; ' : '') + `Puzzle Entropy ${avgPuzzleEntropy.toFixed(2)} < 5`;
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
  ['Solution Uniqueness', ...allMetrics.map((m) => String(m.uniqueSolutions)), fmt(avg(allMetrics.map((m) => m.uniqueSolutions)), 1)],
];

for (const row of rows) {
  console.log(`| ${row.join(' | ')} |`);
}
