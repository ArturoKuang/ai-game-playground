/**
 * Nest Metrics Runner
 *
 * Computes quality metrics for the Nest game:
 * Solvability, Puzzle Entropy, Skill-Depth, Decision Entropy,
 * Counterintuitive Moves, Drama, Info Gain Ratio, Algorithm Alignment
 *
 * Run: npx tsx src/solvers/nest-metrics.ts
 */

import {
  generatePuzzle,
  legalMoves,
  applyMove,
  isGoal,
  heuristic,
  solve,
  getMoveScore,
  type NestState,
  type Move,
  type Solution,
} from './Nest.solver';

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
  optimalScore: number;
  budget: number;
  algorithmAlignment: number;
  greedyOptimalGap: number;
}

function cloneForReplay(puzzle: NestState): NestState {
  return {
    brackets: puzzle.brackets.map(b => ({ ...b })),
    matched: new Array(puzzle.brackets.length).fill(false),
    score: 0,
    moves: 0,
    budget: puzzle.budget,
    difficulty: puzzle.difficulty,
    depthMultiplier: puzzle.depthMultiplier,
    comboMultiplier: puzzle.comboMultiplier,
    comboStreak: 0,
    lastColor: -1,
    numColors: puzzle.numColors,
  };
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
  const optimalScore = optimalSol ? optimalSol.score : 0;

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

  // Skill-Depth: (score_level5 - score_level1) / score_level5
  // For optimization games: higher score is better
  const score1 = solutions[1] ? solutions[1].score : 0;
  const score5 = solutions[5] ? solutions[5].score : 1;
  const skillDepth = score5 > 0 ? (score5 - score1) / score5 : 0;

  // Counterintuitive Moves: steps where the optimal move is NOT the highest-immediate-score move
  let ciMoves = 0;
  if (optimalSol) {
    let state = cloneForReplay(puzzle);
    for (const move of optimalSol.moves) {
      const legal = legalMoves(state);
      if (legal.length > 1) {
        // Find the greedy best (highest immediate score)
        let greedyBest = legal[0];
        let greedyBestScore = getMoveScore(state, legal[0]);
        for (let i = 1; i < legal.length; i++) {
          const s = getMoveScore(state, legal[i]);
          if (s > greedyBestScore) {
            greedyBestScore = s;
            greedyBest = legal[i];
          }
        }

        // Check if optimal chose something different from greedy
        const optimalMoveScore = getMoveScore(state, move);
        if (optimalMoveScore < greedyBestScore) {
          ciMoves++;
        }
      }
      state = applyMove(state, move);
    }
  }

  // Drama: progress oscillation at level 3
  let drama = 0;
  const sol3 = solutions[3];
  if (sol3 && sol3.moves.length > 0) {
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

  // Duration
  const t0 = Date.now();
  solve(puzzle, 3);
  const durationS = (Date.now() - t0) / 1000;

  // Info Gain Ratio: optimal_score / random_score
  let infoGainRatio = 1;
  if (optimalSol && score1 > 0) {
    infoGainRatio = optimalSol.score / score1;
  }

  // Solution Uniqueness
  let uniqueSolutions = optimalSol ? 1 : 0;
  if (optimalSol) {
    const sol4 = solutions[4];
    if (sol4 && sol4.score >= optimalSol.score - 1) {
      const sol4Key = sol4.moves.map(m => `${m[0]},${m[1]}`).join(';');
      const sol5Key = optimalSol.moves.map(m => `${m[0]},${m[1]}`).join(';');
      if (sol4Key !== sol5Key) uniqueSolutions++;
    }
    const sol2 = solutions[2];
    if (sol2 && sol2.score >= optimalSol.score - 2) {
      uniqueSolutions++;
    }
  }

  // Algorithm Alignment: measures how much the LIFO constraint shapes play.
  // Two components:
  // 1. LIFO Enforcement: fraction of steps where LIFO blocks at least one pair
  //    (i.e., some unmatched pair exists but is NOT legal due to nesting)
  // 2. Depth Preference: fraction of optimal moves that pick the deepest legal pair
  // Combined: (enforcement + depthPref) / 2
  let algorithmAlignment = 0;
  if (optimalSol && optimalSol.moves.length > 0) {
    let state = cloneForReplay(puzzle);
    let lifoEnforcedSteps = 0;
    let depthPrefCount = 0;

    for (const move of optimalSol.moves) {
      const legal = legalMoves(state);

      // Count total unmatched pairs
      let totalUnmatchedPairs = 0;
      for (let i = 0; i < state.brackets.length; i++) {
        if (!state.matched[i] && state.brackets[i].isOpen) totalUnmatchedPairs++;
      }

      // LIFO is enforced if some pairs are blocked
      if (legal.length < totalUnmatchedPairs) {
        lifoEnforcedSteps++;
      }

      // Depth preference: did optimal pick the deepest available?
      if (legal.length > 0) {
        let maxDepth = -1;
        for (const m of legal) {
          const ds = getMoveScore(state, m);
          if (ds > maxDepth) maxDepth = ds;
        }
        const thisScore = getMoveScore(state, move);
        if (thisScore >= maxDepth) {
          depthPrefCount++;
        }
      }

      state = applyMove(state, move);
    }

    const lifoRate = lifoEnforcedSteps / optimalSol.moves.length;
    const depthRate = depthPrefCount / optimalSol.moves.length;
    algorithmAlignment = (lifoRate + depthRate) / 2;
  }

  // Greedy-Optimal Gap: (optimal_score - greedy_score) / optimal_score
  let greedyOptimalGap = 0;
  if (optimalSol && solutions[3]) {
    greedyOptimalGap = (optimalSol.score - solutions[3].score) / optimalSol.score;
  } else if (optimalSol && !solutions[3]) {
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
    optimalScore,
    budget: puzzle.budget,
    algorithmAlignment,
    greedyOptimalGap,
  };
}

// Run metrics: 5 difficulties x 5 seeds
console.log('=== Nest Metrics ===\n');

const allMetrics: PuzzleMetrics[] = [];

for (let di = 0; di < DIFFICULTIES.length; di++) {
  for (let si = 0; si < SEEDS.length; si++) {
    const diff = DIFFICULTIES[di];
    const seed = SEEDS[si] + di * 1000;
    const dayName = `D${diff}S${si + 1}`;
    const m = computeMetrics(seed, diff, dayName);
    allMetrics.push(m);
  }
}

// Print per-difficulty summary
const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

console.log('Per-difficulty averages:\n');
for (const diff of DIFFICULTIES) {
  const subset = allMetrics.filter(m => m.difficulty === diff);
  const solvableCount = subset.filter(m => m.solvable).length;

  console.log(`Difficulty ${diff}:`);
  console.log(`  Solvability: ${solvableCount}/${subset.length} = ${((solvableCount / subset.length) * 100).toFixed(0)}%`);
  console.log(`  Optimal score: ${avg(subset.map(m => m.optimalScore)).toFixed(1)}, Budget: ${avg(subset.map(m => m.budget)).toFixed(1)}`);
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
if (avgDecisionEntropy < 0.9) {
  killed = true;
  killReason += (killReason ? '; ' : '') + `Decision Entropy ${avgDecisionEntropy.toFixed(2)} < 0.9`;
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
    optimalScore: avg(s.map(m => m.optimalScore)),
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
  ['Optimal Score', ...diffAvgs.map(d => fmt(d.optimalScore, 1)), fmt(avg(allMetrics.map(m => m.optimalScore)), 1)],
];

for (const row of rows) {
  console.log(`| ${row.join(' | ')} |`);
}
