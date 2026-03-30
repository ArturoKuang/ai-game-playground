import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  useWindowDimensions,
  Animated,
} from 'react-native';
import ShareButton from '../components/ShareButton';
import StatsModal from '../components/StatsModal';
import CelebrationBurst from '../components/CelebrationBurst';
import {
  getDailySeed,
  seededRandom,
  getPuzzleDay,
  getDayDifficulty,
} from '../utils/seed';
import { loadStats, recordGame, type Stats } from '../utils/stats';

/* ─── Types ─── */
type Direction = 'up' | 'down' | 'left' | 'right';
type Cell = number | null;
type Board = Cell[][];

/* ─── Constants ─── */
const SIZE = 5;
const GAP = 3;
const DIRECTIONS: Direction[] = ['up', 'down', 'left', 'right'];

const COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f'];
const BORDERS = ['#c0392b', '#2980b9', '#27ae60', '#f39c12'];
const EMOJI = ['\uD83D\uDFE5', '\uD83D\uDFE6', '\uD83D\uDFE9', '\uD83D\uDFE8'];
const DIR_EMOJI: Record<Direction, string> = {
  up: '\u2B06\uFE0F',
  down: '\u2B07\uFE0F',
  left: '\u2B05\uFE0F',
  right: '\u27A1\uFE0F',
};

/* ─── Difficulty ─── */
function getDifficulty() {
  const d = getDayDifficulty(); // 1 Mon … 5 Fri
  const numColors = 3;
  const tileCount = 14 + d; // Mon 15, Fri 19
  return { numColors, tileCount };
}

/* ─── Board helpers ─── */
function cloneBoard(b: Board): Board {
  return b.map((r) => [...r]);
}

function boardKey(b: Board): string {
  return b
    .flat()
    .map((c) => (c === null ? '.' : String(c)))
    .join('');
}

function countTiles(b: Board): number {
  let n = 0;
  for (const row of b) for (const c of row) if (c !== null) n++;
  return n;
}

/* ─── Connected groups of 3+ same-colour ─── */
function findGroups(board: Board): [number, number][][] {
  const visited = new Set<number>();
  const groups: [number, number][][] = [];

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const key = r * SIZE + c;
      if (board[r][c] === null || visited.has(key)) continue;
      const color = board[r][c];
      const group: [number, number][] = [];
      const stack: [number, number][] = [[r, c]];
      visited.add(key);

      while (stack.length > 0) {
        const [cr, cc] = stack.pop()!;
        group.push([cr, cc]);
        for (const [dr, dc] of [
          [0, 1],
          [0, -1],
          [1, 0],
          [-1, 0],
        ]) {
          const nr = cr + dr;
          const nc = cc + dc;
          const nk = nr * SIZE + nc;
          if (
            nr >= 0 &&
            nr < SIZE &&
            nc >= 0 &&
            nc < SIZE &&
            !visited.has(nk) &&
            board[nr][nc] === color
          ) {
            visited.add(nk);
            stack.push([nr, nc]);
          }
        }
      }
      if (group.length >= 3) groups.push(group);
    }
  }
  return groups;
}

/* ─── Apply gravity in one direction ─── */
function applyGravity(board: Board, dir: Direction): Board {
  const b: Board = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));

  if (dir === 'down') {
    for (let c = 0; c < SIZE; c++) {
      const cells: number[] = [];
      for (let r = 0; r < SIZE; r++)
        if (board[r][c] !== null) cells.push(board[r][c]!);
      for (let i = 0; i < cells.length; i++)
        b[SIZE - cells.length + i][c] = cells[i];
    }
  } else if (dir === 'up') {
    for (let c = 0; c < SIZE; c++) {
      const cells: number[] = [];
      for (let r = 0; r < SIZE; r++)
        if (board[r][c] !== null) cells.push(board[r][c]!);
      for (let i = 0; i < cells.length; i++) b[i][c] = cells[i];
    }
  } else if (dir === 'left') {
    for (let r = 0; r < SIZE; r++) {
      const cells: number[] = [];
      for (let c = 0; c < SIZE; c++)
        if (board[r][c] !== null) cells.push(board[r][c]!);
      for (let i = 0; i < cells.length; i++) b[r][i] = cells[i];
    }
  } else {
    for (let r = 0; r < SIZE; r++) {
      const cells: number[] = [];
      for (let c = 0; c < SIZE; c++)
        if (board[r][c] !== null) cells.push(board[r][c]!);
      for (let i = 0; i < cells.length; i++)
        b[r][SIZE - cells.length + i] = cells[i];
    }
  }
  return b;
}

/* ─── Full move: gravity ➜ pop chains ➜ settle ─── */
function simulateMove(
  board: Board,
  dir: Direction,
): { result: Board; popped: number } {
  let b = applyGravity(board, dir);
  let totalPopped = 0;

  for (let safety = 0; safety < 20; safety++) {
    const groups = findGroups(b);
    if (groups.length === 0) break;
    const toPop = new Set<number>();
    for (const g of groups)
      for (const [r, c] of g) toPop.add(r * SIZE + c);
    totalPopped += toPop.size;
    const nb = cloneBoard(b);
    for (const k of toPop) nb[Math.floor(k / SIZE)][k % SIZE] = null;
    b = applyGravity(nb, dir);
  }
  return { result: b, popped: totalPopped };
}

/* ─── BFS solver (shortest clear sequence) ─── */
function solve(board: Board, maxDepth: number): Direction[] | null {
  if (countTiles(board) === 0) return [];
  const visited = new Set<string>();
  visited.add(boardKey(board));
  const queue: { b: Board; path: Direction[] }[] = [
    { b: board, path: [] },
  ];

  while (queue.length > 0) {
    const { b: cur, path } = queue.shift()!;
    if (path.length >= maxDepth) continue;

    for (const dir of DIRECTIONS) {
      const { result, popped } = simulateMove(cur, dir);
      if (popped === 0) continue;
      if (countTiles(result) === 0) return [...path, dir];
      const key = boardKey(result);
      if (visited.has(key)) continue;
      visited.add(key);
      if (visited.size > 80000) return null;
      queue.push({ b: result, path: [...path, dir] });
    }
  }
  return null;
}

/* ─── Generate a guaranteed-solvable board ─── */
function generateBoard(
  seed: number,
  numColors: number,
  tileCount: number,
): { board: Board; par: number } {
  for (let attempt = 0; attempt < 300; attempt++) {
    const rng = seededRandom(seed + attempt * 7919);

    // Shuffle positions, pick first tileCount
    const positions: number[] = [];
    for (let i = 0; i < SIZE * SIZE; i++) positions.push(i);
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }

    const board: Board = Array.from({ length: SIZE }, () =>
      Array(SIZE).fill(null),
    );
    const count = Math.min(tileCount, SIZE * SIZE);
    for (let i = 0; i < count; i++) {
      const r = Math.floor(positions[i] / SIZE);
      const c = positions[i] % SIZE;
      board[r][c] = Math.floor(rng() * numColors);
    }

    const solution = solve(board, 7);
    if (solution && solution.length >= 2 && solution.length <= 6) {
      return { board, par: solution.length };
    }
  }

  // Fallback (should rarely happen)
  const board: Board = Array.from({ length: SIZE }, () =>
    Array(SIZE).fill(null),
  );
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++) board[r][c] = r < 2 ? 0 : 1;
  return { board, par: 2 };
}

/* ─── Can the player make any move? ─── */
function hasAnyMove(board: Board): boolean {
  return DIRECTIONS.some((d) => simulateMove(board, d).popped > 0);
}

/* ═══════════════════════════════════════════ */
/*                Component                    */
/* ═══════════════════════════════════════════ */
export default function Tumble() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const diff = useMemo(() => getDifficulty(), []);
  const generated = useMemo(
    () => generateBoard(seed, diff.numColors, diff.tileCount),
    [seed, diff.numColors, diff.tileCount],
  );

  const { width: screenWidth } = useWindowDimensions();
  const arrowSize = 44;
  const arrowGap = 8;
  const pad = 32;
  const maxGrid = Math.min(
    screenWidth - (arrowSize + arrowGap) * 2 - pad,
    300,
  );
  const cellSize = Math.floor((maxGrid - (SIZE - 1) * GAP) / SIZE);
  const gridWidth = SIZE * cellSize + (SIZE - 1) * GAP;

  /* state */
  const [board, setBoard] = useState<Board>(() => cloneBoard(generated.board));
  const [flips, setFlips] = useState(0);
  const [moveHistory, setMoveHistory] = useState<Direction[]>([]);
  const [selectedDir, setSelectedDir] = useState<Direction | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [stuck, setStuck] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);

  const remaining = useMemo(() => countTiles(board), [board]);

  const moveLimit = generated.par + 2;

  /* which directions actually move tiles? (no pop-count spoilers) */
  const dirMoves = useMemo(() => {
    if (gameOver || stuck)
      return { up: false, down: false, left: false, right: false } as Record<
        Direction,
        boolean
      >;
    const bk = boardKey(board);
    const moves = {} as Record<Direction, boolean>;
    for (const d of DIRECTIONS)
      moves[d] = boardKey(applyGravity(board, d)) !== bk;
    return moves;
  }, [board, gameOver, stuck]);

  /* preview board (gravity-shifted, NO group highlighting) */
  const previewBoard = useMemo(() => {
    if (!selectedDir) return null;
    return applyGravity(board, selectedDir);
  }, [selectedDir, board]);

  const displayBoard = previewBoard ?? board;
  const isPreview = !!previewBoard;

  /* cell scale animations */
  const cellScales = useRef(
    Array.from({ length: SIZE * SIZE }, () => new Animated.Value(1)),
  ).current;

  /* ─── execute a confirmed move ─── */
  const executeMove = useCallback(
    (dir: Direction) => {
      const afterGravity = applyGravity(board, dir);
      if (boardKey(afterGravity) === boardKey(board)) return; // true no-op

      const { result, popped } = simulateMove(board, dir);
      const newFlips = flips + 1;
      const newHistory = [...moveHistory, dir];
      const limit = generated.par + 2;

      const finish = () => {
        cellScales.forEach((s) => s.setValue(1));
        setBoard(result);
        setFlips(newFlips);
        setMoveHistory(newHistory);
        setSelectedDir(null);
        setAnimating(false);

        const rem = countTiles(result);
        if (rem === 0) {
          setGameOver(true);
          recordGame('tumble', newFlips, generated.par).then((s) => {
            setStats(s);
            setShowStats(true);
          });
        } else if (newFlips >= limit) {
          setStuck(true); // out of moves
        } else if (!hasAnyMove(result)) {
          setStuck(true);
        }
      };

      if (popped > 0) {
        // Animate popping tiles
        const groups = findGroups(afterGravity);
        const popIndices: number[] = [];
        for (const g of groups)
          for (const [r, c] of g) popIndices.push(r * SIZE + c);

        setAnimating(true);
        Animated.parallel(
          popIndices.map((idx) =>
            Animated.sequence([
              Animated.timing(cellScales[idx], {
                toValue: 1.3,
                duration: 80,
                useNativeDriver: true,
              }),
              Animated.timing(cellScales[idx], {
                toValue: 0,
                duration: 120,
                useNativeDriver: true,
              }),
            ]),
          ),
        ).start(finish);
      } else {
        // No pops — gravity rearranged but nothing matched. Still costs a flip.
        finish();
      }
    },
    [board, flips, moveHistory, cellScales, generated.par],
  );

  /* ─── direction button handler ─── */
  const handleDirPress = useCallback(
    (dir: Direction) => {
      if (gameOver || stuck || animating) return;
      if (!dirMoves[dir]) return;
      if (selectedDir === dir) {
        executeMove(dir);
      } else {
        setSelectedDir(dir);
      }
    },
    [gameOver, stuck, animating, dirMoves, selectedDir, executeMove],
  );

  /* ─── restart ─── */
  const handleRestart = useCallback(() => {
    setBoard(cloneBoard(generated.board));
    setFlips(0);
    setMoveHistory([]);
    setSelectedDir(null);
    setGameOver(false);
    setStuck(false);
    setAnimating(false);
    cellScales.forEach((s) => s.setValue(1));
  }, [generated.board, cellScales]);

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('tumble');
    setStats(s);
    setShowStats(true);
  }, []);

  /* ─── share text ─── */
  function buildShareText(): string {
    const dirs = moveHistory.map((d) => DIR_EMOJI[d]).join('');
    const rows: string[] = [];
    for (let r = 0; r < SIZE; r++) {
      let row = '';
      for (let c = 0; c < SIZE; c++) {
        const v = generated.board[r][c];
        row += v !== null ? EMOJI[v] : '\u2B1C';
      }
      rows.push(row);
    }
    const under = flips <= generated.par;
    return [
      `Tumble Day #${puzzleDay} \uD83C\uDFB2`,
      rows.join('\n'),
      `${dirs} (${flips} flips)`,
      under
        ? flips < generated.par
          ? '\u2B50 Under par!'
          : '\u2B50 Par!'
        : `Cleared in ${flips} (par ${generated.par})`,
    ].join('\n');
  }

  /* ─── arrow button renderer ─── */
  function ArrowBtn({ dir }: { dir: Direction }) {
    const disabled = !dirMoves[dir];
    const selected = selectedDir === dir;
    return (
      <Pressable
        onPress={() => handleDirPress(dir)}
        style={[
          styles.arrowBtn,
          { width: arrowSize, height: arrowSize },
          disabled && styles.arrowBtnDisabled,
          selected && styles.arrowBtnSelected,
        ]}
      >
        <Text style={styles.arrowEmoji}>{DIR_EMOJI[dir]}</Text>
      </Pressable>
    );
  }

  /* ─── render ─── */
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tumble</Text>
        <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
        <Pressable onPress={handleShowStats}>
          <Text style={styles.statsIcon}>{'\uD83D\uDCCA'}</Text>
        </Pressable>
      </View>

      <Text style={styles.subtitle}>
        Flip gravity to match 3+ and clear the board!
      </Text>

      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Moves</Text>
          <Text
            style={[
              styles.infoValue,
              flips >= moveLimit && styles.infoValueBad,
            ]}
          >
            {flips}/{moveLimit}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Left</Text>
          <Text
            style={[
              styles.infoValue,
              gameOver && styles.infoValueGood,
            ]}
          >
            {remaining}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Par</Text>
          <Text style={styles.infoPar}>{generated.par} flips</Text>
        </View>
      </View>

      {/* Grid area with directional arrows */}
      <View style={styles.gridArea}>
        <ArrowBtn dir="up" />

        <View style={styles.middleRow}>
          <ArrowBtn dir="left" />

          <View style={[styles.grid, { width: gridWidth, height: gridWidth }]}>
            {Array.from({ length: SIZE }).map((_, r) => (
              <View key={r} style={styles.gridRow}>
                {Array.from({ length: SIZE }).map((_, c) => {
                  const color = displayBoard[r][c];
                  const idx = r * SIZE + c;

                  if (color === null) {
                    return (
                      <View
                        key={c}
                        style={[
                          styles.emptyCell,
                          { width: cellSize, height: cellSize },
                        ]}
                      />
                    );
                  }

                  return (
                    <Animated.View
                      key={c}
                      style={{ transform: [{ scale: cellScales[idx] }] }}
                    >
                      <View
                        style={[
                          styles.cell,
                          {
                            width: cellSize,
                            height: cellSize,
                            backgroundColor: COLORS[color],
                            borderColor: isPreview
                              ? '#888'
                              : BORDERS[color],
                          },
                        ]}
                      />
                    </Animated.View>
                  );
                })}
              </View>
            ))}
          </View>

          <ArrowBtn dir="right" />
        </View>

        <ArrowBtn dir="down" />
      </View>

      {/* Preview hint */}
      {selectedDir && !gameOver && !stuck && (
        <View style={styles.previewHint}>
          <Text style={styles.previewText}>
            {DIR_EMOJI[selectedDir]} Tap again to confirm!
          </Text>
        </View>
      )}

      {/* Restart */}
      {!gameOver && (flips > 0 || stuck) && (
        <Pressable style={styles.restartBtn} onPress={handleRestart}>
          <Text style={styles.restartText}>
            {stuck
              ? flips >= moveLimit
                ? 'Out of moves! Restart'
                : 'Stuck! Restart'
              : 'Restart'}
          </Text>
        </Pressable>
      )}

      <CelebrationBurst show={gameOver && remaining === 0} />

      {gameOver && (
        <View style={styles.winMessage}>
          <Text style={styles.winEmoji}>
            {flips <= generated.par ? '\u2B50' : '\uD83C\uDFB2'}
          </Text>
          <Text style={styles.winText}>
            {flips <= generated.par
              ? `Cleared in ${flips} flips \u2014 ${flips < generated.par ? 'under' : 'at'} par!`
              : `Cleared in ${flips} flips (par ${generated.par})`}
          </Text>
          <ShareButton text={buildShareText()} />
        </View>
      )}

      <View style={styles.howTo}>
        <Text style={styles.howToTitle}>How to play</Text>
        <Text style={styles.howToText}>
          Tap a direction to preview where tiles slide. Groups of 3+ matching
          colours pop! Tap the same direction again to confirm.
          {'\n\n'}
          Clear all tiles within {moveLimit} moves. Par: {generated.par}{' '}
          flips.
        </Text>
      </View>

      {showStats && stats && (
        <StatsModal stats={stats} onClose={() => setShowStats(false)} />
      )}
    </ScrollView>
  );
}

/* ─── Styles ─── */
const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    backgroundColor: '#121213',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 2,
  },
  dayBadge: { color: '#6aaa64', fontSize: 13, fontWeight: '600' },
  statsIcon: { fontSize: 24 },
  subtitle: {
    fontSize: 13,
    color: '#818384',
    marginTop: 2,
    marginBottom: 12,
    textAlign: 'center',
    maxWidth: 300,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 12,
    alignItems: 'baseline',
  },
  infoItem: { alignItems: 'center' },
  infoLabel: { color: '#818384', fontSize: 12 },
  infoValue: { color: '#ffffff', fontSize: 24, fontWeight: '800' },
  infoValueGood: { color: '#2ecc71' },
  infoValueBad: { color: '#e74c3c' },
  infoPar: { color: '#818384', fontSize: 14, marginTop: 2 },
  gridArea: { alignItems: 'center', gap: 8 },
  middleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  grid: { gap: GAP },
  gridRow: { flexDirection: 'row', gap: GAP },
  cell: { borderRadius: 8, borderWidth: 2 },
  emptyCell: {
    borderRadius: 8,
    backgroundColor: '#1a1a1b',
    borderWidth: 1,
    borderColor: '#2a2a2c',
  },
  arrowBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2c2c2e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4a4a4c',
  },
  arrowBtnDisabled: { opacity: 0.3 },
  arrowBtnSelected: {
    backgroundColor: '#4a4a1c',
    borderColor: '#f1c40f',
  },
  arrowEmoji: { fontSize: 18 },
  previewHint: {
    marginTop: 10,
    backgroundColor: '#2c2c2e',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  previewText: {
    color: '#f1c40f',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  restartBtn: {
    marginTop: 12,
    backgroundColor: '#3a3a3c',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 16,
  },
  restartText: { color: '#e74c3c', fontSize: 14, fontWeight: '600' },
  winMessage: { alignItems: 'center', marginTop: 20 },
  winEmoji: { fontSize: 48 },
  winText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
  },
  howTo: { marginTop: 28, paddingHorizontal: 12, maxWidth: 360 },
  howToTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  howToText: { color: '#818384', fontSize: 13, lineHeight: 20 },
});
