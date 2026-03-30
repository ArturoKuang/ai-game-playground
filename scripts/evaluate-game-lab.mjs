import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const gameLabPath = path.join(rootDir, 'game-lab.json');

const tileCatalog = {
  dot: [],
  hor: ['W', 'E'],
  ver: ['N', 'S'],
  ne: ['N', 'E'],
  nw: ['N', 'W'],
  se: ['S', 'E'],
  sw: ['S', 'W'],
};

const offsets = {
  N: [-1, 0],
  E: [0, 1],
  S: [1, 0],
  W: [0, -1],
};

const opposite = {
  N: 'S',
  E: 'W',
  S: 'N',
  W: 'E',
};

const SEARCH_DEPTH_FLOOR = 8;
const SEARCH_DEPTH_BUFFER = 4;
const SEARCH_DEPTH_CAP = 12;
const SEARCH_STATE_CAP = 100000;

const raw = await readFile(gameLabPath, 'utf8');
const lab = JSON.parse(raw);

validateLab(lab);

const rankedGames = lab.games
  .map((game) => ({
    ...game,
    ...evaluateGame(game),
  }))
  .sort((left, right) => right.score - left.score);

const selectedIndex = rankedGames.findIndex((game) => game.id === lab.selectedGameId);
const selectedGame = rankedGames[selectedIndex];
const bestGame = rankedGames[0];

console.log('Game Idea Rankings');
console.log('==================');

rankedGames.forEach((game, index) => {
  console.log(
    `${index + 1}. ${game.title} (${game.id}) score=${game.score.toFixed(2)} | ${game.summary}`,
  );
});

console.log('---');
console.log(`selected_game: ${selectedGame.id}`);
console.log(`selected_score: ${selectedGame.score.toFixed(2)}`);
console.log(`best_game: ${bestGame.id}`);
console.log(`best_score: ${bestGame.score.toFixed(2)}`);
console.log(`selected_rank: ${selectedIndex + 1}/${rankedGames.length}`);
console.log(
  `verdict: ${
    selectedGame.id === bestGame.id
      ? 'selected game matches the current top-scoring concept'
      : 'selected game is not the top-scoring concept right now'
  }`,
);

function validateLab(value) {
  if (!value || typeof value !== 'object') {
    throw new Error('game-lab.json must export an object');
  }

  if (!Array.isArray(value.games) || value.games.length === 0) {
    throw new Error('game-lab.json must include a non-empty games array');
  }

  const ids = new Set();

  value.games.forEach((game) => {
    if (ids.has(game.id)) {
      throw new Error(`Duplicate game id: ${game.id}`);
    }

    ids.add(game.id);

    if (!Array.isArray(game.statsHooks) || game.statsHooks.length === 0) {
      throw new Error(`${game.id} must define at least one stats hook`);
    }

    if (!Array.isArray(game.howToPlay) || game.howToPlay.length < 3) {
      throw new Error(`${game.id} must provide at least three howToPlay steps`);
    }

    if (typeof game.signatureHook !== 'string' || game.signatureHook.trim().length < 20) {
      throw new Error(`${game.id} must define a meaningful signatureHook`);
    }

    if (game.prototype) {
      validatePathShiftPrototype(game.id, game.prototype);
    }
  });

  if (!ids.has(value.selectedGameId)) {
    throw new Error(`selectedGameId ${value.selectedGameId} does not match any game`);
  }

  const hasPrototype = value.games.some((game) => game.prototype?.type === 'path-shift');

  if (!hasPrototype) {
    throw new Error('At least one game must include a playable path-shift prototype');
  }
}

function validatePathShiftPrototype(gameId, prototype) {
  if (prototype.type !== 'path-shift') {
    throw new Error(`${gameId} prototype type ${prototype.type} is not supported`);
  }

  if (!Number.isInteger(prototype.gridSize) || prototype.gridSize < 2) {
    throw new Error(`${gameId} prototype gridSize must be an integer >= 2`);
  }

  if (!Array.isArray(prototype.puzzles) || prototype.puzzles.length === 0) {
    throw new Error(`${gameId} prototype needs at least one puzzle`);
  }

  prototype.puzzles.forEach((puzzle) => {
    if (!Number.isInteger(puzzle.startRow) || puzzle.startRow < 0 || puzzle.startRow >= prototype.gridSize) {
      throw new Error(`${gameId}/${puzzle.id} startRow must be within the board`);
    }

    if (!Number.isInteger(puzzle.goalRow) || puzzle.goalRow < 0 || puzzle.goalRow >= prototype.gridSize) {
      throw new Error(`${gameId}/${puzzle.id} goalRow must be within the board`);
    }

    if (!Number.isInteger(puzzle.parMoves) || puzzle.parMoves < 1) {
      throw new Error(`${gameId}/${puzzle.id} parMoves must be a positive integer`);
    }

    if (!Array.isArray(puzzle.baseBoard) || puzzle.baseBoard.length !== prototype.gridSize) {
      throw new Error(`${gameId}/${puzzle.id} baseBoard must match gridSize`);
    }

    puzzle.baseBoard.forEach((row) => {
      if (!Array.isArray(row) || row.length !== prototype.gridSize) {
        throw new Error(`${gameId}/${puzzle.id} baseBoard rows must match gridSize`);
      }

      row.forEach((tileId) => {
        if (!(tileId in tileCatalog)) {
          throw new Error(`${gameId}/${puzzle.id} contains unknown tile ${tileId}`);
        }
      });
    });

    if (!Array.isArray(puzzle.scramble) || puzzle.scramble.length === 0) {
      throw new Error(`${gameId}/${puzzle.id} must define a non-empty scramble`);
    }

    puzzle.scramble.forEach((operation, index) => {
      if (operation.kind !== 'row' && operation.kind !== 'column') {
        throw new Error(`${gameId}/${puzzle.id} scramble[${index}] kind must be row or column`);
      }

      if (!Number.isInteger(operation.index) || operation.index < 0 || operation.index >= prototype.gridSize) {
        throw new Error(`${gameId}/${puzzle.id} scramble[${index}] index must be within the board`);
      }

      if (!Number.isInteger(operation.steps) || operation.steps === 0) {
        throw new Error(`${gameId}/${puzzle.id} scramble[${index}] steps must be a non-zero integer`);
      }
    });
  });
}

function evaluateGame(game) {
  if (!game.prototype) {
    return {
      score: -50,
      summary: 'no playable prototype; auto-evaluator cannot measure solve depth or replay quality',
    };
  }

  if (game.prototype.type !== 'path-shift') {
    return {
      score: -40,
      summary: `unsupported prototype type ${game.prototype.type}; evaluator only understands path-shift`,
    };
  }

  const analysis = analyzePathShiftGame(game);
  const puzzleCountScore = scaleToRange(analysis.puzzleCount, 1, 7, 8);
  const depthScore = closeness(analysis.averageOptimalMoves, 5, 4, 16);
  const parScore = closeness(analysis.averageParGap, 1, 2, 12);
  const firstMoveScore = closeness(analysis.averageImprovingFirstMoves, 2, 2, 12);
  const distinctFirstStateScore = closeness(analysis.averageDistinctFirstStateRatio, 0.85, 0.35, 6);
  const snapScore =
    scaleToRange(analysis.averageBestFirstGain, 0, 2, 6) +
    scaleToRange(analysis.averageSnapGain, 0, 4, 6);
  const densityScore = closeness(analysis.averageNonDotRatio, 0.4, 0.25, 8);
  const coverageScore = closeness(analysis.averageNearestSolvedCoverage, 0.35, 0.25, 8);
  const scarcityScore = closeness(analysis.averageSolvedRatio, 0.06, 0.05, 8);
  const varietyScore =
    scaleToRange(analysis.uniqueOptimalMoveCount, 1, 4, 4) +
    scaleToRange(analysis.uniqueStartGoalPairCount, 1, 4, 4) +
    scaleToRange(analysis.optimalMoveSpread, 0, 3, 4);
  const automationBonus = (analysis.unsolvedPuzzleCount === 0 ? 12 : 0) + (analysis.impossibleParCount === 0 ? 8 : 0);
  const implementationPenalty =
    Math.max(0, game.prototype.gridSize - 4) * 8 +
    analysis.unsolvedPuzzleCount * 40 +
    analysis.impossibleParCount * 25 +
    analysis.truncatedSearchCount * 10;

  const score =
    puzzleCountScore +
    depthScore +
    parScore +
    firstMoveScore +
    distinctFirstStateScore +
    snapScore +
    densityScore +
    coverageScore +
    scarcityScore +
    varietyScore +
    automationBonus -
    implementationPenalty;

  return {
    score,
    summary: [
      `prototype=path-shift`,
      `puzzles=${analysis.puzzleCount}`,
      `opt=${analysis.averageOptimalMoves.toFixed(1)}`,
      `par_gap=${analysis.averageParGap.toFixed(1)}`,
      `first=${analysis.averageImprovingFirstMoves.toFixed(1)}`,
      `snap=${analysis.averageSnapGain.toFixed(1)}`,
      `solved=${formatPercent(analysis.averageSolvedRatio)}`,
      `variety=${analysis.uniqueOptimalMoveCount}`,
      `issues=${analysis.unsolvedPuzzleCount + analysis.impossibleParCount + analysis.truncatedSearchCount}`,
    ].join(' '),
  };
}

function analyzePathShiftGame(game) {
  const puzzles = game.prototype.puzzles.map((puzzle) => analyzePathShiftPuzzle(game.prototype.gridSize, puzzle));

  return {
    puzzleCount: puzzles.length,
    averageOptimalMoves: averageFinite(puzzles.map((puzzle) => puzzle.optimalMoves)),
    averageParGap: averageFinite(puzzles.map((puzzle) => puzzle.parGap)),
    averageImprovingFirstMoves: averageFinite(puzzles.map((puzzle) => puzzle.improvingFirstMoves)),
    averageDistinctFirstStateRatio: averageFinite(puzzles.map((puzzle) => puzzle.distinctFirstStateRatio)),
    averageBestFirstGain: averageFinite(puzzles.map((puzzle) => puzzle.bestFirstGain)),
    averageSnapGain: averageFinite(puzzles.map((puzzle) => puzzle.snapGain)),
    averageNonDotRatio: averageFinite(puzzles.map((puzzle) => puzzle.nonDotRatio)),
    averageNearestSolvedCoverage: averageFinite(puzzles.map((puzzle) => puzzle.nearestSolvedCoverage)),
    averageSolvedRatio: averageFinite(puzzles.map((puzzle) => puzzle.solvedRatio)),
    uniqueOptimalMoveCount: new Set(
      puzzles.filter((puzzle) => Number.isFinite(puzzle.optimalMoves)).map((puzzle) => puzzle.optimalMoves),
    ).size,
    uniqueStartGoalPairCount: new Set(puzzles.map((puzzle) => `${puzzle.startRow}:${puzzle.goalRow}`)).size,
    optimalMoveSpread: spread(puzzles.map((puzzle) => puzzle.optimalMoves)),
    unsolvedPuzzleCount: puzzles.filter((puzzle) => !Number.isFinite(puzzle.optimalMoves)).length,
    impossibleParCount: puzzles.filter((puzzle) => puzzle.parGap < 0).length,
    truncatedSearchCount: puzzles.filter((puzzle) => puzzle.searchTruncated).length,
  };
}

function analyzePathShiftPuzzle(gridSize, puzzle) {
  const actions = enumerateActions(gridSize);
  const initialBoard = createInitialBoard(puzzle);
  const searchDepth = Math.min(
    SEARCH_DEPTH_CAP,
    Math.max(SEARCH_DEPTH_FLOOR, puzzle.parMoves + SEARCH_DEPTH_BUFFER),
  );
  const search = runBoundedSearch(initialBoard, puzzle, searchDepth, SEARCH_STATE_CAP);
  const firstMoveSearchCache = new Map();
  const firstActionBoards = actions.map((action) => ({
    action,
    board: action.kind === 'row' ? shiftRowRight(initialBoard, action.index) : shiftColumnDown(initialBoard, action.index),
  }));
  const firstActionKeys = firstActionBoards.map(({ board }) => serializeBoard(board));
  const firstActionDistances = firstActionBoards.map(({ board }, index) => {
    const key = firstActionKeys[index];

    if (!firstMoveSearchCache.has(key)) {
      firstMoveSearchCache.set(
        key,
        runBoundedSearch(board, puzzle, Math.max(1, searchDepth - 1), Math.floor(SEARCH_STATE_CAP / 2)).optimalMoves,
      );
    }

    return firstMoveSearchCache.get(key);
  });
  const bestNeighborDistance =
    firstActionDistances.length > 0 ? Math.min(...firstActionDistances) : Number.POSITIVE_INFINITY;
  const improvingFirstMoves = Number.isFinite(search.optimalMoves)
    ? firstActionDistances.filter(
        (distance) => Number.isFinite(distance) && distance < search.optimalMoves,
      ).length
    : 0;
  const bestFirstGain =
    Number.isFinite(search.optimalMoves) && Number.isFinite(bestNeighborDistance)
      ? Math.max(0, search.optimalMoves - bestNeighborDistance)
      : 0;
  const startPathLength = search.startPathLength;
  const bestNeighborPathLength =
    firstActionBoards.length > 0
      ? Math.max(...firstActionBoards.map(({ board }) => tracePath(board, puzzle).pathLength))
      : startPathLength;

  return {
    startRow: puzzle.startRow,
    goalRow: puzzle.goalRow,
    optimalMoves: search.optimalMoves,
    parGap: Number.isFinite(search.optimalMoves)
      ? puzzle.parMoves - search.optimalMoves
      : Number.NEGATIVE_INFINITY,
    improvingFirstMoves,
    distinctFirstStateRatio: new Set(firstActionKeys).size / actions.length,
    bestFirstGain,
    snapGain: Math.max(0, bestNeighborPathLength - startPathLength),
    nonDotRatio: countNonDots(initialBoard) / (gridSize * gridSize),
    nearestSolvedCoverage: search.nearestSolvedCoverage,
    solvedRatio: search.localSolvedRatio,
    searchTruncated: search.truncated,
  };
}

function runBoundedSearch(startBoard, puzzle, maxDepth, maxStates) {
  const actions = enumerateActions(startBoard.length);
  const startKey = serializeBoard(startBoard);
  const visited = new Map([[startKey, 0]]);
  const queue = [{ key: startKey, board: startBoard, depth: 0 }];
  const solvedStates = [];
  const startPathLength = tracePath(startBoard, puzzle).pathLength;
  let truncated = false;

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    if (queue.length >= maxStates) {
      truncated = true;
      break;
    }

    const node = queue[cursor];
    const trace = tracePath(node.board, puzzle);

    if (trace.solved) {
      solvedStates.push({ depth: node.depth, pathLength: trace.pathLength });
    }

    if (node.depth >= maxDepth) {
      continue;
    }

    actions.forEach((action) => {
      const nextBoard =
        action.kind === 'row' ? shiftRowRight(node.board, action.index) : shiftColumnDown(node.board, action.index);
      const nextKey = serializeBoard(nextBoard);

      if (visited.has(nextKey)) {
        return;
      }

      visited.set(nextKey, node.depth + 1);
      queue.push({ key: nextKey, board: nextBoard, depth: node.depth + 1 });
    });
  }

  const optimalMoves = solvedStates.length > 0 ? Math.min(...solvedStates.map((state) => state.depth)) : Number.POSITIVE_INFINITY;
  const nearestSolvedCoverage = Number.isFinite(optimalMoves)
    ? averageFinite(
        solvedStates
          .filter((state) => state.depth === optimalMoves)
          .map((state) => state.pathLength / (startBoard.length * startBoard.length)),
      )
    : 0;

  return {
    optimalMoves,
    nearestSolvedCoverage,
    localSolvedRatio: solvedStates.length / visited.size,
    truncated,
    startPathLength,
  };
}

function enumerateActions(gridSize) {
  return [
    ...Array.from({ length: gridSize }, (_, index) => ({ kind: 'row', index })),
    ...Array.from({ length: gridSize }, (_, index) => ({ kind: 'column', index })),
  ];
}

function createInitialBoard(puzzle) {
  return applyOperations(puzzle.baseBoard, puzzle.scramble);
}

function applyOperations(board, operations) {
  return operations.reduce((current, operation) => {
    const normalizedSteps = ((operation.steps % current.length) + current.length) % current.length;
    let next = cloneBoard(current);

    for (let step = 0; step < normalizedSteps; step += 1) {
      next =
        operation.kind === 'row'
          ? shiftRowRight(next, operation.index)
          : shiftColumnDown(next, operation.index);
    }

    return next;
  }, cloneBoard(board));
}

function shiftRowRight(board, rowIndex) {
  return board.map((row, index) => {
    if (index !== rowIndex) {
      return [...row];
    }

    return [row[row.length - 1], ...row.slice(0, row.length - 1)];
  });
}

function shiftColumnDown(board, columnIndex) {
  const size = board.length;
  return board.map((row, rowIndex) => {
    const sourceIndex = (rowIndex - 1 + size) % size;
    return row.map((tile, index) => (index === columnIndex ? board[sourceIndex][index] : tile));
  });
}

function tracePath(board, puzzle) {
  const visited = new Set();
  const size = board.length;

  let row = puzzle.startRow;
  let column = 0;
  let incoming = 'W';
  let pathLength = 0;

  while (row >= 0 && row < size && column >= 0 && column < size) {
    const key = `${row}:${column}:${incoming}`;

    if (visited.has(key)) {
      return { solved: false, pathLength };
    }

    visited.add(key);
    pathLength += 1;

    const connectors = tileCatalog[board[row][column]];

    if (!connectors.includes(incoming)) {
      return { solved: false, pathLength };
    }

    const outgoing = connectors.find((connector) => connector !== incoming);

    if (!outgoing) {
      return { solved: false, pathLength };
    }

    const [rowOffset, columnOffset] = offsets[outgoing];
    const nextRow = row + rowOffset;
    const nextColumn = column + columnOffset;

    if (nextRow < 0 || nextRow >= size || nextColumn < 0 || nextColumn >= size) {
      return {
        solved: outgoing === 'E' && row === puzzle.goalRow,
        pathLength,
      };
    }

    row = nextRow;
    column = nextColumn;
    incoming = opposite[outgoing];
  }

  return { solved: false, pathLength };
}

function serializeBoard(board) {
  return board.map((row) => row.join(',')).join('|');
}

function cloneBoard(board) {
  return board.map((row) => [...row]);
}

function countNonDots(board) {
  return board.reduce(
    (count, row) => count + row.reduce((rowCount, tileId) => rowCount + (tileId === 'dot' ? 0 : 1), 0),
    0,
  );
}

function averageFinite(values) {
  const finiteValues = values.filter((value) => Number.isFinite(value));

  if (finiteValues.length === 0) {
    return 0;
  }

  return finiteValues.reduce((sum, value) => sum + value, 0) / finiteValues.length;
}

function spread(values) {
  const finiteValues = values.filter((value) => Number.isFinite(value));

  if (finiteValues.length === 0) {
    return 0;
  }

  return Math.max(...finiteValues) - Math.min(...finiteValues);
}

function closeness(value, target, spreadSize, maxScore) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const distance = Math.abs(value - target);

  if (distance >= spreadSize) {
    return 0;
  }

  return maxScore * (1 - distance / spreadSize);
}

function scaleToRange(value, min, max, maxScore) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  if (value <= min) {
    return 0;
  }

  if (value >= max) {
    return maxScore;
  }

  return ((value - min) / (max - min)) * maxScore;
}

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}
