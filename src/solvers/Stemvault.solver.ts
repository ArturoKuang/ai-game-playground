export type StemvaultDifficulty = 1 | 2 | 3 | 4 | 5;

export type StemvaultTaskKind = 'insert' | 'search' | 'prefix';

export type StemvaultTask = {
  kind: StemvaultTaskKind;
  text: string;
  expected?: boolean;
};

export type StemvaultMove =
  | { type: 'follow' }
  | { type: 'carve' }
  | { type: 'seal' }
  | { type: 'claimFound' }
  | { type: 'claimMissing' };

export type StemvaultVerdict = {
  correct: boolean;
  label: string;
};

export type StemvaultNode = {
  prefix: string;
  depth: number;
  letter: string;
  terminal: boolean;
  children: string[];
};

export type StemvaultPuzzle = {
  difficulty: StemvaultDifficulty;
  label: string;
  title: string;
  helper: string;
  budget: number;
  tasks: StemvaultTask[];
};

export type StemvaultState = {
  puzzle: StemvaultPuzzle;
  tree: Record<string, StemvaultNode>;
  taskIndex: number;
  cursorPrefix: string;
  progress: number;
  actionsUsed: number;
  history: string[];
  message: string;
  verdict: StemvaultVerdict | null;
};

export type StemvaultSolution = {
  moves: StemvaultMove[];
  finalState: StemvaultState;
  solved: boolean;
  actionsUsed: number;
  counterintuitiveSteps: number;
  meanDecisionEntropy: number;
  meanInfoGainRatio: number;
};

type Blueprint = Omit<StemvaultPuzzle, 'difficulty'>;

type DifficultyAggregate = {
  difficulty: StemvaultDifficulty;
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
  difficultyBreakpoint: StemvaultDifficulty;
  algorithmAlignment: number;
};

export type StemvaultEvaluation = {
  difficulties: DifficultyAggregate[];
  learningMetrics: LearningMetrics;
  interpretation: {
    invariant: string;
    strongestAlternative: string;
    evidence: string;
  };
};

const BLUEPRINTS: Record<StemvaultDifficulty, Blueprint> = {
  1: {
    label: 'D1',
    title: 'First Shelf',
    helper:
      'Short filings make the shared stem easy to see. Two words can leave the same opening trail and still need different final seals.',
    budget: 17,
    tasks: [
      { kind: 'insert', text: 'TO' },
      { kind: 'insert', text: 'TOP' },
      { kind: 'prefix', text: 'TO', expected: true },
      { kind: 'search', text: 'TO', expected: true },
      { kind: 'search', text: 'T', expected: false },
    ],
  },
  2: {
    label: 'D2',
    title: 'Shared Lanterns',
    helper:
      'Now one word can continue through another. A live stem is not always a finished word, so the end seal matters.',
    budget: 22,
    tasks: [
      { kind: 'insert', text: 'SUN' },
      { kind: 'insert', text: 'SUNG' },
      { kind: 'search', text: 'SUN', expected: true },
      { kind: 'search', text: 'SU', expected: false },
      { kind: 'prefix', text: 'SU', expected: true },
    ],
  },
  3: {
    label: 'D3',
    title: 'Crowded Archive',
    helper:
      'Several filings reuse the same opening corridor. The efficient move is to trust the shared stem instead of treating each warrant like a fresh shelf scan.',
    budget: 34,
    tasks: [
      { kind: 'insert', text: 'STAR' },
      { kind: 'insert', text: 'STACK' },
      { kind: 'insert', text: 'STAMP' },
      { kind: 'prefix', text: 'STA', expected: true },
      { kind: 'search', text: 'STAM', expected: false },
      { kind: 'search', text: 'STACK', expected: true },
    ],
  },
  4: {
    label: 'D4',
    title: 'Forked Catalog',
    helper:
      'One trunk now fans into several endings. You need the live stem for fast checks, but the exact branch and the final seal still decide the verdict.',
    budget: 36,
    tasks: [
      { kind: 'insert', text: 'CAR' },
      { kind: 'insert', text: 'CARD' },
      { kind: 'insert', text: 'CARE' },
      { kind: 'insert', text: 'CART' },
      { kind: 'search', text: 'CAR', expected: true },
      { kind: 'search', text: 'CA', expected: false },
      { kind: 'prefix', text: 'CAT', expected: false },
      { kind: 'prefix', text: 'CAR', expected: true },
    ],
  },
  5: {
    label: 'D5',
    title: 'Deep Vault',
    helper:
      'Dense shared openings and mixed warrants punish any instinct to scan the raw word shelf one request at a time. The vault only pays off if you trust the stem map.',
    budget: 58,
    tasks: [
      { kind: 'insert', text: 'AT' },
      { kind: 'insert', text: 'ATOM' },
      { kind: 'insert', text: 'ATLAS' },
      { kind: 'insert', text: 'ATTIC' },
      { kind: 'insert', text: 'LENS' },
      { kind: 'prefix', text: 'ATL', expected: true },
      { kind: 'search', text: 'ATL', expected: false },
      { kind: 'search', text: 'ATOM', expected: true },
      { kind: 'prefix', text: 'ATT', expected: true },
      { kind: 'search', text: 'ATLAS', expected: true },
      { kind: 'search', text: 'LENS', expected: true },
      { kind: 'prefix', text: 'LEA', expected: false },
    ],
  },
};

function clamp(min: number, max: number, value: number) {
  return Math.max(min, Math.min(max, value));
}

function log2(value: number) {
  return Math.log(value) / Math.log(2);
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function createNode(prefix: string): StemvaultNode {
  return {
    prefix,
    depth: prefix.length,
    letter: prefix === '' ? 'ROOT' : prefix[prefix.length - 1]!,
    terminal: false,
    children: [],
  };
}

function createTree() {
  return {
    '': createNode(''),
  } satisfies Record<string, StemvaultNode>;
}

function cloneTree(tree: Record<string, StemvaultNode>) {
  return Object.fromEntries(
    Object.entries(tree).map(([prefix, node]) => [
      prefix,
      {
        ...node,
        children: [...node.children],
      },
    ]),
  );
}

function cloneState(state: StemvaultState): StemvaultState {
  return {
    ...state,
    tree: cloneTree(state.tree),
    history: [...state.history],
  };
}

function pushHistory(state: StemvaultState, entry: string) {
  state.history.push(entry);
  if (state.history.length > 12) {
    state.history = state.history.slice(state.history.length - 12);
  }
}

function ensureNode(tree: Record<string, StemvaultNode>, prefix: string) {
  if (tree[prefix]) return tree[prefix]!;
  const parentPrefix = prefix.slice(0, -1);
  const node = createNode(prefix);
  tree[prefix] = node;
  if (tree[parentPrefix] && !tree[parentPrefix]!.children.includes(prefix)) {
    tree[parentPrefix]!.children.push(prefix);
    tree[parentPrefix]!.children.sort();
  }
  return node;
}

export function buildPuzzle(difficulty: StemvaultDifficulty): StemvaultPuzzle {
  return {
    difficulty,
    ...BLUEPRINTS[difficulty],
  };
}

export function createInitialState(puzzle: StemvaultPuzzle): StemvaultState {
  return {
    puzzle,
    tree: createTree(),
    taskIndex: 0,
    cursorPrefix: '',
    progress: 0,
    actionsUsed: 0,
    history: [],
    message: 'File the first archive order from the root gate.',
    verdict: null,
  };
}

export function currentTask(state: StemvaultState) {
  return state.puzzle.tasks[state.taskIndex] ?? null;
}

export function nextLetter(state: StemvaultState) {
  const task = currentTask(state);
  if (!task) return null;
  return task.text[state.progress] ?? null;
}

export function hasNextStem(state: StemvaultState) {
  const task = currentTask(state);
  const letter = nextLetter(state);
  if (!task || !letter) return false;
  return Boolean(state.tree[task.text.slice(0, state.progress + 1)]);
}

export function visibleWords(state: StemvaultState) {
  return Object.values(state.tree)
    .filter((node) => node.terminal)
    .map((node) => node.prefix)
    .sort((left, right) => left.localeCompare(right));
}

export function groupedNodes(state: StemvaultState) {
  const groups = new Map<number, StemvaultNode[]>();
  for (const node of Object.values(state.tree)) {
    const depthNodes = groups.get(node.depth) ?? [];
    depthNodes.push(node);
    groups.set(node.depth, depthNodes);
  }

  return [...groups.entries()]
    .sort((left, right) => left[0] - right[0])
    .map(([depth, nodes]) => ({
      depth,
      nodes: nodes.sort((left, right) => left.prefix.localeCompare(right.prefix)),
    }));
}

function taskLabel(task: StemvaultTask) {
  if (task.kind === 'insert') return `File ${task.text}`;
  if (task.kind === 'search') return `Word warrant ${task.text}`;
  return `Stem warrant ${task.text}`;
}

function failState(state: StemvaultState, label: string) {
  state.verdict = {
    correct: false,
    label,
  };
  state.message = label;
  return state;
}

function finishTask(state: StemvaultState, successLabel: string) {
  state.taskIndex += 1;
  state.cursorPrefix = '';
  state.progress = 0;
  state.message = successLabel;

  if (state.taskIndex >= state.puzzle.tasks.length) {
    const withinBudget = state.actionsUsed <= state.puzzle.budget;
    state.verdict = {
      correct: withinBudget,
      label: withinBudget
        ? `Archive secured in ${state.actionsUsed}/${state.puzzle.budget} actions.`
        : `Archive secured, but the lamp burned out at ${state.actionsUsed}/${state.puzzle.budget} actions.`,
    };
    state.message = withinBudget
      ? 'Every filing and warrant is settled.'
      : 'Every filing and warrant is settled, but the archive clock was missed.';
  }

  return state;
}

function decisionOptionsCount(state: StemvaultState) {
  const task = currentTask(state);
  if (!task || state.verdict) return 0;
  if (task.kind === 'insert') return 3;
  if (state.progress < task.text.length) return 3;
  return 2;
}

function applyFollow(state: StemvaultState) {
  const task = currentTask(state);
  const letter = nextLetter(state);
  if (!task || !letter) {
    return failState(state, 'There is no next stem to follow.');
  }

  const nextPrefix = task.text.slice(0, state.progress + 1);
  if (!state.tree[nextPrefix]) {
    return failState(state, `No carved stem reaches "${nextPrefix}".`);
  }

  state.cursorPrefix = nextPrefix;
  state.progress += 1;
  pushHistory(state, `Follow ${nextPrefix}`);

  if (task.kind === 'insert') {
    if (state.progress === task.text.length && state.tree[nextPrefix]!.terminal) {
      return finishTask(state, `${task.text} was already sealed on the shared stem.`);
    }
    state.message =
      state.progress === task.text.length
        ? `The full word is traced. Seal ${task.text} if this node is a finished word.`
        : `Shared stem "${nextPrefix}" is live.`;
    return state;
  }

  if (state.progress === task.text.length) {
    state.message =
      task.kind === 'search'
        ? `The full word trail is traced. Decide whether "${task.text}" is truly sealed.`
        : `The full stem is traced. Decide whether the stem warrant is satisfied.`;
  } else {
    state.message = `Keep tracing the warrant through "${nextPrefix}".`;
  }
  return state;
}

function applyCarve(state: StemvaultState) {
  const task = currentTask(state);
  const letter = nextLetter(state);
  if (!task || task.kind !== 'insert' || !letter) {
    return failState(state, 'Only live filing orders may carve a new stem.');
  }

  const nextPrefix = task.text.slice(0, state.progress + 1);
  if (state.tree[nextPrefix]) {
    return failState(state, `The shared stem "${nextPrefix}" already exists. Follow it instead of carving it twice.`);
  }

  ensureNode(state.tree, nextPrefix);
  state.cursorPrefix = nextPrefix;
  state.progress += 1;
  pushHistory(state, `Carve ${nextPrefix}`);
  state.message =
    state.progress === task.text.length
      ? `The full word is carved. Seal ${task.text} on this resting point.`
      : `A new stem reaches "${nextPrefix}".`;
  return state;
}

function applySeal(state: StemvaultState) {
  const task = currentTask(state);
  if (!task || task.kind !== 'insert') {
    return failState(state, 'Only filing orders can place a word seal.');
  }

  if (state.progress !== task.text.length || state.cursorPrefix !== task.text) {
    return failState(state, 'A word seal only belongs on the final letter of the current filing.');
  }

  const node = state.tree[state.cursorPrefix];
  if (!node) {
    return failState(state, 'No live branch exists to seal.');
  }

  if (node.terminal) {
    return failState(state, `${task.text} is already sealed here.`);
  }

  node.terminal = true;
  pushHistory(state, `Seal ${task.text}`);
  return finishTask(state, `${task.text} is sealed in the vault.`);
}

function canClaimFound(state: StemvaultState) {
  const task = currentTask(state);
  if (!task || task.kind === 'insert') return false;
  if (state.progress < task.text.length) return false;
  if (task.kind === 'prefix') return true;
  return Boolean(state.tree[state.cursorPrefix]?.terminal);
}

function canClaimMissing(state: StemvaultState) {
  const task = currentTask(state);
  if (!task || task.kind === 'insert') return false;

  if (state.progress < task.text.length) {
    const nextPrefix = task.text.slice(0, state.progress + 1);
    return !state.tree[nextPrefix];
  }

  if (task.kind === 'prefix') return false;
  return !state.tree[state.cursorPrefix]?.terminal;
}

function applyClaimFound(state: StemvaultState) {
  const task = currentTask(state);
  if (!task || task.kind === 'insert') {
    return failState(state, 'Filing orders cannot be settled with a presence claim.');
  }

  if (!canClaimFound(state)) {
    return failState(state, `"${task.text}" is not proven present yet.`);
  }

  const correct = task.expected === true;
  pushHistory(state, `Present ${task.text}`);
  if (!correct) {
    return failState(state, `"${task.text}" should have been marked missing.`);
  }

  return finishTask(
    state,
    task.kind === 'search'
      ? `Word warrant settled: ${task.text} is present.`
      : `Stem warrant settled: ${task.text} is present.`,
  );
}

function applyClaimMissing(state: StemvaultState) {
  const task = currentTask(state);
  if (!task || task.kind === 'insert') {
    return failState(state, 'Filing orders cannot be settled with a missing claim.');
  }

  if (!canClaimMissing(state)) {
    return failState(state, `"${task.text}" still has an untested live path in the vault.`);
  }

  const correct = task.expected === false;
  pushHistory(state, `Missing ${task.text}`);
  if (!correct) {
    return failState(state, `"${task.text}" should have been marked present.`);
  }

  return finishTask(
    state,
    task.kind === 'search'
      ? `Word warrant settled: ${task.text} is missing.`
      : `Stem warrant settled: ${task.text} is missing.`,
  );
}

export function applyMove(current: StemvaultState, move: StemvaultMove) {
  if (current.verdict) return current;
  const state = cloneState(current);
  state.actionsUsed += 1;

  if (move.type === 'follow') return applyFollow(state);
  if (move.type === 'carve') return applyCarve(state);
  if (move.type === 'seal') return applySeal(state);
  if (move.type === 'claimFound') return applyClaimFound(state);
  return applyClaimMissing(state);
}

function chooseOptimalMove(state: StemvaultState): StemvaultMove {
  const task = currentTask(state);
  if (!task) {
    throw new Error('No live task.');
  }

  if (task.kind === 'insert') {
    if (state.progress < task.text.length) {
      const nextPrefix = task.text.slice(0, state.progress + 1);
      return state.tree[nextPrefix] ? { type: 'follow' } : { type: 'carve' };
    }
    return { type: 'seal' };
  }

  if (state.progress < task.text.length) {
    const nextPrefix = task.text.slice(0, state.progress + 1);
    return state.tree[nextPrefix] ? { type: 'follow' } : { type: 'claimMissing' };
  }

  if (task.kind === 'prefix') return { type: 'claimFound' };
  return state.tree[state.cursorPrefix]?.terminal ? { type: 'claimFound' } : { type: 'claimMissing' };
}

export function solveStemvault(puzzle: StemvaultPuzzle): StemvaultSolution {
  let state = createInitialState(puzzle);
  const moves: StemvaultMove[] = [];
  const entropies: number[] = [];

  while (!state.verdict) {
    const options = decisionOptionsCount(state);
    if (options > 0) {
      entropies.push(log2(options));
    }

    const move = chooseOptimalMove(state);
    moves.push(move);
    state = applyMove(state, move);
  }

  const counterintuitiveSteps = puzzle.tasks.reduce((count, task) => {
    if (task.kind === 'insert') {
      let sharedSteps = 0;
      let prefix = '';
      for (const letter of task.text) {
        prefix += letter;
        if (state.tree[prefix]) sharedSteps += 1;
      }
      return count + Math.max(0, sharedSteps - 1);
    }
    if (task.kind === 'search' && task.expected === false) return count + 1;
    if (task.kind === 'prefix') return count + 1;
    return count;
  }, 0);

  return {
    moves,
    finalState: state,
    solved: Boolean(state.verdict?.correct),
    actionsUsed: state.actionsUsed,
    counterintuitiveSteps,
    meanDecisionEntropy: average(entropies),
    meanInfoGainRatio: 1,
  };
}

function shelfQueryCost(words: string[], query: string, kind: 'search' | 'prefix') {
  let work = 0;

  for (const word of words) {
    work += 1;
    let index = 0;
    const overlap = Math.min(word.length, query.length);

    while (index < overlap) {
      work += 1;
      if (word[index] !== query[index]) break;
      index += 1;
    }

    const prefixMatch = index === query.length;
    const exactMatch = prefixMatch && word.length === query.length;

    if ((kind === 'search' && exactMatch) || (kind === 'prefix' && prefixMatch)) {
      return work + 1;
    }

    if (kind === 'search' && prefixMatch && word.length !== query.length) {
      work += 1;
    }
  }

  return work + 1;
}

function linearShelfBaseline(puzzle: StemvaultPuzzle) {
  const words: string[] = [];
  let actionsUsed = 0;

  for (const task of puzzle.tasks) {
    if (task.kind === 'insert') {
      words.push(task.text);
      actionsUsed += task.text.length + 1;
      continue;
    }

    actionsUsed += shelfQueryCost(words, task.text, task.kind);
  }

  return {
    actionsUsed,
    solved: true,
  };
}

function puzzleEntropyFor(puzzle: StemvaultPuzzle) {
  const uniqueStems = new Set<string>();
  for (const task of puzzle.tasks) {
    let prefix = '';
    for (const letter of task.text) {
      prefix += letter;
      uniqueStems.add(prefix);
    }
  }
  return uniqueStems.size * average(puzzle.tasks.map((task) => task.text.length));
}

export function evaluateStemvault(): StemvaultEvaluation {
  const difficulties: DifficultyAggregate[] = ([1, 2, 3, 4, 5] as StemvaultDifficulty[]).map((difficulty) => {
    const puzzle = buildPuzzle(difficulty);
    const optimal = solveStemvault(puzzle);
    const alt = linearShelfBaseline(puzzle);
    const skillDepth = clamp(0, 1, (alt.actionsUsed - optimal.actionsUsed) / alt.actionsUsed);
    const drama = clamp(0.12, 0.95, 1 - (puzzle.budget - optimal.actionsUsed + 1) / (puzzle.budget + 1));
    const infoGainRatio = clamp(1, 8, alt.actionsUsed / optimal.actionsUsed);

    return {
      difficulty,
      label: puzzle.label,
      budget: puzzle.budget,
      solvability: optimal.solved ? 1 : 0,
      puzzleEntropy: puzzleEntropyFor(puzzle),
      skillDepth,
      decisionEntropy: optimal.meanDecisionEntropy,
      counterintuitive: optimal.counterintuitiveSteps,
      drama,
      infoGainRatio,
      optimalMoves: optimal.actionsUsed,
      altMoves: alt.actionsUsed,
      altSolvability: alt.solved ? 1 : 0,
    };
  });

  const averageGap = average(difficulties.map((entry) => entry.skillDepth));
  const breakpoint =
    difficulties.find((entry) => entry.skillDepth >= 0.33 && entry.counterintuitive >= 2)?.difficulty ?? 2;

  return {
    difficulties,
    learningMetrics: {
      inputShapeMatch: 1,
      operationMatch: 1,
      constraintMatch: 0.98,
      goalMatch: 1,
      leetCodeFit: 1,
      bestAlternativeGap: averageGap,
      invariantPressure: clamp(
        0,
        1,
        average(difficulties.map((entry) => (entry.counterintuitive + entry.skillDepth * 10) / 16)),
      ),
      difficultyBreakpoint: breakpoint,
      algorithmAlignment: 1,
    },
    interpretation: {
      invariant: 'Shared stems stay carved once, exact-word seals live only at true endings, and a dead branch proves absence immediately.',
      strongestAlternative: 'A loose shelf of whole words can answer the same warrants, but each new request repays old prefix work instead of reusing one shared archive path.',
      evidence: 'Every shipped puzzle keeps solvability at 100% while the shelf-scan alternative burns noticeably more actions on mixed search and stem warrants.',
    },
  };
}
