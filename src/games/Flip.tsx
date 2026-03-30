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
  const numPicks = 3 + Math.ceil(d / 2); // Mon: 4, Fri: 6
  return { maxVal, numPicks };
}

/* ─── Generate grid ─── */
function generateGrid(seed: number, maxVal: number): number[][] {
  const rng = seededRandom(seed);
  return Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () => 1 + Math.floor(rng() * maxVal)),
  );
}

/* ─── Neighbors ─── */
function neighbors(key: number): number[] {
  const r = Math.floor(key / SIZE);
  const c = key % SIZE;
  const result: number[] = [];
  for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) result.push(nr * SIZE + nc);
  }
  return result;
}

/* ─── Flip value ─── */
function flipVal(val: number, maxVal: number): number {
  return maxVal + 1 - val;
}

/* ─── Optimal solver (DFS with pruning) ─── */
function optimalSolve(grid: number[][], maxVal: number, numPicks: number): number {
  let best = 0;

  function dfs(
    g: number[][],
    picked: Set<number>,
    picksLeft: number,
    score: number,
  ) {
    if (picksLeft === 0) {
      best = Math.max(best, score);
      return;
    }

    const available: [number, number][] = [];
    for (let i = 0; i < SIZE * SIZE; i++) {
      if (!picked.has(i)) {
        const r = Math.floor(i / SIZE);
        const c = i % SIZE;
        if (g[r][c] > 0) available.push([i, g[r][c]]);
      }
    }
    available.sort((a, b) => b[1] - a[1]);

    let ub = score;
    for (let i = 0; i < Math.min(picksLeft, available.length); i++)
      ub += available[i][1];
    if (ub <= best) return;

    const limit = Math.min(available.length, 8);
    for (let i = 0; i < limit; i++) {
      const [key, val] = available[i];
      const r = Math.floor(key / SIZE);
      const c = key % SIZE;

      const newG = g.map((row) => [...row]);
      newG[r][c] = 0;
      const newPicked = new Set(picked);
      newPicked.add(key);

      for (const nk of neighbors(key)) {
        if (!newPicked.has(nk)) {
          const nr = Math.floor(nk / SIZE);
          const nc = nk % SIZE;
          newG[nr][nc] = flipVal(newG[nr][nc], maxVal);
        }
      }

      dfs(newG, newPicked, picksLeft - 1, score + val);
    }
  }

  dfs(grid, new Set(), numPicks, 0);
  return best;
}

/* ═══════════════════════════════════════════ */
/*                Component                    */
/* ═══════════════════════════════════════════ */
export default function Flip() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const diff = useMemo(() => getDifficulty(), []);
  const initialGrid = useMemo(
    () => generateGrid(seed, diff.maxVal),
    [seed, diff.maxVal],
  );
  const par = useMemo(
    () => optimalSolve(initialGrid, diff.maxVal, diff.numPicks),
    [initialGrid, diff.maxVal, diff.numPicks],
  );

  const { width: screenWidth } = useWindowDimensions();
  const maxGrid = Math.min(screenWidth - 48, 340);
  const cellSize = Math.floor((maxGrid - (SIZE - 1) * GAP) / SIZE);
  const gridWidth = SIZE * cellSize + (SIZE - 1) * GAP;

  const [grid, setGrid] = useState<number[][]>(() =>
    initialGrid.map((r) => [...r]),
  );
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [picks, setPicks] = useState(0);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);

  const cellScales = useRef(
    Array.from({ length: SIZE * SIZE }, () => new Animated.Value(1)),
  ).current;

  /* ─── P1 preview: what neighbors would become ─── */
  const previewFlips = useMemo(() => {
    if (selectedCell === null) return new Map<number, number>();
    const flips = new Map<number, number>();
    for (const nk of neighbors(selectedCell)) {
      if (!picked.has(nk)) {
        const nr = Math.floor(nk / SIZE);
        const nc = nk % SIZE;
        flips.set(nk, flipVal(grid[nr][nc], diff.maxVal));
      }
    }
    return flips;
  }, [selectedCell, picked, grid, diff.maxVal]);

  /* ─── handle tap (two-tap: select then confirm) ─── */
  const handleTap = useCallback(
    (r: number, c: number) => {
      if (gameOver) return;
      const key = r * SIZE + c;
      if (picked.has(key)) return;

      // First tap: select and preview
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
      const val = grid[r][c];
      const newScore = score + val;
      const newPicks = picks + 1;
      const newPicked = new Set(picked);
      newPicked.add(key);

      // Animate pick
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

      // Apply flip to neighbors
      const newGrid = grid.map((row) => [...row]);
      newGrid[r][c] = 0;
      for (const nk of neighbors(key)) {
        if (!newPicked.has(nk)) {
          const nr = Math.floor(nk / SIZE);
          const nc = nk % SIZE;
          newGrid[nr][nc] = flipVal(newGrid[nr][nc], diff.maxVal);
          // Flip animation on neighbor
          Animated.sequence([
            Animated.timing(cellScales[nk], {
              toValue: 0.7,
              duration: 80,
              useNativeDriver: true,
            }),
            Animated.spring(cellScales[nk], {
              toValue: 1,
              friction: 3,
              tension: 200,
              useNativeDriver: true,
            }),
          ]).start();
        }
      }

      setGrid(newGrid);
      setPicked(newPicked);
      setPicks(newPicks);
      setScore(newScore);

      if (newPicks >= diff.numPicks) {
        setGameOver(true);
        recordGame('flip', newScore, par, true).then((s) => {
          setStats(s);
          setShowStats(true);
        });
      }
    },
    [selectedCell, grid, picked, picks, score, gameOver, diff, par, cellScales],
  );

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('flip');
    setStats(s);
    setShowStats(true);
  }, []);

  function buildShareText(): string {
    const rows: string[] = [];
    for (let r = 0; r < SIZE; r++) {
      let row = '';
      for (let c = 0; c < SIZE; c++) {
        row += picked.has(r * SIZE + c) ? '\uD83D\uDFE9' : '\u2B1B';
      }
      rows.push(row);
    }
    return [
      `Flip Day #${puzzleDay} \uD83D\uDD04`,
      rows.join('\n'),
      `Score: ${score} (par ${par})`,
      score >= par ? '\u2B50 Beat par!' : `${par - score} short of par`,
    ].join('\n');
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Flip</Text>
        <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
        <Pressable onPress={handleShowStats}>
          <Text style={styles.statsIcon}>{'\uD83D\uDCCA'}</Text>
        </Pressable>
      </View>

      <Text style={styles.subtitle}>
        Pick {diff.numPicks} cells to score — neighbors flip values!
      </Text>

      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Picks</Text>
          <Text style={styles.infoValue}>
            {picks}/{diff.numPicks}
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
      <View style={[styles.grid, { width: gridWidth, height: gridWidth }]}>
        {Array.from({ length: SIZE }).map((_, r) => (
          <View key={r} style={styles.gridRow}>
            {Array.from({ length: SIZE }).map((_, c) => {
              const key = r * SIZE + c;
              const val = grid[r][c];
              const isPicked = picked.has(key);
              const isSelected = selectedCell === key;
              const previewVal = previewFlips.get(key);
              const showPreview = previewVal !== undefined;

              let bg = val > 0 ? VAL_COLORS[Math.min(val, 9)] : '#1a1a1b';
              let border = '#555';
              let bw = 1;
              if (isPicked) {
                bg = '#1a4a1a';
                border = '#2ecc71';
                bw = 3;
              } else if (isSelected) {
                border = '#f1c40f';
                bw = 3;
              } else if (showPreview) {
                // Show what value WOULD become
                bg = VAL_COLORS[Math.min(previewVal, 9)];
                border = previewVal > val ? '#2ecc71' : '#e74c3c';
                bw = 2;
              }

              return (
                <Animated.View
                  key={c}
                  style={{ transform: [{ scale: cellScales[key] }] }}
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
                      <Text style={styles.claimedCheck}>{'\u2713'}</Text>
                    ) : showPreview ? (
                      <View>
                        <Text style={styles.previewOld}>{val}</Text>
                        <Text style={[
                          styles.previewNew,
                          previewVal > val ? styles.previewUp : styles.previewDown,
                        ]}>
                          {'\u2192'}{previewVal}
                        </Text>
                      </View>
                    ) : val > 0 ? (
                      <Text style={styles.cellValue}>{val}</Text>
                    ) : null}
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
          <Text style={styles.previewHintText}>
            +{grid[Math.floor(selectedCell / SIZE)][selectedCell % SIZE]} pts
            {previewFlips.size > 0 && `, flips ${previewFlips.size} neighbor${previewFlips.size > 1 ? 's' : ''}`}
            {' — tap again!'}
          </Text>
        </View>
      )}

      <CelebrationBurst show={gameOver && score >= par} />

      {gameOver && (
        <View style={styles.winMessage}>
          <Text style={styles.winEmoji}>
            {score >= par ? '\u2B50' : '\uD83D\uDD04'}
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
          Tap a cell to preview, tap again to pick it. You score its
          value — but all neighbors FLIP (1{'\u2194'}{diff.maxVal}, 2{'\u2194'}{diff.maxVal - 1}, etc).
          {'\n\n'}
          Use flips to your advantage! Picking near low values can
          flip them high for your next pick.
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
  claimedCheck: { color: '#2ecc71', fontSize: 24, fontWeight: '800' },
  previewOld: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'line-through',
    textAlign: 'center',
  },
  previewNew: { fontSize: 16, fontWeight: '800', textAlign: 'center' },
  previewUp: { color: '#2ecc71' },
  previewDown: { color: '#e74c3c' },
  previewHint: {
    marginTop: 10,
    backgroundColor: '#2c2c2e',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  previewHintText: {
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
