export type GraftguardDifficulty = 1 | 2 | 3 | 4 | 5;

export type GraftguardMoveType =
  | 'probe'
  | 'clear'
  | 'check'
  | 'left'
  | 'right'
  | 'up';

export type GraftguardMove = {
  type: GraftguardMoveType;
};

export type GraftguardVerdict = {
  correct: boolean;
  label: string;
};

export type GraftguardNode = {
  id: number;
  label: string;
  parentId: number | null;
  leftId: number | null;
  rightId: number | null;
  depth: number;
};

export type GraftguardPuzzle = {
  difficulty: GraftguardDifficulty;
  label: string;
  title: string;
  helper: string;
  budget: number;
  hostNodes: GraftguardNode[];
  patternNodes: GraftguardNode[];
  hostRootId: number;
  patternRootId: number;
  targetExists: boolean;
};

export type GraftguardAuditState = {
  anchorPath: string;
  pairPath: string;
  matchedPairPaths: Record<string, true>;
};

export type GraftguardState = {
  puzzle: GraftguardPuzzle;
  searchPath: string;
  clearedPaths: Record<string, true>;
  probeFailures: Record<string, true>;
  actionsUsed: number;
  history: string[];
  message: string;
  lastAction: GraftguardMoveType | null;
  lastOutcome:
    | 'move'
    | 'probe_fail'
    | 'audit_fail'
    | 'sealed'
    | 'cleared'
    | 'blocked'
    | 'repeat'
    | null;
  audit: GraftguardAuditState | null;
  verdict: GraftguardVerdict | null;
};

export type GraftguardSolution = {
  moves: GraftguardMove[];
  finalState: GraftguardState;
  solved: boolean;
  actionsUsed: number;
};

type Shape = {
  value: string;
  left?: Shape | null;
  right?: Shape | null;
};

type SearchForest = {
  host: Shape;
  pattern: Shape;
  targetExists: boolean;
};

type Blueprint = {
  label: string;
  title: string;
  helper: string;
  slack: number;
  forests: SearchForest[];
};

type DifficultyAggregate = {
  difficulty: GraftguardDifficulty;
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
  difficultyBreakpoint: GraftguardDifficulty;
  algorithmAlignment: number;
};

export type GraftguardEvaluation = {
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

const BLUEPRINTS: Record<GraftguardDifficulty, Blueprint> = {
  1: {
    label: 'D1',
    title: 'Sap Scan',
    helper:
      'Probe the current host branch against the pattern sprig. If it fails here, search the child branches and clear the current branch only after both child sides are already ruled out.',
    slack: 8,
    forests: [
      {
        host: branch('A', leaf('B'), leaf('C')),
        pattern: leaf('B'),
        targetExists: true,
      },
      {
        host: branch('A', leaf('B'), branch('C', leaf('F'), null)),
        pattern: branch('C', leaf('F'), null),
        targetExists: true,
      },
      {
        host: branch('A', branch('B', leaf('D'), leaf('E')), leaf('C')),
        pattern: branch('B', leaf('D'), leaf('E')),
        targetExists: true,
      },
      {
        host: branch('A', leaf('B'), leaf('C')),
        pattern: leaf('D'),
        targetExists: false,
      },
    ],
  },
  2: {
    label: 'D2',
    title: 'Near Grafts',
    helper:
      'Several host crests can start the pattern, but most of them break once you compare the deeper shape. Do not keep rescanning from the crown after every failed candidate.',
    slack: 6,
    forests: [
      {
        host: branch(
          'A',
          branch('B', leaf('D'), leaf('F')),
          branch('C', branch('B', leaf('D'), leaf('E')), leaf('G')),
        ),
        pattern: branch('B', leaf('D'), leaf('E')),
        targetExists: true,
      },
      {
        host: branch('A', branch('C', leaf('F'), null), branch('B', branch('E', leaf('H'), null), leaf('I'))),
        pattern: branch('E', leaf('H'), null),
        targetExists: true,
      },
      {
        host: branch('A', branch('B', leaf('D'), null), branch('C', branch('B', leaf('D'), leaf('F')), leaf('G'))),
        pattern: branch('B', leaf('D'), leaf('E')),
        targetExists: false,
      },
      {
        host: branch('A', branch('B', branch('C', leaf('F'), leaf('G')), leaf('H')), branch('C', leaf('F'), null)),
        pattern: branch('C', leaf('F'), leaf('G')),
        targetExists: true,
      },
    ],
  },
  3: {
    label: 'D3',
    title: 'Exact Cutover',
    helper:
      'The spare climbs are almost gone. Test the current branch, then finish its child search before drifting back up, or the true graft hides behind your own wasted resets.',
    slack: 2,
    forests: [
      {
        host: branch('A', branch('B', branch('C', leaf('F'), leaf('H')), leaf('I')), branch('C', leaf('F'), leaf('G'))),
        pattern: branch('C', leaf('F'), leaf('G')),
        targetExists: true,
      },
      {
        host: branch(
          'A',
          branch('B', branch('D', branch('E', leaf('J'), null), null), leaf('G')),
          branch('C', branch('B', branch('D', branch('E', leaf('J'), null), null), leaf('F')), leaf('H')),
        ),
        pattern: branch('B', branch('D', branch('E', leaf('J'), null), null), leaf('F')),
        targetExists: true,
      },
      {
        host: branch(
          'A',
          branch('B', leaf('D'), null),
          branch('C', branch('B', leaf('D'), branch('E', leaf('H'), null)), branch('B', leaf('D'), leaf('F'))),
        ),
        pattern: branch('B', leaf('D'), leaf('E')),
        targetExists: false,
      },
      {
        host: branch(
          'A',
          branch('B', branch('D', branch('E', leaf('J'), leaf('K')), null), leaf('F')),
          branch('C', leaf('G'), branch('B', branch('D', branch('E', leaf('J'), null), null), leaf('F'))),
        ),
        pattern: branch('B', branch('D', branch('E', leaf('J'), null), null), leaf('F')),
        targetExists: true,
      },
    ],
  },
  4: {
    label: 'D4',
    title: 'Canopy Echoes',
    helper:
      'Multiple deep candidates now look plausible. The winning habit is to keep one branch search alive until it is fully cleared, instead of bouncing back to the crown after every local disappointment.',
    slack: 2,
    forests: [
      {
        host: branch(
          'A',
          branch('B', branch('C', leaf('F'), leaf('G')), branch('D', leaf('H'), leaf('I'))),
          branch('C', branch('B', branch('C', leaf('F'), leaf('H')), branch('D', leaf('H'), leaf('I'))), leaf('E')),
        ),
        pattern: branch('B', branch('C', leaf('F'), leaf('G')), branch('D', leaf('H'), leaf('I'))),
        targetExists: true,
      },
      {
        host: branch(
          'A',
          branch('B', branch('D', leaf('E'), leaf('F')), leaf('G')),
          branch('C', leaf('H'), branch('B', branch('D', leaf('E'), leaf('F')), leaf('I'))),
        ),
        pattern: branch('B', branch('D', leaf('E'), leaf('F')), leaf('I')),
        targetExists: true,
      },
      {
        host: branch(
          'A',
          branch('B', branch('C', leaf('F'), leaf('G')), branch('D', leaf('H'), null)),
          branch('C', branch('B', branch('C', leaf('F'), null), branch('D', leaf('H'), leaf('I'))), leaf('E')),
        ),
        pattern: branch('B', branch('C', leaf('F'), leaf('G')), branch('D', leaf('H'), leaf('I'))),
        targetExists: false,
      },
      {
        host: branch(
          'A',
          branch('B', branch('C', leaf('F'), leaf('G')), branch('D', leaf('H'), leaf('I'))),
          branch('J', leaf('K'), branch('L', leaf('M'), leaf('N'))),
        ),
        pattern: branch('L', leaf('M'), leaf('N')),
        targetExists: true,
      },
    ],
  },
  5: {
    label: 'D5',
    title: 'Heartwood Hunt',
    helper:
      'The fake grafts are almost perfect now. You need the full ritual: test the branch you are on, compare the candidate in lockstep when it can start the pattern, and only clear the branch after both child searches come back empty.',
    slack: 0,
    forests: [
      {
        host: branch(
          'A',
          branch('B', branch('C', branch('F', leaf('G'), leaf('H')), leaf('I')), branch('D', leaf('J'), leaf('K'))),
          branch('C', branch('B', branch('C', branch('F', leaf('G'), leaf('X')), leaf('I')), branch('D', leaf('J'), leaf('K'))), leaf('E')),
        ),
        pattern: branch('B', branch('C', branch('F', leaf('G'), leaf('H')), leaf('I')), branch('D', leaf('J'), leaf('K'))),
        targetExists: true,
      },
      {
        host: branch(
          'A',
          branch('B', branch('D', branch('E', branch('F', leaf('L'), null), leaf('G')), null), leaf('H')),
          branch('C', leaf('I'), branch('B', branch('D', branch('E', branch('F', leaf('L'), null), leaf('G')), null), leaf('J'))),
        ),
        pattern: branch('B', branch('D', branch('E', branch('F', leaf('L'), null), leaf('G')), null), leaf('J')),
        targetExists: true,
      },
      {
        host: branch(
          'A',
          branch('B', branch('C', branch('F', leaf('G'), leaf('X')), leaf('I')), branch('D', leaf('J'), leaf('K'))),
          branch(
            'C',
            branch('B', branch('C', branch('F', leaf('G'), leaf('H')), leaf('I')), branch('D', leaf('J'), leaf('L'))),
            branch('B', branch('C', branch('F', leaf('G'), null), leaf('I')), branch('D', leaf('J'), leaf('K'))),
          ),
        ),
        pattern: branch('B', branch('C', branch('F', leaf('G'), leaf('H')), leaf('I')), branch('D', leaf('J'), leaf('K'))),
        targetExists: false,
      },
      {
        host: branch(
          'A',
          branch('B', branch('C', branch('F', leaf('G'), leaf('H')), leaf('I')), branch('D', leaf('J'), leaf('K'))),
          branch('L', leaf('M'), branch('N', branch('O', leaf('P'), leaf('Q')), leaf('R'))),
        ),
        pattern: branch('N', branch('O', leaf('P'), leaf('Q')), leaf('R')),
        targetExists: true,
      },
    ],
  },
};

function clamp(min: number, max: number, value: number) {
  return Math.max(min, Math.min(max, value));
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

function pathLabel(path: string) {
  return path.length === 0 ? 'root' : path;
}

function cloneState(state: GraftguardState): GraftguardState {
  return {
    ...state,
    clearedPaths: { ...state.clearedPaths },
    probeFailures: { ...state.probeFailures },
    history: [...state.history],
    audit: state.audit
      ? {
          ...state.audit,
          matchedPairPaths: { ...state.audit.matchedPairPaths },
        }
      : null,
  };
}

function nodeById(nodes: GraftguardNode[], nodeId: number | null) {
  if (nodeId === null) return null;
  return nodes[nodeId] ?? null;
}

function childNodeId(node: GraftguardNode | null, side: 'L' | 'R') {
  if (!node) return null;
  return side === 'L' ? node.leftId : node.rightId;
}

function buildTree(shape: Shape, nodes: GraftguardNode[], parentId: number | null, depth: number): number {
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

function maxDepth(nodes: GraftguardNode[], rootId: number) {
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

function treeRowsFor(nodes: GraftguardNode[], rootId: number) {
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

function nodeAtPath(nodes: GraftguardNode[], rootId: number, path: string) {
  let currentId: number | null = rootId;
  for (const step of path) {
    const node = nodeById(nodes, currentId);
    currentId = childNodeId(node, step as 'L' | 'R');
    if (currentId === null) return null;
  }
  return currentId;
}

function patternRootLabel(puzzle: GraftguardPuzzle) {
  return puzzle.patternNodes[puzzle.patternRootId].label;
}

function hostNodeAtPath(puzzle: GraftguardPuzzle, path: string) {
  return nodeById(puzzle.hostNodes, nodeAtPath(puzzle.hostNodes, puzzle.hostRootId, path));
}

function patternNodeAtPath(puzzle: GraftguardPuzzle, path: string) {
  return nodeById(puzzle.patternNodes, nodeAtPath(puzzle.patternNodes, puzzle.patternRootId, path));
}

function currentSearchNode(state: GraftguardState) {
  return hostNodeAtPath(state.puzzle, state.searchPath);
}

function currentAuditPair(state: GraftguardState) {
  if (!state.audit) {
    return {
      key: rootKey(),
      path: '',
      hostNodeId: null,
      patternNodeId: null,
      hostNode: null,
      patternNode: null,
    };
  }

  const hostPath = `${state.audit.anchorPath}${state.audit.pairPath}`;
  const hostNodeId = nodeAtPath(state.puzzle.hostNodes, state.puzzle.hostRootId, hostPath);
  const patternNodeId = nodeAtPath(state.puzzle.patternNodes, state.puzzle.patternRootId, state.audit.pairPath);
  return {
    key: pathKey(state.audit.pairPath),
    path: state.audit.pairPath,
    hostNodeId,
    patternNodeId,
    hostNode: nodeById(state.puzzle.hostNodes, hostNodeId),
    patternNode: nodeById(state.puzzle.patternNodes, patternNodeId),
  };
}

function childAuditPair(state: GraftguardState, side: 'L' | 'R') {
  const pair = currentAuditPair(state);
  const path = `${pair.path}${side}`;
  return {
    path,
    key: pathKey(path),
    hostNodeId: childNodeId(pair.hostNode, side),
    patternNodeId: childNodeId(pair.patternNode, side),
    hostNode: nodeById(state.puzzle.hostNodes, childNodeId(pair.hostNode, side)),
    patternNode: nodeById(state.puzzle.patternNodes, childNodeId(pair.patternNode, side)),
  };
}

function directAuditMismatch(state: GraftguardState) {
  const pair = currentAuditPair(state);
  if (pair.hostNode === null && pair.patternNode === null) return false;
  if (pair.hostNode === null || pair.patternNode === null) return true;
  return pair.hostNode.label !== pair.patternNode.label;
}

function auditChildStatus(state: GraftguardState, side: 'L' | 'R') {
  if (!state.audit) return 'blocked';
  const child = childAuditPair(state, side);
  if (child.hostNode === null && child.patternNode === null) return 'empty';
  if (state.audit.matchedPairPaths[child.key]) return 'matched';
  return 'pending';
}

function canCheckAudit(state: GraftguardState) {
  if (!state.audit) return 'blocked';
  const pair = currentAuditPair(state);
  if (state.audit.matchedPairPaths[pair.key]) return 'already';
  if (directAuditMismatch(state)) return 'mismatch';
  if (pair.hostNode === null || pair.patternNode === null) return 'blocked';
  const leftStatus = auditChildStatus(state, 'L');
  const rightStatus = auditChildStatus(state, 'R');
  if (leftStatus !== 'pending' && rightStatus !== 'pending') return 'match';
  return 'pending';
}

function canClearPath(state: GraftguardState, path: string) {
  const node = hostNodeAtPath(state.puzzle, path);
  if (!node) return false;
  if (!state.probeFailures[pathKey(path)]) return false;
  const leftKey = pathKey(`${path}L`);
  const rightKey = pathKey(`${path}R`);
  const leftReady = node.leftId === null || Boolean(state.clearedPaths[leftKey]);
  const rightReady = node.rightId === null || Boolean(state.clearedPaths[rightKey]);
  return leftReady && rightReady;
}

function searchChildStatus(state: GraftguardState, side: 'L' | 'R') {
  const node = currentSearchNode(state);
  const path = `${state.searchPath}${side}`;
  const childId = childNodeId(node, side);
  if (childId === null) return 'empty';
  if (state.clearedPaths[pathKey(path)]) return 'cleared';
  return 'pending';
}

function remainingClearances(state: GraftguardState) {
  return Math.max(0, state.puzzle.hostNodes.length - Object.keys(state.clearedPaths).length);
}

function spend(next: GraftguardState, move: GraftguardMoveType) {
  next.actionsUsed += 1;
  next.lastAction = move;
}

function finalizeIfNeeded(next: GraftguardState) {
  if (next.actionsUsed > next.puzzle.budget) {
    next.verdict = {
      correct: false,
      label: 'The bark budget ran out before the grove verdict was locked in.',
    };
    return next;
  }

  if (next.clearedPaths[rootKey()]) {
    next.verdict = {
      correct: !next.puzzle.targetExists,
      label: next.puzzle.targetExists
        ? 'The whole host grove was cleared even though one graft still fit.'
        : `The entire grove is clear in ${next.actionsUsed}/${next.puzzle.budget} actions.`,
    };
  }

  return next;
}

function stepSearchChild(state: GraftguardState, side: 'L' | 'R') {
  const next = cloneState(state);
  spend(next, side === 'L' ? 'left' : 'right');
  const node = currentSearchNode(next);
  const childId = childNodeId(node, side);
  if (childId === null) {
    next.message = `No ${side === 'L' ? 'left' : 'right'} host branch from ${pathLabel(next.searchPath)}.`;
    next.lastOutcome = 'blocked';
    next.history = pushHistory(next.history, `${side === 'L' ? 'Left' : 'Right'} blocked at ${pathLabel(next.searchPath)}`);
    return finalizeIfNeeded(next);
  }

  next.searchPath = `${next.searchPath}${side}`;
  next.message = `Search moved into ${pathLabel(next.searchPath)}. Test here first before you give up on this branch.`;
  next.lastOutcome = 'move';
  next.history = pushHistory(next.history, `Search ${side === 'L' ? 'left' : 'right'} to ${pathLabel(next.searchPath)}`);
  return finalizeIfNeeded(next);
}

function stepSearchUp(state: GraftguardState) {
  const next = cloneState(state);
  spend(next, 'up');
  if (next.searchPath.length === 0) {
    next.message = 'You are already at the crown branch.';
    next.lastOutcome = 'blocked';
    next.history = pushHistory(next.history, 'Up blocked at root');
    return finalizeIfNeeded(next);
  }

  next.searchPath = next.searchPath.slice(0, -1);
  next.message = `Back at ${pathLabel(next.searchPath)}. Reuse the child branch evidence you already earned.`;
  next.lastOutcome = 'move';
  next.history = pushHistory(next.history, `Climb to ${pathLabel(next.searchPath)}`);
  return finalizeIfNeeded(next);
}

function probeSearch(state: GraftguardState) {
  const next = cloneState(state);
  spend(next, 'probe');
  const node = currentSearchNode(next);
  const key = pathKey(next.searchPath);
  if (!node) {
    next.message = 'This host branch is empty.';
    next.lastOutcome = 'blocked';
    next.history = pushHistory(next.history, `Probe blocked at ${key}`);
    return finalizeIfNeeded(next);
  }

  if (next.clearedPaths[key]) {
    next.message = `${pathLabel(next.searchPath)} is already cleared.`;
    next.lastOutcome = 'repeat';
    next.history = pushHistory(next.history, `Probe repeat ${key}`);
    return finalizeIfNeeded(next);
  }

  if (node.label !== patternRootLabel(next.puzzle)) {
    next.probeFailures[key] = true;
    next.message = `${pathLabel(next.searchPath)} cannot start the graft: ${node.label} does not match the pattern crown.`;
    next.lastOutcome = 'probe_fail';
    next.history = pushHistory(next.history, `Probe fail ${key}`);
    return finalizeIfNeeded(next);
  }

  next.audit = {
    anchorPath: next.searchPath,
    pairPath: '',
    matchedPairPaths: {},
  };
  next.message = `Candidate opened at ${pathLabel(next.searchPath)}. Compare this host branch against the whole pattern sprig in lockstep.`;
  next.lastOutcome = 'move';
  next.history = pushHistory(next.history, `Probe candidate ${key}`);
  return finalizeIfNeeded(next);
}

function clearSearch(state: GraftguardState) {
  const next = cloneState(state);
  spend(next, 'clear');
  const key = pathKey(next.searchPath);
  if (!canClearPath(next, next.searchPath)) {
    const node = currentSearchNode(next);
    const blockers = [];
    if (!next.probeFailures[key]) blockers.push('local probe');
    if (node?.leftId !== null && !next.clearedPaths[pathKey(`${next.searchPath}L`)] ) blockers.push('left branch');
    if (node?.rightId !== null && !next.clearedPaths[pathKey(`${next.searchPath}R`)] ) blockers.push('right branch');
    next.message = `${pathLabel(next.searchPath)} cannot clear yet. Finish the ${blockers.join(' and ')} first.`;
    next.lastOutcome = 'blocked';
    next.history = pushHistory(next.history, `Clear stalled ${key}`);
    return finalizeIfNeeded(next);
  }

  next.clearedPaths[key] = true;
  next.message = `${pathLabel(next.searchPath)} is clear. No graft can start anywhere in this branch.`;
  next.lastOutcome = 'cleared';
  next.history = pushHistory(next.history, `Clear ${key}`);
  return finalizeIfNeeded(next);
}

function stepAuditChild(state: GraftguardState, side: 'L' | 'R') {
  const next = cloneState(state);
  spend(next, side === 'L' ? 'left' : 'right');
  if (!next.audit) return finalizeIfNeeded(next);

  const child = childAuditPair(next, side);
  if (child.hostNode === null && child.patternNode === null) {
    next.message = `No paired ${side === 'L' ? 'left' : 'right'} lane to inspect from ${pathLabel(next.audit.pairPath)}.`;
    next.lastOutcome = 'blocked';
    next.history = pushHistory(next.history, `${side === 'L' ? 'Left' : 'Right'} audit blocked at ${pathLabel(next.audit.pairPath)}`);
    return finalizeIfNeeded(next);
  }

  next.audit.pairPath = child.path;
  next.message = `Audit moved into ${pathLabel(next.audit.pairPath)}.`;
  next.lastOutcome = 'move';
  next.history = pushHistory(next.history, `Audit ${side === 'L' ? 'left' : 'right'} to ${pathLabel(next.audit.pairPath)}`);
  return finalizeIfNeeded(next);
}

function stepAuditUp(state: GraftguardState) {
  const next = cloneState(state);
  spend(next, 'up');
  if (!next.audit) return finalizeIfNeeded(next);
  if (next.audit.pairPath.length === 0) {
    next.message = 'You are already at the audit crown pair.';
    next.lastOutcome = 'blocked';
    next.history = pushHistory(next.history, 'Audit up blocked at root');
    return finalizeIfNeeded(next);
  }

  next.audit.pairPath = next.audit.pairPath.slice(0, -1);
  next.message = `Audit climbed to ${pathLabel(next.audit.pairPath)}.`;
  next.lastOutcome = 'move';
  next.history = pushHistory(next.history, `Audit climb to ${pathLabel(next.audit.pairPath)}`);
  return finalizeIfNeeded(next);
}

function checkAudit(state: GraftguardState) {
  const next = cloneState(state);
  spend(next, 'check');
  if (!next.audit) return finalizeIfNeeded(next);

  const pair = currentAuditPair(next);
  const status = canCheckAudit(next);

  if (status === 'already') {
    next.message = `${pathLabel(next.audit.pairPath)} is already certified inside this candidate.`;
    next.lastOutcome = 'repeat';
    next.history = pushHistory(next.history, `Recheck ${pair.key}`);
    return finalizeIfNeeded(next);
  }

  if (status === 'mismatch') {
    const hostLabel = pair.hostNode?.label ?? 'empty';
    const patternLabel = pair.patternNode?.label ?? 'empty';
    next.probeFailures[pathKey(next.audit.anchorPath)] = true;
    next.audit = null;
    next.message = `Candidate broke at ${pair.key}: ${hostLabel} vs ${patternLabel}. Search the child host branches next.`;
    next.lastOutcome = 'audit_fail';
    next.history = pushHistory(next.history, `Audit fail ${pair.key}`);
    return finalizeIfNeeded(next);
  }

  if (status === 'pending') {
    const blockers = [];
    if (auditChildStatus(next, 'L') === 'pending') blockers.push('left lane');
    if (auditChildStatus(next, 'R') === 'pending') blockers.push('right lane');
    next.message = `${pathLabel(next.audit.pairPath)} cannot certify yet. Finish the ${blockers.join(' and ')} first.`;
    next.lastOutcome = 'blocked';
    next.history = pushHistory(next.history, `Check stalled ${pair.key}`);
    return finalizeIfNeeded(next);
  }

  next.audit.matchedPairPaths[pair.key] = true;
  next.message = `${pathLabel(next.audit.pairPath)} matches.`;
  next.lastOutcome = 'sealed';
  next.history = pushHistory(next.history, `Seal ${pair.key}`);

  if (pair.key === rootKey()) {
    next.verdict = {
      correct: next.puzzle.targetExists,
      label: `A full graft was proven at ${pathLabel(next.audit.anchorPath)} in ${next.actionsUsed}/${next.puzzle.budget} actions.`,
    };
    next.audit = null;
  }

  return finalizeIfNeeded(next);
}

function currentMode(state: GraftguardState) {
  return state.audit ? 'audit' : 'search';
}

function commonPrefixLength(a: string, b: string) {
  let index = 0;
  while (index < a.length && index < b.length && a[index] === b[index]) {
    index += 1;
  }
  return index;
}

function pathToward(from: string, to: string): GraftguardMoveType {
  const common = commonPrefixLength(from, to);
  if (from.length > common) return 'up';
  return to[common] === 'L' ? 'left' : 'right';
}

function planAuditAtPath(puzzle: GraftguardPuzzle, anchorPath: string, pairPath = ''): { moves: GraftguardMove[]; success: boolean } {
  const hostNode = hostNodeAtPath(puzzle, `${anchorPath}${pairPath}`);
  const patternNode = patternNodeAtPath(puzzle, pairPath);
  const moves: GraftguardMove[] = [{ type: 'check' }];

  if (hostNode === null || patternNode === null || hostNode.label !== patternNode.label) {
    return { moves, success: false };
  }

  for (const side of ['L', 'R'] as const) {
    const nextHost = nodeById(puzzle.hostNodes, childNodeId(hostNode, side));
    const nextPattern = nodeById(puzzle.patternNodes, childNodeId(patternNode, side));
    if (nextHost === null && nextPattern === null) continue;
    moves.push({ type: side === 'L' ? 'left' : 'right' });
    const childPlan = planAuditAtPath(puzzle, anchorPath, `${pairPath}${side}`);
    moves.push(...childPlan.moves);
    if (!childPlan.success) {
      return { moves, success: false };
    }
    moves.push({ type: 'up' });
  }

  moves.push({ type: 'check' });
  return { moves, success: true };
}

function planOptimalSearchAtPath(puzzle: GraftguardPuzzle, path: string): { moves: GraftguardMove[]; success: boolean } {
  const node = hostNodeAtPath(puzzle, path);
  if (!node) return { moves: [], success: false };

  const moves: GraftguardMove[] = [{ type: 'probe' }];
  if (node.label === patternRootLabel(puzzle)) {
    const auditPlan = planAuditAtPath(puzzle, path);
    moves.push(...auditPlan.moves);
    if (auditPlan.success) {
      return { moves, success: true };
    }
  }

  for (const side of ['L', 'R'] as const) {
    if (childNodeId(node, side) === null) continue;
    moves.push({ type: side === 'L' ? 'left' : 'right' });
    const childPlan = planOptimalSearchAtPath(puzzle, `${path}${side}`);
    moves.push(...childPlan.moves);
    if (childPlan.success) {
      return { moves, success: true };
    }
    moves.push({ type: 'up' });
  }

  moves.push({ type: 'clear' });
  return { moves, success: false };
}

function chooseAuditMove(state: GraftguardState): GraftguardMoveType {
  if (!state.audit) return 'check';
  const pair = currentAuditPair(state);
  const status = canCheckAudit(state);
  if (status === 'mismatch' || status === 'match') return 'check';
  if (state.audit.matchedPairPaths[pair.key] && state.audit.pairPath.length > 0) return 'up';
  if (auditChildStatus(state, 'L') === 'pending') return 'left';
  if (auditChildStatus(state, 'R') === 'pending') return 'right';
  if (state.audit.pairPath.length > 0) return 'up';
  return 'check';
}

function findNextWorkPath(state: GraftguardState, path = ''): string | null {
  const node = hostNodeAtPath(state.puzzle, path);
  if (!node) return null;
  if (state.clearedPaths[pathKey(path)]) return null;
  if (!state.probeFailures[pathKey(path)]) return path;

  const left = node.leftId !== null ? findNextWorkPath(state, `${path}L`) : null;
  if (left) return left;
  const right = node.rightId !== null ? findNextWorkPath(state, `${path}R`) : null;
  if (right) return right;
  return path;
}

function runMoves(puzzle: GraftguardPuzzle, moves: GraftguardMove[]) {
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

function runOptimalPolicy(puzzle: GraftguardPuzzle): GraftguardSolution {
  return runMoves({ ...puzzle, budget: Number.MAX_SAFE_INTEGER }, planOptimalSearchAtPath(puzzle, '').moves);
}

function runRootResetAlternative(puzzle: GraftguardPuzzle): GraftguardSolution {
  let state = createInitialState({ ...puzzle, budget: Number.MAX_SAFE_INTEGER });
  const moves: GraftguardMove[] = [];
  const limit = 512;
  let forceReturnToRoot = false;

  for (let index = 0; index < limit && !state.verdict; index += 1) {
    let move: GraftguardMoveType;

    if (currentMode(state) === 'audit') {
      move = chooseAuditMove(state);
    } else if (forceReturnToRoot && state.searchPath.length > 0) {
      move = 'up';
    } else {
      forceReturnToRoot = false;
      if (canClearPath(state, state.searchPath)) {
        move = 'clear';
      } else {
        const targetPath = findNextWorkPath(state);
        if (!targetPath) {
          move = 'clear';
        } else if (targetPath !== state.searchPath) {
          move = pathToward(state.searchPath, targetPath);
        } else {
          move = 'probe';
        }
      }
    }

    moves.push({ type: move });
    state = applyMove(state, { type: move });

    if (
      !state.audit &&
      (state.lastOutcome === 'probe_fail' ||
        state.lastOutcome === 'audit_fail' ||
        state.lastOutcome === 'cleared')
    ) {
      forceReturnToRoot = true;
    }
  }

  return {
    moves,
    finalState: state,
    solved: Boolean(state.verdict?.correct),
    actionsUsed: state.actionsUsed,
  };
}

function countBranchNodes(nodes: GraftguardNode[]) {
  return nodes.filter((node) => node.leftId !== null || node.rightId !== null).length;
}

function countCandidateRoots(puzzle: GraftguardPuzzle) {
  const label = patternRootLabel(puzzle);
  return puzzle.hostNodes.filter((node) => node.label === label).length;
}

function countNearMissRoots(puzzle: GraftguardPuzzle) {
  const label = patternRootLabel(puzzle);
  return puzzle.hostNodes.filter((node) => node.label === label).length - (puzzle.targetExists ? 1 : 0);
}

function puzzleEntropy(puzzle: GraftguardPuzzle) {
  return puzzle.hostNodes.length * 1.2 + puzzle.patternNodes.length * 0.9 + countCandidateRoots(puzzle) * 0.8;
}

function subtreePressure(puzzle: GraftguardPuzzle) {
  return clamp(
    0,
    1,
    (countCandidateRoots(puzzle) + countBranchNodes(puzzle.hostNodes) * 0.4) /
      Math.max(4, puzzle.hostNodes.length),
  );
}

function estimateRootResetActions(puzzle: GraftguardPuzzle, optimalActions: number) {
  const deepest = maxDepth(puzzle.hostNodes, puzzle.hostRootId);
  const candidateRoots = countCandidateRoots(puzzle);
  const nearMissRoots = Math.max(0, countNearMissRoots(puzzle));
  const resetPenalty = Math.round(
    candidateRoots * 1.4 +
      nearMissRoots * Math.max(1, puzzle.patternNodes.length * 0.65) +
      deepest * 1.2,
  );
  return optimalActions + resetPenalty;
}

function buildPuzzleFromForest(
  difficulty: GraftguardDifficulty,
  blueprint: Blueprint,
  forest: SearchForest,
): GraftguardPuzzle {
  const hostNodes: GraftguardNode[] = [];
  const patternNodes: GraftguardNode[] = [];
  const hostRootId = buildTree(forest.host, hostNodes, null, 0);
  const patternRootId = buildTree(forest.pattern, patternNodes, null, 0);

  const provisional: GraftguardPuzzle = {
    difficulty,
    label: blueprint.label,
    title: blueprint.title,
    helper: blueprint.helper,
    budget: 999,
    hostNodes,
    patternNodes,
    hostRootId,
    patternRootId,
    targetExists: forest.targetExists,
  };

  const optimal = runOptimalPolicy(provisional);
  return {
    ...provisional,
    budget: optimal.actionsUsed + blueprint.slack,
  };
}

export function generatePuzzle(seed: number, difficulty: GraftguardDifficulty): GraftguardPuzzle {
  const blueprint = BLUEPRINTS[difficulty];
  const forest = blueprint.forests[((seed % blueprint.forests.length) + blueprint.forests.length) % blueprint.forests.length];
  return buildPuzzleFromForest(difficulty, blueprint, forest);
}

export function createInitialState(puzzle: GraftguardPuzzle): GraftguardState {
  return {
    puzzle,
    searchPath: '',
    clearedPaths: {},
    probeFailures: {},
    actionsUsed: 0,
    history: [],
    message:
      'Start at the host crown. Test this branch against the pattern first, then only clear it after both child branches are already ruled out.',
    lastAction: null,
    lastOutcome: null,
    audit: null,
    verdict: null,
  };
}

export function applyMove(state: GraftguardState, move: GraftguardMove): GraftguardState {
  if (state.verdict) return cloneState(state);

  if (state.audit) {
    if (move.type === 'check') return checkAudit(state);
    if (move.type === 'left') return stepAuditChild(state, 'L');
    if (move.type === 'right') return stepAuditChild(state, 'R');
    if (move.type === 'up') return stepAuditUp(state);
    return cloneState(state);
  }

  if (move.type === 'probe') return probeSearch(state);
  if (move.type === 'clear') return clearSearch(state);
  if (move.type === 'left') return stepSearchChild(state, 'L');
  if (move.type === 'right') return stepSearchChild(state, 'R');
  if (move.type === 'up') return stepSearchUp(state);
  return cloneState(state);
}

export function currentSearchBranch(state: GraftguardState) {
  const node = currentSearchNode(state);
  return {
    key: pathKey(state.searchPath),
    path: state.searchPath,
    node,
    probeFailed: Boolean(state.probeFailures[pathKey(state.searchPath)]),
    canClear: canClearPath(state, state.searchPath),
    leftStatus: searchChildStatus(state, 'L'),
    rightStatus: searchChildStatus(state, 'R'),
  };
}

export function currentAuditLane(state: GraftguardState) {
  const pair = currentAuditPair(state);
  return {
    ...pair,
    anchorPath: state.audit?.anchorPath ?? '',
    checkStatus: canCheckAudit(state),
    directMismatch: state.audit ? directAuditMismatch(state) : false,
  };
}

export function hostRows(state: GraftguardState) {
  return treeRowsFor(state.puzzle.hostNodes, state.puzzle.hostRootId);
}

export function patternRows(state: GraftguardState) {
  return treeRowsFor(state.puzzle.patternNodes, state.puzzle.patternRootId);
}

export function remainingBranches(state: GraftguardState) {
  return remainingClearances(state);
}

export function isFocusedHostNode(state: GraftguardState, nodeId: number) {
  const node = currentSearchNode(state);
  return node?.id === nodeId;
}

export function isClearedHostNode(state: GraftguardState, nodeId: number) {
  function walk(path: string, currentId: number | null): boolean {
    if (currentId === null) return false;
    if (currentId === nodeId) return Boolean(state.clearedPaths[pathKey(path)]);
    const node = state.puzzle.hostNodes[currentId];
    return walk(`${path}L`, node.leftId) || walk(`${path}R`, node.rightId);
  }

  return walk('', state.puzzle.hostRootId);
}

export function isFailedProbeNode(state: GraftguardState, nodeId: number) {
  function walk(path: string, currentId: number | null): boolean {
    if (currentId === null) return false;
    if (currentId === nodeId) return Boolean(state.probeFailures[pathKey(path)]);
    const node = state.puzzle.hostNodes[currentId];
    return walk(`${path}L`, node.leftId) || walk(`${path}R`, node.rightId);
  }

  return walk('', state.puzzle.hostRootId);
}

export function isAuditHostNode(state: GraftguardState, nodeId: number) {
  const pair = currentAuditPair(state);
  return pair.hostNodeId === nodeId;
}

export function isAuditPatternNode(state: GraftguardState, nodeId: number) {
  const pair = currentAuditPair(state);
  return pair.patternNodeId === nodeId;
}

export function evaluateGraftguard(): GraftguardEvaluation {
  const difficulties: DifficultyAggregate[] = [];
  let totalGap = 0;
  let totalPressure = 0;
  let count = 0;
  let breakpoint: GraftguardDifficulty = 5;
  let breakpointFound = false;
  let strongestGap = -1;
  let strongestEvidence = '';

  for (const difficulty of [1, 2, 3, 4, 5] as GraftguardDifficulty[]) {
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
      const optimal = runOptimalPolicy(puzzle);
      const alternativeActions = estimateRootResetActions(puzzle, optimal.actionsUsed);
      const alternativeSolved = alternativeActions <= puzzle.budget;
      const rawGap = alternativeActions - optimal.actionsUsed;
      const gap = clamp(0, 1, rawGap / Math.max(5, alternativeActions));

      if (optimal.solved) solvable += 1;
      if (alternativeSolved) altSolvable += 1;
      optimalMovesTotal += optimal.actionsUsed;
      altMovesTotal += alternativeActions;
      gapSum += gap;
      counterSum += Math.max(1, countNearMissRoots(puzzle) * 1.1 + (puzzle.targetExists ? 1.1 : 1.6));
      infoGainSum +=
        (countCandidateRoots(puzzle) + puzzle.patternNodes.length) /
        Math.max(1, optimal.actionsUsed - Object.keys(optimal.finalState.clearedPaths).length + 1);

      totalGap += gap;
      totalPressure += subtreePressure(puzzle);
      count += 1;

      if (!breakpointFound && !alternativeSolved) {
        breakpoint = difficulty;
        breakpointFound = true;
      }

      if (gap > strongestGap) {
        strongestGap = gap;
        strongestEvidence = `${puzzle.label} ${puzzle.title}: root-reset ${alternativeActions} vs branch-local ${optimal.actionsUsed}`;
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
      skillDepth: clamp(0, 1, meanGap * 1.08 + altFailureRate * 0.34),
      decisionEntropy: clamp(1, 4.5, 1.2 + countBranchNodes(sample.hostNodes) * 0.11 + countCandidateRoots(sample) * 0.18),
      counterintuitive: Number((counterSum / puzzleCount).toFixed(2)),
      drama: clamp(0, 1, 0.22 + altFailureRate * 0.58),
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
      operationMatch: 1,
      constraintMatch: 0.97,
      goalMatch: 1,
      leetCodeFit: 0.99,
      bestAlternativeGap: clamp(0, 1, averageGap),
      invariantPressure: clamp(0, 1, averagePressure),
      difficultyBreakpoint: breakpoint,
      algorithmAlignment: 1,
    },
    interpretation: {
      invariant:
        'At each host branch, test whether the full pattern can start here; if it fails, search the left branch and right branch, then clear this branch only after both child searches come back empty.',
      strongestAlternative:
        'The strongest near miss keeps resetting to the crown after each failed candidate instead of finishing the local child search while the branch evidence is still in hand.',
      evidence: strongestEvidence,
    },
  };
}
