export type TowlineDifficulty = 1 | 2 | 3 | 4 | 5;

export type TowlineMoveType =
  | 'scoutAhead'
  | 'deckhandAhead'
  | 'towBoth'
  | 'cutNext';

export type TowlineMove = {
  type: TowlineMoveType;
};

export type TowlineVerdict = {
  correct: boolean;
  label: string;
};

export type TowlinePuzzle = {
  difficulty: TowlineDifficulty;
  label: string;
  title: string;
  helper: string;
  barges: number[];
  removeFromEnd: number;
  budget: number;
};

export type TowlineState = {
  puzzle: TowlinePuzzle;
  scout: number;
  deckhand: number;
  removedIndex: number | null;
  actionsUsed: number;
  history: string[];
  message: string;
  verdict: TowlineVerdict | null;
};

export type TowlineSolution = {
  moves: TowlineMove[];
  finalState: TowlineState;
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
  budget: number;
  routes: Array<{
    barges: number[];
    removeFromEnd: number;
  }>;
};

type DifficultyAggregate = {
  difficulty: TowlineDifficulty;
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
  difficultyBreakpoint: TowlineDifficulty;
  algorithmAlignment: number;
};

export type TowlineEvaluation = {
  difficulties: DifficultyAggregate[];
  learningMetrics: LearningMetrics;
  interpretation: {
    invariant: string;
    strongestAlternative: string;
    evidence: string;
  };
};

const BLUEPRINTS: Record<TowlineDifficulty, Blueprint> = {
  1: {
    label: 'D1',
    title: 'Harbor Trim',
    helper:
      'Short towlines leave enough slack to count the whole chain first, but the cleaner win already starts with the scout one extra step ahead from the dock.',
    budget: 7,
    routes: [
      { barges: [4, 9, 2], removeFromEnd: 1 },
      { barges: [6, 1, 8], removeFromEnd: 2 },
      { barges: [3, 7, 5], removeFromEnd: 1 },
      { barges: [8, 2, 6], removeFromEnd: 2 },
    ],
  },
  2: {
    label: 'D2',
    title: 'Spare Wake',
    helper:
      'Four-barge chains still permit a full stern recount, but the one-pass tow is clearly lighter once the scout is primed to the exact gap.',
    budget: 8,
    routes: [
      { barges: [5, 1, 8, 3], removeFromEnd: 2 },
      { barges: [7, 4, 2, 9], removeFromEnd: 3 },
      { barges: [6, 2, 7, 1], removeFromEnd: 2 },
      { barges: [8, 3, 5, 4], removeFromEnd: 3 },
    ],
  },
  3: {
    label: 'D3',
    title: 'Exact Tow',
    helper:
      'The spare wake is gone. Prime the scout to an exact n+1 gap from the dock, tow both hands together, and cut only after the scout clears open water.',
    budget: 7,
    routes: [
      { barges: [4, 8, 2, 7, 1], removeFromEnd: 2 },
      { barges: [6, 1, 9, 3, 5], removeFromEnd: 3 },
      { barges: [7, 2, 8, 4, 6], removeFromEnd: 4 },
      { barges: [5, 9, 1, 8, 3], removeFromEnd: 2 },
    ],
  },
  4: {
    label: 'D4',
    title: 'Tight Channel',
    helper:
      'Longer chains make the slower stern recount collapse. Only the fixed-gap tow keeps the cutter parked just before the rope that needs to go.',
    budget: 8,
    routes: [
      { barges: [8, 3, 6, 1, 7, 2], removeFromEnd: 2 },
      { barges: [5, 9, 2, 8, 1, 6], removeFromEnd: 3 },
      { barges: [7, 1, 8, 4, 9, 3], removeFromEnd: 4 },
      { barges: [6, 2, 7, 5, 8, 1], removeFromEnd: 5 },
    ],
  },
  5: {
    label: 'D5',
    title: 'Towline Gate',
    helper:
      'One route now asks for the head rope itself. The dummy dock still counts as real space in the scout gap, so the same ritual survives even when the first barge must go.',
    budget: 9,
    routes: [
      { barges: [9, 3, 7, 1, 8, 2, 6], removeFromEnd: 2 },
      { barges: [6, 1, 8, 4, 9, 3, 5], removeFromEnd: 4 },
      { barges: [7, 2, 9, 5, 8, 1, 4], removeFromEnd: 6 },
      { barges: [8, 4, 7, 2, 9, 3, 6], removeFromEnd: 7 },
    ],
  },
};

function clamp(min: number, max: number, value: number) {
  return Math.max(min, Math.min(max, value));
}

function log2(value: number) {
  return Math.log(value) / Math.log(2);
}

function cloneState(state: TowlineState): TowlineState {
  return {
    ...state,
    history: [...state.history],
  };
}

function lineEnd(state: TowlineState) {
  return state.puzzle.barges.length;
}

function gapNeeded(state: TowlineState) {
  return state.puzzle.removeFromEnd + 1;
}

function currentGap(state: TowlineState) {
  return state.scout - state.deckhand;
}

function expectedRemovedIndex(state: TowlineState) {
  return state.puzzle.barges.length - state.puzzle.removeFromEnd;
}

export function ordinal(value: number) {
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${value}th`;
  const mod10 = value % 10;
  if (mod10 === 1) return `${value}st`;
  if (mod10 === 2) return `${value}nd`;
  if (mod10 === 3) return `${value}rd`;
  return `${value}th`;
}

export function positionLabel(puzzle: TowlinePuzzle, position: number) {
  if (position < 0) return 'Dock';
  if (position >= puzzle.barges.length) return 'Clear';
  return `${puzzle.barges[position]}`;
}

export function positionMeta(puzzle: TowlinePuzzle, position: number) {
  if (position < 0) return 'before the head rope';
  if (position >= puzzle.barges.length) return 'past the stern rope';
  return `barge ${position + 1}`;
}

export function canTowBoth(state: TowlineState) {
  return state.removedIndex === null && state.scout < lineEnd(state) && currentGap(state) === gapNeeded(state);
}

function canCutNext(state: TowlineState) {
  return state.removedIndex === null && state.scout === lineEnd(state) && state.deckhand < lineEnd(state) - 1;
}

function legalMoves(state: TowlineState): TowlineMoveType[] {
  if (state.verdict) return [];

  const moves: TowlineMoveType[] = [];
  if (state.scout < lineEnd(state)) moves.push('scoutAhead');
  if (state.deckhand < lineEnd(state) - 1) moves.push('deckhandAhead');
  if (canTowBoth(state)) moves.push('towBoth');
  if (canCutNext(state)) moves.push('cutNext');
  return moves;
}

function overflowLoss(next: TowlineState) {
  if (next.actionsUsed <= next.puzzle.budget) return false;
  next.verdict = {
    correct: false,
    label: 'The harbor gate closed before the rope was cut cleanly.',
  };
  return true;
}

function filteredTowline(state: TowlineState) {
  return state.puzzle.barges.filter((_, index) => index !== state.removedIndex);
}

export function generatePuzzle(seed: number, difficulty: TowlineDifficulty): TowlinePuzzle {
  const blueprint = BLUEPRINTS[difficulty];
  const route = blueprint.routes[seed % blueprint.routes.length];

  return {
    difficulty,
    label: blueprint.label,
    title: blueprint.title,
    helper: blueprint.helper,
    barges: [...route.barges],
    removeFromEnd: route.removeFromEnd,
    budget: blueprint.budget,
  };
}

export function createInitialState(puzzle: TowlinePuzzle): TowlineState {
  const neededGap = puzzle.removeFromEnd + 1;
  return {
    puzzle,
    scout: -1,
    deckhand: -1,
    removedIndex: null,
    actionsUsed: 0,
    history: [],
    message:
      `Remove the ${ordinal(puzzle.removeFromEnd)} barge from the stern. The dock counts as real space, so the clean tow starts by sending the scout ${neededGap} links ahead from the dock before both hands march together.`,
    verdict: null,
  };
}

function fail(next: TowlineState, label: string) {
  next.verdict = {
    correct: false,
    label,
  };
  return next;
}

export function applyMove(state: TowlineState, move: TowlineMove): TowlineState {
  if (state.verdict) return state;

  const next = cloneState(state);
  next.actionsUsed += 1;

  if (move.type === 'scoutAhead') {
    if (next.scout >= lineEnd(next)) {
      return fail(next, 'The scout was already past the stern rope.');
    }

    next.scout += 1;
    next.history.push(`Scout ${positionLabel(next.puzzle, next.scout)}`);
    next.message =
      next.scout === lineEnd(next)
        ? 'The scout cleared the stern. If the cutter is parked just before the right rope, cut next.'
        : `Scout now at ${positionMeta(next.puzzle, next.scout)}. Gap is ${currentGap(next)}; target gap is ${gapNeeded(next)}.`;

    overflowLoss(next);
    return next;
  }

  if (move.type === 'deckhandAhead') {
    if (next.deckhand >= lineEnd(next) - 1) {
      return fail(next, 'The cutter was already at the stern rope.');
    }

    next.deckhand += 1;
    next.history.push(`Deckhand ${positionLabel(next.puzzle, next.deckhand)}`);
    next.message =
      next.deckhand < 0
        ? 'The cutter is still at the dock.'
        : `Deckhand now at ${positionMeta(next.puzzle, next.deckhand)}. If you are doing this after a full recount, the scout should already be clear.`;

    overflowLoss(next);
    return next;
  }

  if (move.type === 'towBoth') {
    if (next.scout >= lineEnd(next)) {
      return fail(next, 'The scout was already clear; there was no tow left to make.');
    }

    if (currentGap(next) !== gapNeeded(next)) {
      return fail(
        next,
        `The towline gap was ${currentGap(next)}, but it had to be exactly ${gapNeeded(next)} before both hands marched together.`,
      );
    }

    next.scout += 1;
    next.deckhand += 1;
    next.history.push(`Tow ${positionLabel(next.puzzle, next.deckhand)} / ${positionLabel(next.puzzle, next.scout)}`);
    next.message =
      next.scout === lineEnd(next)
        ? 'The scout just cleared open water. The cutter now sits immediately before the rope to cut.'
        : `Both hands marched one rope forward. The tow gap stayed locked at ${gapNeeded(next)}.`;

    overflowLoss(next);
    return next;
  }

  if (move.type === 'cutNext') {
    if (next.scout !== lineEnd(next)) {
      return fail(next, 'Cutting early is blind. Let the scout clear the stern first.');
    }

    if (next.deckhand >= lineEnd(next) - 1) {
      return fail(next, 'There was no rope after the cutter to cut.');
    }

    next.removedIndex = next.deckhand + 1;
    next.history.push(`Cut ${positionLabel(next.puzzle, next.removedIndex)}`);

    if (overflowLoss(next)) return next;

    const target = expectedRemovedIndex(next);
    if (next.removedIndex !== target) {
      return fail(
        next,
        `The cutter was parked before barge ${next.deckhand + 1}, so the wrong rope came loose.`,
      );
    }

    next.verdict = {
      correct: true,
      label: `Towline clear. The chain now reads ${filteredTowline(next).join(' -> ')}.`,
    };
    next.message = 'The scout cleared the stern exactly when the cutter reached the predecessor rope. That is the whole one-pass trick.';
    return next;
  }

  return next;
}

function simulate(
  puzzle: TowlinePuzzle,
  plan: TowlineMove[],
  counterintuitive: (state: TowlineState, move: TowlineMove, legal: TowlineMoveType[]) => boolean,
) {
  let state = createInitialState(puzzle);
  let counterintuitiveSteps = 0;
  let entropySum = 0;
  let infoGainSum = 0;
  let decisionCount = 0;

  for (const move of plan) {
    const legal = legalMoves(state);
    if (legal.length > 0) {
      entropySum += log2(legal.length);
      infoGainSum += 5 / legal.length;
      decisionCount += 1;
      if (counterintuitive(state, move, legal)) {
        counterintuitiveSteps += 1;
      }
    }

    state = applyMove(state, move);
    if (state.verdict) break;
  }

  return {
    state,
    counterintuitiveSteps,
    totalDecisions: decisionCount,
    decisionEntropy: decisionCount === 0 ? 0 : entropySum / decisionCount,
    meanInfoGainRatio: decisionCount === 0 ? 0 : infoGainSum / decisionCount,
  };
}

function isCounterintuitiveStep(state: TowlineState, move: TowlineMove, legal: TowlineMoveType[]) {
  if (move.type === 'scoutAhead' && currentGap(state) === state.puzzle.removeFromEnd) {
    return true;
  }

  if (move.type === 'towBoth' && legal.includes('deckhandAhead')) {
    return true;
  }

  if (move.type === 'cutNext' && state.deckhand < 0) {
    return true;
  }

  return false;
}

export function solveOptimal(puzzle: TowlinePuzzle): TowlineSolution {
  const moves: TowlineMove[] = [];

  for (let step = 0; step < puzzle.removeFromEnd + 1; step += 1) {
    moves.push({ type: 'scoutAhead' });
  }

  for (let step = 0; step < puzzle.barges.length - puzzle.removeFromEnd; step += 1) {
    moves.push({ type: 'towBoth' });
  }

  moves.push({ type: 'cutNext' });

  const result = simulate(puzzle, moves, isCounterintuitiveStep);
  return {
    moves,
    finalState: result.state,
    solved: result.state.verdict?.correct ?? false,
    actionsUsed: result.state.actionsUsed,
    counterintuitiveSteps: result.counterintuitiveSteps,
    totalDecisions: result.totalDecisions,
    meanInfoGainRatio: result.meanInfoGainRatio,
  };
}

export function solveRecount(puzzle: TowlinePuzzle): TowlineSolution {
  const moves: TowlineMove[] = [];

  for (let step = 0; step < puzzle.barges.length + 1; step += 1) {
    moves.push({ type: 'scoutAhead' });
  }

  for (let step = 0; step < puzzle.barges.length - puzzle.removeFromEnd; step += 1) {
    moves.push({ type: 'deckhandAhead' });
  }

  moves.push({ type: 'cutNext' });

  const result = simulate(puzzle, moves, isCounterintuitiveStep);
  return {
    moves,
    finalState: result.state,
    solved: result.state.verdict?.correct ?? false,
    actionsUsed: result.state.actionsUsed,
    counterintuitiveSteps: result.counterintuitiveSteps,
    totalDecisions: result.totalDecisions,
    meanInfoGainRatio: result.meanInfoGainRatio,
  };
}

export function solveShortGap(puzzle: TowlinePuzzle): TowlineSolution {
  const moves: TowlineMove[] = [];

  for (let step = 0; step < puzzle.removeFromEnd; step += 1) {
    moves.push({ type: 'scoutAhead' });
  }

  for (let step = 0; step < puzzle.barges.length - puzzle.removeFromEnd + 1; step += 1) {
    moves.push({ type: 'scoutAhead' });
    moves.push({ type: 'deckhandAhead' });
  }

  moves.push({ type: 'cutNext' });

  const result = simulate(puzzle, moves, isCounterintuitiveStep);
  return {
    moves,
    finalState: result.state,
    solved: result.state.verdict?.correct ?? false,
    actionsUsed: result.state.actionsUsed,
    counterintuitiveSteps: result.counterintuitiveSteps,
    totalDecisions: result.totalDecisions,
    meanInfoGainRatio: result.meanInfoGainRatio,
  };
}

export function evaluateTowline(): TowlineEvaluation {
  const difficulties: DifficultyAggregate[] = [];
  let totalGap = 0;
  let totalPressure = 0;
  let breakpoint: TowlineDifficulty = 5;

  for (const difficulty of [1, 2, 3, 4, 5] as TowlineDifficulty[]) {
    const blueprint = BLUEPRINTS[difficulty];
    const puzzles = blueprint.routes.map((_, index) => generatePuzzle(index, difficulty));
    const optimal = puzzles.map((puzzle) => solveOptimal(puzzle));
    const recount = puzzles.map((puzzle) => solveRecount(puzzle));
    const shortGap = puzzles.map((puzzle) => solveShortGap(puzzle));

    const optimalActions = optimal.reduce((sum, solution) => sum + solution.actionsUsed, 0) / puzzles.length;
    const recountActions = recount.reduce((sum, solution) => sum + solution.actionsUsed, 0) / puzzles.length;
    const recountSolveRate =
      recount.filter((solution) => solution.solved).length / Math.max(1, recount.length);

    const gap =
      recount.reduce((sum, solution, index) => {
        if (!solution.solved) return sum + 1;
        return sum + (1 - optimal[index].actionsUsed / solution.actionsUsed);
      }, 0) / puzzles.length;

    const pressure =
      shortGap.reduce((sum, solution, index) => {
        if (!solution.solved) return sum + 1;
        return sum + (1 - optimal[index].actionsUsed / solution.actionsUsed);
      }, 0) / puzzles.length;

    totalGap += gap;
    totalPressure += pressure;

    if (breakpoint === 5 && (recountSolveRate < 1 || gap > 0.5)) {
      breakpoint = difficulty;
    }

    difficulties.push({
      difficulty,
      label: blueprint.label,
      budget: blueprint.budget,
      solvability: 1,
      puzzleEntropy:
        optimal.reduce((sum, solution) => sum + solution.moves.length * log2(4), 0) / puzzles.length,
      skillDepth: clamp(0, 1, gap),
      decisionEntropy:
        optimal.reduce((sum, solution) => sum + (solution.totalDecisions === 0 ? 0 : solution.totalDecisions), 0) /
        puzzles.length /
        Math.max(1, optimalActions),
      counterintuitive:
        optimal.reduce((sum, solution) => sum + solution.counterintuitiveSteps, 0) / puzzles.length,
      drama: clamp(0, 1, (recountActions - optimalActions) / blueprint.budget),
      infoGainRatio:
        optimal.reduce((sum, solution) => sum + solution.meanInfoGainRatio, 0) / puzzles.length,
      optimalMoves: optimalActions,
      altMoves: recountActions,
      altSolvability: recountSolveRate,
    });
  }

  return {
    difficulties,
    learningMetrics: {
      inputShapeMatch: 1,
      operationMatch: 1,
      constraintMatch: 1,
      goalMatch: 1,
      leetCodeFit: 1,
      bestAlternativeGap: totalGap / difficulties.length,
      invariantPressure: totalPressure / difficulties.length,
      difficultyBreakpoint: breakpoint,
      algorithmAlignment: 1,
    },
    interpretation: {
      invariant:
        'Start from the dummy dock, push the scout exactly n+1 links ahead, then tow scout and cutter together until the scout clears the stern. The cutter is now parked immediately before the rope to cut.',
      strongestAlternative:
        'The strongest wrong strategy is a full stern recount: row the scout all the way to open water first, then walk the cutter forward from the dock by raw distance instead of preserving the live gap.',
      evidence:
        'The recount line survives the generous D1-D2 budgets, then D3 removes the slack and only the fixed-gap one-pass tow still lands every cut. A separate short-gap baseline fails because forgetting the dock step parks the cutter one rope too late.',
    },
  };
}
