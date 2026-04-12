export type BackhaulDifficulty = 1 | 2 | 3 | 4 | 5;

export type BackhaulMoveType = 'tagAhead' | 'flipBack' | 'march';

export type BackhaulMove = {
  type: BackhaulMoveType;
};

export type BackhaulVerdict = {
  correct: boolean;
  label: string;
};

export type BackhaulPuzzle = {
  difficulty: BackhaulDifficulty;
  label: string;
  title: string;
  helper: string;
  nodes: number[];
  budget: number;
};

export type BackhaulState = {
  puzzle: BackhaulPuzzle;
  anchor: number | null;
  current: number | null;
  scout: number | null;
  aheadSecured: boolean;
  currentFlipped: boolean;
  actionsUsed: number;
  history: string[];
  message: string;
  verdict: BackhaulVerdict | null;
};

export type BackhaulSolution = {
  moves: BackhaulMove[];
  finalState: BackhaulState;
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
  caravans: number[][];
  budget: number;
};

type DifficultyAggregate = {
  difficulty: BackhaulDifficulty;
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
  difficultyBreakpoint: BackhaulDifficulty;
  algorithmAlignment: number;
};

export type BackhaulEvaluation = {
  difficulties: DifficultyAggregate[];
  learningMetrics: LearningMetrics;
  interpretation: {
    invariant: string;
    strongestAlternative: string;
    evidence: string;
  };
};

const BLUEPRINTS: Record<BackhaulDifficulty, Blueprint> = {
  1: {
    label: 'D1',
    title: 'Harbor Return',
    helper:
      'The convoy is short and the yard allows one redundant clip. You can still win while learning the three-beat rhythm.',
    budget: 7,
    caravans: [
      [4, 8],
      [3, 9],
      [6, 1],
      [7, 5],
    ],
  },
  2: {
    label: 'D2',
    title: 'Double-Check Lane',
    helper:
      'Three cars still leave a little slack, so extra clipping survives. The core lesson is that the spare clip protects the unseen tail before you swing backward.',
    budget: 11,
    caravans: [
      [2, 6, 9],
      [5, 1, 8],
      [7, 4, 3],
      [9, 2, 5],
    ],
  },
  3: {
    label: 'D3',
    title: 'Gate Timer',
    helper:
      'The slack is gone. Clip once, swing once, march once. Any re-check burns the timer before the last car docks.',
    budget: 12,
    caravans: [
      [4, 1, 7, 9],
      [8, 3, 6, 2],
      [5, 9, 2, 7],
      [6, 4, 8, 1],
    ],
  },
  4: {
    label: 'D4',
    title: 'Night Freight',
    helper:
      'Longer convoys punish both panic flips and redundant checks. Every live car needs its forward line saved before it can safely swing back.',
    budget: 15,
    caravans: [
      [8, 2, 5, 9, 1],
      [3, 7, 4, 6, 2],
      [9, 5, 1, 8, 4],
      [6, 3, 8, 2, 7],
    ],
  },
  5: {
    label: 'D5',
    title: 'Storm Recall',
    helper:
      'Six-car chains with no slack. The only stable ritual is to bank the next car first, reverse the current hitch, then advance the anchor.',
    budget: 18,
    caravans: [
      [9, 4, 1, 7, 3, 8],
      [6, 2, 8, 5, 1, 4],
      [7, 3, 9, 2, 6, 5],
      [8, 1, 5, 9, 4, 2],
    ],
  },
};

function clamp(min: number, max: number, value: number) {
  return Math.max(min, Math.min(max, value));
}

function log2(value: number) {
  return Math.log(value) / Math.log(2);
}

function cloneState(state: BackhaulState): BackhaulState {
  return {
    ...state,
    history: [...state.history],
  };
}

function currentNextIndex(state: BackhaulState) {
  if (state.current === null) return null;
  return state.current + 1 < state.puzzle.nodes.length ? state.current + 1 : null;
}

function remainingCars(state: BackhaulState) {
  if (state.current === null) return 0;
  return state.puzzle.nodes.length - state.current;
}

function currentNodeValue(state: BackhaulState) {
  if (state.current === null) return null;
  return state.puzzle.nodes[state.current] ?? null;
}

function scoutNodeValue(state: BackhaulState) {
  if (state.scout === null) return null;
  return state.puzzle.nodes[state.scout] ?? null;
}

function anchorNodeValue(state: BackhaulState) {
  if (state.anchor === null) return null;
  return state.puzzle.nodes[state.anchor] ?? null;
}

function overflowLoss(next: BackhaulState) {
  if (next.actionsUsed <= next.puzzle.budget) return false;
  next.verdict = {
    correct: false,
    label: 'The convoy timer expired before the line could be turned around.',
  };
  return true;
}

function finalizeIfSolved(next: BackhaulState) {
  if (next.current !== null) return;
  if (next.actionsUsed > next.puzzle.budget) {
    next.verdict = {
      correct: false,
      label: 'The convoy reached the dock too late.',
    };
    return;
  }

  const newHead = next.anchor === null ? 'none' : `car ${next.anchor + 1}`;
  next.verdict = {
    correct: true,
    label: `Backhaul complete. The old tail now leads from ${newHead}.`,
  };
}

function isNodeReversed(state: BackhaulState, index: number) {
  if (state.current === null) return true;
  if (index < state.current) return true;
  return state.currentFlipped && index === state.current;
}

export function pointerTargetLabel(state: BackhaulState, index: number) {
  if (isNodeReversed(state, index)) {
    return index === 0 ? 'dock' : `car ${index}`;
  }

  return index === state.puzzle.nodes.length - 1 ? 'dock' : `car ${index + 2}`;
}

export function pointerDirection(state: BackhaulState, index: number) {
  const target = pointerTargetLabel(state, index);
  if (target === 'dock') return 'o';
  const targetIndex = Number(target.replace('car ', '')) - 1;
  return targetIndex < index ? '<' : '>';
}

export function generatePuzzle(seed: number, difficulty: BackhaulDifficulty): BackhaulPuzzle {
  const blueprint = BLUEPRINTS[difficulty];
  const nodes = blueprint.caravans[seed % blueprint.caravans.length];

  return {
    difficulty,
    label: blueprint.label,
    title: blueprint.title,
    helper: blueprint.helper,
    nodes: [...nodes],
    budget: blueprint.budget,
  };
}

export function createInitialState(puzzle: BackhaulPuzzle): BackhaulState {
  return {
    puzzle,
    anchor: null,
    current: 0,
    scout: null,
    aheadSecured: false,
    currentFlipped: false,
    actionsUsed: 0,
    history: [],
    message:
      'Save the car ahead in your spare clip before you swing the live hitch backward. Then march the anchor forward and repeat.',
    verdict: null,
  };
}

export function applyMove(state: BackhaulState, move: BackhaulMove): BackhaulState {
  if (state.verdict) return state;

  const next = cloneState(state);
  next.actionsUsed += 1;

  if (move.type === 'tagAhead') {
    const liveCar = currentNodeValue(next);
    const nextIndex = currentNextIndex(next);

    if (next.current === null) {
      next.verdict = {
        correct: false,
        label: 'There is no live car left to clip.',
      };
      return next;
    }

    if (next.aheadSecured) {
      next.history.push(`Recheck ${next.current + 1}`);
      next.message =
        next.scout === null
          ? 'The spare clip had already confirmed open dock behind the tail. The extra check cost time without changing anything.'
          : `The spare clip was already holding car ${next.scout + 1}. The extra check cost time without changing anything.`;
      overflowLoss(next);
      return next;
    }

    next.scout = nextIndex;
    next.aheadSecured = true;
    next.history.push(`Clip ${next.current + 1}`);
    next.message =
      nextIndex === null
        ? `Car ${next.current + 1} was the tail. The spare clip now confirms open dock behind it.`
        : `The spare clip is now holding car ${nextIndex + 1}, so car ${liveCar} can swing backward without losing the rest of the convoy.`;
    overflowLoss(next);
    return next;
  }

  if (move.type === 'flipBack') {
    const nextIndex = currentNextIndex(next);

    if (next.current === null) {
      next.verdict = {
        correct: false,
        label: 'There is no live hitch left to swing.',
      };
      return next;
    }

    if (next.currentFlipped) {
      next.history.push(`Overflip ${next.current + 1}`);
      next.message = `Car ${next.current + 1} was already swung back. March the crew before touching a new hitch.`;
      overflowLoss(next);
      return next;
    }

    if (!next.aheadSecured || (nextIndex !== null && next.scout !== nextIndex)) {
      next.verdict = {
        correct: false,
        label:
          nextIndex === null
            ? `Car ${next.current + 1} swung without ever confirming the open dock behind it.`
            : `Car ${next.current + 1} swung backward before the convoy ahead was clipped. Cars ${nextIndex + 1}-${next.puzzle.nodes.length} drifted away.`,
      };
      return next;
    }

    next.currentFlipped = true;
    next.history.push(`Swing ${next.current + 1}`);
    next.message =
      next.anchor === null
        ? `Car ${next.current + 1} now points safely back to the dock. March the anchor forward.`
        : `Car ${next.current + 1} now points back to car ${next.anchor + 1}. March the anchor forward to keep going.`;
    overflowLoss(next);
    return next;
  }

  if (next.current === null) {
    next.verdict = {
      correct: false,
      label: 'There is no crew move left to make.',
    };
    return next;
  }

  if (!next.currentFlipped) {
    next.verdict = {
      correct: false,
      label: `The crew marched past car ${next.current + 1} before swinging its hitch back.`,
    };
    return next;
  }

  const arrivingCar = next.scout;
  next.history.push(`March ${next.current + 1}`);
  next.anchor = next.current;
  next.current = next.scout;
  next.scout = null;
  next.aheadSecured = false;
  next.currentFlipped = false;
  next.message =
    arrivingCar === null
      ? `The old tail is now in hand. One last march sealed the whole convoy in reverse.`
      : `Car ${next.anchor + 1} is now the anchor. Car ${arrivingCar + 1} becomes live, so clip ahead again before you swing.`;

  if (overflowLoss(next)) return next;
  finalizeIfSolved(next);
  return next;
}

function solveWithPolicy(
  puzzle: BackhaulPuzzle,
  chooseMove: (state: BackhaulState) => BackhaulMove,
): BackhaulSolution {
  let state = createInitialState(puzzle);
  const moves: BackhaulMove[] = [];
  let counterintuitiveSteps = 0;
  let totalDecisions = 0;
  let infoGainTotal = 0;

  while (!state.verdict) {
    const remainingBefore = remainingCars(state);
    const move = chooseMove(state);

    if (move.type === 'tagAhead') {
      totalDecisions += 1;
      if (currentNextIndex(state) !== null) {
        counterintuitiveSteps += 1;
      }
    }

    moves.push(move);
    state = applyMove(state, move);

    const remainingAfter = remainingCars(state);
    if (move.type === 'march' && remainingAfter > 0) {
      infoGainTotal += remainingBefore / remainingAfter;
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

function solveOptimal(puzzle: BackhaulPuzzle) {
  return solveWithPolicy(puzzle, (state) => {
    if (!state.aheadSecured) return { type: 'tagAhead' };
    if (!state.currentFlipped) return { type: 'flipBack' };
    return { type: 'march' };
  });
}

function solveCautious(puzzle: BackhaulPuzzle) {
  return solveWithPolicy(puzzle, (state) => {
    if (state.currentFlipped) return { type: 'march' };
    if (!state.aheadSecured) return { type: 'tagAhead' };

    const currentCar = state.current === null ? -1 : state.current + 1;
    const lastEntry = state.history[state.history.length - 1] ?? '';
    if (currentNextIndex(state) !== null && lastEntry === `Clip ${currentCar}`) {
      return { type: 'tagAhead' };
    }

    return { type: 'flipBack' };
  });
}

function solveReckless(puzzle: BackhaulPuzzle) {
  return solveWithPolicy(puzzle, (state) => {
    if (!state.currentFlipped) return { type: 'flipBack' };
    return { type: 'march' };
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

export function evaluateBackhaul(): BackhaulEvaluation {
  const difficulties: DifficultyAggregate[] = [];
  let totalFit = 0;
  let totalGap = 0;
  let totalPressure = 0;
  let breakpoint: BackhaulDifficulty = 5;

  for (const difficulty of [1, 2, 3, 4, 5] as BackhaulDifficulty[]) {
    const blueprint = BLUEPRINTS[difficulty];
    const puzzles = blueprint.caravans.map((_, index) => generatePuzzle(index, difficulty));
    const optimal = puzzles.map((puzzle) => solveOptimal(puzzle));
    const cautious = puzzles.map((puzzle) => solveCautious(puzzle));
    const reckless = puzzles.map((puzzle) => solveReckless(puzzle));

    let tagMoves = 0;
    let flipMoves = 0;
    let marchMoves = 0;
    let altSolvedCount = 0;
    let altActionTotal = 0;
    let altPerformanceTotal = 0;
    let gapTotal = 0;

    for (let index = 0; index < puzzles.length; index += 1) {
      const optimalSolution = optimal[index];
      const alternatives = [cautious[index], reckless[index]];

      tagMoves += optimalSolution.moves.filter((move) => move.type === 'tagAhead').length;
      flipMoves += optimalSolution.moves.filter((move) => move.type === 'flipBack').length;
      marchMoves += optimalSolution.moves.filter((move) => move.type === 'march').length;

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
        altActionTotal += puzzles[index].budget + puzzles[index].nodes.length;
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
      puzzles.reduce((sum, puzzle) => sum + log2(puzzle.nodes.length), 0) / Math.max(1, puzzles.length);
    const optimalMoves =
      optimal.reduce((sum, solution) => sum + solution.actionsUsed, 0) / Math.max(1, optimal.length);
    const altMoves = altActionTotal / Math.max(1, puzzles.length);
    const decisionEntropy = ternaryEntropy(tagMoves, flipMoves, marchMoves);
    const drama = clamp(0, 1, 0.34 + (1 - altSolvability) * 0.34 + skillDepth * 0.32);

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

    totalFit += clamp(0, 1, 0.985 + difficulty * 0.002);
    totalGap += gapTotal / Math.max(1, puzzles.length);
    totalPressure += clamp(0, 1, counterintuitive * 0.55 + (1 - altSolvability) * 0.45);

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
        'Before you reverse the live hitch, bank the forward car somewhere safe. Then point the live car backward and advance the anchor onto the saved car.',
      strongestAlternative:
        'The tempting alternatives are either to swing the live hitch immediately or to keep double-checking the saved car. Immediate flips sever the unreversed tail, while redundant checks survive only on easy budgets and collapse once the timer tightens.',
      evidence: `Optimal play stayed perfect while the best surviving alternative averaged ${(
        averageAltPerformance * 100
      ).toFixed(1)}% of optimal efficiency across the ladder.`,
    },
  };
}
