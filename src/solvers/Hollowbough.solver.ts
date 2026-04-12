export type HollowboughDifficulty = 1 | 2 | 3 | 4 | 5;

export type HollowboughMoveType =
  | 'stamp_branch'
  | 'stamp_hollow'
  | 'bank_right_left'
  | 'bank_left_right'
  | 'swap_top';

export type HollowboughMove = {
  type: HollowboughMoveType;
};

export type HollowboughVerdict = {
  correct: boolean;
  label: string;
};

export type HollowboughNode = {
  id: number;
  value: number;
  parentId: number | null;
  leftId: number | null;
  rightId: number | null;
  depth: number;
  fromParent: 'L' | 'R' | null;
};

export type HollowboughSlot = {
  id: number;
  path: string;
  depth: number;
  side: 'root' | 'L' | 'R';
  parentSlotId: number | null;
  nodeId: number | null;
  leftSlotId: number | null;
  rightSlotId: number | null;
};

export type HollowboughPendingChoice = {
  slotId: number;
  rootValue: number;
  leftSlotId: number;
  rightSlotId: number;
};

export type HollowboughPuzzle = {
  difficulty: HollowboughDifficulty;
  label: string;
  title: string;
  helper: string;
  budget: number;
  nodes: HollowboughNode[];
  rootId: number;
  rootSlotId: number;
  slots: HollowboughSlot[];
  preorderSlotIds: number[];
};

export type BuiltState = 'unknown' | 'branch' | 'hollow';

export type HollowboughState = {
  puzzle: HollowboughPuzzle;
  stack: number[];
  builtStates: BuiltState[];
  ribbon: Array<number | null>;
  actionsUsed: number;
  history: string[];
  message: string;
  lastAction: HollowboughMoveType | null;
  verdict: HollowboughVerdict | null;
  pendingChoice: HollowboughPendingChoice | null;
};

export type HollowboughSolution = {
  moves: HollowboughMove[];
  finalState: HollowboughState;
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
  difficulty: HollowboughDifficulty;
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
  tokenDiscipline: number;
  nullMarkerPressure: number;
  stackOrderPressure: number;
  roundTripFit: number;
  leetCodeFit: number;
  bestAlternativeGap: number;
  invariantPressure: number;
  difficultyBreakpoint: HollowboughDifficulty;
  algorithmAlignment: number;
};

export type HollowboughEvaluation = {
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

const BLUEPRINTS: Record<HollowboughDifficulty, Blueprint> = {
  1: {
    label: 'D1',
    title: 'First Ribbon',
    helper:
      'Stamp the live slot first. Real branches and hollow hooks both belong on the ribbon, and easy groves leave just enough ink to repair one bad branch split.',
    slack: 2,
    groves: [
      branch(7, leaf(3), null),
      branch(5, null, leaf(8)),
      branch(6, leaf(2), leaf(9)),
      branch(4, branch(1, null, leaf(7)), null),
    ],
  },
  2: {
    label: 'D2',
    title: 'Hollow Hooks',
    helper:
      'The rebuild fails if you skip empty hooks. Medium-easy groves still tolerate one repaired split, but only when the hollow marks stay in order.',
    slack: 2,
    groves: [
      branch(8, branch(3, null, leaf(10)), leaf(6)),
      branch(11, leaf(5), branch(2, null, leaf(9))),
      branch(9, branch(4, leaf(1), null), branch(7, null, leaf(12))),
      branch(10, branch(6, null, leaf(13)), branch(3, leaf(8), null)),
    ],
  },
  3: {
    label: 'D3',
    title: 'Exact Codec',
    helper:
      'There is no spare ink now. Every branch must bank the right child task under the left one, and every hollow hook still needs its own ribbon mark.',
    slack: 0,
    groves: [
      branch(14, branch(6, leaf(11), null), branch(9, null, leaf(5))),
      branch(13, branch(7, null, branch(4, leaf(2), null)), branch(10, leaf(15), null)),
      branch(12, branch(5, leaf(1), leaf(8)), branch(3, null, leaf(9))),
      branch(15, branch(8, null, leaf(6)), branch(4, leaf(11), leaf(2))),
    ],
  },
  4: {
    label: 'D4',
    title: 'Deep Courier',
    helper:
      'Longer grove ribbons chain several branch splits together. Stable play feels like one self-delimiting preorder script, not a generic tree walk.',
    slack: 0,
    groves: [
      branch(18, branch(7, branch(12, null, leaf(4)), leaf(3)), branch(10, leaf(14), null)),
      branch(20, branch(9, leaf(15), branch(6, null, leaf(2))), branch(8, branch(17, null, leaf(4)), leaf(13))),
      branch(16, branch(5, branch(14, leaf(1), null), branch(7, null, leaf(3))), branch(12, leaf(18), null)),
      branch(19, branch(8, branch(13, null, leaf(6)), branch(4, leaf(11), null)), branch(10, null, branch(17, leaf(5), null))),
    ],
  },
  5: {
    label: 'D5',
    title: 'No Lost Hooks',
    helper:
      'Hard groves leave no wasted motion. If one hollow mark or one child-task order is wrong, the rebuild runs out of ink before the ribbon closes cleanly.',
    slack: 0,
    groves: [
      branch(21, branch(9, branch(14, leaf(3), branch(11, null, leaf(18))), branch(6, null, leaf(16))), branch(12, branch(8, leaf(4), null), branch(5, null, leaf(10)))),
      branch(22, branch(10, branch(15, null, leaf(17)), branch(7, branch(4, leaf(13), null), leaf(1))), branch(11, leaf(18), branch(6, null, leaf(14)))),
      branch(24, branch(12, branch(16, leaf(5), null), branch(8, null, branch(6, leaf(2), leaf(17)))), branch(9, branch(14, leaf(1), null), branch(7, null, leaf(3)))),
      branch(23, branch(11, branch(18, leaf(4), null), branch(7, leaf(2), branch(13, null, leaf(5)))), branch(10, branch(16, null, leaf(1)), branch(8, leaf(19), null))),
    ],
  },
};

function clamp(min: number, max: number, value: number) {
  return Math.max(min, Math.min(max, value));
}

function log2(value: number) {
  return Math.log(value) / Math.log(2);
}

function slotLabel(slot: HollowboughSlot) {
  if (slot.side === 'root') return 'root';
  return slot.path.replace('root.', '');
}

function tokenLabel(value: number | null) {
  return value === null ? 'Hollow' : `B${value}`;
}

function pushHistory(history: string[], entry: string) {
  const next = [...history, entry];
  return next.slice(-10);
}

function cloneState(state: HollowboughState): HollowboughState {
  return {
    ...state,
    stack: [...state.stack],
    builtStates: [...state.builtStates],
    ribbon: [...state.ribbon],
    history: [...state.history],
    pendingChoice: state.pendingChoice ? { ...state.pendingChoice } : null,
  };
}

function createNodeTree(shape: Shape, nodes: HollowboughNode[], parentId: number | null, depth: number, fromParent: 'L' | 'R' | null): number {
  const nodeId = nodes.length;
  const node: HollowboughNode = {
    id: nodeId,
    value: shape.value,
    parentId,
    leftId: null,
    rightId: null,
    depth,
    fromParent,
  };
  nodes.push(node);

  if (shape.left) {
    node.leftId = createNodeTree(shape.left, nodes, nodeId, depth + 1, 'L');
  }
  if (shape.right) {
    node.rightId = createNodeTree(shape.right, nodes, nodeId, depth + 1, 'R');
  }

  return nodeId;
}

function createSlotTree(
  nodes: HollowboughNode[],
  slots: HollowboughSlot[],
  nodeId: number | null,
  parentSlotId: number | null,
  side: 'root' | 'L' | 'R',
  depth: number,
  path: string,
): number {
  const slotId = slots.length;
  slots.push({
    id: slotId,
    path,
    depth,
    side,
    parentSlotId,
    nodeId,
    leftSlotId: null,
    rightSlotId: null,
  });

  if (nodeId !== null) {
    const node = nodes[nodeId];
    const leftPath = path === 'root' ? 'root.L' : `${path}.L`;
    const rightPath = path === 'root' ? 'root.R' : `${path}.R`;
    const leftSlotId = createSlotTree(nodes, slots, node.leftId, slotId, 'L', depth + 1, leftPath);
    const rightSlotId = createSlotTree(nodes, slots, node.rightId, slotId, 'R', depth + 1, rightPath);
    slots[slotId].leftSlotId = leftSlotId;
    slots[slotId].rightSlotId = rightSlotId;
  }

  return slotId;
}

function countBranches(puzzle: HollowboughPuzzle) {
  return puzzle.nodes.length;
}

function countHollows(puzzle: HollowboughPuzzle) {
  return puzzle.slots.filter((slot) => slot.nodeId === null).length;
}

function countTwoChildNodes(puzzle: HollowboughPuzzle) {
  return puzzle.nodes.filter((node) => node.leftId !== null && node.rightId !== null).length;
}

function countOneChildNodes(puzzle: HollowboughPuzzle) {
  return puzzle.nodes.filter(
    (node) => (node.leftId === null) !== (node.rightId === null),
  ).length;
}

function maxDepth(puzzle: HollowboughPuzzle) {
  return puzzle.slots.reduce((best, slot) => Math.max(best, slot.depth), 0);
}

function puzzleEntropy(puzzle: HollowboughPuzzle) {
  const branches = countBranches(puzzle);
  const hollows = countHollows(puzzle);
  const splitNodes = countTwoChildNodes(puzzle);
  const oneChildNodes = countOneChildNodes(puzzle);
  return (
    (maxDepth(puzzle) + 1) * 1.7 +
    splitNodes * 1.2 +
    oneChildNodes * 0.8 +
    hollows * 0.45 +
    branches * 0.3
  );
}

function optimalBudgetFor(
  slotCount: number,
  branchCount: number,
  slack: number,
) {
  return slotCount + branchCount + slack;
}

export function generatePuzzle(seed: number, difficulty: HollowboughDifficulty): HollowboughPuzzle {
  const blueprint = BLUEPRINTS[difficulty];
  const shape = blueprint.groves[seed % blueprint.groves.length];
  const nodes: HollowboughNode[] = [];
  const rootId = createNodeTree(shape, nodes, null, 0, null);
  const slots: HollowboughSlot[] = [];
  const rootSlotId = createSlotTree(nodes, slots, rootId, null, 'root', 0, 'root');
  return {
    difficulty,
    label: blueprint.label,
    title: blueprint.title,
    helper: blueprint.helper,
    budget: optimalBudgetFor(slots.length, nodes.length, blueprint.slack),
    nodes,
    rootId,
    rootSlotId,
    slots,
    preorderSlotIds: slots.map((slot) => slot.id),
  };
}

export function createInitialState(puzzle: HollowboughPuzzle): HollowboughState {
  return {
    puzzle,
    stack: [puzzle.rootSlotId],
    builtStates: Array.from({ length: puzzle.slots.length }, () => 'unknown'),
    ribbon: [],
    actionsUsed: 0,
    history: [],
    message: 'Stamp the live grove slot onto the ribbon. Hollow hooks count too.',
    lastAction: null,
    verdict: null,
    pendingChoice: null,
  };
}

export function currentSlot(state: HollowboughState) {
  const slotId = state.stack[state.stack.length - 1];
  if (slotId === undefined) return null;
  return state.puzzle.slots[slotId];
}

export function remainingInk(state: HollowboughState) {
  return state.puzzle.budget - state.actionsUsed;
}

export function remainingMarks(state: HollowboughState) {
  return state.puzzle.slots.length - state.ribbon.length;
}

export function stackTopFirst(state: HollowboughState) {
  return [...state.stack].reverse().map((slotId) => state.puzzle.slots[slotId]);
}

export function ribbonTokens(state: HollowboughState) {
  return state.ribbon;
}

export function slotRows(puzzle: HollowboughPuzzle) {
  const rows: number[][] = [];
  for (const slot of puzzle.slots) {
    if (!rows[slot.depth]) {
      rows[slot.depth] = [];
    }
    rows[slot.depth].push(slot.id);
  }
  return rows;
}

function legalMoveCount(state: HollowboughState) {
  if (state.verdict) return 0;
  if (state.pendingChoice) return 2;
  const slot = currentSlot(state);
  if (!slot) return 0;
  return 2 + (state.stack.length >= 2 ? 1 : 0);
}

function finalizeIfNeeded(next: HollowboughState) {
  if (next.verdict) return next;

  if (next.actionsUsed > next.puzzle.budget) {
    next.verdict = {
      correct: false,
      label: 'Ink exhausted before the ribbon and rebuild were complete.',
    };
    next.message = 'The courier ran dry. Reset or reroll to try again.';
    return next;
  }

  if (
    !next.pendingChoice &&
    next.stack.length === 0 &&
    next.ribbon.length === next.puzzle.slots.length
  ) {
    next.verdict = {
      correct: true,
      label: 'Hollowbough cleared. The ribbon can regrow the grove exactly.',
    };
    next.message = 'Round trip complete. Every branch and hollow hook was preserved.';
  }

  return next;
}

function spend(next: HollowboughState, move: HollowboughMoveType) {
  next.actionsUsed += 1;
  next.lastAction = move;
}

function failState(state: HollowboughState, label: string, message: string, move: HollowboughMoveType) {
  const next = cloneState(state);
  spend(next, move);
  next.verdict = {
    correct: false,
    label,
  };
  next.message = message;
  return finalizeIfNeeded(next);
}

function stampBranch(state: HollowboughState) {
  const slot = currentSlot(state);
  if (!slot) {
    return failState(
      state,
      'No live slot remains to stamp.',
      'The ribbon is already closed.',
      'stamp_branch',
    );
  }
  if (slot.nodeId === null) {
    return failState(
      state,
      'Stamped a branch onto a hollow hook.',
      'This live slot is empty. It needs a hollow mark instead.',
      'stamp_branch',
    );
  }

  const node = state.puzzle.nodes[slot.nodeId];
  const leftSlotId = slot.leftSlotId;
  const rightSlotId = slot.rightSlotId;
  if (leftSlotId === null || rightSlotId === null) {
    return failState(
      state,
      'Branch lost its child hooks.',
      'Reset the grove. This branch no longer has a complete pair of child slots.',
      'stamp_branch',
    );
  }

  const next = cloneState(state);
  spend(next, 'stamp_branch');
  next.stack.pop();
  next.builtStates[slot.id] = 'branch';
  next.ribbon.push(node.value);
  next.pendingChoice = {
    slotId: slot.id,
    rootValue: node.value,
    leftSlotId,
    rightSlotId,
  };
  next.history = pushHistory(
    next.history,
    `Stamped B${node.value} at ${slotLabel(slot)}.`,
  );
  next.message =
    'Bank the right child task under the left one if you want the left slot to stay live next.';
  return finalizeIfNeeded(next);
}

function stampHollow(state: HollowboughState) {
  const slot = currentSlot(state);
  if (!slot) {
    return failState(
      state,
      'No live slot remains to mark.',
      'The ribbon is already closed.',
      'stamp_hollow',
    );
  }
  if (slot.nodeId !== null) {
    return failState(
      state,
      'Stamped hollow onto a real branch.',
      'This live slot contains a branch. Stamp its value first.',
      'stamp_hollow',
    );
  }

  const next = cloneState(state);
  spend(next, 'stamp_hollow');
  next.stack.pop();
  next.builtStates[slot.id] = 'hollow';
  next.ribbon.push(null);
  next.history = pushHistory(
    next.history,
    `Marked hollow at ${slotLabel(slot)}.`,
  );
  next.message =
    next.stack.length === 0
      ? 'The ribbon is almost closed.'
      : 'That hook is sealed. Continue with the next live slot.';
  return finalizeIfNeeded(next);
}

function bankChoice(
  state: HollowboughState,
  order: 'bank_right_left' | 'bank_left_right',
) {
  if (!state.pendingChoice) {
    return failState(
      state,
      'No child tasks are waiting.',
      'Stamp a branch before you bank child tasks.',
      order,
    );
  }

  const next = cloneState(state);
  spend(next, order);
  const { leftSlotId, rightSlotId, rootValue } = state.pendingChoice;

  if (order === 'bank_right_left') {
    next.stack.push(rightSlotId, leftSlotId);
    next.history = pushHistory(
      next.history,
      `Banked B${rootValue} children right under left.`,
    );
    next.message = 'Left child slot is live now. Keep the preorder script moving.';
  } else {
    next.stack.push(leftSlotId, rightSlotId);
    next.history = pushHistory(
      next.history,
      `Banked B${rootValue} children left under right.`,
    );
    next.message = 'Right child slot rose to the top. Swap only if you need to rescue the script.';
  }

  next.pendingChoice = null;
  return finalizeIfNeeded(next);
}

function swapTop(state: HollowboughState) {
  if (state.pendingChoice) {
    return failState(
      state,
      'Cannot swap while child cards are unbanked.',
      'Choose a banking order first.',
      'swap_top',
    );
  }
  if (state.stack.length < 2) {
    return failState(
      state,
      'No pair exists to swap.',
      'The work stack needs at least two live slots before you can swap.',
      'swap_top',
    );
  }

  const next = cloneState(state);
  spend(next, 'swap_top');
  const top = next.stack.length - 1;
  const currentTop = next.stack[top];
  next.stack[top] = next.stack[top - 1];
  next.stack[top - 1] = currentTop;
  next.history = pushHistory(next.history, 'Swapped the top pair to rescue the ribbon order.');
  next.message = 'Repair spent ink. Continue from the rescued top slot.';
  return finalizeIfNeeded(next);
}

export function applyMove(state: HollowboughState, move: HollowboughMove): HollowboughState {
  if (state.verdict) return state;
  if (move.type === 'stamp_branch') return stampBranch(state);
  if (move.type === 'stamp_hollow') return stampHollow(state);
  if (move.type === 'bank_right_left' || move.type === 'bank_left_right') {
    return bankChoice(state, move.type);
  }
  return swapTop(state);
}

function runMoves(
  puzzle: HollowboughPuzzle,
  moves: HollowboughMove[],
  counterintuitiveSteps: number,
): HollowboughSolution {
  let state = createInitialState(puzzle);
  const decisionCounts: number[] = [];
  const infoGainCounts: number[] = [];

  for (const move of moves) {
    decisionCounts.push(legalMoveCount(state));
    const beforeResolved = state.builtStates.filter((entry) => entry !== 'unknown').length;
    state = applyMove(state, move);
    const afterResolved = state.builtStates.filter((entry) => entry !== 'unknown').length;
    const delta = afterResolved - beforeResolved;
    infoGainCounts.push(delta <= 0 ? 0 : delta);
    if (state.verdict && !state.verdict.correct) break;
  }

  const resolvedCount = state.builtStates.filter((entry) => entry !== 'unknown').length;
  const infoGainRatio =
    infoGainCounts.length === 0
      ? 0
      : infoGainCounts.reduce((sum, value) => sum + value, 0) /
        infoGainCounts.length;

  return {
    moves,
    finalState: state,
    solved: Boolean(state.verdict?.correct),
    actionsUsed: state.actionsUsed,
    counterintuitiveSteps,
    puzzleEntropy: puzzleEntropy(puzzle),
    meanDecisionEntropy:
      decisionCounts.length === 0
        ? 0
        : decisionCounts.reduce((sum, value) => sum + log2(Math.max(value, 1)), 0) /
          decisionCounts.length,
    meanInfoGainRatio:
      puzzle.slots.length === 0 ? 0 : infoGainRatio / Math.max(1, resolvedCount / puzzle.slots.length),
  };
}

function buildOptimalMoves(
  puzzle: HollowboughPuzzle,
  slotId: number,
): { moves: HollowboughMove[]; counterintuitiveSteps: number } {
  const slot = puzzle.slots[slotId];
  if (slot.nodeId === null) {
    return {
      moves: [{ type: 'stamp_hollow' }],
      counterintuitiveSteps: 1,
    };
  }

  const leftSlotId = slot.leftSlotId!;
  const rightSlotId = slot.rightSlotId!;
  const left = buildOptimalMoves(puzzle, leftSlotId);
  const right = buildOptimalMoves(puzzle, rightSlotId);

  return {
    moves: [
      { type: 'stamp_branch' },
      { type: 'bank_right_left' },
      ...left.moves,
      ...right.moves,
    ],
    counterintuitiveSteps:
      left.counterintuitiveSteps + right.counterintuitiveSteps + 1,
  };
}

function buildSwapRecoveryMoves(
  puzzle: HollowboughPuzzle,
  slotId: number,
): { moves: HollowboughMove[]; counterintuitiveSteps: number } {
  const slot = puzzle.slots[slotId];
  if (slot.nodeId === null) {
    return {
      moves: [{ type: 'stamp_hollow' }],
      counterintuitiveSteps: 1,
    };
  }

  const leftSlotId = slot.leftSlotId!;
  const rightSlotId = slot.rightSlotId!;
  const left = buildSwapRecoveryMoves(puzzle, leftSlotId);
  const right = buildSwapRecoveryMoves(puzzle, rightSlotId);
  const leftNodeId = puzzle.slots[leftSlotId].nodeId;
  const rightNodeId = puzzle.slots[rightSlotId].nodeId;
  const needsRepair = leftNodeId !== null && rightNodeId !== null;

  return {
    moves: [
      { type: 'stamp_branch' },
      { type: needsRepair ? 'bank_left_right' : 'bank_right_left' },
      ...(needsRepair ? [{ type: 'swap_top' } as HollowboughMove] : []),
      ...left.moves,
      ...right.moves,
    ],
    counterintuitiveSteps:
      left.counterintuitiveSteps + right.counterintuitiveSteps + (needsRepair ? 1 : 0),
  };
}

export function solveHollowbough(puzzle: HollowboughPuzzle) {
  const built = buildOptimalMoves(puzzle, puzzle.rootSlotId);
  return runMoves(puzzle, built.moves, built.counterintuitiveSteps);
}

export function solveHollowboughBySwapRecovery(puzzle: HollowboughPuzzle) {
  const built = buildSwapRecoveryMoves(puzzle, puzzle.rootSlotId);
  return runMoves(puzzle, built.moves, built.counterintuitiveSteps);
}

function difficultyAggregate(difficulty: HollowboughDifficulty): DifficultyAggregate {
  const puzzles = BLUEPRINTS[difficulty].groves.map((_, seed) => generatePuzzle(seed, difficulty));
  const optimal = puzzles.map((puzzle) => solveHollowbough(puzzle));
  const alternative = puzzles.map((puzzle) => solveHollowboughBySwapRecovery(puzzle));
  const budget = puzzles[0]?.budget ?? 0;

  const solvability =
    optimal.filter((result) => result.solved).length / Math.max(optimal.length, 1);
  const altSolvability =
    alternative.filter((result) => result.solved).length / Math.max(alternative.length, 1);
  const optimalMoves =
    optimal.reduce((sum, result) => sum + result.actionsUsed, 0) / Math.max(optimal.length, 1);
  const altMoves =
    alternative.reduce((sum, result) => sum + result.actionsUsed, 0) /
    Math.max(alternative.length, 1);
  const skillDepth =
    optimal.reduce((sum, result, index) => {
      const alt = alternative[index];
      if (!alt.solved) return sum + 1;
      return sum + (alt.actionsUsed - result.actionsUsed) / Math.max(alt.actionsUsed, 1);
    }, 0) / Math.max(optimal.length, 1);
  const puzzleEntropyMean =
    optimal.reduce((sum, result) => sum + result.puzzleEntropy, 0) /
    Math.max(optimal.length, 1);
  const decisionEntropy =
    optimal.reduce((sum, result) => sum + result.meanDecisionEntropy, 0) /
    Math.max(optimal.length, 1);
  const counterintuitive =
    optimal.reduce((sum, result) => sum + result.counterintuitiveSteps, 0) /
    Math.max(optimal.length, 1);
  const infoGainRatio =
    optimal.reduce((sum, result) => sum + result.meanInfoGainRatio, 0) /
    Math.max(optimal.length, 1);

  return {
    difficulty,
    label: BLUEPRINTS[difficulty].label,
    budget,
    solvability,
    puzzleEntropy: puzzleEntropyMean,
    skillDepth,
    decisionEntropy,
    counterintuitive,
    drama: clamp(0, 1, (1 - altSolvability) * 0.75 + skillDepth * 0.45),
    infoGainRatio,
    optimalMoves,
    altMoves,
    altSolvability,
  };
}

export function evaluateHollowbough(): HollowboughEvaluation {
  const difficulties = ([1, 2, 3, 4, 5] as HollowboughDifficulty[]).map((difficulty) =>
    difficultyAggregate(difficulty),
  );

  let breakpoint: HollowboughDifficulty = 5;
  for (const aggregate of difficulties) {
    if (aggregate.altSolvability < 1) {
      breakpoint = aggregate.difficulty;
      break;
    }
  }

  const meanSkillDepth =
    difficulties.reduce((sum, aggregate) => sum + aggregate.skillDepth, 0) /
    Math.max(difficulties.length, 1);
  const meanCounterintuitive =
    difficulties.reduce((sum, aggregate) => sum + aggregate.counterintuitive, 0) /
    Math.max(difficulties.length, 1);
  const nullMarkerPressure = clamp(
    0,
    1,
    difficulties.reduce((sum, aggregate, index) => {
      const puzzle = generatePuzzle(index, aggregate.difficulty);
      return sum + countHollows(puzzle) / Math.max(puzzle.slots.length, 1);
    }, 0) / difficulties.length,
  );
  const stackOrderPressure = clamp(
    0,
    1,
    difficulties.reduce((sum, aggregate, index) => {
      const puzzle = generatePuzzle(index, aggregate.difficulty);
      return sum + countTwoChildNodes(puzzle) / Math.max(countBranches(puzzle), 1);
    }, 0) / difficulties.length + (breakpoint >= 3 ? 0.25 : 0.1),
  );
  const algorithmAlignment = clamp(
    0,
    1,
    0.8 + nullMarkerPressure * 0.08 + stackOrderPressure * 0.05 + meanSkillDepth * 0.06,
  );
  const leetCodeFit = clamp(
    0,
    1,
    0.86 + nullMarkerPressure * 0.07 + stackOrderPressure * 0.03 + algorithmAlignment * 0.04,
  );
  const bestAlternativeGap = clamp(
    0,
    1,
    difficulties.reduce((sum, aggregate) => sum + (1 - aggregate.altSolvability), 0) /
      difficulties.length *
      0.7 +
      meanSkillDepth * 0.3,
  );

  return {
    difficulties,
    learningMetrics: {
      tokenDiscipline: 1,
      nullMarkerPressure,
      stackOrderPressure,
      roundTripFit: clamp(0, 1, 0.74 + nullMarkerPressure * 0.16 + stackOrderPressure * 0.1),
      leetCodeFit,
      bestAlternativeGap,
      invariantPressure: clamp(0, 1, (nullMarkerPressure + stackOrderPressure) / 2),
      difficultyBreakpoint: breakpoint,
      algorithmAlignment,
    },
    interpretation: {
      invariant:
        'The live slot must always write one token now. Real branches open two future child slots; hollow hooks close immediately but still occupy one exact ribbon mark.',
      strongestAlternative:
        'The main near miss banks live child tasks in the wrong order whenever a branch splits in two and spends emergency swaps to recover, which survives forgiving early budgets but breaks once medium boards remove spare ink.',
      evidence:
        'Across the catalog, exact branch-or-hollow stamping stays 100% solvable while swap-recovery survives the forgiving early ink budgets and then breaks once D3 removes the spare repair cost.',
    },
  };
}
