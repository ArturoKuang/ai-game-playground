/**
 * Sieve solver metrics computation.
 * Self-contained JS version of the solver + metrics.
 * Run: node src/solvers/sieve-metrics.mjs
 */

/* ─── RNG ─── */
function seededRng(seed) {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ─── Puzzle Generation ─── */
function generatePuzzle(seed, difficulty) {
  const rng = seededRng(seed);
  const attrTypes = ['color', 'shape', 'fill'];

  let groupAttrs;
  if (difficulty <= 1) {
    const chosen = attrTypes[Math.floor(rng() * 3)];
    groupAttrs = [chosen, chosen, chosen, chosen];
  } else if (difficulty <= 3) {
    const shuffled = shuffle(attrTypes, rng);
    groupAttrs = shuffle([shuffled[0], shuffled[0], shuffled[1], shuffled[1]], rng);
  } else {
    const shuffled = shuffle(attrTypes, rng);
    groupAttrs = shuffle(
      [shuffled[0], shuffled[1], shuffled[2], shuffled[Math.floor(rng() * 3)]],
      rng,
    );
  }

  const usedValues = { color: new Set(), shape: new Set(), fill: new Set() };
  const groupRules = [];
  for (let g = 0; g < 4; g++) {
    const attr = groupAttrs[g];
    const available = [0, 1, 2, 3].filter(v => !usedValues[attr].has(v));
    const val = available[Math.floor(rng() * available.length)];
    groupRules.push({ attr, value: val });
    usedValues[attr].add(val);
  }

  const icons = [];
  const groups = [];
  for (let g = 0; g < 4; g++) {
    const rule = groupRules[g];
    const otherAttrs = attrTypes.filter(a => a !== rule.attr);
    const perm1 = shuffle([0, 1, 2, 3], rng);
    const perm2 = shuffle([0, 1, 2, 3], rng);
    for (let i = 0; i < 4; i++) {
      const icon = { color: 0, shape: 0, fill: 0 };
      icon[rule.attr] = rule.value;
      icon[otherAttrs[0]] = perm1[i];
      icon[otherAttrs[1]] = perm2[i];
      icons.push(icon);
      groups.push(g);
    }
  }

  const indices = shuffle(Array.from({ length: 16 }, (_, i) => i), rng);
  const shuffledIcons = indices.map(i => icons[i]);
  const shuffledGroups = indices.map(i => groups[i]);

  const parValues = [7, 6, 6, 5, 5];
  const par = parValues[Math.min(difficulty, 5) - 1] || 6;

  return {
    icons: shuffledIcons,
    groups: shuffledGroups,
    groupRules,
    sieved: Array(16).fill(false),
    revealedGroups: Array(16).fill(null),
    sieveCount: 0,
    par,
    solved: false,
    submittedRules: null,
    difficulty,
  };
}

/* ─── canDetermineAllRules ─── */
function canDetermineAllRules(state) {
  const groupMembers = new Map();
  for (let i = 0; i < 16; i++) {
    if (state.revealedGroups[i] !== null) {
      const g = state.revealedGroups[i];
      if (!groupMembers.has(g)) groupMembers.set(g, []);
      groupMembers.get(g).push(i);
    }
  }
  if (groupMembers.size === 0) return null;

  const attrTypes = ['color', 'shape', 'fill'];
  const rules = [null, null, null, null];
  const usedKeys = new Set();

  for (let g = 0; g < 4; g++) {
    const members = groupMembers.get(g);
    if (!members || members.length < 2) continue;
    for (const attr of attrTypes) {
      const vals = members.map(i => state.icons[i][attr]);
      if (vals.every(v => v === vals[0])) {
        const key = `${attr}-${vals[0]}`;
        if (!usedKeys.has(key)) {
          rules[g] = { attr, value: vals[0] };
          usedKeys.add(key);
          break;
        }
      }
    }
  }

  for (let g = 0; g < 4; g++) {
    if (rules[g]) continue;
    const members = groupMembers.get(g) || [];
    for (const attr of attrTypes) {
      for (let v = 0; v < 4; v++) {
        const key = `${attr}-${v}`;
        if (usedKeys.has(key)) continue;
        if (members.every(i => state.icons[i][attr] === v)) {
          const count = state.icons.filter(icon => icon[attr] === v).length;
          if (count === 4) {
            rules[g] = { attr, value: v };
            usedKeys.add(key);
            break;
          }
        }
      }
      if (rules[g]) break;
    }
  }

  if (rules.every(r => r !== null)) return rules;
  return null;
}

/* ─── Apply Move ─── */
function applyMove(state, move) {
  if (move.type === 'sieve') {
    const newSieved = [...state.sieved];
    const newRevealed = [...state.revealedGroups];
    newSieved[move.index] = true;
    newRevealed[move.index] = state.groups[move.index];
    return { ...state, sieved: newSieved, revealedGroups: newRevealed, sieveCount: state.sieveCount + 1 };
  }
  if (move.type === 'submit') {
    let correct = true;
    for (let g = 0; g < 4; g++) {
      const rule = move.rules[g];
      const members = state.groups.map((grp, idx) => grp === g ? idx : -1).filter(x => x >= 0);
      for (const idx of members) {
        if (state.icons[idx][rule.attr] !== rule.value) { correct = false; break; }
      }
      if (!correct) break;
    }
    return { ...state, solved: correct, submittedRules: move.rules };
  }
  return state;
}

/* ─── Heuristic: groups not yet identified ─── */
function heuristic(state) {
  const attrTypes = ['color', 'shape', 'fill'];
  const groupMembers = new Map();
  for (let i = 0; i < 16; i++) {
    if (state.revealedGroups[i] !== null) {
      const g = state.revealedGroups[i];
      if (!groupMembers.has(g)) groupMembers.set(g, []);
      groupMembers.get(g).push(i);
    }
  }
  let unsolved = 4;
  for (const [, members] of groupMembers) {
    if (members.length < 2) continue;
    for (const attr of attrTypes) {
      const vals = members.map(i => state.icons[i][attr]);
      if (vals.every(v => v === vals[0])) { unsolved--; break; }
    }
  }
  return unsolved;
}

/* ─── Legal Moves ─── */
function legalMoves(state) {
  if (state.solved) return [];
  const moves = [];
  for (let i = 0; i < 16; i++) {
    if (!state.sieved[i]) moves.push({ type: 'sieve', index: i });
  }
  const rules = canDetermineAllRules(state);
  if (rules) moves.push({ type: 'submit', rules });
  return moves;
}

/* ─── Info Gain ─── */
function computeInfoGain(state, iconIdx) {
  const icon = state.icons[iconIdx];
  const attrTypes = ['color', 'shape', 'fill'];
  const groupMembers = new Map();
  for (let i = 0; i < 16; i++) {
    if (state.revealedGroups[i] !== null) {
      const g = state.revealedGroups[i];
      if (!groupMembers.has(g)) groupMembers.set(g, []);
      groupMembers.get(g).push(i);
    }
  }
  if (groupMembers.size === 0) return 2;
  let gain = 0;
  for (const [, members] of groupMembers) {
    let sharedAttrs = 0;
    for (const attr of attrTypes) {
      if (members.some(m => state.icons[m][attr] === icon[attr])) sharedAttrs++;
    }
    gain += sharedAttrs;
  }
  for (const [, members] of groupMembers) {
    if (members.length === 1) gain += 1;
  }
  return gain;
}

/* ─── Hypothesis generation ─── */
function isValidRuleSet(icons, rules) {
  const covered = new Set();
  for (const rule of rules) {
    let count = 0;
    for (let i = 0; i < icons.length; i++) {
      if (icons[i][rule.attr] === rule.value) {
        if (covered.has(i)) return false;
        covered.add(i);
        count++;
      }
    }
    if (count !== 4) return false;
  }
  return covered.size === 16;
}

function permutations4() {
  const result = [];
  function permute(arr, l) {
    if (l === arr.length - 1) { result.push([...arr]); return; }
    for (let i = l; i < arr.length; i++) {
      [arr[l], arr[i]] = [arr[i], arr[l]];
      permute(arr, l + 1);
      [arr[l], arr[i]] = [arr[i], arr[l]];
    }
  }
  permute([0, 1, 2, 3], 0);
  return result;
}

function generateHypotheses(state) {
  const attrTypes = ['color', 'shape', 'fill'];
  const validPairs = [];
  for (const attr of attrTypes) {
    for (let v = 0; v < 4; v++) {
      const count = state.icons.filter(icon => icon[attr] === v).length;
      if (count === 4) validPairs.push({ attr, value: v });
    }
  }

  const combos = [];
  for (let a = 0; a < validPairs.length; a++) {
    for (let b = a + 1; b < validPairs.length; b++) {
      for (let c = b + 1; c < validPairs.length; c++) {
        for (let d = c + 1; d < validPairs.length; d++) {
          const set = [validPairs[a], validPairs[b], validPairs[c], validPairs[d]];
          if (isValidRuleSet(state.icons, set)) combos.push(set);
        }
      }
    }
  }

  const hypotheses = [];
  const perms = permutations4();
  for (const ruleSet of combos) {
    for (const perm of perms) {
      const assignment = new Array(16).fill(-1);
      let valid = true;
      for (let i = 0; i < 16; i++) {
        let found = false;
        for (let g = 0; g < 4; g++) {
          const rule = ruleSet[perm[g]];
          if (state.icons[i][rule.attr] === rule.value) {
            assignment[i] = g;
            found = true;
            break;
          }
        }
        if (!found) { valid = false; break; }
      }
      if (!valid) continue;
      let consistent = true;
      for (let i = 0; i < 16; i++) {
        if (state.revealedGroups[i] !== null && assignment[i] !== state.revealedGroups[i]) {
          consistent = false; break;
        }
      }
      if (consistent) hypotheses.push(assignment);
    }
    if (hypotheses.length > 200) break;
  }
  return hypotheses;
}

/* ─── Solvers ─── */
function cloneState(state) {
  return { ...state, sieved: [...state.sieved], revealedGroups: [...state.revealedGroups] };
}

function solveRandom(puzzle) {
  let state = cloneState(puzzle);
  const moves = [];
  const rng = seededRng(puzzle.groups[0] * 1000 + 42);
  const unsieved = Array.from({ length: 16 }, (_, i) => i).filter(i => !state.sieved[i]);
  const order = shuffle(unsieved, rng);

  for (const idx of order) {
    const move = { type: 'sieve', index: idx };
    state = applyMove(state, move);
    moves.push(move);
    const rules = canDetermineAllRules(state);
    if (rules) {
      const submitMove = { type: 'submit', rules };
      const nextState = applyMove(state, submitMove);
      if (nextState.solved) {
        moves.push(submitMove);
        return { moves, steps: state.sieveCount, sievesUsed: state.sieveCount };
      }
    }
  }
  const rules = canDetermineAllRules(state);
  if (rules) { moves.push({ type: 'submit', rules }); }
  return { moves, steps: state.sieveCount, sievesUsed: state.sieveCount };
}

function solveGreedy(puzzle) {
  let state = cloneState(puzzle);
  const moves = [];

  for (let iter = 0; iter < 16; iter++) {
    const rules = canDetermineAllRules(state);
    if (rules) {
      const submitMove = { type: 'submit', rules };
      const testState = applyMove(state, submitMove);
      if (testState.solved) { moves.push(submitMove); return { moves, steps: state.sieveCount, sievesUsed: state.sieveCount }; }
    }
    let bestIdx = -1, bestGain = -1;
    for (let i = 0; i < 16; i++) {
      if (state.sieved[i]) continue;
      const gain = computeInfoGain(state, i);
      if (gain > bestGain) { bestGain = gain; bestIdx = i; }
    }
    if (bestIdx === -1) break;
    state = applyMove(state, { type: 'sieve', index: bestIdx });
    moves.push({ type: 'sieve', index: bestIdx });
  }

  const rules = canDetermineAllRules(state);
  if (rules) { moves.push({ type: 'submit', rules }); }
  return { moves, steps: state.sieveCount, sievesUsed: state.sieveCount };
}

function solveGreedyLookahead(puzzle) {
  let state = cloneState(puzzle);
  const moves = [];

  for (let iter = 0; iter < 16; iter++) {
    const rules = canDetermineAllRules(state);
    if (rules) {
      const testState = applyMove(state, { type: 'submit', rules });
      if (testState.solved) { moves.push({ type: 'submit', rules }); return { moves, steps: state.sieveCount, sievesUsed: state.sieveCount }; }
    }
    let bestIdx = -1, bestScore = Infinity;
    for (let i = 0; i < 16; i++) {
      if (state.sieved[i]) continue;
      const simState = applyMove(state, { type: 'sieve', index: i });
      const simRules = canDetermineAllRules(simState);
      if (simRules) { bestIdx = i; bestScore = -1; break; }
      const h = heuristic(simState);
      if (h < bestScore || (h === bestScore && bestIdx >= 0 && computeInfoGain(state, i) > computeInfoGain(state, bestIdx))) {
        bestScore = h; bestIdx = i;
      }
    }
    if (bestIdx === -1) break;
    state = applyMove(state, { type: 'sieve', index: bestIdx });
    moves.push({ type: 'sieve', index: bestIdx });
  }

  const rules = canDetermineAllRules(state);
  if (rules) { moves.push({ type: 'submit', rules }); }
  return { moves, steps: state.sieveCount, sievesUsed: state.sieveCount };
}

function solveStrategic(puzzle) {
  let state = cloneState(puzzle);
  const moves = [];

  for (let iter = 0; iter < 16; iter++) {
    const rules = canDetermineAllRules(state);
    if (rules) {
      const testState = applyMove(state, { type: 'submit', rules });
      if (testState.solved) { moves.push({ type: 'submit', rules }); return { moves, steps: state.sieveCount, sievesUsed: state.sieveCount }; }
    }
    const hypotheses = generateHypotheses(state);
    let bestIdx = -1, bestSplit = -1;
    for (let i = 0; i < 16; i++) {
      if (state.sieved[i]) continue;
      const groupCounts = [0, 0, 0, 0];
      for (const hyp of hypotheses) groupCounts[hyp[i]]++;
      const nonZero = groupCounts.filter(c => c > 0);
      const splitScore = nonZero.length * Math.min(...nonZero);
      if (splitScore > bestSplit) { bestSplit = splitScore; bestIdx = i; }
    }
    if (bestIdx === -1) {
      for (let i = 0; i < 16; i++) { if (!state.sieved[i]) { bestIdx = i; break; } }
    }
    if (bestIdx === -1) break;
    state = applyMove(state, { type: 'sieve', index: bestIdx });
    moves.push({ type: 'sieve', index: bestIdx });
  }

  const rules = canDetermineAllRules(state);
  if (rules) { moves.push({ type: 'submit', rules }); }
  return { moves, steps: state.sieveCount, sievesUsed: state.sieveCount };
}

function solveOptimal(puzzle) {
  const state = cloneState(puzzle);
  for (let maxDepth = 1; maxDepth <= 12; maxDepth++) {
    const result = dfsOptimal(state, [], maxDepth);
    if (result) return result;
  }
  return solveStrategic(puzzle);
}

function dfsOptimal(state, moves, maxDepth) {
  const rules = canDetermineAllRules(state);
  if (rules) {
    const testState = applyMove(state, { type: 'submit', rules });
    if (testState.solved) {
      return { moves: [...moves, { type: 'submit', rules }], steps: state.sieveCount, sievesUsed: state.sieveCount };
    }
  }
  if (state.sieveCount >= maxDepth) return null;

  const candidates = [];
  for (let i = 0; i < 16; i++) {
    if (state.sieved[i]) continue;
    candidates.push({ idx: i, gain: computeInfoGain(state, i) });
  }
  candidates.sort((a, b) => b.gain - a.gain);
  const limit = Math.min(candidates.length, maxDepth <= 4 ? 8 : 5);

  for (let c = 0; c < limit; c++) {
    const idx = candidates[c].idx;
    const nextState = applyMove(state, { type: 'sieve', index: idx });
    const result = dfsOptimal(nextState, [...moves, { type: 'sieve', index: idx }], maxDepth);
    if (result) return result;
  }
  return null;
}

function solve(puzzle, skillLevel) {
  if (skillLevel === 1) return solveRandom(puzzle);
  if (skillLevel === 2) return solveGreedy(puzzle);
  if (skillLevel === 3) return solveGreedyLookahead(puzzle);
  if (skillLevel === 4) return solveStrategic(puzzle);
  return solveOptimal(puzzle);
}

/* ═══════════════════════════════════════════════════════ */
/* ─── Metrics Computation ─── */
/* ═══════════════════════════════════════════════════════ */

const SEEDS = [1001, 2002, 3003, 4004, 5005];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const DIFFICULTIES = [1, 2, 3, 4, 5];

function computePuzzleEntropy(state, solution) {
  let entropy = 0;
  let current = cloneState(state);
  for (const move of solution.moves) {
    if (move.type === 'submit') continue;
    const moves = legalMoves(current);
    const sieveMoves = moves.filter(m => m.type === 'sieve');
    if (sieveMoves.length > 0) entropy += Math.log2(sieveMoves.length);
    current = applyMove(current, move);
  }
  return entropy;
}

function computeDecisionEntropy(state, solution) {
  let totalEntropy = 0, steps = 0;
  let current = cloneState(state);
  for (const move of solution.moves) {
    if (move.type === 'submit') continue;
    const moves = legalMoves(current);
    const sieveMoves = moves.filter(m => m.type === 'sieve');
    if (sieveMoves.length > 1) {
      const p = 1 / sieveMoves.length;
      totalEntropy += -sieveMoves.length * p * Math.log2(p);
      steps++;
    }
    current = applyMove(current, move);
  }
  return steps > 0 ? totalEntropy / steps : 0;
}

function computeCounterIntuitiveMoves(state, solution) {
  let count = 0;
  let current = cloneState(state);
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

function computeDrama(state, solution) {
  const totalSteps = solution.sievesUsed;
  if (totalSteps <= 1) return 0;
  let current = cloneState(state);
  let bestProgress = 0, maxProgressBeforeBacktrack = 0;
  for (const move of solution.moves) {
    if (move.type === 'submit') continue;
    const next = applyMove(current, move);
    const progress = 1 - heuristic(next) / 4;
    if (progress < bestProgress) maxProgressBeforeBacktrack = Math.max(maxProgressBeforeBacktrack, bestProgress);
    bestProgress = Math.max(bestProgress, progress);
    current = next;
  }
  return maxProgressBeforeBacktrack > 0 ? maxProgressBeforeBacktrack : bestProgress * 0.5;
}

function computeInfoGainRatio(state) {
  const sieveMoves = legalMoves(state).filter(m => m.type === 'sieve');
  if (sieveMoves.length === 0) return 1;
  const improvements = [];
  const hBefore = heuristic(state);
  for (const move of sieveMoves) {
    const next = applyMove(state, move);
    improvements.push(hBefore - heuristic(next));
  }
  const bestImprovement = Math.max(...improvements);
  const avgImprovement = improvements.reduce((a, b) => a + b, 0) / improvements.length;
  if (avgImprovement === 0) return 1;
  return (bestImprovement + 0.5) / (avgImprovement + 0.5);
}

function computeMetrics(seed, difficulty, dayName) {
  const puzzle = generatePuzzle(seed, difficulty);
  const solutions = {};

  for (let level = 1; level <= 5; level++) {
    solutions[level] = solve(puzzle, level);
    if (level === 5 && (!solutions[level] || !solutions[level].moves.some(m => m.type === 'submit'))) {
      return { day: dayName, solvable: false, puzzleEntropy: 0, skillDepth: 0, decisionEntropy: 0, ciMoves: 0, drama: 0, durationMs: 0, infoGainRatio: 0, uniqueSolutions: 0, optimalSieves: 0, par: puzzle.par };
    }
  }

  const sol5 = solutions[5];
  const sol1 = solutions[1];
  const sol3 = solutions[3];

  const solvable = sol5.moves.some(m => m.type === 'submit');
  const puzzleEntropy = computePuzzleEntropy(puzzle, sol5);
  const score5 = sol5.sievesUsed;
  const score1 = sol1.sievesUsed;
  const skillDepth = score1 > 0 ? (score1 - score5) / score1 : 0;
  const decisionEntropy = computeDecisionEntropy(puzzle, sol5);
  const ciMoves = computeCounterIntuitiveMoves(puzzle, sol5);
  const drama = computeDrama(puzzle, sol3);

  const startTime = Date.now();
  solve(puzzle, 3);
  const durationMs = Date.now() - startTime;

  const infoGainRatio = computeInfoGainRatio(puzzle);

  // Solution uniqueness (simplified)
  let uniqueSolutions = 1;
  for (let trial = 0; trial < 5; trial++) {
    const s = solve(generatePuzzle(seed + trial * 100, difficulty), 4);
    if (s && s.sievesUsed <= score5 + 1) uniqueSolutions++;
  }
  uniqueSolutions = Math.min(uniqueSolutions, 5);

  return {
    day: dayName, solvable, puzzleEntropy, skillDepth, decisionEntropy,
    ciMoves, drama, durationMs, infoGainRatio, uniqueSolutions,
    optimalSieves: score5, par: puzzle.par, randomSieves: score1,
  };
}

// ─── Run ───
const results = [];
for (let i = 0; i < 5; i++) {
  console.log(`Computing ${DAYS[i]} (seed=${SEEDS[i]}, diff=${DIFFICULTIES[i]})...`);
  results.push(computeMetrics(SEEDS[i], DIFFICULTIES[i], DAYS[i]));
}

const fmt = (v, dec = 1) => v.toFixed(dec);

console.log('\n=== SIEVE SOLVER METRICS ===\n');
console.log('| Metric | Mon | Tue | Wed | Thu | Fri | Avg |');
console.log('|---|---|---|---|---|---|---|');

const solvability = results.map(r => r.solvable);
console.log(`| Solvability | ${solvability.map(s => s ? '100%' : 'FAIL').join(' | ')} | ${solvability.every(s => s) ? '100%' : 'FAIL'} |`);

const pe = results.map(r => r.puzzleEntropy);
console.log(`| Puzzle Entropy | ${pe.map(v => fmt(v)).join(' | ')} | ${fmt(pe.reduce((a, b) => a + b) / pe.length)} |`);

const sd = results.map(r => r.skillDepth);
console.log(`| Skill-Depth | ${sd.map(v => fmt(v * 100) + '%').join(' | ')} | ${fmt(sd.reduce((a, b) => a + b) / sd.length * 100)}% |`);

const de = results.map(r => r.decisionEntropy);
console.log(`| Decision Entropy | ${de.map(v => fmt(v)).join(' | ')} | ${fmt(de.reduce((a, b) => a + b) / de.length)} |`);

const ci = results.map(r => r.ciMoves);
console.log(`| Counterintuitive | ${ci.join(' | ')} | ${fmt(ci.reduce((a, b) => a + b) / ci.length)} |`);

const dr = results.map(r => r.drama);
console.log(`| Drama | ${dr.map(v => fmt(v, 2)).join(' | ')} | ${fmt(dr.reduce((a, b) => a + b) / dr.length, 2)} |`);

const du = results.map(r => r.durationMs);
console.log(`| Duration (ms) | ${du.join(' | ')} | ${fmt(du.reduce((a, b) => a + b) / du.length)} |`);

const ig = results.map(r => r.infoGainRatio);
console.log(`| Info Gain Ratio | ${ig.map(v => fmt(v, 2)).join(' | ')} | ${fmt(ig.reduce((a, b) => a + b) / ig.length, 2)} |`);

const us = results.map(r => r.uniqueSolutions);
console.log(`| Solution Uniqueness | ${us.join(' | ')} | ${fmt(us.reduce((a, b) => a + b) / us.length)} |`);

console.log('');
console.log('Optimal sieves:', results.map(r => `${r.day}=${r.optimalSieves}`).join(', '));
console.log('Random sieves:', results.map(r => `${r.day}=${r.randomSieves}`).join(', '));
console.log('Par values:', results.map(r => `${r.day}=${r.par}`).join(', '));

// Auto-kill checks
console.log('\n=== AUTO-KILL CHECK ===');
const allSolvable = solvability.every(s => s);
const avgSD = sd.reduce((a, b) => a + b) / sd.length;
const avgDE = de.reduce((a, b) => a + b) / de.length;
const avgPE = pe.reduce((a, b) => a + b) / pe.length;
const allCiZero = ci.every(v => v === 0);

console.log(`Solvability < 100%: ${!allSolvable ? 'FAIL' : 'PASS'}`);
console.log(`Skill-Depth < 10%: ${avgSD < 0.1 ? 'FAIL (' + fmt(avgSD * 100) + '%)' : 'PASS (' + fmt(avgSD * 100) + '%)'}`);
console.log(`CI = 0 across all: ${allCiZero ? 'FAIL' : 'PASS'}`);
console.log(`Decision Entropy < 1.0: ${avgDE < 1.0 ? 'FAIL (' + fmt(avgDE) + ')' : 'PASS (' + fmt(avgDE) + ')'}`);
console.log(`Decision Entropy > 4.5: ${avgDE > 4.5 ? 'FAIL (' + fmt(avgDE) + ')' : 'PASS (' + fmt(avgDE) + ')'}`);
console.log(`Puzzle Entropy < 5: ${avgPE < 5 ? 'FAIL (' + fmt(avgPE) + ')' : 'PASS (' + fmt(avgPE) + ')'}`);

const autoKilled = !allSolvable || avgSD < 0.1 || allCiZero || avgDE < 1.0 || avgDE > 4.5 || avgPE < 5;
console.log(`\nOverall: ${autoKilled ? 'AUTO-KILLED' : 'PASSED'}`);
