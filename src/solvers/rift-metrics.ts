/**
 * Rift quality metrics computation.
 *
 * Run: npx tsx src/solvers/rift-metrics.ts
 */

import {
  generatePuzzle,
  legalMoves,
  applyMove,
  isGoal,
  heuristic,
  solve,
  computeAlgorithmAlignment,
  type RiftState,
  type Move,
} from './Rift.solver';

const SEEDS = [10001, 10002, 10003, 10004, 10005];
const DIFFICULTIES = [1, 2, 3, 4, 5];
const SKILL_LEVELS: (1 | 2 | 3 | 4 | 5)[] = [1, 2, 3, 4, 5];

/**
 * Count strategically meaningful choices at a given state.
 * Instead of counting ALL unprobed cells, we count:
 * - How many untraced rows the player could choose to work on
 * - Within the current row being worked on, how many columns are in the unknown range
 * This gives a more realistic decision entropy.
 */
function meaningfulChoices(state: RiftState): number {
  const untracedRows = state.traced.filter((t) => !t).length;
  if (untracedRows === 0) return 1;

  // For each untraced row, compute the unknown range size
  let totalMeaningful = 0;
  for (let r = 0; r < state.rows; r++) {
    if (state.traced[r]) continue;
    let lo = 0;
    let hi = state.cols - 1;
    for (let c = 0; c < state.cols; c++) {
      const key = `${r},${c}`;
      if (state.probes.has(key)) {
        if (state.probes.get(key)!) {
          lo = Math.max(lo, c + 1);
        } else {
          hi = Math.min(hi, c);
        }
      }
    }
    const range = Math.max(1, hi - lo + 1);
    totalMeaningful += range;
  }

  // The meaningful choice count is the row choice + column choice
  // A reasonable model: player picks a row (untracedRows choices) then a column (avg range)
  const avgRange = totalMeaningful / untracedRows;
  return Math.max(2, Math.ceil(untracedRows * Math.min(avgRange, 5)));
}

function cloneState(s: RiftState): RiftState {
  return {
    ...s,
    probes: new Map(s.probes),
    traced: [...s.traced],
    faultLine: [...s.faultLine],
  };
}

function computeMetrics() {
  const results: Array<{
    day: string;
    seed: number;
    diff: number;
    solvable: boolean;
    puzzleEntropy: string;
    skillDepth: string;
    decisionEntropy: string;
    ciMoves: number;
    drama: string;
    durationS: string;
    infoGainRatio: string;
    algAlignment: string;
    greedyOptimalGap: string;
    optimalProbes: number;
    budget: number;
    gridSize: string;
  }> = [];

  for (let di = 0; di < DIFFICULTIES.length; di++) {
    const diff = DIFFICULTIES[di];
    const dayName = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][di];

    // Run across multiple seeds per difficulty
    for (const seed of SEEDS) {
      console.log(`\n--- ${dayName} (seed=${seed}, diff=${diff}) ---`);

      const puzzle = generatePuzzle(seed, diff);
      console.log(`  Grid: ${puzzle.rows}x${puzzle.cols}, Budget: ${puzzle.budget}`);
      console.log(`  Fault line: [${puzzle.faultLine.join(', ')}]`);

      // Solve at all skill levels
      const solutions: Record<number, ReturnType<typeof solve>> = {};
      const scores: Record<number, number> = {};
      for (const sl of SKILL_LEVELS) {
        const fresh = cloneState(puzzle);
        const t0 = Date.now();
        const sol = solve(fresh, sl);
        const dt = Date.now() - t0;
        solutions[sl] = sol;
        scores[sl] = sol ? sol.steps : Infinity;
        console.log(`  Skill ${sl}: ${sol ? sol.steps + ' probes' : 'FAILED'} (${dt}ms)`);
      }

      // Solvability
      const solvable = solutions[5] !== null;

      // Puzzle Entropy: sum of log2(meaningfulChoices) along optimal solution
      let puzzleEntropy = 0;
      if (solutions[5]) {
        let state = cloneState(puzzle);
        for (const move of solutions[5].moves) {
          const mc = meaningfulChoices(state);
          if (mc > 1) {
            puzzleEntropy += Math.log2(mc);
          }
          state = applyMove(state, move);
        }
      }

      // Skill-Depth: (worst - best) / worst
      const s1 = scores[1] === Infinity ? puzzle.budget + 10 : scores[1];
      const s5 = scores[5] === Infinity ? puzzle.budget + 10 : scores[5];
      const skillDepth = s1 > s5 && s1 > 0 ? (s1 - s5) / s1 : 0;

      // Greedy-Optimal Gap: (greedy - optimal) / greedy
      const s2 = scores[2] === Infinity ? puzzle.budget + 10 : scores[2];
      const greedyOptimalGap = s2 > s5 && s2 > 0 ? (s2 - s5) / s2 : 0;

      // Decision Entropy: average log2(meaningful choices) per step along optimal path
      let decisionEntropy = 0;
      let decisionSteps = 0;
      if (solutions[5]) {
        let state = cloneState(puzzle);
        for (const move of solutions[5].moves) {
          const mc = meaningfulChoices(state);
          if (mc > 1) {
            decisionEntropy += Math.log2(mc);
            decisionSteps++;
          }
          state = applyMove(state, move);
        }
        decisionEntropy = decisionSteps > 0 ? decisionEntropy / decisionSteps : 0;
      }

      // Counterintuitive moves: steps where heuristic(next) > heuristic(current)
      let ciMoves = 0;
      if (solutions[5]) {
        let state = cloneState(puzzle);
        for (const move of solutions[5].moves) {
          const h_before = heuristic(state);
          state = applyMove(state, move);
          const h_after = heuristic(state);
          if (h_after > h_before) ciMoves++;
        }
      }

      // Drama: max progress before backtrack at level 3
      let drama = 0;
      const dramaSol = solutions[3] || solutions[5];
      if (dramaSol) {
        let state = cloneState(puzzle);
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
        if (drama === 0) drama = maxProgress;
      }

      // Duration fitness
      let durationS = 0;
      {
        const fresh = cloneState(puzzle);
        const t0 = Date.now();
        solve(fresh, 3);
        durationS = (Date.now() - t0) / 1000;
      }

      // Info Gain Ratio
      let infoGainRatio = 1;
      if (solutions[5] && solutions[5].moves.length > 0) {
        let totalBestGain = 0;
        let totalRandomGain = 0;

        let state = cloneState(puzzle);
        for (const move of solutions[5].moves) {
          const h_before = heuristic(state);
          const bestNext = applyMove(state, move);
          const h_best = heuristic(bestNext);
          totalBestGain += Math.max(0, h_before - h_best);

          // Sample random moves for comparison (limit to 20 for speed)
          const legal = legalMoves(state);
          const sampleSize = Math.min(legal.length, 20);
          let randomGainSum = 0;
          const step = Math.max(1, Math.floor(legal.length / sampleSize));
          let sampled = 0;
          for (let i = 0; i < legal.length && sampled < sampleSize; i += step) {
            const rn = applyMove(state, legal[i]);
            randomGainSum += Math.max(0, h_before - heuristic(rn));
            sampled++;
          }
          totalRandomGain += sampled > 0 ? randomGainSum / sampled : 0;

          state = bestNext;
        }

        if (totalRandomGain > 0) {
          infoGainRatio = totalBestGain / totalRandomGain;
        }
      }

      // Algorithm Alignment (binary search specific)
      let algAlignment = 0;
      if (solutions[5]) {
        algAlignment = computeAlgorithmAlignment(puzzle, solutions[5].moves);
      }

      results.push({
        day: dayName,
        seed,
        diff,
        solvable,
        puzzleEntropy: puzzleEntropy.toFixed(1),
        skillDepth: (skillDepth * 100).toFixed(1),
        decisionEntropy: decisionEntropy.toFixed(2),
        ciMoves,
        drama: drama.toFixed(2),
        durationS: durationS.toFixed(3),
        infoGainRatio: infoGainRatio.toFixed(2),
        algAlignment: (algAlignment * 100).toFixed(1),
        greedyOptimalGap: (greedyOptimalGap * 100).toFixed(1),
        optimalProbes: s5,
        budget: puzzle.budget,
        gridSize: `${puzzle.rows}x${puzzle.cols}`,
      });
    }
  }

  // Aggregate per difficulty
  console.log('\n\n=== SUMMARY (averaged across seeds per difficulty) ===');
  console.log('| Metric | Diff 1 | Diff 2 | Diff 3 | Diff 4 | Diff 5 | Avg |');
  console.log('|---|---|---|---|---|---|---|');

  for (const diff of DIFFICULTIES) {
    const subset = results.filter((r) => r.diff === diff);
    const allSolvable = subset.every((r) => r.solvable);
    if (!allSolvable) {
      console.log(`  WARNING: Diff ${diff} has unsolvable puzzles!`);
    }
  }

  const metricKeys: Array<{
    name: string;
    extract: (r: (typeof results)[0]) => number;
    fmt: (v: number) => string;
  }> = [
    { name: 'Solvability', extract: (r) => (r.solvable ? 100 : 0), fmt: (v) => v + '%' },
    { name: 'Puzzle Entropy', extract: (r) => parseFloat(r.puzzleEntropy), fmt: (v) => v.toFixed(1) },
    { name: 'Skill-Depth', extract: (r) => parseFloat(r.skillDepth), fmt: (v) => v.toFixed(1) + '%' },
    { name: 'Decision Entropy', extract: (r) => parseFloat(r.decisionEntropy), fmt: (v) => v.toFixed(2) },
    { name: 'Counterintuitive', extract: (r) => r.ciMoves, fmt: (v) => v.toFixed(1) },
    { name: 'Drama', extract: (r) => parseFloat(r.drama), fmt: (v) => v.toFixed(2) },
    { name: 'Info Gain Ratio', extract: (r) => parseFloat(r.infoGainRatio), fmt: (v) => v.toFixed(2) },
    { name: 'Alg Alignment', extract: (r) => parseFloat(r.algAlignment), fmt: (v) => v.toFixed(1) + '%' },
    { name: 'Greedy-Opt Gap', extract: (r) => parseFloat(r.greedyOptimalGap), fmt: (v) => v.toFixed(1) + '%' },
    { name: 'Optimal Probes', extract: (r) => r.optimalProbes, fmt: (v) => v.toFixed(0) },
    { name: 'Budget', extract: (r) => r.budget, fmt: (v) => v.toFixed(0) },
  ];

  for (const m of metricKeys) {
    const perDiff: string[] = [];
    const allVals: number[] = [];
    for (const diff of DIFFICULTIES) {
      const subset = results.filter((r) => r.diff === diff);
      const vals = subset.map(m.extract);
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      perDiff.push(m.fmt(avg));
      allVals.push(avg);
    }
    const grandAvg = allVals.reduce((a, b) => a + b, 0) / allVals.length;
    console.log(`| ${m.name} | ${perDiff.join(' | ')} | ${m.fmt(grandAvg)} |`);
  }

  // Difficulty curve analysis
  console.log('\n=== DIFFICULTY CURVE ===');
  for (const diff of DIFFICULTIES) {
    const subset = results.filter((r) => r.diff === diff);
    const avgOptimal = subset.reduce((a, r) => a + r.optimalProbes, 0) / subset.length;
    const avgBudget = subset.reduce((a, r) => a + r.budget, 0) / subset.length;
    const avgSkillDepth = subset.reduce((a, r) => a + parseFloat(r.skillDepth), 0) / subset.length;
    const avgAlignment = subset.reduce((a, r) => a + parseFloat(r.algAlignment), 0) / subset.length;
    console.log(
      `  Diff ${diff}: grid=${subset[0].gridSize}, optimal=${avgOptimal.toFixed(0)}, budget=${avgBudget.toFixed(0)}, slack=${((avgBudget - avgOptimal) / avgBudget * 100).toFixed(0)}%, skill-depth=${avgSkillDepth.toFixed(1)}%, alg-align=${avgAlignment.toFixed(1)}%`,
    );
  }

  // Insight inflection: at which difficulty does skill level 2 (linear) start failing?
  console.log('\n=== INSIGHT INFLECTION ===');
  for (const diff of DIFFICULTIES) {
    const subset = results.filter((r) => r.diff === diff);
    let linearFailCount = 0;
    for (const r of subset) {
      const sol = solve(generatePuzzle(r.seed, diff), 2);
      if (!sol) linearFailCount++;
    }
    console.log(
      `  Diff ${diff}: Linear scan fails ${linearFailCount}/${subset.length} times`,
    );
  }

  // Auto-kill check
  console.log('\n=== AUTO-KILL CHECK ===');
  const allSolvable = results.every((r) => r.solvable);
  const avgSkillDepth =
    results.reduce((a, r) => a + parseFloat(r.skillDepth), 0) / results.length;
  const avgAlgAlignment =
    results.reduce((a, r) => a + parseFloat(r.algAlignment), 0) / results.length;
  const totalCI = results.reduce((a, r) => a + r.ciMoves, 0);
  const avgDecisionEntropy =
    results.reduce((a, r) => a + parseFloat(r.decisionEntropy), 0) / results.length;
  const avgPuzzleEntropy =
    results.reduce((a, r) => a + parseFloat(r.puzzleEntropy), 0) / results.length;

  let killed = false;
  if (!allSolvable) {
    console.log('KILL: Solvability < 100%');
    killed = true;
  }
  if (avgSkillDepth < 10) {
    console.log(`KILL: Skill-Depth ${avgSkillDepth.toFixed(1)}% < 10%`);
    killed = true;
  }
  if (avgAlgAlignment < 50) {
    console.log(`KILL: Algorithm Alignment ${avgAlgAlignment.toFixed(1)}% < 50%`);
    killed = true;
  }
  if (totalCI === 0) {
    console.log('KILL: Counterintuitive Moves = 0 across all puzzles');
    killed = true;
  }
  if (avgDecisionEntropy < 1.0) {
    console.log(`KILL: Decision Entropy ${avgDecisionEntropy.toFixed(2)} < 1.0`);
    killed = true;
  }
  if (avgDecisionEntropy > 4.5) {
    console.log(`KILL: Decision Entropy ${avgDecisionEntropy.toFixed(2)} > 4.5`);
    killed = true;
  }
  if (avgPuzzleEntropy < 5) {
    console.log(`KILL: Puzzle Entropy ${avgPuzzleEntropy.toFixed(1)} < 5`);
    killed = true;
  }

  if (!killed) {
    console.log('PASSED all auto-kill checks');
  }

  return { results, killed };
}

computeMetrics();
