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
import { getDailySeed, seededRandom } from '../utils/seed';
import { loadStats, recordGame, type Stats } from '../utils/stats';

const GRID_SIZE = 6;
const DEFECTS = 6; // cells that break symmetry
const PAR_TAPS = 6; // optimal is exactly DEFECTS taps

const FILLED_COLOR = '#6c5ce7';
const EMPTY_COLOR = '#2c2c2e';
const MIRROR_LINE_COLOR = '#636e72';

/**
 * Generate a symmetric pattern, then break it by flipping DEFECTS cells
 * on one side. The player must fix the symmetry.
 */
function generatePuzzle(seed: number): boolean[][] {
  const rng = seededRandom(seed);

  // Build a symmetric pattern (left-right mirror)
  const grid: boolean[][] = Array.from({ length: GRID_SIZE }, () =>
    Array(GRID_SIZE).fill(false)
  );

  // Fill left half randomly, mirror to right
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE / 2; c++) {
      const filled = rng() > 0.4;
      grid[r][c] = filled;
      grid[r][GRID_SIZE - 1 - c] = filled;
    }
  }

  // Now break symmetry by flipping some cells
  let defectsPlaced = 0;
  let attempts = 0;
  while (defectsPlaced < DEFECTS && attempts < 200) {
    const r = Math.floor(rng() * GRID_SIZE);
    const c = Math.floor(rng() * GRID_SIZE);
    const mirrorC = GRID_SIZE - 1 - c;

    // Only break if this cell currently matches its mirror
    if (grid[r][c] === grid[r][mirrorC] && c !== mirrorC) {
      grid[r][c] = !grid[r][c];
      defectsPlaced++;
    }
    attempts++;
  }

  return grid;
}

function isSymmetric(grid: boolean[][]): boolean {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE / 2; c++) {
      if (grid[r][c] !== grid[r][GRID_SIZE - 1 - c]) return false;
    }
  }
  return true;
}

function countDefects(grid: boolean[][]): number {
  let count = 0;
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE / 2; c++) {
      if (grid[r][c] !== grid[r][GRID_SIZE - 1 - c]) count++;
    }
  }
  return count;
}

export default function MirrorGrid() {
  const seed = useMemo(() => getDailySeed(), []);
  const initialGrid = useMemo(() => generatePuzzle(seed), [seed]);
  const { width: screenWidth } = useWindowDimensions();

  const [grid, setGrid] = useState(() => initialGrid.map((r) => [...r]));
  const [taps, setTaps] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);

  const solved = isSymmetric(grid);
  const defectsLeft = countDefects(grid);
  const underPar = taps <= PAR_TAPS;

  const maxWidth = Math.min(screenWidth - 48, 360);
  const cellSize = Math.floor(maxWidth / GRID_SIZE) - 4;

  // Bounce animation per cell
  const cellScales = useRef(
    Array.from({ length: GRID_SIZE }, () =>
      Array.from({ length: GRID_SIZE }, () => new Animated.Value(1))
    )
  ).current;

  const handleCellTap = useCallback(
    (r: number, c: number) => {
      if (gameOver) return;

      // Bounce animation
      const scale = cellScales[r][c];
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.15,
          duration: 60,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 3,
          tension: 200,
          useNativeDriver: true,
        }),
      ]).start();

      const next = grid.map((row) => [...row]);
      next[r][c] = !next[r][c];
      setGrid(next);
      setTaps((t) => t + 1);

      if (isSymmetric(next)) {
        setGameOver(true);
        recordGame('mirrorgrid', taps + 1, PAR_TAPS).then((s) => {
          setStats(s);
          setShowStats(true);
        });
      }
    },
    [grid, taps, gameOver, cellScales]
  );

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('mirrorgrid');
    setStats(s);
    setShowStats(true);
  }, []);

  function buildShareText(): string {
    const rows = grid.map((row) =>
      row.map((cell) => (cell ? '\u2b1b' : '\u2b1c')).join('')
    );
    return `MirrorGrid ${taps}/${PAR_TAPS} taps \ud83e\ude9e\n${rows.join('\n')}\n${underPar ? 'Perfect symmetry!' : `Fixed in ${taps} taps`}`;
  }

  function isMirrored(r: number, c: number): boolean {
    return grid[r][c] === grid[r][GRID_SIZE - 1 - c];
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>MirrorGrid</Text>
        <Pressable onPress={handleShowStats}>
          <Text style={styles.statsIcon}>{'\ud83d\udcca'}</Text>
        </Pressable>
      </View>
      <Text style={styles.subtitle}>
        Toggle cells to make the pattern perfectly symmetric
      </Text>

      <View style={styles.moveCounter}>
        <Text style={styles.moveLabel}>Taps</Text>
        <Text
          style={[
            styles.moveCount,
            gameOver && underPar && styles.moveCountGood,
          ]}
        >
          {taps}
        </Text>
        <Text style={styles.movePar}>Par: {PAR_TAPS}</Text>
        {!gameOver && (
          <Text style={styles.defectsLeft}>
            {defectsLeft} mismatches
          </Text>
        )}
      </View>

      {/* Grid with mirror line */}
      <View style={styles.gridWrapper}>
        <View style={styles.grid}>
          {grid.map((row, r) => (
            <View key={r} style={styles.gridRow}>
              {row.map((cell, c) => {
                const mirrored = isMirrored(r, c);
                const isMirrorEdge = c === GRID_SIZE / 2 - 1;
                return (
                  <Animated.View
                    key={c}
                    style={{ transform: [{ scale: cellScales[r][c] }] }}
                  >
                    <Pressable
                      onPress={() => handleCellTap(r, c)}
                      style={[
                        styles.cell,
                        {
                          width: cellSize,
                          height: cellSize,
                          backgroundColor: cell ? FILLED_COLOR : EMPTY_COLOR,
                          borderColor: !mirrored && !gameOver
                            ? '#e74c3c'
                            : cell
                              ? '#7c6cf7'
                              : '#3a3a3c',
                        },
                        isMirrorEdge && styles.mirrorEdge,
                      ]}
                    />
                  </Animated.View>
                );
              })}
            </View>
          ))}
        </View>

        {/* Mirror line */}
        <View
          style={[
            styles.mirrorLine,
            {
              left: (cellSize + 4) * (GRID_SIZE / 2) + 0,
              height: (cellSize + 4) * GRID_SIZE,
            },
          ]}
        />
      </View>

      {gameOver && (
        <View style={styles.winMessage}>
          <Text style={styles.winEmoji}>
            {underPar ? '\ud83e\ude9e' : '\u2728'}
          </Text>
          <Text style={styles.winText}>
            {underPar
              ? `Perfect! ${taps} taps`
              : `Symmetric in ${taps} taps (par: ${PAR_TAPS})`}
          </Text>
          <ShareButton text={buildShareText()} />
        </View>
      )}

      <View style={styles.howTo}>
        <Text style={styles.howToTitle}>How to play</Text>
        <Text style={styles.howToText}>
          The grid has a hidden mirror line down the center. Some cells break
          the symmetry (shown with a red border). Tap cells to toggle them on
          or off until the pattern is perfectly symmetric.{'\n\n'}
          Fix all mismatches in {PAR_TAPS} taps or fewer!
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
  statsIcon: { fontSize: 24 },
  subtitle: {
    fontSize: 13,
    color: '#818384',
    marginTop: 2,
    marginBottom: 12,
    textAlign: 'center',
    maxWidth: 300,
  },
  moveCounter: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 16,
  },
  moveLabel: { color: '#818384', fontSize: 14 },
  moveCount: { color: '#ffffff', fontSize: 28, fontWeight: '800' },
  moveCountGood: { color: '#2ecc71' },
  movePar: { color: '#818384', fontSize: 14 },
  defectsLeft: { color: '#e74c3c', fontSize: 14, marginLeft: 8 },
  gridWrapper: {
    position: 'relative',
  },
  grid: {
    gap: 4,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 4,
  },
  cell: {
    borderRadius: 6,
    borderWidth: 2,
  },
  mirrorEdge: {
    marginRight: 6,
  },
  mirrorLine: {
    position: 'absolute',
    top: 0,
    width: 2,
    backgroundColor: MIRROR_LINE_COLOR,
    opacity: 0.5,
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
