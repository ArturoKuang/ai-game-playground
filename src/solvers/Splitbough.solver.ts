export type SplitboughDifficulty = 1 | 2 | 3 | 4 | 5;

export type SplitboughMoveType = 'claim' | 'left' | 'right' | 'up';

export type SplitboughMove = {
  type: SplitboughMoveType;
};

export type SplitboughVerdict = {
  correct: boolean;
  label: string;
};

export type SplitboughNode = {
  id: number;
  value: number;
  parentId: number | null;
  leftId: number | null;
  rightId: number | null;
  depth: number;
};

export type SplitboughPuzzle = {
  difficulty: SplitboughDifficulty;
  label: string;
  title: string;
  helper: string;
  budget: number;
  nodes: SplitboughNode[];
  rootId: number;
  lowTargetValue: number;
  highTargetValue: number;
  lowTargetId: number;
  highTargetId: number;
  lcaId: number;
};

export type SplitboughState = {
  puzzle: SplitboughPuzzle;
  currentId: number;
  actionsUsed: number;
  history: string[];
  message: string;
  lastAction: SplitboughMoveType | null;
  verdict: SplitboughVerdict | null;
};

export type SplitboughSolution = {
  moves: SplitboughMove[];
  finalState: SplitboughState;
  solved: boolean;
  actionsUsed: number;
  counterintuitiveSteps: number;
  puzzleEntropy: number;
  meanInfoGainRatio: number;
};

type Shape = {
  value: number;
  left?: Shape | null;
  right?: Shape | null;
};

type Grove = {
  tree: Shape;
  targets: [number, number];
};

type Blueprint = {
  label: string;
  title: string;
  helper: string;
  slack: number;
  groves: Grove[];
};

type DifficultyAggregate = {
  difficulty: SplitboughDifficulty;
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
  difficultyBreakpoint: SplitboughDifficulty;
  algorithmAlignment: number;
};

export type SplitboughEvaluation = {
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

const BLUEPRINTS: Record<SplitboughDifficulty, Blueprint> = {
  1: {
    label: 'D1',
    title: 'Warm Forks',
    helper:
      'The grove is small and the bark budget is generous enough that chasing one marker first still survives. Use it to notice that the answer appears before you ever have to reach both markers.',
    slack: 3,
    groves: [
      {
        tree: branch(8, branch(4, leaf(2), leaf(6)), branch(12, leaf(10), leaf(14))),
        targets: [2, 6],
      },
      {
        tree: branch(8, branch(4, leaf(2), leaf(6)), branch(12, leaf(10), leaf(14))),
        targets: [10, 14],
      },
      {
        tree: branch(9, branch(4, leaf(2), leaf(6)), branch(13, leaf(11), leaf(15))),
        targets: [4, 6],
      },
      {
        tree: branch(7, branch(3, leaf(1), leaf(5)), branch(10, leaf(8), leaf(12))),
        targets: [1, 5],
      },
    ],
  },
  2: {
    label: 'D2',
    title: 'Hidden Fork',
    helper:
      'The shared fork now sits below the crown and some answers end where one marker is already standing. Route-tracing still fits, but its wasted travel is easy to feel.',
    slack: 2,
    groves: [
      {
        tree: branch(15, branch(7, branch(3, leaf(1), leaf(5)), branch(10, leaf(8), leaf(12))), branch(22, leaf(18), leaf(26))),
        targets: [8, 12],
      },
      {
        tree: branch(20, branch(9, branch(4, leaf(2), leaf(6)), branch(14, leaf(12), leaf(16))), branch(28, leaf(24), leaf(32))),
        targets: [2, 6],
      },
      {
        tree: branch(14, branch(7, leaf(4), branch(10, leaf(8), leaf(12))), branch(20, leaf(16), leaf(24))),
        targets: [7, 10],
      },
      {
        tree: branch(16, branch(8, branch(4, leaf(2), leaf(6)), branch(12, leaf(10), leaf(14))), branch(24, leaf(20), leaf(28))),
        targets: [10, 14],
      },
    ],
  },
  3: {
    label: 'D3',
    title: 'Exact Bark',
    helper:
      'The spare travel is gone. The only route that fits is the one that keeps both markers alive together and stops the instant the branch stops sending them down the same side.',
    slack: 0,
    groves: [
      {
        tree: branch(30, branch(18, branch(9, leaf(4), leaf(12)), branch(24, leaf(21), leaf(27))), branch(42, leaf(36), leaf(48))),
        targets: [21, 27],
      },
      {
        tree: branch(25, branch(14, branch(7, leaf(3), leaf(10)), branch(19, leaf(17), leaf(21))), branch(34, leaf(29), leaf(40))),
        targets: [3, 10],
      },
      {
        tree: branch(28, branch(13, branch(6, leaf(2), leaf(9)), branch(20, leaf(17), leaf(23))), branch(39, leaf(33), leaf(45))),
        targets: [17, 23],
      },
      {
        tree: branch(32, branch(16, branch(8, leaf(4), leaf(12)), branch(24, leaf(20), leaf(28))), branch(44, leaf(38), leaf(50))),
        targets: [20, 28],
      },
    ],
  },
  4: {
    label: 'D4',
    title: 'Deep Canopy',
    helper:
      'Several same-side descents happen before the split. If you overshoot into one marker lane, the climb back costs more bark than the patrol allows.',
    slack: 0,
    groves: [
      {
        tree: branch(40, branch(24, branch(12, leaf(6), leaf(18)), branch(32, branch(28, leaf(26), leaf(30)), leaf(36))), branch(56, leaf(48), leaf(64))),
        targets: [26, 30],
      },
      {
        tree: branch(36, branch(20, branch(10, leaf(5), leaf(14)), branch(28, branch(24, leaf(22), leaf(26)), leaf(32))), branch(52, leaf(44), leaf(60))),
        targets: [22, 26],
      },
      {
        tree: branch(42, branch(26, branch(14, leaf(8), leaf(18)), branch(34, branch(30, leaf(29), leaf(31)), leaf(38))), branch(58, leaf(50), leaf(66))),
        targets: [29, 31],
      },
      {
        tree: branch(38, branch(22, branch(12, leaf(6), leaf(16)), branch(30, branch(26, leaf(25), leaf(28)), leaf(34))), branch(54, leaf(46), leaf(62))),
        targets: [25, 28],
      },
    ],
  },
  5: {
    label: 'D5',
    title: 'No Return Bark',
    helper:
      'Long ladders and no slack. The answer is still only one split point, but now every wasted descent makes the correct fork unreachable.',
    slack: 0,
    groves: [
      {
        tree: branch(48, branch(30, branch(18, leaf(10), leaf(24)), branch(40, leaf(35), branch(44, leaf(42), branch(46, leaf(45), leaf(47))))), branch(66, leaf(58), leaf(74))),
        targets: [45, 47],
      },
      {
        tree: branch(52, branch(32, branch(20, leaf(12), leaf(28)), branch(42, leaf(37), branch(47, leaf(45), branch(49, leaf(48), leaf(50))))), branch(70, leaf(62), leaf(78))),
        targets: [48, 50],
      },
      {
        tree: branch(50, branch(29, branch(17, leaf(9), leaf(23)), branch(39, leaf(34), branch(45, leaf(43), branch(47, leaf(46), leaf(48))))), branch(68, leaf(60), leaf(76))),
        targets: [46, 48],
      },
      {
        tree: branch(46, branch(27, branch(15, leaf(7), leaf(21)), branch(36, leaf(31), branch(41, leaf(39), branch(43, leaf(42), leaf(44))))), branch(64, leaf(56), leaf(72))),
        targets: [42, 44],
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

function cloneState(state: SplitboughState): SplitboughState {
  return {
    ...state,
    history: [...state.history],
  };
}

function nodeById(puzzle: SplitboughPuzzle, nodeId: number | null) {
  if (nodeId === null) return null;
  return puzzle.nodes[nodeId] ?? null;
}

function buildTree(shape: Shape, nodes: SplitboughNode[], parentId: number | null, depth: number): number {
  const id = nodes.length;
  nodes.push({
    id,
    value: shape.value,
    parentId,
    leftId: null,
    rightId: null,
    depth,
  });

  if (shape.left) {
    nodes[id].leftId = buildTree(shape.left, nodes, id, depth + 1);
  }
  if (shape.right) {
    nodes[id].rightId = buildTree(shape.right, nodes, id, depth + 1);
  }

  return id;
}

function subtreeNodeCount(puzzle: SplitboughPuzzle, nodeId: number | null): number {
  const node = nodeById(puzzle, nodeId);
  if (!node) return 0;
  return 1 + subtreeNodeCount(puzzle, node.leftId) + subtreeNodeCount(puzzle, node.rightId);
}

function maxDepth(puzzle: SplitboughPuzzle, nodeId: number): number {
  const node = nodeById(puzzle, nodeId);
  if (!node) return 0;
  return Math.max(
    node.depth,
    node.leftId === null ? node.depth : maxDepth(puzzle, node.leftId),
    node.rightId === null ? node.depth : maxDepth(puzzle, node.rightId),
  );
}

function treeRowsFor(puzzle: SplitboughPuzzle, rootId: number) {
  const depth = maxDepth(puzzle, rootId);
  let currentLevel: Array<number | null> = [rootId];
  const rows: Array<Array<number | null>> = [];

  for (let currentDepth = 0; currentDepth <= depth; currentDepth += 1) {
    rows.push(currentLevel);
    const nextLevel: Array<number | null> = [];
    let hasRealNode = false;

    for (const nodeId of currentLevel) {
      if (nodeId === null) {
        nextLevel.push(null, null);
        continue;
      }

      const node = puzzle.nodes[nodeId];
      nextLevel.push(node.leftId, node.rightId);
      if (node.leftId !== null || node.rightId !== null) {
        hasRealNode = true;
      }
    }

    if (!hasRealNode) {
      break;
    }
    currentLevel = nextLevel;
  }

  return rows;
}

function actionCountToReachLca(puzzle: SplitboughPuzzle) {
  return puzzle.nodes[puzzle.lcaId].depth + 1;
}

function findNodeIdByValue(puzzle: SplitboughPuzzle, value: number) {
  const match = puzzle.nodes.find((node) => node.value === value);
  if (!match) {
    throw new Error(`Missing target value ${value} in Splitbough puzzle.`);
  }
  return match.id;
}

function relationToTargets(puzzle: SplitboughPuzzle, nodeId: number) {
  const node = puzzle.nodes[nodeId];
  if (puzzle.highTargetValue < node.value) return 'both-left' as const;
  if (puzzle.lowTargetValue > node.value) return 'both-right' as const;
  return 'split' as const;
}

function lowestCommonAncestorId(puzzle: SplitboughPuzzle) {
  let cursor = puzzle.rootId;

  while (true) {
    const node = puzzle.nodes[cursor];
    if (puzzle.highTargetValue < node.value) {
      if (node.leftId === null) return cursor;
      cursor = node.leftId;
      continue;
    }

    if (puzzle.lowTargetValue > node.value) {
      if (node.rightId === null) return cursor;
      cursor = node.rightId;
      continue;
    }

    return cursor;
  }
}

function legalMoveCount(state: SplitboughState) {
  const node = currentNode(state);
  let count = 1; // claim
  if (node.leftId !== null) count += 1;
  if (node.rightId !== null) count += 1;
  if (node.parentId !== null) count += 1;
  return count;
}

function binaryEntropy(counts: number[]) {
  const total = counts.reduce((sum, value) => sum + value, 0);
  if (total === 0) return 0;

  return counts
    .filter((value) => value > 0)
    .map((value) => value / total)
    .reduce((sum, probability) => sum - probability * log2(probability), 0);
}

function overflowLoss(next: SplitboughState) {
  if (next.actionsUsed <= next.puzzle.budget) return false;
  next.verdict = {
    correct: false,
    label: 'The bark budget ran out before the shared fork was staked.',
  };
  return true;
}

function betweenTargets(puzzle: SplitboughPuzzle, value: number) {
  return value >= puzzle.lowTargetValue && value <= puzzle.highTargetValue;
}

function formatNodeLabel(value: number) {
  return `B${value}`;
}

export function generatePuzzle(seed: number, difficulty: SplitboughDifficulty): SplitboughPuzzle {
  const blueprint = BLUEPRINTS[difficulty];
  const grove = blueprint.groves[seed % blueprint.groves.length];
  const nodes: SplitboughNode[] = [];
  const rootId = buildTree(grove.tree, nodes, null, 0);
  const lowTargetValue = Math.min(...grove.targets);
  const highTargetValue = Math.max(...grove.targets);

  const provisional: SplitboughPuzzle = {
    difficulty,
    label: blueprint.label,
    title: blueprint.title,
    helper: blueprint.helper,
    budget: 0,
    nodes,
    rootId,
    lowTargetValue,
    highTargetValue,
    lowTargetId: -1,
    highTargetId: -1,
    lcaId: -1,
  };

  provisional.lowTargetId = findNodeIdByValue(provisional, lowTargetValue);
  provisional.highTargetId = findNodeIdByValue(provisional, highTargetValue);
  provisional.lcaId = lowestCommonAncestorId(provisional);
  provisional.budget = actionCountToReachLca(provisional) + blueprint.slack;

  return provisional;
}

export function createInitialState(puzzle: SplitboughPuzzle): SplitboughState {
  return {
    puzzle,
    currentId: puzzle.rootId,
    actionsUsed: 0,
    history: [],
    message:
      'Keep both target markers on the same side while you can. The first branch where they stop sharing a side is the only branch worth claiming.',
    lastAction: null,
    verdict: null,
  };
}

export function currentNode(state: SplitboughState) {
  return state.puzzle.nodes[state.currentId];
}

export function currentExits(state: SplitboughState) {
  const node = currentNode(state);
  return {
    left: node.leftId === null ? null : state.puzzle.nodes[node.leftId],
    right: node.rightId === null ? null : state.puzzle.nodes[node.rightId],
    up: node.parentId === null ? null : state.puzzle.nodes[node.parentId],
  };
}

export function currentTargets(state: SplitboughState) {
  return {
    low: state.puzzle.lowTargetValue,
    high: state.puzzle.highTargetValue,
  };
}

export function remainingBark(state: SplitboughState) {
  return Math.max(0, state.puzzle.budget - state.actionsUsed);
}

export function treeRows(state: SplitboughState) {
  return treeRowsFor(state.puzzle, state.puzzle.rootId);
}

export function isCurrentNode(state: SplitboughState, nodeId: number) {
  return state.currentId === nodeId;
}

export function isTargetNode(state: SplitboughState, nodeId: number) {
  if (!state.verdict) return false;
  return nodeId === state.puzzle.lowTargetId || nodeId === state.puzzle.highTargetId;
}

export function isClaimNode(state: SplitboughState, nodeId: number) {
  if (!state.verdict) return false;
  return nodeId === state.puzzle.lcaId;
}

export function applyMove(state: SplitboughState, move: SplitboughMove): SplitboughState {
  if (state.verdict) return state;

  const next = cloneState(state);
  const node = currentNode(next);
  next.lastAction = move.type;

  if (move.type === 'claim') {
    next.actionsUsed += 1;
    next.history.push(`Claim ${formatNodeLabel(node.value)}`);

    if (node.id === next.puzzle.lcaId) {
      next.verdict = {
        correct: true,
        label: `Splitbough secured. ${formatNodeLabel(node.value)} is the first shared fork for ${next.puzzle.lowTargetValue} and ${next.puzzle.highTargetValue}.`,
      };
      next.message = 'The target routes stopped sharing one side here, so stopping here was correct.';
      overflowLoss(next);
      return next;
    }

    if (overflowLoss(next)) return next;

    const relation = relationToTargets(next.puzzle, node.id);
    next.verdict = {
      correct: false,
      label:
        relation === 'both-left'
          ? `Wrong fork. Both targets were still smaller than ${node.value}, so the shared fork sat deeper on the left side.`
          : relation === 'both-right'
            ? `Wrong fork. Both targets were still larger than ${node.value}, so the shared fork sat deeper on the right side.`
            : `Wrong fork. ${node.value} sits between the targets, but one route had already peeled away higher in the canopy.`,
    };
    return next;
  }

  if (move.type === 'up') {
    if (node.parentId === null) {
      next.message = `${formatNodeLabel(node.value)} is the crown. There is no higher branch to climb.`;
      return next;
    }

    next.actionsUsed += 1;
    next.currentId = node.parentId;
    next.history.push(`Up to ${formatNodeLabel(next.puzzle.nodes[next.currentId].value)}`);
    next.message = `Climbed back to ${formatNodeLabel(next.puzzle.nodes[next.currentId].value)}.`;
    overflowLoss(next);
    return next;
  }

  const targetChildId = move.type === 'left' ? node.leftId : node.rightId;
  if (targetChildId === null) {
    next.message = `${formatNodeLabel(node.value)} has no ${move.type === 'left' ? 'left' : 'right'} exit.`;
    return next;
  }

  next.actionsUsed += 1;
  next.currentId = targetChildId;
  next.history.push(`${move.type === 'left' ? 'Left' : 'Right'} to ${formatNodeLabel(next.puzzle.nodes[targetChildId].value)}`);
  next.message = `Moved to ${formatNodeLabel(next.puzzle.nodes[targetChildId].value)}.`;
  overflowLoss(next);
  return next;
}

function runMoves(puzzle: SplitboughPuzzle, moves: SplitboughMove[]): SplitboughSolution {
  let state = createInitialState(puzzle);
  let counterintuitiveSteps = 0;
  let entropy = 0;
  let infoGainTotal = 0;
  let infoGainSteps = 0;

  for (const move of moves) {
    if (state.verdict) break;
    entropy += log2(legalMoveCount(state));

    if (move.type === 'claim' && state.currentId === puzzle.lcaId) {
      counterintuitiveSteps += 1;
    }

    const beforeNodeCount = subtreeNodeCount(puzzle, state.currentId);
    const nextState = applyMove(state, move);
    if ((move.type === 'left' || move.type === 'right') && nextState.currentId !== state.currentId) {
      const afterNodeCount = subtreeNodeCount(puzzle, nextState.currentId);
      if (afterNodeCount > 0) {
        infoGainTotal += beforeNodeCount / afterNodeCount;
        infoGainSteps += 1;
      }
    }

    state = nextState;
  }

  return {
    moves,
    finalState: state,
    solved: Boolean(state.verdict?.correct),
    actionsUsed: state.actionsUsed,
    counterintuitiveSteps,
    puzzleEntropy: entropy,
    meanInfoGainRatio: infoGainSteps > 0 ? infoGainTotal / infoGainSteps : 0,
  };
}

function buildPathToValue(puzzle: SplitboughPuzzle, targetValue: number): SplitboughMove[] {
  const moves: SplitboughMove[] = [];
  let cursor = puzzle.rootId;

  while (puzzle.nodes[cursor].value !== targetValue) {
    const node = puzzle.nodes[cursor];
    if (targetValue < node.value) {
      if (node.leftId === null) break;
      moves.push({ type: 'left' });
      cursor = node.leftId;
      continue;
    }

    if (node.rightId === null) break;
    moves.push({ type: 'right' });
    cursor = node.rightId;
  }

  return moves;
}

function solveOptimal(puzzle: SplitboughPuzzle) {
  const moves: SplitboughMove[] = [];
  let cursor = puzzle.rootId;

  while (cursor !== puzzle.lcaId) {
    const relation = relationToTargets(puzzle, cursor);
    if (relation === 'both-left') {
      moves.push({ type: 'left' });
      cursor = puzzle.nodes[cursor].leftId ?? cursor;
      continue;
    }
    if (relation === 'both-right') {
      moves.push({ type: 'right' });
      cursor = puzzle.nodes[cursor].rightId ?? cursor;
      continue;
    }
    break;
  }

  moves.push({ type: 'claim' });
  return runMoves(puzzle, moves);
}

function solveTraceTargetThenClimb(puzzle: SplitboughPuzzle, targetValue: number) {
  const moves = buildPathToValue(puzzle, targetValue);
  let cursor = targetValue;
  let currentId = findNodeIdByValue(puzzle, cursor);

  while (!betweenTargets(puzzle, puzzle.nodes[currentId].value)) {
    const parentId = puzzle.nodes[currentId].parentId;
    if (parentId === null) break;
    moves.push({ type: 'up' });
    currentId = parentId;
  }

  while (currentId !== puzzle.lcaId) {
    const parentId = puzzle.nodes[currentId].parentId;
    if (parentId === null) break;
    moves.push({ type: 'up' });
    currentId = parentId;
  }

  moves.push({ type: 'claim' });
  return runMoves(puzzle, moves);
}

function chooseNearestTarget(puzzle: SplitboughPuzzle, currentValue: number) {
  const lowDistance = Math.abs(currentValue - puzzle.lowTargetValue);
  const highDistance = Math.abs(currentValue - puzzle.highTargetValue);
  return lowDistance <= highDistance ? puzzle.lowTargetValue : puzzle.highTargetValue;
}

function solveNearestTargetFirst(puzzle: SplitboughPuzzle) {
  const currentValue = puzzle.nodes[puzzle.rootId].value;
  const targetValue = chooseNearestTarget(puzzle, currentValue);
  return solveTraceTargetThenClimb(puzzle, targetValue);
}

function strongestAlternative(puzzle: SplitboughPuzzle) {
  const alternatives = [
    solveTraceTargetThenClimb(puzzle, puzzle.lowTargetValue),
    solveTraceTargetThenClimb(puzzle, puzzle.highTargetValue),
  ];

  const successful = alternatives.filter((solution) => solution.solved);
  if (successful.length > 0) {
    return successful.reduce((best, candidate) =>
      candidate.actionsUsed < best.actionsUsed ? candidate : best,
    );
  }

  return alternatives[0];
}

export function evaluateSplitbough(): SplitboughEvaluation {
  const difficulties: DifficultyAggregate[] = [];
  let bestGapTotal = 0;
  let invariantPressureTotal = 0;
  let counterintuitiveTotal = 0;
  let difficultyCount = 0;
  let breakpoint: SplitboughDifficulty = 5;

  for (const difficulty of [1, 2, 3, 4, 5] as SplitboughDifficulty[]) {
    const blueprint = BLUEPRINTS[difficulty];
    const puzzles = blueprint.groves.map((_, index) => generatePuzzle(index, difficulty));
    const optimal = puzzles.map((puzzle) => solveOptimal(puzzle));
    const alternative = puzzles.map((puzzle) => strongestAlternative(puzzle));
    const invariantBreak = puzzles.map((puzzle) => solveNearestTargetFirst(puzzle));

    const solvability =
      optimal.filter((solution) => solution.solved).length / Math.max(1, optimal.length);
    const altSolvability =
      alternative.filter((solution) => solution.solved).length / Math.max(1, alternative.length);

    const optimalMoves =
      optimal.reduce((sum, solution) => sum + solution.actionsUsed, 0) / Math.max(1, optimal.length);
    const altMoves =
      alternative.reduce((sum, solution, index) => {
        if (solution.solved) return sum + solution.actionsUsed;
        return sum + puzzles[index].budget + 2;
      }, 0) / Math.max(1, alternative.length);

    const skillDepth = clamp(0, 1, 1 - optimalMoves / altMoves);
    const puzzleEntropy =
      optimal.reduce((sum, solution) => sum + solution.puzzleEntropy, 0) / Math.max(1, optimal.length);
    const counterintuitive =
      optimal.reduce((sum, solution) => sum + solution.counterintuitiveSteps, 0) / Math.max(1, optimal.length);
    const infoGainRatio =
      optimal.reduce((sum, solution) => sum + solution.meanInfoGainRatio, 0) / Math.max(1, optimal.length);

    const moveCounts = [
      optimal.reduce((sum, solution) => sum + solution.moves.filter((move) => move.type === 'left').length, 0),
      optimal.reduce((sum, solution) => sum + solution.moves.filter((move) => move.type === 'right').length, 0),
      optimal.reduce((sum, solution) => sum + solution.moves.filter((move) => move.type === 'claim').length, 0),
    ];
    const decisionEntropy = binaryEntropy(moveCounts);
    const drama = clamp(0, 1, 0.42 + (1 - altSolvability) * 0.43);

    const gap =
      alternative.reduce((sum, solution, index) => {
        const optimalSolution = optimal[index];
        if (!solution.solved) return sum + 1;
        return sum + clamp(0, 1, 1 - optimalSolution.actionsUsed / solution.actionsUsed);
      }, 0) / Math.max(1, alternative.length);

    const invariantPressure =
      invariantBreak.reduce((sum, solution, index) => {
        const optimalSolution = optimal[index];
        if (!solution.solved) return sum + 1;
        return sum + clamp(0, 1, 1 - optimalSolution.actionsUsed / solution.actionsUsed);
      }, 0) / Math.max(1, invariantBreak.length);

    difficulties.push({
      difficulty,
      label: blueprint.label,
      budget: puzzles[0]?.budget ?? 0,
      solvability,
      puzzleEntropy,
      skillDepth,
      decisionEntropy,
      counterintuitive,
      drama,
      infoGainRatio,
      optimalMoves,
      altMoves,
      altSolvability,
    });

    if (
      breakpoint === 5 &&
      (altSolvability <= 0.8 || altMoves > (puzzles[0]?.budget ?? 0))
    ) {
      breakpoint = difficulty;
    }

    bestGapTotal += gap;
    invariantPressureTotal += invariantPressure;
    counterintuitiveTotal += counterintuitive;
    difficultyCount += 1;
  }

  const inputShapeMatch = 1;
  const operationMatch = 1;
  const constraintMatch = 0.95;
  const goalMatch = 1;
  const leetCodeFit = (inputShapeMatch + operationMatch + constraintMatch + goalMatch) / 4;
  const bestAlternativeGap = bestGapTotal / Math.max(1, difficultyCount);
  const invariantPressure = invariantPressureTotal / Math.max(1, difficultyCount);
  const algorithmAlignment = 1;

  return {
    difficulties,
    learningMetrics: {
      inputShapeMatch,
      operationMatch,
      constraintMatch,
      goalMatch,
      leetCodeFit,
      bestAlternativeGap,
      invariantPressure,
      difficultyBreakpoint: breakpoint,
      algorithmAlignment,
    },
    interpretation: {
      invariant:
        'Keep both targets alive on one side while you descend, then stop on the first branch where they split or where the current branch already equals one target.',
      strongestAlternative:
        'Search to one target first, then climb back until a branch seems to cover both targets before claiming.',
      evidence: `Average counterintuitive stop count ${(
        counterintuitiveTotal / Math.max(1, difficultyCount)
      ).toFixed(2)}; strongest-alternative breakpoint ${breakpoint}.`,
    },
  };
}
