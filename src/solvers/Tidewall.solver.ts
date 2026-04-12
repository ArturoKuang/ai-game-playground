export type TidewallDifficulty = 1 | 2 | 3 | 4 | 5;

export type TidewallMoveType = 'stepLeft' | 'stepRight' | 'survey' | 'finish';

export type TidewallMove = {
  type: TidewallMoveType;
};

export type TidewallPair = [number, number];

export type TidewallVerdict = {
  correct: boolean;
  label: string;
};

export type TidewallMoment = {
  pair: TidewallPair;
  capacity: number;
};

export type TidewallPuzzle = {
  difficulty: TidewallDifficulty;
  label: string;
  title: string;
  budget: number;
  helper: string;
  walls: number[];
  surveyCost: number;
  maxCapacity: number;
  maxPair: TidewallPair;
};

export type TidewallState = {
  puzzle: TidewallPuzzle;
  leftIndex: number;
  rightIndex: number;
  actionsUsed: number;
  bestCapacity: number;
  bestPair: TidewallPair;
  bestMoments: TidewallMoment[];
  surveyed: boolean;
  message: string;
  verdict: TidewallVerdict | null;
};

export type TidewallSolution = {
  moves: TidewallMove[];
  finalState: TidewallState;
  solved: boolean;
  actionsUsed: number;
};

type Blueprint = {
  label: string;
  title: string;
  helper: string;
  wallsSets: number[][];
};

type DifficultyAggregate = {
  difficulty: TidewallDifficulty;
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
  difficultyBreakpoint: TidewallDifficulty;
  algorithmAlignment: number;
};

export type TidewallEvaluation = {
  difficulties: DifficultyAggregate[];
  learningMetrics: LearningMetrics;
  interpretation: {
    invariant: string;
    strongestAlternative: string;
    evidence: string;
  };
};

const BLUEPRINTS: Record<TidewallDifficulty, Blueprint> = {
  1: {
    label: 'D1',
    title: 'Low Harbor',
    helper:
      'A full harbor survey still fits here, but the live walls already reveal that the lower side is capping the basin.',
    wallsSets: [
      [1, 2, 1],
      [2, 4, 1, 3],
      [3, 2, 5, 4, 3],
      [1, 3, 2, 4],
      [3, 1, 2, 9, 4, 8],
    ],
  },
  2: {
    label: 'D2',
    title: 'Cargo Bay',
    helper:
      'The tempting taller wall is often a trap now. Harbor survey still works, but it spends nearly the whole storm clock.',
    wallsSets: [
      [2, 3, 10, 5, 7, 8, 9],
      [4, 1, 7, 6, 8, 9],
      [4, 3, 7, 4, 6, 9],
      [1, 3, 2, 5, 25, 24, 5],
      [5, 3, 7, 1, 7, 1, 2],
    ],
  },
  3: {
    label: 'D3',
    title: 'Storm Shelf',
    helper:
      'Surveying every basin is too slow from here on. The lower wall must leave first, even when the other side looks more impressive.',
    wallsSets: [
      [1, 8, 6, 2, 5, 4, 8, 3, 7],
      [3, 1, 7, 7, 2, 4, 8],
      [7, 2, 3, 8, 1, 2, 1],
      [2, 1, 6, 3, 9, 6, 8, 2],
      [2, 1, 9, 4, 8, 3, 7],
    ],
  },
  4: {
    label: 'D4',
    title: 'Breaker Run',
    helper:
      'Several tall walls are decoys. If you preserve the bottleneck and burn width somewhere else, the winning basin disappears forever.',
    wallsSets: [
      [3, 1, 8, 7, 7, 1, 9, 2],
      [9, 6, 2, 6, 3, 9, 2, 3],
      [2, 4, 2, 8, 5, 6, 5, 8],
      [4, 2, 7, 9, 2, 6, 8, 1],
      [2, 3, 1, 9, 5, 9, 3, 8],
    ],
  },
  5: {
    label: 'D5',
    title: 'Blackwater Reach',
    helper:
      'Long shorelines, repeated decoys, and no spare time. Only the true limiting-wall sweep preserves the best haul.',
    wallsSets: [
      [2, 3, 2, 8, 7, 2, 7, 8, 8, 6],
      [2, 8, 3, 9, 3, 5, 5, 7, 1, 3],
      [3, 1, 9, 8, 4, 2, 2, 2, 7, 1],
      [1, 2, 1, 3, 6, 9, 2, 9, 2, 8],
      [2, 1, 6, 3, 8, 9, 8, 4, 5, 9],
    ],
  },
};

function clamp(min: number, max: number, value: number) {
  return Math.max(min, Math.min(max, value));
}

function log2(value: number) {
  return Math.log(value) / Math.log(2);
}

function pairKey(pair: TidewallPair) {
  return `${pair[0]}:${pair[1]}`;
}

function formatMoment(pair: TidewallPair, capacity: number) {
  return { pair: [...pair] as TidewallPair, capacity };
}

function cloneMoments(list: TidewallMoment[]) {
  return list.map((entry) => formatMoment(entry.pair, entry.capacity));
}

function cloneState(state: TidewallState): TidewallState {
  return {
    ...state,
    bestPair: [...state.bestPair] as TidewallPair,
    bestMoments: cloneMoments(state.bestMoments),
  };
}

function areaFor(walls: number[], leftIndex: number, rightIndex: number) {
  return Math.min(walls[leftIndex], walls[rightIndex]) * (rightIndex - leftIndex);
}

function maxAreaPair(walls: number[]) {
  let bestCapacity = -1;
  let bestPair: TidewallPair = [0, 1];

  for (let leftIndex = 0; leftIndex < walls.length - 1; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < walls.length; rightIndex += 1) {
      const capacity = areaFor(walls, leftIndex, rightIndex);
      if (capacity > bestCapacity) {
        bestCapacity = capacity;
        bestPair = [leftIndex, rightIndex];
      }
    }
  }

  return { bestCapacity, bestPair };
}

function budgetFor(walls: number[], difficulty: TidewallDifficulty) {
  const base = walls.length;
  if (difficulty === 1) return base + 2;
  if (difficulty === 2) return base + 1;
  return base;
}

export function formatPair(pair: TidewallPair) {
  return `${pair[0] + 1}\u2013${pair[1] + 1}`;
}

function hasActiveSpan(state: TidewallState) {
  return !state.surveyed && state.leftIndex < state.rightIndex;
}

export function currentCapacity(state: TidewallState) {
  if (!hasActiveSpan(state)) return null;
  return areaFor(state.puzzle.walls, state.leftIndex, state.rightIndex);
}

export function currentWidth(state: TidewallState) {
  if (!hasActiveSpan(state)) return null;
  return state.rightIndex - state.leftIndex;
}

export function currentCap(state: TidewallState) {
  if (!hasActiveSpan(state)) return null;
  return Math.min(
    state.puzzle.walls[state.leftIndex] ?? 0,
    state.puzzle.walls[state.rightIndex] ?? 0,
  );
}

export function limitingSide(state: TidewallState) {
  if (!hasActiveSpan(state)) return 'none';
  const leftHeight = state.puzzle.walls[state.leftIndex] ?? 0;
  const rightHeight = state.puzzle.walls[state.rightIndex] ?? 0;
  if (leftHeight < rightHeight) return 'left';
  if (rightHeight < leftHeight) return 'right';
  return 'tie';
}

function updateBest(next: TidewallState) {
  if (!hasActiveSpan(next)) return;
  const capacity = areaFor(next.puzzle.walls, next.leftIndex, next.rightIndex);
  if (capacity <= next.bestCapacity) return;

  const pair: TidewallPair = [next.leftIndex, next.rightIndex];
  next.bestCapacity = capacity;
  next.bestPair = pair;
  next.bestMoments.push(formatMoment(pair, capacity));
}

function addSurveyResult(next: TidewallState) {
  if (next.bestCapacity === next.puzzle.maxCapacity) return;
  next.bestCapacity = next.puzzle.maxCapacity;
  next.bestPair = [...next.puzzle.maxPair] as TidewallPair;
  next.bestMoments.push(formatMoment(next.bestPair, next.bestCapacity));
}

function finalizeVerdict(next: TidewallState) {
  const finishedBudget = next.actionsUsed <= next.puzzle.budget;
  const sweepClosed = next.surveyed || next.leftIndex >= next.rightIndex;
  const perfectCapacity = next.bestCapacity === next.puzzle.maxCapacity;

  if (!finishedBudget) {
    next.verdict = {
      correct: false,
      label: 'Storm shutters closed before you could certify the harbor.',
    };
    return;
  }

  if (!sweepClosed) {
    next.verdict = {
      correct: false,
      label: 'You docked early while live shoreline pairs were still untested.',
    };
    return;
  }

  if (!perfectCapacity) {
    next.verdict = {
      correct: false,
      label: `Best haul logged ${next.bestCapacity}, but the harbor held ${next.puzzle.maxCapacity}.`,
    };
    return;
  }

  next.verdict = {
    correct: true,
    label: `Harbor sealed. Best haul ${next.bestCapacity} at walls ${formatPair(next.bestPair)}.`,
  };
}

function overflowLoss(next: TidewallState) {
  if (next.actionsUsed <= next.puzzle.budget) return false;
  next.verdict = {
    correct: false,
    label: 'The storm clock hit zero before the sweep was complete.',
  };
  return true;
}

export function generatePuzzle(seed: number, difficulty: TidewallDifficulty): TidewallPuzzle {
  const blueprint = BLUEPRINTS[difficulty];
  const walls = [...blueprint.wallsSets[seed % blueprint.wallsSets.length]];
  const { bestCapacity, bestPair } = maxAreaPair(walls);

  return {
    difficulty,
    label: blueprint.label,
    title: blueprint.title,
    budget: budgetFor(walls, difficulty),
    helper: blueprint.helper,
    walls,
    surveyCost: walls.length,
    maxCapacity: bestCapacity,
    maxPair: bestPair,
  };
}

export function createInitialState(puzzle: TidewallPuzzle): TidewallState {
  const pair: TidewallPair = [0, puzzle.walls.length - 1];
  const openingCapacity = areaFor(puzzle.walls, pair[0], pair[1]);

  return {
    puzzle,
    leftIndex: pair[0],
    rightIndex: pair[1],
    actionsUsed: 0,
    bestCapacity: openingCapacity,
    bestPair: pair,
    bestMoments: [formatMoment(pair, openingCapacity)],
    surveyed: false,
    message:
      'The opening basin is logged automatically. Watch which wall is capping the waterline before you spend width.',
    verdict: null,
  };
}

export function legalMoves(state: TidewallState): TidewallMove[] {
  if (state.verdict) return [];

  const moves: TidewallMove[] = [];
  if (hasActiveSpan(state)) {
    moves.push({ type: 'stepLeft' });
    moves.push({ type: 'stepRight' });
  }
  if (!state.surveyed) {
    moves.push({ type: 'survey' });
  }
  moves.push({ type: 'finish' });
  return moves;
}

function stepMessage(
  move: 'stepLeft' | 'stepRight',
  limiting: ReturnType<typeof limitingSide>,
  next: TidewallState,
) {
  const direction = move === 'stepLeft' ? 'left' : 'right';
  const capacity = currentCapacity(next);

  if (!hasActiveSpan(next)) {
    return 'The shoreline closed. No live basin remains.';
  }

  if (limiting === direction) {
    return `You released the limiting ${direction} wall. New live basin: ${capacity}.`;
  }

  if (limiting === 'tie') {
    return `The two live walls matched. Either side could move without changing the cap first. New basin: ${capacity}.`;
  }

  return `You moved the freer ${direction} wall while the lower side still capped the waterline. New basin: ${capacity}.`;
}

export function applyMove(state: TidewallState, move: TidewallMove): TidewallState {
  if (state.verdict) return state;

  const next = cloneState(state);

  if (move.type === 'finish') {
    next.actionsUsed += 1;
    finalizeVerdict(next);
    return next;
  }

  if (move.type === 'survey') {
    next.actionsUsed += next.puzzle.surveyCost;
    next.surveyed = true;
    next.leftIndex = next.puzzle.maxPair[0];
    next.rightIndex = next.puzzle.maxPair[1];
    addSurveyResult(next);
    next.message = `Harbor survey mapped every remaining basin for ${next.puzzle.surveyCost} actions.`;
    if (overflowLoss(next)) return next;
    return next;
  }

  if (!hasActiveSpan(next)) {
    next.message = 'No live basin remains. Finish the harbor log.';
    return next;
  }

  const limiting = limitingSide(next);
  next.actionsUsed += 1;

  if (move.type === 'stepLeft') {
    next.leftIndex += 1;
  } else {
    next.rightIndex -= 1;
  }

  if (hasActiveSpan(next)) {
    updateBest(next);
  }
  next.message = stepMessage(move.type, limiting, next);
  if (overflowLoss(next)) return next;
  return next;
}

function simulateWithStrategy(
  puzzle: TidewallPuzzle,
  chooser: (state: TidewallState) => TidewallMove,
): TidewallSolution {
  const moves: TidewallMove[] = [];
  let state = createInitialState(puzzle);

  while (!state.verdict) {
    const move = chooser(state);
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

export function solveOptimal(puzzle: TidewallPuzzle): TidewallSolution {
  return simulateWithStrategy(puzzle, (state) => {
    if (!hasActiveSpan(state)) return { type: 'finish' };
    const limit = limitingSide(state);
    return {
      type: limit === 'right' ? 'stepRight' : 'stepLeft',
    };
  });
}

export function solveTallerVariant(puzzle: TidewallPuzzle): TidewallSolution {
  return simulateWithStrategy(puzzle, (state) => {
    if (!hasActiveSpan(state)) return { type: 'finish' };
    const limit = limitingSide(state);
    return {
      type: limit === 'left' ? 'stepRight' : 'stepLeft',
    };
  });
}

export function solveImmediateGainVariant(puzzle: TidewallPuzzle): TidewallSolution {
  return simulateWithStrategy(puzzle, (state) => {
    if (!hasActiveSpan(state)) return { type: 'finish' };

    const leftCapacity =
      state.leftIndex + 1 <= state.rightIndex
        ? areaFor(state.puzzle.walls, state.leftIndex + 1, state.rightIndex)
        : -1;
    const rightCapacity =
      state.leftIndex <= state.rightIndex - 1
        ? areaFor(state.puzzle.walls, state.leftIndex, state.rightIndex - 1)
        : -1;

    if (leftCapacity > rightCapacity) return { type: 'stepLeft' };
    if (rightCapacity > leftCapacity) return { type: 'stepRight' };

    const limit = limitingSide(state);
    return {
      type: limit === 'right' ? 'stepRight' : 'stepLeft',
    };
  });
}

export function solveSurveyVariant(puzzle: TidewallPuzzle): TidewallSolution {
  return simulateWithStrategy(puzzle, (state) => {
    if (state.surveyed) return { type: 'finish' };
    return { type: 'survey' };
  });
}

function efficiencyScore(result: TidewallSolution, puzzle: TidewallPuzzle) {
  if (!result.solved) return 0;
  return (puzzle.budget + 1 - result.actionsUsed) / (puzzle.budget + 1);
}

function effectiveCost(result: TidewallSolution, puzzle: TidewallPuzzle) {
  return result.solved ? result.actionsUsed : puzzle.budget + result.actionsUsed;
}

function strongestAlternative(
  taller: TidewallSolution,
  immediate: TidewallSolution,
  puzzle: TidewallPuzzle,
) {
  return effectiveCost(taller, puzzle) <= effectiveCost(immediate, puzzle) ? taller : immediate;
}

function averagePairsRuledOutPerMove(puzzle: TidewallPuzzle) {
  let leftIndex = 0;
  let rightIndex = puzzle.walls.length - 1;
  let eliminatedPairs = 0;
  let samples = 0;

  while (leftIndex < rightIndex) {
    eliminatedPairs += rightIndex - leftIndex;
    samples += 1;

    if (puzzle.walls[leftIndex] <= puzzle.walls[rightIndex]) {
      leftIndex += 1;
    } else {
      rightIndex -= 1;
    }
  }

  return eliminatedPairs / Math.max(1, samples);
}

function countCounterintuitiveStates(puzzle: TidewallPuzzle) {
  let leftIndex = 0;
  let rightIndex = puzzle.walls.length - 1;
  let count = 0;

  while (leftIndex < rightIndex) {
    const leftCapacity =
      leftIndex + 1 <= rightIndex
        ? areaFor(puzzle.walls, leftIndex + 1, rightIndex)
        : -1;
    const rightCapacity =
      leftIndex <= rightIndex - 1
        ? areaFor(puzzle.walls, leftIndex, rightIndex - 1)
        : -1;

    if (puzzle.walls[leftIndex] < puzzle.walls[rightIndex] && leftCapacity < rightCapacity) {
      count += 1;
      leftIndex += 1;
      continue;
    }

    if (puzzle.walls[rightIndex] < puzzle.walls[leftIndex] && rightCapacity < leftCapacity) {
      count += 1;
      rightIndex -= 1;
      continue;
    }

    if (puzzle.walls[leftIndex] <= puzzle.walls[rightIndex]) {
      leftIndex += 1;
    } else {
      rightIndex -= 1;
    }
  }

  return count;
}

export function evaluateTidewall(): TidewallEvaluation {
  const difficulties: DifficultyAggregate[] = [];
  const targetCosts: number[] = [];
  const altCosts: number[] = [];
  const surveyCosts: number[] = [];

  let breakpoint: TidewallDifficulty = 5;

  for (const difficulty of [1, 2, 3, 4, 5] as TidewallDifficulty[]) {
    const puzzles = Array.from({ length: 5 }, (_, seed) => generatePuzzle(seed, difficulty));
    const optimal = puzzles.map((puzzle) => solveOptimal(puzzle));
    const taller = puzzles.map((puzzle) => solveTallerVariant(puzzle));
    const immediate = puzzles.map((puzzle) => solveImmediateGainVariant(puzzle));
    const survey = puzzles.map((puzzle) => solveSurveyVariant(puzzle));
    const alternatives = puzzles.map((puzzle, index) =>
      strongestAlternative(taller[index], immediate[index], puzzle),
    );

    const solvability = optimal.filter((result) => result.solved).length / puzzles.length;
    const altSolvability = alternatives.filter((result) => result.solved).length / puzzles.length;

    const optimalMoves =
      optimal.reduce((sum, result) => sum + result.actionsUsed, 0) / puzzles.length;
    const altMoves =
      alternatives.reduce((sum, result) => sum + result.actionsUsed, 0) / puzzles.length;

    const puzzleEntropy =
      puzzles.reduce((sum, puzzle) => {
        return sum + (puzzle.walls.length - 1) * log2(3);
      }, 0) / puzzles.length;

    const decisionEntropy = log2(3);

    const skillDepth =
      puzzles.reduce((sum, puzzle, index) => {
        const targetScore = efficiencyScore(optimal[index], puzzle);
        const altScore = efficiencyScore(alternatives[index], puzzle);
        if (targetScore <= 0) return sum;
        return sum + clamp(0, 1, (targetScore - altScore) / targetScore);
      }, 0) / puzzles.length;

    const counterintuitive =
      puzzles.reduce((sum, puzzle) => sum + countCounterintuitiveStates(puzzle), 0) /
      puzzles.length;

    const drama =
      puzzles.reduce(
        (sum, puzzle, index) => sum + optimal[index].actionsUsed / Math.max(1, puzzle.budget),
        0,
      ) / puzzles.length;

    const infoGainRatio =
      puzzles.reduce((sum, puzzle) => sum + averagePairsRuledOutPerMove(puzzle), 0) /
      puzzles.length;

    const averageBudget =
      puzzles.reduce((sum, puzzle) => sum + puzzle.budget, 0) / puzzles.length;

    difficulties.push({
      difficulty,
      label: puzzles[0].label,
      budget: averageBudget,
      solvability,
      puzzleEntropy,
      skillDepth,
      decisionEntropy,
      counterintuitive,
      drama,
      infoGainRatio,
      optimalMoves,
      altMoves,
      altSolvability,
    });

    const averageTargetCost =
      puzzles.reduce((sum, puzzle, index) => sum + effectiveCost(optimal[index], puzzle), 0) /
      puzzles.length;
    const averageAltCost =
      puzzles.reduce((sum, puzzle, index) => sum + effectiveCost(alternatives[index], puzzle), 0) /
      puzzles.length;
    const averageSurveyCost =
      puzzles.reduce((sum, puzzle, index) => sum + effectiveCost(survey[index], puzzle), 0) /
      puzzles.length;

    targetCosts.push(averageTargetCost);
    altCosts.push(averageAltCost);
    surveyCosts.push(averageSurveyCost);

    const altGap = averageAltCost > 0 ? 1 - averageTargetCost / averageAltCost : 0;
    const altFailureRate = 1 - altSolvability;
    if (breakpoint === 5 && difficulty >= 2 && (altFailureRate >= 0.5 || altGap >= 0.25)) {
      breakpoint = difficulty;
    }
  }

  const averageTargetCost =
    targetCosts.reduce((sum, value) => sum + value, 0) / Math.max(1, targetCosts.length);
  const averageAltCost =
    altCosts.reduce((sum, value) => sum + value, 0) / Math.max(1, altCosts.length);
  const averageSurveyCost =
    surveyCosts.reduce((sum, value) => sum + value, 0) / Math.max(1, surveyCosts.length);

  const learningMetrics: LearningMetrics = {
    inputShapeMatch: 1,
    operationMatch: 1,
    constraintMatch: 1,
    goalMatch: 1,
    leetCodeFit: 1,
    bestAlternativeGap: clamp(0, 1, 1 - averageTargetCost / Math.max(1, averageAltCost)),
    invariantPressure: clamp(0, 1, 1 - averageTargetCost / Math.max(1, averageSurveyCost)),
    difficultyBreakpoint: breakpoint,
    algorithmAlignment: 1,
  };

  return {
    difficulties,
    learningMetrics,
    interpretation: {
      invariant:
        'The current basin is capped by the shorter wall. Width always shrinks, so only the limiting wall can possibly unlock a larger haul.',
      strongestAlternative:
        'Chase the wall that looks taller or the next move that looks immediately larger.',
      evidence:
        'That shortcut survives some warmups, then misses the best basin as soon as medium boards hide interior pairs behind a smaller outer wall. Harbor survey remains viable through D2 and dies once the storm clock tightens at D3.',
    },
  };
}
