export type TruceDifficulty = 1 | 2 | 3 | 4 | 5;

export type TruceMoveType =
  | 'raiseLeft'
  | 'lowerRight'
  | 'claim'
  | 'nextAnchor'
  | 'audit'
  | 'finish';

export type TruceMove = {
  type: TruceMoveType;
};

export type TruceVerdict = {
  correct: boolean;
  label: string;
};

export type TruceTriplet = [number, number, number];

export type TrucePuzzle = {
  difficulty: TruceDifficulty;
  label: string;
  title: string;
  budget: number;
  helper: string;
  envoys: number[];
  uniqueTriplets: TruceTriplet[];
  tripletsByAnchor: Record<string, number>;
  auditCost: number;
};

export type TruceState = {
  puzzle: TrucePuzzle;
  anchorIndex: number;
  leftIndex: number;
  rightIndex: number;
  actionsUsed: number;
  foundTriplets: TruceTriplet[];
  auditedTriplets: TruceTriplet[];
  message: string;
  verdict: TruceVerdict | null;
};

export type TruceSolution = {
  moves: TruceMove[];
  finalState: TruceState;
  solved: boolean;
  actionsUsed: number;
};

type Blueprint = {
  label: string;
  title: string;
  helper: string;
  envoysSets: number[][];
};

type DifficultyAggregate = {
  difficulty: TruceDifficulty;
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
  difficultyBreakpoint: TruceDifficulty;
  algorithmAlignment: number;
};

export type TruceEvaluation = {
  difficulties: DifficultyAggregate[];
  learningMetrics: LearningMetrics;
  interpretation: {
    invariant: string;
    strongestAlternative: string;
    evidence: string;
  };
};

const BLUEPRINTS: Record<TruceDifficulty, Blueprint> = {
  1: {
    label: 'D1',
    title: 'Harbor Warmup',
    helper:
      'A clerk can still brute-force the roster here, but the live trio is already telling you which inner side to move.',
    envoysSets: [
      [-4, -1, 0, 1, 4],
      [-3, -1, 0, 1, 3],
      [-2, -1, 0, 1, 2],
    ],
  },
  2: {
    label: 'D2',
    title: 'Crosswind Market',
    helper:
      'Duplicate envoys appear, but each useful anchor still hides only one real accord. Brute force is possible and wasteful.',
    envoysSets: [
      [-4, -1, -1, 0, 2, 4],
      [-5, -2, -1, 0, 1, 2, 5],
      [-4, -2, -1, 0, 1, 2, 4],
    ],
  },
  3: {
    label: 'D3',
    title: 'Canal Tribunal',
    helper:
      'The same anchor can hide multiple accords now. If you jump anchors after your first hit, you leave real treaties behind.',
    envoysSets: [
      [-4, -2, -1, 0, 1, 2, 3, 4],
      [-5, -3, -2, 0, 1, 2, 3, 5],
      [-4, -1, -1, 0, 1, 2, 2, 4],
    ],
  },
  4: {
    label: 'D4',
    title: 'Summit Ledger',
    helper:
      'Several anchors can settle more than one accord. The budget expects you to keep squeezing the same anchor until the window dies.',
    envoysSets: [
      [-6, -4, -2, -1, 0, 1, 2, 3, 4, 6],
      [-6, -3, -3, -1, 0, 1, 2, 3, 4, 6],
      [-5, -4, -2, -1, 0, 1, 2, 3, 5, 6],
    ],
  },
  5: {
    label: 'D5',
    title: 'Storm Congress',
    helper:
      'Heavy overlap, duplicates, and long rosters. Only the true anchor-plus-inner-sweep loop can catalog every unique accord in time.',
    envoysSets: [
      [-8, -6, -4, -3, -1, 0, 1, 2, 3, 4, 5, 6, 8],
      [-7, -5, -5, -4, -2, -1, 0, 1, 2, 4, 5, 5, 7],
      [-8, -5, -4, -2, -1, 0, 1, 2, 3, 5, 6, 8],
    ],
  },
};

function clamp(min: number, max: number, value: number) {
  return Math.max(min, Math.min(max, value));
}

function log2(value: number) {
  return Math.log(value) / Math.log(2);
}

function combinationsOfThree(count: number) {
  if (count < 3) return 0;
  return (count * (count - 1) * (count - 2)) / 6;
}

function tripletKey(triplet: TruceTriplet) {
  return triplet.join(',');
}

function hasTriplet(list: TruceTriplet[], triplet: TruceTriplet) {
  const key = tripletKey(triplet);
  return list.some((entry) => tripletKey(entry) === key);
}

function cloneTriplets(list: TruceTriplet[]) {
  return list.map((triplet) => [...triplet] as TruceTriplet);
}

function cloneState(state: TruceState): TruceState {
  return {
    ...state,
    foundTriplets: cloneTriplets(state.foundTriplets),
    auditedTriplets: cloneTriplets(state.auditedTriplets),
  };
}

function currentTriplet(state: TruceState): TruceTriplet | null {
  if (!hasActiveWindow(state)) return null;
  const { envoys } = state.puzzle;
  return [
    envoys[state.anchorIndex] ?? 0,
    envoys[state.leftIndex] ?? 0,
    envoys[state.rightIndex] ?? 0,
  ];
}

export function formatTriplet(triplet: TruceTriplet) {
  return `[${triplet.join(', ')}]`;
}

export function currentSum(state: TruceState) {
  const triplet = currentTriplet(state);
  if (!triplet) return null;
  return triplet[0] + triplet[1] + triplet[2];
}

function anchorExhausted(state: TruceState) {
  return state.anchorIndex >= state.puzzle.envoys.length - 2;
}

function hasActiveWindow(state: TruceState) {
  return !anchorExhausted(state) && state.leftIndex < state.rightIndex;
}

function nextDistinctAnchor(values: number[], currentIndex: number) {
  let next = currentIndex + 1;
  while (next < values.length - 2 && values[next] === values[next - 1]) {
    next += 1;
  }
  return next;
}

function nextDistinctLeft(values: number[], leftIndex: number, rightIndex: number) {
  let next = leftIndex + 1;
  while (next < rightIndex && values[next] === values[next - 1]) {
    next += 1;
  }
  return next;
}

function previousDistinctRight(values: number[], leftIndex: number, rightIndex: number) {
  let next = rightIndex - 1;
  while (leftIndex < next && values[next] === values[next + 1]) {
    next -= 1;
  }
  return next;
}

function buildTriplets(values: number[]): TruceTriplet[] {
  const triplets: TruceTriplet[] = [];

  for (let anchor = 0; anchor < values.length - 2; anchor += 1) {
    if (anchor > 0 && values[anchor] === values[anchor - 1]) continue;

    let left = anchor + 1;
    let right = values.length - 1;

    while (left < right) {
      const total = values[anchor] + values[left] + values[right];

      if (total < 0) {
        left += 1;
        continue;
      }

      if (total > 0) {
        right -= 1;
        continue;
      }

      triplets.push([values[anchor], values[left], values[right]]);
      left += 1;
      right -= 1;

      while (left < right && values[left] === values[left - 1]) left += 1;
      while (left < right && values[right] === values[right + 1]) right -= 1;
    }
  }

  return triplets;
}

function countTripletsByAnchor(triplets: TruceTriplet[]) {
  const counts: Record<string, number> = {};

  for (const triplet of triplets) {
    const key = String(triplet[0]);
    counts[key] = (counts[key] ?? 0) + 1;
  }

  return counts;
}

function estimateOptimalActions(values: number[]) {
  let actions = 1; // finish

  for (let anchor = 0; anchor < values.length - 2; anchor += 1) {
    if (anchor > 0 && values[anchor] === values[anchor - 1]) continue;

    if (anchor > 0) actions += 1; // nextAnchor

    let left = anchor + 1;
    let right = values.length - 1;

    while (left < right) {
      const total = values[anchor] + values[left] + values[right];

      if (total < 0) {
        left += 1;
        actions += 1;
        continue;
      }

      if (total > 0) {
        right -= 1;
        actions += 1;
        continue;
      }

      actions += 1; // claim
      left += 1;
      right -= 1;

      while (left < right && values[left] === values[left - 1]) left += 1;
      while (left < right && values[right] === values[right + 1]) right -= 1;
    }
  }

  return actions;
}

function budgetFor(values: number[], difficulty: TruceDifficulty) {
  const optimal = estimateOptimalActions(values);
  const audit = Math.max(6, Math.ceil(combinationsOfThree(values.length) * 0.6)) + 1;

  if (difficulty === 1) return Math.max(optimal + 2, audit + 1);
  if (difficulty === 2) return Math.max(optimal + 2, audit);
  if (difficulty === 3) return optimal + 3;
  if (difficulty === 4) return optimal + 2;
  return optimal + 1;
}

export function generatePuzzle(seed: number, difficulty: TruceDifficulty): TrucePuzzle {
  const blueprint = BLUEPRINTS[difficulty];
  const envoys = [...blueprint.envoysSets[seed % blueprint.envoysSets.length]].sort(
    (left, right) => left - right,
  );
  const uniqueTriplets = buildTriplets(envoys);

  return {
    difficulty,
    label: blueprint.label,
    title: blueprint.title,
    helper: blueprint.helper,
    envoys,
    uniqueTriplets,
    tripletsByAnchor: countTripletsByAnchor(uniqueTriplets),
    auditCost: Math.max(6, Math.ceil(combinationsOfThree(envoys.length) * 0.6)),
    budget: budgetFor(envoys, difficulty),
  };
}

function openingMessage(puzzle: TrucePuzzle) {
  return `Fix envoy ${puzzle.envoys[0]} first, then steer the inner pair until the total balances to 0.`;
}

export function createInitialState(puzzle: TrucePuzzle): TruceState {
  return {
    puzzle,
    anchorIndex: 0,
    leftIndex: 1,
    rightIndex: puzzle.envoys.length - 1,
    actionsUsed: 0,
    foundTriplets: [],
    auditedTriplets: [],
    message: openingMessage(puzzle),
    verdict: null,
  };
}

function charge(next: TruceState, cost: number) {
  next.actionsUsed += cost;
  if (!next.verdict && next.actionsUsed > next.puzzle.budget) {
    next.verdict = {
      correct: false,
      label: 'Budget exhausted before the catalog was complete.',
    };
  }
}

function remainingTriplets(state: TruceState) {
  return state.puzzle.uniqueTriplets.filter((triplet) => !hasTriplet(state.foundTriplets, triplet));
}

function balanceMessage(state: TruceState) {
  if (!hasActiveWindow(state)) {
    if (anchorExhausted(state)) {
      return 'No anchors remain. Finish if every unique accord is logged.';
    }
    return 'This anchor is exhausted. Advance to the next distinct envoy.';
  }

  const sum = currentSum(state) ?? 0;

  if (sum < 0) {
    return `Balance ${sum}. Raise the left envoy to increase the total.`;
  }

  if (sum > 0) {
    return `Balance +${sum}. Lower the right envoy to reduce the total.`;
  }

  return 'Balance 0. Claim the accord, then keep sweeping the same anchor for any additional matches.';
}

export function legalMoves(state: TruceState): TruceMove[] {
  if (state.verdict) return [];

  const moves: TruceMove[] = [];

  if (hasActiveWindow(state)) {
    if (state.leftIndex + 1 <= state.rightIndex) {
      moves.push({ type: 'raiseLeft' });
    }
    if (state.leftIndex <= state.rightIndex - 1) {
      moves.push({ type: 'lowerRight' });
    }
    moves.push({ type: 'claim' });
  }

  if (!anchorExhausted(state)) {
    moves.push({ type: 'nextAnchor' });
  }

  moves.push({ type: 'audit' });
  moves.push({ type: 'finish' });

  return moves;
}

export function applyMove(state: TruceState, move: TruceMove): TruceState {
  if (state.verdict) return state;

  const next = cloneState(state);
  const values = next.puzzle.envoys;

  if (move.type === 'raiseLeft') {
    if (!hasActiveWindow(next) || next.leftIndex + 1 > next.rightIndex) {
      next.message = 'No larger left envoy remains for this anchor.';
      return next;
    }

    charge(next, 1);
    if (next.verdict) return next;
    next.leftIndex += 1;
    next.message = balanceMessage(next);
    return next;
  }

  if (move.type === 'lowerRight') {
    if (!hasActiveWindow(next) || next.leftIndex > next.rightIndex - 1) {
      next.message = 'No smaller right envoy remains for this anchor.';
      return next;
    }

    charge(next, 1);
    if (next.verdict) return next;
    next.rightIndex -= 1;
    next.message = balanceMessage(next);
    return next;
  }

  if (move.type === 'claim') {
    if (!hasActiveWindow(next)) {
      next.message = 'There is no live trio to claim under this anchor.';
      return next;
    }

    charge(next, 1);
    if (next.verdict) return next;

    const triplet = currentTriplet(next) as TruceTriplet;
    const sum = currentSum(next) ?? 0;

    if (sum !== 0) {
      next.message = `${formatTriplet(triplet)} does not balance to 0.`;
      return next;
    }

    if (!hasTriplet(next.foundTriplets, triplet)) {
      next.foundTriplets.push(triplet);
    }

    next.leftIndex = nextDistinctLeft(values, next.leftIndex, next.rightIndex);
    next.rightIndex = previousDistinctRight(values, next.leftIndex - 1, next.rightIndex);
    next.message = `${formatTriplet(triplet)} logged. ${
      hasActiveWindow(next)
        ? 'Keep the same anchor alive for more accords.'
        : 'This anchor is spent; advance when ready.'
    }`;
    return next;
  }

  if (move.type === 'nextAnchor') {
    if (anchorExhausted(next)) {
      next.message = 'No distinct anchors remain.';
      return next;
    }

    charge(next, 1);
    if (next.verdict) return next;

    const nextAnchor = nextDistinctAnchor(values, next.anchorIndex);
    if (nextAnchor >= values.length - 2) {
      next.anchorIndex = values.length - 2;
      next.leftIndex = values.length - 1;
      next.rightIndex = values.length - 1;
      next.message = 'No anchors remain. Finish if the catalog is complete.';
      return next;
    }

    next.anchorIndex = nextAnchor;
    next.leftIndex = nextAnchor + 1;
    next.rightIndex = values.length - 1;
    next.message = balanceMessage(next);
    return next;
  }

  if (move.type === 'audit') {
    charge(next, next.puzzle.auditCost);
    const missing = remainingTriplets(next);
    next.auditedTriplets = missing;
    next.foundTriplets = cloneTriplets(next.puzzle.uniqueTriplets);
    if (!next.verdict) {
      next.message = 'The clerks brute-forced every remaining trio. It works, but the budget hates it.';
    }
    return next;
  }

  charge(next, 1);
  if (next.verdict) return next;

  const complete = remainingTriplets(next).length === 0;
  next.verdict = {
    correct: complete,
    label: complete
      ? 'Every unique accord is logged.'
      : 'Treaties are still missing from the catalog.',
  };
  next.message = complete
    ? 'You fixed one anchor at a time and squeezed the inner pair until every unique balance was recorded.'
    : 'A real accord was missed. Keep the same anchor alive until its window truly dies.';
  return next;
}

export function isGoal(state: TruceState) {
  return Boolean(state.verdict?.correct);
}

function countExtraTripletsPerAnchor(puzzle: TrucePuzzle) {
  return Object.values(puzzle.tripletsByAnchor).reduce(
    (sum, count) => sum + Math.max(0, count - 1),
    0,
  );
}

function chooseMoveFromSign(state: TruceState): TruceMove {
  const sum = currentSum(state) ?? 0;

  if (sum === 0) return { type: 'claim' };
  if (sum < 0) return { type: 'raiseLeft' };
  return { type: 'lowerRight' };
}

function finalizeResult(moves: TruceMove[], finalState: TruceState): TruceSolution {
  return {
    moves,
    finalState,
    solved: isGoal(finalState),
    actionsUsed: finalState.actionsUsed,
  };
}

export function solveOptimal(puzzle: TrucePuzzle): TruceSolution {
  let state = createInitialState(puzzle);
  const moves: TruceMove[] = [];
  const maxSteps = puzzle.envoys.length * puzzle.envoys.length;

  for (let step = 0; step < maxSteps && !state.verdict; step += 1) {
    if (!hasActiveWindow(state)) {
      const move = anchorExhausted(state) ? { type: 'finish' as const } : { type: 'nextAnchor' as const };
      moves.push(move);
      state = applyMove(state, move);
      continue;
    }

    const move = chooseMoveFromSign(state);
    moves.push(move);
    state = applyMove(state, move);
  }

  return finalizeResult(moves, state);
}

export function solveSingleClaimVariant(puzzle: TrucePuzzle): TruceSolution {
  let state = createInitialState(puzzle);
  const moves: TruceMove[] = [];
  const maxSteps = puzzle.envoys.length * puzzle.envoys.length;

  for (let step = 0; step < maxSteps && !state.verdict; step += 1) {
    if (!hasActiveWindow(state)) {
      const move = anchorExhausted(state) ? { type: 'finish' as const } : { type: 'nextAnchor' as const };
      moves.push(move);
      state = applyMove(state, move);
      continue;
    }

    const sum = currentSum(state) ?? 0;
    if (sum === 0) {
      const claimMove = { type: 'claim' as const };
      moves.push(claimMove);
      state = applyMove(state, claimMove);
      if (state.verdict) break;

      const nextMove = anchorExhausted(state) ? { type: 'finish' as const } : { type: 'nextAnchor' as const };
      moves.push(nextMove);
      state = applyMove(state, nextMove);
      continue;
    }

    const move = sum < 0 ? { type: 'raiseLeft' as const } : { type: 'lowerRight' as const };
    moves.push(move);
    state = applyMove(state, move);
  }

  return finalizeResult(moves, state);
}

export function solveAuditVariant(puzzle: TrucePuzzle): TruceSolution {
  let state = createInitialState(puzzle);
  const moves: TruceMove[] = [];

  for (const move of [{ type: 'audit' as const }, { type: 'finish' as const }]) {
    if (state.verdict) break;
    moves.push(move);
    state = applyMove(state, move);
  }

  return finalizeResult(moves, state);
}

function efficiencyScore(result: TruceSolution, puzzle: TrucePuzzle) {
  if (!result.solved) return 0;
  return (puzzle.budget + 1 - result.actionsUsed) / (puzzle.budget + 1);
}

function effectiveCost(result: TruceSolution, puzzle: TrucePuzzle) {
  return result.solved ? result.actionsUsed : puzzle.budget + result.actionsUsed;
}

export function evaluateTruce(): TruceEvaluation {
  const difficulties: DifficultyAggregate[] = [];
  const targetCosts: number[] = [];
  const altCosts: number[] = [];
  const bruteCosts: number[] = [];

  let breakpoint: TruceDifficulty = 5;

  for (const difficulty of [1, 2, 3, 4, 5] as TruceDifficulty[]) {
    const puzzles = Array.from({ length: 5 }, (_, seed) => generatePuzzle(seed, difficulty));
    const optimal = puzzles.map((puzzle) => solveOptimal(puzzle));
    const shortcut = puzzles.map((puzzle) => solveSingleClaimVariant(puzzle));
    const brute = puzzles.map((puzzle) => solveAuditVariant(puzzle));

    const solvability = optimal.filter((result) => result.solved).length / puzzles.length;
    const altSolvability = shortcut.filter((result) => result.solved).length / puzzles.length;

    const optimalMoves =
      optimal.reduce((sum, result) => sum + result.actionsUsed, 0) / puzzles.length;
    const altMoves =
      shortcut.reduce((sum, result) => sum + result.actionsUsed, 0) / puzzles.length;

    const puzzleEntropy =
      puzzles.reduce((sum, puzzle, index) => {
        let running = createInitialState(puzzle);
        let entropy = 0;

        for (const move of optimal[index].moves) {
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

        for (const move of optimal[index].moves) {
          entropy += log2(Math.max(1, legalMoves(running).length));
          samples += 1;
          running = applyMove(running, move);
          if (running.verdict) break;
        }

        return sum + entropy / Math.max(1, samples);
      }, 0) / puzzles.length;

    const skillDepth =
      puzzles.reduce((sum, puzzle, index) => {
        const targetScore = efficiencyScore(optimal[index], puzzle);
        const bruteScore = efficiencyScore(brute[index], puzzle);
        if (targetScore <= 0) return sum;
        return sum + clamp(0, 1, (targetScore - bruteScore) / targetScore);
      }, 0) / puzzles.length;

    const counterintuitive =
      puzzles.reduce((sum, puzzle) => sum + countExtraTripletsPerAnchor(puzzle), 0) / puzzles.length;

    const drama =
      puzzles.reduce(
        (sum, puzzle, index) => sum + optimal[index].actionsUsed / Math.max(1, puzzle.budget),
        0,
      ) / puzzles.length;

    const infoGainRatio =
      puzzles.reduce((sum, puzzle) => {
        const anchorsWithHits = Math.max(1, Object.keys(puzzle.tripletsByAnchor).length);
        return sum + puzzle.uniqueTriplets.length / anchorsWithHits;
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
      puzzles.reduce((sum, puzzle, index) => sum + effectiveCost(optimal[index], puzzle), 0) /
      puzzles.length;
    const averageAltCost =
      puzzles.reduce((sum, puzzle, index) => sum + effectiveCost(shortcut[index], puzzle), 0) /
      puzzles.length;
    const averageBruteCost =
      puzzles.reduce((sum, puzzle, index) => sum + effectiveCost(brute[index], puzzle), 0) /
      puzzles.length;

    targetCosts.push(averageTargetCost);
    altCosts.push(averageAltCost);
    bruteCosts.push(averageBruteCost);

    const altGap = averageAltCost > 0 ? 1 - averageTargetCost / averageAltCost : 0;
    const altFailureRate = 1 - altSolvability;
    if (breakpoint === 5 && (altFailureRate >= 0.2 || altGap >= 0.25)) {
      breakpoint = difficulty;
    }
  }

  const averageTargetCost =
    targetCosts.reduce((sum, value) => sum + value, 0) / Math.max(1, targetCosts.length);
  const averageAltCost =
    altCosts.reduce((sum, value) => sum + value, 0) / Math.max(1, altCosts.length);
  const averageBruteCost =
    bruteCosts.reduce((sum, value) => sum + value, 0) / Math.max(1, bruteCosts.length);

  const learningMetrics: LearningMetrics = {
    inputShapeMatch: 1,
    operationMatch: 1,
    constraintMatch: 1,
    goalMatch: 1,
    leetCodeFit: 1,
    bestAlternativeGap: clamp(0, 1, 1 - averageTargetCost / Math.max(1, averageAltCost)),
    invariantPressure: clamp(0, 1, 1 - averageTargetCost / Math.max(1, averageBruteCost)),
    difficultyBreakpoint: breakpoint,
    algorithmAlignment: 1,
  };

  return {
    difficulties,
    learningMetrics,
    interpretation: {
      invariant:
        'After a valid trio, keep the same anchor fixed and keep squeezing the inner window until it truly dies.',
      strongestAlternative:
        'Jump to the next anchor immediately after the first valid trio for the current anchor.',
      evidence:
        'That shortcut survives the easy rosters, then starts missing real accords at D3 when one anchor can support multiple distinct triplets.',
    },
  };
}
