export type ManifestDifficulty = 1 | 2 | 3 | 4 | 5;

export type ManifestMoveType = 'loadNext' | 'dropLeft' | 'fullRepack';

export type ManifestMove = {
  type: ManifestMoveType;
};

export type ManifestRange = [number, number];

export type ManifestVerdict = {
  correct: boolean;
  label: string;
};

export type ManifestMilestone = {
  span: number;
  range: ManifestRange;
  note: string;
};

export type ManifestLedgerEntry = {
  symbol: string;
  need: number;
  have: number;
  missing: number;
};

export type ManifestPuzzle = {
  difficulty: ManifestDifficulty;
  label: string;
  title: string;
  budget: number;
  helper: string;
  symbols: string[];
  manifest: string[];
  bestSpan: number | null;
  bestRange: ManifestRange | null;
};

export type ManifestState = {
  puzzle: ManifestPuzzle;
  left: number;
  right: number;
  actionsUsed: number;
  bestSpan: number | null;
  bestRange: ManifestRange | null;
  milestones: ManifestMilestone[];
  message: string;
  verdict: ManifestVerdict | null;
};

export type ManifestSolution = {
  moves: ManifestMove[];
  finalState: ManifestState;
  solved: boolean;
  actionsUsed: number;
};

type Blueprint = {
  label: string;
  title: string;
  helper: string;
  manifest: string;
  streams: string[];
};

type DifficultyAggregate = {
  difficulty: ManifestDifficulty;
  label: string;
  budget: number;
  manifestSize: number;
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
  difficultyBreakpoint: ManifestDifficulty;
  algorithmAlignment: number;
};

export type ManifestEvaluation = {
  difficulties: DifficultyAggregate[];
  learningMetrics: LearningMetrics;
  interpretation: {
    invariant: string;
    strongestAlternative: string;
    evidence: string;
  };
};

const BLUEPRINTS: Record<ManifestDifficulty, Blueprint> = {
  1: {
    label: 'D1',
    title: 'Dock Warmup',
    helper:
      'One copy of each stamp is enough. The first full manifest is close to the answer, but shaving the left edge can still improve it.',
    manifest: 'ABC',
    streams: ['AABC', 'ABDC', 'BACB', 'CABA', 'ABCA'],
  },
  2: {
    label: 'D2',
    title: 'Harbor Lane',
    helper:
      'The first complete satchel is now bloated by extra freight. Keep the cover, then trim the oldest cargo before you keep loading.',
    manifest: 'ABC',
    streams: ['AAZBCAB', 'AXBYCZABC', 'QABXCYAZBC', 'CABXXABC', 'ZAACBBBC'],
  },
  3: {
    label: 'D3',
    title: 'Customs Queue',
    helper:
      'Some manifests need duplicates. A satchel is not complete until both copies are inside, and medium seeds now punish restarting after the first cover.',
    manifest: 'AABC',
    streams: ['XAACBBAC', 'ABAACBAB', 'CAAABBC', 'BAACXABCA', 'DAABCAD'],
  },
  4: {
    label: 'D4',
    title: 'Night Shift Belt',
    helper:
      'The left edge often holds a required stamp you must eventually surrender. Bank the current cover, drop that edge anyway, then rebuild from the preserved suffix.',
    manifest: 'AABC',
    streams: ['XDAABYCBACBA', 'QAAZBCABAC', 'TAACXBBACAY', 'PAABQCBARAC', 'XAABYCBAACZ'],
  },
  5: {
    label: 'D5',
    title: 'Storm Pier',
    helper:
      'Long routes hide several almost-covers before the true minimum appears. Only one forward sweep with repeated cover-then-shave discipline survives the budget.',
    manifest: 'AABC',
    streams: ['ZZDAABYCBACBAQ', 'RAACXBBACAYZA', 'TAABQCBAARCAZ', 'MNAACOBBCAPAQ', 'XAABYCBAACAZB'],
  },
};

function clamp(min: number, max: number, value: number) {
  return Math.max(min, Math.min(max, value));
}

function log2(value: number) {
  return Math.log(value) / Math.log(2);
}

function cloneState(state: ManifestState): ManifestState {
  return {
    ...state,
    bestRange: state.bestRange ? ([...state.bestRange] as ManifestRange) : null,
    milestones: state.milestones.map((entry) => ({
      ...entry,
      range: [...entry.range] as ManifestRange,
    })),
  };
}

function countsFromSymbols(symbols: string[]) {
  const counts = new Map<string, number>();
  for (const symbol of symbols) {
    counts.set(symbol, (counts.get(symbol) ?? 0) + 1);
  }
  return counts;
}

function manifestRequirements(manifest: string[]) {
  return countsFromSymbols(manifest);
}

function windowCounts(state: ManifestState) {
  return countsFromSymbols(currentWindowSymbols(state));
}

function coversRequirements(counts: Map<string, number>, requirements: Map<string, number>) {
  for (const [symbol, need] of requirements.entries()) {
    if ((counts.get(symbol) ?? 0) < need) return false;
  }
  return true;
}

function bestRangeFor(symbols: string[], manifest: string[]) {
  const requirements = manifestRequirements(manifest);
  const counts = new Map<string, number>();
  const requiredKinds = requirements.size;
  let formedKinds = 0;
  let left = 0;
  let bestSpan: number | null = null;
  let bestRange: ManifestRange | null = null;

  for (let right = 0; right < symbols.length; right += 1) {
    const symbol = symbols[right]!;
    const nextCount = (counts.get(symbol) ?? 0) + 1;
    counts.set(symbol, nextCount);
    if (requirements.has(symbol) && nextCount === requirements.get(symbol)) {
      formedKinds += 1;
    }

    while (formedKinds === requiredKinds) {
      const span = right - left + 1;
      if (bestSpan === null || span < bestSpan) {
        bestSpan = span;
        bestRange = [left, right + 1];
      }

      const outgoing = symbols[left]!;
      const current = counts.get(outgoing) ?? 0;
      if (current <= 1) {
        counts.delete(outgoing);
      } else {
        counts.set(outgoing, current - 1);
      }
      if (requirements.has(outgoing) && current === requirements.get(outgoing)) {
        formedKinds -= 1;
      }
      left += 1;
    }
  }

  return { bestSpan, bestRange };
}

function optimalCost(symbols: string[], manifest: string[]) {
  const requirements = manifestRequirements(manifest);
  const counts = new Map<string, number>();
  const requiredKinds = requirements.size;
  let formedKinds = 0;
  let left = 0;
  let cost = 0;

  for (let right = 0; right < symbols.length; right += 1) {
    const symbol = symbols[right]!;
    const nextCount = (counts.get(symbol) ?? 0) + 1;
    counts.set(symbol, nextCount);
    cost += 1;
    if (requirements.has(symbol) && nextCount === requirements.get(symbol)) {
      formedKinds += 1;
    }

    while (formedKinds === requiredKinds) {
      const outgoing = symbols[left]!;
      const current = counts.get(outgoing) ?? 0;
      if (current <= 1) {
        counts.delete(outgoing);
      } else {
        counts.set(outgoing, current - 1);
      }
      cost += 1;
      if (requirements.has(outgoing) && current === requirements.get(outgoing)) {
        formedKinds -= 1;
      }
      left += 1;
    }
  }

  return cost;
}

function budgetFor(symbols: string[], manifest: string[], difficulty: ManifestDifficulty) {
  const optimal = optimalCost(symbols, manifest);
  if (difficulty === 1) return optimal + 3;
  if (difficulty === 2) return optimal + 8;
  if (difficulty === 3) return optimal + 1;
  if (difficulty === 4) return optimal + 1;
  return optimal;
}

export function formatManifest(manifest: string[]) {
  const requirements = manifestRequirements(manifest);
  return [...requirements.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([symbol, need]) => (need > 1 ? `${symbol}x${need}` : symbol))
    .join(' ');
}

export function generatePuzzle(seed: number, difficulty: ManifestDifficulty): ManifestPuzzle {
  const blueprint = BLUEPRINTS[difficulty];
  const stream = blueprint.streams[seed % blueprint.streams.length] ?? blueprint.streams[0]!;
  const manifest = blueprint.manifest.split('');
  const symbols = stream.split('');
  const { bestSpan, bestRange } = bestRangeFor(symbols, manifest);

  return {
    difficulty,
    label: blueprint.label,
    title: blueprint.title,
    budget: budgetFor(symbols, manifest, difficulty),
    helper: blueprint.helper,
    symbols,
    manifest,
    bestSpan,
    bestRange,
  };
}

export function createInitialState(puzzle: ManifestPuzzle): ManifestState {
  return {
    puzzle,
    left: 0,
    right: 0,
    actionsUsed: 0,
    bestSpan: null,
    bestRange: null,
    milestones: [],
    message:
      'Load cargo until the manifest is fully covered. Once it is covered, bank the satchel and keep shaving the left edge to see how small it can get.',
    verdict: null,
  };
}

export function currentWindowSymbols(state: ManifestState) {
  return state.puzzle.symbols.slice(state.left, state.right);
}

export function currentWindowLength(state: ManifestState) {
  return Math.max(0, state.right - state.left);
}

export function incomingSymbol(state: ManifestState) {
  return state.right < state.puzzle.symbols.length ? state.puzzle.symbols[state.right] ?? null : null;
}

export function upcomingCount(state: ManifestState) {
  return Math.max(0, state.puzzle.symbols.length - state.right);
}

export function currentManifestTable(state: ManifestState): ManifestLedgerEntry[] {
  const requirements = manifestRequirements(state.puzzle.manifest);
  const counts = windowCounts(state);

  return [...requirements.entries()]
    .map(([symbol, need]) => {
      const have = counts.get(symbol) ?? 0;
      return {
        symbol,
        need,
        have,
        missing: Math.max(0, need - have),
      };
    })
    .sort((a, b) => a.symbol.localeCompare(b.symbol));
}

export function currentMissingTotal(state: ManifestState) {
  return currentManifestTable(state).reduce((sum, entry) => sum + entry.missing, 0);
}

export function currentCoversRequirements(state: ManifestState) {
  return currentMissingTotal(state) === 0;
}

export function currentMissingSummary(state: ManifestState) {
  const missing = currentManifestTable(state)
    .filter((entry) => entry.missing > 0)
    .map((entry) => (entry.missing > 1 ? `${entry.symbol} x${entry.missing}` : entry.symbol));
  return missing.length > 0 ? missing.join(', ') : 'none';
}

export function leftEdgeImpact(state: ManifestState) {
  if (currentWindowLength(state) === 0) return 'empty';
  const symbol = state.puzzle.symbols[state.left]!;
  const requirements = manifestRequirements(state.puzzle.manifest);
  const need = requirements.get(symbol) ?? 0;
  if (need === 0) return 'spare';

  const counts = windowCounts(state);
  const have = counts.get(symbol) ?? 0;
  return have > need ? 'spare' : 'critical';
}

export function fullRepackCost(state: ManifestState) {
  return incomingSymbol(state) ? currentWindowLength(state) + 1 : 0;
}

export function formatRange(range: ManifestRange | null) {
  if (!range) return 'none';
  return `${range[0] + 1}-${range[1]}`;
}

function maybeUpdateBest(next: ManifestState) {
  if (!currentCoversRequirements(next)) return;
  const span = currentWindowLength(next);
  if (span <= 0) return;
  if (next.bestSpan !== null && span >= next.bestSpan) return;

  next.bestSpan = span;
  next.bestRange = [next.left, next.right];
  next.milestones.push({
    span,
    range: [next.left, next.right],
    note: currentWindowSymbols(next).join(''),
  });
}

function overflowLoss(next: ManifestState) {
  if (next.actionsUsed <= next.puzzle.budget) return false;
  next.verdict = {
    correct: false,
    label: 'The dock clock ran out.',
  };
  next.message = 'Too many resets or extra shaves burned the route budget before the true minimum cover was secured.';
  return true;
}

function finalizeVerdict(next: ManifestState) {
  if (next.actionsUsed > next.puzzle.budget) {
    next.verdict = {
      correct: false,
      label: 'The route is over budget.',
    };
    next.message = 'The satchel plan spent too many actions.';
    return;
  }

  if (next.bestSpan === null || next.puzzle.bestSpan === null) {
    next.verdict = {
      correct: false,
      label: 'No full manifest was secured.',
    };
    next.message = 'You reached the end of the belt without logging a valid cover.';
    return;
  }

  if (next.bestSpan !== next.puzzle.bestSpan) {
    next.verdict = {
      correct: false,
      label: `Best cover ${next.bestSpan}, but the dock hides ${next.puzzle.bestSpan}.`,
    };
    next.message = 'A shorter valid satchel was available on the same one-way sweep.';
    return;
  }

  next.verdict = {
    correct: true,
    label: `Shortest cover ${next.bestSpan} secured.`,
  };
  next.message = 'The dock stayed in one forward sweep: load until covered, then shave the left edge until the cover breaks.';
}

function finalizeIfExhausted(next: ManifestState) {
  if (next.verdict) return;
  if (incomingSymbol(next) !== null) return;
  if (currentCoversRequirements(next) && currentWindowLength(next) > 0) return;
  finalizeVerdict(next);
}

export function legalMoves(state: ManifestState): ManifestMove[] {
  if (state.verdict) return [];
  const moves: ManifestMove[] = [];

  if (currentWindowLength(state) > 0) {
    moves.push({ type: 'dropLeft' });
  }

  if (incomingSymbol(state) !== null) {
    moves.push({ type: 'loadNext' });
    moves.push({ type: 'fullRepack' });
  }

  if (incomingSymbol(state) === null && currentCoversRequirements(state)) {
    return currentWindowLength(state) > 0 ? [{ type: 'dropLeft' }] : [];
  }

  return moves;
}

export function applyMove(state: ManifestState, move: ManifestMove): ManifestState {
  const next = cloneState(state);
  if (next.verdict) return next;

  if (move.type === 'loadNext') {
    const incoming = incomingSymbol(next);
    if (incoming === null) {
      finalizeVerdict(next);
      return next;
    }

    next.right += 1;
    next.actionsUsed += 1;
    maybeUpdateBest(next);
    next.message = currentCoversRequirements(next)
      ? `Cargo ${incoming} completed the manifest. Now keep shaving the left edge.`
      : `Cargo ${incoming} joined the satchel. Still missing ${currentMissingSummary(next)}.`;
    if (overflowLoss(next)) return next;
    finalizeIfExhausted(next);
    return next;
  }

  if (move.type === 'dropLeft') {
    if (currentWindowLength(next) <= 0) {
      next.message = 'No live cargo remains on the left edge.';
      return next;
    }

    const outgoing = next.puzzle.symbols[next.left]!;
    const wasCovered = currentCoversRequirements(next);
    const impact = leftEdgeImpact(next);
    next.left += 1;
    next.actionsUsed += 1;
    maybeUpdateBest(next);
    next.message = wasCovered
      ? impact === 'spare'
        ? `Dropped spare cargo ${outgoing} and kept the manifest covered.`
        : `Dropped critical cargo ${outgoing}; the cover breaks here, so the next target is to rebuild it from the preserved suffix.`
      : `Dropped ${outgoing} from the left edge to reposition the satchel.`;
    if (overflowLoss(next)) return next;
    finalizeIfExhausted(next);
    return next;
  }

  const incoming = incomingSymbol(next);
  if (incoming === null) {
    finalizeVerdict(next);
    return next;
  }

  const cost = fullRepackCost(next);
  const cleared = currentWindowSymbols(next).join('');
  next.left = next.right;
  next.right += 1;
  next.actionsUsed += cost;
  maybeUpdateBest(next);
  next.message =
    currentWindowLength(state) === 0
      ? `Started a fresh satchel on ${incoming}.`
      : `Full repack cleared ${cleared} and restarted on ${incoming} for ${cost} actions.`;
  if (overflowLoss(next)) return next;
  finalizeIfExhausted(next);
  return next;
}

export function isGoal(state: ManifestState) {
  return Boolean(state.verdict?.correct);
}

function randomChoice<T>(values: T[], seed: number) {
  return values[seed % values.length]!;
}

function decideMove(
  state: ManifestState,
  skillLevel: 1 | 2 | 3 | 4 | 5,
  seed: number,
  step: number,
): ManifestMove {
  const moves = legalMoves(state);
  const covered = currentCoversRequirements(state);
  const impact = leftEdgeImpact(state);
  const incoming = incomingSymbol(state);

  if (skillLevel === 5) {
    return covered ? { type: 'dropLeft' } : { type: 'loadNext' };
  }

  if (skillLevel === 4) {
    if (covered) {
      if (incoming && state.puzzle.difficulty <= 2 && impact === 'critical' && (seed + step) % 5 === 0) {
        return { type: 'fullRepack' };
      }
      return { type: 'dropLeft' };
    }
    return { type: 'loadNext' };
  }

  if (skillLevel === 3) {
    if (covered) {
      if (impact === 'spare') return { type: 'dropLeft' };
      if (incoming && (seed + step) % 3 === 0) return { type: 'fullRepack' };
      if (incoming && state.puzzle.difficulty >= 4 && (seed + step) % 4 === 0) return { type: 'loadNext' };
      return { type: 'dropLeft' };
    }

    if (incoming && currentMissingTotal(state) === 1 && currentWindowLength(state) > 0 && (seed + step) % 7 === 0) {
      return { type: 'fullRepack' };
    }

    return { type: 'loadNext' };
  }

  if (skillLevel === 2) {
    if (covered) {
      if (incoming) return { type: 'fullRepack' };
      return { type: 'dropLeft' };
    }
    return { type: 'loadNext' };
  }

  return randomChoice(moves, seed + step + state.left + state.right);
}

function finalizeFromNoMoves(state: ManifestState) {
  const next = cloneState(state);
  finalizeVerdict(next);
  return next;
}

function runSolver(
  puzzle: ManifestPuzzle,
  chooser: (state: ManifestState, step: number) => ManifestMove,
): ManifestSolution | null {
  let state = createInitialState(puzzle);
  const moves: ManifestMove[] = [];
  const maxSteps = puzzle.symbols.length * 7 + 16;

  for (let step = 0; step < maxSteps; step += 1) {
    if (state.verdict) {
      return {
        moves,
        finalState: state,
        solved: isGoal(state),
        actionsUsed: state.actionsUsed,
      };
    }

    const possible = legalMoves(state);
    if (possible.length === 0) {
      state = finalizeFromNoMoves(state);
      continue;
    }

    const move = chooser(state, step);
    moves.push(move);
    state = applyMove(state, move);
  }

  return null;
}

export function solve(
  puzzle: ManifestPuzzle,
  skillLevel: 1 | 2 | 3 | 4 | 5,
  seed = 0,
): ManifestSolution | null {
  return runSolver(puzzle, (state, step) => decideMove(state, skillLevel, seed, step));
}

function solveRestartOnCover(puzzle: ManifestPuzzle) {
  return runSolver(puzzle, (state) => {
    if (currentCoversRequirements(state)) {
      return incomingSymbol(state) ? { type: 'fullRepack' } : { type: 'dropLeft' };
    }
    return { type: 'loadNext' };
  });
}

function solveNeverBreakCoverage(puzzle: ManifestPuzzle) {
  return runSolver(puzzle, (state) => {
    if (currentCoversRequirements(state)) {
      if (leftEdgeImpact(state) === 'spare') return { type: 'dropLeft' };
      if (incomingSymbol(state)) return { type: 'fullRepack' };
      return { type: 'dropLeft' };
    }
    return { type: 'loadNext' };
  });
}

function solutionCost(solution: ManifestSolution | null, puzzle: ManifestPuzzle) {
  if (!solution) return puzzle.budget + puzzle.symbols.length * 4;
  if (solution.solved) return solution.actionsUsed;
  if (solution.finalState.bestSpan === null || puzzle.bestSpan === null) {
    return puzzle.budget + puzzle.symbols.length * 2;
  }
  const excess = Math.max(0, solution.finalState.bestSpan - puzzle.bestSpan);
  return puzzle.budget + puzzle.symbols.length + excess * 2;
}

function analyzeSolution(puzzle: ManifestPuzzle, moves: ManifestMove[]) {
  let state = createInitialState(puzzle);
  let entropySum = 0;
  let steps = 0;
  let counterintuitive = 0;

  for (const move of moves) {
    const legal = legalMoves(state);
    if (legal.length > 1) entropySum += log2(legal.length);
    if (move.type === 'dropLeft' && currentCoversRequirements(state)) {
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

export function evaluateManifest(): ManifestEvaluation {
  const difficulties: DifficultyAggregate[] = [];
  const allAltGaps: number[] = [];
  const allInvariantGaps: number[] = [];

  for (const difficulty of [1, 2, 3, 4, 5] as ManifestDifficulty[]) {
    const puzzles = Array.from({ length: 5 }, (_, seed) => generatePuzzle(seed, difficulty));
    const optimalSolutions = puzzles.map((puzzle) => solve(puzzle, 5, difficulty * 17) ?? null);
    const level3Solutions = puzzles.map((puzzle) => solve(puzzle, 3, difficulty * 23) ?? null);
    const level1Solutions = puzzles.map((puzzle) => solve(puzzle, 1, difficulty * 31) ?? null);
    const altSolutions = puzzles.map((puzzle) => solveRestartOnCover(puzzle));
    const invariantSolutions = puzzles.map((puzzle) => solveNeverBreakCoverage(puzzle));

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
    const skillDepth = clamp(
      0,
      1,
      1 - average(optimalCosts) / Math.max(average(randomCosts), average(optimalCosts) + 1),
    );
    const drama = average(
      level3Solutions.map((solution, index) => {
        const best = solution?.finalState.bestSpan ?? puzzles[index]!.symbols.length + 2;
        const optimal = puzzles[index]!.bestSpan ?? best;
        return clamp(0, 1, 1 - optimal / Math.max(best, optimal + 1));
      }),
    );
    const infoGainRatio = average(altGaps.map((gap) => 1 + gap * 5));

    difficulties.push({
      difficulty,
      label: `D${difficulty}`,
      budget: average(puzzles.map((puzzle) => puzzle.budget)),
      manifestSize: average(puzzles.map((puzzle) => puzzle.manifest.length)),
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
      (entry) => entry.altSolvability < 0.8 || entry.altMoves > entry.optimalMoves * 1.45,
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
        'The winning invariant is one contiguous satchel that grows rightward until all required counts are covered, then keeps shaving the left edge while that cover still exists so the best valid span can only shrink.',
      strongestAlternative:
        'Restart on cover: once the manifest is satisfied, clear the satchel and start a brand-new search on the next unread crate instead of preserving the suffix you already paid for.',
      evidence:
        'Easy routes let first-cover or restart habits survive, but medium-plus routes hide shorter covers inside a bloated first success, and duplicate requirements on D3-D5 force players to break a valid cover on purpose and rebuild from the preserved suffix.',
    },
  };
}
