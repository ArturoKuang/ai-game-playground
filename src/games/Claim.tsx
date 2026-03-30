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
const DRAIN = 1; // neighbors lose this much per claim

const VAL_COLORS = [
  '#2a2a2c', // 0 (empty)
  '#4a5568', // 1
  '#5a6b80', // 2
  '#6b8299', // 3
  '#3498db', // 4
  '#2ecc71', // 5
  '#f1c40f', // 6
  '#e67e22', // 7
  '#e74c3c', // 8
  '#9b59b6', // 9
];

/* ─── Difficulty ─── */
function getDifficulty() {
  const d = getDayDifficulty();
  const maxVal = 4 + d; // Mon: 5, Fri: 9
  const numPicks = 3 + Math.ceil(d / 2); // Mon: 4, Wed: 5, Fri: 6
  return { maxVal, numPicks };
}

/* ─── Generate grid ─── */
function generateGrid(seed: number, maxVal: number): number[][] {
  const rng = seededRandom(seed);
  return Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () => 1 + Math.floor(rng() * maxVal)),
  );
}

/* ─── Greedy solver for par ─── */
function greedySolve(grid: number[][], numPicks: number): number {
  const g = grid.map((r) => [...r]);
  const claimed = new Set<number>();
  let score = 0;

  for (let p = 0; p < numPicks; p++) {
    let bestVal = -1;
    let bestKey = -1;
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const key = r * SIZE + c;
        if (claimed.has(key)) continue;
        if (g[r][c] > bestVal) {
          bestVal = g[r][c];
          bestKey = key;
        }
      }
    }
    if (bestKey < 0) break;
    claimed.add(bestKey);
    const br = Math.floor(bestKey / SIZE);
    const bc = bestKey % SIZE;
    score += g[br][bc];
    g[br][bc] = 0;
    // Drain neighbors
    for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const nr = br + dr;
      const nc = bc + dc;
      if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && !claimed.has(nr * SIZE + nc)) {
        g[nr][nc] = Math.max(0, g[nr][nc] - DRAIN);
      }
    }
  }
  return score;
}

/* ═══════════════════════════════════════════ */
/*                Component                    */
/* ═══════════════════════════════════════════ */
export default function Claim() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const diff = useMemo(() => getDifficulty(), []);
  const initialGrid = useMemo(() => generateGrid(seed, diff.maxVal), [seed, diff.maxVal]);
  const par = useMemo(
    () => greedySolve(initialGrid, diff.numPicks),
    [initialGrid, diff.numPicks],
  );

  const { width: screenWidth } = useWindowDimensions();
  const maxGrid = Math.min(screenWidth - 48, 340);
  const cellSize = Math.floor((maxGrid - (SIZE - 1) * GAP) / SIZE);
  const gridWidth = SIZE * cellSize + (SIZE - 1) * GAP;

  const [grid, setGrid] = useState<number[][]>(() =>
    initialGrid.map((r) => [...r]),
  );
  const [claimed, setClaimed] = useState<Set<number>>(new Set());
  const [picks, setPicks] = useState(0);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);

  const cellScales = useRef(
    Array.from({ length: SIZE * SIZE }, () => new Animated.Value(1)),
  ).current;

  /* ─── claim a cell ─── */
  const handleTap = useCallback(
    (r: number, c: number) => {
      if (gameOver) return;
      const key = r * SIZE + c;
      if (claimed.has(key)) return;
      if (grid[r][c] <= 0) return;

      const cellVal = grid[r][c];
      const newScore = score + cellVal;
      const newPicks = picks + 1;
      const newClaimed = new Set(claimed);
      newClaimed.add(key);

      // Pop animation on claimed cell
      Animated.sequence([
        Animated.timing(cellScales[key], {
          toValue: 1.3,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.timing(cellScales[key], {
          toValue: 0.85,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(cellScales[key], {
          toValue: 1,
          friction: 4,
          tension: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Drain neighbors with subtle bounce
      const newGrid = grid.map((row) => [...row]);
      newGrid[r][c] = 0;
      for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const nr = r + dr;
        const nc = c + dc;
        const nk = nr * SIZE + nc;
        if (
          nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE &&
          !newClaimed.has(nk) && newGrid[nr][nc] > 0
        ) {
          newGrid[nr][nc] = Math.max(0, newGrid[nr][nc] - DRAIN);
          Animated.sequence([
            Animated.timing(cellScales[nk], {
              toValue: 0.9,
              duration: 60,
              useNativeDriver: true,
            }),
            Animated.spring(cellScales[nk], {
              toValue: 1,
              friction: 4,
              tension: 200,
              useNativeDriver: true,
            }),
          ]).start();
        }
      }

      setGrid(newGrid);
      setClaimed(newClaimed);
      setPicks(newPicks);
      setScore(newScore);

      if (newPicks >= diff.numPicks) {
        setGameOver(true);
        recordGame('claim', newScore, par, true).then((s) => {
          setStats(s);
          setShowStats(true);
        });
      }
    },
    [grid, claimed, picks, score, gameOver, diff.numPicks, par, cellScales],
  );

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('claim');
    setStats(s);
    setShowStats(true);
  }, []);

  function buildShareText(): string {
    const rows: string[] = [];
    for (let r = 0; r < SIZE; r++) {
      let row = '';
      for (let c = 0; c < SIZE; c++) {
        const key = r * SIZE + c;
        if (claimed.has(key)) {
          row += '\uD83D\uDFE9'; // green = claimed
        } else {
          row += '\u2B1B'; // black = unclaimed
        }
      }
      rows.push(row);
    }
    const beat = score >= par;
    return [
      `Claim Day #${puzzleDay} \uD83C\uDFC6`,
      rows.join('\n'),
      `Score: ${score} (par ${par})`,
      beat ? '\u2B50 Beat par!' : 'Try to beat par tomorrow!',
    ].join('\n');
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Claim</Text>
        <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
        <Pressable onPress={handleShowStats}>
          <Text style={styles.statsIcon}>{'\uD83D\uDCCA'}</Text>
        </Pressable>
      </View>

      <Text style={styles.subtitle}>
        Pick {diff.numPicks} cells to score — but neighbors shrink!
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
              const isClaimed = claimed.has(key);

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
                        backgroundColor: isClaimed
                          ? '#1a3a1a'
                          : val > 0
                            ? VAL_COLORS[Math.min(val, 9)]
                            : '#1a1a1b',
                        borderColor: isClaimed
                          ? '#2ecc71'
                          : val > 0
                            ? '#555'
                            : '#2a2a2c',
                        borderWidth: isClaimed ? 2 : 1,
                      },
                    ]}
                  >
                    {isClaimed ? (
                      <Text style={styles.claimedCheck}>{'\u2713'}</Text>
                    ) : val > 0 ? (
                      <Text
                        style={[
                          styles.cellValue,
                          val >= 7 && styles.cellValueHigh,
                        ]}
                      >
                        {val}
                      </Text>
                    ) : null}
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        ))}
      </View>

      <CelebrationBurst show={gameOver && score >= par} />

      {gameOver && (
        <View style={styles.winMessage}>
          <Text style={styles.winEmoji}>
            {score >= par ? '\u2B50' : '\uD83C\uDFC6'}
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
          Tap a cell to claim it and add its value to your score. But
          each claim drains adjacent cells by {DRAIN}!
          {'\n\n'}
          Choose wisely — grabbing the highest number first might cost
          you more later. Plan your {diff.numPicks} picks to beat par.
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
  cellValue: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
  },
  cellValueHigh: {
    color: '#fff',
    textShadowColor: 'rgba(255,255,255,0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  claimedCheck: {
    color: '#2ecc71',
    fontSize: 20,
    fontWeight: '800',
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
