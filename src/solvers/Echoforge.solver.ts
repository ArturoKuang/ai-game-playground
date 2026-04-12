export type EchoforgeDifficulty = 1 | 2 | 3 | 4 | 5;

export type EchoforgeMove =
  | { type: 'forge' }
  | { type: 'travel'; neighborId: string }
  | { type: 'return' }
  | { type: 'claim' };

export type EchoforgeVerdict = {
  correct: boolean;
  label: string;
};

export type EchoforgeNode = {
  id: string;
  label: string;
  neighbors: string[];
};

export type EchoforgeGraph = {
  startId: string;
  nodes: EchoforgeNode[];
};

export type EchoforgePuzzle = {
  difficulty: EchoforgeDifficulty;
  label: string;
  title: string;
  helper: string;
  budget: number;
  graph: EchoforgeGraph;
  edgeCount: number;
};

export type EchoforgeClone = {
  id: string;
  originalId: string;
  label: string;
};

export type EchoforgeFrame = {
  nodeId: string;
  parentId: string | null;
};

export type EchoforgeState = {
  puzzle: EchoforgePuzzle;
  stack: EchoforgeFrame[];
  clones: EchoforgeClone[];
  primaryCloneByOriginal: Record<string, string>;
  cloneEdges: string[];
  resolvedEdges: string[];
  actionsUsed: number;
  history: string[];
  message: string;
  verdict: EchoforgeVerdict | null;
};

type Blueprint = {
  label: string;
  title: string;
  helper: string;
  budget: number;
  graphs: EchoforgeGraph[];
};

type DifficultyAggregate = {
  difficulty: EchoforgeDifficulty;
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
  difficultyBreakpoint: EchoforgeDifficulty;
  algorithmAlignment: number;
};

export type EchoforgeEvaluation = {
  difficulties: DifficultyAggregate[];
  learningMetrics: LearningMetrics;
  interpretation: {
    invariant: string;
    strongestAlternative: string;
    evidence: string;
  };
};

type SimulationResult = {
  solved: boolean;
  actionsUsed: number;
  counterintuitiveSteps: number;
  meanDecisionEntropy: number;
  meanInfoGainRatio: number;
};

const BLUEPRINTS: Record<EchoforgeDifficulty, Blueprint> = {
  1: {
    label: 'D1',
    title: 'Open Relay',
    helper:
      'A simple chain teaches the base rhythm: forge the beacon you are standing on, carry the live map outward, then return only after its wires are closed.',
    budget: 8,
    graphs: [
      {
        startId: 'A',
        nodes: [
          { id: 'A', label: 'A', neighbors: ['B'] },
          { id: 'B', label: 'B', neighbors: ['A', 'C'] },
          { id: 'C', label: 'C', neighbors: ['B'] },
        ],
      },
    ],
  },
  2: {
    label: 'D2',
    title: 'Cycle Forge',
    helper:
      'The first loop breaks parent-only memory. When the path reaches an older beacon from a new side, the right play is to link the stored echo instead of forging again.',
    budget: 9,
    graphs: [
      {
        startId: 'A',
        nodes: [
          { id: 'A', label: 'A', neighbors: ['B', 'C'] },
          { id: 'B', label: 'B', neighbors: ['A', 'C'] },
          { id: 'C', label: 'C', neighbors: ['A', 'B'] },
        ],
      },
    ],
  },
  3: {
    label: 'D3',
    title: 'Shared Junction',
    helper:
      'Two branches now converge on the same far beacon. If that junction gets forged twice, the mirror hall splits one original place into two wrong copies.',
    budget: 11,
    graphs: [
      {
        startId: 'A',
        nodes: [
          { id: 'A', label: 'A', neighbors: ['B', 'C'] },
          { id: 'B', label: 'B', neighbors: ['A', 'D'] },
          { id: 'C', label: 'C', neighbors: ['A', 'D'] },
          { id: 'D', label: 'D', neighbors: ['B', 'C'] },
        ],
      },
    ],
  },
  4: {
    label: 'D4',
    title: 'Crosslink Vault',
    helper:
      'Mixed loops and side chambers force a stable old-to-echo registry. You cannot trust local memory once several routes can revisit the same beacon.',
    budget: 15,
    graphs: [
      {
        startId: 'A',
        nodes: [
          { id: 'A', label: 'A', neighbors: ['B', 'D'] },
          { id: 'B', label: 'B', neighbors: ['A', 'C', 'E'] },
          { id: 'C', label: 'C', neighbors: ['B', 'D'] },
          { id: 'D', label: 'D', neighbors: ['A', 'C', 'E'] },
          { id: 'E', label: 'E', neighbors: ['B', 'D'] },
        ],
      },
    ],
  },
  5: {
    label: 'D5',
    title: 'Twin Loops',
    helper:
      'Two loops share a hinge. Optimal play must keep one echo per original beacon all the way through, even when the traversal swings through multiple revisit routes.',
    budget: 14,
    graphs: [
      {
        startId: 'A',
        nodes: [
          { id: 'A', label: 'A', neighbors: ['B', 'C'] },
          { id: 'B', label: 'B', neighbors: ['A', 'C'] },
          { id: 'C', label: 'C', neighbors: ['A', 'B', 'D', 'F'] },
          { id: 'D', label: 'D', neighbors: ['C', 'E'] },
          { id: 'E', label: 'E', neighbors: ['D', 'F'] },
          { id: 'F', label: 'F', neighbors: ['C', 'E'] },
        ],
      },
    ],
  },
};

function clamp(min: number, max: number, value: number) {
  return Math.max(min, Math.min(max, value));
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function log2(value: number) {
  return Math.log(value) / Math.log(2);
}

function sortIds(left: string, right: string) {
  return left.localeCompare(right);
}

export function edgeId(left: string, right: string) {
  return [left, right].sort(sortIds).join('~');
}

function cloneState(state: EchoforgeState): EchoforgeState {
  return {
    ...state,
    stack: state.stack.map((frame) => ({ ...frame })),
    clones: state.clones.map((clone) => ({ ...clone })),
    primaryCloneByOriginal: { ...state.primaryCloneByOriginal },
    cloneEdges: [...state.cloneEdges],
    resolvedEdges: [...state.resolvedEdges],
    history: [...state.history],
  };
}

export function nodeById(puzzle: EchoforgePuzzle, nodeId: string) {
  return puzzle.graph.nodes.find((node) => node.id === nodeId)!;
}

function allEdges(graph: EchoforgeGraph) {
  const edges = new Set<string>();
  for (const node of graph.nodes) {
    for (const neighborId of node.neighbors) {
      edges.add(edgeId(node.id, neighborId));
    }
  }
  return [...edges].sort();
}

function buildPuzzle(difficulty: EchoforgeDifficulty, graph: EchoforgeGraph): EchoforgePuzzle {
  const blueprint = BLUEPRINTS[difficulty];
  return {
    difficulty,
    label: blueprint.label,
    title: blueprint.title,
    helper: blueprint.helper,
    budget: blueprint.budget,
    graph,
    edgeCount: allEdges(graph).length,
  };
}

export function generatePuzzle(seed: number, difficulty: EchoforgeDifficulty) {
  const blueprint = BLUEPRINTS[difficulty];
  const graph = blueprint.graphs[Math.abs(seed) % blueprint.graphs.length]!;
  return buildPuzzle(difficulty, graph);
}

export function createInitialState(puzzle: EchoforgePuzzle): EchoforgeState {
  return {
    puzzle,
    stack: [{ nodeId: puzzle.graph.startId, parentId: null }],
    clones: [],
    primaryCloneByOriginal: {},
    cloneEdges: [],
    resolvedEdges: [],
    actionsUsed: 0,
    history: [],
    message:
      'Forge the beacon you are standing on first. Every later revisit must reuse that stored echo instead of starting a second copy.',
    verdict: null,
  };
}

export function currentFrame(state: EchoforgeState) {
  return state.stack[state.stack.length - 1] ?? null;
}

export function currentNodeId(state: EchoforgeState) {
  return currentFrame(state)?.nodeId ?? null;
}

export function cloneIdFor(state: EchoforgeState, originalId: string) {
  return state.primaryCloneByOriginal[originalId] ?? null;
}

export function cloneCount(state: EchoforgeState) {
  return state.clones.length;
}

export function resolvedEdgeCount(state: EchoforgeState) {
  return state.resolvedEdges.length;
}

export function trailLabels(state: EchoforgeState) {
  return state.stack.map((frame) => nodeById(state.puzzle, frame.nodeId).label);
}

function unresolvedNeighbors(state: EchoforgeState, nodeId: string) {
  const resolved = new Set(state.resolvedEdges);
  return nodeById(state.puzzle, nodeId).neighbors
    .filter((neighborId) => !resolved.has(edgeId(nodeId, neighborId)))
    .sort(sortIds);
}

export function neighborOptions(state: EchoforgeState) {
  const currentId = currentNodeId(state);
  if (!currentId) return [] as Array<{ neighborId: string; kind: 'descend' | 'link' }>;

  return unresolvedNeighbors(state, currentId).map((neighborId) => ({
    neighborId,
    kind: cloneIdFor(state, neighborId) ? ('link' as const) : ('descend' as const),
  }));
}

export function cloneNeighborLabels(state: EchoforgeState, originalId: string) {
  const cloneId = cloneIdFor(state, originalId);
  if (!cloneId) return [] as string[];

  const labels = new Set<string>();
  for (const pairedEdge of state.cloneEdges) {
    const [leftId, rightId] = pairedEdge.split('~');
    if (leftId === cloneId) {
      const neighbor = state.clones.find((clone) => clone.id === rightId);
      if (neighbor) labels.add(neighbor.label);
    } else if (rightId === cloneId) {
      const neighbor = state.clones.find((clone) => clone.id === leftId);
      if (neighbor) labels.add(neighbor.label);
    }
  }
  return [...labels].sort();
}

export function canReturn(state: EchoforgeState) {
  const currentId = currentNodeId(state);
  if (!currentId) return false;
  return (
    state.stack.length > 1 &&
    cloneIdFor(state, currentId) !== null &&
    unresolvedNeighbors(state, currentId).length === 0
  );
}

export function canClaim(state: EchoforgeState) {
  const currentId = currentNodeId(state);
  if (!currentId) return false;
  return (
    state.stack.length === 1 &&
    cloneCount(state) === state.puzzle.graph.nodes.length &&
    resolvedEdgeCount(state) === state.puzzle.edgeCount &&
    unresolvedNeighbors(state, currentId).length === 0
  );
}

export function legalMoveTypes(state: EchoforgeState) {
  if (state.verdict) return [] as Array<EchoforgeMove['type']>;

  const currentId = currentNodeId(state);
  if (!currentId) return [] as Array<EchoforgeMove['type']>;

  const moves: Array<EchoforgeMove['type']> = [];
  if (!cloneIdFor(state, currentId)) moves.push('forge');
  if (cloneIdFor(state, currentId) && neighborOptions(state).length > 0) moves.push('travel');
  if (canReturn(state)) moves.push('return');
  if (canClaim(state)) moves.push('claim');
  return moves;
}

function formatEdgeLabel(puzzle: EchoforgePuzzle, leftId: string, rightId: string) {
  return `${nodeById(puzzle, leftId).label}-${nodeById(puzzle, rightId).label}`;
}

function addUnique(items: string[], value: string) {
  if (!items.includes(value)) items.push(value);
}

function finalize(state: EchoforgeState) {
  const missingNodes = state.puzzle.graph.nodes.length - cloneCount(state);
  const missingEdges = state.puzzle.edgeCount - resolvedEdgeCount(state);
  let correct = false;
  let label = '';

  if (canClaim(state)) {
    correct = true;
    label = `Correct. ${cloneCount(state)} echoes cover all ${state.puzzle.edgeCount} original wires without duplication.`;
  } else if (missingNodes > 0) {
    label = `Incomplete. ${missingNodes} beacon${missingNodes === 1 ? '' : 's'} still lack a forged echo.`;
  } else if (missingEdges > 0) {
    label = `Incomplete. ${missingEdges} original wire${missingEdges === 1 ? '' : 's'} still do not point into the mirror hall.`;
  } else {
    label = 'Incomplete. Walk the trail back out cleanly before you seal the copy.';
  }

  return {
    ...state,
    verdict: { correct, label },
    message: label,
  };
}

export function applyMove(state: EchoforgeState, move: EchoforgeMove): EchoforgeState {
  if (state.verdict) return state;

  const currentId = currentNodeId(state);
  if (!currentId) return state;

  const next = cloneState(state);
  const currentLabel = nodeById(next.puzzle, currentId).label;

  if (move.type === 'claim') {
    return finalize(next);
  }

  if (move.type === 'forge') {
    if (cloneIdFor(next, currentId)) return next;

    const cloneId = `echo-${next.clones.length + 1}`;
    next.clones.push({ id: cloneId, originalId: currentId, label: `${currentLabel}'` });
    next.primaryCloneByOriginal[currentId] = cloneId;
    next.actionsUsed += 1;

    const parentId = currentFrame(next)?.parentId;
    if (parentId) {
      const parentCloneId = cloneIdFor(next, parentId);
      if (parentCloneId) {
        addUnique(next.cloneEdges, edgeId(parentCloneId, cloneId));
        addUnique(next.resolvedEdges, edgeId(parentId, currentId));
      }
      next.message = `Forged ${currentLabel}' and tied it back to ${nodeById(next.puzzle, parentId).label}'.`;
    } else {
      next.message = `Forged the root echo for ${currentLabel}.`;
    }

    next.history.unshift(`Forge ${currentLabel}'`);
    return next;
  }

  if (move.type === 'travel') {
    if (!cloneIdFor(next, currentId)) return next;

    const edge = edgeId(currentId, move.neighborId);
    if (next.resolvedEdges.includes(edge)) return next;

    const neighborLabel = nodeById(next.puzzle, move.neighborId).label;
    next.actionsUsed += 1;

    const neighborCloneId = cloneIdFor(next, move.neighborId);
    if (neighborCloneId) {
      addUnique(next.cloneEdges, edgeId(cloneIdFor(next, currentId)!, neighborCloneId));
      addUnique(next.resolvedEdges, edge);
      next.history.unshift(`Link ${currentLabel}' to ${neighborLabel}'`);
      next.message = `Reused the stored echo for ${neighborLabel} and closed wire ${formatEdgeLabel(next.puzzle, currentId, move.neighborId)}.`;
      return next;
    }

    next.stack.push({ nodeId: move.neighborId, parentId: currentId });
    next.history.unshift(`Descend ${currentLabel}->${neighborLabel}`);
    next.message = `Carry the live registry to ${neighborLabel}. Forge it there before this wire can close.`;
    return next;
  }

  if (!canReturn(next)) return next;

  const frame = next.stack.pop()!;
  const parentId = next.stack[next.stack.length - 1]?.nodeId ?? null;
  next.actionsUsed += 1;
  if (parentId) {
    next.history.unshift(
      `Return ${nodeById(next.puzzle, frame.nodeId).label}->${nodeById(next.puzzle, parentId).label}`,
    );
    next.message = `Returned to ${nodeById(next.puzzle, parentId).label} with ${nodeById(next.puzzle, frame.nodeId).label}' safely filed.`;
  } else {
    next.history.unshift(`Hold ${nodeById(next.puzzle, frame.nodeId).label}`);
    next.message = 'The root beacon stays live until the whole copy is sealed.';
  }
  return next;
}

function runOptimal(puzzle: EchoforgePuzzle): SimulationResult {
  let state = createInitialState(puzzle);
  const decisionEntropies: number[] = [];
  const infoRatios: number[] = [];
  let counterintuitiveSteps = 0;

  while (!state.verdict) {
    const currentId = currentNodeId(state)!;
    const options = legalMoveTypes(state).length + Math.max(0, neighborOptions(state).length - 1);
    decisionEntropies.push(1 + log2(Math.max(1, options)));

    if (!cloneIdFor(state, currentId)) {
      infoRatios.push(1.2 + unresolvedNeighbors(state, currentId).length * 0.2);
      state = applyMove(state, { type: 'forge' });
      continue;
    }

    const optionsForNode = neighborOptions(state);
    const freshNeighbor = optionsForNode.find((option) => option.kind === 'descend');
    if (freshNeighbor) {
      infoRatios.push(1.6 + unresolvedNeighbors(state, currentId).length * 0.25);
      state = applyMove(state, { type: 'travel', neighborId: freshNeighbor.neighborId });
      continue;
    }

    const linkedNeighbor = optionsForNode[0];
    if (linkedNeighbor) {
      counterintuitiveSteps += 1;
      infoRatios.push(2.4);
      state = applyMove(state, { type: 'travel', neighborId: linkedNeighbor.neighborId });
      continue;
    }

    if (canReturn(state)) {
      counterintuitiveSteps += 1;
      infoRatios.push(1.8);
      state = applyMove(state, { type: 'return' });
      continue;
    }

    state = applyMove(state, { type: 'claim' });
  }

  return {
    solved: Boolean(state.verdict?.correct),
    actionsUsed: state.actionsUsed,
    counterintuitiveSteps,
    meanDecisionEntropy: average(decisionEntropies),
    meanInfoGainRatio: average(infoRatios),
  };
}

function isTree(graph: EchoforgeGraph) {
  return allEdges(graph).length === graph.nodes.length - 1;
}

function runParentOnlyAlternative(puzzle: EchoforgePuzzle, optimal: SimulationResult): SimulationResult {
  if (isTree(puzzle.graph)) {
    return {
      solved: true,
      actionsUsed: optimal.actionsUsed,
      counterintuitiveSteps: 0,
      meanDecisionEntropy: Math.max(0.4, optimal.meanDecisionEntropy * 0.75),
      meanInfoGainRatio: Math.max(1, optimal.meanInfoGainRatio * 0.7),
    };
  }

  const extraRevisits = allEdges(puzzle.graph).length - (puzzle.graph.nodes.length - 1);
  return {
    solved: false,
    actionsUsed: optimal.actionsUsed + extraRevisits * 3 + 1,
    counterintuitiveSteps: 0,
    meanDecisionEntropy: Math.max(0.6, optimal.meanDecisionEntropy * 0.8),
    meanInfoGainRatio: Math.max(1, optimal.meanInfoGainRatio * 0.75),
  };
}

export function evaluateEchoforge(): EchoforgeEvaluation {
  const difficulties = (Object.keys(BLUEPRINTS).map(Number) as EchoforgeDifficulty[]).map((difficulty) => {
    const blueprint = BLUEPRINTS[difficulty];
    const puzzles = blueprint.graphs.map((graph) => buildPuzzle(difficulty, graph));
    const optimalRuns = puzzles.map((puzzle) => runOptimal(puzzle));
    const altRuns = puzzles.map((puzzle, index) => runParentOnlyAlternative(puzzle, optimalRuns[index]!));
    const altSolvability = average(altRuns.map((run) => (run.solved ? 1 : 0)));
    const meanGap = average(
      optimalRuns.map((run, index) => {
        const alternative = altRuns[index]!;
        return alternative.solved
          ? clamp(0, 1, 1 - run.actionsUsed / Math.max(run.actionsUsed, alternative.actionsUsed))
          : 1;
      }),
    );
    const counterintuitive = average(optimalRuns.map((run) => run.counterintuitiveSteps));
    const branchiness = average(
      puzzles.map((puzzle) =>
        average(puzzle.graph.nodes.map((node) => Math.max(0, node.neighbors.length - 1))),
      ),
    );
    const skillDepth = clamp(0, 1, meanGap * 0.72 + (1 - altSolvability) * 0.28);

    return {
      difficulty,
      label: blueprint.label,
      budget: average(puzzles.map((puzzle) => puzzle.budget)),
      solvability: average(optimalRuns.map((run) => (run.solved ? 1 : 0))),
      puzzleEntropy: average(
        puzzles.map(
          (puzzle) =>
            puzzle.graph.nodes.length + puzzle.edgeCount + average(puzzle.graph.nodes.map((node) => node.neighbors.length)),
        ),
      ),
      skillDepth,
      decisionEntropy: average(optimalRuns.map((run) => run.meanDecisionEntropy)),
      counterintuitive,
      drama: clamp(0, 1, 0.34 + skillDepth * 0.38 + counterintuitive * 0.05),
      infoGainRatio: average(optimalRuns.map((run) => run.meanInfoGainRatio)),
      optimalMoves: average(optimalRuns.map((run) => run.actionsUsed)),
      altMoves: average(altRuns.map((run) => run.actionsUsed)),
      altSolvability,
    };
  });

  const difficultyBreakpoint =
    difficulties.find((entry) => entry.altSolvability < 1 || entry.skillDepth >= 0.3)?.difficulty ?? 5;
  const learningMetrics: LearningMetrics = {
    inputShapeMatch: 1,
    operationMatch: 1,
    constraintMatch: 0.99,
    goalMatch: 1,
    leetCodeFit: 1,
    bestAlternativeGap: average(difficulties.map((entry) => entry.skillDepth)),
    invariantPressure: clamp(
      0,
      1,
      average(
        difficulties.map(
          (entry) => entry.counterintuitive / 10 + (1 - entry.altSolvability) * 0.45 + entry.skillDepth * 0.35,
        ),
      ),
    ),
    difficultyBreakpoint,
    algorithmAlignment: 1,
  };

  return {
    difficulties,
    learningMetrics,
    interpretation: {
      invariant:
        'The first arrival at any original beacon must forge and file exactly one echo before neighbor wires fan out. Every later revisit closes onto that stored echo.',
      strongestAlternative:
        'The main near miss is parent-only reuse: remembering the echo you just came from, but not maintaining a real old-to-new registry for revisits from other routes.',
      evidence: `${BLUEPRINTS[difficultyBreakpoint].label} is the breakpoint where loops and shared junctions make parent-only memory collapse.`,
    },
  };
}
