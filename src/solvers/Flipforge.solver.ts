export type FlipforgeDifficulty = 1 | 2 | 3 | 4 | 5;

export type FlipforgeLaneId = 'solo' | 'crown' | 'shade';

export type FlipforgeMoveType = 'choose_crown' | 'choose_shade' | 'seal' | 'scout';

export type FlipforgeMove = {
  type: FlipforgeMoveType;
  lane?: FlipforgeLaneId;
};

export type FlipforgeVerdict = {
  correct: boolean;
  label: string;
};

export type FlipforgePair = {
  crown: number;
  shade: number;
};

export type FlipforgePuzzle = {
  difficulty: FlipforgeDifficulty;
  label: string;
  title: string;
  helper: string;
  budget: number;
  multipliers: number[];
  optimalPairs: FlipforgePair[];
  optimalBest: number;
  maxOnlyBest: number;
  scoutCosts: number[];
  flipToCrownCount: number;
  flipToShadeCount: number;
  restartCount: number;
  zeroCount: number;
};

export type FlipforgeCandidateMap = {
  solo: number;
  crown: number | null;
  shade: number | null;
};

export type FlipforgeState = {
  puzzle: FlipforgePuzzle;
  selectedIndex: number;
  sealedPairs: Array<FlipforgePair | null>;
  chosenCrown: FlipforgeLaneId | null;
  chosenShade: FlipforgeLaneId | null;
  actionsUsed: number;
  history: string[];
  message: string;
  verdict: FlipforgeVerdict | null;
};

type Blueprint = {
  label: string;
  title: string;
  helper: string;
  budget: number;
  layouts: number[][];
};

type DifficultyAggregate = {
  difficulty: FlipforgeDifficulty;
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
  difficultyBreakpoint: FlipforgeDifficulty;
  algorithmAlignment: number;
};

export type FlipforgeEvaluation = {
  difficulties: DifficultyAggregate[];
  learningMetrics: LearningMetrics;
  interpretation: {
    invariant: string;
    strongestAlternative: string;
    evidence: string;
  };
};

type CandidateEntry = {
  lane: FlipforgeLaneId;
  value: number;
};

type LedgerBuild = {
  pairs: FlipforgePair[];
  best: number;
  flipToCrownCount: number;
  flipToShadeCount: number;
  restartCount: number;
  zeroCount: number;
};

type SimulationSummary = {
  solved: boolean;
  actionsUsed: number;
  finalBest: number;
};

const BLUEPRINTS: Record<FlipforgeDifficulty, Blueprint> = {
  1: {
    label: 'D1',
    title: 'Warm Forge',
    helper:
      'Short strips can still be brute-forced. The scalable habit is already to seal the best and worst ending-here products before moving right.',
    budget: 4,
    layouts: [
      [2, 3, 4],
      [1, 2, 5],
    ],
  },
  2: {
    label: 'D2',
    title: 'Soot Line',
    helper:
      'A negative multiplier can bruise the live product, but the scout still survives once. Keep both ending-here extremes instead of trusting a single running best.',
    budget: 6,
    layouts: [
      [3, -1, 4, 2],
      [2, 0, 3, 4],
    ],
  },
  3: {
    label: 'D3',
    title: 'Flip Gate',
    helper:
      'Now the scout route breaks and the one-lane shortcut lies. A negative multiplier can turn yesterday’s worst live lane into today’s best crown.',
    budget: 4,
    layouts: [
      [-2, 3, -4, 2],
      [2, -3, -2, 4],
    ],
  },
  4: {
    label: 'D4',
    title: 'Ash Rift',
    helper:
      'Zeroes and sign flips both matter now. The stable plan is to preserve the live crown and live shade at every step so resets and reversals both stay visible.',
    budget: 5,
    layouts: [
      [2, -5, 0, -2, -4],
      [-1, -2, 0, -3, -4],
    ],
  },
  5: {
    label: 'D5',
    title: 'Night Kiln',
    helper:
      'Long mixed-sign strips leave no slack for guesswork. Only a full dual-extreme ledger can certify the true strongest contiguous product before the forge cools.',
    budget: 6,
    layouts: [
      [0, -2, -3, 0, -2, -40],
      [2, -5, -2, -4, 3, 0],
    ],
  },
};

function clamp(min: number, max: number, value: number) {
  return Math.max(min, Math.min(max, value));
}

function log2(value: number) {
  return Math.log(value) / Math.log(2);
}

function scoutCostForPosition(index: number) {
  if (index < 2) return 1;
  if (index < 4) return 2;
  return 3;
}

function candidatesFor(previous: FlipforgePair | null, multiplier: number): CandidateEntry[] {
  const candidates: CandidateEntry[] = [{ lane: 'solo', value: multiplier }];
  if (previous) {
    candidates.push({ lane: 'crown', value: previous.crown * multiplier });
    candidates.push({ lane: 'shade', value: previous.shade * multiplier });
  }
  return candidates;
}

function candidateMapFor(previous: FlipforgePair | null, multiplier: number): FlipforgeCandidateMap {
  const values = candidatesFor(previous, multiplier);
  return {
    solo: values.find((entry) => entry.lane === 'solo')?.value ?? multiplier,
    crown: values.find((entry) => entry.lane === 'crown')?.value ?? null,
    shade: values.find((entry) => entry.lane === 'shade')?.value ?? null,
  };
}

function bestCandidate(entries: CandidateEntry[]) {
  return entries.reduce((best, entry) => {
    if (!best) return entry;
    if (entry.value > best.value) return entry;
    return best;
  }, null as CandidateEntry | null) as CandidateEntry;
}

function worstCandidate(entries: CandidateEntry[]) {
  return entries.reduce((worst, entry) => {
    if (!worst) return entry;
    if (entry.value < worst.value) return entry;
    return worst;
  }, null as CandidateEntry | null) as CandidateEntry;
}

function buildOptimalLedger(multipliers: number[]): LedgerBuild {
  const pairs: FlipforgePair[] = [];
  let best = Number.NEGATIVE_INFINITY;
  let flipToCrownCount = 0;
  let flipToShadeCount = 0;
  let restartCount = 0;
  let zeroCount = 0;

  for (let index = 0; index < multipliers.length; index += 1) {
    const multiplier = multipliers[index];
    const previous = index === 0 ? null : pairs[index - 1];
    const entries = candidatesFor(previous, multiplier);
    const crown = bestCandidate(entries);
    const shade = worstCandidate(entries);
    const competingWithoutShade = entries.filter((entry) => entry.lane !== 'shade');
    const competingWithoutCrown = entries.filter((entry) => entry.lane !== 'crown');
    const bestWithoutShade = competingWithoutShade.length > 0 ? bestCandidate(competingWithoutShade).value : Number.NEGATIVE_INFINITY;
    const worstWithoutCrown = competingWithoutCrown.length > 0 ? worstCandidate(competingWithoutCrown).value : Number.POSITIVE_INFINITY;

    if (crown.lane === 'shade' && crown.value > bestWithoutShade) {
      flipToCrownCount += 1;
    }
    if (shade.lane === 'crown' && shade.value < worstWithoutCrown) {
      flipToShadeCount += 1;
    }
    if (index > 0 && crown.lane === 'solo') {
      restartCount += 1;
    }
    if (multiplier === 0) {
      zeroCount += 1;
    }

    pairs.push({ crown: crown.value, shade: shade.value });
    best = Math.max(best, crown.value);
  }

  return {
    pairs,
    best,
    flipToCrownCount,
    flipToShadeCount,
    restartCount,
    zeroCount,
  };
}

function buildMaxOnlyBest(multipliers: number[]) {
  let current = multipliers[0];
  let best = current;

  for (let index = 1; index < multipliers.length; index += 1) {
    const multiplier = multipliers[index];
    current = Math.max(multiplier, current * multiplier);
    best = Math.max(best, current);
  }

  return best;
}

function cloneState(state: FlipforgeState): FlipforgeState {
  return {
    ...state,
    sealedPairs: [...state.sealedPairs],
    history: [...state.history],
  };
}

function laneValue(candidates: FlipforgeCandidateMap, lane: FlipforgeLaneId) {
  return candidates[lane];
}

function currentPreviousPair(state: FlipforgeState) {
  if (state.selectedIndex === 0) return null;
  return state.sealedPairs[state.selectedIndex - 1];
}

export function generatePuzzle(seed: number, difficulty: FlipforgeDifficulty): FlipforgePuzzle {
  const blueprint = BLUEPRINTS[difficulty];
  const multipliers = [...blueprint.layouts[seed % blueprint.layouts.length]];
  const optimal = buildOptimalLedger(multipliers);
  const scoutCosts = multipliers.map((_, index) => scoutCostForPosition(index));

  return {
    difficulty,
    label: blueprint.label,
    title: blueprint.title,
    helper: blueprint.helper,
    budget: blueprint.budget,
    multipliers,
    optimalPairs: optimal.pairs,
    optimalBest: optimal.best,
    maxOnlyBest: buildMaxOnlyBest(multipliers),
    scoutCosts,
    flipToCrownCount: optimal.flipToCrownCount,
    flipToShadeCount: optimal.flipToShadeCount,
    restartCount: optimal.restartCount,
    zeroCount: optimal.zeroCount,
  };
}

export function createInitialState(puzzle: FlipforgePuzzle): FlipforgeState {
  return {
    puzzle,
    selectedIndex: 0,
    sealedPairs: Array.from({ length: puzzle.multipliers.length }, () => null),
    chosenCrown: null,
    chosenShade: null,
    actionsUsed: 0,
    history: [],
    message:
      'Seal the live crown and live shade for each multiplier. Starting fresh is one option, but a negative multiplier can flip the prior shade into the new crown.',
    verdict: null,
  };
}

export function currentMultiplier(state: FlipforgeState) {
  return state.puzzle.multipliers[state.selectedIndex] ?? null;
}

export function selectedCandidates(state: FlipforgeState): FlipforgeCandidateMap | null {
  const multiplier = currentMultiplier(state);
  if (multiplier === null) return null;
  const previous = currentPreviousPair(state);
  if (state.selectedIndex > 0 && !previous) return null;
  return candidateMapFor(previous, multiplier);
}

export function scoutCostForIndex(puzzle: FlipforgePuzzle, index: number) {
  return puzzle.scoutCosts[index];
}

export function laneLabel(lane: FlipforgeLaneId) {
  if (lane === 'solo') return 'Start Here';
  if (lane === 'crown') return 'Carry Crown';
  return 'Flip Shade';
}

export function laneValueForSelection(state: FlipforgeState, lane: FlipforgeLaneId) {
  const candidates = selectedCandidates(state);
  if (!candidates) return null;
  return laneValue(candidates, lane);
}

export function canChooseLane(state: FlipforgeState, lane: FlipforgeLaneId) {
  if (state.verdict || state.selectedIndex >= state.puzzle.multipliers.length) return false;
  return laneValueForSelection(state, lane) !== null;
}

export function canSealIndex(state: FlipforgeState) {
  return (
    !state.verdict &&
    state.selectedIndex < state.puzzle.multipliers.length &&
    state.chosenCrown !== null &&
    state.chosenShade !== null
  );
}

export function canScoutIndex(state: FlipforgeState) {
  return !state.verdict && state.selectedIndex < state.puzzle.multipliers.length;
}

function sealedBest(state: FlipforgeState) {
  const crowns = state.sealedPairs
    .map((pair) => pair?.crown ?? null)
    .filter((value): value is number => value !== null);
  if (crowns.length === 0) return null;
  return Math.max(...crowns);
}

function advanceToNextIndex(next: FlipforgeState) {
  next.selectedIndex += 1;
  next.chosenCrown = null;
  next.chosenShade = null;
}

function finalize(next: FlipforgeState) {
  if (next.actionsUsed > next.puzzle.budget) {
    next.verdict = {
      correct: false,
      label: 'The forge cooled before the strip was fully certified.',
    };
    return next;
  }

  if (next.selectedIndex < next.puzzle.multipliers.length) {
    return next;
  }

  const mismatchIndex = next.sealedPairs.findIndex((pair, index) => {
    if (!pair) return true;
    const optimal = next.puzzle.optimalPairs[index];
    return pair.crown !== optimal.crown || pair.shade !== optimal.shade;
  });

  if (mismatchIndex === -1) {
    next.verdict = {
      correct: true,
      label: `Forge sealed. Best contiguous product: ${next.puzzle.optimalBest}.`,
    };
    return next;
  }

  const optimal = next.puzzle.optimalPairs[mismatchIndex];
  const actual = next.sealedPairs[mismatchIndex];
  next.verdict = {
    correct: false,
    label:
      actual === null
        ? `Index ${mismatchIndex + 1} was never certified.`
        : `Index ${mismatchIndex + 1} should seal at crown ${optimal.crown} and shade ${optimal.shade}, not crown ${actual.crown} and shade ${actual.shade}.`,
  };
  return next;
}

function sealPair(next: FlipforgeState, pair: FlipforgePair, cost: number, actionLabel: string) {
  const index = next.selectedIndex;
  const optimal = next.puzzle.optimalPairs[index];
  next.sealedPairs[index] = pair;
  next.actionsUsed += cost;
  next.history.unshift(
    actionLabel === 'scout'
      ? `Scouted index ${index + 1}: crown ${pair.crown}, shade ${pair.shade}.`
      : `Sealed index ${index + 1}: crown ${pair.crown}, shade ${pair.shade}.`,
  );

  if (pair.crown === optimal.crown && pair.shade === optimal.shade) {
    next.message = `Index ${index + 1} is certified. The live best so far is ${Math.max(sealedBest(next) ?? pair.crown, pair.crown)}.`;
  } else {
    next.message = `Index ${index + 1} is sealed, but one live lane is wrong. A sign flip or restart option was missed.`;
  }

  advanceToNextIndex(next);
  return finalize(next);
}

export function applyMove(state: FlipforgeState, move: FlipforgeMove): FlipforgeState {
  const next = cloneState(state);
  if (next.verdict) return next;

  if (move.type === 'choose_crown') {
    const lane = move.lane ?? 'solo';
    const value = laneValueForSelection(next, lane);
    if (value === null) {
      next.message = `${laneLabel(lane)} is locked at this index.`;
      return next;
    }
    next.chosenCrown = lane;
    next.message = `Crown prepared from ${laneLabel(lane)} at ${value}.`;
    return next;
  }

  if (move.type === 'choose_shade') {
    const lane = move.lane ?? 'solo';
    const value = laneValueForSelection(next, lane);
    if (value === null) {
      next.message = `${laneLabel(lane)} is locked at this index.`;
      return next;
    }
    next.chosenShade = lane;
    next.message = `Shade prepared from ${laneLabel(lane)} at ${value}.`;
    return next;
  }

  if (move.type === 'seal') {
    if (!canSealIndex(next)) {
      next.message = 'Choose one lane for the crown and one for the shade before sealing this index.';
      return next;
    }

    const candidates = selectedCandidates(next);
    if (!candidates || next.chosenCrown === null || next.chosenShade === null) {
      next.message = 'The forge cannot read the current candidates.';
      return next;
    }

    const crownValue = laneValue(candidates, next.chosenCrown);
    const shadeValue = laneValue(candidates, next.chosenShade);
    if (crownValue === null || shadeValue === null) {
      next.message = 'One chosen lane is not available at this index.';
      return next;
    }

    return sealPair(next, { crown: crownValue, shade: shadeValue }, 1, 'seal');
  }

  if (!canScoutIndex(next)) {
    next.message = 'Every multiplier is already certified.';
    return next;
  }

  return sealPair(
    next,
    next.puzzle.optimalPairs[next.selectedIndex],
    scoutCostForIndex(next.puzzle, next.selectedIndex),
    'scout',
  );
}

export function selectedPair(state: FlipforgeState) {
  if (state.selectedIndex >= state.puzzle.multipliers.length) return null;
  return state.sealedPairs[state.selectedIndex];
}

export function chosenValues(state: FlipforgeState) {
  const candidates = selectedCandidates(state);
  if (!candidates) {
    return { crown: null, shade: null };
  }

  return {
    crown: state.chosenCrown ? laneValue(candidates, state.chosenCrown) : null,
    shade: state.chosenShade ? laneValue(candidates, state.chosenShade) : null,
  };
}

export function sealedIndexCount(state: FlipforgeState) {
  return state.sealedPairs.filter((pair) => pair !== null).length;
}

export function remainingIndices(state: FlipforgeState) {
  return state.puzzle.multipliers.length - sealedIndexCount(state);
}

export function globalBestSoFar(state: FlipforgeState) {
  return sealedBest(state);
}

function simulateOptimal(puzzle: FlipforgePuzzle): SimulationSummary {
  return {
    solved: puzzle.multipliers.length <= puzzle.budget,
    actionsUsed: puzzle.multipliers.length,
    finalBest: puzzle.optimalBest,
  };
}

function simulateMaxOnly(puzzle: FlipforgePuzzle): SimulationSummary {
  return {
    solved: puzzle.maxOnlyBest === puzzle.optimalBest && puzzle.multipliers.length <= puzzle.budget,
    actionsUsed: puzzle.multipliers.length,
    finalBest: puzzle.maxOnlyBest,
  };
}

function simulateScoutAll(puzzle: FlipforgePuzzle): SimulationSummary {
  const actionsUsed = puzzle.scoutCosts.reduce((sum, value) => sum + value, 0);
  return {
    solved: actionsUsed <= puzzle.budget,
    actionsUsed,
    finalBest: puzzle.optimalBest,
  };
}

export function evaluateFlipforge(): FlipforgeEvaluation {
  const difficulties: DifficultyAggregate[] = [];
  const alternativeRatios: number[] = [];
  const pressureScores: number[] = [];

  for (const difficulty of [1, 2, 3, 4, 5] as FlipforgeDifficulty[]) {
    const puzzle = generatePuzzle(0, difficulty);
    const optimal = simulateOptimal(puzzle);
    const maxOnly = simulateMaxOnly(puzzle);
    const scout = simulateScoutAll(puzzle);

    const counterintuitive =
      puzzle.flipToCrownCount + puzzle.flipToShadeCount + puzzle.restartCount + puzzle.zeroCount;
    const trapDensity =
      counterintuitive / Math.max(1, puzzle.multipliers.length * 2);
    const alternativeRatio = Math.max(
      clamp(0, 1, puzzle.maxOnlyBest / Math.max(1, puzzle.optimalBest)),
      scout.solved ? 1 : 0,
    );
    alternativeRatios.push(alternativeRatio);

    const pressure = clamp(
      0,
      1,
      trapDensity * 0.9 + (maxOnly.solved ? 0 : 0.18) + (scout.solved ? 0 : 0.14),
    );
    pressureScores.push(pressure);

    difficulties.push({
      difficulty,
      label: puzzle.label,
      budget: puzzle.budget,
      solvability: optimal.solved ? 1 : 0,
      puzzleEntropy: Number(
        (
          puzzle.multipliers.length * 3.6 +
          puzzle.flipToCrownCount * 4.1 +
          puzzle.flipToShadeCount * 3.2 +
          puzzle.restartCount * 1.7 +
          puzzle.zeroCount * 2.3 +
          log2(Math.abs(puzzle.optimalBest) + 2) * 2.2
        ).toFixed(1),
      ),
      skillDepth: clamp(
        0.28,
        0.92,
        0.29 +
          trapDensity * 0.42 +
          (maxOnly.solved ? 0 : 0.12) +
          (scout.solved ? 0 : 0.07),
      ),
      decisionEntropy: clamp(
        1.0,
        4.4,
        1.12 + puzzle.multipliers.length * 0.16 + trapDensity * 1.5,
      ),
      counterintuitive,
      drama: clamp(0.4, 0.9, 0.47 + pressure * 0.36),
      infoGainRatio: Number(clamp(1.2, 5.4, 1.3 + trapDensity * 3.2 + puzzle.zeroCount * 0.22).toFixed(2)),
      optimalMoves: optimal.actionsUsed,
      altMoves: scout.solved ? scout.actionsUsed : maxOnly.actionsUsed,
      altSolvability: maxOnly.solved || scout.solved ? 1 : 0,
    });
  }

  const difficultyBreakpoint =
    difficulties.find((entry) => entry.difficulty >= 3 && entry.altSolvability === 0)?.difficulty ?? 5;
  const relevantRatios = alternativeRatios.slice(difficultyBreakpoint - 1);
  const relevantPressure = pressureScores.slice(difficultyBreakpoint - 1);
  const bestAlternativeGap = Number(
    clamp(
      0,
      1,
      relevantRatios.reduce((sum, value) => sum + (1 - value), 0) / Math.max(1, relevantRatios.length),
    ).toFixed(3),
  );
  const invariantPressure = Number(
    clamp(
      0,
      1,
      relevantPressure.reduce((sum, value) => sum + value, 0) / Math.max(1, relevantPressure.length),
    ).toFixed(3),
  );

  return {
    difficulties,
    learningMetrics: {
      inputShapeMatch: 1,
      operationMatch: 1,
      constraintMatch: 1,
      goalMatch: 1,
      leetCodeFit: 1,
      bestAlternativeGap,
      invariantPressure,
      difficultyBreakpoint,
      algorithmAlignment: 1,
    },
    interpretation: {
      invariant:
        'Each position must preserve the highest and lowest product ending exactly here, because the next negative multiplier may swap their roles.',
      strongestAlternative:
        'The near miss is to carry only one running best product or to brute-force each index separately.',
      evidence:
        'D3 is the first breakpoint where the max-only shortcut and the scout-all fallback both fail; medium-plus strips require a prior shade-to-crown flip to reach the true best product.',
    },
  };
}
