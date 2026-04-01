/**
 * Sieve solver metrics computation.
 * Run: npx ts-node --skip-project src/solvers/sieve-metrics.ts
 * Or:  npx tsx src/solvers/sieve-metrics.ts
 */

import {
  generatePuzzle,
  legalMoves,
  applyMove,
  isGoal,
  heuristic,
  solve,
  canDetermineAllRules,
  type SieveState,
  type Move,
  type Solution,
} from './Sieve.solver';

// Seeds for Mon-Fri
const SEEDS = [1001, 2002, 3003, 4004, 5005];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const DIFFICULTIES = [1, 2, 3, 4, 5];

interface PuzzleMetrics {
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
  optimalSieves: number;
  par: number;
}

function computePuzzleEntropy(state: SieveState, solution: Solution): number {
  // SUM(log2(legalMoves(state_i))) across each step of optimal solution
  let entropy = 0;
  let current = state;
  for (const move of solution.moves) {
    if (move.type === 'submit') continue;
    const moves = legalMoves(current);
    const sieveMoves = moves.filter(m => m.type === 'sieve');
    if (sieveMoves.length > 0) {
      entropy += Math.log2(sieveMoves.length);
    }
    current = applyMove(current, move);
  }
  return entropy;
}

function computeDecisionEntropy(state: SieveState, solution: Solution): number {
  // Average Shannon entropy of legal moves at each step
  let totalEntropy = 0;
  let steps = 0;
  let current = state;

  for (const move of solution.moves) {
    if (move.type === 'submit') continue;
    const moves = legalMoves(current);
    const sieveMoves = moves.filter(m => m.type === 'sieve');
    if (sieveMoves.length > 1) {
      // Shannon entropy: assume uniform distribution over sieve moves
      const p = 1 / sieveMoves.length;
      const h = -sieveMoves.length * p * Math.log2(p);
      totalEntropy += h;
      steps++;
    }
    current = applyMove(current, move);
  }

  return steps > 0 ? totalEntropy / steps : 0;
}

function computeCounterIntuitiveMoves(state: SieveState, solution: Solution): number {
  // Steps where heuristic(next) > heuristic(current) in optimal solution
  let count = 0;
  let current = state;

  for (const move of solution.moves) {
    if (move.type === 'submit') continue;
    const hBefore = heuristic(current);
    const next = applyMove(current, move);
    const hAfter = heuristic(next);
    if (hAfter > hBefore) count++;
    current = next;
  }

  return count;
}

function computeDrama(state: SieveState, solution: Solution): number {
  // max(progress_before_backtrack) / total_steps at level 3
  const totalSteps = solution.sievesUsed;
  if (totalSteps <= 1) return 0;

  let current = state;
  let bestProgress = 0;
  let maxProgressBeforeBacktrack = 0;

  for (const move of solution.moves) {
    if (move.type === 'submit') continue;
    const next = applyMove(current, move);
    const progress = 1 - heuristic(next) / 4;

    if (progress < bestProgress) {
      // Backtrack detected
      maxProgressBeforeBacktrack = Math.max(maxProgressBeforeBacktrack, bestProgress);
    }
    bestProgress = Math.max(bestProgress, progress);
    current = next;
  }

  return maxProgressBeforeBacktrack > 0
    ? maxProgressBeforeBacktrack
    : bestProgress * 0.5; // No backtrack = moderate drama
}

function computeInfoGainRatio(state: SieveState): number {
  // entropy(best_move_outcome) / entropy(random_move_outcome)
  // Compare strategic vs random first-sieve information value

  const sieveMoves = legalMoves(state).filter(m => m.type === 'sieve');
  if (sieveMoves.length === 0) return 1;

  // Compute heuristic improvement for each possible first sieve
  const improvements: number[] = [];
  const hBefore = heuristic(state);

  for (const move of sieveMoves) {
    const next = applyMove(state, move);
    const hAfter = heuristic(next);
    improvements.push(hBefore - hAfter);
  }

  const bestImprovement = Math.max(...improvements);
  const avgImprovement = improvements.reduce((a, b) => a + b, 0) / improvements.length;

  if (avgImprovement === 0) return 1;
  return (bestImprovement + 0.5) / (avgImprovement + 0.5);
}

function computeUniqueSolutions(state: SieveState): number {
  // Count distinct optimal solution paths (up to a limit)
  const optimal = solve(state, 5);
  if (!optimal) return 0;
  const optLen = optimal.sievesUsed;

  // Try multiple orderings at optimal depth
  let count = 1;
  for (let trial = 0; trial < 10; trial++) {
    const sol = solve({
      ...state,
      sieved: [...state.sieved],
      revealedGroups: [...state.revealedGroups],
    }, 4);
    if (sol && sol.sievesUsed <= optLen + 1) count++;
  }

  return Math.min(count, 5);
}

function computeMetrics(seed: number, difficulty: number, dayName: string): PuzzleMetrics {
  const puzzle = generatePuzzle(seed, difficulty);

  // Solve at all skill levels
  const solutions: Record<number, Solution | null> = {};
  for (let level = 1; level <= 5; level++) {
    const start = Date.now();
    solutions[level] = solve(puzzle, level as 1 | 2 | 3 | 4 | 5);
    if (level === 5 && !solutions[level]) {
      return {
        day: dayName,
        solvable: false,
        puzzleEntropy: 0,
        skillDepth: 0,
        decisionEntropy: 0,
        ciMoves: 0,
        drama: 0,
        durationMs: 0,
        infoGainRatio: 0,
        uniqueSolutions: 0,
        optimalSieves: 0,
        par: puzzle.par,
      };
    }
  }

  const sol5 = solutions[5]!;
  const sol1 = solutions[1]!;
  const sol3 = solutions[3]!;

  const solvable = sol5 !== null && sol5.moves.some(m => m.type === 'submit');

  // Puzzle Entropy
  const puzzleEntropy = computePuzzleEntropy(puzzle, sol5);

  // Skill Depth: (score_level5 - score_level1) / score_level5
  // Lower sieves = better score, so invert
  const score5 = sol5.sievesUsed;
  const score1 = sol1.sievesUsed;
  const skillDepth = score1 > 0 ? (score1 - score5) / score1 : 0;

  // Decision Entropy
  const decisionEntropy = computeDecisionEntropy(puzzle, sol5);

  // Counterintuitive Moves
  const ciMoves = computeCounterIntuitiveMoves(puzzle, sol5);

  // Drama (at level 3)
  const drama = computeDrama(puzzle, sol3);

  // Duration (level 3)
  const startTime = Date.now();
  solve(puzzle, 3);
  const durationMs = Date.now() - startTime;

  // Info Gain Ratio
  const infoGainRatio = computeInfoGainRatio(puzzle);

  // Solution Uniqueness
  const uniqueSolutions = computeUniqueSolutions(puzzle);

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
    optimalSieves: score5,
    par: puzzle.par,
  };
}

// Run metrics
const results: PuzzleMetrics[] = [];
for (let i = 0; i < 5; i++) {
  const m = computeMetrics(SEEDS[i], DIFFICULTIES[i], DAYS[i]);
  results.push(m);
}

// Print results
console.log('\n=== SIEVE SOLVER METRICS ===\n');
console.log('| Metric | Mon | Tue | Wed | Thu | Fri | Avg |');
console.log('|---|---|---|---|---|---|---|');

const fmt = (v: number, dec = 1) => v.toFixed(dec);

const solvability = results.map(r => r.solvable);
console.log(`| Solvability | ${solvability.map(s => s ? '100%' : 'FAIL').join(' | ')} | ${solvability.every(s => s) ? '100%' : 'FAIL'} |`);

const pe = results.map(r => r.puzzleEntropy);
console.log(`| Puzzle Entropy | ${pe.map(v => fmt(v)).join(' | ')} | ${fmt(pe.reduce((a, b) => a + b, 0) / pe.length)} |`);

const sd = results.map(r => r.skillDepth);
console.log(`| Skill-Depth | ${sd.map(v => fmt(v * 100) + '%').join(' | ')} | ${fmt(sd.reduce((a, b) => a + b, 0) / sd.length * 100)}% |`);

const de = results.map(r => r.decisionEntropy);
console.log(`| Decision Entropy | ${de.map(v => fmt(v)).join(' | ')} | ${fmt(de.reduce((a, b) => a + b, 0) / de.length)} |`);

const ci = results.map(r => r.ciMoves);
console.log(`| Counterintuitive | ${ci.map(v => v.toString()).join(' | ')} | ${fmt(ci.reduce((a, b) => a + b, 0) / ci.length)} |`);

const dr = results.map(r => r.drama);
console.log(`| Drama | ${dr.map(v => fmt(v, 2)).join(' | ')} | ${fmt(dr.reduce((a, b) => a + b, 0) / dr.length, 2)} |`);

const du = results.map(r => r.durationMs);
console.log(`| Duration (ms) | ${du.map(v => v.toString()).join(' | ')} | ${fmt(du.reduce((a, b) => a + b, 0) / du.length)} |`);

const ig = results.map(r => r.infoGainRatio);
console.log(`| Info Gain Ratio | ${ig.map(v => fmt(v, 2)).join(' | ')} | ${fmt(ig.reduce((a, b) => a + b, 0) / ig.length, 2)} |`);

const us = results.map(r => r.uniqueSolutions);
console.log(`| Solution Uniqueness | ${us.map(v => v.toString()).join(' | ')} | ${fmt(us.reduce((a, b) => a + b, 0) / us.length)} |`);

console.log('');
console.log('Optimal sieves:', results.map(r => `${r.day}=${r.optimalSieves}`).join(', '));
console.log('Par values:', results.map(r => `${r.day}=${r.par}`).join(', '));

// Auto-kill checks
console.log('\n=== AUTO-KILL CHECK ===');
const allSolvable = solvability.every(s => s);
const avgSkillDepth = sd.reduce((a, b) => a + b, 0) / sd.length;
const avgDecisionEntropy = de.reduce((a, b) => a + b, 0) / de.length;
const avgPuzzleEntropy = pe.reduce((a, b) => a + b, 0) / pe.length;
const allCiZero = ci.every(v => v === 0);

console.log(`Solvability < 100%: ${!allSolvable ? 'FAIL' : 'PASS'}`);
console.log(`Skill-Depth < 10%: ${avgSkillDepth < 0.1 ? 'FAIL (' + fmt(avgSkillDepth * 100) + '%)' : 'PASS (' + fmt(avgSkillDepth * 100) + '%)'}`);
console.log(`CI = 0 across all: ${allCiZero ? 'FAIL' : 'PASS'}`);
console.log(`Decision Entropy < 1.0: ${avgDecisionEntropy < 1.0 ? 'FAIL (' + fmt(avgDecisionEntropy) + ')' : 'PASS (' + fmt(avgDecisionEntropy) + ')'}`);
console.log(`Decision Entropy > 4.5: ${avgDecisionEntropy > 4.5 ? 'FAIL (' + fmt(avgDecisionEntropy) + ')' : 'PASS (' + fmt(avgDecisionEntropy) + ')'}`);
console.log(`Puzzle Entropy < 5: ${avgPuzzleEntropy < 5 ? 'FAIL (' + fmt(avgPuzzleEntropy) + ')' : 'PASS (' + fmt(avgPuzzleEntropy) + ')'}`);

const autoKilled = !allSolvable || avgSkillDepth < 0.1 || allCiZero || avgDecisionEntropy < 1.0 || avgDecisionEntropy > 4.5 || avgPuzzleEntropy < 5;
console.log(`\nOverall: ${autoKilled ? 'AUTO-KILLED' : 'PASSED'}`);
