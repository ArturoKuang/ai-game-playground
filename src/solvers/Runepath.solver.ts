export type RunepathDifficulty = 1 | 2 | 3 | 4 | 5;

export type RunepathMove =
  | { type: 'step'; cellId: string }
  | { type: 'backtrack' }
  | { type: 'claimFound' }
  | { type: 'claimMissing' };

export type RunepathVerdict = {
  correct: boolean;
  label: string;
};

export type RunepathRoute = {
  board: string[];
  word: string;
};

export type RunepathPuzzle = {
  difficulty: RunepathDifficulty;
  label: string;
  title: string;
  helper: string;
  budget: number;
  board: string[];
  word: string;
  solutionPaths: string[][];
};

export type RunepathState = {
  puzzle: RunepathPuzzle;
  path: string[];
  triedByPrefix: Record<string, string[]>;
  actionsUsed: number;
  history: string[];
  message: string;
  verdict: RunepathVerdict | null;
};

export type RunepathSolution = {
  moves: RunepathMove[];
  finalState: RunepathState;
  solved: boolean;
  actionsUsed: number;
  counterintuitiveSteps: number;
  meanDecisionEntropy: number;
  meanInfoGainRatio: number;
};

type Blueprint = {
  label: string;
  title: string;
  helper: string;
  budget: number;
  routes: RunepathRoute[];
};

type DifficultyAggregate = {
  difficulty: RunepathDifficulty;
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
  difficultyBreakpoint: RunepathDifficulty;
  algorithmAlignment: number;
};

export type RunepathEvaluation = {
  difficulties: DifficultyAggregate[];
  learningMetrics: LearningMetrics;
  interpretation: {
    invariant: string;
    strongestAlternative: string;
    evidence: string;
  };
};

const BLUEPRINTS: Record<RunepathDifficulty, Blueprint> = {
  1: {
    label: 'D1',
    title: 'Open Slate',
    helper:
      'Short chants make adjacency and one-use tiles easy to read. Pick the matching next letter from the board and keep the live trail visible.',
    budget: 7,
    routes: [
      {
        board: ['SEA', 'RUM', 'INK'],
        word: 'SEA',
      },
      {
        board: ['DOG', 'ARE', 'PEN'],
        word: 'DOG',
      },
      {
        board: ['CAT', 'ORB', 'PIN'],
        word: 'CAT',
      },
    ],
  },
  2: {
    label: 'D2',
    title: 'Forked Hall',
    helper:
      'Multiple matching letters start to tempt bad guesses. When one branch dies, retreat one rune and try the other neighbor instead of starting blind again.',
    budget: 12,
    routes: [
      {
        board: ['CAA', 'AAA', 'BCD'],
        word: 'AAAB',
      },
      {
        board: ['ABCE', 'SFCS', 'ADEE'],
        word: 'CCSEE',
      },
    ],
  },
  3: {
    label: 'D3',
    title: 'False Echoes',
    helper:
      'Now some chants are missing. The hard part is proving a branch dead without reusing a tile or throwing away the whole search after the first wrong turn.',
    budget: 14,
    routes: [
      {
        board: ['ABCE', 'SFCS', 'ADEE'],
        word: 'ABCB',
      },
      {
        board: ['ABCE', 'SFCS', 'ADEE'],
        word: 'ECCFSAD',
      },
    ],
  },
  4: {
    label: 'D4',
    title: 'Maze Archive',
    helper:
      'Long chants branch repeatedly through the same letter family. The only stable rhythm is local backtracking with a live used-tile trail.',
    budget: 20,
    routes: [
      {
        board: ['ABCE', 'SFES', 'ADEE'],
        word: 'ESEEEFS',
      },
      {
        board: ['CAA', 'AAA', 'BCD'],
        word: 'AAABCDAA',
      },
    ],
  },
  5: {
    label: 'D5',
    title: 'Vanishing Script',
    helper:
      'The strongest fake trails now look real for a long time. If you reset from the root every time a branch dies, the lantern budget collapses before the proof is done.',
    budget: 38,
    routes: [
      {
        board: ['CAA', 'AAA', 'BCD'],
        word: 'AAAACA',
      },
      {
        board: ['CAA', 'AAA', 'BCD'],
        word: 'AAAACAB',
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

export function letterAt(puzzle: RunepathPuzzle, id: string) {
  const { row, col } = parseCellId(id);
  return puzzle.board[row]?.[col] ?? '';
}

function rowMajor(left: string, right: string) {
  const a = parseCellId(left);
  const b = parseCellId(right);
  if (a.row !== b.row) return a.row - b.row;
  return a.col - b.col;
}

function prefixKey(path: string[]) {
  return path.join('>');
}

function cloneTried(triedByPrefix: Record<string, string[]>) {
  return Object.fromEntries(Object.entries(triedByPrefix).map(([key, value]) => [key, [...value]]));
}

function cloneState(state: RunepathState): RunepathState {
  return {
    ...state,
    path: [...state.path],
    triedByPrefix: cloneTried(state.triedByPrefix),
    history: [...state.history],
  };
}

function allCells(puzzle: RunepathPuzzle) {
  const cells: string[] = [];
  for (let row = 0; row < puzzle.board.length; row += 1) {
    for (let col = 0; col < puzzle.board[row]!.length; col += 1) {
      cells.push(cellId(row, col));
    }
  }
  return cells;
}

function orthogonalNeighbors(puzzle: RunepathPuzzle, id: string) {
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
    if (nextRow < 0 || nextCol < 0 || nextRow >= puzzle.board.length || nextCol >= puzzle.board[0]!.length) {
      continue;
    }
    neighbors.push(cellId(nextRow, nextCol));
  }

  return neighbors.sort(rowMajor);
}

function enumerateSolutions(
  board: string[],
  word: string,
  path: string[] = [],
  index = 0,
  output: string[][] = [],
) {
  if (index === word.length) {
    output.push([...path]);
    return output;
  }

  const height = board.length;
  const width = board[0]!.length;

  const candidates =
    index === 0
      ? Array.from({ length: height * width }, (_, value) => cellId(Math.floor(value / width), value % width))
      : orthogonalNeighbors(
          {
            difficulty: 1,
            label: '',
            title: '',
            helper: '',
            budget: 0,
            board,
            word,
            solutionPaths: [],
          },
          path[path.length - 1]!,
        );

  for (const candidate of candidates) {
    if (path.includes(candidate)) continue;
    const letter = board[parseCellId(candidate).row]![parseCellId(candidate).col]!;
    if (letter !== word[index]) continue;
    path.push(candidate);
    enumerateSolutions(board, word, path, index + 1, output);
    path.pop();
  }

  return output;
}

export function generatePuzzle(seed: number, difficulty: RunepathDifficulty): RunepathPuzzle {
  const blueprint = BLUEPRINTS[difficulty];
  const route = blueprint.routes[seed % blueprint.routes.length]!;
  return {
    difficulty,
    label: blueprint.label,
    title: blueprint.title,
    helper: blueprint.helper,
    budget: blueprint.budget,
    board: route.board,
    word: route.word,
    solutionPaths: enumerateSolutions(route.board, route.word),
  };
}

export function createInitialState(puzzle: RunepathPuzzle): RunepathState {
  return {
    puzzle,
    path: [],
    triedByPrefix: {},
    actionsUsed: 0,
    history: [],
    message: `Trace "${puzzle.word}" one rune at a time. Adjacent steps only, and a rune cannot be reused on the same live trail.`,
    verdict: null,
  };
}

export function currentWord(state: RunepathState) {
  return state.path.map((id) => letterAt(state.puzzle, id)).join('');
}

export function nextLetter(state: RunepathState) {
  return state.puzzle.word[state.path.length] ?? null;
}

export function currentChoices(state: RunepathState) {
  if (state.verdict || state.path.length >= state.puzzle.word.length) return [];

  const target = nextLetter(state);
  if (!target) return [];

  const prefix = prefixKey(state.path);
  const tried = new Set(state.triedByPrefix[prefix] ?? []);
  const baseChoices =
    state.path.length === 0 ? allCells(state.puzzle) : orthogonalNeighbors(state.puzzle, state.path[state.path.length - 1]!);

  return baseChoices
    .filter((id) => !state.path.includes(id))
    .filter((id) => letterAt(state.puzzle, id) === target)
    .filter((id) => !tried.has(id))
    .sort(rowMajor);
}

export function exhaustedStarts(state: RunepathState) {
  return [...(state.triedByPrefix[''] ?? [])].sort(rowMajor);
}

export function legalMoves(state: RunepathState) {
  if (state.verdict) return [];

  const moves: Array<'backtrack' | 'claimFound' | 'claimMissing'> = [];
  if (state.path.length > 0) moves.push('backtrack');
  if (state.path.length === state.puzzle.word.length) moves.push('claimFound');
  if (state.path.length === 0 && currentChoices(state).length === 0) moves.push('claimMissing');
  return moves;
}

function spendAction(state: RunepathState) {
  state.actionsUsed += 1;
  if (!state.verdict && state.actionsUsed > state.puzzle.budget) {
    state.verdict = {
      correct: false,
      label: 'The lantern guttered before the archive was proved.',
    };
    state.message = 'The search budget is gone. Reset and keep the trail tighter.';
  }
}

function describeCell(id: string, puzzle: RunepathPuzzle) {
  const { row, col } = parseCellId(id);
  return `${letterAt(puzzle, id)} at r${row + 1}c${col + 1}`;
}

export function applyMove(state: RunepathState, move: RunepathMove): RunepathState {
  if (state.verdict) return state;

  const next = cloneState(state);

  if (move.type === 'step') {
    if (!currentChoices(next).includes(move.cellId)) return next;
    next.path.push(move.cellId);
    next.history.push(`Trace ${describeCell(move.cellId, next.puzzle)}`);
    next.message =
      next.path.length === next.puzzle.word.length
        ? 'The chant is complete. Seal the trail if the full script matches.'
        : `Look for "${nextLetter(next)}" beside the live trail.`;
    spendAction(next);
    return next;
  }

  if (move.type === 'backtrack') {
    if (next.path.length === 0) return next;
    const removed = next.path.pop()!;
    const parentKey = prefixKey(next.path);
    const tried = new Set(next.triedByPrefix[parentKey] ?? []);
    tried.add(removed);
    next.triedByPrefix[parentKey] = [...tried].sort(rowMajor);
    next.history.push(`Retreat from ${describeCell(removed, next.puzzle)}`);
    const choices = currentChoices(next);
    if (next.path.length === 0) {
      next.message =
        choices.length > 0
          ? `That opening trail is spent. Try another "${next.puzzle.word[0]}".`
          : 'No fresh opening runes remain. If the script never formed, call it missing.';
    } else if (choices.length > 0) {
      next.message = `This prefix still lives. Try another "${nextLetter(next)}" from the current rune.`;
    } else {
      next.message = 'This prefix is spent too. Retreat another step.';
    }
    spendAction(next);
    return next;
  }

  if (move.type === 'claimFound') {
    const correct = currentWord(next) === next.puzzle.word;
    next.verdict = {
      correct,
      label: correct ? 'The script holds. Trail confirmed.' : 'That trail does not finish the full script.',
    };
    next.message = correct
      ? 'You proved the chant without reusing a rune.'
      : 'The archive only accepts a complete adjacent trail for every letter.';
    next.history.push(correct ? 'Seal the completed trail' : 'Seal an incomplete trail');
    spendAction(next);
    return next;
  }

  const correct = next.path.length === 0 && currentChoices(next).length === 0 && next.puzzle.solutionPaths.length === 0;
  next.verdict = {
    correct,
    label: correct ? 'No valid trail exists. Absence proved.' : 'A live trail still exists somewhere on the slate.',
  };
  next.message = correct
    ? 'Every opening and branch was exhausted without a legal full script.'
    : 'The search was called too early. A legal trail still exists.';
  next.history.push(correct ? 'Call the script missing' : 'Call missing too early');
  spendAction(next);
  return next;
}

function analyzeSolution(puzzle: RunepathPuzzle, moves: RunepathMove[]) {
  let state = createInitialState(puzzle);
  let entropySum = 0;
  let infoGainSum = 0;
  let steps = 0;
  let counterintuitive = 0;

  for (const move of moves) {
    const choices = currentChoices(state);
    const legalCount =
      choices.length +
      (state.path.length > 0 ? 1 : 0) +
      (state.path.length === puzzle.word.length ? 1 : 0) +
      (state.path.length === 0 && choices.length === 0 ? 1 : 0);
    entropySum += log2(Math.max(1, legalCount));

    if (move.type === 'backtrack') {
      counterintuitive += 1;
      infoGainSum += 1 + choices.length;
    } else if (move.type === 'step' && choices.length > 1) {
      counterintuitive += 1;
      infoGainSum += choices.length;
    } else {
      infoGainSum += 1;
    }

    state = applyMove(state, move);
    steps += 1;
  }

  return {
    entropySum,
    decisionEntropy: steps > 0 ? entropySum / steps : 0,
    counterintuitive,
    infoGainRatio: steps > 0 ? infoGainSum / steps : 0,
  };
}

function solveWithPolicy(
  puzzle: RunepathPuzzle,
  policy: 'dfs' | 'rootReset',
): RunepathSolution {
  let state = createInitialState(puzzle);
  const moves: RunepathMove[] = [];
  let guard = 0;

  while (!state.verdict && guard < 2000) {
    const choices = currentChoices(state);
    let move: RunepathMove;

    if (state.path.length === puzzle.word.length) {
      move = { type: 'claimFound' };
    } else if (choices.length > 0) {
      move = { type: 'step', cellId: choices[0]! };
    } else if (state.path.length > 0) {
      if (policy === 'rootReset' && state.path.length > 1) {
        move = { type: 'backtrack' };
      } else {
        move = { type: 'backtrack' };
      }
    } else {
      move = { type: 'claimMissing' };
    }

    moves.push(move);
    state = applyMove(state, move);

    if (policy === 'rootReset' && move.type === 'backtrack' && state.path.length > 0 && currentChoices(state).length > 0) {
      // Keep unwinding to the root before trying another branch.
      while (!state.verdict && state.path.length > 0) {
        const resetMove: RunepathMove = { type: 'backtrack' };
        moves.push(resetMove);
        state = applyMove(state, resetMove);
      }
    }

    guard += 1;
  }

  const analysis = analyzeSolution(puzzle, moves);

  return {
    moves,
    finalState: state,
    solved: Boolean(state.verdict?.correct),
    actionsUsed: state.actionsUsed,
    counterintuitiveSteps: analysis.counterintuitive,
    meanDecisionEntropy: analysis.decisionEntropy,
    meanInfoGainRatio: analysis.infoGainRatio,
  };
}

export function solveRunepath(puzzle: RunepathPuzzle) {
  return solveWithPolicy(puzzle, 'dfs');
}

export function solveRunepathByResetting(puzzle: RunepathPuzzle) {
  return solveWithPolicy(puzzle, 'rootReset');
}

export function evaluateRunepath(): RunepathEvaluation {
  const difficulties: DifficultyAggregate[] = [];
  const allAltGaps: number[] = [];
  const allPressureGaps: number[] = [];

  for (const difficulty of [1, 2, 3, 4, 5] as RunepathDifficulty[]) {
    const blueprint = BLUEPRINTS[difficulty];
    const puzzles = blueprint.routes.map((_, seed) => generatePuzzle(seed, difficulty));
    const optimal = puzzles.map((puzzle) => solveRunepath(puzzle));
    const alt = puzzles.map((puzzle) => solveRunepathByResetting(puzzle));

    const optimalActions = average(optimal.map((solution) => solution.actionsUsed));
    const altActions = average(alt.map((solution) => solution.actionsUsed));
    const altSolveRate = average(alt.map((solution) => (solution.solved ? 1 : 0)));
    const gap = clamp(0, 1, 1 - optimalActions / Math.max(optimalActions + 1, altActions));
    const pressure = average(
      puzzles.map((puzzle, index) => clamp(0, 1, (alt[index]!.actionsUsed - optimal[index]!.actionsUsed) / puzzle.budget)),
    );
    allAltGaps.push(gap);
    allPressureGaps.push(pressure);

    difficulties.push({
      difficulty,
      label: blueprint.label,
      budget: blueprint.budget,
      solvability: average(optimal.map((solution) => (solution.solved ? 1 : 0))),
      puzzleEntropy: average(
        puzzles.map((puzzle) => log2(Math.max(2, puzzle.word.length + puzzle.solutionPaths.length + puzzle.board.length))),
      ),
      skillDepth: clamp(0, 1, (1 - altSolveRate) * 0.55 + gap * 0.45),
      decisionEntropy: average(optimal.map((solution) => solution.meanDecisionEntropy)),
      counterintuitive: average(optimal.map((solution) => solution.counterintuitiveSteps)),
      drama: pressure,
      infoGainRatio: average(optimal.map((solution) => solution.meanInfoGainRatio)),
      optimalMoves: optimalActions,
      altMoves: altActions,
      altSolvability: altSolveRate,
    });
  }

  const difficultyBreakpoint =
    difficulties.find((entry) => entry.altSolvability < 0.8 || entry.altMoves > entry.optimalMoves * 1.6)?.difficulty ?? 5;

  return {
    difficulties,
    learningMetrics: {
      inputShapeMatch: 1,
      operationMatch: 1,
      constraintMatch: 1,
      goalMatch: 1,
      leetCodeFit: 1,
      bestAlternativeGap: average(allAltGaps),
      invariantPressure: average(allPressureGaps),
      difficultyBreakpoint,
      algorithmAlignment: 1,
    },
    interpretation: {
      invariant:
        'Keep one live trail for the target word, step only into orthogonally adjacent matching letters, never reuse a tile on that trail, and retreat one letter at a time when a branch dies.',
      strongestAlternative:
        'The strongest wrong strategy is full reset on dead end: abandon the whole live trail and restart from the root instead of peeling back just one step.',
      evidence:
        'Easy boards tolerate resets, but branch-heavy and no-solution chants punish them because most of the prefix is still useful. Local backtracking preserves that prefix while root resets repay the same opening letters over and over.',
    },
  };
}
