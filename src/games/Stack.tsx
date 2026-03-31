import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  useWindowDimensions,
  Animated,
  PanResponder,
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
const SIZE = 4;
const GAP = 4;

const TILE_COLORS: Record<number, string> = {
  0: 'transparent',
  1: '#5b6e4e',
  2: '#6b8e5a',
  4: '#8bae6a',
  8: '#c4b44a',
  16: '#d4944a',
  32: '#d4744a',
  64: '#d4544a',
};
const DEFAULT_TILE = '#aa4444';

/* ─── Difficulty ─── */
function getDifficulty() {
  const d = getDayDifficulty(); // 1..5
  return {
    moves: 6 + d * 2,       // Mon:8, Fri:16
    numTiles: 8 + d * 2,    // Mon:10, Fri:18 (out of 16 cells)
    maxTileExp: 1 + Math.ceil(d / 2), // Mon: tile values 1-2, Fri: 1-4
  };
}

/* ─── Board generation ─── */
function generateGrid(
  seed: number,
  numTiles: number,
  maxExp: number,
): number[][] {
  const rng = seededRandom(seed);
  const grid: number[][] = Array.from({ length: SIZE }, () =>
    Array(SIZE).fill(0),
  );

  // Place tiles randomly
  const positions: [number, number][] = [];
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++) positions.push([r, c]);

  // Shuffle positions
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }

  // Place tiles with values that allow merging (use powers of 2)
  const tiles = Math.min(numTiles, SIZE * SIZE);
  for (let i = 0; i < tiles; i++) {
    const [r, c] = positions[i];
    const exp = 1 + Math.floor(rng() * maxExp); // 1, 2, ... maxExp
    grid[r][c] = Math.pow(2, exp - 1); // 1, 2, 4, 8...
  }

  return grid;
}

/* ─── Swipe simulation ─── */
type Direction = 'up' | 'down' | 'left' | 'right';

function swipe(grid: number[][], dir: Direction): { grid: number[][]; merges: number } {
  const newGrid = grid.map((r) => [...r]);
  let merges = 0;

  function mergeLine(line: number[]): { result: number[]; merges: number } {
    // Remove zeros
    const nonZero = line.filter((v) => v > 0);
    const result: number[] = [];
    let m = 0;
    let i = 0;
    while (i < nonZero.length) {
      if (i + 1 < nonZero.length && nonZero[i] === nonZero[i + 1]) {
        result.push(nonZero[i] * 2);
        m++;
        i += 2;
      } else {
        result.push(nonZero[i]);
        i++;
      }
    }
    // Pad with zeros
    while (result.length < SIZE) result.push(0);
    return { result, merges: m };
  }

  if (dir === 'left') {
    for (let r = 0; r < SIZE; r++) {
      const { result, merges: m } = mergeLine(newGrid[r]);
      newGrid[r] = result;
      merges += m;
    }
  } else if (dir === 'right') {
    for (let r = 0; r < SIZE; r++) {
      const { result, merges: m } = mergeLine([...newGrid[r]].reverse());
      newGrid[r] = result.reverse();
      merges += m;
    }
  } else if (dir === 'up') {
    for (let c = 0; c < SIZE; c++) {
      const col = Array.from({ length: SIZE }, (_, r) => newGrid[r][c]);
      const { result, merges: m } = mergeLine(col);
      for (let r = 0; r < SIZE; r++) newGrid[r][c] = result[r];
      merges += m;
    }
  } else {
    for (let c = 0; c < SIZE; c++) {
      const col = Array.from({ length: SIZE }, (_, r) => newGrid[r][c]).reverse();
      const { result, merges: m } = mergeLine(col);
      const reversed = result.reverse();
      for (let r = 0; r < SIZE; r++) newGrid[r][c] = reversed[r];
      merges += m;
    }
  }

  return { grid: newGrid, merges };
}

/* ─── Check if swipe changes the grid ─── */
function gridsEqual(a: number[][], b: number[][]): boolean {
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++) if (a[r][c] !== b[r][c]) return false;
  return true;
}

/* ─── Par solver (BFS/DFS with limited depth) ─── */
function solvePar(initialGrid: number[][], maxMoves: number): number {
  let bestMerges = 0;
  const dirs: Direction[] = ['up', 'down', 'left', 'right'];

  // Count initial tiles
  let initialTiles = 0;
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++) if (initialGrid[r][c] > 0) initialTiles++;

  // DFS with depth limit
  function dfs(grid: number[][], movesLeft: number, totalMerges: number) {
    bestMerges = Math.max(bestMerges, totalMerges);
    if (movesLeft <= 0) return;

    // Upper bound: remaining tiles / 2 = max possible merges
    let tilesLeft = 0;
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++) if (grid[r][c] > 0) tilesLeft++;
    if (totalMerges + Math.floor(tilesLeft / 2) <= bestMerges) return;

    for (const dir of dirs) {
      const { grid: newGrid, merges } = swipe(grid, dir);
      if (gridsEqual(grid, newGrid)) continue; // skip no-op moves
      dfs(newGrid, movesLeft - 1, totalMerges + merges);
    }
  }

  // Limit search depth to avoid long computation
  const searchDepth = Math.min(maxMoves, 6);
  dfs(initialGrid, searchDepth, 0);
  return bestMerges;
}

/* ═══════════════════════════════════════════ */
/*                 Component                   */
/* ═══════════════════════════════════════════ */
export default function Stack() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const diff = useMemo(() => getDifficulty(), []);
  const initialGrid = useMemo(
    () => generateGrid(seed, diff.numTiles, diff.maxTileExp),
    [seed, diff],
  );
  const par = useMemo(
    () => solvePar(initialGrid, diff.moves),
    [initialGrid, diff.moves],
  );

  const { width: screenWidth } = useWindowDimensions();
  const maxGrid = Math.min(screenWidth - 48, 340);
  const cellSize = Math.floor((maxGrid - (SIZE - 1) * GAP) / SIZE);
  const gridWidth = SIZE * cellSize + (SIZE - 1) * GAP;

  const [grid, setGrid] = useState<number[][]>(() =>
    initialGrid.map((r) => [...r]),
  );
  const [movesUsed, setMovesUsed] = useState(0);
  const [merges, setMerges] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [lastDir, setLastDir] = useState<Direction | null>(null);

  const cellScales = useRef(
    Array.from({ length: SIZE * SIZE }, () => new Animated.Value(1)),
  ).current;

  const movesLeft = diff.moves - movesUsed;

  /* Swipe handler */
  const handleSwipe = useCallback(
    (dir: Direction) => {
      if (gameOver || movesLeft <= 0) return;

      const { grid: newGrid, merges: newMerges } = swipe(grid, dir);
      if (gridsEqual(grid, newGrid)) return; // no-op

      // Animate merged cells
      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          if (newGrid[r][c] !== grid[r][c] && newGrid[r][c] > 0) {
            const idx = r * SIZE + c;
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
          }
        }
      }

      const totalMerges = merges + newMerges;
      const newMovesUsed = movesUsed + 1;

      setGrid(newGrid);
      setMerges(totalMerges);
      setMovesUsed(newMovesUsed);
      setLastDir(dir);

      if (newMovesUsed >= diff.moves) {
        setGameOver(true);
        recordGame('stack', totalMerges, par, true).then((s) => {
          setStats(s);
          setShowStats(true);
        });
      }
    },
    [gameOver, movesLeft, grid, merges, movesUsed, diff.moves, par, cellScales],
  );

  /* Swipe gesture via PanResponder */
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderRelease: (_, gestureState) => {
        const { dx, dy } = gestureState;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        if (Math.max(absDx, absDy) < 20) return; // too small
        if (absDx > absDy) {
          handleSwipe(dx > 0 ? 'right' : 'left');
        } else {
          handleSwipe(dy > 0 ? 'down' : 'up');
        }
      },
    }),
  ).current;

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('stack');
    setStats(s);
    setShowStats(true);
  }, []);

  function tileColor(val: number): string {
    return TILE_COLORS[val] || DEFAULT_TILE;
  }

  function buildShareText(): string {
    const dirEmoji: Record<string, string> = {
      up: '\u2B06',
      down: '\u2B07',
      left: '\u2B05',
      right: '\u27A1',
    };
    const rows: string[] = [];
    for (let r = 0; r < SIZE; r++) {
      let row = '';
      for (let c = 0; c < SIZE; c++) {
        row += grid[r][c] > 0 ? '\uD83D\uDFE9' : '\u2B1B';
      }
      rows.push(row);
    }
    return [
      `Stack Day #${puzzleDay} \uD83E\uDDF1`,
      rows.join('\n'),
      `${merges} merges (par ${par})${merges >= par ? ' \u2B50' : ''}`,
    ].join('\n');
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Stack</Text>
        <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
        <Pressable onPress={handleShowStats}>
          <Text style={styles.statsIcon}>{'\uD83D\uDCCA'}</Text>
        </Pressable>
      </View>

      <Text style={styles.subtitle}>
        Swipe to merge matching tiles. No new tiles spawn {'\u2014'} plan
        your {diff.moves} moves!
      </Text>

      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Merges</Text>
          <Text
            style={[
              styles.infoValue,
              gameOver && merges >= par && styles.infoValueGood,
            ]}
          >
            {merges}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Par</Text>
          <Text style={styles.infoPar}>{par}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Moves</Text>
          <Text
            style={[
              styles.infoValue,
              movesLeft <= 2 && movesLeft > 0 && styles.infoValueWarn,
              movesLeft <= 0 && styles.infoValueBad,
            ]}
          >
            {movesLeft}
          </Text>
        </View>
      </View>

      {/* Swipe buttons */}
      {!gameOver && (
        <View style={styles.swipeButtons}>
          <Pressable
            style={styles.swipeBtn}
            onPress={() => handleSwipe('up')}
          >
            <Text style={styles.swipeBtnText}>{'\u2B06'}</Text>
          </Pressable>
          <View style={styles.swipeMiddle}>
            <Pressable
              style={styles.swipeBtn}
              onPress={() => handleSwipe('left')}
            >
              <Text style={styles.swipeBtnText}>{'\u2B05'}</Text>
            </Pressable>
            <View style={{ width: cellSize }} />
            <Pressable
              style={styles.swipeBtn}
              onPress={() => handleSwipe('right')}
            >
              <Text style={styles.swipeBtnText}>{'\u27A1'}</Text>
            </Pressable>
          </View>
          <Pressable
            style={styles.swipeBtn}
            onPress={() => handleSwipe('down')}
          >
            <Text style={styles.swipeBtnText}>{'\u2B07'}</Text>
          </Pressable>
        </View>
      )}

      {/* Grid */}
      <View
        style={[styles.grid, { width: gridWidth, height: gridWidth }]}
        {...panResponder.panHandlers}
      >
        {Array.from({ length: SIZE }).map((_, r) => (
          <View key={r} style={styles.gridRow}>
            {Array.from({ length: SIZE }).map((_, c) => {
              const val = grid[r][c];
              return (
                <Animated.View
                  key={c}
                  style={{
                    transform: [{ scale: cellScales[r * SIZE + c] }],
                  }}
                >
                  <View
                    style={[
                      styles.cell,
                      {
                        width: cellSize,
                        height: cellSize,
                        backgroundColor:
                          val > 0 ? tileColor(val) : '#2a2a2c',
                      },
                    ]}
                  >
                    {val > 0 && (
                      <Text
                        style={[
                          styles.cellValue,
                          val >= 8 && styles.cellValueLarge,
                        ]}
                      >
                        {val}
                      </Text>
                    )}
                  </View>
                </Animated.View>
              );
            })}
          </View>
        ))}
      </View>

      <CelebrationBurst show={gameOver && merges >= par} />

      {gameOver && (
        <View style={styles.endMessage}>
          <Text style={styles.endEmoji}>
            {merges >= par ? '\u2B50' : '\uD83E\uDDF1'}
          </Text>
          <Text style={styles.endText}>
            {merges >= par
              ? `${merges} merges \u2014 beat par (${par})!`
              : `${merges} merges / par ${par}`}
          </Text>
          <ShareButton text={buildShareText()} />
        </View>
      )}

      <View style={styles.howTo}>
        <Text style={styles.howToTitle}>How to play</Text>
        <Text style={styles.howToText}>
          Swipe (or use arrows) to slide all tiles. Matching
          adjacent tiles merge into one! No new tiles appear.
          {'\n\n'}
          Maximize merges in {diff.moves} moves. Each swipe
          shifts the whole grid {'\u2014'} plan the sequence
          carefully!
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
  swipeButtons: { alignItems: 'center', marginBottom: 12, gap: 4 },
  swipeMiddle: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  swipeBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2c2c2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeBtnText: { fontSize: 20 },
  grid: {
    gap: GAP,
    backgroundColor: '#1a1a1c',
    padding: GAP,
    borderRadius: 12,
  },
  gridRow: { flexDirection: 'row', gap: GAP },
  cell: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
  },
  cellValueLarge: {
    fontSize: 20,
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
