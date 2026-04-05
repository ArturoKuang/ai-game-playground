/**
 * Nest Solver — Stack (Bracket Matching with LIFO Ordering)
 *
 * A sequence of colored bracket pairs. Player selects matching pairs to
 * score points. Inner (nested) pairs must be matched before outer pairs
 * (LIFO constraint). Scoring combines depth multiplier + color combo bonus:
 *   score = (depth + 1) * depthMultiplier + comboBonus
 *   comboBonus = comboStreak * comboMultiplier (for consecutive same-color matches)
 *
 * Algorithm insight: Each match of the innermost pair = stack pop.
 * The LIFO constraint IS the stack invariant. Optimal play requires
 * planning the matching ORDER to maximize total score across depth
 * multipliers AND color combos.
 */

/* ─── Types ─── */

export type BracketType = {
  color: number;
  isOpen: boolean;
  matchIndex: number;
  depth: number; // initial structural depth
};

export type NestState = {
  brackets: BracketType[];
  matched: boolean[];
  score: number;
  moves: number;
  budget: number;
  difficulty: number;
  depthMultiplier: number;
  comboMultiplier: number;
  comboStreak: number; // current consecutive same-color matches
  lastColor: number;   // color of last matched pair (-1 = none)
  numColors: number;
};

export type Move = [number, number]; // [openIndex, closeIndex]

export type Solution = {
  moves: Move[];
  steps: number;
  score: number;
};

/* ─── PRNG ─── */

function makeRng(seed: number): () => number {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ─── Difficulty Parameters ─── */

export function getDifficultyParams(difficulty: number) {
  switch (difficulty) {
    case 1: return { bracketCount: 10, numColors: 2, depthMultiplier: 1,   comboMultiplier: 0.5, budgetMultiplier: 2.0 };
    case 2: return { bracketCount: 12, numColors: 2, depthMultiplier: 1.5, comboMultiplier: 1,   budgetMultiplier: 1.8 };
    case 3: return { bracketCount: 14, numColors: 3, depthMultiplier: 2,   comboMultiplier: 1.5, budgetMultiplier: 1.5 };
    case 4: return { bracketCount: 18, numColors: 3, depthMultiplier: 2,   comboMultiplier: 2,   budgetMultiplier: 1.3 };
    case 5: return { bracketCount: 22, numColors: 4, depthMultiplier: 2.5, comboMultiplier: 2,   budgetMultiplier: 1.2 };
    default: return { bracketCount: 10, numColors: 2, depthMultiplier: 1.5, comboMultiplier: 1,   budgetMultiplier: 1.8 };
  }
}

/* ─── Helpers ─── */

function cloneState(state: NestState): NestState {
  return {
    brackets: state.brackets.map(b => ({ ...b })),
    matched: [...state.matched],
    score: state.score,
    moves: state.moves,
    budget: state.budget,
    difficulty: state.difficulty,
    depthMultiplier: state.depthMultiplier,
    comboMultiplier: state.comboMultiplier,
    comboStreak: state.comboStreak,
    lastColor: state.lastColor,
    numColors: state.numColors,
  };
}

/**
 * Generate a valid bracket sequence with intentional structure for interesting puzzles.
 * Creates 2-3 top-level nesting groups, each with deep internal nesting.
 * This gives: (1) LIFO enforcement within groups, (2) parallel choices between groups,
 * (3) color combo opportunities across groups.
 */
function generateBracketSequence(
  pairCount: number,
  numColors: number,
  rng: () => number,
): BracketType[] {
  const brackets: BracketType[] = [];
  const matchPairs: [number, number][] = [];

  // 2-3 top-level groups (fewer = deeper nesting = more LIFO enforcement)
  const groupCount = Math.min(pairCount, Math.max(2, 2 + Math.floor(rng() * 2)));
  const groups: number[] = [];
  let remaining = pairCount;

  for (let g = 0; g < groupCount - 1; g++) {
    const maxForGroup = remaining - (groupCount - g - 1);
    // Prefer larger groups (deeper nesting)
    const minSize = Math.max(1, Math.floor(maxForGroup * 0.3));
    const size = Math.max(1, Math.min(maxForGroup, minSize + Math.floor(rng() * (maxForGroup - minSize + 1))));
    groups.push(size);
    remaining -= size;
  }
  groups.push(remaining);

  // Shuffle group order
  for (let i = groups.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [groups[i], groups[j]] = [groups[j], groups[i]];
  }

  // Build each group with deep nesting
  for (const groupSize of groups) {
    buildDeepGroup(groupSize, numColors, rng, brackets, matchPairs);
  }

  // Set matchIndex
  for (const [oi, ci] of matchPairs) {
    brackets[oi].matchIndex = ci;
    brackets[ci].matchIndex = oi;
  }

  // Compute initial depths
  let depth = 0;
  for (let i = 0; i < brackets.length; i++) {
    if (brackets[i].isOpen) {
      depth++;
      brackets[i].depth = depth;
    } else {
      brackets[i].depth = depth;
      depth--;
    }
  }

  return brackets;
}

/**
 * Build a group with deep nesting (favoring wrapping over sequential).
 * This ensures LIFO is actively constraining most moves.
 */
function buildDeepGroup(
  size: number,
  numColors: number,
  rng: () => number,
  brackets: BracketType[],
  matchPairs: [number, number][],
): void {
  if (size <= 0) return;

  if (size === 1) {
    const color = Math.floor(rng() * numColors);
    const openIdx = brackets.length;
    brackets.push({ color, isOpen: true, matchIndex: -1, depth: 0 });
    const closeIdx = brackets.length;
    brackets.push({ color, isOpen: false, matchIndex: -1, depth: 0 });
    matchPairs.push([openIdx, closeIdx]);
    return;
  }

  const strategy = rng();

  if (strategy < 0.7 && size >= 2) {
    // Wrap: outer pair containing all inner pairs (deep nesting, strong LIFO)
    const color = Math.floor(rng() * numColors);
    const openIdx = brackets.length;
    brackets.push({ color, isOpen: true, matchIndex: -1, depth: 0 });

    // Inside: either one deep group or two sibling groups
    if (size - 1 >= 2 && rng() < 0.5) {
      // Two sibling groups inside (creates parallel choices within nesting)
      const inner = size - 1;
      const split = Math.max(1, 1 + Math.floor(rng() * (inner - 1)));
      buildDeepGroup(split, numColors, rng, brackets, matchPairs);
      buildDeepGroup(inner - split, numColors, rng, brackets, matchPairs);
    } else {
      buildDeepGroup(size - 1, numColors, rng, brackets, matchPairs);
    }

    const closeIdx = brackets.length;
    brackets.push({ color, isOpen: false, matchIndex: -1, depth: 0 });
    matchPairs.push([openIdx, closeIdx]);
  } else {
    // Sequential: first pair then rest (adds breadth)
    const color = Math.floor(rng() * numColors);
    const openIdx = brackets.length;
    brackets.push({ color, isOpen: true, matchIndex: -1, depth: 0 });
    const closeIdx = brackets.length;
    brackets.push({ color, isOpen: false, matchIndex: -1, depth: 0 });
    matchPairs.push([openIdx, closeIdx]);

    buildDeepGroup(size - 1, numColors, rng, brackets, matchPairs);
  }
}

function findLegalMoves(brackets: BracketType[], matched: boolean[]): Move[] {
  const moves: Move[] = [];

  for (let i = 0; i < brackets.length; i++) {
    if (matched[i] || !brackets[i].isOpen) continue;
    const j = brackets[i].matchIndex;
    if (j < 0 || matched[j]) continue;

    // Check LIFO constraint: no unmatched brackets between i and j
    let blocked = false;
    for (let k = i + 1; k < j; k++) {
      if (!matched[k]) {
        blocked = true;
        break;
      }
    }

    if (!blocked) {
      moves.push([i, j]);
    }
  }

  return moves;
}

/* ─── Core Game Logic ─── */

export function legalMoves(state: NestState): Move[] {
  return findLegalMoves(state.brackets, state.matched);
}

/**
 * Compute the current nesting depth of a pair.
 * Depth = number of unmatched open brackets that surround this pair.
 */
function computeMatchDepth(
  brackets: BracketType[],
  matched: boolean[],
  openIdx: number,
  closeIdx: number,
): number {
  let depth = 0;
  for (let k = 0; k < openIdx; k++) {
    if (brackets[k].isOpen && !matched[k]) {
      if (brackets[k].matchIndex > closeIdx) {
        depth++;
      }
    }
  }
  return depth;
}

/**
 * Calculate score for matching a pair, including depth and combo.
 */
function calculateScore(
  brackets: BracketType[],
  matched: boolean[],
  openIdx: number,
  closeIdx: number,
  depthMultiplier: number,
  comboMultiplier: number,
  comboStreak: number,
  lastColor: number,
): { points: number; newComboStreak: number } {
  const depth = computeMatchDepth(brackets, matched, openIdx, closeIdx);
  const color = brackets[openIdx].color;

  // Base depth score
  const depthScore = Math.max(1, Math.round((depth + 1) * depthMultiplier));

  // Combo bonus
  let newComboStreak = (color === lastColor && lastColor >= 0) ? comboStreak + 1 : 1;
  const comboBonus = newComboStreak > 1
    ? Math.round((newComboStreak - 1) * comboMultiplier)
    : 0;

  return { points: depthScore + comboBonus, newComboStreak };
}

export function applyMove(state: NestState, move: Move): NestState {
  const [openIdx, closeIdx] = move;
  const next = cloneState(state);

  const { points, newComboStreak } = calculateScore(
    next.brackets, next.matched, openIdx, closeIdx,
    next.depthMultiplier, next.comboMultiplier,
    next.comboStreak, next.lastColor,
  );

  next.matched[openIdx] = true;
  next.matched[closeIdx] = true;
  next.score += points;
  next.moves += 1;
  next.comboStreak = newComboStreak;
  next.lastColor = next.brackets[openIdx].color;

  return next;
}

export function isGoal(state: NestState): boolean {
  return state.matched.every(m => m);
}

export function heuristic(state: NestState): number {
  let unmatched = 0;
  for (let i = 0; i < state.brackets.length; i++) {
    if (!state.matched[i] && state.brackets[i].isOpen) unmatched++;
  }
  return unmatched;
}

/**
 * Get the score for matching a specific pair in the current state.
 */
export function getMoveScore(state: NestState, move: Move): number {
  const [openIdx, closeIdx] = move;
  const { points } = calculateScore(
    state.brackets, state.matched, openIdx, closeIdx,
    state.depthMultiplier, state.comboMultiplier,
    state.comboStreak, state.lastColor,
  );
  return points;
}

/* ─── Puzzle Generation ─── */

export function generatePuzzle(seed: number, difficulty: number): NestState {
  const rng = makeRng(seed);
  const params = getDifficultyParams(difficulty);
  const pairCount = params.bracketCount / 2;

  let bestBrackets: BracketType[] | null = null;
  let bestQuality = -1;

  for (let attempt = 0; attempt < 80; attempt++) {
    const brackets = generateBracketSequence(pairCount, params.numColors, rng);

    if (brackets.length !== params.bracketCount) continue;

    // Simulate play to assess puzzle quality
    const tempMatched = new Array(brackets.length).fill(false);
    let totalChoices = 0;
    let lifoBlocked = 0;
    let steps = 0;

    for (let s = 0; s < pairCount; s++) {
      const legal = findLegalMoves(brackets, tempMatched);
      if (legal.length === 0) break;

      // Count unmatched pairs
      let unmatchedPairs = 0;
      for (let i = 0; i < brackets.length; i++) {
        if (!tempMatched[i] && brackets[i].isOpen) unmatchedPairs++;
      }

      totalChoices += legal.length;
      if (legal.length < unmatchedPairs) lifoBlocked++;
      steps++;

      tempMatched[legal[0][0]] = true;
      tempMatched[legal[0][1]] = true;
    }

    if (steps !== pairCount) continue;

    // Quality = balanced score of choices (want > 1.5 avg) and LIFO enforcement (want > 50%)
    const avgChoices = totalChoices / steps;
    const lifoRate = lifoBlocked / steps;
    const quality = Math.min(avgChoices, 3) + lifoRate * 3; // Weight LIFO enforcement

    if (quality > bestQuality) {
      bestQuality = quality;
      bestBrackets = brackets;
    }

    // Accept if both criteria met
    if (avgChoices > 1.3 && lifoRate > 0.4) break;
  }

  if (!bestBrackets) {
    bestBrackets = generateBracketSequence(pairCount, params.numColors, rng);
  }

  const budget = Math.ceil(pairCount * params.budgetMultiplier);

  return {
    brackets: bestBrackets,
    matched: new Array(bestBrackets.length).fill(false),
    score: 0,
    moves: 0,
    budget,
    difficulty,
    depthMultiplier: params.depthMultiplier,
    comboMultiplier: params.comboMultiplier,
    comboStreak: 0,
    lastColor: -1,
    numColors: params.numColors,
  };
}

/* ─── Solvers ─── */

/** Level 1: Random -- pick a random legal pair to match */
function solveRandom(puzzle: NestState): Solution | null {
  let state = cloneState(puzzle);
  const moves: Move[] = [];
  const rng = makeRng(42);

  for (let step = 0; step < 200; step++) {
    if (isGoal(state)) return { moves, steps: state.moves, score: state.score };
    const legal = legalMoves(state);
    if (legal.length === 0) break;
    const pick = legal[Math.floor(rng() * legal.length)];
    state = applyMove(state, pick);
    moves.push(pick);
  }
  if (isGoal(state)) return { moves, steps: state.moves, score: state.score };
  return null;
}

/** Level 2: Greedy leftmost -- always match the first available (leftmost) legal pair */
function solveLeftmost(puzzle: NestState): Solution | null {
  let state = cloneState(puzzle);
  const moves: Move[] = [];

  for (let step = 0; step < 200; step++) {
    if (isGoal(state)) return { moves, steps: state.moves, score: state.score };
    const legal = legalMoves(state);
    if (legal.length === 0) break;
    legal.sort((a, b) => a[0] - b[0]);
    state = applyMove(state, legal[0]);
    moves.push(legal[0]);
  }
  if (isGoal(state)) return { moves, steps: state.moves, score: state.score };
  return null;
}

/** Level 3: Greedy best-immediate -- match the pair with the highest immediate score */
function solveDeepest(puzzle: NestState): Solution | null {
  let state = cloneState(puzzle);
  const moves: Move[] = [];

  for (let step = 0; step < 200; step++) {
    if (isGoal(state)) return { moves, steps: state.moves, score: state.score };
    const legal = legalMoves(state);
    if (legal.length === 0) break;

    let bestMove = legal[0];
    let bestScore = getMoveScore(state, legal[0]);
    for (let i = 1; i < legal.length; i++) {
      const s = getMoveScore(state, legal[i]);
      if (s > bestScore || (s === bestScore && legal[i][0] < bestMove[0])) {
        bestScore = s;
        bestMove = legal[i];
      }
    }
    state = applyMove(state, bestMove);
    moves.push(bestMove);
  }
  if (isGoal(state)) return { moves, steps: state.moves, score: state.score };
  return null;
}

/** Level 4: Limited lookahead -- try all orderings up to depth 5, pick highest score */
function solveLookahead(puzzle: NestState): Solution | null {
  let state = cloneState(puzzle);
  const totalMoves: Move[] = [];

  for (let step = 0; step < 200; step++) {
    if (isGoal(state)) return { moves: totalMoves, steps: state.moves, score: state.score };
    const legal = legalMoves(state);
    if (legal.length === 0) break;

    if (legal.length === 1) {
      state = applyMove(state, legal[0]);
      totalMoves.push(legal[0]);
      continue;
    }

    let bestFirstMove = legal[0];
    let bestLookaheadScore = -1;

    for (const firstMove of legal) {
      const score = lookaheadDFS(applyMove(state, firstMove), 4);
      if (score > bestLookaheadScore) {
        bestLookaheadScore = score;
        bestFirstMove = firstMove;
      }
    }

    state = applyMove(state, bestFirstMove);
    totalMoves.push(bestFirstMove);
  }
  if (isGoal(state)) return { moves: totalMoves, steps: state.moves, score: state.score };
  return null;
}

function lookaheadDFS(state: NestState, depth: number): number {
  if (depth === 0 || isGoal(state)) return state.score;
  const legal = legalMoves(state);
  if (legal.length === 0) return state.score;

  let best = -1;
  for (const move of legal) {
    const next = applyMove(state, move);
    const score = lookaheadDFS(next, depth - 1);
    if (score > best) best = score;
  }
  return best;
}

/** Level 5: Full optimal -- DFS over ALL possible matching orders */
function solveOptimal(puzzle: NestState): Solution | null {
  const state = cloneState(puzzle);

  let bestScore = -1;
  let bestMoves: Move[] = [];

  function dfs(st: NestState, moveSoFar: Move[]): void {
    const legal = findLegalMoves(st.brackets, st.matched);

    if (legal.length === 0) {
      const allMatched = st.matched.every(m => m);
      if (allMatched && st.score > bestScore) {
        bestScore = st.score;
        bestMoves = [...moveSoFar];
      }
      return;
    }

    for (const move of legal) {
      const next = applyMove(st, move);
      moveSoFar.push(move);
      dfs(next, moveSoFar);
      moveSoFar.pop();
    }
  }

  dfs(state, []);

  if (bestScore >= 0) {
    return { moves: bestMoves, steps: bestMoves.length, score: bestScore };
  }
  return null;
}

export function solve(
  puzzle: NestState,
  skillLevel: 1 | 2 | 3 | 4 | 5,
): Solution | null {
  switch (skillLevel) {
    case 1: return solveRandom(puzzle);
    case 2: return solveLeftmost(puzzle);
    case 3: return solveDeepest(puzzle);
    case 4: return solveLookahead(puzzle);
    case 5: return solveOptimal(puzzle);
  }
}
