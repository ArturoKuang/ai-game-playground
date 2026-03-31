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
const BLOOM_AT = 5;

const VALUE_COLORS = [
  '#2a2a2c', // 0 — empty
  '#3a5a3a', // 1 — sprout
  '#4a7a3a', // 2 — growing
  '#6a9a2a', // 3 — budding
  '#8aba1a', // 4 — ready
];

const BLOOM_COLOR = '#f1c40f';

/* ─── Difficulty ─── */
function getDifficulty() {
  const d = getDayDifficulty(); // 1..5
  // Cells start HIGH (3-4) so the puzzle is about chain SEQUENCE, not building.
  // Taps are tight — every tap must contribute to a chain.
  const taps = 8 + d; // Mon:9, Fri:13
  const minInit = 2;
  const maxInit = 4;
  return { taps, minInit, maxInit };
}

/* ─── Board generation ─── */
function generateBoard(
  seed: number,
  minVal: number,
  maxVal: number,
): number[][] {
  const rng = seededRandom(seed);
  return Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () =>
      minVal + Math.floor(rng() * (maxVal - minVal + 1)),
    ),
  );
}

/* ─── Greedy solver for par ─── */
function solvePar(initialGrid: number[][], taps: number): number {
  // Greedy + local search: simulate play, at each step tap the
  // cell that produces the most blooms (or builds toward blooms).
  let bestBlooms = 0;

  // Run several greedy strategies and take the best
  for (let strategy = 0; strategy < 3; strategy++) {
    const grid = initialGrid.map((r) => [...r]);
    let blooms = 0;
    let remaining = taps;

    while (remaining > 0) {
      let bestR = 0,
        bestC = 0,
        bestScore = -1;

      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          let score = 0;
          const val = grid[r][c] + 1;

          if (val >= BLOOM_AT) {
            // Immediate bloom
            score = 10;
            // Check if neighbors would also bloom from the +1
            for (const [dr, dc] of [
              [0, 1],
              [0, -1],
              [1, 0],
              [-1, 0],
            ]) {
              const nr = r + dr;
              const nc = c + dc;
              if (
                nr >= 0 &&
                nr < SIZE &&
                nc >= 0 &&
                nc < SIZE &&
                grid[nr][nc] + 1 >= BLOOM_AT
              )
                score += 8;
            }
          } else if (val === BLOOM_AT - 1) {
            // One away from bloom
            score = strategy === 0 ? 5 : strategy === 1 ? 3 : 4;
          } else {
            score = strategy === 0 ? val : strategy === 1 ? BLOOM_AT - 1 - val : val;
          }

          if (score > bestScore) {
            bestScore = score;
            bestR = r;
            bestC = c;
          }
        }
      }

      // Apply tap
      grid[bestR][bestC]++;
      if (grid[bestR][bestC] >= BLOOM_AT) {
        blooms++;
        grid[bestR][bestC] = 1;
        for (const [dr, dc] of [
          [0, 1],
          [0, -1],
          [1, 0],
          [-1, 0],
        ]) {
          const nr = bestR + dr;
          const nc = bestC + dc;
          if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) {
            grid[nr][nc]++;
            // Neighbors that bloom from the push
            if (grid[nr][nc] >= BLOOM_AT) {
              blooms++;
              grid[nr][nc] = 1;
              // Second-order push (from neighbor bloom)
              for (const [dr2, dc2] of [
                [0, 1],
                [0, -1],
                [1, 0],
                [-1, 0],
              ]) {
                const nr2 = nr + dr2;
                const nc2 = nc + dc2;
                if (nr2 >= 0 && nr2 < SIZE && nc2 >= 0 && nc2 < SIZE) {
                  grid[nr2][nc2]++;
                }
              }
            }
          }
        }
      }
      remaining--;
    }

    bestBlooms = Math.max(bestBlooms, blooms);
  }

  return bestBlooms;
}

/* ═══════════════════════════════════════════ */
/*                 Component                   */
/* ═══════════════════════════════════════════ */
export default function Bloom() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const diff = useMemo(() => getDifficulty(), []);
  const initialGrid = useMemo(
    () => generateBoard(seed, diff.minInit, diff.maxInit),
    [seed, diff],
  );
  const par = useMemo(
    () => solvePar(initialGrid, diff.taps),
    [initialGrid, diff.taps],
  );

  const { width: screenWidth } = useWindowDimensions();
  const maxGrid = Math.min(screenWidth - 48, 320);
  const cellSize = Math.floor((maxGrid - (SIZE - 1) * GAP) / SIZE);
  const gridWidth = SIZE * cellSize + (SIZE - 1) * GAP;

  const [grid, setGrid] = useState<number[][]>(() =>
    initialGrid.map((r) => [...r]),
  );
  const [tapsUsed, setTapsUsed] = useState(0);
  const [blooms, setBlooms] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [lastBloomed, setLastBloomed] = useState<Set<string>>(new Set());
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(
    null,
  );

  const cellScales = useRef(
    Array.from({ length: SIZE * SIZE }, () => new Animated.Value(1)),
  ).current;

  const tapsLeft = diff.taps - tapsUsed;

  /* P1 preview: which cells would be affected if selected cell is tapped */
  const previewAffected = useMemo(() => {
    if (!selectedCell) return new Set<string>();
    const [sr, sc] = selectedCell;
    const val = grid[sr][sc] + 1;
    const affected = new Set<string>();
    if (val >= BLOOM_AT) {
      // Would bloom — neighbors get +1
      for (const [dr, dc] of [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
      ]) {
        const nr = sr + dr;
        const nc = sc + dc;
        if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) {
          affected.add(`${nr},${nc}`);
        }
      }
    }
    return affected;
  }, [selectedCell, grid]);

  /* Would tapping selected cell trigger a chain? */
  const previewChainCount = useMemo(() => {
    if (!selectedCell) return 0;
    const [sr, sc] = selectedCell;
    if (grid[sr][sc] + 1 < BLOOM_AT) return 0;
    let chains = 0;
    for (const [dr, dc] of [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ]) {
      const nr = sr + dr;
      const nc = sc + dc;
      if (
        nr >= 0 &&
        nr < SIZE &&
        nc >= 0 &&
        nc < SIZE &&
        grid[nr][nc] + 1 >= BLOOM_AT
      )
        chains++;
    }
    return chains;
  }, [selectedCell, grid]);

  const handleTap = useCallback(
    (r: number, c: number) => {
      if (gameOver || tapsLeft <= 0) return;

      // Two-tap: first tap selects and previews, second tap confirms
      if (!selectedCell || selectedCell[0] !== r || selectedCell[1] !== c) {
        setSelectedCell([r, c]);
        // Bounce on select
        const idx = r * SIZE + c;
        Animated.sequence([
          Animated.timing(cellScales[idx], {
            toValue: 1.08,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.spring(cellScales[idx], {
            toValue: 1,
            friction: 4,
            tension: 200,
            useNativeDriver: true,
          }),
        ]).start();
        return;
      }

      // Second tap — confirm
      setSelectedCell(null);
      const newGrid = grid.map((row) => [...row]);
      let newBlooms = 0;
      const bloomed = new Set<string>();

      // Increment tapped cell
      newGrid[r][c]++;

      // Check for bloom
      if (newGrid[r][c] >= BLOOM_AT) {
        newBlooms++;
        bloomed.add(`${r},${c}`);
        newGrid[r][c] = 1;

        // Push +1 to neighbors
        for (const [dr, dc] of [
          [0, 1],
          [0, -1],
          [1, 0],
          [-1, 0],
        ]) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) {
            newGrid[nr][nc]++;
            // Chain bloom: if neighbor hits 5+ from the push
            if (newGrid[nr][nc] >= BLOOM_AT) {
              newBlooms++;
              bloomed.add(`${nr},${nc}`);
              newGrid[nr][nc] = 1;
              // Push from chain bloom
              for (const [dr2, dc2] of [
                [0, 1],
                [0, -1],
                [1, 0],
                [-1, 0],
              ]) {
                const nr2 = nr + dr2;
                const nc2 = nc + dc2;
                if (nr2 >= 0 && nr2 < SIZE && nc2 >= 0 && nc2 < SIZE) {
                  newGrid[nr2][nc2]++;
                  // Third-level bloom
                  if (newGrid[nr2][nc2] >= BLOOM_AT) {
                    newBlooms++;
                    bloomed.add(`${nr2},${nc2}`);
                    newGrid[nr2][nc2] = 1;
                  }
                }
              }
            }
          }
        }
      }

      // Animations
      const idx = r * SIZE + c;
      if (newBlooms > 0) {
        // Bloom animation — bigger bounce
        Animated.sequence([
          Animated.timing(cellScales[idx], {
            toValue: 1.3,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.spring(cellScales[idx], {
            toValue: 1,
            friction: 3,
            tension: 200,
            useNativeDriver: true,
          }),
        ]).start();

        // Animate bloomed neighbors
        for (const key of bloomed) {
          if (key === `${r},${c}`) continue;
          const [br, bc] = key.split(',').map(Number);
          const bidx = br * SIZE + bc;
          Animated.sequence([
            Animated.timing(cellScales[bidx], {
              toValue: 1.25,
              duration: 120,
              useNativeDriver: true,
            }),
            Animated.spring(cellScales[bidx], {
              toValue: 1,
              friction: 3,
              tension: 200,
              useNativeDriver: true,
            }),
          ]).start();
        }
      } else {
        // Normal tap bounce
        Animated.sequence([
          Animated.timing(cellScales[idx], {
            toValue: 1.1,
            duration: 60,
            useNativeDriver: true,
          }),
          Animated.spring(cellScales[idx], {
            toValue: 1,
            friction: 4,
            tension: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }

      const totalBlooms = blooms + newBlooms;
      const newTapsUsed = tapsUsed + 1;

      setGrid(newGrid);
      setTapsUsed(newTapsUsed);
      setBlooms(totalBlooms);
      setLastBloomed(bloomed);

      if (newTapsUsed >= diff.taps) {
        setGameOver(true);
        recordGame('bloom', totalBlooms, par, true).then((s) => {
          setStats(s);
          setShowStats(true);
        });
      }
    },
    [gameOver, tapsLeft, grid, blooms, tapsUsed, diff.taps, par, cellScales, selectedCell],
  );

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('bloom');
    setStats(s);
    setShowStats(true);
  }, []);

  function buildShareText(): string {
    const rows: string[] = [];
    for (let r = 0; r < SIZE; r++) {
      let row = '';
      for (let c = 0; c < SIZE; c++) {
        const val = grid[r][c];
        if (val >= 4) row += '\uD83C\uDF3C'; // ready/blooming
        else if (val >= 2) row += '\uD83C\uDF31'; // growing
        else row += '\u2B1B'; // dormant
      }
      rows.push(row);
    }
    return [
      `Bloom Day #${puzzleDay} \uD83C\uDF3B`,
      rows.join('\n'),
      `\uD83C\uDF38 ${blooms} blooms (par ${par})${blooms >= par ? ' \u2B50' : ''}`,
    ].join('\n');
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Bloom</Text>
        <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
        <Pressable onPress={handleShowStats}>
          <Text style={styles.statsIcon}>{'\uD83D\uDCCA'}</Text>
        </Pressable>
      </View>

      <Text style={styles.subtitle}>
        Select a cell, then tap again to grow it. At {BLOOM_AT}, it
        blooms!
      </Text>

      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Blooms</Text>
          <Text
            style={[
              styles.infoValue,
              gameOver && blooms >= par && styles.infoValueGood,
            ]}
          >
            {blooms}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Par</Text>
          <Text style={styles.infoPar}>{par}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Taps</Text>
          <Text
            style={[
              styles.infoValue,
              tapsLeft <= 3 && tapsLeft > 0 && styles.infoValueWarn,
              tapsLeft <= 0 && styles.infoValueBad,
            ]}
          >
            {tapsLeft}
          </Text>
        </View>
      </View>

      {/* Grid */}
      <View style={[styles.grid, { width: gridWidth, height: gridWidth }]}>
        {Array.from({ length: SIZE }).map((_, r) => (
          <View key={r} style={styles.gridRow}>
            {Array.from({ length: SIZE }).map((_, c) => {
              const val = grid[r][c];
              const isReady = val === BLOOM_AT - 1;
              const justBloomed = lastBloomed.has(`${r},${c}`);
              const isSelected =
                selectedCell !== null &&
                selectedCell[0] === r &&
                selectedCell[1] === c;
              const isAffected = previewAffected.has(`${r},${c}`);
              const wouldChainBloom =
                isAffected && val + 1 >= BLOOM_AT;
              const bg =
                val < VALUE_COLORS.length
                  ? VALUE_COLORS[val]
                  : VALUE_COLORS[VALUE_COLORS.length - 1];

              return (
                <Animated.View
                  key={c}
                  style={{
                    transform: [{ scale: cellScales[r * SIZE + c] }],
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
                      },
                      isReady && styles.cellReady,
                      justBloomed && styles.cellBloomed,
                      isSelected && styles.cellSelected,
                      isAffected && styles.cellAffected,
                      wouldChainBloom && styles.cellChainPreview,
                    ]}
                  >
                    <Text
                      style={[
                        styles.cellValue,
                        val >= 3 && styles.cellValueBright,
                      ]}
                    >
                      {val}
                    </Text>
                    {isReady && !isSelected && (
                      <Text style={styles.readyDot}>{'\uD83C\uDF3C'}</Text>
                    )}
                    {isAffected && (
                      <Text style={styles.plusOne}>+1</Text>
                    )}
                    {wouldChainBloom && (
                      <Text style={styles.chainIcon}>{'\uD83D\uDCA5'}</Text>
                    )}
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        ))}
      </View>

      {/* Preview hint */}
      {selectedCell && !gameOver && (
        <View style={styles.previewHint}>
          <Text style={styles.previewText}>
            {grid[selectedCell[0]][selectedCell[1]] + 1 >= BLOOM_AT
              ? `\uD83C\uDF3B Bloom!${previewChainCount > 0 ? ` +${previewChainCount} chain${previewChainCount > 1 ? 's' : ''}! \uD83D\uDCA5` : ''} \u2014 tap again`
              : `${grid[selectedCell[0]][selectedCell[1]]} \u2192 ${grid[selectedCell[0]][selectedCell[1]] + 1} \u2014 tap again`}
          </Text>
        </View>
      )}

      <CelebrationBurst show={gameOver && blooms >= par} />

      {gameOver && (
        <View style={styles.endMessage}>
          <Text style={styles.endEmoji}>
            {blooms >= par ? '\u2B50' : '\uD83C\uDF3B'}
          </Text>
          <Text style={styles.endText}>
            {blooms >= par
              ? `${blooms} blooms \u2014 beat par (${par})!`
              : `${blooms} blooms / par ${par}`}
          </Text>
          <ShareButton text={buildShareText()} />
        </View>
      )}

      <View style={styles.howTo}>
        <Text style={styles.howToTitle}>How to play</Text>
        <Text style={styles.howToText}>
          Tap any cell to grow it by 1. When a cell reaches {BLOOM_AT},
          it blooms! It resets and gives +1 to all neighbors.{'\n\n'}
          Neighbors that hit {BLOOM_AT} bloom too {'\u2014'} chain
          reactions! Plan your taps to set up multi-bloom combos.
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
  infoValueWarn: { color: '#f1c40f' },
  infoValueBad: { color: '#e74c3c' },
  infoPar: {
    color: '#818384',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 2,
  },
  grid: { gap: GAP },
  gridRow: { flexDirection: 'row', gap: GAP },
  cell: {
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#333',
  },
  cellReady: {
    borderColor: '#f1c40f',
    borderWidth: 2,
  },
  cellBloomed: {
    borderColor: '#ff6b00',
    borderWidth: 2,
  },
  cellSelected: {
    borderColor: '#fff',
    borderWidth: 3,
  },
  cellAffected: {
    borderColor: '#f1c40f',
    borderWidth: 2,
  },
  cellChainPreview: {
    borderColor: '#ff6b00',
    borderWidth: 2,
  },
  cellValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#aaa',
  },
  cellValueBright: {
    color: '#fff',
    textShadowColor: 'rgba(255,255,255,0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  readyDot: {
    position: 'absolute',
    top: 1,
    right: 3,
    fontSize: 10,
  },
  plusOne: {
    position: 'absolute',
    bottom: 1,
    left: 3,
    fontSize: 10,
    color: '#f1c40f',
    fontWeight: '800',
  },
  chainIcon: {
    position: 'absolute',
    top: 1,
    left: 3,
    fontSize: 10,
  },
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
