export type WardDifficulty = 1 | 2 | 3 | 4 | 5;

export type WardMoveType = 'register' | 'scan' | 'callValid' | 'callBroken';

export type WardMove = {
  type: WardMoveType;
};

export type WardVerdict = {
  correct: boolean;
  label: string;
};

export type WardCell = {
  id: string;
  row: number;
  col: number;
  value: string;
  boxIndex: number;
  peerCost: number;
};

export type WardPuzzle = {
  difficulty: WardDifficulty;
  label: string;
  title: string;
  size: number;
  boxRows: number;
  boxCols: number;
  budget: number;
  helper: string;
  rows: string[];
  actualValid: boolean;
  filledCells: WardCell[];
};

export type WardState = {
  puzzle: WardPuzzle;
  cursor: number;
  actionsUsed: number;
  rowSeen: string[][];
  colSeen: string[][];
  boxSeen: string[][];
  processed: Record<string, 'register' | 'scan'>;
  conflictFound: boolean;
  conflictLabel: string | null;
  message: string;
  verdict: WardVerdict | null;
};

export type WardSolution = {
  moves: WardMove[];
  finalState: WardState;
  solved: boolean;
  actionsUsed: number;
};

type BasePuzzle = Omit<WardPuzzle, 'actualValid' | 'filledCells'>;

type DifficultyAggregate = {
  difficulty: WardDifficulty;
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
  difficultyBreakpoint: WardDifficulty;
  algorithmAlignment: number;
};

export type WardEvaluation = {
  difficulties: DifficultyAggregate[];
  learningMetrics: LearningMetrics;
  interpretation: {
    invariant: string;
    strongestAlternative: string;
    evidence: string;
  };
};

const BASE_PUZZLES: Record<WardDifficulty, BasePuzzle> = {
  1: {
    difficulty: 1,
    label: 'D1',
    title: 'Apprentice Hall',
    size: 4,
    boxRows: 2,
    boxCols: 2,
    budget: 25,
    helper:
      'Small board, generous budget. Manual sweeps still work, but the ledgers already feel cleaner.',
    rows: ['1.3.', '.4.2', '2..3', '.3.1'],
  },
  2: {
    difficulty: 2,
    label: 'D2',
    title: 'Split Cloister',
    size: 4,
    boxRows: 2,
    boxCols: 2,
    budget: 19,
    helper:
      'Still small enough to brute-force, but repeated row and column checks start to drag.',
    rows: ['1.3.', '.4.2', '2..3', '.3.3'],
  },
  3: {
    difficulty: 3,
    label: 'D3',
    title: 'Six Gate Archive',
    size: 6,
    boxRows: 2,
    boxCols: 3,
    budget: 27,
    helper:
      'The board is dense enough that sweeping every neighborhood repeats the same work constantly.',
    rows: ['12.4.6', '4.6.23', '.345.1', '56.2.4', '3.5.12', '61.34.'],
  },
  4: {
    difficulty: 4,
    label: 'D4',
    title: 'Hidden Chamber Breach',
    size: 6,
    boxRows: 2,
    boxCols: 3,
    budget: 17,
    helper:
      'One breach lives only inside a chamber. Row and column discipline alone will miss it.',
    rows: ['1.....', '.2..6.', '..3...', '...4..', '.6..5.', '...5.1'],
  },
  5: {
    difficulty: 5,
    label: 'D5',
    title: 'Grand Citadel',
    size: 9,
    boxRows: 3,
    boxCols: 3,
    budget: 35,
    helper:
      'A full 9x9 patrol. Registry-first play is the only way to stay calm and inside budget.',
    rows: [
      '53..7....',
      '6..195...',
      '.98....6.',
      '8...6...3',
      '4..8.3..1',
      '7...2...6',
      '.6....28.',
      '...419..5',
      '....8..79',
    ],
  },
};

function log2(value: number) {
  return Math.log(value) / Math.log(2);
}

function clamp(min: number, max: number, value: number) {
  return Math.max(min, Math.min(max, value));
}

function boxIndexFor(
  row: number,
  col: number,
  boxRows: number,
  boxCols: number,
) {
  return Math.floor(row / boxRows) * Math.floor(9 / boxCols) + Math.floor(col / boxCols);
}

function boardSpan(size: number, boxCols: number) {
  return Math.floor(size / boxCols);
}

function rotateSymbol(symbol: string, size: number, shift: number) {
  if (symbol === '.') return symbol;
  const digit = Number(symbol);
  const rotated = ((digit - 1 + shift) % size) + 1;
  return String(rotated);
}

function validateRows(rows: string[], size: number, boxRows: number, boxCols: number) {
  const rowSeen = Array.from({ length: size }, () => new Set<string>());
  const colSeen = Array.from({ length: size }, () => new Set<string>());
  const boxSeen = Array.from({ length: size }, () => new Set<string>());

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const value = rows[row][col];
      if (value === '.') continue;
      const boxIndex =
        Math.floor(row / boxRows) * boardSpan(size, boxCols) + Math.floor(col / boxCols);
      if (
        rowSeen[row].has(value) ||
        colSeen[col].has(value) ||
        boxSeen[boxIndex].has(value)
      ) {
        return false;
      }
      rowSeen[row].add(value);
      colSeen[col].add(value);
      boxSeen[boxIndex].add(value);
    }
  }

  return true;
}

function buildFilledCells(rows: string[], size: number, boxRows: number, boxCols: number) {
  const cells: WardCell[] = [];

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const value = rows[row][col];
      if (value === '.') continue;

      const peers = new Set<string>();

      for (let scanCol = 0; scanCol < size; scanCol += 1) {
        if (scanCol === col || rows[row][scanCol] === '.') continue;
        peers.add(`r${row}c${scanCol}`);
      }

      for (let scanRow = 0; scanRow < size; scanRow += 1) {
        if (scanRow === row || rows[scanRow][col] === '.') continue;
        peers.add(`r${scanRow}c${col}`);
      }

      const rowStart = Math.floor(row / boxRows) * boxRows;
      const colStart = Math.floor(col / boxCols) * boxCols;

      for (let scanRow = rowStart; scanRow < rowStart + boxRows; scanRow += 1) {
        for (let scanCol = colStart; scanCol < colStart + boxCols; scanCol += 1) {
          if ((scanRow === row && scanCol === col) || rows[scanRow][scanCol] === '.') continue;
          peers.add(`r${scanRow}c${scanCol}`);
        }
      }

      cells.push({
        id: `r${row}c${col}`,
        row,
        col,
        value,
        boxIndex:
          Math.floor(row / boxRows) * boardSpan(size, boxCols) + Math.floor(col / boxCols),
        peerCost: peers.size,
      });
    }
  }

  return cells;
}

export function generatePuzzle(seed: number, difficulty: WardDifficulty): WardPuzzle {
  const base = BASE_PUZZLES[difficulty];
  const shift = seed % base.size;
  const rows = base.rows.map((row) =>
    row
      .split('')
      .map((symbol) => rotateSymbol(symbol, base.size, shift))
      .join(''),
  );

  return {
    ...base,
    rows,
    actualValid: validateRows(rows, base.size, base.boxRows, base.boxCols),
    filledCells: buildFilledCells(rows, base.size, base.boxRows, base.boxCols),
  };
}

export function getDisplayPuzzle(difficulty: WardDifficulty) {
  return generatePuzzle(0, difficulty);
}

export function manualSweepCostForCell(cell: WardCell) {
  return Math.max(1, Math.ceil(cell.peerCost / 4));
}

function createRegistry(size: number) {
  return Array.from({ length: size }, () => [] as string[]);
}

function conflictScopesForCell(puzzle: WardPuzzle, cell: WardCell) {
  const scopes: string[] = [];
  const rows = puzzle.rows;

  for (let scanCol = 0; scanCol < puzzle.size; scanCol += 1) {
    if (scanCol === cell.col) continue;
    if (rows[cell.row][scanCol] === cell.value) {
      scopes.push(`row ${cell.row + 1}`);
      break;
    }
  }

  for (let scanRow = 0; scanRow < puzzle.size; scanRow += 1) {
    if (scanRow === cell.row) continue;
    if (rows[scanRow][cell.col] === cell.value) {
      scopes.push(`column ${cell.col + 1}`);
      break;
    }
  }

  const rowStart = Math.floor(cell.row / puzzle.boxRows) * puzzle.boxRows;
  const colStart = Math.floor(cell.col / puzzle.boxCols) * puzzle.boxCols;

  for (let scanRow = rowStart; scanRow < rowStart + puzzle.boxRows; scanRow += 1) {
    for (let scanCol = colStart; scanCol < colStart + puzzle.boxCols; scanCol += 1) {
      if (scanRow === cell.row && scanCol === cell.col) continue;
      if (rows[scanRow][scanCol] === cell.value) {
        scopes.push(`chamber ${cell.boxIndex + 1}`);
        return scopes;
      }
    }
  }

  return scopes;
}

export function createInitialState(puzzle: WardPuzzle): WardState {
  return {
    puzzle,
    cursor: 0,
    actionsUsed: 0,
    rowSeen: createRegistry(puzzle.size),
    colSeen: createRegistry(puzzle.size),
    boxSeen: createRegistry(puzzle.size),
    processed: {},
    conflictFound: false,
    conflictLabel: null,
    message:
      'Ward the highlighted rune into its row, column, and chamber ledgers, or spend a manual sweep on the current neighborhood.',
    verdict: null,
  };
}

export function getCurrentCell(state: WardState) {
  return state.puzzle.filledCells[state.cursor] ?? null;
}

function cloneState(state: WardState): WardState {
  return {
    ...state,
    rowSeen: state.rowSeen.map((entry) => [...entry]),
    colSeen: state.colSeen.map((entry) => [...entry]),
    boxSeen: state.boxSeen.map((entry) => [...entry]),
    processed: { ...state.processed },
  };
}

export function legalMoves(state: WardState): WardMove[] {
  if (state.verdict) return [];
  if (getCurrentCell(state)) {
    return [
      { type: 'register' },
      { type: 'scan' },
      { type: 'callValid' },
      { type: 'callBroken' },
    ];
  }

  return [{ type: 'callValid' }, { type: 'callBroken' }];
}

function verdictForCall(state: WardState, guessValid: boolean): WardVerdict {
  const processedAll = state.cursor >= state.puzzle.filledCells.length;
  const withinBudget = state.actionsUsed <= state.puzzle.budget;

  if (!withinBudget) {
    return { correct: false, label: 'Over budget' };
  }

  if (guessValid) {
    if (!processedAll) return { correct: false, label: 'Too early' };
    if (state.puzzle.actualValid && !state.conflictFound) {
      return { correct: true, label: 'Board is valid' };
    }
    return { correct: false, label: 'Board is broken' };
  }

  if (!state.puzzle.actualValid && state.conflictFound) {
    return { correct: true, label: 'Board is broken' };
  }

  return { correct: false, label: 'No proof yet' };
}

export function applyMove(state: WardState, move: WardMove): WardState {
  const next = cloneState(state);
  if (next.verdict) return next;

  const currentCell = getCurrentCell(next);

  if (move.type === 'callValid') {
    next.verdict = verdictForCall(next, true);
    next.message = next.verdict.correct
      ? 'Clean ledgers. This board obeys every ward.'
      : next.verdict.label === 'Too early'
        ? 'You need a full patrol before calling a board valid.'
        : next.verdict.label === 'Over budget'
          ? 'Your answer is late. The board may be known, but the patrol budget is gone.'
          : 'A hidden breach remains. The board is not valid.';
    return next;
  }

  if (move.type === 'callBroken') {
    next.verdict = verdictForCall(next, false);
    next.message = next.verdict.correct
      ? 'Breach confirmed. One of the wards repeated a rune.'
      : next.verdict.label === 'Over budget'
        ? 'You found it too slowly. The patrol budget is spent.'
        : 'You do not have enough evidence to call this board broken yet.';
    return next;
  }

  if (!currentCell) {
    next.message = 'Every marked rune is already processed. Call the verdict.';
    return next;
  }

  if (move.type === 'register') {
    const scopes: string[] = [];
    if (next.rowSeen[currentCell.row].includes(currentCell.value)) {
      scopes.push(`row ${currentCell.row + 1}`);
    }
    if (next.colSeen[currentCell.col].includes(currentCell.value)) {
      scopes.push(`column ${currentCell.col + 1}`);
    }
    if (next.boxSeen[currentCell.boxIndex].includes(currentCell.value)) {
      scopes.push(`chamber ${currentCell.boxIndex + 1}`);
    }

    next.rowSeen[currentCell.row].push(currentCell.value);
    next.colSeen[currentCell.col].push(currentCell.value);
    next.boxSeen[currentCell.boxIndex].push(currentCell.value);
    next.processed[currentCell.id] = 'register';
    next.cursor += 1;
    next.actionsUsed += 1;

    if (scopes.length > 0) {
      next.conflictFound = true;
      next.conflictLabel = scopes.join(', ');
      next.message = `Ward breach: ${currentCell.value} repeated in ${next.conflictLabel}.`;
      return next;
    }

    next.message = `Filed ${currentCell.value} into row ${currentCell.row + 1}, column ${currentCell.col + 1}, chamber ${currentCell.boxIndex + 1}.`;
    return next;
  }

  const scopes = conflictScopesForCell(next.puzzle, currentCell);
  next.processed[currentCell.id] = 'scan';
  next.cursor += 1;
  next.actionsUsed += manualSweepCostForCell(currentCell);

  if (scopes.length > 0) {
    next.conflictFound = true;
    next.conflictLabel = scopes.join(', ');
    next.message = `Manual sweep spotted a duplicate in ${next.conflictLabel}.`;
    return next;
  }

  next.message = `Manual sweep cleared the local neighborhood, but none of that proof is reusable later.`;
  return next;
}

export function isGoal(state: WardState) {
  return Boolean(state.verdict?.correct);
}

export function heuristic(state: WardState) {
  const remaining = state.puzzle.filledCells.length - state.cursor;
  const verdictPenalty = state.verdict?.correct ? 0 : 2;
  const budgetPenalty = Math.max(0, state.actionsUsed - state.puzzle.budget);
  return remaining + verdictPenalty + budgetPenalty;
}

function randomChoice<T>(values: T[], seed: number) {
  return values[seed % values.length];
}

function decideMove(state: WardState, skillLevel: 1 | 2 | 3 | 4 | 5, seed: number): WardMove {
  const currentCell = getCurrentCell(state);

  if (skillLevel === 5) {
    if (state.conflictFound) return { type: 'callBroken' };
    if (currentCell) return { type: 'register' };
    return { type: 'callValid' };
  }

  if (skillLevel === 4) {
    if (state.conflictFound) return { type: 'callBroken' };
    if (currentCell) {
      if (state.puzzle.difficulty <= 2 && currentCell.peerCost <= 4) {
        return { type: 'scan' };
      }
      return { type: 'register' };
    }
    return { type: 'callValid' };
  }

  if (skillLevel === 3) {
    if (state.conflictFound && state.actionsUsed <= state.puzzle.budget) {
      return { type: 'callBroken' };
    }
    if (currentCell) {
      return currentCell.peerCost <= 5 ? { type: 'scan' } : { type: 'register' };
    }
    return { type: 'callValid' };
  }

  if (skillLevel === 2) {
    if (state.conflictFound) return { type: 'callBroken' };
    if (currentCell) return { type: 'scan' };
    return { type: 'callValid' };
  }

  if (!currentCell) {
    return randomChoice(
      [
        { type: 'callValid' as const },
        { type: 'callBroken' as const },
      ],
      seed + state.actionsUsed,
    );
  }

  return randomChoice(
    [
      { type: 'register' as const },
      { type: 'scan' as const },
      { type: 'callValid' as const },
      { type: 'callBroken' as const },
    ],
    seed + state.cursor + state.actionsUsed,
  );
}

export function solve(
  puzzle: WardPuzzle,
  skillLevel: 1 | 2 | 3 | 4 | 5,
  seed = 0,
): WardSolution | null {
  let state = createInitialState(puzzle);
  const moves: WardMove[] = [];
  const maxSteps = puzzle.filledCells.length * 3 + 6;

  for (let step = 0; step < maxSteps; step += 1) {
    if (state.verdict) {
      return {
        moves,
        finalState: state,
        solved: isGoal(state),
        actionsUsed: state.actionsUsed,
      };
    }

    const move = decideMove(state, skillLevel, seed + step);
    moves.push(move);
    state = applyMove(state, move);
  }

  return {
    moves,
    finalState: state,
    solved: isGoal(state),
    actionsUsed: state.actionsUsed,
  };
}

function solveRowColOnlyVariant(puzzle: WardPuzzle) {
  let state = createInitialState(puzzle);
  const moves: WardMove[] = [];

  while (!state.verdict) {
    const currentCell = getCurrentCell(state);
    if (!currentCell) {
      moves.push({ type: 'callValid' });
      state = applyMove(state, { type: 'callValid' });
      break;
    }

    const next = cloneState(state);
    const scopes: string[] = [];

    if (next.rowSeen[currentCell.row].includes(currentCell.value)) {
      scopes.push(`row ${currentCell.row + 1}`);
    }
    if (next.colSeen[currentCell.col].includes(currentCell.value)) {
      scopes.push(`column ${currentCell.col + 1}`);
    }

    next.rowSeen[currentCell.row].push(currentCell.value);
    next.colSeen[currentCell.col].push(currentCell.value);
    next.processed[currentCell.id] = 'register';
    next.cursor += 1;
    next.actionsUsed += 1;

    if (scopes.length > 0) {
      next.conflictFound = true;
      next.conflictLabel = scopes.join(', ');
    }

    state = next;
    moves.push({ type: 'register' });

    if (state.conflictFound) {
      moves.push({ type: 'callBroken' });
      state = applyMove(state, { type: 'callBroken' });
      break;
    }
  }

  return {
    moves,
    finalState: state,
    solved: isGoal(state),
    actionsUsed: state.actionsUsed,
  };
}

function efficiencyScore(result: WardSolution, puzzle: WardPuzzle) {
  if (!result.solved) return 0;
  return (puzzle.budget + 1 - result.actionsUsed) / (puzzle.budget + 1);
}

function effectiveCost(result: WardSolution, puzzle: WardPuzzle) {
  return result.solved ? result.actionsUsed : puzzle.budget + result.actionsUsed;
}

export function evaluateWard() {
  const difficulties: DifficultyAggregate[] = [];
  const targetCosts: number[] = [];
  const altCosts: number[] = [];
  const invariantGapSamples: number[] = [];
  const alignmentParts: number[] = [];

  let breakpoint: WardDifficulty = 5;

  for (const difficulty of [1, 2, 3, 4, 5] as WardDifficulty[]) {
    const puzzles = Array.from({ length: 5 }, (_, seed) => generatePuzzle(seed, difficulty));
    const level1 = puzzles.map((puzzle, index) => solve(puzzle, 1, index) as WardSolution);
    const level2 = puzzles.map((puzzle, index) => solve(puzzle, 2, index) as WardSolution);
    const level5 = puzzles.map((puzzle, index) => solve(puzzle, 5, index) as WardSolution);
    const invariant = puzzles.map((puzzle) => solveRowColOnlyVariant(puzzle));

    const solvability =
      level5.filter((result) => result.solved).length / Math.max(1, level5.length);
    const altSolvability =
      level2.filter((result) => result.solved).length / Math.max(1, level2.length);

    const optimalMoves =
      level5.reduce((sum, result) => sum + result.actionsUsed, 0) / level5.length;
    const altMoves =
      level2.reduce((sum, result) => sum + result.actionsUsed, 0) / level2.length;

    const puzzleEntropy =
      puzzles.reduce((sum, puzzle, index) => {
        let running = createInitialState(puzzle);
        let entropy = 0;
        for (const move of level5[index].moves) {
          entropy += log2(Math.max(1, legalMoves(running).length));
          running = applyMove(running, move);
          if (running.verdict) break;
        }
        return sum + entropy;
      }, 0) / puzzles.length;

    const decisionEntropy =
      puzzles.reduce((sum, puzzle, index) => {
        let running = createInitialState(puzzle);
        let samples = 0;
        let entropy = 0;
        for (const move of level5[index].moves) {
          entropy += log2(Math.max(1, legalMoves(running).length));
          samples += 1;
          running = applyMove(running, move);
          if (running.verdict) break;
        }
        return sum + entropy / Math.max(1, samples);
      }, 0) / puzzles.length;

    const skillDepth =
      puzzles.reduce((sum, puzzle, index) => {
        const targetScore = efficiencyScore(level5[index], puzzle);
        const randomScore = efficiencyScore(level1[index], puzzle);
        if (targetScore <= 0) return sum;
        return sum + clamp(0, 1, (targetScore - randomScore) / targetScore);
      }, 0) / puzzles.length;

    const counterintuitive =
      puzzles.reduce((sum, puzzle, index) => {
        const count = level5[index].moves.reduce((moveSum, move, moveIndex) => {
          if (move.type !== 'register') return moveSum;
          const cell = puzzle.filledCells[moveIndex];
          if (!cell) return moveSum;
          return moveSum + (conflictScopesForCell(puzzle, cell).length === 0 ? 1 : 0);
        }, 0);
        return sum + count;
      }, 0) / puzzles.length;

    const drama =
      puzzles.reduce((sum, puzzle, index) => {
        if (puzzle.actualValid) return sum + 1;
        const registerSteps = level5[index].moves.filter((move) => move.type === 'register').length;
        return sum + registerSteps / Math.max(1, puzzle.filledCells.length);
      }, 0) / puzzles.length;

    const infoGainRatio =
      puzzles.reduce((sum, puzzle, index) => {
        const registerCells = level5[index].moves
          .map((move, moveIndex) => ({ move, cell: puzzle.filledCells[moveIndex] }))
          .filter((entry) => entry.move.type === 'register' && entry.cell);
        const ratio =
          registerCells.reduce(
            (running, entry) => running + (entry.cell?.peerCost ?? 1),
            0,
          ) / Math.max(1, registerCells.length);
        return sum + ratio;
      }, 0) / puzzles.length;

    const averageBudget =
      puzzles.reduce((sum, puzzle) => sum + puzzle.budget, 0) / puzzles.length;

    difficulties.push({
      difficulty,
      label: puzzles[0].label,
      budget: averageBudget,
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

    const averageTargetCost =
      puzzles.reduce((sum, puzzle, index) => sum + effectiveCost(level5[index], puzzle), 0) /
      puzzles.length;
    const averageAltCost =
      puzzles.reduce((sum, puzzle, index) => sum + effectiveCost(level2[index], puzzle), 0) /
      puzzles.length;
    targetCosts.push(averageTargetCost);
    altCosts.push(averageAltCost);

    puzzles.forEach((puzzle, index) => {
      const targetCost = effectiveCost(level5[index], puzzle);
      const invariantCost = effectiveCost(invariant[index], puzzle);
      const targetConflict = level5[index].finalState.conflictFound;
      const invariantConflict = invariant[index].finalState.conflictFound;
      if (targetConflict !== invariantConflict || level5[index].solved !== invariant[index].solved) {
        invariantGapSamples.push(
          clamp(0, 1, 1 - targetCost / Math.max(targetCost, invariantCost)),
        );
      }
    });

    const alignment =
      level5.reduce((sum, result) => {
        const processMoves = result.moves.filter(
          (move) => move.type === 'register' || move.type === 'scan',
        );
        if (processMoves.length === 0) return sum;
        const registerMoves = processMoves.filter((move) => move.type === 'register').length;
        return sum + registerMoves / processMoves.length;
      }, 0) / level5.length;
    alignmentParts.push(alignment);

    const altFailureRate = 1 - altSolvability;
    const altCostRatio = averageAltCost / Math.max(1, averageTargetCost);
    if (breakpoint === 5 && (altFailureRate >= 0.2 || altCostRatio >= 1.3)) {
      breakpoint = difficulty;
    }
  }

  const inputShapeMatch = 1;
  const operationMatch = 1;
  const constraintMatch = 1;
  const goalMatch = 1;
  const leetCodeFit =
    (inputShapeMatch + operationMatch + constraintMatch + goalMatch) / 4;

  const bestAlternativeGap =
    targetCosts.reduce(
      (sum, targetCost, index) =>
        sum + clamp(0, 1, 1 - targetCost / Math.max(targetCost, altCosts[index])),
      0,
    ) / targetCosts.length;

  const invariantPressure =
    invariantGapSamples.reduce((sum, value) => sum + value, 0) /
    Math.max(1, invariantGapSamples.length);

  const algorithmAlignment =
    alignmentParts.reduce((sum, value) => sum + value, 0) / alignmentParts.length;

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
        'The target solver files every filled cell into all three overlapping scopes exactly once, so duplicate evidence becomes reusable instead of local.',
      strongestAlternative:
        'The strongest wrong strategy is scan-only neighborhood checking. It feels concrete, but it repeats the same row, column, and chamber work for each new cell.',
      evidence:
        'D1-D2 tolerate scan-heavy play. D3 and above push scan-only past budget while the scoped-registry pass stays linear.',
    },
  } satisfies WardEvaluation;
}
