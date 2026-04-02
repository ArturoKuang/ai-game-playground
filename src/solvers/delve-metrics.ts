/**
 * Delve quality metrics computation.
 *
 * Run: npx tsx src/solvers/delve-metrics.ts
 */

import {
  generatePuzzle,
  legalMoves,
  applyMove,
  isGoal,
  heuristic,
  solve,
  type DelveState,
  type Move,
} from './Delve.solver';

const SEEDS = [10001, 10002, 10003, 10004, 10005];
const DIFFICULTIES = [1, 2, 3, 4, 5];
const SKILL_LEVELS: (1 | 2 | 3 | 4 | 5)[] = [1, 2, 3, 4, 5];

function cloneState(s: DelveState): DelveState {
  return {
    ...s,
    rooms: s.rooms.map(r => ({ ...r, exits: [...r.exits] })),
    visitedRooms: new Set(s.visitedRooms),
    keys: new Set(s.keys),
    path: [...s.path],
  };
}

function computeMetrics() {
  const results: Array<{
    day: string;
    solvable: boolean;
    puzzleEntropy: string;
    skillDepth: string;
    decisionEntropy: string;
    ciMoves: number;
    drama: string;
    durationS: string;
    infoGainRatio: string;
    algorithmAlignment: string;
    greedyOptimalGap: string;
    optimalMoves: number;
    budget: number;
    roomCount: number;
    lockedDoors: number;
  }> = [];

  for (let di = 0; di < DIFFICULTIES.length; di++) {
    const seed = SEEDS[di];
    const diff = DIFFICULTIES[di];
    const dayName = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][di];

    console.log(`\n--- ${dayName} (seed=${seed}, diff=${diff}) ---`);

    const puzzle = generatePuzzle(seed, diff);
    const roomCount = puzzle.rooms.length;
    const lockedDoors = puzzle.rooms.reduce((acc, r) =>
      acc + r.exits.filter(e => e.keyRequired !== null).length, 0) / 2; // bidirectional
    const keysAvailable = puzzle.rooms.filter(r => r.hasKey !== null).length;

    console.log(`  Rooms: ${roomCount}, Locked doors: ${lockedDoors}, Keys: ${keysAvailable}, Budget: ${puzzle.budget}`);

    // Solve at all skill levels
    const solutions: Record<number, ReturnType<typeof solve>> = {};
    const stepCounts: Record<number, number> = {};
    for (const sl of SKILL_LEVELS) {
      const t0 = Date.now();
      const sol = solve(generatePuzzle(seed, diff), sl);
      const dt = Date.now() - t0;
      solutions[sl] = sol;
      stepCounts[sl] = sol ? sol.steps : Infinity;

      const alignment = sol
        ? ((sol.algorithmAligned / Math.max(1, sol.totalMoves)) * 100).toFixed(0)
        : 'N/A';
      console.log(`  Skill ${sl}: ${sol ? sol.steps + ' steps (' + sol.pushCount + ' push, ' + sol.popCount + ' pop, ' + sol.pruneCount + ' prune)' : 'FAILED'} (${dt}ms) align=${alignment}%`);
    }

    // Solvability: check level 5 (optimal DFS with pruning)
    const solvable = solutions[5] !== null;

    // Use level 5 as reference optimal
    const refSol = solutions[5] || solutions[4];

    // Puzzle Entropy: sum of log2(legalMoves) along optimal solution path
    let puzzleEntropy = 0;
    if (refSol) {
      let state = cloneState(generatePuzzle(seed, diff));
      for (const move of refSol.moves) {
        const legal = legalMoves(state);
        if (legal.length > 1) {
          puzzleEntropy += Math.log2(legal.length);
        }
        state = applyMove(state, move);
      }
    }

    // Skill-Depth: (worst - best) / worst based on step counts
    const effectiveSteps = SKILL_LEVELS.map(sl =>
      solutions[sl] !== null ? solutions[sl]!.steps : puzzle.budget + 10,
    );
    const worstSteps = Math.max(...effectiveSteps);
    const bestSteps = Math.min(...effectiveSteps);
    const skillDepth = worstSteps > bestSteps && worstSteps > 0
      ? (worstSteps - bestSteps) / worstSteps
      : 0;

    // Decision Entropy: average log2(legalMoves) at each step
    let decisionEntropy = 0;
    let decisionSteps = 0;
    if (refSol) {
      let state = cloneState(generatePuzzle(seed, diff));
      for (const move of refSol.moves) {
        const legal = legalMoves(state);
        if (legal.length > 1) {
          decisionEntropy += Math.log2(legal.length);
          decisionSteps++;
        }
        state = applyMove(state, move);
      }
      decisionEntropy = decisionSteps > 0 ? decisionEntropy / decisionSteps : 0;
    }

    // Counterintuitive moves: steps where heuristic increases (looks worse before getting better)
    let ciMoves = 0;
    if (refSol) {
      let state = cloneState(generatePuzzle(seed, diff));
      for (const move of refSol.moves) {
        const h_before = heuristic(state);
        state = applyMove(state, move);
        const h_after = heuristic(state);
        if (h_after > h_before) ciMoves++;
      }
    }

    // Drama: max progress fraction before a heuristic regression
    let drama = 0;
    const dramaSol = solutions[3] || refSol;
    if (dramaSol) {
      let state = cloneState(generatePuzzle(seed, diff));
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

    // Duration: time for skill level 3 solve
    let durationS = 0;
    {
      const t0 = Date.now();
      solve(generatePuzzle(seed, diff), 3);
      durationS = (Date.now() - t0) / 1000;
    }

    // Info Gain Ratio
    let infoGainRatio = 1;
    if (refSol && refSol.moves.length > 0) {
      let totalBestGain = 0;
      let totalRandomGain = 0;

      let state = cloneState(generatePuzzle(seed, diff));
      for (const move of refSol.moves) {
        const h_before = heuristic(state);
        const bestNext = applyMove(state, move);
        const h_best = heuristic(bestNext);
        totalBestGain += Math.max(0, h_before - h_best);

        const legal = legalMoves(state);
        let randomGainSum = 0;
        for (const m of legal) {
          const rn = applyMove(state, m);
          randomGainSum += Math.max(0, h_before - heuristic(rn));
        }
        totalRandomGain += randomGainSum / Math.max(1, legal.length);

        state = bestNext;
      }

      if (totalRandomGain > 0) {
        infoGainRatio = totalBestGain / totalRandomGain;
      }
    }

    // Algorithm Alignment (Level 5 - DFS with pruning)
    // alignment = (push + pop) / total moves — how much of play is DFS-like
    // Use the best available solver for alignment measurement
    const alignSol = solutions[5] || solutions[4];
    const alignment4 = alignSol
      ? (alignSol.algorithmAligned / Math.max(1, alignSol.totalMoves)) * 100
      : 0;

    // Greedy-Optimal Gap: (Level 2 steps - Level 5 steps) / Level 5
    const greedySteps = solutions[2] ? solutions[2].steps : puzzle.budget + 10;
    const optSteps = solutions[5] ? solutions[5].steps : 1;
    const greedyOptimalGap = optSteps > 0
      ? ((greedySteps - optSteps) / optSteps) * 100
      : 0;

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
      algorithmAlignment: alignment4.toFixed(0),
      greedyOptimalGap: greedyOptimalGap.toFixed(0),
      optimalMoves: solutions[5]?.steps ?? -1,
      budget: puzzle.budget,
      roomCount,
      lockedDoors,
    };

    results.push(dayResult);
    console.log(`  Results:`, dayResult);
  }

  // Summary
  console.log('\n\n=== SUMMARY ===');
  console.log('| Metric | Mon | Tue | Wed | Thu | Fri | Avg |');
  console.log('|---|---|---|---|---|---|---|');

  const metricsDefs: Array<{ name: string; key: keyof typeof results[0]; fmt: (v: string | number | boolean) => string }> = [
    { name: 'Solvability', key: 'solvable', fmt: (v) => v ? '100%' : 'FAIL' },
    { name: 'Puzzle Entropy', key: 'puzzleEntropy', fmt: (v) => String(v) },
    { name: 'Skill-Depth', key: 'skillDepth', fmt: (v) => v + '%' },
    { name: 'Decision Entropy', key: 'decisionEntropy', fmt: (v) => String(v) },
    { name: 'Counterintuitive', key: 'ciMoves', fmt: (v) => String(v) },
    { name: 'Drama', key: 'drama', fmt: (v) => String(v) },
    { name: 'Duration (s)', key: 'durationS', fmt: (v) => String(v) },
    { name: 'Info Gain Ratio', key: 'infoGainRatio', fmt: (v) => String(v) },
    { name: 'Algorithm Alignment', key: 'algorithmAlignment', fmt: (v) => v + '%' },
    { name: 'Greedy-Optimal Gap', key: 'greedyOptimalGap', fmt: (v) => v + '%' },
    { name: 'Optimal Steps', key: 'optimalMoves', fmt: (v) => String(v) },
    { name: 'Budget', key: 'budget', fmt: (v) => String(v) },
  ];

  for (const m of metricsDefs) {
    const vals = results.map((r) => m.fmt(r[m.key]));
    const numVals = results.map((r) => {
      const v = r[m.key];
      if (typeof v === 'boolean') return v ? 100 : 0;
      return parseFloat(String(v));
    });
    const avg = (numVals.reduce((a, b) => a + b, 0) / numVals.length).toFixed(1);
    console.log(`| ${m.name} | ${vals.join(' | ')} | ${avg} |`);
  }

  // Auto-kill check
  console.log('\n=== AUTO-KILL CHECK ===');
  const allSolvable = results.every((r) => r.solvable);
  const avgSkillDepth = results.reduce((a, r) => a + parseFloat(r.skillDepth), 0) / results.length;
  const avgAlgorithmAlignment = results.reduce((a, r) => a + parseFloat(r.algorithmAlignment), 0) / results.length;

  let killed = false;
  if (!allSolvable) { console.log('KILL: Solvability < 100%'); killed = true; }
  if (avgSkillDepth < 10) { console.log(`KILL: Skill-Depth ${avgSkillDepth.toFixed(1)}% < 10%`); killed = true; }
  if (avgAlgorithmAlignment < 50) { console.log(`KILL: Algorithm Alignment ${avgAlgorithmAlignment.toFixed(0)}% < 50%`); killed = true; }

  if (!killed) {
    console.log('PASSED all auto-kill checks');
  }

  return { results, killed };
}

computeMetrics();
