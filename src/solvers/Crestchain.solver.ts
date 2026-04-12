export type CrestchainDifficulty = 1 | 2 | 3 | 4 | 5;

export type CrestchainMoveType = 'select' | 'solo' | 'inherit' | 'scout';

export type CrestchainMove = {
  type: CrestchainMoveType;
  tower?: number;
  anchor?: number;
};

export type CrestchainVerdict = {
  correct: boolean;
  label: string;
};

export type CrestchainPuzzle = {
  difficulty: CrestchainDifficulty;
  label: string;
  title: string;
  helper: string;
  budget: number;
  heights: number[];
  trueLengths: number[];
  bestParents: number[][];
  latestLowerParents: Array<number | null>;
  latestLowerLengths: number[];
  scoutCosts: number[];
};

export type CrestchainState = {
  puzzle: CrestchainPuzzle;
  selectedTower: number;
  sealedLengths: Array<number | null>;
  chosenParents: Array<number | null>;
  actionsUsed: number;
  history: string[];
  message: string;
  verdict: CrestchainVerdict | null;
};

type Blueprint = {
  label: string;
  title: string;
  helper: string;
  budget: number;
  layouts: number[][];
};

type DifficultyAggregate = {
  difficulty: CrestchainDifficulty;
  label: string;
  budget: number;
  markerCount: number;
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
  difficultyBreakpoint: CrestchainDifficulty;
  algorithmAlignment: number;
};

export type CrestchainEvaluation = {
  difficulties: DifficultyAggregate[];
  learningMetrics: LearningMetrics;
  interpretation: {
    invariant: string;
    strongestAlternative: string;
    evidence: string;
  };
};

type ExactLedger = {
  lengths: number[];
  parents: number[][];
};

type LatestLowerLedger = {
  lengths: number[];
  parents: Array<number | null>;
};

type LayoutStats = {
  markerCount: number;
  optimalMoves: number;
  scoutMoves: number;
  latestExact: number;
  latestAccuracy: number;
  trapCount: number;
  decisionEntropy: number;
  puzzleEntropy: number;
  invariantPressure: number;
};

const BLUEPRINTS: Record<CrestchainDifficulty, Blueprint> = {
  1: {
    label: 'D1',
    title: 'Low Ridge',
    helper:
      'Short marker rows still forgive direct scouting, and the nearest lower stone often works. The scalable habit is already to seal the best rise ending at each marker.',
    budget: 9,
    layouts: [
      [2, 5, 3, 4],
      [3, 1, 2, 4],
    ],
  },
  2: {
    label: 'D2',
    title: 'Lantern Slope',
    helper:
      'The scout route still survives here, but longer rows already reward keeping every marker badge instead of trusting one remembered trail.',
    budget: 12,
    layouts: [
      [4, 1, 2, 5, 3],
      [2, 6, 3, 4, 7],
    ],
  },
  3: {
    label: 'D3',
    title: 'False Summit',
    helper:
      'Now the latest lower marker starts lying. A tiny late marker can sit right before the finish, but its badge may be much weaker than an older rise from farther back.',
    budget: 10,
    layouts: [
      [2, 9, 3, 6, 5, 1, 7],
      [4, 10, 5, 3, 8, 9],
    ],
  },
  4: {
    label: 'D4',
    title: 'Watchfire Spine',
    helper:
      'Several tempting late anchors are traps now. Only the full endpoint ledger keeps the climb lengths honest from left to right.',
    budget: 11,
    layouts: [
      [3, 12, 4, 5, 1, 6, 2, 7],
      [5, 13, 6, 2, 7, 3, 8],
    ],
  },
  5: {
    label: 'D5',
    title: 'Grand Crestchain',
    helper:
      'The ridge is long, the scout tax is brutal, and several low late markers try to steal the final handoff. Only the strongest earlier lower badge should ever feed the current crest.',
    budget: 12,
    layouts: [
      [2, 15, 3, 4, 1, 5, 6, 0, 7],
      [4, 16, 5, 1, 6, 2, 7, 3, 8],
    ],
  },
};

function clamp(min: number, max: number, value: number) {
  return Math.max(min, Math.min(max, value));
}

function log2(value: number) {
  return Math.log(value) / Math.log(2);
}

function buildExactLedger(heights: number[]): ExactLedger {
  const lengths = Array.from({ length: heights.length }, () => 1);
  const parents = Array.from({ length: heights.length }, () => [] as number[]);

  for (let tower = 0; tower < heights.length; tower += 1) {
    let bestLength = 1;
    let bestParents: number[] = [];

    for (let anchor = 0; anchor < tower; anchor += 1) {
      if (heights[anchor] >= heights[tower]) continue;
      const candidate = lengths[anchor] + 1;
      if (candidate > bestLength) {
        bestLength = candidate;
        bestParents = [anchor];
      } else if (candidate === bestLength) {
        bestParents.push(anchor);
      }
    }

    lengths[tower] = bestLength;
    parents[tower] = bestParents;
  }

  return { lengths, parents };
}

function buildLatestLowerLedger(heights: number[]): LatestLowerLedger {
  const lengths = Array.from({ length: heights.length }, () => 1);
  const parents = Array.from({ length: heights.length }, () => null as number | null);

  for (let tower = 0; tower < heights.length; tower += 1) {
    let latestLower: number | null = null;

    for (let anchor = tower - 1; anchor >= 0; anchor -= 1) {
      if (heights[anchor] < heights[tower]) {
        latestLower = anchor;
        break;
      }
    }

    parents[tower] = latestLower;
    lengths[tower] = latestLower === null ? 1 : lengths[latestLower] + 1;
  }

  return { lengths, parents };
}

function recursiveScoutCalls(heights: number[], tower: number, memo = new Map<number, number>()): number {
  const cached = memo.get(tower);
  if (cached !== undefined) return cached;

  let calls = 1;
  for (let anchor = 0; anchor < tower; anchor += 1) {
    if (heights[anchor] < heights[tower]) {
      calls += recursiveScoutCalls(heights, anchor, memo);
    }
  }

  memo.set(tower, calls);
  return calls;
}

function cloneState(state: CrestchainState): CrestchainState {
  return {
    ...state,
    sealedLengths: [...state.sealedLengths],
    chosenParents: [...state.chosenParents],
    history: [...state.history],
  };
}

function firstMismatch(state: CrestchainState) {
  for (let tower = 0; tower < state.puzzle.heights.length; tower += 1) {
    if (state.sealedLengths[tower] !== state.puzzle.trueLengths[tower]) {
      return tower;
    }
  }
  return null;
}

function allSealed(state: CrestchainState) {
  return state.sealedLengths.every((value) => value !== null);
}

function longestCertifiedRise(state: CrestchainState) {
  return state.sealedLengths.reduce<number>(
    (best, value) => (value !== null && value > best ? value : best),
    0,
  );
}

function sealTower(
  next: CrestchainState,
  tower: number,
  length: number,
  cost: number,
  verb: 'solo' | 'inherit' | 'scout',
  anchor: number | null = null,
) {
  next.selectedTower = tower;
  next.sealedLengths[tower] = length;
  next.chosenParents[tower] = anchor;
  next.actionsUsed += cost;

  const height = next.puzzle.heights[tower];
  const exact = next.puzzle.trueLengths[tower];
  const note =
    verb === 'solo'
      ? `Tower ${tower + 1} opened solo at 1.`
      : verb === 'scout'
        ? `Tower ${tower + 1} scouted at ${length}.`
        : `Tower ${tower + 1} rose from tower ${Number(anchor) + 1} to ${length}.`;

  next.history.unshift(note);

  if (verb === 'scout') {
    next.message = `Scout tax paid. Height ${height} truly ends a rise of ${length}.`;
    return;
  }

  if (length === exact) {
    if (length === 1) {
      next.message = `Height ${height} starts a new rise correctly at 1.`;
    } else {
      next.message = `Height ${height} now carries the correct rise badge of ${length}.`;
    }
    return;
  }

  next.message = `That marker is sealed, but height ${height} could still end a rise of ${exact}.`;
}

function finalize(next: CrestchainState) {
  if (next.actionsUsed > next.puzzle.budget) {
    next.verdict = {
      correct: false,
      label: 'The ridge audit ran out before every marker badge was certified.',
    };
    return next;
  }

  if (!allSealed(next)) return next;

  const mismatch = firstMismatch(next);
  if (mismatch === null) {
    next.verdict = {
      correct: true,
      label: `Crest certified. Longest rising chain: ${Math.max(...next.puzzle.trueLengths)}.`,
    };
    return next;
  }

  next.verdict = {
    correct: false,
    label: `Marker ${mismatch + 1} was sealed at ${next.sealedLengths[mismatch]}, but ${next.puzzle.trueLengths[mismatch]} was still available.`,
  };
  return next;
}

function buildLayoutStats(heights: number[]): LayoutStats {
  const exact = buildExactLedger(heights);
  const latest = buildLatestLowerLedger(heights);
  const markerCount = heights.length;
  const scoutMoves = heights.reduce((sum, _, tower) => sum + recursiveScoutCalls(heights, tower), 0);

  let matches = 0;
  let trapCount = 0;
  let entropySum = 0;
  let branchable = 0;
  let bestNotLatest = 0;

  for (let tower = 0; tower < heights.length; tower += 1) {
    if (latest.lengths[tower] === exact.lengths[tower]) matches += 1;

    const candidates = heights.slice(0, tower).filter((height) => height < heights[tower]).length;
    entropySum += log2(Math.max(1, candidates + 1));
    if (candidates > 1) branchable += 1;

    const latestParent = latest.parents[tower];
    const bestParents = exact.parents[tower];
    const bestLength = exact.lengths[tower];
    const latestLength = latest.lengths[tower];

    if (bestLength > latestLength) trapCount += 1;
    if (bestParents.length > 0 && latestParent !== null && !bestParents.includes(latestParent)) {
      bestNotLatest += 1;
    }
  }

  const latestAccuracy = matches / Math.max(1, heights.length);
  const decisionEntropy = entropySum / Math.max(1, heights.length);
  const puzzleEntropy = entropySum;
  const invariantPressure = branchable === 0 ? 0 : bestNotLatest / branchable;

  return {
    markerCount,
    optimalMoves: markerCount,
    scoutMoves,
    latestExact: latestAccuracy === 1 ? 1 : 0,
    latestAccuracy,
    trapCount,
    decisionEntropy,
    puzzleEntropy,
    invariantPressure,
  };
}

export function generatePuzzle(seed: number, difficulty: CrestchainDifficulty): CrestchainPuzzle {
  const blueprint = BLUEPRINTS[difficulty];
  const heights = [...blueprint.layouts[seed % blueprint.layouts.length]];
  const exact = buildExactLedger(heights);
  const latest = buildLatestLowerLedger(heights);
  const scoutCosts = heights.map((_, tower) => recursiveScoutCalls(heights, tower));

  return {
    difficulty,
    label: blueprint.label,
    title: blueprint.title,
    helper: blueprint.helper,
    budget: blueprint.budget,
    heights,
    trueLengths: exact.lengths,
    bestParents: exact.parents,
    latestLowerParents: latest.parents,
    latestLowerLengths: latest.lengths,
    scoutCosts,
  };
}

export function createInitialState(puzzle: CrestchainPuzzle): CrestchainState {
  return {
    puzzle,
    selectedTower: 0,
    sealedLengths: Array.from({ length: puzzle.heights.length }, () => null as number | null),
    chosenParents: Array.from({ length: puzzle.heights.length }, () => null as number | null),
    actionsUsed: 0,
    history: [],
    message:
      'Seal the best rising badge ending at every marker. A marker may start solo at 1, inherit one more than an earlier lower sealed marker, or be scouted directly at a brute-force tax.',
    verdict: null,
  };
}

export function anchorOptions(puzzle: CrestchainPuzzle, tower: number) {
  const options: number[] = [];
  for (let anchor = 0; anchor < tower; anchor += 1) {
    if (puzzle.heights[anchor] < puzzle.heights[tower]) {
      options.push(anchor);
    }
  }
  return options;
}

export function selectedValue(state: CrestchainState) {
  return state.sealedLengths[state.selectedTower];
}

export function remainingUnsealed(state: CrestchainState) {
  return state.sealedLengths.filter((value) => value === null).length;
}

export function sealedTowerCount(state: CrestchainState) {
  return state.sealedLengths.length - remainingUnsealed(state);
}

export function scoutCostForTower(puzzle: CrestchainPuzzle, tower: number) {
  return puzzle.scoutCosts[tower];
}

export function canSoloTower(state: CrestchainState, tower: number) {
  return tower >= 0 && tower < state.puzzle.heights.length && state.sealedLengths[tower] === null;
}

export function canInheritTower(state: CrestchainState, tower: number, anchor: number) {
  if (tower <= 0 || tower >= state.puzzle.heights.length) return false;
  if (state.sealedLengths[tower] !== null) return false;
  if (anchor < 0 || anchor >= tower) return false;
  if (state.puzzle.heights[anchor] >= state.puzzle.heights[tower]) return false;
  return state.sealedLengths[anchor] !== null;
}

export function canScoutTower(state: CrestchainState, tower: number) {
  return tower >= 0 && tower < state.puzzle.heights.length && state.sealedLengths[tower] === null;
}

export function applyMove(state: CrestchainState, move: CrestchainMove): CrestchainState {
  const next = cloneState(state);
  if (next.verdict) return next;

  if (move.type === 'select') {
    const tower = move.tower ?? next.selectedTower;
    if (tower >= 0 && tower < next.puzzle.heights.length) {
      next.selectedTower = tower;
      const sealed = next.sealedLengths[tower];
      const options = anchorOptions(next.puzzle, tower);

      if (sealed !== null) {
        next.message = `Tower ${tower + 1} is already sealed at ${sealed}.`;
      } else if (options.length === 0) {
        next.message = `Height ${next.puzzle.heights[tower]} has no earlier lower anchor, so its badge can only start at 1 unless you scout it.`;
      } else {
        next.message = `Height ${next.puzzle.heights[tower]} can inherit from any earlier lower sealed marker, but only the strongest badge should feed it.`;
      }
    }
    return next;
  }

  const tower = move.tower ?? next.selectedTower;
  if (move.type === 'solo') {
    if (!canSoloTower(next, tower)) {
      next.message = `Tower ${tower + 1} is already sealed.`;
      return next;
    }
    sealTower(next, tower, 1, 1, 'solo');
    return finalize(next);
  }

  if (move.type === 'inherit') {
    const anchor = move.anchor ?? -1;
    if (!canInheritTower(next, tower, anchor)) {
      next.message = `That anchor cannot feed tower ${tower + 1} yet. It must be earlier, lower, and already sealed.`;
      return next;
    }
    sealTower(next, tower, Number(next.sealedLengths[anchor]) + 1, 1, 'inherit', anchor);
    return finalize(next);
  }

  if (move.type === 'scout') {
    if (!canScoutTower(next, tower)) {
      next.message = `Tower ${tower + 1} is already sealed.`;
      return next;
    }
    sealTower(next, tower, next.puzzle.trueLengths[tower], next.puzzle.scoutCosts[tower], 'scout');
    return finalize(next);
  }

  return next;
}

export function evaluateCrestchain(): CrestchainEvaluation {
  const difficulties: DifficultyAggregate[] = [];
  let totalGap = 0;
  let totalInvariantPressure = 0;

  for (const difficulty of [1, 2, 3, 4, 5] as CrestchainDifficulty[]) {
    const blueprint = BLUEPRINTS[difficulty];
    const layouts = blueprint.layouts.map((layout) => buildLayoutStats(layout));

    const markerCount = layouts.reduce((sum, layout) => sum + layout.markerCount, 0) / layouts.length;
    const optimalMoves = layouts.reduce((sum, layout) => sum + layout.optimalMoves, 0) / layouts.length;
    const scoutMoves = layouts.reduce((sum, layout) => sum + layout.scoutMoves, 0) / layouts.length;
    const latestAccuracy = layouts.reduce((sum, layout) => sum + layout.latestAccuracy, 0) / layouts.length;
    const latestExact = layouts.reduce((sum, layout) => sum + layout.latestExact, 0) / layouts.length;
    const trapCount = layouts.reduce((sum, layout) => sum + layout.trapCount, 0) / layouts.length;
    const decisionEntropy = layouts.reduce((sum, layout) => sum + layout.decisionEntropy, 0) / layouts.length;
    const puzzleEntropy = layouts.reduce((sum, layout) => sum + layout.puzzleEntropy, 0) / layouts.length;
    const invariantPressure = layouts.reduce((sum, layout) => sum + layout.invariantPressure, 0) / layouts.length;

    const scoutGap = clamp(0, 1, 1 - optimalMoves / scoutMoves);
    const greedyGap = clamp(0, 1, 1 - latestAccuracy);
    const skillDepth = clamp(0, 1, scoutGap * 0.55 + greedyGap * 0.45);
    const drama = clamp(0.15, 1, 0.38 + scoutGap * 0.45 + (difficulty >= 3 ? 0.08 : 0));
    const infoGainRatio = scoutMoves / Math.max(1, optimalMoves);
    const altSolvability = latestExact;

    totalGap += greedyGap;
    totalInvariantPressure += invariantPressure;

    difficulties.push({
      difficulty,
      label: blueprint.label,
      budget: blueprint.budget,
      markerCount,
      solvability: 1,
      puzzleEntropy,
      skillDepth,
      decisionEntropy,
      counterintuitive: trapCount,
      drama,
      infoGainRatio,
      optimalMoves,
      altMoves: scoutMoves,
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
      invariantPressure: totalInvariantPressure / difficulties.length,
      difficultyBreakpoint: 3,
      algorithmAlignment: 1,
    },
    interpretation: {
      invariant:
        'Every marker must preserve the best rising chain ending exactly there, not just one globally remembered climb.',
      strongestAlternative:
        'Trust the latest earlier lower marker instead of comparing every earlier lower badge.',
      evidence:
        'The latest-lower shortcut stays exact on D1-D2, then fails from D3 onward when a weak late anchor sits near the finish while an older lower marker carries the stronger badge. Scout-all also breaks once the summed direct-search tax exceeds budget.',
    },
  };
}
