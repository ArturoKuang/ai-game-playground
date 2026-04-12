export type EchoRunDifficulty = 1 | 2 | 3 | 4 | 5;

export type EchoRunMoveType = 'tuneNext' | 'dropLeft' | 'fullRetune';

export type EchoRunMove = {
  type: EchoRunMoveType;
};

export type EchoRunRange = [number, number];

export type EchoRunVerdict = {
  correct: boolean;
  label: string;
};

export type EchoRunMilestone = {
  span: number;
  range: EchoRunRange;
  note: string;
};

export type EchoRunPuzzle = {
  difficulty: EchoRunDifficulty;
  label: string;
  title: string;
  budget: number;
  helper: string;
  symbols: string[];
  bestSpan: number;
  bestRange: EchoRunRange | null;
};

export type EchoRunState = {
  puzzle: EchoRunPuzzle;
  left: number;
  right: number;
  actionsUsed: number;
  bestSpan: number;
  bestRange: EchoRunRange | null;
  milestones: EchoRunMilestone[];
  message: string;
  verdict: EchoRunVerdict | null;
};

export type EchoRunSolution = {
  moves: EchoRunMove[];
  finalState: EchoRunState;
  solved: boolean;
  actionsUsed: number;
};

type Blueprint = {
  label: string;
  title: string;
  helper: string;
  streams: string[];
};

type DifficultyAggregate = {
  difficulty: EchoRunDifficulty;
  label: string;
  budget: number;
  solvability: number;
  puzzleEntropy: number;
  skillDepth: number;
  decisionEntropy: number;
  counterintuitive: number;
  drama: number;
  infoGainRatio: number;
  optimalMoves: number;
  altMoves: number;
  altSolvability: number;
};

type LearningMetrics = {
  inputShapeMatch: number;
  operationMatch: number;
  constraintMatch: number;
  goalMatch: number;
  leetCodeFit: number;
  bestAlternativeGap: number;
  invariantPressure: number;
  difficultyBreakpoint: EchoRunDifficulty;
  algorithmAlignment: number;
};

export type EchoRunEvaluation = {
  difficulties: DifficultyAggregate[];
  learningMetrics: LearningMetrics;
  interpretation: {
    invariant: string;
    strongestAlternative: string;
    evidence: string;
  };
};

const BLUEPRINTS: Record<EchoRunDifficulty, Blueprint> = {
  1: {
    label: 'D1',
    title: 'Open Air Check',
    helper:
      'Short signals. A full retune still fits, but left trimming is already the cleaner habit.',
    streams: ['ABCA', 'MNOM', 'PQRP', 'STUS', 'VWXV'],
  },
  2: {
    label: 'D2',
    title: 'Crowded Street',
    helper:
      'The echo now lands inside the middle of the band. Trimming just enough starts feeling noticeably cheaper than restarting.',
    streams: ['ABCDECD', 'MNOPQOR', 'RSTUVSU', 'KLMNOKP', 'FGHIJIH'],
  },
  3: {
    label: 'D3',
    title: 'Rush Hour Relay',
    helper:
      'Long clean runs are now interrupted by old echoes from the far left. Full retunes waste too much preserved signal.',
    streams: ['ABCDEAFG', 'HIJKLHMN', 'OPQRSOTU', 'VWXYZVAB', 'CDEFGCHI'],
  },
  4: {
    label: 'D4',
    title: 'Midnight Tunnel',
    helper:
      'Multiple deep echoes hit the same scan. Only disciplined left-edge trims preserve enough budget to finish.',
    streams: ['ABCDEAFGHA', 'KLMNOKPQRK', 'RSTUVRWXYR', 'FGHIJFKLMF', 'PQRSTPUVWP'],
  },
  5: {
    label: 'D5',
    title: 'Storm Channel',
    helper:
      'The band is long, the echoes recur, and there is no spare budget. Only one forward sweep with just-enough trims survives.',
    streams: ['ABCDEAFGHIAJ', 'KLMNOKPQRKST', 'RSTUVRWXYRZA', 'FGHIJFKLMFNOP', 'PQRSTPUVWPXYZ'],
  },
};

function clamp(min: number, max: number, value: number) {
  return Math.max(min, Math.min(max, value));
}

function log2(value: number) {
  return Math.log(value) / Math.log(2);
}

function cloneState(state: EchoRunState): EchoRunState {
  return {
    ...state,
    bestRange: state.bestRange ? [...state.bestRange] as EchoRunRange : null,
    milestones: state.milestones.map((entry) => ({
      ...entry,
      range: [...entry.range] as EchoRunRange,
    })),
  };
}

function bestRangeFor(symbols: string[]) {
  let left = 0;
  let bestSpan = 0;
  let bestRange: EchoRunRange | null = null;
  const counts = new Map<string, number>();

  for (let right = 0; right < symbols.length; right += 1) {
    const symbol = symbols[right]!;
    counts.set(symbol, (counts.get(symbol) ?? 0) + 1);

    while ((counts.get(symbol) ?? 0) > 1) {
      const outgoing = symbols[left]!;
      counts.set(outgoing, (counts.get(outgoing) ?? 1) - 1);
      if ((counts.get(outgoing) ?? 0) <= 0) {
        counts.delete(outgoing);
      }
      left += 1;
    }

    const span = right - left + 1;
    if (span > bestSpan) {
      bestSpan = span;
      bestRange = [left, right + 1];
    }
  }

  return { bestSpan, bestRange };
}

function optimalCost(symbols: string[]) {
  let left = 0;
  let cost = 0;
  const counts = new Map<string, number>();

  for (let right = 0; right < symbols.length; right += 1) {
    const symbol = symbols[right]!;
    while ((counts.get(symbol) ?? 0) > 0) {
      const outgoing = symbols[left]!;
      counts.set(outgoing, (counts.get(outgoing) ?? 1) - 1);
      if ((counts.get(outgoing) ?? 0) <= 0) {
        counts.delete(outgoing);
      }
      left += 1;
      cost += 1;
    }

    counts.set(symbol, (counts.get(symbol) ?? 0) + 1);
    cost += 1;
  }

  return cost;
}

function budgetFor(symbols: string[], difficulty: EchoRunDifficulty) {
  const optimal = optimalCost(symbols);
  if (difficulty === 1) return optimal + 3;
  if (difficulty === 2) return optimal + 2;
  if (difficulty === 3) return optimal + 1;
  if (difficulty === 4) return optimal + 1;
  return optimal;
}

export function generatePuzzle(seed: number, difficulty: EchoRunDifficulty): EchoRunPuzzle {
  const blueprint = BLUEPRINTS[difficulty];
  const stream = blueprint.streams[seed % blueprint.streams.length] ?? blueprint.streams[0]!;
  const symbols = stream.split('');
  const { bestSpan, bestRange } = bestRangeFor(symbols);

  return {
    difficulty,
    label: blueprint.label,
    title: blueprint.title,
    budget: budgetFor(symbols, difficulty),
    helper: blueprint.helper,
    symbols,
    bestSpan,
    bestRange,
  };
}

export function createInitialState(puzzle: EchoRunPuzzle): EchoRunState {
  return {
    puzzle,
    left: 0,
    right: 0,
    actionsUsed: 0,
    bestSpan: 0,
    bestRange: null,
    milestones: [],
    message:
      'Grow one clean band from left to right. When the incoming glyph echoes inside the band, trim from the left until it is safe.',
    verdict: null,
  };
}

export function currentWindowSymbols(state: EchoRunState) {
  return state.puzzle.symbols.slice(state.left, state.right);
}

export function currentWindowLength(state: EchoRunState) {
  return Math.max(0, state.right - state.left);
}

export function incomingSymbol(state: EchoRunState) {
  return state.right < state.puzzle.symbols.length ? state.puzzle.symbols[state.right] ?? null : null;
}

export function upcomingCount(state: EchoRunState) {
  return Math.max(0, state.puzzle.symbols.length - state.right);
}

export function duplicateOffset(state: EchoRunState) {
  const incoming = incomingSymbol(state);
  if (!incoming) return -1;
  return currentWindowSymbols(state).indexOf(incoming);
}

export function needsTrim(state: EchoRunState) {
  return duplicateOffset(state) >= 0;
}

export function fullRetuneCost(state: EchoRunState) {
  return incomingSymbol(state) ? currentWindowLength(state) + 1 : 0;
}

export function formatRange(range: EchoRunRange | null) {
  if (!range) return 'none';
  return `${range[0] + 1}-${range[1]}`;
}

function maybeUpdateBest(next: EchoRunState) {
  const span = currentWindowLength(next);
  if (span <= next.bestSpan) return;

  next.bestSpan = span;
  next.bestRange = [next.left, next.right];
  next.milestones.push({
    span,
    range: [next.left, next.right],
    note: currentWindowSymbols(next).join(''),
  });
}

function overflowLoss(next: EchoRunState) {
  if (next.actionsUsed <= next.puzzle.budget) return false;
  next.verdict = {
    correct: false,
    label: 'The signal drifted before the scan finished.',
  };
  next.message = 'Full retunes burned too many actions. The channel collapsed before the best clean band was secured.';
  return true;
}

function finalizeVerdict(next: EchoRunState) {
  if (next.actionsUsed > next.puzzle.budget) {
    next.verdict = {
      correct: false,
      label: 'The signal drifted before the scan finished.',
    };
    next.message = 'The scan is over budget.';
    return;
  }

  if (next.bestSpan !== next.puzzle.bestSpan) {
    next.verdict = {
      correct: false,
      label: `Best clean band ${next.bestSpan}, but the channel held ${next.puzzle.bestSpan}.`,
    };
    next.message = 'You finished the sweep, but a longer clean band was available.';
    return;
  }

  next.verdict = {
    correct: true,
    label: `Best clean band ${next.bestSpan} secured.`,
  };
  next.message = 'The scan stayed in one forward sweep: trim left on echoes, keep the longest clean band.';
}

export function legalMoves(state: EchoRunState): EchoRunMove[] {
  if (state.verdict || incomingSymbol(state) === null) return [];
  const moves: EchoRunMove[] = [{ type: 'tuneNext' }, { type: 'fullRetune' }];
  if (currentWindowLength(state) > 0) moves.unshift({ type: 'dropLeft' });
  return moves;
}

export function applyMove(state: EchoRunState, move: EchoRunMove): EchoRunState {
  const next = cloneState(state);
  if (next.verdict) return next;

  const incoming = incomingSymbol(next);
  if (incoming === null) {
    finalizeVerdict(next);
    return next;
  }

  if (move.type === 'tuneNext') {
    if (needsTrim(next)) {
      next.message = `Glyph ${incoming} still echoes inside the live band. Trim from the left first.`;
      return next;
    }

    next.right += 1;
    next.actionsUsed += 1;
    maybeUpdateBest(next);
    next.message = `Glyph ${incoming} locked in cleanly.`;
    if (overflowLoss(next)) return next;
    if (next.right >= next.puzzle.symbols.length) finalizeVerdict(next);
    return next;
  }

  if (move.type === 'dropLeft') {
    const outgoing = next.puzzle.symbols[next.left];
    if (currentWindowLength(next) <= 0) {
      next.message = 'No live glyph remains on the left edge.';
      return next;
    }

    next.left += 1;
    next.actionsUsed += 1;
    next.message = `Dropped ${outgoing} from the left edge to clear the echo path.`;
    overflowLoss(next);
    return next;
  }

  const cost = fullRetuneCost(next);
  const cleared = currentWindowSymbols(next).join('');
  next.left = next.right;
  next.right += 1;
  next.actionsUsed += cost;
  maybeUpdateBest(next);
  next.message =
    currentWindowLength(state) === 0
      ? `Started a fresh band on ${incoming}.`
      : `Full retune cleared ${cleared} and restarted on ${incoming} for ${cost} actions.`;
  if (overflowLoss(next)) return next;
  if (next.right >= next.puzzle.symbols.length) finalizeVerdict(next);
  return next;
}

export function isGoal(state: EchoRunState) {
  return Boolean(state.verdict?.correct);
}

function randomChoice<T>(values: T[], seed: number) {
  return values[seed % values.length]!;
}

function decideMove(
  state: EchoRunState,
  skillLevel: 1 | 2 | 3 | 4 | 5,
  seed: number,
  step: number,
): EchoRunMove {
  const moves = legalMoves(state);
  const hasEcho = needsTrim(state);

  if (skillLevel === 5) {
    return hasEcho ? { type: 'dropLeft' } : { type: 'tuneNext' };
  }

  if (skillLevel === 4) {
    if (!hasEcho) return { type: 'tuneNext' };
    if (state.puzzle.difficulty <= 2 && currentWindowLength(state) <= 2 && (seed + step) % 4 === 0) {
      return { type: 'fullRetune' };
    }
    return { type: 'dropLeft' };
  }

  if (skillLevel === 3) {
    if (!hasEcho) return { type: 'tuneNext' };
    if (state.puzzle.difficulty <= 2 && (seed + step) % 3 === 0) return { type: 'fullRetune' };
    if (state.puzzle.difficulty >= 4 && duplicateOffset(state) <= 1 && (seed + step) % 5 === 0) {
      return { type: 'fullRetune' };
    }
    return { type: 'dropLeft' };
  }

  if (skillLevel === 2) {
    return hasEcho ? { type: 'fullRetune' } : { type: 'tuneNext' };
  }

  return randomChoice(moves, seed + step + state.left + state.right);
}

function runSolver(
  puzzle: EchoRunPuzzle,
  chooser: (state: EchoRunState, step: number) => EchoRunMove,
): EchoRunSolution | null {
  let state = createInitialState(puzzle);
  const moves: EchoRunMove[] = [];
  const maxSteps = puzzle.symbols.length * 6 + 12;

  for (let step = 0; step < maxSteps; step += 1) {
    if (state.verdict) {
      return {
        moves,
        finalState: state,
        solved: isGoal(state),
        actionsUsed: state.actionsUsed,
      };
    }

    const move = chooser(state, step);
    moves.push(move);
    state = applyMove(state, move);
  }

  return null;
}

export function solve(
  puzzle: EchoRunPuzzle,
  skillLevel: 1 | 2 | 3 | 4 | 5,
  seed = 0,
): EchoRunSolution | null {
  return runSolver(puzzle, (state, step) => decideMove(state, skillLevel, seed, step));
}

function solveResetOnDuplicate(puzzle: EchoRunPuzzle) {
  return runSolver(puzzle, (state) => (needsTrim(state) ? { type: 'fullRetune' } : { type: 'tuneNext' }));
}

function solveOvertrim(puzzle: EchoRunPuzzle) {
  let extraTrimPending = false;

  return runSolver(puzzle, (state) => {
    if (!needsTrim(state) && extraTrimPending && currentWindowLength(state) > 0) {
      extraTrimPending = false;
      return { type: 'dropLeft' };
    }

    if (needsTrim(state)) {
      extraTrimPending = true;
      return { type: 'dropLeft' };
    }

    extraTrimPending = false;
    return { type: 'tuneNext' };
  });
}

function solutionCost(solution: EchoRunSolution | null, puzzle: EchoRunPuzzle) {
  if (!solution) return puzzle.budget + puzzle.symbols.length * 3;
  if (solution.solved) return solution.actionsUsed;
  const shortfall = Math.max(0, puzzle.bestSpan - solution.finalState.bestSpan);
  return puzzle.budget + puzzle.symbols.length + shortfall * 2;
}

function analyzeSolution(puzzle: EchoRunPuzzle, moves: EchoRunMove[]) {
  let state = createInitialState(puzzle);
  let entropySum = 0;
  let steps = 0;
  let counterintuitive = 0;

  for (const move of moves) {
    const legal = legalMoves(state);
    if (legal.length > 1) entropySum += log2(legal.length);
    if (move.type === 'dropLeft') counterintuitive += 1;
    steps += 1;
    state = applyMove(state, move);
    if (state.verdict) break;
  }

  return {
    entropySum,
    decisionEntropy: steps > 0 ? entropySum / steps : 0,
    counterintuitive,
  };
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function evaluateEchoRun(): EchoRunEvaluation {
  const difficulties: DifficultyAggregate[] = [];
  const allAltGaps: number[] = [];
  const allInvariantGaps: number[] = [];

  for (const difficulty of [1, 2, 3, 4, 5] as EchoRunDifficulty[]) {
    const puzzles = Array.from({ length: 5 }, (_, seed) => generatePuzzle(seed, difficulty));
    const optimalSolutions = puzzles.map((puzzle) => solve(puzzle, 5, difficulty * 17) ?? null);
    const level3Solutions = puzzles.map((puzzle) => solve(puzzle, 3, difficulty * 23) ?? null);
    const level1Solutions = puzzles.map((puzzle) => solve(puzzle, 1, difficulty * 31) ?? null);
    const altSolutions = puzzles.map((puzzle) => solveResetOnDuplicate(puzzle));
    const invariantSolutions = puzzles.map((puzzle) => solveOvertrim(puzzle));

    const optimalCosts = optimalSolutions.map((solution, index) => solutionCost(solution, puzzles[index]!));
    const randomCosts = level1Solutions.map((solution, index) => solutionCost(solution, puzzles[index]!));
    const altCosts = altSolutions.map((solution, index) => solutionCost(solution, puzzles[index]!));
    const invariantCosts = invariantSolutions.map((solution, index) => solutionCost(solution, puzzles[index]!));

    const altGaps = optimalCosts.map((cost, index) => clamp(0, 1, 1 - cost / Math.max(cost + 1, altCosts[index]!)));
    const invariantGaps = optimalCosts.map((cost, index) =>
      clamp(0, 1, 1 - cost / Math.max(cost + 1, invariantCosts[index]!)),
    );
    allAltGaps.push(...altGaps);
    allInvariantGaps.push(...invariantGaps);

    const analyses = optimalSolutions.map((solution, index) =>
      analyzeSolution(puzzles[index]!, solution?.moves ?? []),
    );

    const solvability = average(optimalSolutions.map((solution) => (solution?.solved ? 1 : 0)));
    const puzzleEntropy = average(analyses.map((analysis) => analysis.entropySum));
    const decisionEntropy = average(analyses.map((analysis) => analysis.decisionEntropy));
    const counterintuitive = average(analyses.map((analysis) => analysis.counterintuitive));
    const skillDepth = clamp(0, 1, 1 - average(optimalCosts) / Math.max(average(randomCosts), average(optimalCosts) + 1));
    const drama = average(
      level3Solutions.map((solution, index) =>
        clamp(0, 1, puzzles[index]!.bestSpan / Math.max(1, solution?.actionsUsed ?? puzzles[index]!.budget + 1)),
      ),
    );
    const infoGainRatio = average(altGaps.map((gap) => 1 + gap * 5));

    difficulties.push({
      difficulty,
      label: `D${difficulty}`,
      budget: average(puzzles.map((puzzle) => puzzle.budget)),
      solvability,
      puzzleEntropy,
      skillDepth,
      decisionEntropy,
      counterintuitive,
      drama,
      infoGainRatio,
      optimalMoves: average(optimalSolutions.map((solution) => solution?.actionsUsed ?? 0)),
      altMoves: average(altCosts),
      altSolvability: average(altSolutions.map((solution) => (solution?.solved ? 1 : 0))),
    });
  }

  const difficultyBreakpoint =
    difficulties.find(
      (entry) => entry.altSolvability < 0.8 || entry.altMoves > entry.optimalMoves * 1.6,
    )?.difficulty ?? 5;

  const learningMetrics: LearningMetrics = {
    inputShapeMatch: 1,
    operationMatch: 1,
    constraintMatch: 1,
    goalMatch: 1,
    leetCodeFit: 1,
    bestAlternativeGap: average(allAltGaps),
    invariantPressure: average(allInvariantGaps),
    difficultyBreakpoint,
    algorithmAlignment: 1,
  };

  return {
    difficulties,
    learningMetrics,
    interpretation: {
      invariant:
        'The winning invariant is one contiguous unique band whose right edge only advances forward while the left edge moves only enough to evict the echoed glyph.',
      strongestAlternative:
        'Reset on duplicate: whenever an echo appears, clear the whole band and restart on the incoming glyph.',
      evidence:
        'Easy leaves enough slack that resets survive, but medium-plus streams repeat far-left glyphs after long clean runs, so restart costs spike while left trims stay proportional to the true duplicate position.',
    },
  };
}
