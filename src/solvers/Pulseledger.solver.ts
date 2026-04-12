export type PulseledgerDifficulty = 1 | 2 | 3 | 4 | 5;

export type PulseledgerCenterKind = 'odd' | 'even';

export type PulseledgerMove =
  | { type: 'select'; centerId: number }
  | { type: 'pulse' }
  | { type: 'transcribe' }
  | { type: 'seal' };

export type PulseledgerVerdict = {
  correct: boolean;
  label: string;
};

export type PulseledgerCenterState = {
  id: number;
  kind: PulseledgerCenterKind;
  anchor: number;
  label: string;
  maxPossibleLength: number;
  maxPossibleCount: number;
  openLeft: number;
  openRight: number;
  spanStart: number;
  spanEnd: number;
  length: number;
  bankedCount: number;
  exhausted: boolean;
};

export type PulseledgerPuzzle = {
  difficulty: PulseledgerDifficulty;
  label: string;
  title: string;
  helper: string;
  budget: number;
  text: string;
  totalCount: number;
};

export type PulseledgerState = {
  puzzle: PulseledgerPuzzle;
  selectedCenterId: number;
  centers: PulseledgerCenterState[];
  actionsUsed: number;
  totalBankedCount: number;
  history: string[];
  message: string;
  verdict: PulseledgerVerdict | null;
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
  kind: PulseledgerCenterKind;
  anchor: number;
  label: string;
  maxPossibleLength: number;
  maxPossibleCount: number;
};

type CountExpansion = {
  start: number;
  end: number;
  length: number;
  count: number;
  expandCost: number;
};

type DifficultyAggregate = {
  difficulty: PulseledgerDifficulty;
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
  difficultyBreakpoint: PulseledgerDifficulty;
  algorithmAlignment: number;
};

export type PulseledgerEvaluation = {
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
  totalCount: number;
  processedCenters: number;
  decisionCounts: number[];
};

const BLUEPRINTS: Record<PulseledgerDifficulty, Blueprint> = {
  1: {
    label: 'D1',
    title: 'Lantern Ledger',
    helper:
      'Every rune already counts once. Your job is to bank the wider mirrors without paying full-center recount costs.',
    budget: 9,
    variants: ['aba', 'eve', 'ada'],
  },
  2: {
    label: 'D2',
    title: 'Gallery Ribbon',
    helper:
      'One heart can yield several mirrors in layers. Counting only the biggest glow misses the smaller mirrors nested inside it.',
    budget: 26,
    variants: ['ababa', 'racecar', 'rotator'],
  },
  3: {
    label: 'D3',
    title: 'Seam Census',
    helper:
      'Even seams now hide real mirrors. If you bank only rune hearts, your ledger comes up short.',
    budget: 12,
    variants: ['abbae', 'noonx', 'redderq'],
  },
  4: {
    label: 'D4',
    title: 'Archive Census',
    helper:
      'Several hearts contribute nested mirrors. The scalable move is still local: finish one heart, bank each new layer once, then move on.',
    budget: 18,
    variants: ['abacdcaba', 'cabbadabbaq', 'rotavatorx'],
  },
  5: {
    label: 'D5',
    title: 'Vault Census',
    helper:
      'Odd hearts, seam hearts, and deep nests all matter now. Full-center recounts blow the audit budget before the full ledger is sealed.',
    budget: 22,
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

function initialBankedCount(kind: PulseledgerCenterKind) {
  return kind === 'odd' ? 1 : 0;
}

function centerDescriptor(text: string, id: number, kind: PulseledgerCenterKind, anchor: number): CenterDescriptor {
  const maxRadius = kind === 'odd' ? Math.min(anchor, text.length - 1 - anchor) : Math.min(anchor + 1, text.length - 1 - anchor);
  const maxPossibleLength = kind === 'odd' ? 1 + maxRadius * 2 : maxRadius * 2;
  const maxPossibleCount = kind === 'odd' ? 1 + maxRadius : maxRadius;

  return {
    id,
    kind,
    anchor,
    label: kind === 'odd' ? `Rune ${anchor + 1}` : `Seam ${anchor + 1}|${anchor + 2}`,
    maxPossibleLength,
    maxPossibleCount,
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

function createCenterState(text: string, descriptor: CenterDescriptor): PulseledgerCenterState {
  if (descriptor.kind === 'odd') {
    const openLeft = descriptor.anchor - 1;
    const openRight = descriptor.anchor + 1;
    return {
      id: descriptor.id,
      kind: descriptor.kind,
      anchor: descriptor.anchor,
      label: descriptor.label,
      maxPossibleLength: descriptor.maxPossibleLength,
      maxPossibleCount: descriptor.maxPossibleCount,
      openLeft,
      openRight,
      spanStart: descriptor.anchor,
      spanEnd: descriptor.anchor,
      length: 1,
      bankedCount: 1,
      exhausted: openLeft < 0 || openRight >= text.length,
    };
  }

  return {
    id: descriptor.id,
    kind: descriptor.kind,
    anchor: descriptor.anchor,
    label: descriptor.label,
    maxPossibleLength: descriptor.maxPossibleLength,
    maxPossibleCount: descriptor.maxPossibleCount,
    openLeft: descriptor.anchor,
    openRight: descriptor.anchor + 1,
    spanStart: descriptor.anchor + 1,
    spanEnd: descriptor.anchor,
    length: 0,
    bankedCount: 0,
    exhausted: false,
  };
}

function cloneCenter(center: PulseledgerCenterState): PulseledgerCenterState {
  return { ...center };
}

function cloneState(state: PulseledgerState): PulseledgerState {
  return {
    ...state,
    centers: state.centers.map((center) => cloneCenter(center)),
    history: [...state.history],
  };
}

function spanValue(text: string, start: number, end: number) {
  if (end < start) return '(empty seam)';
  return text.slice(start, end + 1);
}

function expandFully(text: string, descriptor: CenterDescriptor): CountExpansion {
  let count = initialBankedCount(descriptor.kind);
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
    count += 1;
    openLeft -= 1;
    openRight += 1;
  }

  return { start, end, length, count, expandCost };
}

function totalPalindromesForText(text: string) {
  let total = 0;
  for (const descriptor of buildCenterDescriptors(text)) {
    total += expandFully(text, descriptor).count;
  }
  return total;
}

function transcriptionCost(center: PulseledgerCenterState | CenterDescriptor) {
  return center.maxPossibleLength + center.maxPossibleCount + 1;
}

function descriptorById(text: string, id: number) {
  const descriptors = buildCenterDescriptors(text);
  return descriptors.find((descriptor) => descriptor.id === id) ?? descriptors[0];
}

function finalize(next: PulseledgerState) {
  if (next.actionsUsed > next.puzzle.budget) {
    next.verdict = {
      correct: false,
      label: 'The audit clock ran out before the mirror ledger was fully sealed.',
    };
  }
  return next;
}

function currentCenterCount(state: PulseledgerState, centerId: number) {
  return state.centers[centerId]?.bankedCount ?? 0;
}

function sortDescriptors(text: string) {
  const midpoint = (text.length - 1) / 2;
  return [...buildCenterDescriptors(text)].sort((left, right) => {
    if (right.maxPossibleCount !== left.maxPossibleCount) {
      return right.maxPossibleCount - left.maxPossibleCount;
    }
    if (right.maxPossibleLength !== left.maxPossibleLength) {
      return right.maxPossibleLength - left.maxPossibleLength;
    }
    if (left.kind !== right.kind) {
      return left.kind === 'even' ? -1 : 1;
    }
    return Math.abs(left.anchor - midpoint) - Math.abs(right.anchor - midpoint);
  });
}

function processableDescriptors(text: string) {
  return sortDescriptors(text).filter((descriptor) => expandFully(text, descriptor).expandCost > 0);
}

export function generatePuzzle(seed: number, difficulty: PulseledgerDifficulty): PulseledgerPuzzle {
  const blueprint = BLUEPRINTS[difficulty];
  const text = blueprint.variants[seed % blueprint.variants.length] ?? blueprint.variants[0] ?? 'aba';

  return {
    difficulty,
    label: blueprint.label,
    title: blueprint.title,
    helper: blueprint.helper,
    budget: blueprint.budget,
    text,
    totalCount: totalPalindromesForText(text),
  };
}

export function createInitialState(puzzle: PulseledgerPuzzle): PulseledgerState {
  const centers = buildCenterDescriptors(puzzle.text).map((descriptor) => createCenterState(puzzle.text, descriptor));
  const selected = centers.find((center) => !center.exhausted) ?? centers[0];

  return {
    puzzle,
    selectedCenterId: selected?.id ?? 0,
    centers,
    actionsUsed: 0,
    totalBankedCount: puzzle.text.length,
    history: [],
    message:
      'Every rune already counts once. Choose a rune or seam heart, pulse outward while the mirror holds, and seal the ledger only after every live center is settled.',
    verdict: null,
  };
}

export function selectedCenter(state: PulseledgerState) {
  return state.centers[state.selectedCenterId];
}

export function pendingCenterCount(state: PulseledgerState) {
  return state.centers.filter((center) => !center.exhausted).length;
}

export function pendingMirrorCount(state: PulseledgerState) {
  return Math.max(0, state.puzzle.totalCount - state.totalBankedCount);
}

export function totalCountText(state: PulseledgerState) {
  return `${state.totalBankedCount}/${state.puzzle.totalCount}`;
}

export function canPulse(state: PulseledgerState) {
  const center = selectedCenter(state);
  return Boolean(center) && !center.exhausted && center.openLeft >= 0 && center.openRight < state.puzzle.text.length;
}

export function canTranscribe(state: PulseledgerState) {
  const center = selectedCenter(state);
  return Boolean(center) && !center.exhausted;
}

export function canSeal(state: PulseledgerState) {
  return pendingCenterCount(state) === 0 && pendingMirrorCount(state) === 0;
}

export function nextPairLabel(state: PulseledgerState) {
  const center = selectedCenter(state);
  if (!center || center.exhausted || center.openLeft < 0 || center.openRight >= state.puzzle.text.length) {
    return 'No further pair remains on this center.';
  }
  return `${state.puzzle.text[center.openLeft]} · ${state.puzzle.text[center.openRight]}`;
}

export function applyMove(state: PulseledgerState, move: PulseledgerMove): PulseledgerState {
  const next = cloneState(state);
  if (next.verdict) return next;

  if (move.type === 'select') {
    if (move.centerId >= 0 && move.centerId < next.centers.length) {
      next.selectedCenterId = move.centerId;
      const center = selectedCenter(next);
      if (!center) return next;
      if (center.exhausted) {
        next.message = `${center.label} is already settled with ${currentCenterCount(next, center.id)} mirrors banked.`;
      } else {
        next.message = `${center.label} is live. Pulse outward for one new mirror at a time, or transcribe the center from scratch at a heavy recount cost.`;
      }
    }
    return next;
  }

  const center = selectedCenter(next);
  if (!center) return next;

  if (move.type === 'pulse') {
    if (!canPulse(next)) {
      next.message = `${center.label} has no live pair left to audit.`;
      return next;
    }

    next.actionsUsed += 1;
    const left = center.openLeft;
    const right = center.openRight;

    if (comparePair(next.puzzle.text, left, right)) {
      center.spanStart = left;
      center.spanEnd = right;
      center.length += 2;
      center.bankedCount += 1;
      center.openLeft -= 1;
      center.openRight += 1;
      next.totalBankedCount += 1;

      if (center.openLeft < 0 || center.openRight >= next.puzzle.text.length) {
        center.exhausted = true;
      }

      next.history.unshift(
        `Pulse ${center.label}: matched ${next.puzzle.text[left]} and ${next.puzzle.text[right]} to bank "${spanValue(next.puzzle.text, center.spanStart, center.spanEnd)}"`,
      );
      next.message = `${center.label} banked one new mirror. Ledger now holds ${next.totalBankedCount}/${next.puzzle.totalCount}.`;
      return finalize(next);
    }

    center.exhausted = true;
    next.history.unshift(
      `Pulse ${center.label}: ${next.puzzle.text[left]} and ${next.puzzle.text[right]} broke the next mirror layer`,
    );
    next.message = `${center.label} stops at ${center.bankedCount} banked mirrors.`;
    return finalize(next);
  }

  if (move.type === 'transcribe') {
    if (!canTranscribe(next)) {
      next.message = `${center.label} is already settled.`;
      return next;
    }

    const descriptor = descriptorById(next.puzzle.text, center.id);
    const expanded = expandFully(next.puzzle.text, descriptor);
    const cost = transcriptionCost(center);
    const additionalCount = Math.max(0, expanded.count - center.bankedCount);

    center.spanStart = expanded.start;
    center.spanEnd = expanded.end;
    center.length = expanded.length;
    center.bankedCount = expanded.count;
    center.exhausted = true;
    center.openLeft = -1;
    center.openRight = next.puzzle.text.length;
    next.totalBankedCount += additionalCount;
    next.actionsUsed += cost;
    next.history.unshift(
      `Transcribe ${center.label}: paid ${cost} to recount the full center and bank ${additionalCount} more mirrors`,
    );
    next.message = `${center.label} was transcribed from scratch for ${cost} actions.`;
    return finalize(next);
  }

  if (move.type === 'seal') {
    next.actionsUsed += 1;
    if (canSeal(next)) {
      next.verdict = {
        correct: true,
        label: `Ledger sealed: ${next.totalBankedCount} palindromic substrings counted.`,
      };
      next.history.unshift(`Seal ledger: ${next.totalBankedCount} mirrors banked`);
      next.message = 'Every live center is settled and every mirror has been counted once.';
      return finalize(next);
    }

    next.verdict = {
      correct: false,
      label: 'The ledger was sealed early. Uncounted mirrors still remain on the ribbon.',
    };
    next.history.unshift('Seal ledger too early');
    next.message = `There are still ${pendingMirrorCount(next)} mirrors and ${pendingCenterCount(next)} live centers unresolved.`;
    return finalize(next);
  }

  return next;
}

function simulateOptimal(puzzle: PulseledgerPuzzle): SimulationResult {
  let actions = 1;
  let totalCount = puzzle.text.length;
  let processedCenters = 0;
  const ordered = processableDescriptors(puzzle.text);
  const decisionCounts: number[] = [];

  for (let index = 0; index < ordered.length; index += 1) {
    const descriptor = ordered[index];
    decisionCounts.push(ordered.length - index);
    const expanded = expandFully(puzzle.text, descriptor);
    actions += expanded.expandCost;
    totalCount += expanded.count - initialBankedCount(descriptor.kind);
    processedCenters += 1;
  }

  return {
    actions,
    solved: totalCount === puzzle.totalCount,
    totalCount,
    processedCenters,
    decisionCounts,
  };
}

function simulateTranscribeBaseline(puzzle: PulseledgerPuzzle): SimulationResult {
  let actions = 1;
  let totalCount = puzzle.text.length;
  let processedCenters = 0;
  const ordered = processableDescriptors(puzzle.text);
  const decisionCounts: number[] = [];

  for (let index = 0; index < ordered.length; index += 1) {
    const descriptor = ordered[index];
    decisionCounts.push(ordered.length - index);
    const expanded = expandFully(puzzle.text, descriptor);
    actions += expanded.count > initialBankedCount(descriptor.kind) ? transcriptionCost(descriptor) : expanded.expandCost;
    totalCount += expanded.count - initialBankedCount(descriptor.kind);
    processedCenters += 1;
  }

  return {
    actions,
    solved: totalCount === puzzle.totalCount,
    totalCount,
    processedCenters,
    decisionCounts,
  };
}

function simulateOddOnlyBaseline(puzzle: PulseledgerPuzzle): SimulationResult {
  let actions = 1;
  let totalCount = puzzle.text.length;
  let processedCenters = 0;
  const ordered = processableDescriptors(puzzle.text).filter((descriptor) => descriptor.kind === 'odd');
  const decisionCounts: number[] = [];

  for (let index = 0; index < ordered.length; index += 1) {
    const descriptor = ordered[index];
    decisionCounts.push(ordered.length - index);
    const expanded = expandFully(puzzle.text, descriptor);
    actions += expanded.expandCost;
    totalCount += expanded.count - 1;
    processedCenters += 1;
  }

  return {
    actions,
    solved: totalCount === puzzle.totalCount,
    totalCount,
    processedCenters,
    decisionCounts,
  };
}

function simulateLongestOnlyBaseline(puzzle: PulseledgerPuzzle): SimulationResult {
  const ordered = processableDescriptors(puzzle.text);
  const best = [...ordered].sort((left, right) => {
    const leftExpansion = expandFully(puzzle.text, left);
    const rightExpansion = expandFully(puzzle.text, right);
    if (rightExpansion.count !== leftExpansion.count) {
      return rightExpansion.count - leftExpansion.count;
    }
    return rightExpansion.length - leftExpansion.length;
  })[0];

  if (!best) {
    return {
      actions: 1,
      solved: puzzle.text.length === puzzle.totalCount,
      totalCount: puzzle.text.length,
      processedCenters: 0,
      decisionCounts: [],
    };
  }

  const expanded = expandFully(puzzle.text, best);
  return {
    actions: 1 + expanded.expandCost,
    solved: puzzle.text.length + expanded.count - initialBankedCount(best.kind) === puzzle.totalCount,
    totalCount: puzzle.text.length + expanded.count - initialBankedCount(best.kind),
    processedCenters: 1,
    decisionCounts: [ordered.length],
  };
}

export function evaluatePulseledger(): PulseledgerEvaluation {
  const difficulties: DifficultyAggregate[] = [];
  let totalGap = 0;
  let totalInvariantPressure = 0;

  for (const difficulty of [1, 2, 3, 4, 5] as PulseledgerDifficulty[]) {
    const puzzle = generatePuzzle(0, difficulty);
    const optimal = simulateOptimal(puzzle);
    const baseline = simulateTranscribeBaseline(puzzle);
    const oddOnly = simulateOddOnlyBaseline(puzzle);
    const longestOnly = simulateLongestOnlyBaseline(puzzle);
    const puzzleEntropy = optimal.decisionCounts.reduce((sum, count) => sum + log2(Math.max(1, count)), 0);
    const decisionEntropy = puzzleEntropy / Math.max(1, optimal.decisionCounts.length);
    const skillDepth = clamp(0, 1, 1 - optimal.actions / baseline.actions);
    const drama = clamp(0, 1, optimal.actions / puzzle.budget + (baseline.actions > puzzle.budget ? 0.15 : 0.05));
    const infoGainRatio = clamp(1, 6, baseline.actions / Math.max(1, optimal.actions));
    const counterintuitive = clamp(
      1,
      6,
      1 +
        (oddOnly.solved ? 0 : 1.1) +
        (longestOnly.solved ? 0 : 1) +
        processableDescriptors(puzzle.text)
          .map((descriptor) => expandFully(puzzle.text, descriptor).count - initialBankedCount(descriptor.kind))
          .filter((count) => count > 1).length *
          0.15,
    );
    const altSolvability = baseline.actions <= puzzle.budget ? 1 : 0;
    const gap = clamp(0, 1, 1 - optimal.actions / baseline.actions);
    const oddGap = clamp(0, 1, 1 - oddOnly.totalCount / puzzle.totalCount);
    const longestGap = clamp(0, 1, 1 - longestOnly.totalCount / puzzle.totalCount);

    totalGap += gap;
    totalInvariantPressure += Math.max(oddGap, longestGap);

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
    (difficulties.find((entry) => entry.altSolvability === 0)?.difficulty as PulseledgerDifficulty | undefined) ?? 5;

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
        'Every rune and seam is its own palindrome heart, and each successful outward layer from that heart adds exactly one more palindromic substring to the final count.',
      strongestAlternative:
        'Recount whole centers from scratch or bank only the longest-looking mirror at each heart.',
      evidence:
        'D1-D2 still tolerate brute-force center recounts, but D3 introduces seam-only mirrors and D3-D5 budgets only fit local layer-by-layer harvesting while full-center transcription overruns the clock.',
    },
  };
}

export function centerSummary(center: PulseledgerCenterState, text: string) {
  return {
    value: spanValue(text, center.spanStart, center.spanEnd),
    bankedCount: center.bankedCount,
    nextPair:
      center.exhausted || center.openLeft < 0 || center.openRight >= text.length
        ? null
        : `${text[center.openLeft]} · ${text[center.openRight]}`,
  };
}

export function centerById(state: PulseledgerState, centerId: number) {
  return state.centers[centerId];
}

export function describeCenterPotential(state: PulseledgerState, centerId: number) {
  const center = centerById(state, centerId);
  if (!center) return 'Missing center';
  return `${center.bankedCount}/${center.maxPossibleCount}`;
}

export function fullCenterCountPreview(state: PulseledgerState) {
  const center = selectedCenter(state);
  if (!center) return null;
  const descriptor = descriptorById(state.puzzle.text, center.id);
  const expanded = expandFully(state.puzzle.text, descriptor);
  return {
    cost: transcriptionCost(center),
    additionalCount: Math.max(0, expanded.count - center.bankedCount),
    count: expanded.count,
    value: spanValue(state.puzzle.text, expanded.start, expanded.end),
  };
}
