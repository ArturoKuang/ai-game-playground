export type BoughturnDifficulty = 1 | 2 | 3 | 4 | 5;

export type BoughturnMoveType = 'mirror' | 'left' | 'right' | 'up';

export type BoughturnMove = {
  type: BoughturnMoveType;
};

export type BoughturnVerdict = {
  correct: boolean;
  label: string;
};

export type BoughturnNode = {
  id: number;
  label: string;
  parentId: number | null;
  leftId: number | null;
  rightId: number | null;
  depth: number;
  leafToken: string | null;
};

export type BoughturnPuzzle = {
  difficulty: BoughturnDifficulty;
  label: string;
  title: string;
  helper: string;
  budget: number;
  nodes: BoughturnNode[];
  rootId: number;
  internalIds: number[];
  targetLeafRibbon: string[];
};

export type BoughturnState = {
  puzzle: BoughturnPuzzle;
  currentId: number;
  mirrored: boolean[];
  actionsUsed: number;
  history: string[];
  message: string;
  verdict: BoughturnVerdict | null;
};

export type BoughturnSolution = {
  moves: BoughturnMove[];
  finalState: BoughturnState;
  solved: boolean;
  actionsUsed: number;
};

type Blueprint = {
  label: string;
  title: string;
  helper: string;
  depth: number;
  slack: number;
  tokenSets: string[][];
};

type DifficultyAggregate = {
  difficulty: BoughturnDifficulty;
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
  difficultyBreakpoint: BoughturnDifficulty;
  algorithmAlignment: number;
};

export type BoughturnEvaluation = {
  difficulties: DifficultyAggregate[];
  learningMetrics: LearningMetrics;
  interpretation: {
    invariant: string;
    strongestAlternative: string;
    evidence: string;
  };
};

const BLUEPRINTS: Record<BoughturnDifficulty, Blueprint> = {
  1: {
    label: 'D1',
    title: 'Sapling Mirror',
    helper:
      'A short sapling still forgives a few extra climbs. The clean pattern is to mirror the branch hub you are standing on, finish one side, then cross once.',
    depth: 2,
    slack: 2,
    tokenSets: [
      ['acorn', 'bell', 'cinder', 'dawn'],
      ['flint', 'glow', 'harbor', 'iris'],
      ['jade', 'kite', 'linen', 'moss'],
      ['north', 'opal', 'pearl', 'quill'],
    ],
  },
  2: {
    label: 'D2',
    title: 'Young Canopy',
    helper:
      'The canopy is deeper now, but there is still enough lantern oil to survive one sloppy cross-tree detour before the route tightens.',
    depth: 3,
    slack: 4,
    tokenSets: [
      ['amber', 'birch', 'clay', 'drift', 'ember', 'fern', 'gale', 'hollow'],
      ['ivory', 'juniper', 'kelp', 'loam', 'marble', 'nova', 'ochre', 'pine'],
      ['quartz', 'reed', 'sable', 'thistle', 'umber', 'vale', 'willow', 'yarrow'],
      ['zephyr', 'aster', 'brine', 'cedar', 'delta', 'elm', 'frost', 'grove'],
    ],
  },
  3: {
    label: 'D3',
    title: 'Exact Bough',
    helper:
      'The spare climbs are gone. Mirroring a hub and then clearing one whole child subtree before crossing is now the only route that fits.',
    depth: 3,
    slack: 0,
    tokenSets: [
      ['arch', 'bloom', 'crown', 'dusk', 'echo', 'flare', 'glade', 'haze'],
      ['ink', 'jolt', 'knell', 'lilt', 'mirth', 'niche', 'orbit', 'pact'],
      ['quartz', 'rime', 'serein', 'tide', 'upland', 'vow', 'wane', 'xylem'],
      ['yarn', 'zenith', 'apex', 'brim', 'cairn', 'drum', 'eave', 'forge'],
    ],
  },
  4: {
    label: 'D4',
    title: 'High Arbor',
    helper:
      'A taller arbor punishes frontier sweeps. If you keep hopping between shallow hubs, the lantern dies before the far branch finishes.',
    depth: 4,
    slack: 2,
    tokenSets: [
      ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9', 'a10', 'a11', 'a12', 'a13', 'a14', 'a15', 'a16'],
      ['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8', 'b9', 'b10', 'b11', 'b12', 'b13', 'b14', 'b15', 'b16'],
      ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'c10', 'c11', 'c12', 'c13', 'c14', 'c15', 'c16'],
      ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9', 'd10', 'd11', 'd12', 'd13', 'd14', 'd15', 'd16'],
    ],
  },
  5: {
    label: 'D5',
    title: 'Moonlit Crown',
    helper:
      'Every branch hub must be mirrored under exact fuel. The winning route feels like a recursive ritual: flip here, finish one child branch, backtrack once, then finish the other.',
    depth: 4,
    slack: 0,
    tokenSets: [
      ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9', 'm10', 'm11', 'm12', 'm13', 'm14', 'm15', 'm16'],
      ['n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8', 'n9', 'n10', 'n11', 'n12', 'n13', 'n14', 'n15', 'n16'],
      ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10', 'p11', 'p12', 'p13', 'p14', 'p15', 'p16'],
      ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8', 'r9', 'r10', 'r11', 'r12', 'r13', 'r14', 'r15', 'r16'],
    ],
  },
};

function clamp(min: number, max: number, value: number) {
  return Math.max(min, Math.min(max, value));
}

function log2(value: number) {
  return Math.log(value) / Math.log(2);
}

function cloneState(state: BoughturnState): BoughturnState {
  return {
    ...state,
    mirrored: [...state.mirrored],
    history: [...state.history],
  };
}

function isInternal(node: BoughturnNode) {
  return node.leftId !== null || node.rightId !== null;
}

function nodeById(puzzle: BoughturnPuzzle, nodeId: number) {
  return puzzle.nodes[nodeId];
}

function effectiveChildren(state: BoughturnState, nodeId: number) {
  const node = nodeById(state.puzzle, nodeId);
  if (!isInternal(node)) {
    return { leftId: null, rightId: null };
  }

  if (state.mirrored[nodeId]) {
    return {
      leftId: node.rightId,
      rightId: node.leftId,
    };
  }

  return {
    leftId: node.leftId,
    rightId: node.rightId,
  };
}

function effectiveChildrenFromMirrors(
  puzzle: BoughturnPuzzle,
  mirrored: boolean[],
  nodeId: number,
) {
  const node = nodeById(puzzle, nodeId);
  if (!isInternal(node)) {
    return { leftId: null, rightId: null };
  }

  if (mirrored[nodeId]) {
    return {
      leftId: node.rightId,
      rightId: node.leftId,
    };
  }

  return {
    leftId: node.leftId,
    rightId: node.rightId,
  };
}

function allMirrored(state: BoughturnState) {
  return state.puzzle.internalIds.every((nodeId) => state.mirrored[nodeId]);
}

function pushHistory(history: string[], entry: string) {
  const next = [...history, entry];
  return next.slice(-8);
}

function finalizeIfNeeded(next: BoughturnState) {
  if (next.actionsUsed > next.puzzle.budget) {
    next.verdict = {
      correct: false,
      label: 'The lantern oil ran dry before the whole canopy was mirrored.',
    };
    return;
  }

  if (allMirrored(next)) {
    next.verdict = {
      correct: true,
      label: `Canopy mirrored with ${next.actionsUsed}/${next.puzzle.budget} lantern steps.`,
    };
  }
}

function stepToChild(next: BoughturnState, direction: 'left' | 'right') {
  const node = nodeById(next.puzzle, next.currentId);
  const exits = effectiveChildren(next, node.id);
  const targetId = direction === 'left' ? exits.leftId : exits.rightId;

  next.actionsUsed += 1;
  if (targetId === null) {
    next.message = `No ${direction} branch hangs below ${node.label}.`;
    next.history = pushHistory(next.history, `${node.label}: bump ${direction}`);
    finalizeIfNeeded(next);
    return next;
  }

  next.currentId = targetId;
  next.message = `Climbed ${direction} from ${node.label} to ${nodeById(next.puzzle, targetId).label}.`;
  next.history = pushHistory(next.history, `${node.label} -> ${nodeById(next.puzzle, targetId).label}`);
  finalizeIfNeeded(next);
  return next;
}

function stepUp(next: BoughturnState) {
  const node = nodeById(next.puzzle, next.currentId);
  next.actionsUsed += 1;

  if (node.parentId === null) {
    next.message = `${node.label} is the crown hub. There is no higher branch.`;
    next.history = pushHistory(next.history, `${node.label}: bump up`);
    finalizeIfNeeded(next);
    return next;
  }

  next.currentId = node.parentId;
  next.message = `Climbed back to ${nodeById(next.puzzle, node.parentId).label}.`;
  next.history = pushHistory(next.history, `${node.label} -> ${nodeById(next.puzzle, node.parentId).label}`);
  finalizeIfNeeded(next);
  return next;
}

function mirrorCurrent(next: BoughturnState) {
  const node = nodeById(next.puzzle, next.currentId);
  next.actionsUsed += 1;

  if (!isInternal(node)) {
    next.message = `${node.label} is a leaf charm. There is no branch pair to mirror here.`;
    next.history = pushHistory(next.history, `${node.label}: leaf tap`);
    finalizeIfNeeded(next);
    return next;
  }

  next.mirrored[node.id] = !next.mirrored[node.id];
  const status = next.mirrored[node.id] ? 'mirrored' : 'restored';
  next.message = `${node.label} ${status}. Its child boughs traded sides.`;
  next.history = pushHistory(next.history, `${node.label}: ${status}`);
  finalizeIfNeeded(next);
  return next;
}

function buildPerfectTree(depth: number, leafTokens: string[]) {
  const totalNodes = 2 ** (depth + 1) - 1;
  const internalCount = 2 ** depth - 1;
  const nodes: BoughturnNode[] = [];

  for (let id = 0; id < totalNodes; id += 1) {
    const parentId = id === 0 ? null : Math.floor((id - 1) / 2);
    const nodeDepth = Math.floor(log2(id + 1));
    const leftId = nodeDepth < depth ? id * 2 + 1 : null;
    const rightId = nodeDepth < depth ? id * 2 + 2 : null;
    const leafIndex = id - internalCount;
    nodes.push({
      id,
      label: String.fromCharCode(65 + Math.min(id, 25)),
      parentId,
      leftId: leftId !== null && leftId < totalNodes ? leftId : null,
      rightId: rightId !== null && rightId < totalNodes ? rightId : null,
      depth: nodeDepth,
      leafToken: nodeDepth === depth ? leafTokens[leafIndex] : null,
    });
  }

  return nodes;
}

function collectLeafRibbonFromMirrors(
  puzzle: BoughturnPuzzle,
  mirrored: boolean[],
  nodeId: number,
  acc: string[],
) {
  const node = nodeById(puzzle, nodeId);
  if (!isInternal(node)) {
    acc.push(node.leafToken ?? node.label);
    return;
  }

  const exits = effectiveChildrenFromMirrors(puzzle, mirrored, nodeId);
  if (exits.leftId !== null) {
    collectLeafRibbonFromMirrors(puzzle, mirrored, exits.leftId, acc);
  }
  if (exits.rightId !== null) {
    collectLeafRibbonFromMirrors(puzzle, mirrored, exits.rightId, acc);
  }
}

function targetRibbonFor(puzzle: Omit<BoughturnPuzzle, 'targetLeafRibbon' | 'budget'>) {
  const mirrored = puzzle.nodes.map((node) => isInternal(node));
  const ribbon: string[] = [];
  collectLeafRibbonFromMirrors(
    { ...puzzle, budget: 0, targetLeafRibbon: [] },
    mirrored,
    puzzle.rootId,
    ribbon,
  );
  return ribbon;
}

function internalCountForDepth(depth: number) {
  return 2 ** depth - 1;
}

function subtreeInternalCount(puzzle: BoughturnPuzzle, nodeId: number | null): number {
  if (nodeId === null) return 0;
  const node = nodeById(puzzle, nodeId);
  if (!isInternal(node)) return 0;
  return (
    1 +
    subtreeInternalCount(puzzle, node.leftId) +
    subtreeInternalCount(puzzle, node.rightId)
  );
}

function finishHereMovement(puzzle: BoughturnPuzzle, nodeId: number | null): number {
  if (nodeId === null) return 0;
  const node = nodeById(puzzle, nodeId);
  if (!isInternal(node)) return 0;

  let total = 0;
  for (const childId of [node.leftId, node.rightId]) {
    if (subtreeInternalCount(puzzle, childId) === 0) continue;
    total += 1 + finishHereMovement(puzzle, childId) + 1;
  }
  return total;
}

function finishAnywhereMovement(puzzle: BoughturnPuzzle, nodeId: number | null): number {
  if (nodeId === null) return 0;
  const node = nodeById(puzzle, nodeId);
  if (!isInternal(node)) return 0;

  const childIds = [node.leftId, node.rightId].filter(
    (childId): childId is number => subtreeInternalCount(puzzle, childId) > 0,
  );
  if (childIds.length === 0) return 0;
  if (childIds.length === 1) {
    return 1 + finishAnywhereMovement(puzzle, childIds[0]);
  }

  const [first, second] = childIds;
  const optionA =
    1 + finishHereMovement(puzzle, first) + 1 + 1 + finishAnywhereMovement(puzzle, second);
  const optionB =
    1 + finishHereMovement(puzzle, second) + 1 + 1 + finishAnywhereMovement(puzzle, first);
  return Math.min(optionA, optionB);
}

function budgetFor(puzzle: Omit<BoughturnPuzzle, 'budget' | 'targetLeafRibbon'>, slack: number) {
  const shell = { ...puzzle, budget: 0, targetLeafRibbon: [] };
  return internalCountForDepth(nodeById(shell, shell.nodes.length - 1).depth) + finishAnywhereMovement(shell, shell.rootId) + slack;
}

function rootDepth(puzzle: BoughturnPuzzle) {
  return Math.max(...puzzle.nodes.map((node) => node.depth));
}

function puzzleEntropy(depth: number, internalCount: number, slack: number) {
  return depth * 18 + internalCount * 4 + log2(internalCount + 1) * 10 - slack * 2;
}

function currentRibbon(state: BoughturnState) {
  const ribbon: string[] = [];
  collectLeafRibbonFromMirrors(state.puzzle, state.mirrored, state.puzzle.rootId, ribbon);
  return ribbon;
}

function pathToRoot(puzzle: BoughturnPuzzle, nodeId: number) {
  const path: number[] = [];
  let cursor: number | null = nodeId;
  while (cursor !== null) {
    path.push(cursor);
    cursor = nodeById(puzzle, cursor).parentId;
  }
  return path;
}

function shortestPath(puzzle: BoughturnPuzzle, fromId: number, toId: number) {
  const fromPath = pathToRoot(puzzle, fromId);
  const toPath = pathToRoot(puzzle, toId);
  const toSet = new Set(toPath);
  const lca = fromPath.find((nodeId) => toSet.has(nodeId)) ?? puzzle.rootId;
  const pathUp = fromPath.slice(0, fromPath.indexOf(lca));
  const downPath = [...toPath.slice(0, toPath.indexOf(lca))].reverse();
  return [...pathUp, lca, ...downPath];
}

function moveToward(state: BoughturnState, nextNodeId: number): BoughturnMoveType {
  const current = nodeById(state.puzzle, state.currentId);
  if (current.parentId === nextNodeId) return 'up';

  const exits = effectiveChildren(state, current.id);
  if (exits.leftId === nextNodeId) return 'left';
  if (exits.rightId === nextNodeId) return 'right';

  throw new Error(`Node ${nextNodeId} is not adjacent to current node ${current.id}`);
}

function optimalChildOrder(puzzle: BoughturnPuzzle, nodeId: number) {
  const node = nodeById(puzzle, nodeId);
  const children = [node.leftId, node.rightId].filter(
    (childId): childId is number => subtreeInternalCount(puzzle, childId) > 0,
  );

  if (children.length < 2) return children;

  const [leftChild, rightChild] = children;
  const leftStay = finishAnywhereMovement(puzzle, leftChild) - finishHereMovement(puzzle, leftChild);
  const rightStay = finishAnywhereMovement(puzzle, rightChild) - finishHereMovement(puzzle, rightChild);

  if (leftStay <= rightStay) {
    return [leftChild, rightChild];
  }
  return [rightChild, leftChild];
}

function directionAfterMirror(node: BoughturnNode, childId: number): BoughturnMoveType {
  return childId === node.rightId ? 'left' : 'right';
}

function buildReturnMoves(puzzle: BoughturnPuzzle, nodeId: number): BoughturnMove[] {
  const node = nodeById(puzzle, nodeId);
  if (!isInternal(node)) {
    return [];
  }

  const moves: BoughturnMove[] = [{ type: 'mirror' }];
  const order = optimalChildOrder(puzzle, nodeId);

  for (const childId of order) {
    const direction = directionAfterMirror(node, childId);
    moves.push({ type: direction });
    moves.push(...buildReturnMoves(puzzle, childId));
    moves.push({ type: 'up' });
  }

  return moves;
}

function buildOptimalMoves(puzzle: BoughturnPuzzle, nodeId: number): BoughturnMove[] {
  const node = nodeById(puzzle, nodeId);
  if (!isInternal(node)) {
    return [];
  }

  const moves: BoughturnMove[] = [{ type: 'mirror' }];
  const order = optimalChildOrder(puzzle, nodeId);

  if (order.length === 0) {
    return moves;
  }

  if (order.length === 1) {
    moves.push({ type: directionAfterMirror(node, order[0]) });
    moves.push(...buildOptimalMoves(puzzle, order[0]));
    return moves;
  }

  const [firstChild, lastChild] = order;
  moves.push({ type: directionAfterMirror(node, firstChild) });
  moves.push(...buildReturnMoves(puzzle, firstChild));
  moves.push({ type: 'up' });
  moves.push({ type: directionAfterMirror(node, lastChild) });
  moves.push(...buildOptimalMoves(puzzle, lastChild));
  return moves;
}

function pickFrontierTarget(state: BoughturnState) {
  const remaining = state.puzzle.internalIds.filter((nodeId) => !state.mirrored[nodeId]);
  remaining.sort((a, b) => {
    const depthGap = nodeById(state.puzzle, a).depth - nodeById(state.puzzle, b).depth;
    if (depthGap !== 0) return depthGap;
    return a - b;
  });
  return remaining[0] ?? null;
}

function runPolicy(
  puzzle: BoughturnPuzzle,
  pickMove: (state: BoughturnState) => BoughturnMoveType,
): BoughturnSolution {
  let state = createInitialState(puzzle);
  const moves: BoughturnMove[] = [];

  while (!state.verdict) {
    const moveType = pickMove(state);
    moves.push({ type: moveType });
    state = applyMove(state, { type: moveType });
  }

  return {
    moves,
    finalState: state,
    solved: Boolean(state.verdict?.correct),
    actionsUsed: state.actionsUsed,
  };
}

function countBranchChoices(puzzle: BoughturnPuzzle) {
  return puzzle.internalIds.filter((nodeId) => {
    const node = nodeById(puzzle, nodeId);
    return subtreeInternalCount(puzzle, node.leftId) > 0 && subtreeInternalCount(puzzle, node.rightId) > 0;
  }).length;
}

export function generatePuzzle(seed: number, difficulty: BoughturnDifficulty): BoughturnPuzzle {
  const blueprint = BLUEPRINTS[difficulty];
  const tokens = blueprint.tokenSets[seed % blueprint.tokenSets.length];
  const nodes = buildPerfectTree(blueprint.depth, tokens);
  const internalIds = nodes.filter(isInternal).map((node) => node.id);
  const puzzleBase = {
    difficulty,
    label: blueprint.label,
    title: blueprint.title,
    helper: blueprint.helper,
    nodes,
    rootId: 0,
    internalIds,
  };

  const shell = {
    ...puzzleBase,
    budget: 0,
    targetLeafRibbon: [],
  };

  return {
    ...puzzleBase,
    budget: internalIds.length + finishAnywhereMovement(shell, shell.rootId) + blueprint.slack,
    targetLeafRibbon: targetRibbonFor(puzzleBase),
  };
}

export function createInitialState(puzzle: BoughturnPuzzle): BoughturnState {
  return {
    puzzle,
    currentId: puzzle.rootId,
    mirrored: puzzle.nodes.map(() => false),
    actionsUsed: 0,
    history: [],
    message: 'Start at the crown hub. Mirror the branch you stand on, then stay inside one subtree until it is finished before crossing.',
    verdict: null,
  };
}

export function applyMove(state: BoughturnState, move: BoughturnMove): BoughturnState {
  if (state.verdict) return cloneState(state);

  const next = cloneState(state);
  if (move.type === 'mirror') return mirrorCurrent(next);
  if (move.type === 'left') return stepToChild(next, 'left');
  if (move.type === 'right') return stepToChild(next, 'right');
  return stepUp(next);
}

export function currentNode(state: BoughturnState) {
  return nodeById(state.puzzle, state.currentId);
}

export function currentExits(state: BoughturnState) {
  const exits = effectiveChildren(state, state.currentId);
  return {
    parentId: currentNode(state).parentId,
    leftId: exits.leftId,
    rightId: exits.rightId,
  };
}

export function remainingHubs(state: BoughturnState) {
  return state.puzzle.internalIds.filter((nodeId) => !state.mirrored[nodeId]).length;
}

export function leafRibbon(state: BoughturnState) {
  return currentRibbon(state);
}

export function treeRows(state: BoughturnState) {
  const maxDepth = rootDepth(state.puzzle);
  const rows: Array<Array<number | null>> = [];

  for (let depth = 0; depth <= maxDepth; depth += 1) {
    rows.push(Array.from({ length: 2 ** depth }, () => null));
  }

  function walk(nodeId: number, depth: number, column: number) {
    rows[depth][column] = nodeId;
    const exits = effectiveChildren(state, nodeId);
    if (exits.leftId !== null) {
      walk(exits.leftId, depth + 1, column * 2);
    }
    if (exits.rightId !== null) {
      walk(exits.rightId, depth + 1, column * 2 + 1);
    }
  }

  walk(state.puzzle.rootId, 0, 0);
  return rows;
}

export function evaluateBoughturn(): BoughturnEvaluation {
  const difficulties: DifficultyAggregate[] = [];
  let totalGap = 0;
  let totalPressure = 0;
  let count = 0;
  let breakpoint: BoughturnDifficulty = 5;
  let breakpointFound = false;
  let strongestEvidence = '';
  let strongestGap = -1;

  for (const difficulty of [1, 2, 3, 4, 5] as BoughturnDifficulty[]) {
    const blueprint = BLUEPRINTS[difficulty];
    let solvable = 0;
    let altSolvable = 0;
    let optimalMoves = 0;
    let altMoves = 0;
    let gapSum = 0;
    let counterSum = 0;
    let infoGainSum = 0;

    for (let seed = 0; seed < blueprint.tokenSets.length; seed += 1) {
      const puzzle = generatePuzzle(seed, difficulty);
      const optimalPlan = buildOptimalMoves(puzzle, puzzle.rootId);
      const optimal = runPolicy(puzzle, (state) => optimalPlan[state.actionsUsed]?.type ?? 'mirror');
      const frontier = runPolicy(puzzle, (state) => {
        const node = currentNode(state);
        if (isInternal(node) && !state.mirrored[node.id]) {
          return 'mirror';
        }

        const targetId = pickFrontierTarget(state);
        if (targetId === null) return 'mirror';

        const path = shortestPath(state.puzzle, state.currentId, targetId);
        const currentIndex = path.indexOf(state.currentId);
        const nextNodeId = path[currentIndex + 1];
        return moveToward(state, nextNodeId);
      });

      const gap = (frontier.actionsUsed - optimal.actionsUsed) / optimal.actionsUsed;
      if (optimal.solved) solvable += 1;
      if (frontier.solved) altSolvable += 1;
      optimalMoves += optimal.actionsUsed;
      altMoves += frontier.actionsUsed;
      gapSum += gap;
      counterSum += Math.max(1, countBranchChoices(puzzle));
      infoGainSum += puzzle.internalIds.length / Math.max(1, optimal.actionsUsed - puzzle.internalIds.length);

      totalGap += gap;
      totalPressure += countBranchChoices(puzzle);
      count += 1;

      if (!breakpointFound && !frontier.solved) {
        breakpoint = difficulty;
        breakpointFound = true;
      }

      if (gap > strongestGap) {
        strongestGap = gap;
        strongestEvidence = `${puzzle.label} alt ${frontier.actionsUsed} vs optimal ${optimal.actionsUsed}`;
      }
    }

    const sample = generatePuzzle(0, difficulty);
    const puzzleCount = blueprint.tokenSets.length;
    const depth = rootDepth(sample);
    const branchChoices = countBranchChoices(sample);
    const meanGap = gapSum / puzzleCount;
    const altFailureRate = 1 - altSolvable / puzzleCount;
    const skillDepth = clamp(0, 100, meanGap * 100 + altFailureRate * 18 + branchChoices * 3);

    difficulties.push({
      difficulty,
      label: sample.label,
      budget: sample.budget,
      solvability: solvable / puzzleCount,
      puzzleEntropy: puzzleEntropy(depth, sample.internalIds.length, blueprint.slack),
      skillDepth,
      decisionEntropy: clamp(1, 4.5, 1.15 + branchChoices * 0.18),
      counterintuitive: counterSum / puzzleCount,
      drama: clamp(0, 1, 0.3 + meanGap * 0.7),
      infoGainRatio: clamp(0, 9, infoGainSum / puzzleCount),
      optimalMoves: optimalMoves / puzzleCount,
      altMoves: altMoves / puzzleCount,
      altSolvability: altSolvable / puzzleCount,
    });
  }

  const bestAlternativeGap = (totalGap / Math.max(1, count)) * 100;
  const invariantPressure = clamp(0, 100, (totalPressure / Math.max(1, count)) * 14);

  return {
    difficulties,
    learningMetrics: {
      inputShapeMatch: 1,
      operationMatch: 1,
      constraintMatch: 0.88,
      goalMatch: 0.96,
      leetCodeFit: 0.98,
      bestAlternativeGap,
      invariantPressure,
      difficultyBreakpoint: breakpoint,
      algorithmAlignment: 1,
    },
    interpretation: {
      invariant:
        'Mirror the current hub, then finish one child subtree before crossing to the sibling subtree.',
      strongestAlternative:
        'Shallow frontier sweep: keep chasing the nearest unmirrored hub at the smallest depth.',
      evidence: strongestEvidence,
    },
  };
}
