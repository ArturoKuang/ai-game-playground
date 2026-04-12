export type LoopledgerDifficulty = 1 | 2 | 3 | 4 | 5;

export type LoopledgerTrackId = 'skipFirst' | 'skipLast';

export type LoopledgerMoveType = 'select_track' | 'select_house' | 'carry' | 'raid' | 'scout';

export type LoopledgerMove = {
  type: LoopledgerMoveType;
  trackId?: LoopledgerTrackId;
  house?: number;
};

export type LoopledgerVerdict = {
  correct: boolean;
  label: string;
};

export type LoopledgerTrack = {
  id: LoopledgerTrackId;
  label: string;
  excludedHouse: number;
  houses: number[];
  sourceIndices: number[];
  optimalTotals: number[];
  optimalChoices: Array<'carry' | 'raid'>;
  localTotals: number[];
  localChoices: Array<'carry' | 'raid'>;
  scoutCosts: number[];
};

export type LoopledgerPuzzle = {
  difficulty: LoopledgerDifficulty;
  label: string;
  title: string;
  helper: string;
  budget: number;
  ringHouses: number[];
  tracks: Record<LoopledgerTrackId, LoopledgerTrack>;
  bestTrackId: LoopledgerTrackId;
  greedyTrackId: LoopledgerTrackId;
  greedyTotal: number;
  localTotal: number;
  fullRingLinearTotal: number;
  optimalTotal: number;
  scoutBothCost: number;
};

export type LoopledgerState = {
  puzzle: LoopledgerPuzzle;
  activeTrack: LoopledgerTrackId;
  selectedHouseByTrack: Record<LoopledgerTrackId, number>;
  sealedTotalsByTrack: Record<LoopledgerTrackId, Array<number | null>>;
  actionsUsed: number;
  history: string[];
  message: string;
  verdict: LoopledgerVerdict | null;
};

type Blueprint = {
  label: string;
  title: string;
  helper: string;
  budget: number;
  layouts: number[][];
};

type DifficultyAggregate = {
  difficulty: LoopledgerDifficulty;
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
  difficultyBreakpoint: LoopledgerDifficulty;
  algorithmAlignment: number;
};

export type LoopledgerEvaluation = {
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
};

const TRACK_IDS: LoopledgerTrackId[] = ['skipFirst', 'skipLast'];

const TRACK_LABELS: Record<LoopledgerTrackId, string> = {
  skipFirst: 'Skip First',
  skipLast: 'Skip Last',
};

const BLUEPRINTS: Record<LoopledgerDifficulty, Blueprint> = {
  1: {
    label: 'D1',
    title: 'Porch Loop',
    helper:
      'The ring is short enough that scouting both legal cuts still survives once. The scalable habit is to keep both prefix ledgers instead of trusting the richer endpoint.',
    budget: 20,
    layouts: [
      [2, 3, 2, 1],
      [1, 2, 3, 1],
    ],
  },
  2: {
    label: 'D2',
    title: 'Bell Circuit',
    helper:
      'You can still brute-force both cut totals here, but the dual ledgers already feel cleaner. Keep one running answer for each legal way to break the ring.',
    budget: 31,
    layouts: [
      [2, 7, 3, 9, 1],
      [1, 6, 2, 7, 3],
    ],
  },
  3: {
    label: 'D3',
    title: 'Alarm Ring',
    helper:
      'The scout route now breaks. Medium rings also punish the endpoint hunch: the better answer may come from excluding the slightly smaller end house.',
    budget: 22,
    layouts: [
      [6, 1, 1, 9, 8],
      [3, 2, 5, 10, 7],
    ],
  },
  4: {
    label: 'D4',
    title: 'Midnight Loop',
    helper:
      'Both shortcuts now lie at once. You must keep the carry-versus-raid recurrence inside each cut and still compare the two finished cut totals at the end.',
    budget: 24,
    layouts: [
      [10, 1, 1, 1, 100, 20],
      [5, 2, 8, 1, 50, 6],
    ],
  },
  5: {
    label: 'D5',
    title: 'Crown Circuit',
    helper:
      'Longer loops leave no slack for guesswork. Only two disciplined ledgers, one for each legal cut, can certify the true quiet haul before sunrise.',
    budget: 27,
    layouts: [
      [30, 1, 1, 1, 1, 100, 40],
      [6, 2, 9, 1, 4, 90, 7],
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

function buildTrack(trackId: LoopledgerTrackId, ringHouses: number[]): LoopledgerTrack {
  const sourceIndices =
    trackId === 'skipFirst'
      ? ringHouses.map((_, index) => index).slice(1)
      : ringHouses.map((_, index) => index).slice(0, ringHouses.length - 1);
  const houses = sourceIndices.map((index) => ringHouses[index]);
  const optimal = buildOptimalLedger(houses);
  const local = buildLocalLedger(houses);

  return {
    id: trackId,
    label: TRACK_LABELS[trackId],
    excludedHouse: trackId === 'skipFirst' ? 0 : ringHouses.length - 1,
    houses,
    sourceIndices,
    optimalTotals: optimal.totals,
    optimalChoices: optimal.choices,
    localTotals: local.totals,
    localChoices: local.choices,
    scoutCosts: houses.map((_, index) => recursiveScoutCalls(index)),
  };
}

function greedyTrackForRing(ringHouses: number[]) {
  const first = ringHouses[0];
  const last = ringHouses[ringHouses.length - 1];
  return first <= last ? 'skipFirst' : 'skipLast';
}

function cloneState(state: LoopledgerState): LoopledgerState {
  return {
    ...state,
    selectedHouseByTrack: { ...state.selectedHouseByTrack },
    sealedTotalsByTrack: {
      skipFirst: [...state.sealedTotalsByTrack.skipFirst],
      skipLast: [...state.sealedTotalsByTrack.skipLast],
    },
    history: [...state.history],
  };
}

export function generatePuzzle(seed: number, difficulty: LoopledgerDifficulty): LoopledgerPuzzle {
  const blueprint = BLUEPRINTS[difficulty];
  const ringHouses = [...blueprint.layouts[seed % blueprint.layouts.length]];
  const skipFirst = buildTrack('skipFirst', ringHouses);
  const skipLast = buildTrack('skipLast', ringHouses);
  const bestTrackId =
    (skipFirst.optimalTotals[skipFirst.optimalTotals.length - 1] ?? 0) >
    (skipLast.optimalTotals[skipLast.optimalTotals.length - 1] ?? 0)
      ? 'skipFirst'
      : 'skipLast';
  const greedyTrackId = greedyTrackForRing(ringHouses);
  const localTotal = Math.max(
    skipFirst.localTotals[skipFirst.localTotals.length - 1] ?? 0,
    skipLast.localTotals[skipLast.localTotals.length - 1] ?? 0,
  );

  return {
    difficulty,
    label: blueprint.label,
    title: blueprint.title,
    helper: blueprint.helper,
    budget: blueprint.budget,
    ringHouses,
    tracks: {
      skipFirst,
      skipLast,
    },
    bestTrackId,
    greedyTrackId,
    greedyTotal:
      (greedyTrackId === 'skipFirst'
        ? skipFirst.optimalTotals[skipFirst.optimalTotals.length - 1]
        : skipLast.optimalTotals[skipLast.optimalTotals.length - 1]) ?? 0,
    localTotal,
    fullRingLinearTotal:
      buildOptimalLedger(ringHouses).totals[ringHouses.length - 1] ?? 0,
    optimalTotal: Math.max(
      skipFirst.optimalTotals[skipFirst.optimalTotals.length - 1] ?? 0,
      skipLast.optimalTotals[skipLast.optimalTotals.length - 1] ?? 0,
    ),
    scoutBothCost:
      (skipFirst.scoutCosts[skipFirst.scoutCosts.length - 1] ?? 0) +
      (skipLast.scoutCosts[skipLast.scoutCosts.length - 1] ?? 0),
  };
}

export function createInitialState(puzzle: LoopledgerPuzzle): LoopledgerState {
  return {
    puzzle,
    activeTrack: 'skipFirst',
    selectedHouseByTrack: {
      skipFirst: 0,
      skipLast: 0,
    },
    sealedTotalsByTrack: {
      skipFirst: Array.from({ length: puzzle.tracks.skipFirst.houses.length }, () => null as number | null),
      skipLast: Array.from({ length: puzzle.tracks.skipLast.houses.length }, () => null as number | null),
    },
    actionsUsed: 0,
    history: [],
    message:
      'The first and last houses share one alarm. Break the ring two legal ways, keep a quiet ledger for each cut, then crown the stronger finished cut.',
    verdict: null,
  };
}

export function trackFor(puzzle: LoopledgerPuzzle, trackId: LoopledgerTrackId) {
  return puzzle.tracks[trackId];
}

export function selectedTrackHouse(state: LoopledgerState, trackId = state.activeTrack) {
  return state.selectedHouseByTrack[trackId];
}

export function selectedTotal(state: LoopledgerState, trackId = state.activeTrack) {
  return state.sealedTotalsByTrack[trackId][selectedTrackHouse(state, trackId)];
}

export function scoutCostForHouse(
  puzzle: LoopledgerPuzzle,
  trackId: LoopledgerTrackId,
  house: number,
) {
  return puzzle.tracks[trackId].scoutCosts[house];
}

export function trackFinalTotal(state: LoopledgerState, trackId: LoopledgerTrackId) {
  const totals = state.sealedTotalsByTrack[trackId];
  return totals[totals.length - 1] ?? null;
}

export function getCarryTotal(state: LoopledgerState, trackId: LoopledgerTrackId, house: number) {
  if (house === 0) return 0;
  const previous = state.sealedTotalsByTrack[trackId][house - 1];
  return previous === null ? null : previous;
}

export function getRaidTotal(state: LoopledgerState, trackId: LoopledgerTrackId, house: number) {
  const track = trackFor(state.puzzle, trackId);
  if (house < 2) return track.houses[house];
  const previous = state.sealedTotalsByTrack[trackId][house - 2];
  return previous === null ? null : previous + track.houses[house];
}

function isSealed(state: LoopledgerState, trackId: LoopledgerTrackId, house: number) {
  return state.sealedTotalsByTrack[trackId][house] !== null;
}

export function canCarryHouse(state: LoopledgerState, trackId: LoopledgerTrackId, house: number) {
  const track = trackFor(state.puzzle, trackId);
  if (house < 0 || house >= track.houses.length || isSealed(state, trackId, house)) return false;
  return house === 0 || state.sealedTotalsByTrack[trackId][house - 1] !== null;
}

export function canRaidHouse(state: LoopledgerState, trackId: LoopledgerTrackId, house: number) {
  const track = trackFor(state.puzzle, trackId);
  if (house < 0 || house >= track.houses.length || isSealed(state, trackId, house)) return false;
  return house < 2 || state.sealedTotalsByTrack[trackId][house - 2] !== null;
}

export function canScoutHouse(state: LoopledgerState, trackId: LoopledgerTrackId, house: number) {
  const track = trackFor(state.puzzle, trackId);
  return house >= 0 && house < track.houses.length && !isSealed(state, trackId, house);
}

function finalize(next: LoopledgerState) {
  if (next.actionsUsed > next.puzzle.budget) {
    next.verdict = {
      correct: false,
      label: 'Sunrise hit before both legal cuts were certified.',
    };
    return next;
  }

  const finals = TRACK_IDS.map((trackId) => trackFinalTotal(next, trackId));
  if (finals.some((value) => value === null)) return next;

  const mismatchedTrack = TRACK_IDS.find((trackId) => {
    const track = trackFor(next.puzzle, trackId);
    return trackFinalTotal(next, trackId) !== (track.optimalTotals[track.optimalTotals.length - 1] ?? 0);
  });

  if (!mismatchedTrack) {
    next.verdict = {
      correct: true,
      label: `Ring sealed. Best quiet haul: ${next.puzzle.optimalTotal}.`,
    };
    return next;
  }

  next.verdict = {
    correct: false,
    label: `${TRACK_LABELS[mismatchedTrack]} was sealed incorrectly. The ring still hid ${next.puzzle.optimalTotal}.`,
  };
  return next;
}

function sealHouse(
  next: LoopledgerState,
  trackId: LoopledgerTrackId,
  house: number,
  total: number,
  cost: number,
  verb: 'carry' | 'raid' | 'scout',
) {
  const track = trackFor(next.puzzle, trackId);
  next.activeTrack = trackId;
  next.selectedHouseByTrack[trackId] = house;
  next.sealedTotalsByTrack[trackId][house] = total;
  next.actionsUsed += cost;

  const originalHouse = track.sourceIndices[house] + 1;
  const carry = getCarryTotal(next, trackId, house);
  const raid = getRaidTotal(next, trackId, house);
  const optimalChoice = track.optimalChoices[house];

  const note =
    verb === 'scout'
      ? `${track.label}: scouted H${originalHouse} and found ${total}.`
      : verb === 'carry'
        ? `${track.label}: carried H${originalHouse} at ${total}.`
        : `${track.label}: raided H${originalHouse} for ${total}.`;
  next.history.unshift(note);

  const finalIndex = track.houses.length - 1;
  const otherTrackId = trackId === 'skipFirst' ? 'skipLast' : 'skipFirst';
  if (house === finalIndex && trackFinalTotal(next, otherTrackId) === null) {
    next.message = `${track.label} is sealed at ${total}. Now certify ${TRACK_LABELS[otherTrackId]} before crowning the ring.`;
    return finalize(next);
  }

  if (verb === 'scout') {
    next.message = `${track.label}: brute-force scouting says this prefix tops out at ${total}.`;
  } else if (carry !== null && raid !== null && optimalChoice !== verb) {
    next.message = `${track.label}: that prefix is sealed, but the stronger branch here was ${optimalChoice === 'raid' ? 'raid this house' : 'carry forward'}.`;
  } else if (verb === 'carry') {
    next.message = `${track.label}: skipped H${originalHouse} and carried the stronger cut total forward.`;
  } else {
    next.message = `${track.label}: H${originalHouse} was worth taking because its stash plus the sealed two-back total beat the carry route.`;
  }

  return finalize(next);
}

export function applyMove(state: LoopledgerState, move: LoopledgerMove): LoopledgerState {
  const next = cloneState(state);
  if (next.verdict) return next;

  if (move.type === 'select_track') {
    const trackId = move.trackId ?? next.activeTrack;
    next.activeTrack = trackId;
    const house = selectedTrackHouse(next, trackId);
    const track = trackFor(next.puzzle, trackId);
    const originalHouse = track.sourceIndices[house] + 1;
    const carry = getCarryTotal(next, trackId, house);
    const raid = getRaidTotal(next, trackId, house);
    next.message = `Active cut: ${track.label}. H${originalHouse} offers carry ${carry ?? 'locked'}, raid ${raid ?? 'locked'}, scout ${scoutCostForHouse(next.puzzle, trackId, house)}.`;
    return next;
  }

  if (move.type === 'select_house') {
    const trackId = move.trackId ?? next.activeTrack;
    const house = move.house ?? selectedTrackHouse(next, trackId);
    const track = trackFor(next.puzzle, trackId);
    if (house >= 0 && house < track.houses.length) {
      next.activeTrack = trackId;
      next.selectedHouseByTrack[trackId] = house;
      const carry = getCarryTotal(next, trackId, house);
      const raid = getRaidTotal(next, trackId, house);
      const originalHouse = track.sourceIndices[house] + 1;
      if (isSealed(next, trackId, house)) {
        next.message = `${track.label}: H${originalHouse} is already sealed at ${next.sealedTotalsByTrack[trackId][house]}.`;
      } else if (carry === null && raid === null) {
        next.message = `${track.label}: H${originalHouse} is blocked until earlier prefixes are sealed or scouted.`;
      } else {
        next.message = `${track.label}: H${originalHouse} gives carry ${carry ?? 'locked'}, raid ${raid ?? 'locked'}, scout ${scoutCostForHouse(next.puzzle, trackId, house)}.`;
      }
    }
    return next;
  }

  const trackId = move.trackId ?? next.activeTrack;
  const house = move.house ?? selectedTrackHouse(next, trackId);
  const track = trackFor(next.puzzle, trackId);
  const originalHouse = track.sourceIndices[house] + 1;

  if (move.type === 'carry') {
    const carry = getCarryTotal(next, trackId, house);
    if (!canCarryHouse(next, trackId, house) || carry === null) {
      next.message = `${track.label}: you cannot carry H${originalHouse} yet.`;
      return next;
    }
    return sealHouse(next, trackId, house, carry, 1, 'carry');
  }

  if (move.type === 'raid') {
    const raid = getRaidTotal(next, trackId, house);
    if (!canRaidHouse(next, trackId, house) || raid === null) {
      next.message = `${track.label}: you cannot raid H${originalHouse} yet.`;
      return next;
    }
    return sealHouse(next, trackId, house, raid, 1, 'raid');
  }

  if (!canScoutHouse(next, trackId, house)) {
    next.message = `${track.label}: H${originalHouse} is already settled.`;
    return next;
  }

  return sealHouse(
    next,
    trackId,
    house,
    track.optimalTotals[house],
    scoutCostForHouse(next.puzzle, trackId, house),
    'scout',
  );
}

export function sealedHouseCount(state: LoopledgerState) {
  return TRACK_IDS.reduce(
    (total, trackId) => total + state.sealedTotalsByTrack[trackId].filter((value) => value !== null).length,
    0,
  );
}

export function remainingUnsealed(state: LoopledgerState) {
  return TRACK_IDS.reduce(
    (total, trackId) => total + state.sealedTotalsByTrack[trackId].filter((value) => value === null).length,
    0,
  );
}

function simulateOptimal(puzzle: LoopledgerPuzzle): SimulationSummary {
  const actionsUsed =
    puzzle.tracks.skipFirst.houses.length + puzzle.tracks.skipLast.houses.length;
  return {
    solved: actionsUsed <= puzzle.budget,
    actionsUsed,
    finalTotal: puzzle.optimalTotal,
  };
}

function simulateGreedyCut(puzzle: LoopledgerPuzzle): SimulationSummary {
  const track = trackFor(puzzle, puzzle.greedyTrackId);
  const finalTotal = track.optimalTotals[track.optimalTotals.length - 1] ?? 0;
  return {
    solved: finalTotal === puzzle.optimalTotal,
    actionsUsed: track.houses.length,
    finalTotal,
  };
}

function simulateLocalTracks(puzzle: LoopledgerPuzzle): SimulationSummary {
  const finalTotal = puzzle.localTotal;
  return {
    solved: finalTotal === puzzle.optimalTotal,
    actionsUsed:
      puzzle.tracks.skipFirst.houses.length + puzzle.tracks.skipLast.houses.length,
    finalTotal,
  };
}

function simulateScoutBoth(puzzle: LoopledgerPuzzle): SimulationSummary {
  return {
    solved: puzzle.scoutBothCost <= puzzle.budget,
    actionsUsed: puzzle.scoutBothCost,
    finalTotal: puzzle.optimalTotal,
  };
}

export function evaluateLoopledger(): LoopledgerEvaluation {
  const difficulties: DifficultyAggregate[] = [];
  const alternativeRatios: number[] = [];
  const pressureScores: number[] = [];

  for (const difficulty of [1, 2, 3, 4, 5] as LoopledgerDifficulty[]) {
    const puzzle = generatePuzzle(0, difficulty);
    const optimal = simulateOptimal(puzzle);
    const greedy = simulateGreedyCut(puzzle);
    const scout = simulateScoutBoth(puzzle);

    const choiceMismatches = TRACK_IDS.reduce((count, trackId) => {
      const track = trackFor(puzzle, trackId);
      return (
        count +
        track.localChoices.reduce(
          (trackCount, choice, index) => trackCount + (choice !== track.optimalChoices[index] ? 1 : 0),
          0,
        )
      );
    }, 0);
    const splitTrap = puzzle.greedyTotal !== puzzle.optimalTotal ? 1 : 0;
    const counterintuitive =
      TRACK_IDS.reduce((count, trackId) => {
        const track = trackFor(puzzle, trackId);
        return (
          count +
          track.optimalChoices.reduce((trackCount, choice, index) => {
            if (index === 0) return trackCount + (choice === 'carry' ? 1 : 0);
            const current = track.houses[index];
            const previous = track.houses[index - 1];
            if (choice === 'raid' && current <= previous) return trackCount + 1;
            if (choice === 'carry' && current > previous) return trackCount + 1;
            return trackCount;
          }, 0)
        );
      }, 0) + splitTrap;

    const greedyRatio = puzzle.optimalTotal === 0 ? 1 : greedy.finalTotal / puzzle.optimalTotal;
    const scoutRatio = scout.solved ? 1 : 0;
    const alternativeRatio = Math.max(greedyRatio, scoutRatio);
    alternativeRatios.push(alternativeRatio);

    const trapDensity =
      (choiceMismatches + splitTrap * 2) /
      (puzzle.tracks.skipFirst.houses.length + puzzle.tracks.skipLast.houses.length + 2);
    const pressure = clamp(0, 1, trapDensity + (scout.solved ? 0 : 0.2));
    pressureScores.push(pressure);

    difficulties.push({
      difficulty,
      label: puzzle.label,
      budget: puzzle.budget,
      solvability: optimal.solved ? 1 : 0,
      puzzleEntropy: Number(
        (
          puzzle.ringHouses.length * 3.4 +
          choiceMismatches * 1.8 +
          splitTrap * 3 +
          log2(puzzle.ringHouses.reduce((sum, value) => sum + value, 0) + 1) * 2.4
        ).toFixed(1),
      ),
      skillDepth: clamp(
        0.26,
        0.94,
        0.28 +
          trapDensity * 0.32 +
          (counterintuitive / (puzzle.ringHouses.length + 1)) * 0.2 +
          (scout.solved ? 0 : 0.08) +
          (greedy.solved ? 0 : 0.1),
      ),
      decisionEntropy: clamp(
        1,
        3.3,
        1.05 + trapDensity * 1.2 + splitTrap * 0.22,
      ),
      counterintuitive,
      drama: clamp(
        0.42,
        0.92,
        0.48 + trapDensity * 0.22 + (scout.solved ? 0 : 0.08) + (splitTrap ? 0.06 : 0),
      ),
      infoGainRatio: clamp(
        1.25,
        5,
        1 + (puzzle.scoutBothCost / (puzzle.ringHouses.length + 1)) * 0.28,
      ),
      optimalMoves: optimal.actionsUsed,
      altMoves: scout.solved ? scout.actionsUsed : greedy.actionsUsed,
      altSolvability: greedy.solved || scout.solved ? 1 : 0,
    });
  }

  const difficultyBreakpoint =
    difficulties.find((entry) => entry.difficulty >= 3 && entry.altSolvability === 0)?.difficulty ?? 5;
  const relevantRatios = alternativeRatios.slice(difficultyBreakpoint - 1);
  const relevantPressure = pressureScores.slice(difficultyBreakpoint - 1);
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
        'A circular block is not one ledger. The player must break the ring into the two legal lines, solve the carry-versus-raid recurrence inside each line, then crown the larger finished line total.',
      strongestAlternative:
        'The strongest wrong instinct throws out the smaller endpoint and solves only that one cut. The other near miss scouts both cut totals directly, which works early and then collapses once both scout taxes no longer fit the budget.',
      evidence:
        'D1-D2 still allow direct scouting of both cuts, but D3-D5 break that fallback and include endpoint traps where the better answer comes from excluding the slightly larger endpoint because the opposite cut preserves a stronger interior raid chain.',
    },
  };
}
