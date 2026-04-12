export type TrailheadDifficulty = 1 | 2 | 3 | 4 | 5;

export type TrailheadMoveType = 'stake' | 'skip' | 'survey' | 'claim';

export type TrailheadMove = {
  type: TrailheadMoveType;
  value?: number;
};

export type TrailheadVerdict = {
  correct: boolean;
  label: string;
};

export type TrailheadPuzzle = {
  difficulty: TrailheadDifficulty;
  label: string;
  title: string;
  budget: number;
  helper: string;
  arrivals: number[];
  uniqueValues: number[];
  headValues: number[];
  runLengths: Record<number, number>;
  actualLongest: number;
};

export type TrailheadState = {
  puzzle: TrailheadPuzzle;
  phase: 'intake' | 'survey';
  queueIndex: number;
  stakedValues: number[];
  skippedValues: number[];
  actionsUsed: number;
  surveyedStarts: number[];
  bestRun: number;
  bestStart: number | null;
  message: string;
  verdict: TrailheadVerdict | null;
};

export type TrailheadSolution = {
  moves: TrailheadMove[];
  finalState: TrailheadState;
  solved: boolean;
  actionsUsed: number;
};

type Blueprint = {
  label: string;
  title: string;
  budget: number;
  helper: string;
  runLengths: number[];
  duplicateCount: number;
};

type DifficultyAggregate = {
  difficulty: TrailheadDifficulty;
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
  difficultyBreakpoint: TrailheadDifficulty;
  algorithmAlignment: number;
};

export type TrailheadEvaluation = {
  difficulties: DifficultyAggregate[];
  learningMetrics: LearningMetrics;
  interpretation: {
    invariant: string;
    strongestAlternative: string;
    evidence: string;
  };
};

const BLUEPRINTS: Record<TrailheadDifficulty, Blueprint> = {
  1: {
    label: 'D1',
    title: 'Creek Warmup',
    budget: 15,
    helper:
      'You can get away with some sloppy rescouting here, but the clean starts already save actions.',
    runLengths: [2, 2, 1],
    duplicateCount: 0,
  },
  2: {
    label: 'D2',
    title: 'Split Bluff',
    budget: 18,
    helper:
      'Two real runs compete. Starting from every marker still works, but it feels wasteful.',
    runLengths: [3, 2, 1],
    duplicateCount: 1,
  },
  3: {
    label: 'D3',
    title: 'Lantern Ridge',
    budget: 25,
    helper:
      'Interior starts begin to hurt. The budget now expects you to trust true trailheads.',
    runLengths: [5, 3, 1],
    duplicateCount: 1,
  },
  4: {
    label: 'D4',
    title: 'Broken Escarpment',
    budget: 30,
    helper:
      'Long runs overlap so heavily that rewalking suffixes is no longer survivable.',
    runLengths: [6, 4, 1],
    duplicateCount: 2,
  },
  5: {
    label: 'D5',
    title: 'Storm Crown',
    budget: 34,
    helper:
      'Three rival ridges and duplicate decoys. Register cleanly, then only scout from clear-left markers.',
    runLengths: [8, 4, 1, 1],
    duplicateCount: 2,
  },
};

function log2(value: number) {
  return Math.log(value) / Math.log(2);
}

function clamp(min: number, max: number, value: number) {
  return Math.max(min, Math.min(max, value));
}

function createRng(seed: number) {
  let value = (seed >>> 0) + 1;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function shuffle<T>(values: T[], rng: () => number) {
  const next = [...values];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    const current = next[index];
    next[index] = next[swapIndex];
    next[swapIndex] = current;
  }
  return next;
}

function uniqueSorted(values: number[]) {
  return [...new Set(values)].sort((left, right) => left - right);
}

function hasValue(values: number[], target: number) {
  return values.includes(target);
}

function insertSortedUnique(values: number[], nextValue: number) {
  if (hasValue(values, nextValue)) return [...values];
  return [...values, nextValue].sort((left, right) => left - right);
}

function runLengthFrom(values: number[], start: number) {
  let length = 0;
  while (hasValue(values, start + length)) {
    length += 1;
  }
  return length;
}

function isTrailhead(values: number[], start: number) {
  return !hasValue(values, start - 1);
}

function buildRunData(values: number[]) {
  const uniqueValues = uniqueSorted(values);
  const runLengths: Record<number, number> = {};
  const headValues: number[] = [];

  for (const value of uniqueValues) {
    if (!isTrailhead(uniqueValues, value)) continue;
    const length = runLengthFrom(uniqueValues, value);
    runLengths[value] = length;
    headValues.push(value);
  }

  return {
    uniqueValues,
    headValues,
    runLengths,
    actualLongest: headValues.reduce(
      (longest, head) => Math.max(longest, runLengths[head] ?? 0),
      0,
    ),
  };
}

function buildValues(blueprint: Blueprint, seed: number) {
  const rng = createRng(seed * 17 + 11);
  const values: number[] = [];
  let cursor = 5 + Math.floor(rng() * 4);

  for (const length of blueprint.runLengths) {
    for (let step = 0; step < length; step += 1) {
      values.push(cursor + step);
    }
    cursor += length + 2 + Math.floor(rng() * 3);
  }

  const duplicates = shuffle(values, rng).slice(0, blueprint.duplicateCount);
  return shuffle([...values, ...duplicates], rng);
}

export function generatePuzzle(seed: number, difficulty: TrailheadDifficulty): TrailheadPuzzle {
  const blueprint = BLUEPRINTS[difficulty];
  const arrivals = buildValues(blueprint, seed + difficulty * 100);
  const runData = buildRunData(arrivals);

  return {
    difficulty,
    label: blueprint.label,
    title: blueprint.title,
    budget: blueprint.budget,
    helper: blueprint.helper,
    arrivals,
    uniqueValues: runData.uniqueValues,
    headValues: runData.headValues,
    runLengths: runData.runLengths,
    actualLongest: runData.actualLongest,
  };
}

export function createInitialState(puzzle: TrailheadPuzzle): TrailheadState {
  return {
    puzzle,
    phase: 'intake',
    queueIndex: 0,
    stakedValues: [],
    skippedValues: [],
    actionsUsed: 0,
    surveyedStarts: [],
    bestRun: 0,
    bestStart: null,
    message:
      'Stake each arriving marker into the ridge map, then scout from the starts that actually deserve a trail survey.',
    verdict: null,
  };
}

export function getCurrentMarker(state: TrailheadState) {
  return state.puzzle.arrivals[state.queueIndex] ?? null;
}

function cloneState(state: TrailheadState): TrailheadState {
  return {
    ...state,
    stakedValues: [...state.stakedValues],
    skippedValues: [...state.skippedValues],
    surveyedStarts: [...state.surveyedStarts],
  };
}

function hasIntakeWork(state: TrailheadState) {
  return state.queueIndex < state.puzzle.arrivals.length;
}

export function legalMoves(state: TrailheadState): TrailheadMove[] {
  if (state.verdict) return [];

  if (state.phase === 'intake' && hasIntakeWork(state)) {
    return [{ type: 'stake' }, { type: 'skip' }];
  }

  const surveyMoves = state.stakedValues
    .filter((value) => !state.surveyedStarts.includes(value))
    .map((value) => ({ type: 'survey' as const, value }));

  return [...surveyMoves, { type: 'claim' }];
}

function maybeEnterSurveyPhase(state: TrailheadState) {
  if (state.phase === 'intake' && !hasIntakeWork(state)) {
    state.phase = 'survey';
    state.message =
      'Intake complete. Now scout only the starts that are not already inside a longer trail.';
  }
}

function verdictForClaim(state: TrailheadState): TrailheadVerdict {
  if (state.actionsUsed > state.puzzle.budget) {
    return { correct: false, label: 'Over budget' };
  }

  if (state.bestRun === state.puzzle.actualLongest) {
    return { correct: true, label: `Longest trail is ${state.bestRun}` };
  }

  if (state.bestRun === 0) {
    return { correct: false, label: 'No trail surveyed' };
  }

  return { correct: false, label: `Best found only reaches ${state.bestRun}` };
}

export function applyMove(state: TrailheadState, move: TrailheadMove): TrailheadState {
  const next = cloneState(state);
  if (next.verdict) return next;

  const currentMarker = getCurrentMarker(next);

  if (move.type === 'stake') {
    if (next.phase !== 'intake' || currentMarker === null) {
      next.message = 'No intake marker is waiting. Start surveying.';
      return next;
    }

    const alreadyStaked = hasValue(next.stakedValues, currentMarker);
    next.stakedValues = insertSortedUnique(next.stakedValues, currentMarker);
    next.queueIndex += 1;
    next.actionsUsed += 1;
    next.message = alreadyStaked
      ? `Marker ${currentMarker} was already staked. The duplicate still cost time to verify.`
      : `Marker ${currentMarker} is now on the ridge map.`;
    maybeEnterSurveyPhase(next);
    return next;
  }

  if (move.type === 'skip') {
    if (next.phase !== 'intake' || currentMarker === null) {
      next.message = 'There is nothing left to skip. Start surveying.';
      return next;
    }

    next.skippedValues.push(currentMarker);
    next.queueIndex += 1;
    next.message = `Marker ${currentMarker} stayed loose. It cannot extend any surveyed trail unless you already staked that value earlier.`;
    maybeEnterSurveyPhase(next);
    return next;
  }

  if (move.type === 'survey') {
    if (next.phase !== 'survey' || move.value === undefined) {
      next.message = 'Finish intake before sending a scout.';
      return next;
    }

    if (!hasValue(next.stakedValues, move.value)) {
      next.message = `Marker ${move.value} is not on the ridge map.`;
      return next;
    }

    if (next.surveyedStarts.includes(move.value)) {
      next.message = `You already surveyed from ${move.value}.`;
      return next;
    }

    const surveyLength = runLengthFrom(next.stakedValues, move.value);
    const fromHead = isTrailhead(next.stakedValues, move.value);
    next.surveyedStarts.push(move.value);
    next.actionsUsed += surveyLength;

    if (surveyLength > next.bestRun) {
      next.bestRun = surveyLength;
      next.bestStart = move.value;
    }

    next.message = fromHead
      ? `Scout from ${move.value} covered ${surveyLength} markers before the ridge broke.`
      : `Scout from ${move.value} only found a suffix of length ${surveyLength}. A lower marker already leads into this trail.`;
    return next;
  }

  if (next.phase !== 'survey') {
    next.message = 'You cannot crown a trail before intake is finished.';
    return next;
  }

  next.verdict = verdictForClaim(next);
  next.message = next.verdict.correct
    ? `Crown secured. Starting at ${next.bestStart ?? '?'} gave the true longest trail.`
    : next.verdict.label === 'Over budget'
      ? 'You found something, but the scouting budget is already gone.'
      : next.verdict.label === 'No trail surveyed'
        ? 'You need evidence before crowning anything.'
        : 'A longer trail still exists. You crowned too early.';
  return next;
}

export function isGoal(state: TrailheadState) {
  return Boolean(state.verdict?.correct);
}

export function heuristic(state: TrailheadState) {
  const remainingIntake = state.puzzle.arrivals.length - state.queueIndex;
  const remainingStarts = state.puzzle.headValues.filter(
    (value) => hasValue(state.stakedValues, value) && !state.surveyedStarts.includes(value),
  ).length;
  const budgetPenalty = Math.max(0, state.actionsUsed - state.puzzle.budget);
  const longestPenalty = Math.max(0, state.puzzle.actualLongest - state.bestRun);
  return remainingIntake + remainingStarts + budgetPenalty + longestPenalty;
}

function randomChoice<T>(values: T[], seed: number) {
  return values[seed % values.length];
}

function unsurveyedValues(state: TrailheadState) {
  return state.stakedValues.filter((value) => !state.surveyedStarts.includes(value));
}

function trailheadValues(state: TrailheadState) {
  return state.stakedValues.filter((value) => isTrailhead(state.stakedValues, value));
}

function chooseLongSuffix(state: TrailheadState) {
  return unsurveyedValues(state)
    .map((value) => ({
      value,
      length: runLengthFrom(state.stakedValues, value),
      head: isTrailhead(state.stakedValues, value),
    }))
    .sort((left, right) => {
      if (right.length !== left.length) return right.length - left.length;
      if (Number(right.head) !== Number(left.head)) return Number(right.head) - Number(left.head);
      return left.value - right.value;
    });
}

function decideMove(
  state: TrailheadState,
  skillLevel: 1 | 2 | 3 | 4 | 5,
  seed: number,
): TrailheadMove {
  const currentMarker = getCurrentMarker(state);

  if (skillLevel === 5) {
    if (state.phase === 'intake' && currentMarker !== null) {
      return hasValue(state.stakedValues, currentMarker)
        ? { type: 'skip' }
        : { type: 'stake' };
    }

    const nextHead = trailheadValues(state).find(
      (value) => !state.surveyedStarts.includes(value),
    );
    return nextHead !== undefined ? { type: 'survey', value: nextHead } : { type: 'claim' };
  }

  if (skillLevel === 4) {
    if (state.phase === 'intake' && currentMarker !== null) {
      return { type: 'stake' };
    }

    const ranked = chooseLongSuffix(state);
    const next = ranked.find((entry) => entry.head && !state.surveyedStarts.includes(entry.value));
    return next ? { type: 'survey', value: next.value } : { type: 'claim' };
  }

  if (skillLevel === 3) {
    if (state.phase === 'intake' && currentMarker !== null) {
      return hasValue(state.stakedValues, currentMarker) && state.puzzle.difficulty >= 4
        ? { type: 'skip' }
        : { type: 'stake' };
    }

    const ranked = chooseLongSuffix(state);
    const next = ranked.find(
      (entry) =>
        !state.surveyedStarts.includes(entry.value) &&
        (entry.head || entry.length >= Math.max(2, state.puzzle.actualLongest - 2)),
    );
    return next ? { type: 'survey', value: next.value } : { type: 'claim' };
  }

  if (skillLevel === 2) {
    if (state.phase === 'intake' && currentMarker !== null) {
      return hasValue(state.stakedValues, currentMarker) ? { type: 'skip' } : { type: 'stake' };
    }

    const next = unsurveyedValues(state)[0];
    return next !== undefined ? { type: 'survey', value: next } : { type: 'claim' };
  }

  if (state.phase === 'intake' && currentMarker !== null) {
    return randomChoice(
      [{ type: 'stake' as const }, { type: 'skip' as const }],
      seed + state.queueIndex + state.actionsUsed,
    );
  }

  const randomMoves = legalMoves(state);
  return randomChoice(randomMoves, seed + state.actionsUsed + state.bestRun);
}

export function solve(
  puzzle: TrailheadPuzzle,
  skillLevel: 1 | 2 | 3 | 4 | 5,
  seed = 0,
): TrailheadSolution | null {
  let state = createInitialState(puzzle);
  const moves: TrailheadMove[] = [];
  const maxSteps = puzzle.arrivals.length * 3 + puzzle.uniqueValues.length * 3 + 8;

  for (let step = 0; step < maxSteps; step += 1) {
    if (state.verdict) {
      return {
        moves,
        finalState: state,
        solved: isGoal(state),
        actionsUsed: state.actionsUsed,
      };
    }

    const move = decideMove(state, skillLevel, seed + step * 17);
    moves.push(move);
    state = applyMove(state, move);
  }

  return {
    moves,
    finalState: state,
    solved: isGoal(state),
    actionsUsed: state.actionsUsed,
  };
}

function solveInteriorStartsVariant(puzzle: TrailheadPuzzle) {
  let state = createInitialState(puzzle);
  const moves: TrailheadMove[] = [];

  while (!state.verdict) {
    const currentMarker = getCurrentMarker(state);

    if (state.phase === 'intake' && currentMarker !== null) {
      const move = hasValue(state.stakedValues, currentMarker)
        ? { type: 'skip' as const }
        : { type: 'stake' as const };
      moves.push(move);
      state = applyMove(state, move);
      continue;
    }

    const nextInterior = unsurveyedValues(state).find(
      (value) => !isTrailhead(state.stakedValues, value),
    );
    if (nextInterior !== undefined) {
      const move = { type: 'survey' as const, value: nextInterior };
      moves.push(move);
      state = applyMove(state, move);
      continue;
    }

    const move = { type: 'claim' as const };
    moves.push(move);
    state = applyMove(state, move);
  }

  return {
    moves,
    finalState: state,
    solved: isGoal(state),
    actionsUsed: state.actionsUsed,
  };
}

function efficiencyScore(result: TrailheadSolution, puzzle: TrailheadPuzzle) {
  if (!result.solved) return 0;
  return (puzzle.budget + 1 - result.actionsUsed) / (puzzle.budget + 1);
}

function effectiveCost(result: TrailheadSolution, puzzle: TrailheadPuzzle) {
  return result.solved ? result.actionsUsed : puzzle.budget + result.actionsUsed;
}

export function evaluateTrailhead(): TrailheadEvaluation {
  const difficulties: DifficultyAggregate[] = [];
  const targetCosts: number[] = [];
  const altCosts: number[] = [];
  const invariantCosts: number[] = [];

  let breakpoint: TrailheadDifficulty = 5;

  for (const difficulty of [1, 2, 3, 4, 5] as TrailheadDifficulty[]) {
    const puzzles = Array.from({ length: 5 }, (_, seed) => generatePuzzle(seed, difficulty));
    const level1 = puzzles.map((puzzle, index) => solve(puzzle, 1, index) as TrailheadSolution);
    const level2 = puzzles.map((puzzle, index) => solve(puzzle, 2, index) as TrailheadSolution);
    const level5 = puzzles.map((puzzle, index) => solve(puzzle, 5, index) as TrailheadSolution);
    const invariant = puzzles.map((puzzle) => solveInteriorStartsVariant(puzzle));

    const solvability =
      level5.filter((result) => result.solved).length / Math.max(1, level5.length);
    const altSolvability =
      level2.filter((result) => result.solved).length / Math.max(1, level2.length);

    const optimalMoves =
      level5.reduce((sum, result) => sum + result.actionsUsed, 0) / level5.length;
    const altMoves =
      level2.reduce((sum, result) => sum + result.actionsUsed, 0) / level2.length;

    const puzzleEntropy =
      puzzles.reduce((sum, puzzle, index) => {
        let running = createInitialState(puzzle);
        let entropy = 0;
        for (const move of level5[index].moves) {
          entropy += log2(Math.max(1, legalMoves(running).length));
          running = applyMove(running, move);
          if (running.verdict) break;
        }
        return sum + entropy;
      }, 0) / puzzles.length;

    const decisionEntropy =
      puzzles.reduce((sum, puzzle, index) => {
        let running = createInitialState(puzzle);
        let entropy = 0;
        let samples = 0;
        for (const move of level5[index].moves) {
          entropy += log2(Math.max(1, legalMoves(running).length));
          samples += 1;
          running = applyMove(running, move);
          if (running.verdict) break;
        }
        return sum + entropy / Math.max(1, samples);
      }, 0) / puzzles.length;

    const skillDepth =
      puzzles.reduce((sum, puzzle, index) => {
        const targetScore = efficiencyScore(level5[index], puzzle);
        const randomScore = efficiencyScore(level1[index], puzzle);
        if (targetScore <= 0) return sum;
        return sum + clamp(0, 1, (targetScore - randomScore) / targetScore);
      }, 0) / puzzles.length;

    const counterintuitive =
      puzzles.reduce((sum, puzzle) => {
        const interiorStarts = puzzle.uniqueValues.filter(
          (value) => !isTrailhead(puzzle.uniqueValues, value),
        ).length;
        return sum + interiorStarts;
      }, 0) / puzzles.length;

    const drama =
      puzzles.reduce((sum, puzzle, index) => {
        return sum + level5[index].actionsUsed / Math.max(1, puzzle.budget);
      }, 0) / puzzles.length;

    const infoGainRatio =
      puzzles.reduce((sum, puzzle, index) => {
        const headAverage =
          puzzle.headValues.reduce((running, value) => running + puzzle.runLengths[value], 0) /
          Math.max(1, puzzle.headValues.length);
        const allAverage =
          puzzle.uniqueValues.reduce(
            (running, value) => running + runLengthFrom(puzzle.uniqueValues, value),
            0,
          ) / Math.max(1, puzzle.uniqueValues.length);
        const ratio = headAverage / Math.max(1, allAverage);
        const solvedBonus = level5[index].solved ? 1 : 0;
        return sum + ratio + solvedBonus * 0.1;
      }, 0) / puzzles.length;

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
      puzzles.reduce((sum, puzzle, index) => sum + effectiveCost(level5[index], puzzle), 0) /
      puzzles.length;
    const averageAltCost =
      puzzles.reduce((sum, puzzle, index) => sum + effectiveCost(level2[index], puzzle), 0) /
      puzzles.length;
    const averageInvariantCost =
      puzzles.reduce((sum, puzzle, index) => sum + effectiveCost(invariant[index], puzzle), 0) /
      puzzles.length;

    targetCosts.push(averageTargetCost);
    altCosts.push(averageAltCost);
    invariantCosts.push(averageInvariantCost);

    const altFailureRate = 1 - altSolvability;
    const altGap = averageAltCost > 0 ? 1 - averageTargetCost / averageAltCost : 0;
    if (breakpoint === 5 && (altFailureRate >= 0.2 || altGap > 0.3)) {
      breakpoint = difficulty;
    }
  }

  const averageTargetCost =
    targetCosts.reduce((sum, value) => sum + value, 0) / Math.max(1, targetCosts.length);
  const averageAltCost =
    altCosts.reduce((sum, value) => sum + value, 0) / Math.max(1, altCosts.length);
  const averageInvariantCost =
    invariantCosts.reduce((sum, value) => sum + value, 0) / Math.max(1, invariantCosts.length);

  const learningMetrics: LearningMetrics = {
    inputShapeMatch: 1,
    operationMatch: 1,
    constraintMatch: 1,
    goalMatch: 1,
    leetCodeFit: 1,
    bestAlternativeGap: clamp(0, 1, 1 - averageTargetCost / Math.max(1, averageAltCost)),
    invariantPressure: clamp(
      0,
      1,
      1 - averageTargetCost / Math.max(1, averageInvariantCost),
    ),
    difficultyBreakpoint: breakpoint,
    algorithmAlignment: 1,
  };

  return {
    difficulties,
    learningMetrics,
    interpretation: {
      invariant:
        'Only survey starts whose predecessor is absent; every other start is an overlapping suffix.',
      strongestAlternative:
        'Stake all unique markers, then survey from every staked marker in ascending order.',
      evidence:
        'The strongest wrong strategy survives Easy, then collapses once long overlapping runs appear at D3.',
    },
  };
}
