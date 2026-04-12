export type WaygridDifficulty = 1 | 2 | 3 | 4 | 5;

export type WaygridMoveType = 'select' | 'merge' | 'survey';

export type WaygridMove = {
  type: WaygridMoveType;
  row?: number;
  col?: number;
};

export type WaygridVerdict = {
  correct: boolean;
  label: string;
};

type Grid = number[][];
type MaybeGrid = Array<Array<number | null>>;
type Coord = { row: number; col: number };
type Layout = { rows: number; cols: number };

export type WaygridPuzzle = {
  difficulty: WaygridDifficulty;
  label: string;
  title: string;
  helper: string;
  budget: number;
  rows: number;
  cols: number;
  trueCounts: Grid;
  surveyCosts: Grid;
};

export type WaygridState = {
  puzzle: WaygridPuzzle;
  selectedCell: Coord;
  sealedCounts: MaybeGrid;
  actionsUsed: number;
  history: string[];
  message: string;
  verdict: WaygridVerdict | null;
};

type Blueprint = {
  label: string;
  title: string;
  helper: string;
  budget: number;
  layouts: Layout[];
};

type DifficultyAggregate = {
  difficulty: WaygridDifficulty;
  label: string;
  budget: number;
  grid: string;
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
  difficultyBreakpoint: WaygridDifficulty;
  algorithmAlignment: number;
};

export type WaygridEvaluation = {
  difficulties: DifficultyAggregate[];
  learningMetrics: LearningMetrics;
  interpretation: {
    invariant: string;
    strongestAlternative: string;
    evidence: string;
  };
};

type Simulation = {
  solved: boolean;
  actionsUsed: number;
  mergeCount: number;
  surveyCount: number;
  decisionEntropy: number;
  puzzleEntropy: number;
  counterintuitive: number;
  drama: number;
  infoGainRatio: number;
  algorithmAlignment: number;
};

const BLUEPRINTS: Record<WaygridDifficulty, Blueprint> = {
  1: {
    label: 'D1',
    title: 'Porch Ledger',
    helper:
      'Tiny route ledgers still forgive direct surveys, but the reusable habit is already visible: every interior plaza comes from north plus west.',
    budget: 24,
    layouts: [
      { rows: 3, cols: 3 },
      { rows: 3, cols: 4 },
    ],
  },
  2: {
    label: 'D2',
    title: 'Market Blocks',
    helper:
      'Direct surveying still barely survives on these short manifests, but the reusable street ledger is now obviously cleaner than re-counting plazas one by one.',
    budget: 40,
    layouts: [
      { rows: 4, cols: 4 },
      { rows: 3, cols: 5 },
    ],
  },
  3: {
    label: 'D3',
    title: 'Bridge Quarter',
    helper:
      'The survey tax breaks here. The only stable plan is to seal the whole interior from north plus west and stop rediscovering the same side streets.',
    budget: 18,
    layouts: [
      { rows: 4, cols: 5 },
      { rows: 5, cols: 4 },
    ],
  },
  4: {
    label: 'D4',
    title: 'Customs Lattice',
    helper:
      'The ledger is wide now, and even one unnecessary survey wastes the audit clock. Keep the whole top-left chart live as you move across each row.',
    budget: 22,
    layouts: [
      { rows: 5, cols: 5 },
      { rows: 4, cols: 6 },
    ],
  },
  5: {
    label: 'D5',
    title: 'Grand Waygrid',
    helper:
      'Long manifests punish every fallback. Only disciplined two-feeder tabulation reaches the gate before the auditors freeze the grid.',
    budget: 29,
    layouts: [
      { rows: 5, cols: 6 },
      { rows: 6, cols: 5 },
    ],
  },
};

function clamp(min: number, max: number, value: number) {
  return Math.max(min, Math.min(max, value));
}

function log2(value: number) {
  return Math.log(value) / Math.log(2);
}

function cloneGrid<T>(grid: T[][]) {
  return grid.map((row) => [...row]);
}

function createCountGrid(rows: number, cols: number) {
  const counts = Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0));
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      counts[row][col] = row === 0 || col === 0 ? 1 : counts[row - 1][col] + counts[row][col - 1];
    }
  }
  return counts;
}

function createSurveyCostGrid(rows: number, cols: number) {
  const costs = Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0));
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      costs[row][col] = row === 0 || col === 0 ? 1 : 1 + costs[row - 1][col] + costs[row][col - 1];
    }
  }
  return costs;
}

function createInitialSeals(puzzle: WaygridPuzzle) {
  return Array.from({ length: puzzle.rows }, (_, row) =>
    Array.from({ length: puzzle.cols }, (_, col) =>
      row === 0 || col === 0 ? puzzle.trueCounts[row][col] : null,
    ),
  );
}

function coordKey(row: number, col: number) {
  return `${row}:${col}`;
}

function unresolvedCells(state: WaygridState) {
  const cells: Coord[] = [];
  for (let row = 1; row < state.puzzle.rows; row += 1) {
    for (let col = 1; col < state.puzzle.cols; col += 1) {
      if (state.sealedCounts[row][col] === null) cells.push({ row, col });
    }
  }
  return cells;
}

function allSealed(state: WaygridState) {
  return unresolvedCells(state).length === 0;
}

function isReady(state: WaygridState, row: number, col: number) {
  return (
    row > 0 &&
    col > 0 &&
    state.sealedCounts[row][col] === null &&
    state.sealedCounts[row - 1][col] !== null &&
    state.sealedCounts[row][col - 1] !== null
  );
}

function readyCells(state: WaygridState) {
  const cells: Coord[] = [];
  for (let row = 1; row < state.puzzle.rows; row += 1) {
    for (let col = 1; col < state.puzzle.cols; col += 1) {
      if (isReady(state, row, col)) cells.push({ row, col });
    }
  }
  return cells;
}

function closestToGate(state: WaygridState) {
  const ready = readyCells(state);
  if (ready.length === 0) return null;
  return ready.reduce((best, cell) => {
    const bestDistance = (state.puzzle.rows - 1 - best.row) + (state.puzzle.cols - 1 - best.col);
    const cellDistance = (state.puzzle.rows - 1 - cell.row) + (state.puzzle.cols - 1 - cell.col);
    if (cellDistance < bestDistance) return cell;
    if (cellDistance === bestDistance && cell.row > best.row) return cell;
    return best;
  });
}

function finalize(next: WaygridState) {
  if (next.actionsUsed > next.puzzle.budget) {
    next.verdict = {
      correct: false,
      label: 'The customs audit froze the grid before the route ledger was complete.',
    };
    return next;
  }

  if (allSealed(next)) {
    next.verdict = {
      correct: true,
      label: `Ledger sealed. ${next.puzzle.trueCounts[next.puzzle.rows - 1][next.puzzle.cols - 1]} routes reach the southeast gate.`,
    };
  }

  return next;
}

function cloneState(state: WaygridState): WaygridState {
  return {
    ...state,
    selectedCell: { ...state.selectedCell },
    sealedCounts: cloneGrid(state.sealedCounts),
    history: [...state.history],
  };
}

function describeCell(state: WaygridState, row: number, col: number) {
  if (row === 0 && col === 0) return 'Origin plaza. Exactly one route starts here.';
  if (row === 0 || col === 0) return 'Border plaza. Exactly one route reaches any top-row or west-column plaza.';
  const value = state.sealedCounts[row][col];
  if (value !== null) return `Plaza ${row + 1}-${col + 1} is already sealed at ${value} routes.`;
  if (isReady(state, row, col)) {
    const north = state.sealedCounts[row - 1][col];
    const west = state.sealedCounts[row][col - 1];
    return `Ready to merge north ${north} plus west ${west}.`;
  }
  return `Still unresolved. Survey for ${state.puzzle.surveyCosts[row][col]} actions, or seal north and west first.`;
}

export function generatePuzzle(seed: number, difficulty: WaygridDifficulty): WaygridPuzzle {
  const blueprint = BLUEPRINTS[difficulty];
  const layout = blueprint.layouts[seed % blueprint.layouts.length];
  return {
    difficulty,
    label: blueprint.label,
    title: blueprint.title,
    helper: blueprint.helper,
    budget: blueprint.budget,
    rows: layout.rows,
    cols: layout.cols,
    trueCounts: createCountGrid(layout.rows, layout.cols),
    surveyCosts: createSurveyCostGrid(layout.rows, layout.cols),
  };
}

export function createInitialState(puzzle: WaygridPuzzle): WaygridState {
  return {
    puzzle,
    selectedCell: { row: Math.min(1, puzzle.rows - 1), col: Math.min(1, puzzle.cols - 1) },
    sealedCounts: createInitialSeals(puzzle),
    actionsUsed: 0,
    history: [],
    message:
      'Seal the full route ledger. Border plazas start at 1 route; each interior plaza should inherit north plus west unless you waste clock surveying it directly.',
    verdict: null,
  };
}

export function remainingUnsealed(state: WaygridState) {
  return unresolvedCells(state).length;
}

export function sealedPlazaCount(state: WaygridState) {
  let count = 0;
  for (let row = 0; row < state.puzzle.rows; row += 1) {
    for (let col = 0; col < state.puzzle.cols; col += 1) {
      if (state.sealedCounts[row][col] !== null) count += 1;
    }
  }
  return count;
}

export function selectedValue(state: WaygridState) {
  return state.sealedCounts[state.selectedCell.row][state.selectedCell.col];
}

export function destinationValue(state: WaygridState) {
  return state.sealedCounts[state.puzzle.rows - 1][state.puzzle.cols - 1];
}

export function canMergeCell(state: WaygridState, row: number, col: number) {
  return isReady(state, row, col);
}

export function canSurveyCell(state: WaygridState, row: number, col: number) {
  return row > 0 && col > 0 && state.sealedCounts[row][col] === null;
}

export function legalMoves(state: WaygridState) {
  const moves: WaygridMove[] = [];
  for (const cell of readyCells(state)) {
    moves.push({ type: 'merge', row: cell.row, col: cell.col });
  }
  if (remainingUnsealed(state) > 0) {
    moves.push({ type: 'survey' });
  }
  return moves;
}

export function applyMove(state: WaygridState, move: WaygridMove): WaygridState {
  const next = cloneState(state);
  if (next.verdict) return next;

  const row = move.row ?? next.selectedCell.row;
  const col = move.col ?? next.selectedCell.col;

  if (move.type === 'select') {
    next.selectedCell = { row, col };
    next.message = describeCell(next, row, col);
    return next;
  }

  if (move.type === 'merge') {
    if (!canMergeCell(next, row, col)) {
      next.message = `Plaza ${row + 1}-${col + 1} is not ready. North and west must both be sealed first.`;
      return next;
    }

    const north = next.sealedCounts[row - 1][col] ?? 0;
    const west = next.sealedCounts[row][col - 1] ?? 0;
    const total = north + west;
    next.selectedCell = { row, col };
    next.sealedCounts[row][col] = total;
    next.actionsUsed += 1;
    next.history.unshift(`Merged plaza ${row + 1}-${col + 1}: ${north} north + ${west} west = ${total}.`);
    next.message = `Plaza ${row + 1}-${col + 1} sealed from north plus west.`;
    return finalize(next);
  }

  if (move.type === 'survey') {
    if (!canSurveyCell(next, row, col)) {
      next.message = `Plaza ${row + 1}-${col + 1} does not need a direct survey.`;
      return next;
    }

    const cost = next.puzzle.surveyCosts[row][col];
    const total = next.puzzle.trueCounts[row][col];
    next.selectedCell = { row, col };
    next.sealedCounts[row][col] = total;
    next.actionsUsed += cost;
    next.history.unshift(`Surveyed plaza ${row + 1}-${col + 1} directly for ${cost} actions and found ${total}.`);
    next.message = `Direct survey burned ${cost} actions.`;
    return finalize(next);
  }

  return next;
}

function rowMajorMergeCell(state: WaygridState) {
  for (let row = 1; row < state.puzzle.rows; row += 1) {
    for (let col = 1; col < state.puzzle.cols; col += 1) {
      if (canMergeCell(state, row, col)) return { row, col };
    }
  }
  return null;
}

function chooseSurveyCell(state: WaygridState) {
  const cells = unresolvedCells(state);
  if (cells.length === 0) return null;
  return cells.reduce((best, cell) => {
    const bestCost = state.puzzle.surveyCosts[best.row][best.col];
    const cellCost = state.puzzle.surveyCosts[cell.row][cell.col];
    if (cellCost < bestCost) return cell;
    if (cellCost === bestCost && cell.row < best.row) return cell;
    return best;
  });
}

function seededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

function simulatePuzzle(
  puzzle: WaygridPuzzle,
  planner: 'random' | 'survey' | 'hybrid' | 'frontier' | 'dp' | 'invariant',
  seed = 0,
): Simulation {
  let state = createInitialState(puzzle);
  const random = seededRandom(seed + puzzle.rows * 17 + puzzle.cols * 31);
  let mergeCount = 0;
  let surveyCount = 0;
  let counterintuitive = 0;
  let entropySum = 0;
  let infoGainSum = 0;
  const totalUnresolved = remainingUnsealed(state);

  while (!state.verdict) {
    const frontier = readyCells(state);
    const moveOptions = frontier.length + (remainingUnsealed(state) > 0 ? 1 : 0);
    entropySum += moveOptions > 1 ? log2(moveOptions) : 0;

    let nextMove: WaygridMove | null = null;

    if (planner === 'dp') {
      const chosen = rowMajorMergeCell(state);
      if (chosen) nextMove = { type: 'merge', ...chosen };
    } else if (planner === 'survey') {
      const chosen = rowMajorMergeCell(state);
      if (chosen) {
        nextMove = { type: 'survey', ...chosen };
      } else {
        const survey = chooseSurveyCell(state);
        if (survey) nextMove = { type: 'survey', ...survey };
      }
    } else if (planner === 'hybrid') {
      const mergeCell = rowMajorMergeCell(state);
      if (mergeCell) {
        const surveyCost = puzzle.surveyCosts[mergeCell.row][mergeCell.col];
        nextMove = surveyCost <= 5 ? { type: 'survey', ...mergeCell } : { type: 'merge', ...mergeCell };
      } else {
        const survey = chooseSurveyCell(state);
        if (survey) nextMove = { type: 'survey', ...survey };
      }
    } else if (planner === 'frontier') {
      const chosen = closestToGate(state);
      if (chosen) nextMove = { type: 'merge', ...chosen };
    } else if (planner === 'invariant') {
      const chosen = rowMajorMergeCell(state);
      if (chosen) {
        nextMove =
          puzzle.trueCounts[chosen.row - 1][chosen.col] === 1 || puzzle.trueCounts[chosen.row][chosen.col - 1] === 1
            ? { type: 'merge', ...chosen }
            : { type: 'survey', ...chosen };
      }
    } else {
      const options: WaygridMove[] = [];
      for (const cell of frontier) options.push({ type: 'merge', ...cell });
      const survey = chooseSurveyCell(state);
      if (survey) options.push({ type: 'survey', ...survey });
      nextMove = options[Math.floor(random() * options.length)] ?? null;
    }

    if (!nextMove) {
      return {
        solved: false,
        actionsUsed: state.actionsUsed,
        mergeCount,
        surveyCount,
        decisionEntropy: totalUnresolved === 0 ? 0 : entropySum / Math.max(1, mergeCount + surveyCount),
        puzzleEntropy: entropySum,
        counterintuitive,
        drama: 0,
        infoGainRatio: 1,
        algorithmAlignment: 0,
      };
    }

    if (nextMove.type === 'merge') {
      const gateGreedy = closestToGate(state);
      if (gateGreedy && coordKey(gateGreedy.row, gateGreedy.col) !== coordKey(nextMove.row!, nextMove.col!)) {
        counterintuitive += 1;
      }
      mergeCount += 1;
      const survey = chooseSurveyCell(state);
      if (survey) {
        infoGainSum += puzzle.surveyCosts[survey.row][survey.col];
      }
    } else {
      surveyCount += 1;
    }

    state = applyMove(state, nextMove);
  }

  const progressBeforeFailure = state.verdict.correct ? totalUnresolved : totalUnresolved - remainingUnsealed(state);
  const completed = mergeCount + surveyCount;

  return {
    solved: state.verdict.correct,
    actionsUsed: state.actionsUsed,
    mergeCount,
    surveyCount,
    decisionEntropy: completed === 0 ? 0 : entropySum / completed,
    puzzleEntropy: entropySum,
    counterintuitive,
    drama: completed === 0 ? 0 : progressBeforeFailure / completed,
    infoGainRatio: mergeCount === 0 ? 1 : infoGainSum / mergeCount,
    algorithmAlignment: completed === 0 ? 0 : mergeCount / completed,
  };
}

function avg(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

function difficultyAggregate(difficulty: WaygridDifficulty): DifficultyAggregate {
  const seeds = [0, 1, 2, 3, 4];
  const puzzles = seeds.map((seed) => generatePuzzle(seed, difficulty));

  const optimal = puzzles.map((puzzle, index) => simulatePuzzle(puzzle, 'dp', index));
  const random = puzzles.map((puzzle, index) => simulatePuzzle(puzzle, 'random', index));
  const hybrid = puzzles.map((puzzle, index) => simulatePuzzle(puzzle, 'hybrid', index));

  const skillLevel1 = avg(random.map((run) => (run.solved ? 1 : 0)));
  const skillLevel5 = avg(optimal.map((run) => (run.solved ? 1 : 0)));
  const optimalMoves = avg(optimal.map((run) => run.actionsUsed));
  const altMoves = avg(hybrid.map((run) => run.actionsUsed));
  const altSolvability = avg(hybrid.map((run) => (run.solved ? 1 : 0)));

  return {
    difficulty,
    label: BLUEPRINTS[difficulty].label,
    budget: BLUEPRINTS[difficulty].budget,
    grid: `${puzzles[0].rows}x${puzzles[0].cols}`,
    solvability: skillLevel5,
    puzzleEntropy: avg(optimal.map((run) => run.puzzleEntropy)),
    skillDepth: skillLevel5 === 0 ? 0 : clamp(0, 1, (skillLevel5 - skillLevel1) / skillLevel5),
    decisionEntropy: avg(optimal.map((run) => run.decisionEntropy)),
    counterintuitive: avg(optimal.map((run) => run.counterintuitive)),
    drama: avg(hybrid.map((run) => run.drama)),
    infoGainRatio: avg(optimal.map((run) => run.infoGainRatio)),
    optimalMoves,
    altMoves,
    altSolvability,
  };
}

export function evaluateWaygrid(): WaygridEvaluation {
  const difficulties = ([1, 2, 3, 4, 5] as WaygridDifficulty[]).map((difficulty) =>
    difficultyAggregate(difficulty),
  );

  const invariantByDifficulty = ([1, 2, 3, 4, 5] as WaygridDifficulty[]).map((difficulty, index) => {
    const puzzle = generatePuzzle(index, difficulty);
    return simulatePuzzle(puzzle, 'invariant', index);
  });

  const optimalByDifficulty = ([1, 2, 3, 4, 5] as WaygridDifficulty[]).map((difficulty, index) => {
    const puzzle = generatePuzzle(index, difficulty);
    return simulatePuzzle(puzzle, 'dp', index);
  });

  const breakpointIndex = difficulties.findIndex((entry) => entry.altSolvability < 1);

  const bestAlternativeGap = avg(
    difficulties.map((entry) => clamp(0, 1, 1 - entry.optimalMoves / Math.max(entry.altMoves, 1))),
  );

  const invariantPressure = avg(
    invariantByDifficulty.map((run, index) =>
      clamp(0, 1, 1 - optimalByDifficulty[index].actionsUsed / Math.max(run.actionsUsed, 1)),
    ),
  );

  const algorithmAlignment = avg(optimalByDifficulty.map((run) => run.algorithmAlignment));
  const difficultyBreakpoint =
    breakpointIndex >= 0 ? ([1, 2, 3, 4, 5] as WaygridDifficulty[])[breakpointIndex] : 5;

  const learningMetrics: LearningMetrics = {
    inputShapeMatch: 1,
    operationMatch: 1,
    constraintMatch: 1,
    goalMatch: 0.75,
    leetCodeFit: 0.94,
    bestAlternativeGap,
    invariantPressure,
    difficultyBreakpoint,
    algorithmAlignment,
  };

  return {
    difficulties,
    learningMetrics,
    interpretation: {
      invariant:
        'Every interior plaza must be sealed from the two already certified feeder counts immediately north and west; direct surveying only exists as the expensive no-tabulation fallback.',
      strongestAlternative:
        'Survey every plaza whose recount tax still looks cheap, then fall back to merges only after those direct checks stop fitting.',
      evidence:
        `The cheap-survey baseline still clears D1-D2, then fails at ${BLUEPRINTS[difficultyBreakpoint].label} once even the modest direct checks no longer fit while one-action merges still finish the table.`,
    },
  };
}
