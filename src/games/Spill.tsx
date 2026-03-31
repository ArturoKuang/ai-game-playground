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

/* ─── Constants ─── */
const GRID = 4;
const CELLS = GRID * GRID;
const OVERFLOW = 4;
const GAP = 4;
const FILL_COLORS = ['#2c2c2e', '#1a5276', '#2471a3', '#5dade2', '#f39c12'];
const FILL_BORDERS = ['#3a3a3c', '#1f618d', '#2980b9', '#3498db', '#e67e22'];

/* ─── Helpers ─── */
function neighbors(idx: number): number[] {
  const r = Math.floor(idx / GRID);
  const c = idx % GRID;
  const res: number[] = [];
  if (r > 0) res.push((r - 1) * GRID + c);
  if (r < GRID - 1) res.push((r + 1) * GRID + c);
  if (c > 0) res.push(r * GRID + c - 1);
  if (c < GRID - 1) res.push(r * GRID + c + 1);
  return res;
}

/* ─── Simulate overflow cascades ─── */
function simulate(board: number[]): { result: number[]; overflows: number } {
  const b = [...board];
  let overflows = 0;
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < CELLS; i++) {
      if (b[i] >= OVERFLOW) {
        b[i] -= OVERFLOW;
        overflows++;
        for (const nb of neighbors(i)) {
          b[nb]++;
        }
        changed = true;
      }
    }
  }
  return { result: b, overflows };
}

function isSolved(board: number[]): boolean {
  return board.every((v) => v === 0);
}

/* ─── Difficulty ─── */
function getDifficulty() {
  const d = getDayDifficulty();
  return {
    fillTaps: 4 + d * 3, // Mon:7, Fri:19
  };
}

/* ─── Generate puzzle ─── */
function generatePuzzle(seed: number) {
  const diff = getDifficulty();

  for (let attempt = 0; attempt < 100; attempt++) {
    const rng = seededRandom(seed + attempt * 997);
    let board = Array(CELLS).fill(0);

    // Apply random taps and let cascades settle
    const taps: number[] = [];
    for (let i = 0; i < diff.fillTaps; i++) {
      const cell = Math.floor(rng() * CELLS);
      board[cell]++;
      taps.push(cell);
      const { result } = simulate(board);
      board = result;
    }

    // Board should NOT be already solved
    if (isSolved(board)) continue;

    // Ensure board has interesting state (some cells at 2-3)
    const maxFill = Math.max(...board);
    if (maxFill < 2) continue;

    // Count how many taps needed to clear (BFS on tap counts)
    const par = solvePar(board);
    if (par >= 2 && par <= 15) {
      return { initialBoard: board, par };
    }
  }

  // Fallback
  const board = [0, 1, 2, 3, 1, 0, 3, 2, 2, 3, 0, 1, 3, 2, 1, 0];
  return { initialBoard: board, par: 4 };
}

/* ─── BFS solver: find minimum taps to clear board ─── */
function boardKey(b: number[]): string {
  return b.join(',');
}

function solvePar(board: number[]): number {
  if (isSolved(board)) return 0;
  const startKey = boardKey(board);
  const visited = new Set<string>([startKey]);
  let frontier: number[][] = [board];

  for (let depth = 1; depth <= 12; depth++) {
    const next: number[][] = [];
    for (const b of frontier) {
      for (let cell = 0; cell < CELLS; cell++) {
        const nb = [...b];
        nb[cell]++;
        const { result } = simulate(nb);
        if (isSolved(result)) return depth;
        const key = boardKey(result);
        if (!visited.has(key)) {
          visited.add(key);
          next.push(result);
        }
      }
    }
    frontier = next;
    if (frontier.length === 0) break;
    // Safety: limit BFS size
    if (visited.size > 50000) break;
  }
  return 5; // fallback
}

/* ═══════════════════════════════════════════ */
/*                Component                    */
/* ═══════════════════════════════════════════ */
export default function Spill() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const { initialBoard, par } = useMemo(() => generatePuzzle(seed), [seed]);

  const moveLimit = par + Math.max(4, par);
  const [board, setBoard] = useState(() => [...initialBoard]);
  const [taps, setTaps] = useState(0);
  const [tapHistory, setTapHistory] = useState<number[]>([]);
  const [boardHistory, setBoardHistory] = useState<number[][]>(() => [
    [...initialBoard],
  ]);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStatsData] = useState<Stats | null>(null);
  const [lastOverflows, setLastOverflows] = useState(0);
  const [gameRecorded, setGameRecorded] = useState(false);

  const solved = isSolved(board);
  const failed = !solved && taps >= moveLimit;
  const gameOver = solved || failed;
  const { width: screenWidth } = useWindowDimensions();
  const maxWidth = Math.min(screenWidth - 48, 320);
  const cellSize = Math.floor(maxWidth / GRID) - GAP;

  /* ── Animations ── */
  const cellScales = useRef(
    Array.from({ length: CELLS }, () => new Animated.Value(1)),
  ).current;

  const bounceCell = useCallback(
    (idx: number) => {
      Animated.sequence([
        Animated.timing(cellScales[idx], {
          toValue: 1.2,
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
    },
    [cellScales],
  );

  const shakeCell = useCallback(
    (idx: number) => {
      Animated.sequence([
        Animated.timing(cellScales[idx], {
          toValue: 1.3,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.spring(cellScales[idx], {
          toValue: 1,
          friction: 2,
          tension: 150,
          useNativeDriver: true,
        }),
      ]).start();
    },
    [cellScales],
  );

  /* ── Tap handler ── */
  const handleTap = useCallback(
    (idx: number) => {
      if (gameOver) return;
      bounceCell(idx);

      const next = [...board];
      next[idx]++;
      const { result, overflows } = simulate(next);

      // Animate overflow cells
      if (overflows > 0) {
        for (let i = 0; i < CELLS; i++) {
          if (result[i] !== board[i] && i !== idx) {
            shakeCell(i);
          }
        }
      }

      const nextTaps = taps + 1;
      setBoard(result);
      setTaps(nextTaps);
      setTapHistory((h) => [...h, idx]);
      setBoardHistory((h) => [...h, result]);
      setLastOverflows(overflows);

      if (isSolved(result) && !gameRecorded) {
        setGameRecorded(true);
        recordGame('spill', nextTaps, par).then((s) => {
          setStatsData(s);
          setShowStats(true);
        });
      } else if (nextTaps >= moveLimit && !isSolved(result) && !gameRecorded) {
        setGameRecorded(true);
        recordGame('spill', moveLimit + 1, par).then((s) => {
          setStatsData(s);
          setShowStats(true);
        });
      }
    },
    [board, gameOver, taps, par, moveLimit, gameRecorded, bounceCell, shakeCell],
  );

  /* ── Undo ── */
  const handleUndo = useCallback(() => {
    if (boardHistory.length <= 1 || gameOver) return;
    const prev = boardHistory[boardHistory.length - 2];
    setBoard([...prev]);
    setTaps((t) => t - 1);
    setTapHistory((h) => h.slice(0, -1));
    setBoardHistory((h) => h.slice(0, -1));
    setLastOverflows(0);
  }, [boardHistory, gameOver]);

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('spill');
    setStatsData(s);
    setShowStats(true);
  }, []);

  /* ── Share text ── */
  function buildShareText() {
    const under = taps <= par;
    const tapCounts = Array(CELLS).fill(0);
    for (const c of tapHistory) tapCounts[c]++;
    const rows: string[] = [];
    for (let r = 0; r < GRID; r++) {
      let row = '';
      for (let c = 0; c < GRID; c++) {
        const count = tapCounts[r * GRID + c];
        row +=
          count === 0
            ? '\u2b1b'
            : count === 1
              ? '\ud83d\udfe6'
              : count === 2
                ? '\ud83d\udfe8'
                : '\ud83d\udfe7';
      }
      rows.push(row);
    }
    return [
      `Spill Day #${puzzleDay} \ud83d\udca7`,
      `${taps}/${par} taps`,
      ...rows,
      under ? '\u2b50 All cleared!' : `Cleared in ${taps} taps`,
    ].join('\n');
  }

  const totalFill = board.reduce((s, v) => s + v, 0);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Spill</Text>
        <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
        <Pressable onPress={handleShowStats}>
          <Text style={styles.statsIcon}>{'\ud83d\udcca'}</Text>
        </Pressable>
      </View>
      <Text style={styles.subtitle}>
        Tap to add 1. At 4, it overflows to neighbors. Clear the board.
      </Text>

      <View style={styles.tapBar}>
        <Text style={styles.tapLabel}>Taps</Text>
        <Text
          style={[
            styles.tapCount,
            solved && taps <= par && styles.tapCountGood,
          ]}
        >
          {taps}
        </Text>
        <Text style={styles.tapPar}>Par: {par}</Text>
        <Text
          style={[
            styles.movesLeft,
            moveLimit - taps <= 3 && !gameOver && styles.movesLeftDanger,
          ]}
        >
          {moveLimit - taps} left
        </Text>
        {lastOverflows > 0 && !gameOver && (
          <Text style={styles.cascadeText}>
            {'\ud83d\udca5'} {lastOverflows}
          </Text>
        )}
      </View>

      {/* Grid */}
      <View style={styles.grid}>
        {Array.from({ length: GRID }, (_, r) => (
          <View key={r} style={styles.gridRow}>
            {Array.from({ length: GRID }, (_, c) => {
              const idx = r * GRID + c;
              const val = board[idx];
              return (
                <Animated.View
                  key={c}
                  style={{ transform: [{ scale: cellScales[idx] }] }}
                >
                  <Pressable
                    onPress={() => handleTap(idx)}
                    style={[
                      styles.cell,
                      {
                        width: cellSize,
                        height: cellSize,
                        backgroundColor:
                          FILL_COLORS[Math.min(val, FILL_COLORS.length - 1)],
                        borderColor:
                          FILL_BORDERS[Math.min(val, FILL_BORDERS.length - 1)],
                      },
                    ]}
                  >
                    {val > 0 && (
                      <Text style={styles.cellVal}>{val}</Text>
                    )}
                    {val === 3 && (
                      <View style={styles.criticalGlow} />
                    )}
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        ))}
      </View>

      {/* Undo */}
      {!gameOver && taps > 0 && (
        <Pressable style={styles.undoBtn} onPress={handleUndo}>
          <Text style={styles.undoText}>Undo</Text>
        </Pressable>
      )}

      <CelebrationBurst show={solved && taps <= par} />

      {solved && (
        <View style={styles.endMsg}>
          <Text style={styles.endEmoji}>
            {taps <= par ? '\ud83c\udf1f' : '\ud83d\udca7'}
          </Text>
          <Text style={styles.endText}>
            {taps <= par
              ? `Under par! ${taps} taps`
              : `Cleared in ${taps} taps`}
          </Text>
          <ShareButton text={buildShareText()} />
        </View>
      )}

      {failed && (
        <View style={styles.endMsg}>
          <Text style={styles.endEmoji}>{'\ud83d\udca7'}</Text>
          <Text style={styles.endText}>Out of taps!</Text>
          <Text style={styles.endSub}>
            {totalFill} liquid remaining
          </Text>
        </View>
      )}

      <View style={styles.howTo}>
        <Text style={styles.howToTitle}>How to play</Text>
        <Text style={styles.howToText}>
          Each cell holds liquid (0-3). Tap to add 1. When a cell reaches 4, it
          overflows — emptying itself and adding 1 to each neighbor.{'\n\n'}
          Overflows chain! One tap can cascade across the board.{'\n'}
          Clear every cell to 0 within {moveLimit} taps. Par: {par}.
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
  tapBar: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 12,
  },
  tapLabel: { color: '#818384', fontSize: 14 },
  tapCount: { color: '#ffffff', fontSize: 28, fontWeight: '800' },
  tapCountGood: { color: '#2ecc71' },
  tapPar: { color: '#818384', fontSize: 14 },
  movesLeft: { color: '#818384', fontSize: 14, marginLeft: 8 },
  movesLeftDanger: { color: '#e74c3c' },
  cascadeText: { color: '#f39c12', fontSize: 14, fontWeight: '600' },
  grid: { gap: GAP },
  gridRow: { flexDirection: 'row', gap: GAP },
  cell: {
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellVal: { color: '#ffffff', fontSize: 24, fontWeight: '800' },
  criticalGlow: {
    position: 'absolute',
    width: '80%',
    height: '80%',
    borderRadius: 100,
    backgroundColor: 'rgba(243, 156, 18, 0.2)',
  },
  undoBtn: {
    backgroundColor: '#3a3a3c',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 12,
  },
  undoText: { color: '#ffffff', fontWeight: '600', fontSize: 14 },
  endMsg: { alignItems: 'center', marginTop: 20 },
  endSub: { color: '#818384', fontSize: 13, marginTop: 4 },
  endEmoji: { fontSize: 48 },
  endText: {
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
