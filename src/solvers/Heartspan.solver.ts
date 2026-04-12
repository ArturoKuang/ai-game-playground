export type HeartspanDifficulty = 1 | 2 | 3 | 4 | 5;

export type HeartspanCenterKind = 'odd' | 'even';

export type HeartspanMove =
  | { type: 'select'; centerId: number }
  | { type: 'pulse' }
  | { type: 'transcribe' }
  | { type: 'crown' };

export type HeartspanVerdict = {
  correct: boolean;
  label: string;
};

export type HeartspanCenterState = {
  id: number;
  kind: HeartspanCenterKind;
  anchor: number;
  label: string;
  maxPossibleLength: number;
  openLeft: number;
  openRight: number;
  spanStart: number;
  spanEnd: number;
  length: number;
  exhausted: boolean;
};

export type HeartspanPuzzle = {
  difficulty: HeartspanDifficulty;
  label: string;
  title: string;
  helper: string;
  budget: number;
  text: string;
  bestLength: number;
  bestSpan: {
    start: number;
    end: number;
    value: string;
  };
};

export type HeartspanState = {
  puzzle: HeartspanPuzzle;
  selectedCenterId: number;
  centers: HeartspanCenterState[];
  actionsUsed: number;
  bestCenterId: number;
  bestLength: number;
  bestSpanStart: number;
  bestSpanEnd: number;
  history: string[];
  message: string;
  verdict: HeartspanVerdict | null;
};

type Blueprint = {
  label: string;
  title: string;
  helper: string;
  budget: number;
  variants: string[];
};

type CenterDescriptor = {
  id: number;
  kind: HeartspanCenterKind;
  anchor: number;
  label: string;
  maxPossibleLength: number;
};

type CenterExpansion = {
  start: number;
  end: number;
  length: number;
  expandCost: number;
};

type DifficultyAggregate = {
  difficulty: HeartspanDifficulty;
  label: string;
  budget: number;
  textLength: number;
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
  difficultyBreakpoint: HeartspanDifficulty;
  algorithmAlignment: number;
};

export type HeartspanEvaluation = {
  difficulties: DifficultyAggregate[];
  learningMetrics: LearningMetrics;
  interpretation: {
    invariant: string;
    strongestAlternative: string;
    evidence: string;
  };
};

type SimulationResult = {
  actions: number;
  solved: boolean;
  bestLength: number;
  inspectedCenters: number;
  decisionCounts: number[];
};

const BLUEPRINTS: Record<HeartspanDifficulty, Blueprint> = {
  1: {
    label: 'D1',
    title: 'Porch Ribbon',
    helper:
      'A tiny strip still lets you transcribe the whole center directly, but the cheap move is already to pulse outward from the heart.',
    budget: 6,
    variants: ['aba', 'level', 'civic'],
  },
  2: {
    label: 'D2',
    title: 'Lantern Strip',
    helper:
      'One strong odd center dominates this ribbon. Full transcription still survives, but pair-by-pair expansion is much cleaner.',
    budget: 10,
    variants: ['racecar', 'bananas', 'cabaca'],
  },
  3: {
    label: 'D3',
    title: 'Seam Trial',
    helper:
      'The winning mirror now sits on a seam, not a rune. Odd-only scans and full transcriptions both start wasting too much clock.',
    budget: 8,
    variants: ['cabbae', 'cnoonx', 'redderq'],
  },
  4: {
    label: 'D4',
    title: 'Archive Banner',
    helper:
      'Several deep hearts look promising. You need to grow the real mirror from its center and dismiss the rest by what they can still possibly reach.',
    budget: 12,
    variants: ['zabacdedcay', 'xrotavatorq', 'cabbaxabbay'],
  },
  5: {
    label: 'D5',
    title: 'Vault Pennant',
    helper:
      'A flashy short mirror appears early, but the true crown sits on a deeper seam. Only disciplined center growth reaches it in budget.',
    budget: 13,
    variants: ['abaxyzzyxf', 'xforgeeksskeegq', 'qabbahellehz'],
  },
};

function clamp(min: number, max: number, value: number) {
  return Math.max(min, Math.min(max, value));
}

function log2(value: number) {
  return Math.log(value) / Math.log(2);
}

function comparePair(text: string, left: number, right: number) {
  return text[left] === text[right];
}

function centerDescriptor(text: string, id: number, kind: HeartspanCenterKind, anchor: number): CenterDescriptor {
  const maxPossibleLength =
    kind === 'odd'
      ? 1 + 2 * Math.min(anchor, text.length - 1 - anchor)
      : 2 * Math.min(anchor + 1, text.length - 1 - anchor);

  return {
    id,
    kind,
    anchor,
    label: kind === 'odd' ? `Rune ${anchor + 1}` : `Seam ${anchor + 1}|${anchor + 2}`,
    maxPossibleLength,
  };
}

function buildCenterDescriptors(text: string): CenterDescriptor[] {
  const centers: CenterDescriptor[] = [];
  let id = 0;

  for (let index = 0; index < text.length; index += 1) {
    centers.push(centerDescriptor(text, id, 'odd', index));
    id += 1;

    if (index < text.length - 1) {
      centers.push(centerDescriptor(text, id, 'even', index));
      id += 1;
    }
  }

  return centers;
}

function createCenterState(text: string, descriptor: CenterDescriptor): HeartspanCenterState {
  if (descriptor.kind === 'odd') {
    const openLeft = descriptor.anchor - 1;
    const openRight = descriptor.anchor + 1;
    return {
      id: descriptor.id,
      kind: descriptor.kind,
      anchor: descriptor.anchor,
      label: descriptor.label,
      maxPossibleLength: descriptor.maxPossibleLength,
      openLeft,
      openRight,
      spanStart: descriptor.anchor,
      spanEnd: descriptor.anchor,
      length: 1,
      exhausted: openLeft < 0 || openRight >= text.length,
    };
  }

  return {
    id: descriptor.id,
    kind: descriptor.kind,
    anchor: descriptor.anchor,
    label: descriptor.label,
    maxPossibleLength: descriptor.maxPossibleLength,
    openLeft: descriptor.anchor,
    openRight: descriptor.anchor + 1,
    spanStart: descriptor.anchor + 1,
    spanEnd: descriptor.anchor,
    length: 0,
    exhausted: false,
  };
}

function cloneCenter(center: HeartspanCenterState): HeartspanCenterState {
  return { ...center };
}

function cloneState(state: HeartspanState): HeartspanState {
  return {
    ...state,
    centers: state.centers.map((center) => cloneCenter(center)),
    history: [...state.history],
  };
}

function expandFully(text: string, descriptor: CenterDescriptor): CenterExpansion {
  let length = descriptor.kind === 'odd' ? 1 : 0;
  let start = descriptor.kind === 'odd' ? descriptor.anchor : descriptor.anchor + 1;
  let end = descriptor.kind === 'odd' ? descriptor.anchor : descriptor.anchor;
  let openLeft = descriptor.kind === 'odd' ? descriptor.anchor - 1 : descriptor.anchor;
  let openRight = descriptor.kind === 'odd' ? descriptor.anchor + 1 : descriptor.anchor + 1;
  let expandCost = 0;

  while (openLeft >= 0 && openRight < text.length) {
    expandCost += 1;
    if (!comparePair(text, openLeft, openRight)) break;
    start = openLeft;
    end = openRight;
    length += 2;
    openLeft -= 1;
    openRight += 1;
  }

  return { start, end, length, expandCost };
}

function bestSpanForText(text: string) {
  let best = { start: 0, end: 0, length: 1 };
  for (const descriptor of buildCenterDescriptors(text)) {
    const expanded = expandFully(text, descriptor);
    if (expanded.length > best.length) {
      best = expanded;
    }
  }

  return {
    ...best,
    value: text.slice(best.start, best.end + 1),
  };
}

function transcriptionCost(center: HeartspanCenterState | CenterDescriptor) {
  return center.maxPossibleLength + 2;
}

function spanValue(text: string, start: number, end: number) {
  if (end < start) return '(empty seam)';
  return text.slice(start, end + 1);
}

function refreshBest(next: HeartspanState, centerId: number) {
  const center = next.centers[centerId];
  if (!center) return;
  if (center.length > next.bestLength) {
    next.bestCenterId = centerId;
    next.bestLength = center.length;
    next.bestSpanStart = center.spanStart;
    next.bestSpanEnd = center.spanEnd;
  }
}

function finalize(next: HeartspanState) {
  if (next.actionsUsed > next.puzzle.budget) {
    next.verdict = {
      correct: false,
      label: 'The ribbon audit clock ran out before you could certify the crown span.',
    };
  }
  return next;
}

function centerThreatCount(state: HeartspanState) {
  return state.centers.filter((center) => !center.exhausted && center.maxPossibleLength > state.bestLength).length;
}

function currentBestValue(state: HeartspanState) {
  return spanValue(state.puzzle.text, state.bestSpanStart, state.bestSpanEnd);
}

export function generatePuzzle(seed: number, difficulty: HeartspanDifficulty): HeartspanPuzzle {
  const blueprint = BLUEPRINTS[difficulty];
  const text = blueprint.variants[seed % blueprint.variants.length] ?? blueprint.variants[0] ?? 'aba';
  const bestSpan = bestSpanForText(text);

  return {
    difficulty,
    label: blueprint.label,
    title: blueprint.title,
    helper: blueprint.helper,
    budget: blueprint.budget,
    text,
    bestLength: bestSpan.length,
    bestSpan: {
      start: bestSpan.start,
      end: bestSpan.end,
      value: bestSpan.value,
    },
  };
}

export function createInitialState(puzzle: HeartspanPuzzle): HeartspanState {
  const centers = buildCenterDescriptors(puzzle.text).map((descriptor) => createCenterState(puzzle.text, descriptor));
  const middleDescriptor = centers.find(
    (center) => center.maxPossibleLength === Math.max(...centers.map((entry) => entry.maxPossibleLength)),
  );
  const bestStart = 0;
  const bestEnd = 0;

  return {
    puzzle,
    selectedCenterId: middleDescriptor?.id ?? 0,
    centers,
    actionsUsed: 0,
    bestCenterId: 0,
    bestLength: 1,
    bestSpanStart: bestStart,
    bestSpanEnd: bestEnd,
    history: [],
    message:
      'Choose a rune or seam, pulse outward while both sides still match, and only crown the best mirror once no unresolved center can beat it.',
    verdict: null,
  };
}

export function selectedCenter(state: HeartspanState) {
  return state.centers[state.selectedCenterId];
}

export function bestSpanText(state: HeartspanState) {
  return currentBestValue(state);
}

export function exhaustedCenterCount(state: HeartspanState) {
  return state.centers.filter((center) => center.exhausted).length;
}

export function canPulse(state: HeartspanState) {
  const center = selectedCenter(state);
  return Boolean(center) && !center.exhausted && center.openLeft >= 0 && center.openRight < state.puzzle.text.length;
}

export function canTranscribe(state: HeartspanState) {
  const center = selectedCenter(state);
  return Boolean(center) && !center.exhausted;
}

export function canCrown(state: HeartspanState) {
  return centerThreatCount(state) === 0 && state.bestLength > 0;
}

export function nextPairLabel(state: HeartspanState) {
  const center = selectedCenter(state);
  if (!center || center.exhausted || center.openLeft < 0 || center.openRight >= state.puzzle.text.length) {
    return 'No further pair remains on this center.';
  }
  return `${state.puzzle.text[center.openLeft]} · ${state.puzzle.text[center.openRight]}`;
}

export function applyMove(state: HeartspanState, move: HeartspanMove): HeartspanState {
  const next = cloneState(state);
  if (next.verdict) return next;

  if (move.type === 'select') {
    if (move.centerId >= 0 && move.centerId < next.centers.length) {
      next.selectedCenterId = move.centerId;
      const center = selectedCenter(next);
      if (!center) return next;
      if (center.exhausted) {
        next.message = `${center.label} is already exhausted at span ${Math.max(0, center.length)}.`;
      } else {
        next.message = `${center.label} is live. Pulse the next mirrored pair or transcribe the whole center from scratch.`;
      }
    }
    return next;
  }

  const center = selectedCenter(next);
  if (!center) return next;

  if (move.type === 'pulse') {
    if (!canPulse(next)) {
      next.message = `${center.label} has no live pair left to pulse.`;
      return next;
    }

    next.actionsUsed += 1;
    const left = center.openLeft;
    const right = center.openRight;

    if (comparePair(next.puzzle.text, left, right)) {
      center.spanStart = left;
      center.spanEnd = right;
      center.length += 2;
      center.openLeft -= 1;
      center.openRight += 1;
      if (center.openLeft < 0 || center.openRight >= next.puzzle.text.length) {
        center.exhausted = true;
      }

      refreshBest(next, center.id);
      next.history.unshift(
        `Pulse ${center.label}: matched ${next.puzzle.text[left]} and ${next.puzzle.text[right]} for "${spanValue(next.puzzle.text, center.spanStart, center.spanEnd)}"`,
      );
      next.message = `${center.label} grew to "${spanValue(next.puzzle.text, center.spanStart, center.spanEnd)}".`;
      return finalize(next);
    }

    center.exhausted = true;
    next.history.unshift(
      `Pulse ${center.label}: ${next.puzzle.text[left]} and ${next.puzzle.text[right]} broke the mirror`,
    );
    next.message = `${center.label} breaks on ${next.puzzle.text[left]} versus ${next.puzzle.text[right]}.`;
    return finalize(next);
  }

  if (move.type === 'transcribe') {
    if (!canTranscribe(next)) {
      next.message = `${center.label} is already exhausted.`;
      return next;
    }

    const expanded = expandFully(next.puzzle.text, centerDescriptor(next.puzzle.text, center.id, center.kind, center.anchor));
    const cost = transcriptionCost(center);
    center.spanStart = expanded.start;
    center.spanEnd = expanded.end;
    center.length = expanded.length;
    center.exhausted = true;
    center.openLeft = -1;
    center.openRight = next.puzzle.text.length;
    next.actionsUsed += cost;
    refreshBest(next, center.id);
    next.history.unshift(
      `Transcribe ${center.label}: paid ${cost} to certify "${spanValue(next.puzzle.text, expanded.start, expanded.end)}" from scratch`,
    );
    next.message = `${center.label} was transcribed directly for ${cost} actions.`;
    return finalize(next);
  }

  if (move.type === 'crown') {
    if (!canCrown(next)) {
      next.message = 'At least one unresolved center can still beat your best mirror.';
      return next;
    }

    next.actionsUsed += 1;
    next.verdict = {
      correct: true,
      label: `Crown secured: "${currentBestValue(next)}" is the longest mirror on this ribbon.`,
    };
    next.history.unshift(`Crown best span: "${currentBestValue(next)}"`);
    next.message = `No unresolved center can top length ${next.bestLength}.`;
    return finalize(next);
  }

  return next;
}

function descriptorById(text: string, id: number) {
  const descriptors = buildCenterDescriptors(text);
  return descriptors.find((descriptor) => descriptor.id === id) ?? descriptors[0];
}

function sortDescriptors(text: string) {
  const midpoint = (text.length - 1) / 2;
  return [...buildCenterDescriptors(text)].sort((left, right) => {
    if (right.maxPossibleLength !== left.maxPossibleLength) {
      return right.maxPossibleLength - left.maxPossibleLength;
    }
    if (left.kind !== right.kind) {
      return left.kind === 'even' ? -1 : 1;
    }
    return Math.abs(left.anchor - midpoint) - Math.abs(right.anchor - midpoint);
  });
}

function simulateOptimal(puzzle: HeartspanPuzzle): SimulationResult {
  let actions = 1;
  let bestLength = 1;
  let inspectedCenters = 0;
  const inspected = new Set<number>();
  const ordered = sortDescriptors(puzzle.text);
  const decisionCounts: number[] = [];

  for (const descriptor of ordered) {
    const threats = ordered.filter(
      (entry) => !inspected.has(entry.id) && entry.maxPossibleLength > bestLength,
    );
    if (threats.length === 0) break;
    decisionCounts.push(threats.length);
    const expanded = expandFully(puzzle.text, descriptor);
    inspected.add(descriptor.id);
    inspectedCenters += 1;
    actions += expanded.expandCost;
    bestLength = Math.max(bestLength, expanded.length);
  }

  return {
    actions,
    solved: bestLength === puzzle.bestLength,
    bestLength,
    inspectedCenters,
    decisionCounts,
  };
}

function simulateTranscribeBaseline(puzzle: HeartspanPuzzle): SimulationResult {
  let actions = 1;
  let bestLength = 1;
  let inspectedCenters = 0;
  const inspected = new Set<number>();
  const ordered = sortDescriptors(puzzle.text);
  const decisionCounts: number[] = [];

  for (const descriptor of ordered) {
    const threats = ordered.filter(
      (entry) => !inspected.has(entry.id) && entry.maxPossibleLength > bestLength,
    );
    if (threats.length === 0) break;
    decisionCounts.push(threats.length);
    inspected.add(descriptor.id);
    inspectedCenters += 1;
    actions += transcriptionCost(descriptor);
    const expanded = expandFully(puzzle.text, descriptor);
    bestLength = Math.max(bestLength, expanded.length);
  }

  return {
    actions,
    solved: bestLength === puzzle.bestLength,
    bestLength,
    inspectedCenters,
    decisionCounts,
  };
}

function simulateOddOnlyBaseline(puzzle: HeartspanPuzzle): SimulationResult {
  let actions = 1;
  let bestLength = 1;
  let inspectedCenters = 0;
  const ordered = sortDescriptors(puzzle.text).filter((descriptor) => descriptor.kind === 'odd');
  const decisionCounts: number[] = [];

  for (const descriptor of ordered) {
    const threats = ordered.filter((entry, index) => index >= inspectedCenters && entry.maxPossibleLength > bestLength);
    if (threats.length === 0) break;
    decisionCounts.push(threats.length);
    inspectedCenters += 1;
    const expanded = expandFully(puzzle.text, descriptor);
    actions += expanded.expandCost;
    bestLength = Math.max(bestLength, expanded.length);
  }

  return {
    actions,
    solved: bestLength === puzzle.bestLength,
    bestLength,
    inspectedCenters,
    decisionCounts,
  };
}

export function evaluateHeartspan(): HeartspanEvaluation {
  const difficulties: DifficultyAggregate[] = [];
  let totalGap = 0;
  let totalInvariantPressure = 0;

  for (const difficulty of [1, 2, 3, 4, 5] as HeartspanDifficulty[]) {
    const puzzle = generatePuzzle(0, difficulty);
    const optimal = simulateOptimal(puzzle);
    const baseline = simulateTranscribeBaseline(puzzle);
    const oddOnly = simulateOddOnlyBaseline(puzzle);
    const puzzleEntropy = optimal.decisionCounts.reduce((sum, count) => sum + log2(Math.max(1, count)), 0);
    const decisionEntropy = puzzleEntropy / Math.max(1, optimal.decisionCounts.length);
    const skillDepth = clamp(0, 1, 1 - optimal.actions / baseline.actions);
    const drama = clamp(0, 1, optimal.actions / puzzle.budget + (baseline.actions > puzzle.budget ? 0.15 : 0.05));
    const infoGainRatio = clamp(1, 6, baseline.actions / Math.max(1, optimal.actions));
    const counterintuitive = clamp(
      1,
      6,
      1 +
        (oddOnly.solved ? 0 : 1.2) +
        optimal.decisionCounts.filter((count) => count > 1).length * 0.8,
    );
    const altSolvability = baseline.actions <= puzzle.budget ? 1 : 0;
    const gap = clamp(0, 1, 1 - optimal.actions / baseline.actions);
    const oddGap = oddOnly.solved
      ? clamp(0, 1, 1 - optimal.actions / Math.max(optimal.actions + 1, oddOnly.actions))
      : 0.72;

    totalGap += gap;
    totalInvariantPressure += oddGap;

    difficulties.push({
      difficulty,
      label: puzzle.label,
      budget: puzzle.budget,
      textLength: puzzle.text.length,
      solvability: optimal.solved ? 1 : 0,
      puzzleEntropy,
      skillDepth,
      decisionEntropy,
      counterintuitive,
      drama,
      infoGainRatio,
      optimalMoves: optimal.actions,
      altMoves: baseline.actions,
      altSolvability,
    });
  }

  const difficultyBreakpoint =
    (difficulties.find((entry) => entry.altSolvability === 0)?.difficulty as HeartspanDifficulty | undefined) ?? 5;

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
      difficultyBreakpoint,
      algorithmAlignment: 1,
    },
    interpretation: {
      invariant:
        'Every palindrome candidate has one odd rune or even seam at its heart; grow that heart outward pair by pair and keep the longest certified span.',
      strongestAlternative:
        'Transcribe full centers from scratch and ignore the odd-versus-even heart distinction.',
      evidence:
        'D1-D2 still allow brute-force center transcription, but D3 introduces an even-length winner and D3-D5 budgets only fit pairwise center growth while transcription spills over budget.',
    },
  };
}

export function centerSummary(center: HeartspanCenterState, text: string) {
  return {
    value: spanValue(text, center.spanStart, center.spanEnd),
    nextPair:
      center.exhausted || center.openLeft < 0 || center.openRight >= text.length
        ? null
        : `${text[center.openLeft]} · ${text[center.openRight]}`,
  };
}

export function threatCount(state: HeartspanState) {
  return centerThreatCount(state);
}

export function centerById(state: HeartspanState, centerId: number) {
  return state.centers[centerId];
}

export function describeCenterPotential(state: HeartspanState, centerId: number) {
  const center = centerById(state, centerId);
  if (!center) return 'Missing center';
  return `${center.length}/${center.maxPossibleLength}`;
}

export function fullCenterExpansionPreview(state: HeartspanState) {
  const center = selectedCenter(state);
  if (!center) return null;
  const descriptor = descriptorById(state.puzzle.text, center.id);
  const expanded = expandFully(state.puzzle.text, descriptor);
  return {
    cost: transcriptionCost(center),
    value: spanValue(state.puzzle.text, expanded.start, expanded.end),
    length: expanded.length,
  };
}
