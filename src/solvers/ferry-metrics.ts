/**
 * Ferry metrics computation
 * Run: npx ts-node --skip-project src/solvers/ferry-metrics.ts
 */

import {
  generatePuzzle,
  solve,
  isGoal,
  heuristic,
  legalMoves,
  applyMove,
  puzzleEntropy,
  countCounterintuitive,
  computeDrama,
  infoGainRatio,
  shannonEntropy,
  type FerryState,
  type Solution,
} from './Ferry.solver';

// 5 seeds (Mon-Fri), 5 difficulty levels
const SEEDS = [10001, 10002, 10003, 10004, 10005];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const DIFFICULTIES = [1, 2, 3, 4, 5];

type SkillLevel = 1 | 2 | 3 | 4 | 5;

function computeDecisionEntropy(puzzle: FerryState, solution: Solution): number {
  if (solution.steps === 0) return 0;
  let state = puzzle;
  let totalEntropy = 0;
  for (const move of solution.moves) {
    const legal = legalMoves(state);
    totalEntropy += shannonEntropy(legal.length);
    state = applyMove(state, move);
  }
  return totalEntropy / solution.steps;
}

function countUniqueSolutions(puzzle: FerryState, optimalSteps: number): number {
  // BFS to find all solutions within optimal+1 steps
  if (isGoal(puzzle)) return 1;
  const n = puzzle.graph.nodes.length;
  // Skip for large puzzles — too expensive
  if (n >= 9 || optimalSteps >= 12) return 1;

  type QItem = { state: FerryState; moves: string[] };
  const visited = new Map<string, number>();
  const startKey = puzzle.tokens.join(',');
  visited.set(startKey, 0);

  let frontier: QItem[] = [{ state: puzzle, moves: [] }];
  const solutions = new Set<string>();
  const maxDepth = optimalSteps + 1;

  for (let depth = 0; depth < maxDepth && frontier.length > 0; depth++) {
    const next: QItem[] = [];
    for (const { state, moves } of frontier) {
      for (const m of legalMoves(state)) {
        const ns = applyMove(state, m);
        const key = ns.tokens.join(',');
        const existingDepth = visited.get(key);
        if (existingDepth !== undefined && existingDepth <= depth + 1) continue;
        visited.set(key, depth + 1);
        const nm = [...moves, `${m[0]}-${m[1]}`];
        if (isGoal(ns)) {
          solutions.add(nm.join('|'));
        } else if (depth + 1 < maxDepth) {
          next.push({ state: ns, moves: nm });
        }
      }
      if (visited.size > 100000) break;
    }
    frontier = next;
    if (visited.size > 100000) break;
  }

  return Math.max(1, solutions.size);
}

console.log('=== FERRY METRICS ===\n');

// Track per-day metrics
const dayMetrics: Record<string, Record<string, number>> = {};

for (let d = 0; d < 5; d++) {
  const seed = SEEDS[d];
  const difficulty = DIFFICULTIES[d];
  const day = DAYS[d];
  console.log(`--- ${day} (seed=${seed}, difficulty=${difficulty}) ---`);

  const puzzle = generatePuzzle(seed, difficulty);
  console.log(`  Nodes: ${puzzle.graph.nodes.length}, Edges: ${puzzle.graph.edges.length}`);
  console.log(`  Bottleneck nodes (degree 2): ${puzzle.graph.adjacency.filter(a => a.length === 2).length}`);

  // Solve at all skill levels
  const solutions: (Solution | null)[] = [];
  for (let sl = 1; sl <= 5; sl++) {
    const start = Date.now();
    const sol = solve(puzzle, sl as SkillLevel);
    const elapsed = Date.now() - start;
    solutions.push(sol);
    console.log(
      `  Skill ${sl}: ${sol ? `solved in ${sol.steps} moves` : 'FAILED'} (${elapsed}ms)`,
    );
  }

  const sol5 = solutions[4]; // Optimal solution
  const sol1 = solutions[0]; // Random
  const sol3 = solutions[2]; // Greedy lookahead

  if (!sol5) {
    console.log('  FATAL: Unsolvable at skill 5!\n');
    dayMetrics[day] = {
      solvability: 0,
      puzzleEntropy: 0,
      skillDepth: 0,
      decisionEntropy: 0,
      counterintuitive: 0,
      drama: 0,
      duration: 0,
      infoGain: 0,
      uniqueSolutions: 0,
    };
    continue;
  }

  const solvable = sol5 !== null ? 1 : 0;
  const pe = puzzleEntropy(puzzle, sol5);
  // Skill-depth: compare worst non-null solver vs optimal
  // Use L2 (greedy) vs L5 (optimal) as the meaningful comparison
  // If L1 solved, use L1 as worst; otherwise L2; otherwise L3
  const worstSol = sol1 || solutions[1] || sol3;
  const worstSteps = worstSol ? worstSol.steps : sol5.steps * 3; // estimate if all fail
  const skillDepth =
    worstSteps > 0 && sol5.steps > 0
      ? (worstSteps - sol5.steps) / worstSteps
      : 0;
  const de = computeDecisionEntropy(puzzle, sol5);
  const ci = countCounterintuitive(puzzle, sol5);
  const drama = sol3 ? computeDrama(puzzle, sol3) : 0;
  const igr = infoGainRatio(puzzle, sol5);
  const unique = countUniqueSolutions(puzzle, sol5.steps);

  // Duration: time solver level 3 takes (proxy for human session)
  const startL3 = Date.now();
  solve(puzzle, 3);
  const durationL3 = (Date.now() - startL3) / 1000;

  dayMetrics[day] = {
    solvability: solvable * 100,
    puzzleEntropy: pe,
    skillDepth: skillDepth * 100,
    decisionEntropy: de,
    counterintuitive: ci,
    drama,
    duration: durationL3,
    infoGain: igr,
    uniqueSolutions: unique,
  };

  console.log(`  Puzzle Entropy: ${pe.toFixed(1)}`);
  console.log(`  Skill-Depth: ${(skillDepth * 100).toFixed(1)}%`);
  console.log(`  Decision Entropy: ${de.toFixed(2)}`);
  console.log(`  Counterintuitive Moves: ${ci}`);
  console.log(`  Drama: ${drama.toFixed(2)}`);
  console.log(`  Duration (L3): ${durationL3.toFixed(2)}s`);
  console.log(`  Info Gain Ratio: ${igr.toFixed(2)}`);
  console.log(`  Solution Uniqueness: ${unique}`);
  console.log();
}

// Summary table
console.log('\n=== SUMMARY TABLE ===\n');
const metrics = ['solvability', 'puzzleEntropy', 'skillDepth', 'decisionEntropy', 'counterintuitive', 'drama', 'duration', 'infoGain', 'uniqueSolutions'];
const metricNames = ['Solvability', 'Puzzle Entropy', 'Skill-Depth', 'Decision Entropy', 'Counterintuitive', 'Drama', 'Duration (s)', 'Info Gain Ratio', 'Solution Uniqueness'];

console.log('| Metric | Mon | Tue | Wed | Thu | Fri | Avg |');
console.log('|---|---|---|---|---|---|---|');

for (let m = 0; m < metrics.length; m++) {
  const key = metrics[m];
  const vals = DAYS.map((d) => dayMetrics[d][key]);
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  const fmt = (v: number) => {
    if (key === 'solvability') return `${v.toFixed(0)}%`;
    if (key === 'skillDepth') return `${v.toFixed(1)}%`;
    return v.toFixed(2);
  };
  console.log(
    `| ${metricNames[m]} | ${vals.map(fmt).join(' | ')} | ${fmt(avg)} |`,
  );
}

// Auto-kill check
console.log('\n=== AUTO-KILL CHECK ===\n');
const allSolvable = DAYS.every((d) => dayMetrics[d].solvability === 100);
const avgSkillDepth = DAYS.reduce((a, d) => a + dayMetrics[d].skillDepth, 0) / 5;
const totalCI = DAYS.reduce((a, d) => a + dayMetrics[d].counterintuitive, 0);
const avgDE = DAYS.reduce((a, d) => a + dayMetrics[d].decisionEntropy, 0) / 5;
const avgPE = DAYS.reduce((a, d) => a + dayMetrics[d].puzzleEntropy, 0) / 5;

const kills: string[] = [];
if (!allSolvable) kills.push('Solvability < 100%');
if (avgSkillDepth < 10) kills.push(`Skill-Depth ${avgSkillDepth.toFixed(1)}% < 10%`);
if (totalCI === 0) kills.push('Counterintuitive Moves = 0 across all puzzles');
if (avgDE < 1.0) kills.push(`Decision Entropy ${avgDE.toFixed(2)} < 1.0`);
if (avgDE > 4.5) kills.push(`Decision Entropy ${avgDE.toFixed(2)} > 4.5`);
if (avgPE < 5) kills.push(`Puzzle Entropy ${avgPE.toFixed(1)} < 5`);

if (kills.length > 0) {
  console.log('AUTO-KILLED:');
  kills.forEach((k) => console.log(`  - ${k}`));
} else {
  console.log('PASSED all auto-kill thresholds.');
}
