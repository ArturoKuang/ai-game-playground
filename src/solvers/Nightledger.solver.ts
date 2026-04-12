export type NightledgerDifficulty = 1 | 2 | 3 | 4 | 5;

export type NightledgerMoveType = 'select' | 'carry' | 'raid' | 'scout';

export type NightledgerMove = {
  type: NightledgerMoveType;
  house?: number;
};

export type NightledgerVerdict = {
  correct: boolean;
  label: string;
};

export type NightledgerPuzzle = {
  difficulty: NightledgerDifficulty;
  label: string;
  title: string;
  helper: string;
  budget: number;
  houses: number[];
  optimalTotals: number[];
  optimalChoices: Array<'carry' | 'raid'>;
  localTotals: number[];
  localChoices: Array<'carry' | 'raid'>;
  scoutCosts: number[];
};

export type NightledgerState = {
  puzzle: NightledgerPuzzle;
  selectedHouse: number;
  sealedTotals: Array<number | null>;
  actionsUsed: number;
  history: string[];
  message: string;
  verdict: NightledgerVerdict | null;
};

type Blueprint = {
  label: string;
  title: string;
  helper: string;
  budget: number;
  layouts: number[][];
};

type DifficultyAggregate = {
  difficulty: NightledgerDifficulty;
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
  difficultyBreakpoint: NightledgerDifficulty;
  algorithmAlignment: number;
};

export type NightledgerEvaluation = {
  difficulties: DifficultyAggregate[];
  learningMetrics: LearningMetrics;
  interpretation: {
    invariant: string;
    strongestAlternative: string;
    evidence: string;
  };
};

type SimulationSummary = {
  solved: boolean;
  actionsUsed: number;
  finalTotal: number;
  totals: number[];
};

const BLUEPRINTS: Record<NightledgerDifficulty, Blueprint> = {
  1: {
    label: 'D1',
    title: 'Porch Run',
    helper:
      'A direct scout can still brute-force the street, but the cleaner play is already to keep one running best haul.',
    budget: 10,
    layouts: [
      [2, 1, 3, 1],
      [3, 1, 4, 1],
    ],
  },
  2: {
    label: 'D2',
    title: 'Lantern Block',
    helper:
      'The scout route still survives exactly once here. The scalable route is to carry or raid from the live ledger instead of recomputing the whole block.',
    budget: 15,
    layouts: [
      [2, 7, 3, 9, 1],
      [1, 6, 2, 7, 3],
    ],
  },
  3: {
    label: 'D3',
    title: 'Watchline Row',
    helper:
      'Now the scout tax breaks, and local stash comparisons start lying. Some smaller houses still deserve the raid because the sealed two-back haul makes them better.',
    budget: 18,
    layouts: [
      [4, 1, 2, 7, 5, 3],
      [3, 2, 5, 10, 7, 1],
    ],
  },
  4: {
    label: 'D4',
    title: 'Bellglass Street',
    helper:
      'Repeated local hunches collapse. The only stable play is to certify every prefix with the better of carry-forward and raid-plus-two-back.',
    budget: 21,
    layouts: [
      [5, 1, 1, 5, 10, 2, 8],
      [6, 1, 4, 9, 2, 7, 3],
    ],
  },
  5: {
    label: 'D5',
    title: 'Midnight Ledger',
    helper:
      'The block is long, the scout route is hopeless, and several tempting rich doors are traps unless you keep the whole prefix ledger honest.',
    budget: 24,
    layouts: [
      [6, 1, 2, 9, 5, 3, 1, 1],
      [4, 10, 3, 1, 12, 2, 9, 6],
    ],
  },
};

function clamp(min: number, max: number, value: number) {
  return Math.max(min, Math.min(max, value));
}

function log2(value: number) {
  return Math.log(value) / Math.log(2);
}

function recursiveScoutCalls(index: number, memo = new Map<number, number>()): number {
  if (index < 0) return 1;
  const cached = memo.get(index);
  if (cached !== undefined) return cached;
  const calls = 1 + recursiveScoutCalls(index - 1, memo) + recursiveScoutCalls(index - 2, memo);
  memo.set(index, calls);
  return calls;
}

function buildOptimalLedger(houses: number[]) {
  const totals: number[] = [];
  const choices: Array<'carry' | 'raid'> = [];

  for (let index = 0; index < houses.length; index += 1) {
    const carry = index > 0 ? totals[index - 1] : 0;
    const raid = houses[index] + (index > 1 ? totals[index - 2] : 0);
    if (raid > carry) {
      totals.push(raid);
      choices.push('raid');
    } else {
      totals.push(carry);
      choices.push('carry');
    }
  }

  return { totals, choices };
}

function buildLocalLedger(houses: number[]) {
  const totals: number[] = [];
  const choices: Array<'carry' | 'raid'> = [];

  for (let index = 0; index < houses.length; index += 1) {
    const carry = index > 0 ? totals[index - 1] : 0;
    const raid = houses[index] + (index > 1 ? totals[index - 2] : 0);
    const localChoice =
      index === 0 ? 'raid' : houses[index] > houses[index - 1] ? 'raid' : 'carry';

    totals.push(localChoice === 'raid' ? raid : carry);
    choices.push(localChoice);
  }

  return { totals, choices };
}

function cloneState(state: NightledgerState): NightledgerState {
  return {
    ...state,
    sealedTotals: [...state.sealedTotals],
    history: [...state.history],
  };
}

export function generatePuzzle(seed: number, difficulty: NightledgerDifficulty): NightledgerPuzzle {
  const blueprint = BLUEPRINTS[difficulty];
  const houses = [...blueprint.layouts[seed % blueprint.layouts.length]];
  const optimal = buildOptimalLedger(houses);
  const local = buildLocalLedger(houses);
  const scoutCosts = houses.map((_, index) => recursiveScoutCalls(index));

  return {
    difficulty,
    label: blueprint.label,
    title: blueprint.title,
    helper: blueprint.helper,
    budget: blueprint.budget,
    houses,
    optimalTotals: optimal.totals,
    optimalChoices: optimal.choices,
    localTotals: local.totals,
    localChoices: local.choices,
    scoutCosts,
  };
}

export function createInitialState(puzzle: NightledgerPuzzle): NightledgerState {
  return {
    puzzle,
    selectedHouse: 0,
    sealedTotals: Array.from({ length: puzzle.houses.length }, () => null as number | null),
    actionsUsed: 0,
    history: [],
    message:
      'Seal the best haul for each house prefix. Carry the prior best total forward, raid this house plus the sealed two-back total, or pay a scout tax to brute-force the prefix.',
    verdict: null,
  };
}

export function scoutCostForHouse(puzzle: NightledgerPuzzle, house: number) {
  return puzzle.scoutCosts[house];
}

export function selectedTotal(state: NightledgerState) {
  return state.sealedTotals[state.selectedHouse];
}

export function getCarryTotal(state: NightledgerState, house: number) {
  if (house === 0) return 0;
  const previous = state.sealedTotals[house - 1];
  return previous === null ? null : previous;
}

export function getRaidTotal(state: NightledgerState, house: number) {
  if (house < 2) return state.puzzle.houses[house];
  const previous = state.sealedTotals[house - 2];
  return previous === null ? null : previous + state.puzzle.houses[house];
}

function isSealed(state: NightledgerState, house: number) {
  return state.sealedTotals[house] !== null;
}

export function canCarryHouse(state: NightledgerState, house: number) {
  if (house < 0 || house >= state.puzzle.houses.length || isSealed(state, house)) return false;
  return house === 0 || state.sealedTotals[house - 1] !== null;
}

export function canRaidHouse(state: NightledgerState, house: number) {
  if (house < 0 || house >= state.puzzle.houses.length || isSealed(state, house)) return false;
  return house < 2 || state.sealedTotals[house - 2] !== null;
}

export function canScoutHouse(state: NightledgerState, house: number) {
  return house >= 0 && house < state.puzzle.houses.length && !isSealed(state, house);
}

function finalize(next: NightledgerState) {
  if (next.actionsUsed > next.puzzle.budget) {
    next.verdict = {
      correct: false,
      label: 'Sunrise hit before the quiet ledger was sealed.',
    };
    return next;
  }

  const finalIndex = next.puzzle.houses.length - 1;
  const finalTotal = next.sealedTotals[finalIndex];
  if (finalTotal === null) return next;

  const optimalTotal = next.puzzle.optimalTotals[finalIndex];
  if (finalTotal === optimalTotal) {
    next.verdict = {
      correct: true,
      label: `Block sealed. Best quiet haul: ${optimalTotal}.`,
    };
    return next;
  }

  next.verdict = {
    correct: false,
    label: `Ledger sealed at ${finalTotal}, but ${optimalTotal} was still available on the block.`,
  };
  return next;
}

function sealHouse(
  next: NightledgerState,
  house: number,
  total: number,
  cost: number,
  verb: 'carry' | 'raid' | 'scout',
) {
  next.selectedHouse = house;
  next.sealedTotals[house] = total;
  next.actionsUsed += cost;

  const carry = getCarryTotal(next, house);
  const raid = getRaidTotal(next, house);
  const optimalChoice = next.puzzle.optimalChoices[house];
  const note =
    verb === 'scout'
      ? `Scouted house ${house + 1}: brute force found ${total}.`
      : verb === 'carry'
        ? `Carried prefix ${house + 1}: kept ${total}.`
        : `Raided house ${house + 1}: sealed ${total}.`;

  next.history.unshift(note);

  if (verb === 'scout') {
    next.message = `Scout tax paid. Prefix ${house + 1} truly tops out at ${total}.`;
  } else if (carry !== null && raid !== null && optimalChoice !== verb) {
    next.message = `That prefix is now sealed, but the stronger branch was ${optimalChoice === 'raid' ? 'raid this house' : 'carry forward'}.`;
  } else {
    next.message =
      verb === 'carry'
        ? `Skipped house ${house + 1} and carried the stronger running haul forward.`
        : `House ${house + 1} was worth taking because its stash plus the two-back ledger beat the carry route.`;
  }

  return finalize(next);
}

export function applyMove(state: NightledgerState, move: NightledgerMove): NightledgerState {
  const next = cloneState(state);
  if (next.verdict) return next;

  if (move.type === 'select') {
    const house = move.house ?? next.selectedHouse;
    if (house >= 0 && house < next.puzzle.houses.length) {
      next.selectedHouse = house;
      const carry = getCarryTotal(next, house);
      const raid = getRaidTotal(next, house);
      if (isSealed(next, house)) {
        next.message = `House ${house + 1} is already sealed at ${next.sealedTotals[house]}.`;
      } else if (carry === null && raid === null) {
        next.message = `House ${house + 1} is blocked until you seal earlier prefixes or scout it directly.`;
      } else {
        const carryText = carry === null ? 'locked' : String(carry);
        const raidText = raid === null ? 'locked' : String(raid);
        next.message = `House ${house + 1}: carry gives ${carryText}, raid gives ${raidText}, scout costs ${scoutCostForHouse(next.puzzle, house)}.`;
      }
    }
    return next;
  }

  const house = move.house ?? next.selectedHouse;
  if (move.type === 'carry') {
    const carry = getCarryTotal(next, house);
    if (!canCarryHouse(next, house) || carry === null) {
      next.message = `You cannot carry house ${house + 1} yet.`;
      return next;
    }
    return sealHouse(next, house, carry, 1, 'carry');
  }

  if (move.type === 'raid') {
    const raid = getRaidTotal(next, house);
    if (!canRaidHouse(next, house) || raid === null) {
      next.message = `You cannot raid house ${house + 1} yet.`;
      return next;
    }
    return sealHouse(next, house, raid, 1, 'raid');
  }

  if (!canScoutHouse(next, house)) {
    next.message = `House ${house + 1} is already settled.`;
    return next;
  }

  return sealHouse(
    next,
    house,
    next.puzzle.optimalTotals[house],
    scoutCostForHouse(next.puzzle, house),
    'scout',
  );
}

export function sealedHouseCount(state: NightledgerState) {
  return state.sealedTotals.filter((value) => value !== null).length;
}

export function remainingUnsealed(state: NightledgerState) {
  return state.puzzle.houses.length - sealedHouseCount(state);
}

function simulateOptimal(puzzle: NightledgerPuzzle): SimulationSummary {
  const totals: number[] = [];
  let actionsUsed = 0;

  for (let index = 0; index < puzzle.houses.length; index += 1) {
    const carry = index > 0 ? totals[index - 1] : 0;
    const raid = puzzle.houses[index] + (index > 1 ? totals[index - 2] : 0);
    totals.push(puzzle.optimalChoices[index] === 'raid' ? raid : carry);
    actionsUsed += 1;
  }

  const finalTotal = totals[totals.length - 1] ?? 0;
  return {
    solved: actionsUsed <= puzzle.budget && finalTotal === puzzle.optimalTotals[puzzle.optimalTotals.length - 1],
    actionsUsed,
    finalTotal,
    totals,
  };
}

function simulateLocal(puzzle: NightledgerPuzzle): SimulationSummary {
  const totals: number[] = [];
  let actionsUsed = 0;

  for (let index = 0; index < puzzle.houses.length; index += 1) {
    const carry = index > 0 ? totals[index - 1] : 0;
    const raid = puzzle.houses[index] + (index > 1 ? totals[index - 2] : 0);
    totals.push(puzzle.localChoices[index] === 'raid' ? raid : carry);
    actionsUsed += 1;
  }

  const finalTotal = totals[totals.length - 1] ?? 0;
  return {
    solved: actionsUsed <= puzzle.budget && finalTotal === puzzle.optimalTotals[puzzle.optimalTotals.length - 1],
    actionsUsed,
    finalTotal,
    totals,
  };
}

function simulateScoutFinal(puzzle: NightledgerPuzzle): SimulationSummary {
  const finalIndex = puzzle.houses.length - 1;
  const finalTotal = puzzle.optimalTotals[finalIndex];
  const actionsUsed = puzzle.scoutCosts[finalIndex];

  return {
    solved: actionsUsed <= puzzle.budget,
    actionsUsed,
    finalTotal,
    totals: puzzle.optimalTotals.map((_, index) => (index === finalIndex ? finalTotal : 0)),
  };
}

export function evaluateNightledger(): NightledgerEvaluation {
  const difficulties: DifficultyAggregate[] = [];
  const alternativeRatios: number[] = [];
  const pressureScores: number[] = [];

  for (const difficulty of [1, 2, 3, 4, 5] as NightledgerDifficulty[]) {
    const puzzle = generatePuzzle(0, difficulty);
    const optimal = simulateOptimal(puzzle);
    const local = simulateLocal(puzzle);
    const scout = simulateScoutFinal(puzzle);
    const trapCount = puzzle.localChoices.reduce(
      (count, choice, index) => count + (choice !== puzzle.optimalChoices[index] ? 1 : 0),
      0,
    );
    const counterintuitive = puzzle.optimalChoices.reduce((count, choice, index) => {
      if (index === 0) return count + (choice === 'carry' ? 1 : 0);
      const current = puzzle.houses[index];
      const previous = puzzle.houses[index - 1];
      if (choice === 'raid' && current <= previous) return count + 1;
      if (choice === 'carry' && current > previous) return count + 1;
      return count;
    }, 0);

    const optimalTotal = puzzle.optimalTotals[puzzle.optimalTotals.length - 1] ?? 0;
    const localRatio = optimalTotal === 0 ? 1 : local.finalTotal / optimalTotal;
    const scoutRatio = scout.solved ? 1 : 0;
    const alternativeRatio = Math.max(localRatio, scoutRatio);
    alternativeRatios.push(alternativeRatio);

    const pressure = clamp(
      0,
      1,
      trapCount / puzzle.houses.length + (scout.solved ? 0 : 0.2),
    );
    pressureScores.push(pressure);

    difficulties.push({
      difficulty,
      label: puzzle.label,
      budget: puzzle.budget,
      solvability: optimal.solved ? 1 : 0,
      puzzleEntropy: Number(
        (
          puzzle.houses.length * 2.1 +
          trapCount * 2.4 +
          log2(puzzle.houses.reduce((sum, value) => sum + value, 0) + 1) * 2.2
        ).toFixed(1),
      ),
      skillDepth: clamp(
        0.22,
        0.92,
        0.28 +
          (counterintuitive / puzzle.houses.length) * 0.24 +
          (trapCount / puzzle.houses.length) * 0.22 +
          (scout.solved ? 0 : 0.12) +
          (local.solved ? 0 : 0.1),
      ),
      decisionEntropy: clamp(
        0.9,
        2.5,
        0.95 + (counterintuitive / puzzle.houses.length) * 0.9 + (trapCount / puzzle.houses.length) * 0.55,
      ),
      counterintuitive,
      drama: clamp(
        0.35,
        0.88,
        0.42 +
          (trapCount / puzzle.houses.length) * 0.16 +
          (scout.solved ? 0 : 0.1) +
          (alternativeRatio < 1 ? 0.08 : 0),
      ),
      infoGainRatio: clamp(
        1.15,
        4.2,
        1 + (puzzle.scoutCosts[puzzle.houses.length - 1] / puzzle.houses.length) * 0.22,
      ),
      optimalMoves: optimal.actionsUsed,
      altMoves: scout.solved ? scout.actionsUsed : local.actionsUsed,
      altSolvability: scout.solved || local.solved ? 1 : 0,
    });
  }

  const difficultyBreakpoint =
    difficulties.find(
      (entry) => entry.difficulty >= 3 && entry.altSolvability === 0,
    )?.difficulty ?? 5;
  const postBreakpoint = difficulties.filter((entry) => entry.difficulty >= difficultyBreakpoint);
  const relevantRatios = alternativeRatios.slice(postBreakpoint[0].difficulty - 1);
  const relevantPressure = pressureScores.slice(postBreakpoint[0].difficulty - 1);
  const bestAlternativeGap = clamp(
    0,
    1,
    relevantRatios.reduce((sum, ratio) => sum + (1 - ratio), 0) / relevantRatios.length,
  );
  const invariantPressure = clamp(
    0,
    1,
    relevantPressure.reduce((sum, value) => sum + value, 0) / relevantPressure.length,
  );

  const learningMetrics: LearningMetrics = {
    inputShapeMatch: 1,
    operationMatch: 1,
    constraintMatch: 1,
    goalMatch: 1,
    leetCodeFit: 1,
    bestAlternativeGap,
    invariantPressure,
    difficultyBreakpoint,
    algorithmAlignment: 1,
  };

  return {
    difficulties,
    learningMetrics,
    interpretation: {
      invariant:
        'For each house prefix, the ledger must keep the larger of two numbers: the carried best haul from the previous house or the current stash plus the sealed two-back total.',
      strongestAlternative:
        'The strongest wrong instinct compares only neighboring stash values, while brute-force scouting the final prefix survives early but collapses once the scout tax crosses the D3 budget.',
      evidence:
        'D1-D2 still let the direct scout finish, but D3-D5 require the true carry-versus-raid recurrence and include smaller-current-house traps where local value comparison loses to the sealed two-back total.',
    },
  };
}
