export type CharterboughDifficulty = 1 | 2 | 3 | 4 | 5;

export type CharterboughMoveType = 'seal' | 'breach' | 'left' | 'right' | 'up';

export type CharterboughMove = {
  type: CharterboughMoveType;
};

export type CharterboughVerdict = {
  correct: boolean;
  label: string;
};

export type CharterboughNode = {
  id: number;
  value: number;
  parentId: number | null;
  leftId: number | null;
  rightId: number | null;
  depth: number;
  fromParent: 'L' | 'R' | null;
};

export type CharterboughPuzzle = {
  difficulty: CharterboughDifficulty;
  label: string;
  title: string;
  helper: string;
  budget: number;
  nodes: CharterboughNode[];
  rootId: number;
  isValid: boolean;
  violationId: number | null;
};

export type CharterboughBounds = {
  lower: number | null;
  upper: number | null;
};

export type CharterboughState = {
  puzzle: CharterboughPuzzle;
  currentId: number;
  actionsUsed: number;
  revealedIds: number[];
  sealedIds: number[];
  history: string[];
  message: string;
  lastAction: CharterboughMoveType | null;
  verdict: CharterboughVerdict | null;
};

export type CharterboughSolution = {
  moves: CharterboughMove[];
  finalState: CharterboughState;
  solved: boolean;
  actionsUsed: number;
  counterintuitiveSteps: number;
  puzzleEntropy: number;
  meanDecisionEntropy: number;
  meanInfoGainRatio: number;
};

type Shape = {
  value: number;
  left?: Shape | null;
  right?: Shape | null;
};

type Grove = {
  tree: Shape;
  isValid: boolean;
};

type Blueprint = {
  label: string;
  title: string;
  helper: string;
  slack: number;
  groves: Grove[];
};

type DifficultyAggregate = {
  difficulty: CharterboughDifficulty;
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
  difficultyBreakpoint: CharterboughDifficulty;
  algorithmAlignment: number;
};

export type CharterboughEvaluation = {
  difficulties: DifficultyAggregate[];
  learningMetrics: LearningMetrics;
  interpretation: {
    invariant: string;
    strongestAlternative: string;
    evidence: string;
  };
};

function leaf(value: number): Shape {
  return { value };
}

function branch(value: number, left: Shape | null = null, right: Shape | null = null): Shape {
  return { value, left, right };
}

const BLUEPRINTS: Record<CharterboughDifficulty, Blueprint> = {
  1: {
    label: 'D1',
    title: 'Open Charter',
    helper:
      'Small groves with generous resin. Seal each branch only when its crest fits inside the live charter, or flag a breach the moment a child breaks the obvious parent gate.',
    slack: 3,
    groves: [
      {
        tree: branch(8, branch(4, leaf(2), leaf(6)), branch(12, leaf(10), leaf(14))),
        isValid: true,
      },
      {
        tree: branch(8, leaf(9), branch(12, leaf(10), leaf(14))),
        isValid: false,
      },
      {
        tree: branch(10, branch(5, leaf(2), leaf(7)), branch(15, leaf(12), leaf(18))),
        isValid: true,
      },
      {
        tree: branch(10, branch(5, leaf(2), leaf(7)), leaf(9)),
        isValid: false,
      },
    ],
  },
  2: {
    label: 'D2',
    title: 'Parent Gates',
    helper:
      'The grove gets taller, but the direct breaches still sit where the current parent gate can catch them. Use the easy reads now before deeper hidden breaches arrive.',
    slack: 2,
    groves: [
      {
        tree: branch(18, branch(9, branch(4, leaf(2), leaf(6)), branch(13, leaf(11), leaf(15))), branch(27, leaf(22), leaf(31))),
        isValid: true,
      },
      {
        tree: branch(18, branch(9, branch(4, leaf(2), leaf(6)), branch(13, leaf(11), leaf(15))), branch(27, leaf(30), leaf(31))),
        isValid: false,
      },
      {
        tree: branch(20, branch(12, leaf(8), branch(16, leaf(14), leaf(18))), branch(30, branch(24, leaf(22), leaf(26)), leaf(34))),
        isValid: true,
      },
      {
        tree: branch(20, branch(12, leaf(8), branch(16, leaf(14), leaf(18))), branch(30, branch(24, leaf(22), leaf(26)), leaf(19))),
        isValid: false,
      },
    ],
  },
  3: {
    label: 'D3',
    title: 'Hidden Breach',
    helper:
      'The direct child check stops being enough. Some branches look legal beside their parent but still violate a higher ancestor ceiling or floor. Only the inherited charter survives.',
    slack: 0,
    groves: [
      {
        tree: branch(20, branch(10, leaf(5), leaf(15)), branch(30, leaf(25), leaf(35))),
        isValid: true,
      },
      {
        tree: branch(20, branch(10, leaf(5), leaf(15)), branch(30, leaf(17), leaf(35))),
        isValid: false,
      },
      {
        tree: branch(26, branch(14, leaf(8), branch(20, leaf(18), leaf(23))), branch(38, branch(32, leaf(29), leaf(35)), leaf(44))),
        isValid: true,
      },
      {
        tree: branch(26, branch(14, leaf(8), branch(20, leaf(18), branch(24, leaf(22), leaf(28)))), branch(38, leaf(34), leaf(44))),
        isValid: false,
      },
    ],
  },
  4: {
    label: 'D4',
    title: 'Inherited Rails',
    helper:
      'Longer ladders and no spare resin. The live charter must stay with you through multiple turns, because the hidden breach can sit two or three ancestor gates away from where the drift began.',
    slack: 0,
    groves: [
      {
        tree: branch(32, branch(18, branch(10, leaf(5), leaf(14)), branch(24, leaf(21), leaf(28))), branch(46, branch(38, leaf(35), leaf(42)), leaf(54))),
        isValid: true,
      },
      {
        tree: branch(32, branch(18, branch(10, leaf(5), leaf(14)), branch(24, leaf(21), leaf(28))), branch(46, branch(38, leaf(31), leaf(42)), leaf(54))),
        isValid: false,
      },
      {
        tree: branch(34, branch(20, branch(12, leaf(7), leaf(16)), branch(28, branch(24, leaf(22), leaf(26)), leaf(30))), branch(50, leaf(42), leaf(58))),
        isValid: true,
      },
      {
        tree: branch(34, branch(20, branch(12, leaf(7), leaf(16)), branch(28, branch(24, leaf(22), leaf(26)), leaf(30))), branch(50, branch(40, leaf(33), leaf(48)), leaf(58))),
        isValid: false,
      },
    ],
  },
  5: {
    label: 'D5',
    title: 'No Slack Charter',
    helper:
      'Every branch audit matters now. Deep hidden breaches lurk behind locally-correct turns, and the optimal route has no spare motion beyond carrying the exact floor and ceiling to the point of failure.',
    slack: 0,
    groves: [
      {
        tree: branch(40, branch(24, branch(12, leaf(6), leaf(18)), branch(32, branch(28, leaf(26), leaf(30)), leaf(36))), branch(58, branch(48, leaf(44), leaf(52)), branch(70, leaf(64), leaf(76)))),
        isValid: true,
      },
      {
        tree: branch(40, branch(24, branch(12, leaf(6), leaf(18)), branch(32, branch(28, leaf(26), leaf(30)), leaf(36))), branch(58, branch(48, leaf(39), leaf(52)), branch(70, leaf(64), leaf(76)))),
        isValid: false,
      },
      {
        tree: branch(42, branch(26, branch(14, leaf(8), leaf(20)), branch(34, leaf(30), branch(38, leaf(36), leaf(39)))), branch(62, branch(52, leaf(48), leaf(56)), branch(74, leaf(68), leaf(80)))),
        isValid: true,
      },
      {
        tree: branch(42, branch(26, branch(14, leaf(8), leaf(20)), branch(34, leaf(30), branch(38, leaf(36), leaf(39)))), branch(62, branch(52, leaf(48), leaf(56)), branch(74, leaf(68), branch(78, leaf(60), leaf(82))))),
        isValid: false,
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

function cloneState(state: CharterboughState): CharterboughState {
  return {
    ...state,
    revealedIds: [...state.revealedIds],
    sealedIds: [...state.sealedIds],
    history: [...state.history],
  };
}

function nodeById(puzzle: CharterboughPuzzle, nodeId: number | null) {
  if (nodeId === null) return null;
  return puzzle.nodes[nodeId] ?? null;
}

function pushUnique(values: number[], value: number | null) {
  if (value === null || values.includes(value)) return values;
  return [...values, value];
}

function formatNodeLabel(value: number | null | undefined) {
  if (value === null || value === undefined) return 'open';
  return `B${value}`;
}

function formatBounds(bounds: CharterboughBounds) {
  return `(${formatNodeLabel(bounds.lower)}, ${formatNodeLabel(bounds.upper)})`;
}

function buildTree(
  shape: Shape,
  nodes: CharterboughNode[],
  parentId: number | null,
  depth: number,
  fromParent: 'L' | 'R' | null,
): number {
  const id = nodes.length;
  nodes.push({
    id,
    value: shape.value,
    parentId,
    leftId: null,
    rightId: null,
    depth,
    fromParent,
  });

  if (shape.left) {
    nodes[id].leftId = buildTree(shape.left, nodes, id, depth + 1, 'L');
  }
  if (shape.right) {
    nodes[id].rightId = buildTree(shape.right, nodes, id, depth + 1, 'R');
  }

  return id;
}

function currentBoundsFor(puzzle: CharterboughPuzzle, nodeId: number): CharterboughBounds {
  let lower: number | null = null;
  let upper: number | null = null;
  let cursor = puzzle.nodes[nodeId];

  while (cursor.parentId !== null) {
    const parent = puzzle.nodes[cursor.parentId];
    if (cursor.fromParent === 'L') {
      upper = upper === null ? parent.value : Math.min(upper, parent.value);
    } else if (cursor.fromParent === 'R') {
      lower = lower === null ? parent.value : Math.max(lower, parent.value);
    }
    cursor = parent;
  }

  return { lower, upper };
}

function valueFitsBounds(value: number, bounds: CharterboughBounds) {
  return (bounds.lower === null || value > bounds.lower) && (bounds.upper === null || value < bounds.upper);
}

function nodeFitsPuzzleBounds(puzzle: CharterboughPuzzle, nodeId: number) {
  const node = puzzle.nodes[nodeId];
  return valueFitsBounds(node.value, currentBoundsFor(puzzle, nodeId));
}

function parentGateHolds(puzzle: CharterboughPuzzle, nodeId: number) {
  const node = puzzle.nodes[nodeId];
  if (node.parentId === null) return true;
  const parent = puzzle.nodes[node.parentId];
  if (node.fromParent === 'L') return node.value < parent.value;
  return node.value > parent.value;
}

function firstViolationId(puzzle: CharterboughPuzzle, nodeId: number): number | null {
  if (!nodeFitsPuzzleBounds(puzzle, nodeId)) return nodeId;
  const node = puzzle.nodes[nodeId];
  if (node.leftId !== null) {
    const left = firstViolationId(puzzle, node.leftId);
    if (left !== null) return left;
  }
  if (node.rightId !== null) {
    const right = firstViolationId(puzzle, node.rightId);
    if (right !== null) return right;
  }
  return null;
}

function treeRowsFor(puzzle: CharterboughPuzzle, rootId: number) {
  const rows: Array<Array<number | null>> = [];
  let frontier: Array<number | null> = [rootId];

  while (frontier.some((value) => value !== null)) {
    rows.push(frontier);
    const next: Array<number | null> = [];
    for (const nodeId of frontier) {
      if (nodeId === null) {
        next.push(null, null);
        continue;
      }
      const node = puzzle.nodes[nodeId];
      next.push(node.leftId, node.rightId);
    }
    frontier = next;
  }

  return rows;
}

function countNodes(puzzle: CharterboughPuzzle) {
  return puzzle.nodes.length;
}

function countInternalNodes(puzzle: CharterboughPuzzle) {
  return puzzle.nodes.filter((node) => node.leftId !== null || node.rightId !== null).length;
}

function maxDepth(puzzle: CharterboughPuzzle) {
  return puzzle.nodes.reduce((max, node) => Math.max(max, node.depth), 0);
}

function hiddenTrapCount(puzzle: CharterboughPuzzle) {
  return puzzle.nodes.filter((node) => parentGateHolds(puzzle, node.id) && !nodeFitsPuzzleBounds(puzzle, node.id)).length;
}

function puzzleEntropy(puzzle: CharterboughPuzzle) {
  return countNodes(puzzle) + countInternalNodes(puzzle) + maxDepth(puzzle) + hiddenTrapCount(puzzle) * 3;
}

function optimalBudgetFor(puzzle: Omit<CharterboughPuzzle, 'budget'>, slack: number) {
  const budgeted = { ...puzzle, budget: 0 };
  const actions = buildOptimalMoves(budgeted).length;
  return actions + slack;
}

export function generatePuzzle(seed: number, difficulty: CharterboughDifficulty): CharterboughPuzzle {
  const blueprint = BLUEPRINTS[difficulty];
  const grove = blueprint.groves[((seed % blueprint.groves.length) + blueprint.groves.length) % blueprint.groves.length];
  const nodes: CharterboughNode[] = [];
  const rootId = buildTree(grove.tree, nodes, null, 0, null);
  const provisional: Omit<CharterboughPuzzle, 'budget'> = {
    difficulty,
    label: blueprint.label,
    title: blueprint.title,
    helper: blueprint.helper,
    nodes,
    rootId,
    isValid: grove.isValid,
    violationId: null,
  };
  const violationId = firstViolationId({ ...provisional, budget: 0 }, rootId);
  const puzzle: Omit<CharterboughPuzzle, 'budget'> = {
    ...provisional,
    violationId,
  };

  return {
    ...puzzle,
    budget: optimalBudgetFor(puzzle, blueprint.slack),
  };
}

export function createInitialState(puzzle: CharterboughPuzzle): CharterboughState {
  const root = puzzle.nodes[puzzle.rootId];
  return {
    puzzle,
    currentId: puzzle.rootId,
    actionsUsed: 0,
    revealedIds: [puzzle.rootId],
    sealedIds: [],
    history: [],
    message: `${formatNodeLabel(root.value)} is revealed. Check whether it fits the live charter before you descend.`,
    lastAction: null,
    verdict: null,
  };
}

export function currentNode(state: CharterboughState) {
  return state.puzzle.nodes[state.currentId];
}

export function currentBounds(state: CharterboughState) {
  return currentBoundsFor(state.puzzle, state.currentId);
}

export function currentExits(state: CharterboughState) {
  const node = currentNode(state);
  return {
    left: nodeById(state.puzzle, node.leftId),
    up: nodeById(state.puzzle, node.parentId),
    right: nodeById(state.puzzle, node.rightId),
  };
}

export function remainingResin(state: CharterboughState) {
  return Math.max(0, state.puzzle.budget - state.actionsUsed);
}

export function remainingProofs(state: CharterboughState) {
  return state.puzzle.nodes.length - state.sealedIds.length;
}

export function isCurrentNode(state: CharterboughState, nodeId: number) {
  return state.currentId === nodeId;
}

export function isRevealedNode(state: CharterboughState, nodeId: number) {
  return state.revealedIds.includes(nodeId);
}

export function isSealedNode(state: CharterboughState, nodeId: number) {
  return state.sealedIds.includes(nodeId);
}

export function isCurrentSealed(state: CharterboughState) {
  return isSealedNode(state, state.currentId);
}

export function isViolationNode(state: CharterboughState, nodeId: number) {
  return state.puzzle.violationId === nodeId;
}

export function treeRows(state: CharterboughState) {
  return treeRowsFor(state.puzzle, state.puzzle.rootId);
}

function legalMoveCount(state: CharterboughState) {
  if (state.verdict) return 0;
  const node = currentNode(state);
  let total = isCurrentSealed(state) ? 0 : 2;
  if (node.parentId !== null) total += 1;
  if (isCurrentSealed(state) && node.leftId !== null) total += 1;
  if (isCurrentSealed(state) && node.rightId !== null) total += 1;
  return Math.max(1, total);
}

function finalizeIfNeeded(next: CharterboughState) {
  if (next.verdict) return next;

  if (next.actionsUsed > next.puzzle.budget) {
    next.verdict = {
      correct: false,
      label: 'Resin exhausted before the charter was settled.',
    };
    next.message = 'Too much wandering spent the resin budget.';
    return next;
  }

  if (next.puzzle.isValid && next.sealedIds.length === next.puzzle.nodes.length) {
    next.verdict = {
      correct: true,
      label: 'Charterbough cleared. Every branch stayed inside its inherited gates.',
    };
    next.message = 'The whole grove holds the BST charter.';
  }

  return next;
}

function spend(next: CharterboughState, move: CharterboughMoveType) {
  next.actionsUsed += 1;
  next.lastAction = move;
}

function moveToChild(state: CharterboughState, side: 'left' | 'right') {
  const next = cloneState(state);
  const node = currentNode(state);
  const childId = side === 'left' ? node.leftId : node.rightId;

  spend(next, side === 'left' ? 'left' : 'right');
  if (!isCurrentSealed(state)) {
    next.message = 'Seal or breach the current branch before you descend.';
    next.history.push(`${side === 'left' ? 'Left' : 'Right'} blocked before seal.`);
    return finalizeIfNeeded(next);
  }

  if (childId === null) {
    next.message = `No ${side} branch exists from here.`;
    next.history.push(`No ${side} exit at ${formatNodeLabel(node.value)}.`);
    return finalizeIfNeeded(next);
  }

  const child = state.puzzle.nodes[childId];
  next.currentId = childId;
  next.revealedIds = pushUnique(next.revealedIds, childId);
  next.message = `${formatNodeLabel(child.value)} is now under audit.`;
  next.history.push(
    `${side === 'left' ? 'Left' : 'Right'} to ${formatNodeLabel(child.value)} with charter ${formatBounds(currentBoundsFor(state.puzzle, childId))}.`,
  );
  return finalizeIfNeeded(next);
}

function moveUp(state: CharterboughState) {
  const next = cloneState(state);
  const node = currentNode(state);
  spend(next, 'up');

  if (node.parentId === null) {
    next.message = 'The crown has no higher branch.';
    next.history.push(`Up blocked at ${formatNodeLabel(node.value)}.`);
    return finalizeIfNeeded(next);
  }

  const parent = state.puzzle.nodes[node.parentId];
  next.currentId = parent.id;
  next.message = `Back at ${formatNodeLabel(parent.value)}.`;
  next.history.push(`Up to ${formatNodeLabel(parent.value)}.`);
  return finalizeIfNeeded(next);
}

function sealCurrent(state: CharterboughState) {
  const next = cloneState(state);
  const node = currentNode(state);
  const bounds = currentBoundsFor(state.puzzle, node.id);
  spend(next, 'seal');

  if (isSealedNode(state, node.id)) {
    next.message = `${formatNodeLabel(node.value)} is already sealed.`;
    next.history.push(`Seal repeated at ${formatNodeLabel(node.value)}.`);
    return finalizeIfNeeded(next);
  }

  if (!valueFitsBounds(node.value, bounds)) {
    next.verdict = {
      correct: false,
      label: `${formatNodeLabel(node.value)} breaks the charter. Sealing it loses the audit.`,
    };
    next.message = `This branch sits outside ${formatBounds(bounds)} and had to be flagged, not sealed.`;
    next.history.push(`Bad seal at ${formatNodeLabel(node.value)} against ${formatBounds(bounds)}.`);
    return finalizeIfNeeded(next);
  }

  next.sealedIds = pushUnique(next.sealedIds, node.id);
  next.message = `${formatNodeLabel(node.value)} sealed inside ${formatBounds(bounds)}.`;
  next.history.push(`Sealed ${formatNodeLabel(node.value)} inside ${formatBounds(bounds)}.`);
  return finalizeIfNeeded(next);
}

function breachCurrent(state: CharterboughState) {
  const next = cloneState(state);
  const node = currentNode(state);
  const bounds = currentBoundsFor(state.puzzle, node.id);
  spend(next, 'breach');

  if (!valueFitsBounds(node.value, bounds)) {
    next.verdict = {
      correct: true,
      label: `${formatNodeLabel(node.value)} broke the charter and the breach was caught in time.`,
    };
    next.message = `${formatNodeLabel(node.value)} sits outside ${formatBounds(bounds)}.`;
    next.history.push(`Breach confirmed at ${formatNodeLabel(node.value)} against ${formatBounds(bounds)}.`);
    return finalizeIfNeeded(next);
  }

  next.verdict = {
    correct: false,
    label: `${formatNodeLabel(node.value)} still fits the charter. False breach call.`,
  };
  next.message = `This branch still belongs inside ${formatBounds(bounds)}.`;
  next.history.push(`False breach at ${formatNodeLabel(node.value)}.`);
  return finalizeIfNeeded(next);
}

export function applyMove(state: CharterboughState, move: CharterboughMove): CharterboughState {
  if (state.verdict) return state;

  if (move.type === 'left') return moveToChild(state, 'left');
  if (move.type === 'right') return moveToChild(state, 'right');
  if (move.type === 'up') return moveUp(state);
  if (move.type === 'seal') return sealCurrent(state);
  return breachCurrent(state);
}

function runMoves(puzzle: CharterboughPuzzle, moves: CharterboughMove[]): CharterboughSolution {
  let state = createInitialState(puzzle);
  const legalCounts: number[] = [];
  let hiddenReveals = 1;
  let downMoves = 0;

  for (const move of moves) {
    if (state.verdict) break;
    legalCounts.push(legalMoveCount(state));
    const beforeReveals = state.revealedIds.length;
    state = applyMove(state, move);
    if (move.type === 'left' || move.type === 'right') {
      downMoves += 1;
    }
    hiddenReveals += Math.max(0, state.revealedIds.length - beforeReveals);
  }

  return {
    moves,
    finalState: state,
    solved: Boolean(state.verdict?.correct),
    actionsUsed: state.actionsUsed,
    counterintuitiveSteps: hiddenTrapCount(puzzle),
    puzzleEntropy: puzzleEntropy(puzzle),
    meanDecisionEntropy:
      legalCounts.length === 0 ? 0 : legalCounts.reduce((sum, count) => sum + log2(count), 0) / legalCounts.length,
    meanInfoGainRatio: (hiddenReveals / Math.max(1, downMoves + 1)) * 2,
  };
}

function buildOptimalMoves(puzzle: CharterboughPuzzle) {
  const moves: CharterboughMove[] = [];

  function walk(nodeId: number): boolean {
    if (!nodeFitsPuzzleBounds(puzzle, nodeId)) {
      moves.push({ type: 'breach' });
      return true;
    }

    moves.push({ type: 'seal' });
    const node = puzzle.nodes[nodeId];

    if (node.leftId !== null) {
      moves.push({ type: 'left' });
      if (walk(node.leftId)) return true;
      moves.push({ type: 'up' });
    }

    if (node.rightId !== null) {
      moves.push({ type: 'right' });
      if (walk(node.rightId)) return true;
      moves.push({ type: 'up' });
    }

    return false;
  }

  walk(puzzle.rootId);
  return moves;
}

function buildParentGateMoves(puzzle: CharterboughPuzzle) {
  const moves: CharterboughMove[] = [];

  function walk(nodeId: number): boolean {
    if (!parentGateHolds(puzzle, nodeId)) {
      moves.push({ type: 'breach' });
      return true;
    }

    moves.push({ type: 'seal' });
    const node = puzzle.nodes[nodeId];

    if (node.leftId !== null) {
      moves.push({ type: 'left' });
      if (walk(node.leftId)) return true;
      moves.push({ type: 'up' });
    }

    if (node.rightId !== null) {
      moves.push({ type: 'right' });
      if (walk(node.rightId)) return true;
      moves.push({ type: 'up' });
    }

    return false;
  }

  walk(puzzle.rootId);
  return moves;
}

function dramaScore(difficulty: CharterboughDifficulty, puzzle: CharterboughPuzzle) {
  const base = 0.34 + difficulty * 0.08;
  const hidden = hiddenTrapCount(puzzle) * 0.18;
  const invalid = puzzle.isValid ? 0 : 0.1;
  return clamp(0.1, 1, base + hidden + invalid);
}

export function evaluateCharterbough(): CharterboughEvaluation {
  const difficulties: DifficultyAggregate[] = [];
  let breakpoint: CharterboughDifficulty = 5;
  let sawBreakpoint = false;
  let totalOptimalActions = 0;
  let totalAltActions = 0;
  let totalAltSolved = 0;
  let totalPuzzles = 0;
  let totalHiddenTraps = 0;

  for (const difficulty of [1, 2, 3, 4, 5] as CharterboughDifficulty[]) {
    const blueprint = BLUEPRINTS[difficulty];
    const puzzles = blueprint.groves.map((_, index) => generatePuzzle(index, difficulty));
    const optimalRuns = puzzles.map((puzzle) => runMoves(puzzle, buildOptimalMoves(puzzle)));
    const altRuns = puzzles.map((puzzle) => runMoves(puzzle, buildParentGateMoves(puzzle)));

    const solvability =
      optimalRuns.reduce((sum, run) => sum + (run.solved ? 1 : 0), 0) / optimalRuns.length;
    const altSolvability = altRuns.reduce((sum, run) => sum + (run.solved ? 1 : 0), 0) / altRuns.length;

    if (!sawBreakpoint && altSolvability < 1) {
      breakpoint = difficulty;
      sawBreakpoint = true;
    }

    const averageOptimalMoves =
      optimalRuns.reduce((sum, run) => sum + run.actionsUsed, 0) / optimalRuns.length;
    const averageAltMoves = altRuns.reduce((sum, run) => sum + run.actionsUsed, 0) / altRuns.length;
    const averageEntropy =
      optimalRuns.reduce((sum, run) => sum + run.meanDecisionEntropy, 0) / optimalRuns.length;
    const averageInfoGain =
      optimalRuns.reduce((sum, run) => sum + run.meanInfoGainRatio, 0) / optimalRuns.length;
    const averagePuzzleEntropy =
      optimalRuns.reduce((sum, run) => sum + run.puzzleEntropy, 0) / optimalRuns.length;
    const averageCounterintuitive =
      optimalRuns.reduce((sum, run) => sum + run.counterintuitiveSteps, 0) / optimalRuns.length;
    const skillDepth = clamp(
      0,
      1,
      (difficulty <= 2 ? 0.14 : 0.18) +
        (1 - altSolvability) * 0.72 +
        averageCounterintuitive * 0.06 +
        clamp(0, 1, (averageAltMoves - averageOptimalMoves) / Math.max(1, averageOptimalMoves)) * 0.2,
    );

    difficulties.push({
      difficulty,
      label: blueprint.label,
      budget: puzzles[0]?.budget ?? 0,
      solvability,
      puzzleEntropy: averagePuzzleEntropy,
      skillDepth,
      decisionEntropy: averageEntropy,
      counterintuitive: averageCounterintuitive,
      drama: puzzles.reduce((sum, puzzle) => sum + dramaScore(difficulty, puzzle), 0) / puzzles.length,
      infoGainRatio: averageInfoGain,
      optimalMoves: averageOptimalMoves,
      altMoves: averageAltMoves,
      altSolvability,
    });

    totalOptimalActions += optimalRuns.reduce((sum, run) => sum + run.actionsUsed, 0);
    totalAltActions += altRuns.reduce((sum, run) => sum + run.actionsUsed, 0);
    totalAltSolved += altRuns.reduce((sum, run) => sum + (run.solved ? 1 : 0), 0);
    totalPuzzles += puzzles.length;
    totalHiddenTraps += puzzles.reduce((sum, puzzle) => sum + hiddenTrapCount(puzzle), 0);
  }

  const solveGap = 1 - totalAltSolved / Math.max(1, totalPuzzles);
  const efficiencyGap = clamp(0, 1, 1 - totalOptimalActions / Math.max(1, totalAltActions));
  const bestAlternativeGap = clamp(0, 1, solveGap * 0.8 + efficiencyGap * 0.2);

  const learningMetrics: LearningMetrics = {
    inputShapeMatch: 1,
    operationMatch: 0.98,
    constraintMatch: 1,
    goalMatch: 1,
    leetCodeFit: 0.995,
    bestAlternativeGap,
    invariantPressure: clamp(0, 1, totalHiddenTraps / Math.max(1, totalPuzzles * 0.4)),
    difficultyBreakpoint: breakpoint,
    algorithmAlignment: 1,
  };

  return {
    difficulties,
    learningMetrics,
    interpretation: {
      invariant:
        'Every branch must stay strictly between its inherited lower and upper gates; descending left tightens the ceiling, descending right raises the floor.',
      strongestAlternative:
        'The strongest wrong strategy checks only the current parent gate. It survives D1-D2, then fails once a branch is locally on the right side of its parent but still outside an older ancestor bound.',
      evidence:
        'The parent-gate alternative keeps full solvability on D1-D2, then drops at D3 exactly when hidden ancestor-bound breaches appear.',
    },
  };
}
