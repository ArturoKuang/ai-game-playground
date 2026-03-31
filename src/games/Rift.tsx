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

/* ─── Difficulty ─── */
function getDifficulty() {
  const d = getDayDifficulty(); // 1..5
  return {
    picks: 3 + Math.ceil(d / 2), // Mon:4, Fri:6
    maxVal: 6 + d,               // Mon:7, Fri:11
  };
}

/* ─── Board generation ─── */
function generateGrid(seed: number, maxVal: number): number[][] {
  const rng = seededRandom(seed);
  return Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () => 2 + Math.floor(rng() * (maxVal - 1))),
  );
}

/* ─── Simulate a pick: halve values in row & column ─── */
function applyRift(
  grid: number[][],
  r: number,
  c: number,
): number[][] {
  const newGrid = grid.map((row) => [...row]);
  // Halve all cells in the picked row and column (except the picked cell itself)
  for (let i = 0; i < SIZE; i++) {
    if (i !== c) newGrid[r][i] = Math.floor(newGrid[r][i] / 2);
    if (i !== r) newGrid[i][c] = Math.floor(newGrid[i][c] / 2);
  }
  // Mark picked cell as taken
  newGrid[r][c] = -1;
  return newGrid;
}

/* ─── Optimal solver (DFS + pruning) ─── */
function solvePar(
  initialGrid: number[][],
  picks: number,
): number {
  let best = 0;

  function dfs(grid: number[][], picksLeft: number, score: number) {
    if (picksLeft === 0) {
      best = Math.max(best, score);
      return;
    }

    // Upper bound: sum of top picksLeft available values
    const available: number[] = [];
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++)
        if (grid[r][c] > 0) available.push(grid[r][c]);
    available.sort((a, b) => b - a);
    let ub = score;
    for (let i = 0; i < Math.min(picksLeft, available.length); i++)
      ub += available[i];
    if (ub <= best) return;

    // Try each available cell (limit to top candidates for speed)
    const candidates: [number, number, number][] = [];
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++)
        if (grid[r][c] > 0) candidates.push([r, c, grid[r][c]]);
    candidates.sort((a, b) => b[2] - a[2]);
    const limit = Math.min(candidates.length, 12);

    for (let i = 0; i < limit; i++) {
      const [r, c, val] = candidates[i];
      const newGrid = applyRift(grid, r, c);
      dfs(newGrid, picksLeft - 1, score + val);
    }
  }

  dfs(initialGrid, picks, 0);
  return best;
}

/* ═══════════════════════════════════════════ */
/*                 Component                   */
/* ═══════════════════════════════════════════ */
export default function Rift() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const diff = useMemo(() => getDifficulty(), []);
  const initialGrid = useMemo(
    () => generateGrid(seed, diff.maxVal),
    [seed, diff],
  );
  const par = useMemo(
    () => solvePar(initialGrid, diff.picks),
    [initialGrid, diff.picks],
  );

  const { width: screenWidth } = useWindowDimensions();
  const maxGrid = Math.min(screenWidth - 48, 340);
  const cellSize = Math.floor((maxGrid - (SIZE - 1) * GAP) / SIZE);
  const gridWidth = SIZE * cellSize + (SIZE - 1) * GAP;

  const [grid, setGrid] = useState<number[][]>(() =>
    initialGrid.map((r) => [...r]),
  );
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(
    null,
  );
  const [picks, setPicks] = useState(0);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pickedCells, setPickedCells] = useState<Set<string>>(new Set());

  const cellScales = useRef(
    Array.from({ length: SIZE * SIZE }, () => new Animated.Value(1)),
  ).current;

  const picksLeft = diff.picks - picks;

  /* P1 preview: show what values would become after picking selected cell */
  const previewGrid = useMemo(() => {
    if (!selectedCell) return null;
    const [sr, sc] = selectedCell;
    if (grid[sr][sc] <= 0) return null;
    return applyRift(grid, sr, sc);
  }, [selectedCell, grid]);

  /* Compute score lost from rift for preview */
  const riftCost = useMemo(() => {
    if (!selectedCell || !previewGrid) return 0;
    const [sr, sc] = selectedCell;
    let cost = 0;
    for (let i = 0; i < SIZE; i++) {
      if (i !== sc && grid[sr][i] > 0)
        cost += grid[sr][i] - previewGrid[sr][i];
      if (i !== sr && grid[i][sc] > 0)
        cost += grid[i][sc] - previewGrid[i][sc];
    }
    return cost;
  }, [selectedCell, previewGrid, grid]);

  /* Tap a cell */
  const handleTap = useCallback(
    (r: number, c: number) => {
      if (gameOver || picksLeft <= 0) return;
      if (grid[r][c] <= 0) return;

      // Two-tap: select then confirm
      if (!selectedCell || selectedCell[0] !== r || selectedCell[1] !== c) {
        setSelectedCell([r, c]);
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

      // Confirm pick
      setSelectedCell(null);
      const val = grid[r][c];
      const newGrid = applyRift(grid, r, c);
      const newScore = score + val;
      const newPicks = picks + 1;

      // Animate picked cell
      const idx = r * SIZE + c;
      Animated.sequence([
        Animated.timing(cellScales[idx], {
          toValue: 1.3,
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

      // Animate rifted cells (row & column)
      for (let i = 0; i < SIZE; i++) {
        if (i !== c && grid[r][i] > 0) {
          const ridx = r * SIZE + i;
          Animated.sequence([
            Animated.timing(cellScales[ridx], {
              toValue: 0.85,
              duration: 80,
              useNativeDriver: true,
            }),
            Animated.spring(cellScales[ridx], {
              toValue: 1,
              friction: 4,
              tension: 200,
              useNativeDriver: true,
            }),
          ]).start();
        }
        if (i !== r && grid[i][c] > 0) {
          const cidx = i * SIZE + c;
          Animated.sequence([
            Animated.timing(cellScales[cidx], {
              toValue: 0.85,
              duration: 80,
              useNativeDriver: true,
            }),
            Animated.spring(cellScales[cidx], {
              toValue: 1,
              friction: 4,
              tension: 200,
              useNativeDriver: true,
            }),
          ]).start();
        }
      }

      const newPicked = new Set(pickedCells);
      newPicked.add(`${r},${c}`);

      setGrid(newGrid);
      setScore(newScore);
      setPicks(newPicks);
      setPickedCells(newPicked);

      if (newPicks >= diff.picks) {
        setGameOver(true);
        recordGame('rift', newScore, par, true).then((s) => {
          setStats(s);
          setShowStats(true);
        });
      }
    },
    [
      gameOver,
      picksLeft,
      grid,
      selectedCell,
      score,
      picks,
      diff.picks,
      par,
      cellScales,
      pickedCells,
    ],
  );

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('rift');
    setStats(s);
    setShowStats(true);
  }, []);

  function buildShareText(): string {
    const rows: string[] = [];
    for (let r = 0; r < SIZE; r++) {
      let row = '';
      for (let c = 0; c < SIZE; c++) {
        if (pickedCells.has(`${r},${c}`)) row += '\uD83D\uDFE2';
        else if (grid[r][c] <= 0) row += '\u2B1B';
        else row += '\u2B1C';
      }
      rows.push(row);
    }
    return [
      `Rift Day #${puzzleDay} \uD83C\uDF00`,
      rows.join('\n'),
      `Score: ${score} / ${par}${score >= par ? ' \u2B50' : ''}`,
    ].join('\n');
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Rift</Text>
        <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
        <Pressable onPress={handleShowStats}>
          <Text style={styles.statsIcon}>{'\uD83D\uDCCA'}</Text>
        </Pressable>
      </View>

      <Text style={styles.subtitle}>
        Pick {diff.picks} cells to score {'\u2014'} but each pick halves its
        row & column!
      </Text>

      <View style={styles.infoRow}>
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
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Picks</Text>
          <Text
            style={[
              styles.infoValue,
              picksLeft <= 1 && picksLeft > 0 && styles.infoValueWarn,
            ]}
          >
            {picksLeft}
          </Text>
        </View>
      </View>

      {/* Preview hint */}
      {selectedCell && !gameOver && (
        <View style={styles.previewHint}>
          <Text style={styles.previewText}>
            +{grid[selectedCell[0]][selectedCell[1]]} pts, rifts{' '}
            {riftCost} pts {'\u2014'} tap again!
          </Text>
        </View>
      )}

      {/* Grid */}
      <View style={[styles.grid, { width: gridWidth, height: gridWidth }]}>
        {Array.from({ length: SIZE }).map((_, r) => (
          <View key={r} style={styles.gridRow}>
            {Array.from({ length: SIZE }).map((_, c) => {
              const val = grid[r][c];
              const picked = val < 0;
              const isSelected =
                selectedCell &&
                selectedCell[0] === r &&
                selectedCell[1] === c;
              const inRiftRow =
                selectedCell && selectedCell[0] === r && !isSelected;
              const inRiftCol =
                selectedCell && selectedCell[1] === c && !isSelected;
              const isRifted = (inRiftRow || inRiftCol) && val > 0;

              // Show preview value if cell would be rifted
              let displayVal = val;
              let previewDelta = 0;
              if (isRifted && previewGrid) {
                previewDelta = previewGrid[r][c] - val;
                displayVal = val; // show current, delta shown separately
              }

              const intensity = Math.min(1, val / 10);
              const bg = picked
                ? '#1a3a1a'
                : `rgba(${52 + Math.floor(intensity * 100)}, ${100 + Math.floor(intensity * 100)}, ${52 + Math.floor(intensity * 50)}, 1)`;

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
                      isSelected && styles.cellSelected,
                      isRifted && styles.cellRifted,
                    ]}
                  >
                    {picked ? (
                      <Text style={styles.pickedCheck}>{'\u2713'}</Text>
                    ) : (
                      <>
                        <Text
                          style={[
                            styles.cellValue,
                            val >= 7 && styles.cellValueHigh,
                          ]}
                        >
                          {displayVal}
                        </Text>
                        {isRifted && previewDelta !== 0 && (
                          <Text style={styles.deltaLabel}>
                            {previewDelta}
                          </Text>
                        )}
                      </>
                    )}
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        ))}
      </View>

      <CelebrationBurst show={gameOver && score >= par} />

      {gameOver && (
        <View style={styles.endMessage}>
          <Text style={styles.endEmoji}>
            {score >= par ? '\u2B50' : '\uD83C\uDF00'}
          </Text>
          <Text style={styles.endText}>
            {score >= par
              ? `Score ${score} \u2014 beat par (${par})!`
              : `Score ${score} / ${par}`}
          </Text>
          <ShareButton text={buildShareText()} />
        </View>
      )}

      <View style={styles.howTo}>
        <Text style={styles.howToTitle}>How to play</Text>
        <Text style={styles.howToText}>
          Select a cell, then tap again to claim it. You score its
          value {'\u2014'} but the entire row and column get halved!
          {'\n\n'}
          Plan your {diff.picks} picks to avoid devaluing your next
          targets. Spread picks across rows and columns, or take the
          biggest first before the rift hits.
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
    maxWidth: 340,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 8,
    alignItems: 'baseline',
  },
  infoItem: { alignItems: 'center' },
  infoLabel: { color: '#818384', fontSize: 12 },
  infoValue: { color: '#ffffff', fontSize: 24, fontWeight: '800' },
  infoValueGood: { color: '#2ecc71' },
  infoValueWarn: { color: '#f1c40f' },
  infoPar: {
    color: '#818384',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 2,
  },
  previewHint: {
    marginTop: 2,
    marginBottom: 8,
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
  grid: { gap: GAP },
  gridRow: { flexDirection: 'row', gap: GAP },
  cell: {
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#555',
  },
  cellSelected: {
    borderColor: '#fff',
    borderWidth: 3,
  },
  cellRifted: {
    borderColor: '#e74c3c',
    borderWidth: 2,
  },
  cellValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  cellValueHigh: {
    textShadowColor: 'rgba(255,255,255,0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  deltaLabel: {
    position: 'absolute',
    bottom: 1,
    right: 3,
    fontSize: 10,
    fontWeight: '800',
    color: '#e74c3c',
  },
  pickedCheck: {
    color: '#2ecc71',
    fontSize: 24,
    fontWeight: '800',
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
