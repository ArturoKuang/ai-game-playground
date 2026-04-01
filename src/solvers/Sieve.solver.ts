/**
 * Sieve Solver
 *
 * A 4x4 grid of 16 icons, each with 3 attributes: color, shape, fill.
 * Icons are secretly divided into 4 groups of 4. Each group shares exactly
 * one attribute value. Tap an icon to "sieve" it -- reveal its group number.
 * Identify all 4 groups' shared attributes within a limited sieve budget.
 *
 * The solver computes optimal sieve sequences via hypothesis elimination.
 */

// Attribute types
export type Color = 0 | 1 | 2 | 3;
export type Shape = 0 | 1 | 2 | 3;
export type Fill = 0 | 1 | 2 | 3;

export type AttributeType = 'color' | 'shape' | 'fill';

export interface Icon {
  color: Color;
  shape: Shape;
  fill: Fill;
}

export interface SieveState {
  icons: Icon[];              // 16 icons on the grid
  groups: number[];           // hidden: group assignment for each icon (0-3)
  groupRules: { attr: AttributeType; value: number }[]; // hidden: what defines each group
  sieved: boolean[];          // which icons have been sieved (group revealed)
  revealedGroups: (number | null)[]; // group number for each icon (null if not sieved)
  sieveCount: number;         // sieves used
  par: number;                // sieve budget (par)
  solved: boolean;            // whether the player has correctly identified all groups
  submittedRules: { attr: AttributeType; value: number }[] | null; // player's submission
  difficulty: number;         // 1-5
}

export type Move =
  | { type: 'sieve'; index: number }
  | { type: 'submit'; rules: { attr: AttributeType; value: number }[] };

export interface Solution {
  moves: Move[];
  steps: number;
  sievesUsed: number;
}

/* ─── RNG ─── */
function seededRng(seed: number): () => number {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ─── Puzzle Generation ─── */
export function generatePuzzle(seed: number, difficulty: number): SieveState {
  const rng = seededRng(seed);
  const attrTypes: AttributeType[] = ['color', 'shape', 'fill'];

  // Difficulty determines grouping uniformity
  // diff 1: all groups use same attribute type (e.g., all by color)
  // diff 2-3: 2 attribute types used
  // diff 4-5: mixed, up to 3 attribute types
  let groupAttrs: AttributeType[];
  if (difficulty <= 1) {
    const chosen = attrTypes[Math.floor(rng() * 3)];
    groupAttrs = [chosen, chosen, chosen, chosen];
  } else if (difficulty <= 3) {
    const shuffled = shuffle(attrTypes, rng);
    const a = shuffled[0], b = shuffled[1];
    groupAttrs = shuffle([a, a, b, b], rng);
  } else {
    const shuffled = shuffle(attrTypes, rng);
    groupAttrs = shuffle(
      [shuffled[0], shuffled[1], shuffled[2], shuffled[Math.floor(rng() * 3)]],
      rng,
    );
  }

  // Assign values ensuring no two groups with same (attr, value)
  const usedValues: Record<AttributeType, Set<number>> = {
    color: new Set(),
    shape: new Set(),
    fill: new Set(),
  };

  const groupRules: { attr: AttributeType; value: number }[] = [];
  for (let g = 0; g < 4; g++) {
    const attr = groupAttrs[g];
    const available = [0, 1, 2, 3].filter(v => !usedValues[attr].has(v));
    const val = available[Math.floor(rng() * available.length)];
    groupRules.push({ attr, value: val });
    usedValues[attr].add(val);
  }

  // Generate 16 icons: 4 per group
  // Each icon in group g has groupRules[g].attr = groupRules[g].value
  // Other attributes assigned so the defining attribute is the ONLY one
  // shared by all 4 members (Latin square on other dims)
  const icons: Icon[] = [];
  const groups: number[] = [];

  for (let g = 0; g < 4; g++) {
    const rule = groupRules[g];
    const otherAttrs = attrTypes.filter(a => a !== rule.attr);
    const perm1 = shuffle([0, 1, 2, 3], rng);
    const perm2 = shuffle([0, 1, 2, 3], rng);

    for (let i = 0; i < 4; i++) {
      const icon: Icon = { color: 0 as Color, shape: 0 as Shape, fill: 0 as Fill };
      (icon as any)[rule.attr] = rule.value;
      (icon as any)[otherAttrs[0]] = perm1[i];
      (icon as any)[otherAttrs[1]] = perm2[i];
      icons.push(icon);
      groups.push(g);
    }
  }

  // Shuffle icon order
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

/* ─── Legal Moves ─── */
export function legalMoves(state: SieveState): Move[] {
  if (state.solved) return [];
  const moves: Move[] = [];
  for (let i = 0; i < 16; i++) {
    if (!state.sieved[i]) {
      moves.push({ type: 'sieve', index: i });
    }
  }
  // Include submit if we can determine rules
  const possibleRules = canDetermineAllRules(state);
  if (possibleRules) {
    moves.push({ type: 'submit', rules: possibleRules });
  }
  return moves;
}

/* ─── Infer possible grouping rules from current knowledge ─── */
export function canDetermineAllRules(
  state: SieveState,
): { attr: AttributeType; value: number }[] | null {
  const groupMembers: Map<number, number[]> = new Map();
  for (let i = 0; i < 16; i++) {
    if (state.revealedGroups[i] !== null) {
      const g = state.revealedGroups[i]!;
      if (!groupMembers.has(g)) groupMembers.set(g, []);
      groupMembers.get(g)!.push(i);
    }
  }

  if (groupMembers.size === 0) return null;

  const attrTypes: AttributeType[] = ['color', 'shape', 'fill'];
  const rules: ({ attr: AttributeType; value: number } | null)[] = [null, null, null, null];
  const usedKeys = new Set<string>();

  // First pass: groups with 2+ members -- find uniquely shared attribute
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

  // Second pass: infer remaining by elimination
  for (let g = 0; g < 4; g++) {
    if (rules[g]) continue;
    const members = groupMembers.get(g) || [];
    for (const attr of attrTypes) {
      for (let v = 0; v < 4; v++) {
        const key = `${attr}-${v}`;
        if (usedKeys.has(key)) continue;
        if (members.every(i => state.icons[i][attr] === v)) {
          // Check this (attr, value) matches exactly 4 icons
          const candidates = state.icons.filter(icon => icon[attr] === v);
          if (candidates.length === 4) {
            rules[g] = { attr, value: v };
            usedKeys.add(key);
            break;
          }
        }
      }
      if (rules[g]) break;
    }
  }

  if (rules.every(r => r !== null)) {
    return rules as { attr: AttributeType; value: number }[];
  }
  return null;
}

/* ─── Apply Move ─── */
export function applyMove(state: SieveState, move: Move): SieveState {
  if (move.type === 'sieve') {
    const newSieved = [...state.sieved];
    const newRevealed = [...state.revealedGroups];
    newSieved[move.index] = true;
    newRevealed[move.index] = state.groups[move.index];
    return {
      ...state,
      sieved: newSieved,
      revealedGroups: newRevealed,
      sieveCount: state.sieveCount + 1,
    };
  }

  if (move.type === 'submit') {
    const correct = checkSubmission(state, move.rules);
    return {
      ...state,
      solved: correct,
      submittedRules: move.rules,
    };
  }

  return state;
}

/* ─── Check Submission ─── */
function checkSubmission(
  state: SieveState,
  rules: { attr: AttributeType; value: number }[],
): boolean {
  for (let g = 0; g < 4; g++) {
    const rule = rules[g];
    const members = state.groups
      .map((grp, idx) => (grp === g ? idx : -1))
      .filter(x => x >= 0);
    for (const idx of members) {
      if (state.icons[idx][rule.attr] !== rule.value) return false;
    }
  }
  return true;
}

/* ─── Is Goal ─── */
export function isGoal(state: SieveState): boolean {
  return state.solved;
}

/* ─── Heuristic: groups not yet confidently identified ─── */
export function heuristic(state: SieveState): number {
  const groupMembers: Map<number, number[]> = new Map();
  for (let i = 0; i < 16; i++) {
    if (state.revealedGroups[i] !== null) {
      const g = state.revealedGroups[i]!;
      if (!groupMembers.has(g)) groupMembers.set(g, []);
      groupMembers.get(g)!.push(i);
    }
  }

  let unsolved = 4;
  const attrTypes: AttributeType[] = ['color', 'shape', 'fill'];

  for (const [, members] of groupMembers) {
    if (members.length < 2) continue;
    for (const attr of attrTypes) {
      const vals = members.map(i => state.icons[i][attr]);
      if (vals.every(v => v === vals[0])) {
        unsolved--;
        break;
      }
    }
  }

  return unsolved;
}

/* ─── Info gain scoring ─── */
function computeInfoGain(state: SieveState, iconIdx: number): number {
  const icon = state.icons[iconIdx];
  const attrTypes: AttributeType[] = ['color', 'shape', 'fill'];

  const groupMembers: Map<number, number[]> = new Map();
  for (let i = 0; i < 16; i++) {
    if (state.revealedGroups[i] !== null) {
      const g = state.revealedGroups[i]!;
      if (!groupMembers.has(g)) groupMembers.set(g, []);
      groupMembers.get(g)!.push(i);
    }
  }

  if (groupMembers.size === 0) return 2;

  let gain = 0;
  for (const [, members] of groupMembers) {
    let sharedAttrs = 0;
    for (const attr of attrTypes) {
      if (members.some(m => state.icons[m][attr] === icon[attr])) {
        sharedAttrs++;
      }
    }
    gain += sharedAttrs;
  }
  for (const [, members] of groupMembers) {
    if (members.length === 1) gain += 1;
  }
  return gain;
}

/* ─── Solver ─── */
export function solve(
  puzzle: SieveState,
  skillLevel: 1 | 2 | 3 | 4 | 5,
): Solution | null {
  if (skillLevel === 1) return solveRandom(puzzle);
  if (skillLevel === 2) return solveGreedy(puzzle);
  if (skillLevel === 3) return solveGreedyLookahead(puzzle);
  if (skillLevel === 4) return solveStrategic(puzzle);
  return solveOptimal(puzzle);
}

function cloneState(state: SieveState): SieveState {
  return {
    ...state,
    sieved: [...state.sieved],
    revealedGroups: [...state.revealedGroups],
  };
}

function solveRandom(puzzle: SieveState): Solution {
  let state = cloneState(puzzle);
  const moves: Move[] = [];
  const rng = seededRng(puzzle.groups[0] * 1000 + 42);

  const unsieved = Array.from({ length: 16 }, (_, i) => i).filter(i => !state.sieved[i]);
  const order = shuffle(unsieved, rng);

  for (const idx of order) {
    const move: Move = { type: 'sieve', index: idx };
    state = applyMove(state, move);
    moves.push(move);
    const rules = canDetermineAllRules(state);
    if (rules) {
      const submitMove: Move = { type: 'submit', rules };
      const nextState = applyMove(state, submitMove);
      if (nextState.solved) {
        moves.push(submitMove);
        return { moves, steps: state.sieveCount, sievesUsed: state.sieveCount };
      }
    }
  }

  const rules = canDetermineAllRules(state);
  if (rules) {
    const submitMove: Move = { type: 'submit', rules };
    state = applyMove(state, submitMove);
    moves.push(submitMove);
  }
  return { moves, steps: state.sieveCount, sievesUsed: state.sieveCount };
}

function solveGreedy(puzzle: SieveState): Solution {
  let state = cloneState(puzzle);
  const moves: Move[] = [];

  for (let iter = 0; iter < 16; iter++) {
    const rules = canDetermineAllRules(state);
    if (rules) {
      const submitMove: Move = { type: 'submit', rules };
      const testState = applyMove(state, submitMove);
      if (testState.solved) {
        moves.push(submitMove);
        return { moves, steps: state.sieveCount, sievesUsed: state.sieveCount };
      }
    }

    let bestIdx = -1;
    let bestGain = -1;
    for (let i = 0; i < 16; i++) {
      if (state.sieved[i]) continue;
      const gain = computeInfoGain(state, i);
      if (gain > bestGain) {
        bestGain = gain;
        bestIdx = i;
      }
    }
    if (bestIdx === -1) break;

    const move: Move = { type: 'sieve', index: bestIdx };
    state = applyMove(state, move);
    moves.push(move);
  }

  const rules = canDetermineAllRules(state);
  if (rules) {
    const submitMove: Move = { type: 'submit', rules };
    state = applyMove(state, submitMove);
    moves.push(submitMove);
  }
  return { moves, steps: state.sieveCount, sievesUsed: state.sieveCount };
}

function solveGreedyLookahead(puzzle: SieveState): Solution {
  let state = cloneState(puzzle);
  const moves: Move[] = [];

  for (let iter = 0; iter < 16; iter++) {
    const rules = canDetermineAllRules(state);
    if (rules) {
      const submitMove: Move = { type: 'submit', rules };
      const testState = applyMove(state, submitMove);
      if (testState.solved) {
        moves.push(submitMove);
        return { moves, steps: state.sieveCount, sievesUsed: state.sieveCount };
      }
    }

    let bestIdx = -1;
    let bestScore = Infinity;

    for (let i = 0; i < 16; i++) {
      if (state.sieved[i]) continue;
      const simState = applyMove(state, { type: 'sieve', index: i });
      const simRules = canDetermineAllRules(simState);
      if (simRules) {
        bestIdx = i;
        bestScore = -1;
        break;
      }
      const h = heuristic(simState);
      if (h < bestScore || (h === bestScore && bestIdx >= 0 && computeInfoGain(state, i) > computeInfoGain(state, bestIdx))) {
        bestScore = h;
        bestIdx = i;
      }
    }
    if (bestIdx === -1) break;

    const move: Move = { type: 'sieve', index: bestIdx };
    state = applyMove(state, move);
    moves.push(move);
  }

  const rules = canDetermineAllRules(state);
  if (rules) {
    const submitMove: Move = { type: 'submit', rules };
    state = applyMove(state, submitMove);
    moves.push(submitMove);
  }
  return { moves, steps: state.sieveCount, sievesUsed: state.sieveCount };
}

function solveStrategic(puzzle: SieveState): Solution {
  let state = cloneState(puzzle);
  const moves: Move[] = [];

  for (let iter = 0; iter < 16; iter++) {
    const rules = canDetermineAllRules(state);
    if (rules) {
      const submitMove: Move = { type: 'submit', rules };
      const testState = applyMove(state, submitMove);
      if (testState.solved) {
        moves.push(submitMove);
        return { moves, steps: state.sieveCount, sievesUsed: state.sieveCount };
      }
    }

    // Generate hypotheses and pick icon that maximally splits them
    const hypotheses = generateHypotheses(state);

    let bestIdx = -1;
    let bestSplit = -1;

    for (let i = 0; i < 16; i++) {
      if (state.sieved[i]) continue;

      const groupCounts = [0, 0, 0, 0];
      for (const hyp of hypotheses) {
        groupCounts[hyp[i]]++;
      }
      const nonZero = groupCounts.filter(c => c > 0);
      const splitScore = nonZero.length * Math.min(...nonZero);

      if (splitScore > bestSplit) {
        bestSplit = splitScore;
        bestIdx = i;
      }
    }

    if (bestIdx === -1) {
      // Fallback to greedy
      for (let i = 0; i < 16; i++) {
        if (!state.sieved[i]) { bestIdx = i; break; }
      }
    }
    if (bestIdx === -1) break;

    const move: Move = { type: 'sieve', index: bestIdx };
    state = applyMove(state, move);
    moves.push(move);
  }

  const rules = canDetermineAllRules(state);
  if (rules) {
    const submitMove: Move = { type: 'submit', rules };
    state = applyMove(state, submitMove);
    moves.push(submitMove);
  }
  return { moves, steps: state.sieveCount, sievesUsed: state.sieveCount };
}

function generateHypotheses(state: SieveState): number[][] {
  const attrTypes: AttributeType[] = ['color', 'shape', 'fill'];

  // All valid (attr, value) pairs that group exactly 4 icons
  const validPairs: { attr: AttributeType; value: number }[] = [];
  for (const attr of attrTypes) {
    for (let v = 0; v < 4; v++) {
      const count = state.icons.filter(icon => icon[attr] === v).length;
      if (count === 4) validPairs.push({ attr, value: v });
    }
  }

  // Generate all 4-combinations that partition all 16 icons
  const combos: { attr: AttributeType; value: number }[][] = [];
  for (let a = 0; a < validPairs.length; a++) {
    for (let b = a + 1; b < validPairs.length; b++) {
      for (let c = b + 1; c < validPairs.length; c++) {
        for (let d = c + 1; d < validPairs.length; d++) {
          const set = [validPairs[a], validPairs[b], validPairs[c], validPairs[d]];
          if (isValidRuleSet(state.icons, set)) {
            combos.push(set);
          }
        }
      }
    }
  }

  // For each valid rule set, try all permutations (rule-to-group mapping)
  const hypotheses: number[][] = [];
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
          consistent = false;
          break;
        }
      }

      if (consistent) hypotheses.push(assignment);
    }

    if (hypotheses.length > 200) break;
  }

  return hypotheses;
}

function isValidRuleSet(
  icons: Icon[],
  rules: { attr: AttributeType; value: number }[],
): boolean {
  const covered = new Set<number>();
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

function permutations4(): number[][] {
  const result: number[][] = [];
  function permute(arr: number[], l: number) {
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

function solveOptimal(puzzle: SieveState): Solution {
  let state = cloneState(puzzle);

  for (let maxDepth = 1; maxDepth <= 12; maxDepth++) {
    const result = dfsOptimal(state, [], maxDepth);
    if (result) return result;
  }

  return solveStrategic(puzzle);
}

function dfsOptimal(
  state: SieveState,
  moves: Move[],
  maxDepth: number,
): Solution | null {
  const rules = canDetermineAllRules(state);
  if (rules) {
    const testState = applyMove(state, { type: 'submit', rules });
    if (testState.solved) {
      return {
        moves: [...moves, { type: 'submit', rules }],
        steps: state.sieveCount,
        sievesUsed: state.sieveCount,
      };
    }
  }

  if (state.sieveCount >= maxDepth) return null;

  const candidates: { idx: number; gain: number }[] = [];
  for (let i = 0; i < 16; i++) {
    if (state.sieved[i]) continue;
    candidates.push({ idx: i, gain: computeInfoGain(state, i) });
  }
  candidates.sort((a, b) => b.gain - a.gain);

  const limit = Math.min(candidates.length, maxDepth <= 4 ? 8 : 5);

  for (let c = 0; c < limit; c++) {
    const idx = candidates[c].idx;
    const move: Move = { type: 'sieve', index: idx };
    const nextState = applyMove(state, move);
    const result = dfsOptimal(nextState, [...moves, move], maxDepth);
    if (result) return result;
  }

  return null;
}

/* ─── Display constants ─── */
export const COLOR_NAMES = ['Red', 'Blue', 'Green', 'Yellow'];
export const SHAPE_NAMES = ['Circle', 'Square', 'Triangle', 'Diamond'];
export const FILL_NAMES = ['Solid', 'Striped', 'Dotted', 'Empty'];

export const COLOR_HEX = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f'];
export const SHAPE_SYMBOLS = ['\u25CF', '\u25A0', '\u25B2', '\u25C6'];

export const GROUP_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12'];
export const GROUP_BG = [
  'rgba(231,76,60,0.15)',
  'rgba(52,152,219,0.15)',
  'rgba(46,204,113,0.15)',
  'rgba(243,156,18,0.15)',
];
