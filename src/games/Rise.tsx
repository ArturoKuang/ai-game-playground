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

/* ─── Get adjacent cells ─── */
function adj(key: number): number[] {
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

/* ─── Optimal chain solver (DFS) ─── */
function findOptimal(grid: number[][]): { score: number; path: number[] } {
  let best = { score: 0, path: [] as number[] };

  function dfs(key: number, chain: number[], chainSet: Set<number>, val: number, sum: number) {
    const sc = sum * chain.length;
    if (sc > best.score) best = { score: sc, path: [...chain] };

    for (const nk of adj(key)) {
      const nr = Math.floor(nk / SIZE);
      const nc = nk % SIZE;
      if (!chainSet.has(nk) && grid[nr][nc] > val) {
        chainSet.add(nk);
        chain.push(nk);
        dfs(nk, chain, chainSet, grid[nr][nc], sum + grid[nr][nc]);
        chain.pop();
        chainSet.delete(nk);
      }
    }
  }

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const k = r * SIZE + c;
      const s = new Set([k]);
      dfs(k, [k], s, grid[r][c], grid[r][c]);
    }
  }
  return best;
}

/* ═══════════════════════════════════════════ */
/*                Component                    */
/* ═══════════════════════════════════════════ */
export default function Rise() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const diff = useMemo(() => getDifficulty(), []);
  const grid = useMemo(() => generateGrid(seed, diff.maxVal), [seed, diff.maxVal]);
  const optimal = useMemo(() => findOptimal(grid), [grid]);
  const par = optimal.score;

  const { width: screenWidth } = useWindowDimensions();
  const maxGrid = Math.min(screenWidth - 48, 340);
  const cellSize = Math.floor((maxGrid - (SIZE - 1) * GAP) / SIZE);
  const gridWidth = SIZE * cellSize + (SIZE - 1) * GAP;

  const [chain, setChain] = useState<number[]>([]);
  const [chainSet, setChainSet] = useState<Set<number>>(new Set());
  const [gameOver, setGameOver] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);

  const cellScales = useRef(
    Array.from({ length: SIZE * SIZE }, () => new Animated.Value(1)),
  ).current;

  const chainSum = useMemo(
    () => chain.reduce((s, k) => s + grid[Math.floor(k / SIZE)][k % SIZE], 0),
    [chain, grid],
  );
  const score = chainSum * chain.length;
  const lastVal = chain.length > 0
    ? grid[Math.floor(chain[chain.length - 1] / SIZE)][chain[chain.length - 1] % SIZE]
    : 0;

  /* ─── available next cells (P1 preview) ─── */
  const available = useMemo(() => {
    if (chain.length === 0 || gameOver) return new Set<number>();
    const last = chain[chain.length - 1];
    const avail = new Set<number>();
    for (const nk of adj(last)) {
      const nr = Math.floor(nk / SIZE);
      const nc = nk % SIZE;
      if (!chainSet.has(nk) && grid[nr][nc] > lastVal) {
        avail.add(nk);
      }
    }
    return avail;
  }, [chain, chainSet, lastVal, grid, gameOver]);

  /* ─── handle tap ─── */
  const handleTap = useCallback(
    (r: number, c: number) => {
      if (gameOver) return;
      const key = r * SIZE + c;

      if (chain.length === 0) {
        // Start chain
        Animated.sequence([
          Animated.timing(cellScales[key], {
            toValue: 1.2,
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

        const newChain = [key];
        const newSet = new Set([key]);
        setChain(newChain);
        setChainSet(newSet);

        // Check if stuck immediately (no adjacent higher)
        const val = grid[r][c];
        const hasNext = adj(key).some((nk) => {
          const nr2 = Math.floor(nk / SIZE);
          const nc2 = nk % SIZE;
          return grid[nr2][nc2] > val;
        });
        if (!hasNext) {
          finishGame(grid[r][c] * 1);
        }
        return;
      }

      // Extend chain
      if (!available.has(key)) return;

      Animated.sequence([
        Animated.timing(cellScales[key], {
          toValue: 1.2,
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

      const newChain = [...chain, key];
      const newSet = new Set(chainSet);
      newSet.add(key);
      setChain(newChain);
      setChainSet(newSet);

      // Check if stuck
      const val = grid[r][c];
      const hasNext = adj(key).some((nk) => {
        const nr2 = Math.floor(nk / SIZE);
        const nc2 = nk % SIZE;
        return !newSet.has(nk) && grid[nr2][nc2] > val;
      });
      if (!hasNext) {
        const newSum = chainSum + val;
        finishGame(newSum * newChain.length);
      }
    },
    [chain, chainSet, available, grid, gameOver, cellScales, chainSum],
  );

  const finishGame = useCallback(
    (finalScore: number) => {
      setGameOver(true);
      recordGame('rise', finalScore, par, true).then((s) => {
        setStats(s);
        setShowStats(true);
      });
    },
    [par],
  );

  /* ─── end chain early ─── */
  const handleDone = useCallback(() => {
    if (chain.length === 0 || gameOver) return;
    finishGame(score);
  }, [chain.length, gameOver, score, finishGame]);

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('rise');
    setStats(s);
    setShowStats(true);
  }, []);

  function buildShareText(): string {
    const rows: string[] = [];
    for (let r = 0; r < SIZE; r++) {
      let row = '';
      for (let c = 0; c < SIZE; c++) {
        const key = r * SIZE + c;
        const idx = chain.indexOf(key);
        if (idx >= 0) {
          row += idx === 0 ? '\uD83D\uDFE2' : '\uD83D\uDFE9';
        } else {
          row += '\u2B1B';
        }
      }
      rows.push(row);
    }
    const vals = chain.map((k) => grid[Math.floor(k / SIZE)][k % SIZE]);
    const beat = score >= par;
    return [
      `Rise Day #${puzzleDay} \uD83D\uDD3A`,
      rows.join('\n'),
      `${vals.join('\u2192')} (${chainSum}\u00D7${chain.length} = ${score})`,
      beat ? `\u2B50 Beat par (${par})!` : `Score: ${score} (par ${par})`,
    ].join('\n');
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Rise</Text>
        <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
        <Pressable onPress={handleShowStats}>
          <Text style={styles.statsIcon}>{'\uD83D\uDCCA'}</Text>
        </Pressable>
      </View>

      <Text style={styles.subtitle}>
        Build an ascending chain — longer = bigger multiplier!
      </Text>

      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Chain</Text>
          <Text style={styles.infoValue}>{chain.length}</Text>
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

      {/* Score formula */}
      {chain.length > 0 && (
        <Text style={styles.formula}>
          {chainSum} {'\u00D7'} {chain.length} = {score}
        </Text>
      )}

      {/* Grid */}
      <View style={[styles.grid, { width: gridWidth, height: gridWidth }]}>
        {Array.from({ length: SIZE }).map((_, r) => (
          <View key={r} style={styles.gridRow}>
            {Array.from({ length: SIZE }).map((_, c) => {
              const key = r * SIZE + c;
              const val = grid[r][c];
              const chainIdx = chain.indexOf(key);
              const inChain = chainIdx >= 0;
              const isStart = chainIdx === 0;
              const isEnd = chainIdx === chain.length - 1 && chain.length > 0;
              const isAvail = available.has(key);
              const canStart = chain.length === 0 && !gameOver;

              let bg = VAL_COLORS[Math.min(val, 9)];
              let border = '#555';
              let bw = 1;
              if (inChain) {
                bg = isStart ? '#1a6b1a' : '#1a4a1a';
                border = isEnd ? '#f1c40f' : '#2ecc71';
                bw = 3;
              } else if (isAvail) {
                border = '#f1c40f';
                bw = 3;
              } else if (canStart) {
                border = '#666';
                bw = 1;
              } else {
                bg = '#1a1a1b';
                border = '#2a2a2c';
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
                    {inChain ? (
                      <View style={styles.chainBadge}>
                        <Text style={styles.chainOrder}>{chainIdx + 1}</Text>
                      </View>
                    ) : (
                      <Text
                        style={[
                          styles.cellValue,
                          isAvail && styles.cellValueAvail,
                          !isAvail && !canStart && chain.length > 0 && styles.cellValueDim,
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

      {/* Done button */}
      {chain.length >= 2 && !gameOver && available.size > 0 && (
        <Pressable style={styles.doneBtn} onPress={handleDone}>
          <Text style={styles.doneBtnText}>End chain ({score} pts)</Text>
        </Pressable>
      )}

      <CelebrationBurst show={gameOver && score >= par} />

      {gameOver && (
        <View style={styles.winMessage}>
          <Text style={styles.winEmoji}>
            {score >= par ? '\u2B50' : '\uD83D\uDD3A'}
          </Text>
          <Text style={styles.winText}>
            {score >= par
              ? `${score} pts \u2014 beat par (${par})!`
              : `${score} pts (par ${par})`}
          </Text>
          <ShareButton text={buildShareText()} />
        </View>
      )}

      <View style={styles.howTo}>
        <Text style={styles.howToTitle}>How to play</Text>
        <Text style={styles.howToText}>
          Tap any cell to start, then tap adjacent cells with higher
          values to extend your chain. Score = sum {'\u00D7'} length!
          {'\n\n'}
          Starting low gives a longer chain (bigger multiplier) but
          you might get stuck. Plan your path through ascending values!
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
    marginBottom: 4,
    alignItems: 'baseline',
  },
  infoItem: { alignItems: 'center' },
  infoLabel: { color: '#818384', fontSize: 12 },
  infoValue: { color: '#ffffff', fontSize: 24, fontWeight: '800' },
  infoValueGood: { color: '#2ecc71' },
  infoPar: { color: '#818384', fontSize: 14, marginTop: 2 },
  formula: {
    color: '#f1c40f',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  grid: { gap: GAP },
  gridRow: { flexDirection: 'row', gap: GAP },
  cell: {
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellValue: { color: '#ffffff', fontSize: 22, fontWeight: '800' },
  cellValueAvail: { color: '#f1c40f' },
  cellValueDim: { color: '#444', fontSize: 18 },
  chainBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2ecc71',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chainOrder: { color: '#fff', fontSize: 13, fontWeight: '800' },
  doneBtn: {
    marginTop: 14,
    backgroundColor: '#3a3a3c',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  doneBtnText: { color: '#f1c40f', fontSize: 15, fontWeight: '700' },
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
