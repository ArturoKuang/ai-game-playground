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
import { getDailySeed, seededRandom, getPuzzleDay, getDayDifficulty } from '../utils/seed';
import { loadStats, recordGame, type Stats } from '../utils/stats';

const GRID_SIZE = 5;
const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;

function getParUndos(): number {
  const d = getDayDifficulty(); // 1 (Mon) to 5 (Fri)
  return 6 - d; // Mon: 5, Fri: 1
}

type Cell = { r: number; c: number };

function cellKey(r: number, c: number): string {
  return `${r},${c}`;
}

function areAdjacent(a: Cell, b: Cell): boolean {
  return (
    (Math.abs(a.r - b.r) === 1 && a.c === b.c) ||
    (Math.abs(a.c - b.c) === 1 && a.r === b.r)
  );
}

/** Generate a guaranteed-solvable Hamiltonian path puzzle via randomized DFS */
function generatePuzzle(seed: number): { start: Cell; end: Cell } {
  const rng = seededRandom(seed);
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  // Shuffle helper
  function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Try random starting positions until we find a Hamiltonian path
  const starts = shuffle(
    Array.from({ length: TOTAL_CELLS }, (_, i) => ({
      r: Math.floor(i / GRID_SIZE),
      c: i % GRID_SIZE,
    }))
  );

  for (const startCell of starts) {
    const visited = Array.from({ length: GRID_SIZE }, () =>
      Array(GRID_SIZE).fill(false)
    );
    const path: Cell[] = [startCell];
    visited[startCell.r][startCell.c] = true;

    function dfs(): boolean {
      if (path.length === TOTAL_CELLS) return true;
      const cur = path[path.length - 1];
      const neighbors = shuffle(dirs).map(([dr, dc]) => ({
        r: cur.r + dr,
        c: cur.c + dc,
      }));
      for (const n of neighbors) {
        if (
          n.r >= 0 && n.r < GRID_SIZE &&
          n.c >= 0 && n.c < GRID_SIZE &&
          !visited[n.r][n.c]
        ) {
          visited[n.r][n.c] = true;
          path.push(n);
          if (dfs()) return true;
          path.pop();
          visited[n.r][n.c] = false;
        }
      }
      return false;
    }

    if (dfs()) {
      return { start: path[0], end: path[path.length - 1] };
    }
  }

  // Fallback (should never happen on 5x5)
  return { start: { r: 0, c: 0 }, end: { r: 4, c: 4 } };
}

export default function PathWeaver() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const puzzle = useMemo(() => generatePuzzle(seed), [seed]);

  const parUndos = useMemo(() => getParUndos(), []);
  const [path, setPath] = useState<Cell[]>([puzzle.start]);
  const [undos, setUndos] = useState(0);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStatsData] = useState<Stats | null>(null);

  const { width: screenWidth } = useWindowDimensions();
  const maxWidth = Math.min(screenWidth - 48, 340);
  const cellSize = Math.floor(maxWidth / GRID_SIZE) - 4;

  // Cell scale animations
  const cellScales = useRef(
    Array.from({ length: TOTAL_CELLS }, () => new Animated.Value(1))
  ).current;

  const visited = useMemo(() => {
    const s = new Set<string>();
    for (const c of path) s.add(cellKey(c.r, c.c));
    return s;
  }, [path]);

  const head = path[path.length - 1];
  const reachedEnd =
    head.r === puzzle.end.r && head.c === puzzle.end.c;
  const won = reachedEnd && path.length === TOTAL_CELLS;
  const stuck =
    !won &&
    !['up', 'down', 'left', 'right'].some((dir) => {
      const dr = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
      const dc = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
      const nr = head.r + dr;
      const nc = head.c + dc;
      return (
        nr >= 0 &&
        nr < GRID_SIZE &&
        nc >= 0 &&
        nc < GRID_SIZE &&
        !visited.has(cellKey(nr, nc))
      );
    });

  const animateCell = useCallback(
    (r: number, c: number) => {
      const idx = r * GRID_SIZE + c;
      Animated.sequence([
        Animated.timing(cellScales[idx], {
          toValue: 1.2,
          duration: 80,
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
    [cellScales]
  );

  const handleCellPress = useCallback(
    (r: number, c: number) => {
      if (won) return;

      const target: Cell = { r, c };

      // If tapping the second-to-last cell, undo
      if (
        path.length >= 2 &&
        path[path.length - 2].r === r &&
        path[path.length - 2].c === c
      ) {
        setPath(path.slice(0, -1));
        setUndos((u) => u + 1);
        animateCell(r, c);
        return;
      }

      // Must be adjacent to head and not visited
      if (!areAdjacent(head, target)) return;
      if (visited.has(cellKey(r, c))) return;

      animateCell(r, c);
      setPath([...path, target]);
    },
    [path, head, visited, won, animateCell]
  );

  const handleReset = useCallback(() => {
    setPath([puzzle.start]);
    setUndos(0);
  }, [puzzle]);

  // Record stats on win
  React.useEffect(() => {
    if (won) {
      recordGame('pathweaver', undos, parUndos).then((s) => {
        setStatsData(s);
        setShowStats(true);
      });
    }
  }, [won, undos, parUndos]);

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('pathweaver');
    setStatsData(s);
    setShowStats(true);
  }, []);

  function buildShareText(): string {
    // Build path direction grid
    const grid: string[][] = Array.from({ length: GRID_SIZE }, () =>
      Array(GRID_SIZE).fill('\u2b1c')
    );
    for (let i = 0; i < path.length; i++) {
      const { r, c } = path[i];
      if (i === 0) {
        grid[r][c] = '\ud83d\udfe2'; // green start
      } else if (i === path.length - 1) {
        grid[r][c] = '\ud83d\udd34'; // red end
      } else {
        // Arrow showing direction to next cell
        const next = path[i + 1];
        if (next.r < r) grid[r][c] = '\u2b06\ufe0f';
        else if (next.r > r) grid[r][c] = '\u2b07\ufe0f';
        else if (next.c < c) grid[r][c] = '\u2b05\ufe0f';
        else grid[r][c] = '\u27a1\ufe0f';
      }
    }
    const rows = grid.map((row) => row.join('')).join('\n');
    return `PathWeaver Day #${puzzleDay} ${undos <= parUndos ? '\ud83c\udf1f' : '\u2705'}\n${rows}\n${
      undos === 0 ? 'Perfect — 0 undos!' : `${undos} undo${undos > 1 ? 's' : ''} (par: ${parUndos})`
    }`;
  }

  function getCellColor(r: number, c: number): string {
    const isStart = r === puzzle.start.r && c === puzzle.start.c;
    const isEnd = r === puzzle.end.r && c === puzzle.end.c;
    const isHead = r === head.r && c === head.c;
    const isVisited = visited.has(cellKey(r, c));

    if (isHead && !won) return '#3498db';
    if (isStart) return '#2ecc71';
    if (isEnd) return '#e74c3c';
    if (isVisited) return '#6aaa64';
    return '#2c2c2e';
  }

  function getCellBorder(r: number, c: number): string {
    const isHead = r === head.r && c === head.c;
    const isEnd = r === puzzle.end.r && c === puzzle.end.c;

    // Highlight valid moves
    if (!won && areAdjacent(head, { r, c }) && !visited.has(cellKey(r, c))) {
      return '#5dade2';
    }
    if (isHead) return '#85c1e9';
    if (isEnd) return '#ff6b6b';
    return '#3a3a3c';
  }

  // Find path index for numbering
  function getCellNumber(r: number, c: number): string | undefined {
    const idx = path.findIndex((p) => p.r === r && p.c === c);
    if (idx >= 0) return String(idx + 1);
    return undefined;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>PathWeaver</Text>
        <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
        <Pressable onPress={handleShowStats}>
          <Text style={styles.statsIcon}>{'\ud83d\udcca'}</Text>
        </Pressable>
      </View>
      <Text style={styles.subtitle}>
        Draw a path visiting every cell exactly once
      </Text>

      <View style={styles.moveCounter}>
        <Text style={styles.moveLabel}>Cells</Text>
        <Text style={styles.moveCount}>
          {path.length}/{TOTAL_CELLS}
        </Text>
        <Text style={styles.movePar}>Undos: {undos}</Text>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#2ecc71' }]} />
          <Text style={styles.legendText}>Start</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#e74c3c' }]} />
          <Text style={styles.legendText}>End</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#3498db' }]} />
          <Text style={styles.legendText}>You</Text>
        </View>
      </View>

      {/* Grid */}
      <View style={styles.grid}>
        {Array.from({ length: GRID_SIZE }).map((_, r) => (
          <View key={r} style={styles.gridRow}>
            {Array.from({ length: GRID_SIZE }).map((_, c) => {
              const num = getCellNumber(r, c);
              const idx = r * GRID_SIZE + c;
              return (
                <Animated.View
                  key={c}
                  style={{ transform: [{ scale: cellScales[idx] }] }}
                >
                  <Pressable
                    onPress={() => handleCellPress(r, c)}
                    style={[
                      styles.cell,
                      {
                        width: cellSize,
                        height: cellSize,
                        backgroundColor: getCellColor(r, c),
                        borderColor: getCellBorder(r, c),
                      },
                    ]}
                  >
                    {num && (
                      <Text style={styles.cellNum}>{num}</Text>
                    )}
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        ))}
      </View>

      {/* Stuck indicator */}
      {stuck && !won && (
        <View style={styles.stuckMsg}>
          <Text style={styles.stuckText}>
            No moves left! Tap previous cell to undo, or reset.
          </Text>
        </View>
      )}

      {/* Reset */}
      {!won && path.length > 1 && (
        <Pressable style={styles.resetBtn} onPress={handleReset}>
          <Text style={styles.resetBtnText}>Reset</Text>
        </Pressable>
      )}

      <CelebrationBurst show={won && undos <= parUndos} />

      {won && (
        <View style={styles.winMessage}>
          <Text style={styles.winEmoji}>
            {undos === 0 ? '\ud83c\udf1f' : undos <= parUndos ? '\u2b50' : '\u2705'}
          </Text>
          <Text style={styles.winText}>
            {undos === 0
              ? 'Perfect path! No undos!'
              : undos <= parUndos
                ? `Under par! ${undos} undo${undos > 1 ? 's' : ''}`
                : `Path complete (${undos} undos, par: ${parUndos})`}
          </Text>
          <ShareButton text={buildShareText()} />
        </View>
      )}

      <View style={styles.howTo}>
        <Text style={styles.howToTitle}>How to play</Text>
        <Text style={styles.howToText}>
          Start at the green cell and draw a path to the red cell, visiting
          every cell exactly once. Tap adjacent cells to extend your path. Tap
          the previous cell to undo.{'\n\n'}
          Complete the path with {parUndos} or fewer undos for a star!
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
  },
  moveCounter: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 12,
  },
  moveLabel: { color: '#818384', fontSize: 14 },
  moveCount: { color: '#ffffff', fontSize: 28, fontWeight: '800' },
  movePar: { color: '#818384', fontSize: 14 },
  legend: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: { color: '#818384', fontSize: 12 },
  grid: {
    gap: 3,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 3,
  },
  cell: {
    borderRadius: 8,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellNum: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  stuckMsg: {
    marginTop: 12,
    backgroundColor: '#e74c3c22',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  stuckText: {
    color: '#e74c3c',
    fontSize: 13,
    textAlign: 'center',
  },
  resetBtn: {
    backgroundColor: '#3a3a3c',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 16,
  },
  resetBtnText: {
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
