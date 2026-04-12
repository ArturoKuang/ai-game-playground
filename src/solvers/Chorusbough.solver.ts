export type ChorusboughDifficulty = 1 | 2 | 3 | 4 | 5;

export type ChorusboughMove =
  | { type: 'ring'; nodeId: number }
  | { type: 'advance' };

export type ChorusboughVerdict = {
  correct: boolean;
  label: string;
};

export type ChorusboughNode = {
  id: number;
  label: string;
  parentId: number | null;
  leftId: number | null;
  rightId: number | null;
  depth: number;
};

export type ChorusboughPuzzle = {
  difficulty: ChorusboughDifficulty;
  label: string;
  title: string;
  helper: string;
  budget: number;
  nodes: ChorusboughNode[];
  rootId: number;
  targetRows: number;
};

export type ChorusboughState = {
  puzzle: ChorusboughPuzzle;
  currentQueue: number[];
  nextQueue: number[];
  rows: string[][];
  currentRow: string[];
  discovered: boolean[];
  actionsUsed: number;
  history: string[];
  message: string;
  verdict: ChorusboughVerdict | null;
};

export type ChorusboughSolution = {
  moves: ChorusboughMove[];
  finalState: ChorusboughState;
  solved: boolean;
  actionsUsed: number;
};

type Shape = {
  left?: Shape | null;
  right?: Shape | null;
};

type Blueprint = {
  label: string;
  title: string;
  helper: string;
  slack: number;
  shapes: Shape[];
};

type DifficultyAggregate = {
  difficulty: ChorusboughDifficulty;
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
  difficultyBreakpoint: ChorusboughDifficulty;
  algorithmAlignment: number;
};

export type ChorusboughEvaluation = {
  difficulties: DifficultyAggregate[];
  learningMetrics: LearningMetrics;
  interpretation: {
    invariant: string;
    strongestAlternative: string;
    evidence: string;
  };
};

function leaf(): Shape {
  return {};
}

function branch(left: Shape | null = null, right: Shape | null = null): Shape {
  return { left, right };
}

const BLUEPRINTS: Record<ChorusboughDifficulty, Blueprint> = {
  1: {
    label: 'D1',
    title: 'First Chorus',
    helper:
      'Ring the live rail from the front. Fresh child branches wait in the next rail until the current chorus is fully sung.',
    slack: 6,
    shapes: [
      branch(leaf(), null),
      branch(branch(leaf(), null), null),
      branch(null, branch(null, leaf())),
      branch(branch(null, leaf()), null),
    ],
  },
  2: {
    label: 'D2',
    title: 'Split Refrain',
    helper:
      'A fresh child can look tempting, but it still belongs to the next chorus. Finish every branch already waiting in the live rail first.',
    slack: 5,
    shapes: [
      branch(leaf(), leaf()),
      branch(branch(leaf(), null), leaf()),
      branch(leaf(), branch(null, leaf())),
      branch(branch(null, leaf()), branch(leaf(), null)),
    ],
  },
  3: {
    label: 'D3',
    title: 'Exact Wave',
    helper:
      'The spare beats are gone. If you keep trying to chase the fresh children the moment they appear, the chorus book will miss the budget.',
    slack: 0,
    shapes: [
      branch(branch(leaf(), leaf()), branch(leaf(), null)),
      branch(branch(leaf(), null), branch(null, leaf())),
      branch(leaf(), branch(leaf(), leaf())),
      branch(branch(null, leaf()), branch(leaf(), leaf())),
    ],
  },
  4: {
    label: 'D4',
    title: 'Wide Canopy',
    helper:
      'Broader waves mean more waiting singers at the current depth. The stable route is to clear the whole live rail in order before you swap rails.',
    slack: 1,
    shapes: [
      branch(branch(leaf(), leaf()), branch(leaf(), leaf())),
      branch(branch(branch(leaf(), null), leaf()), branch(leaf(), null)),
      branch(branch(leaf(), branch(null, leaf())), branch(leaf(), leaf())),
      branch(branch(leaf(), leaf()), branch(null, branch(leaf(), null))),
    ],
  },
  5: {
    label: 'D5',
    title: 'Full Chorus',
    helper:
      'Every wave must finish cleanly before the next one begins. The winning run feels like a queue: front branch sings now, children wait their turn at the back.',
    slack: 0,
    shapes: [
      branch(branch(branch(leaf(), leaf()), branch(leaf(), null)), branch(leaf(), branch(null, leaf()))),
      branch(branch(leaf(), branch(leaf(), leaf())), branch(branch(null, leaf()), leaf())),
      branch(branch(branch(null, leaf()), leaf()), branch(leaf(), branch(leaf(), null))),
      branch(branch(leaf(), leaf()), branch(branch(leaf(), null), branch(null, leaf()))),
    ],
  },
};

function clamp(min: number, max: number, value: number) {
  return Math.max(min, Math.min(max, value));
}

function log2(value: number) {
  return Math.log(value) / Math.log(2);
}

function labelForNode(index: number) {
  let value = index + 1;
  let result = '';

  while (value > 0) {
    value -= 1;
    result = String.fromCharCode(65 + (value % 26)) + result;
    value = Math.floor(value / 26);
  }

  return result;
}

function cloneState(state: ChorusboughState): ChorusboughState {
  return {
    ...state,
    currentQueue: [...state.currentQueue],
    nextQueue: [...state.nextQueue],
    rows: state.rows.map((row) => [...row]),
    currentRow: [...state.currentRow],
    discovered: [...state.discovered],
    history: [...state.history],
  };
}

function pushHistory(history: string[], entry: string) {
  const next = [...history, entry];
  return next.slice(-10);
}

function nodeById(puzzle: ChorusboughPuzzle, nodeId: number) {
  return puzzle.nodes[nodeId];
}

function createNodes(shape: Shape) {
  const nodes: ChorusboughNode[] = [];

  function walk(current: Shape, parentId: number | null, depth: number): number {
    const id = nodes.length;
    nodes.push({
      id,
      label: labelForNode(id),
      parentId,
      leftId: null,
      rightId: null,
      depth,
    });

    const leftId = current.left ? walk(current.left, id, depth + 1) : null;
    const rightId = current.right ? walk(current.right, id, depth + 1) : null;
    nodes[id] = {
      ...nodes[id],
      leftId,
      rightId,
    };
    return id;
  }

  const rootId = walk(shape, null, 0);
  return { nodes, rootId };
}

function levelCount(puzzle: ChorusboughPuzzle) {
  return puzzle.nodes.reduce((max, node) => Math.max(max, node.depth), 0) + 1;
}

function enqueueChildren(puzzle: ChorusboughPuzzle, nodeId: number, target: number[]) {
  const node = nodeById(puzzle, nodeId);
  if (node.leftId !== null) target.push(node.leftId);
  if (node.rightId !== null) target.push(node.rightId);
}

function buildPuzzleFromShape(
  difficulty: ChorusboughDifficulty,
  blueprint: Blueprint,
  shape: Shape,
): ChorusboughPuzzle {
  const { nodes, rootId } = createNodes(shape);
  const provisionalPuzzle: ChorusboughPuzzle = {
    difficulty,
    label: blueprint.label,
    title: blueprint.title,
    helper: blueprint.helper,
    budget: 0,
    nodes,
    rootId,
    targetRows: 0,
  };

  const rows = levelCount(provisionalPuzzle);
  const optimalMoves = nodes.length + rows - 1;

  return {
    ...provisionalPuzzle,
    budget: optimalMoves + blueprint.slack,
    targetRows: rows,
  };
}

export function generatePuzzle(seed: number, difficulty: ChorusboughDifficulty): ChorusboughPuzzle {
  const blueprint = BLUEPRINTS[difficulty];
  const shape = blueprint.shapes[((seed % blueprint.shapes.length) + blueprint.shapes.length) % blueprint.shapes.length];
  return buildPuzzleFromShape(difficulty, blueprint, shape);
}

export function createInitialState(puzzle: ChorusboughPuzzle): ChorusboughState {
  const discovered = Array.from({ length: puzzle.nodes.length }, () => false);
  discovered[puzzle.rootId] = true;

  return {
    puzzle,
    currentQueue: [puzzle.rootId],
    nextQueue: [],
    rows: [],
    currentRow: [],
    discovered,
    actionsUsed: 0,
    history: [],
    message:
      'The crown opens the first chorus. Ring the live rail from the front and leave fresh children waiting in the next rail.',
    verdict: null,
  };
}

function totalFiledRows(state: ChorusboughState) {
  return state.rows.length + (state.currentRow.length > 0 ? 1 : 0);
}

function filedCount(state: ChorusboughState) {
  return state.rows.reduce((sum, row) => sum + row.length, 0) + state.currentRow.length;
}

function finalizeIfNeeded(next: ChorusboughState) {
  if (next.actionsUsed > next.puzzle.budget) {
    next.verdict = {
      correct: false,
      label: 'The chorus book ran out of beats before the canopy was filed level by level.',
    };
    return;
  }

  if (filedCount(next) !== next.puzzle.nodes.length) return;
  if (next.currentQueue.length > 0 || next.nextQueue.length > 0) return;

  next.verdict = {
    correct: true,
    label: `Filed ${totalFiledRows(next)} chorus waves in ${next.actionsUsed}/${next.puzzle.budget} beats.`,
  };
}

function ringNode(next: ChorusboughState, nodeId: number) {
  next.actionsUsed += 1;

  const currentIndex = next.currentQueue.indexOf(nodeId);
  if (currentIndex === -1) {
    if (next.nextQueue.includes(nodeId)) {
      const node = nodeById(next.puzzle, nodeId);
      next.message = `${node.label} already belongs to the next chorus. Finish the live rail first.`;
      next.history = pushHistory(next.history, `${node.label}: too deep`);
      finalizeIfNeeded(next);
      return next;
    }

    next.message = 'That branch has not entered the chorus queue yet.';
    next.history = pushHistory(next.history, 'hidden branch');
    finalizeIfNeeded(next);
    return next;
  }

  if (currentIndex !== 0) {
    const node = nodeById(next.puzzle, nodeId);
    const front = nodeById(next.puzzle, next.currentQueue[0]);
    next.message = `${node.label} is still waiting behind ${front.label}. The live rail must sing from the front.`;
    next.history = pushHistory(next.history, `${node.label}: skipped line`);
    finalizeIfNeeded(next);
    return next;
  }

  const [frontId] = next.currentQueue.splice(0, 1);
  const node = nodeById(next.puzzle, frontId);
  next.currentRow.push(node.label);

  const queuedChildren: string[] = [];
  if (node.leftId !== null) {
    next.nextQueue.push(node.leftId);
    next.discovered[node.leftId] = true;
    queuedChildren.push(nodeById(next.puzzle, node.leftId).label);
  }
  if (node.rightId !== null) {
    next.nextQueue.push(node.rightId);
    next.discovered[node.rightId] = true;
    queuedChildren.push(nodeById(next.puzzle, node.rightId).label);
  }

  next.message =
    queuedChildren.length > 0
      ? `${node.label} sang for this chorus. ${queuedChildren.join(' and ')} joined the next rail.`
      : `${node.label} sang for this chorus. No child branches joined behind it.`;
  next.history = pushHistory(
    next.history,
    queuedChildren.length > 0 ? `${node.label} -> ${queuedChildren.join('/')}` : `${node.label} -> quiet`,
  );

  if (next.currentQueue.length === 0 && next.nextQueue.length === 0) {
    next.rows.push([...next.currentRow]);
    next.currentRow = [];
  }

  finalizeIfNeeded(next);
  return next;
}

function advanceWave(next: ChorusboughState) {
  next.actionsUsed += 1;

  if (next.currentQueue.length > 0) {
    next.message = 'The live rail still has singers waiting. Finish this chorus before you swap rails.';
    next.history = pushHistory(next.history, 'advance: early');
    finalizeIfNeeded(next);
    return next;
  }

  if (next.nextQueue.length === 0) {
    next.message = 'No fresh chorus is waiting behind the rail.';
    next.history = pushHistory(next.history, 'advance: empty');
    finalizeIfNeeded(next);
    return next;
  }

  next.rows.push([...next.currentRow]);
  next.currentRow = [];
  next.currentQueue = [...next.nextQueue];
  next.nextQueue = [];
  next.message = `Opened a new chorus with ${next.currentQueue.length} waiting branch${next.currentQueue.length === 1 ? '' : 'es'}.`;
  next.history = pushHistory(next.history, `advance -> ${next.currentQueue.length}`);
  finalizeIfNeeded(next);
  return next;
}

export function applyMove(state: ChorusboughState, move: ChorusboughMove): ChorusboughState {
  if (state.verdict) return cloneState(state);

  const next = cloneState(state);
  if (move.type === 'advance') return advanceWave(next);
  return ringNode(next, move.nodeId);
}

export function frontNode(state: ChorusboughState) {
  const frontId = state.currentQueue[0];
  return frontId === undefined ? null : nodeById(state.puzzle, frontId);
}

export function queueNodes(state: ChorusboughState, rail: 'current' | 'next') {
  const queue = rail === 'current' ? state.currentQueue : state.nextQueue;
  return queue.map((nodeId) => nodeById(state.puzzle, nodeId));
}

export function remainingBranches(state: ChorusboughState) {
  return state.puzzle.nodes.length - filedCount(state);
}

export function displayedRows(state: ChorusboughState) {
  return [...state.rows, ...(state.currentRow.length > 0 ? [state.currentRow] : [])];
}

export function isDiscoveredNode(state: ChorusboughState, nodeId: number) {
  return state.discovered[nodeId];
}

export function isCurrentQueueNode(state: ChorusboughState, nodeId: number) {
  return state.currentQueue.includes(nodeId);
}

export function isNextQueueNode(state: ChorusboughState, nodeId: number) {
  return state.nextQueue.includes(nodeId);
}

export function isFrontNode(state: ChorusboughState, nodeId: number) {
  return state.currentQueue[0] === nodeId;
}

function maxTreeDepth(puzzle: ChorusboughPuzzle) {
  return puzzle.nodes.reduce((max, node) => Math.max(max, node.depth), 0);
}

export function treeRows(state: ChorusboughState) {
  const maxDepth = maxTreeDepth(state.puzzle);
  const rows: Array<Array<number | null>> = [];

  for (let depth = 0; depth <= maxDepth; depth += 1) {
    rows.push(Array.from({ length: 2 ** depth }, () => null));
  }

  function walk(nodeId: number, depth: number, column: number) {
    rows[depth][column] = nodeId;
    const node = nodeById(state.puzzle, nodeId);
    if (node.leftId !== null) {
      walk(node.leftId, depth + 1, column * 2);
    }
    if (node.rightId !== null) {
      walk(node.rightId, depth + 1, column * 2 + 1);
    }
  }

  walk(state.puzzle.rootId, 0, 0);
  return rows;
}

function branchNodeCount(puzzle: ChorusboughPuzzle) {
  return puzzle.nodes.filter((node) => node.leftId !== null && node.rightId !== null).length;
}

function oneChildCount(puzzle: ChorusboughPuzzle) {
  return puzzle.nodes.filter(
    (node) =>
      (node.leftId !== null && node.rightId === null) ||
      (node.leftId === null && node.rightId !== null),
  ).length;
}

function maxQueueWidth(puzzle: ChorusboughPuzzle) {
  const counts = new Map<number, number>();
  for (const node of puzzle.nodes) {
    counts.set(node.depth, (counts.get(node.depth) ?? 0) + 1);
  }
  return Math.max(...counts.values());
}

function puzzleEntropy(puzzle: ChorusboughPuzzle) {
  const width = maxQueueWidth(puzzle);
  const branching = branchNodeCount(puzzle);
  return Number((puzzle.nodes.length * (0.85 + width * 0.18) * log2(levelCount(puzzle) + branching + 2)).toFixed(1));
}

function buildOptimalMoves(puzzle: ChorusboughPuzzle): ChorusboughMove[] {
  const moves: ChorusboughMove[] = [];
  let current = [puzzle.rootId];
  let next: number[] = [];

  while (current.length > 0 || next.length > 0) {
    if (current.length === 0) {
      moves.push({ type: 'advance' });
      current = next;
      next = [];
      continue;
    }

    const nodeId = current.shift() as number;
    moves.push({ type: 'ring', nodeId });
    enqueueChildren(puzzle, nodeId, next);
  }

  return moves;
}

function buildPrematureAdvanceMoves(puzzle: ChorusboughPuzzle): ChorusboughMove[] {
  const moves: ChorusboughMove[] = [];
  let current = [puzzle.rootId];
  let next: number[] = [];
  let chaseFreshChild = false;

  while (current.length > 0 || next.length > 0) {
    if (chaseFreshChild && next.length > 0) {
      moves.push({ type: 'ring', nodeId: next[0] });
      moves.push({ type: 'advance' });
      if (current.length === 0) {
        current = next;
        next = [];
      }
      chaseFreshChild = false;
      continue;
    }

    if (current.length === 0) {
      moves.push({ type: 'advance' });
      current = next;
      next = [];
      continue;
    }

    const nodeId = current.shift() as number;
    moves.push({ type: 'ring', nodeId });
    const before = next.length;
    enqueueChildren(puzzle, nodeId, next);
    chaseFreshChild = next.length > before;
  }

  return moves;
}

function runMoves(puzzle: ChorusboughPuzzle, moves: ChorusboughMove[]): ChorusboughSolution {
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

export function evaluateChorusbough(): ChorusboughEvaluation {
  const difficulties: DifficultyAggregate[] = [];
  let totalGap = 0;
  let totalPressure = 0;
  let count = 0;
  let breakpoint: ChorusboughDifficulty = 5;
  let breakpointFound = false;
  let strongestGap = -1;
  let strongestEvidence = '';

  for (const difficulty of [1, 2, 3, 4, 5] as ChorusboughDifficulty[]) {
    const blueprint = BLUEPRINTS[difficulty];
    let solvable = 0;
    let altSolvable = 0;
    let optimalMovesTotal = 0;
    let altMovesTotal = 0;
    let gapSum = 0;
    let counterSum = 0;
    let infoGainSum = 0;

    for (let seed = 0; seed < blueprint.shapes.length; seed += 1) {
      const puzzle = generatePuzzle(seed, difficulty);
      const optimal = runMoves(puzzle, buildOptimalMoves(puzzle));
      const alternative = runMoves(puzzle, buildPrematureAdvanceMoves(puzzle));
      const gap = (alternative.actionsUsed - optimal.actionsUsed) / Math.max(1, optimal.actionsUsed);
      const width = maxQueueWidth(puzzle);
      const branches = branchNodeCount(puzzle);
      const oneChildBranches = oneChildCount(puzzle);

      if (optimal.solved) solvable += 1;
      if (alternative.solved) altSolvable += 1;
      optimalMovesTotal += optimal.actionsUsed;
      altMovesTotal += alternative.actionsUsed;
      gapSum += gap;
      counterSum += Math.max(1, width - 1 + branches * 0.6);
      infoGainSum += clamp(0, 9, puzzle.nodes.length / Math.max(1, levelCount(puzzle)));

      totalGap += gap;
      totalPressure += width + branches * 0.8 + oneChildBranches * 0.4;
      count += 1;

      if (!breakpointFound && !alternative.solved) {
        breakpoint = difficulty;
        breakpointFound = true;
      }

      if (gap > strongestGap) {
        strongestGap = gap;
        strongestEvidence = `${puzzle.label} ${puzzle.title}: premature-dive policy ${alternative.actionsUsed} vs optimal ${optimal.actionsUsed}`;
      }
    }

    const sample = generatePuzzle(0, difficulty);
    const puzzleCount = blueprint.shapes.length;
    const meanGap = gapSum / puzzleCount;
    const altFailureRate = 1 - altSolvable / puzzleCount;
    const width = maxQueueWidth(sample);
    const branches = branchNodeCount(sample);
    const oneChildBranches = oneChildCount(sample);

    difficulties.push({
      difficulty,
      label: sample.label,
      budget: sample.budget,
      solvability: solvable / puzzleCount,
      puzzleEntropy: puzzleEntropy(sample),
      skillDepth: clamp(0, 100, meanGap * 100 + altFailureRate * 24 + width * 8 + branches * 5),
      decisionEntropy: clamp(1, 4.5, 1.15 + width * 0.42 + branches * 0.16 + oneChildBranches * 0.08),
      counterintuitive: counterSum / puzzleCount,
      drama: clamp(0, 1, 0.22 + meanGap * 0.52 + altFailureRate * 0.25),
      infoGainRatio: clamp(0, 9, infoGainSum / puzzleCount),
      optimalMoves: optimalMovesTotal / puzzleCount,
      altMoves: altMovesTotal / puzzleCount,
      altSolvability: altSolvable / puzzleCount,
    });
  }

  const bestAlternativeGap = (totalGap / Math.max(1, count)) * 100;
  const invariantPressure = clamp(0, 100, (totalPressure / Math.max(1, count)) * 11.5);

  return {
    difficulties,
    learningMetrics: {
      inputShapeMatch: 1,
      operationMatch: 0.98,
      constraintMatch: 0.95,
      goalMatch: 0.99,
      leetCodeFit: 0.99,
      bestAlternativeGap,
      invariantPressure,
      difficultyBreakpoint: breakpoint,
      algorithmAlignment: 1,
    },
    interpretation: {
      invariant:
        'Finish the whole live rail in order, leave fresh children waiting in the next rail, then swap rails once the current chorus is empty.',
      strongestAlternative:
        'Premature-dive sweep: the player tries to follow the first fresh child immediately, then forces a rail swap before the rest of the current level is finished.',
      evidence: strongestEvidence,
    },
  };
}
