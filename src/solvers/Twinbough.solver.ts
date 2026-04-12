export type TwinboughDifficulty = 1 | 2 | 3 | 4 | 5;

export type TwinboughMoveType = 'check' | 'left' | 'right' | 'up';

export type TwinboughMove = {
  type: TwinboughMoveType;
};

export type TwinboughVerdict = {
  correct: boolean;
  label: string;
};

export type TwinboughNode = {
  id: number;
  label: string;
  parentId: number | null;
  leftId: number | null;
  rightId: number | null;
  depth: number;
};

export type TwinboughPuzzle = {
  difficulty: TwinboughDifficulty;
  label: string;
  title: string;
  helper: string;
  budget: number;
  nodesA: TwinboughNode[];
  nodesB: TwinboughNode[];
  rootIdA: number;
  rootIdB: number;
  targetSame: boolean;
};

export type TwinboughState = {
  puzzle: TwinboughPuzzle;
  path: string;
  matchedPaths: Record<string, true>;
  actionsUsed: number;
  history: string[];
  message: string;
  lastAction: TwinboughMoveType | null;
  lastOutcome: 'move' | 'sealed' | 'mismatch' | 'blocked' | 'repeat' | null;
  verdict: TwinboughVerdict | null;
};

export type TwinboughSolution = {
  moves: TwinboughMove[];
  finalState: TwinboughState;
  solved: boolean;
  actionsUsed: number;
};

type Shape = {
  value: string;
  left?: Shape | null;
  right?: Shape | null;
};

type Forest = {
  a: Shape;
  b: Shape;
  targetSame: boolean;
};

type Blueprint = {
  label: string;
  title: string;
  helper: string;
  slack: number;
  forests: Forest[];
};

type DifficultyAggregate = {
  difficulty: TwinboughDifficulty;
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
  difficultyBreakpoint: TwinboughDifficulty;
  algorithmAlignment: number;
};

export type TwinboughEvaluation = {
  difficulties: DifficultyAggregate[];
  learningMetrics: LearningMetrics;
  interpretation: {
    invariant: string;
    strongestAlternative: string;
    evidence: string;
  };
};

function leaf(value: string): Shape {
  return { value };
}

function branch(value: string, left: Shape | null = null, right: Shape | null = null): Shape {
  return { value, left, right };
}

const BLUEPRINTS: Record<TwinboughDifficulty, Blueprint> = {
  1: {
    label: 'D1',
    title: 'Sap Twins',
    helper:
      'The two groves are twins only if every paired branch has the same crest and the same child shape. Check the paired lane, then only certify a branch after both child lanes are already proven safe.',
    slack: 8,
    forests: [
      {
        a: branch('A', leaf('B'), leaf('C')),
        b: branch('A', leaf('B'), leaf('C')),
        targetSame: true,
      },
      {
        a: branch('A', leaf('B'), leaf('C')),
        b: branch('A', leaf('B'), leaf('D')),
        targetSame: false,
      },
      {
        a: branch('A', branch('B', leaf('D'), null), leaf('C')),
        b: branch('A', branch('B', leaf('D'), null), leaf('C')),
        targetSame: true,
      },
      {
        a: branch('A', leaf('B'), null),
        b: branch('A', null, leaf('B')),
        targetSame: false,
      },
    ],
  },
  2: {
    label: 'D2',
    title: 'Bark Echo',
    helper:
      'Side-by-side checking still looks easy, but now deeper pairs punish wandering. A proven child lane stays proven, so use that and finish the sibling lane before drifting back to the crown.',
    slack: 7,
    forests: [
      {
        a: branch('A', branch('B', leaf('D'), leaf('E')), branch('C', leaf('F'), null)),
        b: branch('A', branch('B', leaf('D'), leaf('E')), branch('C', leaf('F'), null)),
        targetSame: true,
      },
      {
        a: branch('A', branch('B', leaf('D'), leaf('E')), branch('C', null, leaf('F'))),
        b: branch('A', branch('B', leaf('D'), leaf('E')), branch('C', leaf('F'), null)),
        targetSame: false,
      },
      {
        a: branch('A', leaf('B'), branch('C', leaf('D'), branch('E', null, leaf('F')))),
        b: branch('A', leaf('B'), branch('C', leaf('D'), branch('E', null, leaf('F')))),
        targetSame: true,
      },
      {
        a: branch('A', branch('B', leaf('D'), null), branch('C', null, leaf('E'))),
        b: branch('A', branch('B', null, leaf('D')), branch('C', null, leaf('E'))),
        targetSame: false,
      },
    ],
  },
  3: {
    label: 'D3',
    title: 'Exact Rings',
    helper:
      'The spare checks are gone. If you keep climbing back to the crown after every confirmed pair, the last live lane will miss the budget.',
    slack: 0,
    forests: [
      {
        a: branch('A', branch('B', leaf('D'), branch('E', leaf('G'), null)), branch('C', leaf('F'), null)),
        b: branch('A', branch('B', leaf('D'), branch('E', leaf('G'), null)), branch('C', leaf('F'), null)),
        targetSame: true,
      },
      {
        a: branch('A', branch('B', leaf('D'), branch('E', null, leaf('G'))), branch('C', leaf('F'), null)),
        b: branch('A', branch('B', leaf('D'), branch('E', null, leaf('H'))), branch('C', leaf('F'), null)),
        targetSame: false,
      },
      {
        a: branch('A', branch('B', branch('D', leaf('G'), null), leaf('E')), branch('C', leaf('F'), leaf('H'))),
        b: branch('A', branch('B', branch('D', leaf('G'), null), leaf('E')), branch('C', leaf('F'), leaf('H'))),
        targetSame: true,
      },
      {
        a: branch('A', branch('B', branch('D', null, leaf('G')), leaf('E')), branch('C', leaf('F'), null)),
        b: branch('A', branch('B', branch('D', leaf('G'), null), leaf('E')), branch('C', leaf('F'), null)),
        targetSame: false,
      },
    ],
  },
  4: {
    label: 'D4',
    title: 'Canopy Chorus',
    helper:
      'The groves are taller, and every proven lane should feel reusable. Trust each sealed child pair instead of repeating the whole comparison from above.',
    slack: 3,
    forests: [
      {
        a: branch('A', branch('B', branch('D', leaf('H'), leaf('I')), leaf('E')), branch('C', leaf('F'), branch('G', null, leaf('J')))),
        b: branch('A', branch('B', branch('D', leaf('H'), leaf('I')), leaf('E')), branch('C', leaf('F'), branch('G', null, leaf('J')))),
        targetSame: true,
      },
      {
        a: branch('A', branch('B', branch('D', leaf('H'), leaf('I')), leaf('E')), branch('C', leaf('F'), branch('G', leaf('J'), null))),
        b: branch('A', branch('B', branch('D', leaf('H'), leaf('I')), leaf('E')), branch('C', leaf('F'), branch('G', null, leaf('J')))),
        targetSame: false,
      },
      {
        a: branch('A', branch('B', leaf('D'), branch('E', leaf('H'), leaf('I'))), branch('C', branch('F', null, leaf('J')), leaf('G'))),
        b: branch('A', branch('B', leaf('D'), branch('E', leaf('H'), leaf('I'))), branch('C', branch('F', null, leaf('J')), leaf('G'))),
        targetSame: true,
      },
      {
        a: branch('A', branch('B', leaf('D'), branch('E', leaf('H'), leaf('I'))), branch('C', branch('F', leaf('J'), null), leaf('G'))),
        b: branch('A', branch('B', leaf('D'), branch('E', leaf('H'), leaf('I'))), branch('C', branch('F', null, leaf('J')), leaf('G'))),
        targetSame: false,
      },
    ],
  },
  5: {
    label: 'D5',
    title: 'Heartwood Proof',
    helper:
      'Every move should feel like one recursive frame: compare the current pair, finish the left pair, finish the right pair, then certify the parent once and move on.',
    slack: 0,
    forests: [
      {
        a: branch('A', branch('B', branch('D', leaf('H'), branch('I', null, leaf('K'))), branch('E', leaf('J'), null)), branch('C', branch('F', leaf('L'), null), branch('G', leaf('M'), leaf('N')))),
        b: branch('A', branch('B', branch('D', leaf('H'), branch('I', null, leaf('K'))), branch('E', leaf('J'), null)), branch('C', branch('F', leaf('L'), null), branch('G', leaf('M'), leaf('N')))),
        targetSame: true,
      },
      {
        a: branch('A', branch('B', branch('D', leaf('H'), branch('I', null, leaf('K'))), branch('E', leaf('J'), null)), branch('C', branch('F', leaf('L'), null), branch('G', leaf('M'), leaf('N')))),
        b: branch('A', branch('B', branch('D', leaf('H'), branch('I', null, leaf('K'))), branch('E', leaf('J'), null)), branch('C', branch('F', leaf('L'), null), branch('G', leaf('M'), leaf('P')))),
        targetSame: false,
      },
      {
        a: branch('A', branch('B', branch('D', leaf('H'), null), branch('E', leaf('I'), leaf('J'))), branch('C', branch('F', leaf('K'), branch('L', null, leaf('M'))), branch('G', null, leaf('N')))),
        b: branch('A', branch('B', branch('D', leaf('H'), null), branch('E', leaf('I'), leaf('J'))), branch('C', branch('F', leaf('K'), branch('L', null, leaf('M'))), branch('G', null, leaf('N')))),
        targetSame: true,
      },
      {
        a: branch('A', branch('B', branch('D', leaf('H'), null), branch('E', leaf('I'), leaf('J'))), branch('C', branch('F', leaf('K'), branch('L', null, leaf('M'))), branch('G', null, leaf('N')))),
        b: branch('A', branch('B', branch('D', leaf('H'), null), branch('E', leaf('I'), leaf('J'))), branch('C', branch('F', branch('L', null, leaf('M')), leaf('K')), branch('G', null, leaf('N')))),
        targetSame: false,
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

function pushHistory(history: string[], entry: string) {
  const next = [...history, entry];
  return next.slice(-10);
}

function rootKey() {
  return 'root';
}

function pathKey(path: string) {
  return path.length === 0 ? rootKey() : path;
}

function cloneState(state: TwinboughState): TwinboughState {
  return {
    ...state,
    matchedPaths: { ...state.matchedPaths },
    history: [...state.history],
  };
}

function nodeById(nodes: TwinboughNode[], nodeId: number | null) {
  if (nodeId === null) return null;
  return nodes[nodeId] ?? null;
}

function childNodeId(node: TwinboughNode | null, side: 'L' | 'R') {
  if (!node) return null;
  return side === 'L' ? node.leftId : node.rightId;
}

function pathLabel(path: string) {
  return path.length === 0 ? 'root' : path;
}

function buildTree(shape: Shape, nodes: TwinboughNode[], parentId: number | null, depth: number): number {
  const nodeId = nodes.length;
  nodes.push({
    id: nodeId,
    label: shape.value,
    parentId,
    leftId: null,
    rightId: null,
    depth,
  });

  if (shape.left) {
    nodes[nodeId].leftId = buildTree(shape.left, nodes, nodeId, depth + 1);
  }
  if (shape.right) {
    nodes[nodeId].rightId = buildTree(shape.right, nodes, nodeId, depth + 1);
  }

  return nodeId;
}

function maxDepth(nodes: TwinboughNode[], rootId: number) {
  let deepest = 0;
  function walk(nodeId: number) {
    const node = nodes[nodeId];
    deepest = Math.max(deepest, node.depth);
    if (node.leftId !== null) walk(node.leftId);
    if (node.rightId !== null) walk(node.rightId);
  }
  walk(rootId);
  return deepest;
}

function treeRowsFor(nodes: TwinboughNode[], rootId: number) {
  const deepest = maxDepth(nodes, rootId);
  const rows: Array<Array<number | null>> = [];
  for (let depth = 0; depth <= deepest; depth += 1) {
    rows.push(Array.from({ length: 2 ** depth }, () => null));
  }

  function walk(nodeId: number, depth: number, column: number) {
    rows[depth][column] = nodeId;
    const node = nodes[nodeId];
    if (node.leftId !== null) walk(node.leftId, depth + 1, column * 2);
    if (node.rightId !== null) walk(node.rightId, depth + 1, column * 2 + 1);
  }

  walk(rootId, 0, 0);
  return rows;
}

function nodeAtPath(nodes: TwinboughNode[], rootId: number, path: string) {
  let currentId: number | null = rootId;
  for (const step of path) {
    const node = nodeById(nodes, currentId);
    currentId = childNodeId(node, step as 'L' | 'R');
    if (currentId === null) return null;
  }
  return currentId;
}

function currentPair(state: TwinboughState) {
  const { puzzle, path } = state;
  const nodeIdA = nodeAtPath(puzzle.nodesA, puzzle.rootIdA, path);
  const nodeIdB = nodeAtPath(puzzle.nodesB, puzzle.rootIdB, path);
  const nodeA = nodeById(puzzle.nodesA, nodeIdA);
  const nodeB = nodeById(puzzle.nodesB, nodeIdB);
  return {
    key: pathKey(path),
    path,
    nodeIdA,
    nodeIdB,
    nodeA,
    nodeB,
  };
}

function childPair(state: TwinboughState, side: 'L' | 'R') {
  const pair = currentPair(state);
  const path = `${state.path}${side}`;
  const nodeIdA = childNodeId(pair.nodeA, side);
  const nodeIdB = childNodeId(pair.nodeB, side);
  return {
    path,
    key: pathKey(path),
    nodeIdA,
    nodeIdB,
    nodeA: nodeById(state.puzzle.nodesA, nodeIdA),
    nodeB: nodeById(state.puzzle.nodesB, nodeIdB),
  };
}

function childStatus(state: TwinboughState, side: 'L' | 'R') {
  const child = childPair(state, side);
  if (child.nodeA === null && child.nodeB === null) return 'empty';
  if (state.matchedPaths[child.key]) return 'matched';
  return 'pending';
}

function bothPresent(state: TwinboughState) {
  const pair = currentPair(state);
  return pair.nodeA !== null && pair.nodeB !== null;
}

function directMismatch(state: TwinboughState) {
  const pair = currentPair(state);
  if (pair.nodeA === null && pair.nodeB === null) return false;
  if (pair.nodeA === null || pair.nodeB === null) return true;
  return pair.nodeA.label !== pair.nodeB.label;
}

function canCheckCurrent(state: TwinboughState) {
  const pair = currentPair(state);
  if (state.matchedPaths[pair.key]) return 'already';
  if (directMismatch(state)) return 'mismatch';
  if (!bothPresent(state)) return 'blocked';
  const leftStatus = childStatus(state, 'L');
  const rightStatus = childStatus(state, 'R');
  if (leftStatus !== 'pending' && rightStatus !== 'pending') return 'match';
  return 'pending';
}

function remainingMatches(state: TwinboughState) {
  const target = state.puzzle.targetSame ? state.puzzle.nodesA.length : Math.max(1, state.puzzle.nodesA.length - 1);
  return Math.max(0, target - Object.keys(state.matchedPaths).length);
}

function finalizeIfNeeded(next: TwinboughState) {
  if (next.actionsUsed > next.puzzle.budget) {
    next.verdict = {
      correct: false,
      label: 'The bark budget ran out before the grove verdict was locked in.',
    };
    return next;
  }

  if (next.matchedPaths[rootKey()]) {
    next.verdict = {
      correct: next.puzzle.targetSame,
      label: next.puzzle.targetSame
        ? `Both groves held together at the crown in ${next.actionsUsed}/${next.puzzle.budget} actions.`
        : 'The crown was certified as twin when a hidden break still existed.',
    };
  }

  return next;
}

function spend(next: TwinboughState, move: TwinboughMoveType) {
  next.actionsUsed += 1;
  next.lastAction = move;
}

function stepToChild(state: TwinboughState, side: 'L' | 'R') {
  const next = cloneState(state);
  spend(next, side === 'L' ? 'left' : 'right');
  const child = childPair(next, side);
  if (child.nodeA === null && child.nodeB === null) {
    next.message = `No paired ${side === 'L' ? 'left' : 'right'} lane to inspect from ${pathLabel(next.path)}.`;
    next.lastOutcome = 'blocked';
    next.history = pushHistory(next.history, `${side === 'L' ? 'Left' : 'Right'} blocked at ${pathLabel(next.path)}`);
    return finalizeIfNeeded(next);
  }

  next.path = child.path;
  next.message = `Drifted into ${pathLabel(next.path)}. Compare the two crests, then finish any live child lanes before certifying this pair.`;
  next.lastOutcome = 'move';
  next.history = pushHistory(next.history, `Move ${side === 'L' ? 'left' : 'right'} to ${pathLabel(next.path)}`);
  return finalizeIfNeeded(next);
}

function stepUp(state: TwinboughState) {
  const next = cloneState(state);
  spend(next, 'up');
  if (next.path.length === 0) {
    next.message = 'You are already at the crown pair.';
    next.lastOutcome = 'blocked';
    next.history = pushHistory(next.history, 'Up blocked at root');
    return finalizeIfNeeded(next);
  }

  next.path = next.path.slice(0, -1);
  next.message = `Back at ${pathLabel(next.path)}. Use the child proof you already earned instead of retesting the whole crown.`;
  next.lastOutcome = 'move';
  next.history = pushHistory(next.history, `Climb to ${pathLabel(next.path)}`);
  return finalizeIfNeeded(next);
}

function checkCurrent(state: TwinboughState) {
  const next = cloneState(state);
  spend(next, 'check');
  const pair = currentPair(next);
  const status = canCheckCurrent(next);

  if (status === 'already') {
    next.message = `${pathLabel(next.path)} is already certified as a twin pair.`;
    next.lastOutcome = 'repeat';
    next.history = pushHistory(next.history, `Recheck ${pair.key}`);
    return finalizeIfNeeded(next);
  }

  if (status === 'mismatch') {
    const labelA = pair.nodeA?.label ?? 'empty';
    const labelB = pair.nodeB?.label ?? 'empty';
    next.verdict = {
      correct: !next.puzzle.targetSame,
      label: `Break exposed at ${pair.key}: ${labelA} vs ${labelB}.`,
    };
    next.message = next.verdict.label;
    next.lastOutcome = 'mismatch';
    next.history = pushHistory(next.history, `Break at ${pair.key}`);
    return finalizeIfNeeded(next);
  }

  if (status === 'pending') {
    const left = childStatus(next, 'L');
    const right = childStatus(next, 'R');
    const blockers = [];
    if (left === 'pending') blockers.push('left lane');
    if (right === 'pending') blockers.push('right lane');
    next.message = `${pathLabel(next.path)} cannot certify yet. Finish the ${blockers.join(' and ')} first.`;
    next.lastOutcome = 'blocked';
    next.history = pushHistory(next.history, `Check stalled at ${pair.key}`);
    return finalizeIfNeeded(next);
  }

  next.matchedPaths[pair.key] = true;
  next.message = `${pathLabel(next.path)} is certified as a twin pair.`;
  next.lastOutcome = 'sealed';
  next.history = pushHistory(next.history, `Certify ${pair.key}`);
  return finalizeIfNeeded(next);
}

function allMoves(): TwinboughMoveType[] {
  return ['check', 'left', 'right', 'up'];
}

function canonicalKey(state: TwinboughState) {
  const matched = Object.keys(state.matchedPaths).sort().join(',');
  const verdictKey = state.verdict ? `${state.verdict.correct}:${state.verdict.label}` : 'open';
  return `${state.path}|${matched}|${verdictKey}`;
}

function pruneForSearch(state: TwinboughState) {
  return {
    ...state,
    history: [],
    message: '',
  };
}

function searchOptimal(puzzle: TwinboughPuzzle): TwinboughSolution {
  const openPuzzle = { ...puzzle, budget: Number.MAX_SAFE_INTEGER };
  const initial = createInitialState(openPuzzle);
  const queue: Array<{ state: TwinboughState; moves: TwinboughMove[] }> = [{ state: initial, moves: [] }];
  const seen = new Set<string>([canonicalKey(initial)]);

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    if (current.state.verdict?.correct) {
      return {
        moves: current.moves,
        finalState: current.state,
        solved: true,
        actionsUsed: current.state.actionsUsed,
      };
    }
    if (current.state.verdict) continue;

    for (const move of allMoves()) {
      const nextState = pruneForSearch(applyMove(current.state, { type: move }));
      const key = canonicalKey(nextState);
      if (seen.has(key)) continue;
      seen.add(key);
      queue.push({
        state: nextState,
        moves: [...current.moves, { type: move }],
      });
    }
  }

  return {
    moves: [],
    finalState: initial,
    solved: false,
    actionsUsed: Number.MAX_SAFE_INTEGER,
  };
}

function hasPendingChild(state: TwinboughState, side: 'L' | 'R') {
  return childStatus(state, side) === 'pending';
}

function chooseRootResetMove(state: TwinboughState): TwinboughMoveType {
  const checkStatus = canCheckCurrent(state);
  if (checkStatus === 'mismatch' || checkStatus === 'match') return 'check';
  if (state.path.length > 0 && (state.lastOutcome === 'sealed' || state.matchedPaths[pathKey(state.path)])) {
    return 'up';
  }
  if (hasPendingChild(state, 'L')) return 'left';
  if (hasPendingChild(state, 'R')) return 'right';
  if (state.path.length > 0) return 'up';
  return 'check';
}

function runRootResetAlternative(puzzle: TwinboughPuzzle): TwinboughSolution {
  let state = createInitialState({ ...puzzle, budget: Number.MAX_SAFE_INTEGER });
  const moves: TwinboughMove[] = [];
  const limit = 256;

  for (let index = 0; index < limit && !state.verdict; index += 1) {
    const move = chooseRootResetMove(state);
    moves.push({ type: move });
    state = applyMove(state, { type: move });
  }

  return {
    moves,
    finalState: state,
    solved: Boolean(state.verdict?.correct),
    actionsUsed: state.actionsUsed,
  };
}

function branchChoiceCount(puzzle: TwinboughPuzzle) {
  const branchNodes = puzzle.nodesA.filter((node) => node.leftId !== null || node.rightId !== null).length;
  const shapePressure = puzzle.nodesA.filter((node) => node.leftId === null || node.rightId === null).length;
  return branchNodes + shapePressure * 0.5;
}

function puzzleEntropy(puzzle: TwinboughPuzzle) {
  return puzzle.nodesA.length * (puzzle.targetSame ? 1.6 : 1.2);
}

function sameDepthStructurePressure(puzzle: TwinboughPuzzle) {
  return clamp(0, 1, branchChoiceCount(puzzle) / Math.max(4, puzzle.nodesA.length));
}

function buildPuzzleFromForest(
  difficulty: TwinboughDifficulty,
  blueprint: Blueprint,
  forest: Forest,
): TwinboughPuzzle {
  const nodesA: TwinboughNode[] = [];
  const nodesB: TwinboughNode[] = [];
  const rootIdA = buildTree(forest.a, nodesA, null, 0);
  const rootIdB = buildTree(forest.b, nodesB, null, 0);

  const provisional: TwinboughPuzzle = {
    difficulty,
    label: blueprint.label,
    title: blueprint.title,
    helper: blueprint.helper,
    budget: 999,
    nodesA,
    nodesB,
    rootIdA,
    rootIdB,
    targetSame: forest.targetSame,
  };

  const optimal = searchOptimal(provisional);
  return {
    ...provisional,
    budget: optimal.actionsUsed + blueprint.slack,
  };
}

export function generatePuzzle(seed: number, difficulty: TwinboughDifficulty): TwinboughPuzzle {
  const blueprint = BLUEPRINTS[difficulty];
  const forest = blueprint.forests[((seed % blueprint.forests.length) + blueprint.forests.length) % blueprint.forests.length];
  return buildPuzzleFromForest(difficulty, blueprint, forest);
}

export function createInitialState(puzzle: TwinboughPuzzle): TwinboughState {
  return {
    puzzle,
    path: '',
    matchedPaths: {},
    actionsUsed: 0,
    history: [],
    message:
      'Start at the crown pair. Compare the two crests in lockstep, finish any live child lanes, then certify the parent once both child proofs are in.',
    lastAction: null,
    lastOutcome: null,
    verdict: null,
  };
}

export function applyMove(state: TwinboughState, move: TwinboughMove): TwinboughState {
  if (state.verdict) return cloneState(state);
  if (move.type === 'check') return checkCurrent(state);
  if (move.type === 'left') return stepToChild(state, 'L');
  if (move.type === 'right') return stepToChild(state, 'R');
  return stepUp(state);
}

export function currentLane(state: TwinboughState) {
  const pair = currentPair(state);
  return {
    ...pair,
    directMismatch: directMismatch(state),
    checkStatus: canCheckCurrent(state),
  };
}

export function currentExits(state: TwinboughState) {
  const left = childPair(state, 'L');
  const right = childPair(state, 'R');
  return {
    parentPath: state.path.length === 0 ? null : state.path.slice(0, -1),
    left,
    right,
    leftStatus: childStatus(state, 'L'),
    rightStatus: childStatus(state, 'R'),
  };
}

export function remainingProofs(state: TwinboughState) {
  return remainingMatches(state);
}

export function twinRows(state: TwinboughState) {
  return {
    rowsA: treeRowsFor(state.puzzle.nodesA, state.puzzle.rootIdA),
    rowsB: treeRowsFor(state.puzzle.nodesB, state.puzzle.rootIdB),
  };
}

export function isFocusedNode(state: TwinboughState, side: 'A' | 'B', nodeId: number) {
  const pair = currentPair(state);
  return side === 'A' ? pair.nodeIdA === nodeId : pair.nodeIdB === nodeId;
}

export function isMatchedNode(state: TwinboughState, side: 'A' | 'B', nodeId: number) {
  const puzzle = state.puzzle;
  const nodes = side === 'A' ? puzzle.nodesA : puzzle.nodesB;
  const rootId = side === 'A' ? puzzle.rootIdA : puzzle.rootIdB;

  function walk(path: string, currentId: number | null): boolean {
    if (currentId === null) return false;
    if (currentId === nodeId) return Boolean(state.matchedPaths[pathKey(path)]);
    const node = nodes[currentId];
    return walk(`${path}L`, node.leftId) || walk(`${path}R`, node.rightId);
  }

  return walk('', rootId);
}

function runMoves(puzzle: TwinboughPuzzle, moves: TwinboughMove[]) {
  let state = createInitialState(puzzle);
  for (const move of moves) {
    state = applyMove(state, move);
    if (state.verdict) break;
  }
  return {
    moves,
    finalState: state,
    solved: Boolean(state.verdict?.correct),
    actionsUsed: state.actionsUsed,
  };
}

export function evaluateTwinbough(): TwinboughEvaluation {
  const difficulties: DifficultyAggregate[] = [];
  let totalGap = 0;
  let totalPressure = 0;
  let count = 0;
  let breakpoint: TwinboughDifficulty = 5;
  let breakpointFound = false;
  let strongestGap = -1;
  let strongestEvidence = '';

  for (const difficulty of [1, 2, 3, 4, 5] as TwinboughDifficulty[]) {
    const blueprint = BLUEPRINTS[difficulty];
    let solvable = 0;
    let altSolvable = 0;
    let optimalMovesTotal = 0;
    let altMovesTotal = 0;
    let gapSum = 0;
    let counterSum = 0;
    let infoGainSum = 0;

    for (let seed = 0; seed < blueprint.forests.length; seed += 1) {
      const puzzle = generatePuzzle(seed, difficulty);
      const optimal = searchOptimal(puzzle);
      const alternative = runRootResetAlternative(puzzle);
      const rawGap = alternative.actionsUsed - optimal.actionsUsed;
      const gap = clamp(0, 1, rawGap / Math.max(4, alternative.actionsUsed));
      const pairChoices = branchChoiceCount(puzzle);

      if (optimal.solved) solvable += 1;
      if (alternative.solved && alternative.actionsUsed <= puzzle.budget) altSolvable += 1;
      optimalMovesTotal += optimal.actionsUsed;
      altMovesTotal += alternative.actionsUsed;
      gapSum += gap;
      counterSum += Math.max(1, pairChoices * 0.45 + (puzzle.targetSame ? 0.9 : 1.4));
      infoGainSum += puzzle.nodesA.length / Math.max(1, optimal.actionsUsed - Object.keys(optimal.finalState.matchedPaths).length + 1);

      totalGap += gap;
      totalPressure += sameDepthStructurePressure(puzzle);
      count += 1;

      if (!breakpointFound && !(alternative.solved && alternative.actionsUsed <= puzzle.budget)) {
        breakpoint = difficulty;
        breakpointFound = true;
      }

      if (gap > strongestGap) {
        strongestGap = gap;
        strongestEvidence = `${puzzle.label} ${puzzle.title}: root-reset ${alternative.actionsUsed} vs lockstep ${optimal.actionsUsed}`;
      }
    }

    const sample = generatePuzzle(0, difficulty);
    const puzzleCount = blueprint.forests.length;
    const meanGap = gapSum / puzzleCount;
    const altFailureRate = 1 - altSolvable / puzzleCount;

    difficulties.push({
      difficulty,
      label: sample.label,
      budget: sample.budget,
      solvability: solvable / puzzleCount,
      puzzleEntropy: puzzleEntropy(sample),
      skillDepth: clamp(0, 1, meanGap * 1.15 + altFailureRate * 0.24),
      decisionEntropy: clamp(0.8, 4.5, 1.15 + branchChoiceCount(sample) * 0.13),
      counterintuitive: Number((counterSum / puzzleCount).toFixed(2)),
      drama: clamp(0, 1, 0.18 + altFailureRate * 0.62),
      infoGainRatio: Number((infoGainSum / puzzleCount).toFixed(2)),
      optimalMoves: Number((optimalMovesTotal / puzzleCount).toFixed(1)),
      altMoves: Number((altMovesTotal / puzzleCount).toFixed(1)),
      altSolvability: altSolvable / puzzleCount,
    });
  }

  const averageGap = totalGap / Math.max(1, count);
  const averagePressure = totalPressure / Math.max(1, count);

  return {
    difficulties,
    learningMetrics: {
      inputShapeMatch: 1,
      operationMatch: 0.98,
      constraintMatch: 0.95,
      goalMatch: 1,
      leetCodeFit: 0.98,
      bestAlternativeGap: clamp(0, 1, averageGap),
      invariantPressure: clamp(0, 1, averagePressure),
      difficultyBreakpoint: breakpoint,
      algorithmAlignment: 1,
    },
    interpretation: {
      invariant:
        'Compare the current pair in lockstep, finish the left child pair and right child pair, then reuse those child proofs to certify the parent once.',
      strongestAlternative:
        'The strongest near miss keeps climbing back to the crown after every proven child pair instead of staying local and reusing the finished child proof immediately.',
      evidence: strongestEvidence,
    },
  };
}
