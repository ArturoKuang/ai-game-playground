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
const SIZE = 4;
const GAP = 4;
const DIRS = [0, 1, 2, 3] as const; // 0=↑ 1=→ 2=↓ 3=←
const DIR_ARROWS = ['↑', '→', '↓', '←'];
const DIR_DELTAS = [
  [-1, 0], // ↑
  [0, 1],  // →
  [1, 0],  // ↓
  [0, -1], // ←
];
const DIR_COLORS = ['#3498db', '#2ecc71', '#e67e22', '#e74c3c'];

/* ─── Difficulty ─── */
function getDifficulty() {
  const d = getDayDifficulty(); // 1 (Mon) – 5 (Fri)
  return {
    scrambleMoves: 2 + d * 2, // Mon: 4, Fri: 12
  };
}

/* ─── Get cells in line of sight from (r,c) in direction dir ─── */
function getLineOfSight(r: number, c: number, dir: number): number[] {
  const [dr, dc] = DIR_DELTAS[dir];
  const result: number[] = [];
  let nr = r + dr;
  let nc = c + dc;
  while (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) {
    result.push(nr * SIZE + nc);
    nr += dr;
    nc += dc;
  }
  return result;
}

/* ─── Apply a tap at position key to a grid state ─── */
function applyTap(grid: number[], key: number): number[] {
  const newGrid = [...grid];
  const r = Math.floor(key / SIZE);
  const c = key % SIZE;
  const dir = newGrid[key];

  // Get line of sight BEFORE rotating
  const targets = getLineOfSight(r, c, dir);

  // Rotate the tapped cell
  newGrid[key] = (newGrid[key] + 1) % 4;

  // Rotate all cells in the line of sight
  for (const t of targets) {
    newGrid[t] = (newGrid[t] + 1) % 4;
  }

  return newGrid;
}

/* ─── Generate puzzle by working backwards from solved state ─── */
function generatePuzzle(
  seed: number,
  scrambleMoves: number,
): { grid: number[]; par: number } {
  const rng = seededRandom(seed);
  let grid = new Array(SIZE * SIZE).fill(0); // All ↑ = solved

  // Apply random taps to scramble
  const taps: number[] = [];
  for (let i = 0; i < scrambleMoves; i++) {
    const key = Math.floor(rng() * SIZE * SIZE);
    grid = applyTap(grid, key);
    taps.push(key);
  }

  // Ensure not already solved
  if (grid.every((d) => d === 0)) {
    // Apply one more tap
    const key = Math.floor(rng() * SIZE * SIZE);
    grid = applyTap(grid, key);
  }

  return { grid, par: scrambleMoves };
}

/* ═══════════════════════════════════════════ */
/*                Component                    */
/* ═══════════════════════════════════════════ */
export default function Turn() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const diff = useMemo(() => getDifficulty(), []);
  const puzzle = useMemo(
    () => generatePuzzle(seed, diff.scrambleMoves),
    [seed, diff.scrambleMoves],
  );

  const { width: screenWidth } = useWindowDimensions();
  const maxGrid = Math.min(screenWidth - 40, 320);
  const cellSize = Math.floor((maxGrid - (SIZE - 1) * GAP) / SIZE);
  const gridWidth = SIZE * cellSize + (SIZE - 1) * GAP;

  /* State */
  const [grid, setGrid] = useState<number[]>(() => [...puzzle.grid]);
  const [moves, setMoves] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);

  const cellScales = useRef(
    Array.from({ length: SIZE * SIZE }, () => new Animated.Value(1)),
  ).current;
  const cellRotations = useRef(
    Array.from({ length: SIZE * SIZE }, () => new Animated.Value(0)),
  ).current;

  /* Count of non-up arrows */
  const remaining = useMemo(
    () => grid.filter((d) => d !== 0).length,
    [grid],
  );

  /* ─── Handle cell tap ─── */
  const handleTap = useCallback(
    (key: number) => {
      if (gameOver) return;

      const r = Math.floor(key / SIZE);
      const c = key % SIZE;
      const dir = grid[key];
      const targets = getLineOfSight(r, c, dir);
      const allAffected = [key, ...targets];

      // Apply tap
      const newGrid = applyTap(grid, key);
      setGrid(newGrid);
      setMoves(moves + 1);

      // Animate all affected cells
      allAffected.forEach((k, i) => {
        const delay = i * 30; // Cascade effect
        setTimeout(() => {
          Animated.sequence([
            Animated.timing(cellScales[k], {
              toValue: 1.2,
              duration: 60,
              useNativeDriver: true,
            }),
            Animated.spring(cellScales[k], {
              toValue: 1,
              friction: 3,
              tension: 200,
              useNativeDriver: true,
            }),
          ]).start();
        }, delay);
      });

      // Check win
      if (newGrid.every((d) => d === 0)) {
        setGameOver(true);
        recordGame('turn', moves + 1, puzzle.par, false).then((s) => {
          setStats(s);
          setShowStats(true);
        });
      }
    },
    [gameOver, grid, moves, puzzle.par, cellScales],
  );

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('turn');
    setStats(s);
    setShowStats(true);
  }, []);

  /* ─── Share text ─── */
  function buildShareText(): string {
    const status = moves <= puzzle.par ? '⚡' : '';
    return `🔄 Turn — Day #${puzzleDay} ${status}\n${moves} moves (par ${puzzle.par})\n\n${Array.from({ length: SIZE }, (_, r) =>
      Array.from({ length: SIZE }, (_, c) => '↑')
        .join('')
    ).join('\n')}\n\nAll arrows aligned!`;
  }

  const handleShowStats2 = handleShowStats;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
    >
      <Text style={styles.dayLabel}>Day #{puzzleDay}</Text>
      <Text style={styles.subtitle}>
        Tap an arrow to rotate it — all arrows it points at also rotate.
        {'\n'}Make them all point ↑
      </Text>

      {/* Score bar */}
      <View style={styles.scoreRow}>
        <View style={styles.scoreBox}>
          <Text style={styles.scoreLabel}>Moves</Text>
          <Text style={styles.scoreValue}>{moves}</Text>
        </View>
        <View style={styles.scoreBox}>
          <Text style={styles.scoreLabel}>Par</Text>
          <Text style={styles.scoreValue}>{puzzle.par}</Text>
        </View>
        <View style={styles.scoreBox}>
          <Text style={styles.scoreLabel}>Left</Text>
          <Text
            style={[
              styles.scoreValue,
              remaining === 0 && { color: '#6aaa64' },
            ]}
          >
            {remaining}
          </Text>
        </View>
        <Pressable onPress={handleShowStats2} style={styles.statsBtn}>
          <Text style={styles.statsBtnText}>📊</Text>
        </Pressable>
      </View>

      {/* Grid */}
      <View style={[styles.gridContainer, { width: gridWidth }]}>
        {Array.from({ length: SIZE }, (_, r) => (
          <View key={r} style={styles.gridRow}>
            {Array.from({ length: SIZE }, (_, c) => {
              const key = r * SIZE + c;
              const dir = grid[key];
              const isUp = dir === 0;

              // Show line-of-sight preview
              const targets = getLineOfSight(r, c, dir);

              return (
                <Animated.View
                  key={c}
                  style={{
                    transform: [{ scale: cellScales[key] }],
                  }}
                >
                  <Pressable
                    style={[
                      styles.cell,
                      {
                        width: cellSize,
                        height: cellSize,
                        backgroundColor: isUp
                          ? '#1a2a1a'
                          : '#1a1a1b',
                        borderColor: isUp
                          ? '#6aaa6460'
                          : DIR_COLORS[dir] + '60',
                        borderWidth: 2,
                      },
                    ]}
                    onPress={() => handleTap(key)}
                    disabled={gameOver}
                  >
                    <Text
                      style={[
                        styles.arrow,
                        {
                          color: isUp ? '#6aaa64' : DIR_COLORS[dir],
                        },
                      ]}
                    >
                      {DIR_ARROWS[dir]}
                    </Text>
                    {/* Small dot showing number of cells in line of sight */}
                    {!isUp && targets.length > 0 && (
                      <Text style={styles.targetCount}>
                        +{targets.length}
                      </Text>
                    )}
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        ))}
      </View>

      {/* Game over */}
      {gameOver && (
        <View style={styles.resultBox}>
          <Text style={styles.resultTitle}>
            {moves <= puzzle.par ? 'Perfect! 🔄' : 'Aligned! 🔄'}
          </Text>
          <Text style={styles.resultText}>
            {moves} moves — par {puzzle.par}
          </Text>
          <ShareButton text={buildShareText()} />
        </View>
      )}

      <CelebrationBurst show={gameOver && moves <= puzzle.par} />

      {stats && showStats && (
        <StatsModal stats={stats} onClose={() => setShowStats(false)} />
      )}
    </ScrollView>
  );
}

/* ─── Styles ─── */
const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#121213' },
  container: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dayLabel: {
    color: '#818384',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 2,
  },
  subtitle: {
    color: '#818384',
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 16,
    maxWidth: 300,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginBottom: 16,
  },
  scoreBox: { alignItems: 'center' },
  scoreLabel: { color: '#818384', fontSize: 10, fontWeight: '600' },
  scoreValue: { color: '#ffffff', fontSize: 20, fontWeight: '700' },
  statsBtn: { padding: 6 },
  statsBtnText: { fontSize: 18 },
  gridContainer: { alignSelf: 'center' },
  gridRow: {
    flexDirection: 'row',
    marginBottom: GAP,
  },
  cell: {
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: GAP,
    position: 'relative',
  },
  arrow: {
    fontSize: 32,
    fontWeight: '900',
  },
  targetCount: {
    position: 'absolute',
    bottom: 2,
    right: 4,
    color: '#ffffff40',
    fontSize: 10,
    fontWeight: '700',
  },
  resultBox: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  resultTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  resultText: {
    color: '#818384',
    fontSize: 14,
    marginBottom: 8,
  },
});
