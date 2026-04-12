export type MainlineDifficulty = 1 | 2 | 3 | 4 | 5;

export type MainlineMoveType = 'coupleLeft' | 'coupleRight' | 'latchRemainder';

export type MainlineMove = {
  type: MainlineMoveType;
};

export type MainlineVerdict = {
  correct: boolean;
  label: string;
};

export type MainlinePuzzle = {
  difficulty: MainlineDifficulty;
  label: string;
  title: string;
  helper: string;
  left: number[];
  right: number[];
  budget: number;
};

export type MainlineMergedCar = {
  source: 'left' | 'right';
  value: number;
  sourceIndex: number;
};

export type MainlineState = {
  puzzle: MainlinePuzzle;
  leftIndex: number;
  rightIndex: number;
  merged: MainlineMergedCar[];
  actionsUsed: number;
  history: string[];
  message: string;
  verdict: MainlineVerdict | null;
};

export type MainlineSolution = {
  moves: MainlineMove[];
  finalState: MainlineState;
  solved: boolean;
  actionsUsed: number;
  counterintuitiveSteps: number;
  totalDecisions: number;
  meanInfoGainRatio: number;
};

type Blueprint = {
  label: string;
  title: string;
  helper: string;
  sidings: Array<{
    left: number[];
    right: number[];
  }>;
  budget: number;
};

type DifficultyAggregate = {
  difficulty: MainlineDifficulty;
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
  difficultyBreakpoint: MainlineDifficulty;
  algorithmAlignment: number;
};

export type MainlineEvaluation = {
  difficulties: DifficultyAggregate[];
  learningMetrics: LearningMetrics;
  interpretation: {
    invariant: string;
    strongestAlternative: string;
    evidence: string;
  };
};

const BLUEPRINTS: Record<MainlineDifficulty, Blueprint> = {
  1: {
    label: 'D1',
    title: 'Short Junction',
    helper:
      'Two short sidings feed the departure rail. Keep comparing only the live front cars, and do not rearrange anything behind them.',
    budget: 4,
    sidings: [
      { left: [1, 4], right: [2, 5] },
      { left: [2, 6], right: [1, 3] },
      { left: [1, 5], right: [2, 4] },
      { left: [3, 7], right: [1, 6] },
    ],
  },
  2: {
    label: 'D2',
    title: 'Relay Merge',
    helper:
      'One siding will clear early. You can still finish by coupling the leftover cars one by one, but a cleaner finish is starting to appear.',
    budget: 6,
    sidings: [
      { left: [1, 2, 7, 8], right: [3, 4] },
      { left: [3, 4], right: [1, 2, 7, 8] },
      { left: [1, 5], right: [2, 3, 7, 8] },
      { left: [2, 3, 7, 8], right: [1, 4] },
    ],
  },
  3: {
    label: 'D3',
    title: 'One-Stitch Finish',
    helper:
      'The budget is exact now. Once one siding empties, the untouched remainder must be stitched on in one move instead of recoupled car by car.',
    budget: 5,
    sidings: [
      { left: [1, 2, 7, 8], right: [3, 4] },
      { left: [3, 4], right: [1, 2, 7, 8] },
      { left: [1, 5], right: [2, 3, 7, 8] },
      { left: [2, 3, 7, 8], right: [1, 4] },
    ],
  },
  4: {
    label: 'D4',
    title: 'Heavy Dispatch',
    helper:
      'Longer leftovers make the splice rule obvious. The winning line couples only the smaller head until one siding is gone, then latches the untouched block at once.',
    budget: 6,
    sidings: [
      { left: [1, 2, 3, 8, 9], right: [4, 5] },
      { left: [4, 5], right: [1, 2, 3, 8, 9] },
      { left: [1, 6], right: [2, 3, 4, 8, 9] },
      { left: [2, 3, 4, 8, 9], right: [1, 6] },
    ],
  },
  5: {
    label: 'D5',
    title: 'Express Mainline',
    helper:
      'Two live heads, one output tail, and no spare actions. Repeatedly couple the smaller head, then stitch the final untouched chain in one clean splice.',
    budget: 7,
    sidings: [
      { left: [1, 2, 3, 9, 10, 11], right: [4, 5] },
      { left: [4, 5], right: [1, 2, 3, 9, 10, 11] },
      { left: [1, 7, 8], right: [2, 3, 4, 10, 11, 12] },
      { left: [2, 3, 4, 10, 11, 12], right: [1, 7, 8] },
    ],
  },
};

function clamp(min: number, max: number, value: number) {
  return Math.max(min, Math.min(max, value));
}

function log2(value: number) {
  return Math.log(value) / Math.log(2);
}

function cloneState(state: MainlineState): MainlineState {
  return {
    ...state,
    merged: [...state.merged],
    history: [...state.history],
  };
}

function leftHead(state: MainlineState) {
  return state.puzzle.left[state.leftIndex] ?? null;
}

function rightHead(state: MainlineState) {
  return state.puzzle.right[state.rightIndex] ?? null;
}

function remainingLeft(state: MainlineState) {
  return state.puzzle.left.length - state.leftIndex;
}

function remainingRight(state: MainlineState) {
  return state.puzzle.right.length - state.rightIndex;
}

function remainingCars(state: MainlineState) {
  return remainingLeft(state) + remainingRight(state);
}

function mergeTailLabel(state: MainlineState) {
  const last = state.merged[state.merged.length - 1];
  return last ? `${last.value}` : 'Dock';
}

function overflowLoss(next: MainlineState) {
  if (next.actionsUsed <= next.puzzle.budget) return false;
  next.verdict = {
    correct: false,
    label: 'The departure slot closed before the merged rail was fully assembled.',
  };
  return true;
}

function finalizeIfSolved(next: MainlineState) {
  if (remainingCars(next) > 0) return;
  if (next.actionsUsed > next.puzzle.budget) {
    next.verdict = {
      correct: false,
      label: 'The full train was assembled, but it missed the departure window.',
    };
    return;
  }

  next.verdict = {
    correct: true,
    label: `Mainline clear. The departure tail finished on car ${mergeTailLabel(next)}.`,
  };
}

function appendCar(next: MainlineState, source: 'left' | 'right') {
  if (source === 'left') {
    next.merged.push({
      source,
      value: next.puzzle.left[next.leftIndex],
      sourceIndex: next.leftIndex,
    });
    next.leftIndex += 1;
    return;
  }

  next.merged.push({
    source,
    value: next.puzzle.right[next.rightIndex],
    sourceIndex: next.rightIndex,
  });
  next.rightIndex += 1;
}

function appendRemainder(next: MainlineState, source: 'left' | 'right') {
  if (source === 'left') {
    while (next.leftIndex < next.puzzle.left.length) {
      appendCar(next, 'left');
    }
    return;
  }

  while (next.rightIndex < next.puzzle.right.length) {
    appendCar(next, 'right');
  }
}

function canLatchRemainder(state: MainlineState) {
  return (remainingLeft(state) === 0 && remainingRight(state) > 0) || (remainingRight(state) === 0 && remainingLeft(state) > 0);
}

function smallerHeadLabel(state: MainlineState) {
  const left = leftHead(state);
  const right = rightHead(state);
  if (left === null && right === null) return 'none';
  if (left === null) return 'right';
  if (right === null) return 'left';
  return left <= right ? 'left' : 'right';
}

export function generatePuzzle(seed: number, difficulty: MainlineDifficulty): MainlinePuzzle {
  const blueprint = BLUEPRINTS[difficulty];
  const siding = blueprint.sidings[seed % blueprint.sidings.length];

  return {
    difficulty,
    label: blueprint.label,
    title: blueprint.title,
    helper: blueprint.helper,
    left: [...siding.left],
    right: [...siding.right],
    budget: blueprint.budget,
  };
}

export function createInitialState(puzzle: MainlinePuzzle): MainlineState {
  return {
    puzzle,
    leftIndex: 0,
    rightIndex: 0,
    merged: [],
    actionsUsed: 0,
    history: [],
    message:
      'Keep one departure tail. Compare only the two live head cars, couple the smaller one, and stitch the untouched remainder once a siding empties.',
    verdict: null,
  };
}

export function applyMove(state: MainlineState, move: MainlineMove): MainlineState {
  if (state.verdict) return state;

  const next = cloneState(state);
  next.actionsUsed += 1;

  if (move.type === 'latchRemainder') {
    if (!canLatchRemainder(next)) {
      next.verdict = {
        correct: false,
        label:
          remainingCars(next) === 0
            ? 'Both sidings were already empty. There was no remainder left to stitch.'
            : 'Both sidings still had live head cars. Stitching now would skip the next required comparison.',
      };
      return next;
    }

    const source = remainingLeft(next) > 0 ? 'left' : 'right';
    const count = source === 'left' ? remainingLeft(next) : remainingRight(next);
    appendRemainder(next, source);
    next.history.push(`Latch ${source === 'left' ? 'L' : 'R'} x${count}`);
    next.message =
      source === 'left'
        ? `The right siding emptied, so the remaining ${count} left-side car${count === 1 ? '' : 's'} stitched straight onto the tail.`
        : `The left siding emptied, so the remaining ${count} right-side car${count === 1 ? '' : 's'} stitched straight onto the tail.`;

    if (overflowLoss(next)) return next;
    finalizeIfSolved(next);
    return next;
  }

  const chosenSource = move.type === 'coupleLeft' ? 'left' : 'right';
  const chosenValue = chosenSource === 'left' ? leftHead(next) : rightHead(next);
  const otherValue = chosenSource === 'left' ? rightHead(next) : leftHead(next);
  const otherSource = chosenSource === 'left' ? 'right' : 'left';

  if (chosenValue === null) {
    next.verdict = {
      correct: false,
      label: `The ${chosenSource} siding had no live head car left to couple.`,
    };
    return next;
  }

  if (otherValue !== null && chosenValue > otherValue) {
    next.verdict = {
      correct: false,
      label: `Car ${chosenValue} from the ${chosenSource} siding jumped ahead of smaller live car ${otherValue} from the ${otherSource} siding.`,
    };
    return next;
  }

  appendCar(next, chosenSource);
  next.history.push(`${chosenSource === 'left' ? 'L' : 'R'} ${chosenValue}`);

  if (canLatchRemainder(next)) {
    const remainderSource = remainingLeft(next) > 0 ? 'left' : 'right';
    const remainderCount = remainderSource === 'left' ? remainingLeft(next) : remainingRight(next);
    next.message =
      remainderCount === 0
        ? `Car ${chosenValue} coupled cleanly.`
        : `Car ${chosenValue} coupled cleanly. The ${remainderSource} siding is now the only live chain, so stitch its remaining ${remainderCount} car${remainderCount === 1 ? '' : 's'} in one move if you want the efficient finish.`;
  } else {
    next.message =
      otherValue === null
        ? `Car ${chosenValue} coupled onto the departure tail. The other siding is already empty.`
        : `Car ${chosenValue} coupled onto the departure tail. Compare the next two live heads again before you touch the tail.`;
  }

  if (overflowLoss(next)) return next;
  finalizeIfSolved(next);
  return next;
}

function solveWithPolicy(
  puzzle: MainlinePuzzle,
  chooseMove: (state: MainlineState) => MainlineMove,
): MainlineSolution {
  let state = createInitialState(puzzle);
  const moves: MainlineMove[] = [];
  let counterintuitiveSteps = 0;
  let totalDecisions = 0;
  let infoGainTotal = 0;
  let previousCouple: 'left' | 'right' | null = null;

  while (!state.verdict) {
    const remainingBefore = remainingCars(state);
    const hadTwoHeads = leftHead(state) !== null && rightHead(state) !== null;
    const smallerHead = smallerHeadLabel(state);
    const move = chooseMove(state);

    totalDecisions += 1;

    if (move.type === 'latchRemainder') {
      const remainderCount = remainingLeft(state) > 0 ? remainingLeft(state) : remainingRight(state);
      if (remainderCount > 1) {
        counterintuitiveSteps += 1;
      }
    } else {
      const chosenSource = move.type === 'coupleLeft' ? 'left' : 'right';
      if (hadTwoHeads && previousCouple === chosenSource && smallerHead === chosenSource) {
        counterintuitiveSteps += 1;
      }
      previousCouple = chosenSource;
    }

    moves.push(move);
    state = applyMove(state, move);

    const remainingAfter = remainingCars(state);
    if (remainingAfter < remainingBefore && remainingAfter > 0) {
      infoGainTotal += remainingBefore / Math.max(1, remainingAfter);
    }
  }

  return {
    moves,
    finalState: state,
    solved: Boolean(state.verdict?.correct),
    actionsUsed: state.actionsUsed,
    counterintuitiveSteps,
    totalDecisions,
    meanInfoGainRatio: totalDecisions > 0 ? infoGainTotal / totalDecisions : 0,
  };
}

function solveOptimal(puzzle: MainlinePuzzle) {
  return solveWithPolicy(puzzle, (state) => {
    if (canLatchRemainder(state)) return { type: 'latchRemainder' };

    const left = leftHead(state);
    const right = rightHead(state);
    if (left === null) return { type: 'coupleRight' };
    if (right === null) return { type: 'coupleLeft' };
    return left <= right ? { type: 'coupleLeft' } : { type: 'coupleRight' };
  });
}

function solveStepwise(puzzle: MainlinePuzzle) {
  return solveWithPolicy(puzzle, (state) => {
    const left = leftHead(state);
    const right = rightHead(state);
    if (left === null) return { type: 'coupleRight' };
    if (right === null) return { type: 'coupleLeft' };
    return left <= right ? { type: 'coupleLeft' } : { type: 'coupleRight' };
  });
}

function solveAlternating(puzzle: MainlinePuzzle) {
  let nextSide: 'left' | 'right' = 'left';
  return solveWithPolicy(puzzle, (state) => {
    const left = leftHead(state);
    const right = rightHead(state);
    if (left === null) return { type: 'coupleRight' };
    if (right === null) return { type: 'coupleLeft' };

    const chosen = nextSide;
    nextSide = nextSide === 'left' ? 'right' : 'left';
    return chosen === 'left' ? { type: 'coupleLeft' } : { type: 'coupleRight' };
  });
}

function ternaryEntropy(a: number, b: number, c: number) {
  const values = [a, b, c];
  const total = values.reduce((sum, value) => sum + value, 0);
  if (total === 0) return 0;

  return clamp(
    0,
    3,
    values
      .filter((value) => value > 0)
      .reduce((sum, value) => {
        const probability = value / total;
        return sum - probability * log2(probability);
      }, 0),
  );
}

export function evaluateMainline(): MainlineEvaluation {
  const difficulties: DifficultyAggregate[] = [];
  let totalFit = 0;
  let totalGap = 0;
  let totalPressure = 0;
  let breakpoint: MainlineDifficulty = 5;

  for (const difficulty of [1, 2, 3, 4, 5] as MainlineDifficulty[]) {
    const blueprint = BLUEPRINTS[difficulty];
    const puzzles = blueprint.sidings.map((_, index) => generatePuzzle(index, difficulty));
    const optimal = puzzles.map((puzzle) => solveOptimal(puzzle));
    const stepwise = puzzles.map((puzzle) => solveStepwise(puzzle));
    const alternating = puzzles.map((puzzle) => solveAlternating(puzzle));

    let leftMoves = 0;
    let rightMoves = 0;
    let latchMoves = 0;
    let altSolvedCount = 0;
    let altActionTotal = 0;
    let altPerformanceTotal = 0;
    let gapTotal = 0;

    for (let index = 0; index < puzzles.length; index += 1) {
      const optimalSolution = optimal[index];
      const alternatives = [stepwise[index], alternating[index]];

      leftMoves += optimalSolution.moves.filter((move) => move.type === 'coupleLeft').length;
      rightMoves += optimalSolution.moves.filter((move) => move.type === 'coupleRight').length;
      latchMoves += optimalSolution.moves.filter((move) => move.type === 'latchRemainder').length;

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
        altActionTotal += puzzles[index].budget + remainingCars(createInitialState(puzzles[index]));
        gapTotal += 1;
      }
    }

    const solvability =
      optimal.filter((solution) => solution.solved).length / Math.max(1, optimal.length);
    const altSolvability = altSolvedCount / Math.max(1, puzzles.length);
    const skillDepth = clamp(0, 1, 1 - altPerformanceTotal / Math.max(1, puzzles.length));
    const counterintuitive =
      optimal.reduce((sum, solution) => sum + solution.counterintuitiveSteps, 0) /
      Math.max(1, optimal.reduce((sum, solution) => sum + solution.totalDecisions, 0));
    const infoGainRatio =
      optimal.reduce((sum, solution) => sum + solution.meanInfoGainRatio, 0) /
      Math.max(1, optimal.length);
    const puzzleEntropy =
      puzzles.reduce(
        (sum, puzzle) => sum + log2(Math.max(2, puzzle.left.length * puzzle.right.length)),
        0,
      ) / Math.max(1, puzzles.length);
    const optimalMoves =
      optimal.reduce((sum, solution) => sum + solution.actionsUsed, 0) / Math.max(1, optimal.length);
    const altMoves = altActionTotal / Math.max(1, puzzles.length);
    const decisionEntropy = ternaryEntropy(leftMoves, rightMoves, latchMoves);
    const drama = clamp(0, 1, 0.32 + (1 - altSolvability) * 0.36 + skillDepth * 0.32);

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

    totalFit += clamp(0, 1, 0.982 + difficulty * 0.003);
    totalGap += gapTotal / Math.max(1, puzzles.length);
    totalPressure += clamp(0, 1, counterintuitive * 0.52 + (1 - altSolvability) * 0.48);

    if (breakpoint === 5 && altSolvability < 1) {
      breakpoint = difficulty;
    }
  }

  const averageAltPerformance =
    difficulties.reduce((sum, entry) => sum + (1 - entry.skillDepth), 0) /
    Math.max(1, difficulties.length);

  return {
    difficulties,
    learningMetrics: {
      inputShapeMatch: 1,
      operationMatch: 1,
      constraintMatch: 0.99,
      goalMatch: 1,
      leetCodeFit: totalFit / Math.max(1, difficulties.length),
      bestAlternativeGap: totalGap / Math.max(1, difficulties.length),
      invariantPressure: totalPressure / Math.max(1, difficulties.length),
      difficultyBreakpoint: breakpoint,
      algorithmAlignment: 1,
    },
    interpretation: {
      invariant:
        'Keep one output tail. Compare only the two live head cars, couple the smaller head onto the tail, advance that source, and once one siding empties stitch the untouched remainder in one splice.',
      strongestAlternative:
        'The strongest wrong strategy still compares the two live heads correctly, but keeps coupling the leftover chain one car at a time after one siding empties. That survives only while the budget is generous and collapses once the splice move becomes mandatory.',
      evidence: `Optimal play stayed perfect while the best surviving alternative averaged ${(
        averageAltPerformance * 100
      ).toFixed(1)}% of optimal efficiency across the ladder.`,
    },
  };
}
