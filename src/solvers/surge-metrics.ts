/**
 * Surge quality metrics computation.
 *
 * Run: node --experimental-specifier-resolution=node src/solvers/surge-metrics.mjs
 * Or:  npx tsx src/solvers/surge-metrics.mjs
 */

// We inline the solver logic since we can't import .ts directly in .mjs
// So let's just use tsx to run this as a .ts file instead.

import {
  generatePuzzle,
  legalMoves,
  meaningfulMoves,
  applyMove,
  isGoal,
  heuristic,
  solve,
  tapCell,
} from './Surge.solver';

const SEEDS = [10001, 10002, 10003, 10004, 10005]; // Mon-Fri
const DIFFICULTIES = [1, 2, 3, 4, 5];
const SKILL_LEVELS = [1, 2, 3, 4, 5];

function computeMetrics() {
  const results = [];

  for (let di = 0; di < DIFFICULTIES.length; di++) {
    const seed = SEEDS[di];
    const diff = DIFFICULTIES[di];
    const dayName = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][di];

    console.log(`\n--- ${dayName} (seed=${seed}, diff=${diff}) ---`);

    const puzzle = generatePuzzle(seed, diff);
    console.log(`  Grid: ${puzzle.size}x${puzzle.size}, Par: ${puzzle.par}`);

    // Solve at all skill levels
    const solutions = {};
    const scores = {};
    for (const sl of SKILL_LEVELS) {
      const t0 = Date.now();
      const sol = solve(puzzle, sl);
      const dt = Date.now() - t0;
      solutions[sl] = sol;
      scores[sl] = sol ? sol.steps : Infinity;
      console.log(`  Skill ${sl}: ${sol ? sol.steps + ' taps' : 'FAILED'} (${dt}ms)`);
    }

    // Solvability
    const solvable = solutions[5] !== null;

    // Puzzle Entropy: sum of log2(meaningfulMoves) along optimal solution
    let puzzleEntropy = 0;
    if (solutions[5]) {
      let state = { ...puzzle, grid: [...puzzle.grid], taps: 0 };
      for (const move of solutions[5].moves) {
        const meaningful = meaningfulMoves(state);
        if (meaningful.length > 1) {
          puzzleEntropy += Math.log2(meaningful.length);
        }
        state = applyMove(state, move);
      }
    }

    // Skill-Depth: (score5 - score1) / score5
    const s1 = scores[1] === Infinity ? (puzzle.par + 5) : scores[1];
    const s5 = scores[5] === Infinity ? (puzzle.par + 5) : scores[5];
    // Lower taps = better, so skill depth = (s1 - s5) / s1
    const skillDepth = s5 > 0 && s1 > s5 ? (s1 - s5) / s1 : 0;

    // Decision Entropy: average Shannon entropy of meaningful moves at each step
    let decisionEntropy = 0;
    let decisionSteps = 0;
    if (solutions[5]) {
      let state = { ...puzzle, grid: [...puzzle.grid], taps: 0 };
      for (const move of solutions[5].moves) {
        const meaningful = meaningfulMoves(state);
        if (meaningful.length > 1) {
          // Uniform distribution assumption -> entropy = log2(n)
          decisionEntropy += Math.log2(meaningful.length);
          decisionSteps++;
        }
        state = applyMove(state, move);
      }
      decisionEntropy = decisionSteps > 0 ? decisionEntropy / decisionSteps : 0;
    }

    // Counterintuitive moves: steps where heuristic(next) > heuristic(current)
    let ciMoves = 0;
    if (solutions[5]) {
      let state = { ...puzzle, grid: [...puzzle.grid], taps: 0 };
      for (const move of solutions[5].moves) {
        const h_before = heuristic(state);
        state = applyMove(state, move);
        const h_after = heuristic(state);
        if (h_after > h_before) ciMoves++;
      }
    }

    // Drama: max progress before backtrack (use best available solution)
    let drama = 0;
    const dramaSol = solutions[3] || solutions[5];
    if (dramaSol) {
      let state = { ...puzzle, grid: [...puzzle.grid], taps: 0 };
      let bestH = heuristic(state);
      let maxProgress = 0;
      const totalSteps = dramaSol.moves.length;

      for (let i = 0; i < dramaSol.moves.length; i++) {
        state = applyMove(state, dramaSol.moves[i]);
        const h = heuristic(state);
        if (h < bestH) {
          bestH = h;
          maxProgress = (i + 1) / totalSteps;
        } else if (h > bestH && maxProgress > 0) {
          drama = Math.max(drama, maxProgress);
        }
      }
      if (drama === 0) drama = maxProgress; // no backtrack = linear progress
    }

    // Duration fitness: time for skill level 3 solve
    let durationS = 0;
    {
      const t0 = Date.now();
      solve({ ...puzzle, grid: [...puzzle.grid], taps: 0 }, 3);
      durationS = (Date.now() - t0) / 1000;
    }

    // Info Gain Ratio: entropy(best_move) / entropy(random_move)
    let infoGainRatio = 1;
    if (solutions[5] && solutions[5].moves.length > 0) {
      let totalBestGain = 0;
      let totalRandomGain = 0;
      let steps = 0;

      let state = { ...puzzle, grid: [...puzzle.grid], taps: 0 };
      for (const move of solutions[5].moves) {
        const h_before = heuristic(state);
        const bestNext = applyMove(state, move);
        const h_best = heuristic(bestNext);
        totalBestGain += Math.max(0, h_before - h_best);

        // Random: average gain across meaningful moves
        const meaningful = meaningfulMoves(state);
        let randomGainSum = 0;
        for (const m of meaningful) {
          const rn = applyMove(state, m);
          randomGainSum += Math.max(0, h_before - heuristic(rn));
        }
        totalRandomGain += randomGainSum / meaningful.length;
        steps++;

        state = bestNext;
      }

      if (totalRandomGain > 0) {
        infoGainRatio = totalBestGain / totalRandomGain;
      }
    }

    // Solution Uniqueness: try solving with different starting strategies
    let uniqueSolutions = 0;
    const solutionKeys = new Set();
    for (let attempt = 0; attempt < 5; attempt++) {
      const sol = solve(
        { ...puzzle, grid: [...puzzle.grid], taps: 0 },
        5,
      );
      if (sol) {
        const key = sol.moves.join(',');
        solutionKeys.add(key);
      }
    }
    uniqueSolutions = solutionKeys.size;

    const dayResult = {
      day: dayName,
      solvable,
      puzzleEntropy: puzzleEntropy.toFixed(1),
      skillDepth: (skillDepth * 100).toFixed(1),
      decisionEntropy: decisionEntropy.toFixed(2),
      ciMoves,
      drama: drama.toFixed(2),
      durationS: durationS.toFixed(2),
      infoGainRatio: infoGainRatio.toFixed(2),
      uniqueSolutions,
      optimalTaps: s5,
      par: puzzle.par,
      gridSize: puzzle.size,
    };

    results.push(dayResult);
    console.log(`  Results:`, dayResult);
  }

  // Summary
  console.log('\n\n=== SUMMARY ===');
  console.log('| Metric | Mon | Tue | Wed | Thu | Fri | Avg |');
  console.log('|---|---|---|---|---|---|---|');

  const metrics = [
    { name: 'Solvability', key: 'solvable', fmt: v => v ? '100%' : 'FAIL' },
    { name: 'Puzzle Entropy', key: 'puzzleEntropy', fmt: v => v },
    { name: 'Skill-Depth', key: 'skillDepth', fmt: v => v + '%' },
    { name: 'Decision Entropy', key: 'decisionEntropy', fmt: v => v },
    { name: 'Counterintuitive', key: 'ciMoves', fmt: v => String(v) },
    { name: 'Drama', key: 'drama', fmt: v => v },
    { name: 'Duration (s)', key: 'durationS', fmt: v => v },
    { name: 'Info Gain Ratio', key: 'infoGainRatio', fmt: v => v },
    { name: 'Solution Uniqueness', key: 'uniqueSolutions', fmt: v => String(v) },
  ];

  for (const m of metrics) {
    const vals = results.map(r => m.fmt(r[m.key]));
    const numVals = results.map(r => {
      const v = r[m.key];
      if (typeof v === 'boolean') return v ? 100 : 0;
      return parseFloat(v);
    });
    const avg = (numVals.reduce((a, b) => a + b, 0) / numVals.length).toFixed(1);
    console.log(`| ${m.name} | ${vals.join(' | ')} | ${avg} |`);
  }

  // Auto-kill check
  console.log('\n=== AUTO-KILL CHECK ===');
  const allSolvable = results.every(r => r.solvable);
  const avgSkillDepth = results.reduce((a, r) => a + parseFloat(r.skillDepth), 0) / results.length;
  const totalCI = results.reduce((a, r) => a + r.ciMoves, 0);
  const avgDecisionEntropy = results.reduce((a, r) => a + parseFloat(r.decisionEntropy), 0) / results.length;
  const avgPuzzleEntropy = results.reduce((a, r) => a + parseFloat(r.puzzleEntropy), 0) / results.length;

  let killed = false;
  if (!allSolvable) { console.log('KILL: Solvability < 100%'); killed = true; }
  if (avgSkillDepth < 10) { console.log(`KILL: Skill-Depth ${avgSkillDepth.toFixed(1)}% < 10%`); killed = true; }
  if (totalCI === 0) { console.log('KILL: Counterintuitive Moves = 0 across all puzzles'); killed = true; }
  if (avgDecisionEntropy < 1.0) { console.log(`KILL: Decision Entropy ${avgDecisionEntropy.toFixed(2)} < 1.0`); killed = true; }
  if (avgDecisionEntropy > 4.5) { console.log(`KILL: Decision Entropy ${avgDecisionEntropy.toFixed(2)} > 4.5`); killed = true; }
  if (avgPuzzleEntropy < 5) { console.log(`KILL: Puzzle Entropy ${avgPuzzleEntropy.toFixed(1)} < 5`); killed = true; }

  if (!killed) {
    console.log('PASSED all auto-kill checks');
  }

  return { results, killed };
}

computeMetrics();
