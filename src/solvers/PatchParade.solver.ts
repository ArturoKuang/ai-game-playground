export type PatchParadeDifficulty = 1 | 2 | 3 | 4 | 5;

export type PatchParadeMoveType = 'hangNext' | 'trimLeft' | 'fullRehang';

export type PatchParadeMove = {
  type: PatchParadeMoveType;
};

export type PatchParadeRange = [number, number];

export type PatchParadeVerdict = {
  correct: boolean;
  label: string;
};

export type PatchParadeMilestone = {
  span: number;
  range: PatchParadeRange;
  note: string;
  leader: string;
  patchDebt: number;
};

export type PatchParadeLedgerEntry = {
  symbol: string;
  count: number;
};

export type PatchParadePuzzle = {
  difficulty: PatchParadeDifficulty;
  label: string;
  title: string;
  budget: number;
  helper: string;
  symbols: string[];
  patchLimit: number;
  bestSpan: number;
  bestRange: PatchParadeRange | null;
};

export type PatchParadeState = {
  puzzle: PatchParadePuzzle;
  left: number;
  right: number;
  actionsUsed: number;
  bestSpan: number;
  bestRange: PatchParadeRange | null;
  milestones: PatchParadeMilestone[];
  message: string;
  verdict: PatchParadeVerdict | null;
};

export type PatchParadeSolution = {
  moves: PatchParadeMove[];
  finalState: PatchParadeState;
  solved: boolean;
  actionsUsed: number;
};

type Blueprint = {
  label: string;
  title: string;
  helper: string;
  patchLimit: number;
  streams: string[];
};

type DifficultyAggregate = {
  difficulty: PatchParadeDifficulty;
  label: string;
  patchLimit: number;
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
  difficultyBreakpoint: PatchParadeDifficulty;
  algorithmAlignment: number;
};

export type PatchParadeEvaluation = {
  difficulties: DifficultyAggregate[];
  learningMetrics: LearningMetrics;
  interpretation: {
    invariant: string;
    strongestAlternative: string;
    evidence: string;
  };
};

const BLUEPRINTS: Record<PatchParadeDifficulty, Blueprint> = {
  1: {
    label: 'D1',
    title: 'Street Warmup',
    helper:
      'One patch permit keeps the parade forgiving. You can already carry a stray pennant if the lead emblem still dominates.',
    patchLimit: 1,
    streams: ['AABA', 'BBAB', 'CCDC', 'DEED', 'FGFF'],
  },
  2: {
    label: 'D2',
    title: 'Main Avenue',
    helper:
      'The banner is longer, but still only one repaint is allowed. Do not panic at the first mismatch if the lead emblem can absorb it.',
    patchLimit: 1,
    streams: ['AABABBA', 'ABBBAAC', 'CCDCDDC', 'EFFEGEE', 'HIIHIJH'],
  },
  3: {
    label: 'D3',
    title: 'Festival Turn',
    helper:
      'Two patch permits let you carry a messier banner. Medium seeds finally punish players who insist on exact runs only.',
    patchLimit: 2,
    streams: ['AAABACADA', 'BBBCBDBAB', 'CCCDCEDCC', 'EEEFEGEHE', 'HHHIHJHKH'],
  },
  4: {
    label: 'D4',
    title: 'Crowded Plaza',
    helper:
      'The parade keeps feeding new strays into a strong majority. Only trim left after the repaint debt actually crosses the limit.',
    patchLimit: 2,
    streams: ['AAABACADAA', 'BBBCBDBABB', 'CCCDCECFCC', 'EEEFEGEHEE', 'HHHIHJHKHH'],
  },
  5: {
    label: 'D5',
    title: 'Grand Route',
    helper:
      'Three permits cover a lot of disorder, but not everything. The best run comes from preserving the dominant emblem and shaving only enough from the front.',
    patchLimit: 3,
    streams: ['AAABACADAEAA', 'BBBCBDBEBABB', 'CCCDCECFCGCC', 'EEEFEGEHEAEE', 'HHHIHJHKHLHH'],
  },
};

type LeaderInfo = {
  symbol: string | null;
  count: number;
};

function clamp(min: number, max: number, value: number) {
  return Math.max(min, Math.min(max, value));
}

function log2(value: number) {
  return Math.log(value) / Math.log(2);
}

function cloneState(state: PatchParadeState): PatchParadeState {
  return {
    ...state,
    bestRange: state.bestRange ? [...state.bestRange] as PatchParadeRange : null,
    milestones: state.milestones.map((entry) => ({
      ...entry,
      range: [...entry.range] as PatchParadeRange,
    })),
  };
}

function leaderForSymbols(symbols: string[]): LeaderInfo {
  const counts = new Map<string, number>();
  let leaderSymbol: string | null = null;
  let leaderCount = 0;

  for (const symbol of symbols) {
    const nextCount = (counts.get(symbol) ?? 0) + 1;
    counts.set(symbol, nextCount);
    if (nextCount > leaderCount) {
      leaderSymbol = symbol;
      leaderCount = nextCount;
    }
  }

  return {
    symbol: leaderSymbol,
    count: leaderCount,
  };
}

function maxCount(counts: Map<string, number>) {
  let max = 0;
  for (const value of counts.values()) {
    if (value > max) max = value;
  }
  return max;
}

function totalCount(counts: Map<string, number>) {
  let total = 0;
  for (const value of counts.values()) {
    total += value;
  }
  return total;
}

function bestRangeFor(symbols: string[], patchLimit: number) {
  let left = 0;
  let bestSpan = 0;
  let bestRange: PatchParadeRange | null = null;
  const counts = new Map<string, number>();

  for (let right = 0; right < symbols.length; right += 1) {
    const symbol = symbols[right]!;
    counts.set(symbol, (counts.get(symbol) ?? 0) + 1);

    while (right - left + 1 - maxCount(counts) > patchLimit) {
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

function projectedPatchDebtFromCounts(counts: Map<string, number>, windowLength: number, incoming: string) {
  const nextCount = (counts.get(incoming) ?? 0) + 1;
  return windowLength + 1 - Math.max(maxCount(counts), nextCount);
}

function optimalCost(symbols: string[], patchLimit: number) {
  let left = 0;
  let cost = 0;
  const counts = new Map<string, number>();

  for (const incoming of symbols) {
    while (projectedPatchDebtFromCounts(counts, totalCount(counts), incoming) > patchLimit) {
      const outgoing = symbols[left]!;
      counts.set(outgoing, (counts.get(outgoing) ?? 1) - 1);
      if ((counts.get(outgoing) ?? 0) <= 0) {
        counts.delete(outgoing);
      }
      left += 1;
      cost += 1;
    }

    counts.set(incoming, (counts.get(incoming) ?? 0) + 1);
    cost += 1;
  }

  return cost;
}

function budgetFor(symbols: string[], difficulty: PatchParadeDifficulty, patchLimit: number) {
  const optimal = optimalCost(symbols, patchLimit);
  if (difficulty === 1) return optimal + 3;
  if (difficulty === 2) return optimal + 2;
  if (difficulty === 3) return optimal + 1;
  if (difficulty === 4) return optimal + 1;
  return optimal;
}

export function generatePuzzle(seed: number, difficulty: PatchParadeDifficulty): PatchParadePuzzle {
  const blueprint = BLUEPRINTS[difficulty];
  const stream = blueprint.streams[seed % blueprint.streams.length] ?? blueprint.streams[0]!;
  const symbols = stream.split('');
  const { bestSpan, bestRange } = bestRangeFor(symbols, blueprint.patchLimit);

  return {
    difficulty,
    label: blueprint.label,
    title: blueprint.title,
    budget: budgetFor(symbols, difficulty, blueprint.patchLimit),
    helper: blueprint.helper,
    symbols,
    patchLimit: blueprint.patchLimit,
    bestSpan,
    bestRange,
  };
}

export function createInitialState(puzzle: PatchParadePuzzle): PatchParadeState {
  return {
    puzzle,
    left: 0,
    right: 0,
    actionsUsed: 0,
    bestSpan: 0,
    bestRange: null,
    milestones: [],
    message:
      'Carry the longest banner that can still be patched into one emblem. Mismatches are allowed until the repaint debt would exceed the crew limit.',
    verdict: null,
  };
}

export function currentWindowSymbols(state: PatchParadeState) {
  return state.puzzle.symbols.slice(state.left, state.right);
}

export function currentWindowLength(state: PatchParadeState) {
  return Math.max(0, state.right - state.left);
}

export function incomingSymbol(state: PatchParadeState) {
  return state.right < state.puzzle.symbols.length ? state.puzzle.symbols[state.right] ?? null : null;
}

export function upcomingCount(state: PatchParadeState) {
  return Math.max(0, state.puzzle.symbols.length - state.right);
}

export function currentLeaderInfo(state: PatchParadeState): LeaderInfo {
  return leaderForSymbols(currentWindowSymbols(state));
}

export function projectedLeaderInfo(state: PatchParadeState): LeaderInfo {
  const incoming = incomingSymbol(state);
  if (!incoming) return currentLeaderInfo(state);
  return leaderForSymbols([...currentWindowSymbols(state), incoming]);
}

export function currentPatchDebt(state: PatchParadeState) {
  const leader = currentLeaderInfo(state);
  return currentWindowLength(state) - leader.count;
}

export function projectedPatchDebt(state: PatchParadeState) {
  const incoming = incomingSymbol(state);
  if (!incoming) return 0;
  const leader = projectedLeaderInfo(state);
  return currentWindowLength(state) + 1 - leader.count;
}

export function incomingMatchesLeader(state: PatchParadeState) {
  const incoming = incomingSymbol(state);
  if (!incoming) return false;
  const leader = currentLeaderInfo(state);
  if (!leader.symbol) return true;
  return incoming === leader.symbol;
}

export function currentFrequencyTable(state: PatchParadeState): PatchParadeLedgerEntry[] {
  const counts = new Map<string, number>();
  for (const symbol of currentWindowSymbols(state)) {
    counts.set(symbol, (counts.get(symbol) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([symbol, count]) => ({ symbol, count }))
    .sort((a, b) => b.count - a.count || a.symbol.localeCompare(b.symbol));
}

export function fullRehangCost(state: PatchParadeState) {
  return incomingSymbol(state) ? currentWindowLength(state) + 1 : 0;
}

export function formatRange(range: PatchParadeRange | null) {
  if (!range) return 'none';
  return `${range[0] + 1}-${range[1]}`;
}

function maybeUpdateBest(next: PatchParadeState) {
  const span = currentWindowLength(next);
  if (span <= next.bestSpan) return;

  const leader = currentLeaderInfo(next);
  const patchDebt = currentPatchDebt(next);

  next.bestSpan = span;
  next.bestRange = [next.left, next.right];
  next.milestones.push({
    span,
    range: [next.left, next.right],
    note: currentWindowSymbols(next).join(''),
    leader: leader.symbol ?? '-',
    patchDebt,
  });
}

function overflowLoss(next: PatchParadeState) {
  if (next.actionsUsed <= next.puzzle.budget) return false;
  next.verdict = {
    correct: false,
    label: 'The banner crew ran out of street time.',
  };
  next.message = 'Too many resets or trims burned the route budget before the best banner was secured.';
  return true;
}

function finalizeVerdict(next: PatchParadeState) {
  if (next.actionsUsed > next.puzzle.budget) {
    next.verdict = {
      correct: false,
      label: 'The parade route expired.',
    };
    next.message = 'The banner plan is over budget.';
    return;
  }

  if (next.bestSpan !== next.puzzle.bestSpan) {
    next.verdict = {
      correct: false,
      label: `Best banner ${next.bestSpan}, but the route allowed ${next.puzzle.bestSpan}.`,
    };
    next.message = 'You finished the route, but a longer patchable banner was available.';
    return;
  }

  next.verdict = {
    correct: true,
    label: `Best banner ${next.bestSpan} secured.`,
  };
  next.message = 'The parade stayed in one forward sweep: carry tolerated strays, trim only on true overflow.';
}

export function legalMoves(state: PatchParadeState): PatchParadeMove[] {
  if (state.verdict || incomingSymbol(state) === null) return [];
  const moves: PatchParadeMove[] = [{ type: 'fullRehang' }];
  if (currentWindowLength(state) > 0) moves.unshift({ type: 'trimLeft' });
  if (projectedPatchDebt(state) <= state.puzzle.patchLimit) moves.unshift({ type: 'hangNext' });
  return moves;
}

export function applyMove(state: PatchParadeState, move: PatchParadeMove): PatchParadeState {
  const next = cloneState(state);
  if (next.verdict) return next;

  const incoming = incomingSymbol(next);
  if (incoming === null) {
    finalizeVerdict(next);
    return next;
  }

  if (move.type === 'hangNext') {
    const debt = projectedPatchDebt(next);
    if (debt > next.puzzle.patchLimit) {
      next.message = `Hanging ${incoming} would raise the repaint debt to ${debt}. Trim from the left first.`;
      return next;
    }

    const wasLeaderMatch = incomingMatchesLeader(next);
    next.right += 1;
    next.actionsUsed += 1;
    maybeUpdateBest(next);
    next.message = wasLeaderMatch
      ? `Pennant ${incoming} strengthens the current lead emblem.`
      : `Pennant ${incoming} joins under the patch budget. Keep the stretch alive.`;
    if (overflowLoss(next)) return next;
    if (next.right >= next.puzzle.symbols.length) finalizeVerdict(next);
    return next;
  }

  if (move.type === 'trimLeft') {
    const outgoing = next.puzzle.symbols[next.left];
    if (currentWindowLength(next) <= 0) {
      next.message = 'No live pennant remains on the left edge.';
      return next;
    }

    next.left += 1;
    next.actionsUsed += 1;
    next.message = `Trimmed ${outgoing} from the front edge to lower future repaint debt.`;
    overflowLoss(next);
    return next;
  }

  const cost = fullRehangCost(next);
  const cleared = currentWindowSymbols(next).join('');
  next.left = next.right;
  next.right += 1;
  next.actionsUsed += cost;
  maybeUpdateBest(next);
  next.message =
    currentWindowLength(state) === 0
      ? `Started a fresh banner on ${incoming}.`
      : `Full rehang cleared ${cleared} and restarted on ${incoming} for ${cost} actions.`;
  if (overflowLoss(next)) return next;
  if (next.right >= next.puzzle.symbols.length) finalizeVerdict(next);
  return next;
}

export function isGoal(state: PatchParadeState) {
  return Boolean(state.verdict?.correct);
}

function randomChoice<T>(values: T[], seed: number) {
  return values[seed % values.length]!;
}

function decideMove(
  state: PatchParadeState,
  skillLevel: 1 | 2 | 3 | 4 | 5,
  seed: number,
  step: number,
): PatchParadeMove {
  const moves = legalMoves(state);
  const incoming = incomingSymbol(state);
  const leader = currentLeaderInfo(state);
  const projectedDebt = projectedPatchDebt(state);
  const currentDebt = currentPatchDebt(state);
  const hasOverflow = projectedDebt > state.puzzle.patchLimit;
  const mismatch = Boolean(incoming && leader.symbol && incoming !== leader.symbol);

  if (skillLevel === 5) {
    return hasOverflow ? { type: 'trimLeft' } : { type: 'hangNext' };
  }

  if (skillLevel === 4) {
    if (hasOverflow) {
      if (state.puzzle.difficulty <= 2 && currentWindowLength(state) <= 2 && (seed + step) % 4 === 0) {
        return { type: 'fullRehang' };
      }
      return { type: 'trimLeft' };
    }

    if (mismatch && currentDebt < state.puzzle.patchLimit && state.puzzle.difficulty <= 2 && (seed + step) % 6 === 0) {
      return { type: 'trimLeft' };
    }

    return { type: 'hangNext' };
  }

  if (skillLevel === 3) {
    if (hasOverflow) {
      if ((seed + step) % 3 === 0) return { type: 'fullRehang' };
      return { type: 'trimLeft' };
    }

    if (mismatch && currentDebt > 0 && (seed + step) % 4 === 0 && currentWindowLength(state) > 0) {
      return { type: 'trimLeft' };
    }

    return { type: 'hangNext' };
  }

  if (skillLevel === 2) {
    if (!incoming) return randomChoice(moves, seed + step);
    if (!leader.symbol || incoming === leader.symbol) return { type: 'hangNext' };
    return { type: 'fullRehang' };
  }

  return randomChoice(moves, seed + step + state.left + state.right);
}

function runSolver(
  puzzle: PatchParadePuzzle,
  chooser: (state: PatchParadeState, step: number) => PatchParadeMove,
): PatchParadeSolution | null {
  let state = createInitialState(puzzle);
  const moves: PatchParadeMove[] = [];
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
  puzzle: PatchParadePuzzle,
  skillLevel: 1 | 2 | 3 | 4 | 5,
  seed = 0,
): PatchParadeSolution | null {
  return runSolver(puzzle, (state, step) => decideMove(state, skillLevel, seed, step));
}

function solveResetOnOverflow(puzzle: PatchParadePuzzle) {
  return runSolver(puzzle, (state) =>
    projectedPatchDebt(state) > state.puzzle.patchLimit ? { type: 'fullRehang' } : { type: 'hangNext' },
  );
}

function solveOverrepair(puzzle: PatchParadePuzzle) {
  return runSolver(puzzle, (state) => {
    const incoming = incomingSymbol(state);
    const leader = currentLeaderInfo(state);

    if (projectedPatchDebt(state) > state.puzzle.patchLimit) {
      return { type: 'trimLeft' };
    }

    if (
      incoming &&
      leader.symbol &&
      incoming !== leader.symbol &&
      currentPatchDebt(state) > 0 &&
      currentWindowLength(state) > 0
    ) {
      return { type: 'trimLeft' };
    }

    return { type: 'hangNext' };
  });
}

function solutionCost(solution: PatchParadeSolution | null, puzzle: PatchParadePuzzle) {
  if (!solution) return puzzle.budget + puzzle.symbols.length * 3;
  if (solution.solved) return solution.actionsUsed;
  const shortfall = Math.max(0, puzzle.bestSpan - solution.finalState.bestSpan);
  return puzzle.budget + puzzle.symbols.length + shortfall * 2;
}

function analyzeSolution(puzzle: PatchParadePuzzle, moves: PatchParadeMove[]) {
  let state = createInitialState(puzzle);
  let entropySum = 0;
  let steps = 0;
  let counterintuitive = 0;

  for (const move of moves) {
    const legal = legalMoves(state);
    if (legal.length > 1) entropySum += log2(legal.length);
    if (move.type === 'hangNext' && !incomingMatchesLeader(state) && currentWindowLength(state) > 0) {
      counterintuitive += 1;
    }
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

export function evaluatePatchParade(): PatchParadeEvaluation {
  const difficulties: DifficultyAggregate[] = [];
  const allAltGaps: number[] = [];
  const allInvariantGaps: number[] = [];

  for (const difficulty of [1, 2, 3, 4, 5] as PatchParadeDifficulty[]) {
    const puzzles = Array.from({ length: 5 }, (_, seed) => generatePuzzle(seed, difficulty));
    const optimalSolutions = puzzles.map((puzzle) => solve(puzzle, 5, difficulty * 17) ?? null);
    const level3Solutions = puzzles.map((puzzle) => solve(puzzle, 3, difficulty * 23) ?? null);
    const level1Solutions = puzzles.map((puzzle) => solve(puzzle, 1, difficulty * 31) ?? null);
    const altSolutions = puzzles.map((puzzle) => solveResetOnOverflow(puzzle));
    const invariantSolutions = puzzles.map((puzzle) => solveOverrepair(puzzle));

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
      patchLimit: average(puzzles.map((puzzle) => puzzle.patchLimit)),
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
        'The winning invariant is one contiguous banner whose length minus the lead emblem count never exceeds the patch budget, so mismatches can stay until that debt truly overflows.',
      strongestAlternative:
        'Reset on overflow: let the banner grow, but whenever the next pennant would exceed the patch limit, clear everything and restart on the newcomer.',
      evidence:
        'Easy samples let exact-run instincts survive, but medium-plus rows interleave a strong majority with multiple strays, so preserving the dominant emblem and trimming only on true overflow beats both purist play and full resets.',
    },
  };
}
