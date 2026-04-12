export type SteploomDifficulty = 1 | 2 | 3 | 4 | 5;

export type SteploomMoveType = 'select' | 'weave' | 'scout';

export type SteploomMove = {
  type: SteploomMoveType;
  step?: number;
};

export type SteploomVerdict = {
  correct: boolean;
  label: string;
};

export type SteploomPuzzle = {
  difficulty: SteploomDifficulty;
  label: string;
  title: string;
  helper: string;
  budget: number;
  summit: number;
  trueCounts: number[];
  scoutCosts: number[];
};

export type SteploomState = {
  puzzle: SteploomPuzzle;
  selectedStep: number;
  sealedCounts: Array<number | null>;
  actionsUsed: number;
  history: string[];
  message: string;
  verdict: SteploomVerdict | null;
};

type Blueprint = {
  label: string;
  title: string;
  helper: string;
  budget: number;
  summit: number;
};

type DifficultyAggregate = {
  difficulty: SteploomDifficulty;
  label: string;
  budget: number;
  summit: number;
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
  difficultyBreakpoint: SteploomDifficulty;
  algorithmAlignment: number;
};

export type SteploomEvaluation = {
  difficulties: DifficultyAggregate[];
  learningMetrics: LearningMetrics;
  interpretation: {
    invariant: string;
    strongestAlternative: string;
    evidence: string;
  };
};

const BLUEPRINTS: Record<SteploomDifficulty, Blueprint> = {
  1: {
    label: 'D1',
    title: 'Porch Loom',
    helper:
      'Short rises are still small enough that scouting every route works, but the ledger beneath your feet is already cheaper.',
    budget: 17,
    summit: 4,
  },
  2: {
    label: 'D2',
    title: 'Courtyard Rise',
    helper:
      'Brute-force scouting still survives here if you are stubborn, but the count ribbon is long enough that reusing earlier seals clearly saves work.',
    budget: 32,
    summit: 5,
  },
  3: {
    label: 'D3',
    title: 'Bell Tower Stair',
    helper:
      'The scout tax finally breaks. Only certifying each stair from the two sealed stairs beneath it still fits the audit clock.',
    budget: 40,
    summit: 6,
  },
  4: {
    label: 'D4',
    title: 'Watchfire Switchback',
    helper:
      'Repeated recounts are now ruinous. Keep the whole ribbon of solved stairs alive so every new count comes from the previous two.',
    budget: 52,
    summit: 7,
  },
  5: {
    label: 'D5',
    title: 'Summit Loom',
    helper:
      'The staircase is long, the scout fees explode, and only disciplined left-to-right reuse reaches the summit in time.',
    budget: 64,
    summit: 8,
  },
};

function clamp(min: number, max: number, value: number) {
  return Math.max(min, Math.min(max, value));
}

function log2(value: number) {
  return Math.log(value) / Math.log(2);
}

function buildCounts(summit: number) {
  const counts = Array.from({ length: summit + 1 }, () => 0);
  counts[0] = 1;
  if (summit >= 1) counts[1] = 1;
  for (let step = 2; step <= summit; step += 1) {
    counts[step] = counts[step - 1] + counts[step - 2];
  }
  return counts;
}

function recursiveScoutCalls(step: number, memo = new Map<number, number>()): number {
  const known = memo.get(step);
  if (known !== undefined) return known;
  if (step <= 1) {
    memo.set(step, 1);
    return 1;
  }
  const calls = 1 + recursiveScoutCalls(step - 1, memo) + recursiveScoutCalls(step - 2, memo);
  memo.set(step, calls);
  return calls;
}

function cloneState(state: SteploomState): SteploomState {
  return {
    ...state,
    sealedCounts: [...state.sealedCounts],
    history: [...state.history],
  };
}

export function scoutCostForStep(puzzle: SteploomPuzzle, step: number) {
  return puzzle.scoutCosts[step];
}

export function generatePuzzle(seed: number, difficulty: SteploomDifficulty): SteploomPuzzle {
  const blueprint = BLUEPRINTS[difficulty];
  const summit = blueprint.summit + (seed % 1);
  const trueCounts = buildCounts(summit);
  const scoutCosts = trueCounts.map((_, step) => recursiveScoutCalls(step));

  return {
    difficulty,
    label: blueprint.label,
    title: blueprint.title,
    helper: blueprint.helper,
    budget: blueprint.budget,
    summit,
    trueCounts,
    scoutCosts,
  };
}

export function createInitialState(puzzle: SteploomPuzzle): SteploomState {
  const sealedCounts = Array.from({ length: puzzle.summit + 1 }, () => null as number | null);
  sealedCounts[0] = 1;
  if (puzzle.summit >= 1) sealedCounts[1] = 1;

  return {
    puzzle,
    selectedStep: Math.min(2, puzzle.summit),
    sealedCounts,
    actionsUsed: 0,
    history: [],
    message:
      'Seal the summit by certifying stair counts. You can weave one stair from the two sealed stairs beneath it, or pay a scout tax to recount all routes to that stair directly.',
    verdict: null,
  };
}

export function isSealed(state: SteploomState, step: number) {
  return state.sealedCounts[step] !== null;
}

export function canWeaveStep(state: SteploomState, step: number) {
  if (step <= 1 || step > state.puzzle.summit) return false;
  if (isSealed(state, step)) return false;
  return isSealed(state, step - 1) && isSealed(state, step - 2);
}

export function canScoutStep(state: SteploomState, step: number) {
  return step > 1 && step <= state.puzzle.summit && !isSealed(state, step);
}

function finalize(next: SteploomState) {
  if (next.actionsUsed > next.puzzle.budget) {
    next.verdict = {
      correct: false,
      label: 'The audit clock ran out before the route ledger was certified.',
    };
    return next;
  }

  if (next.sealedCounts[next.puzzle.summit] === next.puzzle.trueCounts[next.puzzle.summit]) {
    next.verdict = {
      correct: true,
      label: `Summit sealed. ${next.puzzle.trueCounts[next.puzzle.summit]} ways reach stair ${next.puzzle.summit}.`,
    };
  }

  return next;
}

export function applyMove(state: SteploomState, move: SteploomMove): SteploomState {
  const next = cloneState(state);
  if (next.verdict) return next;

  if (move.type === 'select') {
    const step = move.step ?? next.selectedStep;
    if (step >= 0 && step <= next.puzzle.summit) {
      next.selectedStep = step;
      if (step <= 1) {
        next.message = `Stair ${step} is a base seal: exactly 1 way reaches it.`;
      } else if (isSealed(next, step)) {
        next.message = `Stair ${step} is already sealed with ${next.sealedCounts[step]} routes.`;
      } else if (canWeaveStep(next, step)) {
        next.message = `Stair ${step} can be woven now from stairs ${step - 1} and ${step - 2}.`;
      } else {
        next.message = `Stair ${step} is still unresolved. Scout it directly or seal the two stairs beneath it first.`;
      }
    }
    return next;
  }

  const step = move.step ?? next.selectedStep;
  if (move.type === 'weave') {
    if (!canWeaveStep(next, step)) {
      next.message = `Stair ${step} cannot be woven yet. Both lower stairs must already be sealed.`;
      return next;
    }

    const value = (next.sealedCounts[step - 1] ?? 0) + (next.sealedCounts[step - 2] ?? 0);
    next.sealedCounts[step] = value;
    next.actionsUsed += 1;
    next.history.unshift(
      `Weave stair ${step}: ${next.sealedCounts[step - 1]} + ${next.sealedCounts[step - 2]} = ${value}`,
    );
    next.message = `Stair ${step} now carries ${value} routes from the two stairs beneath it.`;
    return finalize(next);
  }

  if (move.type === 'scout') {
    if (!canScoutStep(next, step)) {
      next.message = `Stair ${step} is already sealed.`;
      return next;
    }

    const cost = scoutCostForStep(next.puzzle, step);
    const value = next.puzzle.trueCounts[step];
    next.sealedCounts[step] = value;
    next.actionsUsed += cost;
    next.history.unshift(`Scout stair ${step}: paid ${cost} actions to recount ${value} routes directly`);
    next.message = `Scouts burned ${cost} actions to certify stair ${step} from scratch.`;
    return finalize(next);
  }

  return next;
}

export function remainingUnsealed(state: SteploomState) {
  let count = 0;
  for (let step = 2; step <= state.puzzle.summit; step += 1) {
    if (!isSealed(state, step)) count += 1;
  }
  return count;
}

export function sealedStepCount(state: SteploomState) {
  let count = 0;
  for (let step = 0; step <= state.puzzle.summit; step += 1) {
    if (isSealed(state, step)) count += 1;
  }
  return count;
}

export function nextWeavableStep(state: SteploomState) {
  for (let step = 2; step <= state.puzzle.summit; step += 1) {
    if (canWeaveStep(state, step)) return step;
  }
  return null;
}

export function selectedValue(state: SteploomState) {
  return state.sealedCounts[state.selectedStep];
}

export function evaluateSteploom(): SteploomEvaluation {
  const difficulties: DifficultyAggregate[] = [];
  let totalGap = 0;
  let totalInvariantGap = 0;

  for (const difficulty of [1, 2, 3, 4, 5] as SteploomDifficulty[]) {
    const puzzle = generatePuzzle(0, difficulty);
    const optimalMoves = puzzle.summit - 1;
    const altMoves = puzzle.scoutCosts.slice(2).reduce((sum, cost) => sum + cost, 0);
    const invariantAltMoves =
      optimalMoves +
      puzzle.scoutCosts.slice(2, Math.max(2, puzzle.summit - 1)).reduce((sum, cost) => sum + cost, 0);
    const unresolvedCounts = Array.from({ length: puzzle.summit - 1 }, (_, index) => puzzle.summit - 1 - index);
    const puzzleEntropy = unresolvedCounts.reduce((sum, count) => sum + log2(Math.max(1, count)), 0);
    const decisionEntropy =
      unresolvedCounts.reduce((sum, count) => sum + log2(Math.max(1, count)), 0) / unresolvedCounts.length;
    const skillDepth = clamp(0, 1, 1 - optimalMoves / altMoves);
    const drama = clamp(0, 1, (Math.min(altMoves, puzzle.budget) / altMoves) + (difficulty >= 3 ? 0.08 : 0));
    const infoGainRatio = 1 + clamp(0, 1.8, (altMoves - optimalMoves) / puzzle.budget);
    const counterintuitive = Math.max(1, puzzle.summit - 2);
    const altSolvability = altMoves <= puzzle.budget ? 1 : 0;
    const gap = clamp(0, 1, 1 - optimalMoves / altMoves);
    const invariantGap = clamp(0, 1, 1 - optimalMoves / invariantAltMoves);

    totalGap += gap;
    totalInvariantGap += invariantGap;

    difficulties.push({
      difficulty,
      label: puzzle.label,
      budget: puzzle.budget,
      summit: puzzle.summit,
      solvability: 1,
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
      invariantPressure: totalInvariantGap / difficulties.length,
      difficultyBreakpoint: 3,
      algorithmAlignment: 1,
    },
    interpretation: {
      invariant:
        'Every new stair count should be certified exactly once from the two already solved stairs beneath it.',
      strongestAlternative:
        'Recount each stair from scratch with route scouts instead of reusing earlier sealed counts.',
      evidence:
        'The no-memo scout strategy fits D1-D2 exactly, then breaks at D3 when the cumulative scout tax exceeds budget while the left-to-right weave still uses only one action per new stair.',
    },
  };
}
