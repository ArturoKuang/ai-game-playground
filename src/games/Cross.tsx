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
const GAP = 3;

const VAL_COLORS = [
  '#2a2a2c', '#546e7a', '#607d8b', '#78909c',
  '#3498db', '#2ecc71', '#f1c40f', '#e67e22', '#e74c3c', '#9b59b6',
];

/* ─── Difficulty ─── */
function getDifficulty() {
  const d = getDayDifficulty();
  const maxVal = 4 + d; // Mon: 5, Fri: 9
  return { maxVal };
}

/* ─── Generate grid ─── */
function generateGrid(seed: number, maxVal: number): number[][] {
  const rng = seededRandom(seed);
  return Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () => 1 + Math.floor(rng() * maxVal)),
  );
}

/* ─── Optimal solver: try all permutations ─── */
function optimalSolve(grid: number[][]): number {
  let best = 0;
  function dfs(row: number, usedCols: Set<number>, score: number) {
    if (row === SIZE) {
      best = Math.max(best, score);
      return;
    }
    // Upper bound: best remaining value per row
    let ub = score;
    for (let r = row; r < SIZE; r++) {
      let rowMax = 0;
      for (let c = 0; c < SIZE; c++) {
        if (!usedCols.has(c)) rowMax = Math.max(rowMax, grid[r][c]);
      }
      ub += rowMax;
    }
    if (ub <= best) return;

    for (let c = 0; c < SIZE; c++) {
      if (usedCols.has(c)) continue;
      usedCols.add(c);
      dfs(row + 1, usedCols, score + grid[row][c]);
      usedCols.delete(c);
    }
  }
  dfs(0, new Set(), 0);
  return best;
}

/* ═══════════════════════════════════════════ */
/*                Component                    */
/* ═══════════════════════════════════════════ */
export default function Cross() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const diff = useMemo(() => getDifficulty(), []);
  const grid = useMemo(() => generateGrid(seed, diff.maxVal), [seed, diff.maxVal]);
  const par = useMemo(() => optimalSolve(grid), [grid]);

  const { width: screenWidth } = useWindowDimensions();
  const maxGrid = Math.min(screenWidth - 48, 340);
  const cellSize = Math.floor((maxGrid - (SIZE - 1) * GAP) / SIZE);
  const gridWidth = SIZE * cellSize + (SIZE - 1) * GAP;

  const [usedRows, setUsedRows] = useState<Set<number>>(new Set());
  const [usedCols, setUsedCols] = useState<Set<number>>(new Set());
  const [picks, setPicks] = useState<{ r: number; c: number }[]>([]);
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);

  const cellScales = useRef(
    Array.from({ length: SIZE * SIZE }, () => new Animated.Value(1)),
  ).current;

  /* ─── P1 preview: cost of eliminating this row+column ─── */
  const previewCost = useMemo(() => {
    if (selectedCell === null || gameOver) return 0;
    const sr = Math.floor(selectedCell / SIZE);
    const sc = selectedCell % SIZE;
    let cost = 0;
    // Lost values in the eliminated row (excluding picked cell and already-used columns)
    for (let c = 0; c < SIZE; c++) {
      if (c !== sc && !usedCols.has(c)) cost += grid[sr][c];
    }
    // Lost values in the eliminated column (excluding picked cell and already-used rows)
    for (let r = 0; r < SIZE; r++) {
      if (r !== sr && !usedRows.has(r)) cost += grid[r][sc];
    }
    return cost;
  }, [selectedCell, usedRows, usedCols, grid, gameOver]);

  /* ─── handle tap (two-tap: select then confirm) ─── */
  const handleTap = useCallback(
    (r: number, c: number) => {
      if (gameOver) return;
      if (usedRows.has(r) || usedCols.has(c)) return;

      const key = r * SIZE + c;

      // First tap: select
      if (selectedCell !== key) {
        setSelectedCell(key);
        Animated.sequence([
          Animated.timing(cellScales[key], {
            toValue: 1.15,
            duration: 60,
            useNativeDriver: true,
          }),
          Animated.spring(cellScales[key], {
            toValue: 1,
            friction: 3,
            tension: 200,
            useNativeDriver: true,
          }),
        ]).start();
        return;
      }

      // Second tap: confirm pick
      setSelectedCell(null);
      Animated.sequence([
        Animated.timing(cellScales[key], {
          toValue: 1.3,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.spring(cellScales[key], {
          toValue: 1,
          friction: 3,
          tension: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Animate eliminated row+column cells
      for (let cc = 0; cc < SIZE; cc++) {
        if (cc !== c && !usedCols.has(cc)) {
          const nk = r * SIZE + cc;
          Animated.sequence([
            Animated.timing(cellScales[nk], { toValue: 0.8, duration: 80, useNativeDriver: true }),
            Animated.spring(cellScales[nk], { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }),
          ]).start();
        }
      }
      for (let rr = 0; rr < SIZE; rr++) {
        if (rr !== r && !usedRows.has(rr)) {
          const nk = rr * SIZE + c;
          Animated.sequence([
            Animated.timing(cellScales[nk], { toValue: 0.8, duration: 80, useNativeDriver: true }),
            Animated.spring(cellScales[nk], { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }),
          ]).start();
        }
      }

      const val = grid[r][c];
      const newScore = score + val;
      const newPicks = [...picks, { r, c }];
      const newUsedRows = new Set(usedRows);
      newUsedRows.add(r);
      const newUsedCols = new Set(usedCols);
      newUsedCols.add(c);

      setScore(newScore);
      setPicks(newPicks);
      setUsedRows(newUsedRows);
      setUsedCols(newUsedCols);

      if (newPicks.length >= SIZE) {
        setGameOver(true);
        recordGame('cross', newScore, par, true).then((s) => {
          setStats(s);
          setShowStats(true);
        });
      }
    },
    [usedRows, usedCols, selectedCell, score, picks, grid, gameOver, par, cellScales],
  );

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('cross');
    setStats(s);
    setShowStats(true);
  }, []);

  function buildShareText(): string {
    const rows: string[] = [];
    for (let r = 0; r < SIZE; r++) {
      let row = '';
      for (let c = 0; c < SIZE; c++) {
        const picked = picks.some((p) => p.r === r && p.c === c);
        row += picked ? '\uD83D\uDFE9' : '\u2B1B';
      }
      rows.push(row);
    }
    return [
      `Cross Day #${puzzleDay} \u2716\uFE0F`,
      rows.join('\n'),
      `Score: ${score} (par ${par})`,
      score >= par ? '\u2B50 Beat par!' : `${par - score} short`,
    ].join('\n');
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Cross</Text>
        <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
        <Pressable onPress={handleShowStats}>
          <Text style={styles.statsIcon}>{'\uD83D\uDCCA'}</Text>
        </Pressable>
      </View>

      <Text style={styles.subtitle}>
        Pick one per row — but each pick crosses out its column!
      </Text>

      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Picks</Text>
          <Text style={styles.infoValue}>
            {picks.length}/{SIZE}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Score</Text>
          <Text
            style={[
              styles.infoValue,
              gameOver && score >= par && styles.infoValueGood,
            ]}
          >
            {score}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Par</Text>
          <Text style={styles.infoPar}>{par}</Text>
        </View>
      </View>

      {/* Grid */}
      <View style={[styles.grid, { width: gridWidth }]}>
        {Array.from({ length: SIZE }).map((_, r) => (
          <View key={r} style={styles.gridRow}>
            {Array.from({ length: SIZE }).map((_, c) => {
              const key = r * SIZE + c;
              const val = grid[r][c];
              const isPicked = picks.some((p) => p.r === r && p.c === c);
              const isEliminated = usedRows.has(r) || usedCols.has(c);
              const isAvailable = !isEliminated && !gameOver;
              const isSelected = isAvailable && selectedCell === key;
              const wouldEliminate =
                selectedCell !== null &&
                !gameOver &&
                !isPicked &&
                !isEliminated &&
                (Math.floor(selectedCell / SIZE) === r || selectedCell % SIZE === c);

              let bg = VAL_COLORS[Math.min(val, 9)];
              let border = '#444';
              let bw = 1;
              let opacity = 1;

              if (isPicked) {
                bg = '#1a4a1a';
                border = '#2ecc71';
                bw = 3;
              } else if (isEliminated) {
                opacity = 0.25;
              } else if (isSelected) {
                border = '#f1c40f';
                bw = 3;
              } else if (wouldEliminate) {
                border = '#e74c3c';
                bw = 2;
                opacity = 0.5;
              } else if (isAvailable) {
                border = '#666';
                bw = 2;
              }

              return (
                <Animated.View
                  key={c}
                  style={{
                    transform: [{ scale: cellScales[key] }],
                    opacity,
                  }}
                >
                  <Pressable
                    onPress={() => handleTap(r, c)}
                    style={[
                      styles.cell,
                      {
                        width: cellSize,
                        height: cellSize,
                        backgroundColor: bg,
                        borderColor: border,
                        borderWidth: bw,
                      },
                    ]}
                  >
                    {isPicked ? (
                      <Text style={styles.checkMark}>{'\u2713'}</Text>
                    ) : (
                      <Text
                        style={[
                          styles.cellValue,
                          !isAvailable && !wouldEliminate && styles.cellValueDim,
                        ]}
                      >
                        {val}
                      </Text>
                    )}
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        ))}
      </View>

      {/* Preview hint */}
      {selectedCell !== null && !gameOver && (
        <View style={styles.previewHint}>
          <Text style={styles.previewText}>
            +{grid[Math.floor(selectedCell / SIZE)][selectedCell % SIZE]} pts, eliminates{' '}
            {previewCost} pts — tap again!
          </Text>
        </View>
      )}

      <CelebrationBurst show={gameOver && score >= par} />

      {gameOver && (
        <View style={styles.winMessage}>
          <Text style={styles.winEmoji}>
            {score >= par ? '\u2B50' : '\u2716\uFE0F'}
          </Text>
          <Text style={styles.winText}>
            {score >= par
              ? `Score ${score} \u2014 beat par (${par})!`
              : `Score ${score} (par ${par})`}
          </Text>
          <ShareButton text={buildShareText()} />
        </View>
      )}

      <View style={styles.howTo}>
        <Text style={styles.howToTitle}>How to play</Text>
        <Text style={styles.howToText}>
          Pick one cell from each row (top to bottom). Each pick
          crosses out that column for all remaining rows!
          {'\n\n'}
          Grabbing a high number might cost you an even higher one
          in a later row. Preview shows what you'd lose!
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
  infoPar: { color: '#818384', fontSize: 14, marginTop: 2 },
  grid: { gap: GAP },
  gridRow: { flexDirection: 'row', gap: GAP },
  cell: {
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellValue: { color: '#ffffff', fontSize: 22, fontWeight: '800' },
  cellValueDim: { color: '#666' },
  checkMark: { color: '#2ecc71', fontSize: 24, fontWeight: '800' },
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
