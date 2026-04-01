/**
 * Vault quality metrics computation.
 *
 * Run: npx tsx src/solvers/vault-metrics.ts
 */

import {
  generatePuzzle,
  legalMoves,
  applyMove,
  isGoal,
  heuristic,
  solve,
  type VaultState,
  type Move,
} from './Vault.solver';

const SEEDS = [10001, 10002, 10003, 10004, 10005]; // Mon-Fri
const DIFFICULTIES = [1, 2, 3, 4, 5];
const SKILL_LEVELS: (1 | 2 | 3 | 4 | 5)[] = [1, 2, 3, 4, 5];

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
    uniqueSolutions: number;
    optimalMoves: number;
    par: number;
    gridSize: string;
  }> = [];

  for (let di = 0; di < DIFFICULTIES.length; di++) {
    const seed = SEEDS[di];
    const diff = DIFFICULTIES[di];
    const dayName = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][di];

    console.log(`\n--- ${dayName} (seed=${seed}, diff=${diff}) ---`);

    const puzzle = generatePuzzle(seed, diff);
    console.log(`  Grid: ${puzzle.rows}x${puzzle.cols}, Par: ${puzzle.par}, Ring: ${puzzle.ringKeys.length} keys`);

    // Solve at all skill levels
    const solutions: Record<number, ReturnType<typeof solve>> = {};
    const scores: Record<number, number> = {};
    for (const sl of SKILL_LEVELS) {
      const t0 = Date.now();
      const sol = solve(puzzle, sl);
      const dt = Date.now() - t0;
      solutions[sl] = sol;
      scores[sl] = sol ? sol.steps : Infinity;
      console.log(`  Skill ${sl}: ${sol ? sol.steps + ' cost' : 'FAILED'} (${dt}ms)`);
    }

    // Solvability
    const solvable = solutions[5] !== null;

    // Puzzle Entropy: sum of log2(legalMoves) along optimal solution
    let puzzleEntropy = 0;
    if (solutions[5]) {
      let state = JSON.parse(JSON.stringify(puzzle)) as VaultState;
      state.cost = 0;
      state.ringPos = 0;
      for (const move of solutions[5].moves) {
        const legal = legalMoves(state);
        // Filter to only unlock moves for meaningful branching
        const unlocks = legal.filter((m) => m.type === 'unlock');
        const meaningful = unlocks.length > 0 ? unlocks.length + 1 : 1; // +1 for skip option
        if (meaningful > 1) {
          puzzleEntropy += Math.log2(meaningful);
        }
        state = applyMove(state, move);
      }
    }

    // Skill-Depth: (worst - best) / worst where lower moves = better
    const s1 = scores[1] === Infinity ? (puzzle.par + 10) : scores[1];
    const s5 = scores[5] === Infinity ? (puzzle.par + 10) : scores[5];
    const skillDepth = s1 > s5 && s1 > 0 ? (s1 - s5) / s1 : 0;

    // Decision Entropy: average Shannon entropy of legal moves at each step
    let decisionEntropy = 0;
    let decisionSteps = 0;
    if (solutions[5]) {
      let state = JSON.parse(JSON.stringify(puzzle)) as VaultState;
      state.cost = 0;
      state.ringPos = 0;
      for (const move of solutions[5].moves) {
        const legal = legalMoves(state);
        const unlocks = legal.filter((m) => m.type === 'unlock');
        const meaningful = unlocks.length > 0 ? unlocks.length + 1 : 1;
        if (meaningful > 1) {
          decisionEntropy += Math.log2(meaningful);
          decisionSteps++;
        }
        state = applyMove(state, move);
      }
      decisionEntropy = decisionSteps > 0 ? decisionEntropy / decisionSteps : 0;
    }

    // Counterintuitive moves: steps where heuristic(next) > heuristic(current)
    let ciMoves = 0;
    if (solutions[5]) {
      let state = JSON.parse(JSON.stringify(puzzle)) as VaultState;
      state.cost = 0;
      state.ringPos = 0;
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
      let state = JSON.parse(JSON.stringify(puzzle)) as VaultState;
      state.cost = 0;
      state.ringPos = 0;
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

    // Duration fitness: time for skill level 3 solve
    let durationS = 0;
    {
      const freshPuzzle = JSON.parse(JSON.stringify(puzzle)) as VaultState;
      freshPuzzle.cost = 0;
      freshPuzzle.ringPos = 0;
      const t0 = Date.now();
      solve(freshPuzzle, 3);
      durationS = (Date.now() - t0) / 1000;
    }

    // Info Gain Ratio
    let infoGainRatio = 1;
    if (solutions[5] && solutions[5].moves.length > 0) {
      let totalBestGain = 0;
      let totalRandomGain = 0;
      let steps = 0;

      let state = JSON.parse(JSON.stringify(puzzle)) as VaultState;
      state.cost = 0;
      state.ringPos = 0;
      for (const move of solutions[5].moves) {
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
        totalRandomGain += randomGainSum / legal.length;
        steps++;

        state = bestNext;
      }

      if (totalRandomGain > 0) {
        infoGainRatio = totalBestGain / totalRandomGain;
      }
    }

    // Solution Uniqueness
    let uniqueSolutions = 0;
    const solutionKeys = new Set<string>();
    for (let attempt = 0; attempt < 5; attempt++) {
      const freshPuzzle = JSON.parse(JSON.stringify(puzzle)) as VaultState;
      freshPuzzle.cost = 0;
      freshPuzzle.ringPos = 0;
      const sol = solve(freshPuzzle, 5);
      if (sol) {
        const key = sol.moves.map((m) =>
          m.type === 'skip' ? 'S' : `U${(m as { type: 'unlock'; cellIndex: number }).cellIndex}`,
        ).join(',');
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
      optimalMoves: s5,
      par: puzzle.par,
      gridSize: `${puzzle.rows}x${puzzle.cols}`,
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
    { name: 'Solution Uniqueness', key: 'uniqueSolutions', fmt: (v) => String(v) },
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
