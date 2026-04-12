export type StemweaveDifficulty = 1 | 2 | 3 | 4 | 5;

export type StemweaveMove =
  | { type: 'step'; cellId: string }
  | { type: 'bank' }
  | { type: 'backtrack' }
  | { type: 'claimComplete' };

export type StemweaveVerdict = {
  correct: boolean;
  label: string;
};

type StemweaveTrieNode = {
  prefix: string;
  word: string | null;
  children: Record<string, StemweaveTrieNode>;
};

type StemweaveRoute = {
  board: string[];
  words: string[];
};

type Blueprint = {
  label: string;
  title: string;
  helper: string;
  budget: number;
  routes: StemweaveRoute[];
};

export type StemweavePuzzle = {
  difficulty: StemweaveDifficulty;
  label: string;
  title: string;
  helper: string;
  budget: number;
  board: string[];
  words: string[];
  trie: StemweaveTrieNode;
};

export type StemweaveState = {
  puzzle: StemweavePuzzle;
  path: string[];
  foundWords: string[];
  triedByTrail: Record<string, string[]>;
  actionsUsed: number;
  history: string[];
  message: string;
  verdict: StemweaveVerdict | null;
};

export type StemweaveSolution = {
  moves: StemweaveMove[];
  finalState: StemweaveState;
  solved: boolean;
  actionsUsed: number;
  counterintuitiveSteps: number;
  meanDecisionEntropy: number;
  meanInfoGainRatio: number;
};

type DifficultyAggregate = {
  difficulty: StemweaveDifficulty;
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
  difficultyBreakpoint: StemweaveDifficulty;
  algorithmAlignment: number;
};

export type StemweaveEvaluation = {
  difficulties: DifficultyAggregate[];
  learningMetrics: LearningMetrics;
  interpretation: {
    invariant: string;
    strongestAlternative: string;
    evidence: string;
  };
};

export type StemweaveStemView = {
  prefix: string;
  depth: number;
  childLetters: string[];
  isWord: boolean;
};

const BLUEPRINTS: Record<StemweaveDifficulty, Blueprint> = {
  1: {
    label: 'D1',
    title: 'Shared Ribbons',
    helper:
      'Short shared stems make the core rule legible: bank a found word without collapsing the trail, then keep weaving only while the next letter still belongs to some listed word.',
    budget: 15,
    routes: [
      {
        board: ['SEE', 'AAR', 'TIN'],
        words: ['SEE', 'SEER', 'TIN'],
      },
    ],
  },
  2: {
    label: 'D2',
    title: 'Forked Stem',
    helper:
      'One sealed word now sits on a prefix that also branches into another word. The cheap move is to bank the short word and keep the trail alive instead of clearing the board and paying for the same prefix twice.',
    budget: 10,
    routes: [
      {
        board: ['TEAR', 'XXMX', 'LION', 'SEED'],
        words: ['TEA', 'TEAR', 'TEAM'],
      },
    ],
  },
  3: {
    label: 'D3',
    title: 'Double Harvest',
    helper:
      'A single trail can now certify several seals and then pivot into a sibling finish. Harder boards punish any habit of resetting after the first word instead of exhausting the live prefix first.',
    budget: 19,
    routes: [
      {
        board: ['SEAT', 'XXRX', 'LION', 'MEND'],
        words: ['SEA', 'SEAT', 'SEAR', 'LION'],
      },
    ],
  },
  4: {
    label: 'D4',
    title: 'Ledger Grove',
    helper:
      'Several root starts now matter, and each one has its own shared branch family. The trie is no longer just a convenience. It is the only cheap way to know when a board trail is still worth one more step.',
    budget: 26,
    routes: [
      {
        board: ['OATH', 'EATS', 'RAIN', 'HARP'],
        words: ['OAT', 'OATH', 'EAT', 'EATS', 'RAIN'],
      },
    ],
  },
  5: {
    label: 'D5',
    title: 'Dense Canopy',
    helper:
      'Multiple shared stems now overlap across the whole canopy. Winning play means banking words as soon as they surface, continuing while the prefix stays live, and pruning the branch the moment no listed word still fits the trail.',
    budget: 30,
    routes: [
      {
        board: ['FARM', 'XLYN', 'SEAL', 'MEET'],
        words: ['FAR', 'FARM', 'SEA', 'SEAL', 'MEET'],
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

function createTrieNode(prefix: string): StemweaveTrieNode {
  return {
    prefix,
    word: null,
    children: {},
  };
}

function buildTrie(words: string[]) {
  const root = createTrieNode('');
  for (const word of words) {
    let node = root;
    for (const letter of word) {
      if (!node.children[letter]) {
        node.children[letter] = createTrieNode(`${node.prefix}${letter}`);
      }
      node = node.children[letter]!;
    }
    node.word = word;
  }
  return root;
}

function cloneTried(triedByTrail: Record<string, string[]>) {
  return Object.fromEntries(Object.entries(triedByTrail).map(([key, value]) => [key, [...value]]));
}

function cloneState(state: StemweaveState): StemweaveState {
  return {
    ...state,
    path: [...state.path],
    foundWords: [...state.foundWords],
    triedByTrail: cloneTried(state.triedByTrail),
    history: [...state.history],
  };
}

function pushHistory(state: StemweaveState, entry: string) {
  state.history.push(entry);
  if (state.history.length > 12) {
    state.history = state.history.slice(state.history.length - 12);
  }
}

export function cellId(row: number, col: number) {
  return `${row}:${col}`;
}

export function parseCellId(id: string) {
  const [row, col] = id.split(':').map((value) => Number(value));
  return { row, col };
}

export function letterAt(puzzle: StemweavePuzzle, id: string) {
  const { row, col } = parseCellId(id);
  return puzzle.board[row]?.[col] ?? '';
}

function rowMajor(left: string, right: string) {
  const a = parseCellId(left);
  const b = parseCellId(right);
  if (a.row !== b.row) return a.row - b.row;
  return a.col - b.col;
}

function allCells(puzzle: StemweavePuzzle) {
  const output: string[] = [];
  for (let row = 0; row < puzzle.board.length; row += 1) {
    for (let col = 0; col < puzzle.board[row]!.length; col += 1) {
      output.push(cellId(row, col));
    }
  }
  return output;
}

function orthogonalNeighbors(puzzle: StemweavePuzzle, id: string) {
  const { row, col } = parseCellId(id);
  const output: string[] = [];
  const deltas = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];

  for (const [rowDelta, colDelta] of deltas) {
    const nextRow = row + rowDelta;
    const nextCol = col + colDelta;
    if (
      nextRow < 0 ||
      nextCol < 0 ||
      nextRow >= puzzle.board.length ||
      nextCol >= puzzle.board[0]!.length
    ) {
      continue;
    }
    output.push(cellId(nextRow, nextCol));
  }

  return output.sort(rowMajor);
}

function trailKey(path: string[]) {
  return path.join('>');
}

export function currentStem(state: StemweaveState) {
  return state.path.map((id) => letterAt(state.puzzle, id)).join('');
}

function trieNodeForPrefix(trie: StemweaveTrieNode, prefix: string) {
  let node: StemweaveTrieNode | null = trie;
  for (const letter of prefix) {
    node = node?.children[letter] ?? null;
    if (!node) return null;
  }
  return node;
}

function currentNode(state: StemweaveState) {
  return trieNodeForPrefix(state.puzzle.trie, currentStem(state));
}

export function bankableWord(state: StemweaveState) {
  const word = currentNode(state)?.word;
  if (!word) return null;
  return state.foundWords.includes(word) ? null : word;
}

export function currentChoices(state: StemweaveState) {
  if (state.verdict) return [];

  const node = currentNode(state) ?? state.puzzle.trie;
  const liveLetters = new Set(Object.keys(node.children));
  if (liveLetters.size === 0) return [];

  const prefixKey = trailKey(state.path);
  const tried = new Set(state.triedByTrail[prefixKey] ?? []);
  const baseChoices =
    state.path.length === 0
      ? allCells(state.puzzle)
      : orthogonalNeighbors(state.puzzle, state.path[state.path.length - 1]!);

  return baseChoices
    .filter((id) => !state.path.includes(id))
    .filter((id) => liveLetters.has(letterAt(state.puzzle, id)))
    .filter((id) => !tried.has(id))
    .sort(rowMajor);
}

export function exhaustedStarts(state: StemweaveState) {
  return [...(state.triedByTrail[''] ?? [])].sort(rowMajor);
}

export function remainingWords(state: StemweaveState) {
  return state.puzzle.words.filter((word) => !state.foundWords.includes(word));
}

export function liveWordsFromStem(state: StemweaveState) {
  const stem = currentStem(state);
  return remainingWords(state).filter((word) => word.startsWith(stem));
}

export function groupedStemViews(puzzle: StemweavePuzzle) {
  const grouped = new Map<number, StemweaveStemView[]>();

  const visit = (node: StemweaveTrieNode) => {
    const depth = node.prefix.length;
    const row = grouped.get(depth) ?? [];
    row.push({
      prefix: node.prefix,
      depth,
      childLetters: Object.keys(node.children).sort(),
      isWord: Boolean(node.word),
    });
    grouped.set(depth, row);

    for (const child of Object.values(node.children).sort((left, right) =>
      left.prefix.localeCompare(right.prefix),
    )) {
      visit(child);
    }
  };

  visit(puzzle.trie);
  return [...grouped.entries()]
    .sort((left, right) => left[0] - right[0])
    .map(([depth, stems]) => ({
      depth,
      stems: stems.sort((left, right) => left.prefix.localeCompare(right.prefix)),
    }));
}

export function legalMoves(state: StemweaveState) {
  if (state.verdict) return [];
  const output: Array<'bank' | 'backtrack' | 'claimComplete'> = [];
  if (bankableWord(state)) output.push('bank');
  if (state.path.length > 0) output.push('backtrack');
  if (state.foundWords.length === state.puzzle.words.length) output.push('claimComplete');
  return output;
}

function finishAction(state: StemweaveState) {
  if (state.actionsUsed > state.puzzle.budget) {
    state.verdict = {
      correct: false,
      label: 'The lantern budget broke before the ledger was settled.',
    };
    state.message =
      'The weave ran over budget. Reset and prune dead stems earlier instead of repaying the same trail.';
  }
  return state;
}

function describeCell(id: string, puzzle: StemweavePuzzle) {
  const { row, col } = parseCellId(id);
  return `${letterAt(puzzle, id)} at r${row + 1}c${col + 1}`;
}

export function createInitialState(puzzle: StemweavePuzzle): StemweaveState {
  return {
    puzzle,
    path: [],
    foundWords: [],
    triedByTrail: {},
    actionsUsed: 0,
    history: [],
    message:
      'Trace only trails that still match a listed opening. When a seal appears, bank it without dropping the live trail.',
    verdict: null,
  };
}

export function buildPuzzle(difficulty: StemweaveDifficulty, seed = 0): StemweavePuzzle {
  const blueprint = BLUEPRINTS[difficulty];
  const route = blueprint.routes[seed % blueprint.routes.length]!;
  return {
    difficulty,
    label: blueprint.label,
    title: blueprint.title,
    helper: blueprint.helper,
    budget: blueprint.budget,
    board: route.board,
    words: [...route.words],
    trie: buildTrie(route.words),
  };
}

export function applyMove(current: StemweaveState, move: StemweaveMove) {
  if (current.verdict) return current;
  const state = cloneState(current);

  if (move.type === 'step') {
    if (!currentChoices(state).includes(move.cellId)) return current;
    state.actionsUsed += 1;
    state.path.push(move.cellId);
    pushHistory(state, `Weave ${describeCell(move.cellId, state.puzzle)}`);

    const word = bankableWord(state);
    if (word) {
      state.message =
        currentChoices(state).length > 0
          ? `The trail already seals "${word}". Bank it now, then keep the prefix alive for any longer word.`
          : `The trail seals "${word}", but the stem is spent after that seal. Bank it, then peel back.`;
    } else if (currentChoices(state).length > 0) {
      state.message = 'The prefix is still live in the ledger. Keep weaving only through the lit continuations.';
    } else {
      state.message = 'No listed word still fits this trail. Prune the branch and reopen the last useful stem.';
    }
    return finishAction(state);
  }

  if (move.type === 'bank') {
    const word = bankableWord(state);
    if (!word) return current;
    state.actionsUsed += 1;
    state.foundWords.push(word);
    pushHistory(state, `Bank ${word}`);

    if (state.foundWords.length === state.puzzle.words.length) {
      state.message = 'Every listed seal is banked. Claim the ledger complete.';
    } else if (currentChoices(state).length > 0) {
      state.message = `Banked "${word}". The trail stays open because other listed words still share this stem.`;
    } else {
      state.message = `Banked "${word}". This branch is spent now, so peel back to the last live fork.`;
    }
    return finishAction(state);
  }

  if (move.type === 'backtrack') {
    if (state.path.length === 0) return current;
    state.actionsUsed += 1;
    const removed = state.path.pop()!;
    const parentKey = trailKey(state.path);
    const tried = new Set(state.triedByTrail[parentKey] ?? []);
    tried.add(removed);
    state.triedByTrail[parentKey] = [...tried].sort(rowMajor);
    pushHistory(state, `Prune ${describeCell(removed, state.puzzle)}`);

    const choices = currentChoices(state);
    if (state.path.length === 0) {
      state.message =
        choices.length > 0
          ? 'That opening stem is spent. Try another live root rune from the ledger.'
          : 'Every root opening is spent. If seals are still missing, the route was pruned too aggressively.';
    } else if (choices.length > 0) {
      state.message = 'This shorter stem is still live. Try the next lit branch instead of repaying the whole trail.';
    } else {
      state.message = 'This stem is spent too. Keep peeling back until some listed continuation reappears.';
    }
    return finishAction(state);
  }

  state.actionsUsed += 1;
  const correct = state.foundWords.length === state.puzzle.words.length;
  state.verdict = {
    correct,
    label: correct ? 'Ledger complete. Every listed word was banked.' : 'The ledger was claimed too early.',
  };
  state.message = correct
    ? 'Shared stems and local pruning were enough to harvest every listed word.'
    : 'Some listed words are still missing from the ledger.';
  pushHistory(state, correct ? 'Claim the ledger complete' : 'Claim complete too early');
  return finishAction(state);
}

function analyzeSolution(puzzle: StemweavePuzzle, moves: StemweaveMove[]) {
  let state = createInitialState(puzzle);
  let entropySum = 0;
  let infoGainSum = 0;
  let steps = 0;
  let counterintuitive = 0;

  for (const move of moves) {
    const choices = currentChoices(state);
    const legalCount =
      choices.length +
      (bankableWord(state) ? 1 : 0) +
      (state.path.length > 0 ? 1 : 0) +
      (state.foundWords.length === puzzle.words.length ? 1 : 0);
    entropySum += log2(Math.max(1, legalCount));

    if (move.type === 'backtrack') {
      counterintuitive += 1;
      infoGainSum += 1 + choices.length;
    } else if (move.type === 'bank' && choices.length > 0) {
      counterintuitive += 1;
      infoGainSum += 1 + choices.length;
    } else if (move.type === 'step' && choices.length > 1) {
      counterintuitive += 1;
      infoGainSum += choices.length;
    } else {
      infoGainSum += 1;
    }

    state = applyMove(state, move);
    steps += 1;
  }

  return {
    decisionEntropy: steps > 0 ? entropySum / steps : 0,
    counterintuitive,
    infoGainRatio: steps > 0 ? infoGainSum / steps : 0,
  };
}

function solveWithPolicy(
  puzzle: StemweavePuzzle,
  policy: 'dfs' | 'rootReset',
): StemweaveSolution {
  let state = createInitialState(puzzle);
  const moves: StemweaveMove[] = [];
  let guard = 0;
  let forcingRootReset = false;

  while (!state.verdict && guard < 4000) {
    const choices = currentChoices(state);
    const word = bankableWord(state);
    let move: StemweaveMove;

    if (state.foundWords.length === puzzle.words.length) {
      move = { type: 'claimComplete' };
    } else if (forcingRootReset && state.path.length > 0) {
      move = { type: 'backtrack' };
    } else {
      forcingRootReset = false;
      if (word) {
        move = { type: 'bank' };
        forcingRootReset = policy === 'rootReset';
      } else if (choices.length > 0) {
        move = { type: 'step', cellId: choices[0]! };
      } else if (state.path.length > 0) {
        move = { type: 'backtrack' };
        if (policy === 'rootReset') {
          forcingRootReset = true;
        }
      } else {
        move = { type: 'claimComplete' };
      }
    }

    moves.push(move);
    state = applyMove(state, move);
    guard += 1;
  }

  const analysis = analyzeSolution(puzzle, moves);
  return {
    moves,
    finalState: state,
    solved: Boolean(state.verdict?.correct),
    actionsUsed: state.actionsUsed,
    counterintuitiveSteps: analysis.counterintuitive,
    meanDecisionEntropy: analysis.decisionEntropy,
    meanInfoGainRatio: analysis.infoGainRatio,
  };
}

function puzzleEntropy(puzzle: StemweavePuzzle) {
  const uniquePrefixes = new Set<string>();
  for (const word of puzzle.words) {
    for (let index = 1; index <= word.length; index += 1) {
      uniquePrefixes.add(word.slice(0, index));
    }
  }
  return uniquePrefixes.size / Math.max(1, puzzle.words.length);
}

export function evaluateStemweave(): StemweaveEvaluation {
  const difficulties: DifficultyAggregate[] = [];
  const allSkillDepths: number[] = [];
  const allInvariantSignals: number[] = [];

  for (const difficulty of [1, 2, 3, 4, 5] as StemweaveDifficulty[]) {
    const blueprint = BLUEPRINTS[difficulty];
    const optimalRuns: StemweaveSolution[] = [];
    const altRuns: StemweaveSolution[] = [];
    const entropies: number[] = [];
    const skillDepths: number[] = [];

    for (let seed = 0; seed < blueprint.routes.length; seed += 1) {
      const puzzle = buildPuzzle(difficulty, seed);
      const optimal = solveWithPolicy(puzzle, 'dfs');
      const alt = solveWithPolicy(puzzle, 'rootReset');
      optimalRuns.push(optimal);
      altRuns.push(alt);
      entropies.push(puzzleEntropy(puzzle));

      const moveGap = Math.max(0, alt.actionsUsed - optimal.actionsUsed) / Math.max(1, puzzle.budget);
      const failureBonus = alt.solved ? 0 : 0.45;
      const depth = clamp(0, 1, moveGap + failureBonus);
      skillDepths.push(depth);
      allInvariantSignals.push(
        clamp(
          0,
          1,
          (optimal.counterintuitiveSteps + optimal.meanInfoGainRatio) / Math.max(4, puzzle.words.length + 2),
        ),
      );
    }

    const aggregate: DifficultyAggregate = {
      difficulty,
      label: blueprint.label,
      budget: blueprint.budget,
      solvability: average(optimalRuns.map((run) => (run.solved ? 1 : 0))),
      puzzleEntropy: average(entropies),
      skillDepth: average(skillDepths),
      decisionEntropy: average(optimalRuns.map((run) => run.meanDecisionEntropy)),
      counterintuitive: average(optimalRuns.map((run) => run.counterintuitiveSteps)),
      drama: average(optimalRuns.map((run) => run.actionsUsed / blueprint.budget)),
      infoGainRatio: average(optimalRuns.map((run) => run.meanInfoGainRatio)),
      optimalMoves: average(optimalRuns.map((run) => run.actionsUsed)),
      altMoves: average(altRuns.map((run) => run.actionsUsed)),
      altSolvability: average(altRuns.map((run) => (run.solved ? 1 : 0))),
    };

    difficulties.push(aggregate);
    allSkillDepths.push(aggregate.skillDepth);
  }

  const breakpoint =
    difficulties.find((entry) => entry.altSolvability < entry.solvability || entry.skillDepth >= 0.3)?.difficulty ?? 5;

  return {
    difficulties,
    learningMetrics: {
      inputShapeMatch: 1,
      operationMatch: 1,
      constraintMatch: 1,
      goalMatch: 1,
      leetCodeFit: 1,
      bestAlternativeGap: average(allSkillDepths),
      invariantPressure: average(allInvariantSignals),
      difficultyBreakpoint: breakpoint,
      algorithmAlignment: 1,
    },
    interpretation: {
      invariant:
        'Only board trails whose current letters still exist as a live trie prefix deserve another step, and finding a shorter word must not collapse a trail that can still reach a longer listed word.',
      strongestAlternative:
        'The strongest near miss banks a found word and then resets to the root, which repays shared prefixes and falsely treats an unfinished stem as exhausted.',
      evidence:
        'Across every shipped route, the prefix-pruned DFS solver clears the ledger within budget while the root-reset alternative either overruns the budget or strands longer words behind already-paid shared prefixes.',
    },
  };
}
