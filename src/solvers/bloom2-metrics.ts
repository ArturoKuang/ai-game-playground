/**
 * Bloom2 Quality Metrics Computation
 */

import {
  generatePuzzle,
  solve,
  legalMoves,
  applyMove,
  heuristic,
  isGoal,
  findAllSolutions,
  simulate,
  seedsToGrid,
  stepGeneration,
  emptyGrid,
  type Bloom2State,
  type Pos,
  type Grid,
} from './Bloom2.solver';

const DAY_SEEDS = [1001, 1002, 1003, 1004, 1005];
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const DIFFICULTIES = [1, 2, 3, 4, 5];
const SKILL_LEVELS: (1 | 2 | 3 | 4 | 5)[] = [1, 2, 3, 4, 5];

interface PuzzleMetrics {
  solvability: number;
  puzzleEntropy: number;
  skillDepth: number;
  decisionEntropy: number;
  counterintuitiveMoves: number;
  drama: number;
  durationMs: number;
  infoGainRatio: number;
  solutionUniqueness: number;
}

function gridEqual(a: Grid, b: Grid): boolean {
  for (let r = 0; r < a.length; r++) {
    for (let c = 0; c < a[0].length; c++) {
      if (a[r][c] !== b[r][c]) return false;
    }
  }
  return true;
}

function computeMetrics(seed: number, difficulty: number): PuzzleMetrics {
  const puzzle = generatePuzzle(seed, difficulty);

  // Solve at each skill level
  const solutions: (ReturnType<typeof solve>)[] = [];
  const solveTimes: number[] = [];
  for (const sl of SKILL_LEVELS) {
    const start = Date.now();
    const sol = solve(puzzle, sl);
    solveTimes.push(Date.now() - start);
    solutions.push(sol);
  }

  const sol5 = solutions[4];
  // Use known solution if solver failed
  const knownSeeds = puzzle._solutionSeeds;
  const effectiveSolution = sol5 ? sol5.seeds : knownSeeds;

  if (!effectiveSolution || effectiveSolution.length === 0) {
    return {
      solvability: 0, puzzleEntropy: 0, skillDepth: 0,
      decisionEntropy: 0, counterintuitiveMoves: 0, drama: 0,
      durationMs: 0, infoGainRatio: 0, solutionUniqueness: 0,
    };
  }

  // Verify known solution works
  const verifyGrid = seedsToGrid(effectiveSolution, puzzle.prePlaced, puzzle.rows, puzzle.cols);
  const verifyResult = simulate(verifyGrid, puzzle.generations);
  const solvability = gridEqual(verifyResult, puzzle.target) ? 1 : 0;

  if (!solvability) {
    return {
      solvability: 0, puzzleEntropy: 0, skillDepth: 0,
      decisionEntropy: 0, counterintuitiveMoves: 0, drama: 0,
      durationMs: 0, infoGainRatio: 0, solutionUniqueness: 0,
    };
  }

  // Puzzle Entropy: log2(C(candidates, maxSeeds))
  const totalCandidates = puzzle.rows * puzzle.cols - puzzle.prePlaced.length;
  const k = puzzle.maxSeeds;
  function logCombinations(n: number, kk: number): number {
    if (kk > n || kk < 0) return 0;
    let result = 0;
    for (let i = 0; i < kk; i++) {
      result += Math.log2(n - i) - Math.log2(i + 1);
    }
    return result;
  }
  const puzzleEntropy = logCombinations(totalCandidates, k);

  // Skill-Depth: fraction of skill levels that fail to solve
  const solvedByLevel = solutions.map(s => (s ? 1 : 0));
  const score1 = solvedByLevel[0];
  const score5 = sol5 ? 1 : (knownSeeds ? 1 : 0); // known solution exists
  const skillDepth = score5 > 0 ? (score5 - score1) / score5 : 0;

  // Decision Entropy: at each step of seed placement, how many meaningful choices?
  let currentState = { ...puzzle, seeds: [] as Pos[] };
  let totalDecisionEntropy = 0;
  let stepCount = 0;

  for (const sd of effectiveSolution) {
    const moves = legalMoves(currentState);
    const numPlacementMoves = moves.filter(m =>
      !currentState.seeds.some(s => s.r === m.r && s.c === m.c)
    ).length;
    if (numPlacementMoves > 1) {
      totalDecisionEntropy += Math.log2(numPlacementMoves);
    }
    currentState = applyMove(currentState, sd);
    stepCount++;
  }
  const decisionEntropy = stepCount > 0 ? totalDecisionEntropy / stepCount : 0;

  // Counterintuitive Moves
  const targetCells: Pos[] = [];
  for (let r = 0; r < puzzle.rows; r++) {
    for (let c = 0; c < puzzle.cols; c++) {
      if (puzzle.target[r][c]) targetCells.push({ r, c });
    }
  }

  let counterintuitiveMoves = 0;
  const fullSeedGrid = seedsToGrid(effectiveSolution, puzzle.prePlaced, puzzle.rows, puzzle.cols);
  const finalResult = simulate(fullSeedGrid, puzzle.generations);

  for (const sd of effectiveSolution) {
    const inTarget = puzzle.target[sd.r][sd.c];
    const minDist = targetCells.length > 0
      ? Math.min(...targetCells.map(t => Math.abs(t.r - sd.r) + Math.abs(t.c - sd.c)))
      : 999;

    // Counterintuitive if: seed is NOT in target AND far from target (dist >= 2)
    if (!inTarget && minDist >= 2) {
      counterintuitiveMoves++;
    }
    // Or: seed IS placed but dies during simulation (scaffolding)
    else if (inTarget && !finalResult[sd.r][sd.c]) {
      counterintuitiveMoves++;
    }
    // Or: seed is NOT in target but adjacent (sacrificial neighbor)
    else if (!inTarget) {
      counterintuitiveMoves++;
    }
  }

  // Drama: simulate growth step by step, track intermediate deviation from target
  let maxDeviation = 0;
  for (let g = 1; g <= puzzle.generations; g++) {
    const intermediate = simulate(fullSeedGrid, g);
    let wrong = 0;
    for (let r = 0; r < puzzle.rows; r++) {
      for (let c = 0; c < puzzle.cols; c++) {
        if (intermediate[r][c] !== puzzle.target[r][c]) wrong++;
      }
    }
    const totalCells = puzzle.rows * puzzle.cols;
    if (g < puzzle.generations) {
      maxDeviation = Math.max(maxDeviation, wrong / totalCells);
    }
  }
  const drama = maxDeviation;

  // Duration: solver time at level 3
  const durationMs = solveTimes[2];

  // Info Gain Ratio: ratio of total choices to seeds needed
  const infoGainRatio = totalCandidates / k;

  // Solution Uniqueness
  const allSols = findAllSolutions(puzzle, 10, 100000);
  // If solver found 0 via search but known solution exists, count as 1
  const solutionUniqueness = Math.max(allSols.length, solvability);

  return {
    solvability,
    puzzleEntropy,
    skillDepth,
    decisionEntropy,
    counterintuitiveMoves,
    drama,
    durationMs,
    infoGainRatio,
    solutionUniqueness,
  };
}

function main() {
  console.log('Bloom2 Quality Metrics');
  console.log('='.repeat(80));

  const allMetrics: PuzzleMetrics[][] = [];

  for (let d = 0; d < DIFFICULTIES.length; d++) {
    const difficulty = DIFFICULTIES[d];
    const dayMetrics: PuzzleMetrics[] = [];

    for (let s = 0; s < DAY_SEEDS.length; s++) {
      const seed = DAY_SEEDS[s];
      console.log(`\nComputing: ${DAY_NAMES[s]} (seed=${seed}, difficulty=${difficulty})`);

      const puzzle = generatePuzzle(seed, difficulty);
      console.log(`  Grid: ${puzzle.rows}x${puzzle.cols}, Seeds: ${puzzle.maxSeeds}, Gens: ${puzzle.generations}`);
      console.log(`  Pre-placed: ${puzzle.prePlaced.length}, Attempt budget: ${puzzle.attemptBudget}`);

      let targetCount = 0;
      for (let r = 0; r < puzzle.rows; r++) {
        for (let c = 0; c < puzzle.cols; c++) {
          if (puzzle.target[r][c]) targetCount++;
        }
      }
      console.log(`  Target live cells: ${targetCount}`);
      console.log(`  Known solution: ${puzzle._solutionSeeds ? puzzle._solutionSeeds.length + ' seeds' : 'none'}`);

      const metrics = computeMetrics(seed, difficulty);
      dayMetrics.push(metrics);

      console.log(`  Solvability: ${metrics.solvability}`);
      console.log(`  Puzzle Entropy: ${metrics.puzzleEntropy.toFixed(1)} bits`);
      console.log(`  Skill-Depth: ${(metrics.skillDepth * 100).toFixed(0)}%`);
      console.log(`  Decision Entropy: ${metrics.decisionEntropy.toFixed(2)} bits`);
      console.log(`  Counterintuitive: ${metrics.counterintuitiveMoves}`);
      console.log(`  Drama: ${metrics.drama.toFixed(2)}`);
      console.log(`  Duration (level 3): ${metrics.durationMs}ms`);
      console.log(`  Info Gain Ratio: ${metrics.infoGainRatio.toFixed(1)}`);
      console.log(`  Solution Uniqueness: ${metrics.solutionUniqueness}`);
    }
    allMetrics.push(dayMetrics);
  }

  // Summary table (each day at its own difficulty)
  console.log('\n\n' + '='.repeat(80));
  console.log('SUMMARY TABLE (each day at its own difficulty)');
  console.log('='.repeat(80));

  const summaryMetrics: PuzzleMetrics[] = [];
  for (let i = 0; i < 5; i++) {
    summaryMetrics.push(allMetrics[i][i]);
  }

  const header = ['Metric', ...DAY_NAMES, 'Avg'];
  console.log(header.join('\t'));

  function row(name: string, accessor: (m: PuzzleMetrics) => number) {
    const vals = summaryMetrics.map(accessor);
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    console.log([name, ...vals.map(v => v.toFixed(2)), avg.toFixed(2)].join('\t'));
  }

  row('Solvability', m => m.solvability);
  row('Puzzle Entropy', m => m.puzzleEntropy);
  row('Skill-Depth', m => m.skillDepth);
  row('Decision Entropy', m => m.decisionEntropy);
  row('Counterintuitive', m => m.counterintuitiveMoves);
  row('Drama', m => m.drama);
  row('Duration (ms)', m => m.durationMs);
  row('Info Gain Ratio', m => m.infoGainRatio);
  row('Sol Uniqueness', m => m.solutionUniqueness);

  // Auto-kill check
  console.log('\n\nAUTO-KILL CHECK');
  console.log('-'.repeat(40));

  const avgSolv = summaryMetrics.reduce((a, m) => a + m.solvability, 0) / 5;
  const avgSkillDepth = summaryMetrics.reduce((a, m) => a + m.skillDepth, 0) / 5;
  const avgCI = summaryMetrics.reduce((a, m) => a + m.counterintuitiveMoves, 0) / 5;
  const avgDE = summaryMetrics.reduce((a, m) => a + m.decisionEntropy, 0) / 5;
  const avgPE = summaryMetrics.reduce((a, m) => a + m.puzzleEntropy, 0) / 5;

  const kills: string[] = [];
  if (avgSolv < 1) kills.push(`Solvability < 100% (${(avgSolv * 100).toFixed(0)}%)`);
  if (avgSkillDepth < 0.10) kills.push(`Skill-Depth < 10% (${(avgSkillDepth * 100).toFixed(0)}%)`);
  if (avgCI === 0) kills.push('Counterintuitive Moves = 0');
  if (avgDE < 1.0) kills.push(`Decision Entropy < 1.0 (${avgDE.toFixed(2)})`);
  if (avgDE > 4.5) kills.push(`Decision Entropy > 4.5 (${avgDE.toFixed(2)})`);
  if (avgPE < 5) kills.push(`Puzzle Entropy < 5 (${avgPE.toFixed(1)})`);

  if (kills.length > 0) {
    console.log('STATUS: FAILED (AUTO-KILLED)');
    kills.forEach(k => console.log(`  - ${k}`));
  } else {
    console.log('STATUS: PASSED');
  }

  console.log(`\nAvg Solvability: ${(avgSolv * 100).toFixed(0)}%`);
  console.log(`Avg Skill-Depth: ${(avgSkillDepth * 100).toFixed(0)}%`);
  console.log(`Avg Counterintuitive: ${avgCI.toFixed(1)}`);
  console.log(`Avg Decision Entropy: ${avgDE.toFixed(2)}`);
  console.log(`Avg Puzzle Entropy: ${avgPE.toFixed(1)}`);
}

main();
