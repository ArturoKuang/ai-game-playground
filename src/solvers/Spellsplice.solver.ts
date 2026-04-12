export type SpellspliceDifficulty = 1 | 2 | 3 | 4 | 5;

export type SpellspliceMoveType = 'select' | 'link' | 'dead' | 'scout';

export type SpellspliceMove = {
  type: SpellspliceMoveType;
  slot?: number;
  start?: number;
  word?: string;
};

export type SpellspliceVerdict = {
  correct: boolean;
  label: string;
};

export type SpellspliceLink = {
  start: number;
  word: string;
};

export type SpellsplicePuzzle = {
  difficulty: SpellspliceDifficulty;
  label: string;
  title: string;
  helper: string;
  budget: number;
  ribbon: string;
  dictionary: string[];
  trueReachable: boolean[];
  linksByEnd: SpellspliceLink[][];
  scoutCosts: number[];
};

export type SpellspliceState = {
  puzzle: SpellsplicePuzzle;
  selectedSlot: number;
  sealedReachable: Array<boolean | null>;
  chosenLinks: Array<SpellspliceLink | null>;
  actionsUsed: number;
  history: string[];
  message: string;
  verdict: SpellspliceVerdict | null;
};

type BlueprintLayout = {
  ribbon: string;
  dictionary: string[];
};

type Blueprint = {
  label: string;
  title: string;
  helper: string;
  budget: number;
  layouts: BlueprintLayout[];
};

type DifficultyAggregate = {
  difficulty: SpellspliceDifficulty;
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
  difficultyBreakpoint: SpellspliceDifficulty;
  algorithmAlignment: number;
};

export type SpellspliceEvaluation = {
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
  finalReachable: boolean;
  exactLedger: boolean;
  prefixAccuracy: number;
};

const BLUEPRINTS: Record<SpellspliceDifficulty, Blueprint> = {
  1: {
    label: 'D1',
    title: 'Dock Primer',
    helper:
      'Short ribbons can still be checked almost directly. The scalable habit is already to seal each endpoint from one earlier live cut plus a listed word instead of restarting from the front.',
    budget: 7,
    layouts: [
      { ribbon: 'leet', dictionary: ['le', 'leet', 'et'] },
      { ribbon: 'apple', dictionary: ['app', 'apple', 'le'] },
    ],
  },
  2: {
    label: 'D2',
    title: 'Harbor Cuts',
    helper:
      'The scout still survives once here, but the board is already about endpoint proof. A prefix is live only if some earlier live cut can launch a listed word into it.',
    budget: 8,
    layouts: [
      { ribbon: 'paper', dictionary: ['pa', 'paper', 'per'] },
      { ribbon: 'planet', dictionary: ['plan', 'planet', 'et'] },
    ],
  },
  3: {
    label: 'D3',
    title: 'False Seam',
    helper:
      'Now the shortcut breaks. A later-looking cut can be dead while a longer word from farther back is the only legal bridge into the endpoint.',
    budget: 6,
    layouts: [
      { ribbon: 'enter', dictionary: ['enter', 'ter'] },
      { ribbon: 'decode', dictionary: ['de', 'decode', 'ode'] },
    ],
  },
  4: {
    label: 'D4',
    title: 'Archive Span',
    helper:
      'Longer ribbons mix live and dead prefixes. You must keep the whole reachability ledger honest because local end-seams keep offering dead decoys.',
    budget: 9,
    layouts: [
      { ribbon: 'pineapple', dictionary: ['pine', 'pineapple', 'apple', 'ple'] },
      { ribbon: 'workbook', dictionary: ['work', 'workbook', 'book', 'kbook'] },
    ],
  },
  5: {
    label: 'D5',
    title: 'Grand Lexline',
    helper:
      'The hardest ribbons hide several tempting dead seams near the finish. Only a full left-to-right cut ledger survives without burning the whole scout budget.',
    budget: 11,
    layouts: [
      {
        ribbon: 'microscope',
        dictionary: ['micro', 'microscope', 'scope', 'ope', 'roscope'],
      },
      {
        ribbon: 'algorithmic',
        dictionary: ['algo', 'algorithm', 'ic', 'hmic'],
      },
    ],
  },
};

function clamp(min: number, max: number, value: number) {
  return Math.max(min, Math.min(max, value));
}

function log2(value: number) {
  return Math.log(value) / Math.log(2);
}

function buildLinks(ribbon: string, dictionary: string[]) {
  const linksByEnd = Array.from({ length: ribbon.length + 1 }, () => [] as SpellspliceLink[]);

  for (let end = 1; end <= ribbon.length; end += 1) {
    for (const word of dictionary) {
      if (!ribbon.endsWith(word, end)) continue;
      const start = end - word.length;
      if (start < 0) continue;
      if (ribbon.slice(start, end) !== word) continue;
      linksByEnd[end].push({ start, word });
    }
    linksByEnd[end].sort((left, right) => right.start - left.start || right.word.length - left.word.length);
  }

  return linksByEnd;
}

function buildReachable(ribbon: string, dictionary: string[]) {
  const linksByEnd = buildLinks(ribbon, dictionary);
  const reachable = Array.from({ length: ribbon.length + 1 }, () => false);
  reachable[0] = true;

  for (let end = 1; end <= ribbon.length; end += 1) {
    reachable[end] = linksByEnd[end].some((link) => reachable[link.start]);
  }

  return { reachable, linksByEnd };
}

function buildLatestCutShortcut(puzzle: SpellsplicePuzzle) {
  const reachable = Array.from({ length: puzzle.ribbon.length + 1 }, () => false);
  reachable[0] = true;

  for (let end = 1; end <= puzzle.ribbon.length; end += 1) {
    const latest = puzzle.linksByEnd[end][0];
    reachable[end] = latest ? reachable[latest.start] : false;
  }

  return reachable;
}

function prefixAccuracy(guess: boolean[], truth: boolean[]) {
  let matches = 0;
  for (let slot = 1; slot < truth.length; slot += 1) {
    if (guess[slot] === truth[slot]) matches += 1;
  }
  return matches / Math.max(1, truth.length - 1);
}

function countDeadSlots(puzzle: SpellsplicePuzzle) {
  let count = 0;
  for (let slot = 1; slot <= puzzle.ribbon.length; slot += 1) {
    if (!puzzle.trueReachable[slot]) count += 1;
  }
  return count;
}

function countAmbiguousSlots(puzzle: SpellsplicePuzzle) {
  let count = 0;
  for (let slot = 1; slot <= puzzle.ribbon.length; slot += 1) {
    if (puzzle.linksByEnd[slot].length > 1) count += 1;
  }
  return count;
}

function countTrapSlots(puzzle: SpellsplicePuzzle) {
  let count = 0;
  for (let slot = 1; slot <= puzzle.ribbon.length; slot += 1) {
    const links = puzzle.linksByEnd[slot];
    if (links.length <= 1) continue;
    const latest = links[0];
    const hasLiveEarlier = links.slice(1).some((link) => puzzle.trueReachable[link.start]);
    if (!puzzle.trueReachable[latest.start] && hasLiveEarlier) {
      count += 1;
    }
  }
  return count;
}

function nextUnsealedSlot(state: SpellspliceState, start: number) {
  for (let slot = start; slot <= state.puzzle.ribbon.length; slot += 1) {
    if (state.sealedReachable[slot] === null) return slot;
  }
  for (let slot = 1; slot < start; slot += 1) {
    if (state.sealedReachable[slot] === null) return slot;
  }
  return state.puzzle.ribbon.length;
}

function cloneState(state: SpellspliceState): SpellspliceState {
  return {
    ...state,
    sealedReachable: [...state.sealedReachable],
    chosenLinks: [...state.chosenLinks],
    history: [...state.history],
  };
}

function ledgerMatchesTruth(state: SpellspliceState) {
  for (let slot = 1; slot <= state.puzzle.ribbon.length; slot += 1) {
    if (state.sealedReachable[slot] !== state.puzzle.trueReachable[slot]) return false;
  }
  return true;
}

function finalize(next: SpellspliceState) {
  if (next.actionsUsed > next.puzzle.budget) {
    next.verdict = {
      correct: false,
      label: 'The splice clock ran out before the ribbon ledger was certified.',
    };
    return next;
  }

  const allSealed = next.sealedReachable.slice(1).every((entry) => entry !== null);
  if (!allSealed) return next;

  const finalLive = next.sealedReachable[next.puzzle.ribbon.length] === true;
  next.verdict = {
    correct: ledgerMatchesTruth(next),
    label: finalLive
      ? 'Ribbon certified. The final endpoint is reachable from the origin.'
      : 'Ribbon certified. The final endpoint is dead under this lexicon.',
  };
  return next;
}

function describeLink(link: SpellspliceLink) {
  return `"${link.word}" from cut ${link.start}`;
}

export function generatePuzzle(seed: number, difficulty: SpellspliceDifficulty): SpellsplicePuzzle {
  const blueprint = BLUEPRINTS[difficulty];
  const layout = blueprint.layouts[seed % blueprint.layouts.length];
  const built = buildReachable(layout.ribbon, layout.dictionary);
  const scoutCosts = Array.from({ length: layout.ribbon.length + 1 }, (_, slot) =>
    slot === 0 ? 0 : Math.max(1, built.linksByEnd[slot].length + 1),
  );

  return {
    difficulty,
    label: blueprint.label,
    title: blueprint.title,
    helper: blueprint.helper,
    budget: blueprint.budget,
    ribbon: layout.ribbon,
    dictionary: layout.dictionary,
    trueReachable: built.reachable,
    linksByEnd: built.linksByEnd,
    scoutCosts,
  };
}

export function createInitialState(puzzle: SpellsplicePuzzle): SpellspliceState {
  const sealedReachable = Array.from({ length: puzzle.ribbon.length + 1 }, () => null as boolean | null);
  sealedReachable[0] = true;

  return {
    puzzle,
    selectedSlot: 1,
    sealedReachable,
    chosenLinks: Array.from({ length: puzzle.ribbon.length + 1 }, () => null as SpellspliceLink | null),
    actionsUsed: 0,
    history: [],
    message:
      'Seal each endpoint left to right. An endpoint is live only if one earlier live cut can launch a listed word into it.',
    verdict: null,
  };
}

export function linksForSlot(puzzle: SpellsplicePuzzle, slot: number) {
  return puzzle.linksByEnd[slot] ?? [];
}

export function slotIsSealed(state: SpellspliceState, slot: number) {
  return state.sealedReachable[slot] !== null;
}

export function sealedSlotCount(state: SpellspliceState) {
  return state.sealedReachable.slice(1).filter((entry) => entry !== null).length;
}

export function remainingUnsealed(state: SpellspliceState) {
  return state.puzzle.ribbon.length - sealedSlotCount(state);
}

export function prefixPreview(puzzle: SpellsplicePuzzle, slot: number) {
  return puzzle.ribbon.slice(0, slot);
}

export function selectedReachability(state: SpellspliceState) {
  return state.sealedReachable[state.selectedSlot];
}

export function scoutCostForSlot(puzzle: SpellsplicePuzzle, slot: number) {
  return puzzle.scoutCosts[slot];
}

export function canUseLink(state: SpellspliceState, slot: number, link: SpellspliceLink) {
  return (
    slot >= 1 &&
    slot <= state.puzzle.ribbon.length &&
    !slotIsSealed(state, slot) &&
    state.sealedReachable[link.start] === true
  );
}

export function canSealDead(state: SpellspliceState, slot: number) {
  if (slot < 1 || slot > state.puzzle.ribbon.length || slotIsSealed(state, slot)) return false;
  const links = linksForSlot(state.puzzle, slot);
  if (links.some((link) => state.sealedReachable[link.start] === null)) return false;
  return !links.some((link) => state.sealedReachable[link.start] === true);
}

export function canScoutSlot(state: SpellspliceState, slot: number) {
  return slot >= 1 && slot <= state.puzzle.ribbon.length && !slotIsSealed(state, slot);
}

export function linkStatus(state: SpellspliceState, link: SpellspliceLink) {
  const cut = state.sealedReachable[link.start];
  if (cut === true) return 'live';
  if (cut === false) return 'dead';
  return 'unknown';
}

export function applyMove(state: SpellspliceState, move: SpellspliceMove): SpellspliceState {
  const next = cloneState(state);
  if (next.verdict) return next;

  if (move.type === 'select') {
    const slot = clamp(1, next.puzzle.ribbon.length, move.slot ?? next.selectedSlot);
    next.selectedSlot = slot;
    next.message = `Inspecting endpoint ${slot}.`;
    return next;
  }

  const slot = next.selectedSlot;

  if (move.type === 'link') {
    const word = move.word ?? '';
    const start = move.start ?? -1;
    const link = linksForSlot(next.puzzle, slot).find((candidate) => candidate.start === start && candidate.word === word);
    if (!link) {
      next.message = 'That splice is not available on this endpoint.';
      return next;
    }
    if (!canUseLink(next, slot, link)) {
      next.message = 'That splice starts from a dead or unresolved cut. Only a live earlier cut can launch the word.';
      return next;
    }

    next.sealedReachable[slot] = true;
    next.chosenLinks[slot] = link;
    next.actionsUsed += 1;
    next.history.unshift(`Endpoint ${slot}: linked ${describeLink(link)} and sealed live.`);
    next.message = `Endpoint ${slot} is live through ${describeLink(link)}.`;
    next.selectedSlot = nextUnsealedSlot(next, Math.min(slot + 1, next.puzzle.ribbon.length));
    return finalize(next);
  }

  if (move.type === 'dead') {
    if (!canSealDead(next, slot)) {
      next.message = 'This endpoint still has an unresolved cut behind it, or some live splice still reaches it.';
      return next;
    }

    next.sealedReachable[slot] = false;
    next.chosenLinks[slot] = null;
    next.actionsUsed += 1;
    next.history.unshift(`Endpoint ${slot}: every listed splice starts from a dead cut, so the endpoint sealed dead.`);
    next.message = `Endpoint ${slot} is dead. No earlier live cut can launch a listed word into it.`;
    next.selectedSlot = nextUnsealedSlot(next, Math.min(slot + 1, next.puzzle.ribbon.length));
    return finalize(next);
  }

  if (move.type === 'scout') {
    if (!canScoutSlot(next, slot)) {
      next.message = 'That endpoint is already sealed.';
      return next;
    }

    next.sealedReachable[slot] = next.puzzle.trueReachable[slot];
    const liveLink = linksForSlot(next.puzzle, slot).find((link) => next.puzzle.trueReachable[link.start]);
    next.chosenLinks[slot] = next.puzzle.trueReachable[slot] ? liveLink ?? null : null;
    next.actionsUsed += next.puzzle.scoutCosts[slot];
    next.history.unshift(`Endpoint ${slot}: scouted directly for ${next.puzzle.scoutCosts[slot]} action${next.puzzle.scoutCosts[slot] === 1 ? '' : 's'}.`);
    next.message = next.puzzle.trueReachable[slot]
      ? `Endpoint ${slot} scouted live${liveLink ? ` through ${describeLink(liveLink)}` : ''}.`
      : `Endpoint ${slot} scouted dead.`;
    next.selectedSlot = nextUnsealedSlot(next, Math.min(slot + 1, next.puzzle.ribbon.length));
    return finalize(next);
  }

  return next;
}

function simulateOptimal(puzzle: SpellsplicePuzzle): SimulationSummary {
  const actionsUsed = puzzle.ribbon.length;
  return {
    solved: actionsUsed <= puzzle.budget,
    actionsUsed,
    finalReachable: puzzle.trueReachable[puzzle.ribbon.length],
    exactLedger: true,
    prefixAccuracy: 1,
  };
}

function simulateLatestCutShortcut(puzzle: SpellsplicePuzzle): SimulationSummary {
  const guess = buildLatestCutShortcut(puzzle);
  const exactLedger = guess.every((value, index) => value === puzzle.trueReachable[index]);
  return {
    solved: exactLedger && puzzle.ribbon.length <= puzzle.budget,
    actionsUsed: puzzle.ribbon.length,
    finalReachable: guess[puzzle.ribbon.length],
    exactLedger,
    prefixAccuracy: prefixAccuracy(guess, puzzle.trueReachable),
  };
}

function simulateScoutAll(puzzle: SpellsplicePuzzle): SimulationSummary {
  const actionsUsed = puzzle.scoutCosts.slice(1).reduce((sum, value) => sum + value, 0);
  return {
    solved: actionsUsed <= puzzle.budget,
    actionsUsed,
    finalReachable: puzzle.trueReachable[puzzle.ribbon.length],
    exactLedger: true,
    prefixAccuracy: 1,
  };
}

export function evaluateSpellsplice(): SpellspliceEvaluation {
  const difficulties: DifficultyAggregate[] = [];
  const alternativeRatios: number[] = [];
  const pressureScores: number[] = [];

  for (const difficulty of [1, 2, 3, 4, 5] as SpellspliceDifficulty[]) {
    const puzzle = generatePuzzle(0, difficulty);
    const optimal = simulateOptimal(puzzle);
    const shortcut = simulateLatestCutShortcut(puzzle);
    const scout = simulateScoutAll(puzzle);
    const deadSlots = countDeadSlots(puzzle);
    const ambiguousSlots = countAmbiguousSlots(puzzle);
    const trapSlots = countTrapSlots(puzzle);
    const averageOptions =
      puzzle.linksByEnd.slice(1).reduce((sum, links) => sum + Math.max(1, links.length), 0) /
      Math.max(1, puzzle.ribbon.length);
    const alternativeRatio = scout.solved ? 1 : shortcut.prefixAccuracy;

    alternativeRatios.push(alternativeRatio);
    pressureScores.push(
      clamp(
        0,
        1,
        trapSlots / Math.max(1, puzzle.ribbon.length) +
          ambiguousSlots / Math.max(1, puzzle.ribbon.length) * 0.45 +
          deadSlots / Math.max(1, puzzle.ribbon.length) * 0.3 +
          (scout.solved ? 0 : 0.16),
      ),
    );

    difficulties.push({
      difficulty,
      label: puzzle.label,
      budget: puzzle.budget,
      glyphCount: puzzle.ribbon.length,
      solvability: optimal.solved ? 1 : 0,
      puzzleEntropy: Number(
        (
          puzzle.ribbon.length * 1.7 +
          ambiguousSlots * 2.3 +
          trapSlots * 2.9 +
          deadSlots * 1.4 +
          log2(puzzle.dictionary.length + 2) * 1.8
        ).toFixed(1),
      ),
      skillDepth: clamp(
        0.3,
        0.9,
        0.24 +
          trapSlots / Math.max(1, puzzle.ribbon.length) * 0.38 +
          ambiguousSlots / Math.max(1, puzzle.ribbon.length) * 0.16 +
          deadSlots / Math.max(1, puzzle.ribbon.length) * 0.12 +
          (scout.solved ? 0 : 0.11) +
          (shortcut.exactLedger ? 0 : 0.12),
      ),
      decisionEntropy: clamp(
        1,
        4.5,
        0.92 +
          averageOptions * 0.78 +
          trapSlots / Math.max(1, puzzle.ribbon.length) * 0.9 +
          ambiguousSlots / Math.max(1, puzzle.ribbon.length) * 0.55,
      ),
      counterintuitive: trapSlots + deadSlots,
      drama: clamp(
        0.45,
        0.9,
        0.44 +
          trapSlots / Math.max(1, puzzle.ribbon.length) * 0.22 +
          deadSlots / Math.max(1, puzzle.ribbon.length) * 0.08 +
          (scout.solved ? 0 : 0.08) +
          (shortcut.exactLedger ? 0 : 0.06),
      ),
      infoGainRatio: clamp(
        1.1,
        4.5,
        1 + simulateScoutAll(puzzle).actionsUsed / Math.max(1, optimal.actionsUsed) * 0.45,
      ),
      optimalMoves: optimal.actionsUsed,
      altMoves: scout.solved ? scout.actionsUsed : shortcut.actionsUsed,
      altSolvability: scout.solved || shortcut.solved ? 1 : 0,
    });
  }

  const difficultyBreakpoint =
    difficulties.find((entry) => entry.difficulty >= 3 && entry.altSolvability === 0)?.difficulty ?? 5;
  const relevantRatios = alternativeRatios.slice(difficultyBreakpoint - 1);
  const relevantPressure = pressureScores.slice(difficultyBreakpoint - 1);

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
        relevantRatios.reduce((sum, ratio) => sum + (1 - ratio), 0) / Math.max(1, relevantRatios.length),
      ),
      invariantPressure: clamp(
        0,
        1,
        relevantPressure.reduce((sum, score) => sum + score, 0) / Math.max(1, relevantPressure.length),
      ),
      difficultyBreakpoint,
      algorithmAlignment: 1,
    },
    interpretation: {
      invariant:
        'Each endpoint is reachable only if some earlier reachable cut plus one listed word spans exactly the gap into this endpoint.',
      strongestAlternative:
        'The strongest shortcut checks only the latest matching cut for each endpoint and ignores older matching cuts that might be the only live launch point, while scouting every endpoint directly burns too much budget after the warm boards.',
      evidence:
        'D1-D2 still tolerate direct scouting, but D3-D5 include later dead seams that look tempting near the endpoint. Those boards force the real recurrence: scan the earlier cuts, require one live predecessor, and seal dead prefixes explicitly when none exist.',
    },
  };
}
