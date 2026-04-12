export type ClasplineDifficulty = 1 | 2 | 3 | 4 | 5;

export type ClasplineMoveType = 'stow' | 'latchTop' | 'flagFault' | 'markClear';

export type ClasplineMove = {
  type: ClasplineMoveType;
};

export type ClasplineVerdict = {
  correct: boolean;
  label: string;
};

export type ClasplinePuzzle = {
  difficulty: ClasplineDifficulty;
  label: string;
  title: string;
  helper: string;
  route: string[];
  routeText: string;
  expectedValid: boolean;
};

export type ClasplineState = {
  puzzle: ClasplinePuzzle;
  index: number;
  stack: string[];
  actionsUsed: number;
  history: string[];
  message: string;
  verdict: ClasplineVerdict | null;
};

export type ClasplineSolution = {
  moves: ClasplineMove[];
  finalState: ClasplineState;
  solved: boolean;
  actionsUsed: number;
};

type RouteBlueprint = {
  label: string;
  title: string;
  helper: string;
  routes: string[];
};

type DifficultyAggregate = {
  difficulty: ClasplineDifficulty;
  label: string;
  routeLength: number;
  solvability: number;
  puzzleEntropy: number;
  skillDepth: number;
  decisionEntropy: number;
  counterintuitive: number;
  drama: number;
  infoGainRatio: number;
  optimalMoves: number;
  altAccuracy: number;
  fifoAccuracy: number;
};

type LearningMetrics = {
  inputShapeMatch: number;
  operationMatch: number;
  constraintMatch: number;
  goalMatch: number;
  leetCodeFit: number;
  bestAlternativeGap: number;
  invariantPressure: number;
  difficultyBreakpoint: ClasplineDifficulty;
  algorithmAlignment: number;
};

export type ClasplineEvaluation = {
  difficulties: DifficultyAggregate[];
  learningMetrics: LearningMetrics;
  interpretation: {
    invariant: string;
    strongestAlternative: string;
    evidence: string;
  };
};

const TOKEN_META: Record<string, { family: string; name: string; color: string }> = {
  '(': { family: 'arc', name: 'Arc opener', color: '#58c4dd' },
  ')': { family: 'arc', name: 'Arc closer', color: '#58c4dd' },
  '[': { family: 'shield', name: 'Shield opener', color: '#f3b562' },
  ']': { family: 'shield', name: 'Shield closer', color: '#f3b562' },
  '{': { family: 'vine', name: 'Vine opener', color: '#82c596' },
  '}': { family: 'vine', name: 'Vine closer', color: '#82c596' },
};

const OPENERS = new Set(['(', '[', '{']);
const MATCHING_CLOSER: Record<string, string> = {
  '(': ')',
  '[': ']',
  '{': '}',
};

const BLUEPRINTS: Record<ClasplineDifficulty, RouteBlueprint> = {
  1: {
    label: 'D1',
    title: 'Festival Warmup',
    helper: 'Short routes keep the pile shallow. You can get away with thinking only about obvious pairs.',
    routes: ['()()', '(())', '[]{}', '[[]]', '()[]{}'],
  },
  2: {
    label: 'D2',
    title: 'Courtyard Relay',
    helper: 'Mixed families and leftover endings appear, but the live top still stays intuitive if you watch the pile.',
    routes: ['([])', '{[]}', '()[', '([][])', '{[()]}'],
  },
  3: {
    label: 'D3',
    title: 'Crosswind Gate',
    helper: 'Crossed routes finally arrive. A matching family buried deeper in the pile is no longer good enough.',
    routes: ['([)]', '{[}]', '({[]})', '[{()}]', '()[{}]([])'],
  },
  4: {
    label: 'D4',
    title: 'Procession Stair',
    helper: 'Longer nested routes bury tempting matches under several live seals. Counts and first-opened instincts now fail hard.',
    routes: ['({[()]})', '[{(])}', '[({})](())', '({[)][]}', '(([]{})[{}])'],
  },
  5: {
    label: 'D5',
    title: 'Grand Vault',
    helper: 'The longest routes mix deep nesting, crossed failures, and leftover endings. Only strict top-first handling survives.',
    routes: [
      '({[]})[({})]{{}}',
      '({[()]}[{}])(()[])',
      '({[])}[{}]',
      '[{({})}([])]}',
      '((({[]})))[]{}([)]',
    ],
  },
};

function clamp(min: number, max: number, value: number) {
  return Math.max(min, Math.min(max, value));
}

function log2(value: number) {
  return Math.log(value) / Math.log(2);
}

function cloneState(state: ClasplineState): ClasplineState {
  return {
    ...state,
    stack: [...state.stack],
    history: [...state.history],
    verdict: state.verdict ? { ...state.verdict } : null,
  };
}

export function isOpener(token: string) {
  return OPENERS.has(token);
}

export function describeToken(token: string) {
  const meta = TOKEN_META[token];
  return meta ? `${meta.name} ${token}` : token;
}

export function tokenColor(token: string) {
  return TOKEN_META[token]?.color ?? '#d7dadc';
}

export function matchingCloser(opener: string) {
  return MATCHING_CLOSER[opener];
}

export function currentToken(state: ClasplineState) {
  return state.puzzle.route[state.index] ?? null;
}

export function currentTop(state: ClasplineState) {
  return state.stack[state.stack.length - 1] ?? null;
}

export function remainingCount(state: ClasplineState) {
  return Math.max(0, state.puzzle.route.length - state.index);
}

function evaluateRoute(route: string[]) {
  const stack: string[] = [];
  for (const token of route) {
    if (isOpener(token)) {
      stack.push(token);
      continue;
    }
    const top = stack[stack.length - 1];
    if (!top || matchingCloser(top) !== token) return false;
    stack.pop();
  }
  return stack.length === 0;
}

export function generatePuzzle(seed: number, difficulty: ClasplineDifficulty): ClasplinePuzzle {
  const blueprint = BLUEPRINTS[difficulty];
  const routeText = blueprint.routes[seed % blueprint.routes.length]!;
  const route = routeText.split('');
  return {
    difficulty,
    label: blueprint.label,
    title: blueprint.title,
    helper: blueprint.helper,
    route,
    routeText,
    expectedValid: evaluateRoute(route),
  };
}

export function createInitialState(puzzle: ClasplinePuzzle): ClasplineState {
  return {
    puzzle,
    index: 0,
    stack: [],
    actionsUsed: 0,
    history: [],
    message: 'Process the route from left to right. Openers must be stowed; closers only care about the live top seal.',
    verdict: null,
  };
}

export function legalMoves(state: ClasplineState): ClasplineMove[] {
  if (state.verdict) return [];
  if (currentToken(state) === null) {
    return [{ type: 'markClear' }, { type: 'flagFault' }];
  }
  return [{ type: 'stow' }, { type: 'latchTop' }, { type: 'flagFault' }];
}

function finalizeAfterAdvance(state: ClasplineState) {
  if (currentToken(state) !== null) return state;
  return {
    ...state,
    message:
      state.stack.length === 0
        ? 'Route consumed. If the vault is empty, mark the line clear.'
        : 'Route consumed, but seals remain in the vault. Flag the line broken.',
  };
}

export function applyMove(state: ClasplineState, move: ClasplineMove): ClasplineState {
  if (state.verdict) return state;

  const next = cloneState(state);
  next.actionsUsed += 1;
  next.history.push(move.type);

  const token = currentToken(state);
  const top = currentTop(state);

  if (token === null) {
    if (move.type === 'markClear') {
      next.verdict = next.stack.length === 0
        ? { correct: true, label: 'Route certified clear.' }
        : { correct: false, label: 'False clear: open seals were still buried in the vault.' };
      next.message = next.verdict.label;
      return next;
    }

    next.verdict = next.stack.length > 0
      ? { correct: true, label: 'Fault flagged: the route ended with open seals still buried.' }
      : { correct: false, label: 'False fault: the route was already fully closed.' };
    next.message = next.verdict.label;
    return next;
  }

  if (move.type === 'stow') {
    if (!isOpener(token)) {
      next.verdict = { correct: false, label: `Wrong action: ${describeToken(token)} needed top comparison, not stowing.` };
      next.message = next.verdict.label;
      return next;
    }
    next.stack.push(token);
    next.index += 1;
    next.message = `Stowed ${describeToken(token)}. The vault top is now ${describeToken(currentTop(next) ?? token)}.`;
    return finalizeAfterAdvance(next);
  }

  if (move.type === 'latchTop') {
    if (isOpener(token)) {
      next.verdict = { correct: false, label: `Wrong action: ${describeToken(token)} was an opener and had to be stowed.` };
      next.message = next.verdict.label;
      return next;
    }

    if (!top) {
      next.verdict = { correct: false, label: `Latch failed: ${describeToken(token)} hit an empty vault. You should have flagged fault.` };
      next.message = next.verdict.label;
      return next;
    }

    if (matchingCloser(top) !== token) {
      next.verdict = {
        correct: false,
        label: `Latch failed: ${describeToken(token)} collided with ${describeToken(top)} on top. The buried match does not count.`,
      };
      next.message = next.verdict.label;
      return next;
    }

    next.stack.pop();
    next.index += 1;
    next.message = `Latched ${describeToken(token)} against ${describeToken(top)} and cleared the live top.`;
    return finalizeAfterAdvance(next);
  }

  if (move.type === 'flagFault') {
    const correctFault =
      !isOpener(token) && (!top || matchingCloser(top) !== token);

    next.verdict = correctFault
      ? { correct: true, label: `Fault flagged correctly on ${describeToken(token)}.` }
      : { correct: false, label: `False fault: ${describeToken(token)} was still processable.` };
    next.message = next.verdict.label;
    return next;
  }

  next.verdict = { correct: false, label: 'Unknown action.' };
  next.message = next.verdict.label;
  return next;
}

export function isGoal(state: ClasplineState) {
  return Boolean(state.verdict?.correct);
}

export function heuristic(state: ClasplineState) {
  const token = currentToken(state);
  if (state.verdict?.correct) return 0;
  if (state.verdict && !state.verdict.correct) return 999;
  return remainingCount(state) + state.stack.length + (token === null ? 0 : 1);
}

function stateKey(state: ClasplineState) {
  return `${state.index}|${state.stack.join('')}|${state.verdict?.label ?? ''}`;
}

function countMatchingOpeners(stack: string[], closer: string) {
  return stack.filter((item) => matchingCloser(item) === closer).length;
}

function chooseMove(state: ClasplineState, skillLevel: 1 | 2 | 3 | 4 | 5): ClasplineMove {
  const token = currentToken(state);
  const top = currentTop(state);

  if (skillLevel === 1) {
    const moves = legalMoves(state);
    return moves[Math.floor(Math.random() * moves.length)]!;
  }

  if (skillLevel === 2) {
    if (token === null) {
      return { type: state.stack.length === 0 ? 'markClear' : 'flagFault' };
    }
    if (isOpener(token)) return { type: 'stow' };
    return { type: countMatchingOpeners(state.stack, token) > 0 ? 'latchTop' : 'flagFault' };
  }

  if (skillLevel === 3) {
    if (token === null) {
      return { type: state.stack.length === 0 ? 'markClear' : 'flagFault' };
    }
    if (isOpener(token)) return { type: 'stow' };
    const oldest = state.stack[0];
    return { type: oldest && matchingCloser(oldest) === token ? 'latchTop' : 'flagFault' };
  }

  if (skillLevel === 4) {
    const planned = depthSearch(state);
    if (planned.length > 0) return planned[0]!;
  }

  if (token === null) {
    return { type: state.stack.length === 0 ? 'markClear' : 'flagFault' };
  }
  if (isOpener(token)) return { type: 'stow' };
  return { type: top && matchingCloser(top) === token ? 'latchTop' : 'flagFault' };
}

function depthSearch(root: ClasplineState) {
  const seen = new Set<string>();

  function search(state: ClasplineState): ClasplineMove[] | null {
    if (state.verdict?.correct) return [];
    if (state.verdict && !state.verdict.correct) return null;

    const key = stateKey(state);
    if (seen.has(key)) return null;
    seen.add(key);

    for (const move of legalMoves(state)) {
      const next = applyMove(state, move);
      const tail = search(next);
      if (tail) return [move, ...tail];
    }

    return null;
  }

  return search(root) ?? [];
}

export function solve(puzzle: ClasplinePuzzle, skillLevel: 1 | 2 | 3 | 4 | 5): ClasplineSolution | null {
  let state = createInitialState(puzzle);
  const moves: ClasplineMove[] = [];
  const safetyLimit = puzzle.route.length + 3;

  for (let step = 0; step < safetyLimit; step += 1) {
    if (state.verdict) {
      return {
        moves,
        finalState: state,
        solved: Boolean(state.verdict.correct),
        actionsUsed: state.actionsUsed,
      };
    }
    const move = chooseMove(state, skillLevel);
    moves.push(move);
    state = applyMove(state, move);
  }

  return {
    moves,
    finalState: state,
    solved: Boolean(state.verdict?.correct),
    actionsUsed: state.actionsUsed,
  };
}

function winningMoveCount(state: ClasplineState) {
  let wins = 0;
  for (const move of legalMoves(state)) {
    const next = applyMove(state, move);
    const solution = depthSearch(next);
    if (next.verdict?.correct || solution.length > 0) wins += 1;
  }
  return wins;
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function progressionRatio(puzzle: ClasplinePuzzle, solution: ClasplineSolution) {
  if (solution.solved) return 1;
  return clamp(0, 1, solution.finalState.index / Math.max(1, puzzle.route.length));
}

function evaluateDifficulty(difficulty: ClasplineDifficulty): DifficultyAggregate {
  const blueprint = BLUEPRINTS[difficulty];
  const puzzles = blueprint.routes.map((_, seed) => generatePuzzle(seed, difficulty));

  const solvability = puzzles.map((puzzle) => (solve(puzzle, 5)?.solved ? 1 : 0));
  const randomAccuracy = puzzles.map((puzzle) => (solve(puzzle, 1)?.solved ? 1 : 0));
  const countAccuracy = puzzles.map((puzzle) => (solve(puzzle, 2)?.solved ? 1 : 0));
  const fifoAccuracy = puzzles.map((puzzle) => (solve(puzzle, 3)?.solved ? 1 : 0));
  const routeLengths = puzzles.map((puzzle) => puzzle.route.length);
  const optimalMoves: number[] = [];
  const entropySums: number[] = [];
  const entropyMeans: number[] = [];
  const counterintuitive: number[] = [];
  const infoGainRatios: number[] = [];
  const drama: number[] = [];

  for (const puzzle of puzzles) {
    const optimal = solve(puzzle, 5)!;
    optimalMoves.push(optimal.actionsUsed);
    drama.push(progressionRatio(puzzle, solve(puzzle, 3)!));

    let state = createInitialState(puzzle);
    let entropySum = 0;
    let steps = 0;
    let buriedMismatchCount = 0;
    let ratioSum = 0;

    for (const move of optimal.moves) {
      const choices = legalMoves(state).length;
      entropySum += log2(choices);
      steps += 1;

      const winningMoves = winningMoveCount(state);
      ratioSum += winningMoves === 0 ? choices : choices / winningMoves;

      const token = currentToken(state);
      const top = currentTop(state);
      if (
        token &&
        !isOpener(token) &&
        move.type === 'flagFault' &&
        top &&
        matchingCloser(top) !== token &&
        countMatchingOpeners(state.stack, token) > 0
      ) {
        buriedMismatchCount += 1;
      }

      state = applyMove(state, move);
      if (state.verdict) break;
    }

    entropySums.push(entropySum);
    entropyMeans.push(steps === 0 ? 0 : entropySum / steps);
    counterintuitive.push(buriedMismatchCount);
    infoGainRatios.push(steps === 0 ? 1 : ratioSum / steps);
  }

  const optimalAccuracy = average(solvability);
  const randomAverage = average(randomAccuracy);

  return {
    difficulty,
    label: blueprint.label,
    routeLength: average(routeLengths),
    solvability: optimalAccuracy,
    puzzleEntropy: average(entropySums),
    skillDepth: optimalAccuracy === 0 ? 0 : clamp(0, 1, (optimalAccuracy - randomAverage) / optimalAccuracy),
    decisionEntropy: average(entropyMeans),
    counterintuitive: average(counterintuitive),
    drama: average(drama),
    infoGainRatio: average(infoGainRatios),
    optimalMoves: average(optimalMoves),
    altAccuracy: average(countAccuracy),
    fifoAccuracy: average(fifoAccuracy),
  };
}

export function evaluateClaspline(): ClasplineEvaluation {
  const difficulties = ([1, 2, 3, 4, 5] as ClasplineDifficulty[]).map((difficulty) => evaluateDifficulty(difficulty));
  const bestAlternativeGap = clamp(
    0,
    1,
    1 - average(difficulties.map((entry) => entry.altAccuracy)) / Math.max(0.0001, average(difficulties.map((entry) => entry.solvability))),
  );
  const invariantPressure = clamp(
    0,
    1,
    1 - average(difficulties.map((entry) => entry.fifoAccuracy)) / Math.max(0.0001, average(difficulties.map((entry) => entry.solvability))),
  );

  const breakpoint =
    difficulties.find((entry) => entry.altAccuracy <= 0.8 || entry.altAccuracy < entry.solvability * 0.7)?.difficulty ?? 5;

  const inputShapeMatch = 1.0;
  const operationMatch = 1.0;
  const constraintMatch = 0.75;
  const goalMatch = 1.0;
  const leetCodeFit = average([inputShapeMatch, operationMatch, constraintMatch, goalMatch]);

  return {
    difficulties,
    learningMetrics: {
      inputShapeMatch,
      operationMatch,
      constraintMatch,
      goalMatch,
      leetCodeFit,
      bestAlternativeGap,
      invariantPressure,
      difficultyBreakpoint: breakpoint,
      algorithmAlignment: 1.0,
    },
    interpretation: {
      invariant: 'Only the most recently opened seal is still reachable when a closer arrives.',
      strongestAlternative: 'Track matching families by count and assume a deeper matching opener can save the route.',
      evidence:
        'D1-D2 routes stay mostly friendly to count-based thinking, but D3 introduces crossed routes such as ([)] and {[}] where a deeper matching opener exists yet the correct move is immediate fault.',
    },
  };
}
