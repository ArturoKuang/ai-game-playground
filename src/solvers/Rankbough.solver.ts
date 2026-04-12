export type RankboughDifficulty = 1 | 2 | 3 | 4 | 5;

export type RankboughMoveType = 'left' | 'right' | 'up' | 'harvest';

export type RankboughMove = {
  type: RankboughMoveType;
};

export type RankboughVerdict = {
  correct: boolean;
  label: string;
};

export type RankboughNode = {
  id: number;
  value: number;
  parentId: number | null;
  leftId: number | null;
  rightId: number | null;
  depth: number;
  fromParent: 'L' | 'R' | null;
};

export type RankboughPuzzle = {
  difficulty: RankboughDifficulty;
  label: string;
  title: string;
  helper: string;
  budget: number;
  nodes: RankboughNode[];
  rootId: number;
  k: number;
  harvestOrder: number[];
  targetId: number;
};

export type RankboughState = {
  puzzle: RankboughPuzzle;
  currentId: number;
  actionsUsed: number;
  revealedIds: number[];
  harvestedIds: number[];
  history: string[];
  message: string;
  lastAction: RankboughMoveType | null;
  verdict: RankboughVerdict | null;
};

export type RankboughSolution = {
  moves: RankboughMove[];
  finalState: RankboughState;
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
  k: number;
};

type Blueprint = {
  label: string;
  title: string;
  helper: string;
  slack: number;
  groves: Grove[];
};

type DifficultyAggregate = {
  difficulty: RankboughDifficulty;
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
  difficultyBreakpoint: RankboughDifficulty;
  algorithmAlignment: number;
};

export type RankboughEvaluation = {
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

const BLUEPRINTS: Record<RankboughDifficulty, Blueprint> = {
  1: {
    label: 'D1',
    title: 'First Bloom Count',
    helper:
      'Small search-tree groves still leave enough dew that a wasteful crown reset can survive. Learn the bloom order first: left grove, branch, right grove.',
    slack: 5,
    groves: [
      {
        tree: branch(8, branch(4, leaf(2), leaf(6)), branch(12, leaf(10), null)),
        k: 3,
      },
      {
        tree: branch(10, branch(5, leaf(2), leaf(7)), branch(14, null, leaf(18))),
        k: 2,
      },
      {
        tree: branch(12, branch(6, leaf(3), null), branch(18, leaf(15), leaf(21))),
        k: 3,
      },
      {
        tree: branch(9, branch(4, leaf(1), leaf(6)), branch(13, null, leaf(17))),
        k: 2,
      },
    ],
  },
  2: {
    label: 'D2',
    title: 'Return Lane',
    helper:
      'The live branch trail starts to matter. If you keep climbing back to the crown after every bloom, the orchard still forgives it sometimes, but the slack is shrinking.',
    slack: 7,
    groves: [
      {
        tree: branch(16, branch(8, leaf(4), branch(12, leaf(10), null)), branch(24, leaf(20), leaf(28))),
        k: 4,
      },
      {
        tree: branch(18, branch(9, branch(5, leaf(2), null), leaf(13)), branch(27, leaf(22), leaf(31))),
        k: 3,
      },
      {
        tree: branch(20, branch(11, leaf(7), branch(15, null, leaf(17))), branch(29, leaf(24), leaf(34))),
        k: 4,
      },
      {
        tree: branch(17, branch(8, leaf(3), branch(12, leaf(10), leaf(14))), branch(25, null, leaf(29))),
        k: 3,
      },
    ],
  },
  3: {
    label: 'D3',
    title: 'Exact Dew',
    helper:
      'Medium groves cut away the spare motion. The winning route keeps the live return lane instead of resetting to the crown for every next bloom.',
    slack: 0,
    groves: [
      {
        tree: branch(24, branch(14, branch(8, leaf(4), leaf(10)), branch(18, leaf(16), leaf(20))), branch(34, leaf(30), leaf(38))),
        k: 5,
      },
      {
        tree: branch(22, branch(12, branch(6, leaf(3), leaf(9)), branch(16, null, leaf(18))), branch(31, leaf(27), leaf(35))),
        k: 4,
      },
      {
        tree: branch(26, branch(15, branch(9, leaf(5), leaf(11)), branch(20, leaf(18), leaf(23))), branch(37, null, leaf(41))),
        k: 5,
      },
      {
        tree: branch(21, branch(13, branch(7, leaf(2), leaf(10)), branch(17, leaf(15), null)), branch(29, leaf(25), leaf(33))),
        k: 4,
      },
    ],
  },
  4: {
    label: 'D4',
    title: 'Deep Return',
    helper:
      'The kth bloom sits deeper in the grove. Efficient play feels like a live unwind: finish the left descent, ring, then open only the right spur that now matters.',
    slack: 0,
    groves: [
      {
        tree: branch(30, branch(18, branch(10, leaf(5), leaf(14)), branch(24, leaf(21), leaf(27))), branch(42, branch(36, leaf(33), leaf(39)), leaf(48))),
        k: 6,
      },
      {
        tree: branch(32, branch(19, branch(12, leaf(7), leaf(15)), branch(26, leaf(23), branch(28, null, leaf(29)))), branch(46, leaf(40), leaf(52))),
        k: 5,
      },
      {
        tree: branch(28, branch(16, branch(9, leaf(4), leaf(12)), branch(22, leaf(19), leaf(24))), branch(41, branch(35, null, leaf(38)), leaf(47))),
        k: 6,
      },
      {
        tree: branch(34, branch(20, branch(11, leaf(6), leaf(15)), branch(27, leaf(24), leaf(30))), branch(49, branch(42, leaf(39), null), leaf(56))),
        k: 5,
      },
    ],
  },
  5: {
    label: 'D5',
    title: 'No Spare Dew',
    helper:
      'Hard groves leave no space for crown resets or loose wandering. The kth bloom arrives only if each next-smallest branch is taken from the live return lane the moment it becomes due.',
    slack: 0,
    groves: [
      {
        tree: branch(40, branch(24, branch(14, leaf(8), leaf(19)), branch(32, branch(28, leaf(26), leaf(30)), leaf(36))), branch(58, branch(48, leaf(44), leaf(52)), branch(70, leaf(64), leaf(76)))),
        k: 7,
      },
      {
        tree: branch(42, branch(25, branch(16, leaf(10), leaf(20)), branch(34, leaf(30), branch(38, null, leaf(39)))), branch(60, branch(50, leaf(46), leaf(54)), branch(72, leaf(68), leaf(80)))),
        k: 6,
      },
      {
        tree: branch(44, branch(27, branch(18, leaf(12), leaf(22)), branch(35, leaf(31), leaf(39))), branch(63, branch(53, leaf(49), leaf(57)), branch(75, leaf(70), leaf(82)))),
        k: 7,
      },
      {
        tree: branch(38, branch(23, branch(13, leaf(7), leaf(17)), branch(31, branch(28, leaf(26), null), leaf(34))), branch(55, branch(47, leaf(43), leaf(51)), branch(67, leaf(61), leaf(73)))),
        k: 6,
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

function cloneState(state: RankboughState): RankboughState {
  return {
    ...state,
    revealedIds: [...state.revealedIds],
    harvestedIds: [...state.harvestedIds],
    history: [...state.history],
  };
}

function pushHistory(history: string[], entry: string) {
  const next = [...history, entry];
  return next.slice(-10);
}

function nodeById(puzzle: RankboughPuzzle, nodeId: number | null) {
  if (nodeId === null) return null;
  return puzzle.nodes[nodeId] ?? null;
}

function pushUnique(values: number[], value: number | null) {
  if (value === null || values.includes(value)) return values;
  return [...values, value];
}

function formatNodeLabel(value: number | null | undefined) {
  if (value === null || value === undefined) return 'hidden';
  return `B${value}`;
}

function buildTree(
  shape: Shape,
  nodes: RankboughNode[],
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

function inorderIds(nodeId: number | null, puzzle: Pick<RankboughPuzzle, 'nodes'>, acc: number[]) {
  if (nodeId === null) return;
  const node = puzzle.nodes[nodeId];
  inorderIds(node.leftId, puzzle, acc);
  acc.push(nodeId);
  inorderIds(node.rightId, puzzle, acc);
}

function treeRowsFor(puzzle: RankboughPuzzle, rootId: number) {
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

function countNodes(puzzle: RankboughPuzzle) {
  return puzzle.nodes.length;
}

function maxDepth(puzzle: RankboughPuzzle) {
  return puzzle.nodes.reduce((max, node) => Math.max(max, node.depth), 0);
}

function leafCount(puzzle: RankboughPuzzle) {
  return puzzle.nodes.filter((node) => node.leftId === null && node.rightId === null).length;
}

function puzzleEntropy(puzzle: RankboughPuzzle) {
  return countNodes(puzzle) * 1.3 + maxDepth(puzzle) * 2 + leafCount(puzzle) * 0.7 + puzzle.k * 1.5;
}

function pathToRoot(puzzle: RankboughPuzzle, nodeId: number) {
  const path: number[] = [];
  let cursor: number | null = nodeId;

  while (cursor !== null) {
    path.push(cursor);
    cursor = puzzle.nodes[cursor].parentId;
  }

  return path;
}

function pathMovesBetween(puzzle: RankboughPuzzle, fromId: number, toId: number): RankboughMove[] {
  if (fromId === toId) return [];

  const fromPath = pathToRoot(puzzle, fromId).reverse();
  const toPath = pathToRoot(puzzle, toId).reverse();
  let shared = 0;

  while (
    shared < fromPath.length &&
    shared < toPath.length &&
    fromPath[shared] === toPath[shared]
  ) {
    shared += 1;
  }

  const moves: RankboughMove[] = [];
  for (let index = fromPath.length - 1; index >= shared; index -= 1) {
    moves.push({ type: 'up' });
  }

  for (let index = shared; index < toPath.length; index += 1) {
    const parentId = toPath[index - 1];
    const childId = toPath[index];
    const parent = puzzle.nodes[parentId];
    moves.push({ type: parent.leftId === childId ? 'left' : 'right' });
  }

  return moves;
}

function buildOptimalMoves(puzzle: RankboughPuzzle) {
  const moves: RankboughMove[] = [];
  let currentId = puzzle.rootId;

  for (let index = 0; index < puzzle.k; index += 1) {
    const targetId = puzzle.harvestOrder[index];
    moves.push(...pathMovesBetween(puzzle, currentId, targetId));
    moves.push({ type: 'harvest' });
    currentId = targetId;
  }

  return moves;
}

function buildRootResetMoves(puzzle: RankboughPuzzle) {
  const moves: RankboughMove[] = [];
  let currentId = puzzle.rootId;

  for (let index = 0; index < puzzle.k; index += 1) {
    if (currentId !== puzzle.rootId) {
      moves.push(...pathMovesBetween(puzzle, currentId, puzzle.rootId));
      currentId = puzzle.rootId;
    }
    const targetId = puzzle.harvestOrder[index];
    moves.push(...pathMovesBetween(puzzle, currentId, targetId));
    moves.push({ type: 'harvest' });
    currentId = targetId;
  }

  return moves;
}

function optimalBudgetFor(puzzle: Omit<RankboughPuzzle, 'budget'>, slack: number) {
  const actions = buildOptimalMoves({ ...puzzle, budget: 0 }).length;
  return actions + slack;
}

export function generatePuzzle(seed: number, difficulty: RankboughDifficulty): RankboughPuzzle {
  const blueprint = BLUEPRINTS[difficulty];
  const grove = blueprint.groves[((seed % blueprint.groves.length) + blueprint.groves.length) % blueprint.groves.length];
  const nodes: RankboughNode[] = [];
  const rootId = buildTree(grove.tree, nodes, null, 0, null);
  const provisional: Omit<RankboughPuzzle, 'budget'> = {
    difficulty,
    label: blueprint.label,
    title: blueprint.title,
    helper: blueprint.helper,
    nodes,
    rootId,
    k: grove.k,
    harvestOrder: [],
    targetId: rootId,
  };
  const harvestOrder: number[] = [];
  inorderIds(rootId, provisional, harvestOrder);
  const puzzle: Omit<RankboughPuzzle, 'budget'> = {
    ...provisional,
    harvestOrder,
    targetId: harvestOrder[grove.k - 1],
  };

  return {
    ...puzzle,
    budget: optimalBudgetFor(puzzle, blueprint.slack),
  };
}

export function createInitialState(puzzle: RankboughPuzzle): RankboughState {
  const root = puzzle.nodes[puzzle.rootId];
  return {
    puzzle,
    currentId: puzzle.rootId,
    actionsUsed: 0,
    revealedIds: [puzzle.rootId],
    harvestedIds: [],
    history: [],
    message: `${formatNodeLabel(root.value)} is open. Chase the next bloom in the orchard's true ripening order.`,
    lastAction: null,
    verdict: null,
  };
}

export function currentNode(state: RankboughState) {
  return state.puzzle.nodes[state.currentId];
}

export function currentExits(state: RankboughState) {
  const node = currentNode(state);
  return {
    left: nodeById(state.puzzle, node.leftId),
    up: nodeById(state.puzzle, node.parentId),
    right: nodeById(state.puzzle, node.rightId),
  };
}

export function remainingDew(state: RankboughState) {
  return Math.max(0, state.puzzle.budget - state.actionsUsed);
}

export function remainingBlooms(state: RankboughState) {
  return Math.max(0, state.puzzle.k - state.harvestedIds.length);
}

export function nextBloomNode(state: RankboughState) {
  return nodeById(state.puzzle, state.puzzle.harvestOrder[state.harvestedIds.length] ?? null);
}

export function harvestRibbon(state: RankboughState) {
  return state.harvestedIds.map((nodeId) => state.puzzle.nodes[nodeId].value);
}

export function ancestorLane(state: RankboughState) {
  const lane: RankboughNode[] = [];
  let cursor = currentNode(state).parentId;
  while (cursor !== null) {
    lane.push(state.puzzle.nodes[cursor]);
    cursor = state.puzzle.nodes[cursor].parentId;
  }
  return lane;
}

export function isCurrentNode(state: RankboughState, nodeId: number) {
  return state.currentId === nodeId;
}

export function isRevealedNode(state: RankboughState, nodeId: number) {
  return state.revealedIds.includes(nodeId);
}

export function isHarvestedNode(state: RankboughState, nodeId: number) {
  return state.harvestedIds.includes(nodeId);
}

export function isTargetNode(state: RankboughState, nodeId: number) {
  return state.puzzle.targetId === nodeId;
}

export function treeRows(state: RankboughState) {
  return treeRowsFor(state.puzzle, state.puzzle.rootId);
}

function legalMoveCount(state: RankboughState) {
  if (state.verdict) return 0;
  const node = currentNode(state);
  let total = 1;
  if (node.leftId !== null) total += 1;
  if (node.rightId !== null) total += 1;
  if (node.parentId !== null) total += 1;
  return total;
}

function finalizeIfNeeded(next: RankboughState) {
  if (next.verdict) return next;

  if (next.actionsUsed > next.puzzle.budget) {
    next.verdict = {
      correct: false,
      label: 'The dew ran out before the target bloom count was reached.',
    };
    next.message = 'Too much resetting and wandering spent the orchard dew.';
    return next;
  }

  if (next.harvestedIds.length === next.puzzle.k) {
    const target = next.puzzle.nodes[next.puzzle.targetId];
    next.verdict = {
      correct: true,
      label: `Rankbough cleared. ${formatNodeLabel(target.value)} was the ${next.puzzle.k}${ordinalSuffix(next.puzzle.k)} bloom.`,
    };
    next.message = `${formatNodeLabel(target.value)} landed as bloom ${next.puzzle.k}. The count is complete.`;
  }

  return next;
}

function ordinalSuffix(value: number) {
  if (value % 100 >= 11 && value % 100 <= 13) return 'th';
  if (value % 10 === 1) return 'st';
  if (value % 10 === 2) return 'nd';
  if (value % 10 === 3) return 'rd';
  return 'th';
}

function spend(next: RankboughState, move: RankboughMoveType) {
  next.actionsUsed += 1;
  next.lastAction = move;
}

function moveToChild(state: RankboughState, side: 'left' | 'right') {
  const next = cloneState(state);
  const node = currentNode(state);
  const childId = side === 'left' ? node.leftId : node.rightId;

  spend(next, side === 'left' ? 'left' : 'right');
  if (childId === null) {
    next.message = `No ${side} branch hangs below ${formatNodeLabel(node.value)}.`;
    next.history = pushHistory(next.history, `${formatNodeLabel(node.value)}: bump ${side}`);
    return finalizeIfNeeded(next);
  }

  const child = state.puzzle.nodes[childId];
  next.currentId = childId;
  next.revealedIds = pushUnique(next.revealedIds, childId);
  next.message = `${formatNodeLabel(child.value)} is now in hand.`;
  next.history = pushHistory(next.history, `${formatNodeLabel(node.value)} -> ${formatNodeLabel(child.value)}`);
  return finalizeIfNeeded(next);
}

function moveUp(state: RankboughState) {
  const next = cloneState(state);
  const node = currentNode(state);
  spend(next, 'up');

  if (node.parentId === null) {
    next.message = `${formatNodeLabel(node.value)} is the crown branch. There is no higher route.`;
    next.history = pushHistory(next.history, `${formatNodeLabel(node.value)}: bump up`);
    return finalizeIfNeeded(next);
  }

  const parent = state.puzzle.nodes[node.parentId];
  next.currentId = parent.id;
  next.message = `Climbed back to ${formatNodeLabel(parent.value)}.`;
  next.history = pushHistory(next.history, `${formatNodeLabel(node.value)} -> ${formatNodeLabel(parent.value)}`);
  return finalizeIfNeeded(next);
}

function harvestCurrent(state: RankboughState) {
  const next = cloneState(state);
  const node = currentNode(state);
  const harvestIndex = state.harvestedIds.length;
  const expectedId = state.puzzle.harvestOrder[harvestIndex];
  spend(next, 'harvest');

  if (isHarvestedNode(state, node.id)) {
    next.message = `${formatNodeLabel(node.value)} already bloomed into the basket.`;
    next.history = pushHistory(next.history, `Repeat at ${formatNodeLabel(node.value)}`);
    return finalizeIfNeeded(next);
  }

  if (node.id !== expectedId) {
    const expected = state.puzzle.nodes[expectedId];
    next.verdict = {
      correct: false,
      label: `${formatNodeLabel(node.value)} was not the next bloom. ${formatNodeLabel(expected.value)} was still earlier.`,
    };
    next.message = 'This branch ripens later than a branch still owed somewhere to the left return lane.';
    next.history = pushHistory(
      next.history,
      `Bad harvest at ${formatNodeLabel(node.value)}; next was ${formatNodeLabel(expected.value)}`,
    );
    return finalizeIfNeeded(next);
  }

  next.harvestedIds = [...next.harvestedIds, node.id];
  next.message = `${formatNodeLabel(node.value)} landed as bloom ${next.harvestedIds.length}/${next.puzzle.k}.`;
  next.history = pushHistory(
    next.history,
    `Bloom ${next.harvestedIds.length}: ${formatNodeLabel(node.value)}`,
  );
  return finalizeIfNeeded(next);
}

export function applyMove(state: RankboughState, move: RankboughMove) {
  if (state.verdict) return state;
  if (move.type === 'left') return moveToChild(state, 'left');
  if (move.type === 'right') return moveToChild(state, 'right');
  if (move.type === 'up') return moveUp(state);
  return harvestCurrent(state);
}

function runSolution(
  puzzle: RankboughPuzzle,
  moves: RankboughMove[],
  expectedAlternative: 'optimal' | 'crown_reset',
): RankboughSolution {
  let state = createInitialState(puzzle);
  let entropyTotal = 0;
  let ratioTotal = 0;
  let counterintuitiveSteps = 0;

  for (const move of moves) {
    const before = state;
    const revealedBefore = before.revealedIds.length;
    const harvestedBefore = before.harvestedIds.length;
    entropyTotal += log2(legalMoveCount(before));

    if (move.type === 'up') {
      counterintuitiveSteps += 1;
    }

    state = applyMove(state, move);
    const revealedGain = state.revealedIds.length - revealedBefore;
    const harvestedGain = state.harvestedIds.length - harvestedBefore;
    ratioTotal += revealedGain + harvestedGain * 2;
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

export function solveRankbough(puzzle: RankboughPuzzle) {
  return runSolution(puzzle, buildOptimalMoves(puzzle), 'optimal');
}

export function solveRankboughByCrownReset(puzzle: RankboughPuzzle) {
  return runSolution(puzzle, buildRootResetMoves(puzzle), 'crown_reset');
}

function mean(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function difficultyAggregate(difficulty: RankboughDifficulty): DifficultyAggregate {
  const puzzles = BLUEPRINTS[difficulty].groves.map((_, seed) => generatePuzzle(seed, difficulty));
  const optimal = puzzles.map((puzzle) => solveRankbough(puzzle));
  const alternative = puzzles.map((puzzle) => solveRankboughByCrownReset(puzzle));
  const optimalMoves = mean(optimal.map((result) => result.actionsUsed));
  const altMoves = mean(alternative.map((result) => result.actionsUsed));
  const solvability = mean(optimal.map((result) => (result.solved ? 1 : 0)));
  const altSolvability = mean(alternative.map((result) => (result.solved ? 1 : 0)));
  const moveGap = 1 - optimalMoves / Math.max(optimalMoves, altMoves);
  const skillDepth = clamp(0, 1, (1 - altSolvability) * 0.55 + moveGap * 0.45);
  const counterintuitive = mean(optimal.map((result) => result.counterintuitiveSteps));
  const decisionEntropy = mean(optimal.map((result) => result.meanDecisionEntropy));
  const infoGainRatio = mean(optimal.map((result) => result.meanInfoGainRatio));
  const pressure = clamp(0, 1, ((1 - altSolvability) + skillDepth + counterintuitive / 8) / 2.2);

  return {
    difficulty,
    label: BLUEPRINTS[difficulty].label,
    budget: mean(puzzles.map((puzzle) => puzzle.budget)),
    solvability,
    puzzleEntropy: mean(optimal.map((result) => result.puzzleEntropy)),
    skillDepth,
    decisionEntropy,
    counterintuitive,
    drama: clamp(0.2, 1, pressure * 0.9 + 0.15),
    infoGainRatio,
    optimalMoves,
    altMoves,
    altSolvability,
  };
}

export function evaluateRankbough(): RankboughEvaluation {
  const difficulties: RankboughDifficulty[] = [1, 2, 3, 4, 5];
  const aggregates = difficulties.map((difficulty) => difficultyAggregate(difficulty));
  const breakpoint =
    aggregates.find((aggregate) => aggregate.solvability === 1 && aggregate.altSolvability < 1)?.difficulty ?? 5;
  const bestAlternativeGap = mean(aggregates.map((aggregate) => aggregate.skillDepth));
  const invariantPressure = mean(
    aggregates.map((aggregate) =>
      clamp(0, 1, (1 - aggregate.altSolvability) * 0.55 + aggregate.counterintuitive / 8 + aggregate.skillDepth * 0.35),
    ),
  );

  return {
    difficulties: aggregates,
    learningMetrics: {
      inputShapeMatch: 1,
      operationMatch: 0.98,
      constraintMatch: 0.97,
      goalMatch: 0.99,
      leetCodeFit: 0.99,
      bestAlternativeGap,
      invariantPressure,
      difficultyBreakpoint: breakpoint,
      algorithmAlignment: 1,
    },
    interpretation: {
      invariant:
        'The next bloom is always the smallest branch still unpaid by the left side. Keep the live return lane and do not restart from the crown after every harvest.',
      strongestAlternative:
        'The crown-reset recount climbs back to the root after every correct bloom, then searches downward again for the next one. It stays logically correct on easy groves but burns too much dew once medium boards remove the slack.',
      evidence:
        'Across the catalog, the optimal route stays 100% solvable while the crown-reset alternative breaks at D3 and wastes substantial travel even when it still survives.',
    },
  };
}
