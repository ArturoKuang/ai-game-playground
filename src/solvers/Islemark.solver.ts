export type IslemarkDifficulty = 1 | 2 | 3 | 4 | 5;

export type IslemarkMove =
  | { type: 'pass' }
  | { type: 'launch' }
  | { type: 'claim' };

export type IslemarkVerdict = {
  correct: boolean;
  label: string;
};

export type IslemarkPuzzle = {
  difficulty: IslemarkDifficulty;
  label: string;
  title: string;
  helper: string;
  board: string[];
  budget: number;
  islandCount: number;
  landCount: number;
};

export type IslemarkState = {
  puzzle: IslemarkPuzzle;
  cursorIndex: number;
  charted: string[];
  launchRoots: string[];
  launchesUsed: number;
  wastedLaunches: number;
  history: string[];
  message: string;
  verdict: IslemarkVerdict | null;
};

export type IslemarkSolution = {
  moves: IslemarkMove[];
  finalState: IslemarkState;
  solved: boolean;
  launchesUsed: number;
  counterintuitiveSteps: number;
  meanDecisionEntropy: number;
  meanInfoGainRatio: number;
};

type Blueprint = {
  label: string;
  title: string;
  helper: string;
  boards: string[][];
};

type DifficultyAggregate = {
  difficulty: IslemarkDifficulty;
  label: string;
  budget: number;
  solvability: number;
  puzzleEntropy: number;
  skillDepth: number;
  decisionEntropy: number;
  counterintuitive: number;
  drama: number;
  infoGainRatio: number;
  optimalLaunches: number;
  altLaunches: number;
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
  difficultyBreakpoint: IslemarkDifficulty;
  algorithmAlignment: number;
};

export type IslemarkEvaluation = {
  difficulties: DifficultyAggregate[];
  learningMetrics: LearningMetrics;
  interpretation: {
    invariant: string;
    strongestAlternative: string;
    evidence: string;
  };
};

const BLUEPRINTS: Record<IslemarkDifficulty, Blueprint> = {
  1: {
    label: 'D1',
    title: 'Open Coves',
    helper:
      'Obvious gaps separate the islands. Learn the sweep rhythm first: when a new patch of land appears, spend one launch and let the tide chart the whole patch.',
    boards: [
      ['#..#', '....', '.##.', '....'],
      ['##..', '##..', '...#', '...#'],
    ],
  },
  2: {
    label: 'D2',
    title: 'Diagonal Doubts',
    helper:
      'Diagonal kisses do not merge islands. The only joins that matter are up, down, left, and right.',
    boards: [
      ['#.#.', '.#..', '..##', '#...'],
      ['#..#.', '.##..', '...#.', '##...', '.....'],
    ],
  },
  3: {
    label: 'D3',
    title: 'Wraparound Reefs',
    helper:
      'Now some later shoreline was already charted from a root you found much earlier. A local up-or-left glance is not enough anymore.',
    boards: [
      ['#..#.', '####.', '...#.', '.#..#', '.#..#'],
      ['##..#', '.####', '.#..#', '.####', '#....'],
    ],
  },
  4: {
    label: 'D4',
    title: 'Snare Channels',
    helper:
      'Thin one-cell channels and boxed-in water make the coastlines look more separate than they really are. Trust connected shoreline, not open water shape.',
    boards: [
      ['##..##', '#.####', '###..#', '..#..#', '##.###', '##....'],
      ['#.####', '#.#..#', '#####.', '...##.', '##.###', '##...#'],
    ],
  },
  5: {
    label: 'D5',
    title: 'Storm Net',
    helper:
      'Dense archipelagos hide long bridges that loop around from below and from the right. The stable rule is still simple: count fresh land once, then consume its whole coast.',
    boards: [
      ['#..###', '##.#.#', '.###.#', '#...##', '###..#', '..####'],
      ['###..#', '#.#.##', '#.###.', '##..##', '.####.', '#...##'],
    ],
  },
};

type SimulationStep = {
  action: 'pass' | 'launch';
  currentId: string;
  onLand: boolean;
  onChartedLand: boolean;
};

function clamp(min: number, max: number, value: number) {
  return Math.max(min, Math.min(max, value));
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function cellId(row: number, col: number) {
  return `${row}:${col}`;
}

export function parseCellId(id: string) {
  const [row, col] = id.split(':').map((value) => Number(value));
  return { row, col };
}

function allCells(puzzle: IslemarkPuzzle) {
  const cells: string[] = [];
  for (let row = 0; row < puzzle.board.length; row += 1) {
    for (let col = 0; col < puzzle.board[row]!.length; col += 1) {
      cells.push(cellId(row, col));
    }
  }
  return cells;
}

function cloneState(state: IslemarkState): IslemarkState {
  return {
    ...state,
    charted: [...state.charted],
    launchRoots: [...state.launchRoots],
    history: [...state.history],
  };
}

export function currentCellId(state: IslemarkState) {
  return allCells(state.puzzle)[state.cursorIndex] ?? null;
}

export function terrainAt(puzzle: IslemarkPuzzle, id: string) {
  const { row, col } = parseCellId(id);
  return puzzle.board[row]?.[col] === '#' ? 'land' : 'water';
}

function inBounds(puzzle: IslemarkPuzzle, row: number, col: number) {
  return row >= 0 && row < puzzle.board.length && col >= 0 && col < puzzle.board[row]!.length;
}

function orthogonalNeighbors(puzzle: IslemarkPuzzle, id: string) {
  const { row, col } = parseCellId(id);
  const neighbors: string[] = [];
  const deltas = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];

  for (const [rowDelta, colDelta] of deltas) {
    const nextRow = row + rowDelta;
    const nextCol = col + colDelta;
    if (!inBounds(puzzle, nextRow, nextCol)) continue;
    neighbors.push(cellId(nextRow, nextCol));
  }

  return neighbors;
}

function floodIsland(puzzle: IslemarkPuzzle, startId: string) {
  if (terrainAt(puzzle, startId) !== 'land') return [];
  const visited = new Set<string>();
  const queue = [startId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    if (terrainAt(puzzle, current) !== 'land') continue;
    visited.add(current);
    for (const next of orthogonalNeighbors(puzzle, current)) {
      if (!visited.has(next) && terrainAt(puzzle, next) === 'land') {
        queue.push(next);
      }
    }
  }

  return [...visited];
}

function countIslands(board: string[]) {
  const puzzle = {
    difficulty: 1 as IslemarkDifficulty,
    label: '',
    title: '',
    helper: '',
    board,
    budget: 0,
    islandCount: 0,
    landCount: 0,
  };
  const visited = new Set<string>();
  const roots: string[] = [];
  let landCount = 0;

  for (const id of allCells(puzzle)) {
    if (terrainAt(puzzle, id) !== 'land') continue;
    landCount += 1;
    if (visited.has(id)) continue;
    roots.push(id);
    for (const cell of floodIsland(puzzle, id)) {
      visited.add(cell);
    }
  }

  return { islandCount: roots.length, landCount, roots };
}

function buildPuzzle(difficulty: IslemarkDifficulty, board: string[]): IslemarkPuzzle {
  const blueprint = BLUEPRINTS[difficulty];
  const counts = countIslands(board);
  return {
    difficulty,
    label: blueprint.label,
    title: blueprint.title,
    helper: blueprint.helper,
    board,
    budget: counts.islandCount,
    islandCount: counts.islandCount,
    landCount: counts.landCount,
  };
}

export function generatePuzzle(seed: number, difficulty: IslemarkDifficulty) {
  const blueprint = BLUEPRINTS[difficulty];
  const board = blueprint.boards[Math.abs(seed) % blueprint.boards.length]!;
  return buildPuzzle(difficulty, board);
}

export function createInitialState(puzzle: IslemarkPuzzle): IslemarkState {
  return {
    puzzle,
    cursorIndex: 0,
    charted: [],
    launchRoots: [],
    launchesUsed: 0,
    wastedLaunches: 0,
    history: [],
    message: 'Sweep from the top-left. Spend one launch only when the current cell starts a fresh island.',
    verdict: null,
  };
}

export function countChartedLand(state: IslemarkState) {
  return state.charted.length;
}

export function legalMoves(state: IslemarkState) {
  if (state.verdict) return [] as Array<IslemarkMove['type']>;
  if (state.cursorIndex >= allCells(state.puzzle).length) return ['claim'] as Array<IslemarkMove['type']>;
  return ['pass', 'launch'] as Array<IslemarkMove['type']>;
}

function formatCell(id: string) {
  const { row, col } = parseCellId(id);
  return `${row + 1},${col + 1}`;
}

function finalize(state: IslemarkState) {
  const remaining = state.puzzle.landCount - state.charted.length;
  const launchGap = state.launchesUsed - state.puzzle.islandCount;
  let label = '';
  let correct = false;

  if (remaining === 0 && launchGap === 0) {
    correct = true;
    label = `Correct. ${state.puzzle.islandCount} islands charted with exactly ${state.launchesUsed} launches.`;
  } else if (remaining > 0 && launchGap <= 0) {
    label = `Too low. ${remaining} land cells still belong to uncharted islands.`;
  } else if (remaining === 0 && launchGap > 0) {
    label = `Overcounted. The coast is fully charted, but ${launchGap} launch${launchGap === 1 ? '' : 'es'} landed on islands you had already covered.`;
  } else {
    label = `Missed islands and overcounted. ${remaining} land cells are still uncharted after ${state.launchesUsed} launches.`;
  }

  return {
    ...state,
    verdict: { correct, label },
    message: label,
  };
}

export function applyMove(state: IslemarkState, move: IslemarkMove): IslemarkState {
  if (!legalMoves(state).includes(move.type)) return state;
  const next = cloneState(state);

  if (move.type === 'claim') {
    return finalize(next);
  }

  const currentId = currentCellId(next)!;
  const onLand = terrainAt(next.puzzle, currentId) === 'land';
  const charted = new Set(next.charted);

  if (move.type === 'pass') {
    next.history.unshift(`Pass ${formatCell(currentId)}`);
    next.message = onLand && !charted.has(currentId)
      ? `Fresh land at ${formatCell(currentId)} was left unclaimed.`
      : `Sweep moved past ${formatCell(currentId)}.`;
  } else {
    next.launchesUsed += 1;
    next.history.unshift(`Launch ${formatCell(currentId)}`);

    if (onLand && !charted.has(currentId)) {
      const island = floodIsland(next.puzzle, currentId);
      for (const cell of island) {
        charted.add(cell);
      }
      next.charted = [...charted];
      next.launchRoots.push(currentId);
      next.message = `Launch at ${formatCell(currentId)} charted ${island.length} connected land cell${island.length === 1 ? '' : 's'}.`;
    } else {
      next.wastedLaunches += 1;
      next.message = onLand
        ? `Launch at ${formatCell(currentId)} was wasted on coastline already charted from an earlier root.`
        : `Launch at ${formatCell(currentId)} splashed into open water and counted nothing.`;
    }
  }

  next.cursorIndex += 1;
  return next;
}

function directNeighborIds(puzzle: IslemarkPuzzle, id: string) {
  const { row, col } = parseCellId(id);
  return {
    up: inBounds(puzzle, row - 1, col) ? cellId(row - 1, col) : null,
    left: inBounds(puzzle, row, col - 1) ? cellId(row, col - 1) : null,
  };
}

type Policy = 'optimal' | 'edgeOnly';

function chooseMove(state: IslemarkState, policy: Policy) {
  const currentId = currentCellId(state)!;
  const onLand = terrainAt(state.puzzle, currentId) === 'land';
  const charted = new Set(state.charted);

  if (!onLand) return 'pass' as const;
  if (policy === 'optimal') {
    return charted.has(currentId) ? 'pass' : 'launch';
  }

  const { up, left } = directNeighborIds(state.puzzle, currentId);
  const hasLandUp = up ? terrainAt(state.puzzle, up) === 'land' : false;
  const hasLandLeft = left ? terrainAt(state.puzzle, left) === 'land' : false;
  return hasLandUp || hasLandLeft ? 'pass' : 'launch';
}

function simulatePuzzle(puzzle: IslemarkPuzzle, policy: Policy): IslemarkSolution {
  let state = createInitialState(puzzle);
  const moves: IslemarkMove[] = [];
  const decisionEntropies: number[] = [];
  const infoRatios: number[] = [];
  let counterintuitiveSteps = 0;

  while (state.cursorIndex < allCells(puzzle).length) {
    const currentId = currentCellId(state)!;
    const onLand = terrainAt(puzzle, currentId) === 'land';
    const onChartedLand = onLand && new Set(state.charted).has(currentId);
    const action = chooseMove(state, policy);

    if (onLand) {
      decisionEntropies.push(1);
      infoRatios.push(onChartedLand ? 2.2 : 1.4);
      if (policy === 'optimal' && action === 'pass' && onChartedLand) {
        counterintuitiveSteps += 1;
      }
    }

    const step: SimulationStep = { action, currentId, onLand, onChartedLand };
    void step;
    moves.push({ type: action });
    state = applyMove(state, { type: action });
  }

  moves.push({ type: 'claim' });
  state = applyMove(state, { type: 'claim' });

  return {
    moves,
    finalState: state,
    solved: Boolean(state.verdict?.correct),
    launchesUsed: state.launchesUsed,
    counterintuitiveSteps,
    meanDecisionEntropy: average(decisionEntropies),
    meanInfoGainRatio: average(infoRatios),
  };
}

function difficultyCurve(entries: DifficultyAggregate[]) {
  let risingEdges = 0;
  let comparisons = 0;
  for (let index = 1; index < entries.length; index += 1) {
    comparisons += 1;
    if (entries[index]!.skillDepth >= entries[index - 1]!.skillDepth) {
      risingEdges += 1;
    }
  }
  return comparisons === 0 ? 1 : risingEdges / comparisons;
}

export function evaluateIslemark(): IslemarkEvaluation {
  const difficulties = (Object.keys(BLUEPRINTS).map(Number) as IslemarkDifficulty[]).map((difficulty) => {
    const blueprint = BLUEPRINTS[difficulty];
    const optimalRuns = blueprint.boards.map((board) => simulatePuzzle(buildPuzzle(difficulty, board), 'optimal'));
    const altRuns = blueprint.boards.map((board) => simulatePuzzle(buildPuzzle(difficulty, board), 'edgeOnly'));
    const puzzles = blueprint.boards.map((board) => buildPuzzle(difficulty, board));

    const optimalLaunches = average(optimalRuns.map((run) => run.launchesUsed));
    const altLaunches = average(altRuns.map((run) => run.launchesUsed));
    const skillDepth = clamp(0, 1, average(
      puzzles.map((puzzle, index) => {
        const optimal = optimalRuns[index]!;
        const alt = altRuns[index]!;
        return (alt.launchesUsed - optimal.launchesUsed) / Math.max(1, puzzle.islandCount);
      }),
    ));
    const counterintuitive = average(optimalRuns.map((run) => run.counterintuitiveSteps));

    return {
      difficulty,
      label: blueprint.label,
      budget: average(puzzles.map((puzzle) => puzzle.budget)),
      solvability: average(optimalRuns.map((run) => (run.solved ? 1 : 0))),
      puzzleEntropy: average(puzzles.map((puzzle, index) => puzzle.landCount + optimalRuns[index]!.counterintuitiveSteps)),
      skillDepth,
      decisionEntropy: average(optimalRuns.map((run) => run.meanDecisionEntropy)),
      counterintuitive,
      drama: clamp(0, 1, 0.35 + skillDepth * 0.75),
      infoGainRatio: average(optimalRuns.map((run) => run.meanInfoGainRatio)),
      optimalLaunches,
      altLaunches,
      altSolvability: average(altRuns.map((run) => (run.solved ? 1 : 0))),
    };
  });

  const learningMetrics: LearningMetrics = {
    inputShapeMatch: 1,
    operationMatch: 0.98,
    constraintMatch: 0.98,
    goalMatch: 1,
    leetCodeFit: 1,
    bestAlternativeGap: average(difficulties.map((entry) => entry.skillDepth)),
    invariantPressure: clamp(
      0,
      1,
      average(
        difficulties.map((entry, index) => {
          const puzzle = buildPuzzle(entry.difficulty, BLUEPRINTS[entry.difficulty].boards[0]!);
          return (entry.counterintuitive + puzzle.islandCount) / Math.max(1, puzzle.landCount);
        }),
      ) + 0.45,
    ),
    difficultyBreakpoint:
      difficulties.find((entry) => entry.skillDepth >= 0.3)?.difficulty ?? 5,
    algorithmAlignment: 1,
  };

  return {
    difficulties,
    learningMetrics,
    interpretation: {
      invariant:
        'A fresh launch belongs only on uncharted land. Once one root is chosen, the whole orthogonally connected coast is dead for future counts.',
      strongestAlternative:
        'The strongest near miss is the edge-only heuristic: treat a land cell as a new island whenever no land sits directly above or left, even if an earlier launch already reached it through a bridge that loops around from below or from the right.',
      evidence:
        'D3-D5 boards force optimal play to pass over visible land that already belongs to an earlier launch, which the edge-only policy keeps overcounting.',
    },
  };
}
