export type GlyphrailDifficulty = 1 | 2 | 3 | 4 | 5;

export type GlyphrailMoveType = 'select' | 'solo' | 'pair' | 'dead' | 'scout';

export type GlyphrailMove = {
  type: GlyphrailMoveType;
  slot?: number;
};

export type GlyphrailVerdict = {
  correct: boolean;
  label: string;
};

export type GlyphrailPuzzle = {
  difficulty: GlyphrailDifficulty;
  label: string;
  title: string;
  helper: string;
  budget: number;
  glyphs: string;
  trueCounts: number[];
  scoutCosts: number[];
  validSingles: boolean[];
  validPairs: boolean[];
};

export type GlyphrailState = {
  puzzle: GlyphrailPuzzle;
  selectedSlot: number;
  sealedCounts: Array<number | null>;
  pendingCounts: number[];
  tracedSolo: boolean[];
  tracedPair: boolean[];
  actionsUsed: number;
  history: string[];
  message: string;
  verdict: GlyphrailVerdict | null;
};

type Blueprint = {
  label: string;
  title: string;
  helper: string;
  budget: number;
  layouts: string[];
};

type DifficultyAggregate = {
  difficulty: GlyphrailDifficulty;
  label: string;
  budget: number;
  glyphCount: number;
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
  difficultyBreakpoint: GlyphrailDifficulty;
  algorithmAlignment: number;
};

export type GlyphrailEvaluation = {
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
  finalCount: number;
};

const BLUEPRINTS: Record<GlyphrailDifficulty, Blueprint> = {
  1: {
    label: 'D1',
    title: 'Dock Primer',
    helper:
      'Short cipher strips can still be scouted directly, but the relay board already shows that one digit may inherit routes from one slot back, two slots back, or both.',
    budget: 4,
    layouts: ['12', '10'],
  },
  2: {
    label: 'D2',
    title: 'Harbor Relay',
    helper:
      'The full scout survives exactly once here. The cleaner play is already to keep prefix route counts alive instead of recounting the strip from scratch.',
    budget: 7,
    layouts: ['226', '111'],
  },
  3: {
    label: 'D3',
    title: 'Signal Gate',
    helper:
      'Now the scout route breaks. Some zeros can ride only inside a legal pair, and some live prefixes need both lanes added together before they are truly sealed.',
    budget: 8,
    layouts: ['10121', '12321'],
  },
  4: {
    label: 'D4',
    title: 'Archive Span',
    helper:
      'Longer strips force disciplined prefix sealing. Mixed branch points and shut gates punish any shortcut that keeps only one incoming lane.',
    budget: 13,
    layouts: ['1123126', '2301212'],
  },
  5: {
    label: 'D5',
    title: 'Grand Cipherline',
    helper:
      'On the hardest strips, brute-force scouting is hopeless and dead prefixes can appear midstream. Only a full left-to-right route ledger stays honest.',
    budget: 14,
    layouts: ['12112012', '10123012'],
  },
};

function clamp(min: number, max: number, value: number) {
  return Math.max(min, Math.min(max, value));
}

function log2(value: number) {
  return Math.log(value) / Math.log(2);
}

function digitAt(glyphs: string, slot: number) {
  return glyphs[slot - 1] ?? '';
}

function pairWindowAt(glyphs: string, slot: number) {
  return slot >= 2 ? glyphs.slice(slot - 2, slot) : '';
}

function isSingleValid(glyphs: string, slot: number) {
  return digitAt(glyphs, slot) !== '0';
}

function isPairValid(glyphs: string, slot: number) {
  if (slot < 2) return false;
  const window = pairWindowAt(glyphs, slot);
  const value = Number(window);
  return window[0] !== '0' && value >= 10 && value <= 26;
}

function buildDecodeCounts(glyphs: string) {
  const counts = Array.from({ length: glyphs.length + 1 }, () => 0);
  counts[0] = 1;

  for (let slot = 1; slot <= glyphs.length; slot += 1) {
    if (isSingleValid(glyphs, slot)) {
      counts[slot] += counts[slot - 1];
    }
    if (isPairValid(glyphs, slot)) {
      counts[slot] += counts[slot - 2];
    }
  }

  return counts;
}

function recursiveScoutCalls(glyphs: string, slot: number, memo = new Map<number, number>()): number {
  const cached = memo.get(slot);
  if (cached !== undefined) return cached;
  if (slot === 0) return 1;

  let calls = 1;
  if (isSingleValid(glyphs, slot)) {
    calls += recursiveScoutCalls(glyphs, slot - 1, memo);
  }
  if (isPairValid(glyphs, slot)) {
    calls += recursiveScoutCalls(glyphs, slot - 2, memo);
  }

  memo.set(slot, calls);
  return calls;
}

function buildOneLaneShortcut(glyphs: string, trueCounts: number[]) {
  const counts = Array.from({ length: glyphs.length + 1 }, () => 0);
  counts[0] = 1;

  for (let slot = 1; slot <= glyphs.length; slot += 1) {
    let bestLane = 0;
    if (isSingleValid(glyphs, slot)) {
      bestLane = Math.max(bestLane, trueCounts[slot - 1]);
    }
    if (isPairValid(glyphs, slot)) {
      bestLane = Math.max(bestLane, trueCounts[slot - 2]);
    }
    counts[slot] = bestLane;
  }

  return counts;
}

function countBranchSlots(puzzle: GlyphrailPuzzle) {
  let count = 0;
  for (let slot = 1; slot <= puzzle.glyphs.length; slot += 1) {
    if (
      puzzle.validSingles[slot] &&
      puzzle.validPairs[slot] &&
      puzzle.trueCounts[slot - 1] > 0 &&
      puzzle.trueCounts[slot - 2] > 0
    ) {
      count += 1;
    }
  }
  return count;
}

function countZeroLocks(puzzle: GlyphrailPuzzle) {
  let count = 0;
  for (let slot = 1; slot <= puzzle.glyphs.length; slot += 1) {
    if (digitAt(puzzle.glyphs, slot) === '0' && puzzle.validPairs[slot]) {
      count += 1;
    }
  }
  return count;
}

function countDeadGates(puzzle: GlyphrailPuzzle) {
  let count = 0;
  for (let slot = 1; slot <= puzzle.glyphs.length; slot += 1) {
    if (!puzzle.validSingles[slot] && !puzzle.validPairs[slot]) {
      count += 1;
    }
  }
  return count;
}

function cloneState(state: GlyphrailState): GlyphrailState {
  return {
    ...state,
    sealedCounts: [...state.sealedCounts],
    pendingCounts: [...state.pendingCounts],
    tracedSolo: [...state.tracedSolo],
    tracedPair: [...state.tracedPair],
    history: [...state.history],
  };
}

function nextUnsealedSlot(state: GlyphrailState, start: number) {
  for (let slot = start; slot <= state.puzzle.glyphs.length; slot += 1) {
    if (state.sealedCounts[slot] === null) return slot;
  }
  for (let slot = 1; slot < start; slot += 1) {
    if (state.sealedCounts[slot] === null) return slot;
  }
  return state.puzzle.glyphs.length;
}

function maybeSealSlot(next: GlyphrailState, slot: number) {
  const needsSolo = next.puzzle.validSingles[slot];
  const needsPair = next.puzzle.validPairs[slot];
  if (next.sealedCounts[slot] !== null) return;
  if ((needsSolo && !next.tracedSolo[slot]) || (needsPair && !next.tracedPair[slot])) return;

  next.sealedCounts[slot] = next.pendingCounts[slot];
  next.message = `Prefix ${slot} sealed at ${next.pendingCounts[slot]} route${next.pendingCounts[slot] === 1 ? '' : 's'}.`;
  next.selectedSlot = nextUnsealedSlot(next, Math.min(slot + 1, next.puzzle.glyphs.length));
}

function finalize(next: GlyphrailState) {
  if (next.actionsUsed > next.puzzle.budget) {
    next.verdict = {
      correct: false,
      label: 'The relay clock ran out before the cipher ribbon was fully certified.',
    };
    return next;
  }

  if (next.sealedCounts[next.puzzle.glyphs.length] === next.puzzle.trueCounts[next.puzzle.glyphs.length]) {
    next.verdict = {
      correct: true,
      label: `Ribbon sealed. ${next.puzzle.trueCounts[next.puzzle.glyphs.length]} decoding route${next.puzzle.trueCounts[next.puzzle.glyphs.length] === 1 ? '' : 's'} reach the end.`,
    };
  }

  return next;
}

export function generatePuzzle(seed: number, difficulty: GlyphrailDifficulty): GlyphrailPuzzle {
  const blueprint = BLUEPRINTS[difficulty];
  const glyphs = blueprint.layouts[seed % blueprint.layouts.length];
  const trueCounts = buildDecodeCounts(glyphs);
  const scoutCosts = Array.from({ length: glyphs.length + 1 }, (_, slot) =>
    slot === 0 ? 0 : recursiveScoutCalls(glyphs, slot),
  );
  const validSingles = Array.from({ length: glyphs.length + 1 }, (_, slot) =>
    slot === 0 ? false : isSingleValid(glyphs, slot),
  );
  const validPairs = Array.from({ length: glyphs.length + 1 }, (_, slot) =>
    slot < 2 ? false : isPairValid(glyphs, slot),
  );

  return {
    difficulty,
    label: blueprint.label,
    title: blueprint.title,
    helper: blueprint.helper,
    budget: blueprint.budget,
    glyphs,
    trueCounts,
    scoutCosts,
    validSingles,
    validPairs,
  };
}

export function createInitialState(puzzle: GlyphrailPuzzle): GlyphrailState {
  const sealedCounts = Array.from({ length: puzzle.glyphs.length + 1 }, () => null as number | null);
  sealedCounts[0] = 1;

  return {
    puzzle,
    selectedSlot: 1,
    sealedCounts,
    pendingCounts: Array.from({ length: puzzle.glyphs.length + 1 }, () => 0),
    tracedSolo: Array.from({ length: puzzle.glyphs.length + 1 }, () => false),
    tracedPair: Array.from({ length: puzzle.glyphs.length + 1 }, () => false),
    actionsUsed: 0,
    history: [],
    message:
      'Seal each digit prefix by tracing every legal incoming lane. A digit may inherit routes from one slot back, two slots back, both, or neither.',
    verdict: null,
  };
}

export function currentDigit(puzzle: GlyphrailPuzzle, slot: number) {
  return digitAt(puzzle.glyphs, slot);
}

export function currentPairWindow(puzzle: GlyphrailPuzzle, slot: number) {
  return pairWindowAt(puzzle.glyphs, slot);
}

export function scoutCostForSlot(puzzle: GlyphrailPuzzle, slot: number) {
  return puzzle.scoutCosts[slot];
}

export function selectedValue(state: GlyphrailState) {
  const sealed = state.sealedCounts[state.selectedSlot];
  return sealed ?? state.pendingCounts[state.selectedSlot];
}

export function slotIsSealed(state: GlyphrailState, slot: number) {
  return state.sealedCounts[slot] !== null;
}

export function sealedSlotCount(state: GlyphrailState) {
  return state.sealedCounts.slice(1).filter((entry) => entry !== null).length;
}

export function remainingUnsealed(state: GlyphrailState) {
  return state.puzzle.glyphs.length - sealedSlotCount(state);
}

export function getSoloContribution(state: GlyphrailState, slot: number) {
  if (!state.puzzle.validSingles[slot]) return null;
  const previous = state.sealedCounts[slot - 1];
  return previous === null ? null : previous;
}

export function getPairContribution(state: GlyphrailState, slot: number) {
  if (!state.puzzle.validPairs[slot]) return null;
  const previous = state.sealedCounts[slot - 2];
  return previous === null ? null : previous;
}

export function canTraceSolo(state: GlyphrailState, slot: number) {
  return (
    slot >= 1 &&
    slot <= state.puzzle.glyphs.length &&
    !slotIsSealed(state, slot) &&
    state.puzzle.validSingles[slot] &&
    !state.tracedSolo[slot] &&
    state.sealedCounts[slot - 1] !== null
  );
}

export function canTracePair(state: GlyphrailState, slot: number) {
  return (
    slot >= 2 &&
    slot <= state.puzzle.glyphs.length &&
    !slotIsSealed(state, slot) &&
    state.puzzle.validPairs[slot] &&
    !state.tracedPair[slot] &&
    state.sealedCounts[slot - 2] !== null
  );
}

export function canSealDead(state: GlyphrailState, slot: number) {
  return (
    slot >= 1 &&
    slot <= state.puzzle.glyphs.length &&
    !slotIsSealed(state, slot) &&
    !state.puzzle.validSingles[slot] &&
    !state.puzzle.validPairs[slot]
  );
}

export function canScoutSlot(state: GlyphrailState, slot: number) {
  return slot >= 1 && slot <= state.puzzle.glyphs.length && !slotIsSealed(state, slot);
}

export function applyMove(state: GlyphrailState, move: GlyphrailMove): GlyphrailState {
  const next = cloneState(state);
  if (next.verdict) return next;

  if (move.type === 'select') {
    const slot = clamp(1, next.puzzle.glyphs.length, move.slot ?? next.selectedSlot);
    next.selectedSlot = slot;
    next.message = `Inspecting prefix ${slot}.`;
    return next;
  }

  const slot = next.selectedSlot;

  if (move.type === 'solo') {
    if (!canTraceSolo(next, slot)) {
      next.message = 'The solo lane is closed until the previous prefix is sealed, or this digit is not legal on its own.';
      return next;
    }
    const contribution = next.sealedCounts[slot - 1] ?? 0;
    next.tracedSolo[slot] = true;
    next.pendingCounts[slot] += contribution;
    next.actionsUsed += 1;
    next.history.unshift(`Prefix ${slot}: traced solo lane for +${contribution}.`);
    maybeSealSlot(next, slot);
    return finalize(next);
  }

  if (move.type === 'pair') {
    if (!canTracePair(next, slot)) {
      next.message = 'The pair lane is closed until the two-back prefix is sealed, or this digit pair is not a legal code.';
      return next;
    }
    const contribution = next.sealedCounts[slot - 2] ?? 0;
    next.tracedPair[slot] = true;
    next.pendingCounts[slot] += contribution;
    next.actionsUsed += 1;
    next.history.unshift(`Prefix ${slot}: traced pair lane for +${contribution}.`);
    maybeSealSlot(next, slot);
    return finalize(next);
  }

  if (move.type === 'dead') {
    if (!canSealDead(next, slot)) {
      next.message = 'This prefix still has at least one legal incoming lane.';
      return next;
    }
    next.sealedCounts[slot] = 0;
    next.pendingCounts[slot] = 0;
    next.actionsUsed += 1;
    next.history.unshift(`Prefix ${slot}: both gates shut, sealed at 0.`);
    next.message = `Prefix ${slot} has no legal decoding route.`;
    next.selectedSlot = nextUnsealedSlot(next, Math.min(slot + 1, next.puzzle.glyphs.length));
    return finalize(next);
  }

  if (move.type === 'scout') {
    if (!canScoutSlot(next, slot)) {
      next.message = 'That prefix is already sealed.';
      return next;
    }
    next.sealedCounts[slot] = next.puzzle.trueCounts[slot];
    next.pendingCounts[slot] = next.puzzle.trueCounts[slot];
    next.tracedSolo[slot] = next.puzzle.validSingles[slot];
    next.tracedPair[slot] = next.puzzle.validPairs[slot];
    next.actionsUsed += next.puzzle.scoutCosts[slot];
    next.history.unshift(`Prefix ${slot}: scouted directly for ${next.puzzle.scoutCosts[slot]} action${next.puzzle.scoutCosts[slot] === 1 ? '' : 's'}.`);
    next.message = `Prefix ${slot} scouted directly at ${next.puzzle.trueCounts[slot]} route${next.puzzle.trueCounts[slot] === 1 ? '' : 's'}.`;
    next.selectedSlot = nextUnsealedSlot(next, Math.min(slot + 1, next.puzzle.glyphs.length));
    return finalize(next);
  }

  return next;
}

function simulateOptimal(puzzle: GlyphrailPuzzle): SimulationSummary {
  let actionsUsed = 0;

  for (let slot = 1; slot <= puzzle.glyphs.length; slot += 1) {
    const validSolo = puzzle.validSingles[slot];
    const validPair = puzzle.validPairs[slot];
    if (!validSolo && !validPair) {
      actionsUsed += 1;
      continue;
    }
    actionsUsed += (validSolo ? 1 : 0) + (validPair ? 1 : 0);
  }

  return {
    solved: actionsUsed <= puzzle.budget,
    actionsUsed,
    finalCount: puzzle.trueCounts[puzzle.glyphs.length],
  };
}

function simulateOneLaneShortcut(puzzle: GlyphrailPuzzle): SimulationSummary {
  const shortcutCounts = buildOneLaneShortcut(puzzle.glyphs, puzzle.trueCounts);
  const actionsUsed = puzzle.glyphs.length;
  const finalCount = shortcutCounts[puzzle.glyphs.length];

  return {
    solved: actionsUsed <= puzzle.budget && finalCount === puzzle.trueCounts[puzzle.glyphs.length],
    actionsUsed,
    finalCount,
  };
}

function simulateScoutFinal(puzzle: GlyphrailPuzzle): SimulationSummary {
  const actionsUsed = puzzle.scoutCosts[puzzle.glyphs.length];
  return {
    solved: actionsUsed <= puzzle.budget,
    actionsUsed,
    finalCount: puzzle.trueCounts[puzzle.glyphs.length],
  };
}

export function evaluateGlyphrail(): GlyphrailEvaluation {
  const difficulties: DifficultyAggregate[] = [];
  const alternativeRatios: number[] = [];
  const pressureScores: number[] = [];

  for (const difficulty of [1, 2, 3, 4, 5] as GlyphrailDifficulty[]) {
    const puzzle = generatePuzzle(0, difficulty);
    const optimal = simulateOptimal(puzzle);
    const shortcut = simulateOneLaneShortcut(puzzle);
    const scout = simulateScoutFinal(puzzle);
    const branchSlots = countBranchSlots(puzzle);
    const zeroLocks = countZeroLocks(puzzle);
    const deadGates = countDeadGates(puzzle);
    const finalCount = puzzle.trueCounts[puzzle.glyphs.length];
    const shortcutRatio = finalCount === 0 ? (shortcut.finalCount === 0 ? 1 : 0) : shortcut.finalCount / finalCount;
    const alternativeRatio = Math.max(shortcutRatio, scout.solved ? 1 : 0);
    const counterintuitive = branchSlots + zeroLocks + deadGates;

    alternativeRatios.push(alternativeRatio);
    pressureScores.push(
      clamp(
        0,
        1,
        branchSlots / puzzle.glyphs.length +
          zeroLocks / Math.max(1, puzzle.glyphs.length) +
          deadGates / Math.max(1, puzzle.glyphs.length) +
          (scout.solved ? 0 : 0.18),
      ),
    );

    difficulties.push({
      difficulty,
      label: puzzle.label,
      budget: puzzle.budget,
      glyphCount: puzzle.glyphs.length,
      solvability: optimal.solved ? 1 : 0,
      puzzleEntropy: Number(
        (
          puzzle.glyphs.length * 1.9 +
          branchSlots * 2.6 +
          zeroLocks * 2.2 +
          deadGates * 1.8 +
          log2(finalCount + 2) * 2.4
        ).toFixed(1),
      ),
      skillDepth: clamp(
        0.28,
        0.9,
        0.24 +
          (branchSlots / puzzle.glyphs.length) * 0.25 +
          (zeroLocks / Math.max(1, puzzle.glyphs.length)) * 0.16 +
          (deadGates / Math.max(1, puzzle.glyphs.length)) * 0.12 +
          (scout.solved ? 0 : 0.14) +
          (shortcutRatio < 1 ? 0.12 : 0),
      ),
      decisionEntropy: clamp(
        1.05,
        2.7,
        1.02 +
          (branchSlots / puzzle.glyphs.length) * 1.15 +
          (zeroLocks / Math.max(1, puzzle.glyphs.length)) * 0.7 +
          (deadGates / Math.max(1, puzzle.glyphs.length)) * 0.55,
      ),
      counterintuitive,
      drama: clamp(
        0.42,
        0.88,
        0.44 +
          (branchSlots / puzzle.glyphs.length) * 0.14 +
          (zeroLocks / Math.max(1, puzzle.glyphs.length)) * 0.1 +
          (deadGates / Math.max(1, puzzle.glyphs.length)) * 0.06 +
          (scout.solved ? 0 : 0.1) +
          (shortcutRatio < 1 ? 0.06 : 0),
      ),
      infoGainRatio: clamp(
        1.15,
        4.3,
        1 + (puzzle.scoutCosts[puzzle.glyphs.length] / Math.max(1, optimal.actionsUsed)) * 0.42,
      ),
      optimalMoves: optimal.actionsUsed,
      altMoves: scout.solved ? scout.actionsUsed : shortcut.actionsUsed,
      altSolvability: scout.solved || shortcut.solved ? 1 : 0,
    });
  }

  const difficultyBreakpoint =
    difficulties.find((entry) => entry.difficulty >= 3 && entry.altSolvability === 0)?.difficulty ?? 5;
  const startIndex = difficultyBreakpoint - 1;
  const relevantRatios = alternativeRatios.slice(startIndex);
  const relevantPressure = pressureScores.slice(startIndex);

  return {
    difficulties,
    learningMetrics: {
      inputShapeMatch: 1,
      operationMatch: 1,
      constraintMatch: 1,
      goalMatch: 1,
      leetCodeFit: 1,
      bestAlternativeGap: clamp(
        0,
        1,
        relevantRatios.reduce((sum, ratio) => sum + (1 - ratio), 0) / relevantRatios.length,
      ),
      invariantPressure: clamp(
        0,
        1,
        relevantPressure.reduce((sum, score) => sum + score, 0) / relevantPressure.length,
      ),
      difficultyBreakpoint,
      algorithmAlignment: 1,
    },
    interpretation: {
      invariant:
        'Each digit prefix inherits every legal decoding lane that reaches it: one-step from the previous prefix when the current digit stands alone, plus two-step from the two-back prefix when the pair forms 10 through 26.',
      strongestAlternative:
        'The strongest shortcut keeps only one incoming lane instead of adding both, while direct scouting the final prefix survives the short strips and then breaks once the recursion tax outruns the budget.',
      evidence:
        'D1-D2 still let a direct scout finish, but D3-D5 require the full additive prefix ledger and include zero-gate strips where legal pairs keep the ribbon alive while one-lane shortcuts undercount the real route total.',
    },
  };
}
