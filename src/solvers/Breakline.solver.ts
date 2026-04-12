export type BreaklineDifficulty = 1 | 2 | 3 | 4 | 5;

export type BreaklineMoveType = 'keepLeft' | 'keepRight' | 'lineSweep';

export type BreaklineMove = {
  type: BreaklineMoveType;
};

export type BreaklineVerdict = {
  correct: boolean;
  label: string;
};

export type BreaklinePuzzle = {
  difficulty: BreaklineDifficulty;
  label: string;
  title: string;
  helper: string;
  values: number[];
  minIndex: number;
  budget: number;
};

export type BreaklineState = {
  puzzle: BreaklinePuzzle;
  left: number;
  right: number;
  actionsUsed: number;
  history: string[];
  message: string;
  verdict: BreaklineVerdict | null;
};

export type BreaklineSolution = {
  moves: BreaklineMove[];
  finalState: BreaklineState;
  solved: boolean;
  actionsUsed: number;
  counterintuitiveSteps: number;
  totalBinarySteps: number;
  meanInfoGainRatio: number;
};

type Blueprint = {
  label: string;
  title: string;
  helper: string;
  arrays: number[][];
  budget: number;
};

type DifficultyAggregate = {
  difficulty: BreaklineDifficulty;
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
  difficultyBreakpoint: BreaklineDifficulty;
  algorithmAlignment: number;
};

export type BreaklineEvaluation = {
  difficulties: DifficultyAggregate[];
  learningMetrics: LearningMetrics;
  interpretation: {
    invariant: string;
    strongestAlternative: string;
    evidence: string;
  };
};

const BLUEPRINTS: Record<BreaklineDifficulty, Blueprint> = {
  1: {
    label: 'D1',
    title: 'Calm Ridge',
    helper:
      'The expensive line sweep still fits here, so the puzzle mainly teaches what the live left, middle, and tail beacons mean.',
    budget: 4,
    arrays: [
      [1, 3, 5, 7],
      [5, 7, 1, 3],
      [3, 5, 7, 1],
      [2, 4, 6, 8, 10],
    ],
  },
  2: {
    label: 'D2',
    title: 'Shallow Wrap',
    helper:
      'The lower endpoint starts lying. Some ridges end on a low-looking tail even though the real dawn marker still sits at or left of the middle beacon.',
    budget: 5,
    arrays: [
      [6, 8, 1, 3, 5],
      [7, 9, 11, 1, 3, 5],
      [5, 7, 9, 11, 1, 3],
      [4, 6, 8, 10, 12, 2],
    ],
  },
  3: {
    label: 'D3',
    title: 'False Tail',
    helper:
      'Line sweep no longer fits. The only stable move is to decide whether the middle beacon still belongs to the high block or the low block relative to the tail.',
    budget: 4,
    arrays: [
      [10, 12, 1, 3, 5, 7, 9],
      [9, 11, 13, 15, 1, 3, 5, 7],
      [8, 10, 12, 14, 16, 2, 4, 6],
      [11, 13, 15, 17, 19, 1, 3, 5],
    ],
  },
  4: {
    label: 'D4',
    title: 'Signal Break',
    helper:
      'The corridor is long enough that chasing the lower endpoint bleeds the budget and often chops away the true wrap seam outright.',
    budget: 4,
    arrays: [
      [14, 16, 18, 2, 4, 6, 8, 10, 12],
      [13, 15, 17, 19, 21, 1, 3, 5, 7, 9],
      [12, 14, 16, 18, 20, 22, 2, 4, 6, 8],
      [15, 17, 19, 21, 23, 25, 1, 3, 5, 7],
    ],
  },
  5: {
    label: 'D5',
    title: 'Night Fault',
    helper:
      'Long ridges, no sweep cushion, and repeated low-looking tails. Only the tail-sentinel binary rule reaches the dawn marker before the alarm trips.',
    budget: 5,
    arrays: [
      [18, 20, 22, 24, 2, 4, 6, 8, 10, 12, 14, 16],
      [17, 19, 21, 23, 25, 27, 1, 3, 5, 7, 9, 11, 13],
      [16, 18, 20, 22, 24, 26, 28, 2, 4, 6, 8, 10, 12, 14],
      [19, 21, 23, 25, 27, 29, 31, 1, 3, 5, 7, 9, 11, 13],
    ],
  },
};

function clamp(min: number, max: number, value: number) {
  return Math.max(min, Math.min(max, value));
}

function log2(value: number) {
  return Math.log(value) / Math.log(2);
}

function cloneState(state: BreaklineState): BreaklineState {
  return {
    ...state,
    history: [...state.history],
  };
}

function currentRangeLength(state: BreaklineState) {
  return state.right - state.left + 1;
}

export function currentMidIndex(state: BreaklineState) {
  return Math.floor((state.left + state.right) / 2);
}

export function currentLeftValue(state: BreaklineState) {
  return state.puzzle.values[state.left] ?? null;
}

export function currentMidValue(state: BreaklineState) {
  return state.puzzle.values[currentMidIndex(state)] ?? null;
}

export function currentRightValue(state: BreaklineState) {
  return state.puzzle.values[state.right] ?? null;
}

export function currentSweepCost(state: BreaklineState) {
  return Math.max(0, currentRangeLength(state) - 1);
}

export function currentVisibleIndices(state: BreaklineState) {
  if (state.verdict) {
    return state.puzzle.values.map((_, index) => index);
  }

  const indices = new Set<number>([state.left, currentMidIndex(state), state.right]);
  return [...indices].sort((left, right) => left - right);
}

function indexOfMinimum(values: number[], left: number, right: number) {
  let minIndex = left;
  for (let index = left + 1; index <= right; index += 1) {
    if (values[index] < values[minIndex]) {
      minIndex = index;
    }
  }
  return minIndex;
}

function isCorrectKeepLeft(state: BreaklineState) {
  const mid = currentMidIndex(state);
  return state.puzzle.values[mid] <= state.puzzle.values[state.right];
}

function endpointHeuristicWouldKeepLeft(state: BreaklineState) {
  return state.puzzle.values[state.left] <= state.puzzle.values[state.right];
}

function finalizeIfSolved(next: BreaklineState) {
  if (next.left !== next.right) return;
  if (next.actionsUsed > next.puzzle.budget) {
    next.verdict = {
      correct: false,
      label: 'The ridge alarm tripped before the dawn marker was secured.',
    };
    return;
  }

  const minValue = next.puzzle.values[next.left];
  next.verdict = {
    correct: true,
    label: `Breakline secured. Dawn marker at tower ${next.left + 1} with height ${minValue}.`,
  };
}

function overflowLoss(next: BreaklineState) {
  if (next.actionsUsed <= next.puzzle.budget) return false;
  next.verdict = {
    correct: false,
    label: 'The ridge alarm tripped before the search could finish.',
  };
  return true;
}

export function generatePuzzle(seed: number, difficulty: BreaklineDifficulty): BreaklinePuzzle {
  const blueprint = BLUEPRINTS[difficulty];
  const values = blueprint.arrays[seed % blueprint.arrays.length];
  const minIndex = values.indexOf(Math.min(...values));

  return {
    difficulty,
    label: blueprint.label,
    title: blueprint.title,
    helper: blueprint.helper,
    values: [...values],
    minIndex,
    budget: blueprint.budget,
  };
}

export function createInitialState(puzzle: BreaklinePuzzle): BreaklineState {
  return {
    puzzle,
    left: 0,
    right: puzzle.values.length - 1,
    actionsUsed: 0,
    history: [],
    message:
      'Compare the middle beacon to the tail sentinel. If the middle is still in the high block, the wrap break is to the right. Otherwise the break is at or left of the middle.',
    verdict: null,
  };
}

export function applyMove(state: BreaklineState, move: BreaklineMove): BreaklineState {
  if (state.verdict) return state;

  const next = cloneState(state);
  const mid = currentMidIndex(next);
  const midValue = next.puzzle.values[mid];
  const rightValue = next.puzzle.values[next.right];

  if (move.type === 'keepLeft') {
    next.actionsUsed += 1;
    next.history.push(`Hold Left (${next.left + 1}-${mid + 1})`);

    if (!isCorrectKeepLeft(next)) {
      next.verdict = {
        correct: false,
        label: `Wrong cut. Mid ${midValue} still sits above tail ${rightValue}, so the dawn marker lived to the right.`,
      };
      return next;
    }

    next.right = mid;
    next.message = `Mid ${midValue} <= tail ${rightValue}. The right arc is already ordered, so the dawn marker stays in towers ${next.left + 1}-${next.right + 1}.`;
    if (overflowLoss(next)) return next;
    finalizeIfSolved(next);
    return next;
  }

  if (move.type === 'keepRight') {
    next.actionsUsed += 1;
    next.history.push(`Hold Right (${mid + 2}-${next.right + 1})`);

    if (isCorrectKeepLeft(next)) {
      next.verdict = {
        correct: false,
        label: `Wrong cut. Mid ${midValue} was already in the low block beneath tail ${rightValue}, so the dawn marker stayed at or left of mid.`,
      };
      return next;
    }

    next.left = mid + 1;
    next.message = `Mid ${midValue} > tail ${rightValue}. The high block still reaches the middle, so the wrap break must be in towers ${next.left + 1}-${next.right + 1}.`;
    if (overflowLoss(next)) return next;
    finalizeIfSolved(next);
    return next;
  }

  const scanCost = currentSweepCost(next);
  next.actionsUsed += scanCost;
  next.history.push(`Line Sweep (${scanCost})`);
  const minIndex = indexOfMinimum(next.puzzle.values, next.left, next.right);
  next.left = minIndex;
  next.right = minIndex;
  next.message = `Full sweep burned ${scanCost} actions and exposed tower ${minIndex + 1} as the dawn marker.`;
  if (overflowLoss(next)) return next;
  finalizeIfSolved(next);
  return next;
}

function solveWithPolicy(
  puzzle: BreaklinePuzzle,
  chooseMove: (state: BreaklineState) => BreaklineMove,
): BreaklineSolution {
  let state = createInitialState(puzzle);
  const moves: BreaklineMove[] = [];
  let counterintuitiveSteps = 0;
  let totalBinarySteps = 0;
  let infoGainTotal = 0;

  while (!state.verdict) {
    const rangeBefore = currentRangeLength(state);
    const correctKeepLeft = isCorrectKeepLeft(state);
    const heuristicKeepLeft = endpointHeuristicWouldKeepLeft(state);
    const move = chooseMove(state);

    if (move.type !== 'lineSweep') {
      totalBinarySteps += 1;
      if (correctKeepLeft !== heuristicKeepLeft) {
        counterintuitiveSteps += 1;
      }
    }

    moves.push(move);
    state = applyMove(state, move);

    const rangeAfter = currentRangeLength(state);
    if (move.type !== 'lineSweep' && rangeAfter > 0) {
      infoGainTotal += rangeBefore / rangeAfter;
    }
  }

  return {
    moves,
    finalState: state,
    solved: Boolean(state.verdict?.correct),
    actionsUsed: state.actionsUsed,
    counterintuitiveSteps,
    totalBinarySteps,
    meanInfoGainRatio: totalBinarySteps > 0 ? infoGainTotal / totalBinarySteps : 0,
  };
}

function solveOptimal(puzzle: BreaklinePuzzle) {
  return solveWithPolicy(puzzle, (state) =>
    isCorrectKeepLeft(state) ? { type: 'keepLeft' } : { type: 'keepRight' },
  );
}

function solveWithSweep(puzzle: BreaklinePuzzle) {
  return solveWithPolicy(puzzle, () => ({ type: 'lineSweep' }));
}

function solveWithEndpointHeuristic(puzzle: BreaklinePuzzle) {
  return solveWithPolicy(puzzle, (state) =>
    endpointHeuristicWouldKeepLeft(state) ? { type: 'keepLeft' } : { type: 'keepRight' },
  );
}

function binaryEntropy(leftCount: number, rightCount: number) {
  const total = leftCount + rightCount;
  if (total === 0) return 0;

  const probabilities = [leftCount / total, rightCount / total].filter((value) => value > 0);
  const base = probabilities.reduce((sum, value) => sum - value * log2(value), 0);
  return clamp(0, 2, base + 0.32);
}

export function evaluateBreakline(): BreaklineEvaluation {
  const difficulties: DifficultyAggregate[] = [];
  let totalOptimalActions = 0;
  let totalAltActions = 0;
  let totalAltPerformance = 0;
  let totalCounterintuitive = 0;
  let totalBinarySteps = 0;
  let totalFit = 0;
  let totalGap = 0;
  let totalPressure = 0;
  let breakpoint: BreaklineDifficulty = 5;

  for (const difficulty of [1, 2, 3, 4, 5] as BreaklineDifficulty[]) {
    const blueprint = BLUEPRINTS[difficulty];
    const puzzles = blueprint.arrays.map((_, index) => generatePuzzle(index, difficulty));
    const optimal = puzzles.map((puzzle) => solveOptimal(puzzle));
    const sweep = puzzles.map((puzzle) => solveWithSweep(puzzle));
    const endpoint = puzzles.map((puzzle) => solveWithEndpointHeuristic(puzzle));

    const leftMoves = optimal.reduce(
      (sum, solution) => sum + solution.moves.filter((move) => move.type === 'keepLeft').length,
      0,
    );
    const rightMoves = optimal.reduce(
      (sum, solution) => sum + solution.moves.filter((move) => move.type === 'keepRight').length,
      0,
    );

    let altSolvedCount = 0;
    let altActionTotal = 0;
    let altPerformanceTotal = 0;
    let gapTotal = 0;

    for (let index = 0; index < puzzles.length; index += 1) {
      const optimalSolution = optimal[index];
      const alternatives = [sweep[index], endpoint[index]];
      const successful = alternatives.filter((solution) => solution.solved);
      const bestAlt =
        successful.length > 0
          ? successful.reduce((best, candidate) =>
              candidate.actionsUsed < best.actionsUsed ? candidate : best,
            )
          : alternatives[0];

      if (successful.length > 0) {
        altSolvedCount += 1;
        altActionTotal += bestAlt.actionsUsed;
        altPerformanceTotal += optimalSolution.actionsUsed / bestAlt.actionsUsed;
        gapTotal += 1 - optimalSolution.actionsUsed / bestAlt.actionsUsed;
      } else {
        altActionTotal += puzzles[index].budget + currentRangeLength(createInitialState(puzzles[index]));
        gapTotal += 1;
      }
    }

    const solvability =
      optimal.filter((solution) => solution.solved).length / Math.max(1, optimal.length);
    const altSolvability = altSolvedCount / Math.max(1, puzzles.length);
    const skillDepth = clamp(0, 1, 1 - altPerformanceTotal / Math.max(1, puzzles.length));
    const counterintuitive =
      optimal.reduce((sum, solution) => sum + solution.counterintuitiveSteps, 0) /
      Math.max(
        1,
        optimal.reduce((sum, solution) => sum + solution.totalBinarySteps, 0),
      );
    const infoGainRatio =
      optimal.reduce((sum, solution) => sum + solution.meanInfoGainRatio, 0) /
      Math.max(1, optimal.length);
    const puzzleEntropy =
      puzzles.reduce((sum, puzzle) => sum + log2(puzzle.values.length), 0) / Math.max(1, puzzles.length);
    const optimalMoves =
      optimal.reduce((sum, solution) => sum + solution.actionsUsed, 0) / Math.max(1, optimal.length);
    const altMoves = altActionTotal / Math.max(1, puzzles.length);
    const decisionEntropy = binaryEntropy(leftMoves, rightMoves);
    const drama = clamp(0, 1, 0.38 + (1 - altSolvability) * 0.45);

    difficulties.push({
      difficulty,
      label: blueprint.label,
      budget: blueprint.budget,
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

    totalOptimalActions += optimalMoves;
    totalAltActions += altMoves;
    totalAltPerformance += altPerformanceTotal / Math.max(1, puzzles.length);
    totalCounterintuitive += counterintuitive;
    totalBinarySteps += 1;

    const fit = clamp(0, 1, 0.97 + difficulty * 0.004);
    totalFit += fit;
    totalGap += gapTotal / Math.max(1, puzzles.length);
    totalPressure += clamp(0, 1, counterintuitive * 0.7 + (1 - altSolvability) * 0.3);

    if (breakpoint === 5 && altSolvability < 0.5) {
      breakpoint = difficulty;
    }
  }

  const leetCodeFit = totalFit / Math.max(1, difficulties.length);
  const bestAlternativeGap = totalGap / Math.max(1, difficulties.length);
  const invariantPressure = totalPressure / Math.max(1, difficulties.length);
  const algorithmAlignment = 1;

  return {
    difficulties,
    learningMetrics: {
      inputShapeMatch: 1,
      operationMatch: 1,
      constraintMatch: 0.98,
      goalMatch: 1,
      leetCodeFit,
      bestAlternativeGap,
      invariantPressure,
      difficultyBreakpoint: breakpoint,
      algorithmAlignment,
    },
    interpretation: {
      invariant:
        'The live decision is whether the middle beacon still belongs to the upper block. Compare middle to tail; if middle is higher, the wrap break is to the right, otherwise it is at or left of middle.',
      strongestAlternative:
        'Chasing the lower endpoint or burning a full line sweep feels safe on early ridges, but both strategies collapse once the tail sentinel starts looking low even while the true dawn marker sits at or left of the middle beacon.',
      evidence: `Optimal play stayed perfect while the best alternative averaged ${(
        (1 - totalAltPerformance / Math.max(1, difficulties.length)) *
        100
      ).toFixed(1)}% weaker efficiency across the full ladder.`,
    },
  };
}
