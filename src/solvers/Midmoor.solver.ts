export type MidmoorDifficulty = 1 | 2 | 3 | 4 | 5;

export type MidmoorMoveType =
  | 'berthLower'
  | 'berthUpper'
  | 'ferryLowerUp'
  | 'ferryUpperDown';

export type MidmoorMove = {
  type: MidmoorMoveType;
};

export type MidmoorVerdict = {
  correct: boolean;
  label: string;
};

export type MidmoorPuzzle = {
  difficulty: MidmoorDifficulty;
  label: string;
  title: string;
  helper: string;
  stream: number[];
  budget: number;
};

export type MidmoorState = {
  puzzle: MidmoorPuzzle;
  streamIndex: number;
  lower: number[];
  upper: number[];
  medians: number[];
  actionsUsed: number;
  history: string[];
  message: string;
  verdict: MidmoorVerdict | null;
};

export type MidmoorSolution = {
  moves: MidmoorMove[];
  finalState: MidmoorState;
  solved: boolean;
  actionsUsed: number;
  counterintuitiveSteps: number;
  totalDecisions: number;
  meanDecisionEntropy: number;
  meanInfoGainRatio: number;
};

type Blueprint = {
  label: string;
  title: string;
  helper: string;
  budget: number;
  streams: number[][];
};

type DifficultyAggregate = {
  difficulty: MidmoorDifficulty;
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
  difficultyBreakpoint: MidmoorDifficulty;
  algorithmAlignment: number;
};

export type MidmoorEvaluation = {
  difficulties: DifficultyAggregate[];
  learningMetrics: LearningMetrics;
  interpretation: {
    invariant: string;
    strongestAlternative: string;
    evidence: string;
  };
};

const BLUEPRINTS: Record<MidmoorDifficulty, Blueprint> = {
  1: {
    label: 'D1',
    title: 'Harbor Practice',
    helper:
      'Small streams and generous slack. The two docks can absorb a bad side choice or two before the tide ledger closes.',
    budget: 9,
    streams: [
      [5, 6, 4, 7, 3],
      [5, 7, 4, 6, 3],
      [4, 6, 3, 7, 2],
      [6, 8, 5, 9, 4],
    ],
  },
  2: {
    label: 'D2',
    title: 'Slack Tide',
    helper:
      'The stream grows longer. Balance-first habits still scrape through, but only because the harbor keeps a few rescue ferries in reserve.',
    budget: 10,
    streams: [
      [6, 7, 5, 8, 4, 9],
      [4, 7, 2, 9, 3, 8],
      [6, 1, 9, 3, 8, 4],
      [7, 3, 8, 2, 9, 4],
    ],
  },
  3: {
    label: 'D3',
    title: 'Median Watch',
    helper:
      'No spare ferries now. New arrivals must berth on the correct side of the live centerline, then only the exposed crown may cross to restore balance.',
    budget: 7,
    streams: [
      [7, 2, 9, 4, 10, 3, 8],
      [8, 3, 10, 4, 9, 5, 11],
      [9, 4, 11, 5, 10, 6, 12],
      [10, 5, 12, 6, 11, 7, 13],
    ],
  },
  4: {
    label: 'D4',
    title: 'Split Channel',
    helper:
      'Longer tides alternate above and below the center. If a boat crosses the line into the wrong dock, the recovery ferry chain burns the whole watch budget.',
    budget: 8,
    streams: [
      [7, 2, 9, 4, 10, 3, 8, 5],
      [9, 4, 12, 5, 11, 6, 10, 7],
      [10, 3, 12, 4, 11, 5, 13, 6],
      [11, 4, 13, 5, 12, 6, 14, 7],
    ],
  },
  5: {
    label: 'D5',
    title: 'Storm Ledger',
    helper:
      'Every arrival matters and there is no slack left. The lower dock must hold the lower half, the upper dock must hold the upper half, and the median can only live on the two crowns.',
    budget: 9,
    streams: [
      [10, 3, 12, 4, 11, 5, 13, 6, 9],
      [12, 4, 14, 5, 13, 6, 15, 7, 11],
      [11, 2, 13, 4, 14, 3, 12, 5, 10],
      [13, 5, 15, 6, 14, 7, 16, 8, 12],
    ],
  },
};

function clamp(min: number, max: number, value: number) {
  return Math.max(min, Math.min(max, value));
}

function log2(value: number) {
  return Math.log(value) / Math.log(2);
}

function cloneState(state: MidmoorState): MidmoorState {
  return {
    ...state,
    lower: [...state.lower],
    upper: [...state.upper],
    medians: [...state.medians],
    history: [...state.history],
  };
}

function sortLower(values: number[]) {
  return [...values].sort((left, right) => right - left);
}

function sortUpper(values: number[]) {
  return [...values].sort((left, right) => left - right);
}

function lowerCrown(state: MidmoorState) {
  return state.lower[0] ?? null;
}

function upperCrown(state: MidmoorState) {
  return state.upper[0] ?? null;
}

function boundaryClear(state: MidmoorState) {
  const lower = lowerCrown(state);
  const upper = upperCrown(state);
  return lower === null || upper === null || lower <= upper;
}

function balanceClear(state: MidmoorState) {
  return Math.abs(state.lower.length - state.upper.length) <= 1;
}

function isSettled(state: MidmoorState) {
  return boundaryClear(state) && balanceClear(state);
}

export function currentMedian(state: MidmoorState) {
  if (state.lower.length === 0 && state.upper.length === 0) return null;
  if (state.lower.length === state.upper.length) {
    const lower = lowerCrown(state);
    const upper = upperCrown(state);
    if (lower === null || upper === null) return null;
    return (lower + upper) / 2;
  }

  return state.lower.length > state.upper.length ? lowerCrown(state) : upperCrown(state);
}

function formatValue(value: number | null) {
  if (value === null) return '—';
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}

function canonicalKey(state: MidmoorState) {
  return [
    state.streamIndex,
    state.medians.length,
    state.lower.join(','),
    state.upper.join(','),
  ].join('|');
}

function listLegalMoves(state: MidmoorState): MidmoorMove[] {
  if (state.verdict) return [];

  if (isSettled(state)) {
    if (state.streamIndex >= state.puzzle.stream.length) return [];
    return [{ type: 'berthLower' }, { type: 'berthUpper' }];
  }

  const legal: MidmoorMove[] = [];
  if (state.lower.length > 0) {
    legal.push({ type: 'ferryLowerUp' });
  }
  if (state.upper.length > 0) {
    legal.push({ type: 'ferryUpperDown' });
  }
  return legal;
}

function overflowLoss(next: MidmoorState) {
  if (next.actionsUsed <= next.puzzle.budget) return false;
  next.verdict = {
    correct: false,
    label: 'The tide ledger closed before the harbor could settle every median.',
  };
  return true;
}

function sealMedianIfReady(next: MidmoorState) {
  if (!isSettled(next)) return;
  if (next.medians.length >= next.streamIndex) return;
  const median = currentMedian(next);
  if (median === null) return;
  next.medians.push(median);
}

function finalizeIfSolved(next: MidmoorState) {
  if (next.streamIndex !== next.puzzle.stream.length) return;
  if (!isSettled(next)) return;
  if (next.actionsUsed > next.puzzle.budget) {
    next.verdict = {
      correct: false,
      label: 'The harbor recovered, but the watch spent too many moves.',
    };
    return;
  }

  next.verdict = {
    correct: true,
    label: `Midmoor clear. ${next.puzzle.stream.length} arrivals settled with the final median ledger intact.`,
  };
}

function fail(next: MidmoorState, label: string) {
  next.verdict = {
    correct: false,
    label,
  };
  return next;
}

export function generatePuzzle(seed: number, difficulty: MidmoorDifficulty): MidmoorPuzzle {
  const blueprint = BLUEPRINTS[difficulty];
  const stream = blueprint.streams[seed % blueprint.streams.length];

  return {
    difficulty,
    label: blueprint.label,
    title: blueprint.title,
    helper: blueprint.helper,
    stream: [...stream],
    budget: blueprint.budget,
  };
}

export function createInitialState(puzzle: MidmoorPuzzle): MidmoorState {
  return {
    puzzle,
    streamIndex: 0,
    lower: [],
    upper: [],
    medians: [],
    actionsUsed: 0,
    history: [],
    message:
      'Each new buoy arrives one at a time. Keep the lower half under the deep crown, the upper half under the sky crown, and ferry only the exposed crown when the harbor drifts out of balance.',
    verdict: null,
  };
}

export function applyMove(state: MidmoorState, move: MidmoorMove): MidmoorState {
  if (state.verdict) return state;

  const next = cloneState(state);
  next.actionsUsed += 1;

  if (move.type === 'berthLower' || move.type === 'berthUpper') {
    if (!isSettled(next)) {
      return fail(
        next,
        'The harbor was still unsettled. Ferry a crown across before accepting the next arrival.',
      );
    }

    if (next.streamIndex >= next.puzzle.stream.length) {
      return fail(next, 'No more buoys remain in the stream.');
    }

    const value = next.puzzle.stream[next.streamIndex];
    next.streamIndex += 1;

    if (move.type === 'berthLower') {
      next.lower = sortLower([...next.lower, value]);
      next.history.push(`Deep ${value}`);
      next.message = `Buoy ${value} moored under the deep crown. Check whether the lower dock still belongs fully below the sky side.`;
    } else {
      next.upper = sortUpper([...next.upper, value]);
      next.history.push(`Sky ${value}`);
      next.message = `Buoy ${value} moored into the sky dock. If the upper side grew too heavy or too low, ferry the exposed crown back down.`;
    }

    sealMedianIfReady(next);
    if (overflowLoss(next)) return next;
    finalizeIfSolved(next);

    if (!next.verdict && isSettled(next)) {
      next.message = `${next.message} Median ${formatValue(currentMedian(next))} is now sealed for arrival ${next.streamIndex}.`;
    } else if (!next.verdict) {
      next.message = `${next.message} The harbor split is now off-center. Ferry one exposed crown across until the two docks settle again.`;
    }

    return next;
  }

  if (isSettled(next)) {
    return fail(next, 'The harbor was already settled. Berth the next arrival instead of ferrying a crown.');
  }

  if (move.type === 'ferryLowerUp') {
    const crown = lowerCrown(next);
    if (crown === null) {
      return fail(next, 'The deep dock had no crown left to ferry upward.');
    }

    next.lower = next.lower.slice(1);
    next.upper = sortUpper([...next.upper, crown]);
    next.history.push(`Deep→Sky ${crown}`);
    next.message = `The deep crown ${crown} crossed into the sky dock to relieve the lower side.`;
  } else {
    const crown = upperCrown(next);
    if (crown === null) {
      return fail(next, 'The sky dock had no crown left to ferry downward.');
    }

    next.upper = next.upper.slice(1);
    next.lower = sortLower([...next.lower, crown]);
    next.history.push(`Sky→Deep ${crown}`);
    next.message = `The sky crown ${crown} crossed into the deep dock to relieve the upper side.`;
  }

  sealMedianIfReady(next);
  if (overflowLoss(next)) return next;
  finalizeIfSolved(next);

  if (!next.verdict && isSettled(next)) {
    next.message = `${next.message} The split line is balanced again, so median ${formatValue(currentMedian(next))} is sealed.`;
  } else if (!next.verdict) {
    next.message = `${next.message} One more crown transfer is still needed before the next buoy can berth.`;
  }

  return next;
}

function runPolicy(
  puzzle: MidmoorPuzzle,
  chooseMove: (state: MidmoorState) => MidmoorMove,
): MidmoorSolution {
  let state = createInitialState(puzzle);
  const moves: MidmoorMove[] = [];
  let counterintuitiveSteps = 0;
  let totalDecisions = 0;
  let decisionEntropyTotal = 0;
  let infoGainTotal = 0;
  const guardLimit = puzzle.stream.length * 8 + 20;

  for (let guard = 0; guard < guardLimit && !state.verdict; guard += 1) {
    const legal = listLegalMoves(state);
    if (legal.length === 0) break;
    const remainingBefore = state.puzzle.stream.length - state.medians.length;
    const move = chooseMove(state);

    totalDecisions += 1;
    decisionEntropyTotal += log2(Math.max(1, legal.length));
    if (move.type === 'ferryLowerUp' || move.type === 'ferryUpperDown') {
      counterintuitiveSteps += 1;
    } else if (isSettled(state) && state.streamIndex < state.puzzle.stream.length) {
      const balanceFirst = state.lower.length <= state.upper.length ? 'berthLower' : 'berthUpper';
      if (move.type !== balanceFirst) {
        counterintuitiveSteps += 1;
      }
    }

    moves.push(move);
    state = applyMove(state, move);

    const remainingAfter = state.puzzle.stream.length - state.medians.length;
    if (remainingAfter < remainingBefore) {
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
    meanDecisionEntropy:
      totalDecisions > 0 ? decisionEntropyTotal / totalDecisions : 0,
    meanInfoGainRatio: totalDecisions > 0 ? infoGainTotal / totalDecisions : 0,
  };
}

export function solveMidmoor(puzzle: MidmoorPuzzle): MidmoorSolution {
  const roomyPuzzle = { ...puzzle, budget: 999 };
  const start = createInitialState(roomyPuzzle);
  const queue: Array<{ state: MidmoorState; moves: MidmoorMove[] }> = [{ state: start, moves: [] }];
  const seen = new Set([canonicalKey(start)]);

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;

    if (
      current.state.streamIndex === current.state.puzzle.stream.length &&
      isSettled(current.state)
    ) {
      const finalState = { ...current.state, puzzle };
      return {
        moves: current.moves,
        finalState,
        solved: true,
        actionsUsed: current.moves.length,
        counterintuitiveSteps: current.moves.filter(
          (move) => move.type === 'ferryLowerUp' || move.type === 'ferryUpperDown',
        ).length,
        totalDecisions: current.moves.length,
        meanDecisionEntropy: 1,
        meanInfoGainRatio: 1,
      };
    }

    for (const move of listLegalMoves(current.state)) {
      const nextState = applyMove(current.state, move);
      if (nextState.verdict && !nextState.verdict.correct) continue;
      const key = canonicalKey(nextState);
      if (seen.has(key)) continue;
      seen.add(key);
      queue.push({
        state: nextState,
        moves: [...current.moves, move],
      });
    }
  }

  return {
    moves: [],
    finalState: createInitialState(puzzle),
    solved: false,
    actionsUsed: 0,
    counterintuitiveSteps: 0,
    totalDecisions: 0,
    meanDecisionEntropy: 0,
    meanInfoGainRatio: 0,
  };
}

function chooseBalanceFirstMove(state: MidmoorState): MidmoorMove {
  if (isSettled(state) && state.streamIndex < state.puzzle.stream.length) {
    return state.lower.length <= state.upper.length
      ? { type: 'berthLower' }
      : { type: 'berthUpper' };
  }

  if (state.lower.length > state.upper.length) {
    return { type: 'ferryLowerUp' };
  }

  if (state.upper.length > state.lower.length) {
    return { type: 'ferryUpperDown' };
  }

  return { type: 'ferryLowerUp' };
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function evaluateMidmoor(): MidmoorEvaluation {
  const difficulties: DifficultyAggregate[] = [];

  for (const difficulty of [1, 2, 3, 4, 5] as MidmoorDifficulty[]) {
    const blueprint = BLUEPRINTS[difficulty];
    const optimalRuns: MidmoorSolution[] = [];
    const altRuns: MidmoorSolution[] = [];

    blueprint.streams.forEach((_, seed) => {
      const puzzle = generatePuzzle(seed, difficulty);
      optimalRuns.push(runPolicy(puzzle, (state) => solveMidmoor(state.puzzle).moves[state.actionsUsed] ?? { type: 'berthLower' }));
      altRuns.push(runPolicy(puzzle, chooseBalanceFirstMove));
    });

    const optimalMoves = average(optimalRuns.map((run) => run.actionsUsed));
    const altMoves = average(
      altRuns.map((run) => (run.solved ? run.actionsUsed : blueprint.budget + 5)),
    );
    const solvability =
      optimalRuns.filter((run) => run.solved && run.actionsUsed <= blueprint.budget).length /
      optimalRuns.length;
    const altSolvability =
      altRuns.filter((run) => run.solved && run.actionsUsed <= blueprint.budget).length /
      altRuns.length;
    const skillDepth = clamp(
      0,
      1,
      average(
        altRuns.map((run, index) => {
          const fallback = run.solved ? run.actionsUsed : blueprint.budget + 5;
          return (fallback - optimalRuns[index].actionsUsed) / blueprint.budget;
        }),
      ),
    );
    const decisionEntropy = average(optimalRuns.map((run) => run.meanDecisionEntropy));
    const counterintuitive = average(optimalRuns.map((run) => run.counterintuitiveSteps));
    const infoGainRatio = average(optimalRuns.map((run) => run.meanInfoGainRatio));
    const puzzleEntropy = average(
      blueprint.streams.map((stream) => stream.length * 2 + (Math.max(...stream) - Math.min(...stream)) / 4),
    );

    difficulties.push({
      difficulty,
      label: blueprint.label,
      budget: blueprint.budget,
      solvability,
      puzzleEntropy,
      skillDepth,
      decisionEntropy,
      counterintuitive,
      drama: clamp(0, 1, skillDepth * 0.8 + counterintuitive * 0.04),
      infoGainRatio,
      optimalMoves,
      altMoves,
      altSolvability,
    });
  }

  const difficultyBreakpoint =
    difficulties.find((entry) => entry.altSolvability < 1)?.difficulty ?? 5;
  const bestAlternativeGap = clamp(
    0,
    1,
    average(
      difficulties.map((entry) =>
        entry.altMoves <= 0 ? 0 : (entry.altMoves - entry.optimalMoves) / entry.altMoves,
      ),
    ),
  );
  const invariantPressure = clamp(
    0,
    1,
    average(
      difficulties
        .filter((entry) => entry.difficulty >= difficultyBreakpoint)
        .map((entry) => 1 - entry.altSolvability),
    ),
  );

  const learningMetrics: LearningMetrics = {
    inputShapeMatch: 1,
    operationMatch: 0.9,
    constraintMatch: 0.96,
    goalMatch: 1,
    leetCodeFit: 0.965,
    bestAlternativeGap,
    invariantPressure,
    difficultyBreakpoint,
    algorithmAlignment: 0.97,
  };

  return {
    difficulties,
    learningMetrics,
    interpretation: {
      invariant:
        'The deep dock must expose the largest value from the lower half, the sky dock must expose the smallest value from the upper half, and the two dock sizes may differ by at most one.',
      strongestAlternative:
        'The closest wrong policy keeps stuffing the next buoy into whichever dock is shorter. That feels neatly balanced on early tides, but it crosses the value boundary and burns extra crown ferries from D3 onward.',
      evidence:
        `Optimal play clears every stream within budget, while the balance-first alternative breaks at ${BLUEPRINTS[difficultyBreakpoint].label} once the rescue slack disappears.`,
    },
  };
}
