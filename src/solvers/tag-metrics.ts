/**
 * Tag quality metrics computation.
 *
 * Run: npx tsx src/solvers/tag-metrics.ts
 */

import {
  generatePuzzle,
  legalMoves,
  applyMove,
  isGoal,
  heuristic,
  solve,
  type TagState,
  type Move,
} from './Tag.solver';

const SEEDS = [10001, 10002, 10003, 10004, 10005];
const DIFFICULTIES = [1, 2, 3, 4, 5];
const SKILL_LEVELS: (1 | 2 | 3 | 4 | 5)[] = [1, 2, 3, 4, 5];

function cloneState(s: TagState): TagState {
  return {
    ...s,
    arrived: [...s.arrived],
    incoming: [...s.incoming],
    registry: new Set(s.registry),
    tagged: new Set(s.tagged),
    duplicateIndices: s.duplicateIndices,
    sequence: s.sequence,
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
    tileCount: number;
    duplicateCount: number;
  }> = [];

  for (let di = 0; di < DIFFICULTIES.length; di++) {
    const seed = SEEDS[di];
    const diff = DIFFICULTIES[di];
    const dayName = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][di];

    console.log(`\n--- ${dayName} (seed=${seed}, diff=${diff}) ---`);

    const puzzle = generatePuzzle(seed, diff);
    console.log(`  Tiles: ${puzzle.sequence.length}, Duplicates: ${puzzle.duplicateIndices.length}, Budget: ${puzzle.budget}`);
    console.log(`  Sequence: [${puzzle.sequence.join(', ')}]`);
    console.log(`  Duplicate indices: [${puzzle.duplicateIndices.join(', ')}]`);

    // Solve at all skill levels
    const solutions: Record<number, ReturnType<typeof solve>> = {};
    const actionCounts: Record<number, number> = {};
    for (const sl of SKILL_LEVELS) {
      const t0 = Date.now();
      const sol = solve(generatePuzzle(seed, diff), sl);
      const dt = Date.now() - t0;
      solutions[sl] = sol;
      actionCounts[sl] = sol ? sol.steps : Infinity;

      const alignment = sol
        ? ((sol.algorithmAligned / Math.max(1, sol.algorithmAligned + sol.scanActions)) * 100).toFixed(0)
        : 'N/A';
      console.log(`  Skill ${sl}: ${sol ? sol.steps + ' steps (' + sol.stampActions + ' stamps, ' + sol.scanActions + ' scans, ' + sol.freeMatches + ' free matches)' : 'FAILED'} (${dt}ms) align=${alignment}%`);
    }

    // Solvability: check level 4 (stamp-all, the core algorithm)
    const solvable = solutions[4] !== null;

    // Use level 4 as reference optimal (stamp-all = hash set approach)
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

    // Skill-Depth: (worst - best) / worst based on action counts
    const effectiveActions = SKILL_LEVELS.map(sl => {
      if (solutions[sl] === null) return puzzle.budget + 10;
      return solutions[sl]!.stampActions + solutions[sl]!.scanActions;
    });
    const worstAction = Math.max(...effectiveActions);
    const bestAction = Math.min(...effectiveActions);
    const skillDepth = worstAction > bestAction && worstAction > 0
      ? (worstAction - bestAction) / worstAction
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

    // Counterintuitive moves: steps where heuristic increases
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

    // Algorithm Alignment (Level 4 - stamp-all)
    // alignment = (stamp + freeMatch) / (stamp + freeMatch + scan)
    // This measures what fraction of "work" uses the hash set approach
    const alignSol = solutions[4];
    const alignment4 = alignSol
      ? (alignSol.algorithmAligned / Math.max(1, alignSol.algorithmAligned + alignSol.scanActions)) * 100
      : 0;

    // Greedy-Optimal Gap: (Level 2 scan-only actions - Level 4 stamp-all actions) / Level 4
    const greedyActions = solutions[2]
      ? solutions[2].stampActions + solutions[2].scanActions
      : puzzle.budget + 10;
    const optActions = solutions[4]
      ? solutions[4].stampActions + solutions[4].scanActions
      : 1;
    const greedyOptimalGap = optActions > 0
      ? ((greedyActions - optActions) / optActions) * 100
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
      optimalMoves: solutions[4]?.steps ?? -1,
      budget: puzzle.budget,
      tileCount: puzzle.sequence.length,
      duplicateCount: puzzle.duplicateIndices.length,
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
  const totalCI = results.reduce((a, r) => a + r.ciMoves, 0);
  const avgDecisionEntropy = results.reduce((a, r) => a + parseFloat(r.decisionEntropy), 0) / results.length;
  const avgPuzzleEntropy = results.reduce((a, r) => a + parseFloat(r.puzzleEntropy), 0) / results.length;

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
