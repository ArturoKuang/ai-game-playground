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
const SIZE = 5;
const GAP = 4;
const VAL_COLORS = [
  '#2a2a2c', // 0: dead
  '#4a4a4c', // 1
  '#546e7a', // 2
  '#607d8b', // 3
  '#78909c', // 4
  '#3498db', // 5
  '#2ecc71', // 6
  '#f1c40f', // 7
  '#e67e22', // 8
  '#e74c3c', // 9
];

/* ─── Difficulty ─── */
function getDifficulty() {
  const d = getDayDifficulty(); // 1 (Mon) to 5 (Fri)
  return {
    maxVal: 4 + d,            // Mon: 5, Fri: 9
    pathLen: 3 + d,            // Mon: 4, Fri: 8
  };
}

/* ─── Generate grid ─── */
function generateGrid(rng: () => number, maxVal: number): number[][] {
  return Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () => 1 + Math.floor(rng() * maxVal)),
  );
}

/* ─── Apply collection: reduce row & col by 1 ─── */
function applyCollect(grid: number[][], r: number, c: number): number[][] {
  const g = grid.map((row) => [...row]);
  g[r][c] = -1; // mark collected
  for (let j = 0; j < SIZE; j++) {
    if (j !== c && g[r][j] > 0) g[r][j]--;
  }
  for (let i = 0; i < SIZE; i++) {
    if (i !== r && g[i][c] > 0) g[i][c]--;
  }
  return g;
}

/* ─── Check adjacency ─── */
function isAdj(r1: number, c1: number, r2: number, c2: number): boolean {
  return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
}

/* ─── Solver: DFS with pruning ─── */
function solvePar(
  initialGrid: number[][],
  pathLen: number,
): number {
  let best = 0;

  function dfs(
    grid: number[][],
    r: number,
    c: number,
    score: number,
    stepsLeft: number,
  ) {
    if (stepsLeft === 0) {
      best = Math.max(best, score);
      return;
    }

    // Upper bound: sum of stepsLeft highest remaining values
    const remaining: number[] = [];
    for (let i = 0; i < SIZE; i++) {
      for (let j = 0; j < SIZE; j++) {
        if (grid[i][j] > 0) remaining.push(grid[i][j]);
      }
    }
    remaining.sort((a, b) => b - a);
    let ub = score;
    for (let i = 0; i < Math.min(stepsLeft, remaining.length); i++) ub += remaining[i];
    if (ub <= best) return;

    // Try adjacent uncollected cells
    for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) continue;
      if (grid[nr][nc] <= 0) continue; // collected or zero

      const val = grid[nr][nc];
      const nextGrid = applyCollect(grid, nr, nc);
      dfs(nextGrid, nr, nc, score + val, stepsLeft - 1);
    }
  }

  // Try every starting cell
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const val = initialGrid[r][c];
      const nextGrid = applyCollect(initialGrid, r, c);
      dfs(nextGrid, r, c, val, pathLen - 1);
    }
  }

  return best;
}

/* ═══════════════════════════════════════════ */
/*                Component                    */
/* ═══════════════════════════════════════════ */
export default function Reap() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);

  const puzzle = useMemo(() => {
    const diff = getDifficulty();
    const rng = seededRandom(seed);
    const grid = generateGrid(rng, diff.maxVal);
    const par = solvePar(grid, diff.pathLen);
    return { grid, par, pathLen: diff.pathLen };
  }, [seed]);

  const { grid: initialGrid, par, pathLen } = puzzle;

  /* ── State ── */
  const [grid, setGrid] = useState(() => initialGrid.map((r) => [...r]));
  const [path, setPath] = useState<[number, number][]>([]);
  const [score, setScore] = useState(0);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStatsData] = useState<Stats | null>(null);
  const [gameRecorded, setGameRecorded] = useState(false);

  const stepsLeft = pathLen - path.length;
  const done = stepsLeft === 0;
  // Also done if stuck (no adjacent uncollected)
  const lastCell = path.length > 0 ? path[path.length - 1] : null;
  const stuck =
    !done &&
    lastCell !== null &&
    [[0, 1], [0, -1], [1, 0], [-1, 0]].every(([dr, dc]) => {
      const nr = lastCell[0] + dr;
      const nc = lastCell[1] + dc;
      return (
        nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE || grid[nr][nc] <= 0
      );
    });
  const gameOver = done || stuck;

  /* ── Layout ── */
  const { width: screenWidth } = useWindowDimensions();
  const maxWidth = Math.min(screenWidth - 48, 340);
  const cellSize = Math.floor(maxWidth / SIZE) - GAP;

  /* ── Animations ── */
  const cellScales = useRef(
    Array.from({ length: SIZE * SIZE }, () => new Animated.Value(1)),
  ).current;

  const bounceCell = useCallback(
    (r: number, c: number) => {
      const idx = r * SIZE + c;
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
    },
    [cellScales],
  );

  const dimCell = useCallback(
    (r: number, c: number) => {
      const idx = r * SIZE + c;
      Animated.sequence([
        Animated.timing(cellScales[idx], {
          toValue: 0.92,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.spring(cellScales[idx], {
          toValue: 1,
          friction: 4,
          tension: 180,
          useNativeDriver: true,
        }),
      ]).start();
    },
    [cellScales],
  );

  /* ── Tap handler ── */
  const handleTap = useCallback(
    (r: number, c: number) => {
      if (gameOver) return;
      if (grid[r][c] <= 0) return; // dead or collected

      // First tap: start path anywhere
      // Subsequent: must be adjacent to last cell
      if (path.length > 0) {
        const [lr, lc] = path[path.length - 1];
        if (!isAdj(lr, lc, r, c)) return;
      }

      const val = grid[r][c];
      const nextGrid = applyCollect(grid, r, c);
      const nextScore = score + val;
      const nextPath: [number, number][] = [...path, [r, c]];

      // Animate collected cell
      bounceCell(r, c);

      // Animate reduced cells
      for (let j = 0; j < SIZE; j++) {
        if (j !== c && nextGrid[r][j] >= 0 && nextGrid[r][j] < grid[r][j]) {
          dimCell(r, j);
        }
      }
      for (let i = 0; i < SIZE; i++) {
        if (i !== r && nextGrid[i][c] >= 0 && nextGrid[i][c] < grid[i][c]) {
          dimCell(i, c);
        }
      }

      setGrid(nextGrid);
      setPath(nextPath);
      setScore(nextScore);

      // Record on completion
      const isDone = nextPath.length >= pathLen;
      // Check if stuck after this move
      const willBeStuck =
        !isDone &&
        [[0, 1], [0, -1], [1, 0], [-1, 0]].every(([dr, dc]) => {
          const nr = r + dr;
          const nc = c + dc;
          return (
            nr < 0 ||
            nr >= SIZE ||
            nc < 0 ||
            nc >= SIZE ||
            nextGrid[nr][nc] <= 0
          );
        });

      if ((isDone || willBeStuck) && !gameRecorded) {
        setGameRecorded(true);
        recordGame('reap', nextScore, par, true).then((s) => {
          setStatsData(s);
          setShowStats(true);
        });
      }
    },
    [grid, path, score, gameOver, gameRecorded, par, pathLen, bounceCell, dimCell],
  );

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('reap');
    setStatsData(s);
    setShowStats(true);
  }, []);

  /* ── Valid cells for next move ── */
  const validSet = useMemo(() => {
    const s = new Set<number>();
    if (gameOver) return s;
    if (path.length === 0) {
      // All cells with value > 0
      for (let i = 0; i < SIZE; i++)
        for (let j = 0; j < SIZE; j++)
          if (grid[i][j] > 0) s.add(i * SIZE + j);
    } else {
      const [lr, lc] = path[path.length - 1];
      for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const nr = lr + dr;
        const nc = lc + dc;
        if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && grid[nr][nc] > 0) {
          s.add(nr * SIZE + nc);
        }
      }
    }
    return s;
  }, [grid, path, gameOver]);

  /* ── Share text ── */
  function buildShareText(): string {
    const beat = score >= par;
    const pathSet = new Set(path.map(([r, c]) => r * SIZE + c));
    const rows: string[] = [];
    for (let r = 0; r < SIZE; r++) {
      let row = '';
      for (let c = 0; c < SIZE; c++) {
        row += pathSet.has(r * SIZE + c) ? '\ud83d\udfe2' : '\u2b1b';
      }
      rows.push(row);
    }
    return [
      `Reap Day #${puzzleDay} \ud83c\udf3e`,
      `${score}/${par} pts`,
      ...rows,
      beat ? '\u2b50 Beat par!' : `Scored ${score}`,
    ].join('\n');
  }

  /* ── Which cells are in the path ─── */
  const pathSet = useMemo(
    () => new Set(path.map(([r, c]) => r * SIZE + c)),
    [path],
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Reap</Text>
        <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
        <Pressable onPress={handleShowStats}>
          <Text style={styles.statsIcon}>{'\ud83d\udcca'}</Text>
        </Pressable>
      </View>
      <Text style={styles.subtitle}>
        Draw a path to harvest values. Collecting damages the row & column.
      </Text>

      {/* Score & steps */}
      <View style={styles.scoreBar}>
        <View style={styles.scoreItem}>
          <Text style={styles.scoreLabel}>Score</Text>
          <Text
            style={[
              styles.scoreVal,
              gameOver && score >= par && styles.scoreGood,
            ]}
          >
            {score}
          </Text>
        </View>
        <View style={styles.scoreItem}>
          <Text style={styles.scoreLabel}>Par</Text>
          <Text style={styles.scorePar}>{par}</Text>
        </View>
        <View style={styles.scoreItem}>
          <Text style={styles.scoreLabel}>Steps</Text>
          <Text style={styles.scoreVal}>
            {path.length}/{pathLen}
          </Text>
        </View>
      </View>

      {/* Grid */}
      <View style={styles.grid}>
        {grid.map((row, r) => (
          <View key={r} style={styles.gridRow}>
            {row.map((val, c) => {
              const idx = r * SIZE + c;
              const inPath = pathSet.has(idx);
              const isValid = validSet.has(idx);
              const isLast =
                path.length > 0 &&
                path[path.length - 1][0] === r &&
                path[path.length - 1][1] === c;
              const displayVal = val < 0 ? 0 : val;
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
                        backgroundColor: inPath
                          ? '#2d5a27'
                          : VAL_COLORS[displayVal] || VAL_COLORS[0],
                        borderColor: isLast
                          ? '#6aaa64'
                          : isValid && !inPath
                            ? 'rgba(106,170,100,0.5)'
                            : inPath
                              ? '#3a6a34'
                              : '#3a3a3c',
                        borderWidth: isLast ? 3 : isValid ? 2 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.cellText,
                        inPath && styles.cellTextCollected,
                        displayVal === 0 && styles.cellTextDead,
                      ]}
                    >
                      {inPath ? '\u2713' : displayVal > 0 ? displayVal : ''}
                    </Text>
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        ))}
      </View>

      <CelebrationBurst show={gameOver && score >= par} />

      {/* End message */}
      {gameOver && (
        <View style={styles.endMessage}>
          <Text style={styles.endEmoji}>
            {score >= par
              ? '\ud83c\udf1f'
              : stuck
                ? '\ud83d\udeab'
                : '\ud83c\udf3e'}
          </Text>
          <Text style={styles.endText}>
            {score >= par
              ? `Beat par! ${score} pts`
              : stuck
                ? `Stuck! ${score} pts`
                : `Harvested ${score} pts`}
          </Text>
          <ShareButton text={buildShareText()} />
        </View>
      )}

      {/* How to play */}
      <View style={styles.howTo}>
        <Text style={styles.howToTitle}>How to play</Text>
        <Text style={styles.howToText}>
          Tap cells to harvest their value along a connected path. But
          harvesting damages the field — all cells in the same row and column
          lose 1 point.{'\n\n'}
          Plan your route to maximize your score in {pathLen} steps. Par: {par}.
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
  scoreBar: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 12,
    alignItems: 'center',
  },
  scoreItem: { alignItems: 'center' },
  scoreLabel: { color: '#818384', fontSize: 12, marginBottom: 2 },
  scoreVal: { color: '#ffffff', fontSize: 24, fontWeight: '800' },
  scoreGood: { color: '#2ecc71' },
  scorePar: { color: '#818384', fontSize: 24, fontWeight: '800' },
  grid: { gap: GAP },
  gridRow: { flexDirection: 'row', gap: GAP },
  cell: {
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
  cellTextCollected: {
    color: '#6aaa64',
    fontSize: 18,
  },
  cellTextDead: {
    color: '#555555',
    fontSize: 14,
  },
  endMessage: { alignItems: 'center', marginTop: 20 },
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
