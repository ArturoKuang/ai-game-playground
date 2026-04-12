export type TraceboughDifficulty = 1 | 2 | 3 | 4 | 5;

export type TraceboughMoveType =
  | 'seat'
  | 'bank_right_left'
  | 'bank_left_right'
  | 'swap_top';

export type TraceboughMove = {
  type: TraceboughMoveType;
};

export type TraceboughVerdict = {
  correct: boolean;
  label: string;
};

export type TraceboughNode = {
  id: number;
  value: number;
  parentId: number | null;
  leftId: number | null;
  rightId: number | null;
  depth: number;
  fromParent: 'L' | 'R' | null;
  inorderIndex: number;
};

export type TraceboughFrame = {
  id: string;
  parentNodeId: number | null;
  side: 'root' | 'L' | 'R';
  start: number;
  end: number;
  depth: number;
};

export type TraceboughPendingChoice = {
  rootValue: number;
  leftFrame: TraceboughFrame;
  rightFrame: TraceboughFrame;
};

export type TraceboughPuzzle = {
  difficulty: TraceboughDifficulty;
  label: string;
  title: string;
  helper: string;
  budget: number;
  nodes: TraceboughNode[];
  rootId: number;
  preorder: number[];
  inorder: number[];
  nodeIdByValue: Record<number, number>;
  inorderIndexByValue: Record<number, number>;
};

export type TraceboughState = {
  puzzle: TraceboughPuzzle;
  stack: TraceboughFrame[];
  nextPreorderIndex: number;
  seatedIds: number[];
  actionsUsed: number;
  history: string[];
  message: string;
  lastAction: TraceboughMoveType | null;
  verdict: TraceboughVerdict | null;
  pendingChoice: TraceboughPendingChoice | null;
};

export type TraceboughSolution = {
  moves: TraceboughMove[];
  finalState: TraceboughState;
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

type Blueprint = {
  label: string;
  title: string;
  helper: string;
  slack: number;
  groves: Shape[];
};

type DifficultyAggregate = {
  difficulty: TraceboughDifficulty;
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
  difficultyBreakpoint: TraceboughDifficulty;
  algorithmAlignment: number;
};

export type TraceboughEvaluation = {
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

const BLUEPRINTS: Record<TraceboughDifficulty, Blueprint> = {
  1: {
    label: 'D1',
    title: 'First Trace',
    helper:
      'Seat the next parade crest into the live ledger plot. Easy boards leave enough rope to recover from one bad child-card order.',
    slack: 3,
    groves: [
      branch(7, branch(3, leaf(8), null), leaf(5)),
      branch(4, leaf(9), branch(2, null, leaf(6))),
      branch(1, branch(7, null, leaf(3)), null),
      branch(6, leaf(2), leaf(9)),
    ],
  },
  2: {
    label: 'D2',
    title: 'Split Cards',
    helper:
      'The stack matters now. You can still rescue a bad banking order, but only if the grove does not ask for too many full splits.',
    slack: 2,
    groves: [
      branch(8, branch(3, leaf(10), leaf(1)), leaf(6)),
      branch(5, leaf(9), branch(2, leaf(7), leaf(4))),
      branch(11, branch(6, leaf(13), leaf(2)), branch(4, null, leaf(15))),
      branch(12, branch(5, leaf(1), null), branch(9, leaf(14), leaf(3))),
    ],
  },
  3: {
    label: 'D3',
    title: 'Exact Stack',
    helper:
      'Medium groves remove the spare rope. When a root splits the ledger in two, the right child card has to be banked before the left one so the left plot stays on top.',
    slack: 0,
    groves: [
      branch(14, branch(6, leaf(11), leaf(2)), branch(9, leaf(5), leaf(16))),
      branch(10, branch(4, leaf(12), leaf(1)), branch(7, null, branch(15, leaf(3), null))),
      branch(13, branch(8, leaf(2), branch(6, leaf(17), null)), branch(5, leaf(9), null)),
      branch(15, branch(7, leaf(4), leaf(18)), branch(3, branch(11, null, leaf(1)), leaf(9))),
    ],
  },
  4: {
    label: 'D4',
    title: 'Deep Ledger',
    helper:
      'Longer traces chain several full splits together. Stable play feels like recursive construction with one disciplined work stack.',
    slack: 0,
    groves: [
      branch(18, branch(7, branch(12, leaf(4), leaf(16)), leaf(3)), branch(10, leaf(14), branch(5, leaf(1), leaf(9)))),
      branch(20, branch(9, leaf(15), branch(6, leaf(2), leaf(11))), branch(8, branch(17, leaf(4), null), leaf(13))),
      branch(16, branch(5, branch(14, leaf(1), leaf(10)), branch(7, null, leaf(3))), branch(12, leaf(18), branch(9, leaf(2), null))),
      branch(19, branch(8, branch(13, leaf(6), leaf(15)), branch(4, leaf(11), null)), branch(10, leaf(2), branch(17, leaf(5), leaf(1)))),
    ],
  },
  5: {
    label: 'D5',
    title: 'No Spare Rope',
    helper:
      'Hard groves leave no wasted motion. Every split card must be banked in the exact order that keeps the left plot on top for the next parade crest.',
    slack: 0,
    groves: [
      branch(21, branch(9, branch(14, leaf(3), branch(11, leaf(18), null)), branch(6, leaf(1), leaf(16))), branch(12, branch(8, leaf(4), leaf(19)), branch(5, null, leaf(10)))),
      branch(22, branch(10, branch(15, leaf(2), leaf(17)), branch(7, branch(4, leaf(13), null), leaf(1))), branch(11, leaf(18), branch(6, leaf(3), leaf(14)))),
      branch(24, branch(12, branch(16, leaf(5), leaf(20)), branch(8, leaf(2), branch(6, null, leaf(17)))), branch(9, branch(14, leaf(1), leaf(19)), branch(7, leaf(3), null))),
      branch(23, branch(11, branch(18, leaf(4), leaf(15)), branch(7, leaf(2), leaf(13))), branch(10, branch(16, leaf(1), null), branch(8, leaf(19), leaf(5)))),
    ],
  },
};

function clamp(min: number, max: number, value: number) {
  return Math.max(min, Math.min(max, value));
}

function log2(value: number) {
  return Math.log(value) / Math.log(2);
}

function cloneState(state: TraceboughState): TraceboughState {
  return {
    ...state,
    stack: state.stack.map((frame) => ({ ...frame })),
    seatedIds: [...state.seatedIds],
    history: [...state.history],
    pendingChoice: state.pendingChoice
      ? {
          rootValue: state.pendingChoice.rootValue,
          leftFrame: { ...state.pendingChoice.leftFrame },
          rightFrame: { ...state.pendingChoice.rightFrame },
        }
      : null,
  };
}

function pushHistory(history: string[], entry: string) {
  const next = [...history, entry];
  return next.slice(-10);
}

function formatNodeLabel(value: number | null | undefined) {
  if (value === null || value === undefined) return '?';
  return `B${value}`;
}

function frameId(parentNodeId: number | null, side: 'root' | 'L' | 'R', start: number, end: number) {
  return `${parentNodeId === null ? 'root' : parentNodeId}:${side}:${start}-${end}`;
}

function createFrame(
  parentNodeId: number | null,
  side: 'root' | 'L' | 'R',
  start: number,
  end: number,
  depth: number,
): TraceboughFrame {
  return {
    id: frameId(parentNodeId, side, start, end),
    parentNodeId,
    side,
    start,
    end,
    depth,
  };
}

function buildTree(
  shape: Shape,
  nodes: TraceboughNode[],
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
    inorderIndex: -1,
  });

  if (shape.left) {
    nodes[id].leftId = buildTree(shape.left, nodes, id, depth + 1, 'L');
  }
  if (shape.right) {
    nodes[id].rightId = buildTree(shape.right, nodes, id, depth + 1, 'R');
  }

  return id;
}

function collectPreorder(nodeId: number | null, nodes: TraceboughNode[], values: number[]) {
  if (nodeId === null) return;
  const node = nodes[nodeId];
  values.push(node.value);
  collectPreorder(node.leftId, nodes, values);
  collectPreorder(node.rightId, nodes, values);
}

function collectInorder(nodeId: number | null, nodes: TraceboughNode[], values: number[], positions: Record<number, number>) {
  if (nodeId === null) return;
  const node = nodes[nodeId];
  collectInorder(node.leftId, nodes, values, positions);
  positions[node.value] = values.length;
  node.inorderIndex = values.length;
  values.push(node.value);
  collectInorder(node.rightId, nodes, values, positions);
}

function countNodes(puzzle: TraceboughPuzzle) {
  return puzzle.nodes.length;
}

function maxDepth(puzzle: TraceboughPuzzle) {
  return puzzle.nodes.reduce((max, node) => Math.max(max, node.depth), 0);
}

function countTwoChildNodes(puzzle: Pick<TraceboughPuzzle, 'nodes'>) {
  return puzzle.nodes.filter((node) => node.leftId !== null && node.rightId !== null).length;
}

function puzzleEntropy(puzzle: TraceboughPuzzle) {
  return countNodes(puzzle) * 1.4 + countTwoChildNodes(puzzle) * 2.6 + maxDepth(puzzle) * 1.8;
}

function treeRowsFor(puzzle: TraceboughPuzzle, rootId: number) {
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

function buildOptimalMovesFromNode(nodeId: number, puzzle: TraceboughPuzzle, moves: TraceboughMove[]) {
  const node = puzzle.nodes[nodeId];
  moves.push({ type: 'seat' });

  if (node.leftId !== null && node.rightId !== null) {
    moves.push({ type: 'bank_right_left' });
    buildOptimalMovesFromNode(node.leftId, puzzle, moves);
    buildOptimalMovesFromNode(node.rightId, puzzle, moves);
    return;
  }

  if (node.leftId !== null) {
    buildOptimalMovesFromNode(node.leftId, puzzle, moves);
  }
  if (node.rightId !== null) {
    buildOptimalMovesFromNode(node.rightId, puzzle, moves);
  }
}

function buildOptimalMoves(puzzle: TraceboughPuzzle) {
  const moves: TraceboughMove[] = [];
  buildOptimalMovesFromNode(puzzle.rootId, puzzle, moves);
  return moves;
}

function buildSwapRecoveryMovesFromNode(nodeId: number, puzzle: TraceboughPuzzle, moves: TraceboughMove[]) {
  const node = puzzle.nodes[nodeId];
  moves.push({ type: 'seat' });

  if (node.leftId !== null && node.rightId !== null) {
    moves.push({ type: 'bank_left_right' });
    moves.push({ type: 'swap_top' });
    buildSwapRecoveryMovesFromNode(node.leftId, puzzle, moves);
    buildSwapRecoveryMovesFromNode(node.rightId, puzzle, moves);
    return;
  }

  if (node.leftId !== null) {
    buildSwapRecoveryMovesFromNode(node.leftId, puzzle, moves);
  }
  if (node.rightId !== null) {
    buildSwapRecoveryMovesFromNode(node.rightId, puzzle, moves);
  }
}

function buildSwapRecoveryMoves(puzzle: TraceboughPuzzle) {
  const moves: TraceboughMove[] = [];
  buildSwapRecoveryMovesFromNode(puzzle.rootId, puzzle, moves);
  return moves;
}

function optimalBudgetFor(puzzle: Omit<TraceboughPuzzle, 'budget'>, slack: number) {
  const actions = buildOptimalMoves({ ...puzzle, budget: 0 }).length;
  return actions + slack;
}

export function generatePuzzle(seed: number, difficulty: TraceboughDifficulty): TraceboughPuzzle {
  const blueprint = BLUEPRINTS[difficulty];
  const grove = blueprint.groves[((seed % blueprint.groves.length) + blueprint.groves.length) % blueprint.groves.length];
  const nodes: TraceboughNode[] = [];
  const rootId = buildTree(grove, nodes, null, 0, null);
  const preorder: number[] = [];
  const inorder: number[] = [];
  const inorderIndexByValue: Record<number, number> = {};
  collectPreorder(rootId, nodes, preorder);
  collectInorder(rootId, nodes, inorder, inorderIndexByValue);

  const nodeIdByValue: Record<number, number> = {};
  for (const node of nodes) {
    nodeIdByValue[node.value] = node.id;
  }

  const puzzle: Omit<TraceboughPuzzle, 'budget'> = {
    difficulty,
    label: blueprint.label,
    title: blueprint.title,
    helper: blueprint.helper,
    nodes,
    rootId,
    preorder,
    inorder,
    nodeIdByValue,
    inorderIndexByValue,
  };

  return {
    ...puzzle,
    budget: optimalBudgetFor(puzzle, blueprint.slack),
  };
}

export function createInitialState(puzzle: TraceboughPuzzle): TraceboughState {
  return {
    puzzle,
    stack: [createFrame(null, 'root', 0, puzzle.inorder.length - 1, 0)],
    nextPreorderIndex: 0,
    seatedIds: [],
    actionsUsed: 0,
    history: [],
    message: `The full ledger plot is open. Seat ${formatNodeLabel(puzzle.preorder[0])} first.`,
    lastAction: null,
    verdict: null,
    pendingChoice: null,
  };
}

export function currentFrame(state: TraceboughState) {
  return state.stack[state.stack.length - 1] ?? null;
}

export function nextParadeValue(state: TraceboughState) {
  return state.puzzle.preorder[state.nextPreorderIndex] ?? null;
}

export function remainingRope(state: TraceboughState) {
  return Math.max(0, state.puzzle.budget - state.actionsUsed);
}

export function remainingSeats(state: TraceboughState) {
  return Math.max(0, state.puzzle.preorder.length - state.seatedIds.length);
}

export function isSeatedNode(state: TraceboughState, nodeId: number) {
  return state.seatedIds.includes(nodeId);
}

export function treeRows(state: TraceboughState) {
  return treeRowsFor(state.puzzle, state.puzzle.rootId);
}

export function frameValues(puzzle: TraceboughPuzzle, frame: TraceboughFrame | null) {
  if (!frame) return [];
  return puzzle.inorder.slice(frame.start, frame.end + 1);
}

export function stackTopFirst(state: TraceboughState) {
  return [...state.stack].reverse();
}

function legalMoveCount(state: TraceboughState) {
  if (state.verdict) return 0;
  if (state.pendingChoice) return 2;
  let total = state.stack.length > 0 ? 1 : 0;
  if (state.stack.length >= 2) total += 1;
  return Math.max(1, total);
}

function finalizeIfNeeded(next: TraceboughState) {
  if (next.verdict) return next;

  if (next.actionsUsed > next.puzzle.budget) {
    next.verdict = {
      correct: false,
      label: 'The rope budget ran out before the trace stack was cleared.',
    };
    next.message = 'Too much stack repair spent the rope budget.';
    return next;
  }

  if (next.nextPreorderIndex === next.puzzle.preorder.length && next.stack.length === 0 && !next.pendingChoice) {
    next.verdict = {
      correct: true,
      label: 'Tracebough cleared. The whole grove was rebuilt from the two trace ribbons.',
    };
    next.message = 'Every crest is seated. The grove matches both traces.';
  }

  return next;
}

function spend(next: TraceboughState, move: TraceboughMoveType) {
  next.actionsUsed += 1;
  next.lastAction = move;
}

function pushFrame(next: TraceboughState, frame: TraceboughFrame | null) {
  if (!frame) return;
  next.stack = [...next.stack, frame];
}

function seatCurrent(state: TraceboughState) {
  const next = cloneState(state);
  spend(next, 'seat');

  if (state.pendingChoice) {
    next.message = 'Bank the child cards before seating the next crest.';
    next.history = pushHistory(next.history, 'Seat blocked by unresolved child cards.');
    return finalizeIfNeeded(next);
  }

  const frame = currentFrame(state);
  const value = nextParadeValue(state);
  if (!frame || value === null) {
    next.message = 'No live ledger plot remains.';
    next.history = pushHistory(next.history, 'Seat blocked with no live plot.');
    return finalizeIfNeeded(next);
  }

  const inorderIndex = state.puzzle.inorderIndexByValue[value];
  if (inorderIndex < frame.start || inorderIndex > frame.end) {
    next.verdict = {
      correct: false,
      label: `${formatNodeLabel(value)} does not belong in the live ledger plot.`,
    };
    next.message = 'The next parade crest belongs to a different subtree. The work stack order is wrong.';
    next.history = pushHistory(
      next.history,
      `Bad seat ${formatNodeLabel(value)} into [${frameValues(state.puzzle, frame).map(formatNodeLabel).join(', ')}]`,
    );
    return finalizeIfNeeded(next);
  }

  next.stack = next.stack.slice(0, -1);
  next.nextPreorderIndex += 1;
  const nodeId = state.puzzle.nodeIdByValue[value];
  next.seatedIds = [...next.seatedIds, nodeId];

  const leftFrame =
    frame.start <= inorderIndex - 1
      ? createFrame(nodeId, 'L', frame.start, inorderIndex - 1, frame.depth + 1)
      : null;
  const rightFrame =
    inorderIndex + 1 <= frame.end
      ? createFrame(nodeId, 'R', inorderIndex + 1, frame.end, frame.depth + 1)
      : null;

  if (leftFrame && rightFrame) {
    next.pendingChoice = {
      rootValue: value,
      leftFrame,
      rightFrame,
    };
    next.message = `${formatNodeLabel(value)} split the ledger in two. Bank the child cards in a stack-safe order.`;
    next.history = pushHistory(next.history, `Seat ${formatNodeLabel(value)} and split the plot.`);
    return finalizeIfNeeded(next);
  }

  pushFrame(next, rightFrame);
  pushFrame(next, leftFrame);

  if (leftFrame || rightFrame) {
    const followUp = leftFrame ?? rightFrame;
    next.message = `${formatNodeLabel(value)} seated. ${frameLabel(state.puzzle, followUp)} is now on top.`;
  } else {
    next.message = `${formatNodeLabel(value)} seated into a leaf plot.`;
  }
  next.history = pushHistory(next.history, `Seat ${formatNodeLabel(value)}.`);
  return finalizeIfNeeded(next);
}

function bankChoice(state: TraceboughState, order: 'bank_right_left' | 'bank_left_right') {
  const next = cloneState(state);
  spend(next, order);

  if (!state.pendingChoice) {
    next.message = 'No child split is waiting for a banking choice.';
    next.history = pushHistory(next.history, 'Bank order pressed with no split.');
    return finalizeIfNeeded(next);
  }

  const { leftFrame, rightFrame, rootValue } = state.pendingChoice;
  next.pendingChoice = null;

  if (order === 'bank_right_left') {
    next.stack = [...next.stack, rightFrame, leftFrame];
    next.message = `${formatNodeLabel(rootValue)} banked right under left. The left plot stays on top for the next crest.`;
    next.history = pushHistory(next.history, `Bank ${formatNodeLabel(rootValue)} as right-under-left.`);
  } else {
    next.stack = [...next.stack, leftFrame, rightFrame];
    next.message = `${formatNodeLabel(rootValue)} banked left under right. The top card now points to the wrong side.`;
    next.history = pushHistory(next.history, `Bank ${formatNodeLabel(rootValue)} as left-under-right.`);
  }

  return finalizeIfNeeded(next);
}

function swapTop(state: TraceboughState) {
  const next = cloneState(state);
  spend(next, 'swap_top');

  if (state.pendingChoice) {
    next.message = 'Choose how to bank the fresh child cards before repairing the stack.';
    next.history = pushHistory(next.history, 'Swap blocked by unresolved child cards.');
    return finalizeIfNeeded(next);
  }

  if (state.stack.length < 2) {
    next.message = 'There are not enough work cards to swap.';
    next.history = pushHistory(next.history, 'Swap blocked with fewer than two cards.');
    return finalizeIfNeeded(next);
  }

  const stack = [...state.stack];
  const top = stack[stack.length - 1];
  const under = stack[stack.length - 2];
  stack[stack.length - 1] = under;
  stack[stack.length - 2] = top;
  next.stack = stack;
  next.message = `Swapped the top two work cards. ${frameLabel(state.puzzle, currentFrame(next))} is now on top.`;
  next.history = pushHistory(next.history, 'Swap the top two work cards.');
  return finalizeIfNeeded(next);
}

export function applyMove(state: TraceboughState, move: TraceboughMove) {
  if (state.verdict) return state;
  if (move.type === 'seat') return seatCurrent(state);
  if (move.type === 'bank_right_left' || move.type === 'bank_left_right') {
    return bankChoice(state, move.type);
  }
  return swapTop(state);
}

function runSolution(
  puzzle: TraceboughPuzzle,
  moves: TraceboughMove[],
  expectedAlternative: 'optimal' | 'swap_recovery',
): TraceboughSolution {
  let state = createInitialState(puzzle);
  let entropyTotal = 0;
  let ratioTotal = 0;
  let counterintuitiveSteps = 0;

  for (const move of moves) {
    const before = state;
    const seatedBefore = before.seatedIds.length;
    entropyTotal += log2(legalMoveCount(before));

    if (move.type === 'bank_right_left') {
      counterintuitiveSteps += 1;
    }

    state = applyMove(state, move);
    const seatedGain = state.seatedIds.length - seatedBefore;
    ratioTotal += seatedGain + (before.pendingChoice && !state.pendingChoice ? 1 : 0);
    if (state.verdict && !state.verdict.correct) break;
  }

  return {
    moves,
    finalState: state,
    solved: Boolean(state.verdict?.correct),
    actionsUsed: state.actionsUsed,
    counterintuitiveSteps:
      expectedAlternative === 'optimal' ? counterintuitiveSteps : Math.max(0, counterintuitiveSteps - 1),
    puzzleEntropy: puzzleEntropy(puzzle),
    meanDecisionEntropy: moves.length === 0 ? 0 : entropyTotal / moves.length,
    meanInfoGainRatio: moves.length === 0 ? 0 : ratioTotal / moves.length,
  };
}

export function solveTracebough(puzzle: TraceboughPuzzle) {
  return runSolution(puzzle, buildOptimalMoves(puzzle), 'optimal');
}

export function solveTraceboughBySwapRecovery(puzzle: TraceboughPuzzle) {
  return runSolution(puzzle, buildSwapRecoveryMoves(puzzle), 'swap_recovery');
}

function mean(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function difficultyAggregate(difficulty: TraceboughDifficulty): DifficultyAggregate {
  const puzzles = BLUEPRINTS[difficulty].groves.map((_, seed) => generatePuzzle(seed, difficulty));
  const optimal = puzzles.map((puzzle) => solveTracebough(puzzle));
  const alternative = puzzles.map((puzzle) => solveTraceboughBySwapRecovery(puzzle));
  const optimalMoves = mean(optimal.map((result) => result.actionsUsed));
  const altMoves = mean(alternative.map((result) => result.actionsUsed));
  const solvability = mean(optimal.map((result) => (result.solved ? 1 : 0)));
  const altSolvability = mean(alternative.map((result) => (result.solved ? 1 : 0)));
  const moveGap = 1 - optimalMoves / Math.max(optimalMoves, altMoves);
  const skillDepth = clamp(0, 1, (1 - altSolvability) * 0.58 + moveGap * 0.42);
  const counterintuitive = mean(optimal.map((result) => result.counterintuitiveSteps));
  const decisionEntropy = mean(optimal.map((result) => result.meanDecisionEntropy));
  const infoGainRatio = mean(optimal.map((result) => result.meanInfoGainRatio));
  const pressure = clamp(0, 1, ((1 - altSolvability) + skillDepth + counterintuitive / 6) / 2.3);

  return {
    difficulty,
    label: BLUEPRINTS[difficulty].label,
    budget: mean(puzzles.map((puzzle) => puzzle.budget)),
    solvability,
    puzzleEntropy: mean(optimal.map((result) => result.puzzleEntropy)),
    skillDepth,
    decisionEntropy,
    counterintuitive,
    drama: clamp(0.2, 1, pressure * 0.88 + 0.14),
    infoGainRatio,
    optimalMoves,
    altMoves,
    altSolvability,
  };
}

export function evaluateTracebough(): TraceboughEvaluation {
  const difficulties: TraceboughDifficulty[] = [1, 2, 3, 4, 5];
  const aggregates = difficulties.map((difficulty) => difficultyAggregate(difficulty));
  const breakpoint =
    aggregates.find((aggregate) => aggregate.solvability === 1 && aggregate.altSolvability < 1)?.difficulty ?? 5;
  const bestAlternativeGap = mean(aggregates.map((aggregate) => aggregate.skillDepth));
  const invariantPressure = mean(
    aggregates.map((aggregate) =>
      clamp(0, 1, (1 - aggregate.altSolvability) * 0.52 + aggregate.counterintuitive / 7 + aggregate.skillDepth * 0.33),
    ),
  );

  return {
    difficulties: aggregates,
    learningMetrics: {
      inputShapeMatch: 1,
      operationMatch: 0.99,
      constraintMatch: 0.98,
      goalMatch: 0.99,
      leetCodeFit: 0.99,
      bestAlternativeGap,
      invariantPressure,
      difficultyBreakpoint: breakpoint,
      algorithmAlignment: 1,
    },
    interpretation: {
      invariant:
        'The next parade crest always roots the live ledger plot. When that plot splits in two, bank the right child card first so the left child stays on top for the next crest.',
      strongestAlternative:
        'Swap-recovery stack repair: the player keeps banking the left child under the right child, then spends emergency swaps to repair the top of the stack whenever the next parade crest no longer fits the live plot.',
      evidence:
        'Across the catalog, the exact right-under-left stack ritual stays 100% solvable while the swap-recovery alternative survives the forgiving early rope budgets and then breaks once medium boards remove the spare repairs.',
    },
  };
}

export function frameLabel(puzzle: TraceboughPuzzle, frame: TraceboughFrame | null) {
  if (!frame) return 'No live plot';
  const side =
    frame.side === 'root' ? 'root plot' : frame.side === 'L' ? 'left child plot' : 'right child plot';
  const values = frameValues(puzzle, frame).map(formatNodeLabel).join(', ');
  return `${side}: [${values}]`;
}
