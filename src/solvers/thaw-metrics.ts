/**
 * Thaw solver metrics computation.
 * Runs 5 puzzles (Mon-Fri seeds) x 5 skill levels.
 */

import {
  generatePuzzle,
  legalMoves,
  applyMove,
  isGoal,
  heuristic,
  solve,
  type ThawState,
  type Move,
} from './Thaw.solver';

function cloneState(s: ThawState): ThawState {
  return {
    grid: s.grid.map((row) => [...row]),
    rows: s.rows,
    cols: s.cols,
    heatUsed: s.heatUsed,
    heatBudget: s.heatBudget,
  };
}

/* ─── Metrics for a single puzzle ─── */
function computeMetrics(seed: number, difficulty: number, dayName: string) {
  const puzzle = generatePuzzle(seed, difficulty);
  const iceTotal = puzzle.grid.flat().filter((c) => c === 1).length;

  // Solve at all 5 skill levels
  const solutions: (ReturnType<typeof solve>)[] = [];
  const solveTimes: number[] = [];
  for (let level = 1; level <= 5; level++) {
    const p = cloneState(puzzle);
    p.heatBudget = 99; // remove budget limit for solving
    const start = Date.now();
    const sol = solve(p, level as 1 | 2 | 3 | 4 | 5);
    solveTimes.push(Date.now() - start);
    solutions.push(sol);
  }

  // Solvability: does level 5 solve it?
  const solvable = solutions[4] !== null;

  // Optimal solution (level 5)
  const optSol = solutions[4];
  const optSteps = optSol ? optSol.steps : -1;

  // Score per level = steps taken (lower is better)
  const scores = solutions.map((s) => (s ? s.steps : 999));

  // Skill-Depth: (score_level1 - score_level5) / score_level1
  // For a "lower is better" game, skill-depth = (worst - best) / worst
  const scoreL1 = scores[0];
  const scoreL5 = scores[4];
  const skillDepth = scoreL1 > 0 ? (scoreL1 - scoreL5) / scoreL1 : 0;

  // Puzzle Entropy: sum of log2(legalMoves) at each step of optimal solution
  let puzzleEntropy = 0;
  if (optSol) {
    let state = cloneState(puzzle);
    state.heatBudget = 99;
    for (const move of optSol.moves) {
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
  if (optSol) {
    let state = cloneState(puzzle);
    state.heatBudget = 99;
    for (const move of optSol.moves) {
      const legal = legalMoves(state);
      if (legal.length > 1) {
        // Shannon entropy for uniform distribution (all moves equally likely)
        totalDecisionEntropy += Math.log2(legal.length);
        decisionSteps++;
      }
      state = applyMove(state, move);
    }
  }
  const decisionEntropy = decisionSteps > 0 ? totalDecisionEntropy / decisionSteps : 0;

  // Counterintuitive Moves: steps where heuristic(next) >= heuristic(current)
  // (i.e., ice count doesn't decrease or a "bridge" tap that melts fewer cells)
  let counterintuitive = 0;
  if (optSol) {
    let state = cloneState(puzzle);
    state.heatBudget = 99;
    for (const move of optSol.moves) {
      const hBefore = heuristic(state);
      const next = applyMove(state, move);
      const hAfter = heuristic(next);
      // In this game, heuristic = ice count. A "good" move melts lots of ice.
      // A counterintuitive move melts very few (1-2) when better immediate options exist.
      const legal = legalMoves(state);
      if (legal.length > 1) {
        // Check if there's a move that melts more ice immediately
        let maxMelt = 0;
        for (const m of legal) {
          const ns = applyMove(state, m);
          const melt = hBefore - heuristic(ns);
          if (melt > maxMelt) maxMelt = melt;
        }
        const thisMelt = hBefore - hAfter;
        // Counterintuitive: optimal move melts significantly less than best greedy
        if (thisMelt < maxMelt * 0.75) {
          counterintuitive++;
        }
      }
      state = next;
    }
  }

  // Drama: max progress before needing to "waste" a tap on bridge building
  // Measured as max(progress so far) / total when level 3 backtracks or picks suboptimal
  let drama = 0;
  const l3Sol = solutions[2];
  if (l3Sol) {
    let state = cloneState(puzzle);
    state.heatBudget = 99;
    let maxProgress = 0;
    const totalIce = iceTotal;
    for (let i = 0; i < l3Sol.moves.length; i++) {
      state = applyMove(state, l3Sol.moves[i]);
      const progress = 1 - heuristic(state) / totalIce;
      maxProgress = Math.max(maxProgress, progress);
      // Drama = how far into the solve we are at max progress (relative to total steps)
      if (progress === maxProgress) {
        drama = (i + 1) / l3Sol.moves.length;
      }
    }
  }

  // Duration Fitness: solver time at level 3
  const durationMs = solveTimes[2];

  // Info Gain Ratio: ice-melted-per-tap for optimal vs random
  const l5MeltPerTap = optSol ? iceTotal / optSol.steps : 0;
  const l1MeltPerTap = solutions[0] ? iceTotal / solutions[0].steps : 0;
  const infoGainRatio = l1MeltPerTap > 0 ? l5MeltPerTap / l1MeltPerTap : 0;

  // Solution Uniqueness: check if there are alternate optimal solutions
  // Simple heuristic: compare level 4 and level 5 solutions
  let uniqueSolutions = 1;
  if (optSol && solutions[3]) {
    const s4Moves = solutions[3].moves.map((m) => `${m.r},${m.c}`).join('|');
    const s5Moves = optSol.moves.map((m) => `${m.r},${m.c}`).join('|');
    if (s4Moves !== s5Moves && solutions[3].steps === optSol.steps) {
      uniqueSolutions = 2;
    }
  }
  // Also check greedy+lookahead vs optimal
  if (optSol && solutions[2] && solutions[2].steps === optSol.steps) {
    const s3Moves = solutions[2].moves.map((m) => `${m.r},${m.c}`).join('|');
    const s5Moves = optSol.moves.map((m) => `${m.r},${m.c}`).join('|');
    if (s3Moves !== s5Moves) uniqueSolutions++;
  }

  return {
    dayName,
    seed,
    difficulty,
    solvable,
    iceTotal,
    heatBudget: puzzle.heatBudget,
    optSteps,
    scores,
    skillDepth,
    puzzleEntropy,
    decisionEntropy,
    counterintuitive,
    drama,
    durationMs,
    infoGainRatio,
    uniqueSolutions,
  };
}

/* ─── Main ─── */
const days = [
  { name: 'Mon', seed: 1001, difficulty: 1 },
  { name: 'Tue', seed: 1002, difficulty: 2 },
  { name: 'Wed', seed: 1003, difficulty: 3 },
  { name: 'Thu', seed: 1004, difficulty: 4 },
  { name: 'Fri', seed: 1005, difficulty: 5 },
];

console.log('=== Thaw Solver Metrics ===\n');

const results = days.map((d) => computeMetrics(d.seed, d.difficulty, d.name));

// Print puzzle info
console.log('Puzzle Info:');
for (const r of results) {
  console.log(
    `  ${r.dayName} (diff=${r.difficulty}): ${r.iceTotal} ice, budget=${r.heatBudget}, optimal=${r.optSteps}, solvable=${r.solvable}`,
  );
}
console.log();

// Print scores per skill level
console.log('Steps per skill level (lower is better):');
console.log('  Day     L1    L2    L3    L4    L5');
for (const r of results) {
  console.log(
    `  ${r.dayName}     ${r.scores.map((s) => String(s).padStart(4)).join('  ')}`,
  );
}
console.log();

// Print metric table
console.log('Metrics:');
console.log(
  '  Metric               Mon       Tue       Wed       Thu       Fri       Avg',
);

function row(name: string, vals: number[], fmt: (n: number) => string) {
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  console.log(
    `  ${name.padEnd(20)} ${vals.map((v) => fmt(v).padStart(8)).join('  ')}  ${fmt(avg).padStart(8)}`,
  );
}

row('Solvability', results.map((r) => (r.solvable ? 100 : 0)), (n) => `${n}%`);
row('Puzzle Entropy', results.map((r) => r.puzzleEntropy), (n) => n.toFixed(1));
row('Skill-Depth', results.map((r) => r.skillDepth * 100), (n) => `${n.toFixed(0)}%`);
row('Decision Entropy', results.map((r) => r.decisionEntropy), (n) => n.toFixed(2));
row('Counterintuitive', results.map((r) => r.counterintuitive), (n) => n.toFixed(0));
row('Drama', results.map((r) => r.drama), (n) => n.toFixed(2));
row('Duration (ms)', results.map((r) => r.durationMs), (n) => n.toFixed(0));
row('Info Gain Ratio', results.map((r) => r.infoGainRatio), (n) => n.toFixed(2));
row('Solution Uniq', results.map((r) => r.uniqueSolutions), (n) => n.toFixed(0));

console.log('\n--- Auto-Kill Check ---');
const avgSolvability = results.every((r) => r.solvable) ? 100 : 0;
const avgSkillDepth = results.reduce((a, r) => a + r.skillDepth, 0) / results.length;
const avgCI = results.reduce((a, r) => a + r.counterintuitive, 0) / results.length;
const avgDecisionEntropy = results.reduce((a, r) => a + r.decisionEntropy, 0) / results.length;
const avgPuzzleEntropy = results.reduce((a, r) => a + r.puzzleEntropy, 0) / results.length;

const kills: string[] = [];
if (avgSolvability < 100) kills.push(`Solvability < 100% (${avgSolvability}%)`);
if (avgSkillDepth < 0.1) kills.push(`Skill-Depth < 10% (${(avgSkillDepth * 100).toFixed(0)}%)`);
if (avgCI === 0) kills.push('Counterintuitive Moves = 0 across all puzzles');
if (avgDecisionEntropy < 1.0) kills.push(`Decision Entropy < 1.0 (${avgDecisionEntropy.toFixed(2)})`);
if (avgDecisionEntropy > 4.5) kills.push(`Decision Entropy > 4.5 (${avgDecisionEntropy.toFixed(2)})`);
if (avgPuzzleEntropy < 5) kills.push(`Puzzle Entropy < 5 (${avgPuzzleEntropy.toFixed(1)})`);

if (kills.length > 0) {
  console.log('AUTO-KILL: FAILED');
  for (const k of kills) console.log(`  - ${k}`);
} else {
  console.log('AUTO-KILL: PASSED');
}
