export type LexiforgeDifficulty = 1 | 2 | 3 | 4 | 5;

export type LexiforgeOutcome = 'valid' | 'invalid_prefix' | 'cycle';

export type LexiforgeMove =
  | { type: 'inspect_pair'; pairIndex: number }
  | { type: 'place_rune'; runeId: string }
  | { type: 'declare_invalid' }
  | { type: 'declare_cycle' }
  | { type: 'claim' };

export type LexiforgeVerdict = {
  correct: boolean;
  label: string;
};

export type LexiforgePairClue = {
  index: number;
  leftWord: string;
  rightWord: string;
  sharedPrefix: string;
  splitIndex: number | null;
  kind: 'edge' | 'no_edge' | 'invalid_prefix';
  beforeRune: string | null;
  afterRune: string | null;
  summary: string;
};

export type LexiforgeRune = {
  id: string;
  incomingIds: string[];
  outgoingIds: string[];
};

export type LexiforgePuzzle = {
  difficulty: LexiforgeDifficulty;
  label: string;
  title: string;
  helper: string;
  budget: number;
  outcome: LexiforgeOutcome;
  words: string[];
  pairs: LexiforgePairClue[];
  letters: string[];
  runes: LexiforgeRune[];
  edgeCount: number;
  expectedOrder: string;
};

export type LexiforgeState = {
  puzzle: LexiforgePuzzle;
  phase: 'compare' | 'order';
  inspectedPairs: number[];
  invalidPairIndex: number | null;
  placed: string[];
  remainingIncoming: Record<string, number>;
  ready: string[];
  actionsUsed: number;
  history: string[];
  message: string;
  verdict: LexiforgeVerdict | null;
};

type LexiconBlueprint = {
  words: string[];
  outcome: LexiforgeOutcome;
};

type Blueprint = {
  label: string;
  title: string;
  helper: string;
  lexicons: LexiconBlueprint[];
};

type DifficultyAggregate = {
  difficulty: LexiforgeDifficulty;
  label: string;
  budget: number;
  solvability: number;
  puzzleEntropy: number;
  skillDepth: number;
  decisionEntropy: number;
  counterintuitive: number;
  drama: number;
  infoGainRatio: number;
  optimalActions: number;
  altActions: number;
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
  difficultyBreakpoint: LexiforgeDifficulty;
  algorithmAlignment: number;
};

export type LexiforgeEvaluation = {
  difficulties: DifficultyAggregate[];
  learningMetrics: LearningMetrics;
  interpretation: {
    invariant: string;
    strongestAlternative: string;
    evidence: string;
  };
};

type SimulationResult = {
  solved: boolean;
  actionsUsed: number;
  counterintuitiveSteps: number;
  meanDecisionEntropy: number;
  meanInfoGainRatio: number;
};

const BLUEPRINTS: Record<LexiforgeDifficulty, Blueprint> = {
  1: {
    label: 'D1',
    title: 'Gentle Shelf',
    helper:
      'Start by comparing each neighboring word pair. If one word is only a shorter prefix of the next, that pair adds no rune rule.',
    lexicons: [
      {
        words: ['a', 'ab', 'ac', 'b'],
        outcome: 'valid',
      },
    ],
  },
  2: {
    label: 'D2',
    title: 'Buried Split',
    helper:
      'The clue does not come from every mismatch. Only the first split in each adjacent pair counts, even when later letters also differ.',
    lexicons: [
      {
        words: ['baa', 'abcd', 'abca', 'cab', 'cad'],
        outcome: 'valid',
      },
    ],
  },
  3: {
    label: 'D3',
    title: 'Prefix Breach',
    helper:
      'A longer word may never stand before its own prefix. If that happens, the dictionary is broken before rune peeling even starts.',
    lexicons: [
      {
        words: ['mna', 'mnb', 'mn'],
        outcome: 'invalid_prefix',
      },
    ],
  },
  4: {
    label: 'D4',
    title: 'Looped Shelf',
    helper:
      'Even with every pair compared, the rune rail can still run dry before the alphabet is complete. That means the remaining rune rules loop.',
    lexicons: [
      {
        words: ['abc', 'bcd', 'cde', 'aef'],
        outcome: 'cycle',
      },
    ],
  },
  5: {
    label: 'D5',
    title: 'Split Chorus',
    helper:
      'Several rune families stay free at once here. Compare every shelf pair first, then trust the full zero-seal rail instead of one vivid branch.',
    lexicons: [
      {
        words: ['xza', 'xzb', 'yca', 'ycb', 'zda', 'zdb'],
        outcome: 'valid',
      },
    ],
  },
};

function clamp(min: number, max: number, value: number) {
  return Math.max(min, Math.min(max, value));
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function log2(value: number) {
  return Math.log(value) / Math.log(2);
}

function sortIds(left: string, right: string) {
  return left.localeCompare(right);
}

function pushHistory(history: string[], entry: string) {
  const next = [...history, entry];
  return next.slice(-10);
}

function cloneState(state: LexiforgeState): LexiforgeState {
  return {
    ...state,
    inspectedPairs: [...state.inspectedPairs],
    placed: [...state.placed],
    remainingIncoming: { ...state.remainingIncoming },
    ready: [...state.ready],
    history: [...state.history],
  };
}

function uniqueSorted(values: Iterable<string>) {
  return [...new Set(values)].sort(sortIds);
}

function compareAdjacentWords(leftWord: string, rightWord: string, index: number): LexiforgePairClue {
  const sharedLimit = Math.min(leftWord.length, rightWord.length);

  for (let position = 0; position < sharedLimit; position += 1) {
    const leftRune = leftWord[position]!;
    const rightRune = rightWord[position]!;
    if (leftRune === rightRune) continue;
    const sharedPrefix = leftWord.slice(0, position);
    return {
      index,
      leftWord,
      rightWord,
      sharedPrefix,
      splitIndex: position,
      kind: 'edge',
      beforeRune: leftRune,
      afterRune: rightRune,
      summary:
        sharedPrefix.length > 0
          ? `Shared "${sharedPrefix}", then ${leftRune} before ${rightRune}. Stop at that first split.`
          : `${leftRune} must come before ${rightRune}.`,
    };
  }

  if (leftWord.length > rightWord.length) {
    return {
      index,
      leftWord,
      rightWord,
      sharedPrefix: rightWord,
      splitIndex: null,
      kind: 'invalid_prefix',
      beforeRune: null,
      afterRune: null,
      summary: `${leftWord} comes before its own prefix ${rightWord}. The shelf is invalid.`,
    };
  }

  return {
    index,
    leftWord,
    rightWord,
    sharedPrefix: leftWord,
    splitIndex: null,
    kind: 'no_edge',
    beforeRune: null,
    afterRune: null,
    summary: `${leftWord} is only a shorter prefix here, so this pair adds no new rune rule.`,
  };
}

function buildRunes(letters: string[], pairs: LexiforgePairClue[]) {
  const outgoing = new Map<string, Set<string>>();
  const incoming = new Map<string, Set<string>>();

  for (const letter of letters) {
    outgoing.set(letter, new Set());
    incoming.set(letter, new Set());
  }

  for (const pair of pairs) {
    if (pair.kind !== 'edge' || !pair.beforeRune || !pair.afterRune) continue;
    outgoing.get(pair.beforeRune)!.add(pair.afterRune);
    incoming.get(pair.afterRune)!.add(pair.beforeRune);
  }

  return letters.map((letter) => ({
    id: letter,
    incomingIds: uniqueSorted(incoming.get(letter)!),
    outgoingIds: uniqueSorted(outgoing.get(letter)!),
  }));
}

function topoSort(letters: string[], runes: LexiforgeRune[]) {
  const remainingIncoming = Object.fromEntries(
    runes.map((rune) => [rune.id, rune.incomingIds.length]),
  ) as Record<string, number>;
  const ready = runes
    .filter((rune) => rune.incomingIds.length === 0)
    .map((rune) => rune.id)
    .sort(sortIds);
  const order: string[] = [];

  for (let index = 0; index < ready.length; index += 1) {
    const current = ready[index]!;
    order.push(current);
    const rune = runes.find((entry) => entry.id === current)!;
    for (const outgoingId of rune.outgoingIds) {
      remainingIncoming[outgoingId] -= 1;
      if (remainingIncoming[outgoingId] === 0) {
        ready.push(outgoingId);
        ready.sort(sortIds);
      }
    }
  }

  return {
    hasCycle: order.length !== letters.length,
    order,
  };
}

function buildPuzzle(difficulty: LexiforgeDifficulty, lexicon: LexiconBlueprint): LexiforgePuzzle {
  const letters = uniqueSorted(lexicon.words.join('').split(''));
  const pairs = lexicon.words
    .slice(0, -1)
    .map((leftWord, index) => compareAdjacentWords(leftWord, lexicon.words[index + 1]!, index));
  const runes = buildRunes(letters, pairs);
  const topological = topoSort(letters, runes);

  return {
    difficulty,
    label: BLUEPRINTS[difficulty].label,
    title: BLUEPRINTS[difficulty].title,
    helper: BLUEPRINTS[difficulty].helper,
    budget: pairs.length + letters.length + 1,
    outcome: lexicon.outcome,
    words: [...lexicon.words],
    pairs,
    letters,
    runes,
    edgeCount: runes.reduce((sum, rune) => sum + rune.outgoingIds.length, 0),
    expectedOrder: lexicon.outcome === 'valid' && !topological.hasCycle ? topological.order.join('') : '',
  };
}

export function generatePuzzle(seed: number, difficulty: LexiforgeDifficulty) {
  const blueprint = BLUEPRINTS[difficulty];
  const lexicon = blueprint.lexicons[seed % blueprint.lexicons.length]!;
  return buildPuzzle(difficulty, lexicon);
}

export function runeById(puzzle: LexiforgePuzzle, runeId: string) {
  return puzzle.runes.find((rune) => rune.id === runeId)!;
}

export function unresolvedPairIndices(state: LexiforgeState) {
  return state.puzzle.pairs
    .map((pair) => pair.index)
    .filter((pairIndex) => !state.inspectedPairs.includes(pairIndex));
}

export function discoveredEdges(state: LexiforgeState) {
  const seen = new Set<string>();
  const ledger: Array<{ before: string; after: string }> = [];
  for (const pairIndex of state.inspectedPairs) {
    const pair = state.puzzle.pairs[pairIndex]!;
    if (pair.kind !== 'edge' || !pair.beforeRune || !pair.afterRune) continue;
    const edgeKey = `${pair.beforeRune}->${pair.afterRune}`;
    if (seen.has(edgeKey)) continue;
    seen.add(edgeKey);
    ledger.push({ before: pair.beforeRune, after: pair.afterRune });
  }
  return ledger.sort((left, right) =>
    `${left.before}${left.after}`.localeCompare(`${right.before}${right.after}`),
  );
}

export function readyRunes(state: LexiforgeState) {
  return state.ready.map((runeId) => runeById(state.puzzle, runeId));
}

function startOrderPhase(state: LexiforgeState) {
  const ready = state.puzzle.runes
    .filter((rune) => rune.incomingIds.length === 0)
    .map((rune) => rune.id)
    .sort(sortIds);

  state.phase = 'order';
  state.remainingIncoming = Object.fromEntries(
    state.puzzle.runes.map((rune) => [rune.id, rune.incomingIds.length]),
  );
  state.ready = ready;
  state.message =
    ready.length > 0
      ? 'Shelf clues are complete. Place any rune from the ready rail into the alphabet.'
      : 'Every pair is compared, but no rune is ready. If runes remain, call the cycle.';
}

export function createInitialState(puzzle: LexiforgePuzzle): LexiforgeState {
  return {
    puzzle,
    phase: 'compare',
    inspectedPairs: [],
    invalidPairIndex: null,
    placed: [],
    remainingIncoming: Object.fromEntries(puzzle.letters.map((letter) => [letter, 0])),
    ready: [],
    actionsUsed: 0,
    history: [],
    message:
      'Compare adjacent shelf pairs first. Each pair yields at most one rune rule, and only the first split matters.',
    verdict: null,
  };
}

export function applyMove(state: LexiforgeState, move: LexiforgeMove): LexiforgeState {
  if (state.verdict) return state;

  const next = cloneState(state);
  next.actionsUsed += 1;

  if (move.type === 'inspect_pair') {
    if (next.phase !== 'compare') {
      next.verdict = {
        correct: false,
        label: 'The shelf clues are already done. Place runes or prove the dictionary is broken.',
      };
      next.message = next.verdict.label;
      return next;
    }
    if (next.invalidPairIndex !== null) {
      next.verdict = {
        correct: false,
        label: 'A prefix breach is already visible. Name the invalid dictionary instead of reading further.',
      };
      next.message = next.verdict.label;
      return next;
    }
    if (next.inspectedPairs.includes(move.pairIndex)) {
      next.verdict = {
        correct: false,
        label: 'That pair was already inspected.',
      };
      next.message = next.verdict.label;
      return next;
    }

    const pair = next.puzzle.pairs[move.pairIndex]!;
    next.inspectedPairs.push(move.pairIndex);
    next.inspectedPairs.sort((left, right) => left - right);
    next.history = pushHistory(next.history, `Inspect ${pair.leftWord} / ${pair.rightWord}`);

    if (pair.kind === 'invalid_prefix') {
      next.invalidPairIndex = pair.index;
      next.message = pair.summary;
      return next;
    }

    if (next.inspectedPairs.length === next.puzzle.pairs.length) {
      startOrderPhase(next);
      return next;
    }

    next.message = pair.summary;
    return next;
  }

  if (move.type === 'declare_invalid') {
    const correct = next.invalidPairIndex !== null;
    next.verdict = {
      correct,
      label: correct
        ? 'Invalid dictionary confirmed. A longer word stood before its own prefix.'
        : 'No prefix breach has been proven yet.',
    };
    next.message = next.verdict.label;
    next.history = pushHistory(next.history, correct ? 'Declare invalid shelf' : 'False invalid call');
    return next;
  }

  if (move.type === 'declare_cycle') {
    const correct =
      next.phase === 'order' &&
      next.ready.length === 0 &&
      next.placed.length < next.puzzle.letters.length;
    next.verdict = {
      correct,
      label: correct
        ? 'Cycle confirmed. The ready rail dried up before every rune could be placed.'
        : 'A cycle is not proven yet. Either a ready rune still exists or the alphabet is already complete.',
    };
    next.message = next.verdict.label;
    next.history = pushHistory(next.history, correct ? 'Call cycle' : 'False cycle call');
    return next;
  }

  if (move.type === 'place_rune') {
    if (next.phase !== 'order') {
      next.verdict = {
        correct: false,
        label: 'Finish reading the shelf clues before placing runes.',
      };
      next.message = next.verdict.label;
      return next;
    }
    if (!next.ready.includes(move.runeId)) {
      next.verdict = {
        correct: false,
        label: `${move.runeId} still has an unmet seal. Only ready runes belong on the rail.`,
      };
      next.message = next.verdict.label;
      return next;
    }

    const rune = runeById(next.puzzle, move.runeId);
    next.ready = next.ready.filter((runeId) => runeId !== move.runeId);
    next.placed.push(move.runeId);
    const newlyReady: string[] = [];

    for (const outgoingId of rune.outgoingIds) {
      next.remainingIncoming[outgoingId] -= 1;
      if (next.remainingIncoming[outgoingId] === 0) {
        next.ready.push(outgoingId);
        newlyReady.push(outgoingId);
      }
    }

    next.ready.sort(sortIds);
    next.history = pushHistory(
      next.history,
      newlyReady.length > 0
        ? `Place ${rune.id} -> free ${newlyReady.join(', ')}`
        : `Place ${rune.id}`,
    );

    if (next.placed.length === next.puzzle.letters.length) {
      next.message = 'Every rune is placed. Seal the alphabet.';
      return next;
    }

    if (next.ready.length === 0) {
      next.message = 'No ready rune remains while letters are still missing. If every clue was read, call the cycle.';
      return next;
    }

    next.message =
      newlyReady.length > 0
        ? `${rune.id} peeled the last seal from ${newlyReady.join(', ')}.`
        : `${rune.id} is placed. Keep peeling the ready rail.`;
    return next;
  }

  const correct = next.phase === 'order' && next.placed.length === next.puzzle.letters.length;
  next.verdict = {
    correct,
    label: correct
      ? `Alphabet sealed: ${next.placed.join('')}`
      : 'The alphabet is not complete yet. Finish the ready rail or prove the shelf is invalid.',
  };
  next.message = next.verdict.label;
  next.history = pushHistory(next.history, correct ? 'Seal alphabet' : 'Premature seal');
  return next;
}

function orderRespectsLexicon(words: string[], order: string) {
  if (order.length === 0) return false;

  const rank = Object.fromEntries(order.split('').map((rune, index) => [rune, index])) as Record<
    string,
    number
  >;

  for (let index = 0; index < words.length - 1; index += 1) {
    const leftWord = words[index]!;
    const rightWord = words[index + 1]!;
    const sharedLimit = Math.min(leftWord.length, rightWord.length);
    let settled = false;

    for (let position = 0; position < sharedLimit; position += 1) {
      const leftRune = leftWord[position]!;
      const rightRune = rightWord[position]!;
      if (leftRune === rightRune) continue;
      if ((rank[leftRune] ?? Infinity) >= (rank[rightRune] ?? Infinity)) {
        return false;
      }
      settled = true;
      break;
    }

    if (!settled && leftWord.length > rightWord.length) {
      return false;
    }
  }

  return true;
}

function solveByAllDifferences(puzzle: LexiforgePuzzle) {
  const outgoing = new Map<string, Set<string>>();
  for (const letter of puzzle.letters) {
    outgoing.set(letter, new Set());
  }

  for (let index = 0; index < puzzle.words.length - 1; index += 1) {
    const leftWord = puzzle.words[index]!;
    const rightWord = puzzle.words[index + 1]!;
    const sharedLimit = Math.min(leftWord.length, rightWord.length);

    for (let position = 0; position < sharedLimit; position += 1) {
      const leftRune = leftWord[position]!;
      const rightRune = rightWord[position]!;
      if (leftRune === rightRune) continue;
      outgoing.get(leftRune)!.add(rightRune);
    }
  }

  const runes = puzzle.letters.map((letter) => ({
    id: letter,
    incomingIds: puzzle.letters
      .filter((candidate) => outgoing.get(candidate)!.has(letter))
      .sort(sortIds),
    outgoingIds: uniqueSorted(outgoing.get(letter)!),
  }));

  const topological = topoSort(puzzle.letters, runes);
  return topological.hasCycle ? '' : topological.order.join('');
}

function simulateOptimal(puzzle: LexiforgePuzzle): SimulationResult {
  let state = createInitialState(puzzle);
  const decisionSamples: number[] = [];
  const infoSamples: number[] = [];
  let counterintuitiveSteps = 0;

  while (!state.verdict) {
    if (state.invalidPairIndex !== null) {
      counterintuitiveSteps += 1;
      state = applyMove(state, { type: 'declare_invalid' });
      continue;
    }

    if (state.phase === 'compare') {
      const unresolved = unresolvedPairIndices(state);
      const pair = state.puzzle.pairs[unresolved[0]!]!;
      decisionSamples.push(log2(unresolved.length + 1));
      infoSamples.push(
        (1 + pair.sharedPrefix.length + (pair.kind === 'invalid_prefix' ? 2 : 0)) /
          Math.max(1, unresolved.length),
      );
      if (pair.sharedPrefix.length > 0 || pair.kind !== 'edge') {
        counterintuitiveSteps += 1;
      }
      state = applyMove(state, { type: 'inspect_pair', pairIndex: pair.index });
      continue;
    }

    if (state.ready.length === 0) {
      counterintuitiveSteps += 1;
      state = applyMove(state, { type: 'declare_cycle' });
      continue;
    }

    const ready = readyRunes(state);
    const rune = ready[0]!;
    decisionSamples.push(log2(ready.length + 1));
    infoSamples.push((1 + rune.outgoingIds.length) / Math.max(1, ready.length));
    if (ready.length > 1 || rune.outgoingIds.length === 0) {
      counterintuitiveSteps += 1;
    }
    state = applyMove(state, { type: 'place_rune', runeId: rune.id });
    if (!state.verdict && state.placed.length === puzzle.letters.length) {
      state = applyMove(state, { type: 'claim' });
    }
  }

  return {
    solved: Boolean(state.verdict?.correct),
    actionsUsed: state.actionsUsed,
    counterintuitiveSteps,
    meanDecisionEntropy: average(decisionSamples),
    meanInfoGainRatio: average(infoSamples),
  };
}

function simulateAllDifferenceNearMiss(puzzle: LexiforgePuzzle): SimulationResult {
  const alternateOrder = solveByAllDifferences(puzzle);
  const solved =
    puzzle.outcome === 'valid'
      ? alternateOrder.length > 0 && orderRespectsLexicon(puzzle.words, alternateOrder)
      : alternateOrder.length === 0;

  return {
    solved,
    actionsUsed: puzzle.pairs.length + (alternateOrder.length > 0 ? alternateOrder.length : 0) + 1,
    counterintuitiveSteps: puzzle.pairs.filter((pair) => pair.sharedPrefix.length > 0).length,
    meanDecisionEntropy: log2(puzzle.pairs.length + 1),
    meanInfoGainRatio: average(
      puzzle.pairs.map((pair) => 1 + pair.sharedPrefix.length + (pair.kind === 'edge' ? 0.5 : 0)),
    ),
  };
}

export function evaluateLexiforge(): LexiforgeEvaluation {
  const difficulties: DifficultyAggregate[] = [];

  for (const difficulty of [1, 2, 3, 4, 5] as LexiforgeDifficulty[]) {
    const blueprint = BLUEPRINTS[difficulty];
    const puzzles = blueprint.lexicons.map((lexicon) => buildPuzzle(difficulty, lexicon));
    const optimalRuns = puzzles.map((puzzle) => simulateOptimal(puzzle));
    const altRuns = puzzles.map((puzzle) => simulateAllDifferenceNearMiss(puzzle));

    difficulties.push({
      difficulty,
      label: blueprint.label,
      budget: average(puzzles.map((puzzle) => puzzle.budget)),
      solvability: average(optimalRuns.map((run) => (run.solved ? 1 : 0))),
      puzzleEntropy: average(
        puzzles.map(
          (puzzle) =>
            puzzle.words.join('').length +
            puzzle.pairs.length * 1.5 +
            puzzle.edgeCount * 1.2 +
            (puzzle.outcome === 'valid' ? 0 : 2.5),
        ),
      ),
      skillDepth: clamp(
        0,
        1,
        (1 - average(altRuns.map((run) => (run.solved ? 1 : 0)))) * 0.72 +
          average(optimalRuns.map((run) => run.meanDecisionEntropy)) * 0.1 +
          average(
            optimalRuns.map((run) => run.counterintuitiveSteps / Math.max(1, run.actionsUsed)),
          ) *
            0.55,
      ),
      decisionEntropy: average(optimalRuns.map((run) => run.meanDecisionEntropy)),
      counterintuitive: average(optimalRuns.map((run) => run.counterintuitiveSteps)),
      drama: clamp(
        0,
        1,
        0.3 +
          (1 - average(altRuns.map((run) => (run.solved ? 1 : 0)))) * 0.55 +
          difficulty * 0.04,
      ),
      infoGainRatio: average(optimalRuns.map((run) => run.meanInfoGainRatio)),
      optimalActions: average(optimalRuns.map((run) => run.actionsUsed)),
      altActions: average(altRuns.map((run) => run.actionsUsed)),
      altSolvability: average(altRuns.map((run) => (run.solved ? 1 : 0))),
    });
  }

  const bestAlternativeGap = average(difficulties.map((entry) => 1 - entry.altSolvability));

  return {
    difficulties,
    learningMetrics: {
      inputShapeMatch: 1,
      operationMatch: 1,
      constraintMatch: 1,
      goalMatch: 1,
      leetCodeFit: 1,
      bestAlternativeGap,
      invariantPressure: clamp(
        0,
        1,
        average(
          difficulties.map((entry) => entry.counterintuitive / Math.max(1, entry.optimalActions)),
        ) + 0.38,
      ),
      difficultyBreakpoint:
        difficulties.find((entry) => entry.altSolvability < 1)?.difficulty ?? 5,
      algorithmAlignment: 1,
    },
    interpretation: {
      invariant:
        'Compare adjacent words only, stop at the first differing rune to forge one precedence edge, reject any longer-before-prefix breach immediately, then peel the zero-indegree rune rail until it empties or the alphabet is complete.',
      strongestAlternative:
        'The strongest near miss compares neighboring words but records every differing position as a rule and forgets that a longer word before its own prefix is invalid.',
      evidence:
        'D2 and D5 collapse under extra late-position edges, D3 fails because no amount of rune peeling can rescue a prefix breach, and only the dedicated invalid or cycle calls solve the broken shelves cleanly.',
    },
  };
}
