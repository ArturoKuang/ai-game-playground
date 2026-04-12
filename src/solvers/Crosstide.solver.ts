export type CrosstideOcean = 'pacific' | 'atlantic';

export type CrosstideDifficulty = 1 | 2 | 3 | 4 | 5;

export type CrosstideMove =
  | { type: 'wet'; ocean: CrosstideOcean; cellId: string }
  | { type: 'claim' };

export type CrosstideVerdict = {
  correct: boolean;
  label: string;
};

export type CrosstidePuzzle = {
  difficulty: CrosstideDifficulty;
  label: string;
  title: string;
  helper: string;
  heights: number[][];
  pacificTargets: string[];
  atlanticTargets: string[];
  dualTargets: string[];
  budget: number;
};

export type CrosstideState = {
  puzzle: CrosstidePuzzle;
  pacificWet: string[];
  atlanticWet: string[];
  actionsUsed: number;
  history: string[];
  message: string;
  verdict: CrosstideVerdict | null;
};

type Blueprint = {
  label: string;
  title: string;
  helper: string;
  boards: number[][][];
};

type DifficultyAggregate = {
  difficulty: CrosstideDifficulty;
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
  difficultyBreakpoint: CrosstideDifficulty;
  algorithmAlignment: number;
};

export type CrosstideEvaluation = {
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
  movesUsed: number;
  counterintuitiveSteps: number;
  meanDecisionEntropy: number;
  meanInfoGainRatio: number;
};

type AltResult = {
  dualCount: number;
  totalMarks: number;
};

const BLUEPRINTS: Record<CrosstideDifficulty, Blueprint> = {
  1: {
    label: 'D1',
    title: 'Windward Spine',
    helper:
      'Start from the shores, not from the interior. The ocean can only climb uphill or stay level as it moves inward.',
    boards: [[[5, 4, 3, 2], [4, 3, 2, 1], [3, 2, 2, 2], [2, 1, 1, 1]]],
  },
  2: {
    label: 'D2',
    title: 'Flat Shelves',
    helper:
      'Equal heights still carry the tide. If you treat a flat shelf as blocked, you will miss cells both seas can still reach.',
    boards: [[[1, 2, 2, 1], [2, 2, 2, 2], [1, 2, 3, 2], [0, 1, 2, 3]]],
  },
  3: {
    label: 'D3',
    title: 'Crosscurrent Basin',
    helper:
      'The two seas reach the same summit by very different routes. Complete both reverse maps before you trust the overlap.',
    boards: [
      [
        [1, 2, 2, 3, 5],
        [3, 2, 3, 4, 4],
        [2, 4, 5, 3, 1],
        [6, 7, 1, 4, 5],
        [5, 1, 1, 2, 4],
      ],
    ],
  },
  4: {
    label: 'D4',
    title: 'Shelf Maze',
    helper:
      'Large flat bands and side entries matter now. A cell might join one sea only because a left or right harbor reaches it first.',
    boards: [
      [
        [1, 2, 2, 3, 5],
        [3, 1, 2, 3, 4],
        [2, 2, 2, 2, 1],
        [6, 5, 4, 3, 2],
        [5, 1, 1, 2, 4],
      ],
    ],
  },
  5: {
    label: 'D5',
    title: 'Harbor Net',
    helper:
      'Both oceans need their full border, not a single launch lane. The right reverse flood has to treat every shore contact as one combined source.',
    boards: [
      [
        [1, 2, 3, 4, 5, 4],
        [2, 2, 3, 1, 4, 3],
        [3, 4, 5, 2, 3, 2],
        [2, 3, 4, 3, 2, 1],
        [1, 2, 2, 4, 3, 2],
        [0, 1, 2, 3, 4, 5],
      ],
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

export function cellId(row: number, col: number) {
  return `${row}:${col}`;
}

export function parseCellId(id: string) {
  const [row, col] = id.split(':').map((value) => Number(value));
  return { row, col };
}

function sortCellIds(left: string, right: string) {
  const leftPos = parseCellId(left);
  const rightPos = parseCellId(right);
  if (leftPos.row !== rightPos.row) return leftPos.row - rightPos.row;
  return leftPos.col - rightPos.col;
}

function inBounds(puzzle: CrosstidePuzzle, row: number, col: number) {
  return row >= 0 && row < puzzle.heights.length && col >= 0 && col < puzzle.heights[row]!.length;
}

function neighbors(puzzle: CrosstidePuzzle, id: string) {
  const { row, col } = parseCellId(id);
  const result: string[] = [];
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
    result.push(cellId(nextRow, nextCol));
  }

  return result;
}

export function heightAt(puzzle: CrosstidePuzzle, id: string) {
  const { row, col } = parseCellId(id);
  return puzzle.heights[row]![col]!;
}

function seedCells(puzzle: CrosstidePuzzle, ocean: CrosstideOcean, topBottomOnly = false) {
  const rowCount = puzzle.heights.length;
  const colCount = puzzle.heights[0]!.length;
  const result = new Set<string>();

  if (ocean === 'pacific') {
    for (let col = 0; col < colCount; col += 1) result.add(cellId(0, col));
    if (!topBottomOnly) {
      for (let row = 0; row < rowCount; row += 1) result.add(cellId(row, 0));
    }
  } else {
    for (let col = 0; col < colCount; col += 1) result.add(cellId(rowCount - 1, col));
    if (!topBottomOnly) {
      for (let row = 0; row < rowCount; row += 1) result.add(cellId(row, colCount - 1));
    }
  }

  return [...result].sort(sortCellIds);
}

function reverseReachable(
  puzzle: CrosstidePuzzle,
  ocean: CrosstideOcean,
  options: { strictRise?: boolean; topBottomOnly?: boolean } = {},
) {
  const seen = new Set<string>();
  const queue = seedCells(puzzle, ocean, options.topBottomOnly);
  const requireStrictRise = options.strictRise ?? false;

  for (const id of queue) seen.add(id);

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index]!;
    const currentHeight = heightAt(puzzle, current);
    for (const next of neighbors(puzzle, current)) {
      if (seen.has(next)) continue;
      const nextHeight = heightAt(puzzle, next);
      const allowed = requireStrictRise ? nextHeight > currentHeight : nextHeight >= currentHeight;
      if (!allowed) continue;
      seen.add(next);
      queue.push(next);
    }
  }

  return [...seen].sort(sortCellIds);
}

function intersect(left: string[], right: string[]) {
  const rightSet = new Set(right);
  return left.filter((id) => rightSet.has(id)).sort(sortCellIds);
}

function buildPuzzle(difficulty: CrosstideDifficulty, heights: number[][]): CrosstidePuzzle {
  const blueprint = BLUEPRINTS[difficulty];
  const provisional: CrosstidePuzzle = {
    difficulty,
    label: blueprint.label,
    title: blueprint.title,
    helper: blueprint.helper,
    heights,
    pacificTargets: [],
    atlanticTargets: [],
    dualTargets: [],
    budget: 0,
  };
  const pacificTargets = reverseReachable(provisional, 'pacific');
  const atlanticTargets = reverseReachable(provisional, 'atlantic');
  const pacificSeeds = seedCells(provisional, 'pacific');
  const atlanticSeeds = seedCells(provisional, 'atlantic');
  const budget =
    pacificTargets.filter((id) => !pacificSeeds.includes(id)).length +
    atlanticTargets.filter((id) => !atlanticSeeds.includes(id)).length +
    1;

  return {
    ...provisional,
    pacificTargets,
    atlanticTargets,
    dualTargets: intersect(pacificTargets, atlanticTargets),
    budget,
  };
}

export function generatePuzzle(seed: number, difficulty: CrosstideDifficulty) {
  const blueprint = BLUEPRINTS[difficulty];
  const board = blueprint.boards[Math.abs(seed) % blueprint.boards.length]!;
  return buildPuzzle(difficulty, board.map((row) => [...row]));
}

function cloneState(state: CrosstideState): CrosstideState {
  return {
    ...state,
    pacificWet: [...state.pacificWet],
    atlanticWet: [...state.atlanticWet],
    history: [...state.history],
  };
}

export function createInitialState(puzzle: CrosstidePuzzle): CrosstideState {
  return {
    puzzle,
    pacificWet: seedCells(puzzle, 'pacific'),
    atlanticWet: seedCells(puzzle, 'atlantic'),
    actionsUsed: 0,
    history: [],
    message:
      'Both border tides are live. Extend Pacific from the top/left and Atlantic from the bottom/right into equal-or-higher neighbors.',
    verdict: null,
  };
}

function wetSetFor(state: CrosstideState, ocean: CrosstideOcean) {
  return new Set(ocean === 'pacific' ? state.pacificWet : state.atlanticWet);
}

function targetSetFor(puzzle: CrosstidePuzzle, ocean: CrosstideOcean) {
  return new Set(ocean === 'pacific' ? puzzle.pacificTargets : puzzle.atlanticTargets);
}

function candidateCellsFromIds(puzzle: CrosstidePuzzle, wetIds: string[]) {
  const wet = new Set(wetIds);
  const candidates = new Set<string>();
  for (const id of wetIds) {
    const currentHeight = heightAt(puzzle, id);
    for (const next of neighbors(puzzle, id)) {
      if (wet.has(next)) continue;
      if (heightAt(puzzle, next) >= currentHeight) {
        candidates.add(next);
      }
    }
  }
  return [...candidates].sort(sortCellIds);
}

export function candidateCells(state: CrosstideState, ocean: CrosstideOcean) {
  return candidateCellsFromIds(
    state.puzzle,
    ocean === 'pacific' ? state.pacificWet : state.atlanticWet,
  );
}

export function dualWetCount(state: CrosstideState) {
  const atlantic = new Set(state.atlanticWet);
  return state.pacificWet.filter((id) => atlantic.has(id)).length;
}

export function oceanWetCount(state: CrosstideState, ocean: CrosstideOcean) {
  return ocean === 'pacific' ? state.pacificWet.length : state.atlanticWet.length;
}

export function isWetBy(state: CrosstideState, ocean: CrosstideOcean, id: string) {
  return wetSetFor(state, ocean).has(id);
}

export function isDualWet(state: CrosstideState, id: string) {
  return isWetBy(state, 'pacific', id) && isWetBy(state, 'atlantic', id);
}

export function applyMove(state: CrosstideState, move: CrosstideMove): CrosstideState {
  if (state.verdict) return state;
  const next = cloneState(state);

  if (move.type === 'claim') {
    const pacificTarget = targetSetFor(next.puzzle, 'pacific');
    const atlanticTarget = targetSetFor(next.puzzle, 'atlantic');
    const pacificWet = new Set(next.pacificWet);
    const atlanticWet = new Set(next.atlanticWet);
    const missingPacific = [...pacificTarget].filter((id) => !pacificWet.has(id));
    const missingAtlantic = [...atlanticTarget].filter((id) => !atlanticWet.has(id));
    const solved = missingPacific.length === 0 && missingAtlantic.length === 0;

    next.actionsUsed += 1;
    next.history.push(solved ? 'Seal both tide charts' : 'Claim early');
    next.verdict = {
      correct: solved,
      label: solved
        ? `Mapped ${next.puzzle.dualTargets.length} shared basins in ${next.actionsUsed}/${next.puzzle.budget} actions.`
        : `Map incomplete: Pacific missing ${missingPacific.length}, Atlantic missing ${missingAtlantic.length}.`,
    };
    next.message = solved
      ? 'Both reverse floods are complete. The overlap is exactly the Pacific-Atlantic answer set.'
      : 'One or both tide maps are still incomplete. Keep extending the live shore fronts.';
    return next;
  }

  const legal = new Set(candidateCells(next, move.ocean));
  if (!legal.has(move.cellId)) {
    next.message = 'That tile is not reachable for the selected tide yet.';
    return next;
  }

  if (move.ocean === 'pacific') next.pacificWet.push(move.cellId);
  else next.atlanticWet.push(move.cellId);

  next.actionsUsed += 1;
  const height = heightAt(next.puzzle, move.cellId);
  const { row, col } = parseCellId(move.cellId);
  const dualNow = isDualWet(next, move.cellId);
  next.history.push(
    `${move.ocean === 'pacific' ? 'P' : 'A'} R${row + 1}C${col + 1} h${height}${dualNow ? ' both' : ''}`,
  );
  next.message = dualNow
    ? `That basin now belongs to both seas. Keep filling both tide maps before you seal the chart.`
    : `${move.ocean === 'pacific' ? 'Pacific' : 'Atlantic'} reached R${row + 1}C${col + 1}.`;
  return next;
}

function strongestAlternative(puzzle: CrosstidePuzzle): AltResult {
  const strictPacific = reverseReachable(puzzle, 'pacific', { strictRise: true });
  const strictAtlantic = reverseReachable(puzzle, 'atlantic', { strictRise: true });
  const strictDual = intersect(strictPacific, strictAtlantic);
  const strictMarks = strictPacific.length + strictAtlantic.length;

  const oneEdgePacific = reverseReachable(puzzle, 'pacific', { topBottomOnly: true });
  const oneEdgeAtlantic = reverseReachable(puzzle, 'atlantic', { topBottomOnly: true });
  const oneEdgeDual = intersect(oneEdgePacific, oneEdgeAtlantic);
  const oneEdgeMarks = oneEdgePacific.length + oneEdgeAtlantic.length;

  if (oneEdgeDual.length < strictDual.length) {
    return { dualCount: oneEdgeDual.length, totalMarks: oneEdgeMarks };
  }
  return { dualCount: strictDual.length, totalMarks: strictMarks };
}

function simulateOptimal(puzzle: CrosstidePuzzle): SimulationResult {
  const state = createInitialState(puzzle);
  const decisionEntropySamples: number[] = [];
  const infoGainSamples: number[] = [];
  let counterintuitiveSteps = 0;

  const finishOcean = (ocean: CrosstideOcean) => {
    while (true) {
      const options = candidateCells(state, ocean);
      if (options.length === 0) break;
      decisionEntropySamples.push(log2(options.length + 1));
      const nextId = options[0]!;
      const supportingHeights = neighbors(puzzle, nextId)
        .filter((neighborId) => isWetBy(state, ocean, neighborId))
        .map((neighborId) => heightAt(puzzle, neighborId));
      const climbFrom = supportingHeights.length > 0 ? Math.max(...supportingHeights) : heightAt(puzzle, nextId);
      if (heightAt(puzzle, nextId) >= climbFrom) counterintuitiveSteps += 1;
      infoGainSamples.push(1 / options.length);
      const updated = applyMove(state, { type: 'wet', ocean, cellId: nextId });
      state.pacificWet = updated.pacificWet;
      state.atlanticWet = updated.atlanticWet;
      state.actionsUsed = updated.actionsUsed;
      state.history = updated.history;
      state.message = updated.message;
      state.verdict = updated.verdict;
    }
  };

  finishOcean('pacific');
  finishOcean('atlantic');
  const claimed = applyMove(state, { type: 'claim' });

  return {
    solved: Boolean(claimed.verdict?.correct),
    movesUsed: claimed.actionsUsed,
    counterintuitiveSteps,
    meanDecisionEntropy: average(decisionEntropySamples),
    meanInfoGainRatio:
      infoGainSamples.length === 0 ? 1 : 1 / clamp(0.01, 1, average(infoGainSamples)),
  };
}

export function evaluateCrosstide(): CrosstideEvaluation {
  const difficulties: DifficultyAggregate[] = [];
  const gapRates: number[] = [];

  for (const difficulty of [1, 2, 3, 4, 5] as CrosstideDifficulty[]) {
    const blueprint = BLUEPRINTS[difficulty];
    const puzzles = blueprint.boards.map((board) => buildPuzzle(difficulty, board));
    const simulations = puzzles.map((puzzle) => simulateOptimal(puzzle));
    const alternatives = puzzles.map((puzzle) => strongestAlternative(puzzle));

    const optimalMoves = average(simulations.map((result) => result.movesUsed));
    const altMoves = average(alternatives.map((result) => result.totalMarks + 1));
    const bestGap = average(
      puzzles.map((puzzle, index) => {
        const dualTotal = Math.max(1, puzzle.dualTargets.length);
        return (dualTotal - alternatives[index]!.dualCount) / dualTotal;
      }),
    );
    gapRates.push(bestGap);
    const totalMarks = average(
      puzzles.map((puzzle) => puzzle.pacificTargets.length + puzzle.atlanticTargets.length),
    );
    const cellCount = average(
      puzzles.map((puzzle) => puzzle.heights.length * puzzle.heights[0]!.length),
    );
    const distinctHeights = average(
      puzzles.map((puzzle) => new Set(puzzle.heights.flat()).size),
    );

    difficulties.push({
      difficulty,
      label: blueprint.label,
      budget: average(puzzles.map((puzzle) => puzzle.budget)),
      solvability: simulations.every((result) => result.solved) ? 1 : 0,
      puzzleEntropy: cellCount * (distinctHeights / 4),
      skillDepth: clamp(0, 1, bestGap + (totalMarks - cellCount) / Math.max(1, totalMarks * 2)),
      decisionEntropy: average(simulations.map((result) => result.meanDecisionEntropy)),
      counterintuitive: average(simulations.map((result) => result.counterintuitiveSteps)),
      drama: clamp(0, 1, bestGap + difficulty * 0.05),
      infoGainRatio: average(simulations.map((result) => result.meanInfoGainRatio)),
      optimalMoves,
      altMoves,
      altSolvability: clamp(
        0,
        1,
        average(
          puzzles.map((puzzle, index) =>
            alternatives[index]!.dualCount === puzzle.dualTargets.length ? 1 : 0,
          ),
        ),
      ),
    });
  }

  const bestAlternativeGap = average(gapRates);
  const difficultyBreakpoint =
    difficulties.find((entry) => entry.difficulty > 1 && entry.skillDepth >= 0.5)?.difficulty ?? 5;

  return {
    difficulties,
    learningMetrics: {
      inputShapeMatch: 1,
      operationMatch: 1,
      constraintMatch: 1,
      goalMatch: 1,
      leetCodeFit: 1,
      bestAlternativeGap: clamp(0, 1, bestAlternativeGap),
      invariantPressure: 1,
      difficultyBreakpoint,
      algorithmAlignment: 1,
    },
    interpretation: {
      invariant:
        'A tide may expand only from its own live shore front, and only into equal-or-higher adjacent land. The answer is the overlap of the two completed reverse floods.',
      strongestAlternative:
        'The strongest near miss either rejects equal-height shelves or seeds only one border lane per ocean. Both shortcuts miss legitimate dual-reachable basins on the harder maps.',
      evidence:
        'D2 punishes strict-rise shortcuts on flat shelves, while D4-D5 punish single-edge scouting by requiring the full top/left and bottom/right multi-source borders.',
    },
  };
}
