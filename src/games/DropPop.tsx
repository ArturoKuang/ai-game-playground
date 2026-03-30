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
import { getDailySeed, seededRandom, getPuzzleDay } from '../utils/seed';
import { loadStats, recordGame, type Stats } from '../utils/stats';

/* ─── Constants ─── */
const ROWS = 8;
const COLS = 6;
const NUM_COLORS = 4;
const GAP = 2;
const PAR = 4; // tiles remaining

const COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f'];
const COLOR_BORDERS = ['#c0392b', '#2980b9', '#27ae60', '#f39c12'];
const COLOR_EMOJI = ['\ud83d\udfe5', '\ud83d\udfe6', '\ud83d\udfe9', '\ud83d\udfe8'];

type Board = (number | null)[][];

/* ─── Board generation ─── */
function generateBoard(seed: number): Board {
  const rng = seededRandom(seed);
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => Math.floor(rng() * NUM_COLORS))
  );
}

/* ─── Find connected group via flood fill ─── */
function findGroup(board: Board, startR: number, startC: number): [number, number][] {
  const color = board[startR][startC];
  if (color === null) return [];

  const visited = new Set<number>();
  const group: [number, number][] = [];
  const queue: [number, number][] = [[startR, startC]];
  visited.add(startR * COLS + startC);

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    group.push([r, c]);
    for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const nr = r + dr;
      const nc = c + dc;
      const key = nr * COLS + nc;
      if (
        nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS &&
        !visited.has(key) && board[nr][nc] === color
      ) {
        visited.add(key);
        queue.push([nr, nc]);
      }
    }
  }
  return group;
}

/* ─── Apply gravity: cells fall down within each column ─── */
function applyGravity(board: Board): Board {
  const newBoard: Board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  for (let c = 0; c < COLS; c++) {
    const cells: number[] = [];
    for (let r = 0; r < ROWS; r++) {
      if (board[r][c] !== null) cells.push(board[r][c]!);
    }
    for (let i = 0; i < cells.length; i++) {
      newBoard[ROWS - cells.length + i][c] = cells[i];
    }
  }
  return newBoard;
}

/* ─── Compact columns: shift non-empty columns left ─── */
function compactColumns(board: Board): Board {
  const nonEmpty: number[] = [];
  for (let c = 0; c < COLS; c++) {
    let hasCell = false;
    for (let r = 0; r < ROWS; r++) {
      if (board[r][c] !== null) { hasCell = true; break; }
    }
    if (hasCell) nonEmpty.push(c);
  }

  const newBoard: Board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  for (let nc = 0; nc < nonEmpty.length; nc++) {
    const oc = nonEmpty[nc];
    for (let r = 0; r < ROWS; r++) {
      newBoard[r][nc] = board[r][oc];
    }
  }
  return newBoard;
}

/* ─── Check if any group of 2+ exists ─── */
function hasValidMoves(board: Board): boolean {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c] === null) continue;
      if (c + 1 < COLS && board[r][c] === board[r][c + 1]) return true;
      if (r + 1 < ROWS && board[r][c] === board[r + 1][c]) return true;
    }
  }
  return false;
}

function countRemaining(board: Board): number {
  let count = 0;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (board[r][c] !== null) count++;
  return count;
}

/* ─── Component ─── */
export default function DropPop() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const initialBoard = useMemo(() => generateBoard(seed), [seed]);

  const { width: screenWidth } = useWindowDimensions();
  const maxWidth = Math.min(screenWidth - 48, 360);
  const cellSize = Math.floor((maxWidth - (COLS - 1) * GAP) / COLS);
  const gridWidth = COLS * cellSize + (COLS - 1) * GAP;
  const gridHeight = ROWS * cellSize + (ROWS - 1) * GAP;

  const [board, setBoard] = useState<Board>(() =>
    initialBoard.map((row) => [...row])
  );
  const [pops, setPops] = useState(0);
  const [highlighted, setHighlighted] = useState<Set<number>>(new Set());
  const [gameOver, setGameOver] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [boardHistory, setBoardHistory] = useState<Board[]>([]);
  const [popsHistory, setPopsHistory] = useState<number[]>([]);

  const remaining = useMemo(() => countRemaining(board), [board]);
  const noMoves = useMemo(() => !hasValidMoves(board), [board]);

  // Scale animations per cell
  const cellScales = useRef(
    Array.from({ length: ROWS * COLS }, () => new Animated.Value(1))
  ).current;

  const handleTap = useCallback(
    (r: number, c: number) => {
      if (gameOver || board[r][c] === null) return;

      const group = findGroup(board, r, c);
      if (group.length < 2) {
        // Shake the cell — can't pop singles
        const idx = r * COLS + c;
        Animated.sequence([
          Animated.timing(cellScales[idx], {
            toValue: 1.15,
            duration: 60,
            useNativeDriver: true,
          }),
          Animated.spring(cellScales[idx], {
            toValue: 1,
            friction: 3,
            tension: 200,
            useNativeDriver: true,
          }),
        ]).start();
        return;
      }

      // Highlight group briefly, then pop
      const groupKeys = new Set(group.map(([gr, gc]) => gr * COLS + gc));
      setHighlighted(groupKeys);

      // Bounce animation on group cells
      const bounceAnims = group.map(([gr, gc]) => {
        const idx = gr * COLS + gc;
        return Animated.sequence([
          Animated.timing(cellScales[idx], {
            toValue: 0.6,
            duration: 80,
            useNativeDriver: true,
          }),
          Animated.timing(cellScales[idx], {
            toValue: 1,
            duration: 60,
            useNativeDriver: true,
          }),
        ]);
      });

      Animated.parallel(bounceAnims).start(() => {
        // Save history for undo
        setBoardHistory((h) => [...h, board.map((row) => [...row])]);
        setPopsHistory((h) => [...h, pops]);

        // Pop: remove cells, gravity, compact
        const newBoard = board.map((row) => [...row]);
        for (const [gr, gc] of group) {
          newBoard[gr][gc] = null;
        }
        const afterGravity = applyGravity(newBoard);
        const afterCompact = compactColumns(afterGravity);

        setBoard(afterCompact);
        setPops((p) => p + 1);
        setHighlighted(new Set());

        // Check game over
        if (!hasValidMoves(afterCompact)) {
          const rem = countRemaining(afterCompact);
          setGameOver(true);
          recordGame('droppop', rem, PAR).then((s) => {
            setStats(s);
            setShowStats(true);
          });
        }
      });
    },
    [board, gameOver, cellScales, pops]
  );

  const handleUndo = useCallback(() => {
    if (boardHistory.length === 0 || gameOver) return;
    setBoard(boardHistory[boardHistory.length - 1]);
    setPops(popsHistory[popsHistory.length - 1]);
    setBoardHistory((h) => h.slice(0, -1));
    setPopsHistory((h) => h.slice(0, -1));
  }, [boardHistory, popsHistory, gameOver]);

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('droppop');
    setStats(s);
    setShowStats(true);
  }, []);

  function buildShareText(): string {
    const under = remaining <= PAR;
    const popIcons = '\ud83d\udca5'.repeat(Math.min(pops, 20));
    return `DropPop Day #${puzzleDay} \ud83c\udfae\n${remaining} tiles left (par: ${PAR})\n${popIcons}\n${
      under
        ? remaining === 0
          ? '\u2b50 Perfect clear!'
          : '\u2b50 Under par!'
        : `Cleared ${48 - remaining}/48`
    }`;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>DropPop</Text>
        <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
        <Pressable onPress={handleShowStats}>
          <Text style={styles.statsIcon}>{'\ud83d\udcca'}</Text>
        </Pressable>
      </View>
      <Text style={styles.subtitle}>
        Pop groups of 2+ matching colors. Clear the board!
      </Text>

      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Left</Text>
          <Text
            style={[
              styles.infoValue,
              gameOver && remaining <= PAR && styles.infoValueGood,
              gameOver && remaining > PAR && styles.infoValueOver,
            ]}
          >
            {remaining}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Pops</Text>
          <Text style={styles.infoValue}>{pops}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Par</Text>
          <Text style={styles.infoPar}>{'\u2264'}{PAR} left</Text>
        </View>
      </View>

      {/* Grid */}
      <View style={[styles.grid, { width: gridWidth, height: gridHeight }]}>
        {Array.from({ length: ROWS }).map((_, r) => (
          <View key={r} style={styles.gridRow}>
            {Array.from({ length: COLS }).map((_, c) => {
              const color = board[r][c];
              const idx = r * COLS + c;
              const isHighlighted = highlighted.has(idx);

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
                  <Pressable
                    onPress={() => handleTap(r, c)}
                    style={[
                      styles.cell,
                      {
                        width: cellSize,
                        height: cellSize,
                        backgroundColor: isHighlighted
                          ? '#ffffff'
                          : COLORS[color],
                        borderColor: isHighlighted
                          ? '#ffffff'
                          : COLOR_BORDERS[color],
                      },
                    ]}
                  />
                </Animated.View>
              );
            })}
          </View>
        ))}
      </View>

      {/* Undo */}
      {!gameOver && boardHistory.length > 0 && (
        <Pressable style={styles.undoBtn} onPress={handleUndo}>
          <Text style={styles.undoBtnText}>Undo</Text>
        </Pressable>
      )}

      {/* Game over / no moves */}
      {(gameOver || noMoves) && !gameOver && (
        <View style={styles.winMessage}>
          <Text style={styles.winEmoji}>{'\ud83d\udea7'}</Text>
          <Text style={styles.winText}>No more moves!</Text>
        </View>
      )}

      <CelebrationBurst show={gameOver && remaining <= PAR} />

      {gameOver && (
        <View style={styles.winMessage}>
          <Text style={styles.winEmoji}>
            {remaining === 0
              ? '\ud83c\udf1f'
              : remaining <= PAR
                ? '\u2b50'
                : '\ud83c\udfae'}
          </Text>
          <Text style={styles.winText}>
            {remaining === 0
              ? 'Perfect clear!'
              : remaining <= PAR
                ? `Under par! ${remaining} left`
                : `${remaining} tiles remaining (par: ${PAR})`}
          </Text>
          <ShareButton text={buildShareText()} />
        </View>
      )}

      <View style={styles.howTo}>
        <Text style={styles.howToTitle}>How to play</Text>
        <Text style={styles.howToText}>
          Tap a group of 2 or more connected same-colored tiles to pop them.
          Tiles above fall down to fill gaps. Empty columns compact left.
          {'\n\n'}
          Clear as many tiles as possible. Par: {PAR} or fewer remaining.
        </Text>
      </View>

      {showStats && stats && (
        <StatsModal stats={stats} onClose={() => setShowStats(false)} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    backgroundColor: '#121213',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
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
  infoItem: {
    alignItems: 'center',
  },
  infoLabel: { color: '#818384', fontSize: 12 },
  infoValue: { color: '#ffffff', fontSize: 24, fontWeight: '800' },
  infoValueGood: { color: '#2ecc71' },
  infoValueOver: { color: '#e67e22' },
  infoPar: { color: '#818384', fontSize: 14, marginTop: 2 },
  grid: {
    gap: GAP,
  },
  gridRow: {
    flexDirection: 'row',
    gap: GAP,
  },
  cell: {
    borderRadius: 8,
    borderWidth: 2,
  },
  emptyCell: {
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  undoBtn: {
    backgroundColor: '#3a3a3c',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 16,
  },
  undoBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  winMessage: {
    alignItems: 'center',
    marginTop: 20,
  },
  winEmoji: { fontSize: 48 },
  winText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
  },
  howTo: {
    marginTop: 28,
    paddingHorizontal: 12,
    maxWidth: 360,
  },
  howToTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  howToText: {
    color: '#818384',
    fontSize: 13,
    lineHeight: 20,
  },
});
