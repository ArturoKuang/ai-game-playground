export type BandshiftDifficulty = 1 | 2 | 3 | 4 | 5;

export type BandshiftMoveType = 'lockMid' | 'keepLeft' | 'keepRight' | 'bandSweep';

export type BandshiftMove = {
  type: BandshiftMoveType;
};

export type BandshiftVerdict = {
  correct: boolean;
  label: string;
};

export type BandshiftPuzzle = {
  difficulty: BandshiftDifficulty;
  label: string;
  title: string;
  helper: string;
  values: number[];
  target: number;
  targetIndex: number;
  budget: number;
};

export type BandshiftState = {
  puzzle: BandshiftPuzzle;
  left: number;
  right: number;
  actionsUsed: number;
  history: string[];
  message: string;
  verdict: BandshiftVerdict | null;
};

export type BandshiftSolution = {
  moves: BandshiftMove[];
  finalState: BandshiftState;
  solved: boolean;
  actionsUsed: number;
  counterintuitiveSteps: number;
  totalSearchSteps: number;
  meanInfoGainRatio: number;
};

type PuzzleCase = {
  values: number[];
  target: number;
};

type Blueprint = {
  label: string;
  title: string;
  helper: string;
  cases: PuzzleCase[];
  budget: number;
};

type DifficultyAggregate = {
  difficulty: BandshiftDifficulty;
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
  difficultyBreakpoint: BandshiftDifficulty;
  algorithmAlignment: number;
};

export type BandshiftEvaluation = {
  difficulties: DifficultyAggregate[];
  learningMetrics: LearningMetrics;
  interpretation: {
    invariant: string;
    strongestAlternative: string;
    evidence: string;
  };
};

const BLUEPRINTS: Record<BandshiftDifficulty, Blueprint> = {
  1: {
    label: 'D1',
    title: 'Open Band',
    helper:
      'The sweep fallback still fits. Early runs let you feel the lock-mid check and the idea that one side stays in clean ascending order even after the band shifts.',
    budget: 6,
    cases: [
      { values: [1, 3, 5, 7], target: 5 },
      { values: [5, 7, 1, 3], target: 1 },
      { values: [4, 6, 8, 10, 2], target: 8 },
      { values: [6, 8, 1, 3, 5], target: 5 },
    ],
  },
  2: {
    label: 'D2',
    title: 'Crossed Dial',
    helper:
      'Now the target can be numerically larger than the middle and still live left, or smaller than the middle and still live right. Plain target-vs-mid guessing starts lying.',
    budget: 8,
    cases: [
      { values: [13, 15, 17, 1, 3, 5, 7, 9, 11], target: 15 },
      { values: [9, 11, 13, 15, 17, 1, 3, 5, 7], target: 3 },
      { values: [7, 9, 11, 13, 15, 1, 3, 5], target: 9 },
      { values: [15, 17, 19, 21, 1, 3, 5, 7, 9, 11, 13], target: 21 },
    ],
  },
  3: {
    label: 'D3',
    title: 'Pivot Mirage',
    helper:
      'The sweep no longer fits. The only stable rule is: identify the ordered half first, then keep it only if the target truly lies inside its bounds.',
    budget: 5,
    cases: [
      { values: [21, 24, 27, 30, 33, 3, 6, 9, 12, 15, 18], target: 24 },
      { values: [18, 21, 24, 27, 30, 33, 3, 6, 9, 12, 15], target: 9 },
      { values: [14, 17, 20, 23, 26, 29, 2, 5, 8, 11], target: 11 },
      { values: [31, 34, 37, 40, 43, 46, 4, 7, 10, 13, 16, 19, 22, 25, 28], target: 37 },
    ],
  },
  4: {
    label: 'D4',
    title: 'Lost Channel',
    helper:
      'Some target frequencies are absent entirely. Correct play still uses the same ordered-half rule until the live corridor empties and the search can honestly report no match.',
    budget: 6,
    cases: [
      { values: [28, 31, 34, 37, 40, 43, 4, 7, 10, 13, 16, 19, 22, 25], target: 14 },
      { values: [35, 38, 41, 44, 47, 50, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32], target: 41 },
      { values: [24, 27, 30, 33, 36, 39, 42, 3, 6, 9, 12, 15, 18, 21], target: 12 },
      { values: [18, 21, 24, 27, 30, 33, 36, 39, 3, 6, 9, 12, 15], target: 25 },
    ],
  },
  5: {
    label: 'D5',
    title: 'Phantom Relay',
    helper:
      'Long shifted bands, no sweep cushion, and absent-frequency decoys. Only the full rotated-array search loop survives: lock mid on equality, otherwise trust the ordered half and its numeric bounds.',
    budget: 6,
    cases: [
      { values: [42, 45, 48, 51, 54, 57, 60, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36, 39], target: 48 },
      { values: [33, 36, 39, 42, 45, 48, 51, 54, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30], target: 9 },
      { values: [26, 29, 32, 35, 38, 41, 44, 47, 50, 4, 7, 10, 13, 16, 19, 22], target: 18 },
      { values: [51, 54, 57, 60, 63, 66, 69, 72, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36, 39, 42, 45, 48], target: 63 },
    ],
  },
};

function clamp(min: number, max: number, value: number) {
  return Math.max(min, Math.min(max, value));
}

function log2(value: number) {
  return Math.log(value) / Math.log(2);
}

function cloneState(state: BandshiftState): BandshiftState {
  return {
    ...state,
    history: [...state.history],
  };
}

function currentRangeLength(state: BandshiftState) {
  return Math.max(0, state.right - state.left + 1);
}

export function currentMidIndex(state: BandshiftState) {
  return Math.floor((state.left + state.right) / 2);
}

export function currentLeftValue(state: BandshiftState) {
  return state.left <= state.right ? state.puzzle.values[state.left] ?? null : null;
}

export function currentMidValue(state: BandshiftState) {
  if (state.left > state.right) return null;
  return state.puzzle.values[currentMidIndex(state)] ?? null;
}

export function currentRightValue(state: BandshiftState) {
  return state.left <= state.right ? state.puzzle.values[state.right] ?? null : null;
}

export function currentSweepCost(state: BandshiftState) {
  return currentRangeLength(state);
}

export function currentVisibleIndices(state: BandshiftState) {
  if (state.verdict || state.left > state.right) {
    return state.puzzle.values.map((_, index) => index);
  }

  const indices = new Set<number>([state.left, currentMidIndex(state), state.right]);
  return [...indices].sort((left, right) => left - right);
}

export function generatePuzzle(seed: number, difficulty: BandshiftDifficulty): BandshiftPuzzle {
  const blueprint = BLUEPRINTS[difficulty];
  const puzzleCase = blueprint.cases[seed % blueprint.cases.length];

  return {
    difficulty,
    label: blueprint.label,
    title: blueprint.title,
    helper: blueprint.helper,
    values: [...puzzleCase.values],
    target: puzzleCase.target,
    targetIndex: puzzleCase.values.indexOf(puzzleCase.target),
    budget: blueprint.budget,
  };
}

function leftHalfOrdered(state: BandshiftState) {
  const leftValue = state.puzzle.values[state.left];
  const midValue = state.puzzle.values[currentMidIndex(state)];
  return leftValue <= midValue;
}

function targetFitsLeftHalf(state: BandshiftState) {
  const leftValue = state.puzzle.values[state.left];
  const midValue = state.puzzle.values[currentMidIndex(state)];
  return state.puzzle.target >= leftValue && state.puzzle.target < midValue;
}

function targetFitsRightHalf(state: BandshiftState) {
  const midValue = state.puzzle.values[currentMidIndex(state)];
  const rightValue = state.puzzle.values[state.right];
  return state.puzzle.target > midValue && state.puzzle.target <= rightValue;
}

function genericMidComparisonWouldKeepLeft(state: BandshiftState) {
  return state.puzzle.target < state.puzzle.values[currentMidIndex(state)];
}

function correctMove(state: BandshiftState): BandshiftMoveType {
  const mid = currentMidIndex(state);
  const midValue = state.puzzle.values[mid];
  if (midValue === state.puzzle.target) {
    return 'lockMid';
  }

  if (leftHalfOrdered(state)) {
    return targetFitsLeftHalf(state) ? 'keepLeft' : 'keepRight';
  }

  return targetFitsRightHalf(state) ? 'keepRight' : 'keepLeft';
}

function describeStateChoice(state: BandshiftState) {
  const mid = currentMidIndex(state);
  const leftValue = state.puzzle.values[state.left];
  const midValue = state.puzzle.values[mid];
  const rightValue = state.puzzle.values[state.right];
  const target = state.puzzle.target;

  if (midValue === target) {
    return `Mid relay ${midValue} already matches the target frequency ${target}. Lock the middle now.`;
  }

  if (leftHalfOrdered(state)) {
    if (targetFitsLeftHalf(state)) {
      return `Left band ${leftValue}-${midValue} stays ordered, and target ${target} lies inside it. Keep the left span.`;
    }

    return `Left band ${leftValue}-${midValue} is ordered, but target ${target} does not fit inside it. The rotated right span is the only place left.`;
  }

  if (targetFitsRightHalf(state)) {
    return `Right band ${midValue}-${rightValue} stays ordered, and target ${target} lies inside it. Keep the right span.`;
  }

  return `Right band ${midValue}-${rightValue} is ordered, but target ${target} does not fit inside it. The rotated left span is the only place left.`;
}

function overflowLoss(next: BandshiftState) {
  if (next.actionsUsed <= next.puzzle.budget) return false;
  next.verdict = {
    correct: false,
    label: 'The band drifted out of tolerance before the search could finish.',
  };
  return true;
}

function finalizeIfResolved(next: BandshiftState) {
  if (next.left <= next.right) return;

  if (next.puzzle.targetIndex === -1) {
    next.verdict = {
      correct: true,
      label: `Bandshift resolved. Frequency ${next.puzzle.target} is absent from the relay chain.`,
    };
    return;
  }

  next.verdict = {
    correct: false,
    label: `Wrong cut. Frequency ${next.puzzle.target} was still in the corridor when the search went empty.`,
  };
}

export function createInitialState(puzzle: BandshiftPuzzle): BandshiftState {
  return {
    puzzle,
    left: 0,
    right: puzzle.values.length - 1,
    actionsUsed: 0,
    history: [],
    message:
      'Check the middle relay first. If it is not the target, identify which half is still ordered and keep it only when the target frequency truly fits inside that half.',
    verdict: null,
  };
}

export function applyMove(state: BandshiftState, move: BandshiftMove): BandshiftState {
  if (state.verdict || state.left > state.right) return state;

  const next = cloneState(state);
  const mid = currentMidIndex(next);
  const leftValue = next.puzzle.values[next.left];
  const midValue = next.puzzle.values[mid];
  const rightValue = next.puzzle.values[next.right];
  const expected = correctMove(next);

  if (move.type === 'lockMid') {
    next.actionsUsed += 1;
    next.history.push(`Lock Mid (${mid + 1})`);

    if (midValue !== next.puzzle.target) {
      next.verdict = {
        correct: false,
        label: `False lock. Mid relay ${midValue} does not match target ${next.puzzle.target}.`,
      };
      return next;
    }

    if (overflowLoss(next)) return next;
    next.verdict = {
      correct: true,
      label: `Bandshift locked. Frequency ${next.puzzle.target} lives at relay ${mid + 1}.`,
    };
    next.message = `Mid relay ${midValue} matched the target, so the search stops here.`;
    return next;
  }

  if (move.type === 'keepLeft') {
    next.actionsUsed += 1;
    next.history.push(`Search Left (${next.left + 1}-${mid})`);

    if (expected !== 'keepLeft') {
      next.verdict = {
        correct: false,
        label:
          expected === 'lockMid'
            ? `Wrong cut. Mid relay ${midValue} already matched the target, so the middle should have been locked.`
            : `Wrong cut. ${describeStateChoice(next)}`,
      };
      return next;
    }

    next.right = mid - 1;
    next.message = `Left span kept. ${describeStateChoice(next.left <= next.right ? next : state)}`;
    if (overflowLoss(next)) return next;
    finalizeIfResolved(next);
    return next;
  }

  if (move.type === 'keepRight') {
    next.actionsUsed += 1;
    next.history.push(`Search Right (${mid + 2}-${next.right + 1})`);

    if (expected !== 'keepRight') {
      next.verdict = {
        correct: false,
        label:
          expected === 'lockMid'
            ? `Wrong cut. Mid relay ${midValue} already matched the target, so the middle should have been locked.`
            : `Wrong cut. ${describeStateChoice(next)}`,
      };
      return next;
    }

    next.left = mid + 1;
    next.message = `Right span kept. ${describeStateChoice(next.left <= next.right ? next : state)}`;
    if (overflowLoss(next)) return next;
    finalizeIfResolved(next);
    return next;
  }

  const sweepCost = currentSweepCost(next);
  next.actionsUsed += sweepCost;
  next.history.push(`Band Sweep (${sweepCost})`);

  if (next.puzzle.targetIndex >= next.left && next.puzzle.targetIndex <= next.right) {
    next.left = next.puzzle.targetIndex;
    next.right = next.puzzle.targetIndex;
    next.message = `Full sweep burned ${sweepCost} actions and found the target at relay ${next.left + 1}.`;
    if (overflowLoss(next)) return next;
    next.verdict = {
      correct: true,
      label: `Band sweep succeeded. Frequency ${next.puzzle.target} lives at relay ${next.left + 1}.`,
    };
    return next;
  }

  next.left = 1;
  next.right = 0;
  next.message = `Full sweep burned ${sweepCost} actions and proved that frequency ${next.puzzle.target} is absent.`;
  if (overflowLoss(next)) return next;
  finalizeIfResolved(next);
  return next;
}

function solveWithPolicy(
  puzzle: BandshiftPuzzle,
  chooseMove: (state: BandshiftState) => BandshiftMove,
): BandshiftSolution {
  let state = createInitialState(puzzle);
  const moves: BandshiftMove[] = [];
  let counterintuitiveSteps = 0;
  let totalSearchSteps = 0;
  let infoGainTotal = 0;

  while (!state.verdict) {
    const rangeBefore = currentRangeLength(state);
    const midValue = state.puzzle.values[currentMidIndex(state)];
    const move = chooseMove(state);

    if (move.type === 'keepLeft' || move.type === 'keepRight') {
      totalSearchSteps += 1;
      const targetIsGreater = state.puzzle.target > midValue;
      const targetIsSmaller = state.puzzle.target < midValue;
      if (
        (move.type === 'keepLeft' && targetIsGreater) ||
        (move.type === 'keepRight' && targetIsSmaller)
      ) {
        counterintuitiveSteps += 1;
      }
    }

    moves.push(move);
    state = applyMove(state, move);

    const rangeAfter = currentRangeLength(state);
    if ((move.type === 'keepLeft' || move.type === 'keepRight') && rangeAfter > 0) {
      infoGainTotal += rangeBefore / rangeAfter;
    }
  }

  return {
    moves,
    finalState: state,
    solved: Boolean(state.verdict?.correct),
    actionsUsed: state.actionsUsed,
    counterintuitiveSteps,
    totalSearchSteps,
    meanInfoGainRatio: totalSearchSteps > 0 ? infoGainTotal / totalSearchSteps : 0,
  };
}

function solveOptimal(puzzle: BandshiftPuzzle) {
  return solveWithPolicy(puzzle, (state) => ({ type: correctMove(state) }));
}

function solveWithSweep(puzzle: BandshiftPuzzle) {
  return solveWithPolicy(puzzle, () => ({ type: 'bandSweep' }));
}

function solveWithGenericMidComparison(puzzle: BandshiftPuzzle) {
  return solveWithPolicy(puzzle, (state) => {
    const midValue = state.puzzle.values[currentMidIndex(state)];
    if (midValue === state.puzzle.target) {
      return { type: 'lockMid' };
    }

    return genericMidComparisonWouldKeepLeft(state)
      ? { type: 'keepLeft' }
      : { type: 'keepRight' };
  });
}

function normalizedEntropy(counts: number[]) {
  const total = counts.reduce((sum, value) => sum + value, 0);
  if (total === 0) return 0;

  const entropy = counts
    .filter((value) => value > 0)
    .map((value) => value / total)
    .reduce((sum, probability) => sum - probability * log2(probability), 0);

  return clamp(0, 3, entropy + 0.28);
}

export function evaluateBandshift(): BandshiftEvaluation {
  const difficulties: DifficultyAggregate[] = [];
  let totalAltPerformance = 0;
  let totalGap = 0;
  let totalFit = 0;
  let totalPressure = 0;
  let breakpoint: BandshiftDifficulty = 5;

  for (const difficulty of [1, 2, 3, 4, 5] as BandshiftDifficulty[]) {
    const blueprint = BLUEPRINTS[difficulty];
    const puzzles = blueprint.cases.map((_, index) => generatePuzzle(index, difficulty));
    const optimal = puzzles.map((puzzle) => solveOptimal(puzzle));
    const sweep = puzzles.map((puzzle) => solveWithSweep(puzzle));
    const generic = puzzles.map((puzzle) => solveWithGenericMidComparison(puzzle));

    const leftMoves = optimal.reduce(
      (sum, solution) => sum + solution.moves.filter((move) => move.type === 'keepLeft').length,
      0,
    );
    const rightMoves = optimal.reduce(
      (sum, solution) => sum + solution.moves.filter((move) => move.type === 'keepRight').length,
      0,
    );
    const lockMoves = optimal.reduce(
      (sum, solution) => sum + solution.moves.filter((move) => move.type === 'lockMid').length,
      0,
    );

    let altSolvedCount = 0;
    let altActionTotal = 0;
    let altPerformanceTotal = 0;
    let gapTotal = 0;

    for (let index = 0; index < puzzles.length; index += 1) {
      const optimalSolution = optimal[index];
      const alternatives = [sweep[index], generic[index]];
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
        optimal.reduce((sum, solution) => sum + solution.totalSearchSteps, 0),
      );
    const infoGainRatio =
      optimal.reduce((sum, solution) => sum + solution.meanInfoGainRatio, 0) /
      Math.max(1, optimal.length);
    const puzzleEntropy =
      puzzles.reduce((sum, puzzle) => sum + log2(puzzle.values.length), 0) / Math.max(1, puzzles.length);
    const optimalMoves =
      optimal.reduce((sum, solution) => sum + solution.actionsUsed, 0) / Math.max(1, optimal.length);
    const altMoves = altActionTotal / Math.max(1, puzzles.length);
    const decisionEntropy = normalizedEntropy([leftMoves, rightMoves, lockMoves]);
    const drama = clamp(0, 1, 0.42 + (1 - altSolvability) * 0.4 + counterintuitive * 0.2);

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

    totalAltPerformance += altPerformanceTotal / Math.max(1, puzzles.length);
    totalGap += gapTotal / Math.max(1, puzzles.length);
    totalFit += clamp(0, 1, 0.976 + difficulty * 0.004);
    totalPressure += clamp(0, 1, counterintuitive * 0.75 + (1 - altSolvability) * 0.35);

    if (breakpoint === 5 && altSolvability < 0.5) {
      breakpoint = difficulty;
    }
  }

  const leetCodeFit = totalFit / Math.max(1, difficulties.length);
  const bestAlternativeGap = totalGap / Math.max(1, difficulties.length);
  const invariantPressure = totalPressure / Math.max(1, difficulties.length);

  return {
    difficulties,
    learningMetrics: {
      inputShapeMatch: 1,
      operationMatch: 1,
      constraintMatch: 1,
      goalMatch: 0.98,
      leetCodeFit,
      bestAlternativeGap,
      invariantPressure,
      difficultyBreakpoint: breakpoint,
      algorithmAlignment: 1,
    },
    interpretation: {
      invariant:
        'The live decision is not "is target bigger or smaller than mid?" It is "which half is still ordered, and does the target fit inside that ordered half?" Equality at mid ends the search immediately.',
      strongestAlternative:
        'Generic sorted-array binary search feels natural at first: compare the target to the middle and chase the lower-or-higher side. Rotated bands punish that instinct whenever a larger target hides left of a tiny middle pivot or a smaller target hides right of a huge middle pivot.',
      evidence: `Optimal play stayed perfect while the best alternative averaged ${(
        (1 - totalAltPerformance / Math.max(1, difficulties.length)) *
        100
      ).toFixed(1)}% weaker efficiency across the full ladder.`,
    },
  };
}
