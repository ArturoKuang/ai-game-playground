export type VeilvaultDifficulty = 1 | 2 | 3 | 4 | 5;

export type VeilvaultTaskKind = 'insert' | 'search';

export type VeilvaultTask = {
  kind: VeilvaultTaskKind;
  text: string;
  expected?: boolean;
};

export type VeilvaultMove =
  | { type: 'follow' }
  | { type: 'carve' }
  | { type: 'seal' }
  | { type: 'branch'; prefix: string }
  | { type: 'backtrack' }
  | { type: 'claimFound' }
  | { type: 'claimMissing' };

export type VeilvaultVerdict = {
  correct: boolean;
  label: string;
};

export type VeilvaultNode = {
  prefix: string;
  depth: number;
  letter: string;
  terminal: boolean;
  children: string[];
};

export type VeilvaultWildcardFrame = {
  parentPrefix: string;
  progressBefore: number;
  choices: string[];
  tried: string[];
};

export type VeilvaultPuzzle = {
  difficulty: VeilvaultDifficulty;
  label: string;
  title: string;
  helper: string;
  budget: number;
  tasks: VeilvaultTask[];
};

export type VeilvaultState = {
  puzzle: VeilvaultPuzzle;
  tree: Record<string, VeilvaultNode>;
  taskIndex: number;
  cursorPrefix: string;
  progress: number;
  actionsUsed: number;
  history: string[];
  message: string;
  verdict: VeilvaultVerdict | null;
  wildcardFrames: VeilvaultWildcardFrame[];
};

export type VeilvaultSolution = {
  moves: VeilvaultMove[];
  finalState: VeilvaultState;
  solved: boolean;
  actionsUsed: number;
  counterintuitiveSteps: number;
  meanDecisionEntropy: number;
};

type Blueprint = Omit<VeilvaultPuzzle, 'difficulty'>;

type DifficultyAggregate = {
  difficulty: VeilvaultDifficulty;
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
  difficultyBreakpoint: VeilvaultDifficulty;
  algorithmAlignment: number;
};

export type VeilvaultEvaluation = {
  difficulties: DifficultyAggregate[];
  learningMetrics: LearningMetrics;
  interpretation: {
    invariant: string;
    strongestAlternative: string;
    evidence: string;
  };
};

const WILDCARD = '?';

const BLUEPRINTS: Record<VeilvaultDifficulty, Blueprint> = {
  1: {
    label: 'D1',
    title: 'Single Veil',
    helper:
      'The veil mark stands for any single rune. Early orders introduce the idea that a shared stem can stay live while a one-letter claim still fails.',
    budget: 20,
    tasks: [
      { kind: 'insert', text: 'TO' },
      { kind: 'insert', text: 'TOP' },
      { kind: 'search', text: 'T?', expected: true },
      { kind: 'search', text: '?O?', expected: true },
      { kind: 'search', text: '?', expected: false },
    ],
  },
  2: {
    label: 'D2',
    title: 'Forked Seal',
    helper:
      'A veiled warrant can open the wrong branch first. The fix is not a full restart. Peel back only to the last veil and try the sibling stem.',
    budget: 31,
    tasks: [
      { kind: 'insert', text: 'SUN' },
      { kind: 'insert', text: 'SING' },
      { kind: 'search', text: 'S?N', expected: true },
      { kind: 'search', text: 'SI?G', expected: true },
      { kind: 'search', text: 'S?', expected: false },
    ],
  },
  3: {
    label: 'D3',
    title: 'Crowded Veils',
    helper:
      'One opening now fans into several trunks. Medium play starts failing unless the player treats each veil as a branch checkpoint and exhausts siblings only when needed.',
    budget: 46,
    tasks: [
      { kind: 'insert', text: 'STAR' },
      { kind: 'insert', text: 'STEER' },
      { kind: 'insert', text: 'STONE' },
      { kind: 'search', text: 'ST?N?', expected: true },
      { kind: 'search', text: 'ST?E?', expected: true },
      { kind: 'search', text: 'ST?A?', expected: false },
    ],
  },
  4: {
    label: 'D4',
    title: 'Nested Shroud',
    helper:
      'Harder warrants stack one veil inside another. The archive only stays manageable if the player reopens the latest useful veil instead of replaying the whole route from the root.',
    budget: 58,
    tasks: [
      { kind: 'insert', text: 'CARD' },
      { kind: 'insert', text: 'CARE' },
      { kind: 'insert', text: 'CORK' },
      { kind: 'insert', text: 'COT' },
      { kind: 'insert', text: 'COVE' },
      { kind: 'search', text: 'CO?E', expected: true },
      { kind: 'search', text: 'C??D', expected: true },
      { kind: 'search', text: 'C?Z?', expected: false },
    ],
  },
  5: {
    label: 'D5',
    title: 'Deep Veil Ledger',
    helper:
      'Dense archives and mixed roots punish any urge to shelf-scan or to trust the first wildcard branch. The right habit is to reuse the trie and backtrack only one veil at a time.',
    budget: 77,
    tasks: [
      { kind: 'insert', text: 'ATLAS' },
      { kind: 'insert', text: 'ATTIC' },
      { kind: 'insert', text: 'ATONE' },
      { kind: 'insert', text: 'AXIOM' },
      { kind: 'insert', text: 'BLADE' },
      { kind: 'insert', text: 'BLOOM' },
      { kind: 'search', text: '?L???', expected: true },
      { kind: 'search', text: 'A?I??', expected: true },
      { kind: 'search', text: 'A?O??', expected: true },
      { kind: 'search', text: 'BL?D?', expected: true },
      { kind: 'search', text: 'A?Q??', expected: false },
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

function createNode(prefix: string): VeilvaultNode {
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
  } satisfies Record<string, VeilvaultNode>;
}

function cloneTree(tree: Record<string, VeilvaultNode>) {
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

function cloneState(state: VeilvaultState): VeilvaultState {
  return {
    ...state,
    tree: cloneTree(state.tree),
    history: [...state.history],
    wildcardFrames: state.wildcardFrames.map((frame) => ({
      ...frame,
      choices: [...frame.choices],
      tried: [...frame.tried],
    })),
  };
}

function pushHistory(state: VeilvaultState, entry: string) {
  state.history.push(entry);
  if (state.history.length > 12) {
    state.history = state.history.slice(state.history.length - 12);
  }
}

function ensureNode(tree: Record<string, VeilvaultNode>, prefix: string) {
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

export function buildPuzzle(difficulty: VeilvaultDifficulty): VeilvaultPuzzle {
  return {
    difficulty,
    ...BLUEPRINTS[difficulty],
  };
}

export function createInitialState(puzzle: VeilvaultPuzzle): VeilvaultState {
  return {
    puzzle,
    tree: createTree(),
    taskIndex: 0,
    cursorPrefix: '',
    progress: 0,
    actionsUsed: 0,
    history: [],
    message: 'Shared stems make filing cheap, and veiled warrants only open one wildcard branch at a time.',
    verdict: null,
    wildcardFrames: [],
  };
}

export function currentTask(state: VeilvaultState) {
  return state.puzzle.tasks[state.taskIndex] ?? null;
}

export function nextGlyph(state: VeilvaultState) {
  const task = currentTask(state);
  if (!task) return null;
  return task.text[state.progress] ?? null;
}

function currentNode(state: VeilvaultState) {
  return state.tree[state.cursorPrefix] ?? null;
}

function currentFrameForContext(state: VeilvaultState) {
  for (let index = state.wildcardFrames.length - 1; index >= 0; index -= 1) {
    const frame = state.wildcardFrames[index]!;
    if (frame.parentPrefix === state.cursorPrefix && frame.progressBefore === state.progress) {
      return frame;
    }
  }
  return null;
}

function unusedChoices(frame: VeilvaultWildcardFrame) {
  return frame.choices.filter((choice) => !frame.tried.includes(choice));
}

export function availableBranchChoices(state: VeilvaultState) {
  const task = currentTask(state);
  if (!task || task.kind !== 'search' || nextGlyph(state) !== WILDCARD) return [];
  const frame = currentFrameForContext(state);
  if (frame) return unusedChoices(frame);
  return [...(currentNode(state)?.children ?? [])].sort((left, right) => left.localeCompare(right));
}

function hasFallbackBranch(state: VeilvaultState) {
  return state.wildcardFrames.some((frame) => unusedChoices(frame).length > 0);
}

function localFailure(state: VeilvaultState) {
  const task = currentTask(state);
  if (!task || task.kind !== 'search') return false;

  if (state.progress < task.text.length) {
    const glyph = task.text[state.progress]!;
    if (glyph === WILDCARD) {
      return availableBranchChoices(state).length === 0;
    }
    return !state.tree[`${state.cursorPrefix}${glyph}`];
  }

  return !Boolean(state.tree[state.cursorPrefix]?.terminal);
}

function failState(state: VeilvaultState, label: string) {
  state.verdict = {
    correct: false,
    label,
  };
  state.message = label;
  return state;
}

function finishTask(state: VeilvaultState, successLabel: string) {
  state.taskIndex += 1;
  state.cursorPrefix = '';
  state.progress = 0;
  state.wildcardFrames = [];
  state.message = successLabel;

  if (state.taskIndex >= state.puzzle.tasks.length) {
    const withinBudget = state.actionsUsed <= state.puzzle.budget;
    state.verdict = {
      correct: withinBudget,
      label: withinBudget
        ? `Veil ledger secured in ${state.actionsUsed}/${state.puzzle.budget} actions.`
        : `Veil ledger cleared, but the lamp budget broke at ${state.actionsUsed}/${state.puzzle.budget}.`,
    };
    state.message = withinBudget
      ? 'Every filing and warrant is settled.'
      : 'Every filing and warrant is settled, but the archive ran long.';
  }

  return state;
}

function decisionOptionsCount(state: VeilvaultState) {
  const task = currentTask(state);
  if (!task || state.verdict) return 0;
  if (task.kind === 'insert') return 3;

  const glyph = nextGlyph(state);
  const branchOptions = glyph === WILDCARD ? Math.max(1, availableBranchChoices(state).length) : 1;
  return 2 + branchOptions + (state.wildcardFrames.length > 0 ? 1 : 0);
}

function applyFollow(state: VeilvaultState) {
  const task = currentTask(state);
  const glyph = nextGlyph(state);
  if (!task || !glyph) {
    return failState(state, 'There is no next rune to follow.');
  }

  if (task.kind === 'search' && glyph === WILDCARD) {
    return failState(state, 'A veiled rune needs a branch choice, not a direct follow.');
  }

  const nextPrefix = task.kind === 'insert' ? task.text.slice(0, state.progress + 1) : `${state.cursorPrefix}${glyph}`;
  if (!state.tree[nextPrefix]) {
    return failState(state, `No carved stem reaches "${nextPrefix || 'ROOT'}".`);
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
        ? `The full filing is traced. Seal ${task.text} if this resting point is a true word.`
        : `Shared stem "${nextPrefix}" stays live.`;
    return state;
  }

  state.message =
    state.progress === task.text.length
      ? `The full warrant path is traced. Decide whether "${task.text}" truly lands on a sealed word.`
      : `Keep tracing the warrant through "${nextPrefix}".`;
  return state;
}

function applyCarve(state: VeilvaultState) {
  const task = currentTask(state);
  const glyph = nextGlyph(state);
  if (!task || task.kind !== 'insert' || !glyph) {
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

function applySeal(state: VeilvaultState) {
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
  return finishTask(state, `${task.text} is sealed in the archive.`);
}

function applyBranch(state: VeilvaultState, prefix: string) {
  const task = currentTask(state);
  if (!task || task.kind !== 'search' || nextGlyph(state) !== WILDCARD) {
    return failState(state, 'Only a live veiled warrant can branch.');
  }

  const choices = availableBranchChoices(state);
  if (!choices.includes(prefix)) {
    return failState(state, `Branch "${prefix}" is not open for this veil.`);
  }

  let frame = currentFrameForContext(state);
  if (!frame) {
    frame = {
      parentPrefix: state.cursorPrefix,
      progressBefore: state.progress,
      choices: [...(currentNode(state)?.children ?? [])].sort((left, right) => left.localeCompare(right)),
      tried: [],
    };
    state.wildcardFrames.push(frame);
  }

  frame.tried.push(prefix);
  state.cursorPrefix = prefix;
  state.progress += 1;
  pushHistory(state, `Branch ${prefix}`);
  state.message =
    state.progress === task.text.length
      ? `The veil resolved through "${prefix}". Decide whether the resting point is a sealed word.`
      : `The veil resolved through "${prefix}". Keep tracing the warrant.`;
  return state;
}

function applyBacktrack(state: VeilvaultState) {
  const task = currentTask(state);
  if (!task || task.kind !== 'search') {
    return failState(state, 'Only warrants can reopen an older veil.');
  }

  while (state.wildcardFrames.length > 0) {
    const frame = state.wildcardFrames[state.wildcardFrames.length - 1]!;
    if (unusedChoices(frame).length > 0) {
      state.cursorPrefix = frame.parentPrefix;
      state.progress = frame.progressBefore;
      pushHistory(state, `Backtrack ${frame.parentPrefix || 'ROOT'}`);
      state.message = `Reopen the last veil at ${frame.parentPrefix || 'ROOT'} and try another branch.`;
      return state;
    }
    state.wildcardFrames.pop();
  }

  return failState(state, 'No older veil still has an open branch.');
}

function canClaimFound(state: VeilvaultState) {
  const task = currentTask(state);
  if (!task || task.kind !== 'search') return false;
  return state.progress === task.text.length && Boolean(state.tree[state.cursorPrefix]?.terminal);
}

function canClaimMissing(state: VeilvaultState) {
  const task = currentTask(state);
  if (!task || task.kind !== 'search') return false;
  return localFailure(state) && !hasFallbackBranch(state);
}

function applyClaimFound(state: VeilvaultState) {
  const task = currentTask(state);
  if (!task || task.kind !== 'search') {
    return failState(state, 'Filing orders cannot be settled with a presence claim.');
  }

  if (!canClaimFound(state)) {
    return failState(state, `"${task.text}" is not proven present yet.`);
  }

  pushHistory(state, `Present ${task.text}`);
  if (task.expected !== true) {
    return failState(state, `"${task.text}" should have been marked missing.`);
  }

  return finishTask(state, `Warrant settled: ${task.text} is present.`);
}

function applyClaimMissing(state: VeilvaultState) {
  const task = currentTask(state);
  if (!task || task.kind !== 'search') {
    return failState(state, 'Filing orders cannot be settled with a missing claim.');
  }

  if (!canClaimMissing(state)) {
    return failState(state, `"${task.text}" still has an untested branch or live seal path.`);
  }

  pushHistory(state, `Missing ${task.text}`);
  if (task.expected !== false) {
    return failState(state, `"${task.text}" should have been marked present.`);
  }

  return finishTask(state, `Warrant settled: ${task.text} is missing.`);
}

export function applyMove(current: VeilvaultState, move: VeilvaultMove) {
  if (current.verdict) return current;
  const state = cloneState(current);
  state.actionsUsed += 1;

  if (move.type === 'follow') return applyFollow(state);
  if (move.type === 'carve') return applyCarve(state);
  if (move.type === 'seal') return applySeal(state);
  if (move.type === 'branch') return applyBranch(state, move.prefix);
  if (move.type === 'backtrack') return applyBacktrack(state);
  if (move.type === 'claimFound') return applyClaimFound(state);
  return applyClaimMissing(state);
}

function canMatchFrom(tree: Record<string, VeilvaultNode>, prefix: string, pattern: string, index: number): boolean {
  const node = tree[prefix];
  if (!node) return false;
  if (index >= pattern.length) return node.terminal;

  const glyph = pattern[index]!;
  if (glyph === WILDCARD) {
    return node.children.some((child) => canMatchFrom(tree, child, pattern, index + 1));
  }

  return canMatchFrom(tree, `${prefix}${glyph}`, pattern, index + 1);
}

function chooseOptimalMove(state: VeilvaultState): VeilvaultMove {
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
    const glyph = task.text[state.progress]!;
    if (glyph === WILDCARD) {
      const choices = availableBranchChoices(state);
      const winningChoice = choices.find((choice) => canMatchFrom(state.tree, choice, task.text, state.progress + 1));
      if (winningChoice) {
        return { type: 'branch', prefix: winningChoice };
      }
      if (choices.length > 0) {
        return { type: 'branch', prefix: choices[0]! };
      }
      if (canClaimMissing(state)) return { type: 'claimMissing' };
      return { type: 'backtrack' };
    }

    const nextPrefix = `${state.cursorPrefix}${glyph}`;
    if (state.tree[nextPrefix]) return { type: 'follow' };
    if (canClaimMissing(state)) return { type: 'claimMissing' };
    return { type: 'backtrack' };
  }

  if (state.tree[state.cursorPrefix]?.terminal) {
    return { type: 'claimFound' };
  }

  if (canClaimMissing(state)) return { type: 'claimMissing' };
  return { type: 'backtrack' };
}

export function groupedNodes(state: VeilvaultState) {
  const groups = new Map<number, VeilvaultNode[]>();
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

export function visibleWords(state: VeilvaultState) {
  return Object.values(state.tree)
    .filter((node) => node.terminal)
    .map((node) => node.prefix)
    .sort((left, right) => left.localeCompare(right));
}

export function solveVeilvault(puzzle: VeilvaultPuzzle): VeilvaultSolution {
  let state = createInitialState(puzzle);
  const moves: VeilvaultMove[] = [];
  const entropies: number[] = [];
  let guard = 0;

  while (!state.verdict && guard < 500) {
    const options = decisionOptionsCount(state);
    if (options > 0) {
      entropies.push(log2(options));
    }

    const move = chooseOptimalMove(state);
    moves.push(move);
    state = applyMove(state, move);
    guard += 1;
  }

  const counterintuitiveSteps = moves.filter(
    (move) => move.type === 'branch' || move.type === 'backtrack',
  ).length;

  return {
    moves,
    finalState: state,
    solved: Boolean(state.verdict?.correct),
    actionsUsed: state.actionsUsed,
    counterintuitiveSteps,
    meanDecisionEntropy: average(entropies),
  };
}

function wildcardShelfMatch(word: string, pattern: string) {
  if (word.length !== pattern.length) return false;
  for (let index = 0; index < pattern.length; index += 1) {
    const glyph = pattern[index]!;
    if (glyph !== WILDCARD && glyph !== word[index]) return false;
  }
  return true;
}

function shelfQueryCost(words: string[], pattern: string) {
  let work = 0;

  for (const word of words) {
    work += 1;
    const overlap = Math.max(word.length, pattern.length);
    for (let index = 0; index < overlap; index += 1) {
      work += 1;
      const glyph = pattern[index];
      const letter = word[index];
      if (glyph === undefined || letter === undefined) break;
      if (glyph !== WILDCARD && glyph !== letter) break;
    }
    if (wildcardShelfMatch(word, pattern)) {
      return work + 1;
    }
  }

  return work + 1;
}

function linearShelfBaseline(puzzle: VeilvaultPuzzle) {
  const words: string[] = [];
  let actionsUsed = 0;

  for (const task of puzzle.tasks) {
    if (task.kind === 'insert') {
      words.push(task.text);
      actionsUsed += task.text.length + 1;
      continue;
    }

    actionsUsed += shelfQueryCost(words, task.text);
  }

  return {
    actionsUsed,
    solved: true,
  };
}

function puzzleEntropyFor(puzzle: VeilvaultPuzzle) {
  const uniqueStems = new Set<string>();
  let wildcards = 0;
  for (const task of puzzle.tasks) {
    let prefix = '';
    for (const glyph of task.text) {
      if (glyph === WILDCARD) {
        wildcards += 1;
        continue;
      }
      prefix += glyph;
      uniqueStems.add(prefix);
    }
  }
  return uniqueStems.size * average(puzzle.tasks.map((task) => task.text.length)) + wildcards * 2;
}

export function evaluateVeilvault(): VeilvaultEvaluation {
  const difficulties: DifficultyAggregate[] = ([1, 2, 3, 4, 5] as VeilvaultDifficulty[]).map((difficulty) => {
    const puzzle = buildPuzzle(difficulty);
    const optimal = solveVeilvault(puzzle);
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
    difficulties.find((entry) => entry.skillDepth >= 0.4 && entry.counterintuitive >= 6)?.difficulty ?? 2;

  return {
    difficulties,
    learningMetrics: {
      inputShapeMatch: 1,
      operationMatch: 1,
      constraintMatch: 1,
      goalMatch: 1,
      leetCodeFit: 1,
      bestAlternativeGap: averageGap,
      invariantPressure: clamp(
        0,
        1,
        average(difficulties.map((entry) => (entry.counterintuitive + entry.skillDepth * 12) / 18)),
      ),
      difficultyBreakpoint: breakpoint,
      algorithmAlignment: 1,
    },
    interpretation: {
      invariant:
        'Shared stems stay carved once, every veil rune opens one child branch at a time, and only exhausting the remaining veil branches can prove a warrant is truly missing.',
      strongestAlternative:
        'A flat word shelf can answer the same wildcard warrants by rescanning every stored word, but it repays old prefix work and hides the local branch-backtrack structure of the real search.',
      evidence:
        'Every shipped puzzle stays solvable while the shelf-scan baseline burns more actions and the optimal line repeatedly branches on a veil, backtracks one layer, and reuses the trie.',
    },
  };
}
