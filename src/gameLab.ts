import rawGameLab from '../game-lab.json';

export type ShiftKind = 'row' | 'column';
export type Direction = 'N' | 'E' | 'S' | 'W';
export type TileId = 'dot' | 'hor' | 'ver' | 'ne' | 'nw' | 'se' | 'sw';

export type ShiftOperation = {
  kind: ShiftKind;
  index: number;
  steps: number;
};

export type PathShiftPuzzle = {
  id: string;
  title: string;
  startRow: number;
  goalRow: number;
  parMoves: number;
  baseBoard: TileId[][];
  scramble: ShiftOperation[];
};

export type PathShiftPrototype = {
  type: 'path-shift';
  gridSize: number;
  puzzles: PathShiftPuzzle[];
};

export type GameSpec = {
  id: string;
  title: string;
  tagline: string;
  mechanic: string;
  description: string;
  signatureHook: string;
  onboardingSeconds: number;
  sessionSeconds: number;
  controlComplexity: number;
  masteryDepth: number;
  dailyReturnStrength: number;
  hookStrength: number;
  delightFactor: number;
  retryImpulse: number;
  screenshotClarity: number;
  languageLoad: number;
  implementationRisk: number;
  familyFriendly: boolean;
  universalSymbols: boolean;
  statsHooks: string[];
  howToPlay: string[];
  prototype?: PathShiftPrototype;
};

type GameLab = {
  labName: string;
  goal: string;
  selectedGameId: string;
  games: GameSpec[];
};

export type TileSpec = {
  glyph: string;
  connectors: Direction[];
};

export type TraceResult = {
  solved: boolean;
  highlighted: Set<string>;
  exitRow: number | null;
  path: { row: number; column: number }[];
  stopPoint: { row: number; column: number } | null;
};

export const tileCatalog: Record<TileId, TileSpec> = {
  dot: { glyph: '·', connectors: [] },
  hor: { glyph: '━', connectors: ['W', 'E'] },
  ver: { glyph: '┃', connectors: ['N', 'S'] },
  ne: { glyph: '┗', connectors: ['N', 'E'] },
  nw: { glyph: '┛', connectors: ['N', 'W'] },
  se: { glyph: '┏', connectors: ['S', 'E'] },
  sw: { glyph: '┓', connectors: ['S', 'W'] },
};

const offsets: Record<Direction, [number, number]> = {
  N: [-1, 0],
  E: [0, 1],
  S: [1, 0],
  W: [0, -1],
};

const opposite: Record<Direction, Direction> = {
  N: 'S',
  E: 'W',
  S: 'N',
  W: 'E',
};

export const gameLab = rawGameLab as GameLab;

export const selectedGame =
  gameLab.games.find((game) => game.id === gameLab.selectedGameId) ?? gameLab.games[0];

const resolvedPlayableGame =
  (selectedGame?.prototype ? selectedGame : undefined) ??
  gameLab.games.find((game) => game.prototype?.type === 'path-shift');

if (!selectedGame) {
  throw new Error('game-lab.json must define at least one game.');
}

if (!resolvedPlayableGame || !resolvedPlayableGame.prototype || resolvedPlayableGame.prototype.type !== 'path-shift') {
  throw new Error('At least one game must provide a path-shift prototype.');
}

export const playableGame = resolvedPlayableGame;

export function formatCount(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}

export function getDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTodayPuzzle(game: GameSpec, date = new Date()) {
  if (!game.prototype || game.prototype.type !== 'path-shift') {
    throw new Error(`Game ${game.id} does not expose a path-shift prototype`);
  }

  const dayIndex = Math.floor(
    (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(2026, 0, 1)) /
      86400000,
  );
  const normalizedIndex = ((dayIndex % game.prototype.puzzles.length) + game.prototype.puzzles.length) %
    game.prototype.puzzles.length;

  return game.prototype.puzzles[normalizedIndex];
}

export function createInitialBoard(puzzle: PathShiftPuzzle) {
  return applyOperations(puzzle.baseBoard, puzzle.scramble);
}

export function shiftRowRight(board: TileId[][], rowIndex: number) {
  return board.map((row, index) => {
    if (index !== rowIndex) {
      return [...row];
    }

    return [row[row.length - 1], ...row.slice(0, row.length - 1)];
  });
}

export function shiftColumnDown(board: TileId[][], columnIndex: number) {
  const size = board.length;
  return board.map((row, rowIndex) => {
    const sourceIndex = (rowIndex - 1 + size) % size;
    return row.map((tile, index) => (index === columnIndex ? board[sourceIndex][index] : tile));
  });
}

export function tracePath(board: TileId[][], puzzle: PathShiftPuzzle): TraceResult {
  const highlighted = new Set<string>();
  const visited = new Set<string>();
  const path: { row: number; column: number }[] = [];
  const size = board.length;

  let row = puzzle.startRow;
  let column = 0;
  let incoming: Direction = 'W';

  while (row >= 0 && row < size && column >= 0 && column < size) {
    const key = `${row}:${column}:${incoming}`;
    const currentPoint = { row, column };

    if (visited.has(key)) {
      return { solved: false, highlighted, exitRow: null, path, stopPoint: currentPoint };
    }

    visited.add(key);
    highlighted.add(`${row}:${column}`);
    path.push(currentPoint);

    const tile = tileCatalog[board[row][column]];

    if (!tile.connectors.includes(incoming)) {
      return { solved: false, highlighted, exitRow: null, path, stopPoint: currentPoint };
    }

    const outgoing = tile.connectors.find((connector) => connector !== incoming);

    if (!outgoing) {
      return { solved: false, highlighted, exitRow: null, path, stopPoint: currentPoint };
    }

    const [rowOffset, columnOffset] = offsets[outgoing];
    const nextRow = row + rowOffset;
    const nextColumn = column + columnOffset;

    if (nextRow < 0 || nextRow >= size || nextColumn < 0 || nextColumn >= size) {
      return {
        solved: outgoing === 'E' && row === puzzle.goalRow,
        highlighted,
        exitRow: row,
        path,
        stopPoint: currentPoint,
      };
    }

    row = nextRow;
    column = nextColumn;
    incoming = opposite[outgoing];
  }

  return { solved: false, highlighted, exitRow: null, path, stopPoint: null };
}

export function getPrincipleSignals(game: GameSpec) {
  return [
    `${game.onboardingSeconds}s onboarding`,
    `${game.sessionSeconds}s session`,
    `mastery ${game.masteryDepth}/5`,
    `daily ${game.dailyReturnStrength}/5`,
    `hook ${game.hookStrength}/5`,
  ];
}

export function getConceptSummary(game: GameSpec) {
  return [
    `controls ${game.controlComplexity}/5`,
    `delight ${game.delightFactor}/5`,
    `retry ${game.retryImpulse}/5`,
    `language ${game.languageLoad}/5`,
    `shot ${game.screenshotClarity}/5`,
  ];
}

export function getAudienceCopy(game: GameSpec) {
  const age = game.familyFriendly ? 'all-ages friendly' : 'niche audience';
  const language = game.languageLoad === 0 ? 'language-light' : `language load ${game.languageLoad}/5`;
  return `${age} • ${language}`;
}

function applyOperations(board: TileId[][], operations: ShiftOperation[]) {
  return operations.reduce((current, operation) => {
    const normalizedSteps = operation.steps % current.length;
    let next = current.map((row) => [...row]);

    for (let step = 0; step < normalizedSteps; step += 1) {
      next =
        operation.kind === 'row'
          ? shiftRowRight(next, operation.index)
          : shiftColumnDown(next, operation.index);
    }

    return next;
  }, board.map((row) => [...row]));
}
